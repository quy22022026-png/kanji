/**
 * Kawaii JLPT - Local Database
 * Phase 4: centralized local-first persistence API.
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
  const MIRROR_TOMBSTONE_FLAG = '__kawaiiMirrorDeleted_v1';
  const LOCAL_MIRROR_TOMBSTONE_PREFIX = '__kawaii_mirror_deleted_v1__:';
  const REPOSITORY_LOCAL_PREFIX = '__kawaii_repo_v1__:';
  const REPOSITORY_TOMBSTONE_FLAG = '__kawaiiRepositoryDeleted_v1';
  const pendingMirrorWrites = new Set();
  const mirrorQueues = new Map();
  const mirrorFailures = [];

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
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed.'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted.'));
        try {
          result = operation(store, tx);
        } catch (error) {
          try { tx.abort(); } catch (_) {}
          reject(error);
        }
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

  function isMirrorTombstone(value) {
    return !!(value && typeof value === 'object' && value[MIRROR_TOMBSTONE_FLAG] === true);
  }

  function createMirrorTombstone() {
    return { [MIRROR_TOMBSTONE_FLAG]: true, version: 1, deletedAt: Date.now() };
  }

  function getLocalMirrorTombstoneKey(namespace, key) {
    return LOCAL_MIRROR_TOMBSTONE_PREFIX + String(namespace) + ':' + String(key);
  }

  function isRepositoryTombstone(raw) {
    if (typeof raw !== 'string') return false;
    try {
      const value = JSON.parse(raw);
      return !!(value && typeof value === 'object' && value[REPOSITORY_TOMBSTONE_FLAG] === true);
    } catch (_) { return false; }
  }

  // IndexedDB mirror operations for the same key are serialized. This prevents
  // a slower earlier write from overwriting a later set/remove operation.
  function enqueueMirrorWrite(storeKey, action, operation) {
    const key = String(storeKey);
    const previous = mirrorQueues.get(key) || Promise.resolve();
    let tracked;
    tracked = previous.catch(() => {}).then(operation).then(
      () => ({ ok: true }),
      error => {
        const failure = {
          key,
          action,
          message: error && error.message ? error.message : String(error),
          failedAt: Date.now()
        };
        mirrorFailures.push(failure);
        console.warn('[KawaiiDatabase] IndexedDB mirror operation failed:', failure);
        return { ok: false, error, failure };
      }
    ).finally(() => {
      pendingMirrorWrites.delete(tracked);
      if (mirrorQueues.get(key) === tracked) mirrorQueues.delete(key);
    });
    mirrorQueues.set(key, tracked);
    pendingMirrorWrites.add(tracked);
    return tracked;
  }

  async function flushMirrors() {
    let completed = 0;
    while (pendingMirrorWrites.size) {
      const batch = [...pendingMirrorWrites];
      await Promise.all(batch);
      completed += batch.length;
    }
    const failures = mirrorFailures.splice(0);
    return {
      completed,
      pending: pendingMirrorWrites.size,
      failed: failures.length,
      failures
    };
  }

  // Backward-compatible synchronous Storage interface used by existing modules.
  // LocalStorage remains the synchronous read path; IndexedDB is its ordered mirror.
  function createMirroredStorage(namespace = 'app') {
    const prefix = String(namespace) + ':';
    return Object.freeze({
      getItem(key) {
        const localKey = String(key);
        try {
          if (window.localStorage.getItem(getLocalMirrorTombstoneKey(namespace, localKey)) === '1') return null;
          return window.localStorage.getItem(localKey);
        } catch { return null; }
      },
      setItem(key, value) {
        const localKey = String(key);
        const storeKey = prefix + localKey;
        const serialized = String(value);
        try {
          // Clear the local deletion marker before the new value is mirrored.
          window.localStorage.removeItem(getLocalMirrorTombstoneKey(namespace, localKey));
          window.localStorage.setItem(localKey, serialized);
        } catch (error) {
          throw error; // Synchronous owners must be able to roll back a rejected write.
        }
        enqueueMirrorWrite(storeKey, 'set', () => put(APP_STATE_STORE, storeKey, serialized));
      },
      removeItem(key) {
        const localKey = String(key);
        const storeKey = prefix + localKey;
        // Remove the value first to free quota, then persist the local deletion
        // marker. The IndexedDB tombstone remains the second line of protection.
        try { window.localStorage.removeItem(localKey); }
        catch (error) { throw error; }
        try { window.localStorage.setItem(getLocalMirrorTombstoneKey(namespace, localKey), '1'); }
        catch (error) { throw error; }
        enqueueMirrorWrite(storeKey, 'remove', () => put(APP_STATE_STORE, storeKey, createMirrorTombstone()));
      }
    });
  }

  // Async repository API for new modules. Existing synchronous module APIs are
  // intentionally not migrated in this phase to avoid changing their contracts.
  function createRepository(namespace = 'app') {
    const prefix = String(namespace) + ':';
    const localPrefix = REPOSITORY_LOCAL_PREFIX + prefix;

    async function read(key, fallback = null) {
      const localKey = localPrefix + String(key);
      const storeKey = prefix + String(key);
      try {
        const raw = window.localStorage.getItem(localKey);
        if (raw !== null) {
          if (isRepositoryTombstone(raw)) return fallback;
          try { return JSON.parse(raw); } catch { return raw; }
        }
      } catch (_) {}

      let mirrored;
      try { mirrored = await get(APP_STATE_STORE, storeKey); }
      catch (_) { return fallback; }
      if (mirrored == null || isMirrorTombstone(mirrored)) return fallback;
      if (typeof mirrored === 'string') {
        try { return JSON.parse(mirrored); } catch { return mirrored; }
      }
      return mirrored;
    }

    async function write(key, value) {
      const localKey = localPrefix + String(key);
      const storeKey = prefix + String(key);
      const serialized = JSON.stringify(value);
      if (serialized === undefined) throw new TypeError('Repository value must be JSON-serializable.');
      let localSaved = false;
      let localError = null;
      try {
        window.localStorage.setItem(localKey, serialized);
        localSaved = true;
      } catch (error) { localError = error; }
      const mirrored = await enqueueMirrorWrite(storeKey, 'repository-write', () =>
        put(APP_STATE_STORE, storeKey, serialized));
      if (!localSaved && !mirrored.ok) {
        const failure = new Error('Không thể lưu dữ liệu ở LocalStorage hoặc IndexedDB.');
        failure.cause = { local: localError, indexedDB: mirrored.error };
        throw failure;
      }
      return { localSaved, mirrored: mirrored.ok };
    }

    async function removeKey(key) {
      const localKey = localPrefix + String(key);
      const storeKey = prefix + String(key);
      const localTombstone = JSON.stringify({ [REPOSITORY_TOMBSTONE_FLAG]: true, deletedAt: Date.now() });
      let localRemoved = false;
      let localError = null;
      try {
        // A local tombstone hides any stale IndexedDB value if the mirror write fails.
        window.localStorage.setItem(localKey, localTombstone);
        localRemoved = true;
      } catch (error) { localError = error; }
      const mirrored = await enqueueMirrorWrite(storeKey, 'repository-remove', () =>
        put(APP_STATE_STORE, storeKey, createMirrorTombstone()));
      if (!localRemoved && !mirrored.ok) {
        const failure = new Error('Không thể xóa dữ liệu ở LocalStorage hoặc IndexedDB.');
        failure.cause = { local: localError, indexedDB: mirrored.error };
        throw failure;
      }
      return { localRemoved, mirrored: mirrored.ok };
    }

    return Object.freeze({ read, write, remove: removeKey, flush: flushMirrors });
  }

  // Writes the existing LocalStorage key synchronously, then mirrors either the
  // object value (app snapshots) or serialized JSON (Storage-compatible modules).
  async function saveLocalJSONMirrored(key, value, storeKey = key, options = {}) {
    const localKey = String(key);
    const mirrorKey = String(storeKey);
    const serialized = JSON.stringify(value);
    if (serialized === undefined) throw new TypeError('Snapshot value must be JSON-serializable.');
    const snapshot = JSON.parse(serialized);
    let localSaved = false;
    let localError = null;
    try {
      window.localStorage.setItem(localKey, serialized);
      localSaved = true;
    } catch (error) { localError = error; }
    const mirrorValue = options.serializeMirror === true ? serialized : snapshot;
    const mirrored = await enqueueMirrorWrite(mirrorKey, 'save-json', () =>
      put(APP_STATE_STORE, mirrorKey, mirrorValue));
    if (!localSaved && !mirrored.ok) {
      const failure = new Error('Không thể lưu dữ liệu ở LocalStorage hoặc IndexedDB.');
      failure.cause = { local: localError, indexedDB: mirrored.error };
      throw failure;
    }
    return { localSaved, mirrored: mirrored.ok };
  }

  async function mirrorLocalJSON(key, storeKey = key) {
    const raw = (() => { try { return window.localStorage.getItem(key); } catch { return null; } })();
    if (raw === null) return false;
    const result = await enqueueMirrorWrite(storeKey, 'mirror-local-json', () =>
      put(APP_STATE_STORE, storeKey, raw));
    if (!result.ok) throw result.error;
    return true;
  }

  async function restoreMirroredStorage(namespace = 'app') {
    const prefix = String(namespace) + ':';
    await flushMirrors();
    const rows = await getAll(APP_STATE_STORE);
    let restored = 0;
    for (const row of rows) {
      if (typeof row.key !== 'string' || !row.key.startsWith(prefix) || isMirrorTombstone(row.value)) continue;
      const localKey = row.key.slice(prefix.length);
      try {
        if (window.localStorage.getItem(getLocalMirrorTombstoneKey(namespace, localKey)) === '1') continue;
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
    const storeKey = String(key);
    // Capture the value at call time so queued writes cannot observe later mutations.
    let snapshot = value;
    if (value && typeof value === 'object') {
      try {
        snapshot = typeof structuredClone === 'function'
          ? structuredClone(value)
          : JSON.parse(JSON.stringify(value));
      } catch (_) {
        try { snapshot = JSON.parse(JSON.stringify(value)); } catch (_) {}
      }
    }
    const result = await enqueueMirrorWrite(storeKey, 'save-app-state', () =>
      put(APP_STATE_STORE, storeKey, snapshot));
    if (!result.ok) throw result.error;
    return true;
  }

  async function getAppState(key) {
    const storeKey = String(key);
    const pending = mirrorQueues.get(storeKey);
    if (pending) await pending;
    return get(APP_STATE_STORE, storeKey);
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

  async function getActiveDataset() {
    try {
      const active = await get(DATASET_STORE, ACTIVE_DATASET_KEY);
      if (active) return active;
    } catch (_) {}
    return getLocalJSON('jlpt_vocab_fallback_v2', null);
  }

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
      pendingMirrorWrites: pendingMirrorWrites.size,
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
    version: '2.1.0-local-first',
    apiVersion: 1,
    DB_NAME, DB_VERSION,
    get, put, remove, getAll,
    getActiveDataset, saveActiveDataset,
    getLocalJSON, setLocalJSON,
    createMirroredStorage, createRepository, saveLocalJSONMirrored,
    mirrorLocalJSON, restoreMirroredStorage, flushMirrors,
    saveCompletedSession, saveSyncedSession, markSessionSynced, getPendingSessions,
    saveAppState, getAppState, saveSyncMetadata, getSyncMetadata,
    healthCheck
  });
})();
