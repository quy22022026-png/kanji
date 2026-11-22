/**
 * Kawaii JLPT - Study Session Module
 * Local-first session queue. No cloud sync in this phase.
 */
(() => {
  'use strict';

  function create(options = {}) {
    let storage = options.storage || null;
    if (!storage) {
      try { storage = window.localStorage; } catch (error) {
        console.warn('[StudySession] localStorage không khả dụng:', error);
      }
    }
    const memoryFallback = new Map();
    storage = storage || {
      getItem: (key) => memoryFallback.has(key) ? memoryFallback.get(key) : null,
      setItem: (key, value) => memoryFallback.set(key, String(value)),
      removeItem: (key) => memoryFallback.delete(key)
    };
    const storageKey = options.storageKey || 'kawaii_jlpt_active_session_v1';
    const defaultLimit = 1000;
    let active = null;

    function persist() {
      if (!active) {
        storage.removeItem(storageKey);
        return;
      }
      active.updatedAt = Date.now();
      try {
        storage.setItem(storageKey, JSON.stringify(active));
      } catch (error) {
        console.error('[StudySession] Không thể lưu phiên học:', error);
        throw new Error('Không thể lưu phiên học trên thiết bị.');
      }
    }

    function load() {
      try {
        const raw = storage.getItem(storageKey);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.queue) ||
            !Array.isArray(parsed.initialWordIds) || !Array.isArray(parsed.completedWordIds) ||
            !parsed.stats || !['active', 'completed'].includes(parsed.status)) {
          return null;
        }
        active = parsed;
        if (!Array.isArray(active.firstAttemptWordIds)) active.firstAttemptWordIds = [];
        if (typeof active.stats.firstAttemptCorrect !== 'number') active.stats.firstAttemptCorrect = 0;
        return getSnapshot();
      } catch (error) {
        console.warn('[StudySession] Không thể khôi phục phiên:', error);
        return null;
      }
    }

    function shuffle(items) {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    function start(words, config = {}) {
      const limit = Number.isInteger(config.limit) && config.limit > 0
        ? Math.min(config.limit, defaultLimit)
        : defaultLimit;
      const unique = [];
      const seen = new Set();
      for (const word of (Array.isArray(words) ? words : [])) {
        if (!word || !word.id || seen.has(word.id)) continue;
        seen.add(word.id);
        unique.push(String(word.id));
      }
      const selected = shuffle(unique).slice(0, limit);
      const now = Date.now();
      active = {
        version: 1,
        id: `study_${now}_${Math.random().toString(36).slice(2, 8)}`,
        status: selected.length ? 'active' : 'completed',
        limit,
        queue: [...selected],
        initialWordIds: [...selected],
        completedWordIds: [],
        firstAttemptWordIds: [],
        stats: { reviewed: 0, good: 0, again: 0, hard: 0, firstAttemptCorrect: 0 },
        startedAt: now,
        completedAt: selected.length ? null : now,
        updatedAt: now
      };
      persist();
      return getSnapshot();
    }

    function getSnapshot() {
      return active ? JSON.parse(JSON.stringify(active)) : null;
    }

    function getQueue() {
      return active && active.status === 'active' ? [...active.queue] : [];
    }

    function canRecord(wordId, rating) {
      return !!(active && active.status === 'active' &&
        ['again', 'hard', 'good'].includes(rating) &&
        active.queue.includes(wordId));
    }

    function record(wordId, rating) {
      if (!active || active.status !== 'active') {
        throw new Error('Không có phiên học đang hoạt động.');
      }
      if (!['again', 'hard', 'good'].includes(rating)) {
        throw new TypeError('Đánh giá phiên học không hợp lệ.');
      }
      // Navigation may select any word still in the active queue.
      const index = active.queue.indexOf(wordId);
      if (index < 0) {
        throw new Error('Từ được đánh giá không nằm trong hàng đợi phiên học.');
      }
      const before = getSnapshot();
      try {
        active.queue.splice(index, 1);
        active.stats.reviewed += 1;
        active.stats[rating] += 1;
        const isFirstAttempt = !active.firstAttemptWordIds.includes(wordId);
        if (isFirstAttempt) {
          active.firstAttemptWordIds.push(wordId);
          if (rating === 'good' || rating === 'hard') active.stats.firstAttemptCorrect += 1;
        }

        if (rating === 'again') {
          // Requeue a failed card at the end, regardless of its visible position.
          active.queue.push(wordId);
        } else if (!active.completedWordIds.includes(wordId)) {
          active.completedWordIds.push(wordId);
        }

        if (active.queue.length === 0) {
          active.status = 'completed';
          active.completedAt = Date.now();
        }
        persist();
      } catch (error) {
        active = before;
        throw error;
      }
      return getSnapshot();
    }

    // Public rollback point used only when the downstream SRS commit fails.
    // The previous session must have the same identity; never restore another session.
    function restoreSnapshot(snapshot) {
      if (!snapshot || snapshot.version !== 1 || !snapshot.id ||
          !Array.isArray(snapshot.queue) || !Array.isArray(snapshot.initialWordIds) ||
          !Array.isArray(snapshot.completedWordIds) || !snapshot.stats ||
          !['active', 'completed'].includes(snapshot.status) ||
          (active && active.id !== snapshot.id)) {
        throw new TypeError('Snapshot phiên học không hợp lệ.');
      }
      const current = active;
      active = JSON.parse(JSON.stringify(snapshot));
      try {
        persist();
      } catch (error) {
        active = current;
        throw error;
      }
      return getSnapshot();
    }

    function reorder(wordIds) {
      if (!active || active.status !== 'active' || !Array.isArray(wordIds)) return false;
      const current = new Set(active.queue);
      const proposed = wordIds.map(String).filter((id, index, arr) => current.has(id) && arr.indexOf(id) === index);
      if (proposed.length !== current.size) return false;
      active.queue = proposed;
      persist();
      return true;
    }

    function clear() {
      active = null;
      try { storage.removeItem(storageKey); } catch (error) {
        console.warn('[StudySession] Không thể xóa phiên đã hoàn thành:', error);
      }
    }

    return Object.freeze({
      start,
      load,
      getSnapshot,
      getQueue,
      record,
      canRecord,
      restoreSnapshot,
      reorder,
      clear
    });
  }

  window.KawaiiStudySessionModule = Object.freeze({ create });
})();
