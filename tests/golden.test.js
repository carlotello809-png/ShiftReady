/* Characterization test: records what the engine does today and fails if anything changes.
   For 5 days × 4 strategies it keeps a readable summary (path, reply ratings, outcome,
   CSAT, patience, score…) and a SHA-256 fingerprint of the full shift (every message,
   its time, every event). It does not say the behaviour is right — the other tests do
   that — it says the behaviour is the SAME as when the fixture was recorded.

   If a change to the rules or the cases is intentional, record the fixture again:
     PowerShell:  $env:UPDATE_GOLDEN=1; npm test; Remove-Item Env:UPDATE_GOLDEN
     bash:        UPDATE_GOLDEN=1 npm test
   and review the diff of tests/fixtures/engine-golden.json before committing. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { createSim, strategies, reportSummary, convSummary, fullTrace, hash } = require('./helpers/sim');

const FILE = path.join(__dirname, 'fixtures', 'engine-golden.json');
const SEED = 20261102;
const RUNS = [];
[1, 2, 3, 4, 5].forEach(n => ['best', 'worst', 'slow', 'idle'].forEach(s => RUNS.push({ day: n, strategy: s })));

function record(run) {
  const sim = createSim({ seed: SEED + run.day });
  const strategy = run.strategy === 'worst' ? strategies.worst(sim) : strategies[run.strategy]();
  const rep = sim.playDay(run.day, strategy);
  const convs = {};
  sim.E.st.convs.forEach(c => { convs[c.id] = convSummary(sim, c); });
  return { report: reportSummary(rep), convs, trace: hash(fullTrace(sim)), errors: sim.errors().length };
}

const update = process.env.UPDATE_GOLDEN === '1';
const results = {};
RUNS.forEach(run => { results['day' + run.day + '/' + run.strategy] = record(run); });

if (update) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({
    about: 'Huella del comportamiento del motor (tests/golden.test.js). Regenerar solo si el cambio es intencional.',
    seed: SEED,
    runs: results
  }, null, 2) + '\n');
}

test('existe el registro de referencia', () => {
  assert.ok(fs.existsSync(FILE), 'Falta ' + FILE + '. Grábalo con UPDATE_GOLDEN=1 (ver cabecera del archivo).');
});

const golden = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { runs: {} };

test.describe('El motor se comporta igual que en el registro de referencia', () => {
  Object.keys(results).forEach(key => {
    test(key, () => {
      const now = results[key];
      const then = golden.runs[key];
      assert.ok(then, 'No hay referencia para ' + key);
      assert.equal(now.errors, 0, 'errores en consola');
      assert.deepEqual(now.report, then.report, 'resumen del informe');
      assert.deepEqual(now.convs, then.convs, 'resumen de cada conversación');
      assert.equal(now.trace, then.trace, 'huella completa (mensajes, tiempos y eventos)');
    });
  });
});
