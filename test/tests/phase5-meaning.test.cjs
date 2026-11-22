'use strict';
const assert = require('node:assert/strict');
global.window = global;
require('../meaning.js');
const dictionary = new Map([
  ['猫', { text:'猫', reading:'ねこ', meaning:'Con mèo', hanViet:'MIÊU', level:'N5' }],
  ['食べる', { text:'食べる', reading:'たべる', meaning:'Ăn', level:'N5' }],
  ['学校', { text:'学校', reading:'がっこう', meaning:'Trường học', level:'N5' }]
]);
let spoken = '';
const fakeClassList = () => ({ toggle(){}, add(){}, remove(){} });
const els = {
  charBox:{textContent:''}, reading:{textContent:''},
  hanViet:{textContent:'',classList:fakeClassList()},
  level:{textContent:'',classList:fakeClassList()},
  meaning:{textContent:''}, note:{textContent:''},
  sheet:{classList:{remove(){},add(){}}}
};
const meaning = global.KawaiiMeaningModule.create({
  getDictionaryIndex: () => dictionary,
  lookup: token => dictionary.get(token) || {text:token,reading:token,meaning:'Không có',note:''},
  onSpeak: text => spoken=text,
  getElements: () => els
});
const tokens = meaning.tokenize('猫を食べる。学校へ行く！');
assert.deepEqual(tokens.map(x=>x.text), ['猫','を','食べる','。','学校','へ','行','く','！']);
const info = meaning.showPopup('猫');
assert.equal(info.meaning,'Con mèo');
assert.equal(els.charBox.textContent,'猫');
assert.equal(els.reading.textContent,'ねこ');
assert.equal(els.hanViet.textContent,'MIÊU');
assert.equal(spoken,'ねこ');
meaning.hidePopup();
assert.equal(meaning.getSpeakText(),'ねこ');
console.log('PASS: greedy dictionary tokenization; punctuation; lookup popup; pronunciation callback; hide popup.');
