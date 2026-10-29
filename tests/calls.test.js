/* Phone calls ("Chats + calls" shifts): ringing, missed calls, answering, hold, scoring,
   and the session setting that turns them on. Chats-only shifts must not change at all
   (golden.test.js checks that bit by bit). */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createSim, plain } = require('./helpers/sim');
const S = require('../assets/js/session.js');

const bestOption = c => c.sc.nodes[c.node].o.map((o, i) => ({ o, i }))
  .filter(x => !c.used.has(x.i)).reduce((a, b) => (b.o.q > a.o.q ? b : a)).i;

// Plays a "Chats + calls" shift: answers each call answerAfter ms after it rings (never if null),
// sends the best replies after `delay` ms and closes with the right code
function playMixed(sim, n, o) {
  o = o || {};
  const E = sim.E;
  E.startDay(n, Object.assign({ calls: true, seed: 7 }, o.start));
  const st = E.st;
  while (!st.ended) {
    if (st.clock > 3600000) throw new Error('El turno no terminó');
    for (const c of st.convs) {
      if (c.status === 'ringing') { if (o.answerAfter != null && st.clock - c.arrivedAt >= o.answerAfter) E.answer(c.id); }
      else if (c.status === 'agent') { if (st.clock - c.turnStart >= (o.delay || 0)) sim.send(c.id, bestOption(c)); }
      else if (c.status === 'ended') E.wrapUp(c.id, c.correctDisp[0]);
    }
    if (!st.ended) sim.tick();
  }
  return sim.report;
}
const callsOf = sim => sim.E.st.convs.filter(c => c.call);
const firstRing = sim => { sim.runUntil(() => callsOf(sim).some(c => c.status === 'ringing'), 900000, 'la primera llamada'); return callsOf(sim).find(c => c.status === 'ringing'); };

test.describe('Turno solo de chats: nada cambia', () => {
  test('no hay llamadas, ni "ringing" en las estadísticas, ni datos de llamadas en el informe', () => {
    const sim = createSim({ seed: 3 });
    sim.E.startDay(1, { seed: 3 });
    assert.equal(callsOf(sim).length, 0);
    assert.equal('ringing' in plain(sim.E.liveStats()), false);
    sim.E.quit();
    const rep = sim.playDay(1, { choose: bestOption });
    assert.equal(rep.calls, null);
  });
});

