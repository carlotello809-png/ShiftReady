/* The scenario validator (tools/validate-scenarios.js).
   Each broken case below changes one thing in a valid synthetic world and checks
   that the validator reports exactly that problem, as an error or as a warning.
   The last group shows, by running the engine, that the "errors" really break a chat. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('../tools/validate-scenarios');
const { loadData } = require('../tools/browser-sandbox');
const { createSim } = require('./helpers/sim');
const { world, scenario } = require('./helpers/synthetic');

const codes = list => list.map(x => x.code);
const one = (mutate, extra) => {
  const w = world(extra);
  mutate(w, w.scenarios[0], w.scenarios[0].nodes);
  return validate(w);
};

test('el mundo sintético válido no tiene errores ni advertencias', () => {
  const res = validate(world());
  assert.deepEqual(res.errors, []);
  assert.deepEqual(res.warnings, []);
  assert.deepEqual(res.scenarios.map(s => [s.id, s.nodes, s.options, s.endings]), [['d1-ana', 4, 8, 2]]);
});

test('los 25 casos reales: 0 errores y solo la advertencia conocida de d2-harold', () => {
  const res = validate(loadData());
  assert.equal(res.scenarios.length, 25);
  assert.deepEqual(res.errors, []);
  assert.deepEqual(res.warnings.map(w => [w.code, w.scenario, w.where]), [['W_REPLY_CAPPED', 'd2-harold', 'replyIn']]);
});

test.describe('Errores (rompen un chat o la pantalla)', () => {
  const cases = [
    ['id repetido', w => w.scenarios.push(scenario()), 'E_DUPLICATE_ID'],
    ['falta el id', (w, s) => { delete s.id; }, 'E_REQUIRED'],
    ['falta arrive', (w, s) => { delete s.arrive; }, 'E_REQUIRED'],
    ['arrive negativo', (w, s) => { s.arrive = -5; }, 'E_REQUIRED'],
    ['day como texto', (w, s) => { s.day = '1'; }, 'E_REQUIRED'],
    ['día inexistente', (w, s) => { s.day = 9; }, 'E_UNKNOWN_DAY'],
    ['tipo de cliente inexistente', (w, s) => { s.persona = 'grumpy'; }, 'E_UNKNOWN_PERSONA'],
    ['canal inexistente', (w, s) => { s.channel = 'email'; }, 'E_UNKNOWN_CHANNEL'],
    ['prioridad que no es texto', (w, s) => { s.priority = 2; }, 'E_REQUIRED'],
    ['falta el nombre del cliente', (w, s) => { delete s.customer.first; }, 'E_REQUIRED'],
    ['política inexistente', (w, s) => { s.policies = ['conduct', 'nope']; }, 'E_UNKNOWN_POLICY'],
    ['falta disp', (w, s) => { delete s.disp; }, 'E_REQUIRED'],
    ['disp vacío', (w, s) => { s.disp = []; }, 'E_DISP'],
    ['disp con código inexistente', (w, s) => { s.disp = ['refundd']; }, 'E_DISP'],
    ['disp de opción con código inexistente', (w, s, n) => { n.m.o[3].disp = ['x']; }, 'E_DISP'],
    ['nodo inicial inexistente', (w, s) => { s.start = 'begin'; }, 'E_BAD_START'],
    ['sin nodos', (w, s) => { s.nodes = {}; }, 'E_REQUIRED'],
    ['go a un nodo inexistente', (w, s, n) => { n.s.o[1].go = 'mm'; }, 'E_BROKEN_REF'],
    ['opción sin destino', (w, s, n) => { delete n.s.o[1].go; }, 'E_NO_DESTINATION'],
    ['q = 4', (w, s, n) => { n.s.o[0].q = 4; }, 'E_QUALITY'],
    ['q como texto', (w, s, n) => { n.s.o[0].q = '3'; }, 'E_QUALITY'],
    ['q decimal', (w, s, n) => { n.s.o[0].q = 2.5; }, 'E_QUALITY'],
    ['opción sin texto', (w, s, n) => { n.s.o[1].t = '  '; }, 'E_TEXT'],
    ['nodo sin opciones ni final', (w, s, n) => { delete n.m.o; }, 'E_NO_OPTIONS'],
    ['lista de opciones vacía', (w, s, n) => { n.m.o = []; }, 'E_NO_OPTIONS'],
    ['todas las opciones son retry', (w, s, n) => { n.m.o = [{ q: 1, t: 'a', retry: true, r: ['x'], fb: '' }, { q: 3, t: 'b', retry: true, r: ['y'], fb: '' }]; }, 'E_RETRY_ONLY'],
    ['final con valor desconocido', (w, s, n) => { n.e.end = 'done'; }, 'E_END'],
    ['final de opción con valor desconocido', (w, s, n) => { n.m.o[3].end = 'closed'; }, 'E_END'],
    ['ciclo sin salida', (w, s, n) => { n.s.o[1].go = 'x'; n.x = { c: [], o: [{ q: 3, t: 'to y', go: 'y', fb: '' }] }; n.y = { c: [], o: [{ q: 3, t: 'to x', go: 'x', fb: '' }] }; }, 'E_NO_EXIT'],
    ['ningún camino termina', (w, s, n) => { n.m.o = [{ q: 3, t: 'back', go: 's', fb: '' }]; n.s.o[3].retry = false; n.s.o[3].go = 'm'; }, 'E_NO_ENDING'],
    ['paciencia 0', (w, s) => { s.patience = 0; }, 'E_RANGE'],
    ['paciencia 150', (w, s) => { s.patience = 150; }, 'E_RANGE'],
    ['replyIn 0', (w, s) => { s.replyIn = 0; }, 'E_RANGE'],
    ['mensajes del cliente que no son lista', (w, s, n) => { n.m.c = 'next question'; }, 'E_TYPE'],
    ['reacción con texto vacío', (w, s, n) => { n.s.o[2].r = ['']; }, 'E_TYPE'],
    ['retry que no es booleano', (w, s, n) => { n.s.o[3].retry = 'yes'; }, 'E_TYPE'],
    ['historial con remitente desconocido', (w, s) => { s.history = [{ from: 'robot', text: 'hi', ago: 3 }]; }, 'E_VALUE'],
    ['día sin casos', w => { w.days.push({ n: 2, decay: 0.5 }); }, 'E_EMPTY_DAY'],
    ['falta el código no-resolution', w => { w.dispositions = w.dispositions.filter(d => d.id !== 'no-resolution'); }, 'E_MISSING_DISPOSITION'],
    ['tipo de cliente sin avisos', w => { w.personas.p.nudges = []; }, 'E_TYPE'],
    ['día con decay negativo', w => { w.days[0].decay = -1; }, 'E_TYPE']
  ];
  cases.forEach(([name, mutate, code]) => {
    test(name + ' → ' + code, () => {
      const res = one(mutate);
      assert.ok(codes(res.errors).indexOf(code) !== -1, 'esperaba ' + code + ', obtuve ' + JSON.stringify(codes(res.errors)));
    });
  });

  test('sin SR.data no falla: informa el problema', () => {
    const res = validate(undefined);
    assert.deepEqual(codes(res.errors), ['E_DATA']);
  });
});

test.describe('Advertencias (el simulador funciona, pero conviene revisar)', () => {
  const cases = [
    ['campo con error de escritura en una opción', (w, s, n) => { n.s.o[3].retyr = true; }, 'W_UNKNOWN_FIELD'],
    ['campo desconocido en el caso', (w, s) => { s.patiense = 50; }, 'W_UNKNOWN_FIELD'],
    ['nodo inalcanzable', (w, s, n) => { n.lost = { c: ['?'], end: 'resolved' }; }, 'W_UNREACHABLE_NODE'],
    ['ciclo con salida (permitido)', (w, s, n) => { n.m.o.push({ q: 1, t: 'back', go: 's', fb: '' }); }, 'W_CYCLE'],
    ['nodo final con opciones', (w, s, n) => { n.e.o = [{ q: 3, t: 'x', go: 's', fb: '' }]; }, 'W_IGNORED_FIELD'],
    ['retry que también tiene go', (w, s, n) => { n.s.o[3].go = 'm'; }, 'W_IGNORED_FIELD'],
    ['disp en una opción que no termina', (w, s, n) => { n.s.o[0].disp = ['ok']; }, 'W_IGNORED_FIELD'],
    ['disp en un final sin resolver', (w, s, n) => { n.bad.disp = ['ok']; }, 'W_IGNORED_FIELD'],
    ['retry sin reacción', (w, s, n) => { delete n.s.o[3].r; }, 'W_RETRY_SILENT'],
    ['nodo sin opción excelente', (w, s, n) => { n.m.o[0].q = 2; }, 'W_NO_EXCELLENT'],
    ['marcador desconocido', (w, s, n) => { n.s.o[1].t = 'Hi {name}'; }, 'W_UNKNOWN_PLACEHOLDER'],
    ['id que no sigue la convención', (w, s) => { s.id = 'ana'; }, 'W_ID_PREFIX'],
    ['prioridad sin estilo', (w, s) => { s.priority = 'Critical'; }, 'W_UNKNOWN_PRIORITY'],
    ['opción sin nota del coach', (w, s, n) => { delete n.s.o[1].fb; }, 'W_NO_FEEDBACK'],
    ['producto sin foto', (w, s) => { s.sections = [{ title: 'Order', rows: [{ items: [{ name: 'Mystery box' }] }] }]; }, 'W_NO_PRODUCT_PHOTO'],
    ['texto repetido en un nodo', (w, s, n) => { n.s.o[1].t = n.s.o[2].t; }, 'W_DUPLICATE_OPTION'],
    ['verified con valor raro', (w, s) => { s.verified = 'yes'; }, 'W_VALUE'],
    ['replyIn que el motor recorta', (w, s) => { s.replyIn = 28; }, 'W_REPLY_CAPPED'],
    ['no-resolution listado en disp', (w, s) => { s.disp = ['ok', 'no-resolution']; }, 'W_DISP_NO_RESOLUTION'],
    ['más de 9 opciones', (w, s, n) => { for (let i = 0; i < 6; i++) n.s.o.push({ q: 1, t: 'extra ' + i, go: 'm', fb: '' }); }, 'W_TOO_MANY_OPTIONS']
  ];
  cases.forEach(([name, mutate, code]) => {
    test(name + ' → ' + code + ' (sin errores)', () => {
      const res = one(mutate);
      assert.deepEqual(res.errors, [], 'no debería haber errores');
      assert.ok(codes(res.warnings).indexOf(code) !== -1, 'esperaba ' + code + ', obtuve ' + JSON.stringify(codes(res.warnings)));
    });
  });
});

test.describe('Los errores del validador rompen de verdad el simulador', () => {
  const run = data => {
    const sim = createSim({ data });
    sim.E.startDay(1);
    return sim;
  };

  test('nodo sin opciones: el motor falla en silencio y el chat se queda bloqueado', () => {
    const w = world();
    delete w.scenarios[0].nodes.m.o;
    assert.ok(codes(validate(w).errors).indexOf('E_NO_OPTIONS') !== -1);
    const sim = run(w);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    sim.advance(60000);
    const c = sim.conv('d1-ana');
    assert.equal(c.node, 'm');
    assert.ok(sim.errors().some(e => /\[ShiftReady\] event/.test(e.text)), 'solo queda un error en la consola');
    assert.equal(sim.events.filter(e => e.name === 'turn').length, 1, 'la interfaz nunca recibe el turno del nodo m');
    assert.throws(() => sim.E.send('d1-ana', 0), /Cannot read properties of undefined/, 'responder lanza una excepción');
  });

  test('go a un nodo inexistente: el motor lo da por "resuelto" sin avisar al jugador', () => {
    const w = world();
    w.scenarios[0].nodes.s.o[0].go = 'mm';
    assert.ok(codes(validate(w).errors).indexOf('E_BROKEN_REF') !== -1);
    const sim = run(w);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    const c = sim.conv('d1-ana');
    assert.equal(c.status, 'ended');
    assert.equal(c.outcome, 'resolved');
    assert.ok(sim.errors().some(e => /missing node/.test(e.text)));
  });

  test('q fuera de 0–3: la paciencia se vuelve NaN y el cliente nunca se va', () => {
    const w = world({ decay: 1 });
    w.scenarios[0].nodes.s.o[0].q = 5;
    assert.ok(codes(validate(w).errors).indexOf('E_QUALITY') !== -1);
    const sim = run(w);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    const c = sim.waitForTurn('d1-ana');
    assert.ok(Number.isNaN(c.patience));
    sim.advance(200000);
    assert.equal(c.status, 'agent', 'con paciencia NaN el cliente espera para siempre');
  });

  test('arrive ausente: el cliente nunca llega y el turno no puede terminar', () => {
    const w = world();
    delete w.scenarios[0].arrive;
    assert.ok(codes(validate(w).errors).indexOf('E_REQUIRED') !== -1);
    const sim = run(w);
    sim.advance(120000);
    assert.equal(sim.conv('d1-ana').arrived, false);
  });
});
