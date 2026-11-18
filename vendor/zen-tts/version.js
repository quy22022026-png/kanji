const VERSION = "1.3.0";
const VOICE = { id: "marine", name: { ja: "\u5168\u529B \u30DE\u30EA\u30F3", en: "Zenryoku Marine" }, model: "marine-1.2" };
const VOICES = {
  marine: VOICE,
  hashiro: { id: "hashiro", name: { ja: "\u5168\u529B \u30CF\u30B7\u30ED\u30A6", en: "Zenryoku Hashiro" }, model: "hashiro-1.1" },
  kai: { id: "kai", name: { ja: "\u5168\u529B \u30AB\u30A4", en: "Zenryoku Kai" }, model: "kai-1.1" },
  kikka: { id: "kikka", name: { ja: "\u5168\u529B \u30AD\u30C3\u30AB", en: "Zenryoku Kikka" }, model: "kikka-1.1" }
};
function voiceDirs(voice = "marine") {
  if (!Object.prototype.hasOwnProperty.call(VOICES, voice)) throw new Error(`unknown voice "${String(voice)}" (${Object.keys(VOICES).join(", ")})`);
  return voice === "marine" ? { tts: "tts", decoder: "decoder" } : { tts: `voices/${voice}/tts`, decoder: `voices/${voice}/decoder` };
}
const ZTM_BASE_URL = "https://tts-models.zenryoku.work/v1.3.0/";
function ztmUrl(voice = "marine") {
  voiceDirs(voice);
  return `${ZTM_BASE_URL}${voice}.ztm`;
}
export {
  VERSION,
  VOICE,
  VOICES,
  ZTM_BASE_URL,
  voiceDirs,
  ztmUrl
};
