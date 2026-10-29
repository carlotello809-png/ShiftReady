/* ShiftReady — training sessions
   A session is a set of training days played one after another at one difficulty.
   This file holds the rules that don't need the screen: the difficulty levels, checking a
   setup before it starts, and building the session report from the engine's day reports.
   ui.js drives the screens. Node.js can require this file (tests). */
(function (root) {
  'use strict';

  // Same pass mark the engine uses for a single day (report.passed = score >= 60)
  const PASS_SCORE = 60;

  /* Difficulty changes the pressure and the guidance, never the cases or the scoring.
     pace  → multipliers for engine.startDay (1 = the standard simulation, see engine.js paceOf)
     coach → 'always' shows a coach note after every reply, 'setting' follows the
             Coach notes setting, 'hidden' keeps the notes for the report
     practice → results don't unlock days or change best scores */
  const DIFFICULTIES = [
    {
      id: 'easy', label: 'Easy', practice: true, coach: 'always',
      pace: { decay: 0.6, arrive: 1.5, reply: 1 },
      blurb: 'Learn the cases with time to think.',
      changes: [
        'Customers lose patience 40% more slowly',
        'Customers arrive further apart (×1.5), so fewer chats overlap',
        'A coach note after every reply',
        'Practice: does not unlock days or change best scores'
      ]
    },
    {
      id: 'medium', label: 'Intermediate', practice: false, coach: 'setting',
      pace: { decay: 1, arrive: 1, reply: 1 },
      blurb: 'The standard shift, as each day was designed.',
      changes: [
        'Standard patience and arrival times',
        'Coach notes follow your setting',
        'Counts toward unlocking days and best scores'
      ]
    },
    {
      id: 'hard', label: 'Hard', practice: false, coach: 'hidden',
      pace: { decay: 1.4, arrive: 0.6, reply: 0.75 },
      blurb: 'Busy queue, short tempers, no hints.',
      changes: [
        'Customers lose patience 40% faster',
        'Customers arrive closer together (×0.6) and reply 25% sooner',
        'No coach notes until the report',
        'Counts toward unlocking days and best scores'
      ]
    }
  ];
  const DEFAULT_DIFFICULTY = 'medium';

  // Thresholds for the strengths / areas to improve in the session report.
  // They only choose which comments to show; they never change a score.
  const INSIGHT = {
    accGood: 0.85, accLow: 0.7,          // reply quality
    csatGood: 4.5, csatLow: 3.5,         // average CSAT (1–5)
    wrapGood: 0.9, wrapLow: 0.8,         // share of correct wrap-up codes
    frtGood: 30000, frtLow: 60000,       // average first response (ms)
    policyGood: 0.9, policyLow: 0.7      // reply quality in the cases tagged with a policy
  };

  function difficulty(id) {
    return DIFFICULTIES.find(d => d.id === id) || DIFFICULTIES.find(d => d.id === DEFAULT_DIFFICULTY);
  }

  /* How long customers take to answer you. 'auto' keeps what the difficulty sets;
     the others replace it (engine pace.reply). Slower than normal makes it practice. */
  const REPLY_SPEEDS = [
    { id: 'auto', label: 'Auto', mult: null, blurb: 'Set by the difficulty' },
    { id: 'fast', label: 'Fast', mult: 0.6, blurb: 'Customers answer about 40% sooner' },
    { id: 'normal', label: 'Normal', mult: 1, blurb: 'Each customer’s usual pace' },
    { id: 'slow', label: 'Slow', mult: 1.5, blurb: 'Customers take about 50% longer' }
  ];
  // New shifts start as "Chats + calls"; people can switch to chats only in the gear
  const DEFAULT_SETTINGS = { difficulty: DEFAULT_DIFFICULTY, customers: null, reply: 'auto', mode: 'mixed' };
  function replySpeed(id) { return REPLY_SPEEDS.find(r => r.id === id) || REPLY_SPEEDS[0]; }

  /* Channels of a shift. 'mixed' adds phone calls (engine startDay o.calls): a call rings while
     you handle the chats, and it counts in the score like any other conversation.
     Chats only is the shift as it always was. */
  const MODES = [
    { id: 'chat', label: 'Chats only', blurb: 'Every customer writes to you in the inbox' },
    { id: 'mixed', label: 'Chats + calls', blurb: 'Phone calls ring while you handle your chats' }
  ];
  function mode(id) { return MODES.find(m => m.id === id) || MODES[0]; }

  const uniqSorted = list => Array.from(new Set(list)).sort((a, b) => a - b);
  const scenariosOf = (data, n) => data.scenarios.filter(s => s.day === n).sort((a, b) => a.arrive - b.arrive);
  // How many customers a day will have with this setting (null = all of them)
  const customersFor = (data, n, customers) => Math.min(scenariosOf(data, n).length, customers || Infinity);

  // Same seed → same pick (mulberry32), used to choose which customers come in a shorter shift
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Checks a session setup before it starts.
   * @param {{days: number[], difficulty: string, customers?: number|null, reply?: string}} cfg
   * @param {{data: object, isUnlocked?: function(number): boolean}} ctx
   * @returns {{ok: boolean, errors: string[], days: number[], scenarios: number}}
   */
  function validateConfig(cfg, ctx) {
    const errors = [];
    const data = ctx.data;
    const isUnlocked = ctx.isUnlocked || (() => true);
    const raw = cfg && Array.isArray(cfg.days) ? cfg.days : [];
    const days = uniqSorted(raw.filter(n => Number.isInteger(n)));
    if (!days.length) errors.push('Choose at least one day.');
    days.forEach(n => {
      const d = data.days.find(x => x.n === n);
      if (!d) errors.push('Day ' + n + ' does not exist.');
      else if (!isUnlocked(n)) errors.push('Day ' + n + ' is locked. Pass Day ' + (n - 1) + ' first, or unlock all days.');
      else if (!scenariosOf(data, n).length) errors.push('Day ' + n + ' has no cases.');
    });
    if (raw.length !== days.length || raw.some(n => !Number.isInteger(n))) errors.push('The list of days is not valid.');
    if (!cfg || !DIFFICULTIES.some(d => d.id === cfg.difficulty)) errors.push('Choose a difficulty.');
    const customers = cfg && cfg.customers != null ? cfg.customers : null;
    if (customers !== null && !(Number.isInteger(customers) && customers >= 1)) errors.push('The number of customers must be 1 or more.');
    if (cfg && cfg.reply != null && !REPLY_SPEEDS.some(r => r.id === cfg.reply)) errors.push('Choose a reply speed.');
    if (cfg && cfg.mode != null && !MODES.some(m => m.id === cfg.mode)) errors.push('Choose chats only or chats and calls.');
    const scenarios = days.reduce((s, n) => s + customersFor(data, n, Number.isInteger(customers) ? customers : null), 0);
    return { ok: errors.length === 0, errors, days, scenarios };
  }

  // Why a session is practice (it does not unlock days or change best scores), or [] if it counts.
  // fewer: at least one day is played with fewer customers than it has.
  function practiceReasons(diffId, fewer, replyId) {
    const r = [];
    if (difficulty(diffId).practice) r.push('Easy difficulty');
    if (fewer) r.push('Fewer customers');
    const rs = replySpeed(replyId);
    if (rs.mult != null && rs.mult > 1) r.push('Slow replies');
    return r;
  }
  /** The same reasons for a setup that has not started yet (cfg as in validateConfig). */
  function configPractice(cfg, data) {
    const days = (cfg && cfg.days) || [];
    const fewer = Number.isInteger(cfg.customers) && days.some(n => scenariosOf(data, n).length > cfg.customers);
    return practiceReasons(cfg.difficulty, fewer, cfg.reply);
  }

  /** A new session, or throws if the setup is not valid. */
  function createSession(cfg, ctx, opts) {
    const v = validateConfig(cfg, ctx);
    if (!v.ok) throw new Error('[ShiftReady] invalid session: ' + v.errors.join(' '));
    opts = opts || {};
    const seed = typeof opts.seed === 'number' ? opts.seed >>> 0 : Math.floor(Math.random() * 4294967296);
    const customers = Number.isInteger(cfg.customers) ? cfg.customers : null;
    const reply = replySpeed(cfg.reply).id;
    // Shorter shift: which customers of each day come in (chosen at random, fixed for the session)
    const picks = {};
    if (customers) {
      const rnd = seeded(seed ^ 0x51ED5EED);
      v.days.forEach(n => {
        const all = scenariosOf(ctx.data, n).map(s => s.id);
        if (customers >= all.length) return;
        for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = all[i]; all[i] = all[j]; all[j] = t; }
        picks[n] = all.slice(0, customers);
      });
    }
    const reasons = practiceReasons(cfg.difficulty, Object.keys(picks).length > 0, reply);
    const out = {
      id: opts.id || 's' + seed.toString(36),
      createdAt: opts.now || new Date().toISOString(),
      difficulty: difficulty(cfg.difficulty).id,
      days: v.days,
      scenarios: v.scenarios,
      customers, reply, picks,
      practice: reasons.length > 0, practiceReasons: reasons,
      seed,
      attempts: {},
      results: {},
      endedEarly: false
    };
    // Only "Chats + calls" sessions carry a mode: a chats-only session stays exactly as before
    if (mode(cfg.mode).id === 'mixed') out.mode = 'mixed';
    // Sessions made in the simulator pace chat replies by the day (engine o.dayReplies).
    // Platform launches don't ask for it, so the server replays them with the engine it already has.
    if (cfg.dayReplies) out.dayReplies = true;
    return out;
  }

  /** Practice sessions don't unlock days or change best scores (older saved sessions: Easy only). */
  function isPractice(session) {
    return session.practice != null ? !!session.practice : difficulty(session.difficulty).practice;
  }

  // Seed of one day of the session: repeatable, different for each day and each retry
  function daySeed(session, n) {
    const attempt = session.attempts[n] || 0;
    return (session.seed ^ Math.imul(n, 0x9E3779B1) ^ Math.imul(attempt + 1, 0x85EBCA6B)) >>> 0;
  }

  // Options for engine.startDay: pace from the difficulty (reply speed can replace it),
  // the day's seed and, in a shorter shift, which customers come in
  function startOptions(session, n) {
    const pace = Object.assign({}, difficulty(session.difficulty).pace);
    const rs = replySpeed(session.reply);
    if (rs.mult != null) pace.reply = rs.mult;
    const out = { pace, seed: daySeed(session, n) };
    if (session.picks && session.picks[n]) out.scenarios = session.picks[n].slice();
    if (session.mode === 'mixed') out.calls = true;
    if (session.dayReplies) out.dayReplies = true;
    return out;
  }

  /** The next day still to play, or null when every day has a result. */
  function nextDay(session) {
    const n = session.days.find(d => !session.results[d]);
    return n == null ? null : n;
  }

  /** A compact copy of an engine day report (no references to the scenario objects). */
  function dayResult(rep) {
    const out = {
      n: rep.day.n, title: rep.day.title, level: rep.day.level,
      score: rep.score, stars: rep.stars, passed: rep.passed,
      customers: rep.n, resolved: rep.resolved, abandoned: rep.abandoned,
      avgCsat: rep.avgCsat, acc: rep.acc, wrap: rep.wrap, frt: rep.frt, art: rep.art, duration: rep.duration,
      convs: rep.convs.map(c => Object.assign({
        id: c.id, first: c.sc.customer.first, last: c.sc.customer.last, photo: c.sc.customer.photo || null,
        topic: c.sc.topic, policies: (c.sc.policies || []).slice(),
        outcome: c.outcome, csat: c.csat, accuracy: c.accuracy,
        firstResponse: c.firstResponse, responseTimes: c.responseTimes.slice(),
        disposition: c.disposition, dispOk: c.dispOk, correctDisp: c.correctDisp.slice(),
        decisions: c.decisions.map(d => Object.assign({ prompt: d.prompt, chosen: d.chosen, q: d.q, fb: d.fb, best: d.best, rt: d.rt },
          d.said != null ? { said: d.said, clarity: d.clarity } : null))
      }, c.call ? { call: true, answerTime: c.answerTime == null ? null : c.answerTime, holds: c.holds || 0 } : null))
    };
    if (rep.calls) out.calls = Object.assign({}, rep.calls);
    return out;
  }

  /** Stores the result of a day (a retry replaces the earlier attempt). */
  function recordDay(session, rep) {
    const r = dayResult(rep);
    session.results[r.n] = r;
    session.attempts[r.n] = (session.attempts[r.n] || 0) + 1;
    return r;
  }

  const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  /**
   * The report of a whole session, from the stored day results.
   * Every number comes from what the engine recorded; nothing is estimated.
   */
  function buildReport(session, data) {
    const diff = difficulty(session.difficulty);
    const done = session.days.filter(n => session.results[n]).map(n => session.results[n]);
    const convs = [].concat.apply([], done.map(r => r.convs.map(c => Object.assign({ day: r.n }, c))));
    const decisions = [].concat.apply([], convs.map(c => c.decisions.map(d => Object.assign({ day: c.day, customer: c.first + ' ' + c.last, topic: c.topic, conv: c.id }, d))));
    const plannedScenarios = session.days.reduce((s, n) =>
      s + (session.picks && session.picks[n] ? session.picks[n].length : scenariosOf(data, n).length), 0);
    const totalScore = done.reduce((s, r) => s + r.score, 0);
    const maxScore = done.length * 100;
    const practice = isPractice(session);

    // passed / failed: every included day reaches the day pass mark (no new threshold).
    // incomplete (days left unplayed) and practice (Easy, fewer customers, slower replies) have no pass/fail.
    let status;
    if (done.length < session.days.length) status = 'incomplete';
    else if (practice) status = 'practice';
    else status = done.every(r => r.score >= PASS_SCORE) ? 'passed' : 'failed';

    const byQ = { 3: 0, 2: 0, 1: 0, 0: 0 };
    decisions.forEach(d => { byQ[d.q]++; });
    const k = {
      replies: decisions.length, byQ,
      acc: mean(convs.map(c => c.accuracy || 0)),
      avgCsat: mean(convs.map(c => c.csat || 1)),
      resolved: convs.filter(c => c.outcome === 'resolved').length,
      unresolved: convs.filter(c => c.outcome === 'unresolved').length,
      abandoned: convs.filter(c => c.outcome === 'abandoned').length,
      wrap: convs.length ? convs.filter(c => c.dispOk).length / convs.length : null,
      frt: mean(convs.filter(c => c.firstResponse != null).map(c => c.firstResponse)),
      art: mean([].concat.apply([], convs.map(c => c.responseTimes))),
      duration: done.reduce((s, r) => s + r.duration, 0)
    };
    // Phone calls ("Chats + calls" sessions only)
    const calls = convs.filter(c => c.call);
    if (calls.length) {
      const answered = calls.filter(c => c.answerTime != null);
      k.calls = {
        n: calls.length, answered: answered.length,
        missed: calls.filter(c => c.outcome === 'missed').length,
        hungUp: calls.filter(c => c.outcome === 'abandoned').length,
        avgAnswer: mean(answered.map(c => c.answerTime))
      };
    }

    // Reply quality in the cases tagged with each policy (a case can have several)
    const pol = {};
    convs.forEach(c => c.policies.forEach(key => { (pol[key] = pol[key] || []).push(c.accuracy || 0); }));
    const policies = Object.keys(pol).map(key => ({
      key, title: data.policies[key] ? data.policies[key].title : key,
      summary: data.policies[key] ? data.policies[key].summary : '',
      cases: pol[key].length, acc: mean(pol[key])
    })).sort((a, b) => a.acc - b.acc || b.cases - a.cases);

    const strengths = [], improve = [], tips = [];
    const pct = x => Math.round(x * 100) + '%';
    const secs = ms => Math.round(ms / 1000) + ' s';
    if (convs.length) {
      if (k.acc >= INSIGHT.accGood) strengths.push({ title: 'Accurate replies', detail: pct(k.acc) + ' reply quality across ' + k.replies + ' replies.' });
      else if (k.acc < INSIGHT.accLow) improve.push({ title: 'Reply quality', detail: pct(k.acc) + ' reply quality. ' + (byQ[0] + byQ[1]) + ' of ' + k.replies + ' replies were rated Poor or Needs work.' });
      if (k.avgCsat >= INSIGHT.csatGood) strengths.push({ title: 'Satisfied customers', detail: 'Average CSAT ' + k.avgCsat.toFixed(1) + ' / 5.' });
      else if (k.avgCsat < INSIGHT.csatLow) improve.push({ title: 'Customer satisfaction', detail: 'Average CSAT ' + k.avgCsat.toFixed(1) + ' / 5. CSAT rises with reply quality and with how patient the customer still is at the end.' });
      if (k.abandoned === 0) strengths.push({ title: 'Nobody left the chat', detail: 'Every customer stayed until the end.' });
      else {
        improve.push({ title: 'Customers who left', detail: k.abandoned + ' of ' + convs.length + ' customers ran out of patience and left.' });
        tips.push({ title: 'Answer the longest wait first', detail: 'Sort the inbox by Waiting and watch the patience rings. A quick, accurate first reply buys time.' });
      }
      if (k.calls) {
        if (k.calls.missed === 0) strengths.push({ title: 'Every call answered', detail: k.calls.n + ' of ' + k.calls.n + ' calls picked up' + (k.calls.avgAnswer != null ? ', after ' + secs(k.calls.avgAnswer) + ' on average.' : '.') });
        else {
          improve.push({ title: 'Missed calls', detail: k.calls.missed + ' of ' + k.calls.n + ' calls rang out before you answered.' });
          tips.push({ title: 'Pick up within 20 seconds', detail: 'A call rings five times, then the caller hangs up. Answer first, then put the caller on hold if you need a moment.' });
        }
      }
      if (k.unresolved > 0) {
        improve.push({ title: 'Unresolved chats', detail: k.unresolved + ' chat' + (k.unresolved === 1 ? '' : 's') + ' ended without a resolution.' });
        tips.push({ title: 'Look for the honest way to help', detail: 'The coach notes on the replies that ended those chats show what policy allowed you to offer.' });
      }
      if (k.wrap >= INSIGHT.wrapGood) strengths.push({ title: 'Correct wrap-up codes', detail: pct(k.wrap) + ' of the codes were right.' });
      else if (k.wrap < INSIGHT.wrapLow) {
        improve.push({ title: 'Wrap-up codes', detail: pct(k.wrap) + ' of the codes were right.' });
        tips.push({ title: 'Code what actually happened', detail: 'Chats that end unresolved or where the customer left always take “No resolution / customer left”.' });
      }
      if (k.frt != null && k.frt <= INSIGHT.frtGood) strengths.push({ title: 'Fast first replies', detail: 'First reply after ' + secs(k.frt) + ' on average.' });
      else if (k.frt != null && k.frt > INSIGHT.frtLow) {
        improve.push({ title: 'First response time', detail: 'First reply after ' + secs(k.frt) + ' on average.' });
        tips.push({ title: 'Greet first, then dig in', detail: 'Patience only drops while the customer waits on you — a first reply stops the clock.' });
      }
      policies.filter(p => p.acc >= INSIGHT.policyGood).slice(-3).reverse().forEach(p => strengths.push({ title: p.title, detail: pct(p.acc) + ' reply quality in the ' + p.cases + ' case' + (p.cases === 1 ? '' : 's') + ' that use this policy.' }));
      policies.filter(p => p.acc < INSIGHT.policyLow).slice(0, 3).forEach(p => {
        improve.push({ title: p.title, detail: pct(p.acc) + ' reply quality in the ' + p.cases + ' case' + (p.cases === 1 ? '' : 's') + ' that use this policy.' });
        tips.push({ title: 'Review “' + p.title + '”', detail: p.summary, policy: p.key });
      });
    }

    const errors = decisions.filter(d => d.q <= 1).sort((a, b) => a.q - b.q || a.day - b.day).slice(0, 8);
    const wrapErrors = convs.filter(c => c.dispOk === false).map(c => ({ day: c.day, customer: c.first + ' ' + c.last, topic: c.topic, chosen: c.disposition, expected: c.correctDisp }));

    return {
      id: session.id, createdAt: session.createdAt, seed: session.seed,
      difficulty: { id: diff.id, label: diff.label, practice: diff.practice },
      settings: {
        customers: session.customers || null,
        reply: replySpeed(session.reply).id, replyLabel: replySpeed(session.reply).label,
        practice, practiceReasons: session.practiceReasons ? session.practiceReasons.slice() : (practice ? ['Easy difficulty'] : [])
      },
      mode: session.mode === 'mixed' ? 'mixed' : 'chat',
      days: session.days.map(n => { const d = data.days.find(x => x.n === n); return { n, title: d.title, level: d.level, played: !!session.results[n] }; }),
      plannedDays: session.days.length, completedDays: done.length,
      plannedScenarios, completedScenarios: convs.filter(c => !c.call).length,   // chat customers; calls are in kpis.calls
      totalScore, maxScore, percent: maxScore ? totalScore / maxScore : null,
      passScore: PASS_SCORE, status,
      perDay: done.map(r => ({ n: r.n, title: r.title, level: r.level, score: r.score, stars: r.stars, passed: r.passed, customers: r.customers, resolved: r.resolved, abandoned: r.abandoned, avgCsat: r.avgCsat, acc: r.acc, wrap: r.wrap })),
      kpis: k, policies, strengths: strengths.slice(0, 6), improve: improve.slice(0, 6), tips: tips.slice(0, 5), errors, wrapErrors,
      convs
    };
  }

  const api = {
    PASS_SCORE, DIFFICULTIES, DEFAULT_DIFFICULTY, INSIGHT, REPLY_SPEEDS, DEFAULT_SETTINGS, MODES,
    difficulty, replySpeed, mode, practiceReasons, configPractice, isPractice, validateConfig, createSession,
    daySeed, startOptions, nextDay, dayResult, recordDay, buildReport
  };
  if (root && root.SR) root.SR.session = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : null);
