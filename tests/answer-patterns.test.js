/* Surface clues in the replies (tools/answer-patterns.js) and the order on screen.
   No simple rule — the longest, the shortest, the one with the customer's name… — may pick
   the best reply much more often than picking at random. And the on-screen order must
   change nothing: each option keeps its rating, its destination and its reaction. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../tools/answer-patterns');
const { loadData } = require('../tools/browser-sandbox');
const { createSim, strategies, plain } = require('./helpers/sim');

const D = loadData();
const r = analyze(D);
const base = r.rules.random.bestRate;
const MARGIN = 0.08;        // a rule may beat chance by at most 8 points

test('ninguna regla superficial acierta la mejor respuesta mucho más que el azar', () => {
  Object.keys(r.rules).filter(k => k !== 'random' && !r.rules[k].substantive).forEach(k => {
    const x = r.rules[k];
    assert.ok(x.bestRate <= base + MARGIN, x.label + ': ' + Math.round(x.bestRate * 100) + ' % frente a ' + Math.round(base * 100) + ' % al azar');
  });
});

test('la mejor respuesta no tiene una posición fija por longitud', () => {
  const ranks = r.bestRankByLength;
  const three = ['1 de 3', '2 de 3', '3 de 3'].map(k => ranks[k] || 0);
  const total = three.reduce((a, b) => a + b, 0);
  three.forEach((n, i) => assert.ok(n / total >= 0.2, 'en turnos de 3 opciones la mejor es la ' + (i + 1) + 'ª más larga en ' + n + ' de ' + total));
  const longest = Object.keys(ranks).filter(k => k.indexOf('1 de') === 0).reduce((a, k) => a + ranks[k], 0);
  assert.ok(longest / r.turns <= 0.45, 'la mejor es la más larga en ' + longest + ' de ' + r.turns + ' turnos');
});

test('la regla «la que hace una pregunta» se documenta como destreza real, no como pista', () => {
  assert.equal(r.rules.question.substantive, true);
});

test.describe('El orden en pantalla no cambia la nota, el destino ni la reacción', () => {
  // For every opening turn of the 25 cases and many seeds: send the option shown at each position
  test('cada posición mostrada envía exactamente la opción del archivo que le corresponde', () => {
    let checks = 0;
    for (const sc of D.scenarios) {
      for (let seed = 1; seed <= 6; seed++) {
        const sim = createSim({ seed: seed * 31 + sc.day });
        sim.E.startDay(sc.day, { seed: seed * 977 });
        const c = sim.waitForTurn(sc.id, 400000);
        const node = c.sc.nodes[c.node];
        const order = plain(c.order);
        assert.deepEqual(order.slice().sort(), Array.from(node.o, (o, i) => i), sc.id + ': el orden es una permutación');
        const k = seed % order.length;               // a different on-screen position each time
        const i = order[k];
        const o = node.o[i];
        const from = c.node;
        assert.equal(sim.E.send(sc.id, i), true);
        const d = c.decisions[c.decisions.length - 1];
        assert.equal(d.q, o.q, sc.id + ' posición ' + (k + 1) + ': nota');
        assert.equal(d.chosen, sim.E.fill(o.t, c), sc.id + ': texto enviado');
        sim.runUntil(() => c.status !== 'customer', 120000);
        if (o.retry) assert.equal(c.node, from, sc.id + ': un retry se queda en el mismo nodo');
        else if (o.go) assert.equal(c.node, o.go, sc.id + ': destino');
        const said = c.messages.filter(m => m.from === 'customer' && !m.hist).map(m => m.text);
        (o.r || []).forEach(t => assert.ok(said.indexOf(sim.E.fill(t, c)) !== -1, sc.id + ': reacción «' + t + '»'));
        checks++;
      }
    }
    assert.equal(checks, 25 * 6);
  });

  test('la mejor respuesta aparece en cualquier posición con frecuencias parecidas', () => {
    const pos = [0, 0, 0, 0];
    let n = 0;
    for (const sc of D.scenarios.filter(s => s.nodes[s.start].o.length === 4)) {
      for (let seed = 1; seed <= 40; seed++) {
        const sim = createSim({ seed: 7 });
        sim.E.startDay(sc.day, { seed });
        const c = sim.waitForTurn(sc.id, 400000);
        const node = c.sc.nodes[c.node];
        const top = Math.max(...node.o.map(o => o.q));
        pos[plain(c.order).findIndex(i => node.o[i].q === top)]++;
        n++;
      }
    }
    pos.forEach((x, i) => assert.ok(x / n > 0.15 && x / n < 0.35, 'posición ' + (i + 1) + ': ' + x + ' de ' + n));
  });

  test('con semillas distintas (órdenes distintos) las mismas decisiones dan el mismo resultado', () => {
    const runs = [11, 22, 33].map(seed => {
      const sim = createSim({ seed: 3 });
      sim.E.startDay(1, { seed });
      const st = sim.E.st;
      const choose = strategies.best().choose;
      while (!st.ended) {
        for (const c of st.convs) {
          if (c.status === 'agent') sim.send(c.id, choose(c));
          else if (c.status === 'ended') sim.E.wrapUp(c.id, c.correctDisp[0]);
        }
        if (!st.ended) sim.tick();
      }
      return plain({ paths: st.convs.map(c => sim.pathOf(c.id)), q: st.convs.map(c => c.decisions.map(d => d.q)), score: sim.report.score });
    });
    assert.deepEqual(runs[1], runs[0]);
    assert.deepEqual(runs[2], runs[0]);
    assert.equal(runs[0].score, 100);
  });
});
