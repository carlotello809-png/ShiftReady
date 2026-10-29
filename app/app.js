/* ShiftReady platform — stage 2: access, two-step verification, invitations, workspaces and role shells.
   Talks to Supabase with the public key only. Every permission is checked again by the database
   (RLS + the functions in supabase/migrations); hiding a button here is never the protection. */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';
import { SUPABASE_URL, SUPABASE_KEY, ENV_LABEL, CONTACT_EMAIL } from './config.js';

const root = document.getElementById('root');
const SR = window.SR || {};
const BASE = location.origin + location.pathname;          // email links come back here (no #)
const PROTO = '../prototype/index.html';
const KEY = { org: 'shiftready.app.org', invite: 'shiftready.app.invite', theme: 'shiftready.app.theme' };
const store = {
  get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del: k => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};

const sb = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

/* ================================================================
   State
   ================================================================ */
const S = {
  ready: false, session: null, aal: null, factors: [], workspaces: [], platformRole: null, profile: null,
  view: { name: '', args: [] }, err: {}, vals: {}, busy: null, note: null, toast: null, dialog: null, signingOut: false,
  menu: null, drawer: false, enroll: null, enrolling: false, afterMfa: null, recovery: false, lastLink: null, email: null,
  theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
};
const DATA = {};                                            // page data cache: key -> { data } | { error } | { loading }

