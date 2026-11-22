'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
const css = fs.readFileSync(path.join(root,'styles.css'),'utf8');
for (const id of ['fcRateAgainBtn','fcRateHardBtn','fcRateGoodBtn']) {
  assert.ok(!html.includes(id), id + ' must be removed from the UI');
  assert.ok(!app.includes(id), id + ' must not be referenced by runtime code');
}
assert.match(html,/id="fcPrevBtn"/);
assert.match(html,/id="fcNextBtn"/);
assert.match(app,/onAgain: \(\) => handleFlashcardRating\('again'\)/); assert.match(app,/onGood: \(\) => handleFlashcardRating\('good'\)/);
assert.match(app,/rateWordSrs\(word\.id, rating\)/,'swipe rating must use existing SRS');
assert.match(app,/const nextIndex = Math\.max\(0, Math\.min\(state\.fcDeck\.length - 1, state\.fcIndex \+ direction\)\)/,'arrow navigation must not wrap');
assert.match(css,/fc-swipe-again/);
assert.match(css,/fc-swipe-good/);
assert.match(html,/nav-icon/,'navigation uses replacement SVG icons');
console.log('PASS: old rating buttons removed; two arrow controls; swipe direction labels; SRS rating path retained; non-rating arrow navigation; SVG navigation icons.');
