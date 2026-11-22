'use strict';
const assert = require('node:assert/strict');
global.window = global;
const memory = new Map();
global.localStorage = {
  getItem(key) { return memory.has(key) ? memory.get(key) : null; },
  setItem(key, value) { memory.set(key, String(value)); },
  removeItem(key) { memory.delete(key); }
};
require('../study-session.js');
require('../flashcard.js');

const session = global.KawaiiStudySessionModule.create();
const words = Array.from({ length: 14 }, (_, i) => ({ id: `W${i + 1}` }));
const initial = session.start(words, { limit: 10 });
assert.equal(initial.queue.length, 10);
assert.equal(new Set(initial.queue).size, 10);
assert.equal(initial.initialWordIds.length, 10);

const first = initial.queue[0];
const afterAgain = session.record(first, 'again');
assert.equal(afterAgain.stats.reviewed, 1);
assert.equal(afterAgain.stats.again, 1);
assert.equal(afterAgain.stats.firstAttemptCorrect, 0);
assert.equal(afterAgain.queue.length, 10);
assert.equal(afterAgain.queue.at(-1), first);

// Reload from the same local storage: unfinished session must restore.
const restored = global.KawaiiStudySessionModule.create();
const restoredSnapshot = restored.load();
assert.equal(restoredSnapshot.id, initial.id);
assert.equal(restoredSnapshot.queue.length, 10);
assert.equal(restoredSnapshot.queue.at(-1), first);

// Repeat Again more than once, then Good; queue remains finite and progresses.
let current = restored.getQueue()[0];
restored.record(current, 'again');
current = restored.getQueue()[0];
restored.record(current, 'good');
assert.equal(restored.getSnapshot().completedWordIds.length, 1);

// Complete every remaining unique word; all Again attempts requeue until Good.
let guard = 0;
while (restored.getSnapshot().status === 'active' && guard < 200) {
  const id = restored.getQueue()[0];
  restored.record(id, 'good');
  guard++;
}
assert.equal(restored.getSnapshot().status, 'completed');
assert.equal(restored.getSnapshot().completedWordIds.length, 10);

// A word rated Good on its first operation counts once toward Flashcard score.
const scoringSession = global.KawaiiStudySessionModule.create();
scoringSession.start(words.slice(0, 4), { limit: 10 });
const scoringWord = scoringSession.getQueue()[0];
const scored = scoringSession.record(scoringWord, 'good');
assert.equal(scored.stats.firstAttemptCorrect, 1);

// Users may browse with the previous/next arrows before rating a card.
const navigationSession = global.KawaiiStudySessionModule.create();
const navigationStart = navigationSession.start(words.slice(0, 4), { limit: 4 });
const selectedOutOfOrder = navigationStart.queue[2];
const afterOutOfOrderGood = navigationSession.record(selectedOutOfOrder, 'good');
assert.ok(afterOutOfOrderGood.completedWordIds.includes(selectedOutOfOrder));
assert.equal(afterOutOfOrderGood.queue.includes(selectedOutOfOrder), false);
assert.equal(afterOutOfOrderGood.queue.length, 3);

// Flashcard module calls the one SRS authority and records the session action.
const session2 = global.KawaiiStudySessionModule.create();
let srsCalls = 0;
const byId = new Map(words.map(w => [w.id, w]));
const flash = global.KawaiiFlashcardModule.create({
  session: session2,
  getWord: id => byId.get(id),
  srs: { rateWord(id, rating) { srsCalls++; return { wordId: id, rating, intervalDays: 1 }; } }
});
const deck = flash.start(words, { limit: 10 });
assert.equal(deck.length, 10);
const rated = flash.rate(deck[2].id, 'good');
assert.equal(srsCalls, 1);
assert.equal(rated.deck.length, 9);
assert.ok(rated.session.completedWordIds.includes(deck[2].id));
console.log('PASS: giới hạn phiên, Again requeue, khôi phục, hoàn thành, điều hướng trước/sau rồi đánh giá thẻ bất kỳ, Flashcard gọi SRS Core.');
