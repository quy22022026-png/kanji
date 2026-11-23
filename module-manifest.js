/** Dependency declarations are the only composition root. Classic scripts just expose factories. */
(() => {
  'use strict';
  function create() {
    const manifest = [];
    const add = (id,dependencies,create) => manifest.push({id,dependencies,create});
    const factory = (name, extra = () => ({})) => ({dependencies:deps,events,cleanup}) => {
      if (typeof window[name]?.create !== 'function') throw new Error(`Thiếu module script: ${name}`);
      return window[name].create({...deps,events,cleanup,...extra(deps,events)});
    };
    add('database',[], () => window.KawaiiDatabase);
    add('ui',[], () => ({...window.KawaiiUiUtils,$:id => document.getElementById(id)}));
    add('notifications',['ui'],factory('KawaiiNotificationsModule',d => ({getElement:d.ui.$})));
    add('routing',[],({events}) => {
      let mode = 'flashcard';
      return Object.freeze({getMode:() => mode,activate(id) {mode = String(id); events.emit('mode:changed',{mode});}});
    });
    add('preferences',['database'],factory('KawaiiPreferencesModule',(_,events) => ({onChange:() => events.emit('backup:changed')})));
    add('progress',['database'],factory('KawaiiProgressModule',(_,events) => ({onChange:() => events.emit('backup:changed')})));
    add('srs',['progress'],factory('KawaiiSrsModule',(d,events) => ({getStats:d.progress.getWordStats,getWordStat:d.progress.getWordStat,commitWordStatSync:d.progress.commitWordStatSync,setWordStat:d.progress.setWordStat,persist:() => d.progress.save({strict:true,notifyCloud:false}),emit:events.emit})));
    for (const [id,name] of [['studySession','KawaiiStudySessionModule'],['lessons','KawaiiLessonsModule'],['weakWords','KawaiiWeakWordsModule']]) {
      const namespace = {studySession:'study-session',lessons:'lessons',weakWords:'weak-words'}[id];
      add(id,['database'],factory(name,d => ({storage:d.database.createMirroredStorage(namespace)})));
    }
    add('sheets',[],factory('KawaiiSheetsModule',() => ({timeoutMs:25000})));
    add('xlsx',['sheets'],factory('KawaiiXlsxAdapter'));
    add('vocabulary',['database'],factory('KawaiiVocabularyStore'));
    add('quiz',['database','weakWords'],factory('KawaiiQuizModule',(d,events) => ({
      storage:d.database.createMirroredStorage('quiz'),getErrorCount:d.weakWords.getErrorCount,
      onWrong:({wordId,quizId,attemptNo}) => {d.weakWords.recordError(wordId,'quiz',quizId,{attemptNo}); events.emit('backup:changed'); events.emit('quiz:answer-wrong',{wordId,quizId,attemptNo});},
      onCorrect:({wordId,quizId}) => {d.weakWords.recordCorrect(wordId,'quiz',quizId); events.emit('backup:changed'); events.emit('quiz:answer-correct',{wordId,quizId});},
      onComplete:result => events.emit('quiz:completed',result)
    })));
    add('flashcards',['database','studySession','lessons','progress','vocabulary','srs'],factory('KawaiiFlashcardModule',d => ({session:d.studySession,getWord:d.vocabulary.getById})));
    add('audioManager',['ui','notifications'],factory('KawaiiAudioManagerModule',(d,events) => ({getElement:d.ui.$,onToast:d.notifications.showToast,stopPlayback:() => events.emit('audio:stop'),clearPlaybackCache:() => events.emit('audio:clear')})));
    add('pronunciation',['audioManager','preferences','notifications'],({dependencies:d,events,cleanup}) => {
      const api = window.KawaiiPronunciationModule.create({getEngine:d.audioManager.getEngine,getPrefs:d.preferences.getSnapshot,onToast:d.notifications.showToast});
      const hide = () => {api.stop();api.clearCache();};window.addEventListener('pagehide',hide);cleanup(() => window.removeEventListener('pagehide',hide));
      events.on('audio:stop',api.stop);events.on('audio:clear',api.clearCache); return api;
    });
    add('meaning',['vocabulary','pronunciation','ui'],({dependencies:d,events,cleanup}) => {
      const $ = d.ui.$;
      const api = window.KawaiiMeaningModule.create({vocabulary:d.vocabulary,events,builtinDictionary:window.KawaiiAppConfig.BUILTIN_MINI_DICT,onSpeak:d.pronunciation.speak,getElements:() => ({charBox:$('trCharBox'),reading:$('trReading'),hanViet:$('trHanViet'),level:$('trLevel'),meaning:$('trMeaning'),contextLabel:$('trContextLabel'),baseSection:$('trBaseSection'),baseWord:$('trBaseWord'),baseMeaning:$('trBaseMeaning'),note:$('trNote'),sheet:$('translateSheet')})});
      const scope = d.ui.createScope();cleanup(scope.destroy);
      scope.bind($('trCloseBtn'),'onclick',api.hidePopup);scope.bind($('trSpeakBtn'),'onclick',api.speakActive);
      events.on('meaning:hide',api.hidePopup);return api;
    });
    add('matching',['vocabulary','preferences','progress','srs','pronunciation','ui'],factory('KawaiiMatchingModule',d => ({getPool:() => d.vocabulary.getPool(d.preferences.getSnapshot()),isWordDue:d.srs.isWordDue,isWordNew:d.srs.isWordNew,speakWord:d.pronunciation.speakWord,getElement:d.ui.$,escapeHtml:d.ui.escapeHtml,shuffle:d.ui.shuffled})));
    add('kana',['preferences','pronunciation','ui','notifications'],({dependencies:d}) => {
      const api = window.KawaiiKanaModule.create({preferences:d.preferences,pronunciation:d.pronunciation,document,getElement:d.ui.$,stopAudio:d.pronunciation.stop,shuffle:d.ui.shuffled,onShuffle:() => d.notifications.showToast('Đã xáo trộn bảng chữ!','success')});
      api.mount();return api;
    });
    add('source',['database','vocabulary','preferences','progress','sheets','ui','notifications'],factory('KawaiiDataSourceModule'));
    add('backup',['progress','preferences','quiz','weakWords'],factory('KawaiiCloudBackupModule'));
    add('cloudSync',['database','backup'],({dependencies:d,events}) => {
      const api = window.KawaiiCloudSyncModule.create({database:d.database,config:window.KawaiiSupabaseConfig,getBackupSnapshot:d.backup.getSnapshot,applyBackupSnapshot:d.backup.applySnapshot,onStatus:status => events.emit('cloud:status',status)});
      events.on('backup:changed',() => api.scheduleSync());
      events.on('session:completed',async ({session}) => {try {await d.database.saveCompletedSession(session);await api.syncNow();events.emit('session:persisted',{sessionId:session.id});} catch(error) {events.emit('session:persistence-error',{sessionId:session.id,error});}});
      return api;
    });
    add('flashcardView',['vocabulary','preferences','lessons','flashcards','studySession','srs','weakWords','notifications','pronunciation','meaning','routing','ui'],factory('KawaiiFlashcardViewModule'));
    add('quizView',['quiz','weakWords','vocabulary','progress','studySession','preferences','routing','notifications','flashcardView','ui'],factory('KawaiiQuizViewModule'));
    add('dataView',['vocabulary','preferences','progress','lessons','studySession','sheets','xlsx','source','audioManager','pronunciation','cloudSync','backup','matching','notifications','flashcardView','srs','ui'],factory('KawaiiSettingsViewModule'));
    add('shell',['vocabulary','preferences','srs','routing','matching','kana','flashcardView','quizView','dataView','ui'],factory('KawaiiApplicationShellModule'));
    add('keyboard',['flashcardView','kana','routing','ui'],({dependencies:d,cleanup}) => {
      const scope = d.ui.createScope();cleanup(scope.destroy);
      scope.listen(document,'keydown',e => {
        if (document.querySelector('[role="dialog"]:not(.hidden)') || !d.ui.$('confirmModal').classList.contains('hidden') || !d.ui.$('audioModal').classList.contains('hidden') || !d.ui.$('cloudAccountModal').classList.contains('hidden')) return;
        if (['INPUT','TEXTAREA','SELECT','BUTTON'].includes(document.activeElement?.tagName)) return;
        if (d.routing.getMode() === 'kana') {d.kana.handleKey(e);return;}
        if (d.routing.getMode() !== 'flashcard') return;
        const v = d.flashcardView.getSnapshot(); if (!v.fcDeck.length) return;
        if (e.code === 'Space') {e.preventDefault();d.flashcardView.flipFlashcard();}
        else if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {e.preventDefault();const right=e.code === 'ArrowRight'; if (v.prefs.fcFilter === 'SMART') void d.flashcardView.handleFlashcardRating(right?'good':'again'); else d.flashcardView.moveCard(right?1:-1);}
        else if (['1','2','3'].includes(e.key)) void d.flashcardView.handleFlashcardRating({1:'again',2:'hard',3:'good'}[e.key]);
        else if (e.key.toLowerCase() === 'r') d.ui.$('fcSpeakFrontBtn').click();
      });return Object.freeze({});
    });
    add('offline',[],({events}) => Object.freeze({
      async init() {if ('serviceWorker' in navigator && location.protocol !== 'file:') {try {const registration = await navigator.serviceWorker.register('./service-worker.js');events.emit('offline:registered',{scope:registration.scope});} catch(error) {events.emit('offline:error',{error});}}}
    }));
    add('startup',['database','vocabulary','source','progress','preferences','studySession','lessons','quiz','weakWords','kana','audioManager','flashcards','ui'],factory('KawaiiRuntimeStartupModule'));
    add('compatibility',['database','preferences','progress','vocabulary','srs','studySession','lessons','flashcards','matching','kana','quiz','weakWords','sheets','cloudSync','pronunciation','audioManager','meaning','shell','flashcardView','source','startup','routing','notifications'],factory('KawaiiCompatibilityModule'));
    return manifest;
  }
  window.KawaiiModuleManifest = Object.freeze({create});
})();
