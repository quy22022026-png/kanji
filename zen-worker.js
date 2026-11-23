/** Application adapter for the unmodified official ZEN-TTS v1.3.0 runtime. */
let engine = null;
let queue = Promise.resolve();
self.onmessage = ({data}) => {
  queue = queue.then(async () => {
    try {
      if (data.type === 'load') {
        const assets = new Map(data.assets.map(asset => [asset.url,asset]));
        const nativeFetch = self.fetch.bind(self);
        // Transfer validated model bytes into the runtime without downloading twice.
        self.fetch = (input, init) => {
          const url = typeof input === 'string' ? input : input.url || String(input);
          const asset = assets.get(url);
          return asset ? Promise.resolve(new Response(asset.body,{headers:asset.headers})) : nativeFetch(input,init);
        };
        const {ZenTts} = await import('./vendor/zen-tts/index.js');
        engine?.destroy();
        engine = await ZenTts.load({...data.options, backend:'cpu'});
        self.postMessage({id:data.id,result:{backend:engine.backend}});
        return;
      }
      if (data.type === 'speak') {
        if (!engine) throw new Error('ZEN-TTS chưa khởi tạo.');
        const {wavBlob} = await import('./vendor/zen-tts/index.js');
        const result = await engine.speak(data.text,data.options);
        if (!result.audio?.length || !result.audio.every(Number.isFinite) || !result.audio.some(value => Math.abs(value) > 1e-7)) throw new Error('Mẫu âm thanh rỗng hoặc không hợp lệ.');
        self.postMessage({id:data.id,result:{wav:wavBlob(result.audio,result.sampleRate),sampleRate:result.sampleRate,samples:result.audio.length}});
        return;
      }
      throw new Error('Unknown ZEN request: '+data.type);
    } catch (error) { self.postMessage({id:data.id,error:error.message || String(error)}); }
  }).catch(error => self.postMessage({id:data.id,error:error.message}));
};
