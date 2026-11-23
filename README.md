# Kawaii JLPT — Phase 8.5 UX & Lesson Stability (v3.7.4)

## Included files
- `index.html` — app shell with six scripts loaded in dependency order.
- `styles.css` — existing stylesheet.
- `database.js` — compatibility storage layer.
- `study-session.js` — local study-session queue and first-attempt Flashcard score.
- `flashcard.js` — Flashcard/session adapter.
- `lesson-planner.js` — topic-based lesson grouping and balanced 8–12 word lesson chunks.
- `quiz.js` — bidirectional multiple-choice quiz engine.
- `weak-words.js` — cumulative weak-word tracking.
- `app.js` — Core integration, Quiz UI, Weak Words UI, and legacy app.
- `tests/` — regression tests and test report.
- `backup/SOURCE_ORIGINAL.html` — original uploaded HTML.

## Phase 4 behavior

### Quiz
- Entry point: after a completed Flashcard session, use **Làm trắc nghiệm**, or open the Quiz tab.
- Question count: 10 by default; 15 is selectable.
- Question source: all words in the loaded vocabulary that have been studied (SRS `reps > 0` or `lapses > 0`), across all levels and topics.
- Question direction: randomly mixed Japanese → Vietnamese and Vietnamese → Japanese.
- Choices: one correct answer plus three distinct distractors.
- Selection priority: weighted random selection prioritizes words with more previous wrong answers and words not tested for longer.
- Wrong answer: immediately shows the correct answer and meaning.
- Retry: each word answered incorrectly in the first round is asked once more after the first round. A wrong answer on retry is recorded but not asked again.
- Score: Flashcard contributes only words correct on their first Flashcard operation; Quiz contributes every correct answer action, including a correct retry. Total score is the sum.
- Every wrong answer, including wrong retry answers, is stored.

### Weak Words
- An error is counted for each Flashcard Again and each wrong Quiz answer, including retry-round errors.
- The error threshold is cumulative across Flashcard and Quiz: 2 errors adds the word to Weak Words.
- Once a word enters Weak Words, it is automatically resolved only after at least 2 successful Flashcard sessions and 2 successful Quiz sessions. Session IDs must be different within each channel.
- Successful reviews before a word enters Weak Words are retained in the audit history but do not satisfy the recovery requirement.
- Manual removal changes only the weak status; error and event history remain.
- If a dismissed word receives a new error and still meets the threshold, it can re-enter Weak Words.

### Flashcard score
- `study-session.js` tracks `firstAttemptCorrect`.
- Again on the first operation does not earn a Flashcard point, even if the word is later answered Good.
- Good or Hard on the first operation earns one point.
- Repeated Again attempts are all counted as errors for Weak Words.

## Storage and sync boundaries
- Quiz attempt history and question-priority metadata are stored locally in `kawaii_jlpt_quiz_data_v1`.
- Weak Word status and history are stored locally in `kawaii_jlpt_weak_words_v1`.
- Active Flashcard session snapshot remains in `kawaii_jlpt_active_session_v1`.
- Existing LocalStorage progress keys and IndexedDB stores are preserved.
- No Supabase sync is implemented in this phase.
- Quiz in-progress state is not yet restored after closing the page; completed answer attempts remain in local history.

## Data safety
- No existing progress key is renamed or deleted.
- No IndexedDB schema migration is performed.
- Original HTML is preserved under `backup/SOURCE_ORIGINAL.html`.
- The legacy `window.KawaiiApp` API remains available.

## Tests run
- JavaScript syntax checks for all six runtime modules.
- Phase 2 SRS regression tests.
- Phase 3 session and first-attempt scoring regression tests.
- Phase 4 Quiz tests: direction-agnostic options, immediate feedback state, one retry round, retry errors counted, combined score.
- Phase 4 Weak Words tests: cumulative errors, different-session recovery, repeated errors, manual dismissal preserving history.
- Static checks for script load order and exported module assets.
- Phase 8.5 lesson planning, lesson/global session isolation, replay/resume, iOS gesture suppression and cloud reset merge tests.

Safari iOS interactive testing has not yet been completed. Use a test copy before replacing any deployed app.

## Run
Serve the folder over HTTP/HTTPS and open `index.html`. Avoid `file://`.


## Phase 5 — Pronunciation and Meaning modules

### New modules
- `pronunciation.js` — independent pronunciation service. ZEN-TTS is the primary engine; if it is unavailable or fails during synthesis/playback, Web Speech (`ja-JP`) is attempted automatically when fallback is enabled. Includes request cancellation, serialized synthesis, bounded WAV cache, word reading, and Kana single-mora mode.
- `meaning.js` — independent meaning lookup interaction service. Owns greedy dictionary tokenization, tappable token and ruby element creation, interactive example rendering, popup field updates, and popup close behavior.

