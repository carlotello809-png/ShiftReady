/* Test driver for the engine: loads it like the browser does (tools/browser-sandbox.js),
   moves the game clock in 100 ms steps like setInterval(E.tick, 100), and plays shifts
   with simple strategies. Strategies pick options by their index in the scenario file,
   so the shuffled display order never changes which path is taken. */
'use strict';

const crypto = require('crypto');
const { load, seededRandom } = require('../../tools/browser-sandbox');

const TICK = 100;
const HOOKS = ['start', 'pause', 'arrive', 'message', 'typing', 'status', 'turn', 'end', 'closed', 'angry', 'tick', 'dayEnd'];

// Copies values made inside the vm context into plain Node values (for deepStrictEqual)
const isSet = x => Object.prototype.toString.call(x) === '[object Set]';
const plain = v => (v === undefined ? v : JSON.parse(JSON.stringify(v, (k, x) => (isSet(x) ? Array.from(x) : x))));
const round = (v, d) => (typeof v === 'number' ? Number(v.toFixed(d == null ? 6 : d)) : v);

// opts.node: create the engine with require('assets/js/engine.js').createEngine (no browser
// globals) instead of loading it as a browser script. Its console output is not captured.
function createSim(opts) {
  opts = opts || {};
  const seed = opts.seed == null ? 1 : opts.seed;
  let env;
  if (opts.node) {
    const data = opts.data || load().SR.data;
    const clock = { now: 1000 };
    const { createEngine } = require('../../assets/js/engine.js');
    const engine = createEngine({ data, now: () => clock.now, random: seededRandom(seed) });
    env = { SR: { data, engine }, clock, timers: [], logs: [] };
  } else {
    env = load({ engine: true, data: opts.data, seed });
  }
  const E = env.SR.engine;
  const events = [];
  const paths = {};
  let lastReport = null;

  E.settings = Object.assign({ agentName: 'Alex Morgan' }, opts.settings);
  E.hooks = {};
  HOOKS.forEach(name => {
    E.hooks[name] = function (a) {
      if (name === 'dayEnd') lastReport = a;
      if (name !== 'tick' && name !== 'typing') {
        const ev = { name, at: E.st ? E.st.clock : null };
        if (a && typeof a === 'object' && a.id) ev.id = a.id;
        if (name === 'pause') ev.value = a;
        if (name === 'message') ev.from = arguments[1].from;
        events.push(ev);
      }
      if (opts.hooks && opts.hooks[name]) opts.hooks[name].apply(null, arguments);
    };
  });

  const sim = {
    E, SR: env.SR, data: env.SR.data, clock: env.clock, timers: env.timers, logs: env.logs, events, paths,
    get report() { return lastReport; },
    errors: () => env.logs.filter(l => l.level === 'error'),
    conv: id => E.get(id),
    node: c => c.sc.nodes[c.node],

    tick() { env.clock.now += TICK; E.tick(); },
    advance(ms) { for (let t = 0; t < ms; t += TICK) sim.tick(); },
    runUntil(pred, limitMs, what) {
      const limit = limitMs == null ? 600000 : limitMs;
      for (let t = 0; !pred(); t += TICK) {
        if (t > limit) throw new Error('Tiempo agotado esperando: ' + (what || pred.toString()));
        sim.tick();
      }
    },
    waitForTurn(id, limitMs) { sim.runUntil(() => E.get(id) && E.get(id).status === 'agent', limitMs, 'turno de ' + id); return E.get(id); },
    waitForEnd(id, limitMs) { sim.runUntil(() => E.get(id) && E.get(id).status === 'ended', limitMs, 'fin de ' + id); return E.get(id); },

    // Sends option i (index in the scenario file) and remembers the node it was sent from
    send(id, i) {
      const c = E.get(id);
      const at = c ? c.node : null;
      const ok = E.send(id, i);
      if (ok) (paths[id] = paths[id] || []).push(at);
      return ok;
    },

    // Plays a whole shift. strategy: { choose(c) → index, delay(c) → ms to wait, wrap(c) → code, idle }
    playDay(n, strategy, limitMs) {
      const limit = limitMs == null ? 3600000 : limitMs;
      E.startDay(n);
      const st = E.st;
      while (!st.ended) {
        if (st.clock > limit) throw new Error('El turno del día ' + n + ' no terminó en ' + limit / 1000 + ' s');
        for (const c of st.convs) {
          if (c.status === 'agent' && !strategy.idle) {
            const wait = strategy.delay ? strategy.delay(c) : 0;
            if (st.clock - c.turnStart >= wait && !sim.send(c.id, strategy.choose(c))) {
              throw new Error('E.send rechazó la opción elegida en ' + c.id + ' › ' + c.node);
            }
          } else if (c.status === 'ended') {
            E.wrapUp(c.id, strategy.wrap ? strategy.wrap(c) : c.correctDisp[0]);
          }
        }
        if (!st.ended) sim.tick();
      }
      return lastReport;
    },

    // Path of a conversation: node of each reply, then the node where it ended
    pathOf(id) { const c = E.get(id); return (paths[id] || []).concat(c.node); }
  };
  return sim;
}