/* ================================================================
   Small helpers (same components as assets/css/platform.css)
   ================================================================ */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EXTRA = {
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>'
};
function ic(name, size) {
  size = size || 16;
  if (EXTRA[name]) return '<svg class="i" width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + EXTRA[name] + '</svg>';
  return SR.icon ? SR.icon(name, size) : '';
}
const brand = size => (SR.logo && SR.logo.tile ? SR.logo.tile(size, { word: false }) : '');
const wordmark = () => '<span><span style="font-weight:800">Shift</span><span style="font-weight:500">Ready</span></span>';
const hue = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
const initials = s => String(s || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const av = (name, cls) => '<span class="av' + (cls ? ' ' + cls : '') + '" style="--h:' + hue(name) + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
const tag = (text, tone) => '<span class="tag' + (tone ? ' tag-' + tone : '') + '">' + esc(text) + '</span>';
const when = d => (d ? new Date(d).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const day = d => (d ? new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const firstName = () => ((S.profile && S.profile.full_name) || '').split(' ')[0] || (S.session ? S.session.user.email.split('@')[0] : '');

function btn(label, o) {
  o = o || {};
  const cls = 'btn' + (o.kind ? ' btn-' + o.kind : '') + (o.size ? ' btn-' + o.size : '') + (o.block ? ' btn-block' : '');
  const inner = (o.icon ? ic(o.icon, 15) : '') + esc(label);
  if (o.href) return '<a class="' + cls + '" href="' + esc(o.href) + '"' + (o.ext ? ' target="_blank" rel="noopener"' : '') + '>' + inner + '</a>';
  return '<button type="' + (o.type || 'button') + '" class="' + cls + '"' + (o.act ? ' data-act="' + o.act + '"' : '') + (o.arg != null ? ' data-arg="' + esc(o.arg) + '"' : '') + (o.disabled ? ' disabled' : '') + '>' + inner + '</button>';
}
// Submit button that shows it is working while its form is busy
const submit = (label, form, o) => btn(S.busy === form ? 'Un momento…' : label, Object.assign({ type: 'submit', kind: 'primary', disabled: S.busy === form }, o || {}));
const val = (form, field) => esc((S.vals[form] || {})[field] || '');
const formErr = form => (S.err[form] ? alertBox('danger', S.err[form]) : '');
// A message meant for one screen only (e.g. "link sent" on the recovery screen)
const setNote = (screen, text, tone) => { S.note = { screen, text, tone: tone || 'info' }; };
const note = screen => (S.note && S.note.screen === screen ? alertBox(S.note.tone, S.note.text) : '');

function alertBox(kind, title, text) {
  const icons = { info: 'info', success: 'checkCircle', warning: 'alert', danger: 'xCircle' };
  return '<div class="alert alert-' + kind + '" role="' + (kind === 'danger' ? 'alert' : 'status') + '">' + ic(icons[kind], 16) + '<div><b>' + esc(title) + '</b>' + (text ? '<span>' + text + '</span>' : '') + '</div></div>';
}
const empty = (icon, title, text, action) => '<div class="empty"><span class="ic">' + ic(icon, 22) + '</span><h3>' + esc(title) + '</h3>' + (text ? '<p>' + text + '</p>' : '') + (action || '') + '</div>';
const card = (title, body, o) => {
  o = o || {};
  return '<section class="card' + (o.cls ? ' ' + o.cls : '') + '">' + (title ? '<div class="card-h"><h3>' + title + '</h3>' + (o.actions || '') + '</div>' : '') +
    '<div class="card-b' + (o.flush ? ' flush' : '') + '">' + body + '</div>' + (o.foot ? '<div class="card-f">' + o.foot + '</div>' : '') + '</section>';
};
const pageHead = (title, sub, actions) => '<div class="page-h"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="page-actions">' + actions + '</div>' : '') + '</div>';
const dl = pairs => '<dl class="dl">' + pairs.map(p => '<dt>' + esc(p[0]) + '</dt><dd>' + p[1] + '</dd>').join('') + '</dl>';
function table(cols, rows, emptyText) {
  if (!rows.length) return empty('inbox', emptyText || 'Todavía no hay nada aquí');
  return '<div class="table-wrap"><table class="table"><thead><tr>' + cols.map(c => '<th scope="col">' + esc(c[0]) + '</th>').join('') + '</tr></thead><tbody>' +
    rows.map(r => '<tr' + (r._muted ? ' class="muted-row"' : '') + '>' + cols.map(c => '<td>' + c[1](r) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
}
const loading = () => '<div class="card"><div class="card-b"><div class="skel" style="height:18px;width:40%;margin-bottom:12px"></div><div class="skel" style="height:14px;width:70%"></div></div></div>';

const ROLE = { admin: 'Administrador de empresa', coach: 'Supervisor / coach', agent: 'Agente', superadmin: 'Superadministrador', support: 'Soporte ShiftReady' };
const ROLE_TONE = { admin: 'info', coach: 'accent', agent: '', superadmin: 'info', support: '' };
const PLAN = { trial: 'Prueba', starter: 'Starter', business: 'Business', enterprise: 'Enterprise' };
const ORG_STATUS = { active: ['Activa', 'success'], trial: ['Prueba', 'info'], suspended: ['Suspendida', 'danger'] };

/* ================================================================
   Error messages (codes come from the database functions and Supabase Auth)
   ================================================================ */
const ERR = {
  not_allowed: 'No tienes permiso para hacer esto.',
  mfa_required: 'Esta acción exige la verificación en dos pasos.',
  invitation_invalid: 'La invitación no es válida: caducó, ya se usó o fue anulada.',
  email_mismatch: 'Esta invitación es para otro correo. Entra con el correo al que llegó.',
  email_not_confirmed: 'Confirma tu correo antes de continuar. Revisa tu bandeja de entrada.',
  already_member: 'Esa persona ya pertenece a la empresa.',
  seat_limit: 'La empresa no tiene puestos libres en su plan.',
  last_admin: 'La empresa no puede quedarse sin administradores activos.',
  org_suspended: 'La empresa está suspendida.',
  reason_required: 'Escribe el motivo (al menos 5 caracteres).',
  invalid_role: 'Rol no válido.',
  invalid_team: 'Equipo no válido.',
  invalid_email: 'El correo no es válido.',
  invalid_status: 'Estado no válido.',
  membership_disabled: 'Tu acceso a esta empresa está desactivado. Habla con su administrador.',
  coach_role_required: 'Solo un supervisor o un administrador puede ser coach de un equipo.',
  invitation_not_pending: 'Esa invitación ya no está pendiente.',
  not_authenticated: 'Inicia sesión primero.',
  invalid_credentials: 'Correo o contraseña incorrectos.',
  user_already_exists: 'Revisa tu correo para continuar.',
  weak_password: 'La contraseña es demasiado débil. Usa al menos 10 caracteres.',
  same_password: 'La nueva contraseña debe ser distinta de la anterior.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos. Espera unos minutos y vuelve a intentarlo.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Espera un momento.',
  mfa_verification_failed: 'El código no es correcto o ya caducó. Prueba con el siguiente.',
  insufficient_aal: 'Primero verifica tu segundo paso.',
  otp_expired: 'El enlace caducó o ya se usó. Pide uno nuevo.',
  invalid_days: 'Elige días que formen parte del entrenamiento.',
  campaign_closed: 'Esta campaña no está activa ahora mismo.',
  practice_disabled: 'Tu empresa no permite la práctica libre.',
  invalid_difficulty: 'Elige una dificultad válida.',
  invalid_customers: 'El número de clientes no es válido.',
  invalid_reply: 'Elige una velocidad de respuesta válida.',
  too_many_sessions: 'Empezaste demasiadas sesiones en la última hora. Espera un poco.',
  session_closed: 'Esta sesión ya está verificada y no se puede cambiar.',
  invalid_result: 'El resultado recibido no es válido.',
  result_too_large: 'El resultado es demasiado grande para guardarlo.'
};
function msg(e) {
  if (!e) return '';
  const m = String(e.message || e);
  const code = (e.code && ERR[e.code]) ? e.code : Object.keys(ERR).find(k => m === k || m.indexOf(k) === 0);
  if (code) return ERR[code];
  if (/row-level security/i.test(m)) return 'No tienes permiso para hacer esto (o falta la verificación en dos pasos).';
  if (/permission denied/i.test(m)) return 'No tienes permiso para hacer esto.';
  if (/duplicate key/i.test(m)) return 'Ya existe uno con ese nombre.';
  if (/failed to fetch|networkerror|load failed/i.test(m)) return 'No hay conexión con el servidor. Revisa tu internet.';
  if (/aal2|assurance/i.test(m)) return ERR.insufficient_aal;
  return 'Algo salió mal: ' + m;
}
const q = async p => { const { data, error } = await p; if (error) throw error; return data; };

/* ================================================================
   Session context and the gate that decides where you land
   ================================================================ */
async function loadContext() {
  const uid = S.session.user.id;
  const [aal, factors, ws, pa, prof] = await Promise.all([
    sb.auth.mfa.getAuthenticatorAssuranceLevel(),
    sb.auth.mfa.listFactors(),
    sb.rpc('my_workspaces'),
    sb.from('platform_admins').select('role').eq('user_id', uid).maybeSingle(),
    sb.from('profiles').select('full_name, email').eq('id', uid).maybeSingle()
  ]);
  S.aal = aal.data || null;
  S.factors = ((factors.data && factors.data.totp) || []).filter(f => f.status === 'verified');
  S.workspaces = ws.data || [];
  S.platformRole = pa.data ? pa.data.role : null;
  S.profile = prof.data || null;
}
const activeWs = () => S.workspaces.filter(w => w.membership_status === 'active' && w.org_status !== 'suspended');
const needsMfa = () => !!S.platformRole || activeWs().some(w => w.role === 'admin');
const mfaPending = () => S.factors.length > 0 && S.aal && S.aal.currentLevel !== 'aal2';

function home() {
  const ws = activeWs();
  const options = ws.length + (S.platformRole ? 1 : 0);
  if (!options) {
    if (S.workspaces.some(w => w.org_status === 'suspended')) return '#/suspended';
    if (S.workspaces.some(w => w.membership_status === 'disabled')) return '#/disabled';
    return '#/no-org';
  }
  const last = store.get(KEY.org);
  if (last === 'platform' && S.platformRole) return '#/platform/empresas';
  if (last && ws.some(w => w.org_id === last)) return '#/w/' + last + '/inicio';
  if (options === 1) return ws.length ? '#/w/' + ws[0].org_id + '/inicio' : '#/platform/empresas';
  return '#/workspaces';
}

const PUBLIC = ['', 'login', 'signup', 'recover', 'check-email', 'request', 'invite'];
const TITLES = {
  login: 'Iniciar sesión', signup: 'Crear cuenta', recover: 'Recuperar contraseña', 'check-email': 'Revisa tu correo', reset: 'Nueva contraseña',
  request: 'Solicitar acceso', invite: 'Invitación', mfa: 'Verificación en dos pasos', workspaces: 'Espacios de trabajo',
  'no-org': 'Sin organización', disabled: 'Acceso desactivado', suspended: 'Empresa suspendida'
};
function gate(r) {
  if (!S.session) return PUBLIC.indexOf(r.name) === -1 ? '#/login' : null;
  // Password recovery: Supabase asks for the second step before changing the password of an account that has it
  if (S.recovery) return (r.name === 'reset' || (r.name === 'mfa' && r.args[0] === 'verify' && mfaPending())) ? null : '#/reset';
  if (mfaPending()) return r.name === 'mfa' && r.args[0] === 'verify' ? null : '#/mfa/verify';
  if (r.name === 'invite' || r.name === 'reset') return null;
  const pending = store.get(KEY.invite);
  if (pending) return '#/invite/' + pending;
  if (needsMfa() && !S.factors.length) return r.name === 'mfa' && r.args[0] === 'setup' ? null : '#/mfa/setup';
  if (r.name === 'mfa' && r.args[0] === 'setup') return null;
  if (r.name === 'w') {
    const ws = activeWs().find(w => w.org_id === r.args[0]);
    return ws ? null : home();
  }
  if (r.name === 'platform') return S.platformRole ? null : home();
  if (['workspaces', 'no-org', 'disabled', 'suspended'].indexOf(r.name) !== -1) return null;
  return home();
}

/* ================================================================
   Router
   ================================================================ */
function parse() {
  const parts = (location.hash || '#/').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  return { name: parts[0] || '', args: parts.slice(1) };
}
function go(hash) {
  if (location.hash === hash) route();
  else location.hash = hash;
}
function route() {
  const r = parse();
  if (sb && S.ready) {
    const dest = gate(r);
    if (dest && dest !== location.hash) { location.replace(BASE + dest); return; }
  }
  S.view = r;
  if (S.note && S.note.screen !== r.name) S.note = null;
  S.menu = null; S.drawer = false;
  render();
  const main = document.getElementById('main');
  if (main) main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);

/* ================================================================
   Rendering
   ================================================================ */
function envBar() {
  return '<div class="env-bar" role="note"><b>' + esc(ENV_LABEL) + '</b><span>Datos de prueba</span><span class="sp"></span>' +
    '<a href="../">← Volver a la portada</a>' +
    '<button type="button" data-act="theme" aria-label="Cambiar a modo ' + (S.theme === 'dark' ? 'claro' : 'oscuro') + '">' + ic(S.theme === 'dark' ? 'sun' : 'moon', 14) + '</button></div>';
}
function render() {
  let html = envBar();
  if (!sb) html += setupScreen();
  else if (!S.ready) html += '<p class="boot-msg">Cargando…</p>';
  else {
    const r = S.view;
    const screen = SCREENS[r.name];
    if (r.name === 'w' || r.name === 'platform') html += shell(r);
    else {
      document.title = (TITLES[r.name] || TITLES.login) + ' · ShiftReady';
      html += screen ? screen(r) : SCREENS.login(r);
    }
  }
  root.innerHTML = html + (S.dialog ? dialogHtml() : '') + (S.toast ? '<div class="toast" role="status">' + ic('checkCircle', 16) + '<span>' + esc(S.toast) + '</span></div>' : '');
}
function toast(text) {
  S.toast = text; render();
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { S.toast = null; render(); }, 3200);
}
// Cached page data: render shows "loading", then fills in
function need(key, loader) {
  if (DATA[key]) return DATA[key];
  DATA[key] = { loading: true };
  loader().then(data => { DATA[key] = { data }; render(); }, error => { DATA[key] = { error }; render(); });
  return DATA[key];
}
const forget = prefix => Object.keys(DATA).forEach(k => { if (!prefix || k.indexOf(prefix) === 0) delete DATA[k]; });
const loadState = d => (d.loading ? loading() : d.error ? alertBox('danger', 'No se pudo cargar', esc(msg(d.error))) : null);

/* ================================================================
   Access screens (no sidebar)
   ================================================================ */
function authLayout(inner) {
  return '<div class="auth"><aside class="auth-side"><div><div class="brand">' + brand(40) + wordmark() + '</div></div>' +
    '<div><h2>Entrena a tu equipo de atención al cliente con simulaciones reales.</h2>' +
    '<p>Campañas de formación, simulaciones con las políticas de tu empresa y resultados para tu equipo de supervisión.</p>' +
    '<ul><li>' + ic('shieldCheck', 16) + '<span>Cada empresa ve solo sus datos.</span></li><li>' + ic('users', 16) + '<span>Tu rol lo asigna tu organización.</span></li><li>' + ic('lock', 16) + '<span>Verificación en dos pasos para administradores.</span></li></ul></div>' +
    '<div class="foot">ShiftReady</div></aside><main id="main" class="auth-main" tabindex="-1">' + inner + '</main></div>';
}
function stateScreen(tone, icon, title, text, actions) {
  return '<div class="auth" style="grid-template-columns:1fr"><main id="main" class="auth-main" tabindex="-1"><div class="state"><span class="ic ' + tone + '">' + ic(icon, 26) + '</span><h1>' + esc(title) + '</h1><p>' + text + '</p><div class="row" style="justify-content:center;margin-top:8px">' + actions + '</div></div></main></div>';
}
function setupScreen() {
  return stateScreen('warn', 'alert', 'Falta la clave pública de Supabase',
    'Abre <span class="mono">app/config.js</span> y pega en <span class="mono">SUPABASE_KEY</span> la clave pública del proyecto (Supabase → Project Settings → API Keys → «Publishable key» o «anon public»). Nunca la clave secreta.', '');
}
function inviteBanner() {
  const t = store.get(KEY.invite);
  const p = t && DATA['invite:' + t] && DATA['invite:' + t].data;
  if (!p) return '';
  return alertBox('info', 'Invitación de ' + p.org_name, 'Te unirás como <b>' + esc(ROLE[p.role] || p.role) + '</b>. Usa el correo al que llegó la invitación: <b>' + esc(p.email_hint) + '</b>.');
}

const SCREENS = {
  login: () => authLayout('<form class="auth-card" data-form="login"><h1>Iniciar sesión</h1><p>Usa tu correo de trabajo.</p><div class="stack">' +
    note('login') + inviteBanner() + formErr('login') +
    '<div class="field"><label for="em">Correo electrónico</label><input id="em" name="email" class="input" type="email" autocomplete="username" value="' + val('login', 'email') + '" required></div>' +
    '<div class="field"><label for="pw">Contraseña</label><input id="pw" name="password" class="input" type="password" autocomplete="current-password" required></div>' +
    submit('Entrar', 'login', { size: 'lg', block: true }) +
    (S.err.login === ERR.email_not_confirmed ? btn('Reenviar el correo de confirmación', { act: 'resend', block: true }) : '') +
    '<div class="auth-links"><a href="#/recover">¿Olvidaste tu contraseña?</a><a href="#/signup">Crear cuenta</a></div>' +
    '<p class="muted" style="font-size:12px">¿Te invitaron? Abre el enlace de la invitación. ¿Tu empresa aún no usa ShiftReady? <a href="#/request">Solicita acceso</a>.</p></div></form>'),

  signup: () => authLayout('<form class="auth-card" data-form="signup"><h1>Crear cuenta</h1><p>La cuenta por sí sola no da acceso a ninguna empresa: el rol lo asigna tu organización con una invitación.</p><div class="stack">' +
    inviteBanner() + formErr('signup') +
    '<div class="field"><label for="nm">Nombre y apellido</label><input id="nm" name="full_name" class="input" autocomplete="name" maxlength="120" value="' + val('signup', 'full_name') + '" required></div>' +
    '<div class="field"><label for="sem">Correo electrónico</label><input id="sem" name="email" class="input" type="email" autocomplete="email" value="' + val('signup', 'email') + '" required></div>' +
    '<div class="field"><label for="spw">Contraseña</label><input id="spw" name="password" class="input" type="password" autocomplete="new-password" minlength="10" aria-describedby="spwh" required><span class="hint" id="spwh">Al menos 10 caracteres. No uses una contraseña de otro sitio.</span></div>' +
    '<label class="check"><input type="checkbox" name="terms" required> Acepto los términos de uso y la política de privacidad.</label>' +
    submit('Crear cuenta', 'signup', { size: 'lg', block: true }) +
    '<div class="auth-links"><a href="#/login">Ya tengo cuenta</a></div></div></form>'),

  'check-email': () => authLayout('<div class="auth-card"><h1>Revisa tu correo</h1><p>Si el correo es correcto, te llegará un enlace para confirmar la cuenta' + (S.email ? ' en <b>' + esc(S.email) + '</b>' : '') + '. Ábrelo <b>en este mismo navegador</b>.</p><div class="stack">' +
    formErr('resend') + note('check-email') +
    btn('Reenviar el correo', { act: 'resend', block: true, disabled: !S.email }) + btn('Volver a iniciar sesión', { href: '#/login', kind: 'ghost', block: true }) +
    '<p class="muted" style="font-size:12px">Entorno de desarrollo: el servidor de correo de prueba de Supabase solo envía a los miembros del proyecto y pocos correos por hora.</p></div></div>'),

  recover: () => authLayout('<form class="auth-card" data-form="recover"><h1>Recuperar contraseña</h1><p>Te enviaremos un enlace para crear una nueva.</p><div class="stack">' +
    formErr('recover') + note('recover') +
    '<div class="field"><label for="rem">Correo electrónico</label><input id="rem" name="email" class="input" type="email" autocomplete="email" value="' + val('recover', 'email') + '" required></div>' +
    submit('Enviar enlace', 'recover', { size: 'lg', block: true }) + '<a href="#/login">Volver a iniciar sesión</a></div></form>'),

  reset: () => authLayout('<form class="auth-card" data-form="reset"><h1>Nueva contraseña</h1><p>Elige la contraseña que usarás a partir de ahora.</p><div class="stack">' + formErr('reset') +
    (mfaPending() ? alertBox('info', 'Tu cuenta tiene verificación en dos pasos', 'Antes de cambiar la contraseña, <a href="#/mfa/verify">escribe el código de tu app</a>.') : '') +
    '<div class="field"><label for="np">Nueva contraseña</label><input id="np" name="password" class="input" type="password" autocomplete="new-password" minlength="10" required><span class="hint">Al menos 10 caracteres.</span></div>' +
    '<div class="field"><label for="np2">Repítela</label><input id="np2" name="password2" class="input" type="password" autocomplete="new-password" minlength="10" required></div>' +
    submit('Guardar contraseña', 'reset', { size: 'lg', block: true }) + '</div></form>'),

  request: () => authLayout('<div class="auth-card"><h1>Solicitar acceso para tu empresa</h1><p>Nuestro equipo valida la empresa, la crea e invita a su primer administrador.</p><div class="stack">' +
    (CONTACT_EMAIL ? alertBox('info', 'Escríbenos', 'Envía el nombre de la empresa, tu nombre y cuántos agentes quieres formar a <a href="mailto:' + esc(CONTACT_EMAIL) + '">' + esc(CONTACT_EMAIL) + '</a>.')
      : alertBox('info', 'Muy pronto', 'El formulario de solicitud llegará en una etapa posterior. Mientras tanto, contacta con el equipo de ShiftReady.')) +
    alertBox('info', 'Esto no crea ninguna cuenta ni permiso.', '') + btn('Volver', { href: '#/login', kind: 'ghost', block: true }) + '</div></div>'),

  invite: r => inviteScreen(r.args[0] || ''),
  mfa: r => (r.args[0] === 'verify' ? mfaVerifyScreen() : mfaSetupScreen()),

  workspaces: () => authLayout('<div class="auth-card" style="max-width:480px"><h1>Elige un espacio de trabajo</h1><p>Puedes cambiar después desde la barra superior.</p><div class="ws-list">' +
    activeWs().map(w => '<button type="button" class="ws-item" data-act="ws" data-arg="' + esc(w.org_id) + '"><span class="ws-logo">' + esc(initials(w.org_name)) + '</span><span class="meta"><b>' + esc(w.org_name) + '</b><small>' + esc(ROLE[w.role]) + '</small></span>' + ic('chevRight', 16) + '</button>').join('') +
    (S.platformRole ? '<button type="button" class="ws-item" data-act="ws" data-arg="platform" style="border-style:dashed"><span class="ws-logo" style="background:var(--navy-900)">SR</span><span class="meta"><b>Consola de plataforma</b><small>' + esc(ROLE[S.platformRole]) + '</small></span>' + ic('lock', 16) + '</button>' : '') +
    S.workspaces.filter(w => activeWs().indexOf(w) === -1).map(w => '<div class="ws-item" style="opacity:.6"><span class="ws-logo">' + esc(initials(w.org_name)) + '</span><span class="meta"><b>' + esc(w.org_name) + '</b><small>' + (w.org_status === 'suspended' ? 'Empresa suspendida' : 'Acceso desactivado') + '</small></span></div>').join('') +
    '</div><div class="auth-links" style="margin-top:16px"><button type="button" class="btn btn-ghost" data-act="signout">Cerrar sesión</button></div></div>'),

  'no-org': () => stateScreen('info', 'users', 'Tu cuenta aún no pertenece a ninguna organización',
    'Para entrenar necesitas una invitación de tu empresa. Pide a tu administrador o supervisor que te invite con <b>' + esc(S.session && S.session.user.email) + '</b> y abre el enlace que te envíen.' +
      '<br><br>Verificación en dos pasos: ' + (S.factors.length ? tag('Activada', 'success') : tag('No activada', 'warning') + ' <span class="muted" style="font-size:12px">(obligatoria para administrar)</span>'),
    (S.factors.length ? '' : btn('Activar verificación en dos pasos', { act: 'mfa-on', arg: '#/no-org', kind: 'primary', icon: 'lock' })) +
    btn('Solicitar acceso para mi empresa', { href: '#/request' }) + btn('Cerrar sesión', { act: 'signout', kind: 'ghost' })),
  disabled: () => stateScreen('danger', 'xCircle', 'Tu acceso está desactivado', 'Un administrador de tu organización desactivó tu acceso. No se muestran datos de la empresa.', btn('Cerrar sesión', { act: 'signout', kind: 'primary' })),
  suspended: () => stateScreen('warn', 'alert', 'La empresa está suspendida', 'El acceso está en pausa hasta que se reactive. Tus datos se conservan. Habla con tu administrador.', btn('Cerrar sesión', { act: 'signout', kind: 'primary' }))
};

/* ---------- Invitation ---------- */
function inviteScreen(token) {
  if (!token) return stateScreen('warn', 'mail', 'Falta el código de la invitación', 'Abre el enlace completo que te enviaron.', btn('Ir a iniciar sesión', { href: '#/login' }));
  const d = need('invite:' + token, async () => (await q(sb.rpc('get_invitation_preview', { p_token: token })))[0] || null);
  if (d.loading) return authLayout(loading());
  if (d.error) return authLayout('<div class="auth-card">' + alertBox('danger', 'No se pudo leer la invitación', esc(msg(d.error))) + '</div>');
  const p = d.data;
  if (!p) return stateScreen('warn', 'mail', 'Esta invitación no existe', 'El enlace está incompleto o no es correcto. Pide a quien te invitó que te lo envíe de nuevo.', btn('Descartar', { act: 'drop-invite', kind: 'primary' }));
  if (!p.valid) return stateScreen('warn', 'clock', 'Esta invitación ya no es válida', 'Caducó, ya se usó o fue anulada.' + (p.invited_by_name ? ' Pide a <b>' + esc(p.invited_by_name) + '</b> que te envíe otra.' : ''), btn('Descartar', { act: 'drop-invite', kind: 'primary' }));
  const details = '<div class="card"><div class="card-b"><div class="row" style="margin-bottom:12px"><span class="ws-logo" style="width:40px;height:40px;display:grid;place-items:center;background:var(--navy-700);color:#fff;font-weight:700">' + esc(initials(p.org_name)) + '</span><span><b>' + esc(p.org_name) + '</b><br><small class="muted">' + (p.invited_by_name ? 'Invitación de ' + esc(p.invited_by_name) + ' · ' : '') + 'caduca el ' + esc(day(p.expires_at)) + '</small></span></div>' +
    dl([['Correo', esc(p.email_hint)], ['Rol asignado', tag(ROLE[p.role] || p.role, 'info') + ' <span class="muted" style="font-size:12px">' + ic('lock', 12) + ' Lo define la organización</span>'], ['Equipo', p.team_name ? esc(p.team_name) : '—']]) + '</div></div>';
  if (!S.session) {
    return authLayout('<div class="auth-card"><h1>Te invitaron a unirte</h1><p>Revisa los datos y continúa con el correo de la invitación.</p>' + details +
      '<div class="stack" style="margin-top:16px">' + btn('Crear mi cuenta', { act: 'invite-start', arg: 'signup', kind: 'primary', size: 'lg', block: true }) + btn('Ya tengo cuenta', { act: 'invite-start', arg: 'login', block: true }) + '</div></div>');
  }
  return authLayout('<form class="auth-card" data-form="accept" data-arg="' + esc(token) + '"><h1>Te invitaron a unirte</h1><p>Has iniciado sesión como <b>' + esc(S.session.user.email) + '</b>.</p>' + details +
    '<div class="stack" style="margin-top:16px">' + formErr('accept') + submit('Aceptar y unirme', 'accept', { size: 'lg', block: true }) +
    btn('Usar otra cuenta', { act: 'signout', block: true }) + btn('Ahora no', { act: 'drop-invite', kind: 'ghost', block: true }) + '</div></form>');
}

/* ---------- Two-step verification ---------- */
async function startEnroll() {
  S.enrolling = true;
  try {
    const lf = await q(sb.auth.mfa.listFactors());
    for (const f of (lf.all || []).filter(f => f.factor_type === 'totp' && f.status !== 'verified')) await sb.auth.mfa.unenroll({ factorId: f.id });
    const data = await q(sb.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'ShiftReady ' + new Date().toISOString().slice(0, 16) }));
    S.enroll = { id: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
  } catch (e) {
    S.err.mfa = msg(e);
  }
  S.enrolling = false;
  render();
}
function mfaSetupScreen() {
  if (!S.enroll && !S.enrolling && !S.err.mfa) startEnroll();
  const required = needsMfa();
  const body = S.enroll
    ? '<ol class="stack" style="list-style:decimal;padding-left:18px"><li>Abre una app de autenticación (Google Authenticator, Microsoft Authenticator, 1Password…).</li><li>Escanea este código o escribe la clave.</li><li>Escribe el código de 6 dígitos que muestra la app.</li></ol>' +
      '<div class="qr"><img src="' + esc(S.enroll.qr) + '" alt="Código QR para la app de autenticación"></div><p class="muted" style="font-size:12px;text-align:center">Clave: <span class="secret">' + esc(S.enroll.secret) + '</span></p>' +
      '<div class="field"><label for="code">Código de 6 dígitos</label><input id="code" name="code" class="input code-input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></div>' +
      submit('Activar la verificación', 'mfa', { size: 'lg', block: true })
    : (S.err.mfa ? btn('Intentar de nuevo', { act: 'mfa-retry', block: true }) : loading());
  return authLayout('<form class="auth-card" data-form="mfa"><h1>Verificación en dos pasos</h1><p>' + (required ? 'Tu rol (' + esc(S.platformRole ? ROLE[S.platformRole] : ROLE.admin) + ') la exige antes de entrar.' : 'Protege tu cuenta con un código además de la contraseña.') + '</p><div class="stack">' +
    formErr('mfa') + body + (required ? btn('Cerrar sesión', { act: 'signout', kind: 'ghost', block: true }) : btn('Ahora no', { act: 'mfa-skip', kind: 'ghost', block: true })) + '</div></form>');
}
function mfaVerifyScreen() {
  return authLayout('<form class="auth-card" data-form="mfa-verify"><h1>Escribe tu código</h1><p>Abre tu app de autenticación y escribe el código de 6 dígitos de ShiftReady.</p><div class="stack">' + formErr('mfa-verify') +
    '<div class="field"><label for="vcode">Código</label><input id="vcode" name="code" class="input code-input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required autofocus></div>' +
    submit('Verificar', 'mfa-verify', { size: 'lg', block: true }) + btn('Cerrar sesión', { act: 'signout', kind: 'ghost', block: true }) +
    '<p class="muted" style="font-size:12px">¿Perdiste el acceso a tu app? Pide ayuda al equipo de ShiftReady; por seguridad no se puede desactivar desde aquí.</p></div></form>');
}

/* ================================================================
   App shell (signed in, inside a workspace)
   ================================================================ */
const NAV = {
  admin: [['General', [['inicio', 'Inicio', 'home']]], ['Personas', [['personas', 'Directorio', 'users'], ['equipos', 'Equipos', 'layers'], ['invitaciones', 'Invitaciones', 'mail']]],
    ['Formación', [['campanas', 'Campañas', 'flag'], ['escenarios', 'Escenarios', 'chat', 5, 'admin/scenarios']]], ['Resultados', [['informes', 'Informes', 'trending', 5, 'admin/reports']]],
    ['Mi formación', [['entrenamientos', 'Entrenar', 'play'], ['historial', 'Mi historial', 'clock']]], ['Cuenta', [['perfil', 'Perfil y seguridad', 'user']]]],
  coach: [['General', [['inicio', 'Inicio', 'home']]], ['Equipo', [['participantes', 'Participantes', 'users']]],
    ['Formación', [['campanas', 'Campañas', 'flag', 4, 'coach/campaigns'], ['revision', 'Revisión de conversaciones', 'chat', 4, 'coach/review']]],
    ['Mi formación', [['entrenamientos', 'Entrenar', 'play'], ['historial', 'Mi historial', 'clock']]], ['Cuenta', [['perfil', 'Perfil y seguridad', 'user']]]],
  agent: [['General', [['inicio', 'Inicio', 'home']]], ['Entrenar', [['entrenamientos', 'Mis entrenamientos', 'flag']]], ['Resultados', [['historial', 'Historial', 'clock']]], ['Cuenta', [['perfil', 'Perfil y seguridad', 'user']]]],
  platform: [['Plataforma', [['empresas', 'Empresas', 'building']]], ['Gobierno', [['auditoria', 'Actividad y auditoría', 'list']]], ['Cuenta', [['perfil', 'Perfil y seguridad', 'user']]]]
};

function context(r) {
  if (r.name === 'platform') return { kind: 'platform', role: 'platform', page: r.args[0] || 'empresas', base: '#/platform/', title: 'Consola de plataforma', short: 'SR', roleLabel: ROLE[S.platformRole] };
  const ws = activeWs().find(w => w.org_id === r.args[0]);
  if (!ws) return null;                                     // access changed meanwhile (suspended, disabled)
  return { kind: 'org', org: ws.org_id, ws, role: ws.role, page: r.args[1] || 'inicio', arg: r.args[2] || null, base: '#/w/' + ws.org_id + '/', title: ws.org_name, short: initials(ws.org_name), roleLabel: ROLE[ws.role] };
}
// Pages reached from another page, not from the menu: [title, menu item they belong to]
const SUBPAGES = { sesion: ['Nueva sesión', 'entrenamientos'], informe: ['Informe de la sesión', 'historial'] };

function shell(r) {
  const c = context(r);
  if (!c) { setTimeout(() => go(home()), 0); return '<p class="boot-msg">Cargando…</p>'; }
  const nav = NAV[c.role];
  const items = nav.reduce((a, g) => a.concat(g[1]), []);
  const sub = SUBPAGES[c.page] && items.some(i => i[0] === SUBPAGES[c.page][1]) ? SUBPAGES[c.page] : null;
  const item = items.find(i => i[0] === c.page);
  const current = sub ? sub[1] : c.page;
  document.title = (sub ? sub[0] : item ? item[1] : 'ShiftReady') + ' · ' + c.title + ' · ShiftReady';
  const options = activeWs().length + (S.platformRole ? 1 : 0);
  const name = (S.profile && S.profile.full_name) || S.session.user.email;
  const page = sub ? PAGES[c.page](c) : item ? (item[3] ? soonPage(item) : PAGES[c.page](c)) : empty('alert', 'Esta página no existe', '', btn('Ir al inicio', { href: c.base + (c.kind === 'platform' ? 'empresas' : 'inicio'), kind: 'primary' }));
  return '<div class="shell">' + (S.drawer ? '<div class="scrim" data-act="drawer" aria-hidden="true"></div>' : '') +
    '<aside class="sidebar' + (S.drawer ? ' open' : '') + '" id="sidebar" aria-label="Navegación principal"><a class="sb-brand" href="' + c.base + (c.kind === 'platform' ? 'empresas' : 'inicio') + '">' + brand(28) + '<span>' + wordmark() + '<small>' + esc(c.kind === 'platform' ? 'Consola de plataforma' : 'Formación de agentes') + '</small></span></a>' +
    '<nav class="sb-nav">' + nav.map(g => '<div class="sb-group"><h2>' + esc(g[0]) + '</h2><ul>' + g[1].map(i => '<li><a class="sb-link" href="' + c.base + i[0] + '"' + (i[0] === current ? ' aria-current="page"' : '') + '>' + ic(i[2], 17) + '<span>' + esc(i[1]) + '</span>' + (i[3] ? '<span class="tag" style="margin-left:auto;font-size:10px">Etapa ' + i[3] + '</span>' : '') + '</a></li>').join('') + '</ul></div>').join('') + '</nav>' +
    '<div class="sb-foot"><b>' + esc(c.title) + '</b>' + esc(c.roleLabel) + '</div></aside>' +
    '<div class="main"><header class="topbar">' +
      '<button class="icon-btn tb-menu" data-act="drawer" aria-label="Abrir menú" aria-expanded="' + S.drawer + '" aria-controls="sidebar">' + ic('menu', 20) + '</button>' +
      '<div style="position:relative"><button class="ws-btn" ' + (options > 1 ? 'data-act="menu" data-arg="ws" aria-haspopup="menu" aria-expanded="' + (S.menu === 'ws') + '"' : 'aria-disabled="true"') + '><span class="ws-logo" aria-hidden="true">' + esc(c.short) + '</span><span class="t">' + esc(c.title) + '</span>' + (options > 1 ? ic('chevDown', 15) : '') + '</button>' + (S.menu === 'ws' ? wsMenu(c) : '') + '</div>' +
      '<span class="tb-sp"></span>' +
      '<div style="position:relative"><button class="me-btn" data-act="menu" data-arg="me" aria-haspopup="menu" aria-expanded="' + (S.menu === 'me') + '">' + av(name) + '<span class="t"><b>' + esc(name) + '</b><small>' + esc(c.roleLabel) + '</small></span>' + ic('chevDown', 14) + '</button>' + (S.menu === 'me' ? meMenu(c) : '') + '</div>' +
    '</header><main id="main" class="page" tabindex="-1">' + page + '</main></div></div>';
}
const menuWrap = (items, label, side) => '<div class="menu" role="menu" aria-label="' + esc(label) + '" style="top:calc(100% + 6px);' + (side === 'left' ? 'left:0' : 'right:0') + '">' + items + '</div>';
function wsMenu(c) {
  return menuWrap('<h3>Espacios de trabajo</h3>' + activeWs().map(w => '<button class="menu-item" role="menuitemradio" aria-checked="' + (c.org === w.org_id) + '" data-act="ws" data-arg="' + esc(w.org_id) + '"><span class="meta"><b>' + esc(w.org_name) + '</b><small>' + esc(ROLE[w.role]) + '</small></span></button>').join('') +
    (S.platformRole ? '<button class="menu-item" role="menuitemradio" aria-checked="' + (c.kind === 'platform') + '" data-act="ws" data-arg="platform"><span class="meta"><b>Consola de plataforma</b><small>' + esc(ROLE[S.platformRole]) + '</small></span></button>' : ''), 'Cambiar de espacio de trabajo', 'left');
}
function meMenu(c) {
  return menuWrap('<div style="padding:8px 10px"><b>' + esc((S.profile && S.profile.full_name) || '') + '</b><br><small class="muted">' + esc(S.session.user.email) + '</small></div><hr>' +
    '<a class="menu-item" role="menuitem" href="' + c.base + 'perfil">' + ic('user', 16) + 'Perfil y seguridad</a>' +
    '<button class="menu-item" role="menuitem" data-act="theme">' + ic(S.theme === 'dark' ? 'sun' : 'moon', 16) + 'Modo ' + (S.theme === 'dark' ? 'claro' : 'oscuro') + '</button>' +
    '<hr><button class="menu-item" role="menuitem" data-act="signout">' + ic('logout', 16) + 'Cerrar sesión</button>', 'Menú de usuario');
}
function soonPage(item) {
  return pageHead(item[1], 'Esta sección llega en la etapa ' + item[3] + ' del plan.') +
    card('', empty(item[2], 'Todavía no está disponible', 'Puedes ver cómo será en el prototipo de diseño.', btn('Ver en el prototipo', { href: PROTO + '#/app/' + item[4], ext: true })), { cls: 'soon' });
}
// Shown after creating an invitation: the link to share (automatic email arrives in a later stage)
function linkBox() {
  if (!S.lastLink) return '';
  return '<div class="section">' + card(ic('mail', 16) + esc(S.lastLink.title), '<p style="font-size:13px;margin-bottom:10px">Copia el enlace y envíaselo a <b>' + esc(S.lastLink.to) + '</b>. Caduca en 7 días y solo sirve con ese correo. El envío automático por correo llegará más adelante.</p>' +
    '<div class="linkbox"><input class="input" readonly value="' + esc(S.lastLink.url) + '" aria-label="Enlace de invitación">' + btn('Copiar', { act: 'copy', arg: S.lastLink.url, icon: 'copy' }) + '</div>', { actions: btn('Cerrar', { act: 'close-link', size: 'sm', kind: 'ghost' }) }) + '</div>';
}

/* ---------- Pages ---------- */
const peopleOf = org => need('people:' + org, async () => {
  const mem = await q(sb.from('memberships').select('id, user_id, role, status, created_at').eq('org_id', org).order('created_at'));
  const ids = mem.map(m => m.user_id);
  const prof = ids.length ? await q(sb.from('profiles').select('id, full_name, email').in('id', ids)) : [];
  const pm = Object.fromEntries(prof.map(p => [p.id, p]));
  return mem.map(m => Object.assign({ p: pm[m.user_id] || { email: '—', full_name: '' } }, m));
});
const teamsOf = org => need('teams:' + org, async () => {
  const [teams, tm] = await Promise.all([q(sb.from('teams').select('id, name').eq('org_id', org).order('name')), q(sb.from('team_members').select('team_id, user_id, team_role').eq('org_id', org))]);
  return teams.map(t => Object.assign({ members: tm.filter(m => m.team_id === t.id) }, t));
});
const personCell = p => '<span class="cell-user">' + av(p.full_name || p.email, 'sm') + '<span class="meta"><b>' + esc(p.full_name || 'Sin nombre') + '</b><small>' + esc(p.email) + '</small></span></span>';
const inviteStatus = i => (i.status === 'pending' && new Date(i.expires_at) <= new Date()) ? tag('Caducada', 'danger') : tag({ pending: 'Pendiente', accepted: 'Aceptada', revoked: 'Anulada', expired: 'Caducada' }[i.status], { pending: 'warning', accepted: 'success', revoked: '', expired: 'danger' }[i.status]);

const PAGES = {
  inicio: c => {
    const steps = {
      admin: [['layers', 'Crea los equipos', 'Agrupa a las personas y asígnales un coach.', c.base + 'equipos'], ['mail', 'Invita a supervisores y agentes', 'Tú eliges el rol; la persona no puede cambiarlo.', c.base + 'invitaciones'], ['flag', 'Crea una campaña', 'Días, dificultad y equipos que deben entrenar.', c.base + 'campanas']],
      coach: [['users', 'Revisa tu equipo', 'Las personas de los equipos que coacheas.', c.base + 'participantes'], ['mail', 'Invita agentes', 'Solo a tus equipos.', c.base + 'participantes']],
      agent: [['flag', 'Tus entrenamientos', 'Las campañas que te asignaron y la práctica libre.', c.base + 'entrenamientos'], ['clock', 'Tu historial', 'Tus resultados, verificados por el servidor.', c.base + 'historial']]
    }[c.role] || [];
    return pageHead('Hola, ' + firstName(), esc(c.title) + ' · ' + esc(c.roleLabel)) +
      '<div class="grid g-2-1">' + card('Siguientes pasos', '<ul class="list">' + steps.map(s => '<li>' + ic(s[0], 16) + '<span class="meta"><a href="' + s[3] + '" style="font-weight:600;text-decoration:none;color:var(--text)">' + esc(s[1]) + '</a><small>' + esc(s[2]) + '</small></span></li>').join('') +
        (c.role === 'agent' ? '' : '<li>' + ic('sparkle', 16) + '<span class="meta"><b style="font-weight:500">Resultados del equipo e informes</b><small>Llegan en las etapas 4 y 5 del plan.</small></span></li>') + '</ul>', { flush: true }) +
      card('Tu cuenta', dl([['Correo', esc(S.session.user.email)], ['Rol aquí', tag(c.roleLabel, ROLE_TONE[c.role])], ['Dos pasos', S.factors.length ? tag('Activada', 'success') : '<a href="' + c.base + 'perfil">Activar</a>']])) + '</div>';
  },

  entrenar: () => pageHead('Simulador', 'El simulador de chat de siempre, sin cambios.') +
    '<div class="focus-card"><div><h2>Atiende clientes con las políticas reales</h2><p style="margin-top:6px">Se abre en una pestaña nueva, a pantalla completa.</p></div>' + btn('Abrir el simulador', { href: '../index.html', ext: true, kind: 'accent', size: 'lg', icon: 'external' }) + '</div>' +
    '<div class="section">' + alertBox('info', 'Hoy el progreso se guarda solo en este navegador', 'En la etapa 3 cada sesión se guardará en tu historial y la verá tu supervisor.') + '</div>',

  personas: c => {
    const d = peopleOf(c.org);
    const head = pageHead('Directorio', 'Todas las personas de ' + esc(c.title) + ' y su rol.', btn('Invitar personas', { href: c.base + 'invitaciones', kind: 'primary', icon: 'mail' }));
    if (loadState(d)) return head + loadState(d);
    const me = S.session.user.id;
    return head + card('', table([
      ['Persona', m => personCell(m.p) + (m.user_id === me ? ' ' + tag('Tú') : '')],
      ['Rol', m => '<select class="select sm" data-change="role" data-arg="' + m.id + '" aria-label="Rol de ' + esc(m.p.full_name || m.p.email) + '">' + ['admin', 'coach', 'agent'].map(r => '<option value="' + r + '"' + (m.role === r ? ' selected' : '') + '>' + esc(ROLE[r]) + '</option>').join('') + '</select>'],
      ['Estado', m => (m.status === 'active' ? tag('Activo', 'success') : tag('Desactivado', 'danger'))],
      ['Alta', m => esc(day(m.created_at))],
      ['', m => btn(m.status === 'active' ? 'Desactivar' : 'Reactivar', { act: 'member-status', arg: m.id + ':' + (m.status === 'active' ? 'disabled' : 'active'), size: 'sm', kind: m.status === 'active' ? 'danger-ghost' : '' })]
    ], d.data.map(m => Object.assign({ _muted: m.status !== 'active' }, m)), 'Aún no hay personas'), { flush: true });
  },

  equipos: c => {
    const t = teamsOf(c.org), p = peopleOf(c.org);
    const head = pageHead('Equipos', 'Los equipos definen qué ve cada coach y a quién se asignarán las campañas.');
    if (loadState(t) || loadState(p)) return head + (loadState(t) || loadState(p));
    const people = Object.fromEntries(p.data.map(m => [m.user_id, m]));
    return head + card('Nuevo equipo', '<form class="row" data-form="team-new" data-arg="' + c.org + '" style="align-items:flex-end"><div class="field" style="flex:1"><label for="tn">Nombre</label><input id="tn" name="name" class="input" maxlength="80" required></div>' + submit('Crear equipo', 'team-new') + '</form>' + formErr('team-new')) +
      '<div class="grid g2 section">' + (t.data.length ? t.data.map(team => {
        const inTeam = team.members.map(m => m.user_id);
        const candidates = p.data.filter(m => m.status === 'active' && inTeam.indexOf(m.user_id) === -1);
        return card(esc(team.name), (team.members.length ? '<ul class="list">' + team.members.map(m => {
          const who = people[m.user_id];
          return '<li>' + personCell(who ? who.p : { email: '—' }) + '<span class="spacer"></span>' + tag(m.team_role === 'coach' ? 'Coach' : 'Miembro', m.team_role === 'coach' ? 'accent' : '') + btn('Quitar', { act: 'team-remove', arg: team.id + ':' + m.user_id, size: 'sm', kind: 'ghost' }) + '</li>';
        }).join('') + '</ul>' : '<p class="muted" style="font-size:13px">Sin personas todavía.</p>') +
          (candidates.length ? '<form class="row" data-form="team-add" data-arg="' + team.id + '" style="margin-top:12px;flex-wrap:wrap"><select name="user_id" class="select" aria-label="Persona" style="flex:1;min-width:160px">' + candidates.map(m => '<option value="' + m.user_id + '">' + esc(m.p.full_name || m.p.email) + ' · ' + esc(ROLE[m.role]) + '</option>').join('') + '</select>' +
            '<select name="team_role" class="select" aria-label="Papel en el equipo"><option value="member">Miembro</option><option value="coach">Coach</option></select>' + submit('Añadir', 'team-add-' + team.id, { kind: '' }) + '</form>' + formErr('team-add-' + team.id) : ''),
          { actions: btn('Eliminar', { act: 'team-delete', arg: team.id, size: 'sm', kind: 'danger-ghost' }) });
      }).join('') : card('', empty('layers', 'Aún no hay equipos', 'Crea el primero con el formulario de arriba.'))) + '</div>';
  },

  invitaciones: c => {
    const t = teamsOf(c.org);
    const d = need('invites:' + c.org, () => q(sb.from('invitations').select('id, email, role, team_id, status, expires_at, created_at').eq('org_id', c.org).order('created_at', { ascending: false })));
    const head = pageHead('Invitaciones', 'Tú eliges el rol; la persona no puede cambiarlo.');
    const teams = t.data || [];
    const form = card('Nueva invitación', '<form class="stack" data-form="invite-new" data-arg="' + c.org + '">' + formErr('invite-new') +
      '<div class="form-grid"><div class="field"><label for="ie">Correo</label><input id="ie" name="email" type="email" class="input" value="' + val('invite-new', 'email') + '" required></div>' +
      '<div class="field"><label for="ir">Rol</label><select id="ir" name="role" class="select"><option value="agent">Agente</option><option value="coach">Supervisor / coach</option><option value="admin">Administrador de empresa</option></select></div>' +
      '<div class="field full"><label for="it">Equipo (opcional)</label><select id="it" name="team" class="select"><option value="">Sin equipo</option>' + teams.map(x => '<option value="' + x.id + '">' + esc(x.name) + '</option>').join('') + '</select></div></div>' +
      '<div>' + submit('Crear invitación', 'invite-new') + '</div></form>');
    if (loadState(d)) return head + form + linkBox() + loadState(d);
    const teamName = id => (teams.find(x => x.id === id) || {}).name || '—';
    return head + form + linkBox() + '<div class="section">' + card('Enviadas', table([
      ['Correo', i => '<b style="font-weight:500">' + esc(i.email) + '</b>'], ['Rol', i => esc(ROLE[i.role])], ['Equipo', i => esc(teamName(i.team_id))],
      ['Estado', inviteStatus], ['Caduca', i => esc(day(i.expires_at))],
      ['', i => (i.status === 'pending' && new Date(i.expires_at) > new Date() ? btn('Anular', { act: 'invite-revoke', arg: i.id, size: 'sm', kind: 'ghost' }) : '')]
    ], d.data, 'Aún no has enviado invitaciones'), { flush: true }) + '</div>';
  },

  participantes: c => {
    const me = S.session.user.id;
    const d = need('coach:' + c.org, async () => {
      const mine = await q(sb.from('team_members').select('team_id').eq('org_id', c.org).eq('user_id', me).eq('team_role', 'coach'));
      const ids = mine.map(m => m.team_id);
      if (!ids.length) return { teams: [], invites: [] };
      const [teams, tm, inv] = await Promise.all([
        q(sb.from('teams').select('id, name').in('id', ids).order('name')),
        q(sb.from('team_members').select('team_id, user_id, team_role').in('team_id', ids)),
        q(sb.from('invitations').select('id, email, team_id, status, expires_at, created_at').eq('org_id', c.org).eq('invited_by', me).order('created_at', { ascending: false }))
      ]);
      const uids = [...new Set(tm.map(m => m.user_id))];
      const prof = uids.length ? await q(sb.from('profiles').select('id, full_name, email').in('id', uids)) : [];
      const pm = Object.fromEntries(prof.map(p => [p.id, p]));
      return { teams: teams.map(t => Object.assign({ members: tm.filter(m => m.team_id === t.id).map(m => Object.assign({ p: pm[m.user_id] || { email: '—' } }, m)) }, t)), invites: inv };
    });
    const head = pageHead('Participantes', 'Las personas de los equipos que coacheas.');
    if (loadState(d)) return head + loadState(d);
    if (!d.data.teams.length) return head + card('', empty('users', 'Aún no coacheas ningún equipo', 'Un administrador de la empresa debe asignarte como coach de un equipo.'));
    return head + '<div class="grid g2">' + d.data.teams.map(t => card(esc(t.name), '<ul class="list">' + t.members.map(m => '<li>' + personCell(m.p) + '<span class="spacer"></span>' + tag(m.team_role === 'coach' ? 'Coach' : 'Miembro', m.team_role === 'coach' ? 'accent' : '') + '</li>').join('') + '</ul>', { flush: true })).join('') + '</div>' +
      '<div class="section">' + card('Invitar agentes', '<form class="stack" data-form="coach-invite" data-arg="' + c.org + '">' + formErr('coach-invite') +
        '<div class="form-grid"><div class="field"><label for="ce">Correo</label><input id="ce" name="email" type="email" class="input" required></div><div class="field"><label for="ct">Equipo</label><select id="ct" name="team" class="select">' + d.data.teams.map(t => '<option value="' + t.id + '">' + esc(t.name) + '</option>').join('') + '</select></div></div>' +
        '<p class="muted" style="font-size:12px">' + ic('lock', 12) + ' Como coach solo puedes invitar agentes a tus equipos. El servidor lo comprueba siempre.</p><div>' + submit('Crear invitación', 'coach-invite') + '</div></form>') + '</div>' +
      linkBox() + (d.data.invites.length ? '<div class="section">' + card('Tus invitaciones', table([['Correo', i => esc(i.email)], ['Estado', inviteStatus], ['Caduca', i => esc(day(i.expires_at))], ['', i => (i.status === 'pending' && new Date(i.expires_at) > new Date() ? btn('Anular', { act: 'invite-revoke', arg: i.id, size: 'sm', kind: 'ghost' }) : '')]], d.data.invites), { flush: true }) + '</div>' : '');
  },

  empresas: () => {
    const d = need('orgs', async () => {
      const [orgs, mem] = await Promise.all([q(sb.from('organizations').select('id, name, plan, status, seat_limit, created_at').order('created_at', { ascending: false })), q(sb.from('memberships').select('org_id, status'))]);
      return orgs.map(o => Object.assign({ seats: mem.filter(m => m.org_id === o.id && m.status === 'active').length }, o));
    });
    const head = pageHead('Empresas', 'Organizaciones de la plataforma. Cada una está aislada de las demás.', S.platformRole === 'superadmin' ? btn('Nueva empresa', { act: 'org-new', kind: 'primary', icon: 'plus' }) : '');
    if (loadState(d)) return head + linkBox() + loadState(d);
    return head + linkBox() + card('', table([
      ['Empresa', o => '<b>' + esc(o.name) + '</b><br><small class="muted">Alta ' + esc(day(o.created_at)) + '</small>'],
      ['Plan', o => esc(PLAN[o.plan] || o.plan)], ['Estado', o => tag(ORG_STATUS[o.status][0], ORG_STATUS[o.status][1])],
      ['Puestos', o => '<span class="num">' + o.seats + ' / ' + o.seat_limit + '</span>'],
      ['', o => (S.platformRole === 'superadmin' ? btn(o.status === 'suspended' ? 'Reactivar' : 'Suspender', { act: 'org-status', arg: o.id + ':' + (o.status === 'suspended' ? (o.plan === 'trial' ? 'trial' : 'active') : 'suspended'), size: 'sm', kind: o.status === 'suspended' ? '' : 'danger-ghost' }) : '')]
    ], d.data, 'Aún no hay empresas. Crea la primera.'), { flush: true });
  },

  auditoria: () => {
    const d = need('audit', async () => {
      const rows = await q(sb.from('audit_log').select('id, org_id, actor_id, action, detail, created_at').order('id', { ascending: false }).limit(100));
      const orgIds = [...new Set(rows.map(r => r.org_id).filter(Boolean))], actorIds = [...new Set(rows.map(r => r.actor_id).filter(Boolean))];
      const [orgs, prof] = await Promise.all([orgIds.length ? q(sb.from('organizations').select('id, name').in('id', orgIds)) : [], actorIds.length ? q(sb.from('profiles').select('id, email').in('id', actorIds)) : []]);
      const on = Object.fromEntries(orgs.map(o => [o.id, o.name])), pn = Object.fromEntries(prof.map(p => [p.id, p.email]));
      return rows.map(r => Object.assign({ orgName: on[r.org_id], who: r.actor_id ? (pn[r.actor_id] || 'Cuenta eliminada') : 'Sistema / editor SQL' }, r));
    });
    const head = pageHead('Actividad y auditoría', 'Las últimas 100 acciones. Este registro lo escribe la base de datos y no se puede editar.');
    if (loadState(d)) return head + loadState(d);
    return head + card('', table([['Cuándo', r => esc(when(r.created_at))], ['Quién', r => esc(r.who)], ['Acción', r => '<b style="font-weight:500">' + esc(ACTION[r.action] || r.action) + '</b>'], ['Empresa', r => esc(r.orgName || (r.org_id ? '—' : 'Plataforma'))], ['Detalle', r => '<small class="muted">' + esc(auditDetail(r)) + '</small>']], d.data, 'Sin actividad todavía'), { flush: true });
  },

  perfil: c => {
    const required = needsMfa();
    return pageHead('Perfil y seguridad', 'Tus datos y cómo proteges tu cuenta.') + '<div class="grid g2">' +
      card('Perfil', '<form class="stack" data-form="profile">' + formErr('profile') + '<div class="field"><label for="pn">Nombre y apellido</label><input id="pn" name="full_name" class="input" maxlength="120" value="' + esc((S.profile && S.profile.full_name) || '') + '" required></div><div class="field"><span class="lbl">Correo</span><div>' + esc(S.session.user.email) + '</div></div><div>' + submit('Guardar', 'profile') + '</div></form>') +
      card('Contraseña', '<form class="stack" data-form="password">' + formErr('password') + '<div class="field"><label for="p1">Nueva contraseña</label><input id="p1" name="password" type="password" class="input" autocomplete="new-password" minlength="10" required><span class="hint">Al menos 10 caracteres.</span></div><div class="field"><label for="p2">Repítela</label><input id="p2" name="password2" type="password" class="input" autocomplete="new-password" minlength="10" required></div><div>' + submit('Cambiar contraseña', 'password') + '</div></form>') +
      card('Verificación en dos pasos', S.factors.length
        ? '<p style="font-size:13px">' + tag('Activada', 'success') + ' Te pediremos un código de tu app al iniciar sesión.</p>' + (required ? '<p class="muted" style="font-size:12px;margin-top:8px">' + ic('lock', 12) + ' Es obligatoria para tu rol.</p>' : '<div style="margin-top:12px">' + btn('Desactivar', { act: 'mfa-off', kind: 'danger-ghost' }) + '</div>')
        : '<p style="font-size:13px">Añade un código de una app de autenticación además de tu contraseña.</p><div style="margin-top:12px">' + btn('Activar', { act: 'mfa-on', kind: 'primary', arg: c.base + 'perfil' }) + '</div>') +
      card('Privacidad', '<p style="font-size:13px">Tus resultados de formación los ven tú, los coaches de tus equipos y los administradores de tu empresa. Tus compañeros no.</p>') + '</div>';
  }
};

/* ================================================================
   Stage 3: campaigns, training sessions, history and reports
   ================================================================ */
const SRD = SR.data || { days: [] };
const SSN = SR.session;
const DIFF_ES = { easy: 'Fácil', medium: 'Intermedio', hard: 'Difícil' };
const REPLY_ES = { auto: 'Automática', fast: 'Rápida', normal: 'Normal', slow: 'Lenta' };
const RESULT = { passed: ['Aprobado', 'success'], failed: ['No aprobado', 'danger'], practice: ['Práctica', 'info'], incomplete: ['Incompleta', 'warning'] };
const VERIFY = { started: ['Sin terminar', ''], submitted: ['Pendiente de verificar', 'warning'], verified: ['Verificado', 'success'], mismatch: ['No coincide', 'danger'] };
const dayTitle = n => { const d = SRD.days.find(x => x.n === n); return 'Día ' + n + (d ? ' · ' + d.title : ''); };
const daysText = days => (days.length === 1 ? 'Día ' + days[0] : 'Días ' + days.join(', '));
const REPLY_TXT = { fast: 'respuestas rápidas', normal: 'respuestas a ritmo normal', slow: 'respuestas lentas' };
const cfgText = cfg => daysText(cfg.days) + ' · ' + DIFF_ES[cfg.difficulty] + (cfg.customers ? ' · ' + cfg.customers + ' cliente' + (cfg.customers > 1 ? 's' : '') + ' por día' : '') + (REPLY_TXT[cfg.reply] ? ' · ' + REPLY_TXT[cfg.reply] : '');
const pctOf = v => (v == null ? '—' : Math.round(v * 100) + ' %');
const b64url = obj => btoa(String.fromCharCode.apply(null, Array.from(new TextEncoder().encode(JSON.stringify(obj))))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const scoreCell = s => (s.score != null ? '<span class="num">' + s.score + ' / ' + s.max_score + '</span>' : '<span class="muted">—</span>');
const resultTag = s => (s.result && RESULT[s.result] ? tag(RESULT[s.result][0], RESULT[s.result][1]) : '');
const verifyTag = s => tag(VERIFY[s.status][0], VERIFY[s.status][1]);
const datesText = c => (c.starts_on || c.ends_on ? (c.starts_on ? day(c.starts_on) : '…') + ' → ' + (c.ends_on ? day(c.ends_on) : '…') : 'Sin fechas');

const campaignsOf = org => need('camps:' + org, async () => {
  const [camps, ct, o] = await Promise.all([
    q(sb.from('campaigns').select('id, name, goal, days, difficulty, customers, reply, status, starts_on, ends_on, created_at').eq('org_id', org).order('created_at', { ascending: false })),
    q(sb.from('campaign_teams').select('campaign_id, team_id').eq('org_id', org)),
    q(sb.from('organizations').select('practice_enabled').eq('id', org).maybeSingle())
  ]);
  return { camps: camps.map(c => Object.assign({ teams: ct.filter(x => x.campaign_id === c.id).map(x => x.team_id) }, c)), practice: !!(o && o.practice_enabled) };
});
const mySessions = org => need('mysess:' + org, () => q(sb.from('training_sessions')
  .select('id, campaign_id, config, status, final, score, max_score, result, started_at, submitted_at, verified_at')
  .eq('org_id', org).eq('user_id', S.session.user.id).order('started_at', { ascending: false }).limit(100)));

function setupState(key, camp) {
  if (!S.setup || S.setup.key !== key) {
    S.setup = camp ? { key, days: camp.days.slice(), difficulty: camp.difficulty, customers: camp.customers, reply: camp.reply }
      : { key, days: [1], difficulty: 'medium', customers: null, reply: 'auto' };
  }
  return S.setup;
}

Object.assign(PAGES, {
  campanas: c => {
    const d = campaignsOf(c.org), t = teamsOf(c.org);
    const head = pageHead('Campañas', 'Qué días entrenan tus equipos, con qué dificultad y hasta cuándo. El asistente completo llega en la etapa 5.');
    if (loadState(d) || loadState(t)) return head + (loadState(d) || loadState(t));
    const teams = t.data;
    const teamName = id => (teams.find(x => x.id === id) || {}).name || '—';
    const form = card('Nueva campaña', '<form class="stack" data-form="campaign-new" data-arg="' + c.org + '">' + formErr('campaign-new') +
      '<div class="form-grid"><div class="field"><label for="cn">Nombre</label><input id="cn" name="name" class="input" maxlength="120" required></div>' +
      '<div class="field"><label for="cg">Objetivo (opcional)</label><input id="cg" name="goal" class="input" maxlength="500"></div></div>' +
      '<div class="field"><span class="lbl">Días</span><div class="row" style="flex-wrap:wrap">' + SRD.days.map(x => '<label class="check"><input type="checkbox" name="day" value="' + x.n + '"' + (x.n === 1 ? ' checked' : '') + '> ' + esc(dayTitle(x.n)) + '</label>').join('') + '</div></div>' +
      '<div class="form-grid"><div class="field"><label for="cd">Dificultad</label><select id="cd" name="difficulty" class="select">' + Object.keys(DIFF_ES).map(k => '<option value="' + k + '"' + (k === 'medium' ? ' selected' : '') + '>' + DIFF_ES[k] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="cc">Clientes por día</label><select id="cc" name="customers" class="select"><option value="">Todos los del día</option>' + [1, 2, 3, 4].map(n => '<option value="' + n + '">' + n + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="cr">Velocidad de respuesta</label><select id="cr" name="reply" class="select">' + Object.keys(REPLY_ES).map(k => '<option value="' + k + '">' + REPLY_ES[k] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="cs">Empieza (opcional)</label><input id="cs" name="starts_on" type="date" class="input"></div><div class="field"><label for="ce2">Termina (opcional)</label><input id="ce2" name="ends_on" type="date" class="input"></div></div>' +
      '<div class="field"><span class="lbl">Equipos asignados</span>' + (teams.length ? '<div class="row" style="flex-wrap:wrap">' + teams.map(x => '<label class="check"><input type="checkbox" name="team" value="' + x.id + '"> ' + esc(x.name) + '</label>').join('') + '</div>' : '<p class="muted" style="font-size:13px">Crea antes un equipo en <a href="' + c.base + 'equipos">Equipos</a>.</p>') + '</div>' +
      '<p class="muted" style="font-size:12px">Todas las personas de la campaña ven los mismos clientes en el mismo orden. Fácil o menos clientes cuentan para completarla, pero no cambian los mejores resultados.</p>' +
      '<div>' + submit('Crear campaña', 'campaign-new') + '</div></form>');
    return head + form + '<div class="section">' + card('Campañas de la empresa', table([
      ['Campaña', x => '<b>' + esc(x.name) + '</b>' + (x.goal ? '<br><small class="muted">' + esc(x.goal) + '</small>' : '')],
      ['Estado', x => tag({ active: 'Activa', draft: 'Borrador', finished: 'Finalizada' }[x.status], { active: 'success', draft: '', finished: 'info' }[x.status])],
      ['Contenido', x => esc(cfgText(x))], ['Equipos', x => esc(x.teams.map(teamName).join(', ') || '—')], ['Fechas', x => esc(datesText(x))],
      ['', x => btn(x.status === 'active' ? 'Finalizar' : 'Reactivar', { act: 'campaign-status', arg: x.id + ':' + (x.status === 'active' ? 'finished' : 'active'), size: 'sm', kind: 'ghost' })]
    ], d.data.camps, 'Aún no hay campañas'), { flush: true }) + '</div>';
  },

  entrenamientos: c => {
    const d = campaignsOf(c.org), m = mySessions(c.org);
    const head = pageHead(c.role === 'agent' ? 'Mis entrenamientos' : 'Entrenar', c.role === 'agent' ? 'Lo que te asignó tu organización y la práctica libre.' : 'Como ' + esc(c.roleLabel.toLowerCase()) + ' puedes probar las campañas activas de la empresa y practicar.');
    if (loadState(d)) return head + loadState(d);
    const mine = m.data || [];
    const active = d.data.camps.filter(x => x.status === 'active');
    const cards = active.map(x => {
      const last = mine.find(s => s.campaign_id === x.id && s.score != null);
      return card(esc(x.name), (x.goal ? '<p class="muted" style="font-size:13px;margin-bottom:8px">' + esc(x.goal) + '</p>' : '') +
        dl([['Contenido', esc(cfgText(x))], ['Fechas', esc(datesText(x))], ['Tu último resultado', last ? scoreCell(last) + ' ' + resultTag(last) : '<span class="muted">Aún no has entrenado</span>']]),
        { actions: tag('Activa', 'success'), foot: btn('Entrenar', { href: c.base + 'sesion/' + x.id, kind: 'primary', size: 'sm', icon: 'play' }) });
    });
    if (d.data.practice) cards.push(card('Práctica libre', '<p class="muted" style="font-size:13px">Elige días, dificultad y ritmo. No cuenta para las campañas.</p>', { actions: tag('Siempre disponible', 'info'), foot: btn('Practicar', { href: c.base + 'sesion/practica', size: 'sm', icon: 'play' }) }));
    return head + (cards.length ? '<div class="grid g2">' + cards.join('') + '</div>' : card('', empty('flag', 'No tienes entrenamientos asignados', 'Cuando tu empresa te asigne una campaña aparecerá aquí.')));
  },

  sesion: c => {
    const d = campaignsOf(c.org);
    const head = pageHead('Nueva sesión', 'Se abrirá el simulador en una pestaña nueva. Al terminar cada día, tu resultado vuelve aquí.');
    if (loadState(d)) return head + loadState(d);
    const practice = c.arg === 'practica';
    const camp = practice ? null : d.data.camps.find(x => x.id === c.arg && x.status === 'active');
    if (!practice && !camp) return head + card('', empty('flag', 'Esta campaña no está disponible', 'Puede que haya terminado o que no esté asignada a tu equipo.', btn('Volver', { href: c.base + 'entrenamientos' })));
    if (practice && !d.data.practice) return head + card('', empty('lock', 'La práctica libre está desactivada', 'Tu empresa solo permite entrenar con campañas.'));
    const st = setupState(c.arg, camp);
    const allowed = camp ? camp.days : SRD.days.map(x => x.n);
    const cfg = { days: st.days, difficulty: st.difficulty, customers: st.customers ? Number(st.customers) : null, reply: st.reply };
    const v = SSN.validateConfig(cfg, { data: SRD });
    const why = v.ok ? SSN.configPractice(cfg, SRD) : [];
    const lock = camp ? ' disabled' : '';
    const lockNote = camp ? '<p class="muted" style="font-size:12px;margin-top:6px">' + ic('lock', 12) + ' Lo define la campaña.</p>' : '';
    return head + '<form class="grid g-2-1" data-form="session-start" data-arg="' + esc(c.arg) + '"><div class="stack">' +
      card('1 · Días', '<div class="stack">' + SRD.days.map(x => {
        const ok = allowed.indexOf(x.n) !== -1, on = st.days.indexOf(x.n) !== -1;
        return '<label class="choice' + (on ? ' on' : '') + '"' + (ok ? '' : ' style="opacity:.55"') + '><input type="checkbox" data-setup="day" value="' + x.n + '"' + (on ? ' checked' : '') + (ok ? '' : ' disabled') + '><span><b>' + esc(dayTitle(x.n)) + '</b><small>' + SRD.scenarios.filter(s => s.day === x.n).length + ' clientes · ' + esc((x.focus || []).slice(0, 2).join(' · ')) + '</small></span></label>';
      }).join('') + '</div>') +
      card('2 · Dificultad y ritmo', '<div class="form-grid">' +
        '<div class="field"><label for="sd">Dificultad</label><select id="sd" class="select" data-setup="difficulty"' + lock + '>' + Object.keys(DIFF_ES).map(k => '<option value="' + k + '"' + (st.difficulty === k ? ' selected' : '') + '>' + DIFF_ES[k] + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="sc">Clientes por día</label><select id="sc" class="select" data-setup="customers"' + lock + '><option value="">Todos los del día</option>' + [1, 2, 3, 4].map(n => '<option value="' + n + '"' + (Number(st.customers) === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div>' +
        '<div class="field"><label for="sr">Respuestas de los clientes</label><select id="sr" class="select" data-setup="reply"' + lock + '>' + Object.keys(REPLY_ES).map(k => '<option value="' + k + '"' + (st.reply === k ? ' selected' : '') + '>' + REPLY_ES[k] + '</option>').join('') + '</select></div></div>' + lockNote) +
      '</div>' + card('Resumen', dl([['Entrenamiento', camp ? esc(camp.name) : 'Práctica libre'], ['Contenido', v.ok ? esc(cfgText(cfg)) : '—'], ['Clientes', String(v.scenarios || 0)]]) +
        '<div class="stack" style="margin-top:14px">' + formErr('session-start') +
        (v.ok ? '' : alertBox('danger', 'Falta algo', 'Elige al menos un día.')) +
        (why.length ? alertBox('info', camp ? 'Cuenta para la campaña' : 'Cuenta como práctica', camp ? 'Con estos ajustes completa la campaña, pero no cambia tus mejores resultados.' : 'No desbloquea días ni cambia tus mejores resultados.') : '') + '</div>',
        { foot: submit('Empezar en el simulador', 'session-start', { block: true, icon: 'play', disabled: !v.ok || S.busy === 'session-start' }) }) + '</form>';
  },

  historial: c => {
    const m = mySessions(c.org), d = campaignsOf(c.org);
    const head = pageHead(c.role === 'agent' ? 'Historial' : 'Mi historial', 'Tus sesiones. Las ven tú, los coaches de tus equipos y los administradores de tu empresa.', btn('Nueva sesión', { href: c.base + 'entrenamientos', kind: 'primary', icon: 'play' }));
    const launched = S.launched ? '<div class="section" style="margin-top:0">' + alertBox('info', 'Sesión en curso: ' + S.launched.title,
      (S.launched.blocked ? 'El navegador bloqueó la pestaña nueva. <a href="' + esc(S.launched.url) + '" target="_blank" rel="noopener">Abre el simulador aquí</a>.' : 'El simulador se abrió en otra pestaña.') + ' Al terminar cada día, el resultado aparecerá aquí.') + '</div>' : '';
    if (loadState(m)) return head + launched + loadState(m);
    const camps = (d.data && d.data.camps) || [];
    const campName = id => (id ? ((camps.find(x => x.id === id) || {}).name || 'Campaña') : 'Práctica libre');
    return head + launched + card('', table([
      ['Fecha', s => esc(when(s.started_at))], ['Entrenamiento', s => '<b style="font-weight:500">' + esc(campName(s.campaign_id)) + '</b><br><small class="muted">' + esc(cfgText(s.config)) + '</small>'],
      ['Puntos', scoreCell], ['Resultado', s => resultTag(s) || '<span class="muted">—</span>'], ['Verificación', verifyTag],
      ['', s => (s.status === 'started' ? '' : btn('Ver informe', { href: c.base + 'informe/' + s.id, size: 'sm' }))]
    ], m.data.map(s => Object.assign({ _muted: s.status === 'started' }, s)), 'Aún no tienes sesiones. Empieza una desde «Entrenar».'), { flush: true });
  },

  informe: c => {
    const d = need('sess:' + c.arg, () => q(sb.from('training_sessions').select('id, user_id, campaign_id, config, status, final, client_report, server_report, verify_notes, score, max_score, result, started_at, submitted_at, verified_at').eq('id', c.arg).maybeSingle()));
    const back = btn('Volver al historial', { href: c.base + 'historial' });
    if (loadState(d)) return pageHead('Informe de la sesión', '', back) + loadState(d);
    const s = d.data;
    if (!s) return pageHead('Informe de la sesión', '', back) + card('', empty('file', 'No encontramos esta sesión', 'Puede que no tengas acceso a ella.'));
    const rep = s.server_report || s.client_report;
    const head = pageHead('Informe de la sesión', esc(cfgText(s.config)) + ' · ' + esc(when(s.started_at)), back);
    if (!rep) return head + card('', empty('clock', 'Aún no hay resultado', 'El resultado aparece al terminar el primer día en el simulador.'));
    const note = {
      verified: alertBox('success', 'Verificado por el servidor', 'El resultado se recalculó a partir de tus respuestas con el mismo motor del simulador.'),
      submitted: alertBox('warning', 'Pendiente de verificar', 'Este resultado lo calculó tu navegador. El servidor lo comprobará repitiendo la sesión con tus respuestas.'),
      mismatch: alertBox('danger', 'El resultado no coincide', 'El servidor repitió la sesión y obtuvo otro resultado. Se muestra el del servidor.'),
      started: ''
    }[s.status];
    const k = rep.kpis || {};
    const byQ = k.byQ || {};
    const total = (byQ[3] || 0) + (byQ[2] || 0) + (byQ[1] || 0) + (byQ[0] || 0);
    const kpi = (label, value, foot) => '<div class="card kpi"><div class="kpi-l">' + esc(label) + '</div><div class="kpi-v num">' + esc(value) + '</div><div class="kpi-f">' + (foot ? '<span>' + esc(foot) + '</span>' : '') + '</div></div>';
    const barRow = (label, value, max, text, cls) => '<div class="bar" role="listitem"><span class="l">' + esc(label) + '</span><span class="t"><span class="f' + (cls ? ' ' + cls : '') + '" style="width:' + (max ? Math.round(100 * value / max) : 0) + '%"></span><span class="ref" style="left:60%"></span></span><span class="v">' + esc(text) + '</span></div>';
    const list = items => (items && items.length ? '<ul class="list">' + items.map(x => '<li><span class="meta"><b>' + esc(x.title) + '</b><small>' + esc(x.detail) + '</small></span></li>').join('') + '</ul>' : '<p class="muted" style="font-size:13px;padding:12px 16px">Nada que destacar.</p>');
    return head + '<div class="stack">' + note + '</div>' +
      '<div class="section">' + '<div class="grid g4">' +
        kpi('Puntos', rep.totalScore + ' / ' + rep.maxScore, resultTagText(rep.status)) + kpi('Calidad de respuestas', pctOf(k.acc), k.replies + ' respuestas') +
        kpi('CSAT medio', k.avgCsat != null ? k.avgCsat.toFixed(1).replace('.', ',') : '—', 'sobre 5') + kpi('Códigos de cierre', pctOf(k.wrap), 'correctos') + '</div></div>' +
      '<div class="grid g2 section">' +
        card('Puntuación por día', '<div class="bars" role="list">' + (rep.perDay || []).map(x => barRow('Día ' + x.n, x.score, 100, String(x.score))).join('') + '</div><p class="legend"><span>│ Nota de aprobado: 60</span></p>') +
        card('Valoración de las respuestas', '<div class="bars" role="list">' + [[3, 'Excelente'], [2, 'Buena'], [1, 'Mejorable'], [0, 'Mala']].map(x => barRow(x[1], byQ[x[0]] || 0, total, String(byQ[x[0]] || 0), x[0] === 3 ? 'accent' : '')).join('') + '</div>') + '</div>' +
      '<div class="grid g2 section">' + card(ic('checkCircle', 16) + 'Fortalezas', list(rep.strengths), { flush: true }) + card(ic('alert', 16) + 'Áreas de mejora', list(rep.improve), { flush: true }) + '</div>' +
      ((rep.errors || []).length ? '<div class="section">' + card('Respuestas para repasar', '<ul class="list">' + rep.errors.map(e => '<li><span class="meta"><b style="font-weight:500">«' + esc(e.chosen) + '»</b><small>' + esc(e.customer) + ' · Día ' + e.day + ' · ' + esc(e.fb) + (e.best ? ' — Mejor: «' + esc(e.best) + '»' : '') + '</small></span></li>').join('') + '</ul>', { flush: true }) + '</div>' : '') +
      '<p class="muted" style="font-size:12px;margin-top:12px">Los textos de los casos y de las recomendaciones vienen del simulador, que hoy está en inglés.</p>';
  }
});
const resultTagText = status => (RESULT[status] ? RESULT[status][0] : '');

// Results the simulator leaves in this browser (same site): sent to the server, then removed
const RESULT_KEY = 'shiftready.platform.result.';
async function syncResults() {
  if (!sb || !S.session || syncResults.busy) return;
  syncResults.busy = true;
  let saved = 0;
  try {
    const keys = [];
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.indexOf(RESULT_KEY) === 0) keys.push(k); } } catch (e) { return; }
    for (const k of keys) {
      let r = null;
      try { r = JSON.parse(store.get(k)); } catch (e) { r = null; }
      if (!r || !r.sid) { store.del(k); continue; }
      const sentKey = 'shiftready.platform.sent.' + r.sid;
      if (store.get(sentKey) === String(r.at)) { if (r.final) { store.del(k); store.del(sentKey); } continue; }
      try {
        await q(sb.rpc('submit_session', { p_session: r.sid, p_log: r.days, p_report: r.report, p_final: !!r.final }));
        saved++;
        if (r.final) { store.del(k); store.del(sentKey); if (S.launched && S.launched.sid === r.sid) S.launched = null; } else store.set(sentKey, String(r.at));
        if (r.final) sb.functions.invoke('verify-session', { body: { session_id: r.sid } }).then(() => { forget('mysess:'); forget('sess:'); render(); }, () => {});
      } catch (e) {
        if (/session_closed|invalid_result/.test(e.message || '')) { store.del(k); store.del(sentKey); }   // already verified or broken: nothing to send
        // not_allowed: it belongs to another account signed in on this browser; it waits for that account
      }
    }
  } finally { syncResults.busy = false; }
  if (saved) { forget('mysess:'); forget('sess:'); toast('Resultado guardado en tu historial'); }
}
window.addEventListener('storage', e => { if (e.key && e.key.indexOf(RESULT_KEY) === 0) syncResults(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) syncResults(); });

const ACTION = {
  'organizations.insert': 'Empresa creada', 'organizations.update': 'Empresa modificada', 'organizations.delete': 'Empresa eliminada',
  'memberships.insert': 'Se unió a la empresa', 'memberships.update': 'Cambio de rol o de estado', 'memberships.delete': 'Salió de la empresa',
  'teams.insert': 'Equipo creado', 'teams.update': 'Equipo renombrado', 'teams.delete': 'Equipo eliminado',
  'team_members.insert': 'Añadido a un equipo', 'team_members.update': 'Cambio de papel en el equipo', 'team_members.delete': 'Quitado de un equipo',
  'invitations.insert': 'Invitación creada', 'invitations.update': 'Invitación actualizada', 'invitations.delete': 'Invitación eliminada',
  'platform_admins.insert': 'Rol de plataforma asignado', 'platform_admins.update': 'Rol de plataforma cambiado', 'platform_admins.delete': 'Rol de plataforma retirado'
};
// Readable values for the audit detail (ids and timestamps are left out)
const FIELD = { status: 'Estado', role: 'Rol', team_role: 'Papel', plan: 'Plan', seat_limit: 'Puestos', name: 'Nombre', timezone: 'Zona horaria', locale: 'Idioma' };
const VALUE = { pending: 'Pendiente', accepted: 'Aceptada', revoked: 'Anulada', expired: 'Caducada', active: 'Activo', disabled: 'Desactivado', suspended: 'Suspendida', trial: 'Prueba', coach: 'Coach', member: 'Miembro' };
const readable = (k, v) => (v == null ? '—' : k === 'role' ? (ROLE[v] || v) : k === 'plan' ? (PLAN[v] || v) : (VALUE[v] || String(v)));
function auditDetail(r) {
  const d = r.detail || {};
  if (r.action.endsWith('.update')) {
    return Object.keys(d).filter(k => FIELD[k]).map(k => FIELD[k] + ': ' + readable(k, d[k].from) + ' → ' + readable(k, d[k].to)).join(' · ') + (d.reason ? ' · Motivo: ' + d.reason : '');
  }
  if (d.email) return d.email + (d.role ? ' · ' + (ROLE[d.role] || d.role) : '');
  if (d.name) return d.name;
  if (d.role) return ROLE[d.role] || d.role;
  return '';
}

/* ================================================================
   Dialogs
   ================================================================ */
function dialogHtml() {
  const d = S.dialog;
  return '<div class="dialog-wrap" data-act="close-dialog"><form class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT" data-form="dialog"><div class="dialog-h"><span class="ic" style="color:var(--' + (d.danger ? 'danger' : 'primary') + ')">' + ic(d.icon || 'info', 22) + '</span><h2 id="dlgT">' + esc(d.title) + '</h2></div>' +
    '<div class="dialog-b"><div class="stack">' + formErr('dialog') + d.body + '</div></div><div class="dialog-f">' + btn('Cancelar', { act: 'close-dialog' }) + submit(d.confirm, 'dialog', { kind: d.danger ? 'danger' : 'primary' }) + '</div></form></div>';
}
function openDialog(d) { S.dialog = d; S.err.dialog = ''; render(); setTimeout(() => { const f = document.querySelector('.dialog input, .dialog select, .dialog textarea, .dialog .btn-primary, .dialog .btn-danger'); if (f) f.focus(); }, 20); }

/* ================================================================
   Actions
   ================================================================ */
async function afterSignIn() {
  await loadContext();
  S.note = null;
  route();
  syncResults();
}
async function refresh(prefix) { forget(prefix); await loadContext(); render(); }

const FORMS = {
  login: async f => {
    S.email = f.email.trim();
    const data = await q(sb.auth.signInWithPassword({ email: S.email, password: f.password }));
    S.session = data.session;
    await afterSignIn();
  },
  signup: async f => {
    if ((f.password || '').length < 10) throw new Error('weak_password');
    S.email = f.email.trim();
    const data = await q(sb.auth.signUp({ email: S.email, password: f.password, options: { data: { full_name: f.full_name.trim() }, emailRedirectTo: BASE } }));
    S.vals.signup = {};
    if (data.session) { S.session = data.session; await afterSignIn(); return; }   // only if email confirmation is off

    go('#/check-email');
  },
  recover: async f => {
    await q(sb.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: BASE }));
    setNote('recover', 'Si existe una cuenta con ese correo, recibirás un enlace para crear una contraseña nueva.', 'success');
  },
  reset: async f => {
    if (f.password !== f.password2) throw new Error('Las dos contraseñas no coinciden.');
    if (f.password.length < 10) throw new Error('weak_password');
    await q(sb.auth.updateUser({ password: f.password }));
    S.recovery = false;
    await loadContext();
    toast('Contraseña guardada');
    go(home());
  },
  accept: async (f, form) => {
    const token = form.dataset.arg;
    const org = await q(sb.rpc('accept_invitation', { p_token: token }));
    store.del(KEY.invite);
    forget();
    await loadContext();
    store.set(KEY.org, org);
    history.replaceState(null, '', BASE);           // the code leaves the address bar
    toast('Ya formas parte de la empresa');
    go(needsMfa() && !S.factors.length ? '#/mfa/setup' : '#/w/' + org + '/inicio');
  },
  mfa: async f => {
    await q(sb.auth.mfa.challengeAndVerify({ factorId: S.enroll.id, code: f.code.trim() }));
    S.enroll = null;
    await loadContext();
    toast('Verificación en dos pasos activada');
    const next = S.afterMfa; S.afterMfa = null;
    go(next || home());
  },
  'mfa-verify': async f => {
    await q(sb.auth.mfa.challengeAndVerify({ factorId: S.factors[0].id, code: f.code.trim() }));
    await loadContext();
    go(S.recovery ? '#/reset' : home());
  },
  'team-new': async (f, form) => {
    await q(sb.from('teams').insert({ org_id: form.dataset.arg, name: f.name.trim() }));
    forget('teams:'); toast('Equipo creado');
  },
  'team-add': async (f, form) => {
    const team = form.dataset.arg;
    const org = context(S.view).org;
    await q(sb.from('team_members').insert({ team_id: team, org_id: org, user_id: f.user_id, team_role: f.team_role }));
    forget('teams:'); forget('coach:'); toast('Persona añadida al equipo');
  },
  'invite-new': async (f, form) => {
    const res = await q(sb.rpc('create_invitation', { p_org: form.dataset.arg, p_email: f.email.trim(), p_role: f.role, p_team: f.team || null }));
    S.lastLink = { title: 'Invitación creada', to: f.email.trim().toLowerCase(), url: BASE + '#/invite/' + res[0].token };
    S.vals['invite-new'] = {};
    forget('invites:');
  },
  'coach-invite': async (f, form) => {
    const res = await q(sb.rpc('create_invitation', { p_org: form.dataset.arg, p_email: f.email.trim(), p_role: 'agent', p_team: f.team }));
    S.lastLink = { title: 'Invitación creada', to: f.email.trim().toLowerCase(), url: BASE + '#/invite/' + res[0].token };
    forget('coach:');
  },
  profile: async f => {
    await q(sb.from('profiles').update({ full_name: f.full_name.trim() }).eq('id', S.session.user.id));
    await loadContext(); toast('Perfil guardado');
  },
  password: async (f, form) => {
    if (f.password !== f.password2) throw new Error('Las dos contraseñas no coinciden.');
    if (f.password.length < 10) throw new Error('weak_password');
    await q(sb.auth.updateUser({ password: f.password }));
    form.reset(); toast('Contraseña cambiada');
  },
  dialog: async f => {
    await S.dialog.onSubmit(f);
    S.dialog = null;
  },
  'campaign-new': async (f, form) => {
    const fd = new FormData(form);
    const days = fd.getAll('day').map(Number);
    if (!days.length) throw new Error('Elige al menos un día.');
    const row = { org_id: form.dataset.arg, name: f.name.trim(), goal: (f.goal || '').trim(), days, difficulty: f.difficulty, customers: f.customers ? Number(f.customers) : null, reply: f.reply, starts_on: f.starts_on || null, ends_on: f.ends_on || null };
    const camp = (await q(sb.from('campaigns').insert(row).select('id')))[0];
    const teams = fd.getAll('team');
    if (teams.length) await q(sb.from('campaign_teams').insert(teams.map(t => ({ campaign_id: camp.id, team_id: t, org_id: form.dataset.arg }))));
    form.reset();
    forget('camps:'); toast('Campaña creada');
  },
  'session-start': async (f, form) => {
    // The tab is opened right away, while the click still counts as the person's (browsers block it later)
    const win = window.open('about:blank', '_blank');
    try {
      const c = context(S.view);
      const practice = form.dataset.arg === 'practica';
      const st = S.setup;
      const res = (await q(sb.rpc('start_session', { p_org: c.org, p_campaign: practice ? null : form.dataset.arg, p_days: st.days, p_difficulty: st.difficulty, p_customers: st.customers ? Number(st.customers) : null, p_reply: st.reply })))[0];
      const camp = practice ? null : ((DATA['camps:' + c.org] && DATA['camps:' + c.org].data.camps) || []).find(x => x.id === form.dataset.arg);
      const cfg = res.session_config;
      const payload = { sid: res.new_session_id, seed: Number(res.session_seed), days: cfg.days, difficulty: cfg.difficulty, customers: cfg.customers, reply: cfg.reply,
        agentName: (S.profile && S.profile.full_name) || '', title: practice ? 'Práctica libre' : (camp ? camp.name : 'Entrenamiento'), createdAt: res.session_started_at };
      const url = new URL('../index.html', location.href);
      url.search = '?launch=' + b64url(payload);
      S.launched = { sid: payload.sid, url: url.href, title: payload.title, blocked: !win };
      if (win) win.location.href = url.href;
      S.setup = null;
      forget('mysess:');
      go(c.base + 'historial');
    } catch (e) {
      if (win) win.close();
      throw e;
    }
  }
};

const ACTS = {
  theme: () => {
    S.theme = S.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', S.theme);
    store.set(KEY.theme, S.theme);
    S.menu = null; render();
  },
  menu: arg => { S.menu = S.menu === arg ? null : arg; render(); const f = document.querySelector('.menu .menu-item'); if (S.menu && f) f.focus(); },
  drawer: () => { S.drawer = !S.drawer; render(); },
  ws: arg => { store.set(KEY.org, arg); go(arg === 'platform' ? '#/platform/empresas' : '#/w/' + arg + '/inicio'); },
  signout: async () => {
    S.signingOut = true;
    await sb.auth.signOut();
    S.signingOut = false;
    S.note = null;
    Object.assign(S, { session: null, aal: null, factors: [], workspaces: [], platformRole: null, profile: null, enroll: null, recovery: false, lastLink: null, dialog: null });
    forget();
    go('#/login');
  },
  resend: async () => {
    try {
      await q(sb.auth.resend({ type: 'signup', email: S.email || (S.vals.login || {}).email, options: { emailRedirectTo: BASE } }));
      S.err.resend = ''; S.err.login = ''; setNote(S.view.name, 'Correo reenviado. Revisa también la carpeta de spam.', 'success');
    } catch (e) { S.err.resend = msg(e); S.err.login = msg(e); }
    render();
  },
  'invite-start': arg => { store.set(KEY.invite, S.view.args[0]); go('#/' + arg); },
  'drop-invite': () => { store.del(KEY.invite); history.replaceState(null, '', BASE); go(S.session ? home() : '#/login'); },
  'mfa-retry': () => { S.err.mfa = ''; S.enroll = null; render(); },
  'mfa-skip': () => { S.enroll = null; const next = S.afterMfa; S.afterMfa = null; go(next || home()); },
  'mfa-on': arg => { S.afterMfa = arg; S.enroll = null; S.err.mfa = ''; go('#/mfa/setup'); },
  'mfa-off': () => openDialog({
    title: '¿Desactivar la verificación en dos pasos?', icon: 'alert', danger: true, confirm: 'Desactivar',
    body: '<p>Tu cuenta quedará protegida solo con la contraseña.</p>',
    onSubmit: async () => { for (const f of S.factors) await q(sb.auth.mfa.unenroll({ factorId: f.id })); await loadContext(); toast('Verificación desactivada'); }
  }),
  copy: async arg => { try { await navigator.clipboard.writeText(arg); toast('Enlace copiado'); } catch (e) { toast('Selecciona el enlace y cópialo con Ctrl + C'); } },
  'close-link': () => { S.lastLink = null; render(); },
  'close-dialog': () => { S.dialog = null; render(); },
  'member-status': arg => {
    const [id, status] = arg.split(':');
    openDialog({
      title: status === 'disabled' ? '¿Desactivar a esta persona?' : '¿Reactivar a esta persona?', icon: status === 'disabled' ? 'alert' : 'checkCircle', danger: status === 'disabled', confirm: status === 'disabled' ? 'Desactivar' : 'Reactivar',
      body: '<p>' + (status === 'disabled' ? 'No podrá entrar a esta empresa. Sus datos se conservan y puedes reactivarla después.' : 'Volverá a tener acceso con su rol actual.') + ' Queda registrado en la auditoría.</p>',
      onSubmit: async () => { await q(sb.rpc('set_member_status', { p_membership: id, p_status: status })); forget('people:'); toast('Hecho'); }
    });
  },
  'team-remove': async arg => {
    const [team, user] = arg.split(':');
    try { await q(sb.from('team_members').delete().eq('team_id', team).eq('user_id', user)); forget('teams:'); toast('Quitado del equipo'); } catch (e) { toast(msg(e)); }
    render();
  },
  'team-delete': arg => openDialog({
    title: '¿Eliminar este equipo?', icon: 'alert', danger: true, confirm: 'Eliminar', body: '<p>Las personas siguen en la empresa; solo se quita el equipo.</p>',
    onSubmit: async () => { await q(sb.from('teams').delete().eq('id', arg)); forget('teams:'); toast('Equipo eliminado'); }
  }),
  'invite-revoke': async arg => {
    try { await q(sb.rpc('revoke_invitation', { p_invitation: arg })); forget('invites:'); forget('coach:'); toast('Invitación anulada'); } catch (e) { toast(msg(e)); }
    render();
  },
  'org-new': () => openDialog({
    title: 'Crear una empresa', icon: 'building', confirm: 'Crear e invitar',
    body: '<div class="field"><label for="on">Nombre de la empresa</label><input id="on" name="name" class="input" maxlength="120" required></div>' +
      '<div class="form-grid"><div class="field"><label for="op">Plan</label><select id="op" name="plan" class="select">' + Object.keys(PLAN).map(k => '<option value="' + k + '">' + PLAN[k] + '</option>').join('') + '</select></div>' +
      '<div class="field"><label for="os">Puestos</label><input id="os" name="seats" type="number" min="1" max="10000" value="25" class="input" required></div></div>' +
      '<div class="field"><label for="oa">Correo del primer administrador</label><input id="oa" name="admin" type="email" class="input" required></div><p>Se crea un espacio aislado y una invitación de administrador. Queda en la auditoría.</p>',
    onSubmit: async f => {
      const res = await q(sb.rpc('platform_create_org', { p_name: f.name.trim(), p_plan: f.plan, p_seat_limit: Number(f.seats), p_admin_email: f.admin.trim() }));
      S.lastLink = { title: 'Empresa creada: invitación del administrador', to: f.admin.trim().toLowerCase(), url: BASE + '#/invite/' + res[0].invitation_token };
      forget('orgs'); forget('audit');
    }
  }),
  'campaign-status': async arg => {
    const [id, status] = arg.split(':');
    try { await q(sb.from('campaigns').update({ status }).eq('id', id)); forget('camps:'); toast(status === 'finished' ? 'Campaña finalizada' : 'Campaña reactivada'); } catch (e) { toast(msg(e)); }
    render();
  },
  'org-status': arg => {
    const [id, status] = arg.split(':');
    openDialog({
      title: status === 'suspended' ? '¿Suspender esta empresa?' : '¿Reactivar esta empresa?', icon: 'alert', danger: status === 'suspended', confirm: status === 'suspended' ? 'Suspender' : 'Reactivar',
      body: '<p>' + (status === 'suspended' ? 'Sus usuarios no podrán entrar hasta que se reactive. Los datos se conservan.' : 'Sus usuarios recuperarán el acceso.') + '</p><div class="field"><label for="rs">Motivo (obligatorio, queda en la auditoría)</label><textarea id="rs" name="reason" class="textarea" minlength="5" required></textarea></div>',
      onSubmit: async f => { await q(sb.rpc('platform_set_org_status', { p_org: id, p_status: status, p_reason: f.reason })); forget('orgs'); forget('audit'); toast('Hecho'); }
    });
  }
};

/* ================================================================
   Events
   ================================================================ */
document.addEventListener('click', e => {
  if (e.target.closest('.skip')) { e.preventDefault(); const m = document.getElementById('main'); if (m) m.focus(); return; }
  const t = e.target.closest('[data-act]');
  if (S.menu && !e.target.closest('.menu') && !(t && t.dataset.act === 'menu')) { S.menu = null; render(); }
  if (!t) return;
  if (t.dataset.act === 'close-dialog' && t.classList.contains('dialog-wrap') && e.target !== t) return;   // click inside the dialog
  const fn = ACTS[t.dataset.act];
  if (fn) { e.preventDefault(); fn(t.dataset.arg, t); }
});

document.addEventListener('submit', async e => {
  const form = e.target.closest('form[data-form]');
  if (!form) return;
  e.preventDefault();
  let name = form.dataset.form;
  if (name === 'team-add') name = 'team-add-' + form.dataset.arg;
  const handler = FORMS[form.dataset.form];
  if (!handler || S.busy) return;
  const fields = Object.fromEntries(new FormData(form));
  S.vals[name] = Object.fromEntries(Object.entries(fields).filter(([k]) => k.indexOf('password') === -1));
  S.err[name] = ''; S.busy = name; render();
  try { await handler(fields, form); S.err[name] = ''; }
  catch (err) { S.err[name] = msg(err); }
  finally { S.busy = null; render(); }
});

document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.change === 'role') {
    try { await q(sb.rpc('set_member_role', { p_membership: el.dataset.arg, p_role: el.value })); forget('people:'); forget('teams:'); toast('Rol cambiado'); }
    catch (err) { toast(msg(err)); forget('people:'); }
    render();
  }
  if (el.dataset.setup && S.setup) {                         // session setup: days, difficulty, customers, replies
    const f = el.dataset.setup;
    if (f === 'day') { const n = Number(el.value); S.setup.days = S.setup.days.filter(x => x !== n).concat(el.checked ? [n] : []).sort((a, b) => a - b); }
    else S.setup[f] = f === 'customers' ? (el.value ? Number(el.value) : null) : el.value;
    render();
  }
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (S.dialog) { S.dialog = null; render(); return; }
  if (S.menu || S.drawer) { S.menu = null; S.drawer = false; render(); }
});

