/* ShiftReady — start-up sequence over the blurred simulator (starts by itself, no click)
   1. The voice plays as soon as the page opens and its words appear as they are spoken:
      "Welcome to ShiftReady" → "A Customer Service Simulator"
   2. The logo fades in and out
   3. The blur dissolves and the simulator is revealed
   Browsers only play sound on open when allowed (Edge: edge://settings/content/mediaAutoplay → Allow).
   If the browser blocks it, the same sequence plays silently. Click or any key skips. Can be turned off in Settings. */
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
  const LOGO_IN = 4950, LOGO_OUT = 6350, REVEAL = 6650;
  const FADE_IN = 700, FADE_OUT = 340, FADE_OUT_LAST = 560;
  const AUTOPLAY_WAIT = 700;   // if the voice has not started by then, play the sequence silently

  const listeners = [];
  let finished = false;
  let running = false;

  SR.boot = {
    get done() { return finished; },
    onDone(fn) { if (finished) fn(); else listeners.push(fn); },
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

  function play() {
    if (running) return;
    running = true;
    finished = false;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const root = document.createElement('div');
    root.className = 'boot';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Welcome to the Customer Service Simulator');
    root.innerHTML =
      LINES.map(l => '<' + l.tag + ' class="boot-word ' + l.cls + '">' +
        l.words.map(w => '<span class="bw">' + esc(w[0]) + '</span>').join(' ') +
        '</' + l.tag + '>').join('') +
      '<div class="boot-logo" aria-hidden="true"><img src="assets/img/logo-768.png" alt="" draggable="false"></div>';
    document.body.appendChild(root);
    document.documentElement.classList.add('boot-on');

    const words = Array.prototype.slice.call(root.querySelectorAll('.boot-word'));
    const logo = root.querySelector('.boot-logo');
    const anims = [];
    const A = (el, kf, opt) => { const a = el.animate(kf, Object.assign({ fill: 'both' }, opt)); anims.push(a); return a; };

    // Fade = opacity + a touch of blur and lift (opacity only with reduced motion)
    const show = reduce ? { opacity: 1 } : { opacity: 1, transform: 'none', filter: 'blur(0px)' };
    const before = reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(14px) scale(0.98)', filter: 'blur(8px)' };
    const after = reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-10px) scale(1.01)', filter: 'blur(6px)' };

    const voice = makeVoice();
    let started = false;
    let timer = 0;

    // The words start together with the voice so they stay in sync
    function start() {
      if (started || revealed) return;
      started = true;
      LINES.forEach((l, i) => {
        const el = words[i];
        const last = i === LINES.length - 1;
        // Each word appears as it is spoken
        el.style.opacity = '1';
        el.querySelectorAll('.bw').forEach((w, k) =>
          A(w, [before, show], { duration: FADE_IN, delay: l.words[k][1], easing: EASE_OUT }));
        A(el, [show, after], { duration: last ? FADE_OUT_LAST : FADE_OUT, delay: l.out, easing: EASE_IN_OUT, fill: 'forwards' });
      });
      A(logo, [reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.94)', filter: 'blur(6px)' }, show],
        { duration: 700, delay: LOGO_IN, easing: EASE_OUT });
      A(logo, [show, reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(1.04)', filter: 'blur(4px)' }],
        { duration: 450, delay: LOGO_OUT, easing: EASE_OUT, fill: 'forwards' });
      timer = setTimeout(reveal, REVEAL);
    }

    if (!voice) start();
    else {
      let settled = false;
      const silent = () => { if (settled) return; settled = true; stopVoice(false); start(); };
      const waitTimer = setTimeout(silent, AUTOPLAY_WAIT);
      let p;
      try { p = voice.play(); } catch (e) { p = Promise.reject(e); }
      Promise.resolve(p).then(() => {
        if (settled) { stopVoice(false); return; }   // started too late: stay silent
        settled = true; clearTimeout(waitTimer); start();
      }, () => { clearTimeout(waitTimer); silent(); });
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

    let revealed = false;
    function reveal(skipped) {
      if (revealed) return;
      revealed = true;
      clearTimeout(timer);
      stopVoice(skipped === true);
      document.removeEventListener('keydown', onKey, true);
      root.removeEventListener('pointerdown', onSkip);
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
      anims.forEach(a => { try { a.cancel(); } catch (e) { /* ignore */ } });
      if (voice) { try { voice.pause(); voice.removeAttribute('src'); voice.load(); } catch (e) { /* ignore */ } }
      root.remove();
      document.documentElement.classList.remove('boot-on');
      running = false;
    }

    function onKey(e) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.key === 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
      reveal(true);
    }
    function onSkip() { reveal(true); }
    document.addEventListener('keydown', onKey, true);
    root.addEventListener('pointerdown', onSkip);
  }

  if (settings().intro === false) finished = true;
  else play();
})();