### Integration
- Both modules are loaded before `app.js`.
- Existing UI event handlers continue to use compatibility wrappers, so existing Flashcard/Kana/example flows do not need to know module internals.
- `window.KawaiiApp.tts.module` and `window.KawaiiApp.dict.module` expose the module APIs.
- Existing `window.KawaiiApp.tts.speak`, `speakWord`, `speakKana`, `stop`, and `window.KawaiiApp.dict.lookup`, `tokenize`, `showPopup`, `hidePopup` remain available.
- ZEN-TTS model loading and IndexedDB/Cache API model persistence remain in `app.js`; the playback, cache, cancellation and fallback responsibilities are in `pronunciation.js`.

### Phase 5 checks
- ZEN-TTS playback and cache reuse.
- Kana single-mora speech path.
- Automatic Web Speech fallback after ZEN-TTS error.
- Stop/cancel behavior.
- Dictionary longest-match tokenization and punctuation handling.
- Popup fields and pronunciation callback.
- Syntax checks for all runtime JS files.
- Previous Phase 2, 3 and 4 regression suites.
- ZIP integrity and script load order.

### Known limitations
- Actual Safari iOS playback still requires device testing. Browser voice availability and autoplay policy vary by iOS version and device settings.
- Web Speech fallback quality depends on the Japanese voice installed by iOS.
- Meaning lookup remains limited to the currently loaded dictionary; unknown tokens display the existing “not found” explanation.
- The ZEN-TTS model download/initialization lifecycle is intentionally unchanged in this phase.


## Phase 6 — Local-first storage and optional Supabase sync

### Local database
- Existing IndexedDB database name remains `KawaiiJLPTDB_v2`.
- IndexedDB internal version is upgraded from 1 to 2.
- Existing `datasets` store and `active_dataset` key are retained; no store is deleted or renamed.
- New stores: `app_state`, `completed_sessions`, `sync_metadata`.
- Quiz, Weak Words and active Flashcard session continue to write LocalStorage synchronously and mirror to IndexedDB.
- On startup, missing LocalStorage copies for those mirrored modules are restored from IndexedDB.
- Progress and preferences are mirrored as snapshots in IndexedDB while their existing LocalStorage keys remain compatible.

### Completed-session rule
- Only a Flashcard session whose status is `completed` can enter `completed_sessions`.
- Active sessions remain local to the device and are not uploaded to Supabase.
- A completed session is marked `pending` locally until the cloud confirms its upsert; failed uploads remain pending for a later retry.
- On successful login and manual/automatic sync, pending completed sessions are uploaded to `study_sessions`; completed sessions from other devices are downloaded into the local completed-session repository.

### Supabase backup
- Optional email/password authentication is exposed in the new cloud-account modal.
- `user_backups` stores a JSON snapshot of progress, Quiz history, Weak Words history and preferences.
- `study_sessions` stores completed Flashcard sessions only.
- Sign-out does not clear LocalStorage or IndexedDB.
- Multi-device login merges local and remote snapshots before upload:
  - Per-word SRS state: choose the record with the newest `lastReviewedAt`.
  - Streak/counters: keep the larger value.
  - Quiz attempts: union by attempt ID.
  - Quiz test timestamps: keep the newest timestamp.
  - Weak Words: union event histories and successful-session IDs, then recalculate the status.
  - Preferences: current device values take precedence.
- A successful backup is scheduled after progress, preference, Quiz and Weak Words changes. The debounce is 1.8 seconds.
- Pending completed sessions are retried on the next successful login or manual sync.

### Supabase setup required
1. Create a Supabase project.
2. Run `supabase-schema.sql` in Supabase SQL Editor.
3. Copy the Project URL and publishable/anon key into `supabase-config.js`.
4. Configure Supabase Auth email settings.
5. Deploy through HTTPS (for example GitHub Pages).
6. Open the cloud icon, create an account or sign in, then check the sync status.

Only the public anon/publishable key belongs in the browser. Never place a `service_role` or secret key in this repository. Row Level Security is enabled on both tables and policies restrict rows to `auth.uid()`.

### Cloud boundary and limitations
- Supabase is not live until the project URL/key are configured and the SQL schema is applied.
- The external Supabase JS SDK is loaded from jsDelivr; network access is required for cloud login/sync.
- The current sync merge is deterministic but not a full event-sourced conflict engine. In particular, streaks use max rather than combining chronological activity across devices.
- The application does not delete local records on sign-out.
- Safari iOS device testing and a real Supabase project integration test remain outstanding.


