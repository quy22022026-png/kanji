import { CpuOwnTts } from "./cpu-tts.js";
import { nsfExportToWeights, nsfF0Norm, nsfOutputGain } from "./nsf-weights.js";
import { curveFn } from "./speak-options.js";
const scope = self;
let tts = null;
scope.onmessage = (e) => {
  const m = e.data;
  void (async () => {
    try {
      if (m.type === "load") {
        tts = await CpuOwnTts.create(m.wasm, m.meta, m.bin, nsfExportToWeights(m.nsfMeta, m.nsfBin), nsfF0Norm(m.nsfMeta), nsfOutputGain(m.nsfMeta));
        scope.postMessage({ type: "ready", id: m.id });
        return;
      }
      if (!tts) throw new Error("cpu tts not loaded");
      if (m.type === "analyze") {
        scope.postMessage({ type: "analyzed", id: m.id, result: tts.analyze(m.text, m.dict, true, m.numbers ?? "rule") });
        return;
      }
      const { curve, ...o } = m.options;
      const blendAt = curve ? curveFn(curve) : void 0;
      const r = tts.speak(m.text, { ...o, ...blendAt ? { blendAt } : {} });
      scope.postMessage({ type: "spoken", id: m.id, result: r }, [r.audio.buffer]);
    } catch (err) {
      scope.postMessage({ type: "error", id: m.id, message: err instanceof Error ? err.message : String(err) });
    }
  })();
};
