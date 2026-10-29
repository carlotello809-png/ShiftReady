/* ShiftReady — start-up sequence over the blurred simulator
   1. The logo appears, with "Tap to start" / "Click to start" underneath
   2. Pressing it (or anywhere, or a key) starts the voice, and its words appear as they are spoken:
      "Welcome to ShiftReady" → "A Customer Service Simulator"
   3. The blur dissolves and the simulator is revealed
   Starting with a press is what lets every browser, on phones too, play the voice.
   Once started, a click or a key skips. Can be turned off in Settings. */
window.SR = window.SR || {};
(function () {
  'use strict';

  const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
  const EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)';

  // What the voice says, timed to assets/audio/welcome-voice.mp3: [word, ms when it is spoken].
  // Each word appears as it is spoken; each line fades out at `out`.
  const LINES = [
    { tag: 'h1', cls: 'boot-w1', words: [['Welcome', 50], ['to', 460], ['ShiftReady', 600]], out: 1580 },
    { tag: 'p', cls: 'boot-w2', words: [['A', 1880], ['Customer', 2000], ['Service', 2560], ['Simulator', 2960]], out: 4400 }
  ];
  const REVEAL = 5060;
  const FADE_IN = 700, FADE_OUT = 340, FADE_OUT_LAST = 560;
  const VOICE_WAIT = 900;   // if the voice has not started by then, show the words without it

  const listeners = [];
  let finished = false;
  let running = false;

  SR.boot = {
    get done() { return finished; },
    onDone(fn) { if (finished) fn(); else listeners.push(fn); },
    // opts.instant: start the voice right away (only when called from a click, e.g. "Replay welcome")
    play: play
  };

  function settings() {
    try { return JSON.parse(localStorage.getItem('shiftready.v1')) || {}; } catch (e) { return {}; }
  }

  function makeVoice() {
    const s = SR.sounds && SR.sounds.welcome;
    if (!s || settings().sound === false) return null;
    try {
      const a = new Audio('data:' + s.type + ';base64,' + s.data);
      a.preload = 'auto';
      return a;
    } catch (e) { return null; }
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function play(opts) {
    if (running) return;
    running = true;
    finished = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const touch = window.matchMedia('(pointer: coarse)').matches;

    const root = document.createElement('div');
    root.className = 'boot waiting';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Welcome to the Customer Service Simulator');
    root.innerHTML =
      LINES.map(l => '<' + l.tag + ' class="boot-word ' + l.cls + '">' +
        l.words.map(w => '<span class="bw">' + esc(w[0]) + '</span>').join(' ') +
        '</' + l.tag + '>').join('') +
      '<button type="button" class="boot-logo" aria-label="Start">' +
        SR.logo.tile(176) +

      '</button>';
    document.body.appendChild(root);
    document.documentElement.classList.add('boot-on');

    const words = Array.prototype.slice.call(root.querySelectorAll('.boot-word'));
    const logo = root.querySelector('.boot-logo');
    const hint = root.querySelector('.boot-hint');
    const anims = [];
    const A = (el, kf, opt) => { const a = el.animate(kf, Object.assign({ fill: 'both' }, opt)); anims.push(a); return a; };

    // Fade = opacity + a touch of blur and lift (opacity only with reduced motion)
    const show = reduce ? { opacity: 1 } : { opacity: 1, transform: 'none', filter: 'blur(0px)' };
    const before = reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(14px) scale(0.98)', filter: 'blur(8px)' };
    const after = reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-10px) scale(1.01)', filter: 'blur(6px)' };

    let phase = 'logo';      // logo → words → done
    // Load the voice while the logo waits, so it starts the moment the logo is pressed.
    // The sound file arrives a moment after the page (index.html loads it late), so
    // the voice is prepared as soon as it is there.
    let voice = null;
    function prepareVoice() {
      if (voice || phase !== 'logo') return;
      voice = makeVoice();
      if (voice) { try { voice.load(); } catch (e) { /* ignore */ } }
    }
    prepareVoice();
    document.addEventListener('sr:sounds', prepareVoice);
    let timer = 0;

    // 1. The logo comes in and waits to be pressed
    A(logo, [reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.92)', filter: 'blur(6px)' }, show],
      { duration: 700, delay: 150, easing: EASE_OUT });
    A(hint, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 750, easing: EASE_OUT });

    // 2. Pressed: the voice starts here, inside the press, so the browser allows the sound
    function begin() {
      if (phase !== 'logo') return;
      phase = 'words';
      root.classList.remove('waiting');
      A(logo, [{ opacity: Number(getComputedStyle(logo).opacity) || 1 }, reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-18px) scale(0.9)', filter: 'blur(5px)' }],
        { duration: 380, easing: EASE_OUT, fill: 'forwards' });
      logo.style.pointerEvents = 'none';
      if (!voice) { startWords(); return; }
      let settled = false;
      const silent = () => { if (settled) return; settled = true; stopVoice(false); startWords(); };
      const waitTimer = setTimeout(silent, VOICE_WAIT);
      let p;
      try { p = voice.play(); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(() => {
        if (settled) { stopVoice(false); return; }
        settled = true; clearTimeout(waitTimer); startWords();
      }, () => { clearTimeout(waitTimer); silent(); });
    }

    // The words start together with the voice so they stay in sync
    let wordsStarted = false;
    function startWords() {
      if (wordsStarted || revealed) return;
      wordsStarted = true;
      LINES.forEach((l, i) => {
        const el = words[i];
        const last = i === LINES.length - 1;
        el.style.opacity = '1';
        el.querySelectorAll('.bw').forEach((w, k) =>
          A(w, [before, show], { duration: FADE_IN, delay: l.words[k][1], easing: EASE_OUT }));
        A(el, [show, after], { duration: last ? FADE_OUT_LAST : FADE_OUT, delay: l.out, easing: EASE_IN_OUT, fill: 'forwards' });
      });
      timer = setTimeout(reveal, REVEAL);
    }

    function stopVoice(fade) {
      if (!voice) return;
      if (!fade || voice.paused) { try { voice.pause(); } catch (e) { /* ignore */ } return; }
      const v0 = voice.volume, t0 = performance.now();
      const iv = setInterval(() => {
        const k = Math.min(1, (performance.now() - t0) / 220);
        try { voice.volume = Math.max(0, v0 * (1 - k)); } catch (e) { /* volume is read-only on iOS */ }
        if (k >= 1) { clearInterval(iv); voice.pause(); }
      }, 20);
    }

    // 3. The blur dissolves
    let revealed = false;
    function reveal(skipped) {
      if (revealed) return;
      revealed = true;
      phase = 'done';
      clearTimeout(timer);
      stopVoice(skipped === true);
      document.removeEventListener('keydown', onKey, true);
      root.removeEventListener('click', onPress);
      root.style.pointerEvents = 'none';
      if (skipped) {
        // Freeze whatever is on screen and fade it out quickly
        words.concat([logo]).forEach(el => {
          const o = getComputedStyle(el).opacity;
          anims.forEach(a => { if (a.effect && a.effect.target === el) a.cancel(); });
          el.style.opacity = o;
          el.animate([{ opacity: o }, { opacity: 0 }], { duration: 200, easing: EASE_OUT, fill: 'forwards' });
        });
      }
      const dur = reduce ? 300 : 650;
      root.animate(
        [{ backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', opacity: 1 }, { backdropFilter: 'blur(0px)', WebkitBackdropFilter: 'blur(0px)', opacity: 0 }],
        { duration: dur, delay: skipped ? 120 : 0, easing: EASE_OUT, fill: 'forwards' });
      setTimeout(finish, skipped ? 150 : 60);
      setTimeout(cleanup, dur + 260);
    }
    function finish() {
      if (finished) return;
      finished = true;
      listeners.splice(0).forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    }
    function cleanup() {
      document.removeEventListener('sr:sounds', prepareVoice);
      anims.forEach(a => { try { a.cancel(); } catch (e) { /* ignore */ } });
      if (voice) { try { voice.pause(); voice.removeAttribute('src'); voice.load(); } catch (e) { /* ignore */ } }
      root.remove();
      document.documentElement.classList.remove('boot-on');
      running = false;
    }

    // A click/tap (the "click" event is what phones accept for sound) or a key starts it; later ones skip
    function onPress(e) {
      e.preventDefault();
      if (phase === 'logo') begin(); else if (phase === 'words') reveal(true);
    }
    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
      if (phase === 'logo' && e.key !== 'Escape') begin();
      else reveal(true);
    }
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('click', onPress);

    if (opts && opts.instant) begin();
  }

  if (settings().intro === false) finished = true;
  else play();
})();
