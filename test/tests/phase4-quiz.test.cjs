'use strict';
const assert = require('node:assert/strict');
global.window = global;
const mem = new Map();
global.localStorage = {
  getItem: k => mem.has(k) ? mem.get(k) : null,
  setItem: (k,v) => mem.set(k,String(v)),
  removeItem: k => mem.delete(k)
};
require('../quiz.js');
const wrongs = [], corrects = [], completed = [];
const quiz = global.KawaiiQuizModule.create({
  onWrong: x => wrongs.push(x),
  onCorrect: x => corrects.push(x),
  onComplete: x => completed.push(x)
});
const words = [
  {id:'a',kanji:'猫',kana:'ねこ',meaning:'Con mèo'},
  {id:'b',kanji:'犬',kana:'いぬ',meaning:'Con chó'},
  {id:'c',kanji:'鳥',kana:'とり',meaning:'Con chim'},
  {id:'d',kanji:'魚',kana:'さかな',meaning:'Con cá'}
];
const started = quiz.start(words,10,2);
assert.equal(started.questionCount,4);
assert.equal(started.flashcardScore,2);
let q=quiz.currentQuestion();
const wrong=q.options.find(x=>x!==q.correctAnswer);
quiz.answer(wrong);
assert.equal(quiz.snapshot().wrongActions,1);
quiz.next();
while (quiz.snapshot().phase==='first') {
  q=quiz.currentQuestion();
  quiz.answer(q.correctAnswer);
  quiz.next();
}
assert.equal(quiz.snapshot().phase,'retry');
q=quiz.currentQuestion();
quiz.answer(q.options.find(x=>x!==q.correctAnswer));
quiz.next();
assert.equal(quiz.snapshot().status,'completed');
assert.equal(quiz.getStats().wrongActions,2);
assert.equal(quiz.getStats().correctActions,3);
assert.equal(quiz.getStats().totalScore,5);
assert.equal(wrongs.length,2);
assert.equal(corrects.length,3);
assert.equal(completed.length,1);
assert.equal(quiz.getHistory().length,5);
console.log('PASS: chọn 4 từ tối thiểu; đáp án hai chiều; phản hồi; hỏi lại một lần; lỗi lượt hỏi lại được tính; điểm tổng hợp.');
