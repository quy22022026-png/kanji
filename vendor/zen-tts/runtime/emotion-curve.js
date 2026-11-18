import { blendFrom, emotionNames, neutralBlend } from "./emotion.js";
const TTS_DEMO_MAX_TEXT = 300;
function ttsDemoBlend(percents) {
  if (percents.length !== emotionNames.length) throw new Error(`tts-demo: ${percents.length} sliders`);
  const v = percents.map((p) => Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0);
  return v.some((p) => p > 0) ? blendFrom(v) : neutralBlend;
}
function ttsDemoText(value) {
  return typeof value === "string" ? [...value.trim()].slice(0, TTS_DEMO_MAX_TEXT).join("") : "";
}
const TTS_DEMO_CURVES = ["ease", "linear", "fast-start", "late-surge", "switch", "steps", "hill", "valley", "wave"];
const TTS_DEMO_CURVE_LABEL = {
  ease: "\u306A\u3081\u3089\u304B",
  linear: "\u4E00\u5B9A\u306E\u901F\u3055",
  "fast-start": "\u51FA\u3060\u3057\u304B\u3089\u6025\u306B\u5909\u5316",
  "late-surge": "\u5F8C\u534A\u304B\u3089\u6025\u306B\u4E0A\u6607",
  switch: "\u9014\u4E2D\u3067\u4E00\u6C17\u306B\u5207\u308A\u66FF\u3048",
  steps: "\u968E\u6BB5",
  hill: "\u5C71\u306A\u308A",
  valley: "\u8C37",
  wave: "\u63FA\u308C"
};
function isTtsDemoCurve(v) {
  return typeof v === "string" && TTS_DEMO_CURVES.includes(v);
}
const SWITCH_STEEPNESS = 18;
const WAVE_HALF_CYCLES = 5;
function ttsDemoCurveShape(curve, u) {
  const t = Math.min(1, Math.max(0, u));
  switch (curve) {
    case "linear":
      return t;
    case "ease":
      return t * t * (3 - 2 * t);
    case "fast-start":
      return 1 - (1 - t) ** 3;
    case "late-surge":
      return t ** 3;
    case "switch": {
      const f = (x) => 1 / (1 + Math.exp(-SWITCH_STEEPNESS * (x - 0.5)));
      return (f(t) - f(0)) / (f(1) - f(0));
    }
    case "steps":
      return t < 1 / 3 ? 0 : t < 2 / 3 ? 0.5 : 1;
    case "hill":
      return Math.sin(Math.PI * t);
    case "valley":
      return 1 - Math.sin(Math.PI * t);
    case "wave":
      return (1 - Math.cos(WAVE_HALF_CYCLES * Math.PI * t)) / 2;
  }
}
function ttsDemoCurveBlend(start, end, curve, from, to) {
  const a = Math.min(from, to), b = Math.max(from, to);
  return (x) => {
    const u = b <= a ? x < a ? 0 : 1 : (x - a) / (b - a);
    const h = ttsDemoCurveShape(curve, u);
    return blendFrom(emotionNames.map((k) => (1 - h) * start[k] + h * end[k]));
  };
}
export {
  TTS_DEMO_CURVES,
  TTS_DEMO_CURVE_LABEL,
  TTS_DEMO_MAX_TEXT,
  isTtsDemoCurve,
  ttsDemoBlend,
  ttsDemoCurveBlend,
  ttsDemoCurveShape,
  ttsDemoText
};
