/** Application adapter for the unmodified official ZEN-TTS v1.3.0 runtime. */
let engine = null;
let queue = Promise.resolve();

function cutWord({audio,phones,dur,timing,sampleRate}, start, end) {
  const hop = audio?.length / timing?.frames;
  if (!Number.isInteger(hop) || hop < 1 || dur?.length !== phones.length + 2) return null;
  const from = hop * dur.slice(0,start + 1).reduce((sum,frames) => sum + frames,0);
  const to = from + hop * dur.slice(start + 1,end + 1).reduce((sum,frames) => sum + frames,0);
  if (from < 0 || to <= from || to > audio.length) return null;

  // Both boundaries are next to pauses. Add short silent margins and fade at the cut.
  const lead = Math.round(sampleRate * 0.025);
  const tail = Math.round(sampleRate * 0.045);
  const length = to - from;
  const fade = Math.max(1,Math.min(Math.round(sampleRate * 0.003), Math.floor(length / 2)));
  const clip = new Float32Array(lead + length + tail);
  for (let i = 0; i < length; i++) {
    clip[lead + i] = audio[from + i] * Math.min(1,i / fade,(length - 1 - i) / fade);
  }
  return clip;
}

function wordLevels(audio,sampleRate) {
  const window = Math.round(sampleRate * 0.01);
  const levels = [];
  let peak = 0;
  for (let start = 0; start < audio.length; start += window) {
    const end = Math.min(start + window,audio.length);
    let sum = 0;
    for (let i = start; i < end; i++) {
      peak = Math.max(peak,Math.abs(audio[i]));
      sum += audio[i] ** 2;
    }
    levels.push(Math.sqrt(sum / (end - start)));
  }
  levels.sort((a,b) => b - a);
  const active = levels.slice(0,Math.ceil(levels.length * 0.15));
  return {peak,rms:active.reduce((sum,level) => sum + level,0) / active.length};
}

function normalizeWord(audio,{peak,rms}) {
  // Boost quiet words while leaving headroom and avoiding amplification of near-silence.
  if (rms < 0.008) return audio;
  const gain = Math.max(1,Math.min(2.5,0.14 / rms,0.9 / peak));
  return gain > 1 ? audio.map(sample => sample * gain) : audio;
}

async function synthesizeWord(text,options) {
  const reading = text.normalize('NFKC');
  if (!options.dict?.length && /^[\p{Script=Hiragana}\p{Script=Katakana}ー]{2,16}$/u.test(reading)) {
    try {
      const carrier = `つぎは、${reading}、ですね。`;
      const [plain,contextual] = await Promise.all([
        engine.analyze(text),
        engine.analyze(carrier)
      ]);
      const phones = contextual.phones;
      const start = phones.indexOf(',') + 1;
      const end = phones.indexOf(',',start);
      // Keep the established reading when context changes a phone or the model loses a pause.
      if (start > 0 && end > start && phones.slice(start,end).join(' ') === plain.phones.join(' ')) {
        const result = await engine.speak(carrier,options);
        if (result.phones.join(' ') === phones.join(' ')) {
          const clip = cutWord(result,start,end);
          if (clip) {
            const levels = wordLevels(clip,result.sampleRate);
            if (Number.isFinite(levels.peak) && levels.rms >= 0.008) {
              return {...result,audio:normalizeWord(clip,levels)};
            }
          }
        }
      }
    } catch {
      // If the contextual engine output cannot be used, synthesize only the requested word.
    }
  }
  const result = await engine.speak(text,options);
  if (!result.audio?.length) return result;
  return {...result,audio:normalizeWord(result.audio,wordLevels(result.audio,result.sampleRate))};
}

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
        const {isolatedWord,...options} = data.options || {};
        const result = isolatedWord ? await synthesizeWord(data.text,options) : await engine.speak(data.text,options);
        if (!result.audio?.length || !result.audio.every(Number.isFinite) || !result.audio.some(value => Math.abs(value) > 1e-7)) throw new Error('Mẫu âm thanh rỗng hoặc không hợp lệ.');
        self.postMessage({id:data.id,result:{wav:wavBlob(result.audio,result.sampleRate),sampleRate:result.sampleRate,samples:result.audio.length}});
        return;
      }
      throw new Error('Unknown ZEN request: '+data.type);
    } catch (error) { self.postMessage({id:data.id,error:error.message || String(error)}); }
  }).catch(error => self.postMessage({id:data.id,error:error.message}));
};
