/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const {vocabulary, source, progress, preferences, studySession, lessons, quiz, weakWords, kana, audioManager, flashcards, events} = options;
    const {$} = options.ui;
    const {STORAGE_SHEET_KEY, DEFAULT_SHEET_URL, SAMPLE_DATASET} = window.KawaiiAppConfig;
    const safeGetLS = options.database.getLocalJSON;
    let pending = null;

    async function bootstrap() {
      // Owners know their own keys/migrations; startup only controls sequencing.
      await Promise.all([studySession,lessons,quiz,weakWords].map(owner => owner.restorePersistence()));
      await progress.restorePersistence();
      await preferences.load();
      await flashcards.recover();
      const sessionSizeSelect = $('sessionSizeSelect');
      if (sessionSizeSelect) {
        sessionSizeSelect.disabled = false;
        sessionSizeSelect.value = String(preferences.getSnapshot().sessionSize || 10);
      }

      const savedSheetUrl = safeGetLS(STORAGE_SHEET_KEY, DEFAULT_SHEET_URL);
      if (savedSheetUrl) $('sheetUrlInput').value = savedSheetUrl;
      $('autoSyncSheetCheck').checked = preferences.getSnapshot().autoSyncSheet !== false;

      const savedLevels = Array.isArray(preferences.getSnapshot().sheetLevels) ? preferences.getSnapshot().sheetLevels : ['N5', 'N4', 'N3'];
      document.querySelectorAll('.sheet-lvl').forEach(cb => {
        cb.checked = savedLevels.includes(cb.value);
      });

      kana.rebuildDeck();

      const saved = await vocabulary.load();
      if (saved && Array.isArray(saved.words) && saved.words.length) {
        await source.applyDataset(saved, false, true);
      } else {
        await source.applyDataset(SAMPLE_DATASET, false, true);
      }

      if (savedSheetUrl && preferences.getSnapshot().autoSyncSheet !== false) {
        source.syncFromGoogleSheets({ silent: true });
      }

      void audioManager.initFromCacheOrNetwork(false);
      events.emit('app:ready', {
        version: '3.7.2',
        wordCount: vocabulary.getAll().length,
        datasetTitle: vocabulary.getMeta().title
      });
    }


    return Object.freeze({start() {return pending || (pending = bootstrap());}});
  }
  window.KawaiiRuntimeStartupModule = Object.freeze({create});
})();
