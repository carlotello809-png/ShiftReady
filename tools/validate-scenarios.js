#!/usr/bin/env node
/* ShiftReady — scenario validator
   Checks the training cases in assets/js/data/ the way the engine and the
   interface read them. It reuses the current data format as it is.
     error   = a chat or the screen breaks (stuck conversation, crash, wrong score)
     warning = worth a look, but the simulator still works
   Usage:  node tools/validate-scenarios.js          (readable report)
           node tools/validate-scenarios.js --json   (machine-readable)
   Exit code 1 when there is at least one error. */
'use strict';

// Values the engine and ui.js accept. Where they come from:
const OUTCOMES = ['resolved', 'unresolved'];             // engine finish() + ui.js OUTCOMES
const CHANNELS = ['web', 'app', 'whatsapp', 'messenger']; // ui.js CH (unknown value = crash)
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];   // app.css .prio-low … .prio-urgent
const VERIFIED = [true, false, 'na'];                     // ui.js verifyPill()
const HISTORY_FROM = ['bot', 'customer', 'agent', 'system']; // ui.js messageHTML()
const PLACEHOLDERS = ['agent', 'first'];                  // engine fill()
const NO_RESOLUTION = 'no-resolution';                    // hard-coded in engine finish()
const MAX_QUALITY = 3;                                    // engine: accuracy = sum(q) / (3 × replies)
const MAX_REPLY_IN = 30;                                  // engine MAX_REPLY_DELAY (seconds)
const MAX_HOTKEY_OPTIONS = 9;                             // ui.js keys 1–9

const KNOWN = {
  scenario: ['id', 'day', 'arrive', 'replyIn', 'persona', 'channel', 'verified', 'verifyNote', 'priority',
    'topic', 'disp', 'customer', 'sections', 'timeline', 'policies', 'notes', 'history', 'start', 'nodes',
    'patience', 'decay', 'typing', 'nudges', 'leave'],
  node: ['c', 'o', 'end', 'sys', 'disp'],
  option: ['q', 't', 'go', 'fb', 'r', 'retry', 'end', 'sys', 'disp']
};

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = v => typeof v === 'string' && v.trim() !== '';
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isStrArray = v => Array.isArray(v) && v.every(isStr);
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Validates the whole data set (SR.data).
 * @returns {{errors: Issue[], warnings: Issue[], scenarios: object[]}}
 * Issue = {level, code, scenario, where, message}
 */
