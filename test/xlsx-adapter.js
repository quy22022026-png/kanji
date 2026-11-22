/** Explicit mapping of the supplied JLPT workbook; never writes progress or the live source. */
(() => {
  'use strict';
  const MAPPING = Object.freeze({
    N5:'N5', N4:'N4', N3:'N3', dictionary:'Tu dien', variants:'Bien the',
    vocabularyHeaders: Object.freeze(['ID','Level','Kanji','Kana','Furigana','Romaji','Hán-Việt','Nghĩa tiếng Việt','Loại từ','Chủ đề','Ví dụ (JP)','Ví dụ (Romaji)','Dịch ví dụ (VI)']),
    dictionaryHeaders: Object.freeze(['ID','Từ tiếng Nhật','Hiragana','Nghĩa tiếng Việt','Loại từ','JLPT','Ghi chú']),
    variantHeaders: Object.freeze(['Biến thể','Từ gốc','Ghi chú'])
  });
  function create({sheets, parser = window.XLSX} = {}) {
    function rowsOf(workbook, name, headers) {
      const sheet = workbook.Sheets[name];
      if (!sheet) throw new Error(`Không tìm thấy sheet ${name}.`);
      if (sheet['!fullref']) throw new Error(`Sheet ${name}: vượt giới hạn 20.000 dòng; không nhập một phần.`);
      if (sheet['!merges']?.length) throw new Error(`Sheet ${name}: không hỗ trợ ô gộp.`);
      for (const [address,cell] of Object.entries(sheet)) {
        if (address[0] === '!') continue;
        if (cell.f) throw new Error(`Sheet ${name}, ${address}: cần giá trị, không dùng công thức.`);
        if (cell.t === 'e' || (cell.v != null && cell.t !== 's' && cell.t !== 'str')) throw new Error(`Sheet ${name}, ${address}: cần dữ liệu văn bản.`);
      }
      const rows = parser.utils.sheet_to_json(sheet,{header:1,raw:true,defval:'',blankrows:true});
      const actual = rows[0] || [];
      if (headers.some((header,index) => actual[index] !== header) || actual.length !== headers.length) throw new Error(`Sheet ${name}: header không khớp mapping workbook.`);
      return rows;
    }
    function parseWorkbook(workbook, filename = 'JLPT.xlsx') {
      const words = [], ids = new Set(), counts = {}, warnings = [];
      for (const level of ['N5','N4','N3']) {
        const parsed = sheets.mapVocabularyRows(rowsOf(workbook, MAPPING[level], MAPPING.vocabularyHeaders),level,{expectedLevel:true});
        counts[level] = parsed.length;
        for (const word of parsed) { if (ids.has(word.id)) throw new Error(`ID bị trùng giữa sheet: ${word.id}.`); ids.add(word.id); words.push(word); }
      }
      const supplemental = {};
      for (const [kind,headers,mapper] of [['dictionary',MAPPING.dictionaryHeaders,sheets.mapDictionaryRows],['variants',MAPPING.variantHeaders,sheets.mapVariantRows]]) {
        try { const entries = mapper(rowsOf(workbook,MAPPING[kind],headers),{allowHomographs:true}); supplemental[kind] = {available:true,entries}; counts[kind] = entries.length; }
        catch (error) {supplemental[kind] = {available:false,entries:[]}; warnings.push(error.message);}
      }
      const knownTerms = new Set([...words.map(w => w.kanji || w.kana),...(supplemental.dictionary.entries || []).map(e => e.term)]);
      const unresolvedBases = [...new Set((supplemental.variants.entries || []).filter(e => !knownTerms.has(e.base)).map(e => e.base))];
      if (unresolvedBases.length) warnings.push(`${unresolvedBases.length} từ gốc biến thể chưa có trong từ vựng/từ điển.`);
      return {meta:{title:filename,source:'xlsx',mappingVersion:1,supplemental},words,warnings,validation:{counts,unresolvedBases,sheetNames:[...workbook.SheetNames]}};
    }
    async function parse(file) {
      if (!parser) throw new Error('Thiếu SheetJS 0.20.3.');
      const bytes = file?.arrayBuffer ? await file.arrayBuffer() : file;
      if (!bytes || bytes.byteLength > 10 * 1024 * 1024) throw new Error('File XLSX trống hoặc vượt quá 10 MiB.');
      const workbook = parser.read(bytes,{type:'array',cellFormula:true,cellDates:false,sheetRows:20000});
      return parseWorkbook(workbook,file?.name);
    }
    return Object.freeze({parse,parseWorkbook,getMapping: () => MAPPING});
  }
  window.KawaiiXlsxAdapter = Object.freeze({create});
})();
