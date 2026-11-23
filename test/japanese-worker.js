/* Kuromoji 0.1.2. Keep its dictionary and analysis off the UI thread. */
importScripts('./vendor/kuromoji/kuromoji.js');

const dictionaryPath = './vendor/kuromoji/dict/';
const dictionaryCache = typeof caches === 'undefined'
  ? Promise.resolve(null)
  : caches.open('kawaii-ja-dict-kuromoji-0.1.2').catch(() => null);

// The upstream browser build reads gzip files through XMLHttpRequest.
// Use Cache Storage in this worker so the first download is cached even
// when the page's service worker has not taken control yet.
self.XMLHttpRequest = class DictionaryRequest {
  open(_method, path) {
    this.url = new URL(path,self.location.href).href;
  }

  async send() {
    try {
      const cache = await dictionaryCache;
      let response = await cache?.match(this.url).catch(() => null);
      if (!response) {
        response = await fetch(this.url);
        if (cache && response.ok) await cache.put(this.url,response.clone()).catch(() => {});
      }
      this.status = response.status;
      this.statusText = response.statusText || String(response.status);
      this.response = await response.arrayBuffer();
      this.onload();
    } catch (error) {
      this.onerror(error);
    }
  }
};

let tokenizer;

function loadTokenizer() {
  if (!tokenizer) {
    tokenizer = new Promise((resolve, reject) => {
      self.kuromoji.builder({dicPath:dictionaryPath}).build((error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
  }
  return tokenizer;
}

self.addEventListener('message', async ({data}) => {
  const {id,sentence} = data;
  try {
    const analyzer = await loadTokenizer();
    const parts = analyzer.tokenize(sentence).map(part => ({
      text: part.surface_form,
      lemma: part.basic_form === '*' ? '' : part.basic_form,
      pos: part.pos,
      detail: part.pos_detail_1,
      reading: part.reading === '*' ? '' : part.reading
    }));
    self.postMessage({id,parts});
  } catch (error) {
    self.postMessage({id,error:String(error?.message || error)});
  }
});
