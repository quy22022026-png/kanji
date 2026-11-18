// App-owned adapter: keep model loading and synthesis off the UI thread.
// The vendored ZEN-TTS dependency is unmodified; only this worker's fetch is scoped.
import { ZenTts, wavBlob } from './vendor/zen-tts/index.js';

let engine = null;
self.onmessage = async ({ data: message }) => {
  const { id, type } = message;
  try {
    if (type === 'load') {
      const assets = new Map(message.assets.map(asset => [asset.url, asset]));
      const originalFetch = self.fetch;
      try {
        self.fetch = (input, init) => {
          const url = typeof input === 'string' ? input : input.url;
          const asset = assets.get(url);
          return asset
            ? Promise.resolve(new Response(asset.body, { headers: asset.headers }))
            : originalFetch.call(self, input, init);
        };
        try { engine = await ZenTts.load(message.options); }
        catch (error) {
          if (!self.navigator.gpu) throw error;
          engine = await ZenTts.load({ ...message.options, backend: 'cpu' });
        }
      } finally {
        self.fetch = originalFetch;
        assets.clear();
      }
      self.postMessage({ id, result: { backend: engine.backend } });
    } else if (type === 'speak') {
      if (!engine) throw new Error('Giọng đọc chưa sẵn sàng.');
      const result = await engine.speak(message.text, message.options);
      self.postMessage({ id, result: { wav: wavBlob(result.audio, result.sampleRate) } });
    } else {
      throw new Error('Lệnh âm thanh không hợp lệ.');
    }
  } catch (error) {
    self.postMessage({ id, error: error.message || String(error) });
  }
};
