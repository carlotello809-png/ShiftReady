/* Scoring rules with hand-worked numbers (synthetic world, no patience decay).
   Rules being checked, as they stand in assets/js/engine.js:
     patience after each reply: q3 +10 · q2 +5 · q1 −4 · q0 −12 (kept between 0 and 100)
     reply quality (accuracy) = sum of q / (3 × replies)
     CSAT: left = 1 · unresolved = 2 if accuracy ≥ 0.6, else 1
           resolved: s = 0.7 × accuracy + 0.3 × patience/100 → ≥0.88:5 · ≥0.72:4 · ≥0.55:3 · ≥0.38:2 · else 1
     shift score = round(45 × (avgCsat−1)/4 + 30 × accuracy + 15 × resolved share + 10 × wrap-up share)
     stars: ≥90 ★★★ · ≥75 ★★ · ≥60 ★ · passed when score ≥ 60 */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSim, plain } = require('./helpers/sim');
const { world, scenario } = require('./helpers/synthetic');

const near = (actual, expected, msg, eps) => assert.ok(Math.abs(actual - expected) < (eps || 1e-9), (msg || '') + ' esperado ' + expected + ', obtenido ' + actual);

// Plays the listed option indexes in order and waits for the chat to end
function play(sim, id, picks) {
  picks.forEach(i => { sim.waitForTurn(id); assert.equal(sim.send(id, i), true, 'opción ' + i); });
  return sim.waitForEnd(id);
}
function shift(data, picks, code) {
  const sim = createSim({ data });
  sim.E.startDay(1);
  const c = play(sim, 'd1-ana', picks);
  if (code !== undefined) sim.E.wrapUp('d1-ana', code);
  assert.deepEqual(sim.errors(), []);
  return { sim, c };
}

