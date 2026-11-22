'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname,'..','database.js'),'utf8');
assert.match(source,/const DB_NAME = 'KawaiiJLPTDB_v2'/);
assert.match(source,/const DB_VERSION = 2/);
for (const store of ['DATASET_STORE','APP_STATE_STORE','COMPLETED_SESSIONS_STORE','SYNC_META_STORE']) {
  assert.ok(source.includes('contains(' + store + ')'), 'missing store ' + store);
}
assert.match(source,/session\.status !== 'completed'/,'active sessions must not be stored in completed-session repository');
assert.match(source,/function saveSyncedSession/);
assert.match(source,/kawaii_jlpt_completed_sessions_v1/,'LocalStorage fallback for completed sessions');
assert.match(source,/kawaii_jlpt_sync_meta_v1/,'LocalStorage fallback for sync metadata');
assert.match(source,/function createMirroredStorage/);
assert.match(source,/function restoreMirroredStorage/);
console.log('PASS: non-destructive IndexedDB v2 migration; dataset store retained; local mirror/restore; completed-only session repository.');
