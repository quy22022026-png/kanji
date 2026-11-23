/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const {database, preferences, progress, vocabulary, srs: srsEngine, studySession, lessons, flashcards, matching, kana, quiz, weakWords, sheets, cloudSync, pronunciation, audioManager, meaning, shell, flashcardView, source, startup, routing, events, notifications} = options;
    const {showToast} = notifications;
    const {getWordStat, getWordSrsInfo, isWordNew, isWordDue, isWordLearned, calculateNext:calculateSrsNext} = srsEngine;
    const rateWordSrs = (wordId,rating) => {if (flashcards.isBusy()) throw new Error('Đang lưu phiên học.');return srsEngine.rateWordSync(wordId,rating);};
    const getBasePool = () => vocabulary.getPool(preferences.getSnapshot());
    const applyDataset = source.applyDataset, renderAll = shell.renderAll, registerModule = shell.registerModule;
    const speakJapaneseText = pronunciation.speak, speakWord = pronunciation.speakWord, stopAudio = pronunciation.stop, clearWavCache = pronunciation.clearCache;
    const initZenTtsFromCacheOrNetwork = audioManager.initFromCacheOrNetwork;
    const lookupToken = meaning.lookup, tokenizeJapaneseSentence = meaning.tokenize, showTranslateSheet = meaning.showPopup, hideTranslateSheet = meaning.hidePopup;
    const state = {};
    for (const [key,get] of Object.entries({mode:routing.getMode, datasetTitle:() => vocabulary.getMeta().title,datasetMeta:vocabulary.getMeta,words:vocabulary.getAll,wordMap:vocabulary.getWordMap,dictIndex:() => meaning.getIndex(),progress:progress.getSnapshot,prefs:preferences.getSnapshot,kanaDeck:() => kana.getSnapshot().deck,kanaIndex:() => kana.getSnapshot().index,kanaFlipped:() => kana.getSnapshot().flipped})) Object.defineProperty(state,key,{enumerable:true,get,set:value => writePath(key,value)});
    for (const key of ['lesson','lessonBrowserOpen','lessonStudying','lessonLevel','fcDeck','fcIndex','fcFlipped','sessionStats']) Object.defineProperty(state,key,{enumerable:true,get:() => flashcardView.getSnapshot()[key],set:value => flashcardView.setViewField(key,value)});
    function writePath(path,value) {
      const [key,...rest] = path.split('.');
      if (['__proto__','constructor','prototype'].some(part => path.split('.').includes(part))) throw new TypeError('Invalid state path.');
      if (key === 'mode') return routing.activate(value);
      if (key === 'prefs') return rest.length ? preferences.set(rest.join('.'),value,{persist:true}) : preferences.applySnapshot(value);
      if (key === 'progress') {
        const snapshot = progress.getSnapshot();
        if (!rest.length) return progress.applySnapshot(value);
        let target = snapshot; for (const part of rest.slice(0,-1)) target = target[part] ||= {}; target[rest.at(-1)] = value;
        return progress.applySnapshot(snapshot);
      }
      if (Object.hasOwn(flashcardView.getSnapshot(),key) && !rest.length) return flashcardView.setViewField(key,value);
      throw new TypeError('State field is read-only; use its owner API: '+path);
    }


    const Core = (() => {
      const stateSubscribers = new Set();
      options.cleanup?.(() => stateSubscribers.clear());
      let bootPromise = null;

      function readPath(root, path) {
        if (!path) return root;
        return String(path).split('.').reduce((value, key) => (
          value == null ? undefined : value[key]
        ), root);
      }

      function emitStateChange(path, value) {
        const payload = { path, value, state };
        stateSubscribers.forEach((fn) => {
          try { fn(payload); } catch (error) {
            console.error('[Kawaii Core State]', error);
          }
        });
        events.emit('state:changed', payload);
      }

      const State = Object.freeze({
        get(path) {
          return readPath(state, path);
        },
        set(path, value) {
          if (typeof path !== 'string' || !path.trim()) {
            throw new TypeError('State.set cần path hợp lệ.');
          }
          const keys = path.split('.');
          if (keys[0] === 'prefs') {
            if (keys.length === 1) preferences.applySnapshot(value, { notifyCloud: true });
            else preferences.set(keys.slice(1).join('.'), value, { persist: true });
            emitStateChange(path, keys.length === 1 ? preferences.getSnapshot() : value);
            return value;
          }
          writePath(path,value);
          emitStateChange(path, value);
          return value;
        },
        patch(data) {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new TypeError('State.patch cần object.');
          }
          Object.entries(data).forEach(([key, value]) => {
            if (key === 'prefs') preferences.applySnapshot(value, { notifyCloud: true });
            else writePath(key,value);
            emitStateChange(key, key === 'prefs' ? preferences.getSnapshot() : value);
          });
          return state;
        },
        resetSession() {
          state.fcDeck = [];
          state.fcIndex = 0;
          state.fcFlipped = false;
          state.sessionStats = { reviewed: 0, good: 0, again: 0 };
          emitStateChange('learning.session', null);
        },
        subscribe(fn) {
          if (typeof fn !== 'function') throw new TypeError('Subscriber phải là function.');
          stateSubscribers.add(fn);
          return () => stateSubscribers.delete(fn);
        }
      });

      const Modules = Object.freeze({
        register(config) {
          if (!config || typeof config !== 'object' || !config.id) {
            throw new TypeError('Module cần id hợp lệ.');
          }
          if (shell.getModules().some(module => module.id === config.id)) {
            throw new Error('Module đã đăng ký: ' + config.id);
          }
          registerModule(config);
          return shell.getModules().some(module => module.id === config.id);
        },
        get(id) {return shell.getModules().find(module => module.id === id) || null;},
        getAll: shell.getModules,
        activate: shell.activate
      });

      const SRS = Object.freeze({
        getWordStat,
        getWordSrsInfo,
        isWordNew,
        isWordDue,
        isWordLearned,
        rateWordAsync: srsEngine.rateWord,
        rateWord: rateWordSrs,
        rateWordSrs,
        calculateNext: calculateSrsNext,
        rebuild(wordId) {
          // Giai đoạn 2 chưa có Event Log đầy đủ; không giả lập lịch sử.
          // Trả trạng thái hiện tại và chờ Event Repository ở giai đoạn sau.
          return getWordStat(wordId);
        },
        getAlgorithmInfo() {
          return {
            version: 1,
            intervalsDays: srsEngine.getAlgorithmInfo().intervalsDays,
            againMinutes: 5,
            hardDays: 1
          };
        }
      });

      const Data = Object.freeze({
        words: Object.freeze({
          getAll: () => getBasePool(),
          getById: (wordId) => state.wordMap.get(wordId) || null,
          getBasePool: () => getBasePool(),
          applyDataset: (dataset, ...args) => applyDataset(dataset, ...args)
        }),
        progress: Object.freeze({
          get: progress.getWordStat,
          getAll: progress.getAllWordStats,
          getSnapshot: progress.getSnapshot,
          save: progress.save,
          reset: progress.reset,
          import: progress.importSnapshot,
          export: progress.exportSnapshot
        })
      });

      const UI = Object.freeze({
        renderAll,
        showToast
      });

      const Bootstrap = Object.freeze({
        start() {
          if (!bootPromise) bootPromise = startup.start();
          return bootPromise;
        },
        get started() {
          return !!bootPromise;
        }
      });

      return Object.freeze({
        version: '3.7.2-core',
        State,
        Events: events,
        Modules,
        SRS,
        Progress: progress,
        Preferences: preferences,
        Data,
        UI,
        StudySession: studySession,
        Flashcards: flashcards,
        Lessons: lessons,
        Matching: matching,
        Kana: kana,
        Quiz: quiz,
        WeakWords: weakWords,
        Sheets: sheets,
        CloudSync: cloudSync,
        Database: database,
        Bootstrap
      });
    })();

    window.KawaiiApp = {
      version: '3.7.2',
      Core,
      studySession,
      flashcards,
      lessons,
      matching,
      kana,
      quiz,
      weakWords,
      sheets,
      pronunciation,
      meaning,
      cloud: cloudSync,
      database: database,
      progress,
      preferences,
      state,
      events,
      registerModule,
      getBasePool,
      applyDataset,
      renderAll,
      showToast,
      srs: {
        getWordStat, getWordSrsInfo, rateWordSrs,
        isWordDue, isWordNew, isWordLearned,
        calculateNext: calculateSrsNext,
        getAlgorithmInfo: Core.SRS.getAlgorithmInfo
      },
      tts: {
        speak: speakJapaneseText, speakWord, speakKana: kana.speak,
        stop: stopAudio, clearCache: clearWavCache,
        initMarine: initZenTtsFromCacheOrNetwork,
        audioManager,
        module: pronunciation
      },
      dict: {
        lookup: lookupToken, tokenize: tokenizeJapaneseSentence,
        showPopup: showTranslateSheet, hidePopup: hideTranslateSheet,
        module: meaning
      }
    };



    Object.assign(window, {KawaiiStudySession:studySession,KawaiiFlashcards:flashcards,KawaiiLessons:lessons,KawaiiWeakWords:weakWords,KawaiiQuiz:quiz});
    return Object.freeze({app: window.KawaiiApp, destroy() {for (const key of ['KawaiiApp','KawaiiStudySession','KawaiiFlashcards','KawaiiLessons','KawaiiWeakWords','KawaiiQuiz']) delete window[key];}});
  }
  window.KawaiiCompatibilityModule = Object.freeze({create});
})();
