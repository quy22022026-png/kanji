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

    function reconcileDataset() {
      const snapshot = session.getSnapshot();
      if (snapshot?.initialWordIds.some(id => !getWord(id))) {session.clear(); options.lessons?.clearActive(); return false;}
      return true;
    }

    function restore() {
      return getDeck();
    }

    function reorder(wordIds) {
      const ok = session.reorder(wordIds);
      return ok ? getDeck() : null;
    }

    const lessons = options.lessons;
    const progress = options.progress;
    const database = options.database;
    const events = options.events;
    const journalKey = 'kawaii_jlpt_rating_journal_v1';
    let busy = false;
    async function saveJournal(value) {
      if (database) await database.saveLocalJSONMirrored(journalKey, value, 'rating_journal');
    }
    async function rollback(before) {
      const errors = [];
      try {
        if (before.progress) {
          const snapshot = before.wordId ? progress.getSnapshot() : before.progress;
          if (before.wordId) {
            const previous = before.progress.wordStats[before.wordId];
            if (previous) snapshot.wordStats[before.wordId] = previous;
            else delete snapshot.wordStats[before.wordId];
          }
          await progress.applySnapshot(snapshot, {notifyCloud:false,strict:true});
        }
      } catch (error) {errors.push(error);}
      try { if (before.lesson) lessons.restoreSnapshot(before.lesson); } catch (error) {errors.push(error);}
      try { if (before.session) session.restoreSnapshot(before.session); else session.clear(); } catch (error) {errors.push(error);}
      if (errors.length) throw new AggregateError(errors,'Không thể rollback; giữ journal để khôi phục lần sau.');
    }
    async function recover() {
      if (!database) return false;
      const before = database.getLocalJSON(journalKey, undefined);
      let saved = before;
      if (before === undefined) {try {saved = await database.getAppState('rating_journal');} catch(error) {console.warn('[Flashcard] Không đọc được journal IndexedDB:',error.message);return false;}}
      if (!saved) return false;
      await rollback(saved); await saveJournal(null); return true;
    }
    async function transaction(action, config) {
      if (busy) throw new Error('Đang lưu đánh giá trước.');
      busy = true;
      const before = {wordId:config.wordId,session:session.getSnapshot(),lesson:lessons?.getSnapshot(),progress:progress?.getSnapshot()};
      let begun = false;
      try {
        await saveJournal(before); begun = true;
        const result = await action();
        await saveJournal(null);
        events?.emit('srs:rated',{wordId:config.wordId,rating:config.rating,current:result.stat,previous:before.progress?.wordStats?.[config.wordId] || null,algorithmVersion:1});
        events?.emit('progress:updated',{wordId:config.wordId,progress:result.stat});
        events?.emit('backup:changed');
        return result;
      } catch (error) {
        if (begun) {
          try {await rollback(before); await saveJournal(null);}
          catch (rollbackError) {throw new AggregateError([error,rollbackError],'Lỗi lưu đánh giá; journal được giữ để khôi phục.');}
        }
        throw error;
      } finally {busy = false;}
    }
    async function commitRate(wordId, rating, config = {}) {
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
      if (config.lesson && lessons) {
        lessons.recordRating(wordId,rating);
        if (snapshot.status === 'completed') {
          if (!lessons.complete(snapshot.id)) throw new Error('Không thể lưu hoàn thành bài.');
        } else if (!lessons.setCurrentWord(snapshot.queue[0] || null,snapshot.id)) throw new Error('Không thể lưu thẻ đang xem.');
      }
      const stat = await srs.rateWord(wordId,rating,{emit:false});
      return {
        stat,
        session: snapshot,
        deck: getDeck(),
        completed: snapshot.status === 'completed'
      };
    }

    // Browsing filters (ALL/DUE/NEW) keep legacy deck semantics.
    // The app supplies immutable inputs and receives the updated view-model.
    async function commitBrowsing(deck, index, rating, config = {}) {
      if (!Array.isArray(deck) || !Number.isInteger(index) ||
          index < 0 || index >= deck.length || !deck[index]?.id) {
        throw new TypeError('Thẻ đang xem không hợp lệ.');
      }
      if (!['again', 'hard', 'good'].includes(rating)) {
        throw new TypeError('Đánh giá Flashcard không hợp lệ.');
      }
      const word = deck[index];
      if (config.lesson && lessons) lessons.recordRating(word.id,rating);
      const stat = await srs.rateWord(word.id, rating,{emit:false});
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

    function rate(wordId,rating,config = {}) {if (!session.canRecord(wordId,rating)) return Promise.reject(new Error('Từ hoặc đánh giá không hợp lệ trong phiên học.'));return transaction(() => commitRate(wordId,rating,config),{wordId,rating});}
    function rateBrowsing(deck,index,rating,config = {}) {return transaction(() => commitBrowsing(deck,index,rating,config),{wordId:deck?.[index]?.id,rating});}
    return Object.freeze({ start, restore, rate, rateBrowsing, reorder, getDeck, recover, reconcileDataset, isBusy:() => busy });
  }

  window.KawaiiFlashcardModule = Object.freeze({ create });
})();
