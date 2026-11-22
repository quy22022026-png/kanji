'use strict';
const assert = require('node:assert/strict');
global.window = global;
global.speechSynthesis = {
    cancel() {},
    getVoices: () => [{ lang: 'ja-JP', name: 'Japanese' }],
    speak: utterance => { global.lastUtterance = utterance; }
};
global.SpeechSynthesisUtterance = class {
  constructor(text) { this.text = text; this.lang = ''; this.rate = 1; this.voice = null; }
};
global.URL.createObjectURL = () => 'blob:test-audio';
global.URL.revokeObjectURL = () => {};
global.Audio = class {
  constructor(src) { this.src = src; this.paused = true; }
  async play() { this.paused = false; }
  pause() { this.paused = true; }
  removeAttribute() {}
  load() {}
};
require('../pronunciation.js');
(async () => {
  let engineCalls = 0;
  let fallbackCalls = 0;
  const mockEngine = { speak: async (text, opts) => {
    engineCalls++;
    assert.equal(opts.speed, 1);
    return { wav: new Blob(['wav']) };
  }};
  const module = global.KawaiiPronunciationModule.create({
    getEngine: () => mockEngine,
    getPrefs: () => ({ zenSpeed: 1, zenPitch: 0, zenHappy: 60, fallbackWebSpeech: true }),
    onFallback: () => fallbackCalls++
  });
  let result = await module.speak('ねこ');
  assert.equal(result.engine, 'zen-tts');
  assert.equal(engineCalls, 1);
  await module.speak('ねこ');
  assert.equal(engineCalls, 1, 'cache should avoid a second synthesis');
  assert.equal(module.getCacheSize(), 1);
  result = await module.speakKana('わ', { clearMora: 'わ', sampleJa: 'わたし' }, 'single');
  assert.equal(result.engine, 'zen-tts');
  assert.equal(engineCalls, 2);

  const brokenEngine = { speak: async () => { throw new Error('model error'); } };
  const broken = global.KawaiiPronunciationModule.create({
    getEngine: () => brokenEngine,
    getPrefs: () => ({ fallbackWebSpeech: true, zenSpeed: 1 }),
    onFallback: () => fallbackCalls++
  });
  result = await broken.speak('わ');
  assert.equal(result.engine, 'web-speech-fallback');
  assert.equal(global.lastUtterance.text, 'わ');
  assert.equal(fallbackCalls, 1);
  broken.stop();
  console.log('PASS: ZEN-TTS; cache; Kana single; ZEN lỗi tự động fallback Web Speech; stop.');
})().catch(error => { console.error(error); process.exit(1); });
