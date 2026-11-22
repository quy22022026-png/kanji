/**
 * Kawaii JLPT - Flashcard Module
 * Resolves session word IDs and delegates SRS ratings to the Core.
 */
(() => {
  'use strict';

  function create(options = {}) {
    const session = options.session;
    const getWord = options.getWord;
    const srs = options.srs;
    if (!session || typeof getWord !== 'function' || !srs) {
      throw new TypeError('Flashcard module thiếu dependency bắt buộc.');
    }

    function getDeck() {
      return session.getQueue().map(getWord).filter(Boolean);
    }

    function start(words, config = {}) {
      session.start(words, { limit: 10, ...config });
      return getDeck();
    }

    function restore() {
      return getDeck();
    }

    function reorder(wordIds) {
      const ok = session.reorder(wordIds);
      return ok ? getDeck() : null;
    }

    function rate(wordId, rating) {
      const before = session.getSnapshot();
      if (!before || before.status !== 'active') {
        throw new Error('Phiên học không còn hoạt động.');
      }
      // Preflight ensures an invalid operation never changes SRS history.
      if (typeof session.canRecord === 'function') {
        if (!session.canRecord(wordId, rating)) {
          throw new Error('Từ hoặc đánh giá không hợp lệ trong phiên học.');
        }
      } else if (!before.queue.includes(wordId) || !['again', 'hard', 'good'].includes(rating)) {
        throw new Error('Từ hoặc đánh giá không hợp lệ trong phiên học.');
      }

      // The session owns its queue; SRS owns its schedule. Commit the session
      // first so SRS cannot advance when session persistence rejects.
      const snapshot = session.record(wordId, rating);
      let stat;
      try {
        stat = srs.rateWord(wordId, rating);
      } catch (error) {
        if (typeof session.restoreSnapshot === 'function') {
          try {
            session.restoreSnapshot(before);
          } catch (rollbackError) {
            const failure = new Error('Không thể khôi phục phiên học sau lỗi SRS.');
            failure.cause = { original: error, rollback: rollbackError };
            throw failure;
          }
        }
        throw error;
      }
      return {
        stat,
        session: snapshot,
        deck: getDeck(),
        completed: snapshot.status === 'completed'
      };
    }

    // Browsing filters (ALL/DUE/NEW) keep legacy deck semantics.
    // The app supplies immutable inputs and receives the updated view-model.
    function rateBrowsing(deck, index, rating, config = {}) {
      if (!Array.isArray(deck) || !Number.isInteger(index) ||
          index < 0 || index >= deck.length || !deck[index]?.id) {
        throw new TypeError('Thẻ đang xem không hợp lệ.');
      }
      if (!['again', 'hard', 'good'].includes(rating)) {
        throw new TypeError('Đánh giá Flashcard không hợp lệ.');
      }
      const word = deck[index];
      const stat = srs.rateWord(word.id, rating);
      const nextDeck = [...deck];
      let nextIndex = index;
      const stats = {
        reviewed: (config.stats?.reviewed || 0) + 1,
        good: (config.stats?.good || 0) + (rating === 'again' ? 0 : 1),
        again: (config.stats?.again || 0) + (rating === 'again' ? 1 : 0)
      };
      if (config.filter !== 'ALL') {
        nextDeck.splice(index, 1);
        if (rating === 'again') nextDeck.push(word);
        if (nextIndex >= nextDeck.length) nextIndex = 0;
      } else {
        nextIndex = (index + 1) % nextDeck.length;
      }
      return { stat, deck: nextDeck, index: nextIndex, stats };
    }

    return Object.freeze({ start, restore, rate, rateBrowsing, reorder, getDeck });
  }

  window.KawaiiFlashcardModule = Object.freeze({ create });
})();
