'use strict';
const assert = require('node:assert/strict');
global.window = global;
let remoteBackup = {
  schemaVersion: 1,
  progress: {
    wordStats: {
      a: { lastReviewedAt: 100, reps: 1 },
      b: { lastReviewedAt: 300, reps: 3 }
    },
    streak: 4, bestStreak: 8, totalPairsMatched: 10
  },
  quiz: { attempts: [{ id:'remote-attempt', wordId:'b', correct:true, createdAt:200 }], lastTestedAt:{b:200}, wrongCounts:{} },
  weakWords: { version:1, words:{} },
  preferences: { kanaReadMode:'single', zenSpeed:0.9 }
};
const uploadedSessions = [];
const uploadedBackups = [];
const remoteSessions = [
  { id:'remote-session', payload:{ id:'remote-session', status:'completed', completedAt:1700000001000 }, completed_at:new Date(1700000001000).toISOString() }
];
let signedIn = true;
const fakeClient = {
  auth: {
    async signInWithPassword() { return { data:{ user:{ id:'user-1', email:'test@example.com' } }, error:null }; },
    async getUser() { return { data:{ user:signedIn ? { id:'user-1', email:'test@example.com' } : null }, error:null }; },
    async signOut() { signedIn=false; return { error:null }; },
    onAuthStateChange() {}
  },
  from(table) {
    if (table === 'study_sessions') return {
      select() { return this; },
      eq() { return this; },
      order() { return this; },
      async upsert(row) { uploadedSessions.push(row); return { error:null }; },
      async then(resolve) { resolve({ data:remoteSessions, error:null }); }
    };
    return {
      select() { return this; },
      eq() { return this; },
      async maybeSingle() { return { data: remoteBackup ? { payload:remoteBackup } : null, error:null }; },
      async upsert(row) { uploadedBackups.push(row); remoteBackup=row.payload; return { error:null }; }
    };
  }
};
global.supabase = { createClient: () => fakeClient };
require('../cloud-sync.js');
const completed = { id:'session-done', status:'completed', completedAt:1700000000000, queue:[] };
const activeSession = { id:'session-active', status:'active', completedAt:null, queue:['x'] };
const db = {
  async getPendingSessions() { return [completed, activeSession].filter(item => item.status === 'completed'); },
  async markSessionSynced(id) { this.synced=id; },
  async saveSyncedSession(session) { this.downloaded=(this.downloaded||[]).concat(session.id); },
  async saveSyncMetadata() {}
};
let applied = null;
let localSnapshot = {
  progress: {
    wordStats: {
      a: { lastReviewedAt:500, reps:4 },
      c: { lastReviewedAt:400, reps:2 }
    },
    streak:2, bestStreak:5, totalPairsMatched:7
  },
  quiz: { attempts:[{ id:'local-attempt', wordId:'a', correct:false, createdAt:400 }], lastTestedAt:{a:400}, wrongCounts:{a:1} },
  weakWords: { version:1, words:{} },
  preferences: { zenSpeed:1.1 }
};
const cloud = global.KawaiiCloudSyncModule.create({
  config:{ url:'https://project.supabase.co', anonKey:'public-anon-key' },
  database:db,
  getBackupSnapshot:()=>localSnapshot,
  applyBackupSnapshot:async snapshot=>{ applied=snapshot; localSnapshot=snapshot; }
});

const resetLocal = {
  progress: { wordStats:{ fresh:{lastReviewedAt:600,reps:1} }, lessonGoodIds:{fresh:true}, streak:1, bestStreak:1, totalPairsMatched:0, resetAt:500 },
  quiz:{ attempts:[] }, weakWords:{ version:1, words:{} }, preferences:{}
};
const staleRemote = {
  progress: { wordStats:{ stale:{lastReviewedAt:900,reps:9} }, lessonGoodIds:{stale:true}, streak:9, bestStreak:10, totalPairsMatched:99, resetAt:100 },
  quiz:{ attempts:[] }, weakWords:{ version:1, words:{} }, preferences:{}
};
const resetMerge = cloud.mergeBackupSnapshots(resetLocal, staleRemote);
assert.deepEqual(resetMerge.progress.wordStats, resetLocal.progress.wordStats, 'newer reset must block stale remote SRS restoration');
assert.deepEqual(resetMerge.progress.lessonGoodIds, { fresh:{good:true,updatedAt:0} }, 'newer reset must block stale remote lesson progress');
assert.equal(resetMerge.progress.streak, 1);
assert.equal(resetMerge.progress.resetAt, 500);
const remoteResetMerge = cloud.mergeBackupSnapshots(staleRemote, resetLocal);
assert.deepEqual(remoteResetMerge.progress.wordStats, resetLocal.progress.wordStats, 'newer reset must win regardless of device order');

const lessonStatusMerge = cloud.mergeBackupSnapshots(
  { progress:{ lessonGoodIds:{ a:{good:false,updatedAt:300}, b:{good:true,updatedAt:400} } } },
  { progress:{ lessonGoodIds:{ a:{good:true,updatedAt:200}, b:{good:false,updatedAt:350}, legacy:true } } }
);
assert.deepEqual(lessonStatusMerge.progress.lessonGoodIds.a, { good:false, updatedAt:300 }, 'newer Again must invalidate older Good');
assert.deepEqual(lessonStatusMerge.progress.lessonGoodIds.b, { good:true, updatedAt:400 }, 'newer Good must override older Again');
assert.deepEqual(lessonStatusMerge.progress.lessonGoodIds.legacy, { good:true, updatedAt:0 }, 'legacy boolean progress must remain readable');

(async()=>{
  const result=await cloud.signIn('test@example.com','password');
  assert.equal(result.user.id,'user-1');
  assert.equal(applied.progress.wordStats.a.lastReviewedAt,500);
  assert.equal(applied.progress.wordStats.b.lastReviewedAt,300);
  assert.equal(applied.progress.wordStats.c.lastReviewedAt,400);
  assert.equal(applied.quiz.attempts.length,2);
  assert.equal(applied.preferences.zenSpeed,1.1);
  assert.equal(uploadedSessions.length,1);
  assert.equal(uploadedSessions[0].id,'session-done');
  assert.equal(db.synced,'session-done');
  assert.deepEqual(db.downloaded,['remote-session']);
  assert.equal(uploadedBackups.length,1);
  const localBeforeSignOut=JSON.stringify(localSnapshot);
  await cloud.signOut();
  assert.equal(JSON.stringify(localSnapshot),localBeforeSignOut,'sign out must preserve local data');
  console.log('PASS: Supabase login; merge local+remote progress; backup upsert; only completed sessions uploaded/downloaded; sign-out keeps local data.');
})().catch(error=>{console.error(error);process.exit(1);});
