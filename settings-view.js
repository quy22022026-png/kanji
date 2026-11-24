/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const {vocabulary, preferences, progress, lessons, studySession, sheets, xlsx, source, audioManager, pronunciation, cloudSync, matching, events, notifications, flashcardView} = options;
    const {$} = options.ui;
    const {LEVELS, SAMPLE_DATASET} = window.KawaiiAppConfig;
    const {showToast, showConfirm} = notifications;
    const state = { get words() {return vocabulary.getAll();}, get datasetMeta() {return vocabulary.getMeta();}, get prefs() {return preferences.getSnapshot();} };
    const isWordLearned = options.srs.isWordLearned, isWordDue = options.srs.isWordDue;
    const renderAll = () => events.emit('ui:render');
    const rebuildFlashcardDeck = flashcardView.rebuildFlashcardDeck;
    const applyDataset = source.applyDataset;
    const syncFromGoogleSheets = source.syncFromGoogleSheets;
    const initZenTtsFromCacheOrNetwork = audioManager.initFromCacheOrNetwork;
    const initZenTtsFromLocalFiles = audioManager.initFromLocalFiles;
    const speakJapaneseText = pronunciation.speak;
    const scope = window.KawaiiUiUtils.createScope();
    options.cleanup?.(scope.destroy);

    function renderDataStats() {
      const now = Date.now();
      const grid = $('dataStatsGrid');
      grid.innerHTML = '';
      LEVELS.forEach(lvl => {
        const words = state.words.filter(w => w.level === lvl);
        const learned = words.filter(w => isWordLearned(w.id)).length;
        const due = words.filter(w => isWordDue(w.id, now)).length;
        const card = document.createElement('div');
        card.className = 'rounded-2xl bg-[#FFFDF9] border border-[#F1ECE6] p-3 text-center';
        card.innerHTML = `
          <p class="text-xs font-extrabold text-[#FB6F92]">${lvl}</p>
          <p class="text-lg font-extrabold text-[#332E2E]">${words.length} <span class="text-xs font-semibold text-[#8C7F7A]">từ</span></p>
          <p class="text-[11px] font-bold text-matcha-600">${learned} đã học</p>
          <p class="text-[10px] font-bold ${due > 0 ? 'text-[#E11D48]' : 'text-[#9C8F8A]'}">${due > 0 ? `🔔 ${due} cần ôn` : 'Đã ôn hết'}</p>
        `;
        grid.appendChild(card);
      });
    }

    function getAudioFormPrefs() {
      return {
        kanaReadMode: $('kanaReadModeSelect').value,
        zenSpeed: Number($('zenSpeedInput').value),
        zenPitch: Number($('zenPitchInput').value),
        zenHappy: Number($('zenHappyInput').value),
        fallbackWebSpeech: $('fallbackWebSpeechCheck').checked
      };
    }

    // Data & Module Controls
    scope.bind($('btnSyncGoogleSheet'), 'onclick', () => syncFromGoogleSheets({ silent: false }));
    scope.bind($('autoSyncSheetCheck'), 'onchange', (e) => { preferences.set('autoSyncSheet', e.target.checked, { persist: true }); });
    scope.bind($('btnLoadSampleData'), 'onclick', async () => {
      try {
        await applyDataset(SAMPLE_DATASET,true);
        showToast('Đã nạp bộ từ vựng mẫu chuẩn Sheet!', 'success');
      } catch (error) {
        showToast('Không nạp được bộ mẫu: ' + error.message,'error');
      }
    });

    scope.bind($('csvFileInput'), 'onchange', async (e) => {
      const files = Array.from(e.target.files || []);
      e.target.value = '';
      if (!files.length) return;
      try {
        if (!sheets) throw new Error('Module CSV/Google Sheets chưa được tải.');
        const allWords = await sheets.parseVocabularyFiles(files);
        await applyDataset({ meta: { title: `CSV Sheet (${allWords.length} từ)`, supplemental: state.datasetMeta?.supplemental || {} }, words: allWords }, true);
        showToast(`Đã nạp ${allWords.length} từ từ file CSV!`, 'success');
      } catch (err) { showToast('Lỗi đọc CSV: ' + err.message, 'error'); }
    });

    scope.bind($('jsonFileInput'), 'onchange', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const list = Array.isArray(parsed) ? parsed : parsed.words;
        if (!Array.isArray(list) || !list.length) throw new Error('JSON không có danh sách từ hợp lệ.');
        const words = vocabulary.normalizeImport(list);
        await applyDataset({ meta: { title: file.name, supplemental: state.datasetMeta?.supplemental || {} }, words }, true);
        showToast(`Đã nạp ${words.length} từ từ JSON!`, 'success');
      } catch (err) { showToast('Lỗi đọc JSON: ' + err.message, 'error'); }
    });

    scope.bind($('btnDownloadZenMarine'), 'onclick', () => initZenTtsFromCacheOrNetwork(true));
    scope.bind($('btnModalDownloadZen'), 'onclick', () => initZenTtsFromCacheOrNetwork(true));
    scope.bind($('zenLocalFolderInput'), 'onchange', (e) => { initZenTtsFromLocalFiles(e.target.files); e.target.value = ''; });

    // Optional Supabase Account / Cloud Sync Controls
    const cloudModal = $('cloudAccountModal');
    scope.bind($('btnCloudAccount'), 'onclick', async () => {
      cloudModal.classList.remove('hidden');
      if (!cloudSync?.isConfigured()) {
        $('cloudAccountStatus').textContent = 'Chưa cấu hình Supabase';
        $('cloudAccountDetail').textContent = 'Điền URL và anon key trong supabase-config.js, sau đó chạy supabase-schema.sql.';
        return;
      }
      try {
        const user = await cloudSync.getUser();
        $('cloudAccountStatus').textContent = user ? 'Đã đăng nhập' : 'Chưa đăng nhập';
        $('cloudAccountDetail').textContent = user?.email || 'Bạn có thể học mà không cần đăng nhập.';
      } catch (error) {
        $('cloudAccountStatus').textContent = 'Không kiểm tra được tài khoản';
        $('cloudAccountDetail').textContent = error.message || '';
      }
    });
    scope.bind($('closeCloudAccountBtn'), 'onclick', () => cloudModal.classList.add('hidden'));
    scope.listen(cloudModal, 'click', event => {
      if (event.target === cloudModal) cloudModal.classList.add('hidden');
    });
    scope.bind($('cloudSignInBtn'), 'onclick', async () => {
      const email = $('cloudEmail').value.trim();
      const password = $('cloudPassword').value;
      if (!email || !password) { showToast('Nhập email và mật khẩu.', 'warning'); return; }
      $('cloudSignInBtn').disabled = true;
      try {
        const result = await cloudSync.signIn(email, password);
        $('cloudAccountStatus').textContent = 'Đã đăng nhập và hợp nhất dữ liệu';
        $('cloudAccountDetail').textContent = result.user?.email || email;
        showToast('Đăng nhập và đồng bộ thành công.', 'success');
      } catch (error) {
        showToast(error.message || 'Đăng nhập thất bại.', 'error');
      } finally { $('cloudSignInBtn').disabled = false; }
    });
    scope.bind($('cloudSignUpBtn'), 'onclick', async () => {
      const email = $('cloudEmail').value.trim();
      const password = $('cloudPassword').value;
      if (!email || !password) { showToast('Nhập email và mật khẩu.', 'warning'); return; }
      $('cloudSignUpBtn').disabled = true;
      try {
        const result = await cloudSync.signUp(email, password);
        showToast(result.session ? 'Tạo tài khoản thành công.' : 'Đã gửi email xác nhận nếu dự án yêu cầu xác minh email.', 'success');
      } catch (error) {
        showToast(error.message || 'Không tạo được tài khoản.', 'error');
      } finally { $('cloudSignUpBtn').disabled = false; }
    });
    scope.bind($('cloudSyncNowBtn'), 'onclick', async () => {
      $('cloudSyncNowBtn').disabled = true;
      try {
        const result = await cloudSync.syncNow(options.backup.getSnapshot());
        if (result.backup?.uploaded) showToast(`Đã sao lưu; tải lên ${result.sessions?.uploaded || 0} phiên hoàn thành.`, 'success');
        else showToast('Chưa đăng nhập hoặc Supabase chưa được cấu hình.', 'info');
      } catch (error) {
        showToast(error.message || 'Sao lưu thất bại.', 'error');
      } finally { $('cloudSyncNowBtn').disabled = false; }
    });
    scope.bind($('cloudSignOutBtn'), 'onclick', async () => {
      try {
        await cloudSync.signOut();
        $('cloudAccountStatus').textContent = 'Đã đăng xuất';
        $('cloudAccountDetail').textContent = 'Dữ liệu cục bộ vẫn được giữ nguyên.';
        showToast('Đã đăng xuất. Dữ liệu trên thiết bị không bị xóa.', 'success');
      } catch (error) {
        showToast(error.message || 'Đăng xuất thất bại.', 'error');
      }
    });

    // Audio Modal Controls
    scope.bind($('btnAudioSettings'), 'onclick', () => {
      $('kanaReadModeSelect').value = state.prefs.kanaReadMode || 'CLEAR_MORA';
      $('zenSpeedInput').value = state.prefs.zenSpeed;
      $('zenSpeedVal').textContent = `${Number(state.prefs.zenSpeed).toFixed(2)}x`;
      $('zenPitchInput').value = state.prefs.zenPitch;
      $('zenPitchVal').textContent = `${state.prefs.zenPitch} st`;
      $('zenHappyInput').value = state.prefs.zenHappy;
      $('zenHappyVal').textContent = `${state.prefs.zenHappy}%`;
      $('fallbackWebSpeechCheck').checked = !!state.prefs.fallbackWebSpeech;
      $('audioModal').classList.remove('hidden');
    });
    scope.bind($('closeAudioModalBtn'), 'onclick', () => $('audioModal').classList.add('hidden'));
    scope.listen($('audioModal'), 'click', (e) => { if (e.target === $('audioModal')) $('audioModal').classList.add('hidden'); });
    scope.bind($('zenSpeedInput'), 'oninput', (e) => { $('zenSpeedVal').textContent = `${Number(e.target.value).toFixed(2)}x`; });
    scope.bind($('zenPitchInput'), 'oninput', (e) => { $('zenPitchVal').textContent = `${e.target.value} st`; });
    scope.bind($('zenHappyInput'), 'oninput', (e) => { $('zenHappyVal').textContent = `${e.target.value}%`; });

    scope.bind($('testVoiceBtn'), 'onclick', () => speakJapaneseText('こんにちは、日本語を楽しく勉強しましょう。', getAudioFormPrefs()));
    scope.bind($('saveAudioModalBtn'), 'onclick', () => {
      preferences.update(getAudioFormPrefs(), { persist: true });
      renderAll();
      $('audioModal').classList.add('hidden');
      showToast('Đã lưu cài đặt âm thanh!', 'success');
    });

    // Progress Export / Import / Reset
    scope.bind($('btnExportProgress'), 'onclick', () => {
      const payload = progress.exportSnapshot();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
      a.download = `kawaii-jlpt-srs-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    scope.bind($('importProgressInput'), 'onchange', async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      try {
        const p = JSON.parse(await file.text());
        await progress.importSnapshot(p);
        rebuildFlashcardDeck();
        matching.initRound();
        renderAll();
        showToast('Đã khôi phục tiến độ & lịch ôn SRS!', 'success');
      } catch (err) { showToast('Lỗi nhập tiến độ: ' + err.message, 'error'); }
    });
    scope.bind($('btnResetProgress'), 'onclick', async () => {
      if (!(await showConfirm('Đặt lại tiến độ?', 'Toàn bộ lịch sử học, lịch nhắc ôn SRS từng từ và chuỗi đúng sẽ về 0.'))) return;
      await progress.reset();
      lessons?.resetProgress();
      flashcardView.reset();
      studySession?.clear();
      rebuildFlashcardDeck();
      matching.initRound();
      renderAll();
      showToast('Đã đặt lại tiến độ!');
    });


    scope.bind($('btnCancelZenDownload'),'onclick',audioManager.cancel);
    scope.bind($('xlsxFileInput'),'onchange',async event => {
      const file = event.target.files[0];event.target.value = '';if (!file) return;
      const status = $('xlsxImportStatus');status.textContent = 'Đang kiểm tra workbook...';
      try {
        const result = await xlsx.parse(file);
        await applyDataset(result,true);
        status.textContent = `${file.name}: ${result.words.length} từ · N5 ${result.validation.counts.N5}, N4 ${result.validation.counts.N4}, N3 ${result.validation.counts.N3}. ${result.warnings.join(' ')}`;
        showToast(`Đã nhập ${result.words.length} từ từ XLSX.`, 'success');
      } catch(error) {status.textContent = 'Không nhập được: '+error.message;showToast(status.textContent,'error');}
    });
    events.on('cloud:status',status => {
      const labels = {'not-configured':'Chưa cấu hình Supabase','sdk-missing':'Không tải được Supabase SDK','authenticated':'Đã đăng nhập','signed-out':'Chưa đăng nhập','synced':'Đồng bộ thành công','offline':'Đang ngoại tuyến','retrying':'Đang chờ thử đồng bộ lại','error':'Đồng bộ gặp lỗi','backup-restored':'Đã hợp nhất dữ liệu'};
      $('cloudAccountStatus').textContent = labels[status.state] || status.state;
      $('cloudAccountDetail').textContent = status.user?.email || status.message || '';
    });
    return Object.freeze({renderDataStats, destroy: scope.destroy});
  }
  window.KawaiiSettingsViewModule = Object.freeze({create});
})();
