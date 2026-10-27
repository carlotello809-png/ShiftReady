/* The real data in assets/js/data/, checked directly (without the validator):
   the 25 cases load, the conversation trees are connected, and index.html loads
   every data file in an order that works. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { ROOT, indexScripts, loadData } = require('../tools/browser-sandbox');

const D = loadData();

test('se cargan 25 casos: 3, 4, 5, 6 y 7 por día', () => {
  assert.equal(D.scenarios.length, 25);
  const perDay = {};
  D.scenarios.forEach(s => { perDay[s.day] = (perDay[s.day] || 0) + 1; });
  assert.deepEqual(perDay, { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 });
  assert.deepEqual(Array.from(D.days, d => d.n), [1, 2, 3, 4, 5]);
});

test('los identificadores son únicos', () => {
  const ids = D.scenarios.map(s => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('cada caso empieza en un nodo existente y todas sus referencias existen', () => {
  for (const s of D.scenarios) {
    assert.ok(s.nodes[s.start], s.id + ': start "' + s.start + '"');
    for (const [id, n] of Object.entries(s.nodes)) {
      for (const [i, o] of (n.o || []).entries()) {
        if (o.go) assert.ok(s.nodes[o.go], s.id + ' › ' + id + '.o[' + i + '].go → "' + o.go + '"');
      }
    }
  }
});

test('cada nodo termina el chat o tiene opciones, y cada opción tiene un único destino y q de 0 a 3', () => {
  let options = 0;
  for (const s of D.scenarios) {
    for (const [id, n] of Object.entries(s.nodes)) {
      const where = s.id + ' › ' + id;
      if (n.end) { assert.ok(['resolved', 'unresolved'].includes(n.end), where); continue; }
      assert.ok(Array.isArray(n.o) && n.o.length > 0, where + ' sin opciones');
      assert.ok(n.o.some(o => !o.retry), where + ' necesita al menos una opción que no sea retry');
      for (const [i, o] of n.o.entries()) {
        options++;
        const dest = [o.go != null, o.retry === true, o.end != null].filter(Boolean).length;
        assert.equal(dest, 1, where + '.o[' + i + '] debe tener exactamente uno de go / retry / end');
        assert.ok([0, 1, 2, 3].includes(o.q), where + '.o[' + i + '].q = ' + o.q);
        assert.ok(typeof o.t === 'string' && o.t.length > 0, where + '.o[' + i + '].t');
      }
    }
  }
  assert.equal(options, 346);
});

test('todos los nodos son alcanzables desde el inicio', () => {
  for (const s of D.scenarios) {
    const seen = new Set([s.start]);
    const todo = [s.start];
    while (todo.length) {
      const n = s.nodes[todo.pop()];
      (n.o || []).forEach(o => { if (o.go && !seen.has(o.go)) { seen.add(o.go); todo.push(o.go); } });
    }
    assert.deepEqual(Object.keys(s.nodes).filter(id => !seen.has(id)), [], s.id);
  }
});

test('los códigos de cierre esperados existen', () => {
  const ids = new Set(D.dispositions.map(d => d.id));
  assert.ok(ids.has('no-resolution'));
  D.scenarios.forEach(s => s.disp.forEach(d => assert.ok(ids.has(d), s.id + ': ' + d)));
});

test('index.html carga todos los archivos de datos, antes del motor y de la interfaz', () => {
  const list = indexScripts();
  const onDisk = fs.readdirSync(path.join(ROOT, 'assets/js/data')).filter(f => f.endsWith('.js')).map(f => 'assets/js/data/' + f);
  onDisk.forEach(f => assert.ok(list.includes(f), f + ' no está en index.html'));
  const data = list.filter(f => f.startsWith('assets/js/data/'));
  assert.equal(data[0], 'assets/js/data/company.js', 'company.js define SR.scenario y va primero');
  const engine = list.indexOf('assets/js/engine.js');
  const ui = list.indexOf('assets/js/ui.js');
  assert.ok(engine > list.indexOf(data[data.length - 1]), 'el motor va después de los datos');
  assert.ok(ui > engine, 'la interfaz va después del motor');
});

test('el validador por línea de comandos termina sin errores', () => {
  const script = path.join(ROOT, 'tools', 'validate-scenarios.js');
  const out = execFileSync(process.execPath, [script], { encoding: 'utf8' });
  assert.match(out, /25 casos · 5 días · 161 nodos · 346 opciones/);
  assert.match(out, /Resultado: 0 errores/);
  const json = JSON.parse(execFileSync(process.execPath, [script, '--json'], { encoding: 'utf8' }));
  assert.deepEqual(json.errors, []);
});
