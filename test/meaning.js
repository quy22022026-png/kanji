/**
 * Kawaii JLPT - Meaning / Tap-to-lookup Module
 * Owns Japanese tokenization, tappable word elements and meaning-sheet rendering.
 */
(() => {
  'use strict';

  const VERB_FORMS = ['te', 'past', 'negative', 'past-negative', 'polite', 'past-polite', 'negative-polite', 'past-negative-polite', 'stem'];
  const GODAN_ENDINGS = {
    う: ['って','った','わ','い'], つ: ['って','った','た','ち'], る: ['って','った','ら','り'],
    む: ['んで','んだ','ま','み'], ぶ: ['んで','んだ','ば','び'], ぬ: ['んで','んだ','な','に'],
    く: ['いて','いた','か','き'], ぐ: ['いで','いだ','が','ぎ'], す: ['して','した','さ','し']
  };

  function verbClass(pos) {
    const label = String(pos || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if (/nhom\s*(3|iii)\b|suru|irregular/.test(label)) return 'irregular';
    if (/nhom\s*(2|ii)\b|ichidan/.test(label)) return 'ichidan';
    if (/nhom\s*(1|i)\b|godan/.test(label)) return 'godan';
    return null;
  }

  // Generate forms only when the dictionary identifies the conjugation class.
  function inflections(term, reading, pos) {
    const group = verbClass(pos);
    const last = term.slice(-1);
    let tailLength = 1;
    let endings;
    if (group === 'irregular' && ['来る','くる'].includes(term)) {
      const kana = ['きて','きた','こない','こなかった','きます','きました','きません','きませんでした','き'];
      const surfaces = term === '来る' ? ['来て','来た','来ない','来なかった','来ます','来ました','来ません','来ませんでした','来'] : kana;
      return surfaces.map((surface,i) => [surface,kana[i],VERB_FORMS[i]]);
    }
    if (group === 'irregular' && term.endsWith('する')) {
      tailLength = 2;
      endings = ['して','した','しない','しなかった','します','しました','しません','しませんでした','し'];
    } else if (group === 'ichidan' && last === 'る') {
      endings = ['て','た','ない','なかった','ます','ました','ません','ませんでした',''];
    } else if (group === 'godan' && GODAN_ENDINGS[last]) {
      const [te,past,negative,stem] = GODAN_ENDINGS[last];
      const iku = ['行く','いく','ゆく','往く','逝く'].includes(term);
      endings = [iku ? 'って' : te, iku ? 'った' : past, negative+'ない',negative+'なかった',stem+'ます',stem+'ました',stem+'ません',stem+'ませんでした',stem];
    } else {
      return [];
    }
    const tail = term.slice(-tailLength);
    const readingStem = reading.endsWith(tail) ? reading.slice(0,-tailLength) : '';
    return endings.map((ending,i) => [
      term.slice(0,-tailLength)+ending,
      readingStem || reading === tail ? readingStem+ending : '',
      VERB_FORMS[i]
    ]);
  }

  // These continuations carry meaning only after the matching verb form.
  const CONTINUATIONS = {
    te: [
      [['はいけませんでした','はいけません','はいけない','はだめです','はだめ'], 'Cấm đoán', word => `Không được ${word}`],
      [['もかまいません','もいいです','もいい','もよい'], 'Cho phép', word => `Có thể ${word}`],
      [['も'], 'Nhượng bộ', word => `Dù có ${word}`],
      [['くださいませんか','ください'], 'Yêu cầu lịch sự', word => `Xin hãy ${word}`],
      [['いませんでした','いなかった','いません','いない'], 'Phủ định của ～ている', word => `Không ${word} hoặc chưa ${word}, tùy ngữ cảnh`],
      [['いました','いた'], '～ている ở quá khứ', word => `Đã hoặc đang ${word} vào lúc đó, tùy ngữ cảnh`],
      [['います','いる'], 'Có thể chỉ hành động đang diễn ra, thói quen hoặc trạng thái tiếp diễn', word => `Đang ${word}`],
      [['しまいました','しまった','しまいます','しまう'], 'Hoàn tất hoặc xảy ra ngoài ý muốn', word => `Đã ${word} rồi, có thể ngoài ý muốn`],
      [['みました','みます','みる'], 'Thử làm', word => `Thử ${word}`],
      [['おきました','おきます','おく'], 'Làm trước để chuẩn bị', word => `${word} trước để chuẩn bị`]
    ],
    past: [
      [['ことがありません','ことがない'], 'Kinh nghiệm', word => `Chưa từng ${word}`],
      [['ことがあります','ことがある'], 'Kinh nghiệm', word => `Đã từng ${word}`],
      [['ほうがいいです','ほうがいい'], 'Lời khuyên', word => `Nên ${word}`]
    ],
    negative: [
      [['といけません','といけない'], 'Nghĩa vụ', word => `Phải ${word}`],
      [['でください'], 'Yêu cầu không làm', word => `Xin đừng ${word}`]
    ],
    'negative-stem': [
      [['くてもいいです','くてもいい','くてもかまいません'], 'Không bắt buộc', word => `Không cần ${word}`],
      [['ければなりません','ければならない','ければいけません','ければいけない'], 'Nghĩa vụ', word => `Phải ${word}`]
    ],
    stem: [
      [['やすい'], 'Dễ thực hiện', word => `Dễ ${word}`],
      [['にくい'], 'Khó thực hiện', word => `Khó ${word}`],
      [['たくありません','たくない'], 'Ý muốn phủ định', word => `Không muốn ${word}`],
      [['たいです','たい'], 'Ý muốn', word => `Muốn ${word}`]
    ]
  };

  function phraseEntry(source, start, surface, entry, form) {
    let best = null;
    const end = start + surface.length;
    for (const [suffixes, label, translate] of CONTINUATIONS[form] || []) {
      for (const suffix of suffixes) {
        if (!source.startsWith(suffix,end)) continue;
        const text = source.slice(start,end+suffix.length);
        if (best && best.text.length >= text.length) continue;
        const meaning = entry.meaning.trim().split(';')[0].trim().replace(/[。.]$/u,'');
        const gloss = meaning.charAt(0).toLocaleLowerCase('vi')+meaning.slice(1);
        best = {
          ...entry, text,
          reading: entry.reading ? entry.reading+suffix : text,
          meaning: translate(gloss),
          contextual: true,
          note: `${label} · Từ gốc: ${entry.base}`
        };
      }
    }
    return best;
  }
  function verbMeaning(meaning,form) {
    const gloss = meaning.split(';')[0].trim();
    const word = gloss.charAt(0).toLocaleLowerCase('vi') + gloss.slice(1);
    switch (form) {
      case 'past':
      case 'past-polite':
        return `Đã ${word}`;
      case 'negative':
      case 'negative-polite':
        return `Không ${word}`;
      case 'past-negative':
      case 'past-negative-polite':
        return `Đã không ${word}`;
      default:
        return meaning;
    }
  }

  const FIXED_EXPRESSIONS = [
    ['ごちそうさまでした','ごちそうさまでした','Cảm ơn vì bữa ăn'],
    ['ご馳走様でした','ごちそうさまでした','Cảm ơn vì bữa ăn'],
    ['お疲れ様でした','おつかれさまでした','Cảm ơn bạn đã vất vả']
  ];

  function adjectiveInflections(term, entry) {
    if (!/tính từ (?:đuôi )?い|i-adjective/i.test(entry.pos || '') || !term.endsWith('い')) return [];
    const stem = term === 'いい' ? 'よ' : term.slice(0,-1);
    const reading = entry.reading || term;
    const kanaStem = reading === 'いい' ? 'よ' : reading.slice(0,-1);
    const gloss = entry.meaning.trim();
    const negativeGloss = gloss.split(';').map(sense => {
      const word = sense.trim();
      return 'không '+word.charAt(0).toLocaleLowerCase('vi')+word.slice(1);
    }).join(' / ');
    const negation = negativeGloss.charAt(0).toLocaleUpperCase('vi')+negativeGloss.slice(1);
    const base = entry.text || term;
    const forms = [
      [term, reading, gloss, 'Lịch sự'],
      [stem+'かった', kanaStem+'かった', gloss, 'Quá khứ'],
      [stem+'くない', kanaStem+'くない', negation, 'Phủ định'],
      [stem+'くなかった', kanaStem+'くなかった', negation, 'Phủ định quá khứ']
    ];
    return forms.flatMap(([text,kana,meaning,kind],i) => {
      const note = `${kind} · Từ gốc: ${base}`;
      const form = {...entry, text, reading:kana, meaning, base, note, contextual:true};
      const polite = {...form, text:text+'です', reading:kana+'です', meaning:meaning+' ạ'};
      return i ? [form,polite] : [polite];
    });
  }

  const workerURL = typeof document === 'object' && document.currentScript
    ? new URL('japanese-worker.js', document.currentScript.src)
    : './japanese-worker.js';

  function createAnalyzer() {
    const cache = new Map();
    const pending = new Map();
    const bySentence = new Map();
    let worker;
    let sequence = 0;
    let closed = false;
    let retryAfter = 0;

    function stop() {
      worker?.terminate();
      worker = null;
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.resolve(null);
      }
      pending.clear();
      bySentence.clear();
    }

    function failed() {
      retryAfter = Date.now()+15000;
      stop();
    }

    function analyze(sentence) {
      if (closed) return Promise.resolve(null);
      if (cache.has(sentence)) return Promise.resolve(cache.get(sentence));
      if (bySentence.has(sentence)) return bySentence.get(sentence);
      if (Date.now() < retryAfter || typeof Worker !== 'function' || !sentence) return Promise.resolve(null);
      if (!worker) {
        try {
          worker = new Worker(workerURL);
        } catch {
          failed();
          return Promise.resolve(null);
        }
        worker.onerror = failed;
        worker.onmessage = ({data}) => {
          if (data.error || !Array.isArray(data.parts)) { failed(); return; }
          const request = pending.get(data.id);
          if (!request) return;
          clearTimeout(request.timer);
          pending.delete(data.id);
          bySentence.delete(request.sentence);
          cache.set(request.sentence,data.parts);
          if (cache.size > 150) cache.delete(cache.keys().next().value);
          request.resolve(data.parts);
        };
      }
      const id = ++sequence;
      const result = new Promise(resolve => {
        pending.set(id,{sentence,resolve,timer:setTimeout(failed,60000)});
      });
      bySentence.set(sentence,result);
      try { worker.postMessage({id,sentence}); } catch { failed(); }
      return result;
    }
    return {
      analyze,
      cached: sentence => cache.get(sentence),
      destroy() {
        closed = true;
        cache.clear();
        stop();
      }
    };
  }

  function alignMorphology(source, parts) {
    if (!parts?.length) return null;
    const spans = new Map();
    let start = 0;
    for (const part of parts) {
      if (!part.text || !source.startsWith(part.text,start)) return null;
      const end = start + part.text.length;
      spans.set(start,{...part,end});
      start = end;
    }
    return start === source.length ? spans : null;
  }

  function hiragana(reading = '') {
    return reading.replace(/[ァ-ヶ]/g,char => String.fromCharCode(char.charCodeAt(0)-0x60));
  }

  const IDIOMS = Object.freeze([
    ['腹が立つ','はらがたつ','Tức giận; nổi giận','Động từ nhóm 1'],
    ['役に立つ','やくにたつ','Có ích; hữu ích','Động từ nhóm 1'],
    ['気に入る','きにいる','Ưng ý; thích','Động từ nhóm 1'],
    ['気を付ける','きをつける','Chú ý; cẩn thận','Động từ nhóm 2'],
    ['お腹が空く','おなかがすく','Đói bụng','Động từ nhóm 1']
  ]);
  const GRAMMAR = Object.freeze({
    'はいけません':['はいけません','Không được làm… (mẫu cấm đoán)'],
    'いけません':['いけません','Không được; không ổn'],
    'なければならない':['なければならない','Phải làm…'],
    'なくてもいい':['なくてもいい','Không cần làm… cũng được'],
    'ことができる':['ことができる','Có thể làm…'],
    'どんなに':['どんなに','Dù… đến mức nào; biết bao nhiêu'],
    'ても':['ても','Dù; ngay cả khi…'], 'でも':['でも','Nhưng; dù…'],
    'は':['わ','Trợ từ chủ đề'], 'が':['が','Trợ từ chủ ngữ'], 'を':['を','Trợ từ chỉ đối tượng'],
    'に':['に','Trợ từ chỉ thời gian, đích đến'], 'も':['も','Cũng; ngay cả'],
    'です':['です','Là (lịch sự)']
  });

  function create(options = {}) {
    let dictionary = new Map();
    const getDictionaryIndex = options.getDictionaryIndex || (() => dictionary);
    const formsByDictionary = new WeakMap();
    const readingAliasesByDictionary = new WeakMap();

    function findRoot(index,base) {
      if (!base) return null;
      const isRoot = entry => Boolean(entry?.meaning && !entry.base && !entry.fragment);
      const key = base.normalize('NFC');
      const exact = index.get(key);
      const readings = readingAliasesByDictionary.get(index);
      const isKana = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(key);
      if (isRoot(exact) && (!isKana || exact.text === key || !readings)) return exact;
      if (isKana) {
        const alias = readings?.get(hiragana(key));
        if (alias) return alias;
      }
      if (key.endsWith('する')) {
        const noun = index.get(key.slice(0,-2));
        if (isRoot(noun) && verbClass(noun.pos) === 'irregular') return noun;
      }
      return null;
    }

    const analyzer = createAnalyzer();
    const sentenceRenders = new WeakMap();
    const lookup = options.lookup || ((token, parentWord) => getDictionaryIndex().get(token) || (parentWord && [parentWord.kanji,parentWord.kana].includes(token) ? {text:token,reading:parentWord.kana,hanViet:parentWord.hanViet || '',meaning:parentWord.meaning,level:parentWord.level,note:`Thuộc từ: ${parentWord.kanji}`} : {
      text: token, reading: token, hanViet: '',
      meaning: 'Chưa có trong từ điển hiện tại',
      note: 'Ấn nút 🔊 để nghe cách phát âm'
    }));
    const onSpeak = options.onSpeak || (() => {});
    const getElements = options.getElements || (() => ({}));
    let activeSpeakText = '';
    let cachedDictionaryRef = null;
    let cachedDictionarySize = -1;
    let cachedDictionaryMaxLength = 8;

    function getDictionaryMaxLength(dictionary) {
      const size = Number.isFinite(dictionary?.size) ? dictionary.size : -1;
      if (dictionary !== cachedDictionaryRef || size !== cachedDictionarySize) {
        cachedDictionaryRef = dictionary;
        cachedDictionarySize = size;
        cachedDictionaryMaxLength = dictionary && typeof dictionary.keys === 'function'
          ? [...dictionary.keys()].reduce((max, key) => Math.max(max, String(key || '').length), 1)
          : 8;
      }
      return cachedDictionaryMaxLength;
    }

    function buildDictionaryIndex({ builtinDictionary = {}, words = [], supplemental = {} } = {}) {
      const index = new Map(Object.entries(GRAMMAR).map(([text,[reading,meaning]]) => [text,{text,reading,meaning,grammar:true}]));
      for (const [text,reading,meaning,pos] of IDIOMS) {
        const entry = {text,reading,meaning,pos,note:'Cụm cố định'};
        index.set(text,entry);index.set(reading,entry);
      }
      Object.entries(builtinDictionary || {}).forEach(([term, entry]) => {
        index.set(term, { ...index.get(term), text: term, ...(entry || {}) });
      });

      const dictionaryEntries = supplemental.dictionary?.entries || [];
      dictionaryEntries.forEach(item => {
        const term = String(item?.term || '').trim();
        if (!term || index.has(term)) return;
        index.set(term, {
          text: term,
          reading: item.reading || term,
          hanViet: item.hanViet || '',
          meaning: item.meaning || '',
          level: item.level || '',
          pos:item.pos || '',
          note: [item.pos, item.note].filter(Boolean).join(' · ')
        });
      });

      (Array.isArray(words) ? words : []).forEach(word => {
        if (!word) return;
        const entry = {
          text: word.kanji || word.kana,
          pos:word.pos || '',
          reading: word.kana,
          hanViet: word.hanViet || '',
          meaning: word.meaning,
          level: word.level,
          note: [word.pos, word.topic].filter(Boolean).join(' · ')
        };
        if (word.kanji) index.set(word.kanji, entry);
        if (word.kana && !index.has(word.kana)) index.set(word.kana, entry);

        if (word.furigana && word.furigana.includes('[')) {
          const parts = [...word.furigana.matchAll(/(\p{Script=Han}+)\[([^\]]+)\]/gu)];
          const hanVietParts = word.hanViet ? word.hanViet.split(/\s+/) : [];
          parts.forEach((match, partIndex) => {
            const kanji = match[1];
            const reading = match[2];
            if (kanji.length === 1 && !index.has(kanji)) {
              index.set(kanji, {
                text: kanji, fragment:true,
                reading,
                hanViet: hanVietParts[partIndex] || word.hanViet || '',
                meaning: `Trong từ "${word.kanji}" (${word.meaning})`,
                level: word.level,
                note: `Cách đọc trong ${word.kanji}: ${reading}`
              });
            }
          });
        }
      });

      for (const [text,reading,meaning] of FIXED_EXPRESSIONS) {
        if (!index.has(text)) index.set(text,{text,reading,meaning,note:'Lời nói cố định'});
      }
      // A kana alias can resolve a base written with kanji in Tu dien.
      // Multiple terms with the same reading leave the alias unavailable.
      const readings = new Map();
      for (const entry of index.values()) {
        if (entry.fragment || !entry.meaning || !entry.reading) continue;
        if (!/^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u.test(entry.reading)) continue;
        const reading = hiragana(entry.reading.normalize('NFC'));
        if (!readings.has(reading)) readings.set(reading,entry);
        else if (readings.get(reading)?.text !== entry.text) readings.set(reading,null);
      }
      readingAliasesByDictionary.set(index,readings);

      const forms = new Map();
      function addForm(text,entry,form) {
        if (!forms.has(text)) forms.set(text,[]);
        forms.get(text).push({entry,form});
      }
      for (const [term,entry] of [...index]) {
        if (entry.fragment || typeof entry.meaning !== 'string' || !entry.meaning.trim()) continue;
        for (const form of adjectiveInflections(term,entry)) {
          if (!index.has(form.text)) index.set(form.text,form);
        }
        // Some vocabulary rows list a verbal noun such as 勉強 with POS “nhóm 3”.
        const isSuruNoun = verbClass(entry.pos) === 'irregular' && !term.endsWith('する') && /danh từ/i.test(entry.pos);
        const base = term === entry.reading && entry.text ? entry.text : term;
        const dictionaryForm = isSuruNoun ? term+'する' : term;
        const reading = isSuruNoun ? (entry.reading || '')+'する' : (entry.reading || '');
        for (const [text,kana,form] of inflections(dictionaryForm,reading,entry.pos)) {
          if (!text) continue;
          const inflected = {
            ...entry, text, reading: kana, base: isSuruNoun ? base+'する' : base,
            note: [entry.note,`Dạng chia của ${isSuruNoun ? base+'する' : base}`].filter(Boolean).join(' · ')
          };
          if (CONTINUATIONS[form]) addForm(text,inflected,form);
          if (form === 'negative' && text.endsWith('ない')) {
            addForm(text.slice(0,-1),{...inflected,reading:kana.slice(0,-1)},'negative-stem');
          }
          if (form !== 'stem' && !index.has(text)) {
            const meaning = verbMeaning(entry.meaning,form);
            index.set(text,{...inflected,reading:kana || text,meaning,contextual:meaning !== entry.meaning});
          }
        }
      }
      formsByDictionary.set(index,forms);

      const variantEntries = supplemental.variants?.entries || [];
      variantEntries.forEach(item => {
        const variant = String(item?.variant || '').trim();
        const base = String(item?.base || '').trim();
        if (!variant || !base) return;
        const existing = index.get(variant);
        const baseEntry = findRoot(index,base);
        if (existing?.meaning && !existing.fragment && !existing.base) return;
        // A supplied relation can fill a gap without removing a verified tense or grammar gloss.
        if (existing?.contextual &&
            (existing.base === base || (baseEntry && findRoot(index,existing.base) === baseEntry))) return;
        index.set(variant, {
          ...baseEntry,
          text:variant,
          base,
          reading:existing?.reading || variant,
          meaning:baseEntry?.meaning || `Dạng biến thể của ${base}`,
          note:baseEntry ? '' : `Từ gốc: ${base}`
        });
      });
      return index;
    }

    let segmenter = options.segmenter;
    if (segmenter === undefined) {
      try {segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja',{granularity:'word'}) : null;} catch {segmenter = null;}
    }
    function tokenize(sentence, parts) {
      const source = String(sentence || '');
      const morphology = alignMorphology(source,parts);
      const lexicon = getDictionaryIndex() || new Map();
      const forms = formsByDictionary.get(lexicon) || new Map();
      const maxLength = getDictionaryMaxLength(lexicon);
      const segmentEnds = new Map();
      const boundaries = new Set([0,source.length]);
      if (morphology) {
        for (const [start,part] of morphology) {
          segmentEnds.set(start,part.end);
          boundaries.add(start);
          boundaries.add(part.end);
        }
      } else if (segmenter) {
        for (const {index,segment} of segmenter.segment(source)) {
          segmentEnds.set(index,index+segment.length);
          boundaries.add(index);
          boundaries.add(index+segment.length);
        }
      }

      const separator = /^[\p{P}\p{Z}\s\p{S}]$/u;
      const charAt = index => String.fromCodePoint(source.codePointAt(index));
      function supportsLemma(start,end,base) {
        if (!morphology || !base) return true;
        let cursor = start;
        while (cursor < end) {
          const part = morphology.get(cursor);
          if (!part) return false;
          if (part.lemma) {
            const lemma = source.slice(start,cursor)+part.lemma;
            const entry = findRoot(lexicon,lemma);
            if (lemma === base || entry?.text === base ||
                (entry && entry === findRoot(lexicon,base))) return true;
          }
          cursor = part.end;
        }
        return false;
      }

      function matchAt(start,allowDerived = true) {
        let best = null;
        for (let length = Math.min(maxLength,source.length-start); length > 0; length--) {
          const text = source.slice(start,start+length);
          const entry = lexicon.get(text);
          if (entry && !entry.fragment && (allowDerived || !entry.base) &&
              (!best || length > best.text.length)) {
            const end = start+length;
            const insideWord = end < (segmentEnds.get(start) || 0);
            const complete = boundaries.has(end) && (length > 1 || boundaries.has(start));
            const matches = morphology
              ? complete && supportsLemma(start,end,entry.base)
              : !segmenter || (!insideWord && (complete || entry.base || entry.grammar));
            if (matches) best = {text,punct:false,known:true,base:entry.base || text};
          }
          if (!allowDerived) continue;
          for (const candidate of forms.get(text) || []) {
            const phrase = phraseEntry(source,start,text,candidate.entry,candidate.form);
            if (!phrase) continue;
            const end = start+phrase.text.length;
            if ((morphology || segmenter) && !boundaries.has(end)) continue;
            if (!supportsLemma(start,start+text.length,phrase.base)) continue;
            const preferredBase = entry?.base;
            const sameLength = best?.text.length === phrase.text.length;
            if (!best || phrase.text.length > best.text.length ||
                (sameLength && (!best.entry || (phrase.base === preferredBase && best.base !== preferredBase)))) {
              best = {text:phrase.text,punct:false,known:true,base:phrase.base,entry:phrase};
            }
          }
        }
        return best;
      }

      const tokens = [];
      let cursor = 0;
      while (cursor < source.length) {
        const char = charAt(cursor);
        if (separator.test(char)) {
          tokens.push({text:char,punct:true});
          cursor += char.length;
          continue;
        }
        const known = matchAt(cursor);
        if (known) {
          tokens.push(known);
          cursor += known.text.length;
          continue;
        }
        const part = morphology?.get(cursor);
        if (part) {
          let end = part.end;
          let reading = hiragana(part.reading || part.text);
          let suffix;
          while ((suffix = morphology.get(end)) && ['動詞','形容詞','助動詞'].includes(part.pos) &&
                 (suffix.pos === '助動詞' ||
                  (part.pos === '動詞' && suffix.pos === '動詞' && suffix.detail === '接尾') ||
                  (suffix.detail === '接続助詞' && /^[てで]$/u.test(suffix.text)))) {
            end = suffix.end;
            reading += hiragana(suffix.reading || suffix.text);
          }
          const text = source.slice(cursor,end);
          const root = findRoot(lexicon,part.lemma);
          const hasGloss = Boolean(root && end === part.end);
          const entry = hasGloss
            ? {...root,text,reading,base:part.lemma,note:`Từ gốc: ${part.lemma}`}
            : {text,reading,base:part.lemma,meaning:'Chưa có nghĩa cho cụm này',note:part.lemma ? `Từ gốc: ${part.lemma}` : ''};
          tokens.push({text,punct:false,known:Boolean(root),base:part.lemma || undefined,entry});
          cursor = end;
          continue;
        }
        let end = segmentEnds.get(cursor) || cursor+char.length;
        while (end < source.length && !matchAt(end,false)) {
          const next = charAt(end);
          if (separator.test(next)) break;
          if (segmenter && !/^[\p{Script=Hiragana}ー]$/u.test(next)) break;
          end = segmentEnds.get(end) || end+next.length;
        }
        tokens.push({text:source.slice(cursor,end),punct:false,known:false});
        cursor = end;
      }
      return tokens;
    }

    function clearActiveTokens() {
      if (typeof document === 'undefined') return;
      document.querySelectorAll('.tap-token.is-active').forEach(element => {
        element.classList.remove('is-active');
      });
    }

    function createTapToken(text, lookupKey, parentWord = null, optionsForToken = {}) {
      const span = document.createElement('span');
      span.textContent = String(text || '');
      span.className = optionsForToken.underline
        ? 'tap-token mx-[1px]'
        : 'tap-token border-transparent hover:border-[#FF8FA3]';
      span.addEventListener('click', event => {
        event.stopPropagation();
        clearActiveTokens();
        span.classList.add('is-active');
        showPopup(lookupKey || text, parentWord, optionsForToken.entry);
      });
      return span;
    }

    function createRubyToken(baseText, readingText, parentWord = null) {
      const ruby = document.createElement('ruby');
      ruby.className = 'tap-token mx-[1px]';
      ruby.textContent = String(baseText || '');
      const rt = document.createElement('rt');
      rt.textContent = String(readingText || '');
      ruby.appendChild(rt);
      ruby.addEventListener('click', event => {
        event.stopPropagation();
        clearActiveTokens();
        ruby.classList.add('is-active');
        showPopup(baseText, parentWord);
      });
      return ruby;
    }

    function renderSentence(container, sentence, parentWord = null, {analyze = true} = {}) {
      if (!container) return;
      const ticket = {};
      sentenceRenders.set(container,ticket);

      function render(tokens) {
        const fragment = document.createDocumentFragment();
        for (const token of tokens) {
          if (token.punct) {
            fragment.appendChild(document.createTextNode(token.text));
          } else {
            fragment.appendChild(createTapToken(token.text, token.text, parentWord, {
              underline: token.known,
              entry: token.entry || (token.known ? null : {
                text:token.text, reading:token.text, meaning:'Chưa có nghĩa cho cụm này'
              })
            }));
          }
        }
        container.replaceChildren(fragment);
      }

      const cached = analyzer.cached(sentence);
      render(tokenize(sentence,cached));
      if (cached) {
        container.dataset.japaneseAnalysis = 'ready';
        return;
      }
      if (!analyze) {
        container.dataset.japaneseAnalysis = 'idle';
        return;
      }
      container.dataset.japaneseAnalysis = 'loading';
      analyzer.analyze(sentence).then(parts => {
        if (sentenceRenders.get(container) !== ticket) return;
        container.dataset.japaneseAnalysis = parts ? 'ready' : 'fallback';
        if (!parts) return;
        if (container.querySelector('.tap-token.is-active')) hidePopup();
        render(tokenize(sentence,parts));
      });
    }

    function showPopup(token, parentWord = null, contextualEntry = null) {
      const elements = getElements() || {};
      const info = contextualEntry || lookup(token, parentWord) || {};
      if (elements.charBox) elements.charBox.textContent = info.text || token;
      if (elements.reading) elements.reading.textContent = info.reading || '';
      if (elements.hanViet) {
        elements.hanViet.textContent = info.hanViet || '';
        elements.hanViet.classList.toggle('hidden', !info.hanViet);
      }
      if (elements.level) {
        elements.level.textContent = info.level || '';
        elements.level.classList.toggle('hidden', !info.level);
      }
      const baseEntry = findRoot(getDictionaryIndex(),info.base);
      const hasBaseSection = Boolean(baseEntry && elements.baseSection && (info.base !== token || info.contextual));
      if (elements.contextLabel) elements.contextLabel.classList.toggle('hidden', !info.contextual);
      if (elements.meaning) {
        elements.meaning.textContent = info.meaning || '';
        elements.meaning.classList.toggle('hidden', hasBaseSection && !info.contextual);
      }
      if (elements.baseSection) elements.baseSection.classList.toggle('hidden', !hasBaseSection);
      if (elements.baseWord) elements.baseWord.textContent = hasBaseSection ? info.base : '';
      if (elements.baseMeaning) elements.baseMeaning.textContent = hasBaseSection ? baseEntry.meaning : '';
      if (elements.note) {
        const note = info.note || '';
        const baseNote = `Từ gốc: ${info.base}`;
        elements.note.textContent = hasBaseSection && note.endsWith(baseNote)
          ? note.slice(0,-baseNote.length).replace(/ · $/u,'')
          : note;
      }
      activeSpeakText = info.reading || info.text || token;
      if (elements.sheet) elements.sheet.classList.remove('hidden');
      onSpeak(activeSpeakText);
      return info;
    }

    function hidePopup() {
      const elements = getElements() || {};
      if (elements.sheet) elements.sheet.classList.add('hidden');
      clearActiveTokens();
    }

    function getSpeakText() {
      return activeSpeakText;
    }

    function rebuildIndex() {
      if (options.vocabulary) dictionary = buildDictionaryIndex({builtinDictionary:options.builtinDictionary, words:options.vocabulary.getAll(), supplemental:options.vocabulary.getMeta().supplemental || {}});
    }
    options.events?.on('vocabulary:changed',rebuildIndex);
    rebuildIndex();
    return Object.freeze({
      lookup: (token,parentWord) => ({...lookup(token,parentWord)}), getIndex: () => new Map([...getDictionaryIndex()].map(([key,value]) => [key,{...value}])), speakActive: () => onSpeak(activeSpeakText),
      buildDictionaryIndex,
      tokenize,
      analyzeSentence: analyzer.analyze,
      destroy: analyzer.destroy,
      createTapToken,
      createRubyToken,
      renderSentence,
      showPopup,
      hidePopup,
      clearActiveTokens,
      getSpeakText
    });
  }

  window.KawaiiMeaningModule = Object.freeze({ create });
})();
