/** Topic lessons: deterministic grouping and local-only resumable learning. */
(() => {
  'use strict';
  const KEY = 'kawaii_topic_lessons_v1';
  const parse = (value, fallback) => { try { return JSON.parse(value) || fallback; } catch { return fallback; } };
  const clean = value => String(value || 'Chung').trim() || 'Chung';
  function partition(words) {
    const byTopic = new Map();
    for (const word of words || []) {
      if (!word?.id) continue;
      const key = `${word.level || 'N5'}\u0000${clean(word.topic)}`;
      if (!byTopic.has(key)) byTopic.set(key, new Map());
      byTopic.get(key).set(String(word.id), word);
    }
    const result = [];
    for (const [key, ids] of byTopic) {
      const [level, topic] = key.split('\u0000');
      const ordered = [...ids.values()].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      const count = Math.ceil(ordered.length / 12);
      const base = Math.floor(ordered.length / count);
      const remainder = ordered.length % count;
      let offset = 0;
      for (let i = 0; i < count; i++) {
        const size = base + (i < remainder ? 1 : 0);
        const wordIds = ordered.slice(offset, offset + size).map(w => String(w.id));
        offset += size;
        const id = `${level}:${topic}:${i + 1}`;
        result.push({ id, level, topic, number: i + 1, wordIds, fingerprint: JSON.stringify(wordIds) });
      }
    }
    return result.sort((a, b) => a.level.localeCompare(b.level) || a.topic.localeCompare(b.topic, 'vi') || a.number - b.number);
  }
  function create(storage = window.localStorage) {
    let data = parse(storage.getItem(KEY), { version: 1, completed: {}, active: null });
    if (data.version !== 1) data = { version: 1, completed: {}, active: null };
    function save() { storage.setItem(KEY, JSON.stringify(data)); }
    function start(lesson, isLearned) {
      data.active = { lessonId: lesson.id, fingerprint: lesson.fingerprint, initialWordIds: [...lesson.wordIds], queue: [...lesson.wordIds], firstSeen: {}, introduced: {}, good: 0, again: 0, startedAt: Date.now(), practice: data.completed[lesson.id]?.fingerprint === lesson.fingerprint };
      for (const id of lesson.wordIds) data.active.introduced[id] = !!isLearned(id);
      save(); return snapshot();
    }
    function rate(wordId, rating, isLearned, updateSrs) {
      const session = data.active;
      if (!session || session.queue[0] !== wordId) throw new Error('Từ không khớp với phiên học theo chủ đề.');
      if (!['good', 'again'].includes(rating)) throw new Error('Đánh giá không hợp lệ.');
      // Only the first encounter of an unstudied word may affect SRS.
      // Subsequent repetitions are practice; prevent repeated promotions.
      if (!session.practice && !session.introduced[wordId] && !session.firstSeen[wordId] && !isLearned(wordId)) updateSrs(wordId, rating);
      session.firstSeen[wordId] = true;
      session.queue.shift();
      if (rating === 'again') { session.again++; session.queue.push(wordId); }
      else session.good++;
      if (!session.queue.length) {
        data.completed[session.lessonId] = { fingerprint: session.fingerprint, completedAt: Date.now(), wordIds: [...session.initialWordIds] };
        data.active = null;
      }
      save(); return snapshot();
    }
    function snapshot() { return JSON.parse(JSON.stringify(data)); }
    function clearActive() { data.active = null; save(); }
    return Object.freeze({ partition, start, rate, snapshot, clearActive });
  }
  window.KawaiiTopicLessonsModule = Object.freeze({ partition, create });
})();
