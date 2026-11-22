
'use strict';
const assert = require('node:assert/strict');
const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30];
const DAY_MS = 24 * 60 * 60 * 1000;
function calculateSrsNext(prevStats, rating, now = Date.now()) {
        if (!['again', 'hard', 'good'].includes(rating)) {
          throw new TypeError('SRS rating không hợp lệ: ' + rating);
        }
        const prev = prevStats || {
          reps: 0, intervalDays: 0, nextReviewAt: 0, lastReviewedAt: 0, lapses: 0
        };
        const next = { ...prev, lastReviewedAt: now };

        // Giữ nguyên thuật toán của HTML gốc.
        if (rating === 'again') {
          next.reps = 0;
          next.intervalDays = 0;
          next.lapses = (prev.lapses || 0) + 1;
          next.nextReviewAt = now + 5 * 60 * 1000;
        } else if (rating === 'hard') {
          next.reps = Math.max(1, prev.reps);
          next.intervalDays = 1;
          next.nextReviewAt = now + DAY_MS;
        } else if (rating === 'good') {
          const idx = Math.min(SRS_INTERVALS_DAYS.length - 1, prev.reps);
          next.intervalDays = SRS_INTERVALS_DAYS[idx];
          next.reps = prev.reps + 1;
          next.nextReviewAt = now + next.intervalDays * DAY_MS;
        }
        return next;
      }
const now = 1000000;
let s = calculateSrsNext(null, 'again', now);
assert.equal(s.reps, 0);
assert.equal(s.intervalDays, 0);
assert.equal(s.lapses, 1);
assert.equal(s.nextReviewAt, now + 5 * 60 * 1000);

s = calculateSrsNext({ reps: 0, lapses: 0 }, 'hard', now);
assert.equal(s.reps, 1);
assert.equal(s.intervalDays, 1);
assert.equal(s.nextReviewAt, now + DAY_MS);

const expected = [1, 3, 7, 14, 30];
let prev = { reps: 0, intervalDays: 0, lapses: 0 };
for (const days of expected) {
  prev = calculateSrsNext(prev, 'good', now);
  assert.equal(prev.intervalDays, days);
}
assert.equal(prev.reps, 5);

assert.throws(() => calculateSrsNext(null, 'unknown', now), /không hợp lệ/);
console.log('PASS: Again 5 phút; Hard 1 ngày; Good 1-3-7-14-30; invalid rating bị từ chối.');
