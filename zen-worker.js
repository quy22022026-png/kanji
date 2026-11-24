/** Application adapter for the unmodified official ZEN-TTS v1.3.0 runtime. */
let engine = null;
let queue = Promise.resolve();
let engineOptionsOf;
let kanaToPhones;

const JAPANESE_TERM = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー々]{1,24}$/u;
const KANA_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]{1,24}$/u;
const PUNCTUATION_PHONE = new Set(['.', ',', '?', '!', "'", '-', '…']);

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

function normalizeWord(result,target = 0.14,maxGain = 2.5) {
  const {audio,sampleRate} = result;
  if (!audio?.length) return result;
  const {peak,rms} = wordLevels(audio,sampleRate);
  // Boost quiet words while leaving headroom and avoiding amplification of near-silence.
  if (rms < 0.008) return result;
  const gain = Math.max(1,Math.min(maxGain,target / rms,0.9 / peak));
  return gain > 1 ? {...result,audio:audio.map(sample => sample * gain)} : result;
}

// G2P and the kana table can represent a long vowel with different phone labels.
function readingKey(phones) {
  const end = PUNCTUATION_PHONE.has(phones.at(-1)) ? -1 : phones.length;
  return phones.slice(0,end).map(phone => /^[aeiou]:$/u.test(phone) ? `${phone[0]} ${phone[0]}` : phone)
    .join(' ').replace(/\bo u\b/gu,'o o').replace(/\be i\b/gu,'e e');
}

function kanaReadingKey(text) {
  try {return readingKey(kanaToPhones(text,engine.meta.kana));}
  catch {return '';}
}

function moraVoicing({audio,dur,timing,sampleRate},phoneCount) {
  const hop = audio?.length / timing?.frames;
  if (!Number.isInteger(hop) || hop < 1 || !dur?.[phoneCount]) return null;
  // Durations include the leading silence. The last phone is the vowel or syllabic nasal.
  const start = dur.slice(0,phoneCount).reduce((total,frames) => total + frames,0) * hop;
  const length = dur[phoneCount] * hop;
  const signal = audio.subarray(start,start + length);
  const minLag = Math.round(sampleRate / 540);
  const maxLag = Math.min(Math.round(sampleRate / 100),Math.floor(signal.length / 3));
  if (maxLag < minLag) return null;
  let periodicity = 0;
  for (let lag = minLag; lag <= maxLag; lag += 3) {
    let cross = 0, leftEnergy = 0, rightEnergy = 0;
    for (let index = 0; index + lag < signal.length; index += 4) {
      const left = signal[index], right = signal[index + lag];
      cross += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }
    periodicity = Math.max(periodicity,cross / Math.max(1e-8,Math.sqrt(leftEnergy * rightEnergy)));
  }
  const rms = Math.sqrt(signal.reduce((sum,value) => sum + value * value,0) / signal.length);
  return {periodicity,rms};
}

async function speakClearMora(mora,phones,options) {
  const voiceOptions = engineOptionsOf(options);
  const marks = [...phones, '.'].map(() => 0);
  const utterance = `${mora}。`;
  const natural = await engine.speakWith(utterance,{...voiceOptions,labels:{phones:[...phones,'.'],marks}});
  const before = moraVoicing(natural,phones.length);
  if (!before || (before.periodicity >= 0.75 && before.rms >= 0.055)) return normalizeWord(natural,0.16,3.25);

  const neutralVowel = phones.length === 1 && /^[aiueo]$/u.test(phones[0]) &&
    voiceOptions.blend?.neutral < 0.99;
  // A neutral vowel or a different unspoken ending can strengthen the one voiced sound.
  const alternateOptions = neutralVowel ? engineOptionsOf({...options,emotion:{neutral:100}}) : voiceOptions;
  const ending = neutralVowel ? '.' : '-';
  let result = natural;
  try {
    const alternate = await engine.speakWith(utterance,{...alternateOptions,labels:{phones:[...phones,ending],marks}});
    const after = moraVoicing(alternate,phones.length);
    if (after && after.periodicity >= Math.max(0.55,before.periodicity - 0.1) &&
        after.rms * after.periodicity > 1.2 * before.rms * before.periodicity) result = alternate;
  } catch {
    // The first complete synthesis remains available.
  }
  return normalizeWord(result,0.16,3.25);
}

