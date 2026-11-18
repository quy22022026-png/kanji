import { WgslOwnTts } from "./runtime/tts-own-device.js";
import { CpuTts } from "./runtime/cpu-client.js";
import { emotionNames, neutralBlend } from "./runtime/emotion.js";
import { engineOptionsOf, splitSentences } from "./runtime/speak-options.js";
import { withBuiltinDict } from "./runtime/builtin-dict.js";
import { modelFetch } from "./runtime/model-fetch.js";
import { numbersToAmounts } from "./runtime/ja-text-normalize.js";
import { nsfExportToWeights } from "./runtime/nsf-weights.js";
import { g2pMismatch, ownFromZtm, parseZtm, vocoderFromZtm } from "./runtime/ztm.js";
import { TTS_DEMO_CURVES, TTS_DEMO_CURVE_LABEL } from "./runtime/emotion-curve.js";
import { DEFAULT_OWN_DICT_SETTINGS, pitchRangeOf } from "./runtime/tts-own-prosody.js";
const MODEL_SET = "tts";
const DECODER_SET = "decoder";
const SAMPLE_RATE = 44100;
import { VERSION, VOICE, VOICES, ZTM_BASE_URL, voiceDirs, ztmUrl } from "./version.js";
import { parseZtm as parseZtm2 } from "./runtime/ztm.js";
import { voiceDirs as voiceDirs2 } from "./version.js";
import { emotionBlend, splitSentences as splitSentences2 } from "./runtime/speak-options.js";
import { SPEED_MIN, SPEED_MAX, PITCH_MIN, PITCH_MAX } from "./runtime/speak-rate.js";
import { NUMBER_READINGS } from "./runtime/ja-text-normalize.js";
import { streamMaxChars } from "./runtime/speak-rate.js";
async function webgpuDevice() {
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) return void 0;
  const adapter = await gpu.requestAdapter();
  return adapter ? adapter.requestDevice() : void 0;
}
class ZenTts {
  constructor(engine, backend, voice, header) {
    this.engine = engine;
    this.backend = backend;
    this.voice = voice;
    this.header = header;
  }
  /** How long amounts and numbers before a unit are read when a call does not say (LoadOptions.numbers). */
  numbers = "rule";
  static async load(o = {}) {
    numbersToAmounts(o.numbers);
    const t = await ZenTts.loadEngine(o);
    if (o.numbers !== void 0) t.numbers = o.numbers;
    return t;
  }
  static async loadEngine(o) {
    if (o.model !== void 0) return ZenTts.loadZtm(o.model, o);
    const want = o.backend ?? "auto";
    const modelsUrl = o.modelsUrl ?? "./models";
    const dirs = voiceDirs2(o.voice);
    if (want !== "cpu") {
      const device = o.device ?? await webgpuDevice();
      if (device) return new ZenTts(await WgslOwnTts.load(device, dirs.tts, dirs.decoder, false, modelsUrl), "webgpu", o.voice ?? "marine");
      if (want === "webgpu") throw new Error("WebGPU is not available in this browser");
    }
    return new ZenTts(await CpuTts.load(o.cpuWasmUrl ?? "./cpu/tts-cpu.wasm", modelsUrl, dirs.tts, dirs.decoder), "cpu", o.voice ?? "marine");
  }
  /** A .ztm voice: one fetch of the file, plus the runtime's G2P under modelsUrl. */
  static async loadZtm(url, o) {
    const base = (o.modelsUrl ?? "./models").replace(/\/$/, "");
    const got = async (p) => {
      const r = await modelFetch(p);
      if (!r.ok) throw new Error(`zen-tts: ${p}: ${r.status}`);
      return r;
    };
    const [file, g2p, g2pBin] = await Promise.all([
      got(url).then((r) => r.arrayBuffer()),
      got(`${base}/g2p/g2p.json`).then((r) => r.json()),
      got(`${base}/g2p/g2p.bin`).then((r) => r.arrayBuffer())
    ]);
    const z = parseZtm(file);
    const warn = g2pMismatch(z, g2p);
    if (warn) console.warn(warn);
    const own = ownFromZtm(z, g2p, g2pBin);
    const voc = vocoderFromZtm(z);
    const want = o.backend ?? "auto";
    if (want !== "cpu") {
      const device = o.device ?? await webgpuDevice();
      if (device) return new ZenTts(await WgslOwnTts.fromData(device, own.meta, own.bin, { weights: nsfExportToWeights(voc.meta, voc.bin), meta: voc.meta }), "webgpu", z.header.voice.id, z.header);
      if (want === "webgpu") throw new Error("WebGPU is not available in this browser");
    }
    const wasm = await (await got(o.cpuWasmUrl ?? "./cpu/tts-cpu.wasm")).arrayBuffer();
    const s = z.header.sections.vocoder;
    const vocMeta = { ...z.header.vocoder.meta, tensors: z.header.vocoder.tensors };
    return new ZenTts(await CpuTts.fromData(wasm, own.meta, own.bin, vocMeta, file.slice(s.offset, s.offset + s.bytes)), "cpu", z.header.voice.id, z.header);
  }
  /** The model's tables (kana, punctuation, ...) for showing the readings. */
  get meta() {
    return this.engine.meta;
  }
  /** One sentence (up to about 11 s of speech) to 44.1 kHz mono audio. */
  async speak(text, o = {}) {
    return this.speakWith(text, engineOptionsOf({ numbers: this.numbers, ...o }));
  }
  /**
   * A text of any length, one sentence at a time (splitSentences): yields each sentence's audio as soon as it is made,
   * for playing (or lip-syncing) while the next is synthesised. Same options as speak().
   */
  async *speakStream(text, o = {}) {
    const opts = engineOptionsOf({ numbers: this.numbers, ...o });
    let index = 0;
    for (const sentence of splitSentences(text, streamMaxChars(o.speed))) {
      const r = await this.speakWith(sentence, opts);
      yield { index: index++, text: sentence, pcm: r.audio, sampleRate: SAMPLE_RATE, timing: r.timing };
    }
  }
  /** speak() with the engine's options as they are: a blend (or blendAt curve), and edits from an intonation UI
   *  (labels: accent marks, f0Add: semitones per phone, durScale: length per phone). */
  async speakWith(text, o) {
    if (o.stream) throw new Error("stream is not supported here");
    const r = await this.engine.speak(text, { numbers: this.numbers, ...o, dict: withBuiltinDict(o.dict) });
    return { ...r, sampleRate: SAMPLE_RATE };
  }
  /** Readings and accent marks the model would use (after the dictionary), for checking / editing. */
  analyze(text, dict = [], o = {}) {
    const numbers = o.numbers ?? this.numbers;
    numbersToAmounts(numbers);
    return this.engine.analyze(text, withBuiltinDict(dict), true, numbers);
  }
  destroy() {
    this.engine.destroy();
  }
}
function wavBlob(audio, sampleRate = SAMPLE_RATE) {
  const n = audio.length;
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const s = (o, t) => {
    for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i));
  };
  s(0, "RIFF");
  v.setUint32(4, 36 + n * 2, true);
  s(8, "WAVE");
  s(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  s(36, "data");
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, audio[i])) * 32767, true);
  return new Blob([buf], { type: "audio/wav" });
}
export {
  DECODER_SET,
  DEFAULT_OWN_DICT_SETTINGS as DEFAULT_DICT_SETTINGS,
  TTS_DEMO_CURVES as EMOTION_CURVES,
  TTS_DEMO_CURVE_LABEL as EMOTION_CURVE_LABEL,
  MODEL_SET,
  NUMBER_READINGS,
  PITCH_MAX,
  PITCH_MIN,
  SAMPLE_RATE,
  SPEED_MAX,
  SPEED_MIN,
  VERSION,
  VOICE,
  VOICES,
  ZTM_BASE_URL,
  ZenTts,
  emotionBlend,
  emotionNames,
  neutralBlend,
  parseZtm2 as parseZtm,
  pitchRangeOf,
  splitSentences2 as splitSentences,
  voiceDirs,
  wavBlob,
  ztmUrl
};
