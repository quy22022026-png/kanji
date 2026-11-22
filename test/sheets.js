/**
 * Kawaii JLPT - Google Sheets / CSV ingestion module.
 * Owns sheet URL parsing, CSV parsing, schema validation and dataset retrieval.
 * Does not mutate application state, storage, SRS progress or the active dataset.
 */
(() => {
  'use strict';

  const LEVELS = Object.freeze(['N5', 'N4', 'N3', 'N2', 'N1']);
  const OPTIONAL_TABS = Object.freeze({ dictionary: 'Từ điển', variants: 'Biến thể' });

  function normalizeHeader(value) {
    return String(value || '').normalize('NFC').toLowerCase().trim().replace(/\s+/g, ' ');
  }

  function extractGoogleSheetId(input) {
    const value = String(input || '').trim();
    const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) return match[1];
    return /^[a-zA-Z0-9-_]{20,}$/.test(value) ? value : '';
  }

  function parseCSV(text) {
    if (typeof text !== 'string') throw new TypeError('Nội dung CSV phải là chuỗi.');
    const source = text.replace(/^\uFEFF/, '');
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (inQuotes) {
        if (char === '"' && source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          field += char;
        }
      } else if (char === '"') {
        if (field.length) throw new Error(`CSV không hợp lệ: dấu ngoặc kép tại ký tự ${index + 1} không đúng vị trí.`);
        inQuotes = true;
      } else if (char === ',') {
        row.push(field.trim());
        field = '';
      } else if (char === '\r' || char === '\n') {
        if (char === '\r' && source[index + 1] === '\n') index += 1;
        row.push(field.trim());
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }

    if (inQuotes) throw new Error('CSV không hợp lệ: thiếu dấu ngoặc kép đóng.');
    row.push(field.trim());
    if (row.some(cell => cell !== '')) rows.push(row);
    return rows;
  }

  function findColumn(headers, aliases) {
    return headers.findIndex(header => aliases.some(alias => header === alias || header.includes(alias)));
  }

  function stableId(prefix, value) {
    // FNV-1a over UTF-16 code units: deterministic across browsers and row ordering.
    const source = String(value || '').normalize('NFC');
    let hash = 0x811c9dc5;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return `${prefix}_${(hash >>> 0).toString(16).padStart(8, '0')}`;
  }

  function mapVocabularyRows(rows, fallbackLevel = 'N5', options = {}) {
    options = options || {};
    const level = String(fallbackLevel || 'N5').toUpperCase();
    if (!LEVELS.includes(level)) throw new Error(`Cấp JLPT không hợp lệ: ${level}.`);
    if (!Array.isArray(rows) || rows.length < 2) {
      throw new Error(`Tab ${level} không có dòng từ vựng.`);
    }

    const headers = rows[0].map(normalizeHeader);
    const index = {
      id: findColumn(headers, ['id', 'mã từ']),
      level: findColumn(headers, ['jlpt level', 'level', 'cấp độ', 'jlpt']),
      kanji: findColumn(headers, ['kanji', 'chữ hán']),
      kana: findColumn(headers, ['hiragana', 'kana', 'reading']),
      furigana: findColumn(headers, ['furigana']),
      romaji: findColumn(headers, ['romaji']),
      hanViet: findColumn(headers, ['hán-việt', 'hán việt', 'hanviet', 'han_viet']),
      meaning: findColumn(headers, ['nghĩa tiếng việt', 'nghĩa', 'meaning']),
      pos: findColumn(headers, ['loại từ', 'từ loại', 'pos']),
      topic: findColumn(headers, ['chủ đề', 'topic']),
      exJa: findColumn(headers, ['ví dụ (jp)', 'ví dụ jp', 'example japanese', 'example']),
      exRomaji: findColumn(headers, ['ví dụ (romaji)', 'ví dụ romaji', 'example romaji']),
      exVi: findColumn(headers, ['dịch ví dụ', 'ví dụ vi', 'example vietnamese'])
    };

    if (index.id < 0) throw new Error(`Tab ${level} thiếu cột ID. Hãy giữ ID cố định cho từng từ để không làm lệch lịch SRS.`);
    if (index.kanji < 0 && index.kana < 0) throw new Error(`Tab ${level} cần có cột Kanji hoặc Hiragana/Kana.`);
    if (index.meaning < 0) throw new Error(`Tab ${level} thiếu cột Nghĩa tiếng Việt.`);

    const words = [];
    const seenIds = new Set();
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const columns = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
      const get = columnIndex => columnIndex >= 0 && columns[columnIndex] !== undefined
        ? String(columns[columnIndex]).trim()
        : '';
      if (!columns.some(cell => String(cell ?? '').trim() !== '')) continue;

      const id = get(index.id);
      const kanji = get(index.kanji);
      const rawKana = get(index.kana);
      const furiganaValue = get(index.furigana);
      const kana = rawKana || furiganaValue.replace(/\[[^\]]*\]/g, '');
      const displayWord = kanji || kana;
      const meaning = get(index.meaning);
      if (!displayWord || !meaning) {
        throw new Error(`Tab ${level}, dòng ${rowIndex + 1}: thiếu ${!displayWord ? 'Kanji/Hiragana' : 'Nghĩa tiếng Việt'}.`);
      }
      if (!id) {
        throw new Error(`Tab ${level}, dòng ${rowIndex + 1}: thiếu ID. Không tự tạo ID theo số dòng vì có thể làm mất liên kết tiến độ SRS.`);
      }
      if (seenIds.has(id)) throw new Error(`Tab ${level}, dòng ${rowIndex + 1}: ID bị trùng (${id}).`);
      seenIds.add(id);

      const rawLevel = get(index.level).toUpperCase() || level;
      if (!LEVELS.includes(rawLevel)) {
        throw new Error(`Tab ${level}, dòng ${rowIndex + 1}: cấp JLPT không hợp lệ (${rawLevel}).`);
      }
      if (options.expectedLevel === true && rawLevel !== level) {
        throw new Error(`Tab ${level}, dòng ${rowIndex + 1}: cấp JLPT ${rawLevel} không khớp tên tab ${level}.`);
      }

      const exampleJa = get(index.exJa);
      words.push({
        id,
        level: rawLevel,
        kanji,
        kana: kana || displayWord,
        furigana: furiganaValue || kana || displayWord,
        romaji: get(index.romaji),
        hanViet: get(index.hanViet),
        meaning,
        pos: get(index.pos),
        topic: get(index.topic) || 'Chung',
        example: exampleJa ? {
          ja: exampleJa,
          romaji: get(index.exRomaji),
          vi: get(index.exVi)
        } : null
      });
    }

    if (!words.length) throw new Error(`Tab ${level} không có từ vựng hợp lệ.`);
    return words;
  }

  function mapDictionaryRows(rows, options = {}) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('Tab Từ điển trống hoặc không đọc được.');
    const headers = rows[0].map(normalizeHeader);
    const index = {
      id: findColumn(headers, ['id', 'mã từ']),
      term: findColumn(headers, ['từ tiếng nhật', 'từ nhật', 'japanese word', 'word', 'kanji']),
      reading: findColumn(headers, ['hiragana', 'kana', 'reading']),
      meaning: findColumn(headers, ['nghĩa tiếng việt', 'nghĩa', 'meaning']),
      pos: findColumn(headers, ['loại từ', 'từ loại', 'pos']),
      level: findColumn(headers, ['jlpt', 'level', 'cấp độ']),
      note: findColumn(headers, ['ghi chú', 'note'])
    };
    if (index.term < 0 || index.meaning < 0) {
      throw new Error('Tab Từ điển cần các cột: Từ tiếng Nhật và Nghĩa tiếng Việt.');
    }

    const entries = [];
    const seenTerms = new Set();
    const seenIds = new Set();
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const columns = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
      const get = columnIndex => columnIndex >= 0 && columns[columnIndex] !== undefined
        ? String(columns[columnIndex]).trim()
        : '';
      if (!columns.some(cell => String(cell ?? '').trim() !== '')) continue;
      const term = get(index.term);
      const meaning = get(index.meaning);
      if (!term || !meaning) {
        throw new Error(`Tab Từ điển, dòng ${rowIndex + 1}: cần có Từ tiếng Nhật và Nghĩa tiếng Việt.`);
      }
      const normalizedTerm = term.normalize('NFC');
      const termKey = options.allowHomographs ? normalizedTerm + '\u0000' + get(index.reading) : normalizedTerm;
      if (seenTerms.has(termKey)) throw new Error(`Tab Từ điển, dòng ${rowIndex + 1}: từ bị trùng (${term}).`);
      seenTerms.add(termKey);
      const id = get(index.id) || stableId('DICT', normalizedTerm);
      if (seenIds.has(id)) throw new Error(`Tab Từ điển, dòng ${rowIndex + 1}: ID bị trùng (${id}).`);
      seenIds.add(id);
      const level = get(index.level).toUpperCase();
      if (level && !LEVELS.includes(level)) {
        throw new Error(`Tab Từ điển, dòng ${rowIndex + 1}: JLPT không hợp lệ (${level}).`);
      }
      entries.push({
        id,
        term: normalizedTerm,
        reading: get(index.reading),
        meaning,
        pos: get(index.pos),
        level,
        note: get(index.note)
      });
    }
    return entries;
  }

  function mapVariantRows(rows) {
    if (!Array.isArray(rows) || !rows.length) throw new Error('Tab Biến thể trống hoặc không đọc được.');
    const headers = rows[0].map(normalizeHeader);
    const index = {
      variant: findColumn(headers, ['biến thể', 'dạng biến thể', 'variant', 'inflected form']),
      base: findColumn(headers, ['từ gốc', 'nguyên mẫu', 'base', 'lemma'])
    };
    if (index.variant < 0 || index.base < 0) {
      throw new Error('Tab Biến thể cần hai cột: Biến thể và Từ gốc.');
    }

    const entries = [];
    const seen = new Map();
    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const columns = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
      const get = columnIndex => columnIndex >= 0 && columns[columnIndex] !== undefined
        ? String(columns[columnIndex]).trim()
        : '';
      if (!columns.some(cell => String(cell ?? '').trim() !== '')) continue;
      const variant = get(index.variant).normalize('NFC');
      const base = get(index.base).normalize('NFC');
      if (!variant || !base) {
        throw new Error(`Tab Biến thể, dòng ${rowIndex + 1}: cần có cả Biến thể và Từ gốc.`);
      }
      if (variant === base) throw new Error(`Tab Biến thể, dòng ${rowIndex + 1}: biến thể không được trùng từ gốc (${base}).`);
      if (seen.has(variant)) {
        const previousBase = seen.get(variant);
        throw new Error(`Tab Biến thể, dòng ${rowIndex + 1}: biến thể ${variant} bị khai báo trùng (${previousBase} / ${base}).`);
      }
      seen.set(variant, base);
      entries.push({ variant, base });
    }
    return entries;
  }

  function isHtmlResponse(text) {
    const value = String(text || '').trim().slice(0, 500).toLowerCase();
    return value.startsWith('<!doctype html') || value.startsWith('<html') ||
      value.includes('<html') || value.includes('<form') && value.includes('accounts.google.com');
  }

  function isGvizError(text) {
    const value = String(text || '');
    return value.includes('google.visualization.Query.setResponse') ||
      /"status"\s*:\s*"error"/i.test(value);
  }

  function create(options = {}) {
    const timeoutMs = Math.max(1000, Number(options.timeoutMs) || 25000);
    const fetcher = options.fetcher || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);

    const controllers = new Set();
    let disposed = false;
    function cancelPending() {for (const controller of controllers) controller.abort();controllers.clear();}
    async function requestCsv(sheetId, sheetName, optional = false) {
      if (disposed) throw new Error('Sheets module đã dừng.');
      if (typeof fetcher !== 'function') throw new Error('Trình duyệt không hỗ trợ fetch để đọc Google Sheets.');
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      if (controller) controllers.add(controller);
      let timer = null;
      try {
        const requestOptions = controller ? { signal: controller.signal } : {};
        if (controller) timer = setTimeout(() => controller.abort(), timeoutMs);
        const response = await fetcher(url, requestOptions);
        if (!response || typeof response.text !== 'function') {
          throw new Error(`Tab ${sheetName}: phản hồi máy chủ không hợp lệ.`);
        }
        if (!response.ok) {
          throw new Error(`Không tải được tab ${sheetName} (HTTP ${response.status || 'không xác định'}).`);
        }
        const text = await response.text();
        if (isHtmlResponse(text)) {
          throw new Error('Google Sheets đang ở chế độ riêng tư. Hãy bật chia sẻ "Bất kỳ ai có đường liên kết đều xem được".');
        }
        if (isGvizError(text)) throw new Error(`Không tìm thấy hoặc không đọc được tab ${sheetName}.`);
        if (!text.trim()) throw new Error(`Tab ${sheetName} không có dữ liệu CSV.`);
        return text;
      } catch (error) {
        if (error?.name === 'AbortError') throw new Error(`Quá thời gian kết nối khi đọc tab ${sheetName}. Hãy kiểm tra mạng.`);
        throw error;
      } finally {
        if (timer !== null) clearTimeout(timer);
        if (controller) controllers.delete(controller);
      }
    }

    async function loadOptional(sheetId, sheetName, mapper, kind) {
      let text;
      try {
        text = await requestCsv(sheetId, sheetName, true);
      } catch (error) {
        if (String(error?.message || '').includes('chế độ riêng tư')) throw error;
        return {
          available: false,
          entries: [],
          warning: `Không tải được tab ${sheetName}; dữ liệu ${kind} đã lưu trước đó sẽ được giữ nguyên (${error.message}).`
        };
      }
      try {
      const rows = parseCSV(text);
      if (!rows.length) {
        return { available: false, entries: [], warning: `Tab ${sheetName} chưa có dữ liệu; giữ dữ liệu ${kind} đã lưu trước đó.` };
      }
      return { available: true, entries: mapper(rows), warning: null };
      } catch (error) {return {available:false,entries:[],warning:`Tab ${sheetName}: ${error.message}; giữ cache bổ sung.`};}
    }

    async function fetchDataset({ url, levels = ['N5', 'N4', 'N3'] } = {}) {
      const sheetId = extractGoogleSheetId(url);
      if (!sheetId) throw new Error('Hãy cung cấp link Google Sheets hợp lệ có chứa /spreadsheets/d/ hoặc ID bảng tính.');
      const selectedLevels = [...new Set((Array.isArray(levels) ? levels : []).map(value => String(value).toUpperCase()))];
      if (!selectedLevels.length) throw new Error('Chưa chọn cấp JLPT cần tải.');
      const invalidLevel = selectedLevels.find(level => !LEVELS.includes(level));
      if (invalidLevel) throw new Error(`Cấp JLPT không được hỗ trợ: ${invalidLevel}.`);

      const words = [];
      const loadedSheets = [];
      const seenIds = new Set();
      for (const level of selectedLevels) {
        const csvText = await requestCsv(sheetId, level);
        const parsedWords = mapVocabularyRows(parseCSV(csvText), level, { expectedLevel: true });
        for (const word of parsedWords) {
          if (seenIds.has(word.id)) throw new Error(`ID ${word.id} bị trùng giữa các tab JLPT. Không thay bộ dữ liệu hiện tại.`);
          seenIds.add(word.id);
          words.push(word);
        }
        loadedSheets.push(`${level}(${parsedWords.length})`);
      }
      if (!words.length) throw new Error('Không đọc được từ vựng nào. Bộ dữ liệu hiện tại được giữ nguyên.');

      const [dictionary, variants] = await Promise.all([
        loadOptional(sheetId, OPTIONAL_TABS.dictionary, mapDictionaryRows, 'từ điển'),
        loadOptional(sheetId, OPTIONAL_TABS.variants, mapVariantRows, 'biến thể')
      ]);
      if (disposed) throw new Error('Sheets module đã dừng.');
      const warnings = [dictionary.warning, variants.warning].filter(Boolean);
      return {
        meta: {
          title: `Google Sheets · ${loadedSheets.join(', ')}`,
          source: 'sheets',
          sheetId,
          syncedAt: Date.now(),
          loadedSheets
        },
        words,
        supplemental: { dictionary, variants },
        warnings
      };
    }

    function parseVocabularyCsv(text, fallbackLevel = 'N5') {
      return mapVocabularyRows(parseCSV(text), fallbackLevel);
    }

    async function parseVocabularyFiles(files) {
      const allWords = [];
      for (const file of Array.from(files || [])) {
        if (!file || typeof file.text !== 'function') throw new TypeError('Tệp CSV không hợp lệ.');
        const fallbackLevel = String(file.name || '').match(/(N[1-5])/i)?.[1]?.toUpperCase() || 'N5';
        allWords.push(...parseVocabularyCsv(await file.text(), fallbackLevel));
      }
      if (!allWords.length) throw new Error('Không đọc được từ vựng nào từ các file CSV.');
      const seenIds = new Set();
      allWords.forEach(word => {
        if (seenIds.has(word.id)) throw new Error(`ID ${word.id} bị trùng giữa các file CSV.`);
        seenIds.add(word.id);
      });
      return allWords;
    }

    return Object.freeze({
      cancelPending, destroy() {disposed = true;cancelPending();},
      extractGoogleSheetId,
      parseCSV,
      mapVocabularyRows,
      mapDictionaryRows,
      mapVariantRows,
      parseVocabularyCsv,
      parseVocabularyFiles,
      fetchDataset,
      getOptionalTabNames: () => ({ ...OPTIONAL_TABS })
    });
  }

  window.KawaiiSheetsModule = Object.freeze({ create });
})();
