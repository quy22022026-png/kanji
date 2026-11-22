/**
 * Kawaii JLPT - Lessons Module (public API v1)
 * Owns lesson grouping, completion progress, and active-lesson resume metadata.
 * Keeps the legacy completion key unchanged; no dependency on app.js state or DOM.
 */
(() => {
  'use strict';

  const LEGACY_PROGRESS_KEY = 'kawaii_lesson_good_ids_v1';
  const ACTIVE_LESSON_KEY = 'kawaii_active_lesson_v1';

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function create(options = {}) {
    let storage = options.storage || null;
    if (!storage) {
      try { storage = window.localStorage; } catch (error) {
        console.warn('[Lessons] localStorage không khả dụng:', error);
      }
    }

    const memory = new Map();
    storage = storage || {
      getItem: key => memory.has(key) ? memory.get(key) : null,
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: key => memory.delete(key)
    };

    const progressKey = options.progressKey || LEGACY_PROGRESS_KEY;
    const activeKey = options.activeKey || ACTIVE_LESSON_KEY;
    let completedIds = {};
    let activeLesson = null;

    function readJson(key, fallback) {
      try {
        const raw = storage.getItem(key);
        return raw == null || raw === '' ? fallback : JSON.parse(raw);
      } catch (error) {
        console.warn('[Lessons] Không thể đọc dữ liệu:', key, error);
        return fallback;
      }
    }

    function writeJson(key, value) {
      try {
        storage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        const failure = new Error('Không thể lưu dữ liệu bài học trên thiết bị.');
        failure.cause = error;
        throw failure;
      }
    }

    function load() {
      const savedProgress = readJson(progressKey, {});
      completedIds = isObject(savedProgress) ? savedProgress : {};

      const savedActive = readJson(activeKey, null);
      activeLesson = isValidActiveLesson(savedActive) ? savedActive : null;
      return {
        progress: getProgress(),
        activeLesson: getActiveSnapshot()
      };
    }

    function isValidActiveLesson(value) {
      return !!(isObject(value) && value.version === 1 &&
        typeof value.key === 'string' && typeof value.level === 'string' &&
        typeof value.topic === 'string' && Array.isArray(value.wordIds) &&
        value.wordIds.length > 0 && value.wordIds.every(id => typeof id === 'string' && id) &&
        typeof value.sessionId === 'string' && value.sessionId &&
        ['active', 'completed'].includes(value.status));
    }

    function getLessons(words, level) {
      const groups = new Map();
      (Array.isArray(words) ? words : []).filter(word => word && word.level === level).forEach(word => {
        const topic = word.topic || 'Chung';
        if (!groups.has(topic)) groups.set(topic, []);
        groups.get(topic).push(word);
      });

      const result = [];
      for (const [topic, topicWords] of groups) {
        // Preserve the existing partition algorithm for compatibility.
        const count = Math.ceil(topicWords.length / 12);
        const base = Math.floor(topicWords.length / count);
        const extra = topicWords.length % count;
        let cursor = 0;
        for (let index = 0; index < count; index += 1) {
          const size = base + (index < extra ? 1 : 0);
          const part = topicWords.slice(cursor, cursor + size);
          cursor += size;
          result.push({ key: `${level}:${topic}:${index}`, level, topic, words: part });
        }
      }
      return result;
    }

    function isCompleted(wordId) {
      return !!(wordId && Object.prototype.hasOwnProperty.call(completedIds, wordId) && completedIds[wordId] === true);
    }

    function getCompletedCount(lesson) {
      if (!lesson || !Array.isArray(lesson.words)) return 0;
      return lesson.words.reduce((count, word) => count + (isCompleted(word?.id) ? 1 : 0), 0);
    }

    function getStudyWords(lesson, restart = false) {
      if (!lesson || !Array.isArray(lesson.words)) return [];
      return lesson.words.filter(word => word && word.id && (restart || !isCompleted(word.id)));
    }

    function getProgress() {
      return clone(completedIds) || {};
    }

    function getStorageKeys() {
      return { progress: progressKey, active: activeKey };
    }

    function getActiveSnapshot() {
      return clone(activeLesson);
    }

    function activate(lesson, sessionSnapshot, currentWordId = null) {
      if (!lesson || !Array.isArray(lesson.words) || !lesson.words.length ||
          !sessionSnapshot || !sessionSnapshot.id ||
          !Array.isArray(sessionSnapshot.initialWordIds) ||
          !['active', 'completed'].includes(sessionSnapshot.status)) {
        throw new TypeError('Thông tin bài học hoặc phiên học không hợp lệ.');
      }
      const wordIds = [...new Set(lesson.words.map(word => String(word?.id || '')).filter(Boolean))];
      if (!wordIds.length || sessionSnapshot.initialWordIds.some(id => !wordIds.includes(String(id)))) {
        throw new TypeError('Danh sách từ trong phiên không khớp với bài học.');
      }

      const next = {
        version: 1,
        key: String(lesson.key || `${lesson.level}:${lesson.topic}`),
        level: String(lesson.level || ''),
        topic: String(lesson.topic || 'Chung'),
        wordIds,
        sessionId: String(sessionSnapshot.id),
        currentWordId: currentWordId && wordIds.includes(String(currentWordId)) ? String(currentWordId) : null,
        status: sessionSnapshot.status,
        updatedAt: Date.now()
      };
      writeJson(activeKey, next);
      activeLesson = next;
      return getActiveSnapshot();
    }

    function setCurrentWord(wordId, sessionId = null) {
      if (!activeLesson) return false;
      if (sessionId && activeLesson.sessionId !== sessionId) return false;
      const next = {
        ...activeLesson,
        currentWordId: wordId ? String(wordId) : null,
        updatedAt: Date.now()
      };
      if (next.currentWordId && !next.wordIds.includes(next.currentWordId)) return false;
      try {
        writeJson(activeKey, next);
        activeLesson = next;
        return true;
      } catch (error) {
        console.warn('[Lessons] Không thể lưu thẻ đang xem:', error);
        return false;
      }
    }

    function complete(sessionId = null) {
      if (!activeLesson || (sessionId && activeLesson.sessionId !== sessionId)) return false;
      const next = { ...activeLesson, status: 'completed', currentWordId: null, updatedAt: Date.now() };
      try {
        writeJson(activeKey, next);
        activeLesson = next;
        return true;
      } catch (error) {
        console.warn('[Lessons] Không thể lưu trạng thái hoàn thành bài:', error);
        return false;
      }
    }

    function recordRating(wordId, rating) {
      if (!wordId || !['again', 'hard', 'good'].includes(rating)) {
        throw new TypeError('Từ hoặc đánh giá bài học không hợp lệ.');
      }
      const before = completedIds;
      const next = { ...completedIds };
      if (rating === 'good') next[wordId] = true;
      else delete next[wordId];
      try {
        writeJson(progressKey, next);
        completedIds = next;
      } catch (error) {
        completedIds = before;
        throw error;
      }
      return { completed: isCompleted(wordId), progress: getProgress() };
    }

    function restore(words, sessionSnapshot) {
      if (!activeLesson || !sessionSnapshot ||
          !['active', 'completed'].includes(sessionSnapshot.status) ||
          !sessionSnapshot.id || activeLesson.sessionId !== sessionSnapshot.id ||
          !Array.isArray(sessionSnapshot.initialWordIds)) return null;

      const wordMap = new Map((Array.isArray(words) ? words : []).filter(Boolean).map(word => [String(word.id), word]));
      if (activeLesson.wordIds.some(id => !wordMap.has(id))) return null;
      if (sessionSnapshot.initialWordIds.some(id => !activeLesson.wordIds.includes(String(id)))) return null;

      const lessonWords = activeLesson.wordIds.map(id => wordMap.get(id));
      return {
        lesson: {
          key: activeLesson.key,
          level: activeLesson.level,
          topic: activeLesson.topic,
          words: lessonWords
        },
        currentWordId: activeLesson.currentWordId || sessionSnapshot.queue?.[0] || null,
        sessionId: activeLesson.sessionId,
        status: sessionSnapshot.status
      };
    }

    function clearActive() {
      try {
        storage.removeItem(activeKey);
        activeLesson = null;
        return true;
      } catch (error) {
        console.warn('[Lessons] Không thể xóa ngữ cảnh bài học:', error);
        return false;
      }
    }

    function resetProgress() {
      const before = completedIds;
      try {
        writeJson(progressKey, {});
        completedIds = {};
      } catch (error) {
        completedIds = before;
        throw error;
      }
      clearActive();
      return true;
    }

    return Object.freeze({
      load,
      getLessons,
      isCompleted,
      getCompletedCount,
      getStudyWords,
      getProgress,
      getStorageKeys,
      getActiveSnapshot,
      activate,
      setCurrentWord,
      complete,
      recordRating,
      restore,
      clearActive,
      resetProgress
    });
  }

  window.KawaiiLessonsModule = Object.freeze({ create });
})();
