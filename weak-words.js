/**
 * Kawaii JLPT - Weak Words Module
 * Counts all errors; resolves only after 2 successful Flashcard and 2 successful
 * Quiz reviews, with each success occurring in a different session per channel.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'kawaii_jlpt_weak_words_v1';

  function create(options = {}) {
    const memoryFallback = new Map();
    let storage = options.storage || null;
    if (!storage) {
      try { storage = window.localStorage; } catch (error) {
        console.warn('[WeakWords] localStorage không khả dụng:', error);
      }
    }
    storage = storage || {
      getItem: key => memoryFallback.has(key) ? memoryFallback.get(key) : null,
      setItem: (key, value) => memoryFallback.set(key, String(value)),
      removeItem: key => memoryFallback.delete(key)
    };
    let records = load();

    function load() {
      try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
        return parsed && typeof parsed === 'object' && parsed.words && typeof parsed.words === 'object'
          ? parsed.words : {};
      } catch (_) { return {}; }
    }

    function save() {
      storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, words: records }));
    }

    function ensure(wordId) {
      if (!records[wordId]) {
        records[wordId] = {
          wordId,
          errorCount: 0,
          flashcardCorrectSessions: [],
          quizCorrectSessions: [],
          status: 'normal',
          history: [],
          updatedAt: Date.now(),
          dismissedAt: null
        };
      }
      return records[wordId];
    }

    function evaluate(record, onNewError = false) {
      if (record.errorCount >= 2 && record.status !== 'weak' &&
          record.status !== 'resolved' && (record.status !== 'dismissed' || onNewError)) {
        record.status = 'weak';
        record.weakSinceAt = Date.now();
        record.flashcardCorrectSessions = [];
        record.quizCorrectSessions = [];
      }
      const fc = new Set(record.flashcardCorrectSessions).size;
      const quiz = new Set(record.quizCorrectSessions).size;
      if (record.status === 'weak' && fc >= 2 && quiz >= 2) {
        record.status = 'resolved';
        record.resolvedAt = Date.now();
      }
      record.updatedAt = Date.now();
      return record;
    }

    function recordError(wordId, source, sessionId, metadata = {}) {
      if (!wordId || !['flashcard', 'quiz'].includes(source)) return null;
      const record = ensure(wordId);
      record.errorCount += 1;
      record.history.push({
        type: 'error', source, sessionId: String(sessionId || 'unknown'),
        attemptNo: metadata.attemptNo || null, at: Date.now()
      });
      evaluate(record, true);
      save();
      return structuredCloneSafe(record);
    }

    function recordCorrect(wordId, source, sessionId) {
      if (!wordId || !['flashcard', 'quiz'].includes(source)) return null;
      const record = ensure(wordId);
      const id = String(sessionId || 'unknown');
      if (record.status === 'weak') {
        if (source === 'flashcard' && !record.flashcardCorrectSessions.includes(id)) {
          record.flashcardCorrectSessions.push(id);
        }
        if (source === 'quiz' && !record.quizCorrectSessions.includes(id)) {
          record.quizCorrectSessions.push(id);
        }
      }
      record.history.push({ type: 'correct', source, sessionId: id, at: Date.now() });
      evaluate(record);
      save();
      return structuredCloneSafe(record);
    }

    function dismiss(wordId) {
      const record = records[wordId];
      if (!record) return false;
      record.status = 'dismissed';
      record.dismissedAt = Date.now();
      record.updatedAt = Date.now();
      save();
      return true;
    }

    function get(wordId) {
      return records[wordId] ? structuredCloneSafe(records[wordId]) : null;
    }

    function getAll() {
      return Object.values(records).map(structuredCloneSafe);
    }

    function getWeak() {
      return getAll().filter(record => record.status === 'weak');
    }

    function getErrorCount(wordId) {
      return records[wordId] ? Number(records[wordId].errorCount) || 0 : 0;
    }

    function getSummary() {
      return {
        weak: getWeak().length,
        totalTracked: Object.keys(records).length,
        errors: Object.values(records).reduce((sum, item) => sum + item.errorCount, 0)
      };
    }

    function structuredCloneSafe(value) {
      return JSON.parse(JSON.stringify(value));
    }

    return Object.freeze({ recordError, recordCorrect, dismiss, get, getAll, getWeak, getSummary, getErrorCount });
  }

  window.KawaiiWeakWordsModule = Object.freeze({ create });
})();
