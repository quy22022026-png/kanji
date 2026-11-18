const LONG_VOWEL_MARK = "\u30FC";
function hiraganaToKatakana(s) {
  let out = "";
  for (const ch of s) {
    const cp = ch.codePointAt(0) ?? 0;
    out += cp >= 12353 && cp <= 12438 || cp === 12445 || cp === 12446 ? String.fromCodePoint(cp + 96) : ch;
  }
  return out;
}
function kanaToPhones(reading, kana) {
  const units = [...hiraganaToKatakana(reading)];
  const phones = [];
  for (let pos = 0; pos < units.length; ) {
    const one = units[pos] ?? "";
    if (one === LONG_VOWEL_MARK) {
      const last = phones[phones.length - 1];
      if (last !== void 0) phones.push(last);
      pos += 1;
      continue;
    }
    const pair = one + (units[pos + 1] ?? "");
    const key = pos + 1 < units.length && pair in kana ? pair : one in kana ? one : null;
    if (key === null) throw new Error(`\u8AAD\u307F\u306B\u4F7F\u3048\u306A\u3044\u6587\u5B57\u3067\u3059\uFF1A${one}`);
    const [consonant, vowel] = kana[key] ?? ["", ""];
    if (consonant !== "") phones.push(consonant);
    phones.push(vowel);
    pos += key.length;
  }
  return phones;
}
export {
  hiraganaToKatakana,
  kanaToPhones
};
