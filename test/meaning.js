/**
 * Kawaii JLPT - Meaning / Tap-to-lookup Module
 * Owns Japanese tokenization, tappable word elements and meaning-sheet rendering.
 */
(() => {
  'use strict';

  function create(options = {}) {
    const getDictionaryIndex = options.getDictionaryIndex || (() => new Map());
    const lookup = options.lookup || ((token) => ({
      text: token, reading: token, hanViet: '',
      meaning: 'Chưa có trong từ điển hiện tại',
      note: 'Ấn nút 🔊 để nghe cách phát âm'
    }));
    const onSpeak = options.onSpeak || (() => {});
    const getElements = options.getElements || (() => ({}));
    let activeSpeakText = '';
    let cachedDictionaryRef = null;
    let cachedDictionarySize = -1;
    let cachedDictionaryMaxLength = 8;

    function getDictionaryMaxLength(dictionary) {
      const size = Number.isFinite(dictionary?.size) ? dictionary.size : -1;
      if (dictionary !== cachedDictionaryRef || size !== cachedDictionarySize) {
        cachedDictionaryRef = dictionary;
        cachedDictionarySize = size;
        cachedDictionaryMaxLength = dictionary && typeof dictionary.keys === 'function'
          ? [...dictionary.keys()].reduce((max, key) => Math.max(max, Array.from(String(key || '')).length), 1)
          : 8;
      }
      return cachedDictionaryMaxLength;
    }

    function buildDictionaryIndex({ builtinDictionary = {}, words = [], supplemental = {} } = {}) {
      const index = new Map();
      Object.entries(builtinDictionary || {}).forEach(([term, entry]) => {
        index.set(term, { text: term, ...(entry || {}) });
      });

      const dictionaryEntries = supplemental.dictionary?.entries || [];
      dictionaryEntries.forEach(item => {
        const term = String(item?.term || '').trim();
        if (!term || index.has(term)) return;
        index.set(term, {
          text: term,
          reading: item.reading || term,
          hanViet: item.hanViet || '',
          meaning: item.meaning || '',
          level: item.level || '',
          note: [item.pos, item.note].filter(Boolean).join(' · ')
        });
      });

      (Array.isArray(words) ? words : []).forEach(word => {
        if (!word) return;
        const entry = {
          text: word.kanji || word.kana,
          reading: word.kana,
          hanViet: word.hanViet || '',
          meaning: word.meaning,
          level: word.level,
          note: [word.pos, word.topic].filter(Boolean).join(' · ')
        };
        if (word.kanji) index.set(word.kanji, entry);
        if (word.kana && !index.has(word.kana)) index.set(word.kana, entry);

        if (word.furigana && word.furigana.includes('[')) {
          const parts = [...word.furigana.matchAll(/(\p{Script=Han}+)\[([^\]]+)\]/gu)];
          const hanVietParts = word.hanViet ? word.hanViet.split(/\s+/) : [];
          parts.forEach((match, partIndex) => {
            const kanji = match[1];
            const reading = match[2];
            if (kanji.length === 1 && !index.has(kanji)) {
              index.set(kanji, {
                text: kanji,
                reading,
                hanViet: hanVietParts[partIndex] || word.hanViet || '',
                meaning: `Trong từ "${word.kanji}" (${word.meaning})`,
                level: word.level,
                note: `Cách đọc trong ${word.kanji}: ${reading}`
              });
            }
          });
        }
      });

      const variantEntries = supplemental.variants?.entries || [];
      variantEntries.forEach(item => {
        const variant = String(item?.variant || '').trim();
        const base = String(item?.base || '').trim();
        if (!variant || !base) return;
        const baseEntry = index.get(base);
        index.set(variant, baseEntry
          ? { ...baseEntry, text: variant, note: [baseEntry.note, `Biến thể của ${base}`].filter(Boolean).join(' · ') }
          : { text: variant, reading: variant, hanViet: '', meaning: `Dạng biến thể của ${base}`, level: '', note: `Từ gốc: ${base}` });
      });
      return index;
    }

    function tokenize(sentence) {
      const source = String(sentence || '');
      const dictionary = getDictionaryIndex() || new Map();
      const dictionaryMaxLength = getDictionaryMaxLength(dictionary);
      const tokens = [];
      let index = 0;

      while (index < source.length) {
        const char = source[index];
        if (/^[。、！？「」『』（）\s.,!?]+$/u.test(char)) {
          tokens.push({ text: char, punct: true });
          index += 1;
          continue;
        }

        let matched = '';
        const maxLength = Math.min(32, dictionaryMaxLength, source.length - index);
        for (let length = maxLength; length >= 1; length -= 1) {
          const candidate = source.slice(index, index + length);
          if (dictionary.has(candidate)) {
            matched = candidate;
            break;
          }
        }

        if (matched) {
          tokens.push({ text: matched, punct: false, known: true });
          index += matched.length;
        } else if (/^[\u30A0-\u30FFー]$/u.test(char)) {
          let end = index + 1;
          while (end < source.length && /^[\u30A0-\u30FFー]$/u.test(source[end])) end += 1;
          tokens.push({ text: source.slice(index, end), punct: false, known: false });
          index = end;
        } else {
          tokens.push({ text: char, punct: false, known: false });
          index += 1;
        }
      }
      return tokens;
    }

    function clearActiveTokens() {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('.tap-token.is-active').forEach(element => {
        element.classList.remove('is-active');
      });
    }

    function createTapToken(text, lookupKey, parentWord = null, optionsForToken = {}) {
      const span = document.createElement('span');
      span.textContent = String(text || '');
      span.className = optionsForToken.underline
        ? 'tap-token mx-[1px]'
        : 'tap-token border-transparent hover:border-[#FF8FA3]';
      span.addEventListener('click', event => {
        event.stopPropagation();
        clearActiveTokens();
        span.classList.add('is-active');
        showPopup(lookupKey || text, parentWord);
      });
      return span;
    }

    function createRubyToken(baseText, readingText, parentWord = null) {
      const ruby = document.createElement('ruby');
      ruby.className = 'tap-token mx-[1px]';
      ruby.textContent = String(baseText || '');
      const rt = document.createElement('rt');
      rt.textContent = String(readingText || '');
      ruby.appendChild(rt);
      ruby.addEventListener('click', event => {
        event.stopPropagation();
        clearActiveTokens();
        ruby.classList.add('is-active');
        showPopup(baseText, parentWord);
      });
      return ruby;
    }

    function renderSentence(container, sentence, parentWord = null) {
      if (!container) return;
      container.replaceChildren();
      tokenize(sentence).forEach(token => {
        if (token.punct) {
          container.appendChild(document.createTextNode(token.text));
        } else {
          container.appendChild(createTapToken(token.text, token.text, parentWord, {
            underline: token.known
          }));
        }
      });
    }

    function showPopup(token, parentWord = null) {
      const elements = getElements() || {};
      const info = lookup(token, parentWord) || {};
      if (elements.charBox) elements.charBox.textContent = info.text || token;
      if (elements.reading) elements.reading.textContent = info.reading || '';
      if (elements.hanViet) {
        elements.hanViet.textContent = info.hanViet || '';
        elements.hanViet.classList.toggle('hidden', !info.hanViet);
      }
      if (elements.level) {
        elements.level.textContent = info.level || '';
        elements.level.classList.toggle('hidden', !info.level);
      }
      if (elements.meaning) elements.meaning.textContent = info.meaning || '';
      if (elements.note) elements.note.textContent = info.note || '';
      activeSpeakText = info.reading || info.text || token;
      if (elements.sheet) elements.sheet.classList.remove('hidden');
      onSpeak(activeSpeakText);
      return info;
    }

    function hidePopup() {
      const elements = getElements() || {};
      if (elements.sheet) elements.sheet.classList.add('hidden');
      clearActiveTokens();
    }

    function getSpeakText() {
      return activeSpeakText;
    }

    return Object.freeze({
      buildDictionaryIndex,
      tokenize,
      createTapToken,
      createRubyToken,
      renderSentence,
      showPopup,
      hidePopup,
      clearActiveTokens,
      getSpeakText
    });
  }

  window.KawaiiMeaningModule = Object.freeze({ create });
})();