async function synthesizeKana(mora,sample,options) {
  if (mora.length > 1) {
    // Use the compound-kana reading and cadence preceding the pause-shortening change.
    const surface = sample ? '練習用単音' : mora;
    const result = await engine.speak(sample ? `${surface}。${sample}。` : surface,{
      ...options,emotion:{neutral:100,happy:0},dict:[{surface,reading:mora,accent:0}]
    });
    return sample ? result : normalizeWord(result);
  }
  const phones = kanaToPhones(mora,engine.meta.kana);
  if (!sample) return speakClearMora(mora,phones,options);
  const marks = phones.map(() => 0);
  const utterance = `${mora}、${sample}。`;
  let analysis = await engine.analyze(utterance);
  const comma = analysis.phones.indexOf(',');
  const hasSample = comma >= 0 && analysis.phones.slice(comma + 1).some(phone => !PUNCTUATION_PHONE.has(phone));
  let start = hasSample ? comma + 1 : 0;
  const expected = KANA_READING.test(sample) ? kanaReadingKey(sample) : '';
  if (!hasSample || (expected && readingKey(analysis.phones.slice(start)) !== expected)) {
    const standalone = await engine.analyze(`${sample}。`);
    if (!hasSample || readingKey(standalone.phones) === expected) {
      analysis = standalone;
      start = 0;
    }
  }
  const end = PUNCTUATION_PHONE.has(analysis.phones.at(-1)) ? -1 : analysis.phones.length;
  const durScale = [...phones.map(() => 1),0.55];
  phones.push(',',...analysis.phones.slice(start,end));
  marks.push(0,...analysis.marks.slice(start,end));
  phones.push('.');
  marks.push(0);
  const result = await engine.speakWith(utterance,{...engineOptionsOf(options),labels:{phones,marks},durScale});
  return normalizeWord(result);
}

async function synthesizeWord(text,options,spelling,mora) {
  const reading = text.normalize('NFKC');
  if (JAPANESE_TERM.test(reading) && (!mora || spelling)) {
    try {
      const written = spelling?.normalize('NFKC');
      const useSpelling = written && written !== reading && JAPANESE_TERM.test(written);
      const candidates = useSpelling ? [written,reading] : [reading];
      const plain = mora ? kanaToPhones(mora,engine.meta.kana) : (await engine.analyze(text,options.dict)).phones;
      const plainKey = readingKey(plain);
      let kanaKey;
      for (const target of candidates) {
        if (mora && target === reading) break;
        const utterance = `${target}。`;
        const analysis = await engine.analyze(utterance,options.dict);
        const key = readingKey(analysis.phones);
        if (!key) continue;
        if (key !== plainKey) {
          if (target === reading || !KANA_READING.test(reading)) continue;
          kanaKey ??= kanaReadingKey(reading);
          if (key !== kanaKey) continue;
        }
        // Render the term with its own ending and release at the selected speed.
        return normalizeWord(await engine.speak(utterance,options));
      }
    } catch {
      // The original reading still works when a spelling or its phoneme analysis is unavailable.
    }
  }
  if (mora) return synthesizeKana(mora,'',options);
  return normalizeWord(await engine.speak(text,options));
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
        ({engineOptionsOf} = await import('./vendor/zen-tts/runtime/speak-options.js'));
        ({kanaToPhones} = await import('./vendor/zen-tts/runtime/kana-phones.js'));
        engine?.destroy();
        engine = await ZenTts.load({...data.options, backend:'cpu'});
        self.postMessage({id:data.id,result:{backend:engine.backend}});
        return;
      }
      if (data.type === 'speak') {
        if (!engine) throw new Error('ZEN-TTS chưa khởi tạo.');
        const {wavBlob} = await import('./vendor/zen-tts/index.js');
        const {isolatedWord,wordSpelling,kanaMora,kanaSample,...options} = data.options || {};
        let result;
        if (isolatedWord) result = await synthesizeWord(data.text,options,wordSpelling,kanaMora);
        else if (kanaMora) result = await synthesizeKana(kanaMora,kanaSample,options);
        else result = await engine.speak(data.text,options);
        if (!result.audio?.length || !result.audio.every(Number.isFinite) || !result.audio.some(value => Math.abs(value) > 1e-7)) throw new Error('Mẫu âm thanh rỗng hoặc không hợp lệ.');
        self.postMessage({id:data.id,result:{wav:wavBlob(result.audio,result.sampleRate),sampleRate:result.sampleRate,samples:result.audio.length}});
        return;
      }
      throw new Error('Unknown ZEN request: '+data.type);
    } catch (error) { self.postMessage({id:data.id,error:error.message || String(error)}); }
  }).catch(error => self.postMessage({id:data.id,error:error.message}));
};
