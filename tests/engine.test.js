/* Engine behaviour on the synthetic world: what each agent turn takes and returns,
   retries, pause, patience, nudges, customers leaving, wrap-up, end of shift and
   starting a day again. Expected values are written out explicitly. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSim, plain } = require('./helpers/sim');
const { world, scenario } = require('./helpers/synthetic');

const near = (actual, expected, eps, msg) => assert.ok(Math.abs(actual - expected) < (eps || 1e-9), (msg || '') + ' esperado ≈' + expected + ', obtenido ' + actual);
const texts = (c, from) => plain(c.messages.filter(m => m.from === from).map(m => m.text));

function started(data, opts) {
  const sim = createSim(Object.assign({ data: data || world() }, opts));
  sim.E.startDay(1);
  return sim;
}

test.describe('Inicio del turno', () => {
  test('startDay crea el estado inicial y programa las llegadas', () => {
    const sim = started();
    const st = sim.E.st;
    assert.equal(st.n, 1);
    assert.equal(st.clock, 0);
    assert.equal(st.running, true);
    assert.equal(st.paused, false);
    assert.equal(st.ended, false);
    assert.equal(st.convs.length, 1);
    const c = st.convs[0];
    assert.equal(c.status, 'pending');
    assert.equal(c.patience, 100);
    assert.equal(c.ticket, 20400 + 1 * 120 + 0 * 13);
    assert.deepEqual(plain(sim.events.map(e => e.name)), ['start']);
  });

  test('el cliente llega a los 1,2 s + arrive y escribe antes de que empiece el turno del agente', () => {
    const sim = started(world({ scenarios: [scenario({ arrive: 2 })] }));
    sim.advance(3100);
    assert.equal(sim.conv('d1-ana').arrived, false, 'aún no (llega a 1200 + 2000 ms)');
    sim.advance(100);
    const c = sim.conv('d1-ana');
    assert.equal(c.arrived, true);
    assert.equal(c.arrivedAt, 3200);
    assert.equal(c.status, 'customer');
    assert.deepEqual(plain(c.messages.map(m => m.kind)), ['assigned'], 'sin historial, solo el aviso de asignación');
    sim.waitForTurn('d1-ana');
    assert.deepEqual(texts(c, 'customer'), ['hello']);
    assert.equal(c.node, 's');
  });

  test('los mensajes previos (history) se muestran con su antigüedad', () => {
    const sim = started(world({ scenarios: [scenario({ history: [{ from: 'bot', text: 'Hi {first}', ago: 30 }, { from: 'customer', text: 'help', ago: 10 }] })] }));
    sim.advance(1200);
    const c = sim.conv('d1-ana');
    assert.deepEqual(plain(c.messages.map(m => [m.from, m.text, m.at, m.hist])), [['bot', 'Hi Ana', 1200 - 30000, true], ['customer', 'help', 1200 - 10000, true]]);
  });
});

test.describe('Turno del agente: entradas y salidas', () => {
  test('E.send rechaza envíos fuera de turno, índices inválidos y opciones ya usadas', () => {
    const sim = started();
    assert.equal(sim.E.send('nadie', 0), false, 'conversación inexistente');
    assert.equal(sim.E.send('d1-ana', 0), false, 'el cliente aún no llegó');
    sim.advance(1300);
    assert.equal(sim.conv('d1-ana').status, 'customer');
    assert.equal(sim.E.send('d1-ana', 0), false, 'el cliente está escribiendo');
    sim.waitForTurn('d1-ana');
    assert.equal(sim.E.send('d1-ana', 9), false, 'índice inexistente');
    assert.equal(sim.E.send('d1-ana', -1), false, 'índice negativo');
    assert.equal(sim.E.send('d1-ana', 3), true, 'opción retry');
    sim.waitForTurn('d1-ana');
    assert.equal(sim.E.send('d1-ana', 3), false, 'la opción retry ya se usó');
    assert.deepEqual(sim.errors(), []);
  });

  test('una respuesta produce: mensaje del agente, nota del coach, decisión registrada y turno del cliente', () => {
    const sim = started(null, { settings: { agentName: 'Jamie Lee' } });
    const c = sim.waitForTurn('d1-ana');
    const before = c.messages.length;
    assert.equal(sim.E.send('d1-ana', 0), true);
    const added = plain(c.messages.slice(before).map(m => ({ from: m.from, text: m.text, q: m.q })));
    assert.deepEqual(added, [
      { from: 'agent', text: 'S3 for Ana from Jamie' },
      { from: 'coach', text: 'great', q: 3 }
    ]);
    assert.deepEqual(plain(c.decisions), [{ prompt: 'hello', chosen: 'S3 for Ana from Jamie', q: 3, fb: 'great', best: null, rt: 0 }]);
    assert.equal(c.status, 'customer');
    assert.equal(c.selected, null);
  });

  test('si la respuesta no es la mejor, la decisión guarda la mejor; el nombre por defecto es Alex', () => {
    const sim = createSim({ data: world(), settings: { agentName: undefined } });
    sim.E.settings = {};
    sim.E.startDay(1);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 1);
    assert.deepEqual(plain(sim.conv('d1-ana').decisions[0]), { prompt: 'hello', chosen: 'S2', q: 2, fb: 'good', best: 'S3 for Ana from Alex', rt: 0 });
  });

  test('ir a otro nodo: la reacción (r) llega antes de los mensajes del nodo siguiente', () => {
    const sim = started();
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 2);
    const c = sim.waitForTurn('d1-ana');
    assert.equal(c.node, 'm');
    assert.deepEqual(texts(c, 'customer'), ['hello', 'hmm', 'next question']);
    sim.send('d1-ana', 0);
    assert.equal(c.decisions[1].prompt, 'next question');
  });

  test('retry: el cliente reclama, la opción desaparece y el resto conserva su orden', () => {
    const sim = started();
    const c = sim.waitForTurn('d1-ana');
    assert.deepEqual(plain(c.order).slice().sort(), [0, 1, 2, 3], 'el orden es una permutación de las 4 opciones');
    const order = plain(c.order);
    sim.send('d1-ana', 3);
    sim.waitForTurn('d1-ana');
    assert.equal(c.node, 's', 'sigue en el mismo nodo');
    assert.deepEqual(plain(c.used), [3]);
    assert.deepEqual(plain(c.order), order.filter(i => i !== 3), 'mismo orden, sin la opción usada');
    assert.deepEqual(texts(c, 'customer'), ['hello', 'really?']);
    assert.equal(c.decisions[0].q, 0);
    assert.equal(c.decisions[0].best, 'S3 for Ana from Alex');
  });

  test('E.select marca una opción solo si está disponible y es el turno del agente', () => {
    const sim = started();
    sim.E.select('d1-ana', 0);
    assert.equal(sim.conv('d1-ana').selected, null, 'antes del turno no se puede');
    const c = sim.waitForTurn('d1-ana');
    sim.E.select('d1-ana', 2);
    assert.equal(c.selected, 2);
    sim.send('d1-ana', 3);
    sim.waitForTurn('d1-ana');
    sim.E.select('d1-ana', 3);
    assert.equal(c.selected, null, 'la opción usada no se puede marcar');
  });

  test('mensajes sin leer: cuentan solo si el chat no está abierto (E.activeId)', () => {
    const sim = started();
    const c = sim.waitForTurn('d1-ana');
    assert.equal(c.unread, 1);
    sim.E.activeId = 'd1-ana';
    sim.send('d1-ana', 2);
    sim.waitForTurn('d1-ana');
    assert.equal(c.unread, 1, 'con el chat abierto no suma');
  });

  test('un ciclo intencional (volver a un nodo) muestra otra vez todas sus opciones', () => {
    const sc = scenario();
    sc.nodes.m.o.push({ q: 1, t: 'back', go: 's', fb: '' });
    const sim = started(world({ scenarios: [sc] }));
    const c = sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 3);                 // retry en s
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);                 // s → m
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 4);                 // m → s
    sim.waitForTurn('d1-ana');
    assert.equal(c.node, 's');
    assert.deepEqual(plain(c.used), [], 'al volver al nodo se puede elegir de nuevo cualquier opción');
    assert.equal(c.order.length, 4);
    sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    assert.equal(sim.waitForEnd('d1-ana').outcome, 'resolved');
    assert.deepEqual(plain(sim.pathOf('d1-ana')), ['s', 's', 'm', 's', 'm', 'e']);
  });
});

test.describe('Paciencia, avisos y abandono', () => {
  test('la paciencia baja 1 punto por segundo con day.decay 1 × persona 1 × caso 1', () => {
    const sim = started(world({ decay: 1 }));
    const c = sim.waitForTurn('d1-ana');
    near(c.patience, 99.9, 1e-9, 'el tick en que empieza el turno ya resta 100 ms');
    sim.advance(10000);
    near(c.patience, 89.9);
  });

  test('el multiplicador del caso (decay) se aplica: 0,5 → medio punto por segundo', () => {
    const sim = started(world({ decay: 1, scenarios: [scenario({ decay: 0.5 })] }));
    const c = sim.waitForTurn('d1-ana');
    sim.advance(10000);
    near(c.patience, 100 - 0.5 * 10.1);
  });

  test('mientras escribe el cliente la paciencia no baja', () => {
    const sim = started(world({ decay: 1 }));
    sim.advance(1300);
    const c = sim.conv('d1-ana');
    assert.equal(c.status, 'customer');
    sim.advance(800);
    assert.equal(c.patience, 100);
  });

  test('avisos a 60, 35 y 15 de paciencia; alarma de enojo una vez al bajar de 20; abandono en 0', () => {
    const angryAt = [];
    const sim = started(world({ decay: 1 }), { hooks: { angry: c => angryAt.push(c.patience) } });
    const c = sim.waitForTurn('d1-ana');
    const t0 = sim.E.st.clock;
    sim.runUntil(() => c.messages.some(m => m.nudge), 60000, 'primer aviso');
    assert.ok(c.patience < 60 && c.patience > 57, 'el aviso llega poco después de cruzar 60 (paciencia ' + c.patience + ')');
    sim.advance(98000 - (sim.E.st.clock - t0));
    assert.equal(c.status, 'agent', 'a los 98 s sigue esperando');
    near(c.patience, 100 - 98.1, 1e-6);
    assert.deepEqual(plain(c.messages.filter(m => m.nudge).map(m => m.text)), ['nudge 1', 'nudge 2', 'nudge 3']);
    assert.equal(angryAt.length, 1);
    assert.ok(angryAt[0] <= 20 && angryAt[0] > 19.8, 'la alarma suena al cruzar 20 (paciencia ' + angryAt[0] + ')');
    sim.advance(2000);
    assert.notEqual(c.status, 'agent', 'a los 100 s el cliente se va');
    sim.waitForEnd('d1-ana');
    assert.equal(c.outcome, 'abandoned');
    assert.equal(c.patience, 0);
    assert.equal(c.csat, 1);
    assert.equal(c.accuracy, 0);
    assert.deepEqual(plain(c.correctDisp), ['no-resolution']);
    const tail = plain(c.messages.slice(-3).map(m => [m.from, m.kind || null, m.text]));
    assert.deepEqual(tail, [['customer', null, 'bye now'], ['system', 'left', 'Ana left the conversation'], ['system', 'ended', 'Chat ended']]);
    assert.deepEqual(sim.errors(), []);
  });

  test('los avisos propios del caso sustituyen a los del tipo de cliente', () => {
    const sim = started(world({ decay: 1, scenarios: [scenario({ nudges: ['custom!'], leave: 'gone' })] }));
    const c = sim.waitForTurn('d1-ana');
    sim.waitForEnd('d1-ana', 200000);
    assert.deepEqual(plain(c.messages.filter(m => m.nudge).map(m => m.text)), ['custom!', 'custom!', 'custom!']);
    assert.ok(texts(c, 'customer').indexOf('gone') !== -1);
  });

  test('una respuesta mala que deja la paciencia en 0 hace que el cliente se vaya', () => {
    const sim = started(world({ scenarios: [scenario({ patience: 10 })] }));
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 3);                 // q0: 10 − 12 → 0
    const c = sim.waitForEnd('d1-ana');
    assert.equal(c.outcome, 'abandoned');
    assert.equal(c.decisions.length, 1);
    assert.equal(c.csat, 1);
  });

  test('responder bien sube la paciencia y vuelve a habilitar los avisos que correspondan', () => {
    const sim = started(world({ decay: 1 }));
    const c = sim.waitForTurn('d1-ana');
    sim.runUntil(() => c.nudges === 1, 60000);   // bajó de 60
    sim.send('d1-ana', 0);                         // +10
    sim.waitForTurn('d1-ana');
    assert.ok(c.patience > 60, 'paciencia ' + c.patience);
    assert.equal(c.nudges, 0, 'con más de 60 el próximo aviso vuelve a ser el primero');
  });
});

test.describe('Pausa', () => {
  test('en pausa no corre el reloj, no baja la paciencia y no llegan mensajes', () => {
    const sim = started(world({ decay: 1 }));
    const c = sim.waitForTurn('d1-ana');
    const clock = sim.E.st.clock;
    const patience = c.patience;
    const msgs = c.messages.length;
    sim.E.setPaused(true);
    sim.advance(60000);
    assert.equal(sim.E.st.clock, clock);
    assert.equal(c.patience, patience);
    assert.equal(c.messages.length, msgs);
    sim.E.setPaused(false);
    sim.advance(1000);
    assert.equal(sim.E.st.clock, clock + 1000, 'al reanudar no se cuenta el tiempo en pausa');
    near(c.patience, patience - 1);
    assert.deepEqual(plain(sim.events.filter(e => e.name === 'pause').map(e => e.value)), [true, false]);
  });

  test('la pausa también congela los mensajes que el cliente está escribiendo', () => {
    const sim = started();
    sim.advance(1300);
    const c = sim.conv('d1-ana');
    assert.equal(c.status, 'customer');
    sim.E.setPaused(true);
    sim.advance(30000);
    assert.deepEqual(texts(c, 'customer'), []);
    sim.E.setPaused(false);
    sim.waitForTurn('d1-ana');
    assert.deepEqual(texts(c, 'customer'), ['hello']);
  });

  test('setPaused no hace nada sin turno o con el turno terminado', () => {
    const sim = createSim({ data: world() });
    sim.E.setPaused(true);
    assert.equal(sim.E.st, null);
    sim.E.startDay(1);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    sim.waitForEnd('d1-ana');
    sim.E.wrapUp('d1-ana', 'ok');
    assert.equal(sim.E.st.ended, true);
    sim.E.setPaused(true);
    assert.equal(sim.E.st.paused, false);
    assert.equal(sim.events.filter(e => e.name === 'pause').length, 0);
  });
});

test.describe('Cierre de chats y fin del turno', () => {
  test('wrapUp solo cierra chats terminados; el segundo wrapUp se ignora', () => {
    const sim = started();
    sim.waitForTurn('d1-ana');
    sim.E.wrapUp('d1-ana', 'ok');
    assert.equal(sim.conv('d1-ana').status, 'agent', 'no se puede cerrar un chat activo');
    sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    const c = sim.waitForEnd('d1-ana');
    assert.deepEqual(plain(c.messages.slice(-2).map(m => [m.from, m.kind || null, m.text])), [['customer', null, 'thanks'], ['system', 'ended', 'Chat ended']]);
    sim.E.wrapUp('d1-ana', 'other');
    assert.equal(c.status, 'closed');
    assert.equal(c.disposition, 'other');
    assert.equal(c.dispOk, false);
    sim.E.wrapUp('d1-ana', 'ok');
    assert.equal(c.disposition, 'other', 'el segundo cierre no cambia nada');
    assert.equal(sim.events.filter(e => e.name === 'dayEnd').length, 1);
  });

  test('el turno termina solo cuando todos los chats están cerrados', () => {
    const data = world({ scenarios: [scenario(), scenario({ id: 'd1-bo', arrive: 30, customer: { first: 'Bo', last: 'Test' } })] });
    const sim = started(data);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    sim.waitForEnd('d1-ana');
    sim.E.wrapUp('d1-ana', 'ok');
    assert.equal(sim.E.st.ended, false, 'Bo aún no llegó');
    assert.equal(sim.report, null);
    assert.deepEqual(plain(sim.E.liveStats()), { total: 2, open: 0, waiting: 0, closed: 1, csat: 5 });
    sim.waitForTurn('d1-bo');
    assert.deepEqual(plain(sim.E.liveStats()), { total: 2, open: 1, waiting: 1, closed: 1, csat: 5 });
    sim.send('d1-bo', 0);
    sim.waitForTurn('d1-bo');
    sim.send('d1-bo', 0);
    sim.waitForEnd('d1-bo');
    sim.E.wrapUp('d1-bo', 'ok');
    assert.equal(sim.E.st.ended, true);
    assert.equal(sim.E.st.running, false);
    const r = sim.report;
    assert.equal(r.n, 2);
    assert.equal(r.score, 100);
    assert.equal(r.duration, sim.E.st.clock);
    const clock = sim.E.st.clock;
    sim.advance(5000);
    assert.equal(sim.E.st.clock, clock, 'con el turno terminado el reloj se detiene');
  });

  test('final con mensaje de sistema (sys) en el nodo', () => {
    const sc = scenario();
    sc.nodes.m.o[2].go = 'cut';
    sc.nodes.cut = { c: [], sys: 'You ended the chat', end: 'unresolved' };
    const sim = started(world({ scenarios: [sc] }));
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 2);
    const c = sim.waitForEnd('d1-ana');
    assert.deepEqual(plain(c.messages.slice(-2).map(m => [m.kind, m.text])), [['agent-ended', 'You ended the chat'], ['ended', 'Chat ended']]);
    assert.equal(c.outcome, 'unresolved');
  });
});

test.describe('Repetir el día y salir', () => {
  test('repetir el día empieza de cero, sin arrastrar nada del intento anterior', () => {
    const sim = started(world({ decay: 1 }));
    sim.waitForTurn('d1-ana');
    sim.send('d1-ana', 3);
    sim.advance(1500);                     // el cliente está escribiendo su reacción
    const old = sim.E.st;
    sim.E.startDay(1);
    const st = sim.E.st;
    assert.notEqual(st, old);
    const c = st.convs[0];
    assert.equal(st.clock, 0);
    assert.equal(c.status, 'pending');
    assert.deepEqual(plain(c.messages), []);
    assert.deepEqual(plain(c.decisions), []);
    assert.deepEqual(plain(c.used), []);
    assert.equal(c.patience, 100);
    sim.advance(1100);
    assert.deepEqual(plain(c.messages), [], 'los mensajes pendientes del intento anterior no aparecen');
    sim.waitForTurn('d1-ana');
    assert.deepEqual(texts(c, 'customer'), ['hello']);
    assert.equal(sim.events.filter(e => e.name === 'arrive').length, 2, 'una llegada por intento');
  });

  test('quit borra el turno y las demás funciones dejan de actuar sin fallar', () => {
    const sim = started();
    sim.advance(2000);
    sim.E.quit();
    assert.equal(sim.E.st, null);
    assert.equal(sim.E.get('d1-ana'), null);
    assert.equal(sim.E.liveStats(), null);
    sim.advance(1000);
    sim.E.setPaused(true);
    sim.E.select('d1-ana', 0);
    assert.equal(sim.E.send('d1-ana', 0), false);
    sim.E.wrapUp('d1-ana', 'ok');
    assert.deepEqual(sim.errors(), []);
  });
});

test.describe('Lo que el motor hace al cargarse (efectos laterales)', () => {
  test('arranca un setInterval de 100 ms y publica SR.engine con su API', () => {
    const sim = createSim({ data: world() });
    assert.deepEqual(sim.timers.map(t => t.ms), [100]);
    const api = ['startDay', 'quit', 'setPaused', 'get', 'tick', 'select', 'send', 'wrapUp', 'report', 'liveStats', 'fill', 'replyIn'];
    api.forEach(k => assert.equal(typeof sim.E[k], 'function', k));
    assert.equal(sim.E.st, null);
    assert.equal(sim.E.fill('Hi {first}, I am {agent}'), 'Hi , I am Alex');
    assert.equal(sim.E.replyIn({ sc: {}, persona: { replyIn: 16 } }), 16);
    assert.equal(sim.E.replyIn({ sc: { replyIn: 12 }, persona: { replyIn: 16 } }), 12);
    assert.equal(sim.E.replyIn({ sc: {}, persona: {} }), 15);
  });

  test('los errores dentro de los hooks se registran y no detienen la simulación', () => {
    const sim = createSim({ data: world(), hooks: { turn() { throw new Error('boom'); } } });
    sim.E.startDay(1);
    sim.waitForTurn('d1-ana');
    assert.equal(sim.errors().length, 1);
    assert.match(sim.errors()[0].text, /hook turn/);
    sim.send('d1-ana', 0);
    sim.waitForTurn('d1-ana');
    assert.equal(sim.conv('d1-ana').node, 'm');
  });
});
