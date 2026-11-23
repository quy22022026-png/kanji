/**
 * Kawaii JLPT - Pronunciation Module
 * ZEN-TTS first; Web Speech fallback when ZEN is unavailable or fails.
 * Kana mode is single-mora by default.
 */
(() => {
  'use strict';

  const MODERN_READINGS = Object.freeze({を:'お',ぢ:'じ',づ:'ず'});

  function singleMora(value) {
    const kana = value.normalize('NFKC').replace(/[ァ-ン]/gu,
      char => String.fromCharCode(char.charCodeAt(0)-0x60));
    // Exclude standalone small kana and っ, which are not taught as standalone sounds.
    const basic = /^[あ-ん]$/u.test(kana) && !'ぁぃぅぇぉっゃゅょゎ'.includes(kana);
    const combined = /^[きぎしじちにひびぴみり][ゃゅょ]$/u.test(kana);
    return basic || combined ? MODERN_READINGS[kana] || kana : '';
  }

  function pronunciationRequest(text, sample) {
    const mora = singleMora(text);
    if (!mora) return {engineText:text,fallbackText:text};
    const katakana = mora.replace(/[ぁ-ん]/gu,
      char => String.fromCharCode(char.charCodeAt(0)+0x60));
    // For a sound with an example, apply the reading to a dedicated cue only.
    // The ZEN dictionary substitutes the cue before synthesis and leaves the example intact.
    const surface = sample ? '練習用単音' : mora;
    return {
      engineText:sample ? `${surface}。${sample}。` : surface,
      fallbackText:sample ? `${katakana}。${sample}。` : katakana,
      reading:{surface,reading:mora,accent:0}
    };
  }

  function create(options = {}) {
    const getEngine = options.getEngine || (() => null);
    const getPrefs = options.getPrefs || (() => ({}));
    const onToast = options.onToast || (() => {});
    const onFallback = options.onFallback || (() => {});
    const cacheLimit = Math.max(10, Number(options.cacheLimit) || 60);

    let requestId = 0;
    let synthesisQueue = Promise.resolve();
    let currentAudio = null;
    const wavCache = new Map();

    function revokeCache() {
      for (const url of wavCache.values()) {
        try { URL.revokeObjectURL(url); } catch (_) {}
      }
      wavCache.clear();
    }

    function stop() {
      requestId += 1;
      if (currentAudio) {
        try {
          currentAudio.pause();
          currentAudio.removeAttribute('src');
          currentAudio.load();
        } catch (_) {}
        currentAudio = null;
      }
      if ('speechSynthesis' in window) {
        try { window.speechSynthesis.cancel(); } catch (_) {}
      }
    }

    function fallbackSpeak(text, speed = 1) {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(String(text));
        utterance.lang = 'ja-JP';
        utterance.rate = Math.max(0.6, Math.min(1.4, Number(speed) || 1));
        const voices = window.speechSynthesis.getVoices();
        const japaneseVoice = voices.find(voice => voice.lang === 'ja-JP') ||
          voices.find(voice => String(voice.lang || '').toLowerCase().startsWith('ja'));
        if (japaneseVoice) utterance.voice = japaneseVoice;
        window.speechSynthesis.speak(utterance);
        onFallback({ text: String(text) });
        return true;
      } catch (error) {
        return false;
      }
    }

    function makeCacheKey(input, prefs, isolatedWord) {
      return JSON.stringify([
        prefs.zenSpeed ?? 1, prefs.zenPitch ?? 0, prefs.zenHappy ?? 60,
        input.engineText, input.reading?.reading ?? null, isolatedWord
      ]);
    }

    async function play(text, customPrefs = null, kanaSample = '', wordMode = false) {
      const phrase = String(text || '').trim();
      if (!phrase) return { ok: false, reason: 'empty' };

      stop();
      const request = requestId;
      const input = pronunciationRequest(phrase,kanaSample);
      const settings = { ...getPrefs(), ...(customPrefs || {}) };
      const prefs = input.reading ? {...settings, zenHappy:0} : settings;
      const isolatedWord = !kanaSample && (wordMode || !!input.reading);
      const engine = getEngine();

      if (!engine) {
        if (prefs.fallbackWebSpeech !== false && fallbackSpeak(input.fallbackText, prefs.zenSpeed)) {
          return { ok: true, engine: 'web-speech-fallback' };
        }
        onToast('ZEN-TTS chưa sẵn sàng và trình duyệt không có giọng Nhật dự phòng.', 'warning');
        return { ok: false, reason: 'engine-unavailable' };
      }

      const cacheKey = makeCacheKey(input, prefs, isolatedWord);
      try {
        if (!wavCache.has(cacheKey)) {
          const task = synthesisQueue.then(async () => {
            if (request !== requestId || engine !== getEngine()) return;
            const result = await engine.speak(input.engineText, {
              ...(input.reading ? {dict:[input.reading]} : {}),
              ...(isolatedWord ? {isolatedWord:true} : {}),
              emotion: {
                happy: Number(prefs.zenHappy ?? 60),
                neutral: 100 - Number(prefs.zenHappy ?? 60)
              },
              speed: Number(prefs.zenSpeed ?? 1),
              pitch: Number(prefs.zenPitch ?? 0)
            });
            if (request !== requestId || engine !== getEngine()) return;
            if (!result || !result.wav) throw new Error('ZEN-TTS không trả về dữ liệu âm thanh.');
            if (wavCache.size >= cacheLimit) {
              const oldestKey = wavCache.keys().next().value;
              try { URL.revokeObjectURL(wavCache.get(oldestKey)); } catch (_) {}
              wavCache.delete(oldestKey);
            }
            wavCache.set(cacheKey, URL.createObjectURL(result.wav));
          });
          synthesisQueue = task.catch(() => {});
          await task;
        }

        if (request !== requestId || !wavCache.has(cacheKey)) {
          return { ok: false, reason: 'cancelled' };
        }
        const audio = new Audio(wavCache.get(cacheKey));
        currentAudio = audio;
        await audio.play();
        return { ok: true, engine: 'zen-tts' };
      } catch (error) {
        if (request !== requestId) return { ok: false, reason: 'cancelled' };
        const fallbackEnabled = prefs.fallbackWebSpeech !== false;
        if (fallbackEnabled && fallbackSpeak(input.fallbackText, prefs.zenSpeed)) {
          return { ok: true, engine: 'web-speech-fallback', fallbackReason: error.message };
        }
        onToast(`ZEN-TTS gặp lỗi: ${error.message || 'Không xác định'}`, 'error');
        return { ok: false, reason: 'zen-error', error };
      }
    }

    function speak(text, customPrefs = null) {
      return play(text,customPrefs);
    }

    function speakWord(word, customPrefs = null) {
      return speakTerm(word?.kana || word?.kanji, customPrefs);
    }

    function speakTerm(text, customPrefs = null) {
      return play(text,customPrefs,'',true);
    }

    function speakKana(kana, phoneticInfo = null, mode = 'single', customPrefs = null) {
      const text = String(kana || '').trim();
      const mora = singleMora(text) || singleMora(String(phoneticInfo?.clearMora || '').trim());
      const sample = mode === 'with-word' && mora ? String(phoneticInfo?.sampleJa || '').trim() : '';
      return play(mora || text,{...customPrefs,zenHappy:0},sample,true);
    }

    return Object.freeze({
      destroy() {stop(); revokeCache();},
      speak,
      speakWord,
      speakTerm,
      speakKana,
      stop,
      clearCache: revokeCache,
      getCacheSize: () => wavCache.size,
      isSpeaking: () => !!currentAudio && !currentAudio.paused
    });
  }

  window.KawaiiPronunciationModule = Object.freeze({ create });
})();
