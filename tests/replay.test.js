/* Server-side replay of platform sessions (assets/js/replay.js).
   A session is played like the browser does in platform mode: irregular real ticks, pauses,
   the agent acting between ticks, and every reply and wrap-up logged with the engine's step count.
   Replaying only that log (with the same settings and seed) must give the very same report. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../tools/browser-sandbox');
const { createEngine } = require('../assets/js/engine.js');
const SS = require('../assets/js/session.js');
const R = require('../assets/js/replay.js');

const D = load().SR.data;

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Plays the given days (a day can repeat: a retry) as the browser would in platform mode
function playLikeBrowser(cfg, seed, order, style) {
  const s = SS.createSession(cfg, { data: D, isUnlocked: () => true }, { seed, id: 'sess-test', now: 'created' });
  const rnd = mulberry(seed ^ 0xABCD);
  const days = [];
  for (const n of order) {
    const clock = { now: 0 };
    const E = createEngine({ data: D, now: () => clock.now });
    E.settings = { agentName: 'Ana Torres' };
    E.fixedStep = R.STEP;
    let ended = null;
    E.hooks = { dayEnd: rep => { ended = rep; } };
    const log = { n, attempt: s.attempts[n] || 0, actions: [] };
    E.startDay(n, SS.startOptions(s, n));
    const waited = {};
    for (let i = 0; !ended && i < 400000; i++) {
      clock.now += 40 + Math.floor(rnd() * 140);              // setInterval is never exact
      if (i % 701 === 300) E.setPaused(true);                // the agent opens the knowledge base…
      if (i % 701 === 340) E.setPaused(false);
      E.tick();
      if (!E.st || E.st.paused) continue;
      for (const c of E.st.convs) {
        if (c.status === 'agent') {
          waited[c.id] = (waited[c.id] || 0) + 1;
          if (waited[c.id] < 4 + (c.idx % 5) * 3) continue;   // thinking time differs per chat
          const node = c.sc.nodes[c.node];
          const avail = node.o.map((_, j) => j).filter(j => !c.used.has(j));
          const best = avail.reduce((b, j) => (node.o[j].q > node.o[b].q ? j : b), avail[0]);
          const pick = style === 'best' || rnd() < 0.55 ? best : avail[Math.floor(rnd() * avail.length)];
          const k = E.steps;
          if (E.send(c.id, pick)) log.actions.push([k, 's', c.id, pick]);
          waited[c.id] = 0;
        } else if (c.status === 'ended') {
          const wrong = D.dispositions.find(x => c.correctDisp.indexOf(x.id) === -1);
          const code = rnd() < 0.8 ? c.correctDisp[0] : wrong.id;
          const k = E.steps;
          E.wrapUp(c.id, code);
          log.actions.push([k, 'w', c.id, code]);
        }
      }
    }
    assert.ok(ended, 'day ' + n + ' finished in the browser simulation');
    log.steps = E.steps;
    SS.recordDay(s, ended);
    days.push(log);
  }
  return { report: SS.buildReport(s, D), days, launch: { sid: 'sess-test', cfg, seed, agentName: 'Ana Torres', createdAt: 'created' } };
}

const replayOf = played => R.replay({ data: D, createEngine, sessionApi: SS, launch: played.launch, days: played.days });

test('replaying the log gives exactly the same report (two days, standard settings)', () => {
  const played = playLikeBrowser({ days: [1, 2], difficulty: 'medium', customers: null, reply: 'auto' }, 12345, [1, 2]);
  const r = replayOf(played);
  assert.deepEqual(r.issues, []);
  assert.deepEqual(r.report, played.report);
  assert.deepEqual(R.compare(r.report, played.report), []);
});

test('same with fewer customers, hard difficulty and slow replies', () => {
  const played = playLikeBrowser({ days: [3, 4], difficulty: 'hard', customers: 2, reply: 'slow' }, 987654321, [3, 4]);
  const r = replayOf(played);
  assert.deepEqual(r.issues, []);
  assert.deepEqual(r.report, played.report);
});

test('a retried day replays too: the last attempt counts', () => {
  const played = playLikeBrowser({ days: [1, 5], difficulty: 'easy', customers: 3, reply: 'fast' }, 42, [1, 1, 5]);
  assert.equal(played.days[1].attempt, 1);
  const r = replayOf(played);
  assert.deepEqual(r.issues, []);
  assert.deepEqual(r.report, played.report);
});

test('a browser that inflates its score is caught', () => {
  const played = playLikeBrowser({ days: [2], difficulty: 'medium', customers: null, reply: 'auto' }, 777, [2]);
  const fake = JSON.parse(JSON.stringify(played.report));
  fake.totalScore += 30; fake.perDay[0].score += 30;
  const r = replayOf(played);
  assert.ok(R.compare(r.report, fake).length > 0);
});

test('a log changed after the fact gives another result or is rejected', () => {
  const played = playLikeBrowser({ days: [1], difficulty: 'medium', customers: null, reply: 'auto' }, 2024, [1], 'best');
  const tampered = JSON.parse(JSON.stringify(played));
  // swap the first reply for the worst option of that turn
  const first = tampered.days[0].actions.find(a => a[1] === 's');
  first[3] = (first[3] + 1) % 2;
  const r = replayOf(tampered);
  const changed = r.issues.length > 0 || R.compare(r.report, played.report).length > 0 || JSON.stringify(r.report.convs) !== JSON.stringify(played.report.convs);
  assert.ok(changed);
  // settings changed (easier difficulty) do not reproduce the shift either
  const easier = JSON.parse(JSON.stringify(played));
  easier.launch.cfg.difficulty = 'easy';
  const r2 = replayOf(easier);
  assert.ok(r2.issues.length > 0 || JSON.stringify(r2.report.convs) !== JSON.stringify(played.report.convs));
});

test('malformed logs are rejected with a reason, never crash', () => {
  const launch = { sid: 'x', cfg: { days: [1], difficulty: 'medium', customers: null, reply: 'auto' }, seed: 1 };
  const cases = [
    [{ n: 9, attempt: 0, steps: 10, actions: [] }],
    [{ n: 1, attempt: 3, steps: 10, actions: [] }],
    [{ n: 1, attempt: 0, steps: -1, actions: [] }],
    [{ n: 1, attempt: 0, steps: 50, actions: [[10, 'x', 'a', 1]] }],
    [{ n: 1, attempt: 0, steps: 50, actions: [[20, 's', 'nobody', 0], [10, 's', 'nobody', 0]] }],
    [{ n: 1, attempt: 0, steps: 50, actions: [] }]
  ];
  for (const days of cases) {
    const r = R.replay({ data: D, createEngine, sessionApi: SS, launch, days });
    assert.ok(r.issues.length > 0, JSON.stringify(days));
  }
});

test('the data copy bundled in the server function replays exactly the same', () => {
  const played = playLikeBrowser({ days: [1, 4], difficulty: 'medium', customers: 3, reply: 'auto' }, 31337, [1, 4]);
  const bundled = JSON.parse(JSON.stringify({ days: D.days, scenarios: D.scenarios, personas: D.personas, dispositions: D.dispositions, policies: D.policies }));
  const r = R.replay({ data: bundled, createEngine, sessionApi: SS, launch: played.launch, days: played.days });
  assert.deepEqual(r.issues, []);
  // same content (the loader's data lives in another vm realm, so compare the plain JSON)
  assert.equal(JSON.stringify(r.report), JSON.stringify(played.report));
});

test('fixed-step mode only changes how the clock moves, not the shift itself', () => {
  // Same seed, same actions at the same game times: variable ticks of exactly 100 ms and fixed steps agree
  const run = fixed => {
    const clock = { now: 0 };
    const E = createEngine({ data: D, now: () => clock.now });
    E.settings = { agentName: 'Ana' };
    if (fixed) E.fixedStep = 100;
    E.startDay(1, { seed: 5 });
    for (let i = 0; i < 300; i++) { clock.now += 100; E.tick(); }
    return E.st.convs.map(c => [c.id, c.status, c.messages.length, Math.round(c.patience * 1000)]);
  };
  assert.deepEqual(run(true), run(false));
});
