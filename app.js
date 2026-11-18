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
    datasetMeta: {},
    datasetVersion: 0,
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
    matchErrors: null,
    pendingImport: null
  };

  const $ = (id) => document.getElementById(id);
  let cardMoveTimer = null;
  let matchErrorTimer = null;
  let datasetBusy = false;

  function shuffled(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  async function withDatasetLock(action) {
    if (datasetBusy) {
      showToast('Đang xử lý dữ liệu, vui lòng chờ hoàn tất.');
      return;
    }
    datasetBusy = true;
    try { await action(); }
    catch (err) { showToast(err.message, 'error'); }
    finally { datasetBusy = false; }
  }

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
      return true;
    } catch { return false; }
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
      req.onblocked = () => reject(new Error('Bộ nhớ đang bị chặn bởi một tab khác.'));
    });
  }

  async function saveDatasetToIDB(payload, key = 'active_dataset') {
    const storedPayload = { ...payload, _storedAt: Date.now() };
    let db;
    try {
      db = await openIDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(storedPayload, key);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Giao dịch lưu bị hủy.'));
      });
      if (key === 'active_dataset') {
        try { localStorage.removeItem('jlpt_vocab_dataset_fallback'); } catch {}
      }
      return true;
    } catch {
      return key === 'active_dataset' && safeSetLS('jlpt_vocab_dataset_fallback', storedPayload);
    } finally { if (db) db.close(); }
  }

  async function loadDatasetFromIDB(key = 'active_dataset') {
    const fallback = key === 'active_dataset' ? safeGetLS('jlpt_vocab_dataset_fallback', null) : null;
    let db;
    try {
      db = await openIDB();
      const data = await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        tx.onabort = () => reject(tx.error || new Error('Giao dịch đọc bị hủy.'));
      });
      if (data) {
        // A failed IDB write can leave an older active dataset behind. Prefer the newer fallback.
        return fallback?._storedAt && Number(fallback._storedAt) >= Number(data._storedAt || 0) ? fallback : data;
      }
    } catch { /* fallback */ }
    finally { if (db) db.close(); }
    return fallback;
  }

  async function clearDatasetIDB() {
    let db;
    try {
      // When IndexedDB is unavailable, only the localStorage fallback can exist.
      if (window.indexedDB) db = await openIDB();
      if (db) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete('active_dataset');
        tx.objectStore(IDB_STORE).delete('openjlpt_raw');
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Không xóa được bộ nhớ.'));
      });
      }
    } finally { if (db) db.close(); }
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
    const container = $('toastContainer');
    if (container.children.length >= 3) container.firstElementChild.remove();
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s';
      setTimeout(() => el.remove(), 260);
    }, 2600);
  }

  let modalPreviousFocus = null;
  let confirmCleanup = null;

  function openModal(id) {
    modalPreviousFocus = document.activeElement;
    $(id).classList.remove('hidden');
    document.querySelectorAll('header, main, footer').forEach(el => { el.inert = true; });
    document.body.style.overflow = 'hidden';
    $(id).querySelector('button, input, select')?.focus();
  }

  function closeModal(id) {
    $(id).classList.add('hidden');
    document.querySelectorAll('header, main, footer').forEach(el => { el.inert = false; });
    document.body.style.overflow = '';
    modalPreviousFocus?.focus();
  }

  function showConfirm(title, message) {
    if (confirmCleanup) confirmCleanup(false);
    return new Promise(resolve => {
      $('confirmTitle').textContent = title;
      $('confirmMessage').textContent = message;
      const cleanup = result => {
        closeModal('confirmModal');
        $('confirmOkBtn').onclick = null;
        $('confirmCancelBtn').onclick = null;
        confirmCleanup = null;
        resolve(result);
      };
      confirmCleanup = cleanup;
      $('confirmOkBtn').onclick = () => cleanup(true);
      $('confirmCancelBtn').onclick = () => cleanup(false);
      openModal('confirmModal');
    });
  }

  document.addEventListener('keydown', event => {
    const modal = ['confirmModal', 'audioModal'].map($).find(el => !el.classList.contains('hidden'));
    if (!modal) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      if (modal.id === 'confirmModal') confirmCleanup?.(false);
      else closeModal(modal.id);
    } else if (event.key === 'Tab') {
      const controls = [...modal.querySelectorAll('button, input, select, textarea, [tabindex="0"]')].filter(el => !el.disabled);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  for (const id of ['audioModal', 'confirmModal']) {
    $(id).addEventListener('click', event => {
      if (event.target !== $(id)) return;
      if (id === 'confirmModal') confirmCleanup?.(false);
      else closeModal(id);
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
    cpuWasm: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/cpu/tts-cpu.wasm'
  };

  let zenInstance = null;
  let zenLoadPromise = null;
  let audioRequest = 0;
  let synthesisQueue = Promise.resolve();
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

  async function fetchWithTimeout(url, options = {}, timeout = 45000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if ([204, 205, 304].includes(response.status)) return response;
      // Keep the timeout active through the body download, not just response headers.
      return new Response(await response.arrayBuffer(), {
        status: response.status, statusText: response.statusText, headers: response.headers
      });
    }
    catch (err) {
      if (err.name === 'AbortError') throw new Error('Quá thời gian kết nối. Hãy kiểm tra mạng rồi thử lại.');
      throw err;
    } finally { clearTimeout(timer); }
  }

  async function openZenCache() {
    try { return window.caches ? await caches.open(ZEN_CACHE_NAME) : null; }
    catch { return null; }
  }

  function clearWavCache() {
    for (const url of zenWavCache.values()) URL.revokeObjectURL(url);
    zenWavCache.clear();
  }

  function stopAudio() {
    audioRequest++;
    if (currentAudioEl) {
      currentAudioEl.pause();
      currentAudioEl.removeAttribute('src');
      currentAudioEl.load();
      currentAudioEl = null;
    }
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
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error(message));
      }
      pending.clear();
    };
    worker.onmessage = ({ data }) => {
      const request = pending.get(data.id);
      if (!request) return;
      pending.delete(data.id);
      clearTimeout(request.timer);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data.result);
    };
    worker.onerror = event => { event.preventDefault(); destroy('Lỗi khởi chạy giọng đọc: ' + event.message); };
    const ask = (type, data, transfer = []) => new Promise((resolve, reject) => {
      if (terminated) { reject(new Error('Giọng đọc đã dừng. Hãy tải lại trang hoặc nạp lại Marine.')); return; }
      const id = ++sequence;
      const timer = setTimeout(() => { destroy('Giọng đọc quá thời gian xử lý. Hãy tải lại trang rồi thử lại.'); }, 120000);
      pending.set(id, { resolve, reject, timer });
      try { worker.postMessage({ id, type, ...data }, transfer); }
      catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
    });
    try {
      const result = await ask('load', { options, assets }, assets.map(asset => asset.body));
      return { backend: result.backend, destroy, isAlive: () => !terminated,
        speak: (text, speechOptions) => ask('speak', { text, options: speechOptions }) };
    } catch (error) { destroy(); throw error; }
  }

  async function initZenTtsFromCacheOrNetwork(autoDownload = false, localResponses = null) {
    if (location.protocol === 'file:') {
      if (autoDownload || localResponses) showToast('Hãy mở app qua GitHub Pages (HTTPS) hoặc http://localhost để nạp giọng đọc.', 'error');
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
      let newInstance = null;
      try {
        const cache = await openZenCache();
        const urls = ['marineZtm', 'g2pBin', 'g2pJson', 'cpuWasm'].map(key => ZEN_REMOTE_FILES[key]);
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
        buttons.forEach(button => { button.disabled = true; });
        updateZenStatusUI(false, 'Đang nạp Marine...');
        detail.textContent = 'Đang nạp giọng Marine, G2P và WASM. Lần tải đầu có thể mất vài phút.';
        await Promise.all(urls.map(async url => {
          if (responses.has(url)) return;
          const response = await fetchWithTimeout(url, {}, 120000);
          if (!response.ok) throw new Error(`Không tải được ${url.split('/').pop()} (HTTP ${response.status}).`);
          // Consume the body now so the runtime can reuse a complete response.
          responses.set(url, new Response(await response.arrayBuffer(), { headers: response.headers }));
        }));
        const options = {
          modelsUrl: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models',
          cpuWasmUrl: ZEN_REMOTE_FILES.cpuWasm,
          model: ZEN_REMOTE_FILES.marineZtm
        };
        newInstance = await createZenEngine(options, responses);
        stopAudio();
        if (zenInstance) zenInstance.destroy();
        zenInstance = newInstance;
        clearWavCache();
        let persisted = !!cache;
        if (cache) {
          try { for (const [url, response] of responses) await cache.put(url, response.clone()); }
          catch { persisted = false; }
        }
        const backend = zenInstance.backend.toUpperCase();
        updateZenStatusUI(true, `Sẵn sàng (${backend})`);
        detail.textContent = persisted
          ? `✅ Đã nạp Marine v1.3.0 (${backend}) và lưu mô hình trong trình duyệt.`
          : `✅ Marine đang sẵn sàng (${backend}). Không lưu được Cache; cần nạp lại khi mở trang.`;
        if (autoDownload || localResponses) showToast('Đã kích hoạt ZEN-TTS Marine!', 'success');
        return zenInstance;
      } catch (err) {
        updateZenStatusUI(!!zenInstance, zenInstance ? 'Đang dùng mô hình trước' : 'Lỗi nạp Marine');
        detail.textContent = `Không nạp được Marine: ${err.message} Có thể thử lại hoặc chọn thư mục đủ 4 tệp.`;
        if (autoDownload || localResponses) showToast('Không nạp được Marine: ' + err.message, 'error');
        return null;
      } finally {
        buttons.forEach(button => { button.disabled = false; });
      }
    })();
    try { return await zenLoadPromise; }
    finally { zenLoadPromise = null; }
  }

  async function initZenTtsFromLocalFiles(fileList) {
    if (zenLoadPromise) { showToast('Đang nạp giọng đọc. Vui lòng chờ.'); return; }
    const files = Array.from(fileList || []);
    const responses = new Map();
    const names = { marineZtm: 'marine.ztm', g2pBin: 'g2p.bin', g2pJson: 'g2p.json', cpuWasm: 'tts-cpu.wasm' };
    for (const [key, name] of Object.entries(names)) {
      const file = files.find(file => file.name === name);
      if (!file) { showToast('Thư mục thiếu tệp bắt buộc: ' + name, 'error'); return; }
      responses.set(ZEN_REMOTE_FILES[key], new Response(file));
    }
    return initZenTtsFromCacheOrNetwork(false, responses);
  }

  async function speakWithZenMarine(text, prefs = state.prefs) {
    if (!text) return;
    stopAudio();
    const request = audioRequest;
    if (!zenInstance) {
      showToast(zenLoadPromise ? 'Giọng đọc đang được nạp. Vui lòng thử lại sau.' : 'Hãy nạp ZEN-TTS Marine trong mục 📦 Mô-đun hoặc 🎧 để nghe.');
      return;
    }
    const { zenHappy: happy, zenSpeed: speed, zenPitch: pitch } = prefs;
    const cacheKey = `${speed}:${pitch}:${happy}:${text}`;
    const engine = zenInstance;
    try {
      if (!zenWavCache.has(cacheKey)) {
        const task = synthesisQueue.then(async () => {
          if (request !== audioRequest || engine !== zenInstance) return;
          const result = await engine.speak(text, { emotion: { happy, neutral: 100 - happy }, speed, pitch });
          if (engine !== zenInstance) return;
          if (zenWavCache.has(cacheKey)) return;
          if (zenWavCache.size >= 60) {
            const oldest = zenWavCache.keys().next().value;
            URL.revokeObjectURL(zenWavCache.get(oldest));
            zenWavCache.delete(oldest);
          }
          zenWavCache.set(cacheKey, URL.createObjectURL(result.wav));
        });
        synthesisQueue = task.catch(() => {});
        await task;
      }
      if (request !== audioRequest || !zenWavCache.has(cacheKey)) return;
      const audio = new Audio(zenWavCache.get(cacheKey));
      currentAudioEl = audio;
      await audio.play();
    } catch (err) {
      if (request === audioRequest) showToast('Lỗi âm thanh ZEN-TTS: ' + err.message, 'error');
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

  async function speakJapanese(word) {
    if (!word) return;
    if (word.audioUrl) {
      stopAudio();
      const request = audioRequest;
      try {
        currentAudioEl = new Audio(word.audioUrl);
        await currentAudioEl.play();
        return;
      } catch {
        if (request !== audioRequest) return;
      }
    }
    await speakWithZenMarine(word.furigana || word.kanji);
  }

  // ---------- OpenJLPT + dreamofi Module Downloader & Merger ----------
  function plainText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function joinedMeanings(value) {
    return Array.isArray(value) ? value.map(plainText).filter(Boolean).join('; ') : plainText(value);
  }

  function normalizeExample(ex) {
    if (!ex || typeof ex !== 'object' || Array.isArray(ex)) return null;
    const ja = plainText(ex.ja || ex.sentence);
    if (!ja) return null;
    return {
      ja,
      furi: plainText(ex.furi || ex.furigana || ex.reading).replace(/\{[^{}|]+\|([^{}]+)\}/g, '$1'),
      vi: plainText(ex.vi),
      en: plainText(ex.en || ex.translation)
    };
  }

  function normalizeOpenJlptItem(item, fallbackLevel) {
    return {
      ...item,
      level: item.level || fallbackLevel,
      kanji: item.word || item.kanji || item.expression,
      furigana: item.reading || item.furigana || item.word || item.kanji,
      meaning: joinedMeanings(item.meanings || item.glosses || item.meaning || item.english),
      enMeaning: joinedMeanings(item.meanings || item.glosses || item.english),
      meaningLang: 'en',
      topic: item.topic || (Array.isArray(item.pos) && item.pos[0]) || 'Chung',
      example: normalizeExample(item.example || (Array.isArray(item.examples) && item.examples[0]))
    };
  }

  async function fetchFromSources(urls) {
    let lastError;
    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response;
      } catch (err) { lastError = err; }
    }
    throw lastError;
  }

  async function downloadOpenJLPTFromGitHub() {
    const levels = Array.from(document.querySelectorAll('.ojlpt-lvl:checked')).map(el => el.value);
    if (!levels.length) { showToast('Hãy chọn ít nhất 1 cấp độ JLPT để tải!', 'error'); return; }
    const button = $('btnDownloadOpenJLPT');
    button.disabled = true;
    $('badgeOpenJLPT').textContent = 'Đang tải...';
    try {
      const words = [];
      for (const level of levels) {
        const path = `data/json/vocab/${level}.json`;
        const response = await fetchFromSources([
          `https://cdn.jsdelivr.net/gh/evanclan/OpenJLPT@main/${path}`,
          `https://raw.githubusercontent.com/evanclan/OpenJLPT/main/${path}`
        ]);
        const raw = await response.json();
        const result = validateVocabJson(raw, level.toUpperCase());
        if (!result.ok) throw new Error(`${level.toUpperCase()}: ${result.error}`);
        words.push(...result.dataset.words);
        $('badgeOpenJLPT').textContent = `${words.length} từ...`;
      }
      await applyDataset({ meta: { title: `OpenJLPT (${levels.map(level => level.toUpperCase()).join(', ')})`, openJLPT: true }, words });
      showToast(`Đã tải ${state.words.length} từ. Có thể ghép từ điển dreamofi để bổ sung nghĩa Việt.`, 'success');
    } catch (err) {
      showToast('Lỗi tải OpenJLPT: ' + err.message, 'error');
    } finally {
      button.disabled = false;
      renderModuleBadges();
    }
  }

  function normalizeReading(text) {
    return text.normalize('NFC').replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60));
  }

  function glossaryText(value) {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(glossaryText).filter(Boolean).join(' ');
    if (value && typeof value === 'object') return glossaryText(value.content || value.text || '');
    return '';
  }

  function vietnameseGlosses(glossary) {
    const values = Array.isArray(glossary) ? glossary : [glossary];
    return values.map(glossaryText).map(text => text.normalize('NFC'))
      // dreamofi appends Vietnamese AFTER the original English senses and reading tags.
      .filter(text => /[ăâđêôơưÀ-ỹ]/iu.test(text) && text !== text.toLocaleUpperCase('vi'))
      .map(text => text.replace(/\\n/g, '\n').replace(/\{[^{}]*\}/g, '').replace(/^[\s,\-]+/, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  async function readDreamofiZip(buffer, words, maps) {
    if (!window.JSZip) throw new Error('Không nạp được thư viện đọc ZIP. Hãy tải lại trang.');
    const zip = await window.JSZip.loadAsync(buffer);
    const expressions = new Set(words.map(word => word.kanji));
    const characters = new Set(words.flatMap(word => extractKanjiChars(word.kanji)));
    const files = Object.values(zip.files).filter(file => !file.dir && /(?:^|\/)(?:term|kanji)_bank_\d+\.json$/.test(file.name));
    if (!files.length) throw new Error('ZIP không có term_bank hoặc kanji_bank của từ điển Yomichan/Yomitan.');
    for (const file of files) {
      const entries = JSON.parse(await file.async('string'));
      if (!Array.isArray(entries)) throw new Error('Bảng từ điển không hợp lệ: ' + file.name);
      const terms = /(?:^|\/)term_bank_/.test(file.name);
      for (const row of entries) {
        if (!Array.isArray(row)) continue;
        const expression = plainText(row[0]);
        if (terms) {
          if (!expressions.has(expression)) continue;
          const reading = normalizeReading(plainText(row[1]) || expression);
          const key = `${expression}|${reading}`;
          const meanings = maps.terms.get(key) || [];
          for (const text of vietnameseGlosses(row[5])) {
            if (!meanings.includes(text) && meanings.length < 3) meanings.push(text);
          }
          if (meanings.length) maps.terms.set(key, meanings);
        } else {
          if (!characters.has(expression)) continue;
          // This dictionary stores Sino-Vietnamese readings in onyomi, not meaningsArray.
          const readings = plainText(row[1]).normalize('NFC').split(/\s+/)
            .filter(text => /^\p{Script=Latin}+$/u.test(text)).map(text => text.toLocaleUpperCase('vi'));
          if (readings.length) maps.kanji.set(expression, [...new Set(readings)].join('/'));
        }
      }
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  async function mergeDreamofiBuffers(buffers) {
    if (!state.words.length) throw new Error('Hãy tải hoặc nhập bộ từ vựng trước khi ghép từ điển.');
    const words = state.words;
    const version = state.datasetVersion;
    const maps = { terms: new Map(), kanji: new Map() };
    for (const buffer of buffers) await readDreamofiZip(buffer, words, maps);
    if (version !== state.datasetVersion) throw new Error('Bộ từ đã thay đổi. Vui lòng ghép lại từ điển.');
    let translated = 0, hanVietCount = 0;
    const merged = words.map(word => {
      const meanings = maps.terms.get(`${word.kanji}|${normalizeReading(word.furigana)}`)
        || maps.terms.get(`${word.kanji}|${normalizeReading(word.kanji)}`);
      const parts = extractKanjiChars(word.kanji).map(ch => maps.kanji.get(ch));
      const hv = parts.length && parts.every(Boolean) ? parts.join(' · ') : '';
      if (meanings) translated++;
      if (hv) hanVietCount++;
      return { ...word, meaning: meanings ? meanings.join('; ') : word.meaning,
        meaningLang: meanings ? 'vi' : word.meaningLang, hanViet: hv || word.hanViet };
    });
    if (!translated && !hanVietCount) throw new Error('Không khớp nghĩa Việt hoặc âm Hán Việt nào. Bộ từ hiện tại được giữ nguyên.');
    await applyDataset({ meta: { ...state.datasetMeta, dreamofi: true,
      title: state.datasetTitle.includes('dreamofi') ? state.datasetTitle : `${state.datasetTitle} × dreamofi` }, words: merged });
    showToast(`Đã bổ sung nghĩa Việt: ${translated} từ; âm Hán Việt: ${hanVietCount} từ.`, 'success');
  }

  async function parseDreamofiZipAndMerge(buffer) { return mergeDreamofiBuffers([buffer]); }

  async function downloadDreamofiFromGitHub() {
    if (!state.words.length) { showToast('Hãy tải hoặc nhập từ vựng trước khi ghép từ điển.', 'error'); return; }
    const button = $('btnDownloadDreamofi');
    button.disabled = true;
    $('badgeDreamofi').textContent = 'Đang tải...';
    try {
      const buffers = [];
      for (const name of ['jmdict_vietnamese.zip', 'kanjidic_vietnamese.zip']) {
        const response = await fetchFromSources([
          `https://raw.githubusercontent.com/dreamofi/yomichan-Vietnamese-dictionary/master/vietnameseDict/${name}`,
          `https://cdn.jsdelivr.net/gh/dreamofi/yomichan-Vietnamese-dictionary@master/vietnameseDict/${name}`
        ]);
        buffers.push(await response.arrayBuffer());
      }
      await mergeDreamofiBuffers(buffers);
    } catch (err) { showToast('Lỗi ghép từ điển: ' + err.message, 'error'); }
    finally { button.disabled = false; renderModuleBadges(); }
  }

  function renderModuleBadges() {
    $('badgeOpenJLPT').textContent = state.datasetMeta.openJLPT ? `${state.words.length} từ` : 'Chưa tải';
    const count = state.words.filter(word => word.meaningLang === 'vi').length;
    $('badgeDreamofi').textContent = state.datasetMeta.dreamofi ? `Việt: ${count}/${state.words.length}` : 'Chưa ghép';
  }

  // ---------- Kanji Cross-Level Linking ----------
  function extractKanjiChars(str) {
    if (!str) return [];
    const matches = str.match(/\p{Script=Han}/gu);
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
  function validateVocabJson(rawInput, fallbackLevel = '') {
    let parsed;
    try { parsed = typeof rawInput === 'string' ? JSON.parse(rawInput) : rawInput; }
    catch (err) { return { ok: false, error: 'Mã JSON không hợp lệ: ' + err.message }; }
    const list = Array.isArray(parsed) ? parsed : parsed && parsed.words;
    if (!Array.isArray(list) || !list.length) {
      return { ok: false, error: 'JSON phải là mảng từ vựng không rỗng hoặc object có "words": [...].' };
    }
    const meta = !Array.isArray(parsed) && parsed.meta && typeof parsed.meta === 'object' ? parsed.meta : {};
    const normalized = [];
    const seenIds = new Map();
    const levelCounts = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    const topics = new Set();
    for (let i = 0; i < list.length; i++) {
      let item = list[i];
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return { ok: false, error: `Mục #${i + 1} phải là object từ vựng.` };
      }
      if (item.word && (Array.isArray(item.meanings) || Array.isArray(item.glosses))) {
        item = normalizeOpenJlptItem(item, fallbackLevel || meta.level);
      }
      const level = String(item.level || fallbackLevel || meta.level || '').trim().toUpperCase();
      const kanji = plainText(item.kanji || item.word);
      const furigana = plainText(item.furigana || item.reading);
      const meaning = plainText(item.meaning);
      const id = typeof item.id === 'string' || typeof item.id === 'number'
        ? String(item.id).trim() : `${level.toLowerCase()}_${kanji}_${furigana}`;
      if (!id || !LEVELS.includes(level) || !kanji || !furigana || !meaning) {
        return { ok: false, error: `Mục #${i + 1} (${kanji || id}) thiếu hoặc sai kiểu trường bắt buộc (level, kanji, furigana, meaning).` };
      }
      const previous = seenIds.get(id);
      if (previous) {
        if (previous.kanji !== kanji || previous.furigana !== furigana || previous.level !== level || previous.meaning !== meaning) {
          return { ok: false, error: `Mục #${i + 1}: ID "${id}" bị trùng với một từ khác. Hãy đặt ID riêng cho mỗi từ.` };
        }
        continue;
      }
      const topic = plainText(item.topic) || 'Chung';
      const audioUrl = plainText(item.audioUrl || item.audio_url);
      if (audioUrl) {
        try {
          if (!['https:', 'http:'].includes(new URL(audioUrl, location.href).protocol)) throw new Error();
        } catch { return { ok: false, error: `Mục #${i + 1}: audioUrl phải là URL HTTP(S) hoặc đường dẫn tương đối.` }; }
      }
      const word = {
        id, level, topic, kanji, furigana, meaning,
        romaji: plainText(item.romaji),
        enMeaning: plainText(item.enMeaning),
        meaningLang: ['en', 'vi'].includes(item.meaningLang) ? item.meaningLang : '',
        hanViet: plainText(item.hanViet || item.han_viet),
        example: normalizeExample(item.example),
        relatedIds: (Array.isArray(item.relatedIds) ? item.relatedIds : Array.isArray(item.related_ids) ? item.related_ids : []).map(plainText).filter(Boolean),
        audioUrl: audioUrl || null
      };
      seenIds.set(id, word);
      normalized.push(word);
      levelCounts[level]++;
      topics.add(topic);
    }
    const title = plainText(meta.title) || `Bộ từ vựng (${normalized.length} từ)`;
    return {
      ok: true,
      dataset: { meta: { ...meta, title }, words: normalized },
      stats: { total: normalized.length, levelCounts, topicCount: topics.size }
    };
  }

  // ---------- Progress & Prefs ----------
  function saveProgress() {
    const saved = safeSetLS(STORAGE_PROGRESS_KEY, {
      masteredIds: Array.from(state.progress.masteredIds),
      streak: state.progress.streak,
      bestStreak: state.progress.bestStreak,
      totalPairsMatched: state.progress.totalPairsMatched
    });
    if (!saved) showToast('Không lưu được tiến độ trên trình duyệt. Hãy xuất file tiến độ trước khi đóng trang.', 'error');
  }

  function loadProgress() {
    const p = safeGetLS(STORAGE_PROGRESS_KEY, null);
    if (p) {
      try { state.progress = normalizeProgress(p); } catch { /* ignore damaged progress */ }
    }
  }

  function normalizeProgress(p) {
    if (!p || typeof p !== 'object' || !Array.isArray(p.masteredIds) || p.masteredIds.some(id => typeof id !== 'string' || !id.trim())) {
      throw new Error('Tiến độ phải có masteredIds là mảng ID từ vựng.');
    }
    const numbers = ['streak', 'bestStreak', 'totalPairsMatched'].map(key => {
      const value = p[key] ?? 0;
      if (!Number.isSafeInteger(value) || value < 0) throw new Error(`Tiến độ có ${key} không hợp lệ.`);
      return value;
    });
    return { masteredIds: new Set(p.masteredIds), streak: numbers[0], bestStreak: Math.max(numbers[0], numbers[1]), totalPairsMatched: numbers[2] };
  }

  function refreshStudyProgress() {
    const id = state.fcDeck[state.fcIndex]?.id;
    rebuildFlashcardDeck();
    const index = state.fcDeck.findIndex(word => word.id === id);
    if (index >= 0) state.fcIndex = index;
    initMatchingRound();
    renderAll();
  }

  function savePrefs() { safeSetLS(STORAGE_PREFS_KEY, state.prefs); }

  function loadPrefs() {
    const pr = safeGetLS(STORAGE_PREFS_KEY, null);
    if (pr) {
      if (LEVELS.includes(pr.level)) state.prefs.level = pr.level;
      if (typeof pr.topic === 'string') state.prefs.topic = pr.topic;
      if (typeof pr.showFuri === 'boolean') state.prefs.showFuri = pr.showFuri;
      if (['ALL', 'MASTERED', 'UNMASTERED'].includes(pr.fcFilter)) state.prefs.fcFilter = pr.fcFilter;
      if (typeof pr.matchSwap === 'boolean') state.prefs.matchSwap = pr.matchSwap;
      if (pr.kanaScript === 'hira' || pr.kanaScript === 'kata') state.prefs.kanaScript = pr.kanaScript;
      if (['seion', 'dakuon', 'yoon'].includes(pr.kanaGroup)) state.prefs.kanaGroup = pr.kanaGroup;
      if (['CLEAR_MORA', 'WITH_WORD'].includes(pr.kanaReadMode)) state.prefs.kanaReadMode = pr.kanaReadMode;
      for (const [key, min, max] of [['zenSpeed', 0.6, 1.4], ['zenPitch', -6, 12], ['zenHappy', 0, 100]]) {
        if (typeof pr[key] === 'number' && Number.isFinite(pr[key])) state.prefs[key] = Math.max(min, Math.min(max, pr[key]));
      }
    }
  }

  async function applyDataset(dataset, persist = true, preservePreferences = false) {
    const validated = validateVocabJson(dataset);
    if (!validated.ok) throw new Error(validated.error);
    dataset = validated.dataset;
    if (persist && !(await saveDatasetToIDB(dataset, 'active_dataset'))) {
      showToast('Bộ nhớ trình duyệt không khả dụng hoặc đã đầy. Bộ từ chỉ dùng được trong phiên này.', 'error');
    }
    cancelCardMove();
    stopAudio();
    state.datasetVersion++;
    state.datasetTitle = (dataset.meta && dataset.meta.title) || 'Bộ từ vựng JLPT';
    state.datasetMeta = dataset.meta;
    state.words = dataset.words;
    state.wordMap = new Map(state.words.map(w => [w.id, w]));

    const currentCount = state.words.filter(w => w.level === state.prefs.level).length;
    if (currentCount === 0 && state.words.length > 0) {
      const firstNonEmpty = LEVELS.find(lvl => state.words.some(w => w.level === lvl));
      if (firstNonEmpty) state.prefs.level = firstNonEmpty;
    }
    if (!preservePreferences) state.prefs.topic = 'ALL';
    rebuildTopicOptions();
    savePrefs();
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
    state.prefs.topic = sel.value;
  }

  // ---------- Flashcard Mode ----------
  function rebuildFlashcardDeck(shuffle = false) {
    cancelCardMove();
    let deck = getFilteredWords(false);
    if (shuffle) deck = shuffled(deck);
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
    ['fcPrevBtn', 'fcNextBtn', 'fcMasterBtn', 'fcUnmasterBtn', 'fcShuffleBtn', 'fcSpeakFrontBtn', 'fcSpeakBackBtn'].forEach(id => { $(id).disabled = !total; });
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
    const faces = $('fcInner').querySelectorAll('.flashcard-face');
    faces[0].inert = state.fcFlipped;
    faces[1].inert = !state.fcFlipped;
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

    $('fcMeaningLabel').textContent = word.meaningLang === 'en' ? 'Nghĩa (tiếng Anh)' : 'Nghĩa';
    if (word.example && word.example.ja) {
      $('fcExampleBox').classList.remove('hidden');
      $('fcExJa').textContent = word.example.ja;
      $('fcExFuri').textContent = state.prefs.showFuri && word.example.furi ? word.example.furi : '';
      $('fcExVi').textContent = word.example.vi || word.example.en || '';
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
          initMatchingRound();
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
    state.fcFlipped = !state.fcFlipped;
    $('fcInner').classList.toggle('is-flipped', state.fcFlipped);
    const faces = $('fcInner').querySelectorAll('.flashcard-face');
    faces[0].inert = state.fcFlipped;
    faces[1].inert = !state.fcFlipped;
    if (state.fcFlipped) speakJapanese(state.fcDeck[state.fcIndex]);
  }

  function markFlashcard(mastered) {
    if (!state.fcDeck.length) return;
    cancelCardMove();
    stopAudio();
    const oldIndex = state.fcIndex;
    const word = state.fcDeck[state.fcIndex];
    if (mastered) {
      state.progress.masteredIds.add(word.id);
      showToast(`Đã thuộc "${word.kanji}" 🎉`, 'success');
    } else {
      state.progress.masteredIds.delete(word.id);
    }
    saveProgress();
    if (state.prefs.fcFilter !== 'ALL') {
      rebuildFlashcardDeck();
      const retained = state.fcDeck.findIndex(item => item.id === word.id);
      state.fcIndex = state.fcDeck.length ? (retained >= 0 ? retained + 1 : oldIndex) % state.fcDeck.length : 0;
    }
    else {
      state.fcIndex = (state.fcIndex + 1) % state.fcDeck.length;
      state.fcFlipped = false;
    }
    renderHeader();
    renderFlashcard();
  }

  function cancelCardMove() {
    clearTimeout(cardMoveTimer);
    cardMoveTimer = null;
    const card = $('fcPerspective');
    card.style.transition = '';
    card.style.transform = '';
    card.style.opacity = '';
  }

  function moveCard(direction) {
    if (!state.fcDeck.length || cardMoveTimer !== null) return;
    stopAudio();
    const card = $('fcPerspective');
    card.style.transition = 'transform 0.14s ease-out, opacity 0.14s ease-out';
    card.style.transform = `translateX(${-42 * direction}px)`;
    card.style.opacity = '0.35';
    cardMoveTimer = setTimeout(() => {
      cardMoveTimer = null;
      if (!state.fcDeck.length) { cancelCardMove(); return; }
      state.fcIndex = (state.fcIndex + direction + state.fcDeck.length) % state.fcDeck.length;
      state.fcFlipped = false;
      renderFlashcard();
      card.style.transform = '';
      card.style.opacity = '';
    }, 140);
  }

  function goNextCard() { moveCard(1); }
  function goPrevCard() { moveCard(-1); }

  // ---------- Pair Matching Mode ----------
  function initMatchingRound() {
    clearTimeout(matchErrorTimer);
    matchErrorTimer = null;
    state.matchMatchedIds = new Set();
    state.matchSelected = null;
    state.matchErrors = null;
    state.matchLocked = false;
    state.matchLeftItems = [];
    state.matchRightItems = [];
    state.matchRoundPairs = [];
    const pool = getFilteredWords(true);
    if (!pool.length) return;
    const unmastered = pool.filter(w => !state.progress.masteredIds.has(w.id));
    const mastered = pool.filter(w => state.progress.masteredIds.has(w.id));
    const combined = [...shuffled(unmastered), ...shuffled(mastered)];
    const chosen = combined.slice(0, Math.min(5, combined.length));
    state.matchRoundPairs = chosen;
    state.matchMatchedIds = new Set();
    state.matchSelected = null;
    state.matchLocked = false;
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
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.wordId = word.id;
      btn.dataset.side = side;

      let cls = 'w-full min-h-[68px] sm:min-h-[76px] p-3 sm:p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center shadow-sm ';
      if (state.matchErrors?.some(item => item.id === word.id && item.side === side)) cls += 'bg-[#FFF1F2] border-[#FB7185] animate-shake';
      else if (isMatched) { cls += 'bg-matcha-50 border-matcha-400 text-matcha-600 opacity-45 cursor-default'; btn.disabled = true; }
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
      state.matchSelected = { side, id: word.id };
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
      state.matchErrors = [first, { side, id: word.id }];
      renderMatching();
      matchErrorTimer = setTimeout(() => {
        matchErrorTimer = null;
        state.matchSelected = null;
        state.matchErrors = null;
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
    $('btnConfirmImportJson').onclick = () => withDatasetLock(async () => {
      if (!state.pendingImport) return;
      const dataset = state.pendingImport;
      state.pendingImport = null;
      await applyDataset(dataset, true);
      box.classList.add('hidden');
      state.mode = 'flashcard';
      renderAll();
      showToast(`Đã nạp ${total} từ vựng thành công!`, 'success');
    });
  }

  function renderDataStats() {
    renderModuleBadges();
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

  function getSupabaseConfig() {
    const url = $('supaUrlInput').value.trim().replace(/\/+$/, '');
    const key = $('supaKeyInput').value.trim();
    let parsed;
    try { parsed = new URL(url); } catch { throw new Error('Supabase URL không hợp lệ.'); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash || url.includes('YOUR_PROJECT')) {
      throw new Error('Hãy nhập Project URL HTTP(S) của Supabase.');
    }
    if (!key || key.includes('YOUR_SUPABASE')) throw new Error('Hãy nhập Anon Key hoặc Publishable Key của Supabase.');
    let role = '';
    try { role = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role; } catch {}
    if (key.startsWith('sb_secret_') || role === 'service_role') throw new Error('Không dùng Secret Key hoặc service_role trong trình duyệt. Hãy dùng khóa public.');
    const tables = { words: 'jlpt_words', progress: 'jlpt_user_progress', ...(window.JLPT_SUPABASE_CONFIG?.tables || {}) };
    for (const table of Object.values(tables)) {
      if (typeof table !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) throw new Error('Tên bảng Supabase không hợp lệ trong supabase-config.js.');
    }
    safeSetLS(STORAGE_SUPA_KEY, { url, key });
    return { url, key, tables };
  }

  async function supabaseRequest(config, path, options = {}, accessToken = '') {
    const response = await fetchWithTimeout(`${config.url}/${path}`, {
      ...options,
      headers: { apikey: config.key, Authorization: `Bearer ${accessToken || config.key}`,
        'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    const text = await response.text();
    let data = null;
    if (text.trim()) {
      try { data = JSON.parse(text); }
      catch { if (response.ok) throw new Error('Supabase trả về dữ liệu không phải JSON.'); }
    }
    if (!response.ok) {
      const message = data?.message || data?.msg || data?.error_description || data?.error || text.slice(0, 180);
      throw new Error(`Supabase HTTP ${response.status}: ${message || response.statusText}`);
    }
    // PostgREST may send 201 with an empty body (return=minimal), not just 204.
    return { data, response };
  }

  function supaSessionKey(config) { return `jlpt_supa_session_v1:${config.url}`; }

  async function getSupabaseSession(config) {
    const stored = safeGetLS(supaSessionKey(config));
    let session = stored;
    const expiry = Number(stored?.expires_at);
    if (!stored || !stored.access_token || !Number.isFinite(expiry) || expiry <= Date.now() / 1000 + 60) {
      const result = await supabaseRequest(config, stored?.refresh_token ? 'auth/v1/token?grant_type=refresh_token' : 'auth/v1/signup', {
        method: 'POST', body: JSON.stringify(stored?.refresh_token ? { refresh_token: stored.refresh_token } : { data: { app: 'Kawaii JLPT' } })
      });
      session = result.data;
      if (!session?.access_token || !session.user?.id) throw new Error('Chưa tạo được phiên học. Hãy bật Anonymous Sign-Ins trong Supabase → Authentication → Sign In / Providers.');
      session.expires_at = session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600);
      if (!safeSetLS(supaSessionKey(config), session)) throw new Error('Không lưu được phiên Supabase. Hãy cho phép bộ nhớ trình duyệt trước khi đồng bộ.');
    }
    if (!session.user?.id) throw new Error('Phiên Supabase không hợp lệ.');
    $('supaUserKeyInput').value = session.user.id;
    return session;
  }

  async function runSupabaseAction(action) {
    const controls = ['btnSupaPullWords', 'btnSupaSyncProgress', 'btnSupaPullProgress', 'supaUrlInput', 'supaKeyInput'];
    if ($('btnSupaSyncProgress').disabled) return;
    controls.forEach(id => { $(id).disabled = true; });
    $('supaStatusBadge').textContent = 'Đang kết nối...';
    try { await action(getSupabaseConfig()); }
    catch (err) {
      $('supaStatusBadge').textContent = 'Lỗi kết nối';
      const message = /anonymous.*(disabled|not allowed)/i.test(err.message)
        ? 'Hãy bật Anonymous Sign-Ins trong Supabase → Authentication → Sign In / Providers.' : err.message;
      showToast(message, 'error');
    } finally { controls.forEach(id => { $(id).disabled = false; }); }
  }

  async function pullSupabaseWords(config) {
    const words = [];
    const seen = new Set();
    while (true) {
      const params = new URLSearchParams({ select: '*', order: 'id.asc', limit: '500', offset: String(words.length) });
      const { data, response } = await supabaseRequest(config, `rest/v1/${config.tables.words}?${params}`, { headers: { Prefer: 'count=exact' } });
      if (!Array.isArray(data)) throw new Error('Supabase không trả về danh sách từ vựng.');
      if (!data.length) break;
      for (const word of data) {
        if (!word?.id || seen.has(word.id)) throw new Error('Danh sách từ thay đổi hoặc bị trùng khi phân trang. Hãy tải lại.');
        seen.add(word.id);
      }
      words.push(...data);
      const totalText = response.headers.get('content-range')?.split('/')[1];
      const total = totalText && totalText !== '*' ? Number(totalText) : null;
      if (total !== null && words.length >= total) break;
      // Without an exact count, continue until an empty page; server row caps may be <500.
    }
    const result = validateVocabJson({ meta: { title: 'Supabase JLPT Cloud' }, words });
    if (!result.ok) throw new Error(words.length ? result.error : 'Bảng Supabase chưa có từ vựng. Bộ từ hiện tại được giữ nguyên.');
    await applyDataset(result.dataset);
    $('supaStatusBadge').textContent = 'Đã kết nối';
    showToast(`Đã tải ${state.words.length} từ từ Supabase!`, 'success');
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
    btn.onclick = () => { cancelCardMove(); stopAudio(); state.mode = btn.dataset.mode; renderAll(); };
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

  $('btnQuickSampleEmpty').onclick = () => withDatasetLock(async () => {
    await applyDataset(SAMPLE_DATASET, true);
    state.mode = 'flashcard';
    renderAll();
    showToast('Đã nạp bộ mẫu nhỏ!', 'success');
  });
  $('btnGoToDataEmpty').onclick = () => { state.mode = 'data'; renderAll(); };

  // Flashcard Touch Swipe + Tap Flip
  (() => {
    const cardEl = $('fcPerspective');
    let startX = 0, startY = 0, dragging = false, didSwipe = false;
    cardEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button') || !state.fcDeck.length || cardMoveTimer !== null) return;
      cardEl.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY; dragging = true; didSwipe = false;
      cardEl.style.transition = 'none';
    });
    cardEl.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dy) > 10) didSwipe = true;
      if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        didSwipe = true;
        cardEl.style.transform = `translateX(${Math.max(-90, Math.min(90, dx * 0.55))}px) rotate(${Math.max(-6, Math.min(6, dx * 0.04))}deg)`;
      }
    });
    const finishSwipe = (e) => {
      if (!dragging) return;
      dragging = false;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy)) {
        didSwipe = true;
        if (dx < 0) goNextCard(); else goPrevCard();
      } else {
        cardEl.style.transition = 'transform 0.2s ease-out';
        cardEl.style.transform = 'translateX(0) rotate(0deg)';
      }
    };
    cardEl.addEventListener('pointerup', finishSwipe);
    cardEl.addEventListener('pointercancel', () => {
      dragging = false;
      didSwipe = true;
      cardEl.style.transition = 'transform 0.2s ease-out';
      cardEl.style.transform = 'translateX(0) rotate(0deg)';
    });
    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('button') || didSwipe || cardMoveTimer !== null) return;
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
    btn.onclick = () => { state.prefs.fcFilter = btn.dataset.filter; savePrefs(); rebuildFlashcardDeck(); renderFlashcard(); };
  });

  document.addEventListener('keydown', (e) => {
    if (!$('confirmModal').classList.contains('hidden') || !$('audioModal').classList.contains('hidden')) return;
    if (e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
    if (state.mode !== 'flashcard' || !state.fcDeck.length) return;
    if (document.activeElement.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') { e.preventDefault(); flipFlashcard(); }
    else if (e.code === 'ArrowRight') { e.preventDefault(); goNextCard(); }
    else if (e.code === 'ArrowLeft') { e.preventDefault(); goPrevCard(); }
    else if (e.key === '1') markFlashcard(false);
    else if (e.key === '2') markFlashcard(true);
    else if (e.key.toLowerCase() === 'r') speakJapanese(state.fcDeck[state.fcIndex]);
  });

  $('matchSwapBtn').onclick = () => { clearTimeout(matchErrorTimer); state.matchLocked = false; state.matchErrors = null; state.prefs.matchSwap = !state.prefs.matchSwap; state.matchSelected = null; savePrefs(); renderMatching(); };
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
  $('btnDownloadOpenJLPT').onclick = () => withDatasetLock(downloadOpenJLPTFromGitHub);
  $('btnDownloadDreamofi').onclick = () => withDatasetLock(downloadDreamofiFromGitHub);
  $('dreamofiZipInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await withDatasetLock(async () => parseDreamofiZipAndMerge(await file.arrayBuffer()));
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
    openModal('audioModal');
  };
  $('closeAudioModalBtn').onclick = () => closeModal('audioModal');
  $('zenSpeedInput').oninput = (e) => { $('zenSpeedVal').textContent = `${Number(e.target.value).toFixed(2)}x`; };
  $('zenPitchInput').oninput = (e) => { $('zenPitchVal').textContent = `${e.target.value} st`; };
  $('zenHappyInput').oninput = (e) => { $('zenHappyVal').textContent = `${e.target.value}%`; };
  function audioFormPrefs() {
    return { kanaReadMode: $('kanaReadModeSelect').value,
      zenSpeed: Number($('zenSpeedInput').value), zenPitch: Number($('zenPitchInput').value), zenHappy: Number($('zenHappyInput').value) };
  }
  $('testVoiceBtn').onclick = () => speakWithZenMarine('こんにちは、日本語を楽しく勉強しましょう。', audioFormPrefs());
  $('saveAudioModalBtn').onclick = () => {
    Object.assign(state.prefs, audioFormPrefs());
    savePrefs();
    renderAll();
    closeModal('audioModal');
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
  async function previewJsonFile(file) {
    if (!file) return;
    try {
      const inferredLevel = file.name.match(/(?:^|[^a-z0-9])(n[1-5])(?:[^a-z0-9]|$)/i)?.[1]?.toUpperCase() || '';
      showValidationResult(validateVocabJson(await file.text(), inferredLevel));
    } catch (err) { showToast('Không đọc được file JSON: ' + err.message, 'error'); }
  }
  $('jsonFileInput').onchange = event => {
    previewJsonFile(event.target.files[0]);
    event.target.value = '';
  };
  $('jsonDropZone').addEventListener('dragover', event => { event.preventDefault(); });
  $('jsonDropZone').addEventListener('drop', event => {
    event.preventDefault();
    previewJsonFile(event.dataTransfer.files[0]);
  });
  $('btnValidatePaste').onclick = () => showValidationResult(validateVocabJson($('jsonPasteInput').value));
  $('btnLoadSampleData').onclick = () => withDatasetLock(async () => { await applyDataset(SAMPLE_DATASET); showToast('Đã nạp bộ JSON mẫu!', 'success'); });

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
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $('importProgressInput').onchange = async event => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      const progress = normalizeProgress(JSON.parse(await file.text()));
      state.progress = progress;
      saveProgress();
      refreshStudyProgress();
      showToast('Đã khôi phục tiến độ!', 'success');
    } catch (err) { showToast('File tiến độ không hợp lệ: ' + err.message, 'error'); }
  };
  $('btnClearDataset').onclick = () => withDatasetLock(async () => {
    if (!(await showConfirm('Xóa bộ từ vựng?', 'Từ vựng sẽ bị xóa nhưng tiến độ học vẫn giữ nguyên.'))) return;
    await clearDatasetIDB();
    cancelCardMove();
    stopAudio();
    state.datasetVersion++;
    state.words = [];
    state.wordMap = new Map();
    state.datasetTitle = '';
    state.datasetMeta = {};
    state.fcDeck = [];
    state.fcIndex = 0;
    state.fcFlipped = false;
    state.pendingImport = null;
    $('validationPreview').classList.add('hidden');
    rebuildTopicOptions();
    initMatchingRound();
    renderAll();
    showToast('Đã xóa bộ từ vựng. Tiến độ học được giữ nguyên.', 'success');
  });
  $('btnResetProgress').onclick = async () => {
    if (!(await showConfirm('Đặt lại tiến độ?', 'Tiến độ trên trình duyệt sẽ về 0. Bản đã lưu trên Supabase không thay đổi cho đến khi bạn lưu lại.'))) return;
    state.progress = { masteredIds: new Set(), streak: 0, bestStreak: 0, totalPairsMatched: 0 };
    saveProgress();
    refreshStudyProgress();
  };

  $('btnSupaPullWords').onclick = () => withDatasetLock(() => runSupabaseAction(pullSupabaseWords));
  $('btnSupaSyncProgress').onclick = () => runSupabaseAction(async config => {
    const session = await getSupabaseSession(config);
    await supabaseRequest(config, `rest/v1/${config.tables.progress}?on_conflict=user_key`, {
      method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_key: session.user.id, mastered_ids: Array.from(state.progress.masteredIds),
        streak: state.progress.streak, best_streak: state.progress.bestStreak, total_pairs_matched: state.progress.totalPairsMatched })
    }, session.access_token);
    $('supaStatusBadge').textContent = 'Đã lưu tiến độ';
    showToast('Đã lưu tiến độ lên Supabase!', 'success');
  });
  $('btnSupaPullProgress').onclick = () => runSupabaseAction(async config => {
    const session = await getSupabaseSession(config);
    const params = new URLSearchParams({ select: '*', user_key: `eq.${session.user.id}` });
    const { data } = await supabaseRequest(config, `rest/v1/${config.tables.progress}?${params}`, {}, session.access_token);
    if (!Array.isArray(data)) throw new Error('Dữ liệu tiến độ Supabase không hợp lệ.');
    if (!data.length) { $('supaStatusBadge').textContent = 'Chưa có bản lưu'; showToast('Chưa có tiến độ đã lưu trên Supabase.'); return; }
    const progress = normalizeProgress({ masteredIds: data[0].mastered_ids, streak: data[0].streak,
      bestStreak: data[0].best_streak, totalPairsMatched: data[0].total_pairs_matched });
    if (!(await showConfirm('Khôi phục từ Supabase?', 'Tiến độ trên trình duyệt sẽ được thay bằng bản đã lưu trên Supabase.'))) {
      $('supaStatusBadge').textContent = 'Đã hủy khôi phục'; return;
    }
    state.progress = progress;
    saveProgress();
    refreshStudyProgress();
    $('supaStatusBadge').textContent = 'Đã khôi phục';
    showToast('Đã khôi phục tiến độ từ Supabase!', 'success');
  });

  async function bootstrap() {
    document.querySelectorAll('header, main').forEach(el => { el.inert = true; });
    try {
      loadProgress();
      loadPrefs();
      const fileConfig = window.JLPT_SUPABASE_CONFIG;
      const savedConfig = safeGetLS(STORAGE_SUPA_KEY);
      const config = savedConfig || fileConfig;
      if (config && typeof config.url === 'string' && !config.url.includes('YOUR_PROJECT_ID')) {
        $('supaUrlInput').value = config.url;
        $('supaKeyInput').value = config.key || config.anonKey || '';
        const session = safeGetLS(supaSessionKey(config));
        $('supaUserKeyInput').value = session?.user?.id || '';
      }
      const saved = await loadDatasetFromIDB();
      if (saved) await applyDataset(saved, false, true);
      else { rebuildTopicOptions(); renderAll(); }
    } catch (err) {
      renderAll();
      showToast('Không mở được bộ dữ liệu đã lưu: ' + err.message + ' Bạn có thể nhập lại bộ từ.', 'error');
    } finally {
      $('startupStatus').classList.add('hidden');
      document.querySelectorAll('header, main').forEach(el => { el.inert = false; });
    }
    initZenTtsFromCacheOrNetwork(false);
  }

  window.addEventListener('pagehide', () => { stopAudio(); clearWavCache(); });
  bootstrap();
})();
