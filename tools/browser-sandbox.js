/* ShiftReady — runs the browser scripts inside Node, without a browser.
   The files are loaded unmodified and in the same order as index.html, into an
   isolated "vm" context that provides the few browser globals they touch
   (window, performance, setInterval, console). The caller controls time and
   randomness, so every run can be repeated exactly. No dependencies. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const ENGINE = 'assets/js/engine.js';
const isData = f => f.startsWith('assets/js/data/');

// Scripts listed in index.html, in load order, without the ?v= part
function indexScripts() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const out = [];
  const re = /<script\b[^>]*\bsrc="([^"?#]+)[^"]*"/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// Small seeded random generator (mulberry32): same seed, same sequence
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Loads the scenario data and, optionally, the engine.
 * @param {object} [opts]
 * @param {boolean} [opts.engine]  also load assets/js/engine.js
 * @param {object}  [opts.data]    use this SR.data instead of the real data files
 * @param {number}  [opts.seed]    replace Math.random with a seeded generator
 * @returns {{SR: object, clock: {now: number}, timers: Array, logs: Array, files: string[]}}
 */
function load(opts) {
  opts = opts || {};
  // A page that has been open for a second, like a real browser. Starting at 0 would
  // make the engine's first tick count no time (it reads `E.lastTs || now`).
  const clock = { now: 1000 };
  const logs = [];
  const timers = [];
  const record = level => function () {
    logs.push({ level, text: Array.prototype.map.call(arguments, a => (a && a.stack) || String(a)).join(' ') });
  };
  const sandbox = {
    console: { log: record('log'), info: record('info'), warn: record('warn'), error: record('error') },
    performance: { now: () => clock.now },
    // Timers are recorded, never run: the tests move the clock themselves
    setInterval: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearInterval: () => {}
  };
  sandbox.window = sandbox;
  if (opts.data) sandbox.SR = { data: opts.data };
  vm.createContext(sandbox);
  if (opts.seed != null) {
    sandbox.__random = seededRandom(opts.seed);
    vm.runInContext('Math.random = __random; delete this.__random;', sandbox);
  }

  const listed = indexScripts();
  if (opts.engine && listed.indexOf(ENGINE) === -1) throw new Error('index.html no carga ' + ENGINE);
  const files = listed.filter(f => (!opts.data && isData(f)) || (opts.engine && f === ENGINE));
  for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    vm.runInContext(code, sandbox, { filename: f });
  }
  return { SR: sandbox.SR, clock, timers, logs, files };
}

/** The real scenario data (SR.data), as the browser sees it. */
function loadData() { return load().SR.data; }

module.exports = { ROOT, ENGINE, indexScripts, seededRandom, load, loadData };
