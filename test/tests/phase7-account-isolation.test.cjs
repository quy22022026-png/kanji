'use strict';
const assert = require('node:assert/strict');
global.window = global;
Object.defineProperty(global, 'navigator', { value: { onLine: true }, configurable: true });
global.document = { visibilityState: 'hidden', addEventListener() {} };
let signedOut = false;
const client = {
  auth: {
    onAuthStateChange() {},
    async signInWithPassword() { return { data: { user: { id: 'account-B', email: 'b@example.com' } }, error: null }; },
    async signOut() { signedOut = true; return { error: null }; }
  }
};
global.supabase = { createClient: () => client };
require('../cloud-sync.js');
const db = {
  async getSyncMetadata(key) {
    return key === 'active_account' ? { userId: 'account-A' } : null;
  }
};
const cloud = global.KawaiiCloudSyncModule.create({
  config: { url: 'https://example.supabase.co', anonKey: 'public-key' },
  database: db,
  getBackupSnapshot: () => ({})
});
(async () => {
  await assert.rejects(
    cloud.signIn('b@example.com', 'password'),
    /đang liên kết với tài khoản khác/
  );
  assert.equal(signedOut, true, 'different account must be signed out before any data merge');
  console.log('PASS: account mismatch is rejected and cannot merge another account local data.');
})().catch(error => { console.error(error); process.exit(1); });
