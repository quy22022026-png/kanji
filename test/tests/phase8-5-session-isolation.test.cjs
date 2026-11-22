'use strict';
const assert = require('node:assert/strict');
global.window = global;
const store = new Map();
global.localStorage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => store.set(String(key), String(value)),
  removeItem: key => store.delete(key)
};
require('../study-session.js');

const words = Array.from({ length: 10 }, (_, index) => ({ id: `W${index + 1}` }));
const general = global.KawaiiStudySessionModule.create({ storageKey: 'general-session' });
const lesson = global.KawaiiStudySessionModule.create({ storageKey: 'lesson-session' });
const generalStart = general.start(words.slice(0, 5), { limit: 5 });
const lessonStart = lesson.start(words.slice(5), { limit: 5 });
const generalId = general.getSnapshot().id;
const lessonId = lesson.getSnapshot().id;

lesson.record(lessonStart.queue[2], 'good');
assert.equal(general.getSnapshot().id, generalId, 'lesson activity must not replace the general SRS session');
assert.deepEqual(general.getSnapshot().queue, generalStart.queue, 'general SRS queue must remain unchanged');
assert.equal(lesson.getSnapshot().queue.length, 4);

const restoredLesson = global.KawaiiStudySessionModule.create({ storageKey: 'lesson-session' });
restoredLesson.load();
assert.equal(restoredLesson.getSnapshot().id, lessonId, 'lesson session ID must survive reload');
assert.deepEqual(restoredLesson.getSnapshot().queue, lesson.getSnapshot().queue, 'lesson queue must survive reload');
console.log('PASS: lesson and general SRS sessions are isolated; lesson queue restores from its own storage key.');