test.describe('CSAT y calidad de cada conversación', () => {
  test('dos respuestas excelentes: calidad 100 %, paciencia 100, CSAT 5', () => {
    const { c } = shift(world(), [0, 0]);
    assert.deepEqual(plain(c.decisions.map(d => d.q)), [3, 3]);
    assert.equal(c.outcome, 'resolved');
    near(c.accuracy, 1);
    near(c.patience, 100);                 // 100 +10 +10, tope 100
    assert.equal(c.csat, 5);               // s = 0.7 + 0.3 = 1.00
    assert.deepEqual(plain(c.correctDisp), ['ok']);
  });

  test('reintento q0 y luego dos excelentes: calidad 2/3, CSAT 4', () => {
    const { c } = shift(world(), [3, 0, 0]);
    assert.deepEqual(plain(c.decisions.map(d => d.q)), [0, 3, 3]);
    near(c.accuracy, 6 / 9);
    near(c.patience, 100);                 // 100 −12 = 88 → 98 → 108, tope 100
    assert.equal(c.csat, 4);               // s = 0.7 × 0.667 + 0.3 = 0.767
  });

  test('final resuelto por opción con disp propio: calidad 0.5, paciencia 88, CSAT 3', () => {
    const { c } = shift(world(), [0, 3]);
    assert.equal(c.outcome, 'resolved');
    near(c.accuracy, 0.5);                 // (3 + 0) / 6
    near(c.patience, 88);                  // 100 → 100 → 88
    assert.equal(c.csat, 3);               // s = 0.35 + 0.264 = 0.614
    assert.deepEqual(plain(c.correctDisp), ['other'], 'el disp de la opción sustituye al del caso');
  });

  test('q2 y luego q0 con final resuelto: CSAT 2', () => {
    const { c } = shift(world(), [1, 3]);
    near(c.accuracy, 2 / 6);
    near(c.patience, 88);                  // 100 +5 (tope 100) −12
    assert.equal(c.csat, 2);               // s = 0.233 + 0.264 = 0.497
  });

  test('q1 y luego q0 con final resuelto: CSAT 1', () => {
    const { c } = shift(world(), [2, 3]);
    near(c.accuracy, 1 / 6);
    near(c.patience, 84);                  // 100 −4 −12
    assert.equal(c.csat, 1);               // s = 0.117 + 0.252 = 0.369 (< 0.38)
  });

  test('la paciencia inicial del caso cuenta: 50 → 60 → 70 da CSAT 5; 50 → 60 → 48 da CSAT 2', () => {
    const a = shift(world({ scenarios: [scenario({ patience: 50 })] }), [0, 0]).c;
    near(a.patience, 70);
    assert.equal(a.csat, 5);               // s = 0.7 + 0.21 = 0.91
    const b = shift(world({ scenarios: [scenario({ patience: 50 })] }), [0, 3]).c;
    near(b.patience, 48);
    assert.equal(b.csat, 2);               // s = 0.35 + 0.144 = 0.494
  });

  test('sin resolver con calidad ≥ 0.6: CSAT 2 y código esperado "no-resolution"', () => {
    const { c } = shift(world(), [0, 1]);
    assert.equal(c.outcome, 'unresolved');
    near(c.accuracy, 5 / 6);
    assert.equal(c.csat, 2);
    assert.deepEqual(plain(c.correctDisp), ['no-resolution']);
  });

  test('sin resolver con calidad < 0.6: CSAT 1', () => {
    const { c } = shift(world(), [2, 2]);
    assert.equal(c.outcome, 'unresolved');
    near(c.accuracy, 1 / 6);
    assert.equal(c.csat, 1);
  });

  test('sin resolver alrededor del umbral 0.6: 0.5 y 0.556 dan 1; 0.667 da 2', () => {
    const cases = [
      [[0, 2], 3 / 6, 1],                  // q3, q0
      [[3, 0, 1], 5 / 9, 1],               // q0 retry, q3, q2
      [[1, 1], 4 / 6, 2]                   // q2, q2
    ];
    cases.forEach(([picks, acc, csat]) => {
      const { c } = shift(world(), picks);
      assert.equal(c.outcome, 'unresolved');
      near(c.accuracy, acc);
      assert.equal(c.csat, csat, 'calidad ' + acc.toFixed(3));
    });
  });

  // Each pair sits just above and just below one CSAT threshold (s = 0.7 × accuracy + 0.3 × patience/100)
  test('bordes de cada nivel de CSAT (resuelto)', () => {
    const cases = [
      // [paciencia inicial, opciones, calidad, paciencia final, s, CSAT]
      [45, [0, 0], 1, 65, 0.895, 5],             // X +10 +10
      [35, [0, 0], 1, 55, 0.865, 4],
      [77, [3, 0, 0], 2 / 3, 85, 0.72167, 4],    // X −12 +10 +10
      [76, [3, 0, 0], 2 / 3, 84, 0.71867, 3],
      [70, [0, 3], 1 / 2, 68, 0.554, 3],         // X +10 −12
      [68, [0, 3], 1 / 2, 66, 0.548, 2],
      [56, [1, 3], 1 / 3, 49, 0.38033, 2],       // X +5 −12
      [55, [1, 3], 1 / 3, 48, 0.37733, 1]
    ];
    cases.forEach(([start, picks, acc, end, s, csat]) => {
      near(0.7 * acc + 0.3 * end / 100, s, 'la tabla está bien calculada', 1e-5);
      const { c } = shift(world({ scenarios: [scenario({ patience: start })] }), picks);
      assert.equal(c.outcome, 'resolved');
      near(c.accuracy, acc, 'calidad');
      near(c.patience, end, 'paciencia');
      assert.equal(c.csat, csat, 'paciencia inicial ' + start + ', s = ' + s);
    });
  });
});