function validate(D) {
  const issues = [];
  const summaries = [];
  let current = null;
  const add = (level, code, where, message) => issues.push({ level, code, scenario: current, where, message });
  const err = (code, where, message) => add('error', code, where, message);
  const warn = (code, where, message) => add('warning', code, where, message);

  /* ---------- reference tables ---------- */
  if (!isObj(D)) {
    err('E_DATA', 'SR.data', 'No hay datos (SR.data no es un objeto).');
    return finish();
  }
  const days = Array.isArray(D.days) ? D.days : [];
  const personas = isObj(D.personas) ? D.personas : {};
  const dispositions = Array.isArray(D.dispositions) ? D.dispositions : [];
  const policies = isObj(D.policies) ? D.policies : {};
  const products = isObj(D.products) ? D.products : {};
  const scenarios = Array.isArray(D.scenarios) ? D.scenarios : [];
  if (!Array.isArray(D.days)) err('E_DATA', 'SR.data.days', 'Falta la lista de días.');
  if (!isObj(D.personas)) err('E_DATA', 'SR.data.personas', 'Faltan los tipos de cliente.');
  if (!Array.isArray(D.dispositions)) err('E_DATA', 'SR.data.dispositions', 'Faltan los códigos de cierre.');
  if (!Array.isArray(D.scenarios)) err('E_DATA', 'SR.data.scenarios', 'Falta la lista de casos.');

  const dayNs = new Set();
  days.forEach((d, i) => {
    const w = 'days[' + i + ']';
    if (!isObj(d) || !Number.isInteger(d.n)) { err('E_TYPE', w, 'El día necesita un número entero "n".'); return; }
    if (dayNs.has(d.n)) err('E_DUPLICATE_ID', w, 'El día ' + d.n + ' está repetido.');
    dayNs.add(d.n);
    if (!isNum(d.decay) || d.decay < 0) err('E_TYPE', w + '.decay', 'decay debe ser un número ≥ 0 (paciencia perdida por segundo).');
  });

  Object.keys(personas).forEach(k => {
    const p = personas[k];
    const w = 'personas.' + k;
    if (!isObj(p)) { err('E_TYPE', w, 'El tipo de cliente debe ser un objeto.'); return; }
    ['decay', 'typing', 'replyIn'].forEach(f => { if (!isNum(p[f]) || p[f] <= 0) err('E_TYPE', w + '.' + f, f + ' debe ser un número > 0.'); });
    if (!isStrArray(p.nudges) || !p.nudges.length) err('E_TYPE', w + '.nudges', 'nudges debe ser una lista de textos no vacía.');
    if (!isStr(p.leave)) err('E_TYPE', w + '.leave', 'leave debe ser un texto.');
  });

  const dispIds = new Set();
  dispositions.forEach((d, i) => {
    if (!isObj(d) || !isStr(d.id)) { err('E_TYPE', 'dispositions[' + i + ']', 'El código de cierre necesita un "id".'); return; }
    if (dispIds.has(d.id)) err('E_DUPLICATE_ID', 'dispositions[' + i + ']', 'Código de cierre repetido: ' + d.id);
    dispIds.add(d.id);
    if (!isStr(d.label)) err('E_TYPE', 'dispositions[' + i + '].label', 'El código ' + d.id + ' no tiene texto (label).');
  });
  if (Array.isArray(D.dispositions) && !dispIds.has(NO_RESOLUTION)) {
    err('E_MISSING_DISPOSITION', 'dispositions', 'Falta el código "' + NO_RESOLUTION + '", que el motor usa para chats sin resolver.');
  }

  /* ---------- scenarios ---------- */
  const seenIds = new Set();
  const perDay = {};
  scenarios.forEach((s, i) => {
    current = isObj(s) && isStr(s.id) ? s.id : '#' + i;
    const before = issues.length;
    const stats = checkScenario(s, i);
    const mine = issues.slice(before);
    summaries.push(Object.assign({
      id: current, day: isObj(s) ? s.day : undefined,
      errors: mine.filter(x => x.level === 'error').length,
      warnings: mine.filter(x => x.level === 'warning').length
    }, stats));
  });
  current = null;

  days.forEach(d => {
    if (isObj(d) && Number.isInteger(d.n) && !perDay[d.n]) {
      err('E_EMPTY_DAY', 'days (n=' + d.n + ')', 'El día ' + d.n + ' no tiene casos: el turno nunca podría terminar.');
    }
  });

  return finish();

  function finish() {
    return {
      errors: issues.filter(x => x.level === 'error'),
      warnings: issues.filter(x => x.level === 'warning'),
      scenarios: summaries
    };
  }

  function checkScenario(s, i) {
    const stats = { nodes: 0, options: 0, endings: 0 };
    if (!isObj(s)) { err('E_TYPE', 'scenarios[' + i + ']', 'El caso debe ser un objeto.'); return stats; }

    // identity and required fields
    if (!isStr(s.id)) err('E_REQUIRED', 'id', 'Falta el identificador (id).');
    else if (seenIds.has(s.id)) err('E_DUPLICATE_ID', 'id', 'Identificador repetido: ' + s.id);
    else seenIds.add(s.id);

    Object.keys(s).forEach(k => { if (KNOWN.scenario.indexOf(k) === -1) warn('W_UNKNOWN_FIELD', k, 'Campo desconocido "' + k + '": el motor y la interfaz lo ignoran (¿error de escritura?).'); });

    if (!Number.isInteger(s.day)) err('E_REQUIRED', 'day', 'day debe ser un número entero.');
    else if (!dayNs.has(s.day)) err('E_UNKNOWN_DAY', 'day', 'El día ' + s.day + ' no existe en SR.data.days.');
    else {
      perDay[s.day] = (perDay[s.day] || 0) + 1;
      if (isStr(s.id) && s.id.indexOf('d' + s.day + '-') !== 0) warn('W_ID_PREFIX', 'id', 'El id no empieza por "d' + s.day + '-" como los demás casos de ese día.');
    }
    if (!isNum(s.arrive) || s.arrive < 0) err('E_REQUIRED', 'arrive', 'arrive debe ser un número ≥ 0 (segundos): si no, el cliente nunca llega y el turno no termina.');

    if (!isStr(s.persona)) err('E_REQUIRED', 'persona', 'Falta el tipo de cliente (persona).');
    else if (!has(personas, s.persona)) err('E_UNKNOWN_PERSONA', 'persona', 'Tipo de cliente desconocido "' + s.persona + '" (el motor usaría "neutral" sin avisar).');

    if (!isStr(s.channel)) err('E_REQUIRED', 'channel', 'Falta el canal (channel).');
    else if (CHANNELS.indexOf(s.channel) === -1) err('E_UNKNOWN_CHANNEL', 'channel', 'Canal desconocido "' + s.channel + '": la interfaz falla al mostrarlo. Válidos: ' + CHANNELS.join(', ') + '.');

    if (!isStr(s.priority)) err('E_REQUIRED', 'priority', 'Falta la prioridad (priority).');
    else if (PRIORITIES.indexOf(s.priority) === -1) warn('W_UNKNOWN_PRIORITY', 'priority', 'Prioridad "' + s.priority + '" sin estilo propio. Usadas: ' + PRIORITIES.join(', ') + '.');

    if (!isStr(s.topic)) err('E_REQUIRED', 'topic', 'Falta el motivo del chat (topic).');

    if (!isObj(s.customer)) err('E_REQUIRED', 'customer', 'Faltan los datos del cliente (customer).');
    else ['first', 'last'].forEach(f => { if (!isStr(s.customer[f])) err('E_REQUIRED', 'customer.' + f, 'Falta customer.' + f + '.'); });

    if (has(s, 'verified') && VERIFIED.indexOf(s.verified) === -1) warn('W_VALUE', 'verified', 'verified debe ser true, false o "na"; se mostrará como "Not verified".');

    checkDisp(s.disp, 'disp', true);

    if (has(s, 'policies')) {
      if (!Array.isArray(s.policies)) err('E_TYPE', 'policies', 'policies debe ser una lista.');
      else s.policies.forEach((k, j) => { if (!has(policies, k)) err('E_UNKNOWN_POLICY', 'policies[' + j + ']', 'Política desconocida "' + k + '": la interfaz falla al mostrarla.'); });
    }
    ['sections', 'timeline', 'notes'].forEach(f => { if (has(s, f) && !Array.isArray(s[f])) err('E_TYPE', f, f + ' debe ser una lista.'); });
    if (Array.isArray(s.sections)) {
      s.sections.forEach((sec, j) => (isObj(sec) && Array.isArray(sec.rows) ? sec.rows : []).forEach(r => {
        if (isObj(r) && Array.isArray(r.items)) r.items.forEach(it => {
          if (isObj(it) && isStr(it.name) && !has(products, it.name)) warn('W_NO_PRODUCT_PHOTO', 'sections[' + j + ']', 'El producto "' + it.name + '" no tiene foto en products.js.');
        });
      }));
    }

    // timing and patience overrides
    if (has(s, 'patience') && (!isNum(s.patience) || s.patience <= 0 || s.patience > 100)) err('E_RANGE', 'patience', 'patience debe estar entre 1 y 100.');
    if (has(s, 'replyIn')) {
      if (!isNum(s.replyIn) || s.replyIn <= 0) err('E_RANGE', 'replyIn', 'replyIn debe ser un número > 0 (segundos).');
      else if (s.replyIn * 1.2 > MAX_REPLY_IN) warn('W_REPLY_CAPPED', 'replyIn', 'Con replyIn ' + s.replyIn + ' algunas respuestas superan ' + MAX_REPLY_IN + ' s y el motor las recorta.');
    }
    ['decay', 'typing'].forEach(f => { if (has(s, f) && (!isNum(s[f]) || s[f] <= 0)) err('E_RANGE', f, f + ' debe ser un número > 0.'); });
    if (has(s, 'nudges') && (!isStrArray(s.nudges) || !s.nudges.length)) err('E_TYPE', 'nudges', 'nudges debe ser una lista de textos no vacía.');
    if (has(s, 'leave') && !isStr(s.leave)) err('E_TYPE', 'leave', 'leave debe ser un texto.');

    if (has(s, 'history')) {
      if (!Array.isArray(s.history)) err('E_TYPE', 'history', 'history debe ser una lista.');
      else s.history.forEach((h, j) => {
        const w = 'history[' + j + ']';
        if (!isObj(h)) { err('E_TYPE', w, 'Cada mensaje del historial debe ser un objeto.'); return; }
        if (HISTORY_FROM.indexOf(h.from) === -1) err('E_VALUE', w + '.from', 'from debe ser uno de: ' + HISTORY_FROM.join(', ') + '.');
        if (!isStr(h.text) && !isObj(h.attach)) err('E_TYPE', w + '.text', 'El mensaje necesita texto o un adjunto.');
        if (has(h, 'ago') && (!isNum(h.ago) || h.ago < 0)) err('E_RANGE', w + '.ago', 'ago debe ser un número ≥ 0 (segundos).');
      });
    }

    // the conversation tree
    if (!isObj(s.nodes) || !Object.keys(s.nodes).length) { err('E_REQUIRED', 'nodes', 'El caso no tiene nodos de conversación.'); return stats; }
    const ids = Object.keys(s.nodes);
    stats.nodes = ids.length;
    ids.forEach(id => checkNode(s, id, stats));

    if (!isStr(s.start)) { err('E_REQUIRED', 'start', 'Falta el nodo inicial (start).'); return stats; }
    if (!has(s.nodes, s.start)) { err('E_BAD_START', 'start', 'El nodo inicial "' + s.start + '" no existe.'); return stats; }
    checkGraph(s, ids);
    checkPlaceholders(s);
    return stats;
  }

  function checkDisp(disp, where, required) {
    if (disp == null) { if (required) err('E_REQUIRED', where, 'Falta el código de cierre correcto (disp).'); return; }
    if (!Array.isArray(disp) || !disp.length) { err('E_DISP', where, 'disp debe ser una lista no vacía de códigos de cierre.'); return; }
    disp.forEach((id, j) => {
      if (!dispIds.has(id)) err('E_DISP', where + '[' + j + ']', 'Código de cierre desconocido "' + id + '": la interfaz falla al mostrarlo.');
      else if (id === NO_RESOLUTION) warn('W_DISP_NO_RESOLUTION', where + '[' + j + ']', '"' + NO_RESOLUTION + '" se asigna solo; no hace falta listarlo para chats resueltos.');
    });
  }

  function checkStrList(v, where, what) {
    if (v == null) return;
    if (!Array.isArray(v)) err('E_TYPE', where, what + ' debe ser una lista de textos.');
    else v.forEach((t, j) => { if (!isStr(t)) err('E_TYPE', where + '[' + j + ']', what + ': cada mensaje debe ser un texto no vacío.'); });
  }

  function checkNode(s, id, stats) {
    const n = s.nodes[id];
    const w = 'nodes.' + id;
    if (!isObj(n)) { err('E_TYPE', w, 'El nodo debe ser un objeto.'); return; }
    Object.keys(n).forEach(k => { if (KNOWN.node.indexOf(k) === -1) warn('W_UNKNOWN_FIELD', w + '.' + k, 'Campo desconocido "' + k + '" en el nodo.'); });
    checkStrList(n.c, w + '.c', 'c');

    if (has(n, 'end')) {
      stats.endings++;
      if (OUTCOMES.indexOf(n.end) === -1) err('E_END', w + '.end', 'end debe ser "resolved" o "unresolved".');
      if (has(n, 'o')) warn('W_IGNORED_FIELD', w + '.o', 'El nodo termina el chat (end); sus opciones nunca se muestran.');
      if (has(n, 'sys') && !isStr(n.sys)) err('E_TYPE', w + '.sys', 'sys debe ser un texto.');
      if (has(n, 'disp')) {
        if (n.end === 'resolved') checkDisp(n.disp, w + '.disp', false);
        else warn('W_IGNORED_FIELD', w + '.disp', 'Un chat sin resolver siempre espera "' + NO_RESOLUTION + '"; este disp se ignora.');
      }
      return;
    }
    ['sys', 'disp'].forEach(k => { if (has(n, k)) warn('W_IGNORED_FIELD', w + '.' + k, k + ' solo se usa en nodos con end; aquí se ignora.'); });

    if (!Array.isArray(n.o)) { err('E_NO_OPTIONS', w, 'El nodo no tiene opciones (o) ni termina el chat (end): la conversación se quedaría bloqueada.'); return; }
    if (!n.o.length) { err('E_NO_OPTIONS', w + '.o', 'La lista de opciones está vacía: la conversación se quedaría bloqueada.'); return; }
    if (n.o.length > MAX_HOTKEY_OPTIONS) warn('W_TOO_MANY_OPTIONS', w + '.o', 'Más de ' + MAX_HOTKEY_OPTIONS + ' opciones: las teclas 1–9 no alcanzan.');
    stats.options += n.o.length;

    let best = -1;
    let leaves = 0;
    const texts = new Set();
    n.o.forEach((o, i) => {
      const ow = w + '.o[' + i + ']';
      if (!isObj(o)) { err('E_TYPE', ow, 'La opción debe ser un objeto.'); return; }
      Object.keys(o).forEach(k => { if (KNOWN.option.indexOf(k) === -1) warn('W_UNKNOWN_FIELD', ow + '.' + k, 'Campo desconocido "' + k + '" en la opción (¿error de escritura?).'); });

      if (!Number.isInteger(o.q) || o.q < 0 || o.q > MAX_QUALITY) err('E_QUALITY', ow + '.q', 'q debe ser un entero de 0 a 3 (ahora: ' + JSON.stringify(o.q) + '); otro valor rompe la paciencia y la nota.');
      else best = Math.max(best, o.q);
      if (!isStr(o.t)) err('E_TEXT', ow + '.t', 'Falta el texto de la respuesta (t).');
      else if (texts.has(o.t)) warn('W_DUPLICATE_OPTION', ow + '.t', 'Texto repetido en el mismo nodo.');
      else texts.add(o.t);
      if (!has(o, 'fb')) warn('W_NO_FEEDBACK', ow + '.fb', 'Sin nota del coach (fb).');
      else if (typeof o.fb !== 'string') err('E_TYPE', ow + '.fb', 'fb debe ser un texto.');
      checkStrList(o.r, ow + '.r', 'r');

      // Where the option leads. The engine checks end, then retry, then go.
      const hasEnd = has(o, 'end');
      const isRetry = o.retry === true;
      const hasGo = has(o, 'go');
      if (has(o, 'retry') && typeof o.retry !== 'boolean') err('E_TYPE', ow + '.retry', 'retry debe ser true o false.');
      if (!hasEnd && !isRetry && !hasGo) err('E_NO_DESTINATION', ow, 'La opción no indica qué pasa después (go, retry o end).');
      if (hasEnd) {
        leaves++;
        if (OUTCOMES.indexOf(o.end) === -1) err('E_END', ow + '.end', 'end debe ser "resolved" o "unresolved".');
        if (isRetry) warn('W_IGNORED_FIELD', ow + '.retry', 'La opción termina el chat (end); retry se ignora.');
        if (hasGo) warn('W_IGNORED_FIELD', ow + '.go', 'La opción termina el chat (end); go se ignora.');
        if (has(o, 'disp')) { if (o.end === 'resolved') checkDisp(o.disp, ow + '.disp', false); else warn('W_IGNORED_FIELD', ow + '.disp', 'Un chat sin resolver siempre espera "' + NO_RESOLUTION + '".'); }
        if (has(o, 'sys') && !isStr(o.sys)) err('E_TYPE', ow + '.sys', 'sys debe ser un texto.');
      } else {
        ['disp', 'sys'].forEach(k => { if (has(o, k)) warn('W_IGNORED_FIELD', ow + '.' + k, k + ' solo se usa en opciones con end; aquí se ignora.'); });
        if (isRetry) {
          if (hasGo) warn('W_IGNORED_FIELD', ow + '.go', 'La opción es retry; go se ignora.');
          if (!Array.isArray(o.r) || !o.r.length) warn('W_RETRY_SILENT', ow + '.r', 'retry sin reacción (r): el cliente no dice nada y el agente vuelve a elegir.');
        } else if (hasGo) {
          leaves++;
          if (!isStr(o.go)) err('E_BROKEN_REF', ow + '.go', 'go debe ser el nombre de un nodo.');
          else if (!has(s.nodes, o.go)) err('E_BROKEN_REF', ow + '.go', 'go apunta a un nodo que no existe: "' + o.go + '".');
        }
      }
    });
    if (!leaves) err('E_RETRY_ONLY', w + '.o', 'Todas las opciones son retry: al agotarlas no queda ninguna y la conversación se bloquea.');
    if (best >= 0 && best < MAX_QUALITY) warn('W_NO_EXCELLENT', w + '.o', 'Ninguna opción tiene q = 3: aquí nadie puede sacar el 100 % de calidad.');
  }

  // Reachability, dead ends and cycles, following go (and end) the way the engine does
  function checkGraph(s, ids) {
    const nodes = s.nodes;
    const next = {};
    const exits = {};
    ids.forEach(id => {
      const n = nodes[id];
      next[id] = [];
      exits[id] = isObj(n) && has(n, 'end');
      (isObj(n) && !has(n, 'end') && Array.isArray(n.o) ? n.o : []).forEach(o => {
        if (!isObj(o)) return;
        if (has(o, 'end')) exits[id] = true;
        else if (o.retry !== true && isStr(o.go) && has(nodes, o.go)) next[id].push(o.go);
      });
    });

    const reach = new Set([s.start]);
    const stack = [s.start];
    while (stack.length) {
      const id = stack.pop();
      next[id].forEach(t => { if (!reach.has(t)) { reach.add(t); stack.push(t); } });
    }
    ids.forEach(id => { if (!reach.has(id)) warn('W_UNREACHABLE_NODE', 'nodes.' + id, 'Ningún camino desde "' + s.start + '" llega a este nodo.'); });

    // Nodes from which the chat can still finish (walking backwards from the endings)
    const canEnd = new Set(ids.filter(id => exits[id]));
    let grew = true;
    while (grew) {
      grew = false;
      ids.forEach(id => { if (!canEnd.has(id) && next[id].some(t => canEnd.has(t))) { canEnd.add(id); grew = true; } });
    }
    let anyEnd = false;
    reach.forEach(id => { if (exits[id]) anyEnd = true; });
    if (!anyEnd) err('E_NO_ENDING', 'nodes', 'Ningún camino desde "' + s.start + '" termina el chat.');
    else reach.forEach(id => {
      if (!canEnd.has(id) && Array.isArray((nodes[id] || {}).o)) err('E_NO_EXIT', 'nodes.' + id, 'Desde este nodo ya no se puede terminar el chat (bucle sin salida).');
    });

    // Cycles are allowed by the format (re-entering a node shows all its options again)
    const state = {};
    const path = [];
    const seen = new Set();
    (function dfs(id) {
      state[id] = 1;
      path.push(id);
      next[id].forEach(t => {
        if (state[t] === 1) {
          const loop = path.slice(path.indexOf(t)).concat(t);
          const key = loop.slice(0, -1).slice().sort().join('|');
          if (!seen.has(key)) {
            seen.add(key);
            const exitOk = loop.some(x => canEnd.has(x));
            if (exitOk) warn('W_CYCLE', 'nodes.' + t, 'Ciclo ' + loop.join(' → ') + ' (permitido: tiene salida). Revisa que sea intencional.');
          }
        } else if (!state[t]) dfs(t);
      });
      path.pop();
      state[id] = 2;
    })(s.start);
  }

  function checkPlaceholders(s) {
    const scan = (text, where) => {
      if (typeof text !== 'string') return;
      const found = text.match(/\{[a-zA-Z_]+\}/g) || [];
      found.forEach(p => {
        if (PLACEHOLDERS.indexOf(p.slice(1, -1)) === -1) warn('W_UNKNOWN_PLACEHOLDER', where, 'Marcador ' + p + ' desconocido: se mostrará tal cual. Válidos: {agent}, {first}.');
      });
    };
    (Array.isArray(s.history) ? s.history : []).forEach((h, j) => isObj(h) && scan(h.text, 'history[' + j + ']'));
    if (Array.isArray(s.nudges)) s.nudges.forEach((t, j) => scan(t, 'nudges[' + j + ']'));
    scan(s.leave, 'leave');
    Object.keys(s.nodes).forEach(id => {
      const n = s.nodes[id];
      if (!isObj(n)) return;
      (Array.isArray(n.c) ? n.c : []).forEach((t, j) => scan(t, 'nodes.' + id + '.c[' + j + ']'));
      (Array.isArray(n.o) ? n.o : []).forEach((o, i) => {
        if (!isObj(o)) return;
        scan(o.t, 'nodes.' + id + '.o[' + i + '].t');
        (Array.isArray(o.r) ? o.r : []).forEach((t, j) => scan(t, 'nodes.' + id + '.o[' + i + '].r[' + j + ']'));
      });
    });
  }
}

