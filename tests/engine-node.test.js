/* The engine used directly from Node.js: const { createEngine } = require('assets/js/engine.js').
   This is the path a future server would use. It must not need browser globals, must not
   start timers on its own, must allow several independent engines in one process, and must
   behave exactly like the browser engine given the same data, clock and random source. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadData } = require('../tools/browser-sandbox');
const { createSim, strategies, fullTrace, hash } = require('./helpers/sim');
const { world } = require('./helpers/synthetic');

const ENGINE = path.join(__dirname, '..', 'assets', 'js', 'engine.js');

test('cargar el motor en Node no usa window ni arranca temporizadores', () => {
  const realSetInterval = global.setInterval;
  let intervals = 0;
  global.setInterval = function () { intervals++; return realSetInterval.apply(this, arguments); };
  try {
    delete require.cache[require.resolve(ENGINE)];
    const mod = require(ENGINE);
    assert.equal(typeof mod.createEngine, 'function');
    assert.equal(typeof global.window, 'undefined');
    assert.equal(typeof global.SR, 'undefined');
    const E = mod.createEngine({ data: world() });
    assert.equal(E.st, null);
    assert.equal(intervals, 0);
  } finally {
    global.setInterval = realSetInterval;
  }
});

test('createEngine sin datos avisa con un error claro', () => {
  const { createEngine } = require(ENGINE);
  assert.throws(() => createEngine(), /createEngine needs opts\.data/);
});

test('varios motores en el mismo proceso no comparten estado', () => {
  const a = createSim({ node: true, data: world(), seed: 1 });
  const b = createSim({ node: true, data: world(), seed: 1 });
  a.E.startDay(1);
  b.E.startDay(1);
  a.waitForTurn('d1-ana');
  b.waitForTurn('d1-ana');
  a.send('d1-ana', 0);                     // a: q3
  b.send('d1-ana', 3);                     // b: q0 retry
  assert.equal(a.conv('d1-ana').patience, 100);
  assert.equal(b.conv('d1-ana').patience, 88);
  a.waitForTurn('d1-ana');
  assert.equal(a.conv('d1-ana').node, 'm');
  assert.equal(b.conv('d1-ana').node, 's');
  a.E.quit();
  assert.equal(a.E.st, null);
  assert.notEqual(b.E.st, null, 'salir de un motor no afecta al otro');
});

test.describe('Mismo resultado exacto en Node y en el navegador', () => {
  const data = loadData();
  for (const n of [1, 3, 5]) {
    for (const s of ['best', 'slow', 'idle']) {
      test('Día ' + n + ' · ' + s, () => {
        const browser = createSim({ seed: 42 + n });
        const node = createSim({ node: true, data, seed: 42 + n });
        browser.playDay(n, strategies[s]());
        node.playDay(n, strategies[s]());
        assert.deepEqual(browser.errors(), []);
        assert.equal(node.report.score, browser.report.score);
        assert.equal(hash(fullTrace(node)), hash(fullTrace(browser)), 'mensajes, tiempos y eventos idénticos');
      });
    }
  }
});
