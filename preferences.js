/**
 * Kawaii JLPT - Preferences Module (public API v1)
 * Owns user-interface and study preferences while preserving the legacy
 * LocalStorage key and IndexedDB app_state snapshot contract.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'jlpt_ui_prefs_v3';
  const DATABASE_KEY = 'preferences_snapshot';
  const LEVELS = Object.freeze(['N5', 'N4', 'N3', 'N2', 'N1']);
  const SESSION_SIZES = Object.freeze([0, 10, 20, 30]);
  const FILTERS = Object.freeze(['SMART', 'DUE', 'NEW', 'ALL']);
  const KANA_GROUPS = Object.freeze(['seion', 'dakuon', 'yoon']);
  const DEFAULTS = Object.freeze({
    level: 'N5',
    topic: 'ALL',
    showFuri: true,
    fcFilter: 'SMART',
    sessionSize: 10,
    autoSyncSheet: true,
    sheetLevels: Object.freeze(['N5', 'N4', 'N3']),
    matchSwap: false,
    kanaView: 'card',
    kanaScript: 'hira',
    kanaGroup: 'seion',
    kanaReadMode: 'CLEAR_MORA',
    zenSpeed: 1.0,
    zenPitch: 0,
    zenHappy: 60,
    fallbackWebSpeech: true
  });

  function isRecord(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function finiteNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function normalizeValue(key, value, fallback) {
    switch (key) {
      case 'level':
        return LEVELS.includes(value) ? value : fallback;
      case 'topic':
        return typeof value === 'string' && value.trim() ? value : fallback;
      case 'showFuri':
      case 'autoSyncSheet':
      case 'matchSwap':
      case 'fallbackWebSpeech':
        return typeof value === 'boolean' ? value : fallback;
      case 'fcFilter':
        return FILTERS.includes(value) ? value : fallback;
      case 'sessionSize': {
        const size = finiteNumber(value, fallback);
        return SESSION_SIZES.includes(size) ? size : fallback;
      }
      case 'sheetLevels': {
        if (!Array.isArray(value)) return [...fallback];
        const levels = [...new Set(value.filter(level => LEVELS.includes(level)))];
        return levels.length ? levels : [...fallback];
      }
      case 'kanaView':
        return value === 'card' || value === 'grid' ? value : fallback;
      case 'kanaScript':
        return value === 'hira' || value === 'kata' ? value : fallback;
      case 'kanaGroup':
        return KANA_GROUPS.includes(value) ? value : fallback;
      case 'kanaReadMode':
        return value === 'WITH_WORD' || value === 'CLEAR_MORA' ? value : fallback;
      case 'zenSpeed':
        return Math.min(1.4, Math.max(0.6, finiteNumber(value, fallback)));
      case 'zenPitch':
        return Math.round(Math.min(12, Math.max(-6, finiteNumber(value, fallback))));
      case 'zenHappy':
        return Math.round(Math.min(100, Math.max(0, finiteNumber(value, fallback))) / 10) * 10;
      default:
        return fallback;
    }
  }

  function create(options = {}) {
    const database = options.database || null;
    let storage = options.storage || null;
    if (!storage) {
      try { storage = window.localStorage; }
      catch (error) { console.warn('[KawaiiPreferences] localStorage không khả dụng:', error); }
    }

    let fallbackSnapshot = null;
    const state = clone(DEFAULTS);

    function readLocal() {
      try {
        if (database?.getLocalJSON) return database.getLocalJSON(STORAGE_KEY, null);
        const raw = storage?.getItem(STORAGE_KEY);
        return raw == null || raw === '' ? null : JSON.parse(raw);
      } catch (error) {
        console.warn('[KawaiiPreferences] Không thể đọc cài đặt cục bộ:', error);
        return null;
      }
    }

    function writeLocal(snapshot) {
      try {
        if (database?.setLocalJSON) return database.setLocalJSON(STORAGE_KEY, snapshot);
        storage?.setItem(STORAGE_KEY, JSON.stringify(snapshot));
        return !!storage;
      } catch (_) {
        return false;
      }
    }

    function normalizeSnapshot(snapshot, base = DEFAULTS) {
      const source = isRecord(snapshot) ? snapshot : {};
      const normalized = {};
      Object.keys(DEFAULTS).forEach(key => {
        const fallback = base[key] !== undefined ? base[key] : DEFAULTS[key];
        const value = source[key] !== undefined ? source[key] : fallback;
        normalized[key] = normalizeValue(key, value, fallback);
      });
      return normalized;
    }

    function applyToState(snapshot, base = DEFAULTS) {
      const normalized = normalizeSnapshot(snapshot, base);
      // Preserve the state object identity for app.js and existing plugins.
      Object.keys(DEFAULTS).forEach(key => {
        state[key] = Array.isArray(normalized[key]) ? [...normalized[key]] : normalized[key];
      });
      return state;
    }

    function getSnapshot() {
      return clone(state);
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
          const localSaved = writeLocal(snapshot);
          pending = Promise.resolve({ localSaved, mirrored: false });
        }
      } catch (error) {
        pending = Promise.reject(error);
      }

      const resultPromise = pending.then(result => {
        if (result?.localSaved && fallbackSnapshot === snapshot) fallbackSnapshot = null;
        return result || { localSaved: false, mirrored: false };
      }).catch(error => {
        console.warn('[KawaiiPreferences] Không thể lưu cài đặt:', error);
        return { localSaved: false, mirrored: false, error };
      });

      if (saveOptions.notifyCloud !== false) {
        try { options.onChange?.(snapshot); }
        catch (error) { console.warn('[KawaiiPreferences] onChange callback failed:', error); }
      }
      return resultPromise;
    }

    async function load(loadOptions = {}) {
      const localSnapshot = readLocal();
      let databaseSnapshot = loadOptions.databaseSnapshot;
      if (!isRecord(localSnapshot) && !isRecord(databaseSnapshot) && database?.getAppState) {
        try { databaseSnapshot = await database.getAppState(DATABASE_KEY); }
        catch (error) { console.warn('[KawaiiPreferences] Không thể đọc snapshot IndexedDB:', error); }
      }

      const source = isRecord(localSnapshot)
        ? 'local'
        : (isRecord(fallbackSnapshot) ? 'memory' : (isRecord(databaseSnapshot) ? 'database' : 'defaults'));
      const sourceSnapshot = source === 'local'
        ? localSnapshot
        : (source === 'memory' ? fallbackSnapshot : (source === 'database' ? databaseSnapshot : null));

      if (sourceSnapshot) {
        applyToState(sourceSnapshot);
        let restoredLocal = false;
        if (source !== 'local' && loadOptions.restoreLocal !== false) {
          restoredLocal = writeLocal(getSnapshot());
          fallbackSnapshot = restoredLocal ? null : getSnapshot();
        }
        return { source, restoredLocal, state };
      }

      applyToState(DEFAULTS);
      return { source: 'defaults', restoredLocal: false, state };
    }

    function update(values, updateOptions = {}) {
      if (!isRecord(values)) throw new TypeError('Preferences.update cần một object hợp lệ.');
      Object.entries(values).forEach(([key, value]) => {
        if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) return;
        const fallback = state[key] !== undefined ? state[key] : DEFAULTS[key];
        const normalized = normalizeValue(key, value, fallback);
        state[key] = Array.isArray(normalized) ? [...normalized] : normalized;
      });
      return updateOptions.persist === true ? save(updateOptions) : state;
    }

    function set(key, value, updateOptions = {}) {
      if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) {
        throw new TypeError(`Cài đặt không được hỗ trợ: ${String(key)}`);
      }
      return update({ [key]: value }, updateOptions);
    }

    function applySnapshot(snapshot, applyOptions = {}) {
      applyToState(snapshot, state);
      return applyOptions.persist === false
        ? state
        : save({ notifyCloud: applyOptions.notifyCloud === true });
    }

    function reset(resetOptions = {}) {
      applyToState(DEFAULTS);
      return resetOptions.persist === false
        ? state
        : save(resetOptions);
    }

    return Object.freeze({
      getState: getSnapshot,
      getSnapshot,
      getStorageKey: () => STORAGE_KEY,
      getDatabaseKey: () => DATABASE_KEY,
      load,
      save,
      set,
      update,
      applySnapshot,
      reset
    });
  }

  window.KawaiiPreferencesModule = Object.freeze({ create, defaults: clone(DEFAULTS) });
})();
