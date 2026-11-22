/**
 * Kawaii JLPT - Progress Module (public API v1)
 * Owns the application progress snapshot: SRS word statistics and matching counters.
 * Persistence is delegated to KawaiiDatabase; the legacy LocalStorage key and
 * IndexedDB app_state key remain unchanged for backward compatibility.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'jlpt_user_progress_v3';
  const LEGACY_STORAGE_KEY = 'jlpt_user_progress_v2';
  const DATABASE_KEY = 'progress_snapshot';
  const DAY_MS = 24 * 60 * 60 * 1000;

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeCounter(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
  }

  function normalizeSnapshot(input) {
    const source = isRecord(input) ? input : {};
    const wordStats = isRecord(source.wordStats) ? cloneJson(source.wordStats) : {};
    return {
      wordStats,
      streak: normalizeCounter(source.streak),
      bestStreak: normalizeCounter(source.bestStreak),
      totalPairsMatched: normalizeCounter(source.totalPairsMatched)
    };
  }

  function create(options = {}) {
    const database = options.database || window.KawaiiDatabase || null;
    const storage = options.storage || window.localStorage || null;
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    const state = {
      wordStats: {},
      streak: 0,
      bestStreak: 0,
      totalPairsMatched: 0
    };
    let fallbackSnapshot = null;

    function readLocal(key, fallback = null) {
      try {
        if (database?.getLocalJSON) return database.getLocalJSON(key, fallback);
        const raw = storage?.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (_) {
        return fallback;
      }
    }

    function applyNormalized(snapshot) {
      const normalized = normalizeSnapshot(snapshot);
      // Keep the public state object stable so legacy read-only integrations that
      // hold state.progress continue to observe updates.
      state.wordStats = normalized.wordStats;
      state.streak = normalized.streak;
      state.bestStreak = normalized.bestStreak;
      state.totalPairsMatched = normalized.totalPairsMatched;
      return state;
    }

    function getSnapshot() {
      return cloneJson({
        wordStats: state.wordStats,
        streak: state.streak,
        bestStreak: state.bestStreak,
        totalPairsMatched: state.totalPairsMatched
      });
    }

    function save(saveOptions = {}) {
      const snapshot = getSnapshot();
      fallbackSnapshot = snapshot;
      let pending;
      try {
        if (database?.saveLocalJSONMirrored) {
          pending = Promise.resolve(database.saveLocalJSONMirrored(
            STORAGE_KEY,
            snapshot,
            DATABASE_KEY
          ));
        } else {
          let localSaved = false;
          try {
            storage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
            localSaved = !!storage;
          } catch (_) { localSaved = false; }
          pending = Promise.resolve({ localSaved, mirrored: false });
        }
      } catch (error) {
        pending = Promise.reject(error);
      }

      const resultPromise = pending.then(result => {
        if (result?.localSaved && fallbackSnapshot === snapshot) fallbackSnapshot = null;
        if (saveOptions.strict && !result?.localSaved && !result?.mirrored) throw new Error('Không thể lưu tiến độ.');
        return result || { localSaved: false, mirrored: false };
      }).catch(error => {
        if (saveOptions.strict) throw error;
        console.warn('[KawaiiProgress] Không thể lưu tiến độ:', error);
        return { localSaved: false, mirrored: false, error };
      });

      if (saveOptions.notifyCloud !== false) {
        try { onChange(snapshot); }
        catch (error) { console.warn('[KawaiiProgress] onChange callback failed:', error); }
      }
      return resultPromise;
    }

    function load(loadOptions = {}) {
      const localSnapshot = readLocal(STORAGE_KEY, null);
      const sourceSnapshot = isRecord(localSnapshot)
        ? localSnapshot
        : (isRecord(fallbackSnapshot) ? fallbackSnapshot :
          (isRecord(loadOptions.databaseSnapshot) ? loadOptions.databaseSnapshot : null));

      if (sourceSnapshot) {
        applyNormalized(sourceSnapshot);
        // Restore the existing LocalStorage copy when it is absent and the
        // IndexedDB snapshot was available. Failure leaves the in-memory copy.
        if (!isRecord(localSnapshot) && loadOptions.restoreLocal !== false) {
          try {
            if (database?.setLocalJSON) database.setLocalJSON(STORAGE_KEY, getSnapshot());
            else storage?.setItem(STORAGE_KEY, JSON.stringify(getSnapshot()));
          } catch (_) { /* IndexedDB snapshot remains available for this session. */ }
        }
        return { source: localSnapshot ? 'local' : 'database', migrated: false, state };
      }

      const legacy = loadOptions.migrateLegacy === false ? null : readLocal(LEGACY_STORAGE_KEY, null);
      if (isRecord(legacy) && Array.isArray(legacy.masteredIds)) {
        const now = Date.now();
        const migratedStats = {};
        legacy.masteredIds.forEach(id => {
          if (id == null || String(id).trim() === '') return;
          migratedStats[String(id)] = {
            reps: 2,
            intervalDays: 3,
            nextReviewAt: now + 3 * DAY_MS,
            lastReviewedAt: now,
            lapses: 0
          };
        });
        applyNormalized({
          wordStats: migratedStats,
          streak: legacy.streak,
          bestStreak: legacy.bestStreak,
          totalPairsMatched: legacy.totalPairsMatched
        });
        void save();
        return { source: 'legacy-v2', migrated: true, state };
      }

      applyNormalized({});
      return { source: 'empty', migrated: false, state };
    }

    function setWordStat(wordId, stat) {
      const id = String(wordId || '').trim();
      if (!id) throw new TypeError('Thiếu wordId khi cập nhật tiến độ.');
      if (stat == null) delete state.wordStats[id];
      else if (isRecord(stat)) {
        Object.defineProperty(state.wordStats, id, {
          value: cloneJson(stat), writable: true, enumerable: true, configurable: true
        });
      } else throw new TypeError('Dữ liệu SRS của từ không hợp lệ.');
      return state.wordStats[id] || null;
    }

    function getWordStat(wordId) {
      const id = String(wordId);
      return Object.prototype.hasOwnProperty.call(state.wordStats, id)
        ? cloneJson(state.wordStats[id]) : null;
    }

    function getAllWordStats() {
      return cloneJson(state.wordStats);
    }

    function recordMatchCorrect() {
      state.streak += 1;
      state.totalPairsMatched += 1;
      if (state.streak > state.bestStreak) state.bestStreak = state.streak;
      void save();
      return getSnapshot();
    }

    function recordMatchIncorrect() {
      state.streak = 0;
      void save();
      return getSnapshot();
    }

    function applySnapshot(snapshot, applyOptions = {}) {
      if (!isRecord(snapshot)) throw new TypeError('Dữ liệu tiến độ cần là object hợp lệ.');
      applyNormalized(snapshot);
      if (applyOptions.persist === false) return Promise.resolve({ state, persisted: false });
      return save({ notifyCloud: applyOptions.notifyCloud !== false, strict: applyOptions.strict === true })
        .then(result => ({ state, persisted: !!(result.localSaved || result.mirrored), result }));
    }

    function importSnapshot(payload) {
      if (!isRecord(payload)) throw new TypeError('File không đúng định dạng tiến độ.');
      let snapshot;
      if (isRecord(payload.wordStats)) {
        snapshot = normalizeSnapshot(payload);
      } else if (Array.isArray(payload.masteredIds)) {
        const now = Date.now();
        const wordStats = {};
        payload.masteredIds.forEach(id => {
          if (id == null || String(id).trim() === '') return;
          wordStats[String(id)] = {
            reps: 2,
            intervalDays: 3,
            nextReviewAt: now + 3 * DAY_MS,
            lastReviewedAt: now,
            lapses: 0
          };
        });
        snapshot = normalizeSnapshot({ ...payload, wordStats });
      } else {
        throw new Error('File không đúng định dạng tiến độ.');
      }
      applyNormalized(snapshot);
      return save().then(result => ({ snapshot: getSnapshot(), result }));
    }

    function exportSnapshot() {
      return {
        version: 3,
        exportedAt: new Date().toISOString(),
        ...getSnapshot()
      };
    }

    function reset() {
      applyNormalized({});
      return save();
    }

    // Legacy synchronous SRS callers require a durable LocalStorage commit before returning.
    function commitWordStatSync(wordId, stat) {
      if (!wordId || !isRecord(stat)) throw new TypeError('Dữ liệu SRS không hợp lệ.');
      const snapshot = getSnapshot();
      Object.defineProperty(snapshot.wordStats,String(wordId),{value:cloneJson(stat),enumerable:true,writable:true,configurable:true});
      const saved = database?.setLocalJSON
        ? database.setLocalJSON(STORAGE_KEY,snapshot)
        : (() => {if (!storage) return false;storage.setItem(STORAGE_KEY,JSON.stringify(snapshot));return true;})();
      if (!saved) throw new Error('Không thể lưu SRS đồng bộ vào LocalStorage.');
      applyNormalized(snapshot);
      if (database?.saveAppState) Promise.resolve(database.saveAppState(DATABASE_KEY,snapshot)).catch(error => console.warn('[Progress] Chưa mirror được SRS:',error.message));
      try {onChange(snapshot);} catch(error) {console.warn('[Progress] onChange:',error.message);}
      return getWordStat(wordId);
    }

    async function restorePersistence() {
      let snapshot = null;
      try {snapshot = await database?.getAppState(DATABASE_KEY);} catch(error) {console.warn('[Progress] Dùng bản LocalStorage:',error.message);}
      load({databaseSnapshot:snapshot});
      await save({notifyCloud:false});
      return getSnapshot();
    }

    return Object.freeze({
      restorePersistence, commitWordStatSync,
      version: '1.0.0',
      apiVersion: 1,
      storageKey: STORAGE_KEY,
      databaseKey: DATABASE_KEY,
      getState: getSnapshot,
      getMatchingStats: () => ({streak:state.streak,bestStreak:state.bestStreak,totalPairsMatched:state.totalPairsMatched}),
      getSnapshot,
      getWordStats: getAllWordStats,
      getWordStat,
      getAllWordStats,
      setWordStat,
      load,
      save,
      applySnapshot,
      importSnapshot,
      exportSnapshot,
      reset,
      recordMatchCorrect,
      recordMatchIncorrect
    });
  }

  window.KawaiiProgressModule = Object.freeze({ create });
})();
