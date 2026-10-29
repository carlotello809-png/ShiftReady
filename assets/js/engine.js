/* ShiftReady — simulation engine
   Owns the game clock, the event queue, customer typing, patience and scoring.
   The UI listens through SR.engine.hooks. Everything runs on a pausable game clock.
   createEngine() makes an independent engine: the browser creates one for the page
   (SR.engine, driven every 100 ms); Node.js can require this file and create its own,
   passing the data and, optionally, its own clock (now) and random source (random).
   startDay(n, { pace, seed }) can make a shift calmer or tougher (pace) and repeatable (seed);
   without them a shift runs exactly as it always has. */
(function (root) {
  'use strict';

  // Patience change after each reply, by quality (3 excellent … 0 poor)
  const PATIENCE_DELTA = { 3: 10, 2: 5, 1: -4, 0: -12 };
  // Patience levels where a waiting customer sends a "hello??" nudge
  const NUDGE_AT = [60, 35, 15];
  // Below this patience the customer counts as "Angry"
  const ANGRY_AT = 20;

  /* Phone calls: only in "Chats + calls" shifts (startDay o.calls). A chats-only shift never
     reaches any of this, so it plays and scores exactly as before. */
  const RING_MS = 20000;          // a call rings 5 times (assets/audio/ringtone.mp3) before it is missed
  const RING_DECAY = 1.2;         // patience lost per second while the phone rings
  const CALL_SILENCE = 1.6;       // silence on the line drains patience faster than a waiting chat…
  const ON_HOLD = 0.35;           // …and much slower while the caller is on hold
  const CALL_GAP = 25000;         // after a call ends, the next one rings at least this much later
  const SPEAK_MS = 66;            // ms per character a caller takes to say a line (browser voice pace)
  const CALL_NUDGES = ['Hello? Are you still there?', "Hello…? I can't hear anything.", "I'm going to hang up if nobody's there."];
  const CALL_LEAVE = "You know what, I'll call back another time. Goodbye.";
  // Which calls a day gets, by the day's level (data/calls.js: level 1, 2 or 3)
  const CALL_TIER = { Easy: 1, Medium: 2, Hard: 3, Expert: 3 };

  // Pressure of a shift, as multipliers (1 = the standard simulation):
  //   decay  how fast waiting customers lose patience
  //   arrive spacing between customer arrivals (lower = more chats at once)
  //   reply  how long customers take to answer you (lower = they come back sooner)
  function paceOf(p) {
    const out = { decay: 1, arrive: 1, reply: 1 };
    if (p) Object.keys(out).forEach(k => { const v = p[k]; if (typeof v === 'number' && isFinite(v) && v > 0) out[k] = v; });
    return out;
  }

  // Same seed → same sequence (mulberry32): option order and timings repeat exactly
  function seededRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createEngine(opts) {
    opts = opts || {};
    const D = opts.data;
    if (!D) throw new Error('[ShiftReady] createEngine needs opts.data (SR.data)');
    const readClock = opts.now || (() => performance.now());
    const baseRandom = opts.random || (() => Math.random());
    let random = baseRandom;       // a shift started with a seed uses its own sequence

    const E = { st: null, hooks: {}, settings: {}, activeId: null, lastTs: 0, fixedStep: 0, steps: 0, acc: 0 };
    E.RING_MS = RING_MS;           // the screen shows how long a call keeps ringing

    function emit(name) {
      const h = E.hooks[name];
      if (!h) return;
      const args = Array.prototype.slice.call(arguments, 1);
      try { h.apply(null, args); } catch (err) { console.error('[ShiftReady] hook ' + name, err); }
    }

    const rand = (a, b) => a + random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    function shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
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

    function newConv(sc, i, n, call) {
      return {
        id: sc.id, sc, idx: i, call: !!call,
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
      };
    }

    /* ---------- shift lifecycle ---------- */
    // o.pace: see paceOf() · o.seed: number for a repeatable shift
    // o.calls: true (or a number) adds phone calls to the shift; without it there are only chats
    E.startDay = function (n, o) {
      o = o || {};
      const day = D.days.find(d => d.n === n);
      // o.scenarios: play only these cases of the day (a shorter shift); the first of them arrives first.
      // Ids that are not in the day are ignored; if none is, the whole day is played.
      const ofDay = D.scenarios.filter(s => s.day === n).sort((a, b) => a.arrive - b.arrive);
      const only = Array.isArray(o.scenarios) && o.scenarios.length ? new Set(o.scenarios) : null;
      const picked = only ? ofDay.filter(s => only.has(s.id)) : [];
      const scs = picked.length ? picked : ofDay;
      const arriveFrom = picked.length ? scs[0].arrive : 0;
      const seed = typeof o.seed === 'number' && isFinite(o.seed) ? o.seed >>> 0 : null;
      random = seed == null ? baseRandom : seededRandom(seed);
      const st = E.st = { day, n, clock: 0, queue: [], seq: 0, mid: 0, paused: false, running: true, ended: false, convs: [], pace: paceOf(o.pace), seed };
      st.convs = scs.map((sc, i) => newConv(sc, i, n));
      E.activeId = null;
      E.steps = 0;                 // fixed steps played in this shift (see E.tick)
      E.acc = 0;
      // small lead-in so the agent sees an empty inbox for a moment
      st.convs.forEach(c => schedule(1200 + (c.sc.arrive - arriveFrom) * 1000 * st.pace.arrive, () => arrive(c)));
      if (o.calls) addCalls(st, scs, arriveFrom, o.calls);
      E.lastTs = readClock();
      emit('start', st);
    };

    // Calls of the day's level, one after another: the first rings partway through the shift,
    // each next one a while after the previous call ends.
    function addCalls(st, scs, arriveFrom, want) {
      const pool = (Array.isArray(D.calls) ? D.calls : []).filter(k => k.level === (CALL_TIER[st.day.level] || 2));
      if (!pool.length) return;
      const count = Math.min(pool.length, typeof want === 'number' && want >= 1 ? Math.floor(want) : scs.length <= 2 ? 1 : 2);
      const from = st.seed != null ? st.seed % pool.length : 0;    // a repeatable shift always gets the same calls
      for (let k = 0; k < count; k++) st.convs.push(newConv(pool[(from + k) % pool.length], st.convs.length, st.n, true));
      const span = scs.length ? scs[scs.length - 1].arrive - arriveFrom : 0;
      schedule(1200 + (span * 0.4 + 30) * 1000 * st.pace.arrive, ringNext);
    }
    function ringNext() {
      const st = E.st;
      const c = st.convs.find(x => x.call && !x.arrived);
      if (c) arrive(c);
    }

    // The agent picks up a ringing call
    E.answer = function (id) {
      const c = E.get(id);
      if (!c || !c.call || c.status !== 'ringing') return false;
      const st = E.st;
      c.answeredAt = st.clock;
      c.answerTime = st.clock - c.arrivedAt;
      c.firstResponse = c.answerTime;     // a call's first response is picking it up
      pushMsg(c, { from: 'system', kind: 'call-start', text: 'Call connected' });
      enterNode(c, c.sc.start, null, 'first');    // the call is on the line before the screen hears about it
      emit('answer', c);
      return true;
    };

    // Hold: while it's your turn on a call, the caller waits on hold and loses patience slowly
    E.hold = function (id, on) {
      const c = E.get(id);
      on = !!on;
      if (!c || !c.call || c.status !== 'agent' || on === !!c.onHold) return false;
      setHold(c, on);
      return true;
    };
    function setHold(c, on) {
      const st = E.st;
      c.onHold = on;
      if (on) { c.holds = (c.holds || 0) + 1; c.holdAt = st.clock; }
      else c.holdMs = (c.holdMs || 0) + (st.clock - c.holdAt);
      pushMsg(c, { from: 'system', kind: on ? 'hold' : 'resume', text: on ? 'Caller on hold' : 'Call resumed' });
      emit('hold', c);
    }

    function missCall(c) {
      pushMsg(c, { from: 'system', kind: 'missed', text: 'Missed call · ' + c.sc.customer.first + ' hung up after ' + Math.round(RING_MS / 1000) + ' seconds' });
      finish(c, 'missed', {});
    }

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
      const now = readClock();
      let dt = now - (E.lastTs || now);
      E.lastTs = now;
      const st = E.st;
      if (!st || !st.running || st.paused) return;
      dt = Math.min(dt, 500);
      // Fixed-step mode (shifts launched from the platform): the game clock moves in exact steps
      // and E.steps counts them, so the server can replay the shift step by step and get the same result
      if (E.fixedStep) {
        E.acc = (E.acc || 0) + dt;
        while (E.acc >= E.fixedStep && E.st === st && st.running && !st.paused) {
          E.acc -= E.fixedStep;
          E.steps++;
          E.advance(E.fixedStep);
        }
        return;
      }
      E.advance(dt);
    };

    // Moves the game clock forward by dt ms: events due by then happen, then patience decays
    E.advance = function (dt) {
      const st = E.st;
      if (!st || !st.running || st.paused) return;
      st.clock += dt;
      processQueue();
      if (E.st !== st) return;
      decay(dt);
      emit('tick', st);
    };

    /* ---------- patience ---------- */
    function decay(dt) {
      const st = E.st;
      for (const c of st.convs) {
        if (c.status === 'ringing') { c.patience = Math.max(0, c.patience - RING_DECAY * dt / 1000); continue; }
        if (c.status !== 'agent') continue;
        let rate = st.day.decay * c.persona.decay * (c.sc.decay || 1) * st.pace.decay;
        if (c.call) rate *= c.onHold ? ON_HOLD : CALL_SILENCE;
        const before = c.patience;
        c.patience = Math.max(0, c.patience - rate * dt / 1000);
        // The moment a waiting customer turns angry, the UI raises the alarm
        if (before > ANGRY_AT && c.patience <= ANGRY_AT) emit('angry', c);
        if (c.nudges < NUDGE_AT.length && c.patience <= NUDGE_AT[c.nudges]) {
          if (!c.onHold) nudge(c, c.nudges);    // on hold the caller hears music and says nothing
          c.nudges++;
        }
        if (c.patience <= 0) abandon(c);
      }
    }

    function nudge(c, level) {
      const list = c.sc.nudges || (c.call ? CALL_NUDGES : c.persona.nudges);
      const text = fill(list[Math.min(level, list.length - 1)], c);
      const token = c.turnToken;
      const ok = () => c.status === 'agent' && c.turnToken === token;
      if (c.call) {
        // On the phone the caller just speaks up
        schedule(250, () => { if (ok() && !c.onHold) pushMsg(c, { from: 'customer', text, nudge: true, spoken: true }); });
        return;
      }
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
      if (c.onHold) { c.onHold = false; c.holdMs = (c.holdMs || 0) + (E.st.clock - c.holdAt); }
      const text = fill(c.sc.leave || (c.call ? CALL_LEAVE : c.persona.leave), c);
      say(c, [text], () => {
        pushMsg(c, { from: 'system', kind: 'left', text: c.sc.customer.first + (c.call ? ' hung up' : ' left the conversation') });
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
      if (c.call) {
        // The phone rings: answer within RING_MS or the call is missed
        c.status = 'ringing';
        pushMsg(c, { from: 'system', kind: 'ringing', text: 'Incoming call' }, true);
        emit('ring', c);
        schedule(RING_MS, () => { if (c.status === 'ringing') missCall(c); });
        return;
      }
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
    function replyIn(c) { return (c.sc.replyIn || c.persona.replyIn || 15) * (E.st ? E.st.pace.reply : 1); }
    E.replyIn = replyIn;
    function replyDelay(c) { return Math.min(MAX_REPLY_DELAY, replyIn(c) * 1000 * rand(0.8, 1.2)); }

    function enterNode(c, id, pre, mode) {
      const node = c.sc.nodes[id];
      if (!node) { console.error('[ShiftReady] missing node', c.sc.id, id); finish(c, 'resolved', {}); return; }
      c.node = id;
      c.used = new Set();
      c.order = [];
      const msgs = (pre || []).concat(node.c || []);
      const opt = mode === 'first' ? { first: c.call ? rand(500, 900) : rand(1100, 2000) } : mode === 'reply' ? { reply: true } : null;
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
      else if (opt && opt.reply) t = c.call ? rand(600, 1200) : replyDelay(c);   // on the phone people answer right away
      else t = rand(1000, 1800);
      c.replyAt = E.st.clock + t;
      msgs.forEach(raw => {
        const text = fill(raw, c);
        if (c.call) {
          // A caller's line appears as they start saying it (the screen reads it aloud), then they finish
          const dur = clamp(text.length * SPEAK_MS, 1400, 9000);
          schedule(t, () => {
            if (c.flowToken !== token) return;
            c.typing = true;
            pushMsg(c, { from: 'customer', text, spoken: true, dur });
            emit('typing', c);
          });
          t += dur;
          schedule(t, () => { if (c.flowToken !== token) return; c.typing = false; emit('typing', c); });
          t += rand(250, 450);
          return;
        }
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
      if (c.onHold) setHold(c, false);    // speaking to the caller takes them off hold
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
      pushMsg(c, { from: 'system', kind: 'ended', outcome, csat: c.csat, text: c.call ? 'Call ended' : 'Chat ended' });
      emit('end', c);
      if (c.call) schedule(CALL_GAP * st.pace.arrive, ringNext);
    }

    function computeCsat(c) {
      if (c.outcome === 'abandoned' || c.outcome === 'missed') return 1;
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
      // Calls count in the score like any conversation (a missed call scores like a customer who left)
      const calls = cs.filter(c => c.call);
      const callStats = calls.length ? {
        n: calls.length,
        answered: calls.filter(c => c.answeredAt != null).length,
        missed: calls.filter(c => c.outcome === 'missed').length,
        hungUp: calls.filter(c => c.outcome === 'abandoned').length,
        avgAnswer: avg(calls.filter(c => c.answerTime != null).map(c => c.answerTime)),
        holds: calls.reduce((s, c) => s + (c.holds || 0), 0)
      } : null;
      return { n, day: st.day, resolved, abandoned, avgCsat, acc, wrap, frt, art, score, stars, passed: score >= 60, convs: cs, duration: st.clock, calls: callStats };
    };

    E.liveStats = function () {
      const st = E.st;
      if (!st) return null;
      const arrived = st.convs.filter(c => c.arrived);
      const done = st.convs.filter(c => c.csat != null);
      const out = {
        total: st.convs.length,
        open: arrived.filter(c => c.status !== 'closed').length,
        waiting: arrived.filter(c => c.status === 'agent').length,
        closed: st.convs.filter(c => c.status === 'closed').length,
        csat: done.length ? avg(done.map(c => c.csat)) : null
      };
      // Shifts with calls also say how many phones are ringing
      if (st.convs.some(c => c.call)) out.ringing = arrived.filter(c => c.status === 'ringing').length;
      return out;
    };

    return E;
  }

  // Browser: one engine for the page, ticking every 100 ms (same as before)
  if (root && root.SR) {
    root.SR.createEngine = createEngine;
    root.SR.engine = createEngine({ data: root.SR.data });
    setInterval(root.SR.engine.tick, 100);
  }
  // Node.js: const { createEngine } = require('./engine.js')
  if (typeof module === 'object' && module.exports) module.exports = { createEngine };
})(typeof window !== 'undefined' ? window : null);
