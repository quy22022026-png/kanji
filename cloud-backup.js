/** Cloud payload adapter. Each data owner exports/imports its own snapshot. */
(() => {
  'use strict';
  function create({progress,preferences,quiz,weakWords,events} = {}) {
    const getSnapshot = () => ({progress:progress.getSnapshot(),quiz:quiz.getBackupSnapshot(),weakWords:weakWords.getBackupSnapshot(),preferences:preferences.getSnapshot()});
    async function applySnapshot(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return false;
      await progress.applySnapshot(snapshot.progress || {},{notifyCloud:false});
      quiz.applyBackupSnapshot(snapshot.quiz || {});
      weakWords.applyBackupSnapshot(snapshot.weakWords || {version:1,words:{}});
      await preferences.applySnapshot(snapshot.preferences || {},{notifyCloud:false});
      events.emit('cloud:backup-restored',{exportedAt:snapshot.exportedAt || null});
      return true;
    }
    return Object.freeze({getSnapshot,applySnapshot});
  }
  window.KawaiiCloudBackupModule = Object.freeze({create});
})();
