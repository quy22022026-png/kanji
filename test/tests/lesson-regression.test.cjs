'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const cloud = fs.readFileSync(path.join(root, 'cloud-sync.js'), 'utf8');

test('lesson selection opens the existing Flashcard module and separates lesson session state', () => {
  assert.match(app, /state\.fcDeck = lessonFlashcards\.start\(words, \{ limit: words\.length \}\)/);
  assert.match(app, /const lessonStudySession = window\.KawaiiStudySessionModule/);
  assert.match(app, /storageKey: 'kawaii_jlpt_lesson_session_v1'/);
  assert.match(app, /state\.lessonStudying = true/);
  assert.match(app, /state\.mode = 'flashcard'/);
  assert.match(html, /id="fcPerspective"/);
});

test('lesson study hides unrelated controls and provides a dedicated return-to-list toolbar', () => {
  assert.match(html, /id="lessonStudyBar"/);
  assert.match(html, /id="btnLessonBack"/);
  assert.match(html, /id="fcSessionControls"/);
  assert.match(app, /\$\('fcSessionControls'\)\.classList\.toggle\('hidden', studying\)/);
  assert.match(app, /\$\('lessonActions'\)\.classList\.toggle\('hidden', !browsing \|\| !state\.lesson\)/);
});

test('lesson progress counts Good only and supports resume/restart without deleting prior SRS progress', () => {
  assert.match(app, /lessonGood\[word\.id\] = \{ good: rating === 'good', updatedAt: Date\.now\(\) \}/);
  assert.match(app, /function isLessonWordCompleted\(/);
  assert.match(app, /return isWordLearned\(word\.id\)/);
  assert.match(app, /function isLessonSessionFor\(/);
  assert.match(app, /const canResume = !restart && isLessonSessionFor\(lesson, activeLessonSession\)/);
  assert.match(app, /lessonStudySession\.clear\(\)/);
  assert.match(app, /lessonGoodIds: lessonGood/);
  assert.match(cloud, /lessonGoodIds/);
});

test('lesson active session is restored using stable word identities', () => {
  assert.match(app, /function restoreActiveLesson\(\)/);
  assert.match(app, /candidateIds\.size === savedIds\.size/);
  assert.match(app, /lessonStudySession\?\.getSnapshot\(\)/);
  assert.match(app, /window\.KawaiiDatabase\?\.restoreMirroredStorage\('lesson-session'\)/);
  assert.match(app, /LESSON_SESSION_MODE_KEY/);
  assert.match(app, /replay: state\.lessonReplay/);
  assert.match(app, /Tiếp tục ôn lại/);
  assert.match(app, /safeSetLS\('kawaii_jlpt_lesson_session_v1', \{ __deleted: true \}\)/);
  assert.match(app, /function invalidateSessionsBeforeReset\(resetAt\)/);
  assert.match(app, /invalidateSessionsBeforeReset\(state\.progress\.resetAt\)/);
});

test('lesson UI is connected to the topic planner', () => {
  assert.match(app, /window\.KawaiiLessonPlanner\?\.planLessons\(state\.words, level\)/);
  assert.match(html, /src="lesson-planner\.js"/);
  assert.match(styles, /\.hidden\s*\{\s*display:\s*none\s*!important/);
});