test.describe('Informe del turno', () => {
  test('todo perfecto y código correcto: 100 puntos, 3 estrellas, aprobado', () => {
    const { sim } = shift(world(), [0, 0], 'ok');
    const r = sim.report;
    assert.ok(r, 'se emitió dayEnd');
    assert.equal(r.score, 100);            // 45 + 30 + 15 + 10
    assert.equal(r.stars, 3);
    assert.equal(r.passed, true);
    assert.equal(r.n, 1);
    assert.equal(r.resolved, 1);
    assert.equal(r.abandoned, 0);
    assert.equal(r.avgCsat, 5);
    assert.equal(r.wrap, 1);
  });

  test('CSAT 4 y calidad 2/3: 79 puntos (2 estrellas); con código erróneo 69 (1 estrella)', () => {
    let r = shift(world(), [3, 0, 0], 'ok').sim.report;
    assert.equal(r.score, 79);             // 33.75 + 20 + 15 + 10 = 78.75
    assert.equal(r.stars, 2);
    assert.equal(r.passed, true);
    r = shift(world(), [3, 0, 0], 'other').sim.report;
    assert.equal(r.score, 69);             // 33.75 + 20 + 15 + 0 = 68.75
    assert.equal(r.wrap, 0);
    assert.equal(r.stars, 1);
    assert.equal(r.passed, true);
  });

  test('el código correcto lo decide el disp de la opción: 63 con "other", 53 con "ok"', () => {
    let r = shift(world(), [0, 3], 'other').sim.report;
    assert.equal(r.score, 63);             // 22.5 + 15 + 15 + 10 = 62.5 → 63
    assert.equal(r.stars, 1);
    r = shift(world(), [0, 3], 'ok').sim.report;
    assert.equal(r.score, 53);             // 52.5 → 53
    assert.equal(r.stars, 0);
    assert.equal(r.passed, false);
  });

  test('chat sin resolver bien cerrado: 15 puntos', () => {
    const r = shift(world(), [2, 2], 'no-resolution').sim.report;
    assert.equal(r.score, 15);             // 0 + 5 + 0 + 10
    assert.equal(r.resolved, 0);
    assert.equal(r.passed, false);
  });

  test('dos clientes, uno perfecto y otro que se va: 55 puntos', () => {
    const data = world({ scenarios: [scenario(), scenario({ id: 'd1-bo', arrive: 1, customer: { first: 'Bo', last: 'Test' }, patience: 5 })], decay: 1 });
    const sim = createSim({ data });
    sim.E.startDay(1);
    play(sim, 'd1-ana', [0, 0]);
    sim.E.wrapUp('d1-ana', 'ok');
    const bo = sim.waitForEnd('d1-bo');    // nadie le responde: con paciencia 5 se va enseguida
    assert.equal(bo.outcome, 'abandoned');
    sim.E.wrapUp('d1-bo', 'no-resolution');
    const r = sim.report;
    assert.equal(r.avgCsat, 3);            // (5 + 1) / 2
    near(r.acc, 0.5);                      // (1 + 0) / 2
    assert.equal(r.resolved, 1);
    assert.equal(r.abandoned, 1);
    assert.equal(r.wrap, 1);
    assert.equal(r.score, 55);             // 22.5 + 15 + 7.5 + 10
    assert.equal(r.stars, 0);
    assert.equal(r.passed, false);
    assert.deepEqual(sim.errors(), []);
  });

  test('tiempos de respuesta: primera a los 3 s y segunda al 1 s → primera 3000 ms, media 2000 ms', () => {
    const sim = createSim({ data: world() });
    sim.E.startDay(1);
    sim.waitForTurn('d1-ana');
    sim.advance(3000);
    sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana');
    sim.advance(1000);
    sim.send('d1-ana', 0);
    const c = sim.waitForEnd('d1-ana');
    assert.equal(c.firstResponse, 3000);
    assert.deepEqual(plain(c.responseTimes), [3000, 1000]);
    sim.E.wrapUp('d1-ana', 'ok');
    assert.equal(sim.report.frt, 3000);
    assert.equal(sim.report.art, 2000);
    assert.equal(sim.report.score, 100, 'el tiempo de respuesta no resta puntos si no baja la paciencia');
  });
});
