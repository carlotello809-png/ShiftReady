/* startDay(n, { pace, seed }): the pressure multipliers and the per-shift seed.
   Without options the engine must behave exactly as before (the golden test covers that);
   here each multiplier is checked on its own with hand-worked numbers. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSim, plain, fullTrace, hash } = require('./helpers/sim');
const { world, scenario } = require('./helpers/synthetic');

const near = (a, b, eps, msg) => assert.ok(Math.abs(a - b) < (eps || 1e-9), (msg || '') + ' esperado ≈' + b + ', obtenido ' + a);

function started(data, dayOpts, simOpts) {
  const sim = createSim(Object.assign({ data: data || world() }, simOpts));
  sim.E.startDay(1, dayOpts);
  return sim;
}

test('sin opciones el ritmo es 1 en todo y no hay semilla', () => {
  const sim = started();
  assert.deepEqual(plain(sim.E.st.pace), { decay: 1, arrive: 1, reply: 1 });
  assert.equal(sim.E.st.seed, null);
});

test('valores no válidos se ignoran y quedan en 1', () => {
  const sim = started(null, { pace: { decay: 0, arrive: -2, reply: NaN, extra: 5 } });
  assert.deepEqual(plain(sim.E.st.pace), { decay: 1, arrive: 1, reply: 1 });
  sim.E.startDay(1, { pace: { decay: '2', arrive: Infinity } });
  assert.deepEqual(plain(sim.E.st.pace), { decay: 1, arrive: 1, reply: 1 });
});

test('decay 0,5: la paciencia baja a la mitad de velocidad', () => {
  const sim = started(world({ decay: 1 }), { pace: { decay: 0.5 } });
  const c = sim.waitForTurn('d1-ana');
  sim.advance(10000);
  near(c.patience, 100 - 0.5 * 10.1);       // 10 s de espera + el tick en que empieza el turno
});

test('decay 1,5: la paciencia baja 1,5 veces más rápido', () => {
  const sim = started(world({ decay: 1 }), { pace: { decay: 1.5 } });
  const c = sim.waitForTurn('d1-ana');
  sim.advance(10000);
  near(c.patience, 100 - 1.5 * 10.1);
});

test('arrive 2: el cliente con arrive 2 s llega a los 1,2 s + 4 s', () => {
  const sim = started(world({ scenarios: [scenario({ arrive: 2 })] }), { pace: { arrive: 2 } });
  sim.advance(5100);
  assert.equal(sim.conv('d1-ana').arrived, false);
  sim.advance(100);
  assert.equal(sim.conv('d1-ana').arrivedAt, 5200);
});

test('arrive 0,5: dos clientes separados 40 s llegan con 20 s de diferencia', () => {
  const data = world({ scenarios: [scenario(), scenario({ id: 'd1-bo', arrive: 40, customer: { first: 'Bo', last: 'Test' } })] });
  const sim = started(data, { pace: { arrive: 0.5 } });
  sim.runUntil(() => sim.conv('d1-bo').arrived, 60000);
  assert.equal(sim.conv('d1-ana').arrivedAt, 1200);
  assert.equal(sim.conv('d1-bo').arrivedAt, 1200 + 20000);
});

test('reply 0,5: el cliente tarda la mitad en contestar (replyIn 10 → 5 s ±20 %)', () => {
  const sim = started(null, { pace: { reply: 0.5 } });
  const c = sim.waitForTurn('d1-ana');
  assert.equal(sim.E.replyIn(c), 5, 'la interfaz muestra el ritmo ya ajustado');
  sim.send('d1-ana', 0);
  const sent = sim.E.st.clock;
  sim.runUntil(() => c.typing, 20000);
  const delay = sim.E.st.clock - sent;
  assert.ok(delay >= 4000 && delay <= 6100, 'empieza a escribir entre 4 y 6 s después: ' + delay);
});

test('reply alto respeta el tope de 30 s del motor', () => {
  const sim = started(world({ scenarios: [scenario({ replyIn: 28 })] }), { pace: { reply: 2 } });
  const c = sim.waitForTurn('d1-ana');
  assert.equal(sim.E.replyIn(c), 56);
  sim.send('d1-ana', 0);
  const sent = sim.E.st.clock;
  sim.runUntil(() => c.typing, 60000);
  assert.ok(sim.E.st.clock - sent <= 30100, 'nunca más de 30 s: ' + (sim.E.st.clock - sent));
});

test.describe('Semilla por turno', () => {
  test('la misma semilla repite exactamente el turno (orden de opciones y tiempos)', () => {
    const a = createSim({ data: world(), seed: 1 });
    const b = createSim({ data: world(), seed: 2 });   // azar del entorno distinto a propósito
    [a, b].forEach(sim => {
      sim.E.startDay(1, { seed: 12345 });
      sim.waitForTurn('d1-ana'); sim.send('d1-ana', 3);
      sim.waitForTurn('d1-ana'); sim.send('d1-ana', 0);
      sim.waitForTurn('d1-ana'); sim.send('d1-ana', 0);
      sim.waitForEnd('d1-ana'); sim.E.wrapUp('d1-ana', 'ok');
    });
    assert.equal(a.E.st.seed, 12345);
    assert.equal(hash(fullTrace(a)), hash(fullTrace(b)));
  });

  test('semillas distintas dan órdenes distintos en algún momento', () => {
    const seen = new Set();
    for (let s = 1; s <= 12; s++) {
      const sim = createSim({ data: world(), seed: 5 });
      sim.E.startDay(1, { seed: s });
      seen.add(JSON.stringify(plain(sim.waitForTurn('d1-ana').order)));
    }
    assert.ok(seen.size > 3, 'órdenes distintos vistos: ' + seen.size);
  });

  test('un turno sin semilla después de uno con semilla vuelve al azar normal', () => {
    const sim = createSim({ data: world(), seed: 5 });
    sim.E.startDay(1, { seed: 7 });
    const seeded = plain(sim.waitForTurn('d1-ana').order);
    sim.E.startDay(1);
    assert.equal(sim.E.st.seed, null);
    const again = createSim({ data: world(), seed: 5 });
    again.E.startDay(1, { seed: 7 });
    assert.deepEqual(plain(again.waitForTurn('d1-ana').order), seeded);
  });
});

test.describe('Turno más corto (o.scenarios)', () => {
  const three = () => world({ scenarios: [
    scenario(),
    scenario({ id: 'd1-bo', arrive: 20, customer: { first: 'Bo', last: 'Test' } }),
    scenario({ id: 'd1-cy', arrive: 40, customer: { first: 'Cy', last: 'Test' } })
  ] });

  test('solo entran los clientes elegidos, en su orden de llegada', () => {
    const sim = started(three(), { scenarios: ['d1-cy', 'd1-bo'] });
    assert.deepEqual(sim.E.st.convs.map(c => c.id), ['d1-bo', 'd1-cy']);
  });

  test('el primero elegido llega al empezar (1,2 s) y los demás guardan su separación', () => {
    const sim = started(three(), { scenarios: ['d1-bo', 'd1-cy'], pace: { arrive: 0.5 } });
    sim.runUntil(() => sim.conv('d1-cy').arrived, 60000);
    assert.equal(sim.conv('d1-bo').arrivedAt, 1200);
    assert.equal(sim.conv('d1-cy').arrivedAt, 1200 + 10000, '20 s de separación × 0,5');
  });

  test('ids que no son del día se ignoran; si ninguno lo es, se juega el día entero', () => {
    const a = started(three(), { scenarios: ['d1-bo', 'nope'] });
    assert.deepEqual(a.E.st.convs.map(c => c.id), ['d1-bo']);
    const b = started(three(), { scenarios: ['nope'] });
    assert.deepEqual(b.E.st.convs.map(c => c.id), ['d1-ana', 'd1-bo', 'd1-cy']);
    const c = started(three(), { scenarios: [] });
    assert.equal(c.E.st.convs.length, 3, 'una lista vacía es el día entero');
  });

  test('el turno corto termina y el informe cuenta solo a los clientes elegidos', () => {
    const sim = started(three(), { scenarios: ['d1-ana'] });
    sim.waitForTurn('d1-ana'); sim.send('d1-ana', 3);
    sim.waitForTurn('d1-ana'); sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana'); sim.send('d1-ana', 0);
    sim.waitForEnd('d1-ana'); sim.E.wrapUp('d1-ana', 'ok');
    sim.runUntil(() => sim.E.st.ended, 30000);
    assert.equal(sim.report.n, 1);
  });
});