test.describe('Chats + calls', () => {
  test('cada nivel de día tiene llamadas, y el día 1 suma 2 de nivel 1', () => {
    const sim = createSim({ seed: 1 });
    const D = sim.data;
    assert.ok(Array.isArray(D.calls) && D.calls.length >= 6);
    [1, 2, 3].forEach(l => assert.ok(D.calls.some(k => k.level === l), 'nivel ' + l));
    sim.E.startDay(1, { calls: true, seed: 7 });
    const calls = callsOf(sim);
    assert.equal(calls.length, 2);
    calls.forEach(c => { assert.equal(c.sc.level, 1); assert.equal(c.sc.channel, 'phone'); assert.equal(c.status, 'pending'); });
    assert.equal(plain(sim.E.liveStats()).ringing, 0);
    assert.equal(sim.E.st.convs.filter(c => !c.call).length, D.scenarios.filter(s => s.day === 1).length, 'los chats del día siguen todos');
  });

  test('una llamada que nadie contesta suena 20 s y se pierde: hay que cerrarla con "No resolution"', () => {
    const sim = createSim({ seed: 2 });
    sim.E.startDay(3, { calls: true, seed: 7 });
    const c = firstRing(sim);
    const p0 = c.patience;
    assert.equal(c.sc.level, 2, 'el día 3 es de nivel medio');
    assert.equal(plain(sim.E.liveStats()).ringing, 1);
    sim.advance(sim.E.RING_MS - 300);
    assert.equal(c.status, 'ringing', 'aún suena');
    assert.ok(c.patience < p0, 'la paciencia baja mientras suena');
    sim.advance(600);
    assert.equal(c.status, 'ended');
    assert.equal(c.outcome, 'missed');
    assert.equal(c.csat, 1);
    assert.deepEqual(plain(c.correctDisp), ['no-resolution']);
    assert.equal(c.answeredAt, undefined);
    assert.ok(c.messages.some(m => m.kind === 'missed'));
    // the second call has not rung yet: it comes a while after this one ended
    const other = callsOf(sim).find(x => x !== c);
    assert.equal(other.arrived, false);
    sim.E.wrapUp(c.id, 'no-resolution');
    assert.equal(c.dispOk, true);
    sim.runUntil(() => other.status === 'ringing', 60000, 'la segunda llamada');
    assert.ok(other.arrivedAt - c.endedAt >= 25000, 'la siguiente llamada suena al menos 25 s después');
  });

  test('contestar: el cliente habla enseguida y su frase aparece al empezar a decirla', () => {
    const sim = createSim({ seed: 4 });
    sim.E.startDay(1, { calls: true, seed: 7 });
    const c = firstRing(sim);
    assert.equal(sim.E.answer('nobody'), false);
    sim.advance(3000);
    assert.equal(sim.E.answer(c.id), true);
    assert.equal(sim.E.answer(c.id), false, 'no se contesta dos veces');
    assert.ok(c.answerTime >= 3000 && c.answerTime < 3300);
    assert.equal(c.firstResponse, c.answerTime, 'la primera respuesta de una llamada es contestarla');
    assert.ok(c.messages.some(m => m.kind === 'call-start'));
    sim.runUntil(() => c.messages.some(m => m.from === 'customer'), 1500, 'la primera frase');
    const said = c.messages.find(m => m.from === 'customer');
    assert.equal(said.spoken, true);
    assert.equal(c.typing, true, 'sigue hablando');
    sim.waitForTurn(c.id, 15000);
    assert.equal(c.typing, false);
  });

  test('en espera: la paciencia baja mucho más despacio y el cliente no insiste; hablarle lo saca de la espera', () => {
    const run = hold => {
      const sim = createSim({ seed: 5 });
      sim.E.startDay(1, { calls: true, seed: 7 });
      const c = firstRing(sim);
      sim.E.answer(c.id);
      sim.waitForTurn(c.id, 15000);
      assert.equal(sim.E.hold(c.id, false), false, 'no está en espera');
      if (hold) assert.equal(sim.E.hold(c.id, true), true);
      const p = c.patience, n = c.messages.length;
      sim.advance(40000);
      return { sim, c, drop: p - c.patience, said: c.messages.slice(n).filter(m => m.from === 'customer').length };
    };
    const live = run(false), held = run(true);
    assert.ok(held.drop < live.drop / 3, 'en espera baja menos de un tercio (' + held.drop.toFixed(1) + ' vs ' + live.drop.toFixed(1) + ')');
    assert.equal(held.said, 0, 'en espera no dice "¿hola?"');
    const { sim, c } = held;
    assert.equal(c.holds, 1);
    sim.send(c.id, bestOption(c));
    assert.equal(c.onHold, false);
    assert.ok(c.holdMs >= 40000);
    assert.ok(c.messages.some(m => m.kind === 'resume'));
  });

  test('un cliente que espera demasiado en la línea cuelga', () => {
    const sim = createSim({ seed: 6 });
    sim.E.startDay(4, { calls: true, seed: 7 });
    const c = firstRing(sim);
    sim.E.answer(c.id);
    sim.waitForTurn(c.id, 20000);
    sim.runUntil(() => c.status === 'ended', 300000, 'que cuelgue');
    assert.equal(c.outcome, 'abandoned');
    assert.ok(c.messages.some(m => m.kind === 'left' && /hung up/.test(m.text)));
  });

  test('las llamadas cuentan en la nota: contestarlas bien suma y perderlas resta', () => {
    const good = playMixed(createSim({ seed: 8 }), 2, { answerAfter: 2000 });
    assert.equal(good.calls.n, 2);
    assert.equal(good.calls.answered, 2);
    assert.equal(good.calls.missed, 0);
    assert.ok(good.calls.avgAnswer >= 2000 && good.calls.avgAnswer < 2300);
    assert.equal(good.n, createSim({ seed: 1 }).data.scenarios.filter(s => s.day === 2).length + 2, 'las llamadas cuentan como clientes');
    good.convs.filter(c => c.call).forEach(c => assert.equal(c.outcome, 'resolved', c.id));
    assert.ok(good.passed);

    const missed = playMixed(createSim({ seed: 8 }), 2, { answerAfter: null });
    assert.equal(missed.calls.missed, 2);
    assert.equal(missed.calls.answered, 0);
    assert.equal(missed.calls.avgAnswer, null);
    assert.ok(missed.score < good.score - 10, 'perder las llamadas baja la nota (' + missed.score + ' vs ' + good.score + ')');
  });

  test('mismo seed, mismas llamadas y mismo resultado', () => {
    const a = playMixed(createSim({ seed: 9 }), 5, { answerAfter: 4000, delay: 3000 });
    const b = playMixed(createSim({ seed: 9 }), 5, { answerAfter: 4000, delay: 3000 });
    assert.equal(a.score, b.score);
    assert.deepEqual(plain(a.convs.filter(c => c.call).map(c => c.id)), plain(b.convs.filter(c => c.call).map(c => c.id)));
    assert.equal(a.duration, b.duration);
  });
});

