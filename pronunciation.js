/**
 * Kawaii JLPT - Pronunciation Module
 * ZEN-TTS first; Web Speech fallback when ZEN is unavailable or fails.
 * Kana mode is single-mora by default.
 */
(() => {
  'use strict';

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

    function makeCacheKey(text, prefs) {
      return [prefs.zenSpeed ?? 1, prefs.zenPitch ?? 0, prefs.zenHappy ?? 60, text].join(':');
    }

    async function speak(text, customPrefs = null) {
      const phrase = String(text || '').trim();
      if (!phrase) return { ok: false, reason: 'empty' };

      stop();
      const request = requestId;
      const prefs = { ...getPrefs(), ...(customPrefs || {}) };
      const engine = getEngine();

      if (!engine) {
        if (prefs.fallbackWebSpeech !== false && fallbackSpeak(phrase, prefs.zenSpeed)) {
          return { ok: true, engine: 'web-speech-fallback' };
        }
        onToast('ZEN-TTS chưa sẵn sàng và trình duyệt không có giọng Nhật dự phòng.', 'warning');
        return { ok: false, reason: 'engine-unavailable' };
      }

      const cacheKey = makeCacheKey(phrase, prefs);
      try {
        if (!wavCache.has(cacheKey)) {
          const task = synthesisQueue.then(async () => {
            if (request !== requestId || engine !== getEngine()) return;
            const result = await engine.speak(phrase, {
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
        if (fallbackEnabled && fallbackSpeak(phrase, prefs.zenSpeed)) {
          return { ok: true, engine: 'web-speech-fallback', fallbackReason: error.message };
        }
        onToast(`ZEN-TTS gặp lỗi: ${error.message || 'Không xác định'}`, 'error');
        return { ok: false, reason: 'zen-error', error };
      }
    }

    function speakWord(word, customPrefs = null) {
      if (!word) return Promise.resolve({ ok: false, reason: 'empty' });
      const reading = String(word.kana || word.kanji || '').trim();
      return speak(reading, customPrefs);
    }

    function speakKana(kana, phoneticInfo = null, mode = 'single', customPrefs = null) {
      const mora = phoneticInfo && phoneticInfo.clearMora
        ? phoneticInfo.clearMora
        : String(kana || '');
      const text = mode === 'with-word' && phoneticInfo && phoneticInfo.sampleJa
        ? `${mora}。${phoneticInfo.sampleJa}。`
        : `${mora}。`;
      return speak(text, customPrefs);
    }

    return Object.freeze({
      speak,
      speakWord,
      speakKana,
      stop,
      clearCache: revokeCache,
      getCacheSize: () => wavCache.size,
      isSpeaking: () => !!currentAudio && !currentAudio.paused
    });
  }

  window.KawaiiPronunciationModule = Object.freeze({ create });
})();
