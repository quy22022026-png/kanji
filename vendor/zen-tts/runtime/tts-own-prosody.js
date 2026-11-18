import { emotionNames } from "./emotion.js";
import { normalizeOwnText } from "./ja-text-normalize.js";
import { hiraganaToKatakana, kanaToPhones } from "./kana-phones.js";
const MARK = { none: 0, rise: 1, fall: 2, phrase: 3, pause: 4 };
const MORA_END = /* @__PURE__ */ new Set(["a", "i", "u", "e", "o", "N", "a:", "i:", "u:", "e:", "o:", "q"]);
const DEFAULT_OWN_DICT_SETTINGS = { accentHeight: 4.5 };
const DEFAULT_PITCH_RANGE = [7.52, 8.38, 5.77, 7.48, 6.36];
function voiceDictSettings(settings, meta) {
  const s = settings ?? DEFAULT_OWN_DICT_SETTINGS;
  return s.pitchRange || !meta.pitchRange ? s : { ...s, pitchRange: meta.pitchRange };
}
function pitchRangeOf(blend, range = DEFAULT_PITCH_RANGE) {
  const sum = emotionNames.reduce((s, k) => s + Math.max(0, blend[k]), 0);
  if (sum <= 0) return range[0];
  return emotionNames.reduce((s, k, i) => s + Math.max(0, blend[k]) * range[i], 0) / sum;
}
function contourF0(f0, phones, a, b, values, range) {
  const out = [...f0];
  const groups = [];
  let from = a;
  for (let i = a; i < b; i++) if (MORA_END.has(phones[i])) {
    groups.push([from, i + 1]);
    from = i + 1;
  }
  if (!groups.length || !values.length) return out;
  const mean = ([s, e]) => {
    let m = 0;
    for (let i = s; i < e; i++) m += f0[i];
    return m / (e - s);
  };
  const means = groups.map(mean);
  const level = means.reduce((x, y) => x + y, 0) / means.length;
  groups.slice(0, values.length).forEach(([s, e], k) => {
    const shift = level + values[k] * range - means[k];
    for (let i = s; i < e; i++) out[i] = f0[i] + shift;
  });
  return out;
}
function roundHalfEven(v) {
  const r = Math.round(v);
  return Math.abs(v - Math.trunc(v)) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}