## Phase 7 — iOS reliability, offline recovery and account isolation

### Offline and resume behavior
- Local learning remains available without a network connection.
- Cloud sync checks `navigator.onLine`; offline sync is queued without starting auth or network requests.
- The `online` event retries the latest local snapshot.
- Failed online syncs use exponential retry delays capped at 60 seconds.
- Returning to the app (`pageshow` / `visibilitychange`) attempts a sync.
- Pending timers are cleared on `pagehide`; the latest snapshot remains in local state for the next resume.
- Sync now uses pull → merge → push to avoid blindly replacing newer cloud progress.

### Account isolation
- The first authenticated account is recorded in local sync metadata.
- Signing into a different account on the same browser profile is rejected and the new session is signed out before local data can be merged or uploaded.
- This prevents account A's local progress from being copied into account B.
- To use multiple accounts, use separate Safari profiles/browser profiles or perform an explicit data export and transfer workflow. Sign-out still preserves the local data.

### Local storage fallback
- Completed-session queue and sync metadata fall back to LocalStorage if IndexedDB is unavailable or blocked.
- Existing LocalStorage records remain in place.
- IndexedDB connections close on `versionchange` to reduce multi-tab upgrade conflicts.
- Synced records update their stored timestamp so an older fallback copy cannot incorrectly re-queue an already uploaded session.

### Supabase session key
- `study_sessions` uses the composite primary key `(user_id, id)`.
- Client upserts use `onConflict: 'user_id,id'`.
- This prevents a session ID collision between different users from targeting another user's row.
- Re-run the supplied schema on a fresh Supabase project. If Phase 6 schema was already deployed to a live project, apply a reviewed migration to replace the old primary key; `create table if not exists` does not alter an existing primary key.

### iOS Safari layout
- Viewport now opts into `viewport-fit=cover`.
- Safe-area insets are applied at the page edges.
- Dynamic/small viewport height units are used where supported.
- Momentum scrolling is enabled for overflow panels on WebKit.

### Phase 7 validation boundaries
- Automated tests cover offline queue/online retry, pull-merge-push, account isolation and the per-user session key.
- Node syntax checks and existing Phase 2–6 regression tests are rerun.
- A physical iPhone/iPad Safari test and live Supabase integration test still require the target device and real Supabase project credentials. They are not represented as completed by the automated tests.


## Phase 8 — Swipe-first Flashcard UI (v3.7.0)

### UI changes
- Removed the three visible rating controls (Again / Hard / Good).
- Flashcard evaluation is now swipe-only: left = Again; right = Good.
- Swipe feedback labels appear on the corresponding side with soft pink/green styling.
- Swipes require at least 25% of card width (minimum 64 px), or a short fast swipe above the velocity threshold.
- Replaced the primary navigation emoji icons with consistent inline SVG outline icons.
- Replaced the Flashcard speaker emoji with a matching outline speaker icon.
- Added two arrow controls below the card: previous and next.
- Arrow navigation changes only the viewed card; it does not rate the card or update SRS.
- Unrated cards remain in the active deck. Arrow navigation stops at the first/last card and does not wrap.
- The existing SRS calculation and `rateWordSrs` path are unchanged.
- The active SMART study session no longer disables previous/next navigation.

### Interaction
- Tap card background to flip; tappable Japanese tokens and speaker buttons retain their existing behavior.
- Swipe left calls the existing Again rating path.
- Swipe right calls the existing Good rating path.
- There is no undo action, as requested.
- Arrow buttons are disabled at deck boundaries.

### Verification
- All runtime JavaScript files pass `node --check`.
- Previous Phase 2–7 regression suites pass.
- Phase 8 static UI regression verifies old rating controls are absent, arrow navigation exists, swipe directions map correctly, and SRS calls remain unchanged.
- Real iPhone Safari gesture and visual testing remains outstanding.

## Phase 8.1 — Hotfix (3.7.1)
- Root cause: Phase 8 index.html omitted Cloud Account modal, its trigger, and Supabase script references. app.js bound these missing DOM nodes and aborted later event registration, including audio settings. All required nodes/scripts restored.
- Flashcard gestures moved into `flashcard-interaction.js`; `app.js` remains orchestration and SRS logic.
- Prevent horizontal page jumps: removed 520px offscreen card translation, capped drag movement at 38px and reset before rating.
- Navigation arrows change the displayed word without rating or altering SRS, with no unnecessary transition.
- Reduced 3D flip spring to a stable 360ms easing and added Safari backface handling.
- 13 automated regression checks pass; iPhone Safari hardware testing is still required.

