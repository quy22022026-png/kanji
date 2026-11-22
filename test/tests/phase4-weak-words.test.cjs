'use strict';
const assert = require('node:assert/strict');
global.window = global;
const mem = new Map();
global.localStorage = {
  getItem: k => mem.has(k) ? mem.get(k) : null,
  setItem: (k,v) => mem.set(k,String(v)),
  removeItem: k => mem.delete(k)
};
require('../weak-words.js');
const weak = global.KawaiiWeakWordsModule.create();
weak.recordCorrect('w1','flashcard','fc-old-1');
weak.recordCorrect('w1','flashcard','fc-old-2');
weak.recordCorrect('w1','quiz','q-old-1');
weak.recordCorrect('w1','quiz','q-old-2');
weak.recordError('w1','flashcard','fc-current');
assert.equal(weak.get('w1').status,'normal');
weak.recordError('w1','quiz','q-current');
assert.equal(weak.get('w1').status,'weak');
// Successes before the word became weak must not resolve it.
assert.equal(weak.get('w1').flashcardCorrectSessions.length,0);
weak.recordCorrect('w1','flashcard','fc-session-1');
weak.recordCorrect('w1','flashcard','fc-session-1');
assert.equal(weak.get('w1').flashcardCorrectSessions.length,1);
weak.recordCorrect('w1','flashcard','fc-session-2');
weak.recordCorrect('w1','quiz','quiz-session-1');
weak.recordCorrect('w1','quiz','quiz-session-2');
assert.equal(weak.get('w1').status,'resolved');
assert.equal(weak.get('w1').errorCount,2);

weak.recordError('w2','flashcard','s1');
weak.recordError('w2','quiz','s2');
assert.equal(weak.get('w2').status,'weak');
const historyBefore=weak.get('w2').history.length;
weak.dismiss('w2');
assert.equal(weak.get('w2').status,'dismissed');
assert.equal(weak.get('w2').history.length,historyBefore);
weak.recordError('w2','quiz','s3');
assert.equal(weak.get('w2').status,'weak');
console.log('PASS: cộng dồn lỗi hai nguồn; lỗi lặp tính đủ; yêu cầu đúng ở 2 phiên riêng mỗi nguồn; xóa trạng thái giữ lịch sử.');
