/* ShiftReady — "Crear entrenamiento" chat (left of the lobby).
   No AI is connected: the assistant reads the message and the text files the person adds,
   finds topics, number of days and difficulty with simple rules, and proposes a plan built
   from the REAL training days and cases of the simulator. It never changes the engine,
   the cases or the scores. Files stay in this page's memory; only their names are saved. */
(function () {
  'use strict';
  const SR = window.SR = window.SR || {};
  const KEY = 'shiftready.trainchat.v1';
  const MAX_FILES = 10, MAX_BYTES = 10 * 1024 * 1024, READ_BYTES = 300 * 1024;
  const TEXT_TYPES = /\.(txt|md|csv)$/i;
  const ACCEPT = '.txt,.md,.csv,.pdf,.doc,.docx';
  const KINDS = { prompt: 'Prompt / instrucciones', manual: 'Manual o política' };
  // Server function that asks Claude for the cases (public project URL and publishable key)
  const GEN_URL = 'https://euusjtfndzlvxrpimwkq.supabase.co/functions/v1/generate-training';
  const PUB_KEY = 'sb_publishable_wNS5phtxj2B0PaEh38MzSw_bzKRf3oo';
  const MAX_PDF = 4 * 1024 * 1024;
  const GEN_ERR = {
    rate_limited: 'Llegaste al límite de generaciones por hora. Prueba de nuevo más tarde.',
    daily_limit: 'Se alcanzó el límite diario de generaciones del sitio. Prueba mañana.',
    ai_not_configured: 'La IA todavía no está configurada en el servidor (falta la clave de Anthropic).',
    ai_busy: 'La IA está ocupada. Prueba en un momento.',
    refused: 'La IA no pudo crear casos con ese contenido. Prueba a reformular la petición.',
    invalid_cases: 'La IA generó casos con errores que el simulador no puede usar. Prueba otra vez.',
    too_much_text: 'Los documentos son demasiado largos. Sube menos texto.',
    too_long: 'La respuesta fue demasiado larga. Pide menos clientes por día.'
  };
  const TRAINING_KEY = 'shiftready.trainchat.training';
  GEN_ERR.trial_used = 'Ya usaste tu prueba gratuita. Crea una cuenta (es gratis) para seguir generando entrenamientos.';
  const SIGNUP_URL = 'app/#/signup';
  // Session of the platform (app/), same site: lets signed-in people generate more than the free try
  function sessionToken() {
    try {
      const s = JSON.parse(localStorage.getItem('sb-euusjtfndzlvxrpimwkq-auth-token'));
      if (s && s.access_token && (!s.expires_at || s.expires_at * 1000 > Date.now() + 30000)) return s.access_token;
    } catch (e) { /* none */ }
    return null;
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = (n, s) => (SR.icon ? SR.icon(n, s || 16) : '');
  const size = b => (b < 1024 ? b + ' B' : b < 1048576 ? Math.round(b / 1024) + ' KB' : (b / 1048576).toFixed(1) + ' MB');

  // Spanish (and English) words → policies of the simulator
  const TOPICS = [
    [/devoluci|return/i, 'returns'], [/reembols|refund/i, 'refunds'], [/env[ií]o|entrega|shipping|delivery/i, 'shipping'],
    [/pedido|orden|order/i, 'orders'], [/perdid|extravi|lost/i, 'lost'], [/da[ñn]ad|roto|damaged/i, 'damaged'],
    [/pago|cobro|factur|payment|billing/i, 'payments'], [/garant[ií]a|warranty/i, 'warranty'], [/seguridad|peligro|safety/i, 'safety'],
    [/cuenta|contrase[ñn]a|acceso|account/i, 'accounts'], [/verific|identidad|verification/i, 'verification'],
    [/escala|supervisor|escalat/i, 'escalation'], [/promoci|descuento|cup[oó]n|promo/i, 'promotions'],
    [/precio|ajuste|price/i, 'priceAdjust'], [/membres|suscrip|membership/i, 'membership'], [/regalo|gift/i, 'gifts'],
    [/empresa|corporativ|business/i, 'business'], [/compensa|cortes[ií]a|goodwill/i, 'goodwill'], [/trato|tono|conducta|empat/i, 'conduct']
  ];
  const NUM = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
  const LEVEL_ES = { Easy: 'Fácil', Medium: 'Intermedio', Hard: 'Difícil', Expert: 'Experto' };

  let S = load();
  let files = [];            // { id, name, type, size, kind, text } — memory only
  let el = null, busy = false;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.msgs)) return s; } catch (e) { /* ignore */ }
    return fresh();
  }
  function fresh() {
    return { msgs: [{ from: 'bot', text: 'Hola. Cuéntame qué entrenamiento necesitas (por ejemplo: «5 días para agentes nuevos, con clientes molestos y devoluciones»). También puedes subir tu prompt o los manuales y políticas de la empresa.' }], draft: '', open: true };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ msgs: S.msgs.slice(-40), draft: S.draft, open: S.open })); } catch (e) { /* ignore */ }
  }

  /* ---------- the rule-based proposal (uses only real simulator content) ---------- */
  function analyse(text) {
    const D = SR.data;
    const t = text.toLowerCase();
    let days = null;
    const m = t.match(/(\d{1,2})\s*d[ií]as?/) || t.match(/\b(un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+d[ií]as?/);
    if (m) days = Math.max(1, Math.min(10, NUM[m[1]] || parseInt(m[1], 10)));
    let diff = null;
    if (/f[aá]cil|b[aá]sic|nuev|principiante/.test(t)) diff = 'easy';
    if (/intermedi|normal|medi[ao]/.test(t)) diff = 'medium';
    if (/dif[ií]cil|avanzad|exigente|experto|molest|enojad|agresiv/.test(t)) diff = 'hard';
    const pol = new Set();
    TOPICS.forEach(([re, key]) => { if (re.test(t)) pol.add(key); });
    const angry = /molest|enojad|agresiv|dif[ií]cil|enfadad/.test(t);
    const finalExam = /evaluaci|examen|final|integral/.test(t);
    return { days, diff, pol: [...pol].filter(k => D.policies[k]), angry, finalExam };
  }

  function propose(a) {
    const D = SR.data;
    const n = a.days || 5;
    const byLevel = { easy: [1, 2], medium: [3], hard: [4], expert: [5] };
    // Real days in order of difficulty; starting point depends on the difficulty asked
    const start = a.diff === 'hard' ? 3 : a.diff === 'medium' ? 2 : 1;
    const plan = [];
    for (let i = 0; i < n; i++) {
      let realDay = Math.min(5, start + Math.floor(i * (5 - start + 1) / n));
      if (a.finalExam && i === n - 1) realDay = 5;
      if (a.angry && i === Math.floor(n / 2)) realDay = Math.max(realDay, 4);
      const day = D.days.find(d => d.n === realDay);
      const cases = D.scenarios.filter(s => s.day === realDay)
        .map(s => ({ s, hit: (s.policies || []).filter(p => a.pol.indexOf(p) !== -1).length }))
        .sort((x, y) => y.hit - x.hit || x.s.arrive - y.s.arrive);
      plan.push({ i: i + 1, real: realDay, title: day.title, level: day.level, cases: cases.slice(0, 3).map(c => ({ topic: c.s.topic, who: c.s.customer.first, hit: c.hit > 0 })), total: cases.length, exam: a.finalExam && i === n - 1 });
    }
    void byLevel;
    return { n, diff: a.diff || 'medium', pol: a.pol, plan };
  }

  function reply(userText) {
    const fileText = files.filter(f => f.text).map(f => f.text).join('\n');
    const a = analyse(userText + '\n' + fileText);
    const listed = files.length ? files.length + ' archivo' + (files.length === 1 ? '' : 's') + ' (' + files.filter(f => f.text).length + ' de texto leídos aquí mismo, el resto solo listados)' : 'ningún archivo';
    const p = propose(a);
    const polNames = p.pol.map(k => SR.data.policies[k].title);
    let text = 'Propuesta basada en tu mensaje y ' + listed + ': ' + p.n + ' día' + (p.n === 1 ? '' : 's') + ', dificultad ' + ({ easy: 'fácil', medium: 'intermedia', hard: 'difícil' }[p.diff]) + '.';
    text += polNames.length ? ' Temas detectados: ' + polNames.join(', ') + '.' : ' No detecté temas concretos; uso el recorrido estándar.';
    if (!a.days) text += ' No indicaste días: propongo 5 (puedes decir «quiero 3 días»).';
    return { from: 'bot', text, plan: p };
  }

  /* ---------- rendering ---------- */
  function planHTML(p) {
    return '<div class="tc-plan">' + p.plan.map(d =>
      '<div class="tc-day"><div class="tc-day-h"><b>Día ' + d.i + '</b>' + (d.exam ? '<span class="tc-tag">Evaluación</span>' : '') +
      '<span class="tc-lvl">' + esc(LEVEL_ES[d.level] || d.level) + '</span></div>' +
      '<div class="tc-day-t">Basado en el día real ' + d.real + ' · ' + esc(d.title) + ' (' + d.total + ' clientes)</div>' +
      '<ul>' + d.cases.map(c => '<li>' + (c.hit ? '★ ' : '') + esc(c.topic) + ' <span>· ' + esc(c.who) + '</span></li>').join('') + '</ul>' +
      '<button type="button" class="tc-mini" data-tc="practice" data-day="' + d.real + '">' + ic('play', 13) + 'Practicar este día</button></div>').join('') +
      '<p class="tc-note">Propuesta con los casos reales del simulador. Para crear casos nuevos con tu prompt y tus documentos, usa la IA:</p>' +
      '<button type="button" class="tc-send tc-gen" data-tc="generate"' + (busy ? ' disabled' : '') + '>' + ic('sparkle', 14) + (sessionToken() ? 'Generar con IA (' + p.plan.length + ' día' + (p.plan.length === 1 ? '' : 's') + ')' : 'Generar 1 día de prueba con IA') + '</button></div>';
  }

  /* ---------- real generation with Claude (server function) ---------- */
  let lastRequest = '';
  async function generate(p) {
    if (busy) return;
    const token = sessionToken();
    const n = token ? Math.min(p.plan.length, 5) : 1;          // without an account: one free day
    if (!token && p.plan.length > 1) S.msgs.push({ from: 'bot', text: 'Sin cuenta puedes probar gratis 1 día. Genero el día 1; para los ' + p.plan.length + ' días, crea una cuenta.' });
    const docs = files.filter(f => f.text).map(f => ({ name: f.name, text: f.text }));
    const pdfs = files.filter(f => f.pdf).map(f => ({ name: f.name, data: f.pdf }));
    const skipped = files.filter(f => !f.text && !f.pdf).map(f => f.name);
    const prompt = lastRequest || S.msgs.filter(m => m.from === 'me').map(m => m.text).join('\n');
    const training = { title: 'Entrenamiento generado', difficulty: p.diff, days: [], cases: [] };
    busy = true;
    if (skipped.length) S.msgs.push({ from: 'bot', text: 'No puedo leer estos archivos (usa .txt, .md, .csv o .pdf hasta 4 MB): ' + skipped.join(', ') });
    for (let i = 0; i < n; i++) {
      const d = p.plan[i], dayN = 100 + i + 1;
      S.msgs.push({ from: 'bot', text: 'Generando el día ' + (i + 1) + ' de ' + n + ' con Claude… (puede tardar hasta 2 minutos)' });
      save(); render();
      try {
        const res = await fetch(GEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: PUB_KEY, Authorization: 'Bearer ' + (token || PUB_KEY) },
          body: JSON.stringify({ prompt, docs, pdfs, day: dayN, count: 2,
            plan: 'Día ' + (i + 1) + ' de ' + n + '. Nivel ' + (LEVEL_ES[d.level] || d.level) + (d.exam ? '. Evaluación final integral' : '') + (p.pol.length ? '. Temas: ' + p.pol.join(', ') : '') })
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(out.cases)) throw new Error(GEN_ERR[out.error] || 'No se pudo generar el día ' + (i + 1) + ' (error ' + res.status + ').');
        training.cases = training.cases.concat(out.cases);
        training.days.push({ n: dayN, title: 'Día ' + (i + 1) + (d.exam ? ' · Evaluación' : ''), level: d.level, focus: out.cases.map(c => c.topic).slice(0, 4) });
      } catch (e) {
        S.msgs.push({ from: 'bot', text: e.message && e.message.indexOf('Failed to fetch') === -1 ? e.message : 'No hay conexión con el servidor de IA.', signup: e.message === GEN_ERR.trial_used });
        break;
      }
    }
    busy = false;
    if (training.cases.length) {
      try { localStorage.setItem(TRAINING_KEY, JSON.stringify(training)); } catch (e) { /* too big or blocked: stays in memory */ }
      SR._lastTraining = training;
      S.msgs.push({ from: 'bot', text: 'Listo: ' + training.days.length + ' día' + (training.days.length === 1 ? '' : 's') + ' y ' + training.cases.length + ' clientes creados por la IA y revisados por el validador del simulador.', ready: true });
      if (!token) S.msgs.push({ from: 'bot', text: 'Esta era tu prueba gratuita. Para generar entrenamientos completos, crea una cuenta.', signup: true });
    }
    save(); render();
  }
  function playLast() {
    let t = SR._lastTraining;
    if (!t) { try { t = JSON.parse(localStorage.getItem(TRAINING_KEY)); } catch (e) { t = null; } }
    if (!t || !SR.playTraining || !SR.playTraining(t)) { S.msgs.push({ from: 'bot', text: 'No encuentro el entrenamiento generado. Genéralo de nuevo.' }); save(); render(); }
  }

  function render() {
    if (!el) return;
    el.classList.toggle('closed', !S.open);
    el.innerHTML =
      '<div class="tc-head"><div><h2>' + ic('sparkle', 16) + 'Crear entrenamiento</h2><span class="tc-badge">Demo · sin IA conectada</span></div>' +
        '<div class="tc-head-a"><button type="button" class="tc-icon" data-tc="new" title="Nueva conversación" aria-label="Nueva conversación">' + ic('rotate', 15) + '</button>' +
        '<button type="button" class="tc-icon tc-toggle" data-tc="toggle" aria-expanded="' + S.open + '" aria-label="' + (S.open ? 'Ocultar' : 'Mostrar') + ' el chat">' + ic(S.open ? 'chevLeft' : 'chevRight', 15) + '</button></div></div>' +
      '<div class="tc-body">' +
        '<div class="tc-msgs" id="tcMsgs" aria-live="polite">' + S.msgs.map((m, i) =>
          '<div class="tc-msg ' + m.from + '"><div class="tc-bub">' + esc(m.text) + (m.files ? '<div class="tc-att">' + m.files.map(f => ic('paperclip', 12) + esc(f)).join('<br>') + '</div>' : '') + '</div>' +
          (m.plan ? planHTML(m.plan) : '') +
          (m.ready ? '<button type="button" class="tc-send tc-gen" data-tc="play">' + ic('play', 14) + 'Empezar el entrenamiento</button>' : '') +
          (m.signup ? '<a class="tc-mini tc-gen" href="' + SIGNUP_URL + '">' + ic('user', 13) + 'Crear cuenta gratis</a>' : '') + (m.from === 'me' ? '<button type="button" class="tc-del" data-tc="del" data-i="' + i + '" aria-label="Borrar mensaje">' + ic('x', 12) + '</button>' : '') + '</div>').join('') +
          (busy ? '<div class="tc-msg bot"><div class="tc-bub tc-typing">Analizando (demo)…</div></div>' : '') + '</div>' +
        '<div class="tc-files">' + (files.length ? files.map(f =>
          '<span class="tc-file" title="' + esc(f.name) + '">' + ic('file', 12) + '<span class="n">' + esc(f.name) + '</span><span class="m">' + esc(KINDS[f.kind]) + ' · ' + size(f.size) + '</span>' +
          '<button type="button" data-tc="rm" data-id="' + f.id + '" aria-label="Quitar ' + esc(f.name) + '">' + ic('x', 11) + '</button></span>').join('') : '') + '</div>' +
        '<form class="tc-compose" data-tc-form="1">' +
          '<label class="sr-only" for="tcInput">Describe el entrenamiento</label>' +
          '<textarea id="tcInput" rows="3" maxlength="4000" placeholder="Describe el entrenamiento o pega tu prompt…">' + esc(S.draft) + '</textarea>' +
          '<div class="tc-actions">' +
            '<label class="tc-attach">' + ic('paperclip', 14) + 'Prompt<input type="file" data-kind="prompt" accept="' + ACCEPT + '" multiple hidden></label>' +
            '<label class="tc-attach">' + ic('book', 14) + 'Manuales<input type="file" data-kind="manual" accept="' + ACCEPT + '" multiple hidden></label>' +
            '<span class="tc-sp"></span><button type="submit" class="tc-send"' + (busy ? ' disabled' : '') + '>' + ic('send', 14) + 'Enviar</button>' +
          '</div><p class="tc-hint">Arrastra archivos aquí · .txt .md .csv se leen en tu navegador; .pdf y .docx solo se listan.</p>' +
        '</form>' +
      '</div>';
    const box = el.querySelector('#tcMsgs');
    if (box) box.scrollTop = box.scrollHeight;
  }

  function addFiles(list, kind) {
    const errs = [];
    Array.from(list || []).forEach(f => {
      if (files.length >= MAX_FILES) { errs.push('Máximo ' + MAX_FILES + ' archivos.'); return; }
      if (!/\.(txt|md|csv|pdf|docx?)$/i.test(f.name)) { errs.push(f.name + ': tipo no admitido.'); return; }
      if (f.size > MAX_BYTES) { errs.push(f.name + ': supera 10 MB.'); return; }
      const item = { id: Math.random().toString(36).slice(2), name: f.name.slice(0, 120), type: f.type, size: f.size, kind, text: '' };
      files.push(item);
      if (TEXT_TYPES.test(f.name)) {
        const r = new FileReader();
        r.onload = () => { item.text = String(r.result || ''); };
        r.readAsText(f.slice(0, READ_BYTES));
      } else if (/\.pdf$/i.test(f.name) && f.size <= MAX_PDF) {
        const r = new FileReader();        // PDFs go to Claude as documents (base64)
        r.onload = () => { item.pdf = String(r.result || '').split(',')[1] || ''; };
        r.readAsDataURL(f);
      }
    });
    if (errs.length) S.msgs.push({ from: 'bot', text: errs.join(' ') });
    render();
  }

  function send(text) {
    text = text.trim();
    if (!text && !files.length) return;
    S.msgs.push({ from: 'me', text: text || '(Archivos adjuntos)', files: files.map(f => f.name) });
    if (text) lastRequest = (lastRequest ? lastRequest + '\n' : '') + text;
    S.draft = '';
    busy = true; render(); save();
    setTimeout(() => { busy = false; S.msgs.push(reply(text)); save(); render(); }, 900);
  }

  function onClick(e) {
    const b = e.target.closest('[data-tc]');
    if (!b || !el.contains(b)) return;
    const a = b.dataset.tc;
    if (a === 'toggle') { S.open = !S.open; save(); render(); if (S.open) { el.classList.add('tc-opening'); setTimeout(() => el && el.classList.remove('tc-opening'), 350); } }
    if (a === 'new') { S = fresh(); files = []; save(); render(); }
    if (a === 'rm') { files = files.filter(f => f.id !== b.dataset.id); render(); }
    if (a === 'del') { S.msgs.splice(Number(b.dataset.i), 1); save(); render(); }
    if (a === 'generate') { const m = S.msgs.slice().reverse().find(x => x.plan); if (m) generate(m.plan); }
    if (a === 'play') playLast();
    if (a === 'practice') {
      const card = document.querySelector('.day-card[data-day="' + b.dataset.day + '"]');
      if (!card) return;
      if (card.classList.contains('locked')) { S.msgs.push({ from: 'bot', text: 'El día ' + b.dataset.day + ' está bloqueado: aprueba el anterior o usa «Unlock all days» al final de la página.' }); save(); render(); return; }
      card.click(); card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function mount(node) {
    el = node;
    if (!el) return;
    render();
    el.addEventListener('click', onClick);
    el.addEventListener('submit', e => { if (e.target.closest('[data-tc-form]')) { e.preventDefault(); send(el.querySelector('#tcInput').value); } });
    el.addEventListener('input', e => { if (e.target.id === 'tcInput') { S.draft = e.target.value; save(); } });
    el.addEventListener('keydown', e => { if (e.target.id === 'tcInput' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e.target.value); } });
    el.addEventListener('change', e => { if (e.target.type === 'file') { addFiles(e.target.files, e.target.dataset.kind); e.target.value = ''; } });
    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drag'); });
    el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) el.classList.remove('drag'); });
    el.addEventListener('drop', e => { e.preventDefault(); el.classList.remove('drag'); addFiles(e.dataTransfer.files, 'manual'); });
  }

  SR.trainChat = { mount, _analyse: analyse, _propose: propose };
})();
