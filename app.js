(() => {
      'use strict';

      const CLEAN_HTML_CLONE = document.documentElement.cloneNode(true);

      // =======================================================================
      // 1. CẤU HÌNH CƠ BẢN (Dán link Google Sheet cố định tại đây để mọi thiết bị tự tải)
      // =======================================================================
      const DEFAULT_SHEET_URL = ''; // VD: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit'
      const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
      const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30];
      const DAY_MS = 24 * 60 * 60 * 1000;

      const STORAGE_PROGRESS_KEY = 'jlpt_user_progress_v3';
      const STORAGE_PREFS_KEY = 'jlpt_ui_prefs_v3';
      const STORAGE_SHEET_KEY = 'jlpt_sheet_url_v2';
      const IDB_NAME = 'KawaiiJLPTDB_v2';
      const IDB_STORE = 'datasets';
      const ZEN_CACHE_NAME = 'zen-tts-marine-v1.3.0';

      const SAMPLE_DATASET = {
        meta: { title: 'JLPT Vocabulary (Mẫu từ Sheet)', version: '3.0' },
        words: [
          { id: 'N5_001', level: 'N5', kanji: '', kana: 'おはよう', furigana: 'おはよう', romaji: 'ohayou', hanViet: '', meaning: 'Chào buổi sáng (thân mật; lịch sự: おはようございます)', pos: 'Thán từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'おはよう。今日もいい天気だね。', romaji: 'Ohayou. Kyou mo ii tenki da ne.', vi: 'Chào buổi sáng. Hôm nay trời cũng đẹp nhỉ.' } },
          { id: 'N5_002', level: 'N5', kanji: '', kana: 'こんにちは', furigana: 'こんにちは', romaji: 'konnichiwa', hanViet: '', meaning: 'Xin chào (buổi trưa, chiều)', pos: 'Thán từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'こんにちは、やまださん。お元気ですか。', romaji: 'Konnichiwa, Yamada-san. Ogenki desu ka.', vi: 'Xin chào anh/chị Yamada. Anh/chị có khỏe không?' } },
          { id: 'N5_009', level: 'N5', kanji: '', kana: 'すみません', furigana: 'すみません', romaji: 'sumimasen', hanViet: '', meaning: 'Xin lỗi; cho tôi hỏi / làm phiền một chút', pos: 'Cụm từ cố định', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'すみません、駅はどこですか。', romaji: 'Sumimasen, eki wa doko desu ka.', vi: 'Xin lỗi, cho tôi hỏi nhà ga ở đâu ạ?' } },
          { id: 'N5_011', level: 'N5', kanji: 'お願いします', kana: 'おねがいします', furigana: 'お願[ねが]いします', romaji: 'onegaishimasu', hanViet: 'NGUYỆN', meaning: 'Làm ơn; xin nhờ anh/chị; cho tôi gọi (món)', pos: 'Cụm từ cố định', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'コーヒーを一つお願いします。', romaji: 'Koohii o hitotsu onegaishimasu.', vi: 'Cho tôi một ly cà phê ạ.' } },
          { id: 'N5_020', level: 'N5', kanji: '私', kana: 'わたくし', furigana: '私[わたくし]', romaji: 'watakushi', hanViet: 'TƯ', meaning: 'Tôi (cách xưng trang trọng, khiêm nhường của わたし)', pos: 'Đại từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '私は大学の学生です。', romaji: 'Watakushi wa daigaku no gakusei desu.', vi: 'Tôi là sinh viên đại học.' } },
          { id: 'N5_022', level: 'N5', kanji: '自分', kana: 'じぶん', furigana: '自[じ]分[ぶん]', romaji: 'jibun', hanViet: 'TỰ PHÂN', meaning: 'Bản thân, tự mình', pos: 'Đại từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '朝ごはんは自分で作ります。', romaji: 'Asagohan wa jibun de tsukurimasu.', vi: 'Bữa sáng tôi tự làm lấy.' } },
          { id: 'N5_049', level: 'N5', kanji: '名前', kana: 'なまえ', furigana: '名[な]前[まえ]', romaji: 'namae', hanViet: 'DANH TIỀN', meaning: 'Tên, họ tên', pos: 'Danh từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'ここにお名前を書いてください。', romaji: 'Koko ni onamae o kaite kudasai.', vi: 'Xin vui lòng viết tên của anh/chị vào đây.' } },
          { id: 'N5_050', level: 'N5', kanji: '番号', kana: 'ばんごう', furigana: '番[ばん]号[ごう]', romaji: 'bangou', hanViet: 'PHIÊN HIỆU', meaning: 'Số, số hiệu (số điện thoại, số phòng...)', pos: 'Danh từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '電話番号を教えてください。', romaji: 'Denwa bangou o oshiete kudasai.', vi: 'Cho tôi xin số điện thoại của bạn nhé.' } },
          { id: 'N5_051', level: 'N5', kanji: '言葉', kana: 'ことば', furigana: '言[こと]葉[ば]', romaji: 'kotoba', hanViet: 'NGÔN DIỆP', meaning: 'Từ ngữ, ngôn ngữ, lời nói', pos: 'Danh từ', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: '新しい言葉を毎日覚えます。', romaji: 'Atarashii kotoba o mainichi oboemasu.', vi: 'Mỗi ngày tôi đều học thuộc từ mới.' } },
          { id: 'N5_052', level: 'N5', kanji: '意味', kana: 'いみ', furigana: '意[い]味[み]', romaji: 'imi', hanViet: 'Ý VỊ', meaning: 'Ý nghĩa, nghĩa', pos: 'Danh từ / Động từ nhóm III', topic: 'Chào hỏi, giao tiếp & đại từ', example: { ja: 'この漢字の意味が分かりません。', romaji: 'Kono kanji no imi ga wakarimasen.', vi: 'Tôi không hiểu nghĩa của chữ Kanji này.' } },
          { id: 'N4_001', level: 'N4', kanji: '食事', kana: 'しょくじ', furigana: '食[しょく]事[じ]', romaji: 'shokuji', hanViet: 'THỰC SỰ', meaning: 'Bữa ăn, dùng bữa', pos: 'Danh từ / Động từ', topic: 'Ẩm thực', example: { ja: '家族と食事をします。', romaji: 'Kazoku to shokuji o shimasu.', vi: 'Tôi dùng bữa cùng gia đình.' } },
          { id: 'N4_002', level: 'N4', kanji: '旅行', kana: 'りょこう', furigana: '旅[りょ]行[こう]', romaji: 'ryokou', hanViet: 'LỮ HÀNH', meaning: 'Du lịch', pos: 'Danh từ / Động từ', topic: 'Di chuyển', example: { ja: '日本へ旅行に行きます。', romaji: 'Nihon e ryokou ni ikimasu.', vi: 'Tôi đi du lịch đến Nhật Bản.' } },
          { id: 'N3_001', level: 'N3', kanji: '発見', kana: 'はっけん', furigana: '発[はっ]見[けん]', romaji: 'hakken', hanViet: 'PHÁT KIẾN', meaning: 'Phát hiện', pos: 'Danh từ / Động từ', topic: 'Học tập', example: { ja: '新しい星を発見しました。', romaji: 'Atarashii hoshi o hakken shimashita.', vi: 'Đã phát hiện ra một ngôi sao mới.' } }
        ]
      };

      const BUILTIN_MINI_DICT = {
        'は': { reading: 'わ (wa)', meaning: 'Trợ từ chủ đề câu', note: 'Đứng sau chủ ngữ/chủ đề' },
        'が': { reading: 'が (ga)', meaning: 'Trợ từ chủ ngữ / nhấn mạnh đối tượng', note: 'Hoặc nghĩa "nhưng" khi nối câu' },
        'を': { reading: 'を (o)', meaning: 'Trợ từ tân ngữ trực tiếp', note: 'Đứng sau đối tượng chịu tác động' },
        'に': { reading: 'に (ni)', meaning: 'Vào, ở, đến, cho (thời gian/đích đến)', note: 'Trợ từ chỉ thời gian, địa điểm, mục đích' },
        'で': { reading: 'で (de)', meaning: 'Tại, bằng (nơi diễn ra / phương tiện)', note: 'Trợ từ chỉ nơi hành động hoặc cách thức' },
        'へ': { reading: 'へ (e)', meaning: 'Hướng về, đến (địa điểm)', note: 'Trợ từ chỉ phương hướng' },
        'と': { reading: 'と (to)', meaning: 'Và / Cùng với', note: 'Trợ từ liệt kê hoặc đồng hành' },
        'の': { reading: 'の (no)', meaning: 'Của (sở hữu / bổ nghĩa)', note: 'Nối hai danh từ' },
        'も': { reading: 'も (mo)', meaning: 'Cũng', note: 'Trợ từ tương đồng' },
        'か': { reading: 'か (ka)', meaning: 'Không? (trợ từ nghi vấn)', note: 'Đặt cuối câu để hỏi' },
        'ね': { reading: 'ね (ne)', meaning: 'Nhỉ, nhé (xác nhận, đồng cảm)', note: 'Trợ từ cuối câu' },
        'よ': { reading: 'よ (yo)', meaning: 'Đấy, nhé (nhấn mạnh thông tin mới)', note: 'Trợ từ cuối câu' },
        'です': { reading: 'です', meaning: 'Là (lịch sự)', note: 'Hệ từ lịch sự cuối câu' },
        'ます': { reading: 'ます', meaning: 'Đuôi động từ thể lịch sự', note: 'Thì hiện tại / tương lai' },
        'ください': { reading: 'ください', meaning: 'Xin hãy / Cho tôi xin...', note: 'Cấu trúc yêu cầu lịch sự' },
        '今日': { reading: 'きょう', hanViet: 'KIM NHẬT', meaning: 'Hôm nay', note: 'Danh từ thời gian' },
        '天気': { reading: 'てんき', hanViet: 'THIÊN KHÍ', meaning: 'Thời tiết', note: 'Danh từ' },
        'いい': { reading: 'いい', meaning: 'Tốt, đẹp', note: 'Tính từ đuôi い' },
        '駅': { reading: 'えき', hanViet: 'DỊCH', meaning: 'Nhà ga', note: 'Danh từ địa điểm' },
        'どこ': { reading: 'どこ', meaning: 'Ở đâu', note: 'Đại từ nghi vấn' },
        '大学': { reading: 'だいがく', hanViet: 'ĐẠI HỌC', meaning: 'Trường đại học', note: 'Danh từ' },
        '学生': { reading: 'がくせい', hanViet: 'HỌC SINH', meaning: 'Học sinh, sinh viên', note: 'Danh từ' },
        '朝ごはん': { reading: 'あさごはん', meaning: 'Bữa sáng', note: 'Danh từ' },
        '作ります': { reading: 'つくります', hanViet: 'TÁC', meaning: 'Làm, nấu, chế tạo', note: 'Thể ます của 作る' },
        'ここ': { reading: 'ここ', meaning: 'Ở đây, chỗ này', note: 'Đại từ chỉ định' },
        '書いて': { reading: 'かいて', hanViet: 'THƯ', meaning: 'Viết (thể て)', note: 'Từ động từ 書く' },
        '電話': { reading: 'でんわ', hanViet: 'ĐIỆN THOẠI', meaning: 'Điện thoại', note: 'Danh từ' },
        '教えて': { reading: 'おしえて', hanViet: 'GIÁO', meaning: 'Chỉ cho, nói cho biết (thể て)', note: 'Từ động từ 教える' },
        '新しい': { reading: 'あたらしい', hanViet: 'TÂN', meaning: 'Mới', note: 'Tính từ đuôi い' },
        '毎日': { reading: 'まいにち', hanViet: 'MỖI NHẬT', meaning: 'Mỗi ngày', note: 'Danh từ thời gian' },
        '覚えます': { reading: 'おぼえます', hanViet: 'GIÁC', meaning: 'Nhớ, học thuộc', note: 'Thể ます của 覚える' },
        'この': { reading: 'この', meaning: '...này', note: 'Đứng trước danh từ' },
        '漢字': { reading: 'かんじ', hanViet: 'HÁN TỰ', meaning: 'Chữ Hán (Kanji)', note: 'Danh từ' },
        '分かりません': { reading: 'わかりません', hanViet: 'PHÂN', meaning: 'Không hiểu, không biết', note: 'Phủ định lịch sự của 分かる' },
        'コーヒー': { reading: 'こーひー', meaning: 'Cà phê', note: 'Từ mượn (Katakana)' },
        '一つ': { reading: 'ひとつ', hanViet: 'NHẤT', meaning: 'Một cái', note: 'Số đếm đồ vật' },
        '元気': { reading: 'げんき', hanViet: 'NGUYÊN KHÍ', meaning: 'Khỏe mạnh, năng lượng', note: 'Tính từ đuôi な' },
        '家族': { reading: 'かぞく', hanViet: 'GIA TỘC', meaning: 'Gia đình', note: 'Danh từ' },
        '日本': { reading: 'にほん', hanViet: 'NHẬT BẢN', meaning: 'Nhật Bản', note: 'Danh từ riêng' },
        '星': { reading: 'ほし', hanViet: 'TINH', meaning: 'Ngôi sao', note: 'Danh từ' }
      };

      // =======================================================================
      // 2. EVENT BUS & STATE (Bao gồm SRS từng từ + Phiên học)
      // =======================================================================
      const listeners = new Map();
      let cloudSync = null;

      const events = {
        on(event, fn) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event).add(fn);
        },
        off(event, fn) { listeners.get(event)?.delete(fn); },
        once(event, fn) {
          if (typeof fn !== 'function') return;
          const wrapped = (payload) => {
            events.off(event, wrapped);
            fn(payload);
          };
          events.on(event, wrapped);
          return () => events.off(event, wrapped);
        },
        emit(event, payload) {
          listeners.get(event)?.forEach(fn => {
            try { fn(payload); } catch (err) { console.error(`[Plugin Event ${event}]`, err); }
          });
        }
      };

      const registeredModules = new Map();

      const state = {
        mode: 'flashcard',
        datasetTitle: '',
        datasetMeta: {},
        words: [],
        wordMap: new Map(),
        dictIndex: new Map(),
        progress: {
          wordStats: {},
          streak: 0,
          bestStreak: 0,
          totalPairsMatched: 0
        },
        prefs: {
          level: 'N5',
          topic: 'ALL',
          showFuri: true,
          fcFilter: 'SMART',
          sessionSize: 10,
          autoSyncSheet: true,
          sheetLevels: ['N5', 'N4', 'N3'],
          matchSwap: false,
          kanaView: 'card',
          kanaScript: 'hira',
          kanaGroup: 'seion',
          kanaReadMode: 'CLEAR_MORA',
          zenSpeed: 1.0,
          zenPitch: 0,
          zenHappy: 60,
          fallbackWebSpeech: true
        },
        lesson: null,
        lessonBrowserOpen: false,
        lessonLevel: 'N5',
        fcDeck: [],
        fcIndex: 0,
        fcFlipped: false,
        sessionStats: { reviewed: 0, good: 0, again: 0 },
        matchRoundPairs: [],
        matchLeftItems: [],
        matchRightItems: [],
        matchSelected: null,
        matchMatchedIds: new Set(),
        matchLocked: false,
        matchErrors: null,
        kanaDeck: [],
        kanaIndex: 0,
        kanaFlipped: false,
        activePopupSpeakText: ''
      };

      const $ = (id) => document.getElementById(id);
      let cardMoveTimer = null;
      let kanaMoveTimer = null;
      let matchErrorTimer = null;

      // =======================================================================
      // 3. SRS ENGINE (THEO DÕI TỪNG TỪ & NHẮC LỊCH ÔN)
      // =======================================================================
      function getWordStat(wordId) {
        return state.progress.wordStats[wordId] || null;
      }

      function getWordSrsInfo(wordId, now = Date.now()) {
        const st = getWordStat(wordId);
        if (!st || (st.reps === 0 && st.lapses === 0)) {
          return {
            status: 'new',
            label: '🆕 Từ mới',
            badgeClass: 'bg-skysoft-50 text-skysoft-500',
            nextGoodDays: SRS_INTERVALS_DAYS[0]
          };
        }
        const nextGoodIdx = Math.min(SRS_INTERVALS_DAYS.length - 1, st.reps);
        const nextGoodDays = SRS_INTERVALS_DAYS[nextGoodIdx];

        if (st.nextReviewAt <= now) {
          return {
            status: 'due',
            label: st.lapses > 0 && st.reps === 0 ? '🔴 Học lại' : '🔔 Cần ôn ngay',
            badgeClass: 'bg-[#FFF1F2] text-[#E11D48]',
            nextGoodDays
          };
        }
        const daysLeft = Math.max(1, Math.ceil((st.nextReviewAt - now) / DAY_MS));
        if (st.intervalDays >= 14) {
          return {
            status: 'mastered',
            label: `✅ Thành thạo (${daysLeft}n)`,
            badgeClass: 'bg-matcha-50 text-matcha-600',
            nextGoodDays
          };
        }
        return {
          status: 'scheduled',
          label: `⏳ Ôn sau ${daysLeft} ngày`,
          badgeClass: 'bg-[#FEF3C7] text-[#B45309]',
          nextGoodDays
        };
      }

      function isWordLearned(wordId) {
        const st = getWordStat(wordId);
        return !!(st && st.reps >= 1);
      }

      function isWordDue(wordId, now = Date.now()) {
        const st = getWordStat(wordId);
        return !!(st && (st.reps > 0 || st.lapses > 0) && st.nextReviewAt <= now);
      }

      function isWordNew(wordId) {
        const st = getWordStat(wordId);
        return !st || (st.reps === 0 && st.lapses === 0);
      }

      function calculateSrsNext(prevStats, rating, now = Date.now()) {
        if (!['again', 'hard', 'good'].includes(rating)) {
          throw new TypeError('SRS rating không hợp lệ: ' + rating);
        }
        const prev = prevStats || {
          reps: 0, intervalDays: 0, nextReviewAt: 0, lastReviewedAt: 0, lapses: 0
        };
        const next = { ...prev, lastReviewedAt: now };

        // Giữ nguyên thuật toán của HTML gốc.
        if (rating === 'again') {
          next.reps = 0;
          next.intervalDays = 0;
          next.lapses = (prev.lapses || 0) + 1;
          next.nextReviewAt = now + 5 * 60 * 1000;
        } else if (rating === 'hard') {
          next.reps = Math.max(1, prev.reps);
          next.intervalDays = 1;
          next.nextReviewAt = now + DAY_MS;
        } else if (rating === 'good') {
          const idx = Math.min(SRS_INTERVALS_DAYS.length - 1, prev.reps);
          next.intervalDays = SRS_INTERVALS_DAYS[idx];
          next.reps = prev.reps + 1;
          next.nextReviewAt = now + next.intervalDays * DAY_MS;
        }
        return next;
      }

      function rateWordSrs(wordId, rating) {
        if (!wordId) throw new TypeError('Thiếu wordId khi đánh giá SRS.');
        const prev = getWordStat(wordId);
        const next = calculateSrsNext(prev, rating, Date.now());

        state.progress.wordStats[wordId] = next;
        saveProgress();
        events.emit('srs:rated', {
          wordId,
          rating,
          previous: prev ? { ...prev } : null,
          current: { ...next },
          algorithmVersion: 1
        });
        events.emit('progress:updated', { wordId, progress: { ...next } });
        return next;
      }

      // =======================================================================
      // 4. HELPERS & STORAGE (IndexedDB + localStorage)
      // =======================================================================
      function shuffled(items) {
        const arr = [...items];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
      }

      function escapeHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      }

      function safeGetLS(key, fallback = null) {
        return window.KawaiiDatabase
          ? window.KawaiiDatabase.getLocalJSON(key, fallback)
          : fallback;
      }

      function safeSetLS(key, value) {
        return window.KawaiiDatabase
          ? window.KawaiiDatabase.setLocalJSON(key, value)
          : false;
      }

      async function saveDatasetToIDB(payload) {
        if (!window.KawaiiDatabase) {
          return safeSetLS('jlpt_vocab_fallback_v2', { ...payload, _storedAt: Date.now() });
        }
        return window.KawaiiDatabase.saveActiveDataset(payload);
      }

      async function loadDatasetFromIDB() {
        try {
          const data = await window.KawaiiDatabase?.getActiveDataset();
          if (data) return data;
        } catch { /* fallback */ }
        return safeGetLS('jlpt_vocab_fallback_v2', null);
      }

      function saveProgress() {
        const snapshot = {
          wordStats: state.progress.wordStats,
          streak: state.progress.streak,
          bestStreak: state.progress.bestStreak,
          totalPairsMatched: state.progress.totalPairsMatched
        };
        safeSetLS(STORAGE_PROGRESS_KEY, snapshot);
        window.KawaiiDatabase?.saveAppState('progress_snapshot', snapshot)
          .catch(error => console.warn('[KawaiiDatabase] Progress mirror failed:', error));
        cloudSync?.scheduleSync(getCloudBackupSnapshot());
      }

      function loadProgress() {
        const p = safeGetLS(STORAGE_PROGRESS_KEY, null);
        if (p) {
          state.progress.wordStats = (p.wordStats && typeof p.wordStats === 'object') ? p.wordStats : {};
          state.progress.streak = Number(p.streak) || 0;
          state.progress.bestStreak = Number(p.bestStreak) || 0;
          state.progress.totalPairsMatched = Number(p.totalPairsMatched) || 0;
          return;
        }
        const legacy = safeGetLS('jlpt_user_progress_v2', null);
        if (legacy && Array.isArray(legacy.masteredIds)) {
          const now = Date.now();
          legacy.masteredIds.forEach(id => {
            state.progress.wordStats[id] = { reps: 2, intervalDays: 3, nextReviewAt: now + 3 * DAY_MS, lastReviewedAt: now, lapses: 0 };
          });
          state.progress.streak = Number(legacy.streak) || 0;
          state.progress.bestStreak = Number(legacy.bestStreak) || 0;
          state.progress.totalPairsMatched = Number(legacy.totalPairsMatched) || 0;
          saveProgress();
        }
      }

      function savePrefs() {
        safeSetLS(STORAGE_PREFS_KEY, state.prefs);
        window.KawaiiDatabase?.saveAppState('preferences_snapshot', state.prefs)
          .catch(error => console.warn('[KawaiiDatabase] Preferences mirror failed:', error));
        cloudSync?.scheduleSync(getCloudBackupSnapshot());
      }

      function loadPrefs() {
        const pr = safeGetLS(STORAGE_PREFS_KEY, null);
        if (!pr) return;
        Object.keys(state.prefs).forEach(k => {
          if (pr[k] !== undefined) state.prefs[k] = pr[k];
        });
      }

      // =======================================================================
      // 5. TOAST & MODAL HELPERS
      // =======================================================================
      function showToast(message, type = 'info') {
        const colors = {
          info: 'bg-[#332E2E] text-white',
          success: 'bg-matcha-600 text-white',
          error: 'bg-[#E11D48] text-white'
        };
        const el = document.createElement('div');
        el.className = `${colors[type] || colors.info} px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg animate-pop max-w-[90vw] text-center`;
        el.textContent = message;
        const container = $('toastContainer');
        if (container.children.length >= 3) container.firstElementChild.remove();
        container.appendChild(el);
        setTimeout(() => {
          el.style.opacity = '0';
          el.style.transition = 'opacity 0.25s';
          setTimeout(() => el.remove(), 260);
        }, 2500);
      }

      let confirmCleanup = null;
      function showConfirm(title, message) {
        if (confirmCleanup) confirmCleanup(false);
        return new Promise(resolve => {
          $('confirmTitle').textContent = title;
          $('confirmMessage').textContent = message;
          $('confirmModal').classList.remove('hidden');
          const finish = (ok) => {
            $('confirmModal').classList.add('hidden');
            $('confirmOkBtn').onclick = null;
            $('confirmCancelBtn').onclick = null;
            confirmCleanup = null;
            resolve(ok);
          };
          confirmCleanup = finish;
          $('confirmOkBtn').onclick = () => finish(true);
          $('confirmCancelBtn').onclick = () => finish(false);
        });
      }

      // =======================================================================
      // 6. KANA ALPHABET DATASET
      // =======================================================================
      const KANA_DATA = {
        seion: [
          ['あ','ア','a','あー','あめ'],['い','イ','i','いー','いぬ'],['う','ウ','u','うー','うみ'],['え','エ','e','えー','えき'],['お','オ','o','おー','おちゃ'],
          ['か','カ','ka','かー','かさ'],['き','キ','ki','きー','きもの'],['く','ク','ku','くー','くも'],['け','ケ','ke','けー','けしき'],['こ','コ','ko','こー','こども'],
          ['さ','サ','sa','さー','さくら'],['し','シ','shi','しー','しろ'],['す','ス','su','すー','すし'],['せ','セ','se','せー','せかい'],['そ','ソ','so','そー','そら'],
          ['た','タ','ta','たー','たいよう'],['ち','チ','chi','ちー','ちず'],['つ','ツ','tsu','つー','つき'],['て','テ','te','てー','てがみ'],['と','ト','to','とー','とけい'],
          ['な','ナ','na','なー','なつ'],['に','ニ','ni','にー','にじ'],['ぬ','ヌ','nu','ぬー','ぬの'],['ね','ネ','ne','ねー','ねこ'],['の','ノ','no','のー','のり'],
          ['は','ハ','ha','はあ','はな'],['ひ','ヒ','hi','ひー','ひこうき'],['ふ','フ','fu','ふー','ふゆ'],['へ','ヘ','he','へえ','へや'],['ほ','ホ','ho','ほー','ほし'],
          ['ま','マ','ma','まー','まど'],['み','ミ','mi','みー','みず'],['む','ム','mu','むー','むし'],['め','メ','me','めー','めがね'],['も','モ','mo','もー','もり'],
          ['や','ヤ','ya','やー','やま'],null,['ゆ','ユ','yu','ゆー','ゆき'],null,['よ','ヨ','yo','よー','よる'],
          ['ら','ラ','ra','らー','らいおん'],['り','リ','ri','りー','りんご'],['る','ル','ru','るー','るす'],['れ','レ','re','れー','れきし'],['ろ','ロ','ro','ろー','ろうそく'],
          ['わ','ワ','wa','わー','わたし'],null,null,null,['を','ヲ','wo','おー','ほん'],
          ['ん','ン','n','んー','にほん'],null,null,null,null
        ],
        dakuon: [
          ['が','ガ','ga','がー','がっこう'],['ぎ','ギ','gi','ぎー','ぎんこう'],['ぐ','グ','gu','ぐー','ぐんて'],['げ','ゲ','ge','げー','げんき'],['ご','ゴ','go','ごー','ごはん'],
          ['ざ','ザ','za','ざー','ざっし'],['じ','ジ','ji','じー','じしょ'],['ず','ズ','zu','ずー','ずつう'],['ぜ','ゼ','ze','ぜー','ぜんぶ'],['ぞ','ゾ','zo','ぞー','ぞう'],
          ['だ','ダ','da','だー','だいがく'],['ぢ','ヂ','ji','じー','はなぢ'],['づ','ヅ','zu','ずー','つづく'],['で','デ','de','でー','でんしゃ'],['ど','ド','do','どー','どようび'],
          ['ば','バ','ba','ばー','ばんごはん'],['び','ビ','bi','びー','びょういん'],['ぶ','ブ','bu','ぶー','ぶどう'],['べ','ベ','be','べー','べんきょう'],['ぼ','ボ','bo','ぼー','ぼうし'],
          ['ぱ','パ','pa','ぱー','ぱん'],['ぴ','ピ','pi','ぴー','ぴあの'],['ぷ','プ','pu','ぷー','ぷーる'],['ぺ','ペ','pe','ぺー','ぺん'],['ぽ','ポ','po','ぽー','ぽけっと']
        ],
        yoon: [
          ['きゃ','キャ','kya','きゃー','きゃく'],['きゅ','キュ','kyu','きゅー','きゅうり'],['きょ','キョ','kyo','きょー','きょう'],
          ['しゃ','シャ','sha','しゃー','しゃしん'],['しゅ','シュ','shu','しゅー','しゅみ'],['しょ','ショ','sho','しょー','しょくじ'],
          ['ちゃ','チャ','cha','ちゃー','ちゃいろ'],['ちゅ','チュ','chu','ちゅー','ちゅうい'],['ちょ','チョ','cho','ちょー','ちょうちょ'],
          ['にゃ','ニャ','nya','にゃー','にゃんこ'],['にゅ','ニュ','nyu','にゅー','にゅうがく'],['にょ','ニョ','nyo','にょー','にょうぼう'],
          ['ひゃ','ヒャ','hya','ひゃー','ひゃく'],['ひゅ','ヒュ','hyu','ひゅー','ひゅうが'],['ひょ','ヒョ','hyo','ひょー','ひょう'],
          ['みゃ','ミャ','mya','みゃー','みゃく'],['みゅ','ミュ','myu','みゅー','みゅーじっく'],['みょ','ミョ','myo','みょー','みょうじ'],
          ['りゃ','リャ','rya','りゃー','りゃくご'],['りゅ','リュ','ryu','りゅー','りゅうがく'],['りょ','リョ','ryo','りょー','りょこう'],
          ['ぎゃ','ギャ','gya','ぎゃー','ぎゃく'],['ぎゅ','ギュ','gyu','ぎゅー','ぎゅうにゅう'],['ぎょ','ギョ','gyo','ぎょー','ぎょうざ'],
          ['じゃ','ジャ','ja','じゃー','じゃがいも'],['じゅ','ジュ','ju','じゅー','じゅうしょ'],['じょ','ジョ','jo','じょー','じょうず'],
          ['びゃ','ビャ','bya','びゃー','びゃくや'],['びゅ','ビュ','byu','びゅー','びゅう'],['びょ','ビョ','byo','びょー','びょうき'],
          ['ぴゃ','ピャ','pya','ぴゃー','ろっぴゃく'],['ぴゅ','ピュ','pyu','ぴゅー','ぴゅーま'],['ぴょ','ピョ','pyo','ぴょー','はっぴょう']
        ]
      };

      const KANA_PHONETIC_MAP = new Map();
      Object.values(KANA_DATA).forEach(group => {
        group.forEach(item => {
          if (!item) return;
          const [hira, kata, romaji, clearMora, sampleJa] = item;
          KANA_PHONETIC_MAP.set(hira, { hira, kata, romaji, clearMora, sampleJa });
          KANA_PHONETIC_MAP.set(kata, { hira, kata, romaji, clearMora, sampleJa });
        });
      });

      // =======================================================================
      // 7. ZEN-TTS MARINE v1.3.0 MODULE ENGINE
      // =======================================================================
      const ZEN_REMOTE_FILES = {
        marineZtm: 'https://tts-models.zenryoku.work/v1.3.0/marine.ztm',
        g2pBin: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models/g2p/g2p.bin',
        g2pJson: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models/g2p/g2p.json',
        cpuWasm: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/cpu/tts-cpu.wasm'
      };

      let zenInstance = null;
      let zenLoadPromise = null;
      const pronunciation = window.KawaiiPronunciationModule
        ? window.KawaiiPronunciationModule.create({
            getEngine: () => zenInstance,
            getPrefs: () => state.prefs,
            onToast: (message, type) => showToast(message, type)
          })
        : null;

      function updateZenStatusUI(ready, label) {
        const badge = $('badgeZenTts');
        const dot = $('zenStatusDot');
        const modalText = $('zenModalStatusText');
        if (badge) {
          badge.textContent = label;
          badge.className = ready
            ? 'text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-matcha-50 text-matcha-600 shrink-0'
            : 'text-[11px] font-extrabold px-2.5 py-1 rounded-xl bg-[#F6EFE8] text-[#786D69] shrink-0';
        }
        if (dot) {
          dot.className = ready
            ? 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-matcha-500'
            : 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D1C7BF]';
        }
        if (modalText) modalText.textContent = label;
      }

      async function fetchWithTimeout(url, options = {}, timeout = 45000) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout);
        try {
          const response = await fetch(url, { ...options, signal: controller.signal });
          if ([204, 205, 304].includes(response.status)) return response;
          return new Response(await response.arrayBuffer(), {
            status: response.status, statusText: response.statusText, headers: response.headers
          });
        } catch (err) {
          if (err.name === 'AbortError') throw new Error('Quá thời gian kết nối. Hãy kiểm tra mạng.');
          throw err;
        } finally { clearTimeout(timer); }
      }

      async function openZenCache() {
        try { return window.caches ? await caches.open(ZEN_CACHE_NAME) : null; }
        catch { return null; }
      }

      function clearWavCache() {
        pronunciation?.clearCache();
      }

      function stopAudio() {
        pronunciation?.stop();
      }

      async function createZenEngine(options, responses) {
        const assets = await Promise.all([...responses].map(async ([url, response]) => ({
          url, body: await response.clone().arrayBuffer(), headers: [...response.headers]
        })));
        const worker = new Worker(new URL('./zen-worker.js', document.baseURI), { type: 'module' });
        const pending = new Map();
        let sequence = 0;
        let terminated = false;

        const destroy = (message = 'Phiên giọng đọc đã kết thúc. Hãy nạp lại Marine.') => {
          if (terminated) return;
          terminated = true;
          worker.terminate();
          for (const req of pending.values()) {
            clearTimeout(req.timer);
            req.reject(new Error(message));
          }
          pending.clear();
        };

        worker.onmessage = ({ data }) => {
          const req = pending.get(data.id);
          if (!req) return;
          pending.delete(data.id);
          clearTimeout(req.timer);
          if (data.error) req.reject(new Error(data.error));
          else req.resolve(data.result);
        };
        worker.onerror = (event) => {
          event.preventDefault();
          destroy('Cần đặt cùng zen-worker.js & vendor/zen-tts/ trên HTTP(S) để chạy Marine.');
        };

        const ask = (type, data, transfer = []) => new Promise((resolve, reject) => {
          if (terminated) return reject(new Error('Giọng đọc đã dừng. Hãy nạp lại Marine.'));
          const id = ++sequence;
          const timer = setTimeout(() => destroy('Giọng đọc quá thời gian xử lý.'), 120000);
          pending.set(id, { resolve, reject, timer });
          try { worker.postMessage({ id, type, ...data }, transfer); }
          catch (err) { clearTimeout(timer); pending.delete(id); reject(err); }
        });

        try {
          const result = await ask('load', { options, assets }, assets.map(a => a.body));
          return {
            backend: result.backend,
            destroy,
            isAlive: () => !terminated,
            speak: (text, speechOptions) => ask('speak', { text, options: speechOptions })
          };
        } catch (err) { destroy(); throw err; }
      }

      async function initZenTtsFromCacheOrNetwork(autoDownload = false, localResponses = null) {
        if (location.protocol === 'file:') {
          if (autoDownload || localResponses) showToast('Hãy mở qua GitHub Pages (HTTPS) hoặc http://localhost để nạp Marine.', 'error');
          return null;
        }
        if (zenLoadPromise) return zenLoadPromise;
        if (zenInstance && !zenInstance.isAlive()) {
          zenInstance = null;
          clearWavCache();
          updateZenStatusUI(false, 'Cần nạp lại Marine');
        }
        if (zenInstance && !localResponses) return zenInstance;

        zenLoadPromise = (async () => {
          const detail = $('zenDownloadDetail');
          const buttons = [$('btnDownloadZenMarine'), $('btnModalDownloadZen')];
          try {
            const cache = await openZenCache();
            const urls = ['marineZtm', 'g2pBin', 'g2pJson', 'cpuWasm'].map(k => ZEN_REMOTE_FILES[k]);
            const responses = new Map(localResponses || []);
            if (!localResponses) {
              for (const url of urls) {
                const saved = cache && await cache.match(url);
                if (saved) responses.set(url, saved);
              }
              if (!autoDownload && responses.size !== urls.length) {
                updateZenStatusUI(false, 'Chưa nạp');
                return null;
              }
            }

            buttons.forEach(b => { if (b) b.disabled = true; });
            updateZenStatusUI(false, 'Đang nạp Marine...');
            if (detail) detail.textContent = 'Đang tải giọng Marine, G2P và WASM. Lần đầu có thể mất 1–2 phút...';

            await Promise.all(urls.map(async url => {
              if (responses.has(url)) return;
              const resp = await fetchWithTimeout(url, {}, 120000);
              if (!resp.ok) throw new Error(`Không tải được ${url.split('/').pop()} (HTTP ${resp.status}).`);
              responses.set(url, new Response(await resp.arrayBuffer(), { headers: resp.headers }));
            }));

            const options = {
              modelsUrl: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models',
              cpuWasmUrl: ZEN_REMOTE_FILES.cpuWasm,
              model: ZEN_REMOTE_FILES.marineZtm
            };
            const newInstance = await createZenEngine(options, responses);
            stopAudio();
            if (zenInstance) zenInstance.destroy();
            zenInstance = newInstance;
            clearWavCache();

            let persisted = !!cache;
            if (cache) {
              try { for (const [url, resp] of responses) await cache.put(url, resp.clone()); }
              catch { persisted = false; }
            }
            const backend = zenInstance.backend.toUpperCase();
            updateZenStatusUI(true, `Sẵn sàng (${backend})`);
            if (detail) {
              detail.textContent = persisted
                ? `✅ Đã nạp Marine v1.3.0 (${backend}) và lưu Cache trình duyệt.`
                : `✅ Marine sẵn sàng (${backend}).`;
            }
            events.emit('tts:ready', { backend });
            if (autoDownload || localResponses) showToast('Đã kích hoạt ZEN-TTS Marine!', 'success');
            return zenInstance;
          } catch (err) {
            updateZenStatusUI(!!zenInstance, zenInstance ? 'Đang dùng bản trước' : 'Chưa nạp');
            if (detail) detail.textContent = `Không nạp được Marine: ${err.message}`;
            if (autoDownload || localResponses) showToast('Lỗi nạp Marine: ' + err.message, 'error');
            return null;
          } finally {
            buttons.forEach(b => { if (b) b.disabled = false; });
          }
        })();

        try { return await zenLoadPromise; }
        finally { zenLoadPromise = null; }
      }

      async function initZenTtsFromLocalFiles(fileList) {
        const files = Array.from(fileList || []);
        const responses = new Map();
        const required = { marineZtm: 'marine.ztm', g2pBin: 'g2p.bin', g2pJson: 'g2p.json', cpuWasm: 'tts-cpu.wasm' };
        for (const [key, name] of Object.entries(required)) {
          const found = files.find(f => f.name === name);
          if (!found) { showToast('Thư mục thiếu tệp bắt buộc: ' + name, 'error'); return; }
          responses.set(ZEN_REMOTE_FILES[key], new Response(found));
        }
        return initZenTtsFromCacheOrNetwork(false, responses);
      }

            function speakFallbackWebSpeech(text, speed = 1.0) {
        return pronunciation
          ? pronunciation.speak(text, { fallbackWebSpeech: true, zenSpeed: speed })
          : false;
      }

            function speakJapaneseText(text, customPrefs = state.prefs) {
        if (!pronunciation) return Promise.resolve({ ok: false, reason: 'module-unavailable' });
        return pronunciation.speak(text, customPrefs);
      }

            function speakWord(word) {
        if (!word || !pronunciation) return;
        return pronunciation.speakWord(word);
      }

            function speakKanaItem(hira) {
        if (!pronunciation) return;
        const info = KANA_PHONETIC_MAP.get(hira);
        const mode = state.prefs.kanaReadMode === 'WITH_WORD' ? 'with-word' : 'single';
        return pronunciation.speakKana(hira, info, mode);
      }

      // =======================================================================
      // 8. GOOGLE SHEETS AUTO-SYNC & CSV PARSER
      // =======================================================================
      function extractGoogleSheetId(input) {
        const str = String(input || '').trim();
        const match = str.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match) return match[1];
        if (/^[a-zA-Z0-9-_]{20,}$/.test(str)) return str;
        return '';
      }

      function parseCSV(text) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;
        const clean = text.replace(/^\uFEFF/, '');

        for (let i = 0; i < clean.length; i++) {
          const ch = clean[i];
          if (inQuotes) {
            if (ch === '"' && clean[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else field += ch;
          } else {
            if (ch === '"') inQuotes = true;
            else if (ch === ',') { row.push(field.trim()); field = ''; }
            else if (ch === '\r' || ch === '\n') {
              if (ch === '\r' && clean[i + 1] === '\n') i++;
              row.push(field.trim());
              if (row.some(cell => cell !== '')) rows.push(row);
              row = [];
              field = '';
            } else field += ch;
          }
        }
        row.push(field.trim());
        if (row.some(cell => cell !== '')) rows.push(row);
        return rows;
      }

      function mapSheetRowsToWords(rows, fallbackLevel = 'N5') {
        if (!rows || rows.length < 2) return [];
        const headers = rows[0].map(h => h.toLowerCase().normalize('NFC').trim());
        const findCol = (patterns) => headers.findIndex(h => patterns.some(p => h === p || h.includes(p)));
        const idx = {
          id: findCol(['id']),
          level: findCol(['level', 'cấp độ']),
          kanji: findCol(['kanji', 'chữ hán']),
          kana: findCol(['kana', 'hiragana', 'reading']),
          furigana: findCol(['furigana']),
          romaji: findCol(['romaji']),
          hanViet: findCol(['hán-việt', 'hán việt', 'hanviet', 'han_viet']),
          meaning: findCol(['nghĩa tiếng việt', 'nghĩa', 'meaning']),
          pos: findCol(['loại từ', 'từ loại', 'pos']),
          topic: findCol(['chủ đề', 'topic']),
          exJa: findCol(['ví dụ (jp)', 'ví dụ jp', 'example']),
          exRomaji: findCol(['ví dụ (romaji)', 'ví dụ romaji']),
          exVi: findCol(['dịch ví dụ', 'ví dụ vi'])
        };

        const words = [];
        for (let r = 1; r < rows.length; r++) {
          const cols = rows[r];
          const get = (i) => (i >= 0 && cols[i] !== undefined ? String(cols[i]).trim() : '');
          const kanji = get(idx.kanji);
          const kana = get(idx.kana) || get(idx.furigana).replace(/\[[^\]]*\]/g, '');
          const furigana = get(idx.furigana) || kana || kanji;
          const meaning = get(idx.meaning);
          const displayWord = kanji || kana;
          if (!displayWord || !meaning) continue;

          const rawLevel = (get(idx.level) || fallbackLevel).toUpperCase();
          const level = LEVELS.includes(rawLevel) ? rawLevel : fallbackLevel;
          const id = get(idx.id) || `${level}_${r}_${displayWord}`;
          const exJa = get(idx.exJa);

          words.push({
            id, level, kanji,
            kana: kana || displayWord,
            furigana,
            romaji: get(idx.romaji),
            hanViet: get(idx.hanViet),
            meaning,
            pos: get(idx.pos),
            topic: get(idx.topic) || 'Chung',
            example: exJa ? { ja: exJa, romaji: get(idx.exRomaji), vi: get(idx.exVi) } : null
          });
        }
        return words;
      }

      async function syncFromGoogleSheets({ silent = false } = {}) {
        const rawUrl = $('sheetUrlInput').value.trim() || safeGetLS(STORAGE_SHEET_KEY, DEFAULT_SHEET_URL);
        const sheetId = extractGoogleSheetId(rawUrl);
        if (!sheetId) {
          if (!silent) showToast('Hãy dán đúng link Google Sheets (chứa /spreadsheets/d/...)', 'error');
          return false;
        }
        const selectedLevels = Array.from(document.querySelectorAll('.sheet-lvl:checked')).map(el => el.value);
        const levelsToFetch = selectedLevels.length ? selectedLevels : (state.prefs.sheetLevels || ['N5', 'N4', 'N3']);

        safeSetLS(STORAGE_SHEET_KEY, rawUrl);
        state.prefs.sheetLevels = levelsToFetch;
        savePrefs();

        const btn = $('btnSyncGoogleSheet');
        if (!silent) btn.disabled = true;
        $('badgeSheetStatus').textContent = silent ? 'Đang kiểm tra nền...' : 'Đang tải...';

        try {
          const allWords = [];
          const loadedSheets = [];
          for (const sheetName of levelsToFetch) {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
            const resp = await fetchWithTimeout(csvUrl, {}, 25000);
            if (!resp.ok) continue;
            const csvText = await resp.text();
            if (csvText.trim().startsWith('<!DOCTYPE') || csvText.includes('<html')) {
              throw new Error('Trang tính đang ở chế độ riêng tư. Hãy bật chia sẻ "Bất kỳ ai có liên kết đều xem được".');
            }
            const parsed = mapSheetRowsToWords(parseCSV(csvText), sheetName);
            if (parsed.length) {
              allWords.push(...parsed);
              loadedSheets.push(`${sheetName}(${parsed.length})`);
            }
          }

          if (!allWords.length) {
            throw new Error('Không đọc được dòng từ vựng nào. Kiểm tra lại tên Sheet (N5, N4, N3) hoặc quyền chia sẻ.');
          }

          const prevCount = state.words.length;
          const prevFingerprint = `${state.words.length}:${state.words[0]?.id}:${state.words[state.words.length - 1]?.id}`;
          const nextFingerprint = `${allWords.length}:${allWords[0]?.id}:${allWords[allWords.length - 1]?.id}`;

          await applyDataset({
            meta: { title: `Google Sheets · ${loadedSheets.join(', ')}`, source: 'sheets', sheetId, syncedAt: Date.now() },
            words: allWords
          }, true, silent);

          $('badgeSheetStatus').textContent = `Tự đồng bộ (${allWords.length} từ)`;
          if (!silent) {
            showToast(`Đã đồng bộ ${allWords.length} từ từ Google Sheets!`, 'success');
          } else if (prevFingerprint !== nextFingerprint || prevCount === SAMPLE_DATASET.words.length) {
            showToast(`🔄 Đã tự cập nhật ${allWords.length} từ từ Google Sheets!`, 'success');
          }
          return true;
        } catch (err) {
          $('badgeSheetStatus').textContent = silent ? 'Dùng bản đã lưu' : 'Lỗi đồng bộ';
          if (!silent) showToast(err.message, 'error');
          return false;
        } finally {
          if (!silent) btn.disabled = false;
        }
      }

      // =======================================================================
      // 9. FURIGANA RUBY & TAP-TO-TRANSLATE ENGINE
      // =======================================================================
      function buildDictionaryIndex() {
        const idx = new Map();
        Object.entries(BUILTIN_MINI_DICT).forEach(([k, v]) => idx.set(k, { text: k, ...v }));
        state.words.forEach(w => {
          const entry = {
            text: w.kanji || w.kana,
            reading: w.kana,
            hanViet: w.hanViet || '',
            meaning: w.meaning,
            level: w.level,
            note: [w.pos, w.topic].filter(Boolean).join(' · ')
          };
          if (w.kanji) idx.set(w.kanji, entry);
          if (w.kana && !idx.has(w.kana)) idx.set(w.kana, entry);

          if (w.furigana && w.furigana.includes('[')) {
            const parts = [...w.furigana.matchAll(/(\p{Script=Han}+)\[([^\]]+)\]/gu)];
            const hvParts = w.hanViet ? w.hanViet.split(/\s+/) : [];
            parts.forEach((m, i) => {
              const kChar = m[1], kRead = m[2];
              if (kChar.length === 1 && !idx.has(kChar)) {
                idx.set(kChar, {
                  text: kChar, reading: kRead,
                  hanViet: hvParts[i] || w.hanViet || '',
                  meaning: `Trong từ "${w.kanji}" (${w.meaning})`,
                  level: w.level,
                  note: `Cách đọc trong ${w.kanji}: ${kRead}`
                });
              }
            });
          }
        });
        state.dictIndex = idx;
      }

      function lookupToken(token, parentWord = null) {
        if (state.dictIndex.has(token)) return state.dictIndex.get(token);
        if (parentWord && (parentWord.kanji || '').includes(token)) {
          return {
            text: token, reading: parentWord.kana, hanViet: parentWord.hanViet || '',
            meaning: parentWord.meaning, level: parentWord.level,
            note: `Thuộc từ: ${parentWord.kanji} (${parentWord.kana})`
          };
        }
        return { text: token, reading: token, hanViet: '', meaning: 'Chưa có trong từ điển hiện tại', note: 'Ấn nút 🔊 để nghe cách phát âm' };
      }
 
      const meaning = window.KawaiiMeaningModule
        ? window.KawaiiMeaningModule.create({
            getDictionaryIndex: () => state.dictIndex,
            lookup: lookupToken,
            onSpeak: (text) => {
              state.activePopupSpeakText = text;
              speakJapaneseText(text);
            },
            getElements: () => ({
              charBox: $('trCharBox'),
              reading: $('trReading'),
              hanViet: $('trHanViet'),
              level: $('trLevel'),
              meaning: $('trMeaning'),
              note: $('trNote'),
              sheet: $('translateSheet')
            })
          })
        : null;

      function showTranslateSheet(token, parentWord = null) {
        return meaning ? meaning.showPopup(token, parentWord) : lookupToken(token, parentWord);
      }

      function hideTranslateSheet() {
        meaning?.hidePopup();
      }

      function renderCardWordWithRuby(containerEl, word) {
        containerEl.innerHTML = '';
        containerEl.classList.toggle('hide-furi', !state.prefs.showFuri);
        const furiStr = word.furigana || '';

        if (furiStr.includes('[')) {
          const regex = /([^\[\]]+?)\[([^\]]+)\]|([^\[\]]+)/g;
          let match;
          while ((match = regex.exec(furiStr)) !== null) {
            if (match[1] && match[2]) {
              const base = match[1], rt = match[2];
              const kanjiStart = base.search(/\p{Script=Han}/u);
              if (kanjiStart > 0) {
                containerEl.appendChild(createTapSpan(base.slice(0, kanjiStart), word.kanji || word.kana, word, false));
                containerEl.appendChild(createRubyTapToken(base.slice(kanjiStart), rt, word));
              } else {
                containerEl.appendChild(createRubyTapToken(base, rt, word));
              }
            } else if (match[3]) {
              containerEl.appendChild(createTapSpan(match[3], word.kanji || word.kana, word, false));
            }
          }
          $('fcFurigana').textContent = '';
        } else {
          const display = word.kanji || word.kana;
          Array.from(display).forEach(ch => {
            const isKanji = /\p{Script=Han}/u.test(ch);
            containerEl.appendChild(createTapSpan(ch, isKanji ? ch : display, word, isKanji));
          });
          const showTopFuri = state.prefs.showFuri && word.kanji && word.kana && word.kanji !== word.kana;
          $('fcFurigana').textContent = showTopFuri ? word.kana : '';
          $('fcFurigana').style.opacity = showTopFuri ? '1' : '0';
        }
      }

            function createRubyTapToken(baseText, rtText, word) {
        return meaning
          ? meaning.createRubyToken(baseText, rtText, word)
          : document.createTextNode(baseText);
      }

            function createTapSpan(text, lookupKey, word, underline) {
        return meaning
          ? meaning.createTapToken(text, lookupKey, word, { underline })
          : document.createTextNode(text);
      }

            function tokenizeJapaneseSentence(sentence) {
        return meaning ? meaning.tokenize(sentence) : [];
      }

            function renderInteractiveExample(containerEl, sentence, parentWord) {
        if (meaning) meaning.renderSentence(containerEl, sentence, parentWord);
      }

      // =======================================================================
      // 10. DATASET MANAGEMENT, FILTERING & SESSION BUILDING
      // =======================================================================
      async function applyDataset(dataset, persist = true, preservePrefs = false) {
        if (persist) await saveDatasetToIDB(dataset);
        cancelCardMove();
        stopAudio();
        hideTranslateSheet();

        state.datasetTitle = (dataset.meta && dataset.meta.title) || `Bộ từ vựng (${dataset.words.length} từ)`;
        state.datasetMeta = dataset.meta || {};
        state.words = dataset.words || [];
        state.wordMap = new Map(state.words.map(w => [w.id, w]));
        buildDictionaryIndex();

        if (!state.words.some(w => w.level === state.prefs.level) && state.words.length > 0) {
          const first = LEVELS.find(lvl => state.words.some(w => w.level === lvl));
          if (first) state.prefs.level = first;
        }
        if (!preservePrefs) state.prefs.topic = 'ALL';

        rebuildTopicOptions();
        state.lessonLevel = state.prefs.level;
        savePrefs();
        rebuildFlashcardDeck();
        initMatchingRound();
        renderAll();
        events.emit('dataset:loaded', { count: state.words.length, title: state.datasetTitle });
      }

      function getBasePool() {
        return state.words.filter(w => {
          if (w.level !== state.prefs.level) return false;
          if (state.prefs.topic !== 'ALL' && w.topic !== state.prefs.topic) return false;
          return true;
        });
      }

      function rebuildTopicOptions() {
        const topics = [...new Set(state.words.filter(w => w.level === state.prefs.level).map(w => w.topic))].sort();
        const sel = $('topicSelect');
        sel.innerHTML = '<option value="ALL">Tất cả chủ đề</option>';
        topics.forEach(t => {
          const opt = document.createElement('option');
          opt.value = t;
          opt.textContent = t;
          sel.appendChild(opt);
        });
        sel.value = topics.includes(state.prefs.topic) ? state.prefs.topic : 'ALL';
        state.prefs.topic = sel.value;
      }

      const LESSON_PROGRESS_KEY = 'kawaii_lesson_good_ids_v1';
      let lessonGood = safeGetLS(LESSON_PROGRESS_KEY, {}) || {};
      function getLessons(level) {
        const groups = new Map();
        state.words.filter(w => w.level === level).forEach(w => {
          const topic = w.topic || 'Chung';
          if (!groups.has(topic)) groups.set(topic, []);
          groups.get(topic).push(w);
        });
        const lessons = [];
        for (const [topic, words] of groups) {
          // Chia đều trong khoảng 8–12 khi khả thi; nhóm quá nhỏ giữ nguyên.
          const count = Math.ceil(words.length / 12);
          const base = Math.floor(words.length / count);
          const extra = words.length % count;
          let cursor = 0;
          for (let i = 0; i < count; i++) {
            const size = base + (i < extra ? 1 : 0);
            const part = words.slice(cursor, cursor + size);
            cursor += size;
            lessons.push({ key: `${level}:${topic}:${i}`, level, topic, words: part });
          }
        }
        return lessons;
      }
      function lessonCompletedCount(lesson) {
        return lesson.words.filter(w => lessonGood[w.id]).length;
      }
      function renderLessonBrowser() {
        const home = $('lessonHome');
        home.classList.toggle('hidden', state.mode !== 'flashcard');
        if (state.mode !== 'flashcard') return;
        $('lessonBrowser').classList.toggle('hidden', !state.lessonBrowserOpen);
        $('lessonActions').classList.toggle('hidden', !state.lesson);
        $('flashcardView').classList.toggle('hidden', !state.lesson);
        const levels = $('lessonLevels');
        levels.replaceChildren();
        LEVELS.filter(level => state.words.some(w => w.level === level)).forEach(level => {
          const b = document.createElement('button');
          b.type = 'button'; b.textContent = level;
          b.className = 'rounded-xl px-4 py-2 text-xs font-extrabold ' + (state.lessonLevel === level ? 'bg-[#FB6F92] text-white' : 'bg-[#F6EFE8]');
          b.onclick = () => { state.lessonLevel = level; state.lesson = null; renderLessonBrowser(); };
          levels.appendChild(b);
        });
        const list = $('lessonList'); list.replaceChildren();
        getLessons(state.lessonLevel).forEach((lesson, i) => {
          const completed = lessonCompletedCount(lesson);
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'text-left rounded-2xl border border-[#F1ECE6] p-3 bg-[#FFFDF9] hover:border-[#FB6F92]';
          const title = document.createElement('strong'); title.className = 'block text-sm'; title.textContent = `Bài ${i + 1} · ${lesson.topic}`;
          const desc = document.createElement('span'); desc.className = 'text-xs text-[#786D69]'; desc.textContent = `${completed}/${lesson.words.length} từ đã học`;
          b.append(title, desc);
          b.onclick = () => { state.lesson = lesson; renderLessonBrowser(); };
          list.appendChild(b);
        });
        if (state.lesson) {
          const done = lessonCompletedCount(state.lesson);
          $('lessonSelectedInfo').textContent = `${state.lesson.level} · ${state.lesson.topic} · ${done}/${state.lesson.words.length} từ đã học`;
          $('btnLessonContinue').textContent = `Học tiếp (${state.lesson.words.length - done} từ)`;
          $('btnLessonContinue').disabled = done === state.lesson.words.length;
          $('btnLessonContinue').classList.toggle('opacity-50', done === state.lesson.words.length);
        }
      }
      function startLesson(restart) {
        const lesson = state.lesson;
        if (!lesson) return;
        const words = restart ? lesson.words : lesson.words.filter(w => !lessonGood[w.id]);
        if (!words.length) { showToast('Bài này đã hoàn thành. Hãy chọn Học lại toàn bộ.', 'info'); return; }
        studySession?.clear();
        state.prefs.level = lesson.level;
        state.prefs.topic = lesson.topic;
        state.prefs.fcFilter = 'SMART';
        savePrefs();
        rebuildTopicOptions();
        state.fcDeck = flashcards.start(words, { limit: words.length });
        state.fcIndex = 0; state.fcFlipped = false;
        state.sessionStats = { reviewed: 0, good: 0, again: 0 };
        renderAll();
      }
      $('btnBeginLessons').onclick = () => { state.lessonBrowserOpen = true; renderLessonBrowser(); };
      $('btnLessonBack').onclick = () => { state.lesson = null; studySession?.clear(); renderAll(); };
      $('btnLessonContinue').onclick = () => startLesson(false);
      $('btnLessonRestart').onclick = () => startLesson(true);

      function rebuildFlashcardDeck(shuffle = false) {
        if (state.lesson) return;
        cancelCardMove();
        const now = Date.now();
        const pool = getBasePool();

        // SMART là phiên học chính: số từ theo tùy chọn người học, trộn từ mới và từ đến hạn.
        // Phiên đang học được khôi phục, không tự tạo phiên mới khi tải lại trang.
        if (state.prefs.fcFilter === 'SMART' && window.KawaiiFlashcards) {
          const savedSession = studySession.getSnapshot();
          if (savedSession && savedSession.status === 'active') {
            state.fcDeck = flashcards.restore();
          } else if (savedSession && savedSession.status === 'completed') {
            state.fcDeck = [];
          } else {
            const dueList = pool.filter(w => isWordDue(w.id, now));
            const newList = pool.filter(w => isWordNew(w.id));
            state.fcDeck = flashcards.start(shuffle ? shuffled([...dueList, ...newList]) : [...dueList, ...newList], { limit: getSessionWordLimit(pool.length) });
          }
          state.fcIndex = 0;
          state.fcFlipped = false;
          const snapshot = studySession.getSnapshot();
          state.sessionStats = snapshot
            ? { reviewed: snapshot.stats.reviewed, good: snapshot.stats.good + snapshot.stats.hard, again: snapshot.stats.again }
            : { reviewed: 0, good: 0, again: 0 };
          return;
        }

        // Các bộ lọc DUE / NEW / ALL vẫn giữ cơ chế duyệt từ tương thích bản cũ.
        const dueList = pool.filter(w => isWordDue(w.id, now)).sort((a, b) => (getWordStat(a.id)?.nextReviewAt || 0) - (getWordStat(b.id)?.nextReviewAt || 0));
        const newList = pool.filter(w => isWordNew(w.id));
        let deck = [];
        if (state.prefs.fcFilter === 'DUE') deck = dueList;
        else if (state.prefs.fcFilter === 'NEW') deck = newList;
        else deck = pool;
        const limit = Number(state.prefs.sessionSize) || 0;
        if (limit > 0 && state.prefs.fcFilter !== 'ALL') deck = deck.slice(0, limit);
        if (shuffle) deck = shuffled(deck);
        state.fcDeck = deck;
        state.fcIndex = 0;
        state.fcFlipped = false;
        state.sessionStats = { reviewed: 0, good: 0, again: 0 };
      }

      // =======================================================================
      // 11. RENDER VIEWS
      // =======================================================================
      function renderHeader() {
        $('headerDatasetLabel').textContent = state.words.length
          ? `${state.datasetTitle} (${state.words.length} từ)`
          : 'Chưa có dữ liệu từ vựng';

        document.querySelectorAll('.mode-tab').forEach(btn => {
          const active = btn.dataset.mode === state.mode;
          btn.className = active
            ? 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1 bg-white text-[#FB6F92] shadow-sm'
            : 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 text-[#786D69] hover:text-[#332E2E]';
        });

        const showStatus = (state.mode === 'flashcard' || state.mode === 'matching') && state.words.length > 0;
        $('studyStatusBar').classList.toggle('hidden', !showStatus);

        const now = Date.now();
        const pillsEl = $('levelPills');
        pillsEl.innerHTML = '';
        LEVELS.forEach(lvl => {
          const lvlWords = state.words.filter(w => w.level === lvl);
          const learnedCount = lvlWords.filter(w => isWordLearned(w.id)).length;
          const pct = lvlWords.length ? Math.round((learnedCount / lvlWords.length) * 100) : 0;
          const active = state.prefs.level === lvl;
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = active
            ? 'px-3 py-1 rounded-xl text-xs font-extrabold bg-[#FF8FA3] text-white shadow-sm flex items-center gap-1.5 shrink-0 transition'
            : 'px-3 py-1 rounded-xl text-xs font-bold bg-white border border-[#E8DFD6] text-[#5E524E] hover:border-[#FF8FA3] flex items-center gap-1.5 shrink-0 transition';
          btn.innerHTML = `<span>${lvl}</span><span class="text-[10px] opacity-85">${lvlWords.length ? pct + '%' : '—'}</span>`;
          btn.onclick = () => {
            state.prefs.level = lvl;
            state.prefs.topic = 'ALL';
            hideTranslateSheet();
            savePrefs();
            rebuildTopicOptions();
            rebuildFlashcardDeck();
            initMatchingRound();
            renderAll();
          };
          pillsEl.appendChild(btn);
        });

        const curWords = state.words.filter(w => w.level === state.prefs.level);
        const curLearned = curWords.filter(w => isWordLearned(w.id)).length;
        const curDue = curWords.filter(w => isWordDue(w.id, now)).length;
        const curPct = curWords.length ? Math.round((curLearned / curWords.length) * 100) : 0;
        $('levelProgressFill').style.width = `${curPct}%`;
        $('levelProgressText').textContent = curDue > 0
          ? `${state.prefs.level}: ${curLearned}/${curWords.length} · 🔔 ${curDue} cần ôn`
          : `${state.prefs.level}: ${curLearned}/${curWords.length} đã học`;

        const furiOn = state.prefs.showFuri;
        $('furiToggleBtn').className = furiOn
          ? 'px-2.5 py-1.5 rounded-xl text-xs font-extrabold border border-[#FF8FA3] bg-peach-50 text-[#FB6F92] transition-all flex items-center gap-1.5 shrink-0'
          : 'px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[#E8DFD6] bg-white text-[#8C7F7A] transition-all flex items-center gap-1.5 shrink-0';
        $('furiDot').className = furiOn ? 'w-2 h-2 rounded-full bg-[#FB6F92]' : 'w-2 h-2 rounded-full bg-[#D1C7BF]';
      }

      function getRelatedWords(word) {
        if (!word || !word.kanji) return [];
        const kanjis = [...new Set(word.kanji.match(/\p{Script=Han}/gu) || [])];
        if (!kanjis.length) return [];
        const related = [];
        for (const w of state.words) {
          if (w.id === word.id || !w.kanji) continue;
          if (kanjis.some(k => w.kanji.includes(k))) {
            related.push(w);
            if (related.length >= 4) break;
          }
        }
        return related;
      }

      function renderFlashcard() {
        const now = Date.now();
        const pool = getBasePool();
        const dueTotal = pool.filter(w => isWordDue(w.id, now)).length;
        const newTotal = pool.filter(w => isWordNew(w.id)).length;
        $('dueCountBadge').textContent = dueTotal;
        $('newCountBadge').textContent = newTotal;
        $('sessionSizeSelect').value = String(state.prefs.sessionSize);

        document.querySelectorAll('.fc-filter-btn').forEach(btn => {
          const active = btn.dataset.filter === state.prefs.fcFilter;
          btn.className = active
            ? 'fc-filter-btn px-2.5 py-1 rounded-xl transition whitespace-nowrap bg-white text-[#FB6F92] shadow-sm font-extrabold'
            : 'fc-filter-btn px-2.5 py-1 rounded-xl transition whitespace-nowrap text-[#786D69]';
        });

        const total = state.fcDeck.length;
        const managedSession = state.prefs.fcFilter === 'SMART' &&
          studySession && studySession.getSnapshot()?.status === 'active';
        ['fcPrevBtn', 'fcNextBtn', 'fcShuffleBtn'].forEach(id => { $(id).disabled = !total; });
        if (managedSession) {
          const snapshot = studySession.getSnapshot();
          $('fcCounter').textContent = `${state.fcIndex + 1} / ${snapshot.initialWordIds.length}`;
        } else {
          $('fcCounter').textContent = total ? `${state.fcIndex + 1} / ${total}` : '0 / 0';
        }
        $('fcPrevBtn').disabled = !total || state.fcIndex <= 0;
        $('fcNextBtn').disabled = !total || state.fcIndex >= total - 1;

        if (!total) {
          $('fcPerspective').classList.add('hidden');
          $('fcEmptyFilter').classList.remove('hidden');
          const didStudy = state.sessionStats.reviewed > 0;
          $('fcSessionSummary').classList.toggle('hidden', !didStudy);
          $('btnStartQuizAfterSession').classList.toggle('hidden', getQuizEligibleWords().length < 4);
          if (didStudy) {
            $('fcEmptyIcon').textContent = '🎉';
            $('fcEmptyTitle').textContent = 'Hoàn thành phiên học xuất sắc!';
            $('fcEmptyDesc').textContent = dueTotal + newTotal > 0
              ? `Còn ${dueTotal} từ cần ôn và ${newTotal} từ mới trong mục này. Bạn muốn học tiếp phiên mới không?`
              : 'Tuyệt vời! Bạn đã xử lý hết toàn bộ từ cần ôn và từ mới ở mục này hôm nay.';
            $('sumReviewed').textContent = state.sessionStats.reviewed;
            $('sumGood').textContent = state.sessionStats.good;
            $('sumAgain').textContent = state.sessionStats.again;
          } else {
            $('fcEmptyIcon').textContent = '✨';
            $('fcEmptyTitle').textContent = state.prefs.fcFilter === 'DUE' ? 'Chưa có từ nào đến hạn ôn!' : 'Không có từ nào trong mục này!';
            $('fcEmptyDesc').textContent = 'Bạn có thể chuyển sang "🎯 Phiên học" để học từ mới hoặc bấm "Xem tất cả từ".';
          }
          $('btnStartNextSession').classList.toggle('hidden', dueTotal + newTotal === 0);
          return;
        }

        $('fcPerspective').classList.remove('hidden');
        $('fcEmptyFilter').classList.add('hidden');

        const word = state.fcDeck[state.fcIndex];
        const srsInfo = getWordSrsInfo(word.id, now);
        $('fcInner').classList.toggle('is-flipped', state.fcFlipped);
        $('fcLevelBadge').textContent = word.level;
        $('fcSrsBadge').textContent = srsInfo.label;
        $('fcSrsBadge').className = `px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 ${srsInfo.badgeClass}`;
        $('fcTopicBadge').textContent = word.topic || 'Chung';

        renderCardWordWithRuby($('fcKanji'), word);
        $('fcRomaji').textContent = state.prefs.showFuri && word.romaji ? `/${word.romaji}/` : '';
        $('fcHanViet').textContent = word.hanViet ? `Hán Việt: ${word.hanViet}` : '';

        const mainText = word.kanji || word.kana;
        $('fcBackWordMini').textContent = state.prefs.showFuri && word.kanji && word.kana !== word.kanji
          ? `${word.kanji}（${word.kana}）` : mainText;
        $('fcPosBadge').textContent = word.pos || '';
        $('fcPosBadge').classList.toggle('hidden', !word.pos);
        $('fcMeaning').textContent = word.meaning;

        if (word.example && word.example.ja) {
          $('fcExampleBox').classList.remove('hidden');
          renderInteractiveExample($('fcExJa'), word.example.ja, word);
          $('fcExRomaji').textContent = state.prefs.showFuri && word.example.romaji ? word.example.romaji : '';
          $('fcExVi').textContent = word.example.vi || '';
        } else {
          $('fcExampleBox').classList.add('hidden');
        }

        const related = getRelatedWords(word);
        if (related.length) {
          $('fcRelatedBox').classList.remove('hidden');
          const listEl = $('fcRelatedList');
          listEl.innerHTML = '';
          related.forEach(rw => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'px-2.5 py-1 rounded-xl bg-white border border-[#E8DFD6] hover:border-[#FF8FA3] text-xs font-bold text-[#4A4240] flex items-center gap-1 transition';
            chip.innerHTML = `<span class="text-[10px] font-extrabold text-[#FB6F92]">${rw.level}</span><span class="font-jp">${escapeHtml(rw.kanji || rw.kana)}</span>`;
            chip.onclick = (e) => {
              e.stopPropagation();
              hideTranslateSheet();
              state.prefs.level = rw.level;
              state.prefs.topic = 'ALL';
              state.prefs.fcFilter = 'ALL';
              savePrefs();
              rebuildTopicOptions();
              rebuildFlashcardDeck();
              const idx = state.fcDeck.findIndex(item => item.id === rw.id);
              if (idx >= 0) state.fcIndex = idx;
              state.fcFlipped = false;
              renderAll();
            };
            listEl.appendChild(chip);
          });
        } else {
          $('fcRelatedBox').classList.add('hidden');
        }
      }

      function flipFlashcard() {
        if (!state.fcDeck.length || cardMoveTimer !== null) return;
        hideTranslateSheet();
        state.fcFlipped = !state.fcFlipped;
        $('fcInner').classList.toggle('is-flipped', state.fcFlipped);
        if (state.fcFlipped) speakWord(state.fcDeck[state.fcIndex]);
      }

      function cancelCardMove() {
        clearTimeout(cardMoveTimer);
        cardMoveTimer = null;
        const card = $('fcPerspective');
        if (card) { card.style.transition = ''; card.style.transform = ''; card.style.opacity = ''; }
      }

      function moveCard(direction) {
        if (!state.fcDeck.length || cardMoveTimer !== null) return;
        const nextIndex = Math.max(0, Math.min(state.fcDeck.length - 1, state.fcIndex + direction));
        if (nextIndex === state.fcIndex) return;
        stopAudio();
        hideTranslateSheet();
        state.fcIndex = nextIndex;
        state.fcFlipped = false;
        renderFlashcard();
      }

      function getSessionWordLimit(availableCount) {
        const selected = Number(state.prefs.sessionSize);
        if (!Number.isFinite(selected) || selected <= 0) return Math.max(1, availableCount);
        return Math.min(Math.floor(selected), Math.max(1, availableCount));
      }

      function startNewStudySession() {
        if (!studySession || !flashcards) {
          rebuildFlashcardDeck();
          renderFlashcard();
          return;
        }
        studySession.clear();
        state.prefs.fcFilter = 'SMART';
        savePrefs();
        const now = Date.now();
        const pool = getBasePool();
        const dueList = pool.filter(w => isWordDue(w.id, now));
        const newList = pool.filter(w => isWordNew(w.id));
        state.fcDeck = flashcards.start([...dueList, ...newList], { limit: getSessionWordLimit(pool.length) });
        state.fcIndex = 0;
        state.fcFlipped = false;
        const snapshot = studySession.getSnapshot();
        state.sessionStats = snapshot
          ? { reviewed: 0, good: 0, again: 0 }
          : { reviewed: 0, good: 0, again: 0 };
        renderHeader();
        renderFlashcard();
        if (!state.fcDeck.length) {
          showToast('Hiện không có từ mới hoặc từ đến hạn để bắt đầu phiên.', 'info');
        }
      }

      function handleFlashcardRating(rating) {
        if (!state.fcDeck.length) return;
        cancelCardMove();
        stopAudio();
        hideTranslateSheet();

        const word = state.fcDeck[state.fcIndex];
        let next;
        const isManagedSession = state.prefs.fcFilter === 'SMART' &&
          studySession && flashcards &&
          studySession.getSnapshot()?.status === 'active';

        try {
          if (isManagedSession) {
            const result = flashcards.rate(word.id, rating);
            next = result.stat;
            state.fcDeck = result.deck;
            state.fcIndex = 0;
            state.sessionStats = {
              reviewed: result.session.stats.reviewed,
              good: result.session.stats.firstAttemptCorrect || 0,
              again: result.session.stats.again
            };
            if (result.completed) {
              events.emit('session:completed', {
                session: result.session,
                stats: { ...result.session.stats }
              });
              persistCompletedStudySession(result.session);
            }
          } else {
            next = rateWordSrs(word.id, rating);
            state.sessionStats.reviewed += 1;
            if (rating === 'again') state.sessionStats.again += 1;
            else state.sessionStats.good += 1;

            if (state.prefs.fcFilter !== 'ALL') {
              state.fcDeck.splice(state.fcIndex, 1);
              if (rating === 'again') state.fcDeck.push(word);
              if (state.fcIndex >= state.fcDeck.length) state.fcIndex = 0;
            } else {
              state.fcIndex = (state.fcIndex + 1) % state.fcDeck.length;
            }
          }
        } catch (error) {
          console.error('[Kawaii Flashcard]', error);
          showToast('Không thể lưu kết quả học: ' + (error?.message || 'Lỗi dữ liệu'), 'error');
          return;
        }

        if (state.lesson && rating === 'good') {
          lessonGood[word.id] = true;
          safeSetLS(LESSON_PROGRESS_KEY, lessonGood);
          renderLessonBrowser();
        }

        const activeSnapshot = studySession?.getSnapshot();
        const reviewSessionId = (isManagedSession && activeSnapshot?.id)
          ? activeSnapshot.id
          : (state.fcReviewSessionId || (state.fcReviewSessionId = `fc_browse_${Date.now()}`));
        if (weakWords) {
          if (rating === 'again') weakWords.recordError(word.id, 'flashcard', reviewSessionId);
          else weakWords.recordCorrect(word.id, 'flashcard', reviewSessionId);
          cloudSync?.scheduleSync(getCloudBackupSnapshot());
        }

        if (rating === 'again') {
          showToast(`Sẽ gặp lại "${word.kanji || word.kana}" ở cuối hàng đợi phiên!`, 'info');
        } else {
          showToast(`Đã lưu lịch ôn "${word.kanji || word.kana}" sau ${next.intervalDays} ngày.`, 'success');
        }
        events.emit('word:rated', { word, rating, stat: next, sessionId: reviewSessionId });
        state.fcFlipped = false;
        renderHeader();
        renderFlashcard();
      }


      // --- Pair Matching ---
      function initMatchingRound() {
        clearTimeout(matchErrorTimer);
        matchErrorTimer = null;
        state.matchMatchedIds = new Set();
        state.matchSelected = null;
        state.matchErrors = null;
        state.matchLocked = false;
        const pool = getBasePool();
        if (!pool.length) {
          state.matchRoundPairs = []; state.matchLeftItems = []; state.matchRightItems = [];
          return;
        }
        const now = Date.now();
        const priority = pool.filter(w => isWordDue(w.id, now) || isWordNew(w.id));
        const rest = pool.filter(w => !isWordDue(w.id, now) && !isWordNew(w.id));
        const chosen = [...shuffled(priority), ...shuffled(rest)].slice(0, Math.min(5, pool.length));
        state.matchRoundPairs = chosen;
        state.matchLeftItems = shuffled(chosen);
        state.matchRightItems = shuffled(chosen);
      }

      function renderMatching() {
        const totalPairs = state.matchRoundPairs.length;
        const matchedCount = state.matchMatchedIds.size;
        $('matchPairCounter').textContent = `${matchedCount}/${totalPairs} cặp`;
        $('matchProgressFill').style.width = totalPairs ? `${(matchedCount / totalPairs) * 100}%` : '0%';
        $('matchStreakBadge').textContent = `⚡ ${state.progress.streak}`;
        $('matchDirectionLabel').textContent = state.prefs.matchSwap ? 'Việt ⇄ Nhật' : 'Nhật ⇄ Việt';
        $('matchEmpty').classList.toggle('hidden', totalPairs > 0);
        $('matchRoundComplete').classList.toggle('hidden', !(totalPairs > 0 && matchedCount === totalPairs));
        $('matchCompleteStreak').textContent = state.progress.streak;

        const leftCol = $('matchLeftCol');
        const rightCol = $('matchRightCol');
        leftCol.innerHTML = '';
        rightCol.innerHTML = '';
        if (!totalPairs) return;

        const buildCard = (word, side) => {
          const isJapanese = (side === 'left' && !state.prefs.matchSwap) || (side === 'right' && state.prefs.matchSwap);
          const isMatched = state.matchMatchedIds.has(word.id);
          const isSelected = state.matchSelected && state.matchSelected.side === side && state.matchSelected.id === word.id;
          const isErr = state.matchErrors?.some(item => item.id === word.id && item.side === side);
          const btn = document.createElement('button');
          btn.type = 'button';

          let cls = 'w-full min-h-[70px] sm:min-h-[78px] p-3 sm:p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center shadow-sm ';
          if (isErr) cls += 'bg-[#FFF1F2] border-[#FB7185] animate-shake';
          else if (isMatched) { cls += 'bg-matcha-50 border-matcha-400 text-matcha-600 opacity-45 cursor-default'; btn.disabled = true; }
          else if (isSelected) cls += 'bg-skysoft-50 border-skysoft-500 text-[#1D4ED8] scale-[1.02]';
          else cls += 'bg-white border-[#F1ECE6] hover:border-[#FF8FA3] text-[#332E2E] active:scale-[0.98]';
          btn.className = cls;

          if (isJapanese) {
            const display = word.kanji || word.kana;
            const showFuri = state.prefs.showFuri && word.kanji && word.kana && word.kanji !== word.kana;
            btn.innerHTML = `<span class="font-jp text-lg sm:text-xl font-extrabold leading-tight">${escapeHtml(display)}</span>${showFuri ? `<span class="font-jp text-[11px] font-bold text-[#FB6F92] mt-0.5">${escapeHtml(word.kana)}</span>` : ''}`;
          } else {
            const shortMeaning = word.meaning.split('(')[0].trim() || word.meaning;
            btn.innerHTML = `<span class="text-xs sm:text-sm font-extrabold leading-snug line-clamp-2">${escapeHtml(shortMeaning)}</span>`;
          }
          btn.onclick = () => handleMatchClick(word, side, isJapanese);
          return btn;
        };

        state.matchLeftItems.forEach(w => leftCol.appendChild(buildCard(w, 'left')));
        state.matchRightItems.forEach(w => rightCol.appendChild(buildCard(w, 'right')));
      }

      function handleMatchClick(word, side, isJapanese) {
        if (state.matchLocked || state.matchMatchedIds.has(word.id)) return;
        if (isJapanese) speakWord(word);

        if (state.matchSelected && state.matchSelected.side === side && state.matchSelected.id === word.id) {
          state.matchSelected = null; renderMatching(); return;
        }
        if (!state.matchSelected || state.matchSelected.side === side) {
          state.matchSelected = { side, id: word.id }; renderMatching(); return;
        }

        const first = state.matchSelected;
        if (first.id === word.id) {
          state.matchMatchedIds.add(word.id);
          state.progress.streak += 1;
          state.progress.totalPairsMatched += 1;
          if (state.progress.streak > state.progress.bestStreak) state.progress.bestStreak = state.progress.streak;
          state.matchSelected = null;
          saveProgress();
          renderMatching();
        } else {
          state.matchLocked = true;
          state.progress.streak = 0;
          state.matchErrors = [first, { side, id: word.id }];
          saveProgress();
          renderMatching();
          matchErrorTimer = setTimeout(() => {
            matchErrorTimer = null;
            state.matchSelected = null; state.matchErrors = null; state.matchLocked = false;
            renderMatching();
          }, 420);
        }
      }

      // --- Kana (Flashcard 3D + Grid) ---
      function rebuildKanaDeck(shuffle = false) {
        const items = (KANA_DATA[state.prefs.kanaGroup] || KANA_DATA.seion).filter(Boolean);
        state.kanaDeck = shuffle ? shuffled(items) : items;
        state.kanaIndex = 0;
        state.kanaFlipped = false;
      }

      function renderKana() {
        const isCardView = state.prefs.kanaView === 'card';
        $('kanaViewCardBtn').className = isCardView ? 'px-3 py-1.5 rounded-xl bg-white text-[#FB6F92] shadow-sm transition' : 'px-3 py-1.5 rounded-xl text-[#786D69] transition';
        $('kanaViewGridBtn').className = !isCardView ? 'px-3 py-1.5 rounded-xl bg-white text-[#FB6F92] shadow-sm transition' : 'px-3 py-1.5 rounded-xl text-[#786D69] transition';
        $('kanaFlashcardWrap').classList.toggle('hidden', !isCardView);
        $('kanaGridContainer').classList.toggle('hidden', isCardView);

        const isHira = state.prefs.kanaScript === 'hira';
        $('kanaScriptHira').className = isHira ? 'px-3 py-1 rounded-xl bg-white text-[#FB6F92] shadow-sm transition' : 'px-3 py-1 rounded-xl text-[#786D69] transition';
        $('kanaScriptKata').className = !isHira ? 'px-3 py-1 rounded-xl bg-white text-[#FB6F92] shadow-sm transition' : 'px-3 py-1 rounded-xl text-[#786D69] transition';

        const isWithWord = state.prefs.kanaReadMode === 'WITH_WORD';
        $('kanaModeQuickLabel').textContent = isWithWord ? 'Âm + Từ mẫu' : 'Âm chuẩn rõ';
        $('kanaModeQuickBtn').className = isWithWord
          ? 'px-3 py-1.5 rounded-2xl bg-peach-50 border border-[#FF8FA3] text-[#FB6F92] text-xs font-extrabold transition flex items-center gap-1.5'
          : 'px-3 py-1.5 rounded-2xl bg-matcha-50 border border-[#A7F3D0] text-matcha-600 text-xs font-extrabold transition flex items-center gap-1.5';

        document.querySelectorAll('.kana-group-btn').forEach(btn => {
          const active = btn.dataset.kgroup === state.prefs.kanaGroup;
          btn.className = active ? 'kana-group-btn px-2.5 py-1 rounded-xl bg-white text-[#332E2E] shadow-sm transition' : 'kana-group-btn px-2.5 py-1 rounded-xl text-[#786D69] transition';
        });

        if (isCardView) {
          if (!state.kanaDeck.length) rebuildKanaDeck();
          const item = state.kanaDeck[state.kanaIndex];
          const [hira, kata, romaji, , sampleJa] = item;
          const groupLabel = { seion: 'Cơ bản', dakuon: 'Âm đục', yoon: 'Âm ghép' }[state.prefs.kanaGroup] || 'Cơ bản';

          $('kanaFcCounter').textContent = `${state.kanaIndex + 1} / ${state.kanaDeck.length}`;
          $('kanaInner').classList.toggle('is-flipped', state.kanaFlipped);
          $('kanaFrontTag').textContent = `${isHira ? 'Hiragana' : 'Katakana'} · ${groupLabel}`;
          $('kanaFrontChar').textContent = isHira ? hira : kata;
          $('kanaFrontChar').className = (isHira ? hira : kata).length > 1
            ? 'font-jp text-7xl sm:text-8xl font-extrabold text-[#2B2626] leading-none'
            : 'font-jp text-8xl sm:text-9xl font-extrabold text-[#2B2626] leading-none';

          $('kanaBackPairLabel').textContent = isHira ? 'Đối chiếu Katakana' : 'Đối chiếu Hiragana';
          $('kanaBackRomaji').textContent = romaji;
          $('kanaBackCounterpart').textContent = isHira ? kata : hira;
          $('kanaBackSample').textContent = sampleJa;
        } else {
          const grid = $('kanaGrid');
          const group = state.prefs.kanaGroup;
          const items = KANA_DATA[group] || KANA_DATA.seion;
          grid.className = group === 'yoon' ? 'grid grid-cols-3 gap-2 sm:gap-3' : 'grid grid-cols-5 gap-2 sm:gap-3';
          grid.innerHTML = '';

          items.forEach(cell => {
            if (!cell) {
              const empty = document.createElement('div');
              empty.className = 'rounded-2xl bg-[#FAF6F2]/60 border border-dashed border-[#EDE5DC] min-h-[72px] sm:min-h-[82px]';
              grid.appendChild(empty);
              return;
            }
            const [hira, kata, romaji, , sampleJa] = cell;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'group rounded-2xl bg-[#FFFDF9] hover:bg-peach-50 border border-[#F1ECE6] hover:border-[#FF8FA3] p-2 sm:p-3 min-h-[72px] sm:min-h-[82px] flex flex-col items-center justify-center transition-all active:scale-95';
            btn.innerHTML = `
              <div class="flex items-baseline gap-1">
                <span class="font-jp text-xl sm:text-2xl font-extrabold text-[#2B2626] group-hover:text-[#FB6F92] transition">${isHira ? hira : kata}</span>
                <span class="font-jp text-[11px] font-bold text-[#B0A39E]">${isHira ? kata : hira}</span>
              </div>
              <span class="text-[11px] font-extrabold text-[#FB6F92] leading-tight">${romaji}</span>
              <span class="font-jp text-[10px] font-semibold text-[#8C7F7A] mt-0.5 truncate max-w-full">${sampleJa}</span>
            `;
            btn.onclick = () => {
              btn.classList.add('ring-2', 'ring-[#FB6F92]', 'bg-peach-50');
              setTimeout(() => btn.classList.remove('ring-2', 'ring-[#FB6F92]', 'bg-peach-50'), 420);
              speakKanaItem(hira);
            };
            grid.appendChild(btn);
          });
        }
      }

      function flipKanaCard() {
        if (!state.kanaDeck.length || kanaMoveTimer !== null) return;
        state.kanaFlipped = !state.kanaFlipped;
        $('kanaInner').classList.toggle('is-flipped', state.kanaFlipped);
        if (state.kanaFlipped) speakKanaItem(state.kanaDeck[state.kanaIndex][0]);
      }

      function moveKanaCard(dir) {
        if (!state.kanaDeck.length || kanaMoveTimer !== null) return;
        stopAudio();
        const card = $('kanaPerspective');
        card.style.transition = 'transform 0.14s ease-out, opacity 0.14s ease-out';
        card.style.transform = `translateX(${-40 * dir}px)`;
        card.style.opacity = '0.35';
        kanaMoveTimer = setTimeout(() => {
          kanaMoveTimer = null;
          state.kanaIndex = (state.kanaIndex + dir + state.kanaDeck.length) % state.kanaDeck.length;
          state.kanaFlipped = false;
          renderKana();
          card.style.transform = '';
          card.style.opacity = '';
        }, 140);
      }

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

      function renderAll() {
        renderHeader();
        $('flashcardView').classList.toggle('hidden', state.mode !== 'flashcard' || !state.lesson);
        renderLessonBrowser();
        $('matchingView').classList.toggle('hidden', state.mode !== 'matching');
        $('kanaView').classList.toggle('hidden', state.mode !== 'kana');
        $('dataView').classList.toggle('hidden', state.mode !== 'data');

        registeredModules.forEach((mod, id) => {
          mod.sectionEl.classList.toggle('hidden', state.mode !== id);
          if (state.mode === id && typeof mod.render === 'function') {
            mod.render(mod.sectionEl, window.KawaiiApp);
          }
        });

        if (state.mode === 'flashcard') renderFlashcard();
        if (state.mode === 'matching') renderMatching();
        if (state.mode === 'kana') renderKana();
        if (state.mode === 'data') renderDataStats();
      }

      // =======================================================================
      // 12. PLUGIN EXTENSION API (window.KawaiiApp)
      // =======================================================================
      function registerModule({ id, label, icon = '✨', mount, render }) {
        if (!id || registeredModules.has(id)) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.mode = id;
        btn.setAttribute('aria-label', label);
        btn.className = 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1';
        btn.innerHTML = `<span>${escapeHtml(icon)}</span><span class="hidden md:inline">${escapeHtml(label)}</span>`;
        btn.onclick = () => {
          cancelCardMove(); stopAudio(); hideTranslateSheet();
          state.mode = id; renderAll();
          events.emit('mode:changed', { mode: id });
        };
        $('modeNav').appendChild(btn);

        const sectionEl = document.createElement('section');
        sectionEl.id = `pluginView_${id}`;
        sectionEl.className = 'hidden flex-1 flex flex-col gap-4 animate-pop';
        $('appWorkspace').appendChild(sectionEl);

        registeredModules.set(id, { id, label, icon, sectionEl, render });
        if (typeof mount === 'function') mount(sectionEl, window.KawaiiApp);
        renderHeader();
      }


      // =======================================================================
      // 12A. FEATURE MODULES (PHASE 3)
      // =======================================================================
      const studySession = window.KawaiiStudySessionModule
        ? window.KawaiiStudySessionModule.create({
            storage: window.KawaiiDatabase?.createMirroredStorage('study-session')
          })
        : null;
      if (studySession) studySession.load();

      const flashcards = window.KawaiiFlashcardModule && studySession
        ? window.KawaiiFlashcardModule.create({
            session: studySession,
            getWord: (wordId) => state.wordMap.get(wordId) || null,
            srs: { rateWord: rateWordSrs }
          })
        : null;

      const weakWords = window.KawaiiWeakWordsModule
        ? window.KawaiiWeakWordsModule.create({
            storage: window.KawaiiDatabase?.createMirroredStorage('weak-words')
          })
        : null;

      const quiz = window.KawaiiQuizModule && weakWords
        ? window.KawaiiQuizModule.create({
            storage: window.KawaiiDatabase?.createMirroredStorage('quiz'),
            getErrorCount: (wordId) => weakWords.getErrorCount(wordId),
            onWrong: ({ wordId, quizId, attemptNo }) => {
              weakWords.recordError(wordId, 'quiz', quizId, { attemptNo });
              cloudSync?.scheduleSync(getCloudBackupSnapshot());
              events.emit('quiz:answer-wrong', { wordId, quizId, attemptNo });
            },
            onCorrect: ({ wordId, quizId }) => {
              weakWords.recordCorrect(wordId, 'quiz', quizId);
              cloudSync?.scheduleSync(getCloudBackupSnapshot());
              events.emit('quiz:answer-correct', { wordId, quizId });
            },
            onComplete: (result) => events.emit('quiz:completed', result)
          })
        : null;

      function getCloudBackupSnapshot() {
        return {
          progress: safeGetLS(STORAGE_PROGRESS_KEY, {}),
          quiz: safeGetLS('kawaii_jlpt_quiz_data_v1', {}),
          weakWords: safeGetLS('kawaii_jlpt_weak_words_v1', {}),
          preferences: safeGetLS(STORAGE_PREFS_KEY, {})
        };
      }

      async function applyCloudBackupSnapshot(snapshot) {
        if (!snapshot) return false;
        safeSetLS(STORAGE_PROGRESS_KEY, snapshot.progress || {});
        safeSetLS('kawaii_jlpt_quiz_data_v1', snapshot.quiz || {});
        safeSetLS('kawaii_jlpt_weak_words_v1', snapshot.weakWords || { version: 1, words: {} });
        safeSetLS(STORAGE_PREFS_KEY, snapshot.preferences || {});

        state.progress.wordStats = { ...(snapshot.progress?.wordStats || {}) };
        state.progress.streak = Number(snapshot.progress?.streak) || 0;
        state.progress.bestStreak = Number(snapshot.progress?.bestStreak) || 0;
        state.progress.totalPairsMatched = Number(snapshot.progress?.totalPairsMatched) || 0;
        quiz?.reload();
        weakWords?.reload();
        loadPrefs();
        await window.KawaiiDatabase?.saveAppState('progress_snapshot', snapshot.progress || {});
        await window.KawaiiDatabase?.saveAppState('preferences_snapshot', snapshot.preferences || {});
        events.emit('cloud:backup-restored', { exportedAt: snapshot.exportedAt || null });
        if (state.words.length) {
          rebuildFlashcardDeck();
          renderAll();
        }
        return true;
      }

      cloudSync = window.KawaiiCloudSyncModule
        ? window.KawaiiCloudSyncModule.create({
            config: window.KawaiiSupabaseConfig,
            database: window.KawaiiDatabase,
            getBackupSnapshot: getCloudBackupSnapshot,
            applyBackupSnapshot: applyCloudBackupSnapshot,
            onStatus: (status) => {
              events.emit('cloud:status', status);
              const statusEl = $('cloudAccountStatus');
              const detailEl = $('cloudAccountDetail');
              if (statusEl) {
                const labels = {
                  'not-configured': 'Chưa cấu hình Supabase',
                  'sdk-missing': 'Không tải được Supabase SDK',
                  'authenticated': 'Đã đăng nhập',
                  'signed-out': 'Chưa đăng nhập',
                  'synced': 'Đồng bộ thành công',
                  'offline': 'Đang ngoại tuyến',
                  'retrying': 'Đang chờ thử đồng bộ lại',
                  'warning': 'Cảnh báo đồng bộ',
                  'error': 'Đồng bộ gặp lỗi',
                  'backup-restored': 'Đã hợp nhất dữ liệu'
                };
                statusEl.textContent = labels[status.state] || status.state;
              }
              if (detailEl) {
                detailEl.textContent = status.user?.email || status.message ||
                  (status.retryInMs ? `Thử lại sau ${Math.ceil(status.retryInMs / 1000)} giây.` : '') ||
                  (status.localDataPreserved ? 'Dữ liệu trên thiết bị được giữ nguyên.' :
                  (status.state === 'not-configured' ? 'Điền URL và anon key trong supabase-config.js.' : ''));
              }
              if (status.state === 'error') console.warn('[Kawaii Cloud]', status.message);
            }
          })
        : null;
      cloudSync?.init();

      async function persistCompletedStudySession(session) {
        if (!session || session.status !== 'completed') return false;
        try {
          await window.KawaiiDatabase?.saveCompletedSession(session);
          await cloudSync?.syncNow(getCloudBackupSnapshot());
          events.emit('session:persisted', { sessionId: session.id });
          return true;
        } catch (error) {
          console.warn('[Kawaii Session Persistence]', error);
          events.emit('session:persistence-error', { sessionId: session.id, error });
          return false;
        }
      }

      window.KawaiiStudySession = studySession;
      window.KawaiiFlashcards = flashcards;
      window.KawaiiWeakWords = weakWords;
      window.KawaiiQuiz = quiz;

      // =======================================================================
      // 12A. CORE API (PHASE 2) - GIỮ TƯƠNG THÍCH PLUGIN CŨ
      // =======================================================================
      const Core = (() => {
        const stateSubscribers = new Set();
        let bootPromise = null;

        function readPath(root, path) {
          if (!path) return root;
          return String(path).split('.').reduce((value, key) => (
            value == null ? undefined : value[key]
          ), root);
        }

        function emitStateChange(path, value) {
          const payload = { path, value, state };
          stateSubscribers.forEach((fn) => {
            try { fn(payload); } catch (error) {
              console.error('[Kawaii Core State]', error);
            }
          });
          events.emit('state:changed', payload);
        }

        const State = Object.freeze({
          get(path) {
            return readPath(state, path);
          },
          set(path, value) {
            if (typeof path !== 'string' || !path.trim()) {
              throw new TypeError('State.set cần path hợp lệ.');
            }
            const keys = path.split('.');
            let target = state;
            for (const key of keys.slice(0, -1)) {
              if (!target[key] || typeof target[key] !== 'object') target[key] = {};
              target = target[key];
            }
            target[keys[keys.length - 1]] = value;
            emitStateChange(path, value);
            return value;
          },
          patch(data) {
            if (!data || typeof data !== 'object' || Array.isArray(data)) {
              throw new TypeError('State.patch cần object.');
            }
            Object.entries(data).forEach(([key, value]) => {
              state[key] = value;
              emitStateChange(key, value);
            });
            return state;
          },
          resetSession() {
            state.fcDeck = [];
            state.fcIndex = 0;
            state.fcFlipped = false;
            state.sessionStats = { reviewed: 0, good: 0, again: 0 };
            emitStateChange('learning.session', null);
          },
          subscribe(fn) {
            if (typeof fn !== 'function') throw new TypeError('Subscriber phải là function.');
            stateSubscribers.add(fn);
            return () => stateSubscribers.delete(fn);
          }
        });

        const Modules = Object.freeze({
          register(config) {
            if (!config || typeof config !== 'object' || !config.id) {
              throw new TypeError('Module cần id hợp lệ.');
            }
            if (registeredModules.has(config.id)) {
              throw new Error('Module đã đăng ký: ' + config.id);
            }
            registerModule(config);
            return registeredModules.has(config.id);
          },
          get(id) {
            const module = registeredModules.get(id);
            if (!module) return null;
            return {
              id: module.id,
              label: module.label,
              icon: module.icon
            };
          },
          getAll() {
            return Array.from(registeredModules.values()).map((module) => ({
              id: module.id,
              label: module.label,
              icon: module.icon
            }));
          },
          activate(id) {
            if (!registeredModules.has(id)) return false;
            state.mode = id;
            renderAll();
            events.emit('mode:changed', { mode: id });
            return true;
          }
        });

        const SRS = Object.freeze({
          getWordStat,
          getWordSrsInfo,
          isWordNew,
          isWordDue,
          isWordLearned,
          rateWord: rateWordSrs,
          rateWordSrs,
          calculateNext: calculateSrsNext,
          rebuild(wordId) {
            // Giai đoạn 2 chưa có Event Log đầy đủ; không giả lập lịch sử.
            // Trả trạng thái hiện tại và chờ Event Repository ở giai đoạn sau.
            return getWordStat(wordId);
          },
          getAlgorithmInfo() {
            return {
              version: 1,
              intervalsDays: [...SRS_INTERVALS_DAYS],
              againMinutes: 5,
              hardDays: 1
            };
          }
        });

        const Data = Object.freeze({
          words: Object.freeze({
            getAll: () => getBasePool(),
            getById: (wordId) => state.wordMap.get(wordId) || null,
            getBasePool: () => getBasePool(),
            applyDataset: (dataset, ...args) => applyDataset(dataset, ...args)
          }),
          progress: Object.freeze({
            get: (wordId) => getWordStat(wordId),
            getAll: () => ({ ...state.progress.wordStats }),
            save: () => saveProgress()
          })
        });

        const UI = Object.freeze({
          renderAll,
          showToast
        });

        const Bootstrap = Object.freeze({
          start() {
            if (!bootPromise) bootPromise = bootstrap();
            return bootPromise;
          },
          get started() {
            return !!bootPromise;
          }
        });

        return Object.freeze({
          version: '3.7.2-core',
          State,
          Events: events,
          Modules,
          SRS,
          Data,
          UI,
          StudySession: studySession,
          Flashcards: flashcards,
          Quiz: quiz,
          WeakWords: weakWords,
          CloudSync: cloudSync,
          Database: window.KawaiiDatabase,
          Bootstrap
        });
      })();

      window.KawaiiApp = {
        version: '3.7.2',
        Core,
        studySession,
        flashcards,
        quiz,
        weakWords,
        pronunciation,
        meaning,
        cloud: cloudSync,
        database: window.KawaiiDatabase,
        state,
        events,
        registerModule,
        getBasePool,
        applyDataset,
        renderAll,
        showToast,
        srs: {
          getWordStat, getWordSrsInfo, rateWordSrs,
          isWordDue, isWordNew, isWordLearned,
          calculateNext: calculateSrsNext,
          getAlgorithmInfo: Core.SRS.getAlgorithmInfo
        },
        tts: {
          speak: speakJapaneseText, speakWord, speakKana: speakKanaItem,
          stop: stopAudio, clearCache: clearWavCache,
          initMarine: initZenTtsFromCacheOrNetwork,
          module: pronunciation
        },
        dict: {
          lookup: lookupToken, tokenize: tokenizeJapaneseSentence,
          showPopup: showTranslateSheet, hidePopup: hideTranslateSheet,
          module: meaning
        }
      };


      // =======================================================================
      // 12B. QUIZ + WEAK WORDS UI MODULES (PHASE 4)
      // =======================================================================
      function getQuizEligibleWords() {
        return state.words.filter(word => {
          const progress = getWordStat(word.id);
          const hasBeenStudied = !!(progress && ((progress.reps || 0) > 0 || (progress.lapses || 0) > 0));
          return hasBeenStudied && !!word.meaning && !!(word.kanji || word.kana);
        });
      }

      function startQuiz(count = 10) {
        const eligible = getQuizEligibleWords();
        const completedSession = studySession?.getSnapshot();
        const flashcardScore = completedSession?.status === 'completed'
          ? (completedSession.stats?.firstAttemptCorrect || 0)
          : 0;
        try {
          quiz.start(eligible, count, flashcardScore);
          state.mode = 'quiz';
          renderAll();
        } catch (error) {
          showToast(error.message || 'Không thể tạo bài trắc nghiệm.', 'error');
        }
      }

      function renderQuizModule(sectionEl) {
        if (!quiz) return;
        const snapshot = quiz.snapshot();
        const eligibleCount = getQuizEligibleWords().length;

        if (!snapshot) {
          sectionEl.innerHTML = `
            <div class="bg-white border border-[#F1ECE6] rounded-3xl p-5 sm:p-7 shadow-soft flex flex-col gap-4">
              <div>
                <h2 class="text-lg font-extrabold text-[#332E2E]">📝 Trắc nghiệm từ đã học</h2>
                <p class="text-sm text-[#786D69] mt-1">Câu hỏi lấy từ toàn bộ kho từ bạn đã từng học, không giới hạn cấp độ hay chủ đề hiện tại.</p>
              </div>
              <div class="rounded-2xl bg-[#F8F5FF] p-4">
                <p class="text-sm font-bold text-[#514477]">Hiện có ${eligibleCount} từ đủ điều kiện kiểm tra.</p>
                <p class="text-xs text-[#786D69] mt-1">Mỗi bài có 10 câu; có thể chọn 15 câu khi muốn tăng độ dài. Câu hỏi trộn Nhật → Việt và Việt → Nhật.</p>
              </div>
              <div class="flex items-center gap-3 flex-wrap">
                <label class="text-sm font-bold text-[#4A4240]" for="quizCountSelect">Số câu</label>
                <select id="quizCountSelect" class="rounded-xl border border-[#E8DFD6] bg-white px-3 py-2 text-sm font-bold">
                  <option value="10">10 câu</option><option value="15">15 câu</option>
                </select>
                <button id="quizStartBtn" ${eligibleCount < 4 ? 'disabled' : ''} class="rounded-xl bg-[#5B8DEF] px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40">Bắt đầu trắc nghiệm</button>
              </div>
              ${eligibleCount < 4 ? '<p class="text-xs text-[#B45309]">Cần ít nhất 4 từ đã từng học và có nghĩa để tạo câu hỏi.</p>' : ''}
            </div>`;
          sectionEl.querySelector('#quizStartBtn')?.addEventListener('click', () => {
            const count = Number(sectionEl.querySelector('#quizCountSelect')?.value) || 10;
            startQuiz(count);
          });
          return;
        }

        if (snapshot.status === 'completed') {
          const stats = quiz.getStats();
          sectionEl.innerHTML = `
            <div class="bg-white border border-[#F1ECE6] rounded-3xl p-5 sm:p-7 shadow-soft flex flex-col gap-4">
              <div class="text-center">
                <div class="text-4xl mb-2">🎉</div>
                <h2 class="text-xl font-extrabold text-[#332E2E]">Hoàn thành trắc nghiệm</h2>
                <p class="text-sm text-[#786D69] mt-1">Điểm tính theo tổng số thao tác đúng.</p>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div class="rounded-2xl bg-[#F8F5FF] p-3"><p class="text-xs text-[#786D69]">Điểm Flashcard</p><p class="text-2xl font-extrabold">${stats.flashcardScore}</p></div>
                <div class="rounded-2xl bg-[#EFF6FF] p-3"><p class="text-xs text-[#786D69]">Đúng Quiz</p><p class="text-2xl font-extrabold">${stats.correctActions}</p></div>
                <div class="rounded-2xl bg-[#ECFDF5] p-3"><p class="text-xs text-[#786D69]">Tổng điểm</p><p class="text-2xl font-extrabold text-[#047857]">${stats.totalScore}</p></div>
                <div class="rounded-2xl bg-[#FFF1F2] p-3"><p class="text-xs text-[#786D69]">Lượt sai</p><p class="text-2xl font-extrabold text-[#BE123C]">${stats.wrongActions}</p></div>
              </div>
              <p class="text-xs text-[#786D69] text-center">Lượt hỏi lại được tính điểm nếu trả lời đúng. Lượt sai ở cả vòng đầu và vòng hỏi lại đều được ghi nhận.</p>
              <div class="flex justify-center gap-2 flex-wrap">
                <button id="quizAgainBtn" class="rounded-xl bg-[#5B8DEF] px-5 py-2.5 text-sm font-extrabold text-white">Làm bài khác</button>
                <button id="quizNextSessionBtn" class="rounded-xl bg-[#FB6F92] px-5 py-2.5 text-sm font-extrabold text-white">Học phiên Flashcard tiếp theo</button>
              </div>
            </div>`;
          sectionEl.querySelector('#quizAgainBtn')?.addEventListener('click', () => startQuiz(snapshot.questionCount));
          sectionEl.querySelector('#quizNextSessionBtn')?.addEventListener('click', () => {
            state.mode = 'flashcard';
            startNewStudySession();
          });
          return;
        }

        const question = quiz.currentQuestion();
        if (!question) {
          sectionEl.innerHTML = '<div class="bg-white rounded-3xl p-6">Không tìm thấy câu hỏi hiện tại.</div>';
          return;
        }
        const feedback = snapshot.currentFeedback;
        const phaseLabel = snapshot.phase === 'first' ? 'Lượt đầu' : 'Lượt hỏi lại';
        const progressLabel = snapshot.phase === 'first'
          ? `${snapshot.index + 1}/${snapshot.questions.length}`
          : `${snapshot.index + 1}/${snapshot.retryQuestions.length}`;
        const optionsHtml = question.options.map((option, index) => {
          const isCorrect = feedback && option === feedback.correctAnswer;
          const isSelectedWrong = feedback && option === feedback.selectedAnswer && !feedback.correct;
          const cls = isCorrect ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]'
            : isSelectedWrong ? 'border-[#F43F5E] bg-[#FFF1F2] text-[#BE123C]'
            : 'border-[#E8DFD6] bg-white text-[#4A4240] hover:border-[#A5B4FC]';
          return `<button data-quiz-answer="${escapeHtml(option)}" ${feedback ? 'disabled' : ''} class="w-full text-left border-2 ${cls} rounded-2xl px-4 py-3 text-sm font-bold disabled:cursor-default"><span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/5 mr-2">${'ABCD'[index]}</span>${escapeHtml(option)}</button>`;
        }).join('');
        sectionEl.innerHTML = `
          <div class="bg-white border border-[#F1ECE6] rounded-3xl p-4 sm:p-6 shadow-soft flex flex-col gap-4">
            <div class="flex items-center justify-between gap-2">
              <div><p class="text-xs font-extrabold text-[#5B8DEF]">${phaseLabel}</p><h2 class="text-lg font-extrabold text-[#332E2E]">Câu ${progressLabel}</h2></div>
              <div class="text-right"><p class="text-xs text-[#786D69]">Điểm hiện tại</p><p class="text-xl font-extrabold">${snapshot.score}</p></div>
            </div>
            <div class="h-2 rounded-full bg-[#F3ECE4] overflow-hidden"><div class="h-full bg-[#5B8DEF]" style="width:${Math.min(100, (snapshot.attempts.length / Math.max(1, snapshot.questionCount + snapshot.retryQueue.length)) * 100)}%"></div></div>
            <div class="rounded-2xl bg-[#F8F5FF] p-5 text-center">
              <p class="text-xs font-bold text-[#786D69]">${question.direction === 'word-to-meaning' ? 'Chọn nghĩa tiếng Việt đúng' : 'Chọn từ tiếng Nhật đúng'}</p>
              <p class="mt-2 text-2xl sm:text-3xl font-extrabold ${question.direction === 'word-to-meaning' ? 'font-jp' : ''}">${escapeHtml(question.prompt)}</p>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${optionsHtml}</div>
            ${feedback ? `
              <div class="rounded-2xl p-4 ${feedback.correct ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FFF1F2] text-[#BE123C]'}">
                <p class="font-extrabold">${feedback.correct ? 'Chính xác!' : 'Chưa chính xác'}</p>
                <p class="text-sm mt-1">Đáp án đúng: <strong>${escapeHtml(feedback.correctAnswer)}</strong></p>
                <p class="text-sm mt-1 text-[#4A4240]">Nghĩa: ${escapeHtml(feedback.meaning)}</p>
              </div>
              <button id="quizNextBtn" class="w-full rounded-xl bg-[#5B8DEF] px-5 py-3 text-sm font-extrabold text-white">Câu tiếp theo</button>
            ` : ''}
          </div>`;
        sectionEl.querySelectorAll('[data-quiz-answer]').forEach(button => {
          button.addEventListener('click', () => {
            try { quiz.answer(button.dataset.quizAnswer); renderQuizModule(sectionEl); }
            catch (error) { showToast(error.message, 'error'); }
          });
        });
        sectionEl.querySelector('#quizNextBtn')?.addEventListener('click', () => {
          try { quiz.next(); renderQuizModule(sectionEl); }
          catch (error) { showToast(error.message, 'error'); }
        });
      }

      function renderWeakWordsModule(sectionEl) {
        if (!weakWords) return;
        const records = weakWords.getWeak();
        const summary = weakWords.getSummary();
        const cards = records.map(record => {
          const word = state.wordMap.get(record.wordId);
          if (!word) return '';
          return `<article class="rounded-2xl border border-[#F1D6D9] bg-white p-4 flex flex-col gap-2">
            <div class="flex items-start justify-between gap-2">
              <div><p class="text-xl font-extrabold font-jp">${escapeHtml(word.kanji || word.kana)}</p><p class="text-xs text-[#786D69]">${escapeHtml(word.kana || '')} · ${escapeHtml(word.romaji || '')}</p></div>
              <span class="rounded-full bg-[#FFF1F2] px-3 py-1 text-xs font-extrabold text-[#BE123C]">${record.errorCount} lỗi</span>
            </div>
            <p class="text-sm text-[#4A4240]">${escapeHtml(word.meaning || '')}</p>
            <p class="text-[11px] text-[#8C7F7A]">Đúng Flashcard: ${record.flashcardCorrectSessions.length}/2 phiên · Đúng Quiz: ${record.quizCorrectSessions.length}/2 phiên</p>
            <button data-dismiss-weak="${escapeHtml(record.wordId)}" class="self-start rounded-xl bg-[#F6EFE8] px-3 py-2 text-xs font-extrabold text-[#5E524E]">Bỏ khỏi Sổ từ yếu</button>
          </article>`;
        }).join('');
        sectionEl.innerHTML = `
          <div class="bg-white border border-[#F1ECE6] rounded-3xl p-4 sm:p-6 shadow-soft flex flex-col gap-4">
            <div><h2 class="text-lg font-extrabold text-[#332E2E]">📕 Sổ từ yếu</h2><p class="text-sm text-[#786D69] mt-1">Tự động thêm từ khi có ít nhất 2 lỗi cộng dồn từ Flashcard và Quiz.</p></div>
            <div class="grid grid-cols-3 gap-2 text-center">
              <div class="rounded-2xl bg-[#FFF1F2] p-3"><p class="text-xs text-[#786D69]">Từ yếu</p><p class="text-xl font-extrabold">${summary.weak}</p></div>
              <div class="rounded-2xl bg-[#F8F5FF] p-3"><p class="text-xs text-[#786D69]">Từ đã theo dõi</p><p class="text-xl font-extrabold">${summary.totalTracked}</p></div>
              <div class="rounded-2xl bg-[#FFF7ED] p-3"><p class="text-xs text-[#786D69]">Tổng lỗi</p><p class="text-xl font-extrabold">${summary.errors}</p></div>
            </div>
            ${cards ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${cards}</div>` : '<div class="rounded-2xl bg-[#ECFDF5] p-5 text-center text-sm font-bold text-[#047857]">Chưa có từ yếu. Tiếp tục học và làm trắc nghiệm để hệ thống đánh giá tự động.</div>'}
          </div>`;
        sectionEl.querySelectorAll('[data-dismiss-weak]').forEach(button => {
          button.addEventListener('click', () => {
            weakWords.dismiss(button.dataset.dismissWeak);
            renderWeakWordsModule(sectionEl);
            showToast('Đã bỏ trạng thái từ yếu; lịch sử lỗi vẫn được giữ.', 'success');
          });
        });
      }

      if (quiz) {
        registerModule({
          id: 'quiz', label: 'Trắc nghiệm', icon: '📝',
          mount: (sectionEl) => { sectionEl.innerHTML = ''; },
          render: (sectionEl) => renderQuizModule(sectionEl)
        });
      }
      if (weakWords) {
        registerModule({
          id: 'weak-words', label: 'Sổ từ yếu', icon: '📕',
          mount: (sectionEl) => { sectionEl.innerHTML = ''; },
          render: (sectionEl) => renderWeakWordsModule(sectionEl)
        });
      }

      // =======================================================================
      // 13. EVENT BINDINGS
      // =======================================================================
      document.querySelectorAll('.mode-tab').forEach(btn => {
        btn.onclick = () => {
          cancelCardMove(); stopAudio(); hideTranslateSheet();
          state.mode = btn.dataset.mode; renderAll();
          events.emit('mode:changed', { mode: state.mode });
        };
      });

      $('topicSelect').onchange = (e) => {
        state.prefs.topic = e.target.value; savePrefs();
        rebuildFlashcardDeck(); initMatchingRound(); renderAll();
      };

      $('furiToggleBtn').onclick = () => {
        state.prefs.showFuri = !state.prefs.showFuri; savePrefs(); renderAll();
      };

      $('trCloseBtn').onclick = hideTranslateSheet;
      $('trSpeakBtn').onclick = () => speakJapaneseText(state.activePopupSpeakText);

      function bindSwipeAndFlip(cardEl, onFlip, onPrev, onNext, getIsBusy) {
        let startX = 0, startY = 0, startTime = 0, dragging = false, didSwipe = false;
        const isFlashcard = cardEl.id === 'fcPerspective';
        const clearSwipeFeedback = () => {
          if (isFlashcard) cardEl.classList.remove('swiping-again', 'swiping-good');
        };
        cardEl.addEventListener('pointerdown', (e) => {
          if (e.button !== 0 || e.target.closest('button') || e.target.closest('.tap-token') || getIsBusy()) return;
          cardEl.setPointerCapture(e.pointerId);
          startX = e.clientX; startY = e.clientY; startTime = performance.now();
          dragging = true; didSwipe = false;
          cardEl.style.transition = 'none';
        });
        cardEl.addEventListener('pointermove', (e) => {
          if (!dragging) return;
          const dx = e.clientX - startX, dy = e.clientY - startY;
          if (Math.abs(dy) > 10) didSwipe = true;
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
            didSwipe = true;
            if (isFlashcard) {
              cardEl.classList.toggle('swiping-again', dx < 0);
              cardEl.classList.toggle('swiping-good', dx > 0);
            }
            cardEl.style.transform = `translateX(${Math.max(-150, Math.min(150, dx * 0.72))}px) rotate(${Math.max(-9, Math.min(9, dx * 0.045))}deg)`;
          }
        });
        const resetCard = () => {
          cardEl.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
          cardEl.style.transform = 'translateX(0) rotate(0deg)';
          cardEl.style.opacity = '1';
          clearSwipeFeedback();
        };
        const finish = (e) => {
          if (!dragging) return;
          dragging = false;
          const dx = e.clientX - startX, dy = e.clientY - startY;
          const elapsed = Math.max(1, performance.now() - startTime);
          const velocity = Math.abs(dx) / elapsed;
          const threshold = Math.max(64, cardEl.clientWidth * 0.25);
          const accepted = Math.abs(dx) >= threshold || (Math.abs(dx) >= 36 && velocity >= 0.65);
          if (accepted && Math.abs(dx) > Math.abs(dy)) {
            didSwipe = true;
            cardEl.style.transition = 'transform 0.16s ease-out, opacity 0.16s ease-out';
            cardEl.style.transform = `translateX(${dx < 0 ? -520 : 520}px) rotate(${dx < 0 ? -12 : 12}deg)`;
            cardEl.style.opacity = '0';
            setTimeout(() => {
              clearSwipeFeedback();
              cardEl.style.transition = '';
              cardEl.style.transform = '';
              cardEl.style.opacity = '';
              if (dx < 0) onNext(); else onPrev();
            }, 125);
          } else {
            resetCard();
          }
        };
        cardEl.addEventListener('pointerup', finish);
        cardEl.addEventListener('pointercancel', () => {
          dragging = false; didSwipe = true; resetCard();
        });
        cardEl.addEventListener('click', (e) => {
          if (e.target.closest('button') || e.target.closest('.tap-token') || didSwipe || getIsBusy()) return;
          onFlip();
        });
      }

      window.KawaiiFlashcardInteraction.attach($('fcPerspective'), {
        onFlip: flipFlashcard,
        onAgain: () => handleFlashcardRating('again'),
        onGood: () => handleFlashcardRating('good'),
        isBusy: () => !state.fcDeck.length || cardMoveTimer !== null
      });
      bindSwipeAndFlip($('kanaPerspective'), flipKanaCard, () => moveKanaCard(-1), () => moveKanaCard(1), () => !state.kanaDeck.length || kanaMoveTimer !== null);

      $('fcSpeakFrontBtn').onclick = (e) => { e.stopPropagation(); speakWord(state.fcDeck[state.fcIndex]); };
      $('fcSpeakBackBtn').onclick = (e) => { e.stopPropagation(); speakWord(state.fcDeck[state.fcIndex]); };
      $('fcSpeakExBtn').onclick = (e) => { e.stopPropagation(); const w = state.fcDeck[state.fcIndex]; if (w?.example?.ja) speakJapaneseText(w.example.ja); };
      $('fcPrevBtn').onclick = () => moveCard(-1);
      $('fcNextBtn').onclick = () => moveCard(1);
      $('fcShuffleBtn').onclick = () => {
        const reordered = shuffled(state.fcDeck);
        if (state.prefs.fcFilter === 'SMART' && studySession?.getSnapshot()?.status === 'active') {
          state.fcDeck = flashcards.reorder(reordered.map(word => word.id)) || state.fcDeck;
        } else {
          state.fcDeck = reordered;
        }
        state.fcIndex = 0;
        state.fcFlipped = false;
        renderFlashcard();
        showToast('Đã xáo trộn hàng đợi học!');
      };
      $('btnStartNextSession').onclick = startNewStudySession;
      $('btnStartQuizAfterSession').onclick = () => startQuiz(10);
      $('btnViewAllCards').onclick = () => { state.prefs.fcFilter = 'ALL'; savePrefs(); rebuildFlashcardDeck(); renderFlashcard(); };
      const sessionSizeSelect = $('sessionSizeSelect');
      const allowedSessionSizes = new Set(['10', '20', '30', '0']);
      if (!allowedSessionSizes.has(String(state.prefs.sessionSize))) state.prefs.sessionSize = 10;
      sessionSizeSelect.disabled = false;
      sessionSizeSelect.value = String(state.prefs.sessionSize);
      sessionSizeSelect.onchange = () => {
        const selected = String(sessionSizeSelect.value);
        if (!allowedSessionSizes.has(selected)) {
          sessionSizeSelect.value = String(state.prefs.sessionSize);
          showToast('Vui lòng chọn số từ hợp lệ.', 'warning');
          return;
        }
        state.prefs.sessionSize = Number(selected);
        savePrefs();
        const active = studySession?.getSnapshot()?.status === 'active';
        showToast(active
          ? `Đã lưu ${selected === '0' ? 'không giới hạn' : selected + ' từ'} cho phiên tiếp theo. Phiên hiện tại không thay đổi.`
          : `Đã chọn ${selected === '0' ? 'không giới hạn' : selected + ' từ'} cho phiên học.`, 'success');
      };
      document.querySelectorAll('.fc-filter-btn').forEach(btn => {
        btn.onclick = () => { state.prefs.fcFilter = btn.dataset.filter; savePrefs(); rebuildFlashcardDeck(); renderFlashcard(); };
      });

      // Matching Controls
      $('matchSwapBtn').onclick = () => {
        clearTimeout(matchErrorTimer);
        state.matchLocked = false; state.matchErrors = null; state.matchSelected = null;
        state.prefs.matchSwap = !state.prefs.matchSwap; savePrefs(); renderMatching();
      };
      $('matchNewRoundBtn').onclick = () => { initMatchingRound(); renderMatching(); };
      $('matchNextRoundCta').onclick = () => { initMatchingRound(); renderMatching(); };

      // Kana Controls
      $('kanaViewCardBtn').onclick = () => { state.prefs.kanaView = 'card'; savePrefs(); renderKana(); };
      $('kanaViewGridBtn').onclick = () => { state.prefs.kanaView = 'grid'; savePrefs(); renderKana(); };
      $('kanaScriptHira').onclick = () => { state.prefs.kanaScript = 'hira'; savePrefs(); renderKana(); };
      $('kanaScriptKata').onclick = () => { state.prefs.kanaScript = 'kata'; savePrefs(); renderKana(); };
      $('kanaModeQuickBtn').onclick = () => {
        state.prefs.kanaReadMode = state.prefs.kanaReadMode === 'WITH_WORD' ? 'CLEAR_MORA' : 'WITH_WORD';
        savePrefs(); renderKana();
      };
      document.querySelectorAll('.kana-group-btn').forEach(btn => {
        btn.onclick = () => { state.prefs.kanaGroup = btn.dataset.kgroup; savePrefs(); rebuildKanaDeck(); renderKana(); };
      });
      $('kanaFcShuffleBtn').onclick = () => { rebuildKanaDeck(true); renderKana(); showToast('Đã xáo trộn bảng chữ!'); };
      $('kanaPrevBtn').onclick = () => moveKanaCard(-1);
      $('kanaNextBtn').onclick = () => moveKanaCard(1);
      $('kanaFlipBtn').onclick = () => flipKanaCard();
      $('kanaSpeakFrontBtn').onclick = (e) => { e.stopPropagation(); if (state.kanaDeck[state.kanaIndex]) speakKanaItem(state.kanaDeck[state.kanaIndex][0]); };
      $('kanaSpeakBackBtn').onclick = (e) => { e.stopPropagation(); if (state.kanaDeck[state.kanaIndex]) speakKanaItem(state.kanaDeck[state.kanaIndex][0]); };

      // Keyboard Shortcuts
      document.addEventListener('keydown', (e) => {
        if (!$('confirmModal').classList.contains('hidden') || !$('audioModal').classList.contains('hidden')) return;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(document.activeElement.tagName)) return;
        if (state.mode === 'flashcard' && state.fcDeck.length) {
          if (e.code === 'Space') { e.preventDefault(); flipFlashcard(); }
          else if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (state.prefs.fcFilter === 'SMART') handleFlashcardRating('good');
            else moveCard(1);
          }
          else if (e.code === 'ArrowLeft') {
            e.preventDefault();
            if (state.prefs.fcFilter === 'SMART') handleFlashcardRating('again');
            else moveCard(-1);
          }
          else if (e.key === '1') handleFlashcardRating('again');
          else if (e.key === '2') handleFlashcardRating('hard');
          else if (e.key === '3') handleFlashcardRating('good');
          else if (e.key.toLowerCase() === 'r') speakWord(state.fcDeck[state.fcIndex]);
        } else if (state.mode === 'kana' && state.prefs.kanaView === 'card') {
          if (e.code === 'Space') { e.preventDefault(); flipKanaCard(); }
          else if (e.code === 'ArrowRight') { e.preventDefault(); moveKanaCard(1); }
          else if (e.code === 'ArrowLeft') { e.preventDefault(); moveKanaCard(-1); }
        }
      });

      // Data & Module Controls
      $('btnSyncGoogleSheet').onclick = () => syncFromGoogleSheets({ silent: false });
      $('autoSyncSheetCheck').onchange = (e) => { state.prefs.autoSyncSheet = e.target.checked; savePrefs(); };
      $('btnLoadSampleData').onclick = async () => {
        await applyDataset(SAMPLE_DATASET, true);
        showToast('Đã nạp bộ từ vựng mẫu chuẩn Sheet!', 'success');
      };

      $('csvFileInput').onchange = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = '';
        if (!files.length) return;
        try {
          const allWords = [];
          for (const file of files) {
            const inferred = file.name.match(/(N[1-5])/i)?.[1]?.toUpperCase() || 'N5';
            allWords.push(...mapSheetRowsToWords(parseCSV(await file.text()), inferred));
          }
          if (!allWords.length) throw new Error('Không đọc được từ vựng nào từ file CSV.');
          await applyDataset({ meta: { title: `CSV Sheet (${allWords.length} từ)` }, words: allWords }, true);
          showToast(`Đã nạp ${allWords.length} từ từ file CSV!`, 'success');
        } catch (err) { showToast('Lỗi đọc CSV: ' + err.message, 'error'); }
      };

      $('jsonFileInput').onchange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
          const parsed = JSON.parse(await file.text());
          const list = Array.isArray(parsed) ? parsed : parsed.words;
          if (!Array.isArray(list) || !list.length) throw new Error('JSON không có danh sách từ hợp lệ.');
          const words = list.map((item, i) => ({
            id: String(item.id || `json_${i}`),
            level: LEVELS.includes(String(item.level || 'N5').toUpperCase()) ? String(item.level || 'N5').toUpperCase() : 'N5',
            kanji: String(item.kanji || item.word || '').trim(),
            kana: String(item.kana || item.furigana || item.reading || item.kanji || '').trim(),
            furigana: String(item.furigana || item.kana || item.reading || item.kanji || '').trim(),
            romaji: String(item.romaji || '').trim(),
            hanViet: String(item.hanViet || item.han_viet || '').trim(),
            meaning: Array.isArray(item.meanings) ? item.meanings.join('; ') : String(item.meaning || '').trim(),
            pos: String(item.pos || '').trim(),
            topic: String(item.topic || 'Chung').trim(),
            example: item.example && item.example.ja ? item.example : null
          })).filter(w => (w.kanji || w.kana) && w.meaning);
          await applyDataset({ meta: { title: file.name }, words }, true);
          showToast(`Đã nạp ${words.length} từ từ JSON!`, 'success');
        } catch (err) { showToast('Lỗi đọc JSON: ' + err.message, 'error'); }
      };

      $('btnDownloadZenMarine').onclick = () => initZenTtsFromCacheOrNetwork(true);
      $('btnModalDownloadZen').onclick = () => initZenTtsFromCacheOrNetwork(true);
      $('zenLocalFolderInput').onchange = (e) => { initZenTtsFromLocalFiles(e.target.files); e.target.value = ''; };

      // Optional Supabase Account / Cloud Sync Controls
      const cloudModal = $('cloudAccountModal');
      $('btnCloudAccount').onclick = async () => {
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
      };
      $('closeCloudAccountBtn').onclick = () => cloudModal.classList.add('hidden');
      cloudModal.addEventListener('click', event => {
        if (event.target === cloudModal) cloudModal.classList.add('hidden');
      });
      $('cloudSignInBtn').onclick = async () => {
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
      };
      $('cloudSignUpBtn').onclick = async () => {
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
      };
      $('cloudSyncNowBtn').onclick = async () => {
        $('cloudSyncNowBtn').disabled = true;
        try {
          const result = await cloudSync.syncNow(getCloudBackupSnapshot());
          if (result.backup?.uploaded) showToast(`Đã sao lưu; tải lên ${result.sessions?.uploaded || 0} phiên hoàn thành.`, 'success');
          else showToast('Chưa đăng nhập hoặc Supabase chưa được cấu hình.', 'info');
        } catch (error) {
          showToast(error.message || 'Sao lưu thất bại.', 'error');
        } finally { $('cloudSyncNowBtn').disabled = false; }
      };
      $('cloudSignOutBtn').onclick = async () => {
        try {
          await cloudSync.signOut();
          $('cloudAccountStatus').textContent = 'Đã đăng xuất';
          $('cloudAccountDetail').textContent = 'Dữ liệu cục bộ vẫn được giữ nguyên.';
          showToast('Đã đăng xuất. Dữ liệu trên thiết bị không bị xóa.', 'success');
        } catch (error) {
          showToast(error.message || 'Đăng xuất thất bại.', 'error');
        }
      };

      // Audio Modal Controls
      $('btnAudioSettings').onclick = () => {
        $('kanaReadModeSelect').value = state.prefs.kanaReadMode || 'CLEAR_MORA';
        $('zenSpeedInput').value = state.prefs.zenSpeed;
        $('zenSpeedVal').textContent = `${Number(state.prefs.zenSpeed).toFixed(2)}x`;
        $('zenPitchInput').value = state.prefs.zenPitch;
        $('zenPitchVal').textContent = `${state.prefs.zenPitch} st`;
        $('zenHappyInput').value = state.prefs.zenHappy;
        $('zenHappyVal').textContent = `${state.prefs.zenHappy}%`;
        $('fallbackWebSpeechCheck').checked = !!state.prefs.fallbackWebSpeech;
        $('audioModal').classList.remove('hidden');
      };
      $('closeAudioModalBtn').onclick = () => $('audioModal').classList.add('hidden');
      $('audioModal').addEventListener('click', (e) => { if (e.target === $('audioModal')) $('audioModal').classList.add('hidden'); });
      $('zenSpeedInput').oninput = (e) => { $('zenSpeedVal').textContent = `${Number(e.target.value).toFixed(2)}x`; };
      $('zenPitchInput').oninput = (e) => { $('zenPitchVal').textContent = `${e.target.value} st`; };
      $('zenHappyInput').oninput = (e) => { $('zenHappyVal').textContent = `${e.target.value}%`; };

      function getAudioFormPrefs() {
        return {
          kanaReadMode: $('kanaReadModeSelect').value,
          zenSpeed: Number($('zenSpeedInput').value),
          zenPitch: Number($('zenPitchInput').value),
          zenHappy: Number($('zenHappyInput').value),
          fallbackWebSpeech: $('fallbackWebSpeechCheck').checked
        };
      }
      $('testVoiceBtn').onclick = () => speakJapaneseText('こんにちは、日本語を楽しく勉強しましょう。', getAudioFormPrefs());
      $('saveAudioModalBtn').onclick = () => {
        Object.assign(state.prefs, getAudioFormPrefs());
        savePrefs(); renderAll();
        $('audioModal').classList.add('hidden');
        showToast('Đã lưu cài đặt âm thanh!', 'success');
      };

      // Progress Export / Import / Reset
      $('btnExportProgress').onclick = () => {
        const payload = {
          version: 3,
          exportedAt: new Date().toISOString(),
          wordStats: state.progress.wordStats,
          streak: state.progress.streak,
          bestStreak: state.progress.bestStreak,
          totalPairsMatched: state.progress.totalPairsMatched
        };
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
        a.download = `kawaii-jlpt-srs-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
      $('importProgressInput').onchange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
          const p = JSON.parse(await file.text());
          if (p.wordStats && typeof p.wordStats === 'object') {
            state.progress.wordStats = p.wordStats;
          } else if (Array.isArray(p.masteredIds)) {
            const now = Date.now();
            state.progress.wordStats = {};
            p.masteredIds.forEach(id => {
              state.progress.wordStats[id] = { reps: 2, intervalDays: 3, nextReviewAt: now + 3 * DAY_MS, lastReviewedAt: now, lapses: 0 };
            });
          } else {
            throw new Error('File không đúng định dạng tiến độ.');
          }
          state.progress.streak = Number(p.streak) || 0;
          state.progress.bestStreak = Number(p.bestStreak) || 0;
          state.progress.totalPairsMatched = Number(p.totalPairsMatched) || 0;
          saveProgress();
          rebuildFlashcardDeck();
          initMatchingRound();
          renderAll();
          showToast('Đã khôi phục tiến độ & lịch ôn SRS!', 'success');
        } catch (err) { showToast('Lỗi nhập tiến độ: ' + err.message, 'error'); }
      };
      $('btnResetProgress').onclick = async () => {
        if (!(await showConfirm('Đặt lại tiến độ?', 'Toàn bộ lịch sử học, lịch nhắc ôn SRS từng từ và chuỗi đúng sẽ về 0.'))) return;
        state.progress = { wordStats: {}, streak: 0, bestStreak: 0, totalPairsMatched: 0 };
        lessonGood = {};
        safeSetLS(LESSON_PROGRESS_KEY, lessonGood);
        studySession?.clear();
        saveProgress();
        rebuildFlashcardDeck();
        initMatchingRound();
        renderAll();
        showToast('Đã đặt lại tiến độ!');
      };

      // =======================================================================
      // 15. BOOTSTRAP (Tự nạp dữ liệu đã lưu + Tự đồng bộ ngầm Google Sheets)
      // =======================================================================
      async function bootstrap() {
        // Restore mirrored module state only when its localStorage copy is absent.
        try {
          await Promise.all([
            window.KawaiiDatabase?.restoreMirroredStorage('study-session'),
            window.KawaiiDatabase?.restoreMirroredStorage('quiz'),
            window.KawaiiDatabase?.restoreMirroredStorage('weak-words')
          ]);
          const persistedProgress = await window.KawaiiDatabase?.getAppState('progress_snapshot');
          if (!safeGetLS(STORAGE_PROGRESS_KEY, null) && persistedProgress) safeSetLS(STORAGE_PROGRESS_KEY, persistedProgress);
          const persistedPrefs = await window.KawaiiDatabase?.getAppState('preferences_snapshot');
          if (!safeGetLS(STORAGE_PREFS_KEY, null) && persistedPrefs) safeSetLS(STORAGE_PREFS_KEY, persistedPrefs);
          studySession?.load();
          quiz?.reload();
          weakWords?.reload();
        } catch (error) {
          console.warn('[KawaiiDatabase] Khôi phục dữ liệu mirror không hoàn tất:', error);
        }
        loadProgress();
        loadPrefs();
        try {
          await Promise.all([
            window.KawaiiDatabase?.mirrorLocalJSON('kawaii_jlpt_active_session_v1', 'study-session:kawaii_jlpt_active_session_v1'),
            window.KawaiiDatabase?.mirrorLocalJSON('kawaii_jlpt_quiz_data_v1', 'quiz:kawaii_jlpt_quiz_data_v1'),
            window.KawaiiDatabase?.mirrorLocalJSON('kawaii_jlpt_weak_words_v1', 'weak-words:kawaii_jlpt_weak_words_v1'),
            window.KawaiiDatabase?.saveAppState('progress_snapshot', {
              wordStats: state.progress.wordStats,
              streak: state.progress.streak,
              bestStreak: state.progress.bestStreak,
              totalPairsMatched: state.progress.totalPairsMatched
            }),
            window.KawaiiDatabase?.saveAppState('preferences_snapshot', state.prefs)
          ]);
        } catch (error) {
          console.warn('[KawaiiDatabase] Initial local data migration failed:', error);
        }
        const sessionSizeSelect = $('sessionSizeSelect');
        if (sessionSizeSelect) {
          sessionSizeSelect.disabled = false;
          sessionSizeSelect.value = String(state.prefs.sessionSize || 10);
        }

        const savedSheetUrl = safeGetLS(STORAGE_SHEET_KEY, DEFAULT_SHEET_URL);
        if (savedSheetUrl) $('sheetUrlInput').value = savedSheetUrl;
        $('autoSyncSheetCheck').checked = state.prefs.autoSyncSheet !== false;

        const savedLevels = Array.isArray(state.prefs.sheetLevels) ? state.prefs.sheetLevels : ['N5', 'N4', 'N3'];
        document.querySelectorAll('.sheet-lvl').forEach(cb => {
          cb.checked = savedLevels.includes(cb.value);
        });

        rebuildKanaDeck();

        const saved = await loadDatasetFromIDB();
        if (saved && Array.isArray(saved.words) && saved.words.length) {
          await applyDataset(saved, false, true);
        } else {
          await applyDataset(SAMPLE_DATASET, false, true);
        }

        if (savedSheetUrl && state.prefs.autoSyncSheet !== false) {
          syncFromGoogleSheets({ silent: true });
        }

        initZenTtsFromCacheOrNetwork(false);
        events.emit('app:ready', {
          version: window.KawaiiApp?.version || '3.1.0',
          wordCount: state.words.length,
          datasetTitle: state.datasetTitle
        });
      }

      window.addEventListener('pagehide', () => { stopAudio(); clearWavCache(); });
      Core.Bootstrap.start().catch((error) => {
        console.error('[Kawaii JLPT Bootstrap]', error);
        events.emit('app:error', { code: 'BOOTSTRAP_FAILED', error });
        showToast('Không thể khởi tạo ứng dụng: ' + (error?.message || 'Lỗi không xác định'), 'error');
      });
    })();
