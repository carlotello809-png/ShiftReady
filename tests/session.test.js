/* Training sessions (assets/js/session.js): setup checks, the day sequence, the three
   difficulty levels and the session report, played with the real engine and the 25 cases. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../assets/js/session.js');
const { loadData } = require('../tools/browser-sandbox');
const { createSim, strategies, plain } = require('./helpers/sim');

const D = loadData();
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) < (eps || 1e-9), (msg || '') + ' esperado ≈' + b + ', obtenido ' + a);
const ctx = { data: D };

// Plays every day of a session with a strategy and returns the report
function playSession(cfg, strategy, seed) {
  const session = S.createSession(cfg, ctx, { seed: seed || 1, now: '2026-11-02T09:00:00.000Z' });
  for (let n = S.nextDay(session); n != null; n = S.nextDay(session)) {
    const sim = createSim({ seed: 3 });
    const st = typeof strategy === 'function' ? strategy(sim) : strategy;
    sim.E.startDay(n, S.startOptions(session, n));
    playStarted(sim, st);
    S.recordDay(session, sim.report);
  }
  return { session, report: S.buildReport(session, D) };
}
// Same loop as sim.playDay, for a shift that was already started with options
function playStarted(sim, strategy) {
  const st = sim.E.st;
  while (!st.ended) {
    if (st.clock > 3600000) throw new Error('el turno no terminó');
    for (const c of st.convs) {
      if (c.status === 'agent' && !strategy.idle) {
        if (st.clock - c.turnStart >= (strategy.delay ? strategy.delay(c) : 0)) sim.send(c.id, strategy.choose(c));
      } else if (c.status === 'ended') sim.E.wrapUp(c.id, strategy.wrap ? strategy.wrap(c) : c.correctDisp[0]);
    }
    if (!st.ended) sim.tick();
  }
}

test.describe('Niveles de dificultad', () => {
  test('hay tres niveles y el intermedio es la simulación estándar (todo en 1)', () => {
    assert.deepEqual(S.DIFFICULTIES.map(d => d.id), ['easy', 'medium', 'hard']);
    assert.deepEqual(S.difficulty('medium').pace, { decay: 1, arrive: 1, reply: 1 });
    assert.equal(S.difficulty('nope').id, 'medium', 'un nivel desconocido usa el estándar');
  });
  test('fácil baja la presión y difícil la sube, en cada variable', () => {
    const e = S.difficulty('easy').pace, h = S.difficulty('hard').pace;
    assert.ok(e.decay < 1 && e.arrive > 1 && e.reply >= 1);
    assert.ok(h.decay > 1 && h.arrive < 1 && h.reply < 1);
    assert.equal(S.difficulty('easy').coach, 'always');
    assert.equal(S.difficulty('hard').coach, 'hidden');
    assert.equal(S.difficulty('easy').practice, true);
  });
});

test.describe('Configuración de la sesión', () => {
  const locked = n => n <= 2;
  const cases = [
    ['sin días', { days: [], difficulty: 'medium' }, ctx, /at least one day/],
    ['día inexistente', { days: [9], difficulty: 'medium' }, ctx, /Day 9 does not exist/],
    ['día bloqueado', { days: [1, 3], difficulty: 'medium' }, { data: D, isUnlocked: locked }, /Day 3 is locked/],
    ['días repetidos', { days: [1, 1], difficulty: 'medium' }, ctx, /not valid/],
    ['día que no es número', { days: ['2'], difficulty: 'medium' }, ctx, /at least one day|not valid/],
    ['sin dificultad', { days: [1] }, ctx, /Choose a difficulty/],
    ['dificultad desconocida', { days: [1], difficulty: 'extreme' }, ctx, /Choose a difficulty/]
  ];
  cases.forEach(([name, cfg, c, re]) => test('no válida: ' + name, () => {
    const v = S.validateConfig(cfg, c);
    assert.equal(v.ok, false);
    assert.match(v.errors.join(' '), re);
    assert.throws(() => S.createSession(cfg, c), /invalid session/, 'no se puede iniciar');
  }));

  test('todos los días: 5 días y 25 casos', () => {
    const v = S.validateConfig({ days: [1, 2, 3, 4, 5], difficulty: 'hard' }, ctx);
    assert.equal(v.ok, true);
    assert.deepEqual(v.days, [1, 2, 3, 4, 5]);
    assert.equal(v.scenarios, 25);
  });
  test('selección parcial en cualquier orden: días 4 y 2 → [2, 4], 10 casos', () => {
    const v = S.validateConfig({ days: [4, 2], difficulty: 'easy' }, ctx);
    assert.equal(v.ok, true);
    assert.deepEqual(v.days, [2, 4]);
    assert.equal(v.scenarios, 4 + 6);
  });
  test('la sesión recorre solo los días elegidos, en orden', () => {
    const s = S.createSession({ days: [5, 2], difficulty: 'medium' }, ctx, { seed: 9 });
    assert.equal(S.nextDay(s), 2);
    s.results[2] = { n: 2 };
    assert.equal(S.nextDay(s), 5);
    s.results[5] = { n: 5 };
    assert.equal(S.nextDay(s), null);
  });
  test('cada día y cada reintento tiene su propia semilla, siempre la misma', () => {
    const s = S.createSession({ days: [1, 2], difficulty: 'medium' }, ctx, { seed: 42 });
    const a = S.daySeed(s, 1), b = S.daySeed(s, 2);
    assert.notEqual(a, b);
    assert.equal(S.daySeed(S.createSession({ days: [1, 2], difficulty: 'medium' }, ctx, { seed: 42 }), 1), a);
    s.attempts[1] = 1;
    assert.notEqual(S.daySeed(s, 1), a, 'un reintento no repite el mismo orden');
    assert.deepEqual(S.startOptions(s, 2), { pace: { decay: 1, arrive: 1, reply: 1 }, seed: b });
  });
});

test.describe('Qué cambia realmente con la dificultad', () => {
  // d1-daniel espera 20 s: día 1 (0,45/s) × calm (0,75) = 0,3375 puntos por segundo en Intermedio
  ['easy', 'medium', 'hard'].forEach(id => {
    test(id + ': pérdida de paciencia de d1-daniel en 20 s', () => {
      const s = S.createSession({ days: [1], difficulty: id }, ctx, { seed: 5 });
      const sim = createSim({ seed: 1 });
      sim.E.startDay(1, S.startOptions(s, 1));
      const c = sim.waitForTurn('d1-daniel', 120000);
      const p0 = c.patience;
      sim.advance(20000);
      near(p0 - c.patience, 20 * 0.3375 * S.difficulty(id).pace.decay, 1e-6);
    });
  });

  test('llegadas del día 5: d5-ethan (arrive 135 s) llega a 203,7 s en Fácil, 136,2 s en Intermedio y 82,2 s en Difícil', () => {
    const at = {};
    ['easy', 'medium', 'hard'].forEach(id => {
      const s = S.createSession({ days: [5], difficulty: id }, ctx, { seed: 5 });
      const sim = createSim({ seed: 1 });
      sim.E.startDay(5, S.startOptions(s, 5));
      sim.runUntil(() => sim.conv('d5-ethan').arrived, 400000);
      at[id] = sim.conv('d5-ethan').arrivedAt;
    });
    assert.deepEqual(at, { easy: 1200 + 135 * 1500, medium: 1200 + 135 * 1000, hard: 1200 + 135 * 600 });
  });

  test('las mismas respuestas reciben la misma nota en los tres niveles (la evaluación no cambia)', () => {
    const byLevel = {};
    ['easy', 'medium', 'hard'].forEach(id => {
      const { report } = playSession({ days: [1, 2], difficulty: id }, strategies.best(), 11);
      byLevel[id] = report;
      assert.equal(report.totalScore, 200, id + ': el juego perfecto e inmediato vale 100 por día en cualquier nivel');
      assert.equal(report.kpis.acc, 1);
    });
    assert.deepEqual(byLevel.easy.kpis.byQ, byLevel.hard.kpis.byQ);
  });

  test('con un agente que tarda 20 s por respuesta, la presión cambia el resultado: Fácil > Intermedio > Difícil', () => {
    const slow = () => ({ choose: strategies.best().choose, delay: () => 20000 });
    const r = {};
    ['easy', 'medium', 'hard'].forEach(id => { r[id] = playSession({ days: [4], difficulty: id }, slow, 7).report; });
    const score = { easy: r.easy.totalScore, medium: r.medium.totalScore, hard: r.hard.totalScore };
    assert.ok(score.easy > score.medium && score.medium > score.hard, JSON.stringify(score));
    assert.equal(r.easy.kpis.abandoned, 0);
    assert.ok(r.hard.kpis.abandoned >= 1, 'en Difícil algún cliente se va');
    assert.equal(r.easy.kpis.acc, r.hard.kpis.acc, 'las respuestas elegidas valen lo mismo');
  });

  test('en Difícil coinciden más chats esperando a la vez (día 5, 15 s por respuesta)', () => {
    const peak = {};
    ['easy', 'hard'].forEach(id => {
      const s = S.createSession({ days: [5], difficulty: id }, ctx, { seed: 8 });
      const sim = createSim({ seed: 3 });
      sim.E.startDay(5, S.startOptions(s, 5));
      const st = sim.E.st;
      peak[id] = 0;
      const choose = strategies.best().choose;
      while (!st.ended) {
        for (const c of st.convs) {
          if (c.status === 'agent' && st.clock - c.turnStart >= 15000) sim.send(c.id, choose(c));
          else if (c.status === 'ended') sim.E.wrapUp(c.id, c.correctDisp[0]);
        }
        peak[id] = Math.max(peak[id], st.convs.filter(c => c.status === 'agent').length);
        if (!st.ended) sim.tick();
      }
    });
    assert.ok(peak.hard > peak.easy, JSON.stringify(peak));
  });
});

test.describe('Informe de la sesión', () => {
  test('días 1 y 3 perfectos en Intermedio: 200 / 200, aprobado, 8 casos, todas las respuestas excelentes', () => {
    const { report } = playSession({ days: [1, 3], difficulty: 'medium' }, strategies.best(), 3);
    assert.equal(report.status, 'passed');
    assert.equal(report.totalScore, 200);
    assert.equal(report.maxScore, 200);
    assert.equal(report.percent, 1);
    assert.equal(report.plannedDays, 2);
    assert.equal(report.completedDays, 2);
    assert.equal(report.plannedScenarios, 3 + 5);
    assert.equal(report.completedScenarios, 8);
    // Mejor camino del día 1, contado en day1.js: daniel 4 + priya 5 + marcus 5 = 14 respuestas
    assert.equal(report.convs.filter(c => c.day === 1).reduce((s, c) => s + c.decisions.length, 0), 14);
    assert.equal(report.kpis.replies, report.kpis.byQ[3]);
    assert.equal(report.kpis.byQ[0] + report.kpis.byQ[1] + report.kpis.byQ[2], 0);
    assert.deepEqual(report.perDay.map(d => [d.n, d.score, d.passed]), [[1, 100, true], [3, 100, true]]);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.wrapErrors, []);
    assert.ok(report.strengths.some(s => s.title === 'Accurate replies'));
    assert.deepEqual(report.improve, []);
    assert.equal(new Set(report.convs.map(c => c.id)).size, 8, 'el informe incluye todos los casos de la sesión, no solo el último día');
  });

  test('el número de respuestas coincide con las decisiones que registró el motor', () => {
    const { session, report } = playSession({ days: [1, 2, 3], difficulty: 'medium' }, sim => strategies.random(77), 21);
    const fromDays = session.days.reduce((s, n) => s + session.results[n].convs.reduce((t, c) => t + c.decisions.length, 0), 0);
    assert.equal(report.kpis.replies, fromDays);
    assert.equal(report.completedScenarios, 3 + 4 + 5);
  });

  test('día 1 con las peores respuestas: no aprobado, errores ordenados y códigos de cierre erróneos', () => {
    const { report } = playSession({ days: [1], difficulty: 'medium' }, sim => strategies.worst(sim), 3);
    assert.equal(report.status, 'failed');
    assert.ok(report.totalScore < 60);
    assert.ok(report.errors.length > 0 && report.errors.length <= 8);
    assert.ok(report.errors.every(e => e.q <= 1));
    for (let i = 1; i < report.errors.length; i++) assert.ok(report.errors[i - 1].q <= report.errors[i].q, 'primero las peores');
    assert.equal(report.wrapErrors.length, 3);
    assert.ok(report.improve.some(x => x.title === 'Wrap-up codes'));
    assert.ok(report.tips.some(x => /Code what actually happened/.test(x.title)));
  });

  test('sesión a medias: sin criterio de aprobación y con los datos de lo jugado', () => {
    const session = S.createSession({ days: [1, 2], difficulty: 'hard' }, ctx, { seed: 4 });
    const sim = createSim({ seed: 2 });
    sim.E.startDay(1, S.startOptions(session, 1));
    playStarted(sim, strategies.best());
    S.recordDay(session, sim.report);
    const report = S.buildReport(session, D);
    assert.equal(report.status, 'incomplete');
    assert.equal(report.completedDays, 1);
    assert.equal(report.maxScore, 100);
    assert.deepEqual(plain(report.days.map(d => [d.n, d.played])), [[1, true], [2, false]]);
  });

  test('en Fácil la sesión es de práctica: sin aprobado ni suspenso', () => {
    const { report } = playSession({ days: [1], difficulty: 'easy' }, strategies.best(), 3);
    assert.equal(report.status, 'practice');
    assert.equal(report.difficulty.practice, true);
    assert.equal(report.perDay[0].passed, true, 'el resultado del día se sigue viendo');
  });

  test('repetir un día reemplaza su resultado y cuenta el intento', () => {
    const session = S.createSession({ days: [1], difficulty: 'medium' }, ctx, { seed: 4 });
    [strategies.idle(), strategies.best()].forEach((st, i) => {
      const sim = createSim({ seed: i + 1 });
      sim.E.startDay(1, S.startOptions(session, 1));
      playStarted(sim, st);
      S.recordDay(session, sim.report);
    });
    assert.equal(session.attempts[1], 2);
    assert.equal(S.buildReport(session, D).totalScore, 100);
  });

  test('el resultado guardado no contiene referencias al motor (se puede guardar como JSON)', () => {
    const { session } = playSession({ days: [1], difficulty: 'medium' }, strategies.best(), 3);
    const copy = JSON.parse(JSON.stringify(session));
    assert.equal(JSON.stringify(S.buildReport(copy, D)), JSON.stringify(S.buildReport(session, D)));
  });
});
