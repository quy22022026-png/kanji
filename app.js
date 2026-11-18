(() => {
  'use strict';

  const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
  const STORAGE_PROGRESS_KEY = 'jlpt_user_progress_v1';
  const STORAGE_SUPA_KEY = 'jlpt_supabase_cfg_v1';
  const STORAGE_PREFS_KEY = 'jlpt_ui_prefs_v1';
  const IDB_NAME = 'KawaiiJLPTDB';
  const IDB_STORE = 'datasets';
  const ZEN_CACHE_NAME = 'zen-tts-marine-v1.3.0';

  const SAMPLE_DATASET = {
    meta: { title: 'Bộ mẫu N5–N1 Liên kết Kanji', version: '1.0' },
    words: [
      { id: 'n5_taberu', level: 'N5', topic: 'Ẩm thực', kanji: '食べる', furigana: 'たべる', romaji: 'taberu', meaning: 'Ăn', hanViet: 'THỰC', example: { ja: '毎朝パンを食べます。', furi: 'まいあさパンをたべます。', vi: 'Mỗi sáng tôi ăn bánh mì.' }, relatedIds: ['n4_shokuji', 'n3_shokuryou'] },
      { id: 'n5_nomu', level: 'N5', topic: 'Ẩm thực', kanji: '飲む', furigana: 'のむ', romaji: 'nomu', meaning: 'Uống', hanViet: 'ẨM', example: { ja: '冷たい水を飲みます。', furi: 'つめたいみずをのみます。', vi: 'Tôi uống nước lạnh.' } },
      { id: 'n5_mizu', level: 'N5', topic: 'Ẩm thực', kanji: '水', furigana: 'みず', romaji: 'mizu', meaning: 'Nước', hanViet: 'THỦY' },
      { id: 'n5_iku', level: 'N5', topic: 'Di chuyển', kanji: '行く', furigana: 'いく', romaji: 'iku', meaning: 'Đi', hanViet: 'HÀNH', example: { ja: '学校へ行きます。', furi: 'がっこうへいきます。', vi: 'Tôi đi đến trường.' }, relatedIds: ['n4_ryokou', 'n3_koudou'] },
      { id: 'n5_miru', level: 'N5', topic: 'Sinh hoạt', kanji: '見る', furigana: 'みる', romaji: 'miru', meaning: 'Nhìn, xem', hanViet: 'KIẾN', relatedIds: ['n4_iken', 'n3_hakken'] },
      { id: 'n4_shokuji', level: 'N4', topic: 'Ẩm thực', kanji: '食事', furigana: 'しょくじ', romaji: 'shokuji', meaning: 'Bữa ăn, dùng bữa', hanViet: 'THỰC SỰ', relatedIds: ['n5_taberu', 'n3_shokuryou'] },
      { id: 'n4_ryokou', level: 'N4', topic: 'Di chuyển', kanji: '旅行', furigana: 'りょこう', romaji: 'ryokou', meaning: 'Du lịch', hanViet: 'LỮ HÀNH', relatedIds: ['n5_iku', 'n3_koudou'] },
      { id: 'n4_iken', level: 'N4', topic: 'Giao tiếp', kanji: '意見', furigana: 'いけん', romaji: 'iken', meaning: 'Ý kiến', hanViet: 'Ý KIẾN', relatedIds: ['n5_miru', 'n3_hakken'] },
      { id: 'n3_shokuryou', level: 'N3', topic: 'Ẩm thực', kanji: '食料', furigana: 'しょくりょう', romaji: 'shokuryou', meaning: 'Lương thực', hanViet: 'THỰC LIỆU', relatedIds: ['n5_taberu', 'n4_shokuji', 'n2_shokuhin'] },
      { id: 'n3_koudou', level: 'N3', topic: 'Di chuyển', kanji: '行動', furigana: 'こうどう', romaji: 'koudou', meaning: 'Hành động', hanViet: 'HÀNH ĐỘNG', relatedIds: ['n5_iku', 'n4_ryokou'] },
      { id: 'n3_hakken', level: 'N3', topic: 'Học tập', kanji: '発見', furigana: 'はっけん', romaji: 'hakken', meaning: 'Phát hiện', hanViet: 'PHÁT KIẾN', relatedIds: ['n5_miru', 'n4_iken'] },
      { id: 'n2_shokuhin', level: 'N2', topic: 'Ẩm thực', kanji: '食品', furigana: 'しょくひん', romaji: 'shokuhin', meaning: 'Sản phẩm thực phẩm', hanViet: 'THỰC PHẨM', relatedIds: ['n5_taberu', 'n3_shokuryou', 'n1_shokuyoku'] },
      { id: 'n1_shokuyoku', level: 'N1', topic: 'Ẩm thực', kanji: '食欲', furigana: 'しょくよく', romaji: 'shokuyoku', meaning: 'Sự thèm ăn, khẩu vị', hanViet: 'THỰC DỤC', relatedIds: ['n5_taberu', 'n2_shokuhin'] }
    ]
  };

  const state = {
    mode: 'flashcard', // 'flashcard' | 'matching' | 'kana' | 'data'
    datasetTitle: '',
    words: [],
    wordMap: new Map(),
    progress: {
      masteredIds: new Set(),
      streak: 0,
      bestStreak: 0,
      totalPairsMatched: 0
    },
    prefs: {
      level: 'N5',
      topic: 'ALL',
      showFuri: true,
      fcFilter: 'ALL',
      matchSwap: false,
      kanaScript: 'hira',
      kanaGroup: 'seion',
      kanaReadMode: 'CLEAR_MORA',
      zenSpeed: 1.0,
      zenPitch: 0,
      zenHappy: 60
    },
    fcDeck: [],
    fcIndex: 0,
    fcFlipped: false,
    matchRoundPairs: [],
    matchLeftItems: [],
    matchRightItems: [],
    matchSelected: null,
    matchMatchedIds: new Set(),
    matchLocked: false,
    pendingImport: null
  };

  const $ = (id) => document.getElementById(id);

  // ---------- Safe Storage ----------
  function safeGetLS(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function safeSetLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { /* ignore */ }
  }

  function openIDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('No IndexedDB'));
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveDatasetToIDB(payload, key = 'active_dataset') {
    try {
      const db = await openIDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(payload, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      if (key === 'active_dataset') safeSetLS('jlpt_vocab_dataset_fallback', payload);
    }
  }

  async function loadDatasetFromIDB(key = 'active_dataset') {
    try {
      const db = await openIDB();
      const data = await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      if (data) return data;
    } catch { /* fallback */ }
    return key === 'active_dataset' ? safeGetLS('jlpt_vocab_dataset_fallback', null) : null;
  }

  async function clearDatasetIDB() {
    try {
      const db = await openIDB();
      await new Promise((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete('active_dataset');
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    } catch { /* ignore */ }
    try { localStorage.removeItem('jlpt_vocab_dataset_fallback'); } catch {}
  }

  // ---------- Toast & Confirm Modal ----------
  function showToast(message, type = 'info') {
    const colors = {
      info: 'bg-[#332E2E] text-white',
      success: 'bg-matcha-600 text-white',
      error: 'bg-[#E11D48] text-white'
    };
    const el = document.createElement('div');
    el.className = `${colors[type] || colors.info} px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-lg animate-pop max-w-[90vw] text-center`;
    el.textContent = message;
    $('toastContainer').appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s';
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }

  function showConfirm(title, message) {
    return new Promise((resolve) => {
      $('confirmTitle').textContent = title;
      $('confirmMessage').textContent = message;
      $('confirmModal').classList.remove('hidden');

      const cleanup = (result) => {
        $('confirmModal').classList.add('hidden');
        $('confirmOkBtn').onclick = null;
        $('confirmCancelBtn').onclick = null;
        resolve(result);
      };
      $('confirmOkBtn').onclick = () => cleanup(true);
      $('confirmCancelBtn').onclick = () => cleanup(false);
    });
  }

  // ---------- Kana Dataset ----------
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
      KANA_PHONETIC_MAP.set(hira, { hira, clearMora, sampleJa, romaji });
      KANA_PHONETIC_MAP.set(kata, { hira, clearMora, sampleJa, romaji });
    });
  });

  // ---------- ZEN-TTS Marine v1.3.0 Exclusive Engine ----------
  const ZEN_REMOTE_FILES = {
    marineZtm: 'https://tts-models.zenryoku.work/v1.3.0/marine.ztm',
    g2pBin: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models/g2p/g2p.bin',
    g2pJson: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models/g2p/g2p.json',
    cpuWasm: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/cpu/tts-cpu.wasm',
    runtimeEsm: 'https://esm.sh/gh/zenryokukikai/zen-tts@v1.3.0'
  };

  let zenInstance = null;
  let zenWavBlobFn = null;
  let zenLoading = false;
  let currentAudioEl = null;
  const zenWavCache = new Map();

  function updateZenStatusUI(ready, label) {
    const badge = $('badgeZenTts');
    const dot = $('zenStatusDot');
    const modalText = $('zenModalStatusText');
    if (badge) {
      badge.textContent = label;
      badge.className = ready
        ? 'text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-matcha-50 text-matcha-600'
        : 'text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-[#F6EFE8] text-[#786D69]';
    }
    if (dot) {
      dot.className = ready
        ? 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-matcha-500'
        : 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#D1C7BF]';
    }
    if (modalText) modalText.textContent = label;
  }

  async function cacheAndFetch(cache, url) {
    const cached = await cache.match(url);
    if (cached) return cached;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status} khi tải ${url}`);
    await cache.put(url, resp.clone());
    return resp;
  }

  async function initZenTtsFromCacheOrNetwork(autoDownload = false) {
    if (zenInstance) return zenInstance;
    if (zenLoading) return null;
    zenLoading = true;
    try {
      const cache = await caches.open(ZEN_CACHE_NAME);
      if (!autoDownload) {
        const hasMarine = await cache.match(ZEN_REMOTE_FILES.marineZtm);
        if (!hasMarine) {
          updateZenStatusUI(false, 'Chưa nạp');
          return null;
        }
      }

      updateZenStatusUI(false, 'Đang tải Marine...');
      const detailEl = $('zenDownloadDetail');
      if (detailEl) detailEl.textContent = 'Đang tải g2p.bin, tts-cpu.wasm và marine.ztm (~41 MB)...';

      const [marineRes, g2pBinRes, g2pJsonRes, wasmRes] = await Promise.all([
        cacheAndFetch(cache, ZEN_REMOTE_FILES.marineZtm),
        cacheAndFetch(cache, ZEN_REMOTE_FILES.g2pBin),
        cacheAndFetch(cache, ZEN_REMOTE_FILES.g2pJson),
        cacheAndFetch(cache, ZEN_REMOTE_FILES.cpuWasm)
      ]);

      const marineBlobUrl = URL.createObjectURL(await marineRes.blob());
      const wasmBlobUrl = URL.createObjectURL(await wasmRes.blob());
      const g2pBinBlobUrl = URL.createObjectURL(await g2pBinRes.blob());
      const g2pJsonBlobUrl = URL.createObjectURL(await g2pJsonRes.blob());

      // Intercept fetch calls inside ZenTts.load for g2p/g2p.bin and g2p/g2p.json so virtual blob URLs work seamlessly
      const origFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        const u = typeof input === 'string' ? input : (input && input.url) || '';
        if (u.endsWith('/g2p/g2p.bin')) return origFetch(g2pBinBlobUrl, init);
        if (u.endsWith('/g2p/g2p.json')) return origFetch(g2pJsonBlobUrl, init);
        return origFetch(input, init);
      };

      const mod = await import(ZEN_REMOTE_FILES.runtimeEsm);
      const ZenTts = mod.ZenTts;
      zenWavBlobFn = mod.wavBlob;

      zenInstance = await ZenTts.load({
        modelsUrl: `${location.origin}/zen-virtual-models`,
        cpuWasmUrl: wasmBlobUrl,
        model: marineBlobUrl
      });

      window.fetch = origFetch;
      const backendTag = (zenInstance.backend || 'WASM').toUpperCase();
      updateZenStatusUI(true, `Sẵn sàng (${backendTag})`);
      if (detailEl) detailEl.textContent = `✅ Đã nạp ZEN-TTS Marine v1.3.0 (${backendTag}) vào Cache trình duyệt!`;
      showToast(`Đã kích hoạt ZEN-TTS Marine (${backendTag})!`, 'success');
      return zenInstance;
    } catch (err) {
      updateZenStatusUI(false, 'Lỗi nạp Marine');
      const detailEl = $('zenDownloadDetail');
      if (detailEl) detailEl.textContent = `Không tải được tự động (${err.message}). Hãy thử nạp từ thư mục đã tải sẵn.`;
      showToast('Không thể tải ZEN-TTS Marine: ' + err.message, 'error');
      return null;
    } finally {
      zenLoading = false;
    }
  }

  async function initZenTtsFromLocalFiles(fileList) {
    const files = Array.from(fileList || []);
    const findFile = (suffix) => files.find(f => f.name === suffix || (f.webkitRelativePath && f.webkitRelativePath.endsWith(suffix)));
    const marineFile = findFile('marine.ztm');
    const g2pBinFile = findFile('g2p.bin');
    const g2pJsonFile = findFile('g2p.json');
    const wasmFile = findFile('tts-cpu.wasm');

    if (!marineFile || !g2pBinFile || !wasmFile) {
      showToast('Thư mục thiếu marine.ztm, g2p.bin hoặc tts-cpu.wasm.', 'error');
      return;
    }
    try {
      const cache = await caches.open(ZEN_CACHE_NAME);
      await cache.put(ZEN_REMOTE_FILES.marineZtm, new Response(marineFile));
      await cache.put(ZEN_REMOTE_FILES.g2pBin, new Response(g2pBinFile));
      if (g2pJsonFile) await cache.put(ZEN_REMOTE_FILES.g2pJson, new Response(g2pJsonFile));
      await cache.put(ZEN_REMOTE_FILES.cpuWasm, new Response(wasmFile));
      zenInstance = null;
      await initZenTtsFromCacheOrNetwork(false);
    } catch (err) {
      showToast('Lỗi đọc thư mục Marine: ' + err.message, 'error');
    }
  }

  async function speakWithZenMarine(text) {
    if (!text) return;
    const happy = Number(state.prefs.zenHappy) || 60;
    const neutral = Math.max(0, 100 - happy);
    const speed = Number(state.prefs.zenSpeed) || 1.0;
    const pitch = Number(state.prefs.zenPitch) || 0;
    const cacheKey = `${speed}:${pitch}:${happy}:${text}`;

    if (zenWavCache.has(cacheKey)) {
      try {
        if (currentAudioEl) currentAudioEl.pause();
        const a = new Audio(zenWavCache.get(cacheKey));
        currentAudioEl = a;
        await a.play();
        return;
      } catch { /* fallback */ }
    }

    if (!zenInstance) {
      showToast('Hãy nạp mô-đun ZEN-TTS Marine v1.3.0 trong mục 📦 Mô-đun hoặc 🎧 trước nhé!', 'info');
      return;
    }

    try {
      const res = await zenInstance.speak(text, {
        emotion: { happy, neutral },
        speed,
        pitch
      });
      const blob = zenWavBlobFn(res.audio);
      const url = URL.createObjectURL(blob);
      zenWavCache.set(cacheKey, url);

      if (currentAudioEl) currentAudioEl.pause();
      const audio = new Audio(url);
      currentAudioEl = audio;
      await audio.play();
    } catch (err) {
      showToast('Lỗi tổng hợp âm thanh ZEN-TTS: ' + err.message, 'error');
    }
  }

  function speakKanaItem(hira) {
    const info = KANA_PHONETIC_MAP.get(hira);
    const mode = state.prefs.kanaReadMode || 'CLEAR_MORA';
    const text = info
      ? (mode === 'WITH_WORD' ? `${info.clearMora}。${info.sampleJa}。` : `${info.clearMora}。`)
      : `${hira}ー。`;
    speakWithZenMarine(text);
  }

  function speakJapanese(word) {
    if (!word) return;
    if (word.audioUrl) {
      try {
        if (currentAudioEl) currentAudioEl.pause();
        currentAudioEl = new Audio(word.audioUrl);
        currentAudioEl.play().catch(() => speakWithZenMarine(word.furigana || word.kanji));
        return;
      } catch { /* fallback */ }
    }
    speakWithZenMarine(word.furigana || word.kanji);
  }

  // ---------- OpenJLPT + dreamofi Module Downloader & Merger ----------
  function normalizeOpenJlptItem(item, fallbackLevel) {
    const kanji = String(item.word || item.kanji || item.expression || '').trim();
    const furigana = String(item.reading || item.furigana || kanji).trim();
    const glosses = Array.isArray(item.glosses) ? item.glosses.join('; ') : String(item.meaning || item.english || '').trim();
    const level = String(item.level || fallbackLevel || 'N5').toUpperCase();
    const pos = Array.isArray(item.pos) && item.pos.length ? item.pos[0] : (item.topic || 'Chung');

    let exampleObj = null;
    if (Array.isArray(item.examples) && item.examples.length > 0) {
      const ex = item.examples[0];
      exampleObj = {
        ja: ex.ja || ex.sentence || '',
        furi: ex.reading || '',
        vi: ex.en || ex.translation || ''
      };
    }

    return {
      id: String(item.id || `${level.toLowerCase()}_${kanji}_${furigana}`),
      level: LEVELS.includes(level) ? level : 'N5',
      topic: String(pos),
      kanji,
      furigana,
      romaji: String(item.romaji || ''),
      meaning: glosses || kanji,
      enMeaning: glosses,
      hanViet: '',
      example: exampleObj,
      relatedIds: []
    };
  }

  async function downloadOpenJLPTFromGitHub() {
    const checked = Array.from(document.querySelectorAll('.ojlpt-lvl:checked')).map(el => el.value);
    if (!checked.length) {
      showToast('Hãy chọn ít nhất 1 cấp độ JLPT để tải!', 'error');
      return;
    }
    const badge = $('badgeOpenJLPT');
    const btn = $('btnDownloadOpenJLPT');
    badge.textContent = 'Đang tải...';
    btn.disabled = true;

    try {
      const allWords = [];
      for (const lvl of checked) {
        const url = `https://cdn.jsdelivr.net/gh/evanclan/OpenJLPT@main/data/json/vocab/${lvl}.json`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`Không tải được ${lvl}.json (HTTP ${resp.status})`);
        const raw = await resp.json();
        const arr = Array.isArray(raw) ? raw : (raw.words || raw.entries || []);
        arr.forEach(item => allWords.push(normalizeOpenJlptItem(item, lvl.toUpperCase())));
      }

      const dataset = { meta: { title: 'OpenJLPT (N5–N1)' }, words: allWords };
      await saveDatasetToIDB(dataset, 'openjlpt_raw');
      await applyDataset(dataset, true);

      badge.textContent = `${allWords.length} từ`;
      badge.className = 'text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-matcha-50 text-matcha-600';
      showToast(`Đã tải ${allWords.length} từ OpenJLPT! Bấm tải Từ điển dreamofi để dịch Việt nhé.`, 'success');
    } catch (err) {
      badge.textContent = 'Lỗi tải';
      showToast('Lỗi tải OpenJLPT: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async function parseDreamofiZipAndMerge(zipArrayBuffer) {
    if (!window.JSZip) throw new Error('Thiếu thư viện JSZip');
    const zip = await window.JSZip.loadAsync(zipArrayBuffer);
    const termMap = new Map();
    const kanjiMap = new Map();

    const fileNames = Object.keys(zip.files);
    for (const fname of fileNames) {
      if (fname.includes('term_bank_') && fname.endsWith('.json')) {
        const content = await zip.files[fname].async('string');
        const entries = JSON.parse(content);
        for (const row of entries) {
          // Yomichan term_bank format: [expression, reading, definitionTags, rules, score, glossaryArray, sequence, termTags]
          const expr = String(row[0] || '').trim();
          const read = String(row[1] || expr).trim();
          const glossArr = Array.isArray(row[5]) ? row[5] : [String(row[5] || '')];
          const viMeanings = glossArr
            .map(g => (typeof g === 'string' ? g : (g && g.text) || ''))
            .filter(Boolean)
            .slice(0, 3)
            .join('; ');
          if (!viMeanings) continue;
          const keyBoth = `${expr}|${read}`;
          if (!termMap.has(keyBoth)) termMap.set(keyBoth, viMeanings);
          if (!termMap.has(expr)) termMap.set(expr, viMeanings);
        }
      } else if (fname.includes('kanji_bank_') && fname.endsWith('.json')) {
        const content = await zip.files[fname].async('string');
        const entries = JSON.parse(content);
        for (const row of entries) {
          // Yomichan kanji_bank format: [character, onyomi, kunyomi, tags, meaningsArray, stats]
          const ch = String(row[0] || '').trim();
          const meanings = Array.isArray(row[4]) ? row[4].join(', ') : '';
          if (ch && meanings && !kanjiMap.has(ch)) {
            kanjiMap.set(ch, meanings);
          }
        }
      }
    }

    const targetWords = state.words.length ? state.words : ((await loadDatasetFromIDB('openjlpt_raw'))?.words || []);
    if (!targetWords.length) {
      throw new Error('Hãy tải OpenJLPT (Bước 1) trước khi ghép từ điển dreamofi!');
    }

    let matchedCount = 0;
    const mergedWords = targetWords.map(w => {
      const vi = termMap.get(`${w.kanji}|${w.furigana}`) || termMap.get(w.kanji) || termMap.get(w.furigana);
      let hv = w.hanViet || '';
      if (!hv && kanjiMap.size > 0) {
        const ks = extractKanjiChars(w.kanji);
        const hvParts = ks.map(k => kanjiMap.get(k)).filter(Boolean);
        if (hvParts.length) hv = hvParts.join(' · ');
      }
      if (vi) matchedCount++;
      return {
        ...w,
        meaning: vi || w.meaning,
        hanViet: hv
      };
    });

    const dataset = { meta: { title: 'OpenJLPT × Từ điển Việt dreamofi' }, words: mergedWords };
    await applyDataset(dataset, true);

    const badge = $('badgeDreamofi');
    badge.textContent = `Khớp ${matchedCount}/${mergedWords.length}`;
    badge.className = 'text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-matcha-50 text-matcha-600';
    showToast(`Đã dịch Việt thành công ${matchedCount}/${mergedWords.length} từ!`, 'success');
  }

  async function downloadDreamofiFromGitHub() {
    const badge = $('badgeDreamofi');
    const btn = $('btnDownloadDreamofi');
    badge.textContent = 'Đang tải...';
    btn.disabled = true;

    try {
      const apiResp = await fetch('https://api.github.com/repos/dreamofi/yomichan-Vietnamese-dictionary/contents/vietnameseDict');
      if (!apiResp.ok) throw new Error('Không truy cập được thư mục vietnameseDict trên GitHub');
      const items = await apiResp.json();
      const zipFiles = items.filter(it => it.name && it.name.toLowerCase().endsWith('.zip'));
      if (!zipFiles.length) throw new Error('Không tìm thấy file .zip trong vietnameseDict');

      // Prefer jmdict zip first, then merge any kanjidic zip if present
      for (const zf of zipFiles) {
        const cdnUrl = `https://cdn.jsdelivr.net/gh/dreamofi/yomichan-Vietnamese-dictionary@master/vietnameseDict/${encodeURIComponent(zf.name)}`;
        const zResp = await fetch(cdnUrl);
        if (!zResp.ok) continue;
        const buf = await zResp.arrayBuffer();
        await parseDreamofiZipAndMerge(buf);
      }
    } catch (err) {
      badge.textContent = 'Lỗi tải';
      showToast('Lỗi tải từ điển dreamofi: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- Kanji Cross-Level Linking ----------
  function extractKanjiChars(str) {
    if (!str) return [];
    const matches = str.match(/[\u4E00-\u9FAF]/g);
    return matches ? [...new Set(matches)] : [];
  }

  function getRelatedWords(word) {
    if (!word) return [];
    const relatedMap = new Map();
    if (Array.isArray(word.relatedIds)) {
      word.relatedIds.forEach(rid => {
        const target = state.wordMap.get(rid);
        if (target && target.id !== word.id) relatedMap.set(target.id, target);
      });
    }
    const kanjis = extractKanjiChars(word.kanji);
    if (kanjis.length > 0) {
      for (const w of state.words) {
        if (w.id === word.id || w.level === word.level) continue;
        if (kanjis.some(k => w.kanji.includes(k))) {
          relatedMap.set(w.id, w);
          if (relatedMap.size >= 6) break;
        }
      }
    }
    return Array.from(relatedMap.values()).slice(0, 5);
  }

  // ---------- Schema Validator ----------
  function validateVocabJson(rawInput) {
    let parsed;
    try {
      parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput;
    } catch (err) {
      return { ok: false, error: 'Mã JSON không hợp lệ: ' + err.message };
    }
    const list = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.words) ? parsed.words : null);
    if (!list || list.length === 0) {
      return { ok: false, error: 'JSON phải là mảng từ vựng hoặc object có "words": [...].' };
    }
    const normalized = [];
    const seenIds = new Set();
    const levelCounts = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    const topics = new Set();

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      if (!item || typeof item !== 'object') continue;
      if (item.word && Array.isArray(item.glosses)) {
        const w = normalizeOpenJlptItem(item, 'N5');
        if (!seenIds.has(w.id)) {
          seenIds.add(w.id);
          levelCounts[w.level]++;
          topics.add(w.topic);
          normalized.push(w);
        }
        continue;
      }
      const id = String(item.id || `w_${i + 1}`).trim();
      const level = String(item.level || '').toUpperCase().trim();
      const kanji = String(item.kanji || item.word || '').trim();
      const furigana = String(item.furigana || item.reading || '').trim();
      const meaning = String(item.meaning || '').trim();
      if (!LEVELS.includes(level) || !kanji || !furigana || !meaning) {
        return { ok: false, error: `Mục #${i + 1} (${kanji || id}) thiếu trường bắt buộc (level, kanji, furigana, meaning).` };
      }
      if (seenIds.has(id)) continue;
      seenIds.add(id);
      const topic = String(item.topic || 'Chung').trim() || 'Chung';
      levelCounts[level]++;
      topics.add(topic);
      normalized.push({
        id,
        level,
        topic,
        kanji,
        furigana,
        romaji: String(item.romaji || '').trim(),
        meaning,
        hanViet: String(item.hanViet || item.han_viet || '').trim(),
        example: item.example && typeof item.example === 'object' ? item.example : null,
        relatedIds: Array.isArray(item.relatedIds) ? item.relatedIds : (Array.isArray(item.related_ids) ? item.related_ids : []),
        audioUrl: item.audioUrl || item.audio_url || null
      });
    }
    const title = (parsed.meta && parsed.meta.title) ? String(parsed.meta.title) : `Bộ từ vựng (${normalized.length} từ)`;
    return {
      ok: true,
      dataset: { meta: { title }, words: normalized },
      stats: { total: normalized.length, levelCounts, topicCount: topics.size }
    };
  }

  // ---------- Progress & Prefs ----------
  function saveProgress() {
    safeSetLS(STORAGE_PROGRESS_KEY, {
      masteredIds: Array.from(state.progress.masteredIds),
      streak: state.progress.streak,
      bestStreak: state.progress.bestStreak,
      totalPairsMatched: state.progress.totalPairsMatched
    });
  }

  function loadProgress() {
    const p = safeGetLS(STORAGE_PROGRESS_KEY, null);
    if (p) {
      state.progress.masteredIds = new Set(Array.isArray(p.masteredIds) ? p.masteredIds : []);
      state.progress.streak = Number(p.streak) || 0;
      state.progress.bestStreak = Number(p.bestStreak) || 0;
      state.progress.totalPairsMatched = Number(p.totalPairsMatched) || 0;
    }
  }

  function savePrefs() { safeSetLS(STORAGE_PREFS_KEY, state.prefs); }

  function loadPrefs() {
    const pr = safeGetLS(STORAGE_PREFS_KEY, null);
    if (pr) {
      if (LEVELS.includes(pr.level)) state.prefs.level = pr.level;
      if (typeof pr.topic === 'string') state.prefs.topic = pr.topic;
      if (typeof pr.showFuri === 'boolean') state.prefs.showFuri = pr.showFuri;
      if (typeof pr.matchSwap === 'boolean') state.prefs.matchSwap = pr.matchSwap;
      if (pr.kanaScript === 'hira' || pr.kanaScript === 'kata') state.prefs.kanaScript = pr.kanaScript;
      if (['seion', 'dakuon', 'yoon'].includes(pr.kanaGroup)) state.prefs.kanaGroup = pr.kanaGroup;
      if (['CLEAR_MORA', 'WITH_WORD'].includes(pr.kanaReadMode)) state.prefs.kanaReadMode = pr.kanaReadMode;
      if (typeof pr.zenSpeed === 'number') state.prefs.zenSpeed = pr.zenSpeed;
      if (typeof pr.zenPitch === 'number') state.prefs.zenPitch = pr.zenPitch;
      if (typeof pr.zenHappy === 'number') state.prefs.zenHappy = pr.zenHappy;
    }
  }

  async function applyDataset(dataset, persist = true) {
    state.datasetTitle = (dataset.meta && dataset.meta.title) || 'Bộ từ vựng JLPT';
    state.words = dataset.words || [];
    state.wordMap = new Map(state.words.map(w => [w.id, w]));
    if (persist) await saveDatasetToIDB(dataset, 'active_dataset');

    const currentCount = state.words.filter(w => w.level === state.prefs.level).length;
    if (currentCount === 0 && state.words.length > 0) {
      const firstNonEmpty = LEVELS.find(lvl => state.words.some(w => w.level === lvl));
      if (firstNonEmpty) state.prefs.level = firstNonEmpty;
    }
    state.prefs.topic = 'ALL';
    savePrefs();
    rebuildTopicOptions();
    rebuildFlashcardDeck();
    initMatchingRound();
    renderAll();
  }

  function getFilteredWords(ignoreFcFilter = false) {
    return state.words.filter(w => {
      if (w.level !== state.prefs.level) return false;
      if (state.prefs.topic !== 'ALL' && w.topic !== state.prefs.topic) return false;
      if (!ignoreFcFilter) {
        const isMastered = state.progress.masteredIds.has(w.id);
        if (state.prefs.fcFilter === 'MASTERED' && !isMastered) return false;
        if (state.prefs.fcFilter === 'UNMASTERED' && isMastered) return false;
      }
      return true;
    });
  }

  // ---------- Render Header ----------
  function renderHeader() {
    $('headerDatasetLabel').textContent = state.words.length
      ? `${state.datasetTitle} (${state.words.length} từ)`
      : 'Chưa tải dữ liệu từ vựng';

    document.querySelectorAll('.mode-tab').forEach(btn => {
      const active = btn.dataset.mode === state.mode;
      btn.className = active
        ? 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1 bg-white text-[#FB6F92] shadow-sm'
        : 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 text-[#786D69] hover:text-[#332E2E]';
    });

    const showStatus = (state.mode === 'flashcard' || state.mode === 'matching') && state.words.length > 0;
    $('studyStatusBar').classList.toggle('hidden', !showStatus);

    const pillsEl = $('levelPills');
    pillsEl.innerHTML = '';
    LEVELS.forEach(lvl => {
      const lvlWords = state.words.filter(w => w.level === lvl);
      const masteredCount = lvlWords.filter(w => state.progress.masteredIds.has(w.id)).length;
      const pct = lvlWords.length ? Math.round((masteredCount / lvlWords.length) * 100) : 0;
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
        savePrefs();
        rebuildTopicOptions();
        rebuildFlashcardDeck();
        initMatchingRound();
        renderAll();
      };
      pillsEl.appendChild(btn);
    });

    const curWords = state.words.filter(w => w.level === state.prefs.level);
    const curMastered = curWords.filter(w => state.progress.masteredIds.has(w.id)).length;
    const curPct = curWords.length ? Math.round((curMastered / curWords.length) * 100) : 0;
    $('levelProgressFill').style.width = `${curPct}%`;
    $('levelProgressText').textContent = `JLPT ${state.prefs.level} — ${curMastered}/${curWords.length} thuộc`;

    const furiOn = state.prefs.showFuri;
    $('furiToggleBtn').className = furiOn
      ? 'px-2.5 py-1.5 rounded-xl text-xs font-extrabold border border-[#FF8FA3] bg-peach-50 text-[#FB6F92] transition-all flex items-center gap-1.5 shrink-0'
      : 'px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[#E8DFD6] bg-white text-[#8C7F7A] transition-all flex items-center gap-1.5 shrink-0';
    $('furiDot').className = furiOn ? 'w-2 h-2 rounded-full bg-[#FB6F92]' : 'w-2 h-2 rounded-full bg-[#D1C7BF]';
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
  }

  // ---------- Flashcard Mode ----------
  function rebuildFlashcardDeck(shuffle = false) {
    let deck = getFilteredWords(false);
    if (shuffle) deck = [...deck].sort(() => Math.random() - 0.5);
    state.fcDeck = deck;
    state.fcIndex = 0;
    state.fcFlipped = false;
  }

  function renderFlashcard() {
    document.querySelectorAll('.fc-filter-btn').forEach(btn => {
      const active = btn.dataset.filter === state.prefs.fcFilter;
      btn.className = active
        ? 'fc-filter-btn px-3 py-1 rounded-xl transition bg-white text-[#332E2E] shadow-sm'
        : 'fc-filter-btn px-3 py-1 rounded-xl transition text-[#786D69]';
    });

    const total = state.fcDeck.length;
    $('fcCounter').textContent = total ? `${state.fcIndex + 1} / ${total}` : '0 / 0';
    if (!total) {
      $('fcPerspective').classList.add('hidden');
      $('fcEmptyFilter').classList.remove('hidden');
      return;
    }
    $('fcPerspective').classList.remove('hidden');
    $('fcEmptyFilter').classList.add('hidden');

    const word = state.fcDeck[state.fcIndex];
    $('fcInner').classList.toggle('is-flipped', state.fcFlipped);
    $('fcLevelBadge').textContent = word.level;
    $('fcTopicBadge').textContent = word.topic;
    $('fcMasteredBadge').classList.toggle('hidden', !state.progress.masteredIds.has(word.id));

    $('fcKanji').textContent = word.kanji;
    $('fcFurigana').textContent = state.prefs.showFuri ? word.furigana : '';
    $('fcFurigana').style.opacity = state.prefs.showFuri ? '1' : '0';
    $('fcRomaji').textContent = state.prefs.showFuri && word.romaji ? `/${word.romaji}/` : '';
    $('fcHanViet').textContent = word.hanViet ? `Hán Việt: ${word.hanViet}` : '';

    $('fcBackWordMini').textContent = state.prefs.showFuri ? `${word.kanji}（${word.furigana}）` : word.kanji;
    $('fcMeaning').textContent = word.meaning;

    if (word.example && word.example.ja) {
      $('fcExampleBox').classList.remove('hidden');
      $('fcExJa').textContent = word.example.ja;
      $('fcExFuri').textContent = state.prefs.showFuri && word.example.furi ? word.example.furi : '';
      $('fcExVi').textContent = word.example.vi || '';
    } else {
      $('fcExampleBox').classList.add('hidden');
    }

    const related = getRelatedWords(word);
    if (related.length > 0) {
      $('fcRelatedBox').classList.remove('hidden');
      const listEl = $('fcRelatedList');
      listEl.innerHTML = '';
      related.forEach(rw => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'px-2.5 py-1 rounded-xl bg-white border border-[#E8DFD6] hover:border-[#FF8FA3] text-xs font-bold text-[#4A4240] flex items-center gap-1 transition';
        chip.innerHTML = `<span class="text-[10px] font-extrabold text-[#FB6F92]">${rw.level}</span><span class="font-jp">${escapeHtml(rw.kanji)}</span><span class="text-[#8C7F7A]">(${escapeHtml(rw.meaning)})</span>`;
        chip.onclick = (e) => {
          e.stopPropagation();
          state.prefs.level = rw.level;
          state.prefs.topic = 'ALL';
          state.prefs.fcFilter = 'ALL';
          savePrefs();
          rebuildTopicOptions();
          rebuildFlashcardDeck();
          const targetIdx = state.fcDeck.findIndex(item => item.id === rw.id);
          if (targetIdx >= 0) state.fcIndex = targetIdx;
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
    if (!state.fcDeck.length) return;
    state.fcFlipped = !state.fcFlipped;
    $('fcInner').classList.toggle('is-flipped', state.fcFlipped);
    if (state.fcFlipped) speakJapanese(state.fcDeck[state.fcIndex]);
  }

  function markFlashcard(mastered) {
    if (!state.fcDeck.length) return;
    const word = state.fcDeck[state.fcIndex];
    if (mastered) {
      state.progress.masteredIds.add(word.id);
      showToast(`Đã thuộc "${word.kanji}" 🎉`, 'success');
    } else {
      state.progress.masteredIds.delete(word.id);
    }
    saveProgress();
    if (state.prefs.fcFilter !== 'ALL') rebuildFlashcardDeck();
    else {
      state.fcIndex = (state.fcIndex + 1) % state.fcDeck.length;
      state.fcFlipped = false;
    }
    renderHeader();
    renderFlashcard();
  }

  function goNextCard() {
    if (!state.fcDeck.length) return;
    const cardEl = $('fcPerspective');
    cardEl.style.transition = 'transform 0.16s ease-out, opacity 0.16s ease-out';
    cardEl.style.transform = 'translateX(-42px)';
    cardEl.style.opacity = '0.35';
    setTimeout(() => {
      state.fcIndex = (state.fcIndex + 1) % state.fcDeck.length;
      state.fcFlipped = false;
      renderFlashcard();
      cardEl.style.transition = 'none';
      cardEl.style.transform = 'translateX(42px)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cardEl.style.transition = 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease-out';
        cardEl.style.transform = 'translateX(0)';
        cardEl.style.opacity = '1';
      }));
    }, 140);
  }

  function goPrevCard() {
    if (!state.fcDeck.length) return;
    const cardEl = $('fcPerspective');
    cardEl.style.transition = 'transform 0.16s ease-out, opacity 0.16s ease-out';
    cardEl.style.transform = 'translateX(42px)';
    cardEl.style.opacity = '0.35';
    setTimeout(() => {
      state.fcIndex = (state.fcIndex - 1 + state.fcDeck.length) % state.fcDeck.length;
      state.fcFlipped = false;
      renderFlashcard();
      cardEl.style.transition = 'none';
      cardEl.style.transform = 'translateX(-42px)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cardEl.style.transition = 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease-out';
        cardEl.style.transform = 'translateX(0)';
        cardEl.style.opacity = '1';
      }));
    }, 140);
  }

  // ---------- Pair Matching Mode ----------
  function initMatchingRound() {
    const pool = getFilteredWords(true);
    if (!pool.length) { state.matchRoundPairs = []; return; }
    const unmastered = pool.filter(w => !state.progress.masteredIds.has(w.id));
    const mastered = pool.filter(w => state.progress.masteredIds.has(w.id));
    const combined = [...unmastered.sort(() => Math.random() - 0.5), ...mastered.sort(() => Math.random() - 0.5)];
    const chosen = combined.slice(0, Math.min(5, combined.length));
    state.matchRoundPairs = chosen;
    state.matchMatchedIds = new Set();
    state.matchSelected = null;
    state.matchLocked = false;
    state.matchLeftItems = [...chosen].sort(() => Math.random() - 0.5);
    state.matchRightItems = [...chosen].sort(() => Math.random() - 0.5);
  }

  function renderMatching() {
    const totalPairs = state.matchRoundPairs.length;
    const matchedCount = state.matchMatchedIds.size;
    $('matchPairCounter').textContent = `${matchedCount}/${totalPairs} cặp`;
    $('matchProgressFill').style.width = totalPairs ? `${(matchedCount / totalPairs) * 100}%` : '0%';
    $('matchStreakBadge').textContent = `⚡ ${state.progress.streak}`;
    $('matchDirectionLabel').textContent = state.prefs.matchSwap ? 'Việt ⇄ Nhật' : 'Nhật ⇄ Việt';
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
      const btn = document.createElement('button');
      btn.type = 'button';

      let cls = 'w-full min-h-[68px] sm:min-h-[76px] p-3 sm:p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center shadow-sm ';
      if (isMatched) { cls += 'bg-matcha-50 border-matcha-400 text-matcha-600 opacity-45 cursor-default'; btn.disabled = true; }
      else if (isSelected) cls += 'bg-skysoft-50 border-skysoft-500 text-[#1D4ED8] scale-[1.02]';
      else cls += 'bg-white border-[#F1ECE6] hover:border-[#FF8FA3] text-[#332E2E] active:scale-[0.98]';
      btn.className = cls;

      if (isJapanese) {
        const furiHtml = state.prefs.showFuri ? `<span class="font-jp text-[11px] sm:text-xs font-bold text-[#FB6F92] mt-0.5">${escapeHtml(word.furigana)}</span>` : '';
        btn.innerHTML = `<span class="font-jp text-lg sm:text-xl font-extrabold leading-tight">${escapeHtml(word.kanji)}</span>${furiHtml}`;
      } else {
        btn.innerHTML = `<span class="text-xs sm:text-sm font-extrabold leading-snug line-clamp-2">${escapeHtml(word.meaning)}</span>`;
      }
      btn.onclick = () => handleMatchClick(word, side, btn, isJapanese);
      return btn;
    };

    state.matchLeftItems.forEach(w => leftCol.appendChild(buildCard(w, 'left')));
    state.matchRightItems.forEach(w => rightCol.appendChild(buildCard(w, 'right')));
  }

  function handleMatchClick(word, side, btnEl, isJapanese) {
    if (state.matchLocked || state.matchMatchedIds.has(word.id)) return;
    if (isJapanese) speakJapanese(word);

    if (state.matchSelected && state.matchSelected.side === side && state.matchSelected.id === word.id) {
      state.matchSelected = null;
      renderMatching();
      return;
    }
    if (!state.matchSelected || state.matchSelected.side === side) {
      state.matchSelected = { side, id: word.id, el: btnEl };
      renderMatching();
      return;
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
      saveProgress();
      const applyErr = (el) => {
        el.classList.remove('bg-skysoft-50', 'border-skysoft-500', 'bg-white', 'border-[#F1ECE6]');
        el.classList.add('bg-[#FFF1F2]', 'border-[#FB7185]', 'animate-shake');
      };
      applyErr(first.el);
      applyErr(btnEl);
      $('matchStreakBadge').textContent = '⚡ 0';
      setTimeout(() => {
        state.matchSelected = null;
        state.matchLocked = false;
        renderMatching();
      }, 420);
    }
  }

  // ---------- Kana Render ----------
  function renderKana() {
    const isHira = state.prefs.kanaScript === 'hira';
    $('kanaScriptHira').className = isHira ? 'px-3 py-1.5 rounded-xl bg-white text-[#FB6F92] shadow-sm transition' : 'px-3 py-1.5 rounded-xl text-[#786D69] transition';
    $('kanaScriptKata').className = !isHira ? 'px-3 py-1.5 rounded-xl bg-white text-[#FB6F92] shadow-sm transition' : 'px-3 py-1.5 rounded-xl text-[#786D69] transition';

    const isWithWord = state.prefs.kanaReadMode === 'WITH_WORD';
    $('kanaModeQuickLabel').textContent = isWithWord ? 'Âm + Từ mẫu' : 'Âm chuẩn rõ';
    $('kanaModeQuickBtn').className = isWithWord
      ? 'px-3 py-1.5 rounded-2xl bg-peach-50 border border-[#FF8FA3] text-[#FB6F92] text-xs font-extrabold transition flex items-center gap-1.5'
      : 'px-3 py-1.5 rounded-2xl bg-matcha-50 border border-[#A7F3D0] text-matcha-600 text-xs font-extrabold transition flex items-center gap-1.5';

    document.querySelectorAll('.kana-group-btn').forEach(btn => {
      const active = btn.dataset.kgroup === state.prefs.kanaGroup;
      btn.className = active ? 'kana-group-btn px-2.5 py-1.5 rounded-xl bg-white text-[#332E2E] shadow-sm transition' : 'kana-group-btn px-2.5 py-1.5 rounded-xl text-[#786D69] transition';
    });

    const grid = $('kanaGrid');
    const group = state.prefs.kanaGroup;
    const items = KANA_DATA[group] || KANA_DATA.seion;
    grid.className = group === 'yoon' ? 'grid grid-cols-3 gap-2 sm:gap-3' : 'grid grid-cols-5 gap-2 sm:gap-3';
    grid.innerHTML = '';

    items.forEach(cell => {
      if (!cell) {
        const empty = document.createElement('div');
        empty.className = 'rounded-2xl bg-[#FAF6F2]/60 border border-dashed border-[#EDE5DC] min-h-[72px] sm:min-h-[84px]';
        grid.appendChild(empty);
        return;
      }
      const [hira, kata, romaji, clearMora, sampleJa] = cell;
      const mainChar = isHira ? hira : kata;
      const subChar = isHira ? kata : hira;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'group rounded-2xl bg-[#FFFDF9] hover:bg-peach-50 border border-[#F1ECE6] hover:border-[#FF8FA3] p-2 sm:p-3 min-h-[72px] sm:min-h-[84px] flex flex-col items-center justify-center transition-all active:scale-95 shadow-xs';
      btn.innerHTML = `
        <div class="flex items-baseline gap-1">
          <span class="font-jp text-xl sm:text-2xl font-extrabold text-[#2B2626] group-hover:text-[#FB6F92] transition">${mainChar}</span>
          <span class="font-jp text-[11px] font-bold text-[#B0A39E]">${subChar}</span>
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

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showValidationResult(res) {
    const box = $('validationPreview');
    box.classList.remove('hidden');
    if (!res.ok) {
      state.pendingImport = null;
      box.className = 'rounded-2xl p-3.5 text-xs border bg-[#FFF1F2] border-[#FECDD3] text-[#BE123C]';
      box.innerHTML = `<p class="font-extrabold mb-1">❌ Lỗi dữ liệu JSON</p><p>${escapeHtml(res.error)}</p>`;
      return;
    }
    state.pendingImport = res.dataset;
    const { levelCounts, total, topicCount } = res.stats;
    box.className = 'rounded-2xl p-3.5 text-xs border bg-matcha-50 border-[#A7F3D0] text-[#065F46] flex flex-col gap-2';
    box.innerHTML = `
      <p class="font-extrabold">✅ Hợp lệ! Sẵn sàng nạp <strong>${total}</strong> từ (${topicCount} chủ đề)</p>
      <div class="flex flex-wrap gap-1.5">${LEVELS.map(l => `<span class="px-2 py-0.5 rounded-lg bg-white font-bold">${l}: ${levelCounts[l]}</span>`).join('')}</div>
      <button id="btnConfirmImportJson" class="mt-1 py-2 px-3 rounded-xl bg-matcha-600 text-white font-extrabold hover:bg-matcha-500 transition">💾 Xác nhận lưu bộ từ vựng này</button>
    `;
    $('btnConfirmImportJson').onclick = async () => {
      if (!state.pendingImport) return;
      await applyDataset(state.pendingImport, true);
      box.classList.add('hidden');
      state.mode = 'flashcard';
      renderAll();
      showToast(`Đã nạp ${total} từ vựng thành công!`, 'success');
    };
  }

  function renderDataStats() {
    const grid = $('dataStatsGrid');
    grid.innerHTML = '';
    LEVELS.forEach(lvl => {
      const words = state.words.filter(w => w.level === lvl);
      const mastered = words.filter(w => state.progress.masteredIds.has(w.id)).length;
      const card = document.createElement('div');
      card.className = 'rounded-2xl bg-[#FFFDF9] border border-[#F1ECE6] p-3 text-center';
      card.innerHTML = `
        <p class="text-xs font-extrabold text-[#FB6F92]">${lvl}</p>
        <p class="text-lg font-extrabold text-[#332E2E]">${words.length} <span class="text-xs font-semibold text-[#8C7F7A]">từ</span></p>
        <p class="text-[11px] font-bold text-matcha-600">${mastered} đã thuộc</p>
      `;
      grid.appendChild(card);
    });
  }

  async function supabaseFetch(path, options = {}) {
    const url = $('supaUrlInput').value.trim().replace(/\/$/, '');
    const key = $('supaKeyInput').value.trim();
    if (!url || !key) throw new Error('Vui lòng nhập Supabase URL và Anon Key.');
    safeSetLS(STORAGE_SUPA_KEY, { url, key, userKey: $('supaUserKeyInput').value.trim() || 'default_learner' });
    const resp = await fetch(`${url}/rest/v1/${path}`, {
      ...options,
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.status === 204 ? null : resp.json();
  }

  function renderAll() {
    renderHeader();
    const hasWords = state.words.length > 0;
    const isStudyMode = state.mode === 'flashcard' || state.mode === 'matching';
    $('emptyStateView').classList.toggle('hidden', hasWords || !isStudyMode);
    $('flashcardView').classList.toggle('hidden', !hasWords || state.mode !== 'flashcard');
    $('matchingView').classList.toggle('hidden', !hasWords || state.mode !== 'matching');
    $('kanaView').classList.toggle('hidden', state.mode !== 'kana');
    $('dataView').classList.toggle('hidden', state.mode !== 'data');

    if (state.mode === 'flashcard' && hasWords) renderFlashcard();
    if (state.mode === 'matching' && hasWords) renderMatching();
    if (state.mode === 'kana') renderKana();
    if (state.mode === 'data') renderDataStats();
  }

  // ---------- Event Bindings ----------
  document.querySelectorAll('.mode-tab').forEach(btn => {
    btn.onclick = () => { state.mode = btn.dataset.mode; renderAll(); };
  });
  $('topicSelect').onchange = (e) => {
    state.prefs.topic = e.target.value;
    savePrefs();
    rebuildFlashcardDeck();
    initMatchingRound();
    renderAll();
  };
  $('furiToggleBtn').onclick = () => {
    state.prefs.showFuri = !state.prefs.showFuri;
    savePrefs();
    renderAll();
  };

  $('btnQuickSampleEmpty').onclick = async () => {
    await applyDataset(SAMPLE_DATASET, true);
    state.mode = 'flashcard';
    renderAll();
    showToast('Đã nạp bộ mẫu nhỏ!', 'success');
  };
  $('btnGoToDataEmpty').onclick = () => { state.mode = 'data'; renderAll(); };

  // Flashcard Touch Swipe + Tap Flip
  (() => {
    const cardEl = $('fcPerspective');
    let startX = 0, startY = 0, dragging = false, didSwipe = false;
    cardEl.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button') || !state.fcDeck.length) return;
      startX = e.clientX; startY = e.clientY; dragging = true; didSwipe = false;
      cardEl.style.transition = 'none';
    });
    cardEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        cardEl.style.transform = `translateX(${Math.max(-90, Math.min(90, dx * 0.55))}px) rotate(${Math.max(-6, Math.min(6, dx * 0.04))}deg)`;
      }
    });
    const finishSwipe = (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy)) {
        didSwipe = true;
        setTimeout(() => { didSwipe = false; }, 180);
        if (dx < 0) goNextCard(); else goPrevCard();
      } else {
        cardEl.style.transition = 'transform 0.2s ease-out';
        cardEl.style.transform = 'translateX(0) rotate(0deg)';
      }
    };
    cardEl.addEventListener('pointerup', finishSwipe);
    cardEl.addEventListener('pointercancel', () => {
      dragging = false;
      cardEl.style.transition = 'transform 0.2s ease-out';
      cardEl.style.transform = 'translateX(0) rotate(0deg)';
    });
    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('button') || didSwipe) return;
      flipFlashcard();
    });
  })();

  $('fcSpeakFrontBtn').onclick = (e) => { e.stopPropagation(); speakJapanese(state.fcDeck[state.fcIndex]); };
  $('fcSpeakBackBtn').onclick = (e) => { e.stopPropagation(); speakJapanese(state.fcDeck[state.fcIndex]); };
  $('fcMasterBtn').onclick = () => markFlashcard(true);
  $('fcUnmasterBtn').onclick = () => markFlashcard(false);
  $('fcPrevBtn').onclick = () => goPrevCard();
  $('fcNextBtn').onclick = () => goNextCard();
  $('fcShuffleBtn').onclick = () => { rebuildFlashcardDeck(true); renderFlashcard(); showToast('Đã xáo trộn bộ thẻ!', 'info'); };
  document.querySelectorAll('.fc-filter-btn').forEach(btn => {
    btn.onclick = () => { state.prefs.fcFilter = btn.dataset.filter; rebuildFlashcardDeck(); renderFlashcard(); };
  });

  document.addEventListener('keydown', (e) => {
    if (state.mode !== 'flashcard' || !state.fcDeck.length) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); flipFlashcard(); }
    else if (e.code === 'ArrowRight') goNextCard();
    else if (e.code === 'ArrowLeft') goPrevCard();
    else if (e.key === '1') markFlashcard(false);
    else if (e.key === '2') markFlashcard(true);
    else if (e.key.toLowerCase() === 'r') speakJapanese(state.fcDeck[state.fcIndex]);
  });

  $('matchSwapBtn').onclick = () => { state.prefs.matchSwap = !state.prefs.matchSwap; state.matchSelected = null; savePrefs(); renderMatching(); };
  $('matchNewRoundBtn').onclick = () => { initMatchingRound(); renderMatching(); };
  $('matchNextRoundCta').onclick = () => { initMatchingRound(); renderMatching(); };

  $('kanaScriptHira').onclick = () => { state.prefs.kanaScript = 'hira'; savePrefs(); renderKana(); };
  $('kanaScriptKata').onclick = () => { state.prefs.kanaScript = 'kata'; savePrefs(); renderKana(); };
  $('kanaModeQuickBtn').onclick = () => {
    state.prefs.kanaReadMode = state.prefs.kanaReadMode === 'WITH_WORD' ? 'CLEAR_MORA' : 'WITH_WORD';
    savePrefs();
    renderKana();
  };
  document.querySelectorAll('.kana-group-btn').forEach(btn => {
    btn.onclick = () => { state.prefs.kanaGroup = btn.dataset.kgroup; savePrefs(); renderKana(); };
  });

  // Module Downloader Buttons
  $('btnDownloadOpenJLPT').onclick = downloadOpenJLPTFromGitHub;
  $('btnDownloadDreamofi').onclick = downloadDreamofiFromGitHub;
  $('dreamofiZipInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await parseDreamofiZipAndMerge(await file.arrayBuffer());
    } catch (err) {
      showToast(err.message, 'error');
    }
    e.target.value = '';
  };
  $('btnDownloadZenMarine').onclick = () => initZenTtsFromCacheOrNetwork(true);
  $('btnModalDownloadZen').onclick = () => initZenTtsFromCacheOrNetwork(true);
  $('zenLocalFolderInput').onchange = (e) => {
    initZenTtsFromLocalFiles(e.target.files);
    e.target.value = '';
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
    $('audioModal').classList.remove('hidden');
  };
  $('closeAudioModalBtn').onclick = () => $('audioModal').classList.add('hidden');
  $('zenSpeedInput').oninput = (e) => { $('zenSpeedVal').textContent = `${Number(e.target.value).toFixed(2)}x`; };
  $('zenPitchInput').oninput = (e) => { $('zenPitchVal').textContent = `${e.target.value} st`; };
  $('zenHappyInput').oninput = (e) => { $('zenHappyVal').textContent = `${e.target.value}%`; };
  $('testVoiceBtn').onclick = () => {
    state.prefs.kanaReadMode = $('kanaReadModeSelect').value;
    state.prefs.zenSpeed = Number($('zenSpeedInput').value);
    state.prefs.zenPitch = Number($('zenPitchInput').value);
    state.prefs.zenHappy = Number($('zenHappyInput').value);
    speakWithZenMarine('こんにちは、日本語を楽しく勉強しましょう。');
  };
  $('saveAudioModalBtn').onclick = () => {
    state.prefs.kanaReadMode = $('kanaReadModeSelect').value;
    state.prefs.zenSpeed = Number($('zenSpeedInput').value);
    state.prefs.zenPitch = Number($('zenPitchInput').value);
    state.prefs.zenHappy = Number($('zenHappyInput').value);
    savePrefs();
    renderAll();
    $('audioModal').classList.add('hidden');
    showToast('Đã lưu cài đặt ZEN-TTS Marine!', 'success');
  };

  // Custom JSON & Progress
  $('tabUploadFile').onclick = () => {
    $('panelUploadFile').classList.remove('hidden');
    $('panelPasteJson').classList.add('hidden');
    $('tabUploadFile').className = 'flex-1 py-1.5 rounded-xl bg-white shadow-sm text-[#332E2E] transition';
    $('tabPasteJson').className = 'flex-1 py-1.5 rounded-xl text-[#786D69] transition';
  };
  $('tabPasteJson').onclick = () => {
    $('panelPasteJson').classList.remove('hidden');
    $('panelUploadFile').classList.add('hidden');
    $('tabPasteJson').className = 'flex-1 py-1.5 rounded-xl bg-white shadow-sm text-[#332E2E] transition';
    $('tabUploadFile').className = 'flex-1 py-1.5 rounded-xl text-[#786D69] transition';
  };
  $('jsonFileInput').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => showValidationResult(validateVocabJson(r.result));
    r.readAsText(f);
    e.target.value = '';
  };
  $('btnValidatePaste').onclick = () => showValidationResult(validateVocabJson($('jsonPasteInput').value));
  $('btnLoadSampleData').onclick = async () => { await applyDataset(SAMPLE_DATASET, true); showToast('Đã nạp bộ JSON mẫu!', 'success'); };

  $('btnExportProgress').onclick = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      masteredIds: Array.from(state.progress.masteredIds),
      streak: state.progress.streak,
      bestStreak: state.progress.bestStreak,
      totalPairsMatched: state.progress.totalPairsMatched
    };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    a.download = `jlpt-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('importProgressInput').onchange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const p = JSON.parse(r.result);
        state.progress.masteredIds = new Set(p.masteredIds || []);
        state.progress.streak = Number(p.streak) || 0;
        state.progress.bestStreak = Number(p.bestStreak) || 0;
        state.progress.totalPairsMatched = Number(p.totalPairsMatched) || 0;
        saveProgress();
        renderAll();
        showToast('Đã khôi phục tiến độ!', 'success');
      } catch {
        showToast('File tiến độ không hợp lệ.', 'error');
      }
    };
    r.readAsText(f);
    e.target.value = '';
  };
  $('btnClearDataset').onclick = async () => {
    if (!(await showConfirm('Xóa bộ từ vựng?', 'Từ vựng sẽ bị xóa nhưng tiến độ học vẫn giữ nguyên.'))) return;
    await clearDatasetIDB();
    state.words = [];
    state.wordMap = new Map();
    state.datasetTitle = '';
    renderAll();
  };
  $('btnResetProgress').onclick = async () => {
    if (!(await showConfirm('Đặt lại tiến độ?', 'Toàn bộ từ đã thuộc và chuỗi đúng sẽ về 0.'))) return;
    state.progress = { masteredIds: new Set(), streak: 0, bestStreak: 0, totalPairsMatched: 0 };
    saveProgress();
    renderAll();
  };

  $('btnSupaPullWords').onclick = async () => {
    try {
      const rows = await supabaseFetch('jlpt_words?select=*&order=level.desc');
      const res = validateVocabJson({ meta: { title: 'Supabase JLPT Cloud' }, words: rows });
      if (!res.ok) throw new Error(res.error);
      await applyDataset(res.dataset, true);
      $('supaStatusBadge').textContent = 'Đã kết nối';
      showToast(`Đã tải ${res.stats.total} từ từ Supabase!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };
  $('btnSupaSyncProgress').onclick = async () => {
    try {
      const userKey = $('supaUserKeyInput').value.trim() || 'default_learner';
      await supabaseFetch('jlpt_user_progress?on_conflict=user_key', {
        method: 'POST',
        headers: { 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          user_key: userKey,
          mastered_ids: Array.from(state.progress.masteredIds),
          streak: state.progress.streak,
          best_streak: state.progress.bestStreak,
          total_pairs_matched: state.progress.totalPairsMatched
        })
      });
      $('supaStatusBadge').textContent = 'Đã đồng bộ';
      showToast('Đã đồng bộ tiến độ lên Supabase!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  async function bootstrap() {
    loadProgress();
    loadPrefs();
    const cfgFromFile = window.JLPT_SUPABASE_CONFIG;
    const supaCfg = safeGetLS(STORAGE_SUPA_KEY, null);
    if (supaCfg) {
      $('supaUrlInput').value = supaCfg.url || '';
      $('supaKeyInput').value = supaCfg.key || '';
      $('supaUserKeyInput').value = supaCfg.userKey || 'default_learner';
    } else if (cfgFromFile && cfgFromFile.url && !cfgFromFile.url.includes('YOUR_PROJECT_ID')) {
      $('supaUrlInput').value = cfgFromFile.url;
      $('supaKeyInput').value = cfgFromFile.anonKey || '';
      $('supaUserKeyInput').value = cfgFromFile.defaultUserKey || 'default_learner';
    }

    initZenTtsFromCacheOrNetwork(false);

    const savedDataset = await loadDatasetFromIDB('active_dataset');
    if (savedDataset && Array.isArray(savedDataset.words) && savedDataset.words.length > 0) {
      await applyDataset(savedDataset, false);
    } else {
      renderAll();
    }
  }

  bootstrap();
})();
