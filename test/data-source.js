/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const {vocabulary, preferences, sheets, events, notifications, database} = options;
    const {$} = options.ui;
    const {DEFAULT_SHEET_URL, STORAGE_SHEET_KEY, SAMPLE_DATASET, LEVELS} = window.KawaiiAppConfig;
    const {showToast} = notifications;
    const state = {get words() {return vocabulary.getAll();},get datasetMeta() {return vocabulary.getMeta();},get prefs() {return preferences.getSnapshot();}};
    const safeGetLS = database.getLocalJSON, safeSetLS = database.setLocalJSON;

    let disposed = false;
    async function applyDataset(dataset, persist = true, preservePrefs = false) {
      if (disposed) throw new Error('Data source đã dừng.');
      const checked = vocabulary.validate(dataset);
      for (const word of checked.words) {
        const previous = vocabulary.getById(word.id), stat = options.progress?.getWordStat(word.id);
        if (!previous || !stat || !((stat.reps || 0) > 0 || (stat.lapses || 0) > 0 || stat.lastReviewedAt)) continue;
        const identity = value => String(value || '').normalize('NFC').trim();
        if (identity(previous.kana) !== identity(word.kana) || (previous.kanji && word.kanji && identity(previous.kanji) !== identity(word.kanji))) {
          throw new Error(`ID ${word.id} đã có tiến độ nhưng đổi từ (${previous.kanji || previous.kana} → ${word.kanji || word.kana}). Hãy đối chiếu ID và sao lưu tiến độ trước khi nhập.`);
        }
      }
      const supplemental = {...vocabulary.getMeta().supplemental};
      for (const [kind, value] of Object.entries(dataset.meta?.supplemental || {})) if (value?.available) supplemental[kind] = value;
      const next = {...dataset, meta:{...dataset.meta, supplemental}};
      const result = await vocabulary.apply(next,persist,{notify:false});
      if (!next.words.some(w => w.level === preferences.getSnapshot().level)) {
        const first = LEVELS.find(level => next.words.some(w => w.level === level));
        if (first) preferences.set('level',first);
      }
      if (!preservePrefs) preferences.set('topic','ALL');
      events.emit('audio:stop'); events.emit('meaning:hide');
      await preferences.save();
      events.emit('dataset:loaded',{count:next.words.length,title:next.meta.title});
      return result;
    }
    async function syncFromGoogleSheets({ silent = false } = {}) {
      const rawUrl = $('sheetUrlInput').value.trim() || safeGetLS(STORAGE_SHEET_KEY, DEFAULT_SHEET_URL);
      if (!rawUrl) {
        if (!silent) showToast('Hãy dán link Google Sheets trước khi đồng bộ.', 'error');
        return false;
      }
      if (!sheets) {
        if (!silent) showToast('Module Google Sheets chưa được tải.', 'error');
        return false;
      }

      const selectedLevels = Array.from(document.querySelectorAll('.sheet-lvl:checked')).map(el => el.value);
      const configuredLevels = Array.isArray(state.prefs.sheetLevels) && state.prefs.sheetLevels.length ? state.prefs.sheetLevels : ['N5', 'N4', 'N3'];
      const levelsToFetch = selectedLevels.length ? selectedLevels : configuredLevels;
      safeSetLS(STORAGE_SHEET_KEY, rawUrl);
      preferences.update({ sheetLevels: [...levelsToFetch] }, { persist: true });

      const btn = $('btnSyncGoogleSheet');
      if (!silent) btn.disabled = true;
      $('badgeSheetStatus').textContent = silent ? 'Đang kiểm tra nền...' : 'Đang tải...';

      try {
        // Sheets module validates every requested JLPT tab before any dataset is applied.
        const result = await sheets.fetchDataset({ url: rawUrl, levels: levelsToFetch });
        if (disposed) return false;
        const previousSupplemental = state.datasetMeta?.supplemental || {};
        const supplemental = {
          dictionary: result.supplemental.dictionary.available
            ? result.supplemental.dictionary
            : (previousSupplemental.dictionary || result.supplemental.dictionary),
          variants: result.supplemental.variants.available
            ? result.supplemental.variants
            : (previousSupplemental.variants || result.supplemental.variants)
        };
        const dataset = {
          meta: { ...result.meta, supplemental },
          words: result.words
        };

        const previousCount = state.words.length;
        const previousFingerprint = `${state.words.length}:${state.words[0]?.id}:${state.words[state.words.length - 1]?.id}`;
        const nextFingerprint = `${result.words.length}:${result.words[0]?.id}:${result.words[result.words.length - 1]?.id}`;
        await applyDataset(dataset, true, silent);

        const dictionaryCount = supplemental.dictionary?.entries?.length || 0;
        const variantCount = supplemental.variants?.entries?.length || 0;
        $('badgeSheetStatus').textContent = `Tự đồng bộ (${result.words.length} từ)`;
        if (result.warnings.length) {
          console.warn('[Kawaii Sheets]', result.warnings);
        }
        if (!silent) {
          const detail = `Đã đồng bộ ${result.words.length} từ` +
            (supplemental.dictionary?.available ? `, ${dictionaryCount} mục từ điển` : '') +
            (supplemental.variants?.available ? `, ${variantCount} biến thể` : '') + '.';
          showToast(result.warnings.length ? `${detail} Không tải được một số tab bổ sung; dữ liệu từ vựng vẫn được cập nhật, dữ liệu bổ sung cũ (nếu có) được giữ.` : detail, result.warnings.length ? 'info' : 'success');
        } else if (previousFingerprint !== nextFingerprint || previousCount === SAMPLE_DATASET.words.length) {
          showToast(`Đã tự cập nhật ${result.words.length} từ từ Google Sheets!`, 'success');
        }
        return true;
      } catch (err) {
        if (disposed) return false;
        $('badgeSheetStatus').textContent = silent ? 'Dùng bản đã lưu' : 'Lỗi đồng bộ';
        if (!silent) showToast(err.message, 'error');
        console.error('[Kawaii Sheets] Đồng bộ thất bại; bộ dữ liệu hiện tại không bị thay thế:', err);
        return false;
      } finally {
        if (!silent) btn.disabled = false;
      }
    }


    return Object.freeze({applyDataset, syncFromGoogleSheets, destroy() {disposed = true;sheets.cancelPending();}});
  }
  window.KawaiiDataSourceModule = Object.freeze({create});
})();
