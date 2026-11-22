/**
 * Kawaii JLPT - SRS Module (public API v1)
 * Owns the SRS algorithm and delegates wordStats writes to the injected Progress API.
 * Persistence and event dispatch are injected; no dependency on app.js globals.
 * Existing keys, record fields, rating intervals, and event names remain intact.
 */
(() => {
  'use strict';

  const INTERVALS_DAYS = Object.freeze([1, 3, 7, 14, 30]);
  const DAY_MS = 24 * 60 * 60 * 1000;

  function calculateNext(prevStats, rating, now = Date.now()) {
    if (!['again', 'hard', 'good'].includes(rating)) {
      throw new TypeError('SRS rating không hợp lệ: ' + rating);
    }
    const prev = prevStats || {
      reps: 0, intervalDays: 0, nextReviewAt: 0, lastReviewedAt: 0, lapses: 0
    };
    const next = { ...prev, lastReviewedAt: now };
    // Preserve the existing 1-3-7-14-30 SRS schedule and Again/Hard behavior.
    if (rating === 'again') {
      next.reps = 0;
      next.intervalDays = 0;
      next.lapses = (prev.lapses || 0) + 1;
      next.nextReviewAt = now + 5 * 60 * 1000;
    } else if (rating === 'hard') {
      next.reps = Math.max(1, prev.reps);
      next.intervalDays = 1;
      next.nextReviewAt = now + DAY_MS;
    } else {
      const idx = Math.min(INTERVALS_DAYS.length - 1, prev.reps);
      next.intervalDays = INTERVALS_DAYS[idx];
      next.reps = prev.reps + 1;
      next.nextReviewAt = now + next.intervalDays * DAY_MS;
    }
    return next;
  }

  function create(options = {}) {
    const { getStats, setWordStat, persist, emit } = options;
    if (typeof getStats !== 'function' || typeof persist !== 'function' || typeof emit !== 'function') {
      throw new TypeError('SRS module cần getStats, persist và emit.');
    }
    if (setWordStat !== undefined && typeof setWordStat !== 'function') {
      throw new TypeError('SRS setWordStat phải là function nếu được cung cấp.');
    }

    function getWordStat(wordId) {
      const stats = getStats();
      return Object.prototype.hasOwnProperty.call(stats, wordId) ? stats[wordId] : null;
    }

    function getWordSrsInfo(wordId, now = Date.now()) {
      const st = getWordStat(wordId);
      if (!st || (st.reps === 0 && st.lapses === 0)) {
        return {
          status: 'new',
          label: '🆕 Từ mới',
          badgeClass: 'bg-skysoft-50 text-skysoft-500',
          nextGoodDays: INTERVALS_DAYS[0]
        };
      }
      const nextGoodIdx = Math.min(INTERVALS_DAYS.length - 1, st.reps);
      const nextGoodDays = INTERVALS_DAYS[nextGoodIdx];
      if (st.nextReviewAt <= now) {
        return {
          status: 'due',
          label: st.lapses > 0 && st.reps === 0 ? '🔴 Học lại' : '🔔 Cần ôn ngay',
          badgeClass: 'bg-[#FFF1F2] text-[#E11D48]',
          nextGoodDays
        };
      }
      const daysLeft = Math.max(1, Math.ceil((st.nextReviewAt - now) / DAY_MS));
      if (st.intervalDays >= 14) {
        return {
          status: 'mastered',
          label: `✅ Thành thạo (${daysLeft}n)`,
          badgeClass: 'bg-matcha-50 text-matcha-600',
          nextGoodDays
        };
      }
      return {
        status: 'scheduled',
        label: `⏳ Ôn sau ${daysLeft} ngày`,
        badgeClass: 'bg-[#FEF3C7] text-[#B45309]',
        nextGoodDays
      };
    }

    function isWordLearned(wordId) {
      const st = getWordStat(wordId);
      return !!(st && st.reps >= 1);
    }

    function isWordDue(wordId, now = Date.now()) {
      const st = getWordStat(wordId);
      return !!(st && (st.reps > 0 || st.lapses > 0) && st.nextReviewAt <= now);
    }

    function isWordNew(wordId) {
      const st = getWordStat(wordId);
      return !st || (st.reps === 0 && st.lapses === 0);
    }

    function rateWord(wordId, rating) {
      if (!wordId) throw new TypeError('Thiếu wordId khi đánh giá SRS.');
      const stats = getStats();
      const hadStat = Object.prototype.hasOwnProperty.call(stats, wordId);
      const previous = hadStat ? stats[wordId] : null;
      const next = calculateNext(previous, rating, Date.now());
      if (setWordStat) setWordStat(wordId, next);
      else stats[wordId] = next; // Backward-compatible fallback for standalone SRS consumers.
      try {
        persist();
      } catch (error) {
        // Never leave in-memory SRS advanced when synchronous persistence rejects.
        if (setWordStat) setWordStat(wordId, hadStat ? previous : null);
        else if (hadStat) stats[wordId] = previous;
        else delete stats[wordId];
        throw error;
      }
      emit('srs:rated', {
        wordId,
        rating,
        previous: previous ? { ...previous } : null,
        current: { ...next },
        algorithmVersion: 1
      });
      emit('progress:updated', { wordId, progress: { ...next } });
      return next;
    }

    function getAlgorithmInfo() {
      return {
        version: 1,
        intervalsDays: [...INTERVALS_DAYS],
        againMinutes: 5,
        hardDays: 1
      };
    }

    return Object.freeze({
      getWordStat, getWordSrsInfo, isWordNew, isWordDue,
      isWordLearned, rateWord, calculateNext, getAlgorithmInfo
    });
  }

  window.KawaiiSrsModule = Object.freeze({ create });
})();
