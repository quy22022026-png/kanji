'use strict';
const assert = require('node:assert/strict');
const listeners = {};
global.window = global;
global.addEventListener = (name, fn) => { listeners[name] = fn; };
Object.defineProperty(global, 'navigator', { value: { onLine: false }, configurable: true });
global.document = { visibilityState: 'hidden', addEventListener() {} };

let backupUpserts = [];
let remoteBackup = {
  progress: {
    wordStats: { remote: { lastReviewedAt: 200, reps: 2 } },
    streak: 3, bestStreak: 4, totalPairsMatched: 5
  },
  quiz: { attempts: [], lastTestedAt: {}, wrongCounts: {} },
  weakWords: { version: 1, words: {} },
  preferences: {}
};
let getUserCalls = 0;
const client = {
  auth: {
    onAuthStateChange() {},
    async getUser() { getUserCalls++; return { data: { user: { id: 'user-1', email: 'u@example.com' } }, error: null }; },
    async signOut() { return { error: null }; }
  },
  from(table) {
    if (table === 'study_sessions') return {
      select() { return this; }, eq() { return this; }, order() { return this; },
      async then(resolve) { resolve({ data: [], error: null }); },
      async upsert() { return { error: null }; }
    };
    return {
      select() { return this; }, eq() { return this; },
      async maybeSingle() { return { data: remoteBackup ? { payload: remoteBackup } : null, error: null }; },
      async upsert(row) { backupUpserts.push(row); remoteBackup = row.payload; return { error: null }; }
    };
  }
};
global.supabase = { createClient: () => client };
require('../cloud-sync.js');

const local = {
  progress: {
    wordStats: { local: { lastReviewedAt: 300, reps: 3 } },
    streak: 2, bestStreak: 2, totalPairsMatched: 1
  },
  quiz: { attempts: [], lastTestedAt: {}, wrongCounts: {} },
  weakWords: { version: 1, words: {} },
  preferences: {}
};
let applied = null;
let status = null;
const metadata = {};
const db = {
  async getSyncMetadata(key) { return metadata[key] || null; },
  async saveSyncMetadata(key, value) { metadata[key] = value; },
  async getPendingSessions() { return []; },
  async markSessionSynced() {},
  async saveSyncedSession() {}
};
const cloud = global.KawaiiCloudSyncModule.create({
  config: { url: 'https://example.supabase.co', anonKey: 'public-key' },
  database: db,
  getBackupSnapshot: () => local,
  applyBackupSnapshot: async value => { applied = value; Object.assign(local, value); },
  onStatus: value => { status = value; }
});

(async () => {
  cloud.init();
  const offline = await cloud.syncNow(local);
  assert.equal(offline.queued, true);
  assert.equal(getUserCalls, 0, 'offline sync must not make auth/network calls');
  cloud.scheduleSync(local, 250);
  assert.equal(status.state, 'offline');

  Object.defineProperty(global, 'navigator', { value: { onLine: true }, configurable: true });
  listeners.online();
  await new Promise(resolve => setTimeout(resolve, 30));

  assert.equal(backupUpserts.length, 1, 'online event should flush queued sync');
  assert.ok(applied.progress.wordStats.local, 'local progress retained');
  assert.ok(applied.progress.wordStats.remote, 'remote progress merged before upload');
  assert.equal(metadata.active_account.userId, 'user-1');
  assert.equal(status.state, 'synced');
  console.log('PASS: offline changes queue locally; online event retries; pull-merge-push preserves local and remote progress; account ownership is recorded.');
})().catch(error => { console.error(error); process.exit(1); });
