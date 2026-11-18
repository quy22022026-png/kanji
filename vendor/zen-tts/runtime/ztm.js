import { emotionNames } from "./emotion.js";
const ZTM_MAGIC = "ZTM1";
const ZTM_VERSION = 1;
const ZTM_ALIGN = 64;
const G2P_META_KEYS = ["vocab", "charPad", "charUnk", "phoneClasses", "marks", "punctuation", "kana"];
const G2P_TENSOR_PREFIX = "g2p.";
const bad = (m) => new Error(`ztm: ${m}`);
function isZtm(file) {
  if (file.byteLength < 8) return false;
  const b = new Uint8Array(file, 0, 4);
  return String.fromCharCode(...b) === ZTM_MAGIC;
}
function parseZtm(file) {
  if (!isZtm(file)) throw bad("not a .ztm file (no ZTM1 magic)");
  const h = new DataView(file).getUint32(4, true);
  if (8 + h > file.byteLength) throw bad(`header length ${h} past the end of the file`);
  let header;
  try {
    header = JSON.parse(new TextDecoder().decode(new Uint8Array(file, 8, h)));
  } catch (e) {
    throw bad(`header is not JSON (${e instanceof Error ? e.message : String(e)})`);
  }
  if (header.format !== "zen-tts-model") throw bad(`format ${String(header.format)}`);
  if (header.version !== ZTM_VERSION) throw bad(`version ${String(header.version)} (this runtime reads ${ZTM_VERSION})`);
  if (!header.voice?.id) throw bad("voice.id missing");
  for (const name of ["acoustic", "vocoder"]) {
    const s = header.sections?.[name];
    if (!s) throw bad(`section ${name} missing`);
    if (s.offset % ZTM_ALIGN !== 0 || s.offset < 8 + h || s.offset + s.bytes > file.byteLength) throw bad(`section ${name} out of bounds or not aligned`);
    const list = name === "acoustic" ? header.acoustic.tensors : header.vocoder.tensors;
    for (const t of list) if (t.offset < 0 || t.offset + t.bytes > s.bytes) throw bad(`tensor ${t.name} outside section ${name}`);
  }
  if (header.styles && (header.styles.length !== emotionNames.length || header.styles.some((s, i) => s !== emotionNames[i]))) {
    throw bad(`voice ${header.voice.id} has the styles [${header.styles.join(", ")}]; this runtime only plays [${emotionNames.join(", ")}]`);
  }
  return { header, file };
}
function ztmSection(z, name) {
  const s = z.header.sections[name];
  return new Uint8Array(z.file, s.offset, s.bytes);
}
function g2pMismatch(z, g2p) {
  if (z.header.g2p.sha256 === g2p.sha256) return void 0;
  return `zen-tts: voice "${z.header.voice.id}" was built with G2P ${z.header.g2p.sha256.slice(0, 12)}, this runtime has ${g2p.sha256.slice(0, 12)}: readings can differ from the voice's checks`;
}
function ownFromZtm(z, g2p, g2pBin) {
  if (g2pBin.byteLength !== g2p.bytes) throw bad(`g2p.bin is ${g2pBin.byteLength} bytes, g2p.json says ${g2p.bytes}`);
  if (g2p.bytes % ZTM_ALIGN !== 0) throw bad("g2p.bin length must be a multiple of 64");
  const acoustic = ztmSection(z, "acoustic");
  const out = new Uint8Array(g2p.bytes + acoustic.byteLength);
  out.set(new Uint8Array(g2pBin), 0);
  out.set(acoustic, g2p.bytes);
  const { shape, ...rest } = z.header.acoustic.meta;
  const tables = Object.fromEntries(G2P_META_KEYS.map((k) => [k, g2p[k]]));
  const meta = {
    ...rest,
    ...tables,
    shape: { g2p: g2p.shape, ...shape },
    tensors: [...g2p.tensors, ...z.header.acoustic.tensors.map((t) => ({ ...t, offset: t.offset + g2p.bytes }))]
  };
  return { meta, bin: out.buffer };
}
function vocoderFromZtm(z) {
  const base = z.header.sections.vocoder.offset;
  const meta = { ...z.header.vocoder.meta, tensors: z.header.vocoder.tensors.map((t) => ({ ...t, offset: t.offset + base })) };
  return { meta, bin: z.file };
}
export {
  G2P_META_KEYS,
  G2P_TENSOR_PREFIX,
  ZTM_ALIGN,
  ZTM_MAGIC,
  ZTM_VERSION,
  g2pMismatch,
  isZtm,
  ownFromZtm,
  parseZtm,
  vocoderFromZtm,
  ztmSection
};
