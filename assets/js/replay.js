/* ShiftReady — replays a session launched from the platform, to recompute its result on the server.
   When the platform opens the simulator, each shift runs on fixed 100 ms steps (engine fixedStep)
   and every reply and wrap-up is logged with the step it happened on. A fresh engine fed with the
   same settings, seed and log plays the shift again exactly, so the stored score never depends on
   what the browser claims. Nothing here changes how a shift is played or scored.
   Works in Node.js (tests), Deno (Supabase Edge Function) and the browser. */
(function (root) {
  'use strict';

  const STEP = 100;                       // ms per fixed step, same as the platform driver
  const MAX_STEPS = 36000;                // one hour of game time per shift at most
  const MAX_ACTIONS = 2000;

  /**
   * @param {object} o
   *   data          SR.data (cases, policies…)
   *   createEngine  engine factory (assets/js/engine.js)
   *   sessionApi    assets/js/session.js
   *   launch        { sid, cfg: {days, difficulty, customers, reply}, seed, agentName, createdAt }
   *   days          [{ n, attempt, steps, actions: [[step, 's', convId, optionIndex] | [step, 'w', convId, code]] }]
   * @returns {{ report: object, session: object, issues: string[] }}
   */
  function replay(o) {
    const SS = o.sessionApi;
    const D = o.data;
    const L = o.launch || {};
    const issues = [];
    const s = SS.createSession(L.cfg, { data: D, isUnlocked: () => true }, { seed: Number(L.seed), id: L.sid || 'replay', now: L.createdAt || 'replay' });
    const days = Array.isArray(o.days) ? o.days : [];

    days.forEach((day, di) => {
      const where = 'day ' + (day && day.n) + ' (#' + (di + 1) + ')';
      if (!day || s.days.indexOf(day.n) === -1) { issues.push(where + ': not part of the session'); return; }
      if ((s.attempts[day.n] || 0) !== day.attempt) { issues.push(where + ': attempt ' + day.attempt + ' out of order'); return; }
      if (!Number.isInteger(day.steps) || day.steps < 0 || day.steps > MAX_STEPS) { issues.push(where + ': invalid step count'); return; }
      const acts = Array.isArray(day.actions) ? day.actions : [];
      if (acts.length > MAX_ACTIONS) { issues.push(where + ': too many actions'); return; }

      const E = o.createEngine({ data: D, now: () => 0, random: () => 0.5 });
      E.settings = { agentName: L.agentName || 'Alex Morgan' };
      let ended = null;
      E.hooks = { dayEnd: rep => { ended = rep; } };
      E.startDay(day.n, SS.startOptions(s, day.n));

      let ai = 0;
      let bad = false;
      for (let k = 0; k <= day.steps && !ended && !bad; k++) {
        if (k > 0) E.advance(STEP);
        while (ai < acts.length && !ended) {
          const a = acts[ai];
          if (!Array.isArray(a) || !Number.isInteger(a[0])) { issues.push(where + ': malformed action'); bad = true; break; }
          if (a[0] < k) { issues.push(where + ': actions out of order'); bad = true; break; }
          if (a[0] > k) break;
          ai++;
          if (a[1] === 's') {
            if (!E.send(a[2], a[3])) { issues.push(where + ': reply not possible at step ' + k + ' (' + a[2] + ')'); bad = true; break; }
          } else if (a[1] === 'w') {
            const c = E.get(a[2]);
            if (!c || c.status !== 'ended' || !D.dispositions.some(x => x.id === a[3])) { issues.push(where + ': wrap-up not possible at step ' + k + ' (' + a[2] + ')'); bad = true; break; }
            E.wrapUp(a[2], a[3]);
          } else { issues.push(where + ': unknown action'); bad = true; break; }
        }
      }
      if (bad) return;
      if (!ended) { issues.push(where + ': the shift did not finish with the logged actions'); return; }
      if (ai < acts.length) issues.push(where + ': actions after the end of the shift');
      SS.recordDay(s, ended);
    });

    return { session: s, report: SS.buildReport(s, D), issues };
  }

  // The numbers that decide a result: per-day scores and pass marks, session totals and status
  const essentials = r => (r ? {
    status: r.status, totalScore: r.totalScore, maxScore: r.maxScore, completedDays: r.completedDays,
    perDay: (r.perDay || []).map(d => [d.n, d.score, d.stars, !!d.passed])
  } : null);

  /** Differences between the server's recomputed report and the one the browser sent. */
  function compare(server, client) {
    const a = essentials(server);
    const b = essentials(client);
    const diffs = [];
    if (!b) return ['the browser sent no report'];
    Object.keys(a).forEach(k => {
      if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push(k + ': server ' + JSON.stringify(a[k]) + ' · browser ' + JSON.stringify(b[k]));
    });
    return diffs;
  }

  const api = { STEP, MAX_STEPS, replay, compare, essentials };
  if (root && root.SR) root.SR.replay = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
  else if (root) root.ShiftReadyReplay = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