/* ================================================================
   Start
   ================================================================ */
async function boot() {
  if (!sb) { render(); return; }
  // Errors that Supabase sends back in the address (an expired or used link)
  const params = new URLSearchParams(location.search + (location.hash.indexOf('error') !== -1 ? '&' + location.hash.slice(1) : ''));
  if (params.get('error_code') || params.get('error_description')) setNote('login', ERR[params.get('error_code')] || ERR.otp_expired);
  sb.auth.onAuthStateChange((event, session) => {
    S.session = session;
    if (event === 'PASSWORD_RECOVERY') S.recovery = true;
    if (event === 'SIGNED_OUT' && S.ready && !S.signingOut) {
      setNote('login', 'Tu sesión terminó. Vuelve a entrar.');
      setTimeout(() => go('#/login'), 0);
    }
  });
  try {
    const { data } = await sb.auth.getSession();            // also finishes a sign-in link (?code=)
    S.session = data.session;
    if (S.session) await loadContext();
  } catch (e) {
    setNote('login', msg(e));
  }
  if (location.search) history.replaceState(null, '', BASE + (location.hash.indexOf('error') !== -1 ? '' : location.hash));
  // An invitation opened from its link is remembered until it is accepted
  const r = parse();
  if (r.name === 'invite' && r.args[0]) need('invite:' + r.args[0], async () => (await q(sb.rpc('get_invitation_preview', { p_token: r.args[0] })))[0] || null);
  const pending = store.get(KEY.invite);
  if (pending) need('invite:' + pending, async () => (await q(sb.rpc('get_invitation_preview', { p_token: pending })))[0] || null);
  S.ready = true;
  route();
  syncResults();
}
boot();
