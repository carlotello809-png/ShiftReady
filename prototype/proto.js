/* ShiftReady — SaaS design prototype (navigable proposal)
   Plain JS, no dependencies, hash routes:
     #/access/<screen>                public & account-state screens
     #/app/<role>/<page>[/<id>[/<sub>]] role workspaces
   Reuses the simulator read-only: SR.icon, SR.data (the 25 real cases and 19 policies) and
   SR.session (difficulty levels and setup validation). Everything else is DEMO data
   (window.PROTO_DEMO). No server, no real authentication, no AI. */
(function () {
  'use strict';

  const SR = window.SR || {};
  const D = SR.data;
  const SS = SR.session;
  const X = window.PROTO_DEMO;
  const root = document.getElementById('root');

  /* ============================================================
     Helpers
     ============================================================ */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const EXTRA = {
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
    mark: '<path d="M20.6 9.2A9 9 0 1 1 18.4 5.6"/><path d="M20.8 3.6v5.2h-5.2"/><path d="M12 7.5V12l3 2"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'
  };
  function ic(name, size) {
    size = size || 16;
    if (EXTRA[name]) return '<svg class="i" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + EXTRA[name] + '</svg>';
    return SR.icon ? SR.icon(name, size) : '';
  }
  const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const initials = s => String(s).split(/\s+/).filter(w => /^[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const av = (name, cls) => '<span class="av' + (cls ? ' ' + cls : '') + '" style="--h:' + hue(name) + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
  const H = (role, page, id, sub) => '#/app/' + role + '/' + page + (id ? '/' + id : '') + (sub ? '/' + sub : '');
  const A = page => '#/access/' + page;
  const pct = v => (v == null ? '—' : Math.round(v * 100) + ' %');
  const CH = { web: 'Web chat', app: 'App móvil', whatsapp: 'WhatsApp', messenger: 'Messenger' };
  const levelTone = { Easy: 'success', Medium: 'warning', Hard: 'danger', Expert: 'danger' };
  const levelEs = { Easy: 'Fácil', Medium: 'Media', Hard: 'Difícil', Expert: 'Experto' };
  const diffLabel = id => (SS ? SS.difficulty(id).label : id);
  const diffEs = { easy: 'Fácil', medium: 'Intermedio', hard: 'Difícil' };
  // The simulator content is in English; the platform shows these labels in Spanish
  const diffBlurbEs = { easy: 'Aprender los casos con tiempo para pensar.', medium: 'El turno estándar, tal como se diseñó cada día.', hard: 'Cola llena, clientes con poca paciencia y sin pistas.' };
  const PERSONA_ES = { calm: 'Tranquilo', neutral: 'Neutral', impatient: 'Impaciente', angry: 'Molesto', anxious: 'Ansioso' };
  const REPLY = (SS && SS.REPLY_SPEEDS) || [{ id: 'auto' }];
  const replyEs = { auto: 'Automática (según la dificultad)', fast: 'Rápida (≈ 40 % antes)', normal: 'Normal (ritmo de cada cliente)', slow: 'Lenta (≈ 50 % más tarde)' };
  const custEs = v => (v ? v + ' por día' : 'Todos los del día');
  function errEs(e) {
    const rules = [
      [/^Choose at least one day\.$/, 'Elige al menos un día.'], [/^Day (\d+) does not exist\.$/, 'El día $1 no existe.'],
      [/^Day (\d+) is locked\..*$/, 'El día $1 no está incluido en este entrenamiento.'], [/^Day (\d+) has no cases\.$/, 'El día $1 no tiene casos.'],
      [/^The list of days is not valid\.$/, 'La lista de días no es válida.'], [/^Choose a difficulty\.$/, 'Elige una dificultad.'],
      [/^The number of customers must be 1 or more\.$/, 'El número de clientes debe ser 1 o más.'], [/^Choose a reply speed\.$/, 'Elige una velocidad de respuesta.']
    ];
    for (const r of rules) if (r[0].test(e)) return e.replace(r[0], r[1]);
    return e;
  }
  // customers per day + reply speed, the same settings as the simulator's gear panel
  function paceFields(prefix, cur, attr, locked) {
    const dis = locked ? ' disabled' : '';
    return '<div class="form-grid"><div class="field"><label for="' + prefix + 'cu">Clientes por día</label><select id="' + prefix + 'cu" class="select" ' + attr + '="customers"' + dis + '>' +
      ['', '1', '2', '3', '4'].map(v => '<option value="' + v + '"' + (String(cur.customers || '') === v ? ' selected' : '') + '>' + custEs(v) + '</option>').join('') + '</select><span class="hint">Menos clientes acorta el turno; se eligen siempre igual con la misma semilla.</span></div>' +
      '<div class="field"><label for="' + prefix + 'rs">Velocidad de respuesta de los clientes</label><select id="' + prefix + 'rs" class="select" ' + attr + '="reply"' + dis + '>' +
      REPLY.map(r => '<option value="' + r.id + '"' + (cur.reply === r.id ? ' selected' : '') + '>' + esc(replyEs[r.id] || r.label) + '</option>').join('') + '</select><span class="hint">Más lenta de lo normal cuenta como práctica.</span></div></div>';
  }
  const cfgOf = o => ({ days: o.days, difficulty: o.difficulty, customers: o.customers ? Number(o.customers) : null, reply: o.reply || 'auto' });
  const daysLabel = days => (days.length === 1 ? 'Día ' + days[0] : 'Días ' + days.join(', '));
  const scenariosOf = n => D.scenarios.filter(s => s.day === n).sort((a, b) => a.arrive - b.arrive);

  // Proposed grouping of the 19 real policies (classification is part of the proposal)
  const POLICY_CAT = {
    conduct: 'Atención y conducta', escalation: 'Atención y conducta',
    verification: 'Seguridad e identidad', accounts: 'Seguridad e identidad',
    orders: 'Pedidos y envíos', shipping: 'Pedidos y envíos', lost: 'Pedidos y envíos',
    returns: 'Devoluciones y reembolsos', refunds: 'Devoluciones y reembolsos', damaged: 'Devoluciones y reembolsos', priceAdjust: 'Devoluciones y reembolsos',
    promotions: 'Comercial y fidelización', goodwill: 'Comercial y fidelización', membership: 'Comercial y fidelización', business: 'Comercial y fidelización', gifts: 'Comercial y fidelización',
    payments: 'Pagos y facturación', warranty: 'Producto y seguridad', safety: 'Producto y seguridad'
  };

  /* ============================================================
     Small components (return HTML strings)
     ============================================================ */
  const TONE = {
    'Activa': 'success', 'Activo': 'success', 'Aceptada': 'success', 'Aprobado': 'success', 'Al día': 'success', 'Publicado': 'success', 'Completado': 'success',
    'Prueba': 'info', 'Programada': 'info', 'Práctica': 'info', 'En espera': 'info', 'En curso': 'info',
    'Pendiente': 'warning', 'Invitado': 'warning', 'Invitación pendiente': 'warning', 'Atrasado': 'warning', 'Abierto': 'warning', 'Media': 'warning',
    'Suspendida': 'danger', 'Desactivado': 'danger', 'Caducada': 'danger', 'No aprobado': 'danger', 'Necesita apoyo': 'danger', 'Alta': 'danger'
  };
  const tag = (s, tone) => { const t = tone || TONE[s]; return '<span class="tag' + (t && t !== 'neutral' ? ' tag-' + t : '') + '">' + esc(s) + '</span>'; };
  const T = {
    demo: () => '<span class="tag tag-demo" title="Datos demostrativos, no reales">Demo</span>',
    future: t => '<span class="tag tag-future" title="Prevista para una fase posterior">' + esc(t || 'Futuro') + '</span>',
    mvp: () => '<span class="tag tag-mvp" title="Incluida en el MVP propuesto">MVP</span>',
    real: t => '<span class="tag tag-real">' + esc(t || 'Contenido real') + '</span>',
    engine: () => '<span class="tag tag-real" title="El motor actual ya calcula este indicador">Motor actual</span>',
    backend: () => '<span class="tag tag-future" title="Necesita servidor, identidad e historial">Requiere backend</span>'
  };

  function btn(label, o) {
    o = o || {};
    const cls = 'btn' + (o.kind ? ' btn-' + o.kind : '') + (o.size ? ' btn-' + o.size : '') + (o.block ? ' btn-block' : '');
    const inner = (o.icon ? ic(o.icon, 15) : '') + esc(label) + (o.after || '');
    if (o.href) return '<a class="' + cls + '" href="' + o.href + '"' + (o.ext ? ' target="_blank" rel="noopener"' : '') + '>' + inner + '</a>';
    return '<button type="' + (o.type || 'button') + '" class="' + cls + '"' + (o.act ? ' data-act="' + o.act + '"' : '') + (o.arg != null ? ' data-arg="' + esc(o.arg) + '"' : '') + (o.disabled ? ' disabled aria-disabled="true"' : '') + (o.title ? ' title="' + esc(o.title) + '"' : '') + '>' + inner + '</button>';
  }

  function pageHead(o) {
    const crumbs = o.crumbs ? '<nav class="crumbs" aria-label="Ruta de navegación">' + o.crumbs.map((c, i) =>
      i < o.crumbs.length - 1 ? '<a href="' + c[1] + '">' + esc(c[0]) + '</a><span aria-hidden="true">/</span>' : '<span aria-current="page">' + esc(c[0]) + '</span>').join('') + '</nav>' : '';
    return crumbs + '<div class="page-h"><div><h1>' + esc(o.title) + (o.tags || '') + '</h1>' + (o.sub ? '<p>' + o.sub + '</p>' : '') + '</div>' +
      (o.actions ? '<div class="page-actions">' + o.actions + '</div>' : '') + '</div>';
  }

  function card(title, body, o) {
    o = o || {};
    return '<section class="card' + (o.cls ? ' ' + o.cls : '') + '"' + (title ? ' aria-label="' + esc(o.label || title.replace(/<[^>]+>/g, '')) + '"' : '') + '>' +
      (title ? '<div class="card-h"><h3>' + title + '</h3>' + (o.actions || '') + '</div>' : '') +
      '<div class="card-b' + (o.flush ? ' flush' : '') + '">' + body + '</div>' +
      (o.foot ? '<div class="card-f">' + o.foot + '</div>' : '') + '</section>';
  }

  // src: 'engine' = the engine already computes it for one session | 'backend' = needs a server and saved history (any average across sessions or people)
  function kpis(items) {
    return '<div class="grid g4">' + items.map(k =>
      '<div class="card kpi"><div class="kpi-l">' + (k.icon ? ic(k.icon, 15) : '') + esc(k.label) + '</div>' +
      '<div class="kpi-v num">' + esc(k.value) + '</div>' +
      '<div class="kpi-f">' + (k.delta ? '<span class="' + (k.delta[0] === '−' || k.delta[0] === '-' ? 'delta-down' : 'delta-up') + '">' + esc(k.delta) + '</span>' : '') +
      (k.foot ? '<span>' + esc(k.foot) + '</span>' : '') + (k.src === 'engine' ? T.engine() : k.src === 'backend' ? T.backend() : '') + '</div></div>').join('') + '</div>';
  }

  // cols: [[header, row => html, {num:true}]]
  function table(cols, rows, o) {
    o = o || {};
    const head = '<thead><tr>' + cols.map(c => '<th scope="col"' + (c[2] && c[2].num ? ' class="num"' : '') + '>' + esc(c[0]) + '</th>').join('') + '</tr></thead>';
    const body = rows.length ? '<tbody>' + rows.map(r => '<tr>' + cols.map((c, i) => (i === 0 ? '<td>' : '<td' + (c[2] && c[2].num ? ' class="num"' : '') + '>') + c[1](r) + '</td>').join('') + '</tr>').join('') + '</tbody>'
      : '<tbody><tr><td colspan="' + cols.length + '">' + empty(o.empty || { icon: 'search', title: 'Sin resultados', text: 'Prueba con otros filtros.' }) + '</td></tr></tbody>';
    return (o.filters || '') + '<div class="table-wrap"><table class="table">' + (o.caption ? '<caption class="sr-only">' + esc(o.caption) + '</caption>' : '') + head + body + '</table></div>' +
      (o.pager !== false && rows.length ? '<div class="pager"><span>Mostrando ' + rows.length + ' de ' + rows.length + '</span><div class="row">' + btn('Anterior', { size: 'sm', disabled: true }) + btn('Siguiente', { size: 'sm', disabled: true }) + '</div></div>' : '');
  }

  function filterBar(placeholder, selects, chips) {
    return '<div class="filters" role="search"><label class="search">' + ic('search', 15) + '<span class="sr-only">' + esc(placeholder) + '</span><input type="search" placeholder="' + esc(placeholder) + '" data-filter="q" value="' + esc(ui.f.q || '') + '"></label>' +
      (selects || []).map(s => '<label><span class="sr-only">' + esc(s.label) + '</span><select class="select" data-filter="' + s.key + '"><option value="">' + esc(s.label) + ': todos</option>' +
        s.options.map(op => '<option value="' + esc(op[0]) + '"' + (ui.f[s.key] === String(op[0]) ? ' selected' : '') + '>' + esc(op[1]) + '</option>').join('') + '</select></label>').join('') +
      (chips || '') + '</div>';
  }

  function empty(o) {
    return '<div class="empty"><span class="ic">' + ic(o.icon || 'inbox', 22) + '</span><h3>' + esc(o.title) + '</h3>' + (o.text ? '<p>' + o.text + '</p>' : '') + (o.action || '') + '</div>';
  }

  function alertBox(kind, title, text) {
    const icons = { info: 'info', success: 'checkCircle', warning: 'alert', danger: 'xCircle' };
    return '<div class="alert alert-' + kind + '" role="' + (kind === 'danger' ? 'alert' : 'status') + '">' + ic(icons[kind], 16) + '<div>' + (title ? '<b>' + esc(title) + '</b>' : '') + (text ? '<span>' + text + '</span>' : '') + '</div></div>';
  }

  function bars(rows, o) {
    o = o || {};
    return '<div class="bars" role="list">' + rows.map(r => {
      const w = r.max ? Math.max(0, Math.min(100, 100 * r.value / r.max)) : 0;
      return '<div class="bar" role="listitem" title="' + esc(r.title || (r.label + ': ' + r.text)) + '"><span class="l">' + esc(r.label) + '</span><span class="t"><span class="f' + (r.cls ? ' ' + r.cls : '') + '" style="width:' + w.toFixed(1) + '%"></span>' +
        (o.ref != null ? '<span class="ref" style="left:' + o.ref + '%" aria-hidden="true"></span>' : '') + '</span><span class="v">' + esc(r.text) + '</span></div>';
    }).join('') + '</div>' + (o.refLabel ? '<p class="legend"><span>│ ' + esc(o.refLabel) + '</span></p>' : '');
  }

  function lineChart(labels, series, o) {
    o = o || {};
    const W = 640, Hh = 220, L = 34, R = 12, Tp = 12, B = 28;
    const min = o.min != null ? o.min : 0, max = o.max != null ? o.max : 100;
    const x = i => L + (W - L - R) * (labels.length === 1 ? 0.5 : i / (labels.length - 1));
    const y = v => Tp + (Hh - Tp - B) * (1 - (v - min) / (max - min));
    let g = '';
    for (let v = min; v <= max; v += (max - min) / 4) g += '<line class="grid-l" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end">' + Math.round(v) + '</text>';
    labels.forEach((l, i) => { g += '<text x="' + x(i).toFixed(1) + '" y="' + (Hh - 8) + '" text-anchor="middle">' + esc(l) + '</text>'; });
    if (o.ref != null) g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(o.ref) + '" y2="' + y(o.ref) + '" stroke="currentColor" stroke-dasharray="0" opacity=".35"/>';
    series.forEach(s => {
      const pts = s.values.map((v, i) => v == null ? null : [x(i), y(v), v, labels[i]]).filter(Boolean);
      g += '<polyline class="ln' + (s.cls ? ' ' + s.cls : '') + '" points="' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '"/>';
      pts.forEach(p => { g += '<circle class="pt' + (s.cls ? ' ' + s.cls : '') + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.5"><title>' + esc(s.name + ' · ' + p[3] + ': ' + p[2]) + '</title></circle>'; });
    });
    const legend = series.length > 1 ? '<div class="legend">' + series.map(s => '<span><i class="' + (s.cls || '') + '"></i>' + esc(s.name) + '</span>').join('') + '</div>' : '';
    return '<figure class="linechart"><svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="' + esc(o.label || series.map(s => s.name).join(', ')) + '">' + g + '</svg>' + legend + (o.caption ? '<figcaption class="muted" style="font-size:12px;margin-top:6px">' + o.caption + '</figcaption>' : '') + '</figure>';
  }

  function tabs(items, current) {
    return '<nav class="tabs" aria-label="Secciones">' + items.map(t => '<a href="' + t[2] + '"' + (t[0] === current ? ' aria-current="page"' : '') + '>' + esc(t[1]) + '</a>').join('') + '</nav>';
  }

  function stepper(steps, current, hrefFn) {
    return '<ol class="steps" aria-label="Pasos">' + steps.map((s, i) => '<li><a class="step' + (i < current ? ' done' : '') + '" href="' + hrefFn(i) + '"' + (i === current ? ' aria-current="step"' : '') + '><i>' + (i < current ? '✓' : i + 1) + '</i>' + esc(s) + '</a></li>').join('') + '</ol>';
  }

  const dl = pairs => '<dl class="dl">' + pairs.map(p => '<dt>' + esc(p[0]) + '</dt><dd>' + p[1] + '</dd>').join('') + '</dl>';
  const progress = (v, max, cls) => '<div class="progress' + (cls ? ' ' + cls : '') + '" role="progressbar" aria-valuemin="0" aria-valuemax="' + max + '" aria-valuenow="' + v + '"><i style="width:' + (max ? Math.round(100 * v / max) : 0) + '%"></i></div>';
  const userCell = (name, sub) => '<span class="cell-user">' + av(name) + '<span class="meta"><b>' + esc(name) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span></span>';
  const demoNote = text => '<p class="muted" style="font-size:12px;margin-top:10px">' + T.demo() + ' ' + (text || 'Valores inventados para mostrar el diseño.') + '</p>';

  /* ============================================================
     Roles: who they are and what their sidebar shows
     ============================================================ */
  const ORG = X.orgs[0];
  const ROLES = {
    superadmin: {
      label: 'Superadministrador', person: 'Martín Aguirre', email: 'martin.aguirre@shiftready.demo', ws: 'Consola de plataforma', wsShort: 'SR', home: 'overview', search: 'Buscar empresas, usuarios o tickets…',
      nav: [
        ['Plataforma', [['overview', 'Resumen global', 'layers'], ['companies', 'Empresas', 'building'], ['users', 'Usuarios', 'users']]],
        ['Comercial', [['plans', 'Planes y suscripciones', 'award'], ['usage', 'Uso y límites', 'trending']]],
        ['Operación', [['integrations', 'Integraciones', 'external'], ['support', 'Soporte', 'help', '3']]],
        ['Gobierno', [['audit', 'Actividad y auditoría', 'list'], ['settings', 'Configuración global', 'sliders']]]
      ],
      workspaces: [['Consola de plataforma', 'Superadministrador', 'SR', true]]
    },
    admin: {
      label: 'Administradora de empresa', person: 'Laura Méndez', email: 'laura.mendez@bahia.demo', ws: ORG.name, wsShort: ORG.short, home: 'home', search: 'Buscar personas, equipos o campañas…',
      nav: [
        ['General', [['home', 'Inicio', 'home']]],
        ['Personas', [['directory', 'Directorio', 'users'], ['teams', 'Equipos y grupos', 'grid'], ['supervisors', 'Supervisores', 'headset'], ['invitations', 'Invitaciones', 'mail', '2']]],
        ['Formación', [['campaigns', 'Campañas', 'flag'], ['scenarios', 'Biblioteca de escenarios', 'chat'], ['documents', 'Documentos y políticas', 'book'], ['training', 'Configuración de formación', 'sliders']]],
        ['Resultados', [['reports', 'Informes', 'trending']]],
        ['Organización', [['org', 'Configuración de la empresa', 'building'], ['plan', 'Plan y uso', 'award']]]
      ],
      workspaces: [[ORG.name, 'Administradora de empresa', ORG.short, true], [X.orgs[1].name, 'Supervisora / coach', X.orgs[1].short, false]]
    },
    coach: {
      label: 'Supervisor / coach', person: 'Diego Ramos', email: 'diego.ramos@bahia.demo', ws: ORG.name, wsShort: ORG.short, home: 'team', search: 'Buscar participantes o sesiones de tu equipo…',
      nav: [
        ['General', [['team', 'Resumen del equipo', 'home']]],
        ['Equipo', [['participants', 'Participantes', 'users'], ['progress', 'Seguimiento del progreso', 'checks']]],
        ['Formación', [['campaigns', 'Campañas asignadas', 'flag'], ['review', 'Revisión de conversaciones', 'chat']]],
        ['Análisis', [['results', 'Resultados de sesiones', 'target'], ['errors', 'Análisis de errores', 'alert'], ['strengths', 'Fortalezas y mejoras', 'star'], ['coaching', 'Recomendaciones', 'sparkle'], ['reports', 'Informes de equipo', 'trending']]]
      ],
      workspaces: [[ORG.name, 'Supervisor / coach', ORG.short, true]]
    },
    agent: {
      label: 'Agente', person: 'Ana Torres', email: 'ana.torres@bahia.demo', ws: ORG.name, wsShort: ORG.short, home: 'home', search: 'Buscar en mis entrenamientos…',
      nav: [
        ['General', [['home', 'Inicio', 'home']]],
        ['Entrenar', [['trainings', 'Mis entrenamientos', 'flag'], ['setup', 'Nueva sesión', 'play']]],
        ['Resultados', [['history', 'Historial', 'clock'], ['recommendations', 'Recomendaciones', 'sparkle']]],
        ['Cuenta', [['profile', 'Perfil y preferencias', 'user']]]
      ],
      workspaces: [[ORG.name, 'Agente', ORG.short, true]]
    }
  };

  /* ============================================================
     State
     ============================================================ */
  const ui = {
    route: null, menu: null, drawer: false, dialog: null, toast: null, f: {}, fKey: '',
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
    brand: null,
    wiz: null, wizFor: null,
    setup: { source: 'c1', days: [2], difficulty: 'medium', customers: '', reply: 'auto' }
  };
  // Example values for a new campaign in the wizard (demo)
  const WIZ_DEFAULT = { name: 'Clientes difíciles · noviembre', desc: 'Práctica guiada para el equipo de la mañana.', goal: 'Desescalar, decir que no sin perder al cliente y escalar cuando corresponde.', teams: ['Retail A · Mañana'], days: [4, 5], difficulty: 'hard', customers: '', reply: 'auto', channel: 'chat', completion: 'all', attempts: '3', start: '2026-11-16', end: '2026-11-30', reports: ['individual', 'team', 'campaign'] };

  // The new ShiftReady logo (assets/js/logo.js, shared with the simulator); a drawn fallback if it is missing
  const brandMark = size => (SR.logo && SR.logo.tile) ? SR.logo.tile(size, { word: false })
    : '<span style="display:inline-grid;place-items:center;width:' + size + 'px;height:' + size + 'px;color:currentColor">' + ic('mark', Math.round(size * 0.86)) + '</span>';
  const wordmark = () => '<span><span style="font-weight:800">Shift</span><span style="font-weight:500">Ready</span></span>';

  /* ============================================================
     Router
     ============================================================ */
  // The query part (?step=2, ?source=free) travels with the route
  function parse() {
    const raw = (location.hash || '#/access/landing').replace(/^#\/?/, '');
    const qi = raw.indexOf('?');
    const q = new URLSearchParams(qi === -1 ? '' : raw.slice(qi + 1));
    const parts = (qi === -1 ? raw : raw.slice(0, qi)).split('/').filter(Boolean);
    if (parts[0] === 'app' && ROLES[parts[1]]) return { area: 'app', role: parts[1], page: parts[2] || ROLES[parts[1]].home, id: parts[3] || null, sub: parts[4] || null, q };
    return { area: 'access', page: parts[1] || 'landing', q };
  }

  function render() {
    const r = ui.route = parse();
    const key = r.area + r.role + r.page + r.id;
    if (ui.fKey !== key) { ui.f = {}; ui.fKey = key; }
    let html = demoBar(r);
    if (r.area === 'access') html += renderAccess(r.page);
    else html += shell(r);
    root.innerHTML = html + (ui.dialog ? renderDialog(ui.dialog) : '') + (ui.toast ? '<div class="toast" role="status">' + ic('checkCircle', 16) + '<span>' + esc(ui.toast) + '</span></div>' : '');
  }

  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  window.addEventListener('hashchange', () => {
    ui.menu = null; ui.drawer = false; ui.dialog = null;
    render();
    const main = document.getElementById('main');
    if (main) main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });

  /* ============================================================
     Demo banner (prototype only) with the review role switcher
     ============================================================ */
  function demoBar(r) {
    const cur = r.area === 'access' ? 'access' : r.role;
    const opt = (v, l) => '<option value="' + v + '"' + (cur === v ? ' selected' : '') + '>' + l + '</option>';
    return '<div class="demo-bar" role="note"><b>PROTOTIPO DE DISEÑO</b><span class="dsc">Datos demostrativos · sin servidor ni autenticación real · no es el producto final</span><span class="sp"></span>' +
      '<label>Vista de revisión<select data-act="review-role" aria-describedby="reviewHint">' + opt('access', 'Acceso (público)') + opt('superadmin', 'Superadministrador') + opt('admin', 'Administrador de empresa') + opt('coach', 'Supervisor / coach') + opt('agent', 'Agente') + '</select></label>' +
      '<span id="reviewHint" class="sr-only">Solo para revisar el diseño. En el producto el rol lo asigna la organización y no se puede elegir.</span>' +
      '<a href="../index.html" target="_blank" rel="noopener">Simulador actual ↗</a>' +
      '<button class="btn btn-sm btn-ghost" data-act="theme" style="height:26px;color:inherit" aria-label="Cambiar a modo ' + (ui.theme === 'dark' ? 'claro' : 'oscuro') + '">' + ic(ui.theme === 'dark' ? 'sun' : 'moon', 14) + (ui.theme === 'dark' ? 'Claro' : 'Oscuro') + '</button></div>';
  }

  /* ============================================================
     App shell
     ============================================================ */
  function shell(r) {
    const R = ROLES[r.role];
    const screen = (SCREENS[r.role] || {})[r.page];
    document.title = (screen ? screen.title : 'Página no encontrada') + ' · ' + R.ws + ' · ShiftReady (prototipo)';
    const content = screen ? screen.render(r) : notFound(r);
    const nav = R.nav.map(g => '<div class="sb-group"><h2>' + esc(g[0]) + '</h2><ul>' + g[1].map(it => {
      const active = it[0] === r.page || (screen && screen.parent === it[0]);
      return '<li><a class="sb-link" href="' + H(r.role, it[0]) + '"' + (active ? ' aria-current="page"' : '') + '>' + ic(it[2], 17) + '<span>' + esc(it[1]) + '</span>' + (it[3] ? '<span class="count" aria-label="' + it[3] + ' pendientes">' + it[3] + '</span>' : '') + '</a></li>';
    }).join('') + '</ul></div>').join('');
    const multi = R.workspaces.length > 1;
    return '<div class="shell">' +
      (ui.drawer ? '<div class="scrim" data-act="drawer" aria-hidden="true"></div>' : '') +
      '<aside class="sidebar' + (ui.drawer ? ' open' : '') + '" id="sidebar" aria-label="Navegación principal">' +
        '<a class="sb-brand" href="' + H(r.role, R.home) + '">' + brandMark(28) + '<span>' + wordmark() + '<small>' + esc(r.role === 'superadmin' ? 'Consola de plataforma' : 'Formación de agentes') + '</small></span></a>' +
        '<nav class="sb-nav">' + nav + '</nav>' + sidebarFoot(r.role) +
      '</aside>' +
      '<div class="main">' +
        '<header class="topbar">' +
          '<button class="icon-btn tb-menu" data-act="drawer" aria-label="Abrir menú" aria-expanded="' + ui.drawer + '" aria-controls="sidebar">' + ic('menu', 20) + '</button>' +
          '<div style="position:relative"><button class="ws-btn" ' + (multi || r.role === 'superadmin' ? 'data-act="menu" data-arg="ws" aria-haspopup="menu" aria-expanded="' + (ui.menu === 'ws') + '"' : 'aria-disabled="true" title="Solo perteneces a este espacio de trabajo"') + '>' +
            '<span class="ws-logo" aria-hidden="true">' + esc(R.wsShort) + '</span><span class="t">' + esc(R.ws) + '</span>' + (multi || r.role === 'superadmin' ? ic('chevDown', 15) : '') + '</button>' +
            (ui.menu === 'ws' ? wsMenu(r) : '') + '</div>' +
          '<label class="tb-search">' + ic('search', 15) + '<span class="sr-only">Buscar</span><input type="search" placeholder="' + esc(R.search) + '" data-act="search"><kbd>/</kbd></label>' +
          '<span class="tb-sp"></span>' +
          '<div style="position:relative"><button class="icon-btn" data-act="menu" data-arg="help" aria-label="Ayuda" aria-haspopup="menu" aria-expanded="' + (ui.menu === 'help') + '">' + ic('help', 19) + '</button>' + (ui.menu === 'help' ? helpMenu() : '') + '</div>' +
          '<div style="position:relative"><button class="icon-btn" data-act="menu" data-arg="notif" aria-label="Notificaciones, 2 sin leer" aria-haspopup="menu" aria-expanded="' + (ui.menu === 'notif') + '">' + ic('bell', 19) + '<span class="dot" aria-hidden="true"></span></button>' + (ui.menu === 'notif' ? notifMenu(r.role) : '') + '</div>' +
          '<div style="position:relative"><button class="me-btn" data-act="menu" data-arg="me" aria-haspopup="menu" aria-expanded="' + (ui.menu === 'me') + '">' + av(R.person) + '<span class="t"><b>' + esc(R.person) + '</b><small>' + esc(R.label) + '</small></span>' + ic('chevDown', 14) + '</button>' + (ui.menu === 'me' ? meMenu(r) : '') + '</div>' +
        '</header>' +
        '<main id="main" class="page" tabindex="-1">' + content + '</main>' +
      '</div></div>';
  }

  function sidebarFoot(role) {
    if (role === 'superadmin') return '<div class="sb-foot"><b>Acceso privado</b>Asignado por procedimiento interno autorizado. Toda acción queda auditada.</div>';
    if (role === 'admin') return '<div class="sb-foot"><b>Plan ' + esc(ORG.plan) + ' ' + T.demo() + '</b><div class="sb-meter"><i style="width:' + Math.round(100 * ORG.seats / ORG.seatLimit) + '%"></i></div>' + ORG.seats + ' de ' + ORG.seatLimit + ' puestos en uso</div>';
    if (role === 'coach') return '<div class="sb-foot"><b>Retail A · Mañana</b>5 participantes a tu cargo</div>';
    return '<div class="sb-foot"><b>Onboarding Retail</b><div class="sb-meter"><i style="width:50%"></i></div>1 de 2 días completados ' + T.demo() + '</div>';
  }

  function menuWrap(items, label, side) {
    return '<div class="menu" role="menu" aria-label="' + esc(label) + '" style="top:calc(100% + 6px);' + (side === 'left' ? 'left:0' : 'right:0') + '">' + items + '</div>';
  }
  function wsMenu(r) {
    const R = ROLES[r.role];
    let items = '<h3>Espacios de trabajo</h3>' + R.workspaces.map(w => '<a class="menu-item" role="menuitemradio" aria-checked="' + w[3] + '" href="' + A('workspaces') + '"><span class="ws-logo" style="width:28px;height:28px;display:grid;place-items:center;background:var(--navy-700);color:#fff;font-size:11px;font-weight:700">' + esc(w[2]) + '</span><span class="meta"><b>' + esc(w[0]) + '</b><small>' + esc(w[1]) + '</small></span>' + (w[3] ? ic('check', 15) : '') + '</a>').join('');
    if (r.role === 'superadmin') items += '<hr><button class="menu-item" role="menuitem" data-act="dialog" data-arg="support-access">' + ic('shieldCheck', 16) + '<span class="meta"><b>Acceso de soporte a una empresa</b><small>Con motivo, tiempo limitado y auditoría</small></span></button>';
    return menuWrap(items, 'Cambiar de espacio de trabajo', 'left');
  }
  function helpMenu() {
    return menuWrap('<button class="menu-item" role="menuitem" data-act="dialog" data-arg="shortcuts">' + ic('keyboard', 16) + 'Atajos de teclado</button>' +
      '<a class="menu-item" role="menuitem" href="#" data-act="toast" data-arg="El centro de ayuda es una función futura.">' + ic('book', 16) + 'Centro de ayuda ' + T.future() + '</a>' +
      '<a class="menu-item" role="menuitem" href="#" data-act="toast" data-arg="Contactar con soporte abriría un ticket (función futura).">' + ic('mail', 16) + 'Contactar con soporte</a>', 'Ayuda');
  }
  function notifMenu(role) {
    const N = {
      superadmin: [['La prueba de Costa Retail Care termina en 3 días', 'Hace 1 h'], ['Nuevo ticket de soporte #1042', 'Hace 2 h']],
      admin: [['Jorge Vidal aún no acepta la invitación', 'Hace 3 h'], ['La campaña «Clientes difíciles» empieza el 16 nov', 'Ayer']],
      coach: [['Carla Núñez bajó de 60 en su última sesión', 'Hace 1 h'], ['Daniel Ortega tiene un día pendiente', 'Ayer']],
      agent: [['Tienes un día pendiente en «Onboarding Retail»', 'Hace 1 h'], ['Tu coach dejó una recomendación', 'Ayer']]
    }[role];
    return menuWrap('<h3>Notificaciones ' + T.demo() + '</h3>' + N.map(n => '<div class="menu-item" role="menuitem" tabindex="-1">' + ic('dot', 10) + '<span class="meta"><b style="font-weight:500">' + esc(n[0]) + '</b><small>' + esc(n[1]) + '</small></span></div>').join('') +
      '<hr><a class="menu-item" role="menuitem" href="#" data-act="toast" data-arg="El centro de notificaciones es una función futura.">Ver todas ' + T.future() + '</a>', 'Notificaciones');
  }
  function meMenu(r) {
    const R = ROLES[r.role];
    return menuWrap('<div style="display:flex;gap:10px;align-items:center;padding:8px 10px">' + av(R.person, 'lg') + '<span class="meta" style="display:flex;flex-direction:column"><b>' + esc(R.person) + '</b><small class="muted">' + esc(R.email) + '</small>' + tag(R.label, 'info') + '</span></div><hr>' +
      (r.role === 'agent' ? '<a class="menu-item" role="menuitem" href="' + H('agent', 'profile') + '">' + ic('user', 16) + 'Perfil y preferencias</a>' : '<a class="menu-item" role="menuitem" href="#" data-act="toast" data-arg="Perfil personal (mismo diseño que el del agente).">' + ic('user', 16) + 'Mi perfil</a>') +
      '<button class="menu-item" role="menuitem" data-act="theme">' + ic(ui.theme === 'dark' ? 'sun' : 'moon', 16) + 'Modo ' + (ui.theme === 'dark' ? 'claro' : 'oscuro') + '</button>' +
      (R.workspaces.length > 1 ? '<a class="menu-item" role="menuitem" href="' + A('workspaces') + '">' + ic('rotate', 16) + 'Cambiar de espacio de trabajo</a>' : '') +
      '<hr><a class="menu-item" role="menuitem" href="' + A('login') + '">' + ic('logout', 16) + 'Cerrar sesión</a>', 'Menú de usuario');
  }

  function notFound(r) {
    return '<div class="card">' + empty({ icon: 'alert', title: 'Esta página no existe en el prototipo', text: 'Revisa la navegación lateral.', action: btn('Ir al inicio', { href: H(r.role, ROLES[r.role].home), kind: 'primary' }) }) + '</div>';
  }

  /* ============================================================
     ACCESS — public screens and account states (no sidebar)
     ============================================================ */
  function authLayout(inner, opts) {
    opts = opts || {};
    return '<div class="auth"><aside class="auth-side"><div><div class="brand">' + brandMark(40) + wordmark() + '</div></div>' +
      '<div><h2>' + esc(opts.headline || 'Entrena a tu equipo de atención al cliente con simulaciones reales.') + '</h2>' +
      '<p>' + esc(opts.text || 'Campañas de formación, simulaciones por chat con políticas de tu empresa y evaluaciones que tu equipo de supervisión puede usar para tomar decisiones.') + '</p>' +
      '<ul><li>' + ic('shieldCheck', 16) + '<span>Cada empresa ve solo sus datos.</span></li><li>' + ic('users', 16) + '<span>Los roles los asigna tu organización, nunca se eligen al registrarse.</span></li><li>' + ic('trending', 16) + '<span>Informes por agente, equipo y campaña.</span></li></ul></div>' +
      '<div class="foot">Pantallas de este flujo (revisión): ' + ['landing', 'login', 'recover', 'invite', 'request', 'workspaces', 'no-org', 'denied', 'disabled', 'expired'].map(p => '<a href="' + A(p) + '" style="color:#a7c0d8">' + p + '</a>').join(' · ') + '</div></aside>' +
      '<main id="main" class="auth-main" tabindex="-1">' + inner + '</main></div>';
  }

  function stateScreen(o) {
    return '<div class="auth" style="grid-template-columns:1fr"><main id="main" class="auth-main" tabindex="-1"><div class="state">' +
      '<span class="ic ' + o.tone + '">' + ic(o.icon, 26) + '</span>' + (o.badge || '') + '<h1>' + esc(o.title) + '</h1><p>' + o.text + '</p>' +
      '<div class="row" style="justify-content:center;margin-top:8px">' + o.actions + '</div>' + (o.note ? '<p class="muted" style="font-size:12px">' + o.note + '</p>' : '') + '</div></main></div>';
  }

  const PSTATE = {
    none: '<span class="pstate none">' + ic('user', 13) + 'Sin organización</span>',
    invited: '<span class="pstate invited">' + ic('mail', 13) + 'Invitado</span>',
    member: '<span class="pstate member">' + ic('checkCircle', 13) + 'Miembro</span>',
    multi: '<span class="pstate multi">' + ic('layers', 13) + 'Multi-espacio</span>'
  };

  const ACCESS = {
    landing: () => authLayout('<div class="auth-card"><h1>Bienvenido a ShiftReady</h1><p>Accede con la cuenta que te dio tu organización.</p><div class="stack">' +
      btn('Iniciar sesión', { href: A('login'), kind: 'primary', size: 'lg', block: true }) +
      btn('Tengo una invitación', { href: A('invite'), size: 'lg', block: true, icon: 'mail' }) +
      '<div class="or">¿Tu empresa aún no usa ShiftReady?</div>' +
      btn('Solicitar acceso para mi empresa', { href: A('request'), kind: 'ghost', block: true }) +
      alertBox('info', 'No hay registro con elección de rol', 'Los agentes y supervisores entran por invitación de su empresa. Los administradores de empresa los habilita ShiftReady al contratar, y el rol de superadministrador es interno.') +
      '<div><p class="muted" style="font-size:12px;margin-bottom:6px">Estados de una persona (cómo se distinguen en la interfaz):</p><div class="row">' + PSTATE.none + PSTATE.invited + PSTATE.member + PSTATE.multi + '</div></div>' +
      '</div></div>'),

    login: () => authLayout('<form class="auth-card" data-submit="' + A('workspaces') + '"><h1>Iniciar sesión</h1><p>Usa tu correo de trabajo.</p><div class="stack">' +
      '<div class="field"><label for="em">Correo electrónico</label><input id="em" class="input" type="email" autocomplete="username" placeholder="nombre@empresa.com" required></div>' +
      '<div class="field"><label for="pw">Contraseña</label><input id="pw" class="input" type="password" autocomplete="current-password" required></div>' +
      '<div class="auth-links"><label class="check"><input type="checkbox"> Recordarme en este equipo</label><a href="' + A('recover') + '">¿Olvidaste tu contraseña?</a></div>' +
      btn('Entrar', { type: 'submit', kind: 'primary', size: 'lg', block: true }) +
      '<div class="or">o</div>' + btn('Acceso con SSO de tu empresa', { block: true, disabled: true, icon: 'shieldCheck', after: ' ' + T.future('Próximamente') }) +
      '<p class="muted" style="font-size:12px">' + T.demo() + ' En el prototipo cualquier dato te lleva al selector de espacio de trabajo; no hay autenticación real.</p>' +
      '<div class="auth-links"><a href="' + A('invite') + '">Tengo una invitación</a><a href="' + A('landing') + '">Volver</a></div></div></form>'),

    recover: () => authLayout('<form class="auth-card" data-submit="' + A('recover-sent') + '"><h1>Recuperar contraseña</h1><p>Te enviaremos un enlace para crear una nueva.</p><div class="stack">' +
      '<div class="field"><label for="rem">Correo electrónico</label><input id="rem" class="input" type="email" autocomplete="email" required></div>' +
      btn('Enviar enlace', { type: 'submit', kind: 'primary', size: 'lg', block: true }) + '<a href="' + A('login') + '">Volver a iniciar sesión</a></div></form>'),

    'recover-sent': () => authLayout('<div class="auth-card"><h1>Revisa tu correo</h1><p>Si existe una cuenta con ese correo, recibirás un enlace válido durante 30 minutos.</p>' +
      alertBox('info', 'Por seguridad no confirmamos si el correo existe.', '') + '<div class="stack" style="margin-top:16px">' + btn('Volver a iniciar sesión', { href: A('login'), block: true }) + '</div></div>'),

    invite: () => authLayout('<div class="auth-card"><div class="row" style="margin-bottom:12px">' + PSTATE.invited + T.demo() + '</div><h1>Te invitaron a unirte</h1><p>Revisa los datos antes de aceptar.</p>' +
      '<div class="card"><div class="card-b"><div class="row" style="margin-bottom:12px"><span class="ws-logo" style="width:40px;height:40px;display:grid;place-items:center;background:var(--navy-700);color:#fff;font-weight:700">' + ORG.short + '</span><span><b>' + esc(ORG.name) + '</b><br><small class="muted">Invitación de Laura Méndez · caduca el 1 nov</small></span></div>' +
      dl([['Correo', 'jorge.vidal@bahia.demo'], ['Rol asignado', tag('Agente', 'info') + ' <span class="muted" style="font-size:12px">' + ic('lock', 12) + ' Lo define la organización</span>'], ['Equipo', 'Nuevos ingresos']]) + '</div></div>' +
      '<div class="stack" style="margin-top:16px">' + btn('Aceptar y crear mi cuenta', { href: A('invite-account'), kind: 'primary', size: 'lg', block: true }) + btn('Rechazar invitación', { kind: 'ghost', block: true, act: 'toast', arg: 'La invitación se rechazaría y se avisaría a quien la envió.' }) +
      '<p class="muted" style="font-size:12px">¿Ya tienes cuenta en ShiftReady? Inicia sesión y la invitación se añadirá a tus espacios de trabajo.</p></div></div>'),

    'invite-account': () => authLayout('<form class="auth-card" data-submit="' + A('onboarding') + '"><h1>Crea tu cuenta</h1><p>Te unirás a ' + esc(ORG.name) + ' como Agente.</p><div class="stack">' +
      '<div class="field"><label for="nm">Nombre y apellido</label><input id="nm" class="input" autocomplete="name" value="Jorge Vidal" required></div>' +
      '<div class="field"><label for="iem">Correo electrónico</label><input id="iem" class="input" value="jorge.vidal@bahia.demo" readonly aria-describedby="iemh"><span class="hint" id="iemh">' + ic('lock', 12) + ' Es el correo al que llegó la invitación.</span></div>' +
      '<div class="field"><label for="npw">Contraseña</label><input id="npw" class="input" type="password" autocomplete="new-password" aria-describedby="npwh" required><span class="hint" id="npwh">Al menos 10 caracteres. Evita contraseñas que uses en otros sitios.</span></div>' +
      '<div class="field"><span class="lbl">Rol</span><div>' + tag('Agente', 'info') + ' <span class="muted" style="font-size:12px">Asignado por tu organización; no se puede cambiar aquí.</span></div></div>' +
      '<label class="check"><input type="checkbox" required> Acepto los términos de uso y la política de privacidad de ' + esc(ORG.name) + ' y ShiftReady.</label>' +
      btn('Crear cuenta y unirme', { type: 'submit', kind: 'primary', size: 'lg', block: true }) + '</div></form>'),

    onboarding: () => authLayout('<div class="auth-card" style="max-width:520px"><div class="row" style="margin-bottom:12px">' + PSTATE.member + '</div><h1>Bienvenido a ' + esc(ORG.name) + '</h1><p>Tres pasos para empezar.</p>' +
      '<ol class="stack">' + [['Completa tu perfil', 'Nombre visible, idioma y zona horaria.', true], ['Elige tus preferencias', 'Sonido, modo oscuro y avisos.', false], ['Haz tu primer entrenamiento', 'Tu supervisor ya te asignó «Onboarding Retail».', false]].map((s, i) =>
        '<li class="choice' + (s[2] ? ' on' : '') + '"><span class="tag ' + (s[2] ? 'tag-success' : '') + '">' + (s[2] ? '✓' : i + 1) + '</span><span><b>' + esc(s[0]) + '</b><small>' + esc(s[1]) + '</small></span></li>').join('') + '</ol>' +
      '<div class="stack" style="margin-top:16px">' + btn('Ir a mi inicio', { href: H('agent', 'home'), kind: 'primary', size: 'lg', block: true }) + '</div></div>', { headline: 'Tu organización te espera.', text: 'Tu rol y tus equipos ya están configurados por tu administrador.' }),

    workspaces: () => authLayout('<div class="auth-card" style="max-width:480px"><div class="row" style="margin-bottom:12px">' + PSTATE.multi + T.demo() + '</div><h1>Elige un espacio de trabajo</h1><p>Perteneces a más de una organización. Puedes cambiar luego desde la barra superior.</p>' +
      '<div class="ws-list">' +
        '<a class="ws-item" href="' + H('admin', 'home') + '"><span class="ws-logo">' + X.orgs[0].short + '</span><span class="meta"><b>' + esc(X.orgs[0].name) + '</b><small>Administradora de empresa · ' + X.orgs[0].seats + ' personas</small></span>' + ic('chevRight', 16) + '</a>' +
        '<a class="ws-item" href="' + H('coach', 'team') + '"><span class="ws-logo">' + X.orgs[1].short + '</span><span class="meta"><b>' + esc(X.orgs[1].name) + '</b><small>Supervisora / coach · equipo Soporte 1</small></span>' + ic('chevRight', 16) + '</a>' +
        '<a class="ws-item" href="' + H('superadmin', 'overview') + '" style="border-style:dashed"><span class="ws-logo" style="background:var(--navy-900)">SR</span><span class="meta"><b>Consola de plataforma</b><small>Solo aparece en cuentas internas de ShiftReady autorizadas</small></span>' + ic('lock', 16) + '</a>' +
      '</div></div>'),

    request: () => authLayout('<form class="auth-card" data-submit="' + A('request-sent') + '"><h1>Solicitar acceso para tu empresa</h1><p>Nuestro equipo valida la empresa y configura el espacio de trabajo.</p><div class="stack">' +
      '<div class="field"><label for="co">Empresa</label><input id="co" class="input" required></div>' +
      '<div class="form-grid"><div class="field"><label for="rn">Tu nombre</label><input id="rn" class="input" autocomplete="name" required></div><div class="field"><label for="re">Correo de trabajo</label><input id="re" class="input" type="email" autocomplete="email" required></div></div>' +
      '<div class="field"><label for="sz">Agentes a formar</label><select id="sz" class="select"><option>Menos de 25</option><option>25–150</option><option>150–500</option><option>Más de 500</option></select></div>' +
      alertBox('info', 'Esto no crea una cuenta con permisos.', 'Cuando la empresa se valida, ShiftReady envía la invitación a su primer administrador.') +
      btn('Enviar solicitud', { type: 'submit', kind: 'primary', size: 'lg', block: true }) + '<a href="' + A('landing') + '">Volver</a></div></form>'),

    'request-sent': () => stateScreen({ tone: 'info', icon: 'checkCircle', title: 'Solicitud recibida', text: 'Te escribiremos al correo indicado. Mientras tanto no se ha creado ninguna cuenta ni permiso.', actions: btn('Volver al inicio', { href: A('landing'), kind: 'primary' }) }),

    'no-org': () => stateScreen({ tone: 'info', icon: 'users', badge: PSTATE.none, title: 'Tu cuenta aún no pertenece a ninguna organización', text: 'Para entrenar necesitas una invitación de tu empresa. Pide a tu administrador o supervisor que te invite con este correo.',
      actions: btn('Revisar invitaciones pendientes', { href: A('invite'), kind: 'primary' }) + btn('Solicitar acceso para mi empresa', { href: A('request') }) + btn('Cerrar sesión', { href: A('login'), kind: 'ghost' }) }),

    denied: () => stateScreen({ tone: 'warn', icon: 'lock', title: 'No tienes acceso a esta página', text: 'Tu rol en ' + esc(ORG.name) + ' no incluye este permiso. Si crees que deberías tenerlo, pídelo a un administrador de tu empresa.',
      actions: btn('Volver a mi inicio', { href: H('agent', 'home'), kind: 'primary' }) + btn('Solicitar acceso', { act: 'toast', arg: 'Se enviaría una solicitud al administrador (función futura).' }), note: 'Código 403 · el servidor valida el permiso aunque la interfaz oculte el enlace.' }),

    disabled: () => stateScreen({ tone: 'danger', icon: 'xCircle', title: 'Tu cuenta está desactivada', text: 'Un administrador de tu organización desactivó el acceso. No se muestran datos de la empresa.', actions: btn('Contactar con mi administrador', { act: 'toast', arg: 'Se mostraría el contacto definido por la empresa.', kind: 'primary' }) + btn('Usar otra cuenta', { href: A('login') }) }),

    expired: () => stateScreen({ tone: 'info', icon: 'clock', title: 'Tu sesión ha caducado', text: 'Por seguridad cerramos la sesión tras un tiempo sin actividad. Vuelve a entrar para continuar donde estabas.', actions: btn('Iniciar sesión de nuevo', { href: A('login'), kind: 'primary' }), note: 'Una simulación en curso se pausa y se puede retomar al volver.' })
  };

  function renderAccess(page) {
    const fn = ACCESS[page] || ACCESS.landing;
    document.title = 'Acceso · ShiftReady (prototipo)';
    return fn();
  }

  /* ============================================================
     SUPERADMIN
     ============================================================ */
  const SA = 'superadmin';
  const totalSeats = X.orgs.reduce((s, o) => s + o.seats, 0);
  const SCREENS = {};
  SCREENS.superadmin = {
    overview: { title: 'Resumen global', render: () =>
      pageHead({ title: 'Resumen global', tags: ' ' + tag('Consola privada', 'info') + ' ' + T.demo(), sub: 'Estado de la plataforma ShiftReady para todas las empresas.', actions: btn('Nueva empresa', { kind: 'primary', icon: 'plus', act: 'dialog', arg: 'new-company' }) }) +
      alertBox('info', 'Rol interno y privado', 'El superadministrador solo se asigna por un procedimiento interno: solicitud aprobada por dos responsables, autenticación en dos pasos obligatoria y registro en auditoría. No existe en ningún formulario público.') +
      '<div class="section">' + kpis([
        { label: 'Empresas activas', value: X.orgs.filter(o => o.status === 'Activa').length, foot: 'de ' + X.orgs.length + ' registradas', src: 'backend', icon: 'building' },
        { label: 'Usuarios totales', value: totalSeats.toLocaleString('es'), foot: 'puestos ocupados', src: 'backend', icon: 'users' },
        { label: 'Sesiones (30 días)', value: X.orgs.reduce((s, o) => s + o.sessions30, 0).toLocaleString('es'), foot: 'simulaciones completadas', src: 'backend', icon: 'chat' },
        { label: 'Cuentas que requieren atención', value: X.orgs.filter(o => o.status !== 'Activa').length, foot: 'prueba o suspendida', src: 'backend', icon: 'alert' }
      ]) + '</div>' +
      '<div class="grid g-2-1 section">' +
        card('Puestos ocupados por empresa', bars(X.orgs.map(o => ({ label: o.name.replace(' (demo)', ''), value: o.seats, max: o.seatLimit, text: o.seats + '/' + o.seatLimit, title: o.name + ': ' + o.seats + ' de ' + o.seatLimit + ' puestos' }))) + demoNote('Uso de puestos frente al límite del plan.')) +
        card('Actividad administrativa reciente', '<ul class="list">' + X.audit.slice(0, 4).map(a => '<li><span class="meta"><b style="font-weight:500">' + esc(a.what) + '</b><small>' + esc(a.who) + ' · ' + esc(a.when) + '</small></span></li>').join('') + '</ul>', { flush: true, foot: '<a href="' + H(SA, 'audit') + '">Ver auditoría completa</a>' }) +
      '</div>' },

    companies: { title: 'Empresas', render: () => {
      const rows = X.orgs.filter(o => (!ui.f.q || o.name.toLowerCase().includes(ui.f.q.toLowerCase())) && (!ui.f.plan || o.plan === ui.f.plan) && (!ui.f.status || o.status === ui.f.status));
      return pageHead({ title: 'Empresas', tags: ' ' + T.demo(), sub: 'Organizaciones que usan ShiftReady. Cada una está aislada de las demás.', actions: btn('Exportar', { icon: 'download', disabled: true, after: ' ' + T.future() }) + btn('Nueva empresa', { kind: 'primary', icon: 'plus', act: 'dialog', arg: 'new-company' }) }) +
        card('', table([
          ['Empresa', o => '<a class="rowlink" href="' + H(SA, 'companies', o.id) + '">' + esc(o.name) + '</a><br><small class="muted">' + esc(o.region) + '</small>'],
          ['Plan', o => tag(o.plan, o.plan === 'Prueba' ? 'info' : 'neutral')],
          ['Estado', o => tag(o.status)],
          ['Puestos', o => '<span class="num">' + o.seats + ' / ' + o.seatLimit + '</span>' + progress(o.seats, o.seatLimit)],
          ['Sesiones 30 d', o => o.sessions30.toLocaleString('es'), { num: true }],
          ['Alta', o => esc(o.created)]
        ], rows, { filters: filterBar('Buscar empresa', [{ key: 'plan', label: 'Plan', options: X.plans.map(p => [p.name, p.name]) }, { key: 'status', label: 'Estado', options: [['Activa', 'Activa'], ['Prueba', 'Prueba'], ['Suspendida', 'Suspendida']] }]), caption: 'Empresas registradas', empty: { icon: 'building', title: 'Ninguna empresa coincide', text: 'Cambia los filtros o crea una empresa nueva.' } }), { flush: true });
    } },

    users: { title: 'Usuarios', render: () => {
      const all = X.people.map(p => Object.assign({ org: ORG.name, mfa: p.role.indexOf('Admin') === 0 || p.role.indexOf('Administra') === 0 }, p)).concat([
        { name: 'Rocío Galván', email: 'rocio.galvan@shiftready.demo', role: 'Soporte ShiftReady', org: 'ShiftReady (interno)', team: '—', status: 'Activo', last: 'Hoy', mfa: true },
        { name: 'Tomás Ibarra', email: 'tomas.ibarra@andes.demo', role: 'Administrador de empresa', org: X.orgs[1].name, team: '—', status: 'Activo', last: 'Ayer', mfa: true }]);
      const rows = all.filter(p => !ui.f.q || (p.name + p.email).toLowerCase().includes(ui.f.q.toLowerCase())).filter(p => !ui.f.status || p.status === ui.f.status);
      return pageHead({ title: 'Usuarios', tags: ' ' + T.demo(), sub: 'Búsqueda global de cuentas. Solo el superadministrador ve usuarios de varias empresas.' }) +
        card('', table([
          ['Persona', p => userCell(p.name, p.email)], ['Empresa', p => esc(p.org)], ['Rol', p => esc(p.role)], ['Estado', p => tag(p.status)],
          ['2 pasos', p => p.mfa ? tag('Activo', 'success') : '<span class="muted">No</span>'], ['Último acceso', p => esc(p.last)]
        ], rows, { filters: filterBar('Buscar por nombre o correo', [{ key: 'status', label: 'Estado', options: [['Activo', 'Activo'], ['Invitado', 'Invitado'], ['Desactivado', 'Desactivado']] }]), caption: 'Usuarios de la plataforma' }), { flush: true });
    } },

    plans: { title: 'Planes y suscripciones', render: () =>
      pageHead({ title: 'Planes y suscripciones', tags: ' ' + T.demo(), sub: 'Límites por plan. Los precios y el cobro están fuera de esta fase.' }) +
      alertBox('warning', 'Sin precios ni pagos en esta fase', 'Los importes, la facturación y la pasarela de pago son decisiones pendientes y no se muestran.') +
      '<div class="grid g4 section">' + X.plans.map(p => card(esc(p.name), dl([['Puestos', esc(p.seats)], ['Ciclo', esc(p.days)], ['Canales', esc(p.channels)], ['Informes', esc(p.reports)], ['SSO', p.sso ? T.future('Previsto') : '—'], ['Precio', '<span class="muted">Fuera de esta fase</span>']]) , { foot: p.companies + ' empresa(s) en este plan' })).join('') + '</div>' +
      '<div class="section">' + card('Suscripciones', table([
        ['Empresa', o => esc(o.name)], ['Plan', o => esc(o.plan)], ['Estado', o => tag(o.status)], ['Puestos', o => o.seats + ' / ' + o.seatLimit, { num: true }], ['Renovación', () => '<span class="muted">—</span>']
      ], X.orgs, { pager: false, caption: 'Suscripciones por empresa' }), { flush: true }) + '</div>' },

    usage: { title: 'Uso y límites', render: () =>
      pageHead({ title: 'Uso y límites', tags: ' ' + T.demo(), sub: 'Consumo de cada empresa frente a su plan. Ayuda a anticipar ampliaciones.' }) +
      alertBox('warning', 'Pampa Soporte (demo) usa el 82 % de sus puestos', 'Se recomendaría avisar a su administrador antes de llegar al límite.') +
      '<div class="grid g2 section">' +
        card('Sesiones en los últimos 30 días', bars(X.orgs.map(o => ({ label: o.name.replace(' (demo)', ''), value: o.sessions30, max: 6500, text: o.sessions30.toLocaleString('es') }))) + demoNote()) +
        card('Límites por empresa', table([['Empresa', o => esc(o.name.replace(' (demo)', ''))], ['Puestos', o => Math.round(100 * o.seats / o.seatLimit) + ' %', { num: true }], ['Almacenamiento', () => T.future()], ['Voz', () => T.future()]], X.orgs, { pager: false, caption: 'Límites' }), { flush: true }) +
      '</div>' },

    integrations: { title: 'Integraciones', render: () =>
      pageHead({ title: 'Integraciones', sub: 'Servicios externos de la plataforma. En esta fase no hay ninguno conectado.' }) +
      alertBox('info', 'Ninguna integración está activa', 'Esta página muestra cómo se verán cuando existan. No se simula ninguna conexión.') +
      '<div class="grid g3 section">' + [['Correo transaccional', 'mail', 'Invitaciones, recuperación de contraseña y avisos.'], ['Inicio de sesión único (SAML / OIDC)', 'shieldCheck', 'Acceso con el proveedor de identidad de cada empresa.'], ['Webhooks y API', 'external', 'Enviar resultados a otros sistemas de la empresa.'], ['Proveedor de voz', 'mic', 'Simulaciones por llamada (futuro).'], ['Proveedor de IA', 'sparkle', 'Retroalimentación y escenarios asistidos (futuro, sin integrar).'], ['Almacenamiento de documentos', 'file', 'Políticas propias de cada empresa.']].map(it =>
        card(ic(it[1], 16) + esc(it[0]), '<p class="muted" style="font-size:13px">' + esc(it[2]) + '</p><div class="row" style="margin-top:12px">' + tag('No configurado', 'neutral') + T.future() + '<span class="spacer"></span>' + btn('Configurar', { size: 'sm', disabled: true }) + '</div>')).join('') + '</div>' },

    audit: { title: 'Actividad y auditoría', render: () => {
      const rows = X.audit.filter(a => !ui.f.scope || a.scope === ui.f.scope).filter(a => !ui.f.q || (a.who + a.what).toLowerCase().includes(ui.f.q.toLowerCase()));
      return pageHead({ title: 'Actividad y auditoría', tags: ' ' + T.demo(), sub: 'Quién hizo qué y cuándo. En el producto este registro será inmutable y lo escribirá el servidor.', actions: btn('Exportar', { icon: 'download', disabled: true, after: ' ' + T.future() }) }) +
        card('', table([['Cuándo', a => esc(a.when)], ['Quién', a => esc(a.who)], ['Acción', a => '<b style="font-weight:500">' + esc(a.what) + '</b><br><small class="muted">' + esc(a.detail) + '</small>'], ['Ámbito', a => tag(a.scope, a.scope === 'Plataforma' ? 'info' : 'neutral')]],
          rows, { filters: filterBar('Buscar actor o acción', [{ key: 'scope', label: 'Ámbito', options: [['Plataforma', 'Plataforma'], ['Empresa', 'Empresa']] }]), caption: 'Registro de auditoría' }), { flush: true });
    } },

    support: { title: 'Soporte', render: () =>
      pageHead({ title: 'Soporte', tags: ' ' + T.demo(), sub: 'Tickets de las empresas y accesos de soporte.' }) +
      '<div class="callout">' + ic('shieldCheck', 15) + ' <b>Política de acceso de soporte (propuesta):</b> entrar en el espacio de una empresa exige un motivo, un tiempo limitado, la aprobación de la empresa cuando se vean datos personales y queda en auditoría.</div>' +
      '<div class="section">' + card('', table([['Ticket', t => '<b>' + esc(t.id) + '</b>'], ['Empresa', t => esc(t.org)], ['Asunto', t => esc(t.subject)], ['Prioridad', t => tag(t.priority)], ['Estado', t => tag(t.status, t.status === 'Abierto' ? 'warning' : 'neutral')], ['Actualizado', t => esc(t.updated)]], X.tickets, { pager: false, caption: 'Tickets de soporte' }), { flush: true }) + '</div>' },

    settings: { title: 'Configuración global', render: () =>
      pageHead({ title: 'Configuración global', sub: 'Valores que afectan a todas las empresas.', actions: btn('Guardar cambios', { kind: 'primary', act: 'toast', arg: 'En el prototipo no se guarda nada.' }) }) +
      '<div class="grid g2">' +
        card('Seguridad', '<div class="stack">' + '<label class="check"><input type="checkbox" checked> Exigir verificación en dos pasos a administradores ' + T.mvp() + '</label><label class="check"><input type="checkbox" checked> Cerrar sesión tras 30 minutos sin actividad</label><label class="check"><input type="checkbox" disabled> Permitir SSO por empresa ' + T.future() + '</label></div>') +
        card('Datos y privacidad', dl([['Retención de sesiones', 'Configurable por empresa, con un máximo'], ['Región de datos', '<span class="muted">Se elige al crear el proyecto de Supabase</span>'], ['Exportación por usuario', T.future()]])) +
        card('Biblioteca estándar de escenarios', dl([['Casos', D.scenarios.length + ' ' + T.real()], ['Días de formación', D.days.length], ['Políticas', Object.keys(D.policies).length], ['Editor de escenarios', T.future()]])) +
        card('Idiomas', dl([['Interfaz', 'Español e inglés'], ['Simulaciones', 'Inglés (contenido actual)']])) +
      '</div>' }
  };
  // company detail lives at companies/<id>[/<tab>]
  const companiesList = SCREENS.superadmin.companies.render;
  SCREENS.superadmin.companies.render = r => (r.id ? companyDetail(r) : companiesList(r));
  function companyDetail(r) {
    const o = X.orgs.find(x => x.id === r.id) || X.orgs[0];
    const t = r.sub || 'summary';
    const base = H(SA, 'companies', o.id);
    let body;
    if (t === 'users') body = card('', table([['Persona', p => userCell(p.name, p.email)], ['Rol', p => esc(p.role)], ['Estado', p => tag(p.status)]], o.id === 'bahia' ? X.people : [], { pager: false, empty: { icon: 'users', title: 'Sin usuarios de demostración', text: 'Solo Bahía Contact Center tiene personas de ejemplo.' } }), { flush: true });
    else if (t === 'plan') body = '<div class="grid g2">' + card('Plan actual', dl([['Plan', esc(o.plan)], ['Puestos', o.seats + ' de ' + o.seatLimit], ['Estado', tag(o.status)], ['Precio', '<span class="muted">Fuera de esta fase</span>']]), { actions: btn('Cambiar plan', { size: 'sm', act: 'toast', arg: 'Cambiar de plan quedaría registrado en auditoría.' }) }) + card('Uso', progress(o.seats, o.seatLimit, 'accent') + '<p class="muted" style="font-size:13px;margin-top:8px">' + Math.round(100 * o.seats / o.seatLimit) + ' % de los puestos</p>') + '</div>';
    else if (t === 'activity') body = card('', table([['Cuándo', a => esc(a.when)], ['Quién', a => esc(a.who)], ['Acción', a => esc(a.what)]], X.audit.filter(a => a.what.indexOf(o.name.split(' (')[0]) !== -1 || o.id === 'bahia' && a.scope === 'Empresa'), { pager: false }), { flush: true });
    else body = '<div class="grid g-2-1">' + card('Datos de la empresa', dl([['Nombre', esc(o.name)], ['Región', esc(o.region)], ['Alta', esc(o.created)], ['Administradores', o.admins], ['Supervisores', o.coaches], ['Agentes', o.agents]])) +
      card('Acciones', '<div class="stack">' + btn('Acceso de soporte', { icon: 'shieldCheck', act: 'dialog', arg: 'support-access', block: true }) + btn('Reenviar invitación al administrador', { icon: 'mail', block: true, act: 'toast', arg: 'Se reenviaría la invitación (función futura).' }) + btn(o.status === 'Suspendida' ? 'Reactivar empresa' : 'Suspender empresa', { kind: 'danger-ghost', block: true, act: 'dialog', arg: 'suspend' }) + '</div>') + '</div>';
    return pageHead({ crumbs: [['Empresas', H(SA, 'companies')], [o.name]], title: o.name, tags: ' ' + tag(o.status) + ' ' + T.demo(), sub: 'Plan ' + esc(o.plan) + ' · ' + esc(o.region) }) +
      tabs([['summary', 'Resumen', base], ['users', 'Usuarios', base + '/users'], ['plan', 'Plan y uso', base + '/plan'], ['activity', 'Actividad', base + '/activity']], t) + body;
  }

  /* ============================================================
     COMPANY ADMIN
     ============================================================ */
  const AD = 'admin';
  const campaignRow = c => ({ c, days: daysLabel(c.days), diff: diffEs[c.difficulty] });
  SCREENS.admin = {
    home: { title: 'Inicio', render: () =>
      pageHead({ title: 'Hola, Laura', tags: ' ' + T.demo(), sub: 'Resumen de ' + esc(ORG.name) + '.', actions: btn('Invitar personas', { icon: 'mail', act: 'dialog', arg: 'invite' }) + btn('Nueva campaña', { kind: 'primary', icon: 'plus', href: H(AD, 'campaigns', 'new') }) }) +
      kpis([
        { label: 'Personas activas', value: ORG.seats, foot: 'de ' + ORG.seatLimit + ' puestos', src: 'backend', icon: 'users' },
        { label: 'Campañas activas', value: X.campaigns.filter(c => c.status === 'Activa').length, foot: '1 programada', src: 'backend', icon: 'flag' },
        { label: 'Sesiones (30 días)', value: ORG.sessions30.toLocaleString('es'), foot: 'simulaciones completadas', src: 'backend', icon: 'chat' },
        { label: 'Puntuación media', value: '74', delta: '+5', foot: 'frente al mes anterior', src: 'backend', icon: 'target' }
      ]) +
      '<div class="grid g-2-1 section">' +
        card('Campañas en curso', '<ul class="list">' + X.campaigns.filter(c => c.status !== 'Borrador').map(c => '<li><span class="meta"><a class="rowlink" href="' + H(AD, 'campaigns', c.id) + '" style="text-decoration:none;color:var(--text);font-weight:600">' + esc(c.name) + '</a><small>' + esc(daysLabel(c.days)) + ' · ' + diffEs[c.difficulty] + ' · ' + esc(c.groups) + '</small></span>' + tag(c.status) + '</li>').join('') + '</ul>', { flush: true, foot: '<a href="' + H(AD, 'campaigns') + '">Ver todas las campañas</a>' }) +
        card('Tareas sugeridas', '<ul class="list"><li>' + ic('alert', 16) + '<span class="meta"><b style="font-weight:500">«Nuevos ingresos» no tiene supervisor</b><small>Asigna un coach para seguir su progreso.</small></span></li><li>' + ic('mail', 16) + '<span class="meta"><b style="font-weight:500">1 invitación caducada</b><small>paula.rios@bahia.demo · reenvíala o revócala.</small></span></li><li>' + ic('award', 16) + '<span class="meta"><b style="font-weight:500">80 % de los puestos en uso</b><small>Revisa el plan antes de incorporar más personas.</small></span></li></ul>', { flush: true }) +
      '</div>' },

    directory: { title: 'Directorio', render: () => {
      const rows = X.people.filter(p => (!ui.f.q || (p.name + p.email).toLowerCase().includes(ui.f.q.toLowerCase())) && (!ui.f.role || p.role === ui.f.role) && (!ui.f.team || p.team === ui.f.team) && (!ui.f.status || p.status === ui.f.status));
      return pageHead({ title: 'Directorio', tags: ' ' + T.demo(), sub: 'Todas las personas de tu organización y su rol.', actions: btn('Importar CSV', { icon: 'upload', disabled: true, after: ' ' + T.future() }) + btn('Invitar personas', { kind: 'primary', icon: 'mail', act: 'dialog', arg: 'invite' }) }) +
        card('', table([
          ['Persona', p => userCell(p.name, p.email)], ['Rol', p => esc(p.role)], ['Equipo', p => esc(p.team)], ['Estado', p => tag(p.status)], ['Última actividad', p => esc(p.last)],
          ['', () => '<button class="icon-btn" aria-label="Acciones" data-act="toast" data-arg="Menú de acciones: cambiar rol, mover de equipo, desactivar.">' + ic('more', 16) + '</button>']
        ], rows, { filters: filterBar('Buscar por nombre o correo', [
          { key: 'role', label: 'Rol', options: [...new Set(X.people.map(p => p.role))].map(v => [v, v]) },
          { key: 'team', label: 'Equipo', options: X.teams.map(t => [t.name, t.name]) },
          { key: 'status', label: 'Estado', options: [['Activo', 'Activo'], ['Invitado', 'Invitado'], ['Desactivado', 'Desactivado']] }]), caption: 'Directorio de personas', empty: { icon: 'users', title: 'Nadie coincide con los filtros', text: 'Cambia los filtros o invita a nuevas personas.' } }), { flush: true });
    } },

    teams: { title: 'Equipos y grupos', render: () =>
      pageHead({ title: 'Equipos y grupos', tags: ' ' + T.demo(), sub: 'Los equipos definen qué ve cada supervisor y a quién se asignan las campañas.', actions: btn('Nuevo equipo', { kind: 'primary', icon: 'plus', act: 'toast', arg: 'Crear equipo: nombre, supervisor y miembros.' }) }) +
      '<div class="grid g3">' + X.teams.map(t => card(esc(t.name), dl([['Supervisor', t.coach === 'Sin asignar' ? tag('Sin asignar', 'warning') : esc(t.coach)], ['Miembros', t.members], ['Campañas', t.campaigns], ['Puntuación media', t.avg == null ? '<span class="muted">Sin datos aún</span>' : t.avg]]), { actions: btn('Gestionar', { size: 'sm', act: 'toast', arg: 'Gestionar miembros y supervisor del equipo.' }) })).join('') + '</div>' },

    supervisors: { title: 'Supervisores', render: () =>
      pageHead({ title: 'Supervisores', tags: ' ' + T.demo(), sub: 'Qué equipos supervisa cada coach y qué puede hacer.' }) +
      card('', table([
        ['Supervisor', p => userCell(p.name, p.email)], ['Equipos', p => esc(p.team)], ['Revisar conversaciones', () => tag('Sus equipos', 'success')], ['Crear y publicar campañas', () => tag('Sus equipos', 'success')], ['Invitar agentes', () => tag('Sus equipos', 'success')]
      ], X.people.filter(p => p.role === 'Supervisor / coach'), { pager: false, caption: 'Supervisores' }), { flush: true }) },

    invitations: { title: 'Invitaciones', render: () =>
      pageHead({ title: 'Invitaciones', tags: ' ' + T.demo(), sub: 'Invita a agentes y supervisores. El rol lo eliges tú; la persona no puede cambiarlo.', actions: btn('Nueva invitación', { kind: 'primary', icon: 'plus', act: 'dialog', arg: 'invite' }) }) +
      card('', table([
        ['Correo', i => '<b style="font-weight:500">' + esc(i.email) + '</b>'], ['Rol', i => esc(i.role)], ['Equipo', i => esc(i.team)], ['Enviada', i => esc(i.sent) + '<br><small class="muted">por ' + esc(i.by) + '</small>'], ['Caduca', i => esc(i.expires)], ['Estado', i => tag(i.status)],
        ['', i => i.status === 'Aceptada' ? '' : '<div class="row">' + btn('Reenviar', { size: 'sm', act: 'toast', arg: 'Se reenviaría la invitación.' }) + btn('Revocar', { size: 'sm', kind: 'ghost', act: 'toast', arg: 'La invitación dejaría de funcionar.' }) + '</div>']
      ], X.invitations, { pager: false, caption: 'Invitaciones' }), { flush: true }) },

    campaigns: { title: 'Campañas', render: r => {
      if (r.id === 'new' || r.sub === 'edit') return campaignEditor(r);
      if (r.id) return campaignDetail(r);
      const rows = X.campaigns.filter(c => !ui.f.status || c.status === ui.f.status);
      return pageHead({ title: 'Campañas', tags: ' ' + T.demo(), sub: 'Planes de formación: qué días y escenarios, con qué dificultad, para quién y hasta cuándo.', actions: btn('Nueva campaña', { kind: 'primary', icon: 'plus', href: H(AD, 'campaigns', 'new') }) }) +
        card('', table([
          ['Campaña', c => '<a class="rowlink" href="' + H(AD, 'campaigns', c.id) + '">' + esc(c.name) + '</a><br><small class="muted">' + esc(c.owner) + '</small>'], ['Estado', c => tag(c.status)], ['Contenido', c => esc(daysLabel(c.days)) + ' · ' + diffEs[c.difficulty]],
          ['Participantes', c => esc(c.groups)], ['Fechas', c => esc(c.dates)], ['Progreso', c => c.total ? '<span class="num">' + c.done + ' / ' + c.total + '</span>' + progress(c.done, c.total) : '<span class="muted">—</span>']
        ], rows, { filters: filterBar('Buscar campaña', [{ key: 'status', label: 'Estado', options: [['Activa', 'Activa'], ['Programada', 'Programada'], ['Borrador', 'Borrador'], ['Finalizada', 'Finalizada']] }]), caption: 'Campañas', empty: { icon: 'flag', title: 'Aún no hay campañas', text: 'Crea una para asignar entrenamientos a tus equipos.', action: btn('Nueva campaña', { kind: 'primary', href: H(AD, 'campaigns', 'new') }) } }), { flush: true });
    } },

    scenarios: { title: 'Biblioteca de escenarios', render: r => r.id ? scenarioDetail(r) : scenarioLibrary() },
    documents: { title: 'Documentos y políticas', render: () => documentsPage() },

    training: { title: 'Configuración de formación', render: () =>
      pageHead({ title: 'Configuración de formación', sub: 'Valores por defecto para tu organización. Cada campaña puede ajustarlos.', actions: btn('Guardar', { kind: 'primary', act: 'toast', arg: 'En el prototipo no se guarda nada.' }) }) +
      '<div class="grid g2">' +
        card('Dificultad por defecto', '<div class="stack">' + SS.DIFFICULTIES.map(d => '<label class="choice' + (d.id === 'medium' ? ' on' : '') + '"><input type="radio" name="defdiff"' + (d.id === 'medium' ? ' checked' : '') + '><span><b>' + esc(diffEs[d.id]) + '</b><small>' + esc(diffBlurbEs[d.id] || d.blurb) + '</small></span></label>').join('') + '</div>' + '<p class="muted" style="font-size:12px;margin-top:10px">' + T.real('Niveles reales del simulador') + '</p>') +
        card('Ritmo por defecto', paceFields('t', { customers: '', reply: 'auto' }, 'data-noop') + '<p class="muted" style="font-size:12px;margin-top:10px">Los mismos ajustes que el panel de configuración del simulador. Una campaña puede cambiarlos.</p>') +
        card('Reglas', '<div class="stack"><label class="check"><input type="checkbox" checked> Permitir práctica libre fuera de campañas</label><label class="check"><input type="checkbox" checked> Mostrar notas del coach según la dificultad</label>' +
          '<div class="field"><label for="pass">Nota para aprobar un día</label><input id="pass" class="input" value="60" readonly aria-describedby="passh"><span class="hint" id="passh">Regla actual del motor. Decidido: fija en el MVP; configurable por campaña más adelante, sin cambiar el motor.</span></div>' +
          '<label class="check"><input type="checkbox" disabled> Rúbricas de evaluación propias ' + T.future() + '</label><label class="check"><input type="checkbox" disabled> Entrenamiento por voz ' + T.future() + '</label></div>') +
      '</div>' },

    reports: { title: 'Informes', render: r => reportsPage(AD, r) },

    org: { title: 'Configuración de la empresa', render: () =>
      pageHead({ title: 'Configuración de la empresa', sub: 'Datos de la organización, seguridad y permisos.', actions: btn('Guardar', { kind: 'primary', act: 'toast', arg: 'En el prototipo no se guarda nada.' }) }) +
      '<div class="grid g2">' +
        card('Organización', '<div class="stack"><div class="field"><label for="on">Nombre</label><input id="on" class="input" value="' + esc(ORG.name) + '"></div><div class="form-grid"><div class="field"><label for="tz">Zona horaria</label><select id="tz" class="select"><option>América/Ciudad de México</option></select></div><div class="field"><label for="lg">Idioma</label><select id="lg" class="select"><option>Español</option><option>English</option></select></div></div><div class="field"><span class="lbl">Logo</span>' + btn('Subir logo', { icon: 'upload', disabled: true, after: ' ' + T.future() }) + '</div></div>') +
        card('Seguridad', '<div class="stack"><label class="check"><input type="checkbox" checked> Verificación en dos pasos para administradores</label><label class="check"><input type="checkbox" disabled> SSO (SAML / OIDC) ' + T.future() + '</label><label class="check"><input type="checkbox" disabled> Aprovisionamiento automático (SCIM) ' + T.future() + '</label></div>') +
        card('Roles y permisos', '<p style="font-size:13px">Tres roles dentro de la empresa: <b>Administrador</b>, <b>Supervisor / coach</b> y <b>Agente</b>. Los permisos detallados están en la matriz de roles.</p>' + alertBox('info', 'Ocultar un botón no es seguridad', 'El servidor validará cada permiso aunque la interfaz no muestre la acción.')) +
        card('Zona sensible', '<div class="stack">' + btn('Transferir la propiedad de la cuenta', { kind: 'danger-ghost', act: 'toast', arg: 'Requiere confirmación del nuevo propietario.' }) + '<p class="muted" style="font-size:12px">La baja de la empresa la gestiona ShiftReady para proteger los datos.</p></div>') +
      '</div>' },

    plan: { title: 'Plan y uso', render: () =>
      pageHead({ title: 'Plan y uso', tags: ' ' + T.demo(), sub: 'Lo que incluye tu plan y cuánto estás usando.' }) +
      '<div class="grid g3">' + card('Plan ' + esc(ORG.plan), dl([['Puestos', ORG.seatLimit], ['Canales', 'Chat · voz ' + T.future()], ['Informes', 'Equipo y campaña'], ['Precio', '<span class="muted">Fuera de esta fase</span>']])) +
        card('Puestos en uso', '<div class="kpi-v num">' + ORG.seats + '<span class="muted" style="font-size:16px"> / ' + ORG.seatLimit + '</span></div>' + progress(ORG.seats, ORG.seatLimit, 'accent')) +
        card('Sesiones este mes', '<div class="kpi-v num">' + ORG.sessions30.toLocaleString('es') + '</div><p class="muted" style="font-size:12px">Sin límite de sesiones en este plan</p>') + '</div>' +
      '<div class="section">' + alertBox('info', '¿Necesitas más puestos?', 'La ampliación la gestionaría tu contacto comercial; los pagos no forman parte de esta fase.') + '</div>' }
  };

  function campaignDetail(r) {
    const c = X.campaigns.find(x => x.id === r.id) || X.campaigns[0];
    const parts = X.roster.slice(0, 4);
    return pageHead({ crumbs: [['Campañas', H(AD, 'campaigns')], [c.name]], title: c.name, tags: ' ' + tag(c.status) + ' ' + T.demo(), sub: esc(c.goal), actions: btn('Duplicar', { act: 'toast', arg: 'Se crearía una copia en borrador.' }) + btn('Editar', { kind: 'primary', href: H(AD, 'campaigns', c.id, 'edit') }) }) +
      '<div class="grid g-2-1">' + card('Progreso de los participantes', table([['Participante', p => userCell(p.name)], ['Días', p => p.sessions >= 2 ? tag('Completado') : p.sessions ? tag('En curso') : tag('Pendiente')], ['Última nota', p => p.last == null ? '—' : p.last, { num: true }]], parts, { pager: false }), { flush: true }) +
        card('Configuración', dl([['Contenido', esc(daysLabel(c.days)) + ' ' + T.real()], ['Dificultad', esc(diffEs[c.difficulty])], ['Canal', 'Chat ' + T.mvp()], ['Participantes', esc(c.groups)], ['Fechas', esc(c.dates)], ['Aprobado', 'Cada día ≥ 60 (regla actual)']])) + '</div>';
  }

  function campaignEditor(r) {
    const steps = ['Información', 'Participantes', 'Contenido', 'Evaluación', 'Fechas e informes', 'Revisión'];
    const step = Math.max(0, Math.min(steps.length - 1, Number(r.q.get('step') || 0) || 0));
    const isNew = r.id === 'new';
    if (ui.wizFor !== r.id) {   // editing an existing campaign starts from its own values
      ui.wizFor = r.id;
      const c = !isNew && X.campaigns.find(x => x.id === r.id);
      ui.wiz = Object.assign({}, WIZ_DEFAULT, c ? { name: c.name, desc: '', goal: c.goal, days: c.days.slice(), difficulty: c.difficulty, teams: X.teams.filter(t => c.groups.indexOf(t.name) !== -1).map(t => t.name) } : {});
    }
    const w = ui.wiz;
    const role = r.role;
    // Decision: a coach publishes campaigns for their own teams; if other teams are included it becomes a proposal
    const isCoach = role === 'coach';
    const ownTeams = isCoach ? X.teams.filter(t => t.coach === ROLES.coach.person).map(t => t.name) : X.teams.map(t => t.name);
    const proposal = isCoach && w.teams.some(t => ownTeams.indexOf(t) === -1);
    const href = i => (isNew ? H(role, 'campaigns', 'new') : H(role, 'campaigns', r.id, 'edit')) + '?step=' + i;
    let body = '';
    if (step === 0) body = '<div class="stack"><div class="field"><label for="wn">Nombre</label><input id="wn" class="input" data-wiz="name" value="' + esc(w.name) + '"></div>' +
      '<div class="field"><label for="wd">Descripción</label><textarea id="wd" class="textarea" data-wiz="desc">' + esc(w.desc) + '</textarea></div>' +
      '<div class="field"><label for="wg">Objetivo de formación</label><textarea id="wg" class="textarea" data-wiz="goal">' + esc(w.goal) + '</textarea><span class="hint">Aparece al participante antes de empezar.</span></div></div>';
    if (step === 1) body = '<div class="stack"><span class="lbl" style="font-weight:600">Equipos</span>' + X.teams.map(t => '<label class="choice' + (w.teams.indexOf(t.name) !== -1 ? ' on' : '') + '"><input type="checkbox" data-wiz-list="teams" value="' + esc(t.name) + '"' + (w.teams.indexOf(t.name) !== -1 ? ' checked' : '') + '><span><b>' + esc(t.name) + '</b><small>' + t.members + ' personas · ' + esc(t.coach) + (ownTeams.indexOf(t.name) === -1 ? ' · no lo supervisas: la campaña irá como propuesta' : '') + '</small></span></label>').join('') +
      (proposal ? alertBox('warning', 'Incluye equipos que no supervisas', 'Se enviará como propuesta y un administrador la publicará.') : '') +
      '<p class="muted" style="font-size:12px">También se podrán añadir personas sueltas. ' + T.demo() + '</p></div>';
    if (step === 2) {
      const v = SS.validateConfig(cfgOf(w), { data: D });
      body = '<div class="stack"><span class="lbl" style="font-weight:600">Días y escenarios ' + T.real() + '</span>' + D.days.map(d => {
        const on = w.days.indexOf(d.n) !== -1;
        return '<label class="choice' + (on ? ' on' : '') + '"><input type="checkbox" data-wiz-list="days" value="' + d.n + '"' + (on ? ' checked' : '') + '><span style="flex:1"><b>Día ' + d.n + ' · ' + esc(d.title) + '</b> ' + tag(levelEs[d.level], levelTone[d.level]) + '<small style="display:block">' + scenariosOf(d.n).map(s => esc(s.customer.first + ' — ' + s.topic)).join(' · ') + '</small></span></label>';
      }).join('') +
      '<span class="lbl" style="font-weight:600;margin-top:8px">Dificultad ' + T.real('Niveles reales') + '</span><div class="grid g3">' + SS.DIFFICULTIES.map(d => '<label class="choice' + (w.difficulty === d.id ? ' on' : '') + '"><input type="radio" name="wdiff" data-wiz="difficulty" value="' + d.id + '"' + (w.difficulty === d.id ? ' checked' : '') + '><span><b>' + esc(diffEs[d.id]) + '</b><small>' + esc(diffBlurbEs[d.id] || d.blurb) + '</small></span></label>').join('') + '</div>' +
      '<span class="lbl" style="font-weight:600;margin-top:8px">Ritmo del turno ' + T.real('Ajustes reales del simulador') + '</span>' + paceFields('w', w, 'data-wiz') +
      '<span class="lbl" style="font-weight:600;margin-top:8px">Canal</span><div class="grid g2"><label class="choice on"><input type="radio" checked name="wch"><span><b>Chat ' + T.mvp() + '</b><small>El simulador actual.</small></span></label><label class="choice" aria-disabled="true" style="opacity:.6"><input type="radio" disabled name="wch"><span><b>Voz ' + T.future() + '</b><small>Llamadas simuladas en una fase posterior.</small></span></label></div>' +
      (v.ok ? alertBox('success', v.days.length + ' día(s) · ' + v.scenarios + ' escenarios', 'La configuración es válida según las reglas actuales del simulador.') : alertBox('danger', 'Revisa el contenido', v.errors.map(e => esc(errEs(e))).join(' '))) + '</div>';
    }
    if (step === 3) body = '<div class="stack"><div class="field"><label for="wp">Nota mínima por día</label><input id="wp" class="input" value="60" readonly><span class="hint">Regla actual del motor (score ≥ 60). ' + T.mvp() + '</span></div>' +
      '<div class="field"><span class="lbl">Regla de finalización</span>' + [['all', 'Completar todos los días incluidos'], ['pass', 'Aprobar todos los días incluidos'], ['deadline', 'Lo que se complete hasta la fecha límite']].map(o => '<label class="choice' + (w.completion === o[0] ? ' on' : '') + '"><input type="radio" name="wc" data-wiz="completion" value="' + o[0] + '"' + (w.completion === o[0] ? ' checked' : '') + '><span><b>' + esc(o[1]) + '</b></span></label>').join('') + '</div>' +
      '<div class="field"><label for="wa">Intentos por día</label><select id="wa" class="select" data-wiz="attempts">' + ['1', '3', 'Ilimitados'].map(a => '<option' + (w.attempts === a ? ' selected' : '') + '>' + a + '</option>').join('') + '</select></div>' +
      '<label class="check"><input type="checkbox" disabled> Rúbrica propia con criterios ponderados ' + T.future() + '</label><label class="check"><input type="checkbox" disabled> Evaluación asistida por IA ' + T.future('Futuro · sin integrar') + '</label></div>';
    if (step === 4) body = '<div class="stack"><div class="form-grid"><div class="field"><label for="ws">Inicio</label><input id="ws" type="date" class="input" data-wiz="start" value="' + esc(w.start) + '"></div><div class="field"><label for="we">Fin</label><input id="we" type="date" class="input" data-wiz="end" value="' + esc(w.end) + '"></div></div>' +
      '<span class="lbl" style="font-weight:600">Informes esperados</span>' + [['individual', 'Informe individual de cada sesión', true], ['team', 'Resumen por equipo', true], ['campaign', 'Resumen de la campaña', true], ['export', 'Exportación CSV / PDF', false]].map(o => '<label class="check"><input type="checkbox"' + (o[2] ? '' : ' disabled') + (w.reports.indexOf(o[0]) !== -1 ? ' checked' : '') + ' data-wiz-list="reports" value="' + o[0] + '"> ' + esc(o[1]) + ' ' + (o[2] ? T.mvp() : T.future()) + '</label>').join('') + '</div>';
    if (step === 5) body = dl([['Nombre', esc(w.name)], ['Objetivo', esc(w.goal)], ['Equipos', esc(w.teams.join(', ') || '—')], ['Contenido', esc(w.days.length ? daysLabel(w.days.slice().sort((a, b) => a - b)) : '—')], ['Dificultad', esc(diffEs[w.difficulty])], ['Ritmo', esc(custEs(w.customers) + ' · velocidad ' + (replyEs[w.reply] || '').split(' (')[0].toLowerCase())], ['Canal', 'Chat'], ['Finalización', esc({ all: 'Completar todos los días', pass: 'Aprobar todos los días', deadline: 'Hasta la fecha límite' }[w.completion])], ['Intentos', esc(w.attempts)], ['Fechas', esc(w.start + ' → ' + w.end)]]) +
      '<div class="section">' + (proposal ? alertBox('warning', 'Se enviará como propuesta', 'Incluye equipos que no supervisas. Un administrador la revisará y la publicará.') : alertBox('info', 'Publicar notificará a los participantes', 'En el prototipo no se envía nada.')) + '</div>';
    const finalBtn = proposal ? btn('Enviar propuesta', { kind: 'primary', act: 'toast', arg: 'La propuesta llegaría a los administradores de la empresa (demo).' })
      : btn(isCoach ? 'Publicar para mi equipo' : 'Publicar campaña', { kind: 'primary', act: 'toast', arg: 'La campaña se publicaría y avisaría a los participantes (demo).' });
    return pageHead({ crumbs: [[isCoach ? 'Campañas asignadas' : 'Campañas', H(role, 'campaigns')], [isNew ? 'Nueva campaña' : 'Editar campaña']], title: isNew ? 'Nueva campaña' : 'Editar «' + w.name + '»', tags: ' ' + T.demo() }) +
      stepper(steps, step, href) + card(esc(steps[step]), body, { foot: '<div class="row">' + (step > 0 ? btn('Anterior', { href: href(step - 1) }) : '') + '<span class="spacer"></span>' + btn('Guardar borrador', { kind: 'ghost', act: 'toast', arg: 'Borrador guardado (demo).' }) + (step < steps.length - 1 ? btn('Siguiente', { kind: 'primary', href: href(step + 1) }) : finalBtn) + '</div>' });
  }

  function scenarioLibrary() {
    const rows = D.scenarios.filter(s => (!ui.f.q || (s.customer.first + ' ' + s.customer.last + ' ' + s.topic).toLowerCase().includes(ui.f.q.toLowerCase())) &&
      (!ui.f.day || String(s.day) === ui.f.day) && (!ui.f.channel || s.channel === ui.f.channel) && (!ui.f.persona || s.persona === ui.f.persona));
    const day = n => D.days.find(d => d.n === n);
    return pageHead({ title: 'Biblioteca de escenarios', tags: ' ' + T.real('Los 25 casos reales del simulador'), sub: 'Escenarios disponibles para tus campañas. Hoy existe la biblioteca estándar de ShiftReady; los escenarios propios de cada empresa llegarán con el editor.', actions: btn('Nuevo escenario', { icon: 'plus', disabled: true, after: ' ' + T.future() }) }) +
      card('', table([
        ['Escenario', s => '<a class="rowlink" href="' + H(AD, 'scenarios', s.id) + '">' + esc(s.topic) + '</a><br><small class="muted">' + esc(s.customer.first + ' ' + s.customer.last) + ' · ' + esc(s.id) + '</small>'],
        ['Día', s => 'Día ' + s.day + ' · ' + esc(day(s.day).title)], ['Dificultad', s => tag(levelEs[day(s.day).level], levelTone[day(s.day).level])],
        ['Canal', s => esc(CH[s.channel])], ['Cliente', s => esc(PERSONA_ES[s.persona] || D.personas[s.persona].label)], ['Políticas', s => (s.policies || []).length, { num: true }], ['Estado', () => tag('Publicado')]
      ], rows, { filters: filterBar('Buscar por tema o cliente', [
        { key: 'day', label: 'Día', options: D.days.map(d => [d.n, 'Día ' + d.n + ' · ' + levelEs[d.level]]) },
        { key: 'channel', label: 'Canal', options: Object.keys(CH).map(k => [k, CH[k]]) },
        { key: 'persona', label: 'Tipo de cliente', options: Object.keys(D.personas).map(k => [k, PERSONA_ES[k] || D.personas[k].label]) }]), caption: 'Escenarios', empty: { icon: 'chat', title: 'Ningún escenario coincide', text: 'Cambia los filtros.' } }), { flush: true });
  }

  function scenarioDetail(r) {
    const s = D.scenarios.find(x => x.id === r.id) || D.scenarios[0];
    const d = D.days.find(x => x.n === s.day);
    const turns = Object.values(s.nodes).filter(n => n.o).length;
    const endings = Object.values(s.nodes).filter(n => n.end);
    const first = (s.history ? s.history.filter(h => h.from === 'customer').map(h => h.text) : []).concat(s.nodes[s.start].c || []);
    return pageHead({ crumbs: [['Biblioteca de escenarios', H(AD, 'scenarios')], [s.topic]], title: s.topic, tags: ' ' + T.real() + ' ' + tag('Publicado'), sub: 'Cliente: ' + esc(s.customer.first + ' ' + s.customer.last) + ' · ' + esc(CH[s.channel]) + ' · Día ' + s.day + ' · ' + esc(d.title), actions: btn('Editar', { disabled: true, after: ' ' + T.future() }) + btn('Usar en una campaña', { kind: 'primary', href: H(AD, 'campaigns', 'new') }) }) +
      '<div class="grid g-2-1">' + card('Cómo empieza la conversación', '<div class="transcript" style="padding:0">' + (first.length ? first.slice(0, 3).map(t => '<div class="msg cust"><div class="bub">' + esc(t) + '</div><small>' + esc(s.customer.first) + '</small></div>').join('') : '<p class="muted">Este caso empieza con un traspaso; el historial aparece en el simulador.</p>') + '</div>') +
        card('Ficha', dl([['Identificador', '<span class="mono">' + esc(s.id) + '</span>'], ['Tipo de cliente', esc(PERSONA_ES[s.persona] || D.personas[s.persona].label)], ['Prioridad', esc(s.priority)], ['Verificado', s.verified === true ? 'Sí' : s.verified === 'na' ? 'No aplica' : 'No (invitado)'], ['Turnos de decisión', turns], ['Finales', endings.length + ' (' + endings.filter(e => e.end === 'resolved').length + ' resueltos)'], ['Código de cierre', esc((s.disp || []).map(id => (D.dispositions.find(x => x.id === id) || {}).label).join(', '))]])) + '</div>' +
      '<div class="section">' + card('Políticas que entrena', '<ul class="list">' + (s.policies || []).map(k => '<li>' + ic(D.policies[k].icon || 'book', 16) + '<span class="meta"><b>' + esc(D.policies[k].title) + '</b><small>' + esc(D.policies[k].summary) + '</small></span></li>').join('') + '</ul>', { flush: true }) + '</div>';
  }

  function documentsPage() {
    const cats = {};
    Object.keys(D.policies).forEach(k => { const c = POLICY_CAT[k] || 'Otras'; (cats[c] = cats[c] || []).push(k); });
    const usedBy = k => D.scenarios.filter(s => (s.policies || []).indexOf(k) !== -1).length;
    const rows = Object.keys(D.policies).filter(k => (!ui.f.q || D.policies[k].title.toLowerCase().includes(ui.f.q.toLowerCase())) && (!ui.f.cat || POLICY_CAT[k] === ui.f.cat));
    return pageHead({ title: 'Documentos y políticas', sub: 'Lo que los agentes consultan durante la simulación. Cada empresa verá solo sus documentos y la biblioteca estándar.', actions: btn('Subir documento', { icon: 'upload', disabled: true, after: ' ' + T.future() }) }) +
      card('Biblioteca estándar ' + T.real('19 políticas reales del simulador'), table([
        ['Política', k => '<b>' + esc(D.policies[k].title) + '</b><br><small class="muted">' + esc(D.policies[k].summary) + '</small>'], ['Categoría', k => esc(POLICY_CAT[k] || 'Otras')], ['Escenarios que la usan', k => usedBy(k), { num: true }], ['Estado', () => tag('Publicado')]
      ], rows, { filters: filterBar('Buscar política', [{ key: 'cat', label: 'Categoría', options: Object.keys(cats).map(c => [c, c]) }]), pager: false, caption: 'Políticas' }), { flush: true, foot: 'La clasificación por categorías es una propuesta de diseño.' }) +
      '<div class="section">' + card('Documentos de tu empresa ' + T.future(), empty({ icon: 'file', title: 'Aún no se pueden subir documentos propios', text: 'Cuando exista el procesamiento, cada archivo mostrará su estado: <b>En cola</b>, <b>Procesando</b>, <b>Listo</b> o <b>Error</b>. Solo lo verán las personas de tu empresa.' })) + '</div>';
  }

  /* ============================================================
     Reports (shared by admin and coach)
     ============================================================ */
  function reportsPage(role, r) {
    const t = r.id || 'campaign';
    const base = H(role, 'reports');
    let body;
    if (t === 'team') body = '<div class="grid g2">' + card('Evolución por equipo', lineChart(X.teamTrend.labels, role === 'coach' ? [{ name: 'Retail A · Mañana', values: X.teamTrend.retailA }] : [{ name: 'Retail A · Mañana', values: X.teamTrend.retailA }, { name: 'Retail B · Tarde', values: X.teamTrend.retailB, cls: 'b' }], { ref: 60, label: 'Puntuación media semanal por equipo', caption: 'Línea gris: nota de aprobado (60).' }) + demoNote()) +
      card('Comparación entre periodos', table([['Indicador', x => esc(x[0])], ['Semana anterior', x => x[1], { num: true }], ['Esta semana', x => x[2], { num: true }], ['Origen', x => x[3]]], [['Puntuación media', 75, 78, T.backend()], ['Calidad de respuestas', '82 %', '85 %', T.backend()], ['CSAT simulado', '4,2', '4,4', T.backend()], ['Clientes que se fueron', 3, 1, T.backend()]], { pager: false }), { flush: true, foot: 'El motor actual ya calcula estos indicadores en cada sesión; compararlos entre semanas o personas requiere guardar el historial en un servidor.' }) + '</div>';
    else if (t === 'scenario') body = card('Resultados por escenario', table([['Escenario', s => esc(s.topic) + '<br><small class="muted">' + esc(s.customer.first) + ' · Día ' + s.day + '</small>'], ['Sesiones', s => 8 + (s.arrive % 11), { num: true }], ['Calidad media', s => (62 + (s.arrive * 7) % 33) + ' %', { num: true }], ['Resuelto', s => (70 + (s.arrive * 3) % 30) + ' %', { num: true }]], D.scenarios.slice(0, 10), { pager: true }), { flush: true, foot: T.demo() + ' Escenarios reales con resultados inventados.' });
    else body = '<div class="grid g2">' + card('Progreso por campaña', bars(X.campaigns.filter(c => c.total).map(c => ({ label: c.name, value: c.done, max: c.total, text: c.done + '/' + c.total, cls: 'accent' }))) + demoNote('Participantes que completaron la campaña.')) +
      card('Puntuación por día (campaña «Certificación Q3»)', bars(D.days.map((d, i) => ({ label: 'Día ' + d.n, value: [88, 84, 76, 69, 63][i], max: 100, text: String([88, 84, 76, 69, 63][i]) })), { ref: 60, refLabel: 'Nota de aprobado: 60' }) + demoNote()) + '</div>';
    return pageHead({ title: role === 'coach' ? 'Informes de equipo' : 'Informes', tags: ' ' + T.demo(), sub: role === 'coach' ? 'Solo incluye a los participantes de tus equipos.' : 'Resultados de tu organización por campaña, equipo y escenario.', actions: btn('Exportar', { icon: 'download', disabled: true, after: ' ' + T.future() }) }) +
      tabs([['campaign', 'Por campaña', base], ['team', 'Por equipo', base + '/team'], ['scenario', 'Por escenario', base + '/scenario']], t) + body;
  }

  /* ============================================================
     COACH
     ============================================================ */
  const CO = 'coach';
  function sampleTranscript() {
    const s = D.scenarios.find(x => x.id === 'd1-daniel');
    const fill = t => String(t).replace(/\{agent\}/g, 'Ana').replace(/\{first\}/g, s.customer.first);
    const picks = [['start', 1], ['tracking', 3], ['why', 0], ['close', 0]];
    const out = [];
    let pre = [];
    picks.forEach(p => {
      const n = s.nodes[p[0]];
      pre.concat(n.c || []).forEach(t => out.push({ from: 'cust', text: fill(t) }));
      const o = n.o[p[1]];
      const top = Math.max.apply(null, n.o.map(x => x.q));
      out.push({ from: 'agent', text: fill(o.t), q: o.q, fb: o.fb, best: o.q < top ? fill(n.o.find(x => x.q === top).t) : null });
      pre = o.r || [];
      if (o.go && s.nodes[o.go].end) pre.concat(s.nodes[o.go].c || []).forEach(t => out.push({ from: 'cust', text: fill(t) }));
    });
    return { s, out };
  }
  const QL = { 3: ['Excelente', 'success'], 2: ['Buena', 'info'], 1: ['Mejorable', 'warning'], 0: ['Mala', 'danger'] };

  SCREENS.coach = {
    team: { title: 'Resumen del equipo', render: () =>
      pageHead({ title: 'Retail A · Mañana', tags: ' ' + T.demo(), sub: 'Tu equipo esta semana. Solo ves a las personas que supervisas.' }) +
      kpis([
        { label: 'Participantes', value: X.roster.length, foot: '1 invitación pendiente', src: 'backend', icon: 'users' },
        { label: 'Puntuación media', value: '78', delta: '+3', foot: 'frente a la semana anterior', src: 'backend', icon: 'target' },
        { label: 'Calidad de respuestas', value: '85 %', foot: 'media del equipo', src: 'backend', icon: 'checks' },
        { label: 'Necesitan apoyo', value: X.roster.filter(p => p.status === 'Necesita apoyo' || p.status === 'Atrasado').length, foot: 'participantes', src: 'backend', icon: 'alert' }
      ]) +
      '<div class="grid g-2-1 section">' + card('Evolución de la puntuación media', lineChart(X.teamTrend.labels, [{ name: 'Retail A · Mañana', values: X.teamTrend.retailA }], { ref: 60, label: 'Puntuación media semanal del equipo', caption: 'Línea gris: nota de aprobado (60).' }) + demoNote()) +
        card('Atención prioritaria', '<ul class="list">' + X.roster.filter(p => p.status !== 'Al día').map(p => '<li>' + av(p.name, 'sm') + '<span class="meta"><a href="' + H(CO, 'participants', p.id) + '" style="color:var(--text);font-weight:600;text-decoration:none">' + esc(p.name) + '</a><small>' + esc(p.weak !== '—' ? 'Reforzar: ' + p.weak : 'Sin sesiones todavía') + '</small></span>' + tag(p.status) + '</li>').join('') + '</ul>', { flush: true }) + '</div>' },

    participants: { title: 'Participantes', render: r => r.id ? participantDetail(r) : (
      pageHead({ title: 'Participantes', tags: ' ' + T.demo(), sub: 'Progreso de cada persona de tu equipo.', actions: btn('Invitar agentes', { kind: 'primary', icon: 'mail', act: 'dialog', arg: 'invite-coach' }) }) +
      card('', table([
        ['Participante', p => '<a class="rowlink" href="' + H(CO, 'participants', p.id) + '">' + esc(p.name) + '</a>'], ['Sesiones', p => p.sessions, { num: true }], ['Última nota', p => p.last == null ? '—' : p.last, { num: true }], ['Media', p => p.avg == null ? '—' : p.avg, { num: true }],
        ['Tendencia', p => p.trend], ['A reforzar', p => esc(p.weak)], ['Estado', p => tag(p.status)]
      ], X.roster.filter(p => !ui.f.q || p.name.toLowerCase().includes(ui.f.q.toLowerCase())).filter(p => !ui.f.status || p.status === ui.f.status), { filters: filterBar('Buscar participante', [{ key: 'status', label: 'Estado', options: [...new Set(X.roster.map(p => p.status))].map(v => [v, v]) }]), caption: 'Participantes' }), { flush: true })) },

    progress: { title: 'Seguimiento del progreso', render: () => {
      const cert = X.campaigns[3];
      return pageHead({ title: 'Seguimiento del progreso', tags: ' ' + T.demo(), sub: 'Nota de cada participante por día en la campaña «' + esc(cert.name) + '» (Días 1 a 5).' }) +
        card('', table([['Participante', p => userCell(p.name)]].concat(D.days.map((d, i) => ['Día ' + d.n, p => {
          const v = p.sessions > i ? [91, 72, 58, 66][X.roster.indexOf(p)] - i * 3 : null;
          return v == null ? '<span class="muted">—</span>' : '<span class="tag ' + (v >= 60 ? 'tag-success' : 'tag-danger') + '">' + v + '</span>';
        }, { num: true }])), X.roster, { pager: false, caption: 'Progreso por día' }), { flush: true, foot: 'Verde: día aprobado (≥ 60) · Rojo: por debajo de 60 · Guion: sin completar. Cada celda con número y color.' });
    } },

    campaigns: { title: 'Campañas asignadas', render: r => r.id ? campaignEditor(r) :
      pageHead({ title: 'Campañas asignadas', tags: ' ' + T.demo(), sub: 'Campañas de tu equipo. Puedes crear y publicar campañas para tus equipos; si incluyen otros equipos, se envían como propuesta a un administrador.', actions: btn('Nueva campaña', { kind: 'primary', icon: 'plus', href: H(CO, 'campaigns', 'new') }) }) +
      card('', table([['Campaña', c => '<b>' + esc(c.name) + '</b>' + (c.owner === ROLES.coach.person ? ' <a href="' + H(CO, 'campaigns', c.id, 'edit') + '" style="font-size:12px">Editar</a>' : '') + '<br><small class="muted">' + esc(c.goal) + ' · creada por ' + esc(c.owner) + '</small>'], ['Estado', c => tag(c.status)], ['Contenido', c => esc(daysLabel(c.days)) + ' · ' + diffEs[c.difficulty]], ['Fechas', c => esc(c.dates)]], X.campaigns.filter(c => c.groups.indexOf('Retail A') !== -1), { pager: false }), { flush: true }) },

    review: { title: 'Revisión de conversaciones', render: () => {
      const tr = sampleTranscript();
      return pageHead({ title: 'Revisión de conversaciones', tags: ' ' + T.real('Caso real d1-daniel') + ' ' + T.demo(), sub: 'Sesión de Ana Torres · Día 1 · Intermedio. El contenido es del caso real; las elecciones de Ana son demostrativas.' }) +
        alertBox('info', 'Quién puede ver esta conversación', 'Los coaches de su equipo y los administradores de la empresa. Ana ve la misma revisión de sus propias sesiones. Cada revisión queda registrada.') +
        '<div class="grid g-2-1 section">' + card('Conversación con ' + esc(tr.s.customer.first + ' ' + tr.s.customer.last), '<div class="transcript">' + tr.out.map(m => m.from === 'cust'
          ? '<div class="msg cust"><div class="bub">' + esc(m.text) + '</div><small>' + esc(tr.s.customer.first) + '</small></div>'
          : '<div class="msg agent"><div class="bub">' + esc(m.text) + '</div><small>Ana · ' + tag(QL[m.q][0], QL[m.q][1]) + '</small></div>' +
            '<div class="callout" style="align-self:stretch">' + ic('sparkle', 14) + ' <b>Nota del coach:</b> ' + esc(m.fb) + (m.best ? '<br><span class="muted">Mejor respuesta:</span> ' + esc(m.best) : '') + '</div>').join('') + '</div>', { flush: true }) +
          card('Decisiones', '<ul class="list">' + tr.out.filter(m => m.from === 'agent').map((m, i) => '<li><span class="tag">' + (i + 1) + '</span><span class="meta"><b style="font-weight:500">' + esc(m.text.slice(0, 60)) + '…</b><small>' + QL[m.q][0] + '</small></span></li>').join('') + '</ul>', { flush: true, foot: btn('Añadir nota de coaching', { size: 'sm', act: 'toast', arg: 'Las notas de coaching se guardarían en el servidor (función del MVP).' }) }) + '</div>';
    } },

    results: { title: 'Resultados de sesiones', render: () =>
      pageHead({ title: 'Resultados de sesiones', tags: ' ' + T.demo(), sub: 'Sesiones completadas por tu equipo.' }) +
      card('', table([['Fecha', h => esc(h.date)], ['Participante', h => esc(h.who)], ['Contenido', h => esc(daysLabel(h.days)) + ' · ' + diffEs[h.difficulty]], ['Puntos', h => h.score + ' / ' + h.max, { num: true }], ['Estado', h => tag(h.status)]],
        X.agentHistory.map((h, i) => Object.assign({ who: X.roster[i % 4].name }, h)), { caption: 'Resultados' }), { flush: true }) },

    errors: { title: 'Análisis de errores', render: () => {
      const picks = [['d1-marcus', 'addr_first', 1, 4], ['d2-harold', 'start', 3, 3], ['d3-tom', 'check', 1, 3], ['d1-priya', 'code', 1, 2], ['d4-chloe', 'return', 1, 2], ['d5-patricia', 'safe', 1, 1]];
      return pageHead({ title: 'Análisis de errores', tags: ' ' + T.real('Respuestas y notas reales') + ' ' + T.demo(), sub: 'Las respuestas incorrectas que más eligió tu equipo. Los textos y notas son reales; las frecuencias son demostrativas.' }) +
        '<div class="stack">' + picks.map(p => {
          const s = D.scenarios.find(x => x.id === p[0]);
          const o = s.nodes[p[1]].o[p[2]];
          return card(esc(s.topic) + ' <small>' + esc(s.customer.first) + ' · Día ' + s.day + '</small>', '<p style="font-size:13px">«' + esc(o.t.slice(0, 160)) + (o.t.length > 160 ? '…' : '') + '»</p><div class="callout" style="margin-top:10px">' + ic('alert', 14) + ' ' + esc(o.fb) + '</div>',
            { actions: '<span class="row">' + tag(QL[o.q][0], QL[o.q][1]) + '<span class="tag tag-demo">' + p[3] + ' de 5</span></span>' });
        }).join('') + '</div>';
    } },

    strengths: { title: 'Fortalezas y mejoras', render: () =>
      pageHead({ title: 'Fortalezas y áreas de mejora', tags: ' ' + T.demo(), sub: 'Calculadas con las mismas reglas del informe de sesión (session.js) aplicadas a todo el equipo.' }) +
      '<div class="grid g2">' + card(ic('checkCircle', 16) + 'Fortalezas', '<ul class="list"><li><span class="meta"><b>Respuestas precisas</b><small>85 % de calidad media en el equipo.</small></span></li><li><span class="meta"><b>' + esc(D.policies.shipping.title) + '</b><small>92 % en los casos que usan esta política.</small></span></li><li><span class="meta"><b>Nadie abandonó el chat</b><small>En las últimas 12 sesiones.</small></span></li></ul>', { flush: true }) +
        card(ic('alert', 16) + 'Áreas de mejora', '<ul class="list"><li><span class="meta"><b>' + esc(D.policies.verification.title) + '</b><small>61 % en los casos que usan esta política.</small></span></li><li><span class="meta"><b>Códigos de cierre</b><small>76 % correctos.</small></span></li><li><span class="meta"><b>' + esc(D.policies.priceAdjust.title) + '</b><small>64 % en los casos que usan esta política.</small></span></li></ul>', { flush: true }) + '</div>' +
      '<p class="muted" style="font-size:12px;margin-top:12px">Los nombres de las políticas son reales; los porcentajes son demostrativos.</p>' },

    coaching: { title: 'Recomendaciones', render: () =>
      pageHead({ title: 'Recomendaciones de coaching', tags: ' ' + T.demo(), sub: 'Sugerencias basadas en reglas a partir de los resultados. No hay IA en esta fase.' }) +
      '<div class="grid g2">' + [['Carla Núñez', 'verification', 'Bajó de 60 en los casos con invitados sin verificar.'], ['Bruno Silva', 'conduct', 'Elige códigos de cierre incorrectos en chats sin resolver.'], ['Daniel Ortega', 'shipping', 'Primera respuesta tardía en clientes impacientes.'], ['Ana Torres', 'priceAdjust', 'Confunde el plazo de 14 días del ajuste de precio.']].map(x =>
        card(av(x[0], 'sm') + esc(x[0]), '<p style="font-size:13px">' + esc(x[2]) + '</p><div class="callout" style="margin-top:10px">' + ic('book', 14) + ' Repasar <b>' + esc(D.policies[x[1]].title) + '</b>: ' + esc(D.policies[x[1]].summary) + '</div>',
          { actions: btn('Asignar práctica', { size: 'sm', act: 'toast', arg: 'Se asignaría una práctica con los casos de esa política (MVP).' }) })).join('') + '</div>' },

    reports: { title: 'Informes de equipo', render: r => reportsPage(CO, r) }
  };

  function participantDetail(r) {
    const p = X.roster.find(x => x.id === r.id) || X.roster[0];
    return pageHead({ crumbs: [['Participantes', H(CO, 'participants')], [p.name]], title: p.name, tags: ' ' + tag(p.status) + ' ' + T.demo(), sub: 'Retail A · Mañana · Agente', actions: btn('Ver una conversación', { href: H(CO, 'review') }) + btn('Asignar práctica', { kind: 'primary', act: 'toast', arg: 'Asignar práctica (MVP).' }) }) +
      kpis([{ label: 'Sesiones', value: p.sessions, src: 'backend' }, { label: 'Última nota', value: p.last == null ? '—' : p.last, src: 'engine' }, { label: 'Media', value: p.avg == null ? '—' : p.avg, src: 'backend' }, { label: 'Tendencia', value: p.trend, foot: 'últimas 4 semanas', src: 'backend' }]) +
      '<div class="grid g-2-1 section">' + card('Evolución', lineChart(X.agentHistory.slice().reverse().map(h => h.date), [{ name: 'Puntuación (%)', values: X.agentHistory.slice().reverse().map(h => Math.round(100 * h.score / h.max)) }], { ref: 60, label: 'Evolución de la puntuación', caption: 'Porcentaje de la puntuación máxima de cada sesión.' }) + demoNote()) +
        card('Notas de coaching', '<div class="field"><label for="cn">Nueva nota</label><textarea id="cn" class="textarea" placeholder="Visible para ti y para los administradores."></textarea></div><div style="margin-top:10px">' + btn('Guardar nota', { size: 'sm', kind: 'primary', act: 'toast', arg: 'Se guardaría en el servidor (MVP).' }) + '</div>') + '</div>';
  }

  /* ============================================================
     AGENT
     ============================================================ */
  const AG = 'agent';
  const camp = X.campaigns[0];
  SCREENS.agent = {
    home: { title: 'Inicio', render: () =>
      pageHead({ title: 'Hola, Ana', tags: ' ' + T.demo(), sub: 'Tu próxima tarea y cómo vas.' }) +
      '<div class="focus-card"><div><span class="tag tag-accent">Asignado por tu supervisor</span><h2 style="margin-top:8px">' + esc(camp.name) + '</h2><p style="margin-top:6px">Te falta el Día 2 · ' + esc(D.days[1].title) + ' · ' + diffEs[camp.difficulty] + ' · hasta el 15 nov</p></div>' + btn('Continuar', { href: H(AG, 'trainings', camp.id), kind: 'accent', size: 'lg', icon: 'play' }) + '</div>' +
      '<div class="section">' + kpis([
        { label: 'Sesiones completadas', value: X.agentHistory.length, src: 'backend', icon: 'checks' },
        { label: 'Mejor resultado', value: '92 %', foot: '27 oct', src: 'backend', icon: 'star' },
        { label: 'Calidad media', value: pct(X.agentHistory.reduce((s, h) => s + h.quality, 0) / X.agentHistory.length), src: 'backend', icon: 'target' },
        { label: 'CSAT medio', value: (X.agentHistory.reduce((s, h) => s + h.csat, 0) / X.agentHistory.length).toFixed(1).replace('.', ','), foot: 'sobre 5', src: 'backend', icon: 'smile' }
      ]) + '</div>' +
      '<div class="grid g-2-1 section">' + card('Tu evolución', lineChart(X.agentHistory.slice().reverse().map(h => h.date), [{ name: 'Puntuación (%)', values: X.agentHistory.slice().reverse().map(h => Math.round(100 * h.score / h.max)) }], { ref: 60, label: 'Tu evolución', caption: 'Porcentaje de la puntuación máxima de cada sesión. Línea gris: aprobado.' }) + demoNote()) +
        card('Recomendado para ti', '<ul class="list"><li>' + ic('book', 16) + '<span class="meta"><b>' + esc(D.policies.priceAdjust.title) + '</b><small>' + esc(D.policies.priceAdjust.summary) + '</small></span></li><li>' + ic('sparkle', 16) + '<span class="meta"><b>Practica el Día 3 en Fácil</b><small>Facturación y entregas, con notas del coach.</small></span></li></ul>', { flush: true, foot: '<a href="' + H(AG, 'recommendations') + '">Ver todas</a>' }) + '</div>' },

    trainings: { title: 'Mis entrenamientos', render: r => r.id ? trainingDetail(r) : (
      pageHead({ title: 'Mis entrenamientos', tags: ' ' + T.demo(), sub: 'Lo que te asignó tu organización y la práctica libre.' }) +
      '<div class="grid g3">' + [camp, X.campaigns[1]].map(c => card(esc(c.name), '<p class="muted" style="font-size:13px">' + esc(c.goal) + '</p>' + dl([['Contenido', esc(daysLabel(c.days))], ['Dificultad', esc(diffEs[c.difficulty])], ['Fechas', esc(c.dates)]]),
        { actions: tag(c.status === 'Activa' ? 'En curso' : c.status), foot: c.status === 'Activa' ? btn('Abrir', { size: 'sm', kind: 'primary', href: H(AG, 'trainings', c.id) }) : '<span>Disponible desde el 16 nov</span>' })).join('') +
        card('Práctica libre', '<p class="muted" style="font-size:13px">Elige días y dificultad para practicar. No cuenta para tus campañas.</p>', { actions: tag('Siempre disponible', 'success'), foot: btn('Practicar', { size: 'sm', href: H(AG, 'setup') + '?source=free' }) }) + '</div>') },

    setup: { title: 'Nueva sesión', render: r => sessionSetup(r) },
    simulation: { title: 'Simulación de chat', parent: 'setup', render: () =>
      pageHead({ crumbs: [['Nueva sesión', H(AG, 'setup')], ['Simulación']], title: 'Simulación de chat', sub: 'La simulación se abre en modo foco, sin la navegación de la plataforma, con el simulador actual y su motor sin cambios.' }) +
      '<div class="focus-card"><div><h2>' + esc(ui.setup.days.length ? daysLabel(ui.setup.days.slice().sort((a, b) => a - b)) : 'Sin días elegidos') + ' · ' + esc(diffEs[ui.setup.difficulty]) + ' · ' + esc(custEs(ui.setup.customers)) + '</h2><p style="margin-top:6px">Atiende a los clientes, consulta las políticas y cierra cada chat con su código. Al terminar verás el informe de la sesión.</p></div>' + btn('Abrir el simulador', { href: '../index.html', ext: true, kind: 'accent', size: 'lg', icon: 'external' }) + '</div>' +
      '<div class="grid g2 section">' + card('Cómo se conectará con la plataforma ' + T.mvp(), '<ol class="stack" style="list-style:decimal;padding-left:18px;font-size:13px"><li>La plataforma abre el simulador con la campaña, los días, la dificultad y una semilla.</li><li>El simulador juega la sesión con el motor actual (sin cambios en reglas ni escenarios).</li><li>Al terminar, envía el resultado; el servidor lo recalcula con la semilla y lo guarda.</li><li>La plataforma muestra el informe y actualiza el progreso.</li></ol>') +
        card('Mientras tanto', '<p style="font-size:13px">Hoy el simulador guarda el progreso en el navegador. En el prototipo, este botón abre el simulador real tal como está publicado.</p>' + alertBox('warning', 'Pantalla completa', 'El simulador ocupa toda la pantalla y gira el móvil a horizontal; por eso se abre fuera del armazón de la plataforma.')) + '</div>' },

    report: { title: 'Informe de la sesión', parent: 'history', render: () => sessionReport() },
    history: { title: 'Historial', render: r => r.id ? resultDetail(r) : (
      pageHead({ title: 'Historial de entrenamientos', tags: ' ' + T.demo(), sub: 'Todas tus sesiones. Solo tú, tu supervisor y los administradores de tu empresa pueden verlas.' }) +
      card('', table([['Fecha', h => esc(h.date)], ['Entrenamiento', h => '<a class="rowlink" href="' + H(AG, 'history', h.id) + '">' + esc(h.campaign) + '</a>'], ['Contenido', h => esc(daysLabel(h.days)) + ' · ' + diffEs[h.difficulty]], ['Puntos', h => h.score + ' / ' + h.max, { num: true }], ['Calidad', h => pct(h.quality), { num: true }], ['Estado', h => tag(h.status)]], X.agentHistory, { caption: 'Historial', empty: { icon: 'clock', title: 'Aún no tienes sesiones', text: 'Cuando completes tu primer entrenamiento aparecerá aquí.', action: btn('Empezar', { kind: 'primary', href: H(AG, 'trainings') }) } }), { flush: true })) },

    recommendations: { title: 'Recomendaciones', render: () =>
      pageHead({ title: 'Recomendaciones', tags: ' ' + T.demo(), sub: 'Basadas en tus resultados con las reglas del informe de sesión. No hay IA en esta fase.' }) +
      '<div class="grid g2">' + ['priceAdjust', 'verification', 'returns'].map((k, i) => card(ic('book', 16) + esc(D.policies[k].title), '<p style="font-size:13px">' + esc(D.policies[k].summary) + '</p><ul style="margin-top:10px;font-size:13px;list-style:disc;padding-left:18px">' + D.policies[k].points.slice(0, 2).map(pt => '<li>' + esc(pt) + '</li>').join('') + '</ul>',
        { actions: '<span class="tag tag-demo">' + [64, 71, 78][i] + ' % de calidad</span>', foot: btn('Practicar estos casos', { size: 'sm', href: H(AG, 'setup') + '?source=free' }) })).join('') + '</div>' +
      '<p class="muted" style="font-size:12px;margin-top:12px">Las políticas y sus puntos son reales; los porcentajes son demostrativos.</p>' },

    profile: { title: 'Perfil y preferencias', render: () =>
      pageHead({ title: 'Perfil y preferencias', sub: 'Tus datos y cómo quieres usar ShiftReady.', actions: btn('Guardar', { kind: 'primary', act: 'toast', arg: 'En el prototipo no se guarda nada.' }) }) +
      '<div class="grid g2">' + card('Perfil', '<div class="stack"><div class="row">' + av('Ana Torres', 'lg') + '<span><b>Ana Torres</b><br><small class="muted">ana.torres@bahia.demo</small></span></div><div class="field"><label for="dn">Nombre visible en el simulador</label><input id="dn" class="input" value="Ana Torres"></div><div class="field"><label for="pl">Idioma de la interfaz</label><select id="pl" class="select"><option>Español</option><option>English</option></select></div></div>') +
        card('Preferencias', '<div class="stack"><label class="check"><input type="checkbox" checked> Sonidos y voz de bienvenida</label><label class="check"><input type="checkbox"> Modo oscuro</label><label class="check"><input type="checkbox" checked> Avisos de entrenamientos nuevos por correo ' + T.future() + '</label></div>') +
        card('Seguridad', '<div class="stack">' + btn('Cambiar contraseña', { act: 'toast', arg: 'Se enviaría un enlace al correo.' }) + btn('Activar verificación en dos pasos', { act: 'toast', arg: 'Función del MVP.' }) + '</div>') +
        card('Privacidad', '<p style="font-size:13px">Pueden ver tus resultados: tú, tu supervisor (equipo Retail A) y los administradores de ' + esc(ORG.name) + '. Tus compañeros no.</p>') + '</div>' }
  };

  function trainingDetail(r) {
    const c = X.campaigns.find(x => x.id === r.id) || camp;
    return pageHead({ crumbs: [['Mis entrenamientos', H(AG, 'trainings')], [c.name]], title: c.name, tags: ' ' + tag('En curso') + ' ' + T.demo(), sub: esc(c.goal), actions: btn('Configurar sesión', { kind: 'primary', icon: 'play', href: H(AG, 'setup') + '?source=' + c.id }) }) +
      '<div class="grid g-2-1">' + card('Días de esta campaña', '<ul class="list">' + c.days.map((n, i) => { const d = D.days.find(x => x.n === n); return '<li><span class="tag ' + (i === 0 ? 'tag-success' : '') + '">Día ' + n + '</span><span class="meta"><b>' + esc(d.title) + '</b><small>' + scenariosOf(n).length + ' clientes · ' + esc(d.focus[0]) + '</small></span>' + (i === 0 ? tag('Aprobado · 89') : tag('Pendiente')) + '</li>'; }).join('') + '</ul>', { flush: true }) +
        card('Reglas', dl([['Dificultad', esc(diffEs[c.difficulty]) + ' <span class="muted">(definida por la campaña)</span>'], ['Para aprobar', 'Cada día con 60 o más'], ['Intentos', '3 por día'], ['Fecha límite', '15 nov']])) + '</div>';
  }

  const PRACTICE_ES = { 'Easy difficulty': 'dificultad Fácil', 'Fewer customers': 'menos clientes', 'Slow replies': 'respuestas lentas' };
  function sessionSetup(r) {
    if (r.q.get('source')) ui.setup.source = r.q.get('source');
    const free = ui.setup.source === 'free';
    const c = X.campaigns.find(x => x.id === ui.setup.source) || camp;
    const allowed = free ? D.days.map(d => d.n) : c.days;
    if (!free) Object.assign(ui.setup, { difficulty: c.difficulty, customers: '', reply: 'auto' });   // the campaign fixes the pace
    ui.setup.days = ui.setup.days.filter(n => allowed.indexOf(n) !== -1);
    const cfg = cfgOf(ui.setup);
    const v = SS.validateConfig(cfg, { data: D, isUnlocked: n => allowed.indexOf(n) !== -1 });
    const practice = typeof SS.configPractice === 'function' ? SS.configPractice(cfg, D) : (SS.difficulty(cfg.difficulty).practice ? ['Easy difficulty'] : []);
    return pageHead({ title: 'Configurar la sesión', tags: ' ' + T.real('Días y niveles reales'), sub: free ? 'Práctica libre: no cuenta para tus campañas.' : 'Entrenamiento «' + esc(c.name) + '». Tu supervisor definió los días permitidos y la dificultad.' }) +
      '<div class="grid g-2-1"><div class="stack">' +
        card('1 · Días', '<div class="stack">' + D.days.map(d => {
          const ok = allowed.indexOf(d.n) !== -1, on = ui.setup.days.indexOf(d.n) !== -1;
          return '<label class="choice' + (on ? ' on' : '') + '"' + (ok ? '' : ' style="opacity:.55" aria-disabled="true"') + '><input type="checkbox" data-setup-day="' + d.n + '"' + (on ? ' checked' : '') + (ok ? '' : ' disabled') + '><span style="flex:1"><b>Día ' + d.n + ' · ' + esc(d.title) + '</b> ' + tag(levelEs[d.level], levelTone[d.level]) + '<small style="display:block">' + scenariosOf(d.n).length + ' clientes · ' + esc(d.focus.slice(0, 2).join(' · ')) + '</small></span>' + (ok ? '' : '<small class="muted">' + ic('lock', 12) + ' No incluido</small>') + '</label>';
        }).join('') + '</div>') +
        card('2 · Dificultad', '<div class="grid g3">' + SS.DIFFICULTIES.map(d => '<label class="choice' + (ui.setup.difficulty === d.id ? ' on' : '') + '"' + (free || d.id === c.difficulty ? '' : ' style="opacity:.55"') + '><input type="radio" name="sdiff" data-setup-diff="' + d.id + '"' + (ui.setup.difficulty === d.id ? ' checked' : '') + (free ? '' : ' disabled') + '><span><b>' + esc(diffEs[d.id]) + '</b><small>' + esc(diffBlurbEs[d.id] || d.blurb) + '</small></span></label>').join('') + '</div>' + (free ? '' : '<p class="muted" style="font-size:12px;margin-top:8px">' + ic('lock', 12) + ' Definida por la campaña.</p>')) +
        card('3 · Ritmo del turno', paceFields('s', ui.setup, 'data-setup', !free) + (free ? '' : '<p class="muted" style="font-size:12px;margin-top:8px">' + ic('lock', 12) + ' Definido por la campaña.</p>')) +
      '</div>' +
      card('Resumen', dl([['Entrenamiento', free ? 'Práctica libre' : esc(c.name)], ['Días', v.days.length ? esc(daysLabel(v.days)) : '—'], ['Clientes', v.scenarios], ['Dificultad', esc(diffEs[ui.setup.difficulty])], ['Velocidad de respuesta', esc((replyEs[ui.setup.reply] || '').split(' (')[0])]]) +
        '<div class="stack" style="margin-top:14px">' + (practice.length ? (free
          ? alertBox('info', 'Cuenta como práctica', 'Por ' + esc(practice.map(p => PRACTICE_ES[p] || p).join(', ')) + '. No desbloquea días ni cambia tus mejores resultados (regla actual del simulador).')
          : alertBox('info', 'Cuenta para la campaña', 'Por ' + esc(practice.map(p => PRACTICE_ES[p] || p).join(', ')) + ' no cambia tus mejores resultados, pero sí completa los días de la campaña.')) : '') +
        (v.ok ? '' : alertBox('danger', 'Falta algo', v.errors.map(e => esc(errEs(e))).join(' '))) + '</div>',
        { foot: v.ok ? btn('Empezar la sesión', { kind: 'primary', block: true, icon: 'play', href: H(AG, 'simulation') }) : btn('Empezar la sesión', { kind: 'primary', block: true, disabled: true }) }) + '</div>';
  }

  function sessionReport() {
    return pageHead({ crumbs: [['Historial', H(AG, 'history')], ['Informe de la sesión']], title: 'Sesión aprobada', tags: ' ' + tag('Aprobado') + ' ' + T.demo(), sub: 'Días 1 y 2 · Intermedio · 27 oct. En el MVP este informe lo genera session.js con los datos reales de la partida.' }) +
      kpis([{ label: 'Puntos', value: '183 / 200', foot: '92 %', src: 'engine' }, { label: 'Calidad de respuestas', value: '89 %', src: 'engine' }, { label: 'CSAT medio', value: '4,7', foot: 'sobre 5', src: 'engine' }, { label: 'Códigos de cierre', value: '86 %', src: 'engine' }]) +
      '<div class="grid g2 section">' + card('Puntuación por día', bars([{ label: 'Día 1', value: 89, max: 100, text: '89' }, { label: 'Día 2', value: 94, max: 100, text: '94' }], { ref: 60, refLabel: 'Nota de aprobado: 60' })) +
        card('Valoración de las respuestas', bars([{ label: 'Excelente', value: 24, max: 31, text: '24', cls: 'accent' }, { label: 'Buena', value: 4, max: 31, text: '4' }, { label: 'Mejorable', value: 1, max: 31, text: '1' }, { label: 'Mala', value: 2, max: 31, text: '2' }])) + '</div>' +
      '<div class="grid g2 section">' + card(ic('checkCircle', 16) + 'Fortalezas', '<ul class="list"><li><span class="meta"><b>Respuestas precisas</b><small>89 % de calidad en 31 respuestas.</small></span></li><li><span class="meta"><b>Nadie abandonó el chat</b><small>Los 7 clientes se quedaron hasta el final.</small></span></li></ul>', { flush: true }) +
        card(ic('alert', 16) + 'Áreas de mejora', '<ul class="list"><li><span class="meta"><b>' + esc(D.policies.damaged.title) + '</b><small>Calidad baja en el caso que usa esta política.</small></span></li></ul>', { flush: true }) + '</div>' +
      '<p class="muted" style="font-size:12px;margin-top:12px">Mismo contenido y reglas que el informe de sesión que ya existe en el simulador (puntos, estado, indicadores, fortalezas, áreas de mejora y respuestas para repasar).</p>';
  }

  function resultDetail(r) {
    const h = X.agentHistory.find(x => x.id === r.id) || X.agentHistory[0];
    const tr = sampleTranscript();
    const miss = tr.out.find(m => m.from === 'agent' && m.q < 3);
    return pageHead({ crumbs: [['Historial', H(AG, 'history')], [h.date + ' · ' + h.campaign]], title: h.campaign, tags: ' ' + tag(h.status) + ' ' + T.demo(), sub: esc(daysLabel(h.days)) + ' · ' + diffEs[h.difficulty] + ' · ' + esc(h.date), actions: btn('Ver informe completo', { href: H(AG, 'report'), kind: 'primary' }) }) +
      kpis([{ label: 'Puntos', value: h.score + ' / ' + h.max, src: 'engine' }, { label: 'Calidad', value: pct(h.quality), src: 'engine' }, { label: 'CSAT', value: String(h.csat).replace('.', ','), src: 'engine' }, { label: 'Estado', value: h.status, src: 'engine' }]) +
      '<div class="section">' + card('Respuesta para repasar ' + T.real('Caso real d1-daniel'), '<p style="font-size:13px"><b>Tu respuesta:</b> «' + esc(miss.text) + '»</p><div class="callout" style="margin-top:10px">' + esc(miss.fb) + '</div>' + (miss.best ? '<p style="font-size:13px;margin-top:10px"><b>Mejor respuesta:</b> «' + esc(miss.best) + '»</p>' : '')) + '</div>';
  }

  /* ============================================================
     Dialogs
     ============================================================ */
  const DIALOGS = {
    'new-company': ['Crear una empresa', 'building', '<div class="stack"><div class="field"><label for="dc">Nombre de la empresa</label><input id="dc" class="input"></div><div class="field"><label for="da">Correo del primer administrador</label><input id="da" class="input" type="email"></div><div class="field"><label for="dp">Plan</label><select id="dp" class="select">' + X.plans.map(p => '<option>' + p.name + '</option>').join('') + '</select></div><p>Se creará un espacio aislado y se enviará una invitación al administrador. Queda registrado en auditoría.</p></div>', 'Crear y enviar invitación'],
    suspend: ['¿Suspender esta empresa?', 'alert', '<p>Sus usuarios no podrán entrar hasta que se reactive. Los datos se conservan. La acción queda en auditoría.</p><div class="field" style="margin-top:12px"><label for="dr">Motivo (obligatorio)</label><textarea id="dr" class="textarea"></textarea></div>', 'Suspender', 'danger'],
    'support-access': ['Acceso de soporte', 'shieldCheck', '<div class="stack"><div class="field"><label for="se">Empresa</label><select id="se" class="select">' + X.orgs.map(o => '<option>' + esc(o.name) + '</option>').join('') + '</select></div><div class="field"><label for="sm">Motivo</label><input id="sm" class="input" placeholder="p. ej., ticket #1042"></div><div class="field"><label for="sd">Duración</label><select id="sd" class="select"><option>30 minutos</option><option>2 horas</option></select></div><p>Si el acceso incluye datos personales, la empresa debe aprobarlo. Todo lo que hagas quedará registrado.</p></div>', 'Solicitar acceso'],
    invite: ['Invitar personas', 'mail', '<div class="stack"><div class="field"><label for="ie">Correos</label><textarea id="ie" class="textarea" placeholder="Uno por línea"></textarea></div><div class="form-grid"><div class="field"><label for="ir">Rol</label><select id="ir" class="select"><option>Agente</option><option>Supervisor / coach</option><option>Administrador de empresa</option></select></div><div class="field"><label for="it">Equipo</label><select id="it" class="select">' + X.teams.map(t => '<option>' + esc(t.name) + '</option>').join('') + '</select></div></div><p>La persona recibirá un enlace válido 7 días y no podrá cambiar el rol que elijas.</p></div>', 'Enviar invitaciones'],
    'invite-coach': ['Invitar agentes a tu equipo', 'mail', '<div class="stack"><div class="field"><label for="ce">Correos</label><textarea id="ce" class="textarea" placeholder="Uno por línea"></textarea></div><div class="form-grid"><div class="field"><span class="lbl">Rol</span><div>' + tag('Agente', 'info') + ' <span class="muted" style="font-size:12px">' + ic('lock', 12) + ' Los coaches solo invitan agentes</span></div></div><div class="field"><label for="ct">Equipo</label><select id="ct" class="select"><option>Retail A · Mañana</option></select></div></div><p>Solo puedes invitar a los equipos que supervisas. El servidor lo comprueba aunque se fuerce la petición.</p></div>', 'Enviar invitaciones'],
    shortcuts: ['Atajos de teclado', 'keyboard', '<div class="stack"><div class="row"><kbd>/</kbd> Buscar</div><div class="row"><kbd>Esc</kbd> Cerrar menús y diálogos</div><div class="row"><kbd>Tab</kbd> Moverse entre controles</div><p>En el simulador se mantienen sus atajos actuales (1–9, Enter, K, P).</p></div>', 'Entendido']
  };

  function renderDialog(key) {
    const d = DIALOGS[key];
    if (!d) return '';
    return '<div class="dialog-wrap" data-act="close-dialog"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT"><div class="dialog-h"><span class="ic" style="color:var(--' + (d[4] === 'danger' ? 'danger' : 'primary') + ')">' + ic(d[1], 22) + '</span><h2 id="dlgT">' + esc(d[0]) + '</h2></div>' +
      '<div class="dialog-b">' + d[2] + '</div><div class="dialog-f">' + (key === 'shortcuts' ? '' : btn('Cancelar', { act: 'close-dialog' })) + btn(d[3], { kind: d[4] || 'primary', act: 'dialog-ok', arg: key }) + '</div></div></div>';
  }

  /* ============================================================
     Events
     ============================================================ */
  let lastFocus = null;
  function toast(msg) {
    ui.toast = msg;
    render();
    clearTimeout(toast.t);
    toast.t = setTimeout(() => { ui.toast = null; render(); }, 3200);
  }

  document.addEventListener('click', e => {
    if (e.target.closest('.skip')) {   // the skip link must not change the route hash
      e.preventDefault();
      const m = document.getElementById('main');
      if (m) m.focus();
      return;
    }
    const t = e.target.closest('[data-act]');
    if (ui.menu && !e.target.closest('.menu') && !(t && t.dataset.act === 'menu')) { ui.menu = null; render(); }
    if (!t) return;
    const act = t.dataset.act, arg = t.dataset.arg;
    if (act === 'close-dialog' && e.target !== t && t.classList.contains('dialog-wrap')) return;   // clicks inside the dialog
    switch (act) {
      case 'theme':
        ui.theme = ui.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', ui.theme);
        try { localStorage.setItem('shiftready.proto.theme', ui.theme); } catch (err) { /* ignore */ }
        ui.menu = null; render(); break;
      case 'menu':
        e.preventDefault();
        ui.menu = ui.menu === arg ? null : arg; render();
        if (ui.menu) { const first = document.querySelector('.menu .menu-item'); if (first) first.focus(); }
        break;
      case 'drawer': ui.drawer = !ui.drawer; render(); if (ui.drawer) { const l = document.querySelector('.sb-link'); if (l) l.focus(); } break;
      case 'dialog': e.preventDefault(); lastFocus = t; ui.menu = null; ui.dialog = arg; render(); setTimeout(() => { const f = document.querySelector('.dialog input, .dialog select, .dialog textarea, .dialog .btn-primary, .dialog .btn-danger'); if (f) f.focus(); }, 20); break;
      case 'close-dialog': ui.dialog = null; render(); if (lastFocus) try { lastFocus.focus(); } catch (err) { /* gone */ } break;
      case 'dialog-ok': ui.dialog = null; toast(arg === 'shortcuts' ? 'Listo.' : 'Acción demostrativa: no se guarda ni se envía nada.'); break;
      case 'toast': e.preventDefault(); ui.menu = null; toast(arg); break;
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.act === 'review-role') {
      ui.f = {};
      go(el.value === 'access' ? A('landing') : H(el.value, ROLES[el.value].home));
      return;
    }
    if (el.dataset.filter) { ui.f[el.dataset.filter] = el.value; render(); return; }
    if (el.dataset.wiz) { ui.wiz[el.dataset.wiz] = el.value; render(); return; }
    if (el.dataset.wizList) {
      const k = el.dataset.wizList, v = k === 'days' ? Number(el.value) : el.value;
      ui.wiz[k] = ui.wiz[k].filter(x => x !== v).concat(el.checked ? [v] : []);
      render(); return;
    }
    if (el.dataset.setup) { ui.setup[el.dataset.setup] = el.value; render(); return; }
    if (el.dataset.setupDay) { const n = Number(el.dataset.setupDay); ui.setup.days = ui.setup.days.filter(x => x !== n).concat(el.checked ? [n] : []).sort(); render(); return; }
    if (el.dataset.setupDiff) { ui.setup.difficulty = el.dataset.setupDiff; render(); }
  });

  document.addEventListener('input', e => {
    const el = e.target;
    if (el.dataset.filter === 'q') {
      ui.f.q = el.value;
      const pos = el.selectionStart;
      render();
      const again = document.querySelector('[data-filter="q"]');
      if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (err) { /* ignore */ } }
    }
    if (el.dataset.wiz && el.tagName !== 'SELECT' && el.type !== 'radio') ui.wiz[el.dataset.wiz] = el.value;   // keep typing smooth, no re-render
  });

  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-submit]');
    if (!f) return;
    e.preventDefault();
    go(f.dataset.submit);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (ui.dialog) { ui.dialog = null; render(); if (lastFocus) try { lastFocus.focus(); } catch (err) { /* gone */ } return; }
      if (ui.menu || ui.drawer) { const which = ui.menu; ui.menu = null; ui.drawer = false; render(); const b = document.querySelector('[data-arg="' + which + '"]'); if (b) b.focus(); return; }
    }
    if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ''))) {
      const s = document.querySelector('.tb-search input, .filters .search input');
      if (s) { e.preventDefault(); s.focus(); }
    }
    if (e.key === 'Enter' && e.target.dataset.act === 'search') toast('Búsqueda demostrativa: en el producto buscaría dentro de tu espacio de trabajo.');
  });

  render();
})();
