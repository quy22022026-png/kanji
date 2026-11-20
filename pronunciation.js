/* Kawaii JLPT - Pronunciation module
 * ZEN-TTS Marine is primary; Web Speech ja-JP is fallback.
 * The module owns all audio state and exposes a small public API.
 */
export function createPronunciation({ state, $, showToast, events, kanaMap, fetchWithTimeout: fetchTimeout }) {

  const ZEN_CACHE_NAME = 'zen-tts-marine-v1.3.0';
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

  async function openZenCache() {
    try { return window.caches ? await caches.open(ZEN_CACHE_NAME) : null; }
    catch { return null; }
  }

  function clearWavCache() {
    for (const url of zenWavCache.values()) URL.revokeObjectURL(url);
    zenWavCache.clear();
  }

  function stop() {
    audioRequest++;
    if (currentAudioEl) {
      currentAudioEl.pause();
      currentAudioEl.removeAttribute('src');
      currentAudioEl.load();
      currentAudioEl = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch {}
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

  async function initMarine(autoDownload = false, localResponses = null) {
    if (location.protocol === 'file:') {
      if (autoDownload || localResponses) showToast('Hãy mở qua HTTPS hoặc http://localhost để nạp Marine.', 'error');
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
          const resp = await fetchTimeout(url, {}, 120000);
          if (!resp.ok) throw new Error(`Không tải được ${url.split('/').pop()} (HTTP ${resp.status}).`);
          responses.set(url, new Response(await resp.arrayBuffer(), { headers: resp.headers }));
        }));

        const options = {
          modelsUrl: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models',
          cpuWasmUrl: ZEN_REMOTE_FILES.cpuWasm,
          model: ZEN_REMOTE_FILES.marineZtm
        };
        const newInstance = await createZenEngine(options, responses);
        stop();
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
        events?.emit('tts:ready', { backend });
        if (autoDownload || localResponses) showToast('Đã kích hoạt ZEN-TTS Marine!', 'success');
        return zenInstance;
      } catch (err) {
        updateZenStatusUI(false, 'Lỗi nạp Marine');
        if (detail) detail.textContent = `❌ ${err.message}`;
        showToast(err.message, 'error');
        return null;
      } finally {
        buttons.forEach(b => { if (b) b.disabled = false; });
      }
    })();

    try { return await zenLoadPromise; }
    finally { zenLoadPromise = null; }
  }

  async function initFromLocalFiles(files) {
    const required = { marineZtm: 'marine.ztm', g2pBin: 'g2p.bin', g2pJson: 'g2p.json', cpuWasm: 'tts-cpu.wasm' };
    const responses = new Map();
    const list = Array.from(files || []);
    for (const [key, filename] of Object.entries(required)) {
      const found = list.find(file => file.name === filename);
      if (!found) {
        showToast(`Thiếu tệp ${filename}.`, 'error');
        return null;
      }
      responses.set(ZEN_REMOTE_FILES[key], new Response(await found.arrayBuffer()));
    }
    return initMarine(true, responses);
  }

  function speakFallbackWebSpeech(text, speed = 1) {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
    try {
      const voices = window.speechSynthesis.getVoices();
      const jp = voices.find(v => v.lang?.toLowerCase() === 'ja-jp') ||
        voices.find(v => v.lang?.toLowerCase().startsWith('ja'));
      if (!jp) return false;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.voice = jp;
      utterance.rate = Math.max(0.6, Math.min(1.4, Number(speed) || 1));
      window.speechSynthesis.speak(utterance);
      return true;
    } catch { return false; }
  }

  async function speakText(text, customPrefs = state.prefs) {
    const source = String(text ?? '').trim();
    if (!source) return false;
    stop();
    const request = audioRequest;

    const fallback = () => {
      if (request !== audioRequest) return false;
      if (customPrefs.fallbackWebSpeech && speakFallbackWebSpeech(source, customPrefs.zenSpeed)) {
        showToast('Đang sử dụng giọng đọc dự phòng Web Speech.', 'info');
        return true;
      }
      showToast('ZEN-TTS không phát được và thiết bị không có giọng tiếng Nhật dự phòng.', 'error');
      return false;
    };

    if (!zenInstance) {
      if (customPrefs.fallbackWebSpeech && speakFallbackWebSpeech(source, customPrefs.zenSpeed)) {
        showToast('Đang sử dụng giọng đọc dự phòng Web Speech.', 'info');
        return true;
      }
      showToast(zenLoadPromise
        ? 'ZEN-TTS đang nạp; thiết bị chưa có giọng Nhật dự phòng khả dụng.'
        : 'Chưa nạp ZEN-TTS và không tìm thấy giọng Nhật dự phòng. Hãy nạp Marine trong mục âm thanh.');
      return false;
    }

    const { zenHappy: happy, zenSpeed: speed, zenPitch: pitch } = customPrefs;
    const cacheKey = `${speed}:${pitch}:${happy}:${source}`;
    const engine = zenInstance;
    try {
      if (!zenWavCache.has(cacheKey)) {
        const task = synthesisQueue.then(async () => {
          if (request !== audioRequest || engine !== zenInstance) return;
          const result = await engine.speak(source, { emotion: { happy, neutral: 100 - happy }, speed, pitch });
          if (request !== audioRequest || engine !== zenInstance || zenWavCache.has(cacheKey)) return;
          if (!result?.wav) throw new Error('ZEN-TTS không trả về dữ liệu âm thanh.');
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
      if (request !== audioRequest) return false;
      if (!zenWavCache.has(cacheKey)) return false;
      const audio = new Audio(zenWavCache.get(cacheKey));
      currentAudioEl = audio;
      audio.onended = () => { if (currentAudioEl === audio) currentAudioEl = null; };
      await audio.play();
      return true;
    } catch (err) {
      if (request === audioRequest) {
        console.warn('[Kawaii JLPT] ZEN-TTS failed; trying Web Speech fallback:', err);
        return fallback();
      }
      return false;
    }
  }

  function speakWord(word) {
    if (!word) return false;
    return speakText(word.kana || word.kanji);
  }

  // A single Kana is sent as exactly one character. No synthetic long-vowel mark or punctuation.
  function speakKana(character) {
    const raw = String(character || '').trim();
    if (!raw) return false;
    const normalized = raw.normalize('NFC');
    const info = kanaMap.get(normalized);
    const kana = info ? info.hira : normalized;
    const isSingleKana = Array.from(kana).length === 1;
    const speakValue = isSingleKana ? kana : normalized;
    return speakText(speakValue);
  }

  function getStatus() {
    return {
      ready: !!zenInstance && zenInstance.isAlive(),
      loading: !!zenLoadPromise,
      fallbackAvailable: 'speechSynthesis' in window &&
        (window.speechSynthesis.getVoices().some(v => v.lang?.toLowerCase().startsWith('ja')) || false)
    };
  }

  function destroy() {
    stop();
    clearWavCache();
    if (zenInstance) zenInstance.destroy();
    zenInstance = null;
  }

  return {
    init: () => initMarine(false),
    initMarine,
    initFromLocalFiles,
    speakText,
    speakWord,
    speakKana,
    stop,
    setPreferences: () => state.prefs,
    getStatus,
    destroy
  };
}
