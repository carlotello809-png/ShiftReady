#!/usr/bin/env node
/* ShiftReady — answer pattern check
   Can someone score well without reading the replies, just by following a surface rule
   ("always pick the longest one", "the one that uses the customer's name"…)?
   For each rule it computes how often it would pick the best reply, choosing at random
   among the options the rule allows (the engine shuffles the order on screen every turn,
   so position in the file is not a clue the player can see). A rule that beats picking at
   random by much is a clue that gives the answer away.
   Usage:  node tools/answer-patterns.js          (summary)
           node tools/answer-patterns.js --json   (machine-readable) */
'use strict';

const fill = (t, s) => String(t || '').replace(/\{agent\}/g, 'Alex').replace(/\{first\}/g, s.customer.first);

// A rule returns the options it would choose from (one of them at random)
const pickIf = test => o => { const c = o.filter(test); return c.length ? c : o; };
const RULES = {
  random: { label: 'Al azar (referencia)', pick: o => o },
  longest: { label: 'La más larga', pick: o => [o.reduce((b, x) => (x.len > b.len ? x : b))] },
  second: { label: 'La segunda más larga', pick: o => [o.slice().sort((a, b) => b.len - a.len)[1]] },
  shortest: { label: 'La más corta', pick: o => [o.reduce((b, x) => (x.len < b.len ? x : b))] },
  withName: { label: 'La que usa el nombre del cliente', pick: pickIf(x => x.name) },
  withoutName: { label: 'La que no usa el nombre', pick: pickIf(x => !x.name) },
  exclamation: { label: 'La que tiene «!»', pick: pickIf(x => x.excl) },
  apology: { label: 'La que pide disculpas', pick: pickIf(x => x.sorry) },
  question: { label: 'La que hace una pregunta', pick: pickIf(x => x.ask), substantive: true }
};

function analyze(D) {
  const out = { turns: 0, rules: {}, bestRankByLength: {}, perScenario: {} };
  const score = {};
  Object.keys(RULES).forEach(k => { score[k] = 0; });
  for (const s of D.scenarios) {
    const sc = out.perScenario[s.id] = { turns: 0, bestLongest: 0 };
    for (const id of Object.keys(s.nodes)) {
      const n = s.nodes[id];
      if (!Array.isArray(n.o) || n.o.length < 2) continue;
      out.turns++;
      sc.turns++;
      const o = n.o.map(x => {
        const t = fill(x.t, s);
        return { q: x.q, len: t.length, name: t.indexOf(s.customer.first) !== -1, excl: /!/.test(t), sorry: /\bsorry\b|apolog/i.test(t), ask: /\?/.test(t) };
      });
      const top = Math.max.apply(null, o.map(x => x.q));
      Object.keys(RULES).forEach(k => {
        const c = RULES[k].pick(o);
        score[k] += c.filter(x => x.q === top).length / c.length;
      });
      const rank = o.slice().sort((a, b) => b.len - a.len).findIndex(x => x.q === top) + 1;
      const key = rank + ' de ' + o.length;
      out.bestRankByLength[key] = (out.bestRankByLength[key] || 0) + 1;
      if (rank === 1) sc.bestLongest++;
    }
  }
  Object.keys(RULES).forEach(k => {
    out.rules[k] = { label: RULES[k].label, bestRate: out.turns ? score[k] / out.turns : 0, substantive: !!RULES[k].substantive };
  });
  return out;
}

function printReport(r) {
  const pct = x => Math.round(x * 100) + ' %';
  const base = r.rules.random.bestRate;
  const lines = ['ShiftReady · pistas superficiales en las respuestas', r.turns + ' turnos con varias opciones', '',
    'Si siempre eligieras…                       acertarías la mejor'];
  Object.keys(r.rules).forEach(k => {
    const x = r.rules[k];
    const diff = Math.round((x.bestRate - base) * 100);
    lines.push('  ' + x.label.padEnd(42) + pct(x.bestRate).padStart(5) + (k === 'random' ? '' : '  (' + (diff >= 0 ? '+' : '') + diff + ' frente al azar)') + (x.substantive ? '  · refleja destrezas reales: verificar y preguntar «¿algo más?»' : ''));
  });
  lines.push('', 'Posición de la mejor respuesta por longitud: ' + Object.keys(r.bestRankByLength).sort().map(k => k + ': ' + r.bestRankByLength[k]).join(' · '));
  lines.push('El orden en pantalla lo baraja el motor en cada turno (semilla por sesión).');
  return lines.join('\n');
}

if (require.main === module) {
  const { loadData } = require('./browser-sandbox');
  const r = analyze(loadData());
  console.log(process.argv.indexOf('--json') !== -1 ? JSON.stringify(r, null, 2) : printReport(r));
}

module.exports = { analyze, printReport, RULES };
