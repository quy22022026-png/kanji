import { foldLongVowels, readLatin } from "./latin-reading.js";
const DIGIT_NAMES = ["\u96F6", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u4E03", "\u516B", "\u4E5D"];
const GROUP_UNITS = ["", "\u4E07", "\u5104", "\u5146", "\u4EAC", "\u5793", "\u79ED", "\u7A63", "\u6E9D", "\u6F97", "\u6B63", "\u8F09", "\u6975"];
const PLACE_UNITS = ["\u5343", "\u767E", "\u5341", ""];
const CURRENCY_UNIT = { "$": "\u30C9\u30EB", "\xA3": "\u30DD\u30F3\u30C9", "\xA5": "\u5186", "\u20AC": "\u30E6\u30FC\u30ED" };
const TO_APOSTROPHE = /* @__PURE__ */ new Set([...`'"()[]`, "\u2018", "\u2019", "\u201C", "\u201D", "\u300C", "\u300D", "\u300A", "\u300B", "\u3010", "\u3011"]);
const TO_COMMA = /* @__PURE__ */ new Set(["\u3001", "\u30FB", "\xB7"]);
const TO_HYPHEN = /* @__PURE__ */ new Set([
  "\u2010",
  "\u2012",
  "\u2013",
  "\u2014",
  "\u2015",
  "\u2043",
  "\u2212",
  "\u2500",
  "\u2501",
  "\u02D7",
  "\u23AF",
  "\u23E4",
  "\u2E3A",
  "\u2E3B"
]);
const TO_LONG_MARK = /* @__PURE__ */ new Set(["~", "\u301C"]);
function isAllowed(cp) {
  if (cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122) return true;
  if (cp === 33 || cp === 63 || cp === 39 || cp === 44 || cp === 45 || cp === 46) return true;
  if (cp >= 880 && cp <= 1023 || cp >= 7936 && cp <= 8191) return true;
  if (cp >= 12352 && cp <= 12440 || cp === 12445 || cp === 12446) return true;
  if (cp === 12293) return true;
  if (cp >= 12448 && cp <= 12538 || cp >= 12540 && cp <= 12542) return true;
  return cp >= 13312 && cp <= 19903 || cp >= 19968 && cp <= 40959;
}
function readGroup(group) {
  const padded = group.padStart(4, "0");
  let out = "";
  for (let p = 0; p < 4; p++) {
    const d = padded.charCodeAt(p) - 48;
    if (d === 0) continue;
    const unit = PLACE_UNITS[p] ?? "";
    out += (d === 1 && unit !== "" ? "" : DIGIT_NAMES[d]) + unit;
  }
  return out;
}
function readInteger(digits) {
  const s = digits.replace(/^0+/, "");
  if (s === "") return DIGIT_NAMES[0];
  const groupCount = Math.ceil(s.length / 4);
  if (groupCount > GROUP_UNITS.length) return null;
  const head = s.length - (groupCount - 1) * 4;
  let out = "";
  for (let g = 0; g < groupCount; g++) {
    const part = g === 0 ? s.slice(0, head) : s.slice(head + (g - 1) * 4, head + g * 4);
    if (/^0+$/.test(part)) continue;
    const unit = GROUP_UNITS[groupCount - 1 - g] ?? "";
    out += (part.replace(/^0+/, "") === "1" && unit !== "" ? "\u4E00" : readGroup(part)) + unit;
  }
  return out;
}
const NUMERAL = /^([0-9]+)(?:\.([0-9]+))?$/;
function numberToKanji(s) {
  const m = NUMERAL.exec(s);
  if (!m) throw new Error(`not a numeral: ${s}`);
  const whole = readInteger(m[1] ?? "");
  const frac = (m[2] ?? "").replace(/0+$/, "");
  if (whole === null) return m[2] === void 0 ? "" : ".";
  if (frac === "") return whole;
  let out = whole + "\u70B9";
  for (const ch of frac) out += DIGIT_NAMES[ch.charCodeAt(0) - 48];
  return out;
}
const DIGIT_KANA = ["\u30BC\u30ED", "\u30A4\u30C1", "\u30CB\u30FC", "\u30B5\u30F3", "\u30E8\u30F3", "\u30B4\u30FC", "\u30ED\u30AF", "\u30CA\u30CA", "\u30CF\u30C1", "\u30AD\u30E5\u30FC"];
const NUM_HYPHEN = "[-\u2010\u2011\u2012\u2013\u2014\u2212\u30FC]";
const HYPHEN_GROUPS = new RegExp(`(?<![0-9A-Za-z.\\-])[0-9]+(?:${NUM_HYPHEN}[0-9]+)+(?![0-9A-Za-z]|\\.[0-9])`, "g");
const KANJI = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const POSTAL_MARK = new RegExp(`\u3012\\s*([0-9]{3})(?:${NUM_HYPHEN})?([0-9]{4})(?![0-9])`, "g");
const digitsToKana = (groups) => groups.map((g) => [...g].map((d) => DIGIT_KANA[d.charCodeAt(0) - 48]).join("")).join("\u3001");
function isHyphenDate(groups) {
  const [y, m, d] = groups;
  if (groups.length < 2 || groups.length > 3 || y?.length !== 4 || !m || m.length > 2) return false;
  const mm = Number(m);
  if (mm < 1 || mm > 12) return false;
  if (d === void 0) return true;
  const dd = Number(d);
  return d.length <= 2 && dd >= 1 && dd <= 31;
}
function readsDigitByDigit(groups) {
  if (isHyphenDate(groups)) return false;
  const total = groups.reduce((n, g) => n + g.length, 0);
  if (groups[0].startsWith("0") && total >= 6) return true;
  if (groups.length === 2 && groups[0].length === 3 && groups[1].length === 4) return true;
  return total >= 10;
}
function readDigitNumbers(s) {
  s = s.replace(POSTAL_MARK, (_m, a, b) => digitsToKana([a, b]));
  return s.replace(HYPHEN_GROUPS, (run, at, all) => {
    const groups = run.split(new RegExp(NUM_HYPHEN));
    if (!run.startsWith("0") && KANJI.test(all[at + run.length] ?? "")) return run;
    return readsDigitByDigit(groups) ? digitsToKana(groups) : run;
  });
}
const AMOUNT_UNIT = "\u5146\u5104\u4E07\u5343\u767E";
const CURRENCY_WORD = "(?:\u5186|\u30C9\u30EB|\u30E6\u30FC\u30ED|\u30A6\u30A9\u30F3|\u5143|\u30DD\u30F3\u30C9|\u30BB\u30F3\u30C8|\u30EB\u30D4\u30FC|\u30D0\u30FC\u30C4|\u30DA\u30BD|\u30D5\u30E9\u30F3)";
const AMOUNT = new RegExp(`(?<![0-9A-Za-z.]|[0-9A-Za-z]-)(-?)([0-9]+(?:[${AMOUNT_UNIT}][0-9]+)*[${AMOUNT_UNIT}]?)(?![0-9]|\\.[0-9])(?=(${CURRENCY_WORD})?)`, "g");
function readAmounts(s) {
  return s.replace(AMOUNT, (whole, minus, chain, currency, at, all) => {
    if (currency === void 0 && !/[兆億万]/.test(chain)) return whole;
    if (minus && /[0-9A-Za-z]/.test(all[at - 1] ?? "")) return whole;
    if (/^0+$/.test(chain)) return whole;
    if (!LONG_RUN.test(chain)) return whole;
    const kanji = chain.replace(/[0-9]+/g, (d) => numberToKanji(d));
    return (minus ? "\u30DE\u30A4\u30CA\u30B9" : "") + kanji;
  });
}
const LONG_RUN = /[0-9]{5}/;
const KANA_DIGIT = ["", "\u30A4\u30C1", "\u30CB", "\u30B5\u30F3", "\u30E8\u30F3", "\u30B4", "\u30ED\u30AF", "\u30CA\u30CA", "\u30CF\u30C1", "\u30AD\u30E5\u30A6"];
const KANA_GROUP_UNIT = ["", "\u30DE\u30F3", "\u30AA\u30AF", "\u30C1\u30E7\u30A6"];
const CURRENCY_KANA = { "\u5186": "\u30A8\u30F3", "\u30C9\u30EB": "\u30C9\u30EB", "\u30E6\u30FC\u30ED": "\u30E6\u30FC\u30ED", "\u30A6\u30A9\u30F3": "\u30A6\u30A9\u30F3", "\u5143": "\u30B2\u30F3", "\u30DD\u30F3\u30C9": "\u30DD\u30F3\u30C9" };
const KANJI_UNIT_VALUE = { "\u5146": 10n ** 12n, "\u5104": 10n ** 8n, "\u4E07": 10n ** 4n, "\u5343": 1000n, "\u767E": 100n };
const CURRENCY_AMOUNT = /(?<![0-9A-Za-z.]|[0-9A-Za-z]-)(-?)([0-9]+(?:[兆億万千百][0-9]*)*)(円|ドル|ユーロ|ウォン|元(?![\u3400-\u9fff])|ポンド)(?![0-9])/g;
const AMOUNT_RANGE_HEAD = /(?<![0-9A-Za-z.]|[0-9A-Za-z]-)([0-9]+(?:[兆億万千百][0-9]*)*)(?=\s*(?:[〜~～]|から)\s*[0-9]+(?:[兆億万千百][0-9]*)*(?:円|ドル|ユーロ|ウォン|元|ポンド))/g;
function kanaGroup(n, unit) {
  const th = Math.floor(n / 1e3), hu = Math.floor(n / 100) % 10, te = Math.floor(n / 10) % 10, on = n % 10;
  let out = "";
  if (th) out += th === 1 ? unit !== "" && hu + te + on === 0 ? "\u30A4\u30C3\u30BB\u30F3" : "\u30BB\u30F3" : th === 3 ? "\u30B5\u30F3\u30BC\u30F3" : th === 8 ? "\u30CF\u30C3\u30BB\u30F3" : KANA_DIGIT[th] + "\u30BB\u30F3";
  if (hu) out += hu === 1 ? "\u30D2\u30E3\u30AF" : hu === 3 ? "\u30B5\u30F3\u30D3\u30E3\u30AF" : hu === 6 ? "\u30ED\u30C3\u30D4\u30E3\u30AF" : hu === 8 ? "\u30CF\u30C3\u30D4\u30E3\u30AF" : KANA_DIGIT[hu] + "\u30D2\u30E3\u30AF";
  const chou = unit === "\u30C1\u30E7\u30A6";
  if (te) out += (te === 1 ? "" : KANA_DIGIT[te]) + (chou && !on ? "\u30B8\u30E5\u30C3" : "\u30B8\u30E5\u30A6");
  if (on) out += chou && (on === 1 || on === 8) ? on === 1 ? "\u30A4\u30C3" : "\u30CF\u30C3" : KANA_DIGIT[on];
  return out + unit;
}
function amountKana(v) {
  if (v <= 0n || v >= 10n ** 16n) return null;
  const s = v.toString();
  const groups = [];
  for (let e = s.length; e > 0; e -= 4) groups.unshift(Number(s.slice(Math.max(0, e - 4), e)));
  let out = "";
  groups.forEach((g, i) => {
    if (g) out += kanaGroup(g, KANA_GROUP_UNIT[groups.length - 1 - i] ?? "");
  });
  return out;
}
function chainValue(chain) {
  let total = 0n, section = 0n, lastBig = 10n ** 16n, lastSmall = 10000n;
  for (const m of chain.matchAll(/([0-9]*)([兆億万千百]?)/g)) {
    if (m[0] === "") continue;
    const digits = m[1] ? BigInt(m[1]) : null;
    const u = m[2] ? KANJI_UNIT_VALUE[m[2]] : 1n;
    if (u >= 10000n) {
      if (u >= lastBig) return null;
      const part = section + (digits ?? 0n);
      total += (part === 0n ? 1n : part) * u;
      section = 0n;
      lastBig = u;
      lastSmall = 10000n;
    } else if (u > 1n) {
      if (u >= lastSmall) return null;
      section += (digits ?? 1n) * u;
      lastSmall = u;
    } else {
      section += digits ?? 0n;
      lastSmall = 1n;
    }
  }
  return total + section;
}
function readCurrencyAmounts(s) {
  s = s.replace(AMOUNT_RANGE_HEAD, (whole, chain, at, all) => {
    const tail = /^\s*(?:から)\s*([0-9]+(?:[兆億万千百][0-9]*)*)/.exec(all.slice(at + chain.length));
    if (!LONG_RUN.test(chain) && !(tail && LONG_RUN.test(tail[1] ?? ""))) return whole;
    const v = chainValue(chain);
    return v === null ? whole : (v === 0n ? "\u30BC\u30ED" : amountKana(v)) ?? whole;
  });
  return s.replace(CURRENCY_AMOUNT, (whole, minus, chain, cur, at, all) => {
    if (minus && /[0-9A-Za-z]/.test(all[at - 1] ?? "")) return whole;
    if (!LONG_RUN.test(chain)) return whole;
    const v = chainValue(chain);
    if (v === null) return whole;
    let k = v === 0n ? "\u30BC\u30ED" : amountKana(v);
    if (k === null) return whole;
    if (cur === "\u5186" && v % 10n === 4n) k = k.replace(/ヨン$/, "\u30E8");
    return (minus ? "\u30DE\u30A4\u30CA\u30B9" : "") + k + (CURRENCY_KANA[cur] ?? cur);
  });
}
const UNIT_RULES = {
  "\u30E1\u30FC\u30C8\u30EB": { cls: "none", base: "\u30E1\u30FC\u30C8\u30EB" },
  "\u30AD\u30ED\u30E1\u30FC\u30C8\u30EB": { cls: "k", base: "\u30AD\u30ED\u30E1\u30FC\u30C8\u30EB" },
  "\u30AD\u30ED": { cls: "k", base: "\u30AD\u30ED" },
  "\u30AD\u30ED\u30B0\u30E9\u30E0": { cls: "k", base: "\u30AD\u30ED\u30B0\u30E9\u30E0" },
  "\u30BB\u30F3\u30C1": { cls: "k", base: "\u30BB\u30F3\u30C1" },
  "\u30BB\u30F3\u30C1\u30E1\u30FC\u30C8\u30EB": { cls: "k", base: "\u30BB\u30F3\u30C1\u30E1\u30FC\u30C8\u30EB" },
  "\u30DF\u30EA": { cls: "none", base: "\u30DF\u30EA" },
  "\u30DF\u30EA\u30E1\u30FC\u30C8\u30EB": { cls: "none", base: "\u30DF\u30EA\u30E1\u30FC\u30C8\u30EB" },
  "\u30B0\u30E9\u30E0": { cls: "none", base: "\u30B0\u30E9\u30E0" },
  "\u30EA\u30C3\u30C8\u30EB": { cls: "none", base: "\u30EA\u30C3\u30C8\u30EB" },
  "\u30D1\u30FC\u30BB\u30F3\u30C8": { cls: "k", base: "\u30D1\u30FC\u30BB\u30F3\u30C8", keep: "1,6,8,100" },
  "\u5EA6": { cls: "none", base: "\u30C9" },
  "\u79D2": { cls: "none", base: "\u30D3\u30E7\u30A6" },
  "\u30DA\u30FC\u30B8": { cls: "k", base: "\u30DA\u30FC\u30B8" },
  "\u500B": { cls: "k", base: "\u30B3" },
  "\u56DE": { cls: "k", base: "\u30AB\u30A4" },
  "\u6B73": { cls: "k", base: "\u30B5\u30A4", keep: "6,100" },
  "\u624D": { cls: "k", base: "\u30B5\u30A4", keep: "6,100" },
  "\u679A": { cls: "none", base: "\u30DE\u30A4" },
  "\u672C": { cls: "h", base: "\u30DB\u30F3", p: "\u30DD\u30F3", b: "\u30DC\u30F3" },
  "\u676F": { cls: "h", base: "\u30CF\u30A4", p: "\u30D1\u30A4", b: "\u30D0\u30A4" },
  "\u5339": { cls: "h", base: "\u30D2\u30AD", p: "\u30D4\u30AD", b: "\u30D3\u30AD" },
  "\u53F0": { cls: "none", base: "\u30C0\u30A4" },
  "\u4EF6": { cls: "k", base: "\u30B1\u30F3" },
  "\u70B9": { cls: "k", base: "\u30C6\u30F3", keep: "6,100" },
  "\u4F4D": { cls: "none", base: "\u30A4" },
  "\u756A": { cls: "none", base: "\u30D0\u30F3" }
};
const UNIT_ALT = Object.keys(UNIT_RULES).sort((a, b) => b.length - a.length).join("|");
const LONG_BEFORE_UNIT = new RegExp(`(?<![0-9A-Za-z.]|[0-9A-Za-z]-)([0-9]{5,16})(${UNIT_ALT})(?![0-9])`, "g");
function unitKana(v, unit) {
  const r = UNIT_RULES[unit];
  const k = amountKana(v);
  if (!r || k === null) return null;
  if (r.cls === "none") return k + r.base;
  const keep = new Set((r.keep ?? "").split(","));
  const p = r.p ?? r.base, b = r.b ?? r.base;
  const lastTwo = Number(v % 100n), lastThree = Number(v % 1000n);
  if (/イチ$/.test(k) && !keep.has("1")) return k.slice(0, -2) + "\u30A4\u30C3" + p;
  if (/ロク$/.test(k) && !keep.has("6")) return k.slice(0, -2) + "\u30ED\u30C3" + p;
  if (/ハチ$/.test(k) && !keep.has("8")) return k.slice(0, -2) + "\u30CF\u30C3" + p;
  if (/ジュウ$/.test(k) && lastTwo % 10 === 0) return k.slice(0, -3) + "\u30B8\u30E5\u30C3" + p;
  if (/ャク$/.test(k) && lastThree % 100 === 0 && !keep.has("100")) return k.slice(0, -1) + "\u30C3" + p;
  if (r.cls === "h" && (/サン$/.test(k) || /[セゼ]ン$|マン$/.test(k))) return k + b;
  return k + r.base;
}
function readLongUnitNumbers(s) {
  return s.replace(LONG_BEFORE_UNIT, (whole, digits, unit) => unitKana(BigInt(digits), unit) ?? whole);
}
const NUMBER_READINGS = ["rule", "model"];
function numbersToAmounts(n) {
  if (n === void 0 || n === "rule") return "kana";
  if (n === "model") return false;
  throw new RangeError(`zen-tts: numbers must be 'rule' or 'model' (got ${String(n)})`);
}
function normalizeOwnText(text, o = {}) {
  let s = o.latin === false ? text.normalize("NFKC") : readLatin(foldLongVowels(text.normalize("NFKC")));
  s = readDigitNumbers(s);
  s = s.replace(/(?<=[0-9]),(?=[0-9]{3})/g, "");
  s = s.replace(/([$£¥€])([0-9][0-9.]*)/g, (_m, sign, run) => run + (CURRENCY_UNIT[sign] ?? ""));
  s = s.replace(/(?<=[0-9])\s*[〜~～]\s*(?=[0-9])/g, "\u304B\u3089");
  s = s.replace(/%/g, "\u30D1\u30FC\u30BB\u30F3\u30C8");
  if (o.amounts === "kanji") s = readAmounts(s);
  else if (o.amounts === "kana") s = readLongUnitNumbers(readCurrencyAmounts(s));
  s = s.replace(/(?<=[0-9])\.(?=[0-9])/g, "\u70B9");
  s = s.replace(/・・・/g, "...");
  let out = "";
  for (const ch of s) {
    if (TO_APOSTROPHE.has(ch)) out += "'";
    else if (ch === "\u3002" || ch === "$" || ch === "\n") out += ".";
    else if (TO_COMMA.has(ch)) out += ",";
    else if (TO_HYPHEN.has(ch)) out += "-";
    else if (TO_LONG_MARK.has(ch)) out += "\u30FC";
    else if (isAllowed(ch.codePointAt(0) ?? 0) || ch >= "0" && ch <= "9") out += ch;
  }
  return out;
}
export {
  NUMBER_READINGS,
  normalizeOwnText,
  numberToKanji,
  numbersToAmounts,
  readAmounts,
  readCurrencyAmounts,
  readDigitNumbers,
  readLongUnitNumbers
};
