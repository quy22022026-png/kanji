/** Feature API; injected dependencies only. Legacy rendering retained. */
(() => {
  'use strict';
  function create(options = {}) {
    const {quiz, weakWords, vocabulary, progress, studySession, preferences, routing, events, notifications, flashcardView} = options;
    const {escapeHtml} = options.ui;
    const showToast = notifications.showToast;
    const state = { get words() { return vocabulary.getAll(); }, get wordMap() { return vocabulary.getWordMap(); }, get prefs() {return preferences.getSnapshot();}, get mode() {return routing.getMode();}, set mode(value) {routing.activate(value);} };
    const getWordStat = progress.getWordStat;
    const renderAll = () => events.emit('ui:render');

    function getQuizEligibleWords() {
      return state.words.filter(word => {
        const progress = getWordStat(word.id);
        const hasBeenStudied = !!(progress && ((progress.reps || 0) > 0 || (progress.lapses || 0) > 0));
        return hasBeenStudied && !!word.meaning && !!(word.kanji || word.kana);
      });
    }

    function startQuiz(count = 10) {
      const eligible = getQuizEligibleWords();
      const completedSession = studySession?.getSnapshot();
      const flashcardScore = completedSession?.status === 'completed'
        ? (completedSession.stats?.firstAttemptCorrect || 0)
        : 0;
      try {
        quiz.start(eligible, count, flashcardScore);
        state.mode = 'quiz';
        renderAll();
      } catch (error) {
        showToast(error.message || 'Không thể tạo bài trắc nghiệm.', 'error');
      }
    }

    function renderQuizModule(sectionEl) {
      if (!quiz) return;
      const snapshot = quiz.snapshot();
      const eligibleCount = getQuizEligibleWords().length;

      if (!snapshot) {
        sectionEl.innerHTML = `
          <div class="bg-white border border-[#F1ECE6] rounded-3xl p-5 sm:p-7 shadow-soft flex flex-col gap-4">
            <div>
              <h2 class="text-lg font-extrabold text-[#332E2E]">📝 Trắc nghiệm từ đã học</h2>
              <p class="text-sm text-[#786D69] mt-1">Câu hỏi lấy từ toàn bộ kho từ bạn đã từng học, không giới hạn cấp độ hay chủ đề hiện tại.</p>
            </div>
            <div class="rounded-2xl bg-[#F8F5FF] p-4">
              <p class="text-sm font-bold text-[#514477]">Hiện có ${eligibleCount} từ đủ điều kiện kiểm tra.</p>
              <p class="text-xs text-[#786D69] mt-1">Mỗi bài có 10 câu; có thể chọn 15 câu khi muốn tăng độ dài. Câu hỏi trộn Nhật → Việt và Việt → Nhật.</p>
            </div>
            <div class="flex items-center gap-3 flex-wrap">
              <label class="text-sm font-bold text-[#4A4240]" for="quizCountSelect">Số câu</label>
              <select id="quizCountSelect" class="rounded-xl border border-[#E8DFD6] bg-white px-3 py-2 text-sm font-bold">
                <option value="10">10 câu</option><option value="15">15 câu</option>
              </select>
              <button id="quizStartBtn" ${eligibleCount < 4 ? 'disabled' : ''} class="rounded-xl bg-[#5B8DEF] px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40">Bắt đầu trắc nghiệm</button>
            </div>
            ${eligibleCount < 4 ? '<p class="text-xs text-[#B45309]">Cần ít nhất 4 từ đã từng học và có nghĩa để tạo câu hỏi.</p>' : ''}
          </div>`;
        sectionEl.querySelector('#quizStartBtn')?.addEventListener('click', () => {
          const count = Number(sectionEl.querySelector('#quizCountSelect')?.value) || 10;
          startQuiz(count);
        });
        return;
      }

      if (snapshot.status === 'completed') {
        const stats = quiz.getStats();
        sectionEl.innerHTML = `
          <div class="bg-white border border-[#F1ECE6] rounded-3xl p-5 sm:p-7 shadow-soft flex flex-col gap-4">
            <div class="text-center">
              <div class="text-4xl mb-2">🎉</div>
              <h2 class="text-xl font-extrabold text-[#332E2E]">Hoàn thành trắc nghiệm</h2>
              <p class="text-sm text-[#786D69] mt-1">Điểm tính theo tổng số thao tác đúng.</p>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div class="rounded-2xl bg-[#F8F5FF] p-3"><p class="text-xs text-[#786D69]">Điểm Flashcard</p><p class="text-2xl font-extrabold">${stats.flashcardScore}</p></div>
              <div class="rounded-2xl bg-[#EFF6FF] p-3"><p class="text-xs text-[#786D69]">Đúng Quiz</p><p class="text-2xl font-extrabold">${stats.correctActions}</p></div>
              <div class="rounded-2xl bg-[#ECFDF5] p-3"><p class="text-xs text-[#786D69]">Tổng điểm</p><p class="text-2xl font-extrabold text-[#047857]">${stats.totalScore}</p></div>
              <div class="rounded-2xl bg-[#FFF1F2] p-3"><p class="text-xs text-[#786D69]">Lượt sai</p><p class="text-2xl font-extrabold text-[#BE123C]">${stats.wrongActions}</p></div>
            </div>
            <p class="text-xs text-[#786D69] text-center">Lượt hỏi lại được tính điểm nếu trả lời đúng. Lượt sai ở cả vòng đầu và vòng hỏi lại đều được ghi nhận.</p>
            <div class="flex justify-center gap-2 flex-wrap">
              <button id="quizAgainBtn" class="rounded-xl bg-[#5B8DEF] px-5 py-2.5 text-sm font-extrabold text-white">Làm bài khác</button>
              <button id="quizNextSessionBtn" class="rounded-xl bg-[#FB6F92] px-5 py-2.5 text-sm font-extrabold text-white">Học phiên Flashcard tiếp theo</button>
            </div>
          </div>`;
        sectionEl.querySelector('#quizAgainBtn')?.addEventListener('click', () => startQuiz(snapshot.questionCount));
        sectionEl.querySelector('#quizNextSessionBtn')?.addEventListener('click', () => {
          state.mode = 'flashcard';
          flashcardView.startNewStudySession();
        });
        return;
      }

      const question = quiz.currentQuestion();
      if (!question) {
        sectionEl.innerHTML = '<div class="bg-white rounded-3xl p-6">Không tìm thấy câu hỏi hiện tại.</div>';
        return;
      }
      const feedback = snapshot.currentFeedback;
      const phaseLabel = snapshot.phase === 'first' ? 'Lượt đầu' : 'Lượt hỏi lại';
      const progressLabel = snapshot.phase === 'first'
        ? `${snapshot.index + 1}/${snapshot.questions.length}`
        : `${snapshot.index + 1}/${snapshot.retryQuestions.length}`;
      const optionsHtml = question.options.map((option, index) => {
        const isCorrect = feedback && option === feedback.correctAnswer;
        const isSelectedWrong = feedback && option === feedback.selectedAnswer && !feedback.correct;
        const cls = isCorrect ? 'border-[#10B981] bg-[#ECFDF5] text-[#047857]'
          : isSelectedWrong ? 'border-[#F43F5E] bg-[#FFF1F2] text-[#BE123C]'
          : 'border-[#E8DFD6] bg-white text-[#4A4240] hover:border-[#A5B4FC]';
        return `<button data-quiz-answer="${escapeHtml(option)}" ${feedback ? 'disabled' : ''} class="w-full text-left border-2 ${cls} rounded-2xl px-4 py-3 text-sm font-bold disabled:cursor-default"><span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/5 mr-2">${'ABCD'[index]}</span>${escapeHtml(option)}</button>`;
      }).join('');
      sectionEl.innerHTML = `
        <div class="bg-white border border-[#F1ECE6] rounded-3xl p-4 sm:p-6 shadow-soft flex flex-col gap-4">
          <div class="flex items-center justify-between gap-2">
            <div><p class="text-xs font-extrabold text-[#5B8DEF]">${phaseLabel}</p><h2 class="text-lg font-extrabold text-[#332E2E]">Câu ${progressLabel}</h2></div>
            <div class="text-right"><p class="text-xs text-[#786D69]">Điểm hiện tại</p><p class="text-xl font-extrabold">${snapshot.score}</p></div>
          </div>
          <div class="h-2 rounded-full bg-[#F3ECE4] overflow-hidden"><div class="h-full bg-[#5B8DEF]" style="width:${Math.min(100, (snapshot.attempts.length / Math.max(1, snapshot.questionCount + snapshot.retryQueue.length)) * 100)}%"></div></div>
          <div class="rounded-2xl bg-[#F8F5FF] p-5 text-center">
            <p class="text-xs font-bold text-[#786D69]">${question.direction === 'word-to-meaning' ? 'Chọn nghĩa tiếng Việt đúng' : 'Chọn từ tiếng Nhật đúng'}</p>
            <p class="mt-2 text-2xl sm:text-3xl font-extrabold ${question.direction === 'word-to-meaning' ? 'font-jp' : ''}">${escapeHtml(question.prompt)}</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${optionsHtml}</div>
          ${feedback ? `
            <div class="rounded-2xl p-4 ${feedback.correct ? 'bg-[#ECFDF5] text-[#047857]' : 'bg-[#FFF1F2] text-[#BE123C]'}">
              <p class="font-extrabold">${feedback.correct ? 'Chính xác!' : 'Chưa chính xác'}</p>
              <p class="text-sm mt-1">Đáp án đúng: <strong>${escapeHtml(feedback.correctAnswer)}</strong></p>
              <p class="text-sm mt-1 text-[#4A4240]">Nghĩa: ${escapeHtml(feedback.meaning)}</p>
            </div>
            <button id="quizNextBtn" class="w-full rounded-xl bg-[#5B8DEF] px-5 py-3 text-sm font-extrabold text-white">Câu tiếp theo</button>
          ` : ''}
        </div>`;
      sectionEl.querySelectorAll('[data-quiz-answer]').forEach(button => {
        button.addEventListener('click', () => {
          try { quiz.answer(button.dataset.quizAnswer); renderQuizModule(sectionEl); }
          catch (error) { showToast(error.message, 'error'); }
        });
      });
      sectionEl.querySelector('#quizNextBtn')?.addEventListener('click', () => {
        try { quiz.next(); renderQuizModule(sectionEl); }
        catch (error) { showToast(error.message, 'error'); }
      });
    }

    function renderWeakWordsModule(sectionEl) {
      if (!weakWords) return;
      const wordMap = state.wordMap;
      const records = weakWords.getAll().filter(record => wordMap.has(record.wordId));
      const weakRecords = records.filter(record => record.status === 'weak');
      const errors = records.reduce((sum,record) => sum + (Number(record.errorCount) || 0),0);
      const cards = weakRecords.map(record => {
        const word = wordMap.get(record.wordId);
        return `<article class="rounded-2xl border border-[#F1D6D9] bg-white p-4 flex flex-col gap-2">
          <div class="flex items-start justify-between gap-2">
            <div><p class="text-xl font-extrabold font-jp">${escapeHtml(word.kanji || word.kana)}</p><p class="text-xs text-[#786D69]">${escapeHtml(word.kana || '')} · ${escapeHtml(word.romaji || '')}</p></div>
            <span class="rounded-full bg-[#FFF1F2] px-3 py-1 text-xs font-extrabold text-[#BE123C]">${record.errorCount} lỗi</span>
          </div>
          <p class="text-sm text-[#4A4240]">${escapeHtml(word.meaning || '')}</p>
          <p class="text-[11px] text-[#8C7F7A]">Đúng Flashcard: ${record.flashcardCorrectSessions.length}/2 phiên · Đúng Quiz: ${record.quizCorrectSessions.length}/2 phiên</p>
          <button data-dismiss-weak="${escapeHtml(record.wordId)}" class="self-start rounded-xl bg-[#F6EFE8] px-3 py-2 text-xs font-extrabold text-[#5E524E]">Bỏ khỏi Sổ từ yếu</button>
        </article>`;
      }).join('');
      sectionEl.innerHTML = `
        <div class="bg-white border border-[#F1ECE6] rounded-3xl p-4 sm:p-6 shadow-soft flex flex-col gap-4">
          <div><h2 class="text-lg font-extrabold text-[#332E2E]">📕 Sổ từ yếu</h2><p class="text-sm text-[#786D69] mt-1">Tự động thêm từ khi có ít nhất 2 lỗi cộng dồn từ Flashcard và Quiz.</p></div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-2xl bg-[#FFF1F2] p-3"><p class="text-xs text-[#786D69]">Từ yếu</p><p class="text-xl font-extrabold">${weakRecords.length}</p></div>
            <div class="rounded-2xl bg-[#F8F5FF] p-3"><p class="text-xs text-[#786D69]">Từ đã theo dõi</p><p class="text-xl font-extrabold">${records.length}</p></div>
            <div class="rounded-2xl bg-[#FFF7ED] p-3"><p class="text-xs text-[#786D69]">Tổng lỗi</p><p class="text-xl font-extrabold">${errors}</p></div>
          </div>
          ${cards ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${cards}</div>` : '<div class="rounded-2xl bg-[#ECFDF5] p-5 text-center text-sm font-bold text-[#047857]">Chưa có từ yếu trong bộ từ vựng hiện tại.</div>'}
        </div>`;
      sectionEl.querySelectorAll('[data-dismiss-weak]').forEach(button => {
        button.addEventListener('click', () => {
          weakWords.dismiss(button.dataset.dismissWeak);
          renderWeakWordsModule(sectionEl);
          showToast('Đã bỏ trạng thái từ yếu; lịch sử lỗi vẫn được giữ.', 'success');
        });
      });
    }


    return Object.freeze({getQuizEligibleWords, startQuiz, renderQuizModule, renderWeakWordsModule});
  }
  window.KawaiiQuizViewModule = Object.freeze({create});
})();
