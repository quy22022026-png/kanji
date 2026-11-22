/**
 * Kawaii JLPT - Optional Supabase Cloud Sync
 * Local-first: never deletes local data on sign-out.
 * Only completed Flashcard sessions are uploaded to the sessions table.
 */
(() => {
  'use strict';

  function create(options = {}) {
    const config = options.config || window.KawaiiSupabaseConfig || {};
    const db = options.database || window.KawaiiDatabase;
    const getBackupSnapshot = options.getBackupSnapshot || (() => ({}));
    const onStatus = options.onStatus || (() => {});
    let client = null;
    let initialized = false;
    let syncPromise = null;
    let scheduledSyncTimer = null;
    let retryTimer = null;
    let retryAttempt = 0;
    let latestSnapshot = null;

    function isOnline() {
      return typeof navigator === 'undefined' || navigator.onLine !== false;
    }

    function scheduleRetry() {
      if (retryTimer || !latestSnapshot) return;
      const delay = Math.min(60000, 2000 * (2 ** Math.min(retryAttempt, 5)));
      retryAttempt += 1;
      onStatus({ state: 'retrying', retryInMs: delay });
      retryTimer = setTimeout(() => {
        retryTimer = null;
        syncNow(getBackupSnapshot()).catch(() => {});
      }, delay);
    }

    function clearRetry() {
      if (retryTimer) clearTimeout(retryTimer);
      retryTimer = null;
      retryAttempt = 0;
    }

    async function assertAccountOwner(user, claim = false) {
      if (!user?.id || !db?.getSyncMetadata) return true;
      const owner = await db.getSyncMetadata('active_account');
      if (owner?.userId && owner.userId !== user.id) {
        throw new Error('Dữ liệu cục bộ trên thiết bị đang liên kết với tài khoản khác. Để tránh trộn dữ liệu giữa hai tài khoản, hãy dùng hồ sơ trình duyệt riêng hoặc sao lưu và chuyển dữ liệu trước khi đổi tài khoản.');
      }
      if (claim && !owner?.userId) {
        await db.saveSyncMetadata('active_account', { userId: user.id, linkedAt: Date.now() });
      }
      return true;
    }

    function isConfigured() {
      if (!config.url || !config.anonKey) return false;
      try {
        const parsed = new URL(config.url);
        return parsed.protocol === 'https:' ||
          (parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname));
      } catch { return false; }
    }

    function normalizeLessonGoodEntry(value) {
      if (typeof value === 'boolean') return { good: value, updatedAt: 0 };
      if (!value || typeof value !== 'object' || typeof value.good !== 'boolean') return null;
      return { good: value.good, updatedAt: Number(value.updatedAt) || 0 };
    }

    function mergeLessonGoodIds(local = {}, remote = {}) {
      const merged = {};
      const ids = new Set([...Object.keys(remote || {}), ...Object.keys(local || {})]);
      for (const id of ids) {
        const localEntry = normalizeLessonGoodEntry(local?.[id]);
        const remoteEntry = normalizeLessonGoodEntry(remote?.[id]);
        if (!localEntry && !remoteEntry) continue;
        if (!localEntry) { merged[id] = remoteEntry; continue; }
        if (!remoteEntry) { merged[id] = localEntry; continue; }
        if (localEntry.updatedAt > remoteEntry.updatedAt) merged[id] = localEntry;
        else if (remoteEntry.updatedAt > localEntry.updatedAt) merged[id] = remoteEntry;
        else if (localEntry.updatedAt === 0) merged[id] = { good: localEntry.good || remoteEntry.good, updatedAt: 0 };
        else merged[id] = localEntry;
      }
      return merged;
    }

    function init() {
      if (initialized) return !!client;
      initialized = true;
      if (!isConfigured()) {
        onStatus({ state: 'not-configured', message: 'Chưa cấu hình Supabase.' });
        return false;
      }
      if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        onStatus({ state: 'sdk-missing', message: 'Không tải được Supabase SDK.' });
        return false;
      }
      client = window.supabase.createClient(config.url, config.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      client.auth.onAuthStateChange((event, session) => {
        onStatus({
          state: session ? 'authenticated' : 'signed-out',
          event,
          user: session?.user ? { id: session.user.id, email: session.user.email } : null
        });
      });
      return true;
    }

    async function signUp(email, password) {
      if (!init()) throw new Error('Supabase chưa được cấu hình.');
      const { data, error } = await client.auth.signUp({ email, password });
      if (error) throw error;
      return data;
    }

    function mergeBackupSnapshots(local = {}, remote = {}) {
      const localProgress = local.progress || {};
      const remoteProgress = remote.progress || {};
      const localResetAt = Number(localProgress.resetAt) || 0;
      const remoteResetAt = Number(remoteProgress.resetAt) || 0;
      const localResetWins = localResetAt > remoteResetAt;
      const remoteResetWins = remoteResetAt > localResetAt;

      // A newer explicit reset is a tombstone for older progress. Without this
      // generation marker, max/union merging would silently restore deleted data.
      const wordStats = localResetWins
        ? { ...(localProgress.wordStats || {}) }
        : remoteResetWins
          ? { ...(remoteProgress.wordStats || {}) }
          : { ...(remoteProgress.wordStats || {}) };
      if (!localResetWins && !remoteResetWins) {
        for (const [wordId, localStat] of Object.entries(localProgress.wordStats || {})) {
          const remoteStat = wordStats[wordId];
          const localTime = Number(localStat?.lastReviewedAt) || 0;
          const remoteTime = Number(remoteStat?.lastReviewedAt) || 0;
          if (!remoteStat || localTime >= remoteTime) wordStats[wordId] = localStat;
        }
      }

      const lessonGoodIds = localResetWins
        ? mergeLessonGoodIds(localProgress.lessonGoodIds || {}, {})
        : remoteResetWins
          ? mergeLessonGoodIds({}, remoteProgress.lessonGoodIds || {})
          : mergeLessonGoodIds(localProgress.lessonGoodIds || {}, remoteProgress.lessonGoodIds || {});
      const progress = {
        wordStats,
        lessonGoodIds,
        streak: localResetWins ? Number(localProgress.streak) || 0 : remoteResetWins ? Number(remoteProgress.streak) || 0 : Math.max(Number(localProgress.streak) || 0, Number(remoteProgress.streak) || 0),
        bestStreak: localResetWins ? Number(localProgress.bestStreak) || 0 : remoteResetWins ? Number(remoteProgress.bestStreak) || 0 : Math.max(Number(localProgress.bestStreak) || 0, Number(remoteProgress.bestStreak) || 0),
        totalPairsMatched: localResetWins ? Number(localProgress.totalPairsMatched) || 0 : remoteResetWins ? Number(remoteProgress.totalPairsMatched) || 0 : Math.max(Number(localProgress.totalPairsMatched) || 0, Number(remoteProgress.totalPairsMatched) || 0),
        resetAt: Math.max(localResetAt, remoteResetAt)
      };

      const lq = local.quiz || {};
      const rq = remote.quiz || {};
      const attemptsById = new Map();
      [...(rq.attempts || []), ...(lq.attempts || [])].forEach(item => {
        if (item?.id) attemptsById.set(item.id, item);
      });
      const attempts = [...attemptsById.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      const lastTestedAt = { ...(rq.lastTestedAt || {}) };
      for (const [id, timestamp] of Object.entries(lq.lastTestedAt || {})) {
        lastTestedAt[id] = Math.max(Number(lastTestedAt[id]) || 0, Number(timestamp) || 0);
      }
      const wrongCounts = { ...(rq.wrongCounts || {}) };
      for (const [id, count] of Object.entries(lq.wrongCounts || {})) {
        wrongCounts[id] = Math.max(Number(wrongCounts[id]) || 0, Number(count) || 0);
      }
      const mergedWrongCounts = {};
      attempts.forEach(item => {
        if (!item.correct && item.wordId) {
          mergedWrongCounts[item.wordId] = (mergedWrongCounts[item.wordId] || 0) + 1;
        }
      });
      for (const [wordId, count] of Object.entries(mergedWrongCounts)) {
        wrongCounts[wordId] = Math.max(Number(wrongCounts[wordId]) || 0, count);
      }
      const quiz = { attempts, lastTestedAt, wrongCounts };

      const lw = local.weakWords?.words || {};
      const rw = remote.weakWords?.words || {};
      const words = {};
      for (const wordId of new Set([...Object.keys(lw), ...Object.keys(rw)])) {
        const left = lw[wordId] || {};
        const right = rw[wordId] || {};
        const historyMap = new Map();
        [...(right.history || []), ...(left.history || [])].forEach(event => {
          const key = [event.type, event.source, event.sessionId, event.at, event.attemptNo || ''].join('|');
          historyMap.set(key, event);
        });
        const history = [...historyMap.values()].sort((a, b) => (a.at || 0) - (b.at || 0));
        const errorCount = Math.max(
          history.filter(event => event.type === 'error').length,
          Number(left.errorCount) || 0,
          Number(right.errorCount) || 0
        );
        const flashcardCorrectSessions = [...new Set([
          ...(right.flashcardCorrectSessions || []), ...(left.flashcardCorrectSessions || [])
        ])];
        const quizCorrectSessions = [...new Set([
          ...(right.quizCorrectSessions || []), ...(left.quizCorrectSessions || [])
        ])];
        const latestError = Math.max(0, ...history.filter(event => event.type === 'error').map(event => Number(event.at) || 0));
        const dismissedAt = Math.max(Number(left.dismissedAt) || 0, Number(right.dismissedAt) || 0);
        const resolved = left.status === 'resolved' || right.status === 'resolved';
        const dismissed = !resolved && dismissedAt > latestError;
        let status = resolved ? 'resolved' : dismissed ? 'dismissed' : errorCount >= 2 ? 'weak' : 'normal';
        if (status === 'weak' && flashcardCorrectSessions.length >= 2 && quizCorrectSessions.length >= 2) status = 'resolved';
        words[wordId] = {
          ...right, ...left, wordId, errorCount,
          flashcardCorrectSessions, quizCorrectSessions,
          history, status, dismissedAt: dismissed ? dismissedAt : null,
          updatedAt: Math.max(Number(left.updatedAt) || 0, Number(right.updatedAt) || 0)
        };
      }

      return {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        progress,
        quiz,
        weakWords: { version: 1, words },
        preferences: { ...(remote.preferences || {}), ...(local.preferences || {}) }
      };
    }

    async function restoreBackup() {
      if (!init()) return null;
      const user = await getUser();
      if (!user) return null;
      await assertAccountOwner(user);
      const remote = await pullBackup();
      await pullCompletedSessions();
      const merged = remote
        ? mergeBackupSnapshots(getBackupSnapshot(), remote)
        : getBackupSnapshot();
      if (typeof options.applyBackupSnapshot === 'function' && remote) {
        await options.applyBackupSnapshot(merged);
      }
      await assertAccountOwner(user, true);
      return remote ? merged : null;
    }

    async function signIn(email, password) {
      if (!init()) throw new Error('Supabase chưa được cấu hình.');
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      try {
        await assertAccountOwner(data.user);
        onStatus({ state: 'authenticated', user: { id: data.user.id, email: data.user.email } });
        // Merge remote and local progress before uploading; never blindly overwrite a second device.
        const merged = await restoreBackup();
        await syncNow(merged || getBackupSnapshot(), { skipPullSessions: true });
        return { ...data, mergedBackup: merged };
      } catch (syncError) {
        await client.auth.signOut();
        throw syncError;
      }
    }

    async function signOut() {
      if (!init()) return false;
      const { error } = await client.auth.signOut();
      if (error) throw error;
      // Intentionally keep all local data.
      onStatus({ state: 'signed-out', localDataPreserved: true });
      return true;
    }

    async function getUser() {
      if (!init()) return null;
      const { data, error } = await client.auth.getUser();
      if (error && error.status !== 401) throw error;
      return data?.user || null;
    }

    async function pushCompletedSessions() {
      if (!init()) return { uploaded: 0, skipped: 'not-configured' };
      const user = await getUser();
      if (!user) return { uploaded: 0, skipped: 'signed-out' };
      let pending = [];
      try {
        pending = await db.getPendingSessions();
      } catch (error) {
        onStatus({ state: 'warning', message: 'Không đọc được hàng đợi phiên học cục bộ: ' + (error.message || '') });
        return { uploaded: 0, skipped: 'local-session-store-unavailable' };
      }
      let uploaded = 0;
      for (const session of pending) {
        const row = {
          id: session.id,
          user_id: user.id,
          completed_at: new Date(session.completedAt).toISOString(),
          payload: session
        };
        const { error } = await client.from('study_sessions').upsert(row, { onConflict: 'user_id,id' });
        if (error) throw error;
        await db.markSessionSynced(session.id);
        uploaded += 1;
      }
      return { uploaded };
    }

    async function pushBackup(snapshot = getBackupSnapshot()) {
      if (!init()) return { uploaded: false, skipped: 'not-configured' };
      const user = await getUser();
      if (!user) return { uploaded: false, skipped: 'signed-out' };
      const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        progress: snapshot.progress || {},
        quiz: snapshot.quiz || {},
        weakWords: snapshot.weakWords || {},
        preferences: snapshot.preferences || {}
      };
      const { error } = await client.from('user_backups').upsert({
        user_id: user.id,
        payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      if (error) throw error;
      if (db) await db.saveSyncMetadata('last_backup', {
        userId: user.id, exportedAt: payload.exportedAt, status: 'uploaded'
      });
      return { uploaded: true, exportedAt: payload.exportedAt };
    }

    async function pullCompletedSessions() {
      if (!init()) return { downloaded: 0, skipped: 'not-configured' };
      const user = await getUser();
      if (!user) return { downloaded: 0, skipped: 'signed-out' };
      const { data, error } = await client.from('study_sessions')
        .select('id,payload,completed_at')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: true });
      if (error) throw error;
      let downloaded = 0;
      for (const row of (data || [])) {
        const session = row?.payload;
        if (!session || session.status !== 'completed' || !db?.saveSyncedSession) continue;
        try {
          await db.saveSyncedSession(session);
          downloaded += 1;
        } catch (storageError) {
          onStatus({ state: 'warning', message: 'Không lưu được phiên đồng bộ vào thiết bị: ' + (storageError.message || '') });
        }
      }
      return { downloaded };
    }

    async function pullBackup() {
      if (!init()) return null;
      const user = await getUser();
      if (!user) return null;
      const { data, error } = await client.from('user_backups')
        .select('payload,updated_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data?.payload || null;
    }

    async function syncNow(snapshot = getBackupSnapshot(), syncOptions = {}) {
      latestSnapshot = snapshot || getBackupSnapshot();
      if (!init()) return { skipped: 'not-configured' };
      if (!isOnline()) {
        onStatus({ state: 'offline', queued: true, message: 'Đang ngoại tuyến. Dữ liệu vẫn được lưu trên thiết bị.' });
        return { queued: true, skipped: 'offline' };
      }
      const user = await getUser();
      if (!user) return { skipped: 'signed-out' };
      await assertAccountOwner(user);
      if (syncPromise) return syncPromise;
      syncPromise = (async () => {
        const sessions = await pushCompletedSessions();
        const downloadedSessions = syncOptions.skipPullSessions
          ? { downloaded: 0, skipped: 'already-pulled' }
          : await pullCompletedSessions();

        // Pull-merge-push prevents a device from blindly overwriting newer cloud progress.
        const remote = syncOptions.skipPullBackup ? null : await pullBackup();
        const freshLocalSnapshot = getBackupSnapshot();
        const merged = remote
          ? mergeBackupSnapshots(freshLocalSnapshot, remote)
          : freshLocalSnapshot;
        if (remote && typeof options.applyBackupSnapshot === 'function') {
          await options.applyBackupSnapshot(merged);
        }
        const backup = await pushBackup(merged);
        await assertAccountOwner(user, true);
        const result = { sessions, downloadedSessions, backup, merged: !!remote };
        clearRetry();
        onStatus({ state: 'synced', result, user: { id: user.id, email: user.email } });
        return result;
      })();
      try { return await syncPromise; }
      catch (error) {
        onStatus({ state: 'error', message: error.message || 'Đồng bộ thất bại.' });
        scheduleRetry();
        throw error;
      } finally { syncPromise = null; }
    }

    function scheduleSync(snapshot = getBackupSnapshot(), delayMs = 1800) {
      latestSnapshot = snapshot || getBackupSnapshot();
      if (scheduledSyncTimer) clearTimeout(scheduledSyncTimer);
      if (!isOnline()) {
        onStatus({ state: 'offline', queued: true, message: 'Đang ngoại tuyến. Sẽ đồng bộ khi có mạng.' });
        return;
      }
      scheduledSyncTimer = setTimeout(() => {
        scheduledSyncTimer = null;
        syncNow(getBackupSnapshot()).catch(() => {});
      }, Math.max(250, Number(delayMs) || 1800));
    }

    function handleOnline() {
      if (scheduledSyncTimer) clearTimeout(scheduledSyncTimer);
      scheduledSyncTimer = null;
      clearRetry();
      latestSnapshot = getBackupSnapshot();
      syncNow(latestSnapshot).catch(() => {});
    }

    function handleVisibilityChange() {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isOnline()) {
        latestSnapshot = getBackupSnapshot();
        syncNow(latestSnapshot).catch(() => {});
      }
    }

    function handlePageHide() {
      if (scheduledSyncTimer) clearTimeout(scheduledSyncTimer);
      if (retryTimer) clearTimeout(retryTimer);
      scheduledSyncTimer = null;
      retryTimer = null;
      // Keep latestSnapshot; pageshow/online will flush it when the app returns.
    }

    if (typeof window.addEventListener === 'function') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('pageshow', handleVisibilityChange);
      window.addEventListener('pagehide', handlePageHide);
    }
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    function getClient() { init(); return client; }

    return Object.freeze({
      init, isConfigured, signUp, signIn, signOut, getUser,
      pushCompletedSessions, pullCompletedSessions, pushBackup, pullBackup, restoreBackup,
      mergeBackupSnapshots, syncNow, scheduleSync, getClient,
      assertAccountOwner
    });
  }

  window.KawaiiCloudSyncModule = Object.freeze({ create });
})();