/* ---------- command line ---------- */
function printReport(D, res) {
  const out = [];
  const total = res.scenarios.reduce((a, s) => ({ nodes: a.nodes + s.nodes, options: a.options + s.options }), { nodes: 0, options: 0 });
  const days = new Set(res.scenarios.map(s => s.day));
  out.push('ShiftReady · validador de escenarios');
  out.push(res.scenarios.length + ' casos · ' + days.size + ' días · ' + total.nodes + ' nodos · ' + total.options + ' opciones');
  out.push('');
  const pad = (v, n) => String(v).padEnd(n);
  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);
  res.scenarios.forEach(s => {
    const mark = s.errors ? '✗ ' + plural(s.errors, 'error', 'errores') : s.warnings ? '! ' + plural(s.warnings, 'advertencia', 'advertencias') : '✓';
    out.push('  Día ' + pad(s.day, 2) + ' ' + pad(s.id, 14) + pad(s.nodes + ' nodos', 10) + pad(s.options + ' opciones', 13) + pad(plural(s.endings, 'final', 'finales'), 11) + mark);
  });
  const list = (title, items) => {
    if (!items.length) return;
    out.push('');
    out.push(title);
    items.forEach(x => out.push('  [' + x.code + '] ' + (x.scenario ? x.scenario + ' › ' : '') + x.where + ' — ' + x.message));
  };
  list('Errores', res.errors);
  list('Advertencias', res.warnings);
  out.push('');
  out.push('Resultado: ' + plural(res.errors.length, 'error', 'errores') + ' · ' + plural(res.warnings.length, 'advertencia', 'advertencias'));
  return out.join('\n');
}

if (require.main === module) {
  const { loadData } = require('./browser-sandbox');
  const D = loadData();
  const res = validate(D);
  if (process.argv.indexOf('--json') !== -1) console.log(JSON.stringify(res, null, 2));
  else console.log(printReport(D, res));
  process.exitCode = res.errors.length ? 1 : 0;
}

module.exports = { validate, printReport };