/* ---------- strategies ---------- */
const available = c => c.sc.nodes[c.node].o.map((o, i) => ({ o, i })).filter(x => !c.used.has(x.i));
const pick = better => c => available(c).reduce((a, b) => (better(b.o.q, a.o.q) ? b : a)).i;
const wrongCode = (sim, c) => sim.data.dispositions.map(d => d.id).find(id => c.correctDisp.indexOf(id) === -1);

const strategies = {
  best: () => ({ choose: pick((a, b) => a > b) }),
  worst: sim => ({ choose: pick((a, b) => a < b), wrap: c => wrongCode(sim, c) }),
  slow: () => ({ choose: pick((a, b) => a > b), delay: () => 20000 }),
  idle: () => ({ idle: true }),
  random: seed => {
    const rnd = seededRandom(seed);
    return {
      choose: c => { const a = available(c); return a[Math.floor(rnd() * a.length)].i; },
      delay: c => Math.floor(rnd() * 16) * 1000,
      wrap: c => (rnd() < 0.8 ? c.correctDisp[0] : 'escalated')
    };
  }
};

/* ---------- traces (for the golden test) ---------- */
function reportSummary(rep) {
  return {
    score: rep.score, stars: rep.stars, passed: rep.passed, n: rep.n, resolved: rep.resolved, abandoned: rep.abandoned,
    avgCsat: round(rep.avgCsat), acc: round(rep.acc), wrap: round(rep.wrap), frt: round(rep.frt, 1), art: round(rep.art, 1), duration: rep.duration
  };
}

function convSummary(sim, c) {
  return plain({
    path: sim.pathOf(c.id), q: c.decisions.map(d => d.q), outcome: c.outcome, csat: c.csat,
    accuracy: round(c.accuracy), patience: round(c.patience), correctDisp: c.correctDisp, dispOk: c.dispOk
  });
}

// Everything the engine produced in a shift, for an exact fingerprint
function fullTrace(sim) {
  const st = sim.E.st;
  return plain({
    events: sim.events,
    report: reportSummary(sim.report),
    convs: st.convs.map(c => ({
      id: c.id, ticket: c.ticket, status: c.status, outcome: c.outcome, csat: c.csat, accuracy: c.accuracy,
      patience: c.patience, nudges: c.nudges, firstResponse: c.firstResponse, responseTimes: c.responseTimes,
      decisions: c.decisions, correctDisp: c.correctDisp, disposition: c.disposition, dispOk: c.dispOk,
      arrivedAt: c.arrivedAt, endedAt: c.endedAt, closedAt: c.closedAt, messages: c.messages
    }))
  });
}
const hash = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');

module.exports = { TICK, createSim, strategies, available, plain, round, reportSummary, convSummary, fullTrace, hash };
