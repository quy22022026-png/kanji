/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const {vocabulary, preferences, srs, routing, matching, kana, events, flashcardView, quizView, dataView} = options;
    const {$, escapeHtml} = options.ui;
    const {LEVELS} = window.KawaiiAppConfig;
    const scope = window.KawaiiUiUtils.createScope();
    options.cleanup?.(scope.destroy);
    const {isWordLearned, isWordDue} = srs;
    const state = { get words() {return vocabulary.getAll();}, get prefs() {return preferences.getSnapshot();}, get datasetTitle() {return vocabulary.getMeta().title;}, get mode() {return routing.getMode();}, set mode(value) {routing.activate(value);} };
    const registeredModules = new Map();
    const hideTranslateSheet = () => events.emit('meaning:hide');
    const rebuildFlashcardDeck = flashcardView.rebuildFlashcardDeck;

    function rebuildTopicOptions() {
      const topics = [...new Set(state.words.filter(w => w.level === state.prefs.level).map(w => w.topic))].sort();
      const sel = $('topicSelect');
      sel.innerHTML = '<option value="ALL">Tất cả chủ đề</option>';
      topics.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        sel.appendChild(opt);
      });
      sel.value = topics.includes(state.prefs.topic) ? state.prefs.topic : 'ALL';
      preferences.set('topic', sel.value);
    }

    function selectStudyLevel(level) {
      preferences.update({level,topic:'ALL'},{persist:true});
      hideTranslateSheet();
      rebuildTopicOptions();
      matching.initRound();
      if (state.mode === 'flashcard') flashcardView.openLessonBrowser(level);
      else {
        rebuildFlashcardDeck();
        renderAll();
      }
    }

    function renderHeader() {
      $('headerDatasetLabel').textContent = state.words.length
        ? `${state.datasetTitle} (${state.words.length} từ)`
        : 'Chưa có dữ liệu từ vựng';

      document.querySelectorAll('.mode-tab').forEach(btn => {
        const active = btn.dataset.mode === state.mode;
        btn.className = active
          ? 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-1 bg-white text-[#FB6F92] shadow-sm'
          : 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1 text-[#786D69] hover:text-[#332E2E]';
      });

      const showStatus = (state.mode === 'flashcard' || state.mode === 'matching') && state.words.length > 0;
      $('studyStatusBar').classList.toggle('hidden', !showStatus);

      const now = Date.now();
      const pillsEl = $('levelPills');
      pillsEl.innerHTML = '';
      LEVELS.forEach(lvl => {
        const lvlWords = state.words.filter(w => w.level === lvl);
        const learnedCount = lvlWords.filter(w => isWordLearned(w.id)).length;
        const pct = lvlWords.length ? Math.round((learnedCount / lvlWords.length) * 100) : 0;
        const active = state.prefs.level === lvl;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = active
          ? 'px-3 py-1 rounded-xl text-xs font-extrabold bg-[#FF8FA3] text-white shadow-sm flex items-center gap-1.5 shrink-0 transition'
          : 'px-3 py-1 rounded-xl text-xs font-bold bg-white border border-[#E8DFD6] text-[#5E524E] hover:border-[#FF8FA3] flex items-center gap-1.5 shrink-0 transition';
        btn.innerHTML = `<span>${lvl}</span><span class="text-[10px] opacity-85">${lvlWords.length ? pct + '%' : '—'}</span>`;
        btn.onclick = () => selectStudyLevel(lvl);
        pillsEl.appendChild(btn);
      });

      const curWords = state.words.filter(w => w.level === state.prefs.level);
      const curLearned = curWords.filter(w => isWordLearned(w.id)).length;
      const curDue = curWords.filter(w => isWordDue(w.id, now)).length;
      const curPct = curWords.length ? Math.round((curLearned / curWords.length) * 100) : 0;
      $('levelProgressFill').style.width = `${curPct}%`;
      $('levelProgressText').textContent = curDue > 0
        ? `${state.prefs.level}: ${curLearned}/${curWords.length} · 🔔 ${curDue} cần ôn`
        : `${state.prefs.level}: ${curLearned}/${curWords.length} đã học`;

      const furiOn = state.prefs.showFuri;
      $('furiToggleBtn').className = furiOn
        ? 'px-2.5 py-1.5 rounded-xl text-xs font-extrabold border border-[#FF8FA3] bg-peach-50 text-[#FB6F92] transition-all flex items-center gap-1.5 shrink-0'
        : 'px-2.5 py-1.5 rounded-xl text-xs font-bold border border-[#E8DFD6] bg-white text-[#8C7F7A] transition-all flex items-center gap-1.5 shrink-0';
      $('furiDot').className = furiOn ? 'w-2 h-2 rounded-full bg-[#FB6F92]' : 'w-2 h-2 rounded-full bg-[#D1C7BF]';
    }

    function renderAll() {
      renderHeader();
      $('flashcardView').classList.toggle('hidden', state.mode !== 'flashcard' || !flashcardView.getSnapshot().lessonStudying);
      flashcardView.renderLessonBrowser();
      $('matchingView').classList.toggle('hidden', state.mode !== 'matching');
      $('kanaView').classList.toggle('hidden', state.mode !== 'kana');
      $('dataView').classList.toggle('hidden', state.mode !== 'data');

      registeredModules.forEach((mod, id) => {
        mod.sectionEl.classList.toggle('hidden', state.mode !== id);
        if (state.mode === id && typeof mod.render === 'function') {
          mod.render(mod.sectionEl, window.KawaiiApp);
        }
      });

      if (state.mode === 'flashcard') flashcardView.renderFlashcard();
      if (state.mode === 'matching') matching.render();
      if (state.mode === 'kana') kana.render();
      if (state.mode === 'data') dataView.renderDataStats();
    }

    function registerModule({ id, label, icon = '✨', mount, render }) {
      if (!id || registeredModules.has(id)) return;
      if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(id) || ['flashcard','matching','kana','data'].includes(id)) throw new TypeError('Plugin ID không hợp lệ hoặc bị trùng chế độ.');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.mode = id;
      btn.setAttribute('aria-label', label);
      btn.className = 'mode-tab px-2.5 sm:px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1';
      btn.innerHTML = `<span>${escapeHtml(icon)}</span><span class="hidden md:inline">${escapeHtml(label)}</span>`;
      btn.onclick = () => {
        flashcardView.cancelCardMove(); events.emit('audio:stop'); hideTranslateSheet();
        state.mode = id;
      };
      $('modeNav').appendChild(btn);

      const sectionEl = document.createElement('section');
      sectionEl.id = `pluginView_${id}`;
      sectionEl.className = 'hidden flex-1 flex flex-col gap-4 animate-pop';
      $('appWorkspace').appendChild(sectionEl);

      scope.add(() => { btn.remove(); sectionEl.remove(); });
      registeredModules.set(id, { id, label, icon, sectionEl, render });
      if (typeof mount === 'function') mount(sectionEl, window.KawaiiApp);
      renderHeader();
    }


    // Safari can emit gesture events even when the viewport disables user zoom.
    const cancelZoom = event => {
      if (event.cancelable) event.preventDefault();
    };
    const cancelPinch = event => {
      if (event.touches?.length > 1) cancelZoom(event);
    };
    const zoomHandlers = [
      ['gesturestart',cancelZoom],
      ['gesturechange',cancelZoom],
      ['touchmove',cancelPinch]
    ];
    for (const [type,handler] of zoomHandlers) {
      document.addEventListener(type,handler,{passive:false});
      scope.add(() => document.removeEventListener(type,handler));
    }

    registerModule({id:'quiz',label:'Trắc nghiệm',icon:'📝',render: quizView.renderQuizModule});
    registerModule({id:'weak-words',label:'Sổ từ yếu',icon:'📕',render: quizView.renderWeakWordsModule});
    document.querySelectorAll('.mode-tab').forEach(btn => scope.bind(btn, 'onclick', () => {flashcardView.cancelCardMove(); events.emit('audio:stop'); hideTranslateSheet(); routing.activate(btn.dataset.mode);}));
    scope.bind($('topicSelect'),'onchange', e => {
      preferences.set('topic',e.target.value,{persist:true});
      matching.initRound();
      if (state.mode === 'flashcard' && flashcardView.getSnapshot().lesson) flashcardView.openLessonBrowser();
      else {
        rebuildFlashcardDeck();
        renderAll();
      }
    });
    scope.bind($('furiToggleBtn'),'onclick', () => {preferences.set('showFuri',!state.prefs.showFuri,{persist:true}); renderAll();});
    for (const id of ['matchNewRoundBtn','matchNextRoundCta']) scope.bind($(id),'onclick',matching.newRound);
    scope.bind($('matchSwapBtn'),'onclick',matching.toggleDirection);
    events.on('ui:render',renderAll);
    events.on('mode:changed',renderAll);
    events.on('ui:header',renderHeader);
    events.on('ui:topics',rebuildTopicOptions);
    events.on('study:level-selected',selectStudyLevel);
    events.on('dataset:loaded', () => {flashcardView.restore(); rebuildTopicOptions(); matching.initRound(); renderAll();});
    events.on('cloud:backup-restored', () => {rebuildFlashcardDeck(); renderAll();});
    events.on('quiz:start', ({count}) => quizView.startQuiz(count));

    return Object.freeze({renderAll, renderHeader, registerModule, getModules: () => [...registeredModules.values()].map(({id,label,icon}) => ({id,label,icon})), activate(id) { if (!registeredModules.has(id)) return false; routing.activate(id); return true; }, destroy() {scope.destroy();registeredModules.clear();$('levelPills').replaceChildren();}});
  }
  window.KawaiiApplicationShellModule = Object.freeze({create});
})();
