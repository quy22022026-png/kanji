/**
 * Kawaii JLPT - Kana Module (public API v1)
 * Owns Kana dataset, card/grid rendering, navigation, interactions and Kana speech routing.
 * UI preferences remain owned by Preferences; speech synthesis remains owned by Pronunciation.
 */
(() => {
  'use strict';

  const KANA_DATA = {
    seion: [
      ['あ','ア','a','あー','あめ'],['い','イ','i','いー','いぬ'],['う','ウ','u','うー','うみ'],['え','エ','e','えー','えき'],['お','オ','o','おー','おちゃ'],
      ['か','カ','ka','かー','かさ'],['き','キ','ki','きー','きもの'],['く','ク','ku','くー','くも'],['け','ケ','ke','けー','けしき'],['こ','コ','ko','こー','こども'],
      ['さ','サ','sa','さー','さくら'],['し','シ','shi','しー','しろ'],['す','ス','su','すー','すし'],['せ','セ','se','せー','せかい'],['そ','ソ','so','そー','そら'],
      ['た','タ','ta','たー','たいよう'],['ち','チ','chi','ちー','ちず'],['つ','ツ','tsu','つー','つき'],['て','テ','te','てー','てがみ'],['と','ト','to','とー','とけい'],
      ['な','ナ','na','なー','なつ'],['に','ニ','ni','にー','にじ'],['ぬ','ヌ','nu','ぬー','ぬの'],['ね','ネ','ne','ねー','ねこ'],['の','ノ','no','のー','のり'],
      ['は','ハ','ha','はあ','はな'],['ひ','ヒ','hi','ひー','ひこうき'],['ふ','フ','fu','ふー','ふゆ'],['へ','ヘ','he','へえ','へや'],['ほ','ホ','ho','ほー','ほし'],
      ['ま','マ','ma','まー','まど'],['み','ミ','mi','みー','みず'],['む','ム','mu','むー','むし'],['め','メ','me','めー','めがね'],['も','モ','mo','もー','もり'],
      ['や','ヤ','ya','やー','やま'],null,['ゆ','ユ','yu','ゆー','ゆき'],null,['よ','ヨ','yo','よー','よる'],
      ['ら','ラ','ra','らー','らいおん'],['り','リ','ri','りー','りんご'],['る','ル','ru','るー','るす'],['れ','レ','re','れー','れきし'],['ろ','ロ','ro','ろー','ろうそく'],
      ['わ','ワ','wa','わー','わたし'],null,null,null,['を','ヲ','wo','おー','ほん'],
      ['ん','ン','n','んー','にほん'],null,null,null,null
    ],
    dakuon: [
      ['が','ガ','ga','がー','がっこう'],['ぎ','ギ','gi','ぎー','ぎんこう'],['ぐ','グ','gu','ぐー','ぐんて'],['げ','ゲ','ge','げー','げんき'],['ご','ゴ','go','ごー','ごはん'],
      ['ざ','ザ','za','ざー','ざっし'],['じ','ジ','ji','じー','じしょ'],['ず','ズ','zu','ずー','ずつう'],['ぜ','ゼ','ze','ぜー','ぜんぶ'],['ぞ','ゾ','zo','ぞー','ぞう'],
      ['だ','ダ','da','だー','だいがく'],['ぢ','ヂ','ji','じー','はなぢ'],['づ','ヅ','zu','ずー','つづく'],['で','デ','de','でー','でんしゃ'],['ど','ド','do','どー','どようび'],
      ['ば','バ','ba','ばー','ばんごはん'],['び','ビ','bi','びー','びょういん'],['ぶ','ブ','bu','ぶー','ぶどう'],['べ','ベ','be','べー','べんきょう'],['ぼ','ボ','bo','ぼー','ぼうし'],
      ['ぱ','パ','pa','ぱー','ぱん'],['ぴ','ピ','pi','ぴー','ぴあの'],['ぷ','プ','pu','ぷー','ぷーる'],['ぺ','ペ','pe','ぺー','ぺん'],['ぽ','ポ','po','ぽー','ぽけっと']
    ],
    yoon: [
      ['きゃ','キャ','kya','きゃー','きゃく'],['きゅ','キュ','kyu','きゅー','きゅうり'],['きょ','キョ','kyo','きょー','きょう'],
      ['しゃ','シャ','sha','しゃー','しゃしん'],['しゅ','シュ','shu','しゅー','しゅみ'],['しょ','ショ','sho','しょー','しょくじ'],
      ['ちゃ','チャ','cha','ちゃー','ちゃいろ'],['ちゅ','チュ','chu','ちゅー','ちゅうい'],['ちょ','チョ','cho','ちょー','ちょうちょ'],
      ['にゃ','ニャ','nya','にゃー','にゃんこ'],['にゅ','ニュ','nyu','にゅー','にゅうがく'],['にょ','ニョ','nyo','にょー','にょうぼう'],
      ['ひゃ','ヒャ','hya','ひゃー','ひゃく'],['ひゅ','ヒュ','hyu','ひゅー','ひゅうが'],['ひょ','ヒョ','hyo','ひょー','ひょう'],
      ['みゃ','ミャ','mya','みゃー','みゃく'],['みゅ','ミュ','myu','みゅー','みゅーじっく'],['みょ','ミョ','myo','みょー','みょうじ'],
      ['りゃ','リャ','rya','りゃー','りゃくご'],['りゅ','リュ','ryu','りゅー','りゅうがく'],['りょ','リョ','ryo','りょー','りょこう'],
      ['ぎゃ','ギャ','gya','ぎゃー','ぎゃく'],['ぎゅ','ギュ','gyu','ぎゅー','ぎゅうにゅう'],['ぎょ','ギョ','gyo','ぎょー','ぎょうざ'],
      ['じゃ','ジャ','ja','じゃー','じゃがいも'],['じゅ','ジュ','ju','じゅー','じゅうしょ'],['じょ','ジョ','jo','じょー','じょうず'],
      ['びゃ','ビャ','bya','びゃー','びゃくや'],['びゅ','ビュ','byu','びゅー','びゅう'],['びょ','ビョ','byo','びょー','びょうき'],
      ['ぴゃ','ピャ','pya','ぴゃー','ろっぴゃく'],['ぴゅ','ピュ','pyu','ぴゅー','ぴゅーま'],['ぴょ','ピョ','pyo','ぴょー','はっぴょう']
    ]
  };

  const GROUP_LABELS = Object.freeze({
    seion: 'Cơ bản',
    dakuon: 'Âm đục',
    yoon: 'Âm ghép'
  });
  const VALID_GROUPS = Object.freeze(Object.keys(KANA_DATA));
  const PHONETIC_MAP = new Map();
  Object.values(KANA_DATA).forEach(group => {
    group.forEach(item => {
      if (!item) return;
      const [hira, kata, romaji, clearMora, sampleJa] = item;
      const info = Object.freeze({ hira, kata, romaji, clearMora, sampleJa });
      PHONETIC_MAP.set(hira, info);
      PHONETIC_MAP.set(kata, info);
    });
  });

  function cloneItem(item) {
    return Array.isArray(item) ? [...item] : item;
  }

  function create(options = {}) {
    const getElement = options.getElement || (id => document.getElementById(id));
    const getDocument = () => options.document || document;
    const preferences = options.preferences || null;
    const speakKana = options.speakKana || ((kana, info, mode) => (
      options.pronunciation?.speakKana?.(kana, info, mode)
    ));
    const stopAudio = options.stopAudio || (() => {});
    const shuffle = options.shuffle || (items => {
      const result = [...items];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    });
    const schedule = options.setTimeout || setTimeout;
    const cancel = options.clearTimeout || clearTimeout;

    if (!preferences || typeof preferences.getState !== 'function' || typeof preferences.set !== 'function') {
      throw new TypeError('Kana Module cần Preferences API hợp lệ.');
    }

    let deck = [];
    let deckGroup = null;
    let index = 0;
    let flipped = false;
    let moveTimer = null;
    let mounted = false;
    const boundHandlers = [];

    const prefs = () => preferences.getState();
    const el = id => getElement(id);
    function publishState() {
      try {
        options.onStateChange?.({ deck: deck.map(cloneItem), index, flipped });
      } catch (error) {
        console.warn('[KawaiiKana] State mirror callback failed:', error);
      }
    }
    const setText = (id, value) => {
      const node = el(id);
      if (node) node.textContent = String(value ?? '');
      return node;
    };

    function getGroupItems(group = prefs().kanaGroup, includeEmpty = false) {
      const source = KANA_DATA[VALID_GROUPS.includes(group) ? group : 'seion'];
      return source.filter(item => includeEmpty || !!item).map(cloneItem);
    }

    function getPhoneticInfo(value) {
      const info = PHONETIC_MAP.get(String(value || ''));
      return info ? { ...info } : null;
    }

    function getCurrentItem() {
      return deck[index] ? [...deck[index]] : null;
    }

    function getSnapshot() {
      return Object.freeze({
        group: deckGroup || prefs().kanaGroup,
        script: prefs().kanaScript,
        view: prefs().kanaView,
        readMode: prefs().kanaReadMode,
        deck: deck.map(cloneItem),
        index,
        flipped,
        busy: moveTimer !== null
      });
    }

    function rebuildDeck(shouldShuffle = false) {
      const group = VALID_GROUPS.includes(prefs().kanaGroup) ? prefs().kanaGroup : 'seion';
      const items = KANA_DATA[group].filter(Boolean).map(cloneItem);
      deck = shouldShuffle ? shuffle(items) : items;
      deckGroup = group;
      index = 0;
      flipped = false;
      publishState();
      return getSnapshot();
    }

    function speak(value) {
      const kana = String(value || '').trim();
      if (!kana) return Promise.resolve({ ok: false, reason: 'empty' });
      const info = PHONETIC_MAP.get(kana) || null;
      const mode = prefs().kanaReadMode === 'WITH_WORD' ? 'with-word' : 'single';
      try {
        return Promise.resolve(speakKana(kana, info ? { ...info } : null, mode));
      } catch (error) {
        return Promise.resolve({ ok: false, reason: 'speech-error', error });
      }
    }

    function speakCurrent() {
      const item = getCurrentItem();
      return item ? speak(item[0]) : Promise.resolve({ ok: false, reason: 'empty' });
    }

    function render() {
      const currentPrefs = prefs();
      const currentGroup = VALID_GROUPS.includes(currentPrefs.kanaGroup) ? currentPrefs.kanaGroup : 'seion';
      if (deckGroup !== currentGroup) rebuildDeck();
      const isCardView = currentPrefs.kanaView === 'card';
      const viewCardBtn = el('kanaViewCardBtn');
      const viewGridBtn = el('kanaViewGridBtn');
      const flashcardWrap = el('kanaFlashcardWrap');
      const gridContainer = el('kanaGridContainer');
      if (viewCardBtn) viewCardBtn.className = isCardView
        ? 'px-3 py-1.5 rounded-xl bg-white text-[#FB6F92] shadow-sm transition'
        : 'px-3 py-1.5 rounded-xl text-[#786D69] transition';
      if (viewGridBtn) viewGridBtn.className = !isCardView
        ? 'px-3 py-1.5 rounded-xl bg-white text-[#FB6F92] shadow-sm transition'
        : 'px-3 py-1.5 rounded-xl text-[#786D69] transition';
      flashcardWrap?.classList.toggle('hidden', !isCardView);
      gridContainer?.classList.toggle('hidden', isCardView);

      const isHira = currentPrefs.kanaScript === 'hira';
      const scriptHira = el('kanaScriptHira');
      const scriptKata = el('kanaScriptKata');
      if (scriptHira) scriptHira.className = isHira
        ? 'px-3 py-1 rounded-xl bg-white text-[#FB6F92] shadow-sm transition'
        : 'px-3 py-1 rounded-xl text-[#786D69] transition';
      if (scriptKata) scriptKata.className = !isHira
        ? 'px-3 py-1 rounded-xl bg-white text-[#FB6F92] shadow-sm transition'
        : 'px-3 py-1 rounded-xl text-[#786D69] transition';

      const isWithWord = currentPrefs.kanaReadMode === 'WITH_WORD';
      setText('kanaModeQuickLabel', isWithWord ? 'Âm + Từ mẫu' : 'Âm chuẩn rõ');
      const quickBtn = el('kanaModeQuickBtn');
      if (quickBtn) quickBtn.className = isWithWord
        ? 'px-3 py-1.5 rounded-2xl bg-peach-50 border border-[#FF8FA3] text-[#FB6F92] text-xs font-extrabold transition flex items-center gap-1.5'
        : 'px-3 py-1.5 rounded-2xl bg-matcha-50 border border-[#A7F3D0] text-matcha-600 text-xs font-extrabold transition flex items-center gap-1.5';

      getDocument().querySelectorAll('.kana-group-btn').forEach(btn => {
        const active = btn.dataset.kgroup === currentPrefs.kanaGroup;
        btn.className = active
          ? 'kana-group-btn px-2.5 py-1 rounded-xl bg-white text-[#332E2E] shadow-sm transition'
          : 'kana-group-btn px-2.5 py-1 rounded-xl text-[#786D69] transition';
      });

      if (isCardView) {
        if (!deck.length) rebuildDeck();
        const item = getCurrentItem();
        if (!item) return false;
        const [hira, kata, romaji, , sampleJa] = item;
        const groupLabel = GROUP_LABELS[currentPrefs.kanaGroup] || GROUP_LABELS.seion;
        setText('kanaFcCounter', `${index + 1} / ${deck.length}`);
        el('kanaInner')?.classList.toggle('is-flipped', flipped);
        setText('kanaFrontTag', `${isHira ? 'Hiragana' : 'Katakana'} · ${groupLabel}`);
        const front = el('kanaFrontChar');
        if (front) {
          front.textContent = isHira ? hira : kata;
          front.className = (isHira ? hira : kata).length > 1
            ? 'font-jp text-7xl sm:text-8xl font-extrabold text-[#2B2626] leading-none'
            : 'font-jp text-8xl sm:text-9xl font-extrabold text-[#2B2626] leading-none';
        }
        setText('kanaBackPairLabel', isHira ? 'Đối chiếu Katakana' : 'Đối chiếu Hiragana');
        setText('kanaBackRomaji', romaji);
        setText('kanaBackCounterpart', isHira ? kata : hira);
        setText('kanaBackSample', sampleJa);
      } else {
        const grid = el('kanaGrid');
        if (!grid) return false;
        const group = VALID_GROUPS.includes(currentPrefs.kanaGroup) ? currentPrefs.kanaGroup : 'seion';
        const items = KANA_DATA[group];
        grid.className = group === 'yoon' ? 'grid grid-cols-3 gap-2 sm:gap-3' : 'grid grid-cols-5 gap-2 sm:gap-3';
        grid.innerHTML = '';
        items.forEach(cell => {
          if (!cell) {
            const empty = getDocument().createElement('div');
            empty.className = 'rounded-2xl bg-[#FAF6F2]/60 border border-dashed border-[#EDE5DC] min-h-[72px] sm:min-h-[82px]';
            grid.appendChild(empty);
            return;
          }
          const [hira, kata, romaji, , sampleJa] = cell;
          const btn = getDocument().createElement('button');
          btn.type = 'button';
          btn.className = 'group rounded-2xl bg-[#FFFDF9] hover:bg-peach-50 border border-[#F1ECE6] hover:border-[#FF8FA3] p-2 sm:p-3 min-h-[72px] sm:min-h-[82px] flex flex-col items-center justify-center transition-all active:scale-95';
          btn.innerHTML = `
            <div class="flex items-baseline gap-1">
              <span class="font-jp text-xl sm:text-2xl font-extrabold text-[#2B2626] group-hover:text-[#FB6F92] transition">${isHira ? hira : kata}</span>
              <span class="font-jp text-[11px] font-bold text-[#B0A39E]">${isHira ? kata : hira}</span>
            </div>
            <span class="text-[11px] font-extrabold text-[#FB6F92] leading-tight">${romaji}</span>
            <span class="font-jp text-[10px] font-semibold text-[#8C7F7A] mt-0.5 truncate max-w-full">${sampleJa}</span>
          `;
          btn.onclick = () => {
            btn.classList.add('ring-2', 'ring-[#FB6F92]', 'bg-peach-50');
            schedule(() => btn.classList.remove('ring-2', 'ring-[#FB6F92]', 'bg-peach-50'), 420);
            speak(hira);
          };
          grid.appendChild(btn);
        });
      }
      return true;
    }

    function flipCard() {
      if (!deck.length || moveTimer !== null) return false;
      flipped = !flipped;
      publishState();
      el('kanaInner')?.classList.toggle('is-flipped', flipped);
      if (flipped) speakCurrent();
      return true;
    }

    function moveCard(direction) {
      if (!deck.length || moveTimer !== null) return false;
      const dir = Number(direction) < 0 ? -1 : 1;
      stopAudio();
      const card = el('kanaPerspective');
      if (card) {
        card.style.transition = 'transform 0.14s ease-out, opacity 0.14s ease-out';
        card.style.transform = `translateX(${-40 * dir}px)`;
        card.style.opacity = '0.35';
      }
      moveTimer = schedule(() => {
        moveTimer = null;
        index = (index + dir + deck.length) % deck.length;
        flipped = false;
        publishState();
        render();
        if (card) {
          card.style.transform = '';
          card.style.opacity = '';
        }
      }, 140);
      return true;
    }

    function setPreference(key, value) {
      if (!['kanaView', 'kanaScript', 'kanaReadMode', 'kanaGroup'].includes(key)) {
        throw new TypeError(`Kana không quản lý cài đặt: ${String(key)}`);
      }
      preferences.set(key, value, { persist: true });
      if (key === 'kanaGroup') rebuildDeck();
      return render();
    }

    function handleKey(event) {
      if (prefs().kanaView !== 'card' || !deck.length) return false;
      if (event.code === 'Space') {
        event.preventDefault();
        return flipCard();
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        return moveCard(1);
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        return moveCard(-1);
      }
      return false;
    }

    function bindSwipeAndFlip(cardEl) {
      if (!cardEl) return;
      let startX = 0, startY = 0, startTime = 0, dragging = false, didSwipe = false;
      const clearFeedback = () => {};
      const resetCard = () => {
        cardEl.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        cardEl.style.transform = 'translateX(0) rotate(0deg)';
        cardEl.style.opacity = '1';
        clearFeedback();
      };
      const onPointerDown = e => {
        if (e.button !== 0 || e.target.closest('button') || e.target.closest('.tap-token') || isBusy()) return;
        cardEl.setPointerCapture?.(e.pointerId);
        startX = e.clientX; startY = e.clientY; startTime = performance.now();
        dragging = true; didSwipe = false;
        cardEl.style.transition = 'none';
      };
      const onPointerMove = e => {
        if (!dragging) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        if (Math.abs(dy) > 10) didSwipe = true;
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
          didSwipe = true;
          cardEl.style.transform = `translateX(${Math.max(-150, Math.min(150, dx * 0.72))}px) rotate(${Math.max(-9, Math.min(9, dx * 0.045))}deg)`;
        }
      };
      const onPointerUp = e => {
        if (!dragging) return;
        dragging = false;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        const elapsed = Math.max(1, performance.now() - startTime);
        const velocity = Math.abs(dx) / elapsed;
        const threshold = Math.max(64, cardEl.clientWidth * 0.25);
        const accepted = Math.abs(dx) >= threshold || (Math.abs(dx) >= 36 && velocity >= 0.65);
        if (accepted && Math.abs(dx) > Math.abs(dy)) {
          didSwipe = true;
          cardEl.style.transition = 'transform 0.16s ease-out, opacity 0.16s ease-out';
          cardEl.style.transform = `translateX(${dx < 0 ? -520 : 520}px) rotate(${dx < 0 ? -12 : 12}deg)`;
          cardEl.style.opacity = '0';
          schedule(() => {
            cardEl.style.transition = '';
            cardEl.style.transform = '';
            cardEl.style.opacity = '';
            if (dx < 0) moveCard(1); else moveCard(-1);
          }, 125);
        } else {
          resetCard();
        }
      };
      const onPointerCancel = () => {
        dragging = false; didSwipe = true; resetCard();
      };
      const onClick = e => {
        if (e.target.closest('button') || e.target.closest('.tap-token') || didSwipe || isBusy()) return;
        flipCard();
      };
      cardEl.addEventListener('pointerdown', onPointerDown);
      cardEl.addEventListener('pointermove', onPointerMove);
      cardEl.addEventListener('pointerup', onPointerUp);
      cardEl.addEventListener('pointercancel', onPointerCancel);
      cardEl.addEventListener('click', onClick);
      boundHandlers.push(() => {
        cardEl.removeEventListener('pointerdown', onPointerDown);
        cardEl.removeEventListener('pointermove', onPointerMove);
        cardEl.removeEventListener('pointerup', onPointerUp);
        cardEl.removeEventListener('pointercancel', onPointerCancel);
        cardEl.removeEventListener('click', onClick);
      });
    }

    function isBusy() {
      return !deck.length || moveTimer !== null;
    }

    function bindClick(id, handler) {
      const node = el(id);
      if (!node) return;
      const previous = node.onclick;
      node.onclick = handler;
      boundHandlers.push(() => { if (node.onclick === handler) node.onclick = previous || null; });
    }

    function mount() {
      if (mounted) return false;
      mounted = true;
      bindClick('kanaViewCardBtn', () => setPreference('kanaView', 'card'));
      bindClick('kanaViewGridBtn', () => setPreference('kanaView', 'grid'));
      bindClick('kanaScriptHira', () => setPreference('kanaScript', 'hira'));
      bindClick('kanaScriptKata', () => setPreference('kanaScript', 'kata'));
      bindClick('kanaModeQuickBtn', () => setPreference('kanaReadMode', prefs().kanaReadMode === 'WITH_WORD' ? 'CLEAR_MORA' : 'WITH_WORD'));
      bindClick('kanaFcShuffleBtn', () => { rebuildDeck(true); render(); options.onShuffle?.(); });
      bindClick('kanaPrevBtn', () => moveCard(-1));
      bindClick('kanaNextBtn', () => moveCard(1));
      bindClick('kanaFlipBtn', () => flipCard());
      bindClick('kanaSpeakFrontBtn', event => { event?.stopPropagation?.(); speakCurrent(); });
      bindClick('kanaSpeakBackBtn', event => { event?.stopPropagation?.(); speakCurrent(); });
      getDocument().querySelectorAll('.kana-group-btn').forEach(btn => {
        const handler = () => setPreference('kanaGroup', btn.dataset.kgroup);
        const previous = btn.onclick;
        btn.onclick = handler;
        boundHandlers.push(() => { if (btn.onclick === handler) btn.onclick = previous || null; });
      });
      bindSwipeAndFlip(el('kanaPerspective'));
      return true;
    }

    function destroy() {
      if (moveTimer !== null) cancel(moveTimer);
      moveTimer = null;
      boundHandlers.splice(0).forEach(unbind => { try { unbind(); } catch (_) {} });
      mounted = false;
      el('kanaGridContainer')?.replaceChildren();
    }

    publishState();
    return Object.freeze({
      mount,
      destroy,
      render,
      rebuildDeck,
      flipCard,
      moveCard,
      speak,
      speakCurrent,
      handleKey,
      setPreference,
      getCurrentItem,
      getPhoneticInfo,
      getGroupItems,
      getSnapshot,
      isBusy
    });
  }

  window.KawaiiKanaModule = Object.freeze({ create, groups: Object.freeze([...VALID_GROUPS]) });
})();
