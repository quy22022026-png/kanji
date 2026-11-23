/**
 * Kawaii JLPT - Audio / ZEN-TTS engine manager
 * Owns model loading, Cache API persistence, Worker lifecycle and engine status.
 * Pronunciation playback, WAV cache and Web Speech fallback remain in pronunciation.js.
 */
(() => {
  'use strict';

  const CACHE_NAME = 'zen-tts-marine-v1.3.0';
  const REMOTE_FILES = Object.freeze({
    marineZtm: 'https://tts-models.zenryoku.work/v1.3.0/marine.ztm',
    g2pBin: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models/g2p/g2p.bin',
    g2pJson: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models/g2p/g2p.json',
    cpuWasm: 'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/cpu/tts-cpu.wasm'
  });

  const HASHES = Object.freeze({
    marineZtm:'c7bdad381540d33f90aa60b255520051b04d6ce84c66e0fbc8d8ed3cdec3a4dd',
    g2pBin:'6a9716330f1d02968e91bd809022bf040cb7fb665935211713609b83dc004523',
    g2pJson:'4a817fda1e8317cce8431c0721ff4d473d94caa70a00f3d0e7d304492c1beb35',
    cpuWasm:'6b4bf304c2f20864ec16dced933a77c6bde4a813f9fc4de473c7b74ba3281a8e'
  });
  function create(options = {}) {
    const getElement = options.getElement || (id => document.getElementById(id));
    const getLocationProtocol = options.getLocationProtocol || (() => location.protocol);
    const getDocumentBaseURI = options.getDocumentBaseURI || (() => document.baseURI);
    const onToast = options.onToast || (() => {}), emit = options.emit || (() => {});
    const stopPlayback = options.stopPlayback || (() => {}), clearPlaybackCache = options.clearPlaybackCache || (() => {});
    const fetcher = options.fetch || globalThis.fetch?.bind(globalThis);
    const WorkerCtor = options.Worker || globalThis.Worker;
    const ResponseCtor = options.Response || globalThis.Response;
    const URLCtor = options.URL || URL;
    const cacheStorage = options.cacheStorage !== undefined ? options.cacheStorage : globalThis.caches;
    const cryptoApi = options.crypto || globalThis.crypto;
    let engine = null, loadPromise = null, controller = null, activeWorkerCancel = null;
    let downloadRequested = false;
    let disposed = false;
    let status = {state:'not-downloaded',ready:false,label:'Chưa tải',backend:null,bytes:0,progress:0};
    function update(state,label,extra = {}) {
      status = {...status,state,label,ready:state === 'ready',...extra};
      const badge = getElement('badgeZenTts'), detail = getElement('zenModalStatusText'), dot = getElement('zenStatusDot');
      if (badge) {badge.textContent = label; badge.className = 'text-[11px] font-extrabold px-2.5 py-1 rounded-xl shrink-0 '+(status.ready ? 'bg-matcha-50 text-matcha-600' : 'bg-[#F6EFE8] text-[#786D69]');}
      if (detail) detail.textContent = label;
      if (dot) dot.className = 'absolute top-1.5 right-1.5 w-2 h-2 rounded-full '+(status.ready ? 'bg-matcha-500' : 'bg-[#D1C7BF]');
      const progress = getElement('zenDownloadProgress'); if (progress) {progress.value = status.progress; progress.hidden = !['downloading','downloaded','initializing'].includes(state);}
      emit('tts:status',{...status});
    }
    async function openModelCache() {try {return await cacheStorage?.open(CACHE_NAME);} catch {return null;}}
    async function validate(key,response) {
      if (!response?.ok || !cryptoApi?.subtle) throw new Error('Cần HTTPS và Web Crypto để kiểm tra model.');
      const bytes = await response.clone().arrayBuffer();
      const hash = [...new Uint8Array(await cryptoApi.subtle.digest('SHA-256',bytes))].map(x => x.toString(16).padStart(2,'0')).join('');
      if (hash !== HASHES[key]) throw new Error('Sai checksum '+REMOTE_FILES[key].split('/').pop()+'. Hãy tải lại bộ v1.3.0.');
      return response;
    }
    async function download(key,signal) {
      const timer = setTimeout(() => controller?.abort(),180000);
      try {
        const url = REMOTE_FILES[key], response = await fetcher(url,{signal});
        if (!response.ok) throw new Error(`Không tải được ${url.split('/').pop()} (HTTP ${response.status}).`);
        if (!response.body?.getReader) {
          const bytes = await response.arrayBuffer(); status.bytes += bytes.byteLength;
          return new ResponseCtor(bytes,{headers:response.headers});
        }
        const reader = response.body.getReader(), chunks = [];
        for (;;) {
          const {done,value} = await reader.read(); if (done) break;
          if (signal.aborted) {await reader.cancel(); throw new Error('Đã hủy tải.');}
          chunks.push(value); status.bytes += value.byteLength;
          update('downloading',`Đang tải Marine · ${(status.bytes/1048576).toFixed(1)} MiB`,{progress:Math.min(95,status.bytes/42000000*95)});
        }
        return new ResponseCtor(new Blob(chunks),{headers:response.headers});
      } finally {clearTimeout(timer);}
    }
    async function createEngine(engineOptions, responses) {
      if (!WorkerCtor) throw new Error('Trình duyệt không hỗ trợ Web Worker để chạy ZEN-TTS.');
      const assets = await Promise.all([...responses].map(async ([url, response]) => ({
        url,
        body: await response.clone().arrayBuffer(),
        headers: [...response.headers]
      })));
      const workerUrl = new URLCtor('./zen-worker.js', getDocumentBaseURI());
      const worker = new WorkerCtor(workerUrl, { type: 'module' });
      const pending = new Map();
      activeWorkerCancel = () => destroy('Đã hủy tải Marine.');
      let sequence = 0;
      let terminated = false;

      const destroy = (message = 'Phiên giọng đọc đã kết thúc. Hãy nạp lại Marine.') => {
        if (terminated) return;
        terminated = true;
        try { worker.terminate(); } catch (_) {}
        for (const request of pending.values()) {
          clearTimeout(request.timer);
          request.reject(new Error(message));
        }
        pending.clear();
      };

      worker.onmessage = ({ data }) => {
        const request = data && pending.get(data.id);
        if (!request) return;
        pending.delete(data.id);
        clearTimeout(request.timer);
        if (data.error) request.reject(new Error(data.error));
        else request.resolve(data.result);
      };

      worker.onerror = event => {
        if (event && typeof event.preventDefault === 'function') event.preventDefault();
        destroy('Lỗi runtime ZEN-TTS: '+(event?.message || 'Kiểm tra zen-worker.js và vendor/zen-tts/.'));
        if (engine && !engine.isAlive()) {update('error','Lỗi runtime Marine');clearPlaybackCache();}
      };

      const ask = (type, data, transfer = []) => new Promise((resolve, reject) => {
        if (terminated) {
          reject(new Error('Giọng đọc đã dừng. Hãy nạp lại Marine.'));
          return;
        }
        const id = ++sequence;
        const timer = setTimeout(() => destroy('Giọng đọc quá thời gian xử lý.'), 120000);
        pending.set(id, { resolve, reject, timer });
        try {
          worker.postMessage({ id, type, ...data }, transfer);
        } catch (error) {
          clearTimeout(timer);
          pending.delete(id);
          reject(error);
        }
      });

      try {
        const result = await ask('load', { options: engineOptions, assets }, assets.map(asset => asset.body));
        return {
          backend: result && result.backend,
          destroy,
          isAlive: () => !terminated,
          speak: (text, speechOptions) => ask('speak', { text, options: speechOptions })
        };
      } catch (error) {
        destroy();
        throw error;
      }
    }


    async function initFromCacheOrNetwork(autoDownload = false, localResponses = null) {
      if (disposed) return null;
      if (getLocationProtocol() === 'file:') {if (autoDownload || localResponses) onToast('Mở qua HTTP(S) để chạy Marine.','error');return null;}
      if (loadPromise) {
        const escalate = !downloadRequested && autoDownload;
        const result = await loadPromise;
        return !disposed && (localResponses || (escalate && !result)) ? initFromCacheOrNetwork(autoDownload,localResponses) : result;
      }
      if (engine?.isAlive() && !localResponses) return engine;
      downloadRequested = autoDownload || !!localResponses;
      controller = new AbortController(); const signal = controller.signal;
      loadPromise = (async () => {
        const buttons = ['btnDownloadZenMarine','btnModalDownloadZen'].map(getElement);
        const cancelButton = getElement('btnCancelZenDownload');
        let nextEngine = null;
        try {
          status.bytes = 0; status.progress = 0;
          const cache = await openModelCache(), responses = new Map(localResponses || []);
          for (const key of Object.keys(REMOTE_FILES)) {
            const url = REMOTE_FILES[key];
            let saved = responses.get(url) || await cache?.match(url);
            if (saved) {
              try {await validate(key,saved);}
              catch (error) {await cache?.delete(url); if (localResponses) throw error; saved = null;}
              if (saved) responses.set(url,saved);
            }
          }
          if (!autoDownload && !localResponses && responses.size !== 4) {update('not-downloaded','Chưa tải');return null;}
          buttons.forEach(button => {if (button) button.disabled = true;});
          if (cancelButton) cancelButton.hidden = false;
          for (const key of Object.keys(REMOTE_FILES)) {
            if (signal.aborted) throw new Error('Đã hủy tải.');
            const url = REMOTE_FILES[key];
            if (!responses.has(url)) {update('downloading','Đang tải Marine...');responses.set(url,await validate(key,await download(key,signal)));}
          }
          update('downloaded','Đã tải · đã kiểm tra SHA-256',{progress:100});
          if (signal.aborted) throw new Error('Đã hủy tải.');
          update('initializing','Đang khởi tạo và tổng hợp mẫu tiếng Nhật...');
          nextEngine = await createEngine({modelsUrl:'https://cdn.jsdelivr.net/gh/zenryokukikai/zen-tts@v1.3.0/models',cpuWasmUrl:REMOTE_FILES.cpuWasm,model:REMOTE_FILES.marineZtm},responses);
          const sample = await nextEngine.speak('こんにちは。',{emotion:{neutral:100},speed:1,pitch:0});
          if (!sample?.wav || sample.wav.size <= 44 || sample.samples < 1000) throw new Error('ZEN không tạo được mẫu kiểm tra hợp lệ.');
          if (signal.aborted || disposed) throw new Error('Đã hủy tải.');
          let persisted = !!cache;
          if (cache) {try {for (const [url,response] of responses) await cache.put(url,response.clone());} catch {persisted = false;}}
          stopPlayback();engine?.destroy();engine = nextEngine;nextEngine = null;clearPlaybackCache();
          activeWorkerCancel = null;
          const backend = String(engine.backend || 'CPU').toUpperCase();
          update('ready',`Sẵn sàng (${backend})`,{backend,smokeSamples:sample.samples,smokeSampleRate:sample.sampleRate,persisted,progress:100});
          const detail = getElement('zenDownloadDetail'); if (detail) detail.textContent = `Marine v1.3.0: tổng hợp mẫu thành công. ${persisted ? 'Đã lưu cache đã kiểm tra.' : 'Không lưu được cache; có thể cần tải lại.'}`;
          emit('tts:ready',{backend,samples:sample.samples});
          if (autoDownload || localResponses) onToast('Đã kích hoạt ZEN-TTS Marine!','success');
          return engine;
        } catch (error) {
          nextEngine?.destroy(); activeWorkerCancel?.();
          const cancelled = signal.aborted;
          update(cancelled ? 'not-downloaded':'error',cancelled ? 'Đã hủy tải':'Lỗi nạp Marine',{error:error.message});
          const detail = getElement('zenDownloadDetail'); if (detail) detail.textContent = error.message;
          if (!cancelled && (autoDownload || localResponses)) onToast('Lỗi nạp Marine: '+error.message,'error');
          return null;
        } finally {buttons.forEach(button => {if (button) button.disabled = false;});if (cancelButton) cancelButton.hidden = true;activeWorkerCancel = null;}
      })();
      try {return await loadPromise;} finally {loadPromise = null;controller = null;}
    }
    async function initFromLocalFiles(fileList) {
      try {
        const files = Array.from(fileList || []), responses = new Map();
        for (const key of Object.keys(REMOTE_FILES)) {
          const name = REMOTE_FILES[key].split('/').pop(), matches = files.filter(file => file.name === name);
          if (matches.length !== 1) throw new Error(`Cần đúng một file ${name} của ZEN-TTS v1.3.0.`);
          responses.set(REMOTE_FILES[key],new ResponseCtor(await matches[0].arrayBuffer()));
        }
        return initFromCacheOrNetwork(true,responses);
      } catch(error) {update('error','Lỗi thư mục Marine',{error:error.message});onToast(error.message,'error');return null;}
    }
    function cancel() {controller?.abort();activeWorkerCancel?.();}
    function destroy() {disposed = true;cancel();engine?.destroy();engine = null;}
    return Object.freeze({getEngine:() => engine?.isAlive() ? engine:null,getStatus:() => ({...status}),initFromCacheOrNetwork,initFromLocalFiles,cancel,destroy,getRemoteFiles:() => ({...REMOTE_FILES}),getIntegrity:() => ({...HASHES})});
  }
  window.KawaiiAudioManagerModule = Object.freeze({create});
})();
