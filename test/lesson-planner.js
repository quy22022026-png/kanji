/**
 * Kawaii JLPT - Topic-based lesson planner.
 * Keeps Google Sheets topic order and word order while creating balanced lessons.
 */
(() => {
  'use strict';

  const MIN_WORDS = 8;
  const MAX_WORDS = 12;

  function normalizeTopic(value) {
    const label = String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
    const topic = label || 'Chung';
    return { label: topic, key: topic.toLocaleLowerCase('vi-VN') };
  }

  function getLessonSizes(total) {
    const count = Math.max(0, Math.floor(Number(total) || 0));
    if (!count) return [];

    // Small topic groups stay together. For 13–15 words, one slightly larger
    // lesson is preferable to creating two fragments smaller than 8 words.
    if (count <= MAX_WORDS || count < MIN_WORDS * 2) return [count];

    const lessonCount = Math.ceil(count / MAX_WORDS);
    const base = Math.floor(count / lessonCount);
    if (base < MIN_WORDS) return [count];

    const extra = count % lessonCount;
    return Array.from({ length: lessonCount }, (_, index) => base + (index < extra ? 1 : 0));
  }

  function planLessons(words, level) {
    if (!Array.isArray(words) || !level) return [];

    const groups = new Map();
    const seenIds = new Set();
    for (const word of words) {
      if (!word || word.level !== level || word.id == null || String(word.id).trim() === '') continue;
      const id = String(word.id);
      if (seenIds.has(id)) continue;
      seenIds.add(id);

      const normalized = normalizeTopic(word.topic);
      if (!groups.has(normalized.key)) {
        groups.set(normalized.key, { topic: normalized.label, topicKey: normalized.key, words: [] });
      }
      groups.get(normalized.key).words.push(word);
    }

    const lessons = [];
    for (const group of groups.values()) {
      const sizes = getLessonSizes(group.words.length);
      let cursor = 0;
      sizes.forEach((size, partIndex) => {
        const part = group.words.slice(cursor, cursor + size);
        cursor += size;
        lessons.push({
          key: `${level}:${group.topicKey}:${partIndex + 1}:${part[0]?.id || ''}`,
          level,
          topic: group.topic,
          topicKey: group.topicKey,
          part: partIndex + 1,
          parts: sizes.length,
          words: part
        });
      });
    }
    return lessons;
  }

  window.KawaiiLessonPlanner = Object.freeze({
    MIN_WORDS,
    MAX_WORDS,
    normalizeTopic,
    getLessonSizes,
    planLessons
  });
})();
