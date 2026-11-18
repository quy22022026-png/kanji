import { HALF } from "./half.js";
const NSF = {
  zDim: 192,
  dim: 384,
  ffDim: 1152,
  layers: 8,
  kernel: 7,
  nFft: 2048,
  bins: 1025,
  hop: 512,
  sampleRate: 44100,
  lnEps: 1e-6,
  maxMag: 100,
  /** cap of the noise gain exp(log G) for noiseBranch 'direct' (the training clamp) */
  noiseMaxMag: 1e4,
  f0zDim: 192,
  f0zFf: 576,
  f0zLayers: 4
};
const TRUNK = { prefix: "", C: NSF.zDim + 2, D: NSF.dim, F: NSF.ffDim, layers: NSF.layers };
const F0Z = { prefix: "f0z.", C: NSF.zDim, D: NSF.f0zDim, F: NSF.f0zFf, layers: NSF.f0zLayers };
function nsfHeadRows(meta) {
  if (meta.noiseBranch === void 0) return 3;
  if (meta.noiseBranch !== "direct") throw new Error(`nsf.json: unknown noiseBranch ${String(meta.noiseBranch)}`);
  if (meta.noiseMaxMag !== void 0 && meta.noiseMaxMag !== NSF.noiseMaxMag) throw new Error(`nsf.json: noiseMaxMag ${meta.noiseMaxMag} (this runtime: ${NSF.noiseMaxMag})`);
  return 5;
}
function nsfDirectNoise(W) {
  const n = W["head.b"]?.length;
  if (n === 5 * NSF.bins) return true;
  if (n === 3 * NSF.bins) return false;
  throw new Error(`nsf weights: head.b has ${n} values (want ${3 * NSF.bins} or ${5 * NSF.bins})`);
}
const DEFAULT_NSF_F0_NORM = { logF0Mean: 5.43, logF0Std: 0.25 };
const DEFAULT_NSF_OUTPUT_GAIN = 1;
const NSF_LIMIT_KNEE = 0.8;
const NSF_LIMIT_CEILING = 0.95;
function applyOutputLevel(audio, gain) {
  if (gain === 1) return audio;
  const k = NSF_LIMIT_KNEE, span = NSF_LIMIT_CEILING - NSF_LIMIT_KNEE, limit = gain > 1;
  for (let i = 0; i < audio.length; i++) {
    let y = audio[i] * gain;
    if (limit) {
      const a = Math.abs(y);
      if (a > k) y = Math.sign(y) * (k + span * Math.tanh((a - k) / span));
    }
    audio[i] = Math.fround(y);
  }
  return audio;
}
function nsfOutputGain(meta) {
  const g = meta.outputGain ?? DEFAULT_NSF_OUTPUT_GAIN;
  if (!Number.isFinite(g) || !(g > 0)) throw new Error(`nsf.json: bad outputGain ${g}`);
  return g;
}
function nsfF0Norm(meta) {
  const n = { logF0Mean: meta.logF0Mean ?? DEFAULT_NSF_F0_NORM.logF0Mean, logF0Std: meta.logF0Std ?? DEFAULT_NSF_F0_NORM.logF0Std };
  if (!Number.isFinite(n.logF0Mean) || !(n.logF0Std > 0)) throw new Error(`nsf.json: bad logF0Mean / logF0Std ${n.logF0Mean} / ${n.logF0Std}`);
  return n;
}
function nsfExportToWeights(meta, bin) {
  const byName = new Map(meta.tensors.map((t) => [t.name, t]));
  const used = /* @__PURE__ */ new Set();
  const get = (name, size) => {
    const t = byName.get(name);
    if (!t) throw new Error(`nsf weights: ${name} missing`);
    const n = t.shape.reduce((a, b) => a * b, 1);
    if (n !== size) throw new Error(`nsf weights: ${name} has ${n} values (want ${size})`);
    used.add(name);
    const out = new Float32Array(n);
    if (meta.dtype === "fp16") {
      const h = new Uint16Array(bin, t.offset, n);
      for (let i = 0; i < n; i++) out[i] = HALF[h[i]];
    } else out.set(new Float32Array(bin, t.offset, n));
    return out;
  };
  const transpose = (w2, O, I, colScale) => {
    const r = new Float32Array(I * O);
    for (let o = 0; o < O; o++) {
      const s = colScale ? colScale[o] : 1;
      for (let i = 0; i < I; i++) r[i * O + o] = w2[o * I + i] * s;
    }
    return r;
  };
  const cat = (...a) => {
    const r = new Float32Array(a.reduce((n, x) => n + x.length, 0));
    let k = 0;
    for (const x of a) {
      r.set(x, k);
      k += x.length;
    }
    return r;
  };
  const K = NSF.kernel;
  const w = {};
  for (const [net, src] of [[TRUNK, "nsf."], [F0Z, "f0z."]]) {
    const p = net.prefix;
    const { C, D, F } = net;
    const ew = get(`${src}embed.weight`, D * C * K);
    const embed = new Float32Array(K * C * D);
    for (let o = 0; o < D; o++) for (let c = 0; c < C; c++) for (let k = 0; k < K; k++) embed[(k * C + c) * D + o] = ew[(o * C + c) * K + k];
    w[`${p}embed.w`] = embed;
    w[`${p}embed.b`] = get(`${src}embed.bias`, D);
    w[`${p}embed.norm`] = cat(get(`${src}norm.weight`, D), get(`${src}norm.bias`, D));
    for (let l = 0; l < net.layers; l++) {
      const b = `${src}blocks.${l}.`;
      const gamma = get(`${b}gamma`, D);
      w[`${p}${l}.dw`] = cat(get(`${b}dwconv.weight`, D * K), get(`${b}dwconv.bias`, D), get(`${b}norm.weight`, D), get(`${b}norm.bias`, D));
      w[`${p}${l}.pw1.w`] = transpose(get(`${b}pw1.weight`, F * D), F, D);
      w[`${p}${l}.pw1.b`] = get(`${b}pw1.bias`, F);
      w[`${p}${l}.pw2.w`] = transpose(get(`${b}pw2.weight`, D * F), D, F, gamma);
      const pb = get(`${b}pw2.bias`, D);
      for (let o = 0; o < D; o++) pb[o] = pb[o] * gamma[o];
      w[`${p}${l}.pw2.b`] = pb;
    }
  }
  w["final.norm"] = cat(get("nsf.final_norm.weight", NSF.dim), get("nsf.final_norm.bias", NSF.dim));
  const rows = nsfHeadRows(meta) * NSF.bins;
  w["head.w"] = transpose(get("nsf.out.weight", rows * NSF.dim), rows, NSF.dim);
  w["head.b"] = get("nsf.out.bias", rows);
  w["f0z.out.w"] = transpose(get("f0z.out.weight", 2 * NSF.f0zDim), 2, NSF.f0zDim);
  w["f0z.out.b"] = get("f0z.out.bias", 2);
  const unused = meta.tensors.map((t) => t.name).filter((n) => !used.has(n));
  if (unused.length) throw new Error(`nsf weights: unused tensors ${unused.join(", ")}`);
  return w;
}
export {
  DEFAULT_NSF_F0_NORM,
  DEFAULT_NSF_OUTPUT_GAIN,
  F0Z,
  NSF,
  NSF_LIMIT_CEILING,
  NSF_LIMIT_KNEE,
  TRUNK,
  applyOutputLevel,
  nsfDirectNoise,
  nsfExportToWeights,
  nsfF0Norm,
  nsfHeadRows,
  nsfOutputGain
};
