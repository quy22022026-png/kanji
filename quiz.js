/**
 * Kawaii JLPT - Quiz Module
 * 10/15 questions, bidirectional MCQ, one retry round for wrong answers.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'kawaii_jlpt_quiz_data_v1';

  function create(options = {}) {
    const memoryFallback = new Map();
    let storage = options.storage || null;
    if (!storage) {
      try { storage = window.localStorage; } catch (error) {
        console.warn('[Quiz] localStorage không khả dụng:', error);
      }
    }
    storage = storage || {
      getItem: key => memoryFallback.has(key) ? memoryFallback.get(key) : null,
      setItem: (key, value) => memoryFallback.set(key, String(value)),
      removeItem: key => memoryFallback.delete(key)
    };
    const getExternalErrorCount = options.getErrorCount || (() => 0);
    const onWrong = options.onWrong || (() => {});
    const onCorrect = options.onCorrect || (() => {});
    const onComplete = options.onComplete || (() => {});
    let data = loadData();
    let active = null;

    function loadData() {
      try {
        const parsed = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
        return {
          attempts: Array.isArray(parsed.attempts) ? parsed.attempts : [],
          lastTestedAt: parsed.lastTestedAt && typeof parsed.lastTestedAt === 'object' ? parsed.lastTestedAt : {},
          wrongCounts: parsed.wrongCounts && typeof parsed.wrongCounts === 'object' ? parsed.wrongCounts : {}
        };
      } catch (_) {
        return { attempts: [], lastTestedAt: {}, wrongCounts: {} };
      }
    }

    function save() {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function shuffle(items) {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    function wordLabel(word) {
      return word.kanji || word.kana || word.id;
    }

    function meaningLabel(word) {
      return String(word.meaning || '').trim();
    }

    function priority(word) {
      const wrong = (Number(data.wrongCounts[word.id]) || 0) +
        (Number(getExternalErrorCount(word.id)) || 0);
      const last = Number(data.lastTestedAt[word.id]) || 0;
      const ageDays = last ? Math.min(60, (Date.now() - last) / 86400000) : 60;
      return 1 + wrong * 3 + ageDays / 10 + Math.random() * 1.5;
    }

    function weightedSample(words, count) {
      const pool = words.map(word => ({ word, weight: priority(word) }));
      const selected = [];
      while (pool.length && selected.length < count) {
        const total = pool.reduce((sum, item) => sum + item.weight, 0);
        let point = Math.random() * total;
        let index = 0;
        for (; index < pool.length - 1; index++) {
          point -= pool[index].weight;
          if (point <= 0) break;
        }
        selected.push(pool[index].word);
        pool.splice(index, 1);
      }
      return selected;
    }

    function buildQuestion(word, pool, index) {
      const direction = Math.random() < 0.5 ? 'word-to-meaning' : 'meaning-to-word';
      const correct = direction === 'word-to-meaning' ? meaningLabel(word) : wordLabel(word);
      const distractors = shuffle(pool.filter(item => item.id !== word.id)
        .map(item => direction === 'word-to-meaning' ? meaningLabel(item) : wordLabel(item))
        .filter(Boolean)
        .filter((value, i, arr) => arr.indexOf(value) === i && value !== correct))
        .slice(0, 3);
      if (!correct || distractors.length < 3) return null;
      const options = shuffle([correct, ...distractors]);
      return {
        id: `q_${index}_${word.id}`,
        wordId: word.id,
        direction,
        prompt: direction === 'word-to-meaning' ? wordLabel(word) : meaningLabel(word),
        correctAnswer: correct,
        options,
        meaning: meaningLabel(word),
        wordLabel: wordLabel(word),
        example: word.example || null
      };
    }

    function start(words, count = 10, flashcardScore = 0) {
      const eligible = (Array.isArray(words) ? words : [])
        .filter(word => word && word.id && word.meaning && (word.kanji || word.kana));
      const unique = [...new Map(eligible.map(word => [word.id, word])).values()];
      const questionCount = count === 15 ? 15 : 10;
      if (unique.length < 4) throw new Error('Cần ít nhất 4 từ đã học để tạo trắc nghiệm.');
      const selected = weightedSample(unique, Math.min(questionCount, unique.length));
      const questions = selected.map((word, index) => buildQuestion(word, unique, index)).filter(Boolean);
      if (questions.length < 4) throw new Error('Không đủ dữ liệu nghĩa để tạo câu hỏi.');
      active = {
        id: `quiz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        status: 'active',
        questionCount: questions.length,
        questions,
        retryQueue: [],
        retryQuestions: [],
        phase: 'first',
        index: 0,
        score: 0,
        flashcardScore: Math.max(0, Number(flashcardScore) || 0),
        correctActions: 0,
        wrongActions: 0,
        attempts: [],
        startedAt: Date.now(),
        completedAt: null,
        currentFeedback: null
      };
      return snapshot();
    }

    function currentQuestion() {
      if (!active || active.status !== 'active') return null;
      const list = active.phase === 'first' ? active.questions : active.retryQuestions;
      return list[active.index] || null;
    }

    function snapshot() {
      return active ? JSON.parse(JSON.stringify(active)) : null;
    }

    function answer(answer) {
      if (!active || active.status !== 'active') throw new Error('Không có bài trắc nghiệm đang hoạt động.');
      if (active.currentFeedback) throw new Error('Hãy chuyển tiếp sau khi xem phản hồi.');
      const question = currentQuestion();
      if (!question) throw new Error('Không tìm thấy câu hỏi hiện tại.');
      const correct = answer === question.correctAnswer;
      const attemptNo = active.phase === 'first' ? 1 : 2;
      const attempt = {
        id: `${active.id}_${active.attempts.length + 1}`,
        quizId: active.id,
        wordId: question.wordId,
        direction: question.direction,
        phase: active.phase,
        attemptNo,
        selectedAnswer: answer,
        correctAnswer: question.correctAnswer,
        correct,
        createdAt: Date.now()
      };
      active.attempts.push(attempt);
      active.currentFeedback = {
        correct,
        selectedAnswer: answer,
        correctAnswer: question.correctAnswer,
        meaning: question.meaning,
        wordLabel: question.wordLabel
      };

      if (correct) {
        active.score += 1;
        active.correctActions += 1;
        onCorrect({ wordId: question.wordId, quizId: active.id, attemptNo, attempt });
      } else {
        active.wrongActions += 1;
        data.wrongCounts[question.wordId] = (Number(data.wrongCounts[question.wordId]) || 0) + 1;
        if (active.phase === 'first' && !active.retryQueue.includes(question.wordId)) {
          active.retryQueue.push(question.wordId);
          active.retryQuestions.push(question);
        }
        onWrong({ wordId: question.wordId, quizId: active.id, attemptNo, attempt });
      }
      data.lastTestedAt[question.wordId] = Date.now();
      data.attempts.push(attempt);
      save();
      return { attempt, feedback: { ...active.currentFeedback }, snapshot: snapshot() };
    }

    function next() {
      if (!active || active.status !== 'active' || !active.currentFeedback) {
        throw new Error('Chưa có phản hồi để chuyển câu.');
      }
      active.currentFeedback = null;
      const list = active.phase === 'first' ? active.questions : active.retryQuestions;
      active.index += 1;
      if (active.index >= list.length) {
        if (active.phase === 'first' && active.retryQuestions.length) {
          active.phase = 'retry';
          active.index = 0;
        } else {
          active.status = 'completed';
          active.completedAt = Date.now();
          onComplete(snapshot());
        }
      }
      return snapshot();
    }

    function getStats() {
      return {
        score: active ? active.score : 0,
        correctActions: active ? active.correctActions : 0,
        flashcardScore: active ? active.flashcardScore : 0,
        totalScore: active ? active.flashcardScore + active.correctActions : 0,
        wrongActions: active ? active.wrongActions : 0,
        attempts: active ? active.attempts.length : 0
      };
    }

    return Object.freeze({
      start, currentQuestion, answer, next, snapshot, getStats,
      getHistory: () => [...data.attempts],
      getLastTestedAt: wordId => Number(data.lastTestedAt[wordId]) || 0,
      getWrongCount: wordId => Number(data.wrongCounts[wordId]) || 0
    });
  }

  window.KawaiiQuizModule = Object.freeze({ create });
})();
