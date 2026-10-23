/* ShiftReady — simulation engine
   Owns the game clock, the event queue, customer typing, patience and scoring.
   The UI listens through SR.engine.hooks. Everything runs on a pausable game clock. */
(function () {
  'use strict';
  const SR = window.SR;
  const D = SR.data;

  // Patience change after each reply, by quality (3 excellent … 0 poor)
  const PATIENCE_DELTA = { 3: 10, 2: 5, 1: -4, 0: -12 };
  // Patience levels where a waiting customer sends a "hello??" nudge
  const NUDGE_AT = [60, 35, 15];
  // Below this patience the customer counts as "Angry"
  const ANGRY_AT = 20;

  const E = SR.engine = { st: null, hooks: {}, settings: {}, activeId: null, lastTs: 0 };

  function emit(name) {
    const h = E.hooks[name];
    if (!h) return;
    const args = Array.prototype.slice.call(arguments, 1);
    try { h.apply(null, args); } catch (err) { console.error('[ShiftReady] hook ' + name, err); }
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function agentFirstName() {
    const n = (E.settings.agentName || 'Alex Morgan').trim();
    return n.split(/\s+/)[0] || 'Alex';
  }
  function fill(text, c) {
    return String(text || '')
      .replace(/\{agent\}/g, agentFirstName())
      .replace(/\{first\}/g, c ? c.sc.customer.first : '');
  }
  E.fill = fill;

  /* ---------- shift lifecycle ---------- */
  E.startDay = function (n) {
    const day = D.days.find(d => d.n === n);
    const scs = D.scenarios.filter(s => s.day === n).sort((a, b) => a.arrive - b.arrive);
    const st = E.st = { day, n, clock: 0, queue: [], seq: 0, mid: 0, paused: false, running: true, ended: false, convs: [] };
    st.convs = scs.map((sc, i) => ({
      id: sc.id, sc, idx: i,
      persona: D.personas[sc.persona] || D.personas.neutral,
      ticket: 20400 + n * 120 + i * 13,
      arrived: false, status: 'pending', messages: [], node: null,
      used: new Set(), order: [], selected: null,
      patience: sc.patience != null ? sc.patience : 100,
      startPatience: sc.patience != null ? sc.patience : 100,
      nudges: 0, typing: false, unread: 0,
      turnStart: null, turnToken: 0, flowToken: 0,
      firstResponse: null, responseTimes: [], decisions: [],
      outcome: null, csat: null, accuracy: null, correctDisp: [], disposition: null, dispOk: null,
      arrivedAt: null, endedAt: null, closedAt: null, lastAt: 0
    }));
    E.activeId = null;
    // small lead-in so the agent sees an empty inbox for a moment
    st.convs.forEach(c => schedule(1200 + c.sc.arrive * 1000, () => arrive(c)));
    E.lastTs = performance.now();
    emit('start', st);
  };

  E.quit = function () { E.st = null; E.activeId = null; };
  E.setPaused = function (p) {
    if (!E.st || E.st.ended) return;
    E.st.paused = !!p;
    emit('pause', E.st.paused);
  };
  E.get = id => (E.st ? E.st.convs.find(c => c.id === id) : null);

  /* ---------- event queue on the game clock ---------- */
  function schedule(delay, fn) {
    const st = E.st;
    st.queue.push({ at: st.clock + delay, seq: ++st.seq, fn });
    st.queue.sort((a, b) => (a.at - b.at) || (a.seq - b.seq));
  }
  function processQueue() {
    const st = E.st;
    while (st.queue.length && st.queue[0].at <= st.clock) {
      const ev = st.queue.shift();
      try { ev.fn(); } catch (err) { console.error('[ShiftReady] event', err); }
      if (E.st !== st) return;
    }
  }

  E.tick = function () {
    const now = performance.now();
    let dt = now - (E.lastTs || now);
    E.lastTs = now;
    const st = E.st;
    if (!st || !st.running || st.paused) return;
    dt = Math.min(dt, 500);
    st.clock += dt;
    processQueue();
    if (E.st !== st) return;
    decay(dt);
    emit('tick', st);
  };
  setInterval(E.tick, 100);

  /* ---------- patience ---------- */
  function decay(dt) {
    const st = E.st;
    for (const c of st.convs) {
      if (c.status !== 'agent') continue;
      const rate = st.day.decay * c.persona.decay * (c.sc.decay || 1);
      const before = c.patience;
      c.patience = Math.max(0, c.patience - rate * dt / 1000);
      // The moment a waiting customer turns angry, the UI raises the alarm
      if (before > ANGRY_AT && c.patience <= ANGRY_AT) emit('angry', c);
      if (c.nudges < NUDGE_AT.length && c.patience <= NUDGE_AT[c.nudges]) {
        nudge(c, c.nudges);
        c.nudges++;
      }
      if (c.patience <= 0) abandon(c);
    }
  }

  function nudge(c, level) {
    const list = c.sc.nudges || c.persona.nudges;
    const text = fill(list[Math.min(level, list.length - 1)], c);
    const token = c.turnToken;
    const ok = () => c.status === 'agent' && c.turnToken === token;
    schedule(250, () => { if (!ok()) return; c.typing = true; emit('typing', c); });
    schedule(250 + clamp(text.length * 32 * c.persona.typing, 900, 2800), () => {
      if (!ok()) return;
      c.typing = false; emit('typing', c);
      pushMsg(c, { from: 'customer', text, nudge: true });
    });
  }

  function abandon(c) {
    c.patience = 0;
    c.turnToken++;
    c.typing = false;
    const text = fill(c.sc.leave || c.persona.leave, c);
    say(c, [text], () => {
      pushMsg(c, { from: 'system', kind: 'left', text: c.sc.customer.first + ' left the conversation' });
      finish(c, 'abandoned', {});
    }, { first: 300 });
  }

  /* ---------- messages ---------- */
  function pushMsg(c, m, silent) {
    const st = E.st;
    m.id = ++st.mid;
    if (m.at == null) m.at = st.clock;
    c.messages.push(m);
    c.lastAt = Math.max(c.lastAt, m.at);
    if (m.from === 'customer' && E.activeId !== c.id) c.unread++;
    if (!silent) emit('message', c, m);
    return m;
  }

  function arrive(c) {
    const st = E.st;
    c.arrived = true;
    c.arrivedAt = st.clock;
    const hist = c.sc.history || [];
    hist.forEach(h => {
      const m = Object.assign({}, h, { at: st.clock - (h.ago || 0) * 1000, hist: true });
      if (m.text) m.text = fill(m.text, c);
      pushMsg(c, m, true);
    });
    if (!hist.length) pushMsg(c, { from: 'system', kind: 'assigned', text: 'Chat started · assigned to you' }, true);
    emit('arrive', c);
    enterNode(c, c.sc.start, null, 'first');
  }

  // Seconds this customer usually takes to answer after the agent writes
  // (each customer has their own pace; every reply varies ±20%, never more than 30s).
  const MAX_REPLY_DELAY = 30000;
  function replyIn(c) { return c.sc.replyIn || c.persona.replyIn || 15; }
  E.replyIn = replyIn;
  function replyDelay(c) { return Math.min(MAX_REPLY_DELAY, replyIn(c) * 1000 * rand(0.8, 1.2)); }

  function enterNode(c, id, pre, mode) {
    const node = c.sc.nodes[id];
    if (!node) { console.error('[ShiftReady] missing node', c.sc.id, id); finish(c, 'resolved', {}); return; }
    c.node = id;
    c.used = new Set();
    c.order = [];
    const msgs = (pre || []).concat(node.c || []);
    const opt = mode === 'first' ? { first: rand(1100, 2000) } : mode === 'reply' ? { reply: true } : null;
    say(c, msgs, () => {
      if (node.end) finish(c, node.end, node);
      else startTurn(c);
    }, opt);
  }

  // The customer takes their time, types (indicator visible) and sends each message in turn.
  function say(c, msgs, done, opt) {
    c.status = 'customer';
    const token = ++c.flowToken;
    emit('status', c);
    if (!msgs.length) {
      schedule(500, () => { if (c.flowToken === token) done(); });
      return;
    }
    let t;
    if (opt && opt.first != null) t = opt.first;
    else if (opt && opt.reply) t = replyDelay(c);
    else t = rand(1000, 1800);
    c.replyAt = E.st.clock + t;
    msgs.forEach(raw => {
      const text = fill(raw, c);
      const dur = clamp(text.length * 32 * c.persona.typing * (c.sc.typing || 1), 900, 5600);
      schedule(t, () => { if (c.flowToken !== token) return; c.typing = true; emit('typing', c); });
      t += dur;
      schedule(t, () => {
        if (c.flowToken !== token) return;
        c.typing = false; emit('typing', c);
        pushMsg(c, { from: 'customer', text });
      });
      t += rand(500, 900);
    });
    schedule(t - 250, () => { if (c.flowToken === token) done(); });
  }

  function startTurn(c, keepOrder) {
    const node = c.sc.nodes[c.node];
    c.status = 'agent';
    c.turnStart = E.st.clock;
    c.turnToken++;
    const avail = node.o.map((_, i) => i).filter(i => !c.used.has(i));
    c.order = keepOrder && c.order.length ? c.order.filter(i => !c.used.has(i)) : shuffle(avail);
    c.selected = null;
    c.nudges = NUDGE_AT.filter(v => c.patience <= v).length;
    emit('turn', c);
  }

  // The customer message this reply answers. Empty when the agent is sending a follow-up
  // (no new customer message since the agent's last reply).
  function lastCustomerText(c) {
    for (let i = c.messages.length - 1; i >= 0; i--) {
      const m = c.messages[i];
      if (m.from === 'coach' || m.from === 'system' || m.nudge) continue;
      if (m.from === 'customer') return m.text;
      if (m.from === 'agent' && !m.name) return '';
    }
    return '';
  }

  /* ---------- agent actions ---------- */
  E.select = function (id, i) {
    const c = E.get(id);
    if (c && c.status === 'agent' && !c.used.has(i)) c.selected = i;
  };

  E.send = function (id, i) {
    const c = E.get(id);
    if (!c || c.status !== 'agent') return false;
    const node = c.sc.nodes[c.node];
    const o = node.o[i];
    if (!o || c.used.has(i)) return false;
    const st = E.st;
    const rt = st.clock - c.turnStart;
    if (c.firstResponse == null) c.firstResponse = rt;
    c.responseTimes.push(rt);
    c.typing = false;
    c.turnToken++;
    c.selected = null;
    c.lastSentAt = st.clock;

    const text = fill(o.t, c);
    const best = node.o.reduce((b, x) => (x.q > b.q ? x : b), node.o[0]);
    c.decisions.push({
      prompt: lastCustomerText(c), chosen: text, q: o.q, fb: o.fb || '',
      best: best === o ? null : fill(best.t, c), rt
    });
    pushMsg(c, { from: 'agent', text });
    pushMsg(c, { from: 'coach', q: o.q, text: o.fb || '' });
    c.patience = clamp(c.patience + PATIENCE_DELTA[o.q], 0, 100);

    if (c.patience <= 0) { abandon(c); return true; }
    if (o.end) say(c, o.r || [], () => finish(c, o.end, o), { reply: true });
    else if (o.retry) { c.used.add(i); say(c, o.r || [], () => startTurn(c, true), { reply: true }); }
    else enterNode(c, o.go, o.r, 'reply');
    return true;
  };

  function finish(c, outcome, src) {
    const st = E.st;
    c.flowToken++;
    c.turnToken++;
    c.typing = false;
    c.status = 'ended';
    c.outcome = outcome;
    c.endedAt = st.clock;
    const disp = [].concat((src && src.disp) || c.sc.disp || []);
    c.correctDisp = outcome === 'resolved' ? disp : ['no-resolution'];
    const n = c.decisions.length;
    c.accuracy = n ? c.decisions.reduce((s, d) => s + d.q, 0) / (3 * n) : 0;
    c.csat = computeCsat(c);
    if (src && src.sys) pushMsg(c, { from: 'system', kind: 'agent-ended', text: src.sys });
    pushMsg(c, { from: 'system', kind: 'ended', outcome, csat: c.csat, text: 'Chat ended' });
    emit('end', c);
  }

  function computeCsat(c) {
    if (c.outcome === 'abandoned') return 1;
    if (c.outcome === 'unresolved') return c.accuracy >= 0.6 ? 2 : 1;
    const s = 0.7 * c.accuracy + 0.3 * (c.patience / 100);
    return s >= 0.88 ? 5 : s >= 0.72 ? 4 : s >= 0.55 ? 3 : s >= 0.38 ? 2 : 1;
  }

  E.wrapUp = function (id, code) {
    const c = E.get(id);
    if (!c || c.status !== 'ended') return;
    c.disposition = code;
    c.dispOk = c.correctDisp.indexOf(code) !== -1;
    c.status = 'closed';
    c.closedAt = E.st.clock;
    pushMsg(c, { from: 'system', kind: 'closed', code, ok: c.dispOk, text: 'Conversation closed' });
    emit('closed', c);
    checkEnd();
  };

  function checkEnd() {
    const st = E.st;
    if (st.convs.every(c => c.status === 'closed')) {
      st.running = false;
      st.ended = true;
      emit('dayEnd', E.report());
    }
  }

  /* ---------- scoring ---------- */
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  E.report = function () {
    const st = E.st;
    const cs = st.convs;
    const n = cs.length;
    const resolved = cs.filter(c => c.outcome === 'resolved').length;
    const abandoned = cs.filter(c => c.outcome === 'abandoned').length;
    const avgCsat = avg(cs.map(c => c.csat || 1));
    const acc = avg(cs.map(c => c.accuracy || 0));
    const wrap = cs.filter(c => c.dispOk).length / n;
    const frt = avg(cs.filter(c => c.firstResponse != null).map(c => c.firstResponse));
    const art = avg([].concat.apply([], cs.map(c => c.responseTimes)));
    const score = Math.round(
      0.45 * ((avgCsat - 1) / 4) * 100 +
      0.30 * acc * 100 +
      0.15 * (resolved / n) * 100 +
      0.10 * wrap * 100
    );
    const stars = score >= 90 ? 3 : score >= 75 ? 2 : score >= 60 ? 1 : 0;
    return { n, day: st.day, resolved, abandoned, avgCsat, acc, wrap, frt, art, score, stars, passed: score >= 60, convs: cs, duration: st.clock };
  };

  E.liveStats = function () {
    const st = E.st;
    if (!st) return null;
    const arrived = st.convs.filter(c => c.arrived);
    const done = st.convs.filter(c => c.csat != null);
    return {
      total: st.convs.length,
      open: arrived.filter(c => c.status !== 'closed').length,
      waiting: arrived.filter(c => c.status === 'agent').length,
      closed: st.convs.filter(c => c.status === 'closed').length,
      csat: done.length ? avg(done.map(c => c.csat)) : null
    };
  };
})();
