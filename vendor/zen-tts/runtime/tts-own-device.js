import { modelFetch } from "./model-fetch.js";
import { DW_NORM, IM2COL, ROWS, STORAGE, UNIFORM, COPY_DST, COPY_SRC, MAP_READ, WG, linear, uniformData } from "./tts-wgsl.js";
import { VITS_ATTN } from "./vits-attn.js";
import { NSF, WgslNsfDecoder, loadNsfWeights, nsfF0Norm, nsfOutputGain } from "./nsf-wgsl.js";
import { emotionNames } from "./emotion.js";
import { normalizeOwnText, numbersToAmounts } from "./ja-text-normalize.js";
import { applySpeedPitch } from "./speak-rate.js";
import {
  applyOwnDict,
  dictLabels,
  dropEndMark,
  withEndMark,
  dictProsody,
  frameRows,
  predictorInput,
  prosodyFromHead,
  slotsToPhones,
  templateParams,
  voiceDictSettings
} from "./tts-own-prosody.js";
const MAX_CHARS = 256;
const MAX_PHONES = 512;
const MAX_FRAMES = 2048;
const DEC_MAX = 1024;
const DEC_CTX = 32;
const FRAME_IN = `
struct P { F: u32, D: u32 }
@group(0) @binding(0) var<uniform> p: P;
@group(0) @binding(1) var<storage, read> idx: array<u32>;
@group(0) @binding(2) var<storage, read> h: array<f32>;
@group(0) @binding(3) var<storage, read> extra: array<f32>;
@group(0) @binding(4) var<storage, read_write> y: array<f32>;
@compute @workgroup_size(${WG}) fn main(@builtin(global_invocation_id) g: vec3<u32>) {
  let n = g.x + g.y * 65535u * ${WG}u;
  let C = p.D + 4u;
  if (n >= p.F * C) { return; }
  let f = n / C;
  let c = n % C;
  if (c < p.D) { y[n] = h[idx[f] * p.D + c]; } else { y[n] = extra[f * 4u + c - p.D]; }
}`;
const CURVE_ANCHORS = 9;
class WgslOwnTts {
  constructor(device, meta, bin) {
    this.device = device;
    this.meta = meta;
    this.bin = bin;
    meta.vocab.forEach((ch, i) => this.cid.set(ch, i + 2));
    meta.symbols.forEach((s, i) => this.symbolId.set(s, i));
    this.punct = new Set(meta.punctuation);
  }
  pipelines = {};
  buffers = [];
  g2pSteps = [];
  predSteps = [];
  genSteps = [];
  N = 0;
  P = 0;
  F = 0;
  cid = /* @__PURE__ */ new Map();
  punct;
  symbolId = /* @__PURE__ */ new Map();
  g2pIn;
  g2pLogits;
  g2pRead;
  predIn;
  predHead;
  predRead;
  predHidden;
  frameIdx;
  frameExtra;
  /** gen.inp's [scale | bias] buffer and its bias (the style blend is added to it per utterance) */
  genSb;
  z;
  decoder;
  bytes = 0;
  weightBytes = 0;
  /** Loads <modelsUrl>/<set>/own.{json,bin} and the NSF decoder <modelsUrl>/<decoderSet>/nsf.{json,bin}. */
  static async load(device, set, decoderSet, streaming = false, modelsUrl = "models") {
    const base = modelsUrl.replace(/\/$/, "");
    const [mr, br, dec] = await Promise.all([modelFetch(`${base}/${set}/own.json`), modelFetch(`${base}/${set}/own.bin`), loadNsfWeights(`${base}/${decoderSet}/nsf`)]);
    if (!mr.ok || !br.ok) throw new Error(`tts weights ${set}: ${mr.status} / ${br.status}`);
    return WgslOwnTts.fromData(device, await mr.json(), await br.arrayBuffer(), dec, streaming);
  }
  /** The same from weights already in memory (own.json / own.bin as one, the decoder's converted weights and its nsf.json). */
  static async fromData(device, meta, bin, dec, streaming = false) {
    const m = new WgslOwnTts(device, meta, bin);
    const codes = { lin8: linear("int8"), lin16: linear("fp16"), im2col: IM2COL, dwNorm: DW_NORM, vattn: VITS_ATTN, frameIn: FRAME_IN };
    for (const [name, code] of Object.entries(codes)) {
      m.pipelines[name] = await device.createComputePipelineAsync({ layout: "auto", compute: { module: device.createShaderModule({ code }), entryPoint: "main" } });
    }
    m.build();
    m.decoder = await WgslNsfDecoder.create(device, dec.weights, streaming ? MAX_FRAMES : DEC_MAX, void 0, nsfF0Norm(dec.meta), nsfOutputGain(dec.meta));
    m.bytes += m.decoder.bytes;
    m.weightBytes += m.decoder.weightBytes;
    return m;
  }
  tensor(name) {
    const t = this.meta.tensors.find((x) => x.name === name);
    if (!t) throw new Error(`own tts tensor ${name} missing`);
    return t;
  }
  f32(name) {
    const t = this.tensor(name);
    if (t.dtype !== "f32") throw new Error(`own tts tensor ${name}: ${t.dtype}`);
    return new Float32Array(this.bin, t.offset, t.bytes / 4);
  }
  buffer(size, usage) {
    const s = Math.ceil(size / 16) * 16;
    this.bytes += s;
    const b = this.device.createBuffer({ size: s, usage });
    this.buffers.push(b);
    return b;
  }
  upload(data) {
    const b = this.buffer(data.byteLength, STORAGE | COPY_DST);
    this.weightBytes += data.byteLength;
    this.device.queue.writeBuffer(b, 0, data.buffer, data.byteOffset, data.byteLength);
    return b;
  }
  step(name, buffers, params, groups) {
    const pipeline = this.pipelines[name];
    const uniform = this.buffer(32, UNIFORM | COPY_DST);
    const bind = this.device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [uniform, ...buffers].map((buffer, binding) => ({ binding, resource: { buffer } }))
    });
    return { pipeline, bind, uniform, params, groups };
  }
  /** y (+)= act(x W + b): int8 (`.q` [I, O4 * 4], `.s`, `.b`) or fp16 (`.w` [I, O], `.b`). act 1 GELU, 2 ReLU; res 1 adds. */
  lin(T, name, x, I, O, y, act, res, keepSb = false) {
    const O4 = Math.ceil(O / 4);
    const sb = new Float32Array(O4 * 8).fill(1, 0, O4 * 4);
    sb.set(this.f32(`${name}.b`), O4 * 4);
    let w;
    let kind;
    const q = this.meta.tensors.find((t) => t.name === `${name}.q`);
    if (q) {
      if (q.shape[0] !== I || q.shape[1] !== O4 * 4) throw new Error(`own tts ${name}.q shape ${q.shape}`);
      w = new Uint32Array(this.bin, q.offset, q.bytes / 4);
      sb.set(this.f32(`${name}.s`).subarray(0, O4 * 4));
      kind = "lin8";
    } else {
      const t = this.tensor(`${name}.w`);
      if (t.dtype !== "f16" || t.shape[0] !== I || t.shape[1] !== O) throw new Error(`own tts ${name}.w shape ${t.shape}`);
      const src = new Uint16Array(this.bin, t.offset, I * O);
      const h = new Uint16Array(I * O4 * 4);
      for (let i = 0; i < I; i++) h.set(src.subarray(i * O, (i + 1) * O), i * O4 * 4);
      w = new Uint32Array(h.buffer);
      kind = "lin16";
    }
    const sbb = this.upload(sb);
    if (keepSb) this.genSb = { buf: sbb, base: sb, O4 };
    return this.step(kind, [x, this.upload(w), sbb, y], () => uniformData([T(), I, O4, act, res]), () => O4 * Math.ceil(T() / ROWS));
  }
  norm(T, name, x, D, y, K = 0) {
    return this.step("dwNorm", [x, this.upload(this.f32(name)), y], () => uniformData([T(), D, K, K > 0 ? 1 : 0, { f: this.meta.shape.lnEps }]), T);
  }
  build() {
    const S = this.meta.shape;
    const W = S.window;
    const f32 = (rows, cols, usage = STORAGE) => this.buffer(rows * cols * 4, usage);
    const attn = (T, name, qkv, D, H, o) => this.step("vattn", [qkv, this.upload(this.f32(`${name}.relk`)), this.upload(this.f32(`${name}.relv`)), o], () => uniformData([T(), H, D / H, W]), () => H * T());
    const im2col = (T, x, C, K, col) => this.step("im2col", [x, col], () => uniformData([T(), C, K]), () => Math.ceil(T() * K * C / WG));
    const N = () => this.N;
    const P = () => this.P;
    const F = () => this.F;
    {
      const g = S.g2p;
      const D = g.dim;
      this.g2pIn = f32(MAX_CHARS, D, STORAGE | COPY_DST);
      const x = f32(MAX_CHARS, D);
      const x2 = f32(MAX_CHARS, D);
      const qkv = f32(MAX_CHARS, 3 * D);
      const att = f32(MAX_CHARS, D);
      const ff = f32(MAX_CHARS, g.ff);
      const s = [this.norm(N, "g2p.ln", this.g2pIn, D, x)];
      for (let l = 0; l < g.layers; l++) {
        const n = `g2p.l${l}`;
        s.push(this.lin(N, `${n}.qkv`, x, D, 3 * D, qkv, 0, 0), attn(N, n, qkv, D, g.heads, att), this.lin(N, `${n}.o`, att, D, D, x, 0, 1), this.norm(N, `${n}.ln1`, x, D, x2));
        s.push(this.lin(N, `${n}.ff1`, x2, D, g.ff, ff, 1, 0), this.lin(N, `${n}.ff2`, ff, g.ff, D, x2, 0, 1), this.norm(N, `${n}.ln2`, x2, D, x));
      }
      const O = g.slots * (g.phoneClasses + g.marks);
      this.g2pLogits = f32(MAX_CHARS, Math.ceil(O / 4) * 4, STORAGE | COPY_SRC);
      this.g2pRead = f32(MAX_CHARS, Math.ceil(O / 4) * 4, MAP_READ | COPY_DST);
      s.push(this.lin(N, "g2p.head", x, D, O, this.g2pLogits, 0, 0));
      this.g2pSteps = s;
    }
    {
      const p = S.pred;
      const D = p.dim;
      const K = p.kernel;
      this.predIn = f32(MAX_PHONES, D, STORAGE | COPY_DST);
      const x = f32(MAX_PHONES, D);
      const x2 = f32(MAX_PHONES, D);
      const qkv = f32(MAX_PHONES, 3 * D);
      const att = f32(MAX_PHONES, D);
      const ff = f32(MAX_PHONES, p.ff);
      const col = f32(MAX_PHONES, K * Math.max(D, p.ff));
      const s = [this.norm(P, "pred.ln", this.predIn, D, x)];
      for (let l = 0; l < p.layers; l++) {
        const n = `pred.l${l}`;
        s.push(this.lin(P, `${n}.qkv`, x, D, 3 * D, qkv, 0, 0), attn(P, n, qkv, D, p.heads, att), this.lin(P, `${n}.o`, att, D, D, x, 0, 1), this.norm(P, `${n}.ln1`, x, D, x2));
        s.push(im2col(P, x2, D, K, col), this.lin(P, `${n}.ff1`, col, K * D, p.ff, ff, 2, 0));
        s.push(im2col(P, ff, p.ff, K, col), this.lin(P, `${n}.ff2`, col, K * p.ff, D, x2, 0, 1), this.norm(P, `${n}.ln2`, x2, D, x));
      }
      this.predHidden = x;
      this.predHead = f32(MAX_PHONES, 4, STORAGE | COPY_SRC);
      this.predRead = f32(MAX_PHONES, 4, MAP_READ | COPY_DST);
      s.push(this.lin(P, "pred.head", x, D, 4, this.predHead, 0, 0));
      this.predSteps = s;
    }
    {
      const n = S.gen;
      const Dp = S.pred.dim;
      this.frameIdx = this.buffer(MAX_FRAMES * 4, STORAGE | COPY_DST);
      this.frameExtra = f32(MAX_FRAMES, n.extra, STORAGE | COPY_DST);
      const gin = f32(MAX_FRAMES, Dp + n.extra);
      const gx = f32(MAX_FRAMES, n.dim);
      const gh = f32(MAX_FRAMES, n.dim);
      const ga = f32(MAX_FRAMES, n.ff);
      const s = [this.step("frameIn", [this.frameIdx, this.predHidden, this.frameExtra, gin], () => uniformData([F(), Dp]), () => Math.ceil(F() * (Dp + n.extra) / WG))];
      s.push(this.lin(F, "gen.inp", gin, Dp + n.extra, n.dim, gx, 0, 0, true));
      for (let l = 0; l < n.layers; l++) {
        s.push(this.norm(F, `gen.l${l}.dw`, gx, n.dim, gh, n.kernel), this.lin(F, `gen.l${l}.pw1`, gh, n.dim, n.ff, ga, 1, 0), this.lin(F, `gen.l${l}.pw2`, ga, n.ff, n.dim, gx, 0, 1));
      }
      s.push(this.norm(F, "gen.norm", gx, n.dim, gh));
      this.z = f32(MAX_FRAMES, n.z, STORAGE | COPY_SRC);
      s.push(this.lin(F, "gen.out", gh, n.dim, n.z, this.z, 0, 0));
      this.genSteps = s;
    }
  }
  submit(steps, after) {
    for (const st of steps) this.device.queue.writeBuffer(st.uniform, 0, st.params());
    const enc = this.device.createCommandEncoder();
    const pass = enc.beginComputePass();
    for (const st of steps) {
      const groups = st.groups();
      pass.setPipeline(st.pipeline);
      pass.setBindGroup(0, st.bind);
      pass.dispatchWorkgroups(Math.min(groups, 65535), Math.ceil(groups / 65535));
    }
    pass.end();
    after?.(enc);
    this.device.queue.submit([enc.finish()]);
  }
  async read(src, dst, bytes, steps) {
    this.submit(steps, (enc) => enc.copyBufferToBuffer(src, 0, dst, 0, bytes));
    await dst.mapAsync(1, 0, bytes);
    const r = new Float32Array(dst.getMappedRange(0, bytes).slice(0));
    dst.unmap();
    return r;
  }
  /** Char ids of normalized text (vocab index + 2; 1 = UNK). */
  charIds(norm) {
    const ids = [];
    const unknown = [];
    for (const ch of norm) {
      const id = this.cid.get(ch);
      if (id === void 0) unknown.push(ch);
      ids.push(id ?? this.meta.charUnk);
    }
    return { ids, unknown };
  }
  /** G2P on char ids: logits [N, slots * (classes + marks)] and the argmax per slot [phones x slots | marks x slots]. */
  async g2p(ids) {
    const g = this.meta.shape.g2p;
    const N = ids.length;
    if (N < 1 || N > MAX_CHARS) throw new Error(`own tts: ${N} chars (max ${MAX_CHARS})`);
    this.N = N;
    const D = g.dim;
    const q = this.tensor("g2p.emb.q");
    const emb = new Int8Array(this.bin, q.offset, q.bytes);
    const sc = this.f32("g2p.emb.s");
    const x = new Float32Array(N * D);
    ids.forEach((id, i) => {
      for (let c = 0; c < D; c++) x[i * D + c] = id === this.meta.charPad ? 0 : emb[id * D + c] * sc[id];
    });
    this.device.queue.writeBuffer(this.g2pIn, 0, x.buffer, 0, x.byteLength);
    const O = g.slots * (g.phoneClasses + g.marks);
    const O4 = Math.ceil(O / 4) * 4;
    const raw = await this.read(this.g2pLogits, this.g2pRead, N * O4 * 4, this.g2pSteps);
    const logits = new Float32Array(N * O);
    for (let i = 0; i < N; i++) logits.set(raw.subarray(i * O4, i * O4 + O), i * O);
    const nP = g.slots * g.phoneClasses;
    const argmax = (o, n) => {
      let b = 0;
      for (let k = 1; k < n; k++) if (logits[o + k] > logits[o + b]) b = k;
      return b;
    };
    const slots = ids.map((_, i) => {
      const r = [];
      for (let k = 0; k < g.slots; k++) r.push(argmax(i * O + k * g.phoneClasses, g.phoneClasses));
      for (let k = 0; k < g.slots; k++) r.push(argmax(i * O + nP + k * g.marks, g.marks));
      return r;
    });
    return { logits, slots };
  }
  /** Predictor on [_ phones _]: hidden stays on the GPU for the generator; returns the head [P, 4]. */
  async predict(input, blend, blendAt) {
    const Dp = this.meta.shape.pred.dim;
    const P = input.phones.length;
    if (P > MAX_PHONES) throw new Error(`own tts: ${P} phones (max ${MAX_PHONES})`);
    this.P = P;
    const emb = this.f32("pred.emb");
    const acc = this.f32("pred.accent");
    const sty = this.f32("pred.style");
    const style = new Float32Array(Dp);
    emotionNames.forEach((k, i) => {
      const w = blend[k];
      if (w) for (let c = 0; c < Dp; c++) style[c] = style[c] + w * sty[i * Dp + c];
    });
    const x = new Float32Array(P * Dp);
    for (let p = 0; p < P; p++) {
      const id = this.symbolId.get(input.phones[p]);
      if (id === void 0) throw new Error(`own tts: phone ${input.phones[p]} not in the symbols`);
      const a = [input.acc.tone[p], input.acc.nucleus[p], input.acc.boundary[p], input.acc.pos[p]];
      if (blendAt) {
        const b = blendAt(P > 1 ? p / (P - 1) : 0);
        style.fill(0);
        emotionNames.forEach((k, i) => {
          const w = b[k];
          if (w) for (let c = 0; c < Dp; c++) style[c] = style[c] + w * sty[i * Dp + c];
        });
      }
      for (let c = 0; c < Dp; c++) x[p * Dp + c] = emb[id * Dp + c] + a[0] * acc[c] + a[1] * acc[Dp + c] + a[2] * acc[2 * Dp + c] + a[3] * acc[3 * Dp + c] + style[c];
    }
    this.device.queue.writeBuffer(this.predIn, 0, x.buffer, 0, x.byteLength);
    return this.read(this.predHead, this.predRead, P * 16, this.predSteps);
  }
  /** Generator + decoder on frame rows (the predictor's hidden of the last predict()). */
  async synth(pr, blend, stream, blendAt) {
    const t0 = performance.now();
    const { idx, extra } = frameRows(pr);
    const F = idx.length;
    if (F > MAX_FRAMES) throw new Error(`own tts: ${F} frames (max ${MAX_FRAMES})`);
    this.F = F;
    const q = this.device.queue;
    q.writeBuffer(this.frameIdx, 0, idx.buffer, 0, idx.byteLength);
    q.writeBuffer(this.frameExtra, 0, extra.buffer, 0, extra.byteLength);
    const Dg = this.meta.shape.gen.dim;
    const gs = this.f32("gen.style");
    const runGen = (b) => {
      const sb = this.genSb.base.slice();
      emotionNames.forEach((k, i) => {
        const w = b[k];
        if (w) for (let c = 0; c < Dg; c++) sb[this.genSb.O4 * 4 + c] = sb[this.genSb.O4 * 4 + c] + w * gs[i * Dg + c];
      });
      q.writeBuffer(this.genSb.buf, 0, sb.buffer, 0, sb.byteLength);
      this.submit(this.genSteps);
    };
    if (!blendAt) {
      runGen(blend);
      await q.onSubmittedWorkDone();
    } else {
      const Dz = this.meta.shape.gen.z;
      const zs = [];
      for (let k = 0; k < CURVE_ANCHORS; k++) {
        runGen(blendAt(k / (CURVE_ANCHORS - 1)));
        zs.push(await this.readZ());
      }
      const z = new Float32Array(F * Dz);
      for (let t = 0; t < F; t++) {
        const u = (F > 1 ? t / (F - 1) : 0) * (CURVE_ANCHORS - 1);
        const k = Math.min(CURVE_ANCHORS - 2, Math.floor(u));
        const h = u - k;
        const za = zs[k], zb = zs[k + 1];
        for (let c = 0; c < Dz; c++) z[t * Dz + c] = (1 - h) * za[t * Dz + c] + h * zb[t * Dz + c];
      }
      q.writeBuffer(this.z, 0, z.buffer, 0, z.byteLength);
    }
    const t1 = performance.now();
    let audio;
    if (stream) {
      const T = Math.max(3, F);
      if (T > F) await this.padZ(F, T);
      audio = new Float32Array(F * NSF.hop);
      for await (const c of this.decoder.streamFromBuffer(this.z, T, stream.blockFrames ?? 128)) {
        const pcm = c.audio.subarray(0, Math.max(0, Math.min(c.audio.length, audio.length - c.sampleStart)));
        audio.set(pcm, c.sampleStart);
        await stream.onChunk({ ...c, audio: pcm, genMs: t1 - t0 });
      }
    } else if (F <= DEC_MAX) {
      const T = Math.max(3, F);
      if (T > F) await this.padZ(F, T);
      const { audio: y } = await this.decoder.runFromBuffer(this.z, 0, T);
      audio = T > F ? y.slice(0, F * NSF.hop) : y;
    } else {
      const hop = NSF.hop;
      const core = DEC_MAX - 2 * DEC_CTX;
      audio = new Float32Array(F * hop);
      for (let a = 0; a < F; a += core) {
        const from = Math.max(0, a - DEC_CTX);
        const to = Math.min(F, a + core + DEC_CTX);
        const { audio: y } = await this.decoder.runFromBuffer(this.z, from, to - from);
        audio.set(y.subarray((a - from) * hop, (Math.min(F, a + core) - from) * hop), a * hop);
      }
    }
    return { audio, genMs: t1 - t0, decoderMs: performance.now() - t1, frames: F };
  }
  /** z rows F..T-1 = row F-1 (only for chunks under 3 frames). */
  async padZ(F, T) {
    const D = this.meta.shape.gen.z;
    const z = await this.readZ();
    const pad = new Float32Array((T - F) * D);
    for (let f = 0; f < T - F; f++) pad.set(z.subarray((F - 1) * D, F * D), f * D);
    this.device.queue.writeBuffer(this.z, F * D * 4, pad.buffer, 0, pad.byteLength);
  }
  /** z [F, 192] of the last synth. */
  async readZ() {
    const bytes = this.F * this.meta.shape.gen.z * 4;
    const dst = this.device.createBuffer({ size: bytes, usage: MAP_READ | COPY_DST });
    const enc = this.device.createCommandEncoder();
    enc.copyBufferToBuffer(this.z, 0, dst, 0, bytes);
    this.device.queue.submit([enc.finish()]);
    await dst.mapAsync(1, 0, bytes);
    const r = new Float32Array(dst.getMappedRange(0, bytes).slice(0));
    dst.destroy();
    return r;
  }
  /** G2P labels of text (normalized, after dictionary L1): for showing / editing the readings and accents. */
  async analyze(text, dict = [], latin = true, numbers = "rule") {
    const norm = normalizeOwnText(text, { latin, amounts: numbersToAmounts(numbers) });
    const d0 = applyOwnDict(norm, dict, latin);
    const d = d0;
    const inp = withEndMark(d.text, this.punct);
    const { ids, unknown } = this.charIds(inp.text);
    const { slots } = await this.g2p(ids);
    const g0 = slotsToPhones(slots, this.meta, this.meta.shape.g2p.slots);
    const g = inp.added ? dropEndMark(g0) : g0;
    const L = dictLabels(g, d.matches, this.meta.kana);
    return { norm, g2pText: d.text, unknown, g2p: g, ...L };
  }
  /** One sentence to audio (44.1 kHz). */
  async speak(text, o) {
    const t0 = performance.now();
    const settings = voiceDictSettings(o.settings, this.meta);
    const a = await this.analyze(text, o.dict ?? [], o.latin ?? true, o.numbers ?? "rule");
    const t1 = performance.now();
    const phones = o.labels?.phones ?? a.phones;
    const marks = o.labels?.marks ?? a.marks;
    const words = o.labels ? a.words.filter((w) => w.b <= phones.length) : a.words;
    const strength = o.strength ?? 1;
    const typed = words.some((w) => w.entry.accent !== void 0);
    let base = null;
    if (typed && a.aligned && !o.labels) {
      const inB = predictorInput(a.g2p.phones, a.g2p.marks, this.punct);
      base = prosodyFromHead(inB, await this.predict(inB, o.blend), this.meta, o.blend, strength);
    }
    const inp = predictorInput(phones, marks, this.punct);
    const pr = prosodyFromHead(inp, await this.predict(inp, o.blend, o.blendAt), this.meta, o.blend, strength);
    if (o.blendAt) {
      const P = pr.phones.length;
      pr.phones.forEach((_, i) => {
        const { B, H, D } = templateParams(this.meta, o.blendAt(P > 1 ? i / (P - 1) : 0));
        pr.template[i] = B + H * pr.acc.tone[i] - D * pr.acc.pos[i];
        pr.f0[i] = pr.template[i] + strength * pr.dev[i];
      });
    }
    let { f0, dur } = { f0: pr.f0, dur: pr.dur };
    if (words.length) ({ f0, dur } = dictProsody(base ?? pr, pr, words, this.meta, o.blend, settings));
    if (o.f0Add) f0 = f0.map((v, i) => v + (i > 0 && i <= o.f0Add.length ? o.f0Add[i - 1] : 0));
    if (o.durScale) dur = dur.map((v, i) => i > 0 && i <= o.durScale.length ? Math.max(1, Math.round(v * o.durScale[i - 1])) : v);
    ({ f0, dur } = applySpeedPitch(f0, dur, o.speed, o.pitch));
    const t2 = performance.now();
    if (o.blendAt && o.stream) throw new Error("own tts: blendAt is not combined with stream");
    const s = await this.synth({ dur, f0, energy: pr.energy, voiced: pr.voiced }, o.blend, o.stream, o.blendAt);
    let nan = 0;
    for (const v of s.audio) if (!Number.isFinite(v)) nan++;
    const r = (v) => +v.toFixed(1);
    return {
      norm: a.norm,
      unknown: a.unknown,
      g2p: { phones: a.g2p.phones, marks: a.g2p.marks },
      phones,
      marks,
      words,
      prosody: pr,
      f0,
      dur,
      audio: s.audio,
      timing: { g2pMs: r(t1 - t0), predMs: r(t2 - t1), genMs: r(s.genMs), decoderMs: r(s.decoderMs), totalMs: r(performance.now() - t0), frames: s.frames, nan }
    };
  }
  destroy() {
    this.decoder.destroy();
    for (const b of this.buffers) b.destroy();
    this.buffers.length = 0;
  }
}
export {
  WgslOwnTts
};
