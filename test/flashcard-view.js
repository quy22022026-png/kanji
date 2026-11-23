/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const {vocabulary, preferences, lessons, flashcards, studySession, srs, weakWords, events, notifications, pronunciation, meaning, routing} = options;
    const {$, escapeHtml, shuffled} = options.ui;
    const {LEVELS} = window.KawaiiAppConfig;
    const {showToast} = notifications;
    const {getWordStat, getWordSrsInfo, isWordDue, isWordNew} = srs;
    const getBasePool = () => vocabulary.getPool(preferences.getSnapshot());
    const state = {
      get words() {return vocabulary.getAll();}, get prefs() {return preferences.getSnapshot();},
      get mode() {return routing.getMode();},
      lesson: null, lessonBrowserOpen: false, lessonStudying: false, lessonLevel: 'N5',
      fcDeck: [], fcIndex: 0, fcFlipped: false, sessionStats: {reviewed:0,good:0,again:0}
    };
    let cardMoveTimer = null;
    let ratingPending = false;
    const scope = window.KawaiiUiUtils.createScope();
    options.cleanup?.(scope.destroy);
    const stopAudio = pronunciation.stop;
    const speakWord = pronunciation.speakWord;
    const speakJapaneseText = pronunciation.speak;
    const hideTranslateSheet = meaning.hidePopup;
    const renderAll = () => events.emit('ui:render');
    const renderHeader = () => events.emit('ui:header');
    const rebuildTopicOptions = () => events.emit('ui:topics');
    const getQuizEligibleWords = () => vocabulary.getAll().filter(w => {const st = srs.getWordStat(w.id); return st && (st.reps > 0 || st.lapses > 0);});
    const persistCompletedStudySession = session => events.emit('session:completed', {session, stats: session.stats});

    function renderCardWordWithRuby(containerEl, word) {
      containerEl.innerHTML = '';
      containerEl.classList.toggle('hide-furi', !state.prefs.showFuri);
      const furiStr = word.furigana || '';

      if (furiStr.includes('[')) {
        const regex = /([^\[\]]+?)\[([^\]]+)\]|([^\[\]]+)/g;
        let match;
        while ((match = regex.exec(furiStr)) !== null) {
          if (match[1] && match[2]) {
            const base = match[1], rt = match[2];
            const kanjiStart = base.search(/\p{Script=Han}/u);
            if (kanjiStart > 0) {
              containerEl.appendChild(createTapSpan(base.slice(0, kanjiStart), word.kanji || word.kana, word, false));
              containerEl.appendChild(createRubyTapToken(base.slice(kanjiStart), rt, word));
            } else {
              containerEl.appendChild(createRubyTapToken(base, rt, word));
            }
          } else if (match[3]) {
            containerEl.appendChild(createTapSpan(match[3], word.kanji || word.kana, word, false));
          }
        }
        $('fcFurigana').textContent = '';
      } else {
        const display = word.kanji || word.kana;
        Array.from(display).forEach(ch => {
          const isKanji = /\p{Script=Han}/u.test(ch);
          containerEl.appendChild(createTapSpan(ch, isKanji ? ch : display, word, isKanji));
        });
        const showTopFuri = state.prefs.showFuri && word.kanji && word.kana && word.kanji !== word.kana;
        $('fcFurigana').textContent = showTopFuri ? word.kana : '';
        $('fcFurigana').style.opacity = showTopFuri ? '1' : '0';
      }
    }

    function createRubyTapToken(baseText, rtText, word) {
      return meaning
        ? meaning.createRubyToken(baseText, rtText, word)
        : document.createTextNode(baseText);
    }

    function createTapSpan(text, lookupKey, word, underline) {
      return meaning
        ? meaning.createTapToken(text, lookupKey, word, { underline })
        : document.createTextNode(text);
    }

    function renderInteractiveExample(containerEl, sentence, parentWord) {
      if (meaning) meaning.renderSentence(containerEl, sentence, parentWord);
    }

    function renderLessonBrowser() {
      const home = $('lessonHome');
      home.classList.toggle('hidden', state.mode !== 'flashcard');
      if (state.mode !== 'flashcard') return;
      $('lessonBrowser').classList.toggle('hidden', !state.lessonBrowserOpen || state.lessonStudying);
      $('lessonActions').classList.toggle('hidden', !state.lesson);
      $('flashcardView').classList.toggle('hidden', !state.lessonStudying);
      const levels = $('lessonLevels');
      levels.replaceChildren();
      LEVELS.filter(level => state.words.some(w => w.level === level)).forEach(level => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = level;
        b.className = 'rounded-xl px-4 py-2 text-xs font-extrabold ' + (state.lessonLevel === level ? 'bg-[#FB6F92] text-white' : 'bg-[#F6EFE8]');
        b.onclick = () => { state.lessonLevel = level; state.lesson = null; state.lessonStudying = false; renderLessonBrowser(); };
        levels.appendChild(b);
      });
      const list = $('lessonList'); list.replaceChildren();
      (lessons?.getLessons(state.words, state.lessonLevel) || []).forEach((lesson, i) => {
        const completed = lessons.getCompletedCount(lesson);
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'text-left rounded-2xl border border-[#F1ECE6] p-3 bg-[#FFFDF9] hover:border-[#FB6F92]';
        const title = document.createElement('strong'); title.className = 'block text-sm'; title.textContent = `Bài ${i + 1} · ${lesson.topic}`;
        const desc = document.createElement('span'); desc.className = 'text-xs text-[#786D69]'; desc.textContent = `${completed}/${lesson.words.length} từ đã học`;
        b.append(title, desc);
        b.onclick = () => { state.lesson = lesson; startLesson(false); };
        list.appendChild(b);
      });
      if (state.lesson) {
        const done = lessons?.getCompletedCount(state.lesson) || 0;
        $('lessonSelectedInfo').textContent = `${state.lesson.level} · ${state.lesson.topic} · ${done}/${state.lesson.words.length} từ đã học`;
        $('btnLessonContinue').textContent = `Học tiếp (${state.lesson.words.length - done} từ)`;
        $('btnLessonContinue').disabled = done === state.lesson.words.length;
        $('btnLessonContinue').classList.toggle('opacity-50', done === state.lesson.words.length);
      }
    }

    function startLesson(restart) {
      if (ratingPending) return;
      const lesson = state.lesson;
      if (!lesson || !lessons || !flashcards) return;
      const words = lessons.getStudyWords(lesson, restart);
      if (!words.length) { state.lessonStudying = false; renderLessonBrowser(); showToast('Bài này đã hoàn thành. Hãy chọn Học lại toàn bộ.', 'info'); return; }
      studySession?.clear();
      preferences.update({ level: lesson.level, topic: lesson.topic, fcFilter: 'SMART' }, { persist: true });
      rebuildTopicOptions();
      state.fcDeck = flashcards.start(words, { limit: words.length });
      state.lessonStudying = true;
      state.fcIndex = 0; state.fcFlipped = false;
      state.sessionStats = { reviewed: 0, good: 0, again: 0 };
      try {
        lessons.activate(lesson, studySession?.getSnapshot(), state.fcDeck[0]?.id || null);
      } catch (error) {
        console.warn('[Kawaii Lessons] Không thể lưu ngữ cảnh bài học:', error);
        showToast('Bài học đã bắt đầu nhưng chưa lưu được trạng thái khôi phục.', 'warning');
      }
      renderAll();
    }

    function rebuildFlashcardDeck(shuffle = false) {
      if (ratingPending) return;
      if (state.lesson) return;
      cancelCardMove();
      const now = Date.now();
      const pool = getBasePool();

      // SMART là phiên học chính: số từ theo tùy chọn người học, trộn từ mới và từ đến hạn.
      // Phiên đang học được khôi phục, không tự tạo phiên mới khi tải lại trang.
      if (state.prefs.fcFilter === 'SMART' && flashcards) {
        const savedSession = studySession.getSnapshot();
        if (savedSession && savedSession.status === 'active') {
          state.fcDeck = flashcards.restore();
        } else if (savedSession && savedSession.status === 'completed') {
          state.fcDeck = [];
        } else {
          const dueList = pool.filter(w => isWordDue(w.id, now));
          const newList = pool.filter(w => isWordNew(w.id));
          state.fcDeck = flashcards.start(shuffle ? shuffled([...dueList, ...newList]) : [...dueList, ...newList], { limit: getSessionWordLimit(pool.length) });
        }
        state.fcIndex = Math.max(0,state.fcDeck.findIndex(word => word.id === savedSession?.currentWordId));
        state.fcFlipped = false;
        const snapshot = studySession.getSnapshot();
        state.sessionStats = snapshot
          ? { reviewed: snapshot.stats.reviewed, good: snapshot.stats.good + snapshot.stats.hard, again: snapshot.stats.again }
          : { reviewed: 0, good: 0, again: 0 };
        return;
      }

      // Các bộ lọc DUE / NEW / ALL vẫn giữ cơ chế duyệt từ tương thích bản cũ.
      const dueList = pool.filter(w => isWordDue(w.id, now)).sort((a, b) => (getWordStat(a.id)?.nextReviewAt || 0) - (getWordStat(b.id)?.nextReviewAt || 0));
      const newList = pool.filter(w => isWordNew(w.id));
      let deck = [];
      if (state.prefs.fcFilter === 'DUE') deck = dueList;
      else if (state.prefs.fcFilter === 'NEW') deck = newList;
      else deck = pool;
      const limit = Number(state.prefs.sessionSize) || 0;
      if (limit > 0 && state.prefs.fcFilter !== 'ALL') deck = deck.slice(0, limit);
      if (shuffle) deck = shuffled(deck);
      state.fcDeck = deck;
      state.fcIndex = 0;
      state.fcFlipped = false;
      state.sessionStats = { reviewed: 0, good: 0, again: 0 };
    }

    function getRelatedWords(word) {
      if (!word || !word.kanji) return [];
      const kanjis = [...new Set(word.kanji.match(/\p{Script=Han}/gu) || [])];
      if (!kanjis.length) return [];
      const related = [];
      for (const w of state.words) {
        if (w.id === word.id || !w.kanji) continue;
        if (kanjis.some(k => w.kanji.includes(k))) {
          related.push(w);
          if (related.length >= 4) break;
        }
      }
      return related;
    }

    function renderFlashcard() {
      const now = Date.now();
      const pool = getBasePool();
      const dueTotal = pool.filter(w => isWordDue(w.id, now)).length;
      const newTotal = pool.filter(w => isWordNew(w.id)).length;
      $('dueCountBadge').textContent = dueTotal;
      $('newCountBadge').textContent = newTotal;
      $('sessionSizeSelect').value = String(state.prefs.sessionSize);

      document.querySelectorAll('.fc-filter-btn').forEach(btn => {
        const active = btn.dataset.filter === state.prefs.fcFilter;
        btn.disabled = !!state.lesson;
        btn.className = active
          ? 'fc-filter-btn px-2.5 py-1 rounded-xl transition whitespace-nowrap bg-white text-[#FB6F92] shadow-sm font-extrabold'
          : 'fc-filter-btn px-2.5 py-1 rounded-xl transition whitespace-nowrap text-[#786D69]';
      });

      const total = state.fcDeck.length;
      const managedSession = (state.lesson || state.prefs.fcFilter === 'SMART') &&
        studySession && studySession.getSnapshot()?.status === 'active';
      ['fcPrevBtn', 'fcNextBtn', 'fcShuffleBtn'].forEach(id => { $(id).disabled = !total; });
      if (managedSession) {
        const snapshot = studySession.getSnapshot();
        $('fcCounter').textContent = `${state.fcIndex + 1} / ${snapshot.initialWordIds.length}`;
      } else {
        $('fcCounter').textContent = total ? `${state.fcIndex + 1} / ${total}` : '0 / 0';
      }
      $('fcPrevBtn').disabled = !total || state.fcIndex <= 0;
      $('fcNextBtn').disabled = !total || state.fcIndex >= total - 1;

      if (!total) {
        $('fcPerspective').classList.add('hidden');
        $('fcEmptyFilter').classList.remove('hidden');
        const didStudy = state.sessionStats.reviewed > 0;
        $('fcSessionSummary').classList.toggle('hidden', !didStudy);
        $('btnStartQuizAfterSession').classList.toggle('hidden', getQuizEligibleWords().length < 4);
        if (didStudy) {
          $('fcEmptyIcon').textContent = '🎉';
          $('fcEmptyTitle').textContent = 'Hoàn thành phiên học xuất sắc!';
          $('fcEmptyDesc').textContent = dueTotal + newTotal > 0
            ? `Còn ${dueTotal} từ cần ôn và ${newTotal} từ mới trong mục này. Bạn muốn học tiếp phiên mới không?`
            : 'Tuyệt vời! Bạn đã xử lý hết toàn bộ từ cần ôn và từ mới ở mục này hôm nay.';
          $('sumReviewed').textContent = state.sessionStats.reviewed;
          $('sumGood').textContent = state.sessionStats.good;
          $('sumAgain').textContent = state.sessionStats.again;
        } else {
          $('fcEmptyIcon').textContent = '✨';
          $('fcEmptyTitle').textContent = state.prefs.fcFilter === 'DUE' ? 'Chưa có từ nào đến hạn ôn!' : 'Không có từ nào trong mục này!';
          $('fcEmptyDesc').textContent = 'Bạn có thể chuyển sang "🎯 Phiên học" để học từ mới hoặc bấm "Xem tất cả từ".';
        }
        $('btnStartNextSession').classList.toggle('hidden', dueTotal + newTotal === 0);
        return;
      }

      $('fcPerspective').classList.remove('hidden');
      $('fcEmptyFilter').classList.add('hidden');

      const word = state.fcDeck[state.fcIndex];
      const srsInfo = getWordSrsInfo(word.id, now);
      $('fcInner').classList.toggle('is-flipped', state.fcFlipped);
      $('fcLevelBadge').textContent = word.level;
      $('fcSrsBadge').textContent = srsInfo.label;
      $('fcSrsBadge').className = `px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 ${srsInfo.badgeClass}`;
      $('fcTopicBadge').textContent = word.topic || 'Chung';

      renderCardWordWithRuby($('fcKanji'), word);
      $('fcRomaji').textContent = state.prefs.showFuri && word.romaji ? `/${word.romaji}/` : '';
      $('fcHanViet').textContent = word.hanViet ? `Hán Việt: ${word.hanViet}` : '';

      const mainText = word.kanji || word.kana;
      $('fcBackWordMini').textContent = state.prefs.showFuri && word.kanji && word.kana !== word.kanji
        ? `${word.kanji}（${word.kana}）` : mainText;
      $('fcPosBadge').textContent = word.pos || '';
      $('fcPosBadge').classList.toggle('hidden', !word.pos);
      $('fcMeaning').textContent = word.meaning;

      if (word.example && word.example.ja) {
        $('fcExampleBox').classList.remove('hidden');
        renderInteractiveExample($('fcExJa'), word.example.ja, word);
        $('fcExRomaji').textContent = state.prefs.showFuri && word.example.romaji ? word.example.romaji : '';
        $('fcExVi').textContent = word.example.vi || '';
      } else {
        $('fcExampleBox').classList.add('hidden');
      }

      const related = getRelatedWords(word);
      if (related.length) {
        $('fcRelatedBox').classList.remove('hidden');
        const listEl = $('fcRelatedList');
        listEl.innerHTML = '';
        related.forEach(rw => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'px-2.5 py-1 rounded-xl bg-white border border-[#E8DFD6] hover:border-[#FF8FA3] text-xs font-bold text-[#4A4240] flex items-center gap-1 transition';
          chip.innerHTML = `<span class="text-[10px] font-extrabold text-[#FB6F92]">${rw.level}</span><span class="font-jp">${escapeHtml(rw.kanji || rw.kana)}</span>`;
          chip.onclick = (e) => {
            e.stopPropagation();
            hideTranslateSheet();
            preferences.update({ level: rw.level, topic: 'ALL', fcFilter: 'ALL' }, { persist: true });
            rebuildTopicOptions();
            rebuildFlashcardDeck();
            const idx = state.fcDeck.findIndex(item => item.id === rw.id);
            if (idx >= 0) state.fcIndex = idx;
            state.fcFlipped = false;
            renderAll();
          };
          listEl.appendChild(chip);
        });
      } else {
        $('fcRelatedBox').classList.add('hidden');
      }
    }

    function flipFlashcard() {
      if (!state.fcDeck.length || cardMoveTimer !== null) return;
      hideTranslateSheet();
      state.fcFlipped = !state.fcFlipped;
      $('fcInner').classList.toggle('is-flipped', state.fcFlipped);
      if (state.fcFlipped) speakWord(state.fcDeck[state.fcIndex]);
    }

    function cancelCardMove() {
      clearTimeout(cardMoveTimer);
      cardMoveTimer = null;
      const card = $('fcPerspective');
      if (card) { card.style.transition = ''; card.style.transform = ''; card.style.opacity = ''; }
    }

    function moveCard(direction) {
      if (ratingPending) return;
      if (!state.fcDeck.length || cardMoveTimer !== null) return;
      const nextIndex = Math.max(0, Math.min(state.fcDeck.length - 1, state.fcIndex + direction));
      if (nextIndex === state.fcIndex) return;
      stopAudio();
      hideTranslateSheet();
      state.fcIndex = nextIndex;
      state.fcFlipped = false;
      if (state.prefs.fcFilter === 'SMART') studySession?.setCurrentWord(state.fcDeck[state.fcIndex]?.id);
      if (state.lesson) lessons?.setCurrentWord(state.fcDeck[state.fcIndex]?.id || null, studySession?.getSnapshot()?.id);
      renderFlashcard();
    }

    function getSessionWordLimit(availableCount) {
      const selected = Number(state.prefs.sessionSize);
      if (!Number.isFinite(selected) || selected <= 0) return Math.max(1, availableCount);
      return Math.min(Math.floor(selected), Math.max(1, availableCount));
    }

    function startNewStudySession() {
      if (ratingPending) return;
      if (!studySession || !flashcards) {
        rebuildFlashcardDeck();
        renderFlashcard();
        return;
      }
      lessons?.clearActive();
      state.lesson = null;
      state.lessonStudying = false;
      state.lessonBrowserOpen = false;
      studySession.clear();
      preferences.update({ fcFilter: 'SMART' }, { persist: true });
      const now = Date.now();
      const pool = getBasePool();
      const dueList = pool.filter(w => isWordDue(w.id, now));
      const newList = pool.filter(w => isWordNew(w.id));
      state.fcDeck = flashcards.start([...dueList, ...newList], { limit: getSessionWordLimit(pool.length), context:'standalone' });
      state.lessonStudying = true;
      state.fcIndex = 0;
      state.fcFlipped = false;
      const snapshot = studySession.getSnapshot();
      state.sessionStats = snapshot
        ? { reviewed: 0, good: 0, again: 0 }
        : { reviewed: 0, good: 0, again: 0 };
      renderHeader();
      renderFlashcard();
      if (!state.fcDeck.length) {
        showToast('Hiện không có từ mới hoặc từ đến hạn để bắt đầu phiên.', 'info');
      }
    }

    async function handleFlashcardRating(rating) {
      if (!state.fcDeck.length || ratingPending) return;
      ratingPending = true;
      cancelCardMove();
      stopAudio();
      hideTranslateSheet();

      const word = state.fcDeck[state.fcIndex];
      let next;
      
      const isManagedSession = (state.lesson || state.prefs.fcFilter === 'SMART') &&
        studySession && flashcards &&
        studySession.getSnapshot()?.status === 'active';

      try {
        if (isManagedSession) {
          const result = await flashcards.rate(word.id, rating, {lesson: !!state.lesson});

          next = result.stat;
          state.fcDeck = result.deck;
          state.fcIndex = 0;
          state.sessionStats = {
            reviewed: result.session.stats.reviewed,
            good: result.session.stats.firstAttemptCorrect || 0,
            again: result.session.stats.again
          };
          if (result.completed) {
        
            persistCompletedStudySession(result.session);
          }
        } else {
          // Legacy filters also delegate rating and deck transitions to Flashcard.
          // Keep the original SRS alias for old plugins (rateWordSrs).
          const result = await flashcards.rateBrowsing(state.fcDeck, state.fcIndex, rating, {
            lesson: !!state.lesson,
            filter: state.prefs.fcFilter,
            stats: state.sessionStats
          });
          next = result.stat;
          state.fcDeck = result.deck;
          state.fcIndex = result.index;
          state.sessionStats = result.stats;
        }
      } catch (error) {
        console.error('[Kawaii Flashcard]', error);
        showToast('Không thể lưu kết quả học: ' + (error?.message || 'Lỗi dữ liệu'), 'error');
        ratingPending = false;
        return;
      }

      if (state.lesson) renderLessonBrowser();

      const activeSnapshot = studySession?.getSnapshot();
      const reviewSessionId = (isManagedSession && activeSnapshot?.id)
        ? activeSnapshot.id
        : (state.fcReviewSessionId || (state.fcReviewSessionId = `fc_browse_${Date.now()}`));
      if (weakWords) {
        if (rating === 'again') weakWords.recordError(word.id, 'flashcard', reviewSessionId);
        else weakWords.recordCorrect(word.id, 'flashcard', reviewSessionId);
        events.emit('backup:changed');
      }

      if (rating === 'again') {
        showToast(`Sẽ gặp lại "${word.kanji || word.kana}" ở cuối hàng đợi phiên!`, 'info');
      } else {
        showToast(`Đã lưu lịch ôn "${word.kanji || word.kana}" sau ${next.intervalDays} ngày.`, 'success');
      }
      events.emit('word:rated', { word, rating, stat: next, sessionId: reviewSessionId });
      ratingPending = false;
      state.fcFlipped = false;
      renderHeader();
      renderFlashcard();
    }

    function restore() {
      flashcards.reconcileDataset();
      state.lessonLevel = state.prefs.level;
      const restoredLesson = lessons?.restore(state.words, studySession?.getSnapshot());
      if (restoredLesson) {
        state.lesson = restoredLesson.lesson;
        state.lessonLevel = restoredLesson.lesson.level;
        state.lessonBrowserOpen = true;
        state.lessonStudying = true;
        preferences.update({ level: restoredLesson.lesson.level, topic: restoredLesson.lesson.topic }, { persist: true });
        state.fcDeck = flashcards?.restore() || [];
        const restoredCurrent = studySession.getSnapshot()?.currentWordId || restoredLesson.currentWordId;
        const restoredIndex = restoredCurrent
          ? state.fcDeck.findIndex(word => word.id === restoredCurrent)
          : -1;
        state.fcIndex = restoredIndex >= 0 ? restoredIndex : 0;
        state.fcFlipped = false;
        const sessionSnapshot = studySession?.getSnapshot();
        state.sessionStats = sessionSnapshot
          ? {
              reviewed: sessionSnapshot.stats.reviewed,
              good: sessionSnapshot.stats.firstAttemptCorrect || 0,
              again: sessionSnapshot.stats.again
            }
          : { reviewed: 0, good: 0, again: 0 };
      } else {
        state.lesson = null;
        state.lessonStudying = studySession?.getSnapshot()?.context === 'standalone';
        rebuildFlashcardDeck();
      }
    }

    function browseWord(word) { state.lesson = null; state.lessonStudying = true; preferences.update({level: word.level, topic: 'ALL', fcFilter:'ALL'}, {persist:true}); rebuildFlashcardDeck(); const index = state.fcDeck.findIndex(w => w.id === word.id); state.fcIndex = Math.max(0,index); state.fcFlipped = false; }
    function reset() { state.lesson = null; state.lessonStudying = false; state.lessonBrowserOpen = false; rebuildFlashcardDeck(); }
    function mount() {
    scope.bind($('btnBeginLessons'), 'onclick', () => { state.lessonBrowserOpen = true; renderLessonBrowser(); });
    scope.bind($('btnLessonBack'), 'onclick', () => {
      state.lesson = null;
      state.lessonStudying = false;
      lessons?.clearActive();
      studySession?.clear();
      renderAll();
    });
    scope.bind($('btnLessonContinue'), 'onclick', () => startLesson(false));
    scope.bind($('btnLessonRestart'), 'onclick', () => startLesson(true));

    scope.add(window.KawaiiFlashcardInteraction.attach($('fcPerspective'), {
      onFlip: flipFlashcard,
      onAgain: () => handleFlashcardRating('again'),
      onGood: () => handleFlashcardRating('good'),
      isBusy: () => !state.fcDeck.length || cardMoveTimer !== null || ratingPending
    }).destroy);

    scope.bind($('fcSpeakFrontBtn'), 'onclick', (e) => { e.stopPropagation(); speakWord(state.fcDeck[state.fcIndex]); });
    scope.bind($('fcSpeakBackBtn'), 'onclick', (e) => { e.stopPropagation(); speakWord(state.fcDeck[state.fcIndex]); });
    scope.bind($('fcSpeakExBtn'), 'onclick', (e) => { e.stopPropagation(); const w = state.fcDeck[state.fcIndex]; if (w?.example?.ja) speakJapaneseText(w.example.ja); });
    scope.bind($('fcPrevBtn'), 'onclick', () => moveCard(-1));
    scope.bind($('fcNextBtn'), 'onclick', () => moveCard(1));
    scope.bind($('fcShuffleBtn'), 'onclick', () => {
      const reordered = shuffled(state.fcDeck);
      if (state.prefs.fcFilter === 'SMART' && studySession?.getSnapshot()?.status === 'active') {
        state.fcDeck = flashcards.reorder(reordered.map(word => word.id)) || state.fcDeck;
      } else {
        state.fcDeck = reordered;
      }
      state.fcIndex = 0;
      state.fcFlipped = false;
      if (state.lesson) lessons?.setCurrentWord(state.fcDeck[0]?.id || null, studySession?.getSnapshot()?.id);
      renderFlashcard();
      showToast('Đã xáo trộn hàng đợi học!');
    });
    scope.bind($('btnStartNextSession'), 'onclick', startNewStudySession);
    scope.bind($('btnStartQuizAfterSession'), 'onclick', () => events.emit('quiz:start', {count:10}));
    scope.bind($('btnViewAllCards'), 'onclick', () => { preferences.set('fcFilter', 'ALL', { persist: true }); rebuildFlashcardDeck(); renderFlashcard(); });
    const sessionSizeSelect = $('sessionSizeSelect');
    const allowedSessionSizes = new Set(['10', '20', '30', '0']);
    if (!allowedSessionSizes.has(String(state.prefs.sessionSize))) preferences.set('sessionSize', 10);
    sessionSizeSelect.disabled = false;
    sessionSizeSelect.value = String(state.prefs.sessionSize);
    scope.bind(sessionSizeSelect, 'onchange', () => {
      const selected = String(sessionSizeSelect.value);
      if (!allowedSessionSizes.has(selected)) {
        sessionSizeSelect.value = String(state.prefs.sessionSize);
        showToast('Vui lòng chọn số từ hợp lệ.', 'warning');
        return;
      }
      preferences.set('sessionSize', Number(selected), { persist: true });
      const active = studySession?.getSnapshot()?.status === 'active';
      showToast(active
        ? `Đã lưu ${selected === '0' ? 'không giới hạn' : selected + ' từ'} cho phiên tiếp theo. Phiên hiện tại không thay đổi.`
        : `Đã chọn ${selected === '0' ? 'không giới hạn' : selected + ' từ'} cho phiên học.`, 'success');
    });
    document.querySelectorAll('.fc-filter-btn').forEach(btn => {
      scope.bind(btn, 'onclick', () => {
        if (state.lesson) return;
        preferences.set('fcFilter', btn.dataset.filter, { persist: true });
        rebuildFlashcardDeck();
        renderFlashcard();
      });
    });

    }
    mount();
    return Object.freeze({restore, reset, browseWord, renderFlashcard, renderLessonBrowser, rebuildFlashcardDeck, cancelCardMove, startNewStudySession, handleFlashcardRating, flipFlashcard, moveCard, getSnapshot: () => ({...state, fcDeck:[...state.fcDeck], sessionStats:{...state.sessionStats}}), setViewField(key,value) { if (!['words','prefs','mode'].includes(key) && Object.hasOwn(state,key)) state[key] = value; }, destroy() {scope.destroy(); cancelCardMove(); for (const id of ['lessonList','lessonLevels','fcRelatedList','fcKanji','fcExJa']) $(id)?.replaceChildren();}});
  }
  window.KawaiiFlashcardViewModule = Object.freeze({create});
})();