test.describe('El ajuste "Chats + calls" de la sesión', () => {
  const sim = createSim({ seed: 1 });
  const ctx = { data: sim.data, isUnlocked: () => true };

  test('solo una sesión mixta lleva llamadas; una de chats queda igual que antes', () => {
    const mixed = S.createSession({ days: [1, 2], difficulty: 'medium', mode: 'mixed' }, ctx, { seed: 11 });
    assert.equal(mixed.mode, 'mixed');
    assert.equal(S.startOptions(mixed, 1).calls, true);
    const chats = S.createSession({ days: [1], difficulty: 'medium', mode: 'chat' }, ctx, { seed: 11 });
    assert.equal('mode' in chats, false);
    assert.equal(S.startOptions(chats, 1).calls, undefined);
    assert.equal(S.mode('nope').id, 'chat');
    assert.ok(S.validateConfig({ days: [1], difficulty: 'medium', mode: 'radio' }, ctx).errors.some(e => /calls/.test(e)));
    assert.equal(S.configPractice({ days: [1], difficulty: 'medium', mode: 'mixed' }, sim.data).length, 0, 'con llamadas no es práctica');
  });

  test('el informe de la sesión separa las llamadas de los clientes de chat', () => {
    const s = S.createSession({ days: [2], difficulty: 'medium', mode: 'mixed' }, ctx, { seed: 12 });
    const run = createSim({ seed: 12 });
    run.E.startDay(2, S.startOptions(s, 2));
    run.E.quit();
    const rep = playMixed(run, 2, { start: S.startOptions(s, 2), answerAfter: 3000 });
    const day = S.recordDay(s, rep);
    assert.equal(day.calls.n, 2);
    assert.ok(day.convs.filter(c => c.call).every(c => c.answerTime >= 3000));
    assert.ok(day.convs.filter(c => !c.call).every(c => !('call' in c)), 'los chats no llevan campos de llamada');
    const r = S.buildReport(s, run.data);
    assert.equal(r.completedScenarios, r.plannedScenarios, 'clientes de chat: ' + r.completedScenarios + ' de ' + r.plannedScenarios);
    assert.equal(r.kpis.calls.n, 2);
    assert.equal(r.kpis.calls.missed, 0);
    assert.equal(r.mode, 'mixed');
    assert.ok(r.strengths.some(x => x.title === 'Every call answered'));
  });
});
