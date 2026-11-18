import { modelFetch } from "./model-fetch.js";
import { curvePoints } from "./speak-options.js";
class CpuTts {
  constructor(worker, meta) {
    this.worker = worker;
    this.meta = meta;
    worker.onmessage = (e) => {
      const w = this.waiting.get(e.data.id);
      if (!w) return;
      this.waiting.delete(e.data.id);
      if (e.data.type === "error") w.reject(new Error(e.data.message));
      else w.resolve(e.data);
    };
    worker.onerror = (e) => {
      for (const w of this.waiting.values()) w.reject(new Error(`cpu tts worker: ${e.message}`));
      this.waiting.clear();
    };
  }
  seq = 0;
  waiting = /* @__PURE__ */ new Map();
  ask(m, transfer = []) {
    return new Promise((resolve, reject) => {
      this.waiting.set(m.id, { resolve, reject });
      this.worker.postMessage(m, transfer);
    });
  }
  /** wasmUrl: cpu/tts-cpu.wasm; modelsUrl: the directory with <set>/own.* and <decoderSet>/nsf.*. */
  static async load(wasmUrl, modelsUrl, set, decoderSet) {
    const base = modelsUrl.replace(/\/$/, "");
    const got = async (r, what) => {
      const x = await r;
      if (!x.ok) throw new Error(`cpu tts ${what}: ${x.status}`);
      return x;
    };
    const [wasm, meta, bin, nsfMeta, nsfBin] = await Promise.all([
      got(fetch(wasmUrl), "tts-cpu.wasm").then((r) => r.arrayBuffer()),
      got(modelFetch(`${base}/${set}/own.json`), "own.json").then((r) => r.json()),
      got(modelFetch(`${base}/${set}/own.bin`), "own.bin").then((r) => r.arrayBuffer()),
      got(modelFetch(`${base}/${decoderSet}/nsf.json`), "nsf.json").then((r) => r.json()),
      got(modelFetch(`${base}/${decoderSet}/nsf.bin`), "nsf.bin").then((r) => r.arrayBuffer())
    ]);
    return CpuTts.fromData(wasm, meta, bin, nsfMeta, nsfBin);
  }
  /** The same from files already in memory (tts-cpu.wasm, own.json / own.bin, nsf.json / nsf.bin); the buffers are transferred. */
  static async fromData(wasm, meta, bin, nsfMeta, nsfBin) {
    const c = new CpuTts(new Worker(new URL("./cpu-worker.js", import.meta.url), { type: "module" }), meta);
    try {
      await c.ask({ type: "load", id: ++c.seq, wasm, meta, bin, nsfMeta, nsfBin }, [wasm, bin, nsfBin]);
    } catch (err) {
      c.destroy();
      throw err;
    }
    return c;
  }
  async speak(text, o) {
    const { blendAt, ...rest } = o;
    const options = blendAt ? { ...rest, curve: curvePoints(blendAt) } : rest;
    const r = await this.ask({ type: "speak", id: ++this.seq, text, options });
    if (r.type !== "spoken") throw new Error("cpu tts: unexpected reply");
    return r.result;
  }
  async analyze(text, dict = [], _latin = true, numbers) {
    const r = await this.ask({ type: "analyze", id: ++this.seq, text, dict: [...dict], ...numbers ? { numbers } : {} });
    if (r.type !== "analyzed") throw new Error("cpu tts: unexpected reply");
    return r.result;
  }
  destroy() {
    this.worker.terminate();
  }
}
export {
  CpuTts
};
