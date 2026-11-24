/** Sole owner of the validated active vocabulary; changes are atomic after persistence. */
(() => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  function freeze(value) { if (value && typeof value === 'object') {Object.values(value).forEach(freeze); Object.freeze(value);} return value; }
  function normalizeImport(items) {
    if (!Array.isArray(items) || !items.length) throw new TypeError('Danh sách từ vựng trống.');
    return items.map((item, index) => {
      if (!item || typeof item !== 'object') throw new TypeError(`Dòng ${index+1} không hợp lệ.`);
      if (!String(item.id || '').trim()) throw new Error(`Dòng ${index+1}: thiếu ID cố định.`);
      return {
        id: String(item.id).trim(), level: String(item.level || '').trim().toUpperCase() || 'N5',
        kanji: String(item.kanji || item.word || '').trim(),
        kana: String(item.kana || item.reading || item.kanji || '').trim(),
        furigana: String(item.furigana || item.kana || item.reading || item.kanji || '').trim(),
        romaji: String(item.romaji || '').trim(), hanViet: String(item.hanViet || item.han_viet || '').trim(),
        meaning: Array.isArray(item.meanings) ? item.meanings.join('; ') : String(item.meaning || '').trim(),
        pos: String(item.pos || '').trim(), topic: String(item.topic || '').trim() || 'Chung',
        example: item.example?.ja ? {ja:String(item.example.ja),romaji:String(item.example.romaji || ''),vi:String(item.example.vi || '')} : null
      };
    });
  }
  function validate(dataset) {
    const words = normalizeImport(dataset?.words), ids = new Set();
    for (const word of words) {
      if (!['N5','N4','N3','N2','N1'].includes(word.level)) throw new Error(`JLPT không hợp lệ: ${word.id}.`);
      if (!(word.kanji || word.kana) || !word.meaning) throw new Error(`Từ ${word.id} thiếu từ hoặc nghĩa.`);
      if (ids.has(word.id)) throw new Error(`ID bị trùng: ${word.id}.`);
      ids.add(word.id);
    }
    return freeze({meta:clone(dataset.meta || {}),words});
  }
  function create({database, events} = {}) {
    let active = freeze({meta:{title:''},words:[]}), wordMap = new Map();
    let pending = Promise.resolve();
    function apply(dataset, persist = true, config = {}) {
      const next = validate(dataset); // Reject before any I/O or visible state changes.
      const task = pending.then(async () => {
        if (persist && !await database.saveActiveDataset(next)) throw new Error('Không thể lưu bộ từ vựng.');
        active = next; wordMap = new Map(next.words.map(w => [w.id,w]));
        events?.emit('vocabulary:changed',{count:active.words.length,title:active.meta.title});
        if (config.notify !== false) events?.emit('dataset:loaded',{count:active.words.length,title:active.meta.title});
        return getSnapshot();
      });
      pending = task.catch(() => {});
      return task;
    }
    const getSnapshot = () => clone(active);
    return Object.freeze({apply, validate, normalizeImport, getSnapshot, getAll: () => active.words,
      getMeta: () => active.meta, getById: id => wordMap.get(id) || null, getWordMap: () => new Map(wordMap),
      getPool: ({level,topic = 'ALL'} = {}) => active.words.filter(w => (!level || w.level === level) && (topic === 'ALL' || w.topic === topic)),
      async load() {return await database.getActiveDataset() || database.getLocalJSON('jlpt_vocab_fallback_v2',null);}
    });
  }
  window.KawaiiVocabularyStore = Object.freeze({create,validate,normalizeImport});
})();
