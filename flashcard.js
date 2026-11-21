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
      // SRS là nguồn tính lịch ôn duy nhất.
      const early = before.earlyWordIds?.includes(wordId);
      const alreadyRated = before.firstAttemptWordIds?.includes(wordId);
      const stat = ((early && rating === 'good') || alreadyRated)
        ? srs.getWordStat(wordId)
        : srs.rateWord(wordId, rating);
      try {
        const snapshot = session.record(wordId, rating);
        return {
          stat,
          session: snapshot,
          deck: getDeck(),
          completed: snapshot.status === 'completed'
        };
      } catch (error) {
        // Nếu cập nhật hàng đợi thất bại, không che giấu lỗi.
        // Lịch SRS đã được ghi; báo lỗi rõ để người dùng không tưởng thao tác thành công.
        throw error;
      }
    }

    return Object.freeze({ start, restore, rate, reorder, getDeck });
  }

  window.KawaiiFlashcardModule = Object.freeze({ create });
})();