## Phase 8.2 — Session size selector fix (3.7.2)
- Re-enabled `sessionSizeSelect`; removed the hard-coded disabled state and forced value of 10.
- The selected value (10, 20, 30, unlimited) is validated and persisted in preferences.
- A changed setting applies to the next study session; an already active session is not silently discarded or resized.
- `startNewStudySession` and first-time SMART session creation now use the selected limit.
- Unlimited uses the available new + due word pool size.
- Increased the StudySession module's safe configurable cap from 10 to 1000, allowing the 20/30 options to work.
- Added regression coverage. All 14 automated test files pass.

## Word Voice — neutral ZEN-TTS (from v3.7.2)
- `pronunciation.js`: isolated single-word ZEN-TTS configuration (`happy=0`, `neutral=100`) while retaining the same ZEN-TTS voice, user-selected speed/pitch and Kana reading priority.
- Sentence synthesis and Kana mode remain unchanged. Word and sentence audio cache keys remain separated by their effective emotion settings.
- This targets unnatural word-level prosody; Japanese pitch-accent accuracy is not guaranteed by the TTS engine.
- `tests/phase8-3-word-voice.test.cjs` covers the behavior. Real iPhone Safari listening tests remain necessary.

## Phase 8.5 — Topic lessons, iOS interaction and progress stability (v3.7.4)

### Lesson flow and UX
- The Flashcard entry screen starts with **Bắt đầu học**, then offers JLPT level and lessons grouped by the existing Google Sheets topic labels.
- Topic order and word order follow the sheet. Lessons are balanced to 8–12 words where possible. A 13–15 word topic remains one lesson rather than being split into two undersized lessons; topics below 8 words remain a small lesson and are not mixed with another topic.
- Selecting an incomplete lesson opens the existing Flashcard module immediately. The lesson list, lesson action buttons and general session filters are hidden while studying; a compact lesson title/progress bar and **Danh sách bài** action remain visible.
- Lesson sessions use their own mirrored storage key (`kawaii_jlpt_lesson_session_v1`) and no longer replace an unfinished general SMART/SRS session.
- Returning to the list preserves the active lesson queue. Selecting that lesson again resumes it; selecting another lesson starts that lesson without losing Good/Again progress already recorded for the first one.
- Good marks a word complete. Again marks it incomplete and requeues it. **Học lại toàn bộ** starts a full lesson replay without clearing SRS history; Again during replay can remove the lesson-complete state for that word.
- Previous SRS records with `reps > 0` are treated as already learned when no explicit lesson status exists, avoiding unnecessary relearning after upgrade.
- Replay mode is stored against the active lesson session ID, so it survives closing the lesson list and a reload.

### Flashcard and iOS interaction fixes
- StudySession can rate any card still in the queue, not only the first card. This keeps previous/next navigation usable without producing a queue mismatch error.
- Swipe click suppression expires and is cleared on pointer cancellation/new pointer input, preventing a missing Safari click event from swallowing the next intentional tap.
- Critical `.hidden` behavior and lesson-card layout have local CSS fallbacks if the Tailwind CDN is temporarily unavailable. Full visual styling still uses the configured Tailwind CDN.

### Data and sync integrity
- Lesson progress entries carry timestamps; a newer Again can override an older Good when devices merge progress.
- Explicit progress reset carries a `resetAt` marker. A newer reset wins over stale remote progress instead of being undone by max/union merging.
- ZEN-TTS now checks `zen-worker.js` and statically referenced local worker dependencies before downloading the large model bundle. The worker/vendor files themselves are not included in this source package; Web Speech fallback remains available when iOS exposes a Japanese voice.

### Phase 8.5 verification
- All runtime JavaScript files pass `node --check`.
- Automated tests cover topic grouping/chunk sizes, Good/Again status merge, reset tombstones, session isolation, out-of-order card rating, gesture suppression expiry and ZEN-TTS preflight.
- A Chromium 390×844 mobile-viewport interaction simulation used sample vocabulary to test: start → choose level → open lesson → flip → swipe Good/Again → next-arrow then rate → back to list → resume → switch mode → reload-style restore → complete → replay → Again during replay → close list/reload → resume replay. All tested assertions passed.
- The browser simulation used mocked LocalStorage and disabled IndexedDB because it ran in an opaque `about:blank` context. It is not a substitute for a physical iPhone Safari test.
- Real iPhone/iPad Safari, a live Google Sheets fetch, and a real Supabase project integration test remain outstanding.
