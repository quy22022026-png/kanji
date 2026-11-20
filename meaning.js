/* Kawaii JLPT - Meaning / tap-to-lookup module.
 * This module owns dictionary indexing and the translation popup only.
 * Audio is deliberately not triggered when the popup opens.
 */
export function createMeaning({ state, $, document, builtinDictionary = {} }) {

  function buildIndex() {
    const idx = new Map();
    Object.entries(builtinDictionary).forEach(([key, value]) => idx.set(key, { text: key, ...value }));
    state.words.forEach(word => {
      const entry = {
        text: word.kanji || word.kana,
        reading: word.kana,
        hanViet: word.hanViet || '',
        meaning: word.meaning,
        level: word.level,
        note: [word.pos, word.topic].filter(Boolean).join(' · ')
      };
      if (word.kanji) idx.set(word.kanji, entry);
      if (word.kana && !idx.has(word.kana)) idx.set(word.kana, entry);

      if (word.furigana && word.furigana.includes('[')) {
        const parts = [...word.furigana.matchAll(/(\p{Script=Han}+)\[([^\]]+)\]/gu)];
        const hanVietParts = word.hanViet ? word.hanViet.split(/\s+/) : [];
        parts.forEach((match, index) => {
          const kanjiChar = match[1], reading = match[2];
          if (kanjiChar.length === 1 && !idx.has(kanjiChar)) {
            idx.set(kanjiChar, {
              text: kanjiChar,
              reading,
              hanViet: hanVietParts[index] || word.hanViet || '',
              meaning: `Trong từ "${word.kanji}" (${word.meaning})`,
              level: word.level,
              note: `Cách đọc trong ${word.kanji}: ${reading}`
            });
          }
        });
      }
    });
    state.dictIndex = idx;
    return idx;
  }

  function lookup(token, parentWord = null) {
    const key = String(token || '');
    if (state.dictIndex.has(key)) return state.dictIndex.get(key);
    if (parentWord && (parentWord.kanji || '').includes(key)) {
      return {
        text: key,
        reading: parentWord.kana,
        hanViet: parentWord.hanViet || '',
        meaning: parentWord.meaning,
        level: parentWord.level,
        note: `Thuộc từ: ${parentWord.kanji} (${parentWord.kana})`
      };
    }
    return {
      text: key,
      reading: key,
      hanViet: '',
      meaning: 'Chưa có trong từ điển hiện tại',
      note: 'Ấn nút 🔊 để nghe cách phát âm'
    };
  }

  function showPopup(token, parentWord = null) {
    const info = lookup(token, parentWord);
    $('trCharBox').textContent = info.text;
    $('trReading').textContent = info.reading || '';
    $('trHanViet').textContent = info.hanViet || '';
    $('trHanViet').classList.toggle('hidden', !info.hanViet);
    $('trLevel').textContent = info.level || '';
    $('trLevel').classList.toggle('hidden', !info.level);
    $('trMeaning').textContent = info.meaning || '';
    $('trNote').textContent = info.note || '';
    state.activePopupSpeakText = info.reading || info.text;
    $('translateSheet').classList.remove('hidden');
    return info;
  }

  function hidePopup() {
    $('translateSheet').classList.add('hidden');
    document.querySelectorAll('.tap-token.is-active').forEach(el => el.classList.remove('is-active'));
  }

  return { buildIndex, lookup, showPopup, hidePopup };
}