function slotsToPhones(slots, meta, nSlots) {
  const phones = [];
  const marks = [];
  const spans = [];
  for (const s of slots) {
    const a = phones.length;
    for (let k = 0; k < nSlots; k++) {
      if (s[k]) {
        phones.push(meta.phoneClasses[s[k]]);
        marks.push(s[nSlots + k]);
      }
    }
    spans.push([a, phones.length]);
  }
  return { phones, marks, spans };
}
function withEndMark(text, punct) {
  const last = text[text.length - 1];
  if (last === void 0 || punct.has(last)) return { text, added: false };
  return { text: text + ".", added: true };
}
function dropEndMark(g) {
  const spans = g.spans.slice(0, -1);
  const end = spans.length ? spans[spans.length - 1][1] : 0;
  return { phones: g.phones.slice(0, end), marks: g.marks.slice(0, end), spans };
}
function tonesFromMarks(phones, marks, punct) {
  const tones = new Array(phones.length).fill(0);
  let phrase = [];
  let cur = 0;
  const close = () => {
    const vals = new Set(phrase.map(([, t]) => t));
    const only = (...ok) => [...vals].every((v) => ok.includes(v));
    if (vals.size === 2 && vals.has(-1) && vals.has(0)) for (const [i, t] of phrase) tones[i] = t + 1;
    else if (only(0, 1)) for (const [i, t] of phrase) tones[i] = t;
    else {
      const top = Math.max(...vals);
      for (const [i, t] of phrase) tones[i] = t === top ? 1 : 0;
    }
    phrase = [];
  };
  phones.forEach((p, i) => {
    if (punct.has(p)) return;
    phrase.push([i, cur]);
    const m = marks[i];
    if (m === MARK.rise) cur++;
    else if (m === MARK.fall) cur--;
    else if (m === MARK.phrase || m === MARK.pause) {
      close();
      cur = 0;
    }
  });
  close();
  return tones;
}
function accentFeatures(phones, marks, punct) {
  const n = phones.length;
  const tone = tonesFromMarks(phones, marks, punct);
  const nucleus = marks.map((m) => m === MARK.fall ? 1 : 0);
  const boundary = new Array(n).fill(0);
  const pos = new Array(n).fill(0);
  const groups = [];
  let cur = [];
  let start = true;
  phones.forEach((p, i) => {
    if (punct.has(p)) return;
    if (start) {
      boundary[i] = 1;
      start = false;
    }
    cur.push(i);
    if (marks[i] === MARK.phrase || marks[i] === MARK.pause) {
      groups.push(cur);
      cur = [];
      start = true;
    }
  });
  if (cur.length) groups.push(cur);
  for (const g of groups) g.forEach((i, k) => {
    pos[i] = k / Math.max(1, g.length - 1);
  });
  return { tone, nucleus, boundary, pos };
}
function templateParams(meta, blend) {
  const dot = (v) => emotionNames.reduce((s, k, i) => s + blend[k] * v[i], 0);
  return { B: dot(meta.template.B), H: dot(meta.template.H), D: dot(meta.template.D) };
}
function predictorInput(phones, marks, punct) {
  const ph = ["_", ...phones, "_"];
  const mk = [0, ...marks, 0];
  return { phones: ph, marks: mk, acc: accentFeatures(ph, mk, punct) };
}
function prosodyFromHead(input, head, meta, blend, strength = 1) {
  const { B, H, D } = templateParams(meta, blend);
  const P = input.phones.length;
  const dur = [];
  const template = [];
  const dev = [];
  const f0 = [];
  const energy = [];
  const voiced = [];
  for (let i = 0; i < P; i++) {
    dur.push(Math.max(1, roundHalfEven(Math.exp(head[i * 4]) - 1)));
    const t = B + H * input.acc.tone[i] - D * input.acc.pos[i];
    template.push(t);
    dev.push(head[i * 4 + 1]);
    f0.push(t + strength * head[i * 4 + 1]);
    energy.push(head[i * 4 + 2]);
    voiced.push(1 / (1 + Math.exp(-head[i * 4 + 3])));
  }
  return { ...input, dur, template, dev, f0, energy, voiced };
}
function frameRows(pr) {
  const F = pr.dur.reduce((s, d) => s + d, 0);
  const idx = new Uint32Array(F);
  const extra = new Float32Array(F * 4);
  const start = [];
  const centre = [];
  let f = 0;
  pr.dur.forEach((d, p) => {
    start.push(f);
    centre.push(f + d / 2);
    for (let k = 0; k < d; k++) idx[f++] = p;
  });
  let j = 0;
  for (let t = 0; t < F; t++) {
    const x = t + 0.5;
    while (j < centre.length - 1 && centre[j + 1] <= x) j++;
    let v;
    if (x <= centre[0]) v = pr.f0[0];
    else if (x >= centre[centre.length - 1]) v = pr.f0[centre.length - 1];
    else v = pr.f0[j] + (pr.f0[j + 1] - pr.f0[j]) * (x - centre[j]) / (centre[j + 1] - centre[j]);
    const p = idx[t];
    extra[t * 4] = v / 12;
    extra[t * 4 + 1] = pr.energy[p];
    extra[t * 4 + 2] = (x - start[p]) / pr.dur[p];
    extra[t * 4 + 3] = pr.voiced[p];
  }
  return { idx, extra };
}
function moraEnds(phones) {
  const out = [];
  phones.forEach((p, i) => {
    if (MORA_END.has(p)) out.push(i);
  });
  return out;
}
function setAccent(phones, marks, a, b, typ) {
  const mk = [...marks];
  for (let i = a; i < b; i++) if (mk[i] === MARK.rise || mk[i] === MARK.fall) mk[i] = 0;
  const ends = moraEnds(phones.slice(a, b)).map((i) => i + a);
  if (!ends.length) return mk;
  if (typ === 1) {
    if (mk[ends[0]] === 0) mk[ends[0]] = MARK.fall;
    return mk;
  }
  if (mk[ends[0]] === 0) mk[ends[0]] = MARK.rise;
  const n = ends[Math.min(typ, ends.length) - 1];
  if (typ > 1 && n !== void 0 && mk[n] === 0) mk[n] = MARK.fall;
  return mk;
}
function accentTypeOf(phones, marks, a, b) {
  let n = 0;
  for (let i = a; i < b; i++) {
    if (MORA_END.has(phones[i])) {
      n++;
      if (marks[i] === MARK.fall) return n;
    }
  }
  return 0;
}
function phraseEnd(marks, b) {
  let i = b - 1;
  while (i < marks.length - 1 && marks[i] !== MARK.phrase && marks[i] !== MARK.pause) i++;
  return i + 1;
}
function dictPhraseF0(base, edited, a, e, meta, blend, height, strength = 0, dev) {
  const { B, D } = templateParams(meta, blend);
  const tone = edited.acc.tone;
  const pos = edited.acc.pos;
  const at = (i) => B + height * tone[i] - D * pos[i];
  const i0 = a + 1;
  const i1 = e + 1;
  const lv0 = base.f0[i0 - 1] - at(i0 - 1);
  const lv1 = i1 < tone.length ? base.f0[i1] - at(i1) : lv0;
  const f0 = [...base.f0];
  const n = i1 - i0;
  for (let k = 0; k < n; k++) {
    const t = (k + 1) / (n + 1);
    const i = i0 + k;
    f0[i] = at(i) + (1 - t) * lv0 + t * lv1 + (dev ? strength * dev[i] : 0);
  }
  return f0;
}
function applyOwnDict(norm, entries, latin = true) {
  if (!entries.length) return { text: norm, matches: [] };
  const sorted = entries.map((e) => ({ e, s: normalizeOwnText(e.surface, { latin }).replace(/[.]$/, "") })).filter((x) => x.s !== "").sort((x, y) => y.s.length - x.s.length);
  let text = "";
  const matches = [];
  let i = 0;
  outer: while (i < norm.length) {
    for (const { e, s } of sorted) {
      if (norm.startsWith(s, i)) {
        const r = hiraganaToKatakana(e.reading);
        matches.push({ entry: e, start: text.length, end: text.length + r.length });
        text += r;
        i += s.length;
        continue outer;
      }
    }
    text += norm[i];
    i++;
  }
  return { text, matches };
}
function dictLabels(g2p, matches, kana) {
  const phones = [];
  const marks = [];
  const words = [];
  let aligned = true;
  let next = 0;
  for (const m of matches) {
    const a0 = g2p.spans[m.start][0];
    const b0 = g2p.spans[m.end - 1][1];
    for (let i = next; i < a0; i++) {
      phones.push(g2p.phones[i]);
      marks.push(g2p.marks[i]);
    }
    next = b0;
    const a = phones.length;
    if (m.entry.accent === void 0) {
      for (let i = a0; i < b0; i++) {
        phones.push(g2p.phones[i]);
        marks.push(g2p.marks[i]);
      }
      words.push({ entry: m.entry, a, b: phones.length });
      continue;
    }
    const ph = kanaToPhones(m.entry.reading, kana);
    if (ph.length !== b0 - a0 || ph.some((p, k) => p !== g2p.phones[a0 + k])) aligned = false;
    const last = g2p.marks[b0 - 1];
    for (const p of ph) {
      phones.push(p);
      marks.push(0);
    }
    if (last === MARK.phrase || last === MARK.pause) marks[marks.length - 1] = last;
    if ((m.entry.phrase ?? "split") === "split" && a > 0 && marks[a - 1] === 0) marks[a - 1] = MARK.phrase;
    words.push({ entry: m.entry, a, b: phones.length });
  }
  for (let i = next; i < g2p.phones.length; i++) {
    phones.push(g2p.phones[i]);
    marks.push(g2p.marks[i]);
  }
  let mk = marks;
  for (const w of words) {
    if (w.entry.accent === void 0) continue;
    mk = setAccent(phones, mk, w.a, w.b, w.entry.accent);
    const e = phraseEnd(mk, w.b);
    for (let i = w.b; i < e; i++) if (mk[i] === MARK.rise || mk[i] === MARK.fall) mk[i] = 0;
  }
  return { phones, marks: mk, words, aligned };
}
function dictProsody(base, dict, words, meta, blend, settings) {
  let f0 = [...base.f0];
  const dur = [...base.dur];
  for (const w of words) {
    const e = w.entry;
    if (e.accent !== void 0) {
      const end = phraseEnd(dict.marks.slice(1, -1), w.b);
      f0 = dictPhraseF0({ f0 }, dict, w.a, end, meta, blend, settings.accentHeight, e.strength ?? 0, dict.dev);
    }
    if (e.contour?.length) f0 = contourF0(f0, dict.phones, w.a + 1, w.b + 1, e.contour, pitchRangeOf(blend, settings.pitchRange));
    const ends = moraEnds(dict.phones.slice(w.a + 1, w.b + 1)).map((i) => i + w.a + 1);
    let from = w.a + 1;
    ends.forEach((end, k) => {
      for (let i = from; i <= end; i++) {
        if (e.pitch?.[k]) f0[i] = f0[i] + e.pitch[k];
        if (e.length?.[k] !== void 0 && e.length[k] !== 1) dur[i] = Math.max(1, roundHalfEven(dur[i] * e.length[k]));
      }
      from = end + 1;
    });
  }
  return { f0, dur };
}
function labelString(phones, marks) {
  return phones.map((p, i) => p + ["", "[", "]", "#", "_"][marks[i]]).join(" ");
}
export {
  DEFAULT_OWN_DICT_SETTINGS,
  DEFAULT_PITCH_RANGE,
  MARK,
  accentFeatures,
  accentTypeOf,
  applyOwnDict,
  contourF0,
  dictLabels,
  dictPhraseF0,
  dictProsody,
  dropEndMark,
  frameRows,
  kanaToPhones,
  labelString,
  moraEnds,
  phraseEnd,
  pitchRangeOf,
  predictorInput,
  prosodyFromHead,
  roundHalfEven,
  setAccent,
  slotsToPhones,
  templateParams,
  tonesFromMarks,
  voiceDictSettings,
  withEndMark
};
