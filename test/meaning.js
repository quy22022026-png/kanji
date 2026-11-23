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
          note: `${label} · Từ gốc: ${entry.base}`
        };
      }
    }
    return best;
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

      const forms = new Map();
      function addForm(text,entry,form) {
        if (!forms.has(text)) forms.set(text,[]);
        forms.get(text).push({entry,form});
      }
      for (const [term,entry] of [...index]) {
        if (entry.fragment || typeof entry.meaning !== 'string' || !entry.meaning.trim()) continue;
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
          if (form !== 'stem' && !index.has(text)) index.set(text,{...inflected,reading:kana || text});
        }
      }
      formsByDictionary.set(index,forms);

      const variantEntries = supplemental.variants?.entries || [];
      variantEntries.forEach(item => {
        const variant = String(item?.variant || '').trim();
        const base = String(item?.base || '').trim();
        if (!variant || !base) return;
        const baseEntry = index.get(base);
        index.set(variant, baseEntry
          ? { ...baseEntry, text: variant, base, reading:index.get(variant)?.reading || variant, note: [baseEntry.note, `Biến thể của ${base}`].filter(Boolean).join(' · ') }
          : { text: variant, reading: variant, hanViet: '', meaning: `Dạng biến thể của ${base}`, level: '', note: `Từ gốc: ${base}` });
      });
      return index;
    }

    let segmenter = options.segmenter;
    if (segmenter === undefined) {
      try {segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('ja',{granularity:'word'}) : null;} catch {segmenter = null;}
    }
    function tokenize(sentence) {
      const source = String(sentence || '');
      const lexicon = getDictionaryIndex() || new Map();
      const forms = formsByDictionary.get(lexicon) || new Map();
      const maxLength = getDictionaryMaxLength(lexicon);
      const segmentEnds = new Map();
      const boundaries = new Set([0,source.length]);
      if (segmenter) {
        for (const {index,segment} of segmenter.segment(source)) {
          segmentEnds.set(index,index+segment.length);
          boundaries.add(index);
          boundaries.add(index+segment.length);
        }
      }

      const separator = /^[\p{P}\p{Z}\s\p{S}]$/u;
      const charAt = index => String.fromCodePoint(source.codePointAt(index));
      function matchAt(start) {
        let best = null;
        for (let length = Math.min(maxLength,source.length-start); length > 0; length--) {
          const text = source.slice(start,start+length);
          const entry = lexicon.get(text);
          if (entry && !entry.fragment && (!best || length > best.text.length)) {
            const end = start+length;
            const insideWord = end < (segmentEnds.get(start) || 0);
            const complete = boundaries.has(end) && (length > 1 || boundaries.has(start));
            if (!segmenter || (!insideWord && (complete || entry.base || entry.grammar))) {
              best = {text,punct:false,known:true,base:entry.base || text};
            }
          }
          for (const candidate of forms.get(text) || []) {
            const phrase = phraseEntry(source,start,text,candidate.entry,candidate.form);
            if (!phrase) continue;
            const end = start+phrase.text.length;
            if (segmenter && !boundaries.has(end)) continue;
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
        let end = segmentEnds.get(cursor) || cursor+char.length;
        while (end < source.length && !matchAt(end)) {
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

    function renderSentence(container, sentence, parentWord = null) {
      if (!container) return;
      container.replaceChildren();
      tokenize(sentence).forEach(token => {
        if (token.punct) {
          container.appendChild(document.createTextNode(token.text));
        } else {
          container.appendChild(createTapToken(token.text, token.text, parentWord, {
            underline: token.known,
            entry: token.entry
          }));
        }
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
      if (elements.meaning) elements.meaning.textContent = info.meaning || '';
      if (elements.note) elements.note.textContent = info.note || '';
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
