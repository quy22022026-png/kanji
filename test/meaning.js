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

    // Intl.Segmenter works natively in modern iOS Safari. Dictionary phrases
    // override its boundaries, including complete conjugated forms.
    const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
      ? new Intl.Segmenter('ja', { granularity: 'word' }) : null;
    function tokenize(sentence) {
      const source = String(sentence || '');
      const dictionary = getDictionaryIndex() || new Map();
      const tokens = [];
      const punct = /^[。、！？「」『』（）\s.,!?]+$/u;
      const segments = segmenter
        ? Array.from(segmenter.segment(source), item => item.segment)
        : Array.from(source);
      const offsets = [];
      let position = 0;
      for (const part of segments) { offsets.push(position); position += part.length; }
      let index = 0;
      while (index < source.length) {
        // Match curated words and variants at any position, not just token boundaries.
        let match = '';
        for (const key of dictionary.keys()) {
          if (key && key.length > match.length && source.startsWith(key, index)) match = key;
        }
        if (match) {
          tokens.push({ text: match, punct: false, known: true });
          index += match.length;
          continue;
        }
        const segIndex = offsets.findIndex(offset => offset === index);
        if (segIndex >= 0) {
          const text = segments[segIndex];
          tokens.push({ text, punct: punct.test(text), known: false });
          index += text.length;
        } else {
          // A curated match may end in the middle of a Segmenter word.
          const next = offsets.find(offset => offset > index) ?? source.length;
          const text = source.slice(index, next);
          tokens.push({ text, punct: punct.test(text), known: false });
          index = next;
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
