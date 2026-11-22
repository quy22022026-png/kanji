/**
 * Kawaii JLPT - Local Database
 * Phase 6: non-destructive IndexedDB upgrade + local-first repositories.
 * Existing KawaiiJLPTDB_v2 / datasets / active_dataset are preserved.
 */
(() => {
  'use strict';

  const DB_NAME = 'KawaiiJLPTDB_v2';
  const DB_VERSION = 2;
  const DATASET_STORE = 'datasets';
  const ACTIVE_DATASET_KEY = 'active_dataset';
  const APP_STATE_STORE = 'app_state';
  const COMPLETED_SESSIONS_STORE = 'completed_sessions';
  const SYNC_META_STORE = 'sync_metadata';

  function openDatabase() {
    if (!window.indexedDB) return Promise.reject(new Error('IndexedDB không được hỗ trợ.'));
    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DATASET_STORE)) db.createObjectStore(DATASET_STORE);
        if (!db.objectStoreNames.contains(APP_STATE_STORE)) db.createObjectStore(APP_STATE_STORE);
        if (!db.objectStoreNames.contains(COMPLETED_SESSIONS_STORE)) db.createObjectStore(COMPLETED_SESSIONS_STORE);
        if (!db.objectStoreNames.contains(SYNC_META_STORE)) db.createObjectStore(SYNC_META_STORE);
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(request.error || new Error('Không thể mở IndexedDB.'));
      request.onblocked = () => reject(new Error('IndexedDB đang bị kết nối khác chặn nâng cấp.'));
    });
  }

  async function transaction(storeName, mode, operation) {
    const db = await openDatabase();
    try {
      if (!db.objectStoreNames.contains(storeName)) throw new Error('Object Store không tồn tại: ' + storeName);
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        let result;
        try { result = operation(store, tx); } catch (error) { reject(error); return; }
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
      });
    } finally {
      db.close();
    }
  }

  function get(storeName, key) {
    return transaction(storeName, 'readonly', store => new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    }));
  }

  function put(storeName, key, value) {
    return transaction(storeName, 'readwrite', store => new Promise((resolve, reject) => {
      const request = store.put(value, key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    }));
  }

  function remove(storeName, key) {
    return transaction(storeName, 'readwrite', store => new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    }));
  }

  function getAll(storeName) {
    return transaction(storeName, 'readonly', store => new Promise((resolve, reject) => {
      const request = store.openCursor();
      const rows = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { resolve(rows); return; }
        rows.push({ key: cursor.key, value: cursor.value });
        cursor.continue();
      };
      request.onerror = () => reject(request.error);
    }));
  }

  function getLocalJSON(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  }

  function setLocalJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { return false; }
  }

  function createMirroredStorage(namespace = 'app') {
    const prefix = String(namespace) + ':';
    return Object.freeze({
      getItem(key) {
        try { return window.localStorage.getItem(key); } catch { return null; }
      },
      setItem(key, value) {
        const serialized = String(value);
        try { window.localStorage.setItem(key, serialized); } catch (error) {
          console.warn('[KawaiiDatabase] LocalStorage write failed:', error);
        }
        put(APP_STATE_STORE, prefix + key, serialized).catch(error =>
          console.warn('[KawaiiDatabase] IndexedDB mirror write failed:', error));
      },
      removeItem(key) {
        try { window.localStorage.removeItem(key); } catch (_) {}
        remove(APP_STATE_STORE, prefix + key).catch(() => {});
      }
    });
  }

  async function mirrorLocalJSON(key, storeKey = key) {
    const raw = (() => { try { return window.localStorage.getItem(key); } catch { return null; } })();
    if (raw === null) return false;
    await put(APP_STATE_STORE, storeKey, raw);
    return true;
  }

  async function restoreMirroredStorage(namespace = 'app') {
    const prefix = String(namespace) + ':';
    const rows = await getAll(APP_STATE_STORE);
    let restored = 0;
    for (const row of rows) {
      if (typeof row.key !== 'string' || !row.key.startsWith(prefix)) continue;
      const localKey = row.key.slice(prefix.length);
      try {
        if (window.localStorage.getItem(localKey) === null && typeof row.value === 'string') {
          window.localStorage.setItem(localKey, row.value);
          restored += 1;
        }
      } catch (_) {}
    }
    return restored;
  }

  const COMPLETED_FALLBACK_KEY = 'kawaii_jlpt_completed_sessions_v1';
  const SYNC_META_FALLBACK_KEY = 'kawaii_jlpt_sync_meta_v1';

  function readRecordMap(key) {
    const value = getLocalJSON(key, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function writeRecordMap(key, records) {
    return setLocalJSON(key, records);
  }

  async function saveCompletedSession(session) {
    if (!session || session.status !== 'completed' || !session.id || !session.completedAt) {
      throw new TypeError('Chỉ được lưu phiên học đã hoàn thành.');
    }
    const record = {
      ...JSON.parse(JSON.stringify(session)),
      syncStatus: 'pending',
      storedAt: Date.now()
    };
    try {
      await put(COMPLETED_SESSIONS_STORE, record.id, record);
    } catch (error) {
      const records = readRecordMap(COMPLETED_FALLBACK_KEY);
      records[record.id] = record;
      if (!writeRecordMap(COMPLETED_FALLBACK_KEY, records)) throw error;
    }
    return record;
  }

  async function saveSyncedSession(session) {
    if (!session || session.status !== 'completed' || !session.id || !session.completedAt) {
      throw new TypeError('Chỉ được khôi phục phiên học đã hoàn thành.');
    }
    const record = {
      ...JSON.parse(JSON.stringify(session)),
      syncStatus: 'synced',
      syncedAt: Date.now(),
      storedAt: Date.now()
    };
    try {
      await put(COMPLETED_SESSIONS_STORE, record.id, record);
    } catch (error) {
      const records = readRecordMap(COMPLETED_FALLBACK_KEY);
      records[record.id] = record;
      if (!writeRecordMap(COMPLETED_FALLBACK_KEY, records)) throw error;
    }
    return record;
  }

  async function markSessionSynced(sessionId, syncedAt = Date.now()) {
    try {
      const record = await get(COMPLETED_SESSIONS_STORE, sessionId);
      if (record) {
        record.syncStatus = 'synced';
        record.syncedAt = syncedAt;
        record.storedAt = syncedAt;
        await put(COMPLETED_SESSIONS_STORE, sessionId, record);
        return true;
      }
    } catch (_) {}
    const records = readRecordMap(COMPLETED_FALLBACK_KEY);
    if (!records[sessionId]) return false;
    records[sessionId].syncStatus = 'synced';
    records[sessionId].syncedAt = syncedAt;
    records[sessionId].storedAt = syncedAt;
    return writeRecordMap(COMPLETED_FALLBACK_KEY, records);
  }

  async function getPendingSessions() {
    let records = [];
    try {
      const rows = await getAll(COMPLETED_SESSIONS_STORE);
      records = rows.map(row => row.value);
    } catch (_) {}
    const fallback = Object.values(readRecordMap(COMPLETED_FALLBACK_KEY));
    const byId = new Map();
    [...records, ...fallback].forEach(item => {
      if (item?.id) {
        const current = byId.get(item.id);
        if (!current || (Number(item.storedAt) || 0) >= (Number(current.storedAt) || 0)) byId.set(item.id, item);
      }
    });
    return [...byId.values()].filter(item => item && item.status === 'completed' && item.syncStatus !== 'synced');
  }

  async function saveAppState(key, value) {
    await put(APP_STATE_STORE, key, value);
    return true;
  }

  async function getAppState(key) {
    return get(APP_STATE_STORE, key);
  }

  async function saveSyncMetadata(key, value) {
    const record = { ...value, updatedAt: Date.now() };
    try { await put(SYNC_META_STORE, key, record); }
    catch (error) {
      const records = readRecordMap(SYNC_META_FALLBACK_KEY);
      records[key] = record;
      if (!writeRecordMap(SYNC_META_FALLBACK_KEY, records)) throw error;
    }
    return record;
  }

  async function getSyncMetadata(key) {
    try {
      const value = await get(SYNC_META_STORE, key);
      if (value) return value;
    } catch (_) {}
    return readRecordMap(SYNC_META_FALLBACK_KEY)[key] || null;
  }

  async function getActiveDataset() { return get(DATASET_STORE, ACTIVE_DATASET_KEY); }

  async function saveActiveDataset(payload) {
    const storedPayload = { ...payload, _storedAt: Date.now() };
    try {
      await put(DATASET_STORE, ACTIVE_DATASET_KEY, storedPayload);
      return true;
    } catch {
      return setLocalJSON('jlpt_vocab_fallback_v2', storedPayload);
    }
  }

  async function healthCheck() {
    const result = {
      indexedDBAvailable: !!window.indexedDB,
      localStorageAvailable: false,
      databaseAvailable: false,
      databaseName: DB_NAME,
      databaseVersion: DB_VERSION,
      stores: []
    };
    try {
      const key = '__kawaii_jlpt_health_check__';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      result.localStorageAvailable = true;
    } catch { result.localStorageAvailable = false; }
    try {
      const db = await openDatabase();
      result.databaseAvailable = true;
      result.stores = Array.from(db.objectStoreNames);
      db.close();
    } catch { result.databaseAvailable = false; }
    return result;
  }

  window.KawaiiDatabase = Object.freeze({
    version: '2.0.0-local-first',
    DB_NAME, DB_VERSION,
    get, put, remove, getAll,
    getActiveDataset, saveActiveDataset,
    getLocalJSON, setLocalJSON,
    createMirroredStorage, mirrorLocalJSON, restoreMirroredStorage,
    saveCompletedSession, saveSyncedSession, markSessionSynced, getPendingSessions,
    saveAppState, getAppState, saveSyncMetadata, getSyncMetadata,
    healthCheck
  });
})();
