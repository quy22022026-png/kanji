'use strict';
const assert = require('node:assert/strict');
global.window = global;
require('../lesson-planner.js');

const planner = global.KawaiiLessonPlanner;
assert.ok(planner, 'lesson planner module must load');

for (let total = 1; total <= 120; total += 1) {
  const sizes = planner.getLessonSizes(total);
  assert.equal(sizes.reduce((sum, size) => sum + size, 0), total, `all ${total} words must be assigned`);
  assert.ok(sizes.every(size => size > 0), `no empty lesson for ${total}`);
  if (total >= 16) {
    assert.ok(sizes.every(size => size >= 8 && size <= 12), `8–12 word range for ${total}: ${sizes}`);
  } else if (total >= 13) {
    assert.deepEqual(sizes, [total], '13–15 word topic remains one lesson instead of creating undersized fragments');
  }
}

const words = [
  ...Array.from({ length: 25 }, (_, i) => ({ id: `N5_${i + 1}`, level: 'N5', topic: 'Gia đình', meaning: 'x' })),
  ...Array.from({ length: 9 }, (_, i) => ({ id: `N5_B_${i + 1}`, level: 'N5', topic: '  Trường   học ', meaning: 'x' })),
  { id: 'N4_1', level: 'N4', topic: 'Gia đình', meaning: 'x' }
];
const lessons = planner.planLessons(words, 'N5');
assert.deepEqual(lessons.map(item => item.words.length), [9, 8, 8, 9]);
assert.deepEqual(lessons.map(item => item.topic), ['Gia đình', 'Gia đình', 'Gia đình', 'Trường học']);
assert.ok(lessons.every(item => item.words.every(word => word.level === 'N5')));
assert.equal(planner.planLessons([...words, words[0]], 'N5').reduce((sum, lesson) => sum + lesson.words.length, 0), 34,
  'duplicate word IDs are not duplicated in lesson plans');
console.log('PASS: topic grouping, whitespace normalization, stable sheet order, no cross-level mixing, duplicate-ID guard, balanced 8–12 word chunks and small-topic edge cases.');
