/* The 25 real cases played from start to finish.
   - best:   always the highest-rated reply, sent at once, correct wrap-up code
   - worst:  always the lowest-rated reply, wrong wrap-up code
   - idle:   never answers (every customer leaves), correct code "no-resolution"
   - random: random replies and waits (many seeds) to look for chats that get stuck
   The expected results follow from the rules, not from running the engine:
   perfect play must score 100, nobody answering must score exactly 10 (only the
   wrap-up share), and the two hand-traced conversations below. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSim, strategies, plain } = require('./helpers/sim');

const DAYS = [1, 2, 3, 4, 5];
const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) < (eps || 1e-9), (msg || '') + ' esperado ≈' + b + ', obtenido ' + a);

test.describe('Juego perfecto: 100 puntos en cada día', () => {
  for (const n of DAYS) {
    test('Día ' + n, () => {
      const sim = createSim({ seed: n });
      const r = sim.playDay(n, strategies.best());
      assert.deepEqual(sim.errors(), []);
      for (const c of sim.E.st.convs) {
        assert.equal(c.outcome, 'resolved', c.id);
        assert.equal(c.accuracy, 1, c.id);
        assert.equal(c.csat, 5, c.id);
        assert.equal(c.dispOk, true, c.id);
        assert.equal(c.sc.nodes[c.node].end, 'resolved', c.id + ' termina en un nodo resuelto');
      }
      assert.equal(r.score, 100);
      assert.equal(r.stars, 3);
      assert.equal(r.passed, true);
      assert.equal(r.resolved, r.n);
      assert.equal(r.abandoned, 0);
    });
  }
});

test.describe('Sin responder: todos se van y el turno vale 10 puntos', () => {
  for (const n of DAYS) {
    test('Día ' + n, () => {
      const sim = createSim({ seed: n });
      const r = sim.playDay(n, strategies.idle());
      assert.deepEqual(sim.errors(), []);
      for (const c of sim.E.st.convs) {
        assert.equal(c.outcome, 'abandoned', c.id);
        assert.equal(c.csat, 1, c.id);
        assert.equal(c.accuracy, 0, c.id);
        assert.equal(c.decisions.length, 0, c.id);
        assert.deepEqual(plain(c.correctDisp), ['no-resolution'], c.id);
        assert.equal(c.patience, 0, c.id);
        assert.equal(c.messages.filter(m => m.nudge).length, 3, c.id + ' recibe los tres avisos');
      }
      assert.equal(r.score, 10);            // 0 CSAT + 0 calidad + 0 resueltos + 10 cierre
      assert.equal(r.stars, 0);
      assert.equal(r.passed, false);
      assert.equal(r.abandoned, r.n);
    });
  }
});

test.describe('Juego pésimo: no se aprueba ningún día', () => {
  for (const n of DAYS) {
    test('Día ' + n, () => {
      const sim = createSim({ seed: n });
      const r = sim.playDay(n, strategies.worst(sim));
      assert.deepEqual(sim.errors(), []);
      assert.equal(r.passed, false, 'puntos: ' + r.score);
      assert.ok(r.score < 60);
      assert.equal(r.wrap, 0);
      sim.E.st.convs.forEach(c => assert.ok(c.accuracy < 0.5, c.id + ' calidad ' + c.accuracy));
    });
  }
});

test.describe('Recorridos calculados a mano', () => {
  test('d1-daniel, mejores respuestas: start → tracking → why → close → end', () => {
    const sim = createSim({ seed: 7 });
    sim.playDay(1, strategies.best());
    const c = sim.conv('d1-daniel');
    assert.deepEqual(plain(sim.pathOf('d1-daniel')), ['start', 'tracking', 'why', 'close', 'end']);
    assert.deepEqual(plain(c.decisions.map(d => d.q)), [3, 3, 3, 3]);
    assert.deepEqual(plain(c.decisions.map(d => d.prompt)), [
      "I ordered some earbuds last week and they still haven't arrived. Can you tell me where they are?",
      '',                                    // tracking no tiene mensaje del cliente: es un seguimiento
      'Why does it take so long?',
      'Got it, that makes sense. Wednesday works for me 👍'
    ]);
    assert.ok(c.decisions.every(d => d.best === null));
    assert.equal(c.outcome, 'resolved');
    assert.deepEqual(plain(c.correctDisp), ['order-status']);
    const customer = c.messages.filter(m => m.from === 'customer').map(m => m.text);
    assert.equal(customer[customer.length - 1], "Nope, that's everything. Thanks for the help, have a good one!");
  });

  test('d1-daniel, peores respuestas: 8 decisiones, calidad 0,25 y CSAT 1 aunque se resuelve', () => {
    const sim = createSim({ seed: 7 });
    sim.playDay(1, strategies.worst(sim));
    const c = sim.conv('d1-daniel');
    // start: q0 retry → q1 · tracking: q0 retry → q1 retry → q2 · why: q0 retry → q1 · close: q1 → end_cold
    assert.deepEqual(plain(sim.pathOf('d1-daniel')), ['start', 'start', 'tracking', 'tracking', 'tracking', 'why', 'why', 'close', 'end_cold']);
    assert.deepEqual(plain(c.decisions.map(d => d.q)), [0, 1, 0, 1, 2, 0, 1, 1]);
    near(c.accuracy, 6 / 24);
    // paciencia: 100 −12 −4 −12 −4 +5 −12 −4 −4 = 53, menos 8 ticks de 100 ms × 0,45 (día) × 0,75 (calm)
    near(c.patience, 53 - 8 * 0.1 * 0.45 * 0.75, 1e-6);
    assert.equal(c.outcome, 'resolved');
    assert.equal(c.csat, 1);               // s = 0.7 × 0.25 + 0.3 × 0.527 = 0.333
    assert.equal(c.dispOk, false);
  });

  test('d5-kyle, cortar el chat sin advertir: final sin resolver con mensaje de sistema', () => {
    const sim = createSim({ seed: 3 });
    sim.E.startDay(5);
    sim.waitForTurn('d5-kyle', 300000);
    sim.send('d5-kyle', 0);                // q3 → insult
    sim.waitForTurn('d5-kyle');
    sim.send('d5-kyle', 3);                // q0 → cut
    const c = sim.waitForEnd('d5-kyle');
    assert.deepEqual(plain(sim.pathOf('d5-kyle')), ['start', 'insult', 'cut']);
    assert.equal(c.outcome, 'unresolved');
    near(c.accuracy, 0.5);
    assert.equal(c.csat, 1);               // sin resolver y calidad < 0,6
    assert.deepEqual(plain(c.correctDisp), ['no-resolution']);
    assert.deepEqual(plain(c.messages.slice(-2).map(m => [m.kind, m.text])), [['agent-ended', 'You ended the chat'], ['ended', 'Chat ended']]);
    assert.ok(c.patience > 55 && c.patience < 60, 'paciencia 62 +10 −12 menos la espera: ' + c.patience);
    assert.deepEqual(sim.errors(), []);
  });
});

test.describe('Partidas aleatorias: ningún chat se queda bloqueado', () => {
  const SEEDS = 12;
  for (const n of DAYS) {
    test('Día ' + n + ' × ' + SEEDS + ' partidas', () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const sim = createSim({ seed: seed * 101 + n });
        const r = sim.playDay(n, strategies.random(seed * 7 + n));
        const tag = 'día ' + n + ', semilla ' + seed;
        assert.deepEqual(sim.errors(), [], tag);
        assert.equal(sim.E.st.ended, true, tag);
        assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100, tag + ' puntos ' + r.score);
        assert.ok([0, 1, 2, 3].indexOf(r.stars) !== -1, tag);
        for (const c of sim.E.st.convs) {
          assert.equal(c.status, 'closed', tag + ' ' + c.id);
          assert.ok(['resolved', 'unresolved', 'abandoned'].indexOf(c.outcome) !== -1, tag + ' ' + c.id);
          assert.ok([1, 2, 3, 4, 5].indexOf(c.csat) !== -1, tag + ' ' + c.id + ' csat ' + c.csat);
          assert.ok(c.accuracy >= 0 && c.accuracy <= 1, tag + ' ' + c.id);
          assert.ok(c.patience >= 0 && c.patience <= 100, tag + ' ' + c.id);
          if (c.outcome !== 'resolved') assert.deepEqual(plain(c.correctDisp), ['no-resolution'], tag + ' ' + c.id);
          if (c.outcome === 'resolved') assert.equal(c.sc.nodes[c.node].end, 'resolved', tag + ' ' + c.id);
        }
      }
    });
  }
});
