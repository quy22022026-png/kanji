import { ROMAJI_EXCLUDE } from "./latin-words.js";
let excludeSet = null;
function romajiExcluded(word) {
  excludeSet ??= new Set(ROMAJI_EXCLUDE.split("\n"));
  return excludeSet.has(word.toLowerCase());
}
const VOWEL = { a: "\u3042", i: "\u3044", u: "\u3046", e: "\u3048", o: "\u304A" };
const SYLLABLE = (() => {
  const t = {};
  const row = (c, kana) => {
    [..."aiueo"].forEach((v, i) => {
      const k = kana[i];
      if (k && k !== "\u30FB") t[c + v] = k;
    });
  };
  row("k", "\u304B\u304D\u304F\u3051\u3053");
  row("g", "\u304C\u304E\u3050\u3052\u3054");
  row("s", "\u3055\u3057\u3059\u305B\u305D");
  row("z", "\u3056\u3058\u305A\u305C\u305E");
  row("t", "\u305F\u3061\u3064\u3066\u3068");
  row("d", "\u3060\u3062\u3065\u3067\u3069");
  row("n", "\u306A\u306B\u306C\u306D\u306E");
  row("h", "\u306F\u3072\u3075\u3078\u307B");
  row("b", "\u3070\u3073\u3076\u3079\u307C");
  row("p", "\u3071\u3074\u3077\u307A\u307D");
  row("m", "\u307E\u307F\u3080\u3081\u3082");
  row("r", "\u3089\u308A\u308B\u308C\u308D");
  row("y", "\u3084\u30FB\u3086\u30FB\u3088");
  row("w", "\u308F\u30FB\u30FB\u30FB\u3092");
  const yoon = (c, i) => {
    t[c + "ya"] = i + "\u3083";
    t[c + "yu"] = i + "\u3085";
    t[c + "yo"] = i + "\u3087";
  };
  yoon("k", "\u304D");
  yoon("g", "\u304E");
  yoon("s", "\u3057");
  yoon("z", "\u3058");
  yoon("t", "\u3061");
  yoon("d", "\u3062");
  yoon("n", "\u306B");
  yoon("h", "\u3072");
  yoon("b", "\u3073");
  yoon("p", "\u3074");
  yoon("m", "\u307F");
  yoon("r", "\u308A");
  yoon("j", "\u3058");
  Object.assign(t, {
    shi: "\u3057",
    sha: "\u3057\u3083",
    shu: "\u3057\u3085",
    she: "\u3057\u3047",
    sho: "\u3057\u3087",
    chi: "\u3061",
    cha: "\u3061\u3083",
    chu: "\u3061\u3085",
    che: "\u3061\u3047",
    cho: "\u3061\u3087",
    tsu: "\u3064",
    fu: "\u3075",
    fa: "\u3075\u3041",
    fi: "\u3075\u3043",
    fe: "\u3075\u3047",
    fo: "\u3075\u3049",
    ji: "\u3058",
    ja: "\u3058\u3083",
    ju: "\u3058\u3085",
    je: "\u3058\u3047",
    jo: "\u3058\u3087",
    ye: "\u3044\u3047"
  });
  return t;
})();
const SPELLINGS = Object.keys(SYLLABLE).sort((a, b) => b.length - a.length);
const CONSONANT = /^[bcdfghjkmnprstwyz]$/;
function romajiToHiragana(word) {
  const w = word.toLowerCase();
  if (w.length < 2 || !/^[a-z']+$/.test(w)) return void 0;
  let out = "";
  let i = 0;
  while (i < w.length) {
    const c = w[i];
    const next = w[i + 1] ?? "";
    if (c === "'") {
      i++;
      continue;
    }
    if (VOWEL[c]) {
      if (c === "o" && next === "h" && !VOWEL[w[i + 2] ?? ""] && w[i + 2] !== "y") {
        out += "\u304A\u304A";
        i += 2;
        continue;
      }
      out += VOWEL[c];
      i++;
      continue;
    }
    if (c === "n" && (next === "" || next === "'" || CONSONANT.test(next) && next !== "y")) {
      out += "\u3093";
      i += next === "n" && !VOWEL[w[i + 2] ?? ""] && w[i + 2] !== "y" ? 2 : 1;
      continue;
    }
    if (c === "m" && (next === "b" || next === "p" || next === "m")) {
      out += "\u3093";
      i++;
      continue;
    }
    if (c === "t" && next === "c" && w[i + 2] === "h") {
      out += "\u3063";
      i++;
      continue;
    }
    if (c === next && CONSONANT.test(c) && c !== "n") {
      out += "\u3063";
      i++;
      continue;
    }
    const s = SPELLINGS.find((x) => w.startsWith(x, i));
    if (!s) return void 0;
    out += SYLLABLE[s];
    i += s.length;
  }
  return out;
}
const LETTER_NAME = {
  a: "\u30A8\u30FC",
  b: "\u30D3\u30FC",
  c: "\u30B7\u30FC",
  d: "\u30C7\u30A3\u30FC",
  e: "\u30A4\u30FC",
  f: "\u30A8\u30D5",
  g: "\u30B8\u30FC",
  h: "\u30A8\u30A4\u30C1",
  i: "\u30A2\u30A4",
  j: "\u30B8\u30A7\u30FC",
  k: "\u30B1\u30FC",
  l: "\u30A8\u30EB",
  m: "\u30A8\u30E0",
  n: "\u30A8\u30CC",
  o: "\u30AA\u30FC",
  p: "\u30D4\u30FC",
  q: "\u30AD\u30E5\u30FC",
  r: "\u30A2\u30FC\u30EB",
  s: "\u30A8\u30B9",
  t: "\u30C6\u30A3\u30FC",
  u: "\u30E6\u30FC",
  v: "\u30D6\u30A4",
  w: "\u30C0\u30D6\u30EA\u30E5\u30FC",
  x: "\u30A8\u30C3\u30AF\u30B9",
  y: "\u30EF\u30A4",
  z: "\u30BC\u30C3\u30C8"
};
function spellLetters(run) {
  return [...run.toLowerCase()].map((c) => LETTER_NAME[c] ?? "").join("");
}
function readLatinRun(run) {
  if (!/[a-z]/.test(run) && run.replace(/[-']/g, "").length <= 3) return { text: spellLetters(run), kind: "acronym" };
  const plain = !/[A-Z]/.test(run.slice(1)) || !/[a-z]/.test(run);
  if (plain && !run.includes("-") && !romajiExcluded(run)) {
    const r = romajiToHiragana(run);
    if (r) return { text: r, kind: "romaji" };
  }
  return { text: run.toLowerCase(), kind: "english" };
}
const RUN = /[A-Za-z]+(?:[-'][A-Za-z]+)*/g;
const LETTER = /[A-Za-z]/;
const ADDRESS = /[.@/:_\\#=&%+~]/;
const NAME_CHAR = /[A-Za-z0-9]/;
function readLatin(text) {
  if (!LETTER.test(text)) return text;
  return text.replace(RUN, (run, at) => {
    const b1 = text[at - 1] ?? "", b2 = text[at - 2] ?? "";
    const a1 = text[at + run.length] ?? "", a2 = text[at + run.length + 1] ?? "";
    if (ADDRESS.test(b1) && NAME_CHAR.test(b2) || ADDRESS.test(a1) && NAME_CHAR.test(a2)) return run;
    if (b1 === "/" || a1 === "/" || b1 === "@" || a1 === "@" || a1 === ":" && a2 === "/") return run;
    return readLatinRun(run).text;
  });
}
function foldLongVowels(text) {
  return text.replace(/[āâáàīîíìūûúùēêéèōôóòĀÂÁÀĪÎÍÌŪÛÚÙĒÊÉÈŌÔÓÒ]/g, (ch, at) => {
    const [base = "", mark = ""] = ch.normalize("NFD");
    const lower = base.toLowerCase();
    if (!"\u0304\u0302".includes(mark) || mark === "") return base;
    const long = lower === "o" ? "u" : lower;
    const word = /[\p{L}]+/u.exec(text.slice(Math.max(0, text.slice(0, at).search(/\p{L}*$/u))))?.[0] ?? ch;
    return base + (base !== lower && word === word.toUpperCase() && word.length > 1 ? long.toUpperCase() : long);
  });
}
export {
  foldLongVowels,
  readLatin,
  readLatinRun,
  romajiToHiragana,
  spellLetters
};
