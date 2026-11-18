import { numbersToAmounts } from "./ja-text-normalize.js";
import { blendFrom, emotionNames, neutralBlend } from "./emotion.js";
import { ttsDemoCurveBlend } from "./emotion-curve.js";
import { checkSpeedPitch } from "./speak-rate.js";
function emotionBlend(amounts) {
  if (!amounts) return neutralBlend;
  const v = emotionNames.map((k) => {
    const x = amounts[k] ?? 0;
    return Number.isFinite(x) && x > 0 ? x : 0;
  });
  return v.some((x) => x > 0) ? blendFrom(v) : neutralBlend;
}
function engineOptionsOf(o) {
  const blend = emotionBlend(o.emotion);
  const opts = { blend };
  if (o.strength !== void 0) opts.strength = o.strength;
  if (o.dict) opts.dict = o.dict;
  if (o.settings) opts.settings = o.settings;
  if (o.latin !== void 0) opts.latin = o.latin;
  if (o.numbers !== void 0) {
    numbersToAmounts(o.numbers);
    opts.numbers = o.numbers;
  }
  checkSpeedPitch(o.speed, o.pitch);
  if (o.speed !== void 0) opts.speed = o.speed;
  if (o.pitch !== void 0) opts.pitch = o.pitch;
  if (o.change) {
    const c = o.change;
    opts.blendAt = ttsDemoCurveBlend(blend, emotionBlend(c.to), c.curve ?? "ease", c.from ?? 0, c.until ?? 1);
  }
  return opts;
}
const CURVE_POINTS = 129;
function curvePoints(blendAt) {
  return Array.from({ length: CURVE_POINTS }, (_, i) => blendAt(i / (CURVE_POINTS - 1)));
}
function curveFn(points) {
  const n = points.length - 1;
  return (x) => {
    const u = Math.min(1, Math.max(0, x)) * n;
    const k = Math.min(n - 1, Math.floor(u));
    const h = u - k;
    const a = points[k], b = points[k + 1];
    return Object.fromEntries(Object.keys(a).map((key) => [key, (1 - h) * a[key] + h * b[key]]));
  };
}
function splitSentences(text, maxChars = 120) {
  const out = [];
  for (const line of text.split(/\r?\n+/)) {
    for (const m of line.matchAll(/[^。！？!?]+[。！？!?]*|[。！？!?]+/gu)) {
      let s = m[0].trim();
      while (s.length > maxChars) {
        const head = s.slice(0, maxChars);
        const cut = Math.max(head.lastIndexOf("\u3001"), head.lastIndexOf("\uFF0C"), head.lastIndexOf(","), head.lastIndexOf(" "));
        const at = cut > 0 ? cut + 1 : maxChars;
        out.push(s.slice(0, at).trim());
        s = s.slice(at).trim();
      }
      if (s && /[^\s。！？!?、，,]/u.test(s)) out.push(s);
    }
  }
  return out;
}
export {
  CURVE_POINTS,
  curveFn,
  curvePoints,
  emotionBlend,
  engineOptionsOf,
  splitSentences
};
