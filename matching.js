/**
 * Kawaii JLPT - Matching Module (public API v1)
 * Owns pair-matching round state, selection rules, feedback timing and rendering.
 * Dependencies are injected by app.js; the module does not mutate Progress or
 * Preferences internals directly.
 */
(() => {
  'use strict';

  function defaultShuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function create(options = {}) {
    const state = {}; // Round state belongs exclusively to Matching.

    const getPool = typeof options.getPool === 'function' ? options.getPool : () => [];
    const isWordDue = typeof options.isWordDue === 'function' ? options.isWordDue : () => false;
    const isWordNew = typeof options.isWordNew === 'function' ? options.isWordNew : () => false;
    const shuffle = typeof options.shuffle === 'function' ? options.shuffle : defaultShuffle;
    const preferences = options.preferences || null;
    const progress = options.progress || null;
    const speakWord = typeof options.speakWord === 'function' ? options.speakWord : () => {};
    const escapeHtml = typeof options.escapeHtml === 'function'
      ? options.escapeHtml
      : value => String(value ?? '').replace(/[&<>"']/g, char => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    const getElement = typeof options.getElement === 'function'
      ? options.getElement
      : id => (typeof document !== 'undefined' ? document.getElementById(id) : null);
    const createElement = typeof options.createElement === 'function'
      ? options.createElement
      : tag => (typeof document !== 'undefined' ? document.createElement(tag) : null);
    const schedule = typeof options.setTimeout === 'function'
      ? options.setTimeout
      : (callback, delay) => setTimeout(callback, delay);
    const cancel = typeof options.clearTimeout === 'function'
      ? options.clearTimeout
      : timerId => clearTimeout(timerId);
    const now = typeof options.now === 'function' ? options.now : () => Date.now();

    // Keep the historical state fields and Set identity contract intact.
    if (!Array.isArray(state.matchRoundPairs)) state.matchRoundPairs = [];
    if (!Array.isArray(state.matchLeftItems)) state.matchLeftItems = [];
    if (!Array.isArray(state.matchRightItems)) state.matchRightItems = [];
    if (!(state.matchMatchedIds instanceof Set)) state.matchMatchedIds = new Set();
    if (!Object.prototype.hasOwnProperty.call(state, 'matchSelected')) state.matchSelected = null;
    if (!Object.prototype.hasOwnProperty.call(state, 'matchLocked')) state.matchLocked = false;
    if (!Object.prototype.hasOwnProperty.call(state, 'matchErrors')) state.matchErrors = null;

    let errorTimer = null;

    function clearErrorTimer() {
      if (errorTimer !== null) {
        cancel(errorTimer);
        errorTimer = null;
      }
    }

    function getPrefs() {
      return preferences?.getSnapshot() || options.state?.prefs || {};
    }

    function getProgress() {
      return progress?.getMatchingStats?.() || progress?.getState?.() || {};
    }

    const japaneseLabel = word => word.kanji || word.kana || '';
    const vietnameseLabel = word => {
      const meaning = String(word.meaning || '');
      return meaning.split('(')[0].trim() || meaning;
    };
    const labelKey = label => label.normalize('NFKC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('vi');

    function initRound() {
      clearErrorTimer();
      state.matchMatchedIds = new Set();
      state.matchSelected = null;
      state.matchErrors = null;
      state.matchLocked = false;

      const candidatePool = getPool();
      const pool = Array.isArray(candidatePool) ? candidatePool : [];
      if (!pool.length) {
        state.matchRoundPairs = [];
        state.matchLeftItems = [];
        state.matchRightItems = [];
        return getSnapshot();
      }

      const timestamp = now();
      const priority = [];
      const rest = [];
      pool.forEach(word => {
        if (!word || word.id == null) return;
        const due = !!isWordDue(word.id, timestamp);
        const fresh = !due && !!isWordNew(word.id);
        (due || fresh ? priority : rest).push(word);
      });
      const chosen = [];
      const japanese = new Set(), vietnamese = new Set();
      for (const word of [...shuffle(priority),...shuffle(rest)]) {
        const left = labelKey(japaneseLabel(word));
        const right = labelKey(vietnameseLabel(word));
        if (!left || !right || japanese.has(left) || vietnamese.has(right)) continue;
        chosen.push(word);
        japanese.add(left);
        vietnamese.add(right);
        if (chosen.length === 5) break;
      }
      state.matchRoundPairs = chosen;
      state.matchLeftItems = shuffle(chosen);
      state.matchRightItems = shuffle(chosen);
      return getSnapshot();
    }

    function render() {
      const pairCounter = getElement('matchPairCounter');
      const progressFill = getElement('matchProgressFill');
      const streakBadge = getElement('matchStreakBadge');
      const directionLabel = getElement('matchDirectionLabel');
      const empty = getElement('matchEmpty');
      const roundComplete = getElement('matchRoundComplete');
      const completeStreak = getElement('matchCompleteStreak');
      const leftColumn = getElement('matchLeftCol');
      const rightColumn = getElement('matchRightCol');
      if (![pairCounter, progressFill, streakBadge, directionLabel, empty,
        roundComplete, completeStreak, leftColumn, rightColumn].every(Boolean)) return false;

      const totalPairs = state.matchRoundPairs.length;
      const matchedCount = state.matchMatchedIds.size;
      const currentProgress = getProgress();
      const prefs = getPrefs();

      pairCounter.textContent = `${matchedCount}/${totalPairs} cặp`;
      progressFill.style.width = totalPairs ? `${(matchedCount / totalPairs) * 100}%` : '0%';
      streakBadge.textContent = `⚡ ${currentProgress.streak || 0}`;
      directionLabel.textContent = prefs.matchSwap ? 'Việt ⇄ Nhật' : 'Nhật ⇄ Việt';
      empty.classList.toggle('hidden', totalPairs > 0);
      roundComplete.classList.toggle('hidden', !(totalPairs > 0 && matchedCount === totalPairs));
      completeStreak.textContent = currentProgress.streak || 0;

      leftColumn.innerHTML = '';
      rightColumn.innerHTML = '';
      if (!totalPairs) return true;

      const buildCard = (word, side) => {
        const isJapanese = (side === 'left' && !prefs.matchSwap) || (side === 'right' && !!prefs.matchSwap);
        const isMatched = state.matchMatchedIds.has(word.id);
        const isSelected = !!state.matchSelected && state.matchSelected.side === side && state.matchSelected.id === word.id;
        const isError = Array.isArray(state.matchErrors) && state.matchErrors.some(item => item.id === word.id && item.side === side);
        const button = createElement('button');
        if (!button) return null;
        button.type = 'button';

        let className = 'w-full min-h-[70px] sm:min-h-[78px] p-3 sm:p-4 rounded-2xl border-2 text-center transition-all flex flex-col items-center justify-center shadow-sm ';
        if (isError) className += 'bg-[#FFF1F2] border-[#FB7185] animate-shake';
        else if (isMatched) {
          className += 'bg-matcha-50 border-matcha-400 text-matcha-600 opacity-45 cursor-default';
          button.disabled = true;
        } else if (isSelected) className += 'bg-skysoft-50 border-skysoft-500 text-[#1D4ED8] scale-[1.02]';
        else className += 'bg-white border-[#F1ECE6] hover:border-[#FF8FA3] text-[#332E2E] active:scale-[0.98]';
        button.className = className;

        if (isJapanese) {
          const display = japaneseLabel(word);
          const showFurigana = !!(prefs.showFuri && word.kanji && word.kana && word.kanji !== word.kana);
          button.innerHTML = `<span class="font-jp text-lg sm:text-xl font-extrabold leading-tight">${escapeHtml(display)}</span>${showFurigana ? `<span class="font-jp text-[11px] font-bold text-[#FB6F92] mt-0.5">${escapeHtml(word.kana)}</span>` : ''}`;
        } else {
          const shortMeaning = vietnameseLabel(word);
          button.innerHTML = `<span class="text-xs sm:text-sm font-extrabold leading-snug line-clamp-2">${escapeHtml(shortMeaning)}</span>`;
        }
        button.onclick = () => handleClick(word, side, isJapanese);
        return button;
      };

      state.matchLeftItems.forEach(word => {
        const button = buildCard(word, 'left');
        if (button) leftColumn.appendChild(button);
      });
      state.matchRightItems.forEach(word => {
        const button = buildCard(word, 'right');
        if (button) rightColumn.appendChild(button);
      });
      return true;
    }

    function handleClick(word, side, isJapanese) {
      if (!word || word.id == null || !['left', 'right'].includes(side)) return false;
      if (state.matchLocked || state.matchMatchedIds.has(word.id)) return false;
      if (isJapanese) speakWord(word);

      if (state.matchSelected && state.matchSelected.side === side && state.matchSelected.id === word.id) {
        state.matchSelected = null;
        render();
        return true;
      }
      if (!state.matchSelected || state.matchSelected.side === side) {
        state.matchSelected = { side, id: word.id };
        render();
        return true;
      }

      const first = state.matchSelected;
      if (first.id === word.id) {
        state.matchMatchedIds.add(word.id);
        progress?.recordMatchCorrect?.();
        state.matchSelected = null;
        render();
        return true;
      }

      state.matchLocked = true;
      progress?.recordMatchIncorrect?.();
      state.matchErrors = [first, { side, id: word.id }];
      render();
      clearErrorTimer();
      errorTimer = schedule(() => {
        errorTimer = null;
        state.matchSelected = null;
        state.matchErrors = null;
        state.matchLocked = false;
        render();
      }, 420);
      return true;
    }

    function toggleDirection() {
      clearErrorTimer();
      state.matchLocked = false;
      state.matchErrors = null;
      state.matchSelected = null;
      const nextValue = !getPrefs().matchSwap;
      if (typeof preferences?.set === 'function') {
        preferences.set('matchSwap', nextValue, { persist: true });
      } else {
        getPrefs().matchSwap = nextValue;
      }
      render();
      return nextValue;
    }

    function newRound() {
      const snapshot = initRound();
      render();
      return snapshot;
    }

    function getSnapshot() {
      return {
        roundIds: state.matchRoundPairs.map(word => word.id),
        leftIds: state.matchLeftItems.map(word => word.id),
        rightIds: state.matchRightItems.map(word => word.id),
        matchedIds: Array.from(state.matchMatchedIds),
        selected: state.matchSelected ? { ...state.matchSelected } : null,
        locked: !!state.matchLocked,
        errors: Array.isArray(state.matchErrors) ? state.matchErrors.map(item => ({ ...item })) : null
      };
    }

    function destroy() {
      clearErrorTimer();
      getElement('matchLeftCol')?.replaceChildren();getElement('matchRightCol')?.replaceChildren();
    }

    return Object.freeze({
      version: '1.0.0',
      apiVersion: 1,
      initRound,
      newRound,
      render,
      handleClick,
      toggleDirection,
      getSnapshot,
      destroy
    });
  }

  window.KawaiiMatchingModule = Object.freeze({ create });
})();
