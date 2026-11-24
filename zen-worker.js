/** Application adapter for the unmodified official ZEN-TTS v1.3.0 runtime. */
let engine = null;
let queue = Promise.resolve();

const JAPANESE_TERM = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]{1,24}$/u;
const KANA_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]{2,24}$/u;
const PAUSE_PHONE = new Set(['.', ',', '?', '!', '_']);

function cutWord({audio,phones,dur,timing,sampleRate}, start, end) {
  const hop = audio?.length / timing?.frames;
  if (!Number.isInteger(hop) || hop < 1 || dur?.length !== phones.length + 2) return null;
  let from = hop * dur.slice(0,start + 1).reduce((sum,frames) => sum + frames,0);
  let to = from + hop * dur.slice(start + 1,end + 1).reduce((sum,frames) => sum + frames,0);
  if (from < 0 || to <= from || to > audio.length) return null;

  // Keep the natural release into silence, without extending into a neighboring phone.
  const margin = Math.round(sampleRate * 0.018);
  if (start === 0 || PAUSE_PHONE.has(phones[start - 1])) from -= Math.min(margin,hop * dur[start]);
  if (end === phones.length || PAUSE_PHONE.has(phones[end])) to += Math.min(margin,hop * dur[end + 1]);
  const lead = Math.round(sampleRate * 0.025);
  const tail = Math.round(sampleRate * 0.055);
  const length = to - from;
  const fade = Math.max(1,Math.min(Math.round(sampleRate * 0.003), Math.floor(length / 2)));
  const clip = new Float32Array(lead + length + tail);
  for (let i = 0; i < length; i++) {
    const edge = Math.min(1,i / fade,(length - 1 - i) / fade);
    clip[lead + i] = audio[from + i] * (edge === 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * edge));
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

function findWordSpan(analysis,surface) {
  const {g2pText,g2p,phones} = analysis;
  const index = g2pText.indexOf(surface);
  if (index < 0 || g2pText.indexOf(surface,index + 1) >= 0) return null;
  if (g2p.phones.join(' ') !== phones.join(' ')) return null;
  const start = [...g2pText.slice(0,index)].length;
  const end = start + [...surface].length;
  const from = g2p.spans[start]?.[0];
  const to = g2p.spans[end - 1]?.[1];
  return to > from ? [from,to] : null;
}

// G2P and the kana table can represent a long vowel with different phone labels.
function readingKey(phones) {
  return phones.map(phone => /^[aeiou]:$/u.test(phone) ? `${phone[0]} ${phone[0]}` : phone)
    .join(' ').replace(/\bo u\b/gu,'o o').replace(/\be i\b/gu,'e e');
}

async function synthesizeWord(text,options,guide) {
  const reading = text.normalize('NFKC');
  const {dict,...contextOptions} = options;
  if ((!dict?.length || guide?.surface) && JAPANESE_TERM.test(reading)) {
    try {
      const written = guide?.surface?.normalize('NFKC');
      const surface = written && JAPANESE_TERM.test(written) ? written : reading;
      const example = guide?.example?.normalize('NFKC').match(/[^。！？]+[。！？]?/gu)
        ?.find(sentence => sentence.length <= 48 && sentence.includes(surface));
      const candidates = [[`${surface}。`,surface]];
      if (surface !== reading) candidates.push([`${reading}。`,reading]);
      if (example) candidates.unshift([example,surface]);

      const plain = await engine.analyze(text,dict);
      const plainKey = readingKey(plain.phones);
      let kanaKey;
      for (const [utterance,target] of candidates) {
        const analysis = await engine.analyze(utterance);
        const span = findWordSpan(analysis,target);
        if (!span) continue;
        const key = readingKey(analysis.phones.slice(...span));
        if (key !== plainKey) {
          if (target === reading || !/\p{Script=Han}/u.test(target) || !KANA_READING.test(reading)) continue;
          kanaKey ??= readingKey((await engine.analyze(reading,[{surface:reading,reading,accent:0}])).phones);
          if (key !== kanaKey) continue;
        }
        const result = await engine.speak(utterance,contextOptions);
        if (result.phones.join(' ') !== analysis.phones.join(' ')) continue;
        const clip = cutWord(result,...span);
        if (!clip) continue;
        const levels = wordLevels(clip,result.sampleRate);
        if (Number.isFinite(levels.peak) && levels.rms >= 0.008) {
          return {...result,audio:normalizeWord(clip,levels)};
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
        const {isolatedWord,wordGuide,...options} = data.options || {};
        const result = isolatedWord ? await synthesizeWord(data.text,options,wordGuide) : await engine.speak(data.text,options);
        if (!result.audio?.length || !result.audio.every(Number.isFinite) || !result.audio.some(value => Math.abs(value) > 1e-7)) throw new Error('Mẫu âm thanh rỗng hoặc không hợp lệ.');
        self.postMessage({id:data.id,result:{wav:wavBlob(result.audio,result.sampleRate),sampleRate:result.sampleRate,samples:result.audio.length}});
        return;
      }
      throw new Error('Unknown ZEN request: '+data.type);
    } catch (error) { self.postMessage({id:data.id,error:error.message || String(error)}); }
  }).catch(error => self.postMessage({id:data.id,error:error.message}));
};
