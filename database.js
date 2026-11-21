/**
 * Kawaii JLPT - Local Database Compatibility Layer
 * Phase 1: wraps the existing v2 IndexedDB schema without destructive migration.
 *
 * Keeps KawaiiJLPTDB_v2 / datasets / active_dataset and existing LocalStorage keys.
 * The future v3 stores are intentionally NOT created in this phase.
 */
(() => {
  'use strict';

  const DB_NAME = 'KawaiiJLPTDB_v2';
  const DB_VERSION = 1;
  const DATASET_STORE = 'datasets';
  const ACTIVE_DATASET_KEY = 'active_dataset';

  async function withDatabase(mode, operation) {
    if (!window.indexedDB) {
      throw new Error('IndexedDB không được hỗ trợ trên trình duyệt này.');
    }

    const db = await new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DATASET_STORE)) {
          database.createObjectStore(DATASET_STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Không thể mở IndexedDB.'));
      request.onblocked = () => reject(new Error('IndexedDB đang bị chặn bởi kết nối khác.'));
    });

    try {
      return await operation(db, mode);
    } finally {
      db.close();
    }
  }

  function get(storeName, key) {
    return withDatabase('readonly', (db) => new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(storeName, 'readonly');
      const request = tx.objectStore(storeName).get(key);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error || tx.error);
      tx.onabort = () => reject(tx.error || new Error('Giao dịch đọc bị hủy.'));
    }));
  }

  function put(storeName, key, value) {
    return withDatabase('readwrite', (db) => new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(storeName)) {
        reject(new Error('Object Store không tồn tại: ' + storeName));
        return;
      }
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Không thể ghi IndexedDB.'));
      tx.onabort = () => reject(tx.error || new Error('Giao dịch ghi bị hủy.'));
    }));
  }

  function getLocalJSON(key, fallback = null) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function setLocalJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  async function getActiveDataset() {
    return get(DATASET_STORE, ACTIVE_DATASET_KEY);
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
      databaseVersion: DB_VERSION
    };

    try {
      const key = '__kawaii_jlpt_health_check__';
      window.localStorage.setItem(key, '1');
      window.localStorage.removeItem(key);
      result.localStorageAvailable = true;
    } catch {
      result.localStorageAvailable = false;
    }

    try {
      await withDatabase('readonly', async (db) => {
        result.databaseAvailable = db.objectStoreNames.contains(DATASET_STORE);
      });
    } catch {
      result.databaseAvailable = false;
    }

    return result;
  }

  window.KawaiiDatabase = Object.freeze({
    version: '1.0.0-compat',
    get,
    put,
    getActiveDataset,
    saveActiveDataset,
    getLocalJSON,
    setLocalJSON,
    healthCheck
  });
})();
