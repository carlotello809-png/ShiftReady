/* ShiftReady — user interface
   Lobby (day picker) → Workspace (inbox · chat · customer panel) → Shift report */
(function () {
  'use strict';
  const SR = window.SR;
  const D = SR.data;
  const E = SR.engine;
  const icon = SR.icon;

  /* =========================================================
     Settings & progress (browser storage, optional)
     ========================================================= */
  const KEY = 'shiftready.v1';
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  const store = Object.assign({ agentName: 'Alex Morgan', coach: true, sound: true, intro: true, theme: 'light', unlockAll: false, progress: {} }, loadStore());
  if (!store.progress || typeof store.progress !== 'object') store.progress = {};
  function saveStore() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ }
  }
  E.settings = store;

  /* =========================================================
     Helpers
     ========================================================= */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function parseDate(s) { const p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function fmtDate(s, year) { const d = parseDate(s); return MONTHS[d.getMonth()] + ' ' + d.getDate() + (year ? ', ' + d.getFullYear() : ''); }
  function fmtDow(s) { const d = parseDate(s); return DOW[d.getDay()] + ', ' + MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function fmtLong(s) { const d = parseDate(s); return DOW_L[d.getDay()] + ', ' + MONTHS_L[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); }
  function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
  function simToday() { return E.st ? E.st.day.date : D.days[0].date; }
  function agoLabel(s) {
    const n = daysBetween(s, simToday());
    if (n === 0) return 'today';
    if (n === 1) return 'yesterday';
    if (n === -1) return 'tomorrow';
    if (n < 0) return 'in ' + (-n) + ' days';
    if (n < 60) return n + ' days ago';
    if (n < 365) return Math.round(n / 30.4) + ' months ago';
    const y = Math.floor(n / 365);
    return y + (y > 1 ? ' years' : ' year') + ' ago';
  }
  function sinceLabel(s) {
    const n = daysBetween(s, simToday());
    if (n < 31) return n <= 0 ? 'Joined today' : 'Joined ' + n + ' days ago';
    const months = Math.floor(n / 30.4);
    if (months < 12) return months + ' months as customer';
    const y = Math.floor(months / 12), m = months % 12;
    return y + ' yr' + (y > 1 ? 's' : '') + (m ? ' ' + m + ' mo' : '') + ' as customer';
  }
  function clockLabel(ms) {
    const total = 9 * 60 + Math.floor(ms / 60000);
    const h = Math.floor(total / 60), m = ((total % 60) + 60) % 60;
    return (((h + 11) % 12) + 1) + ':' + String(m).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
  }
  function fmtDur(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function secs(ms) {
    if (ms == null) return '—';
    const s = Math.round(ms / 1000);
    return s < 60 ? s + 's' : Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's';
  }
  const pct = v => (v == null ? '—' : Math.round(v * 100) + '%');
  function relTime(at) {
    if (!E.st) return '';
    const m = Math.floor((E.st.clock - at) / 60000);
    return m < 1 ? 'now' : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h';
  }
  function paceLabel(s) {
    if (s < 11) return 'about 10 seconds';
    if (s < 17) return 'about 15 seconds';
    if (s < 22) return 'about 20 seconds';
    return '25–30 seconds';
  }
  function paceShort(s) {
    if (s < 11) return 'Fast · ~10s';
    if (s < 17) return 'Steady · ~15s';
    if (s < 22) return 'Relaxed · ~20s';
    return 'Slow · ~30s';
  }
  function initials(name) { const p = String(name).trim().split(/\s+/); return ((p[0] || '')[0] || '').toUpperCase() + ((p[1] || '')[0] || '').toUpperCase(); }
  function hue(name) { let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360; return h; }
  function fmtText(t) { return esc(t); }

  function avatarHTML(p, size, cls) {
    const name = p.name || ((p.first || '') + ' ' + (p.last || '')).trim();
    let inner = '<span class="av-ini">' + esc(initials(name)) + '</span>';
    let kind = '';
    if (p.kind === 'bot') { inner = icon('bot', Math.round(size * 0.55)); kind = ' av-bot'; }
    if (p.kind === 'agent') kind = ' av-agent';
    const img = p.photo ? '<img src="https://randomuser.me/api/portraits/' + p.photo + '.jpg" alt="" draggable="false" onerror="this.remove()">' : '';
    return '<span class="av' + kind + (cls ? ' ' + cls : '') + '" style="--s:' + size + 'px;--h:' + hue(name) + '">' + inner + img + '</span>';
  }
  function agentAvatar(size) { return avatarHTML({ name: store.agentName, kind: 'agent' }, size); }
  function brandMark(size) {
    const s = size || 38;
    return '<img class="brand-logo" src="assets/img/logo-192.png" width="' + s + '" height="' + s + '" alt="ShiftReady" draggable="false">';
  }

  function starsHTML(n, size) {
    let h = '<span class="stars" aria-label="' + n + ' out of 5">';
    for (let i = 1; i <= 5; i++) h += '<span class="' + (i <= n ? '' : 'off') + '">' + icon('star', size || 13) + '</span>';
    return h + '</span>';
  }

  const CH = {
    web: { label: 'Web chat', icon: 'globe' },
    app: { label: 'Mobile app', icon: 'smartphone' },
    whatsapp: { label: 'WhatsApp', icon: 'whatsapp' },
    messenger: { label: 'Messenger', icon: 'messenger' }
  };
  const Q = {
    3: { label: 'Excellent', icon: 'checkCircle' },
    2: { label: 'Good', icon: 'check' },
    1: { label: 'Needs work', icon: 'alert' },
    0: { label: 'Poor', icon: 'xCircle' }
  };
  const OUTCOMES = {
    resolved: { label: 'Resolved', icon: 'checkCircle', tone: 'success' },
    unresolved: { label: 'Unresolved', icon: 'xCircle', tone: 'danger' },
    abandoned: { label: 'Customer left', icon: 'logout', tone: 'danger' }
  };
  const DISP = {};
  D.dispositions.forEach(d => { DISP[d.id] = d; });

  function moodOf(p) {
    if (p >= 70) return { k: 'calm', label: 'Calm', icon: 'smile' };
    if (p >= 45) return { k: 'impatient', label: 'Impatient', icon: 'meh' };
    if (p >= 20) return { k: 'frustrated', label: 'Frustrated', icon: 'frown' };
    return { k: 'angry', label: 'Angry', icon: 'angry' };
  }

  function isUnlocked(n) {
    if (store.unlockAll || n === 1) return true;
    const prev = store.progress[n - 1];
    return !!(prev && prev.passed);
  }
  function firstAvailableDay() {
    for (let i = D.days.length; i >= 1; i--) {
      if (isUnlocked(i) && !(store.progress[i] && store.progress[i].passed)) return i;
    }
    return 1;
  }

  /* =========================================================
     UI state
     ========================================================= */
  const ui = {
    view: 'lobby', day: firstAvailableDay(), active: null,
    sort: 'newest', search: '', closedOpen: false,
    collapsed: {}, polOpen: {}, wrapSel: {},
    kb: false, kbQuery: '', modal: null, detailsOpen: false
  };
  const app = document.getElementById('app');
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'overlay';
  document.body.appendChild(overlay);
  const toastHost = document.createElement('div');
  toastHost.className = 'toasts';
  document.body.appendChild(toastHost);

  /* =========================================================
     LOBBY
     ========================================================= */
  function renderLobby() {
    ui.view = 'lobby';
    clearToasts();
    ui.kb = false;
    document.title = 'ShiftReady · Support Chat Simulator';
    if (!isUnlocked(ui.day)) ui.day = firstAvailableDay();
    stopHowto(true);

    app.innerHTML =
      '<div class="lobby">' +
        '<main class="lb-main">' +
          '<section class="lb-hero">' +
            themeButton('lb-theme') +
            '<div class="lb-brand">' +
              '<img class="lb-logo" src="assets/img/logo-768.png" alt="ShiftReady" draggable="false">' +
              '<span class="howto-wrap"><button class="howto-btn" data-act="howto" aria-pressed="false" aria-label="How to start"><span class="howto-t">Press!</span></button></span>' +
            '</div>' +
            '<div class="howto-cap" aria-live="polite"></div>' +
          '</section>' +
          '<section class="lb-grid">' +
            '<div>' +
              '<div class="sec-h"><h2>Training schedule</h2><span>Week of November 2, 2026</span></div>' +
              '<div class="day-list" id="dayList">' + D.days.map(dayCard).join('') + '</div>' +
            '</div>' +
            '<aside id="brief">' + briefHTML(ui.day) + '</aside>' +
          '</section>' +
          '<section class="how">' +
            howStep(1, 'Read the customer', 'Check the message, the order details and the relevant policy in the customer file.') +
            howStep(2, 'Choose the best reply', 'Tap or click an answer and send it (on a keyboard: 1–4, then Enter). Some replies sound right but contain the wrong facts.') +
            howStep(3, 'Keep everyone happy', 'Customers lose patience while they wait on you. Juggle your chats and wrap up each one with the right code.') +
          '</section>' +
          '<footer class="lb-foot"><span>Progress is saved in this browser.</span>' +
            '<button class="link-quiet" data-act="replay-boot">Replay welcome</button>' +
            (store.unlockAll ? '' : '<button class="link-quiet" data-act="unlock-all">Unlock all days</button>') +
            '<button class="link-quiet" data-act="reset-progress">Reset progress</button></footer>' +
        '</main>' +
      '</div>';
    // While the welcome screen is up, the lobby sits blurred underneath it; otherwise it rises in
    const root = $('.lobby');
    if (!(SR.boot && !SR.boot.done)) root.classList.add('lb-enter');
    endTour();
    updateRotate();
  }

  function themeButton(cls) {
    const dark = store.theme === 'dark';
    return '<button class="icon-btn theme-btn' + (cls ? ' ' + cls : '') + '" data-act="theme" title="' + (dark ? 'Light mode' : 'Dark mode') + '" aria-label="' + (dark ? 'Switch to light mode' : 'Switch to dark mode') + '">' + icon(dark ? 'sun' : 'moon', 18) + '</button>';
  }
  function applyTheme() {
    const dark = store.theme === 'dark';
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0a111a' : '#0f2438');
    $$('.theme-btn').forEach(b => {
      b.innerHTML = icon(dark ? 'sun' : 'moon', 18);
      b.title = dark ? 'Light mode' : 'Dark mode';
    });
    $$('input[data-setting="dark"]').forEach(i => { i.checked = dark; });
  }

  function howStep(n, title, text) {
    return '<div class="how-i"><span class="how-n">' + n + '</span><div><b>' + esc(title) + '</b><p>' + esc(text) + '</p></div></div>';
  }

  function dayCard(d) {
    const p = store.progress[d.n];
    const open = isUnlocked(d.n);
    const count = D.scenarios.filter(s => s.day === d.n).length;
    let right;
    if (!open) right = '<span class="dc-lock">' + icon('lock', 16) + '</span>';
    else if (p) right = '<span class="dc-done">' + bigStarsSmall(p.stars) + '<span>Best ' + p.best + '</span></span>';
    else right = '<span class="dc-new">New</span>';
    return '<button class="day-card' + (ui.day === d.n ? ' on' : '') + (open ? '' : ' locked') + '" data-act="pick-day" data-day="' + d.n + '"' + (open ? '' : ' aria-disabled="true" title="Pass the previous day to unlock"') + '>' +
      '<span class="dc-num"><small>Day</small>' + d.n + '</span>' +
      '<span class="dc-body"><span class="dc-title">' + esc(d.title) + '</span>' +
      '<span class="dc-meta">' + fmtDow(d.date) + ' · ' + count + ' customers · <span class="lvl lvl-' + d.level.toLowerCase() + '">' + d.level + '</span></span></span>' +
      right + '</button>';
  }
  function bigStarsSmall(n) {
    let h = '<span class="stars">';
    for (let i = 1; i <= 3; i++) h += '<span class="' + (i <= n ? '' : 'off') + '">' + icon('star', 15) + '</span>';
    return h + '</span>';
  }

  function briefHTML(n) {
    const d = D.days.find(x => x.n === n);
    const scs = D.scenarios.filter(s => s.day === n).sort((a, b) => a.arrive - b.arrive);
    const p = store.progress[n];
    return '<div class="brief-card">' +
      '<div class="brief-top"><span class="lvl lvl-' + d.level.toLowerCase() + '">' + d.level + '</span><span>' + fmtLong(d.date) + ' · 9:00 AM</span></div>' +
      '<h2>Day ' + n + ' · ' + esc(d.title) + '</h2>' +
      '<p class="brief-sum">' + esc(d.summary) + '</p>' +
      '<div class="brief-kpis">' +
        '<div><b>' + scs.length + '</b><span>Customers</span></div>' +
        '<div><b>' + esc(d.patience) + '</b><span>Patience</span></div>' +
        '<div><b>' + (p ? p.best : '—') + '</b><span>Best score</span></div>' +
      '</div>' +
      '<div class="brief-faces">' + scs.map(s => avatarHTML(s.customer, 30)).join('') + '<span>' + scs.length + ' customers in your queue</span></div>' +
      '<h4>Today’s focus</h4>' +
      '<ul class="checks">' + d.focus.map(f => '<li>' + icon('check', 15) + '<span>' + esc(f) + '</span></li>').join('') + '</ul>' +
      '<div class="tip">' + icon('sparkle', 15) + '<p><b>Coach tip.</b> ' + esc(d.tip) + '</p></div>' +
      '<div class="brief-settings">' +
        '<label class="field"><span>Your agent name</span><input id="agentName" value="' + esc(store.agentName) + '" maxlength="28" autocomplete="off" spellcheck="false"></label>' +
        '<div class="toggles">' +
          toggleHTML('coach', 'Coach notes', 'Feedback after each reply', store.coach) +
          toggleHTML('sound', 'Sound', 'Button sounds, alerts and the welcome voice', store.sound) +
          toggleHTML('dark', 'Dark mode', 'Easier on the eyes', store.theme === 'dark') +
          toggleHTML('intro', 'Welcome screen', 'Show it when the app opens', store.intro !== false) +
        '</div>' +
      '</div>' +
      '<button class="btn btn-primary btn-lg btn-block" data-act="start" data-day="' + n + '">Start shift ' + icon('arrowRight', 17) + '</button>' +
    '</div>';
  }

  function toggleHTML(key, label, sub, on) {
    return '<label class="tgl"><input type="checkbox" data-setting="' + key + '"' + (on ? ' checked' : '') + '><span class="tgl-ui"></span>' +
      '<span class="tgl-t"><b>' + esc(label) + '</b><small>' + esc(sub) + '</small></span></label>';
  }

  /* =========================================================
     WORKSPACE
     ========================================================= */
  const listEls = new Map();
  let emptyEl = null, closedHeadEl = null;

  function startShift(n) {
    unlockAudio();
    stopHowto(true);
    closeModal(true);
    ui.view = 'shift';
    ui.day = n;
    ui.active = null;
    ui.search = '';
    ui.closedOpen = false;
    ui.wrapSel = {};
    ui.kb = false;
    ui.detailsOpen = false;
    ui.mview = 'list';
    listEls.clear();
    emptyEl = null;
    closedHeadEl = null;
    E.startDay(n);
    renderWorkspace();
    updateRotate();
    if (n === 1) startTourWhenReady();   // Day 1: a short tour of the workspace
  }

  function renderWorkspace() {
    const d = E.st.day;
    app.innerHTML =
      '<div class="app mv-list" id="appShell">' +
        '<nav class="rail">' +
          '<div class="rail-logo">' + brandMark(36) + '</div>' +
          '<button class="rail-btn on" data-tip="Inbox" aria-label="Inbox">' + icon('inbox', 20) + '</button>' +
          '<button class="rail-btn" data-act="kb" data-tip="Knowledge base" aria-label="Knowledge base">' + icon('book', 20) + '</button>' +
          '<button class="rail-btn" data-act="shortcuts" data-tip="Keyboard shortcuts" aria-label="Keyboard shortcuts">' + icon('keyboard', 20) + '</button>' +
          '<div class="rail-sp"></div>' +
          '<button class="rail-btn" data-act="settings" data-tip="Settings" aria-label="Settings">' + icon('sliders', 20) + '</button>' +
          '<button class="rail-btn" data-act="exit" data-tip="End shift" aria-label="End shift">' + icon('logout', 20) + '</button>' +
        '</nav>' +
        '<div class="main">' +
          '<header class="topbar">' +
            '<div class="tb-title"><h1>Team Inbox</h1><span class="day-chip" title="' + esc(d.title) + '">Day ' + d.n + '<span class="dct"> · ' + esc(d.title) + '</span></span></div>' +
            '<div class="tb-stats" id="tbStats"></div>' +
            '<div class="tb-right">' +
              '<label class="search">' + icon('search', 15) + '<input id="search" placeholder="Search name, topic or order…" autocomplete="off" spellcheck="false"></label>' +
              '<div class="tb-clock" title="Shift clock">' + icon('clock', 15) + '<span id="clock">9:00 AM</span></div>' +
              themeButton() +
              '<button class="icon-btn" data-act="sound" id="soundBtn" title="Sounds on/off">' + icon(store.sound ? 'volume' : 'mute', 18) + '</button>' +
              '<button class="btn btn-sm tb-pause" data-act="pause" aria-label="Pause">' + icon('pause', 13) + '<span>Pause</span></button>' +
              '<div class="me">' + agentAvatar(32) + '<span class="me-dot"></span><div class="me-t"><b>' + esc(store.agentName) + '</b><span>Available</span></div></div>' +
            '</div>' +
          '</header>' +
          '<div class="workspace" id="workspace">' +
            '<section class="inbox">' +
              '<div class="inbox-h"><div class="inbox-title">' + icon('inbox', 16) + '<b>Assigned to me</b><span class="count" id="assignedCount">0</span></div>' +
              '<button class="icon-btn sm" data-act="sort" title="Change sort order">' + icon('sort', 15) + '</button></div>' +
              '<label class="search inbox-search">' + icon('search', 15) + '<input id="search2" placeholder="Search chats" autocomplete="off" spellcheck="false"></label>' +
              '<div class="inbox-sort" id="sortLabel"></div>' +
              '<div class="conv-list" id="convList"></div>' +
            '</section>' +
            '<section class="chat" id="chat"></section>' +
            '<div class="dp-scrim" data-act="toggle-details"></div>' +
            '<aside class="details" id="details"></aside>' +
          '</div>' +
          '<nav class="mnav" aria-label="Main">' +
            '<button class="mnav-btn on" data-act="m-chats">' + icon('chat', 20) + '<span>Chats</span><i class="mnav-badge" id="mnavBadge"></i></button>' +
            '<button class="mnav-btn" data-act="kb">' + icon('book', 20) + '<span>Policies</span></button>' +
            '<button class="mnav-btn" data-act="settings">' + icon('sliders', 20) + '<span>Settings</span></button>' +
            '<button class="mnav-btn" data-act="exit">' + icon('logout', 20) + '<span>End shift</span></button>' +
          '</nav>' +
        '</div>' +
        '<div class="scrim" id="kbScrim" data-act="kb-close"></div>' +
        '<div class="drawer" id="kb" aria-hidden="true"></div>' +
      '</div>';
    renderSortLabel();
    renderStats();
    renderList();
    renderChat();
    renderDetails();
    updateTitle();
  }

  function renderSortLabel() {
    const el = $('#sortLabel');
    if (el) el.innerHTML = icon('sort', 12) + ' Sorted by <b>' + (ui.sort === 'newest' ? 'Newest conversations' : 'Waiting longest') + '</b>';
  }

  function renderStats() {
    const host = $('#tbStats');
    if (!host) return;
    const s = E.liveStats();
    if (!s) return;
    const html =
      '<div class="tb-stat"><span>Open</span><b>' + s.open + '</b></div>' +
      '<div class="tb-stat' + (s.waiting ? ' hot' : '') + '" title="Customers waiting for your reply"><span>Waiting</span><b>' + s.waiting + '</b></div>' +
      '<div class="tb-stat"><span>Closed</span><b>' + s.closed + '/' + s.total + '</b></div>' +
      '<div class="tb-stat"><span>Avg CSAT</span><b>' + (s.csat == null ? '—' : s.csat.toFixed(1)) + '</b></div>';
    if (host._html !== html) { host.innerHTML = html; host._html = html; }
  }

  /* ---------- conversation list ---------- */
  function orderIdsOf(c) {
    const out = [];
    (c.sc.sections || []).forEach(s => { const m = /LM-\d+/.exec(s.title); if (m) out.push(m[0]); });
    return out.join(' ');
  }
  function lastVisible(c) {
    for (let i = c.messages.length - 1; i >= 0; i--) {
      const m = c.messages[i];
      if (m.from === 'customer' || m.from === 'agent' || m.from === 'bot') return m;
    }
    return null;
  }
  function previewText(m) {
    if (m.attach) return '📎 ' + m.attach.name + (m.text ? ' · ' + m.text : '');
    return m.text;
  }

  function renderList() {
    const host = $('#convList');
    if (!host || !E.st) return;
    const st = E.st;
    const q = ui.search.trim().toLowerCase();
    const arrived = st.convs.filter(c => c.arrived);
    const match = c => !q || (c.sc.customer.first + ' ' + c.sc.customer.last + ' ' + c.sc.topic + ' ' + orderIdsOf(c)).toLowerCase().indexOf(q) !== -1;
    const open = arrived.filter(c => c.status !== 'closed' && match(c));
    const closed = arrived.filter(c => c.status === 'closed' && match(c));
    if (ui.sort === 'newest') open.sort((a, b) => b.arrivedAt - a.arrivedAt);
    else {
      const rank = c => (c.status === 'agent' ? 0 : c.status === 'ended' ? 1 : 2);
      open.sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.turnStart - b.turnStart : b.arrivedAt - a.arrivedAt));
    }
    closed.sort((a, b) => b.closedAt - a.closedAt);
    const cnt = $('#assignedCount');
    if (cnt) cnt.textContent = arrived.filter(c => c.status !== 'closed').length;

    const seq = [];
    if (!arrived.length) seq.push(emptyNode('<span class="le-ic">' + icon('inbox', 20) + '</span><b><span class="pulse-dot"></span>You’re online</b>Waiting for the first customer…'));
    else if (!open.length && !closed.length) seq.push(emptyNode('<span class="le-ic">' + icon('search', 20) + '</span><b>No matches</b>Nothing matches “' + esc(ui.search) + '”.'));
    else if (!open.length && !q) seq.push(emptyNode('<span class="le-ic">' + icon('checkCircle', 20) + '</span><b>Inbox zero</b>No open conversations right now.'));
    open.forEach(c => seq.push(itemNode(c)));
    if (closed.length) {
      seq.push(closedHead(closed.length));
      if (ui.closedOpen || q) closed.forEach(c => seq.push(itemNode(c)));
    }
    seq.forEach((el, i) => { if (host.children[i] !== el) host.insertBefore(el, host.children[i] || null); });
    while (host.children.length > seq.length) host.removeChild(host.lastChild);
  }

  function emptyNode(html) {
    if (!emptyEl) { emptyEl = document.createElement('div'); emptyEl.className = 'list-empty'; }
    if (emptyEl._html !== html) { emptyEl.innerHTML = html; emptyEl._html = html; }
    return emptyEl;
  }
  function closedHead(n) {
    if (!closedHeadEl) {
      closedHeadEl = document.createElement('button');
      closedHeadEl.dataset.act = 'toggle-closed';
    }
    closedHeadEl.className = 'list-sec' + (ui.closedOpen || ui.search ? '' : ' collapsed');
    const html = '<span>Closed · ' + n + '</span>' + icon('chevDown', 15);
    if (closedHeadEl._html !== html) { closedHeadEl.innerHTML = html; closedHeadEl._html = html; }
    return closedHeadEl;
  }

  function itemNode(c) {
    let el = listEls.get(c.id);
    if (!el) {
      el = document.createElement('div');
      el.dataset.id = c.id;
      el.setAttribute('role', 'button');
      el.tabIndex = 0;
      el.innerHTML = '<div class="ci-av"><svg class="ring" viewBox="0 0 44 44" aria-hidden="true"><circle class="ring-bg" cx="22" cy="22" r="20.6" pathLength="100"/><circle class="ring-fg" cx="22" cy="22" r="20.6" pathLength="100"/></svg>' +
        avatarHTML(c.sc.customer, 36) + '<span class="ci-ch ch-' + c.sc.channel + '">' + icon(CH[c.sc.channel].icon, 11) + '</span></div><div class="ci-body"></div>';
      el._body = el.querySelector('.ci-body');
      el._ring = el.querySelector('.ring-fg');
      // A new chat slides into the inbox with a short highlight
      el._enter = true;
      el.addEventListener('animationend', ev => {
        if (ev.target === el && ev.animationName === 'ciFlash') { el._enter = false; el.classList.remove('ci-enter'); }
      });
      listEls.set(c.id, el);
    }
    const cls = 'ci st-' + c.status + (ui.active === c.id ? ' active' : '') + (c.unread ? ' unread' : '') + (el._enter ? ' ci-enter' : '');
    if (el.className !== cls) el.className = cls;
    const html = itemBody(c);
    if (el._html !== html) { el._body.innerHTML = html; el._html = html; }
    updateRing(el, c);
    return el;
  }

  function itemBody(c) {
    const cu = c.sc.customer;
    const last = lastVisible(c);
    let prev;
    if (c.typing) prev = '<span class="typing-txt">typing…</span>';
    else if (!last) prev = '<span class="muted">New conversation</span>';
    else prev = (last.from === 'agent' && !last.name ? '<span class="you">You: </span>' : '') + esc(previewText(last));
    let chip = '';
    if (c.status === 'agent') chip = '<span class="wait-chip">' + icon('clock', 11) + '<span data-wait>' + fmtDur(E.st.clock - c.turnStart) + '</span></span>';
    else if (c.status === 'ended') chip = '<span class="chip chip-amber">' + icon('file', 11) + 'Wrap-up</span>';
    else if (c.status === 'closed') chip = c.outcome === 'resolved' ? '<span class="chip chip-ok">' + icon('check', 11) + 'Resolved</span>' : '<span class="chip chip-bad">' + icon('x', 11) + OUTCOMES[c.outcome].label + '</span>';
    const badge = c.unread ? '<span class="badge">' + c.unread + '</span>' : '';
    return '<div class="ci-top"><span class="ci-name">' + esc(cu.first + ' ' + cu.last) + '</span><span class="ci-time">' + relTime(c.lastAt) + '</span></div>' +
      '<div class="ci-prev">' + prev + '</div>' +
      '<div class="ci-meta"><span class="ci-topic">' + icon('tag', 12) + esc(c.sc.topic) + '</span><span class="sp"></span>' + chip + badge + '</div>';
  }

  function updateRing(el, c) {
    const live = c.status !== 'closed' && c.status !== 'ended';
    const p = Math.max(0, Math.min(100, c.patience));
    const off = live ? String(Math.round((100 - p) * 10) / 10) : '100';
    if (el._ring.style.strokeDashoffset !== off) el._ring.style.strokeDashoffset = off;
    const mood = live ? moodOf(p).k : 'none';
    if (el.dataset.mood !== mood) el.dataset.mood = mood;
  }

  const phoneQuery = window.matchMedia('(max-width: 760px)');
  const isPhone = () => phoneQuery.matches;
  function setMobileView(v) {
    ui.mview = v;
    const shell = $('#appShell');
    if (shell) { shell.classList.toggle('mv-list', v === 'list'); shell.classList.toggle('mv-chat', v === 'chat'); }
    if (v === 'list' && ui.detailsOpen) toggleDetails(false);
    if (v === 'chat') scrollBottom(true);
  }
  function toggleDetails(force) {
    ui.detailsOpen = force != null ? force : !ui.detailsOpen;
    const ws = $('#workspace');
    if (ws) ws.classList.toggle('details-open', ui.detailsOpen);
  }

  function select(id, fromUser) {
    if (!E.st) return;
    const c = E.get(id);
    if (!c) return;
    if (fromUser) setMobileView('chat');
    if (ui.active === id) return;
    const had = !!ui.active;
    closeDoc();
    ui.active = id;
    E.activeId = id;
    c.unread = 0;
    renderList();
    renderChat(had);
    renderDetails(had);
    updateTitle();
  }

  function activeConv() { return ui.active && E.st ? E.get(ui.active) : null; }

  /* ---------- chat ---------- */
  function renderChat(swap) {
    const host = $('#chat');
    if (!host) return;
    const c = activeConv();
    if (!c) {
      host.className = 'chat empty';
      const anyArrived = E.st && E.st.convs.some(x => x.arrived);
      host.innerHTML = '<div class="chat-empty"><div class="ce-ill">' + icon(anyArrived ? 'chat' : 'headset', 28) + '</div>' +
        '<h3>' + (anyArrived ? 'Select a conversation' : 'Your shift has started') + '</h3>' +
        '<p>' + (anyArrived ? 'Pick a customer from the inbox on the left to view the chat and their details.' : 'Customers will start arriving in a moment. Each chat appears in your inbox on the left.') + '</p>' +
        '<div class="ce-keys"><span><kbd>1</kbd>–<kbd>4</kbd> choose reply</span><span><kbd>Enter</kbd> send</span><span><kbd>Alt</kbd>+<kbd>↓</kbd> next chat</span></div></div>';
      return;
    }
    host.className = 'chat';
    host.innerHTML = '<header class="chat-h" id="chatHead"></header>' +
      '<div class="msgs" id="msgs"><div id="msgsIn"></div><div class="typing-row" id="typingRow"></div></div>' +
      '<div class="composer" id="composer"></div>';
    renderHeader(c);
    renderMessages(c);
    renderTyping(c);
    renderComposer(c, false);
    scrollBottom(true);
    if (swap) $('#msgs').classList.add('swap');
  }

  function renderHeader(c) {
    const h = $('#chatHead');
    if (!h) return;
    const sc = c.sc, cu = sc.customer, ch = CH[sc.channel];
    h.innerHTML =
      '<div class="chh-l"><button class="icon-btn chh-back" data-act="m-back" aria-label="Back to chats">' + icon('arrowLeft', 20) + '</button>' + avatarHTML(cu, 40) + '<div class="chh-t">' +
        '<div class="chh-name">' + esc(cu.first + ' ' + cu.last) + '<span class="prio prio-' + sc.priority.toLowerCase() + '">' + icon('flag', 11) + sc.priority + '</span></div>' +
        '<div class="chh-sub"><span class="chh-topic">' + esc(sc.topic) + '</span><span class="dot-sep"></span>' +
        '<span class="ch ch-' + sc.channel + '">' + icon(ch.icon, 12) + '</span><span>via ' + ch.label + '</span><span class="dot-sep"></span><span>#' + c.ticket + '</span></div>' +
        '<div class="chh-status" id="chhStatus"></div>' +
      '</div></div>' +
      '<div class="chh-r">' +
        '<div class="mood" id="mood" title="Customer patience — it drops while they wait on you"><div class="mood-top"><span class="mood-ic"></span><span>Customer mood</span><b class="mood-v"></b></div><div class="meter"><i></i></div></div>' +
        '<button class="icon-btn details-toggle" data-act="toggle-details" title="Customer details">' + icon('panel', 18) + '</button>' +
      '</div>';
    updateHeaderLive(c);
  }

  function updateHeaderLive(c) {
    const m = $('#mood');
    if (!m) return;
    const live = c.status !== 'ended' && c.status !== 'closed';
    const p = Math.max(0, Math.round(c.patience));
    const md = moodOf(p);
    const key = live ? md.k : 'none';
    if (m.dataset.mood !== key) {
      m.dataset.mood = key;
      $('.mood-ic', m).innerHTML = icon(live ? md.icon : 'meh', 15);
      $('.mood-v', m).textContent = live ? md.label : (c.outcome === 'abandoned' ? 'Left' : 'Done');
    }
    const w = (live ? p : 0) + '%';
    const bar = $('.meter i', m);
    if (bar.style.width !== w) bar.style.width = w;
    const stl = $('#chhStatus');
    if (stl) {
      let t;
      if (c.status === 'agent') t = 'Waiting · ' + fmtDur(E.st.clock - c.turnStart);
      else if (c.status === 'customer') t = c.typing ? 'typing…' : 'online';
      else if (c.status === 'ended') t = 'Chat ended · wrap-up';
      else t = 'Closed';
      if (stl.textContent !== t) stl.textContent = t;
      const k = c.status === 'agent' ? md.k : c.typing ? 'typing' : '';
      if (stl.dataset.k !== k) stl.dataset.k = k;
    }
    const cw = $('#custWait');
    if (cw && c.status === 'customer' && c.lastSentAt != null) {
      const v = fmtDur(E.st.clock - c.lastSentAt) + ' ago';
      if (cw.textContent !== v) cw.textContent = v;
    }
    const tm = $('#cmpTimer');
    if (tm && c.status === 'agent') {
      const v = fmtDur(E.st.clock - c.turnStart);
      if (tm._v !== v) { tm.lastChild.textContent = v; tm._v = v; }
      const mk = 'cmp-timer t-' + md.k;
      if (tm.className !== mk) tm.className = mk;
    }
  }

  function prevBubble(c, uptoIndex) {
    for (let i = uptoIndex - 1; i >= 0; i--) {
      const m = c.messages[i];
      if (m.from !== 'coach') return m;
    }
    return null;
  }

  function renderMessages(c) {
    const host = $('#msgsIn');
    if (!host) return;
    let html = '';
    c.messages.forEach((m, i) => { html += msgHTML(c, m, prevBubble(c, i)); });
    host.innerHTML = html;
  }

  function msgHTML(c, m, prev) {
    if (m.from === 'coach') {
      if (!store.coach || !m.text) return '';
      const ql = Q[m.q];
      return '<div class="coach q' + m.q + '"><div class="coach-in"><span class="coach-tag">' + icon(ql.icon, 12) + ql.label + '</span><span class="coach-t">' + esc(m.text) + '</span></div></div>';
    }
    if (m.from === 'system') return systemHTML(c, m);
    const side = m.from === 'customer' ? 'left' : 'right';
    const start = !prev || prev.from !== m.from || prev.name !== m.name || (m.at - prev.at) > 120000 || prev.from === 'system';
    let who, av;
    if (m.from === 'customer') { who = c.sc.customer.first + ' ' + c.sc.customer.last; av = avatarHTML(c.sc.customer, 30); }
    else if (m.from === 'bot') { who = D.company.bot + ' · Virtual assistant'; av = avatarHTML({ name: 'Lumi', kind: 'bot' }, 30); }
    else if (m.name) { who = m.name; av = avatarHTML({ name: m.name }, 30); }
    else { who = store.agentName + ' (You)'; av = agentAvatar(30); }
    let body = '';
    if (m.attach) body += attachHTML(m.attach);
    if (m.text) body += '<div class="bubble">' + fmtText(m.text) + '</div>';
    const meta = start ? '<div class="m-meta"><b>' + esc(who) + '</b><span>' + clockLabel(m.at) + '</span>' +
      (m.from === 'agent' && !m.name ? '<span class="m-read" title="Seen">' + icon('checks', 14) + '</span>' : '') + '</div>' : '';
    const cls = m.from === 'agent' ? 'm-agent' : m.from === 'bot' ? 'm-bot' : 'm-customer';
    return '<div class="m m-' + side + ' ' + cls + (start ? ' g-start' : '') + '"><div class="m-av">' + (start ? av : '') + '</div><div class="m-col">' + meta + body + '</div></div>';
  }

  function attachHTML(a) {
    return '<div class="attach"><div class="attach-img">' + icon('image', 34) + '<span>' + esc(a.desc || 'Photo') + '</span></div>' +
      '<div class="attach-f">' + icon('paperclip', 13) + '<span>' + esc(a.name) + '</span><small>' + esc(a.size || '') + '</small></div></div>';
  }

  function systemHTML(c, m) {
    if (m.kind === 'ended') {
      const oc = OUTCOMES[m.outcome] || OUTCOMES.resolved;
      return '<div class="sys-card"><div class="sc-row"><span class="sc-ic oc-' + m.outcome + '">' + icon(oc.icon, 16) + '</span>' +
        '<div><b>Chat ended · ' + oc.label + '</b><span>' + clockLabel(m.at) + ' · Satisfaction survey received</span></div>' +
        '<div class="sc-csat"><span>CSAT</span>' + starsHTML(m.csat, 14) + '</div></div></div>';
    }
    if (m.kind === 'closed') {
      const d = DISP[m.code];
      let h = '<div class="sys"><span>' + icon('checkCircle', 13) + ' Closed with code <b>' + esc(d ? d.label : m.code) + '</b> · ' + clockLabel(m.at) + '</span></div>';
      if (store.coach) {
        const exp = c.correctDisp.map(id => DISP[id].label).join(' or ');
        h += m.ok
          ? '<div class="coach q3" style="justify-content:center;padding-right:0"><div class="coach-in"><span class="coach-tag">' + icon('checkCircle', 12) + 'Wrap-up</span><span class="coach-t">Correct resolution code.</span></div></div>'
          : '<div class="coach q0" style="justify-content:center;padding-right:0"><div class="coach-in"><span class="coach-tag">' + icon('xCircle', 12) + 'Wrap-up</span><span class="coach-t">Expected: ' + esc(exp) + '.</span></div></div>';
      }
      return h;
    }
    const ic = m.kind === 'left' ? 'logout' : m.kind === 'agent-ended' ? 'xCircle' : /transferred/i.test(m.text) ? 'users' : 'info';
    return '<div class="sys"><span>' + icon(ic, 13) + ' ' + esc(m.text) + ' · ' + clockLabel(m.at) + '</span></div>';
  }

  function appendMessage(c, m) {
    const host = $('#msgsIn');
    if (!host) return;
    const idx = c.messages.indexOf(m);
    const html = msgHTML(c, m, prevBubble(c, idx));
    if (!html) return;
    const box = $('#msgs');
    const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    Array.prototype.slice.call(tmp.children).forEach(el => el.classList.add('m-new'));
    while (tmp.firstChild) host.appendChild(tmp.firstChild);
    if (near || m.from === 'agent' || m.from === 'coach' || m.from === 'system') scrollBottom();
  }

  function renderTyping(c) {
    const row = $('#typingRow');
    if (!row) return;
    if (c.typing) {
      if (!row.classList.contains('on')) {
        row.innerHTML = '<div class="m m-left m-customer g-start"><div class="m-av">' + avatarHTML(c.sc.customer, 30) + '</div><div class="m-col">' +
          '<div class="bubble typing"><i></i><i></i><i></i></div><div class="typing-l">' + esc(c.sc.customer.first) + ' is typing…</div></div></div>';
        row.classList.add('on');
        const box = $('#msgs');
        if (box.scrollHeight - box.scrollTop - box.clientHeight < 220) scrollBottom();
      }
    } else if (row.classList.contains('on')) {
      row.innerHTML = '';
      row.classList.remove('on');
    }
  }

  function scrollBottom(instant) {
    const box = $('#msgs');
    if (!box) return;
    if (instant) box.scrollTop = box.scrollHeight;
    else requestAnimationFrame(() => { box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }); });
  }

  /* ---------- composer ---------- */
  // animate = false when switching conversations (frequent, should feel instant)
  function renderComposer(c, animate) {
    const host = $('#composer');
    if (!host) return;
    const first = esc(c.sc.customer.first);
    let html;
    if (c.status === 'agent') {
      const node = c.sc.nodes[c.node];
      html = '<div class="cmp">' +
        '<div class="cmp-head"><div class="cmp-tabs"><span class="cmp-tab on">' + icon('chat', 14) + 'Reply</span><span class="cmp-sub">Choose the best response for ' + first + '</span></div>' +
        '<div class="cmp-hint"><kbd>1</kbd>–<kbd>' + c.order.length + '</kbd> choose<span class="sep"></span><kbd>Enter</kbd> send<span class="sep"></span>' +
        '<span class="cmp-timer t-' + moodOf(c.patience).k + '" id="cmpTimer" title="Time this customer has been waiting on you">' + icon('timer', 13) + '<span>' + fmtDur(E.st.clock - c.turnStart) + '</span></span></div></div>' +
        '<div class="opts" role="listbox" aria-label="Choose a reply">' +
          c.order.map((i, k) => '<button class="opt' + (c.selected === i ? ' sel' : '') + '" style="--k:' + k + '" data-act="opt" data-i="' + i + '" role="option" aria-selected="' + (c.selected === i) + '">' +
            '<span class="opt-k">' + (k + 1) + '</span><span class="opt-t">' + esc(E.fill(node.o[i].t, c)) + '</span><span class="opt-check">' + icon('check', 15) + '</span></button>').join('') +
        '</div>' +
        '<div class="cmp-foot"><span class="cmp-note">' + icon('info', 13) + 'Check the customer panel before answering — details matter.</span>' +
        '<button class="btn btn-primary" data-act="send" id="sendBtn"' + (c.selected == null ? ' disabled' : '') + '>' + icon('send', 15) + 'Send</button></div>' +
      '</div>';
    } else if (c.status === 'customer' || c.status === 'pending') {
      const replied = c.lastSentAt != null;
      const pace = paceLabel(E.replyIn(c));
      html = '<div class="cmp"><div class="cmp-wait"><div class="cw-ic">' + (c.typing ? '<span class="dots"><i></i><i></i><i></i></span>' : icon('clock', 18)) + '</div>' +
        '<div class="cw-t"><b>' + (c.typing ? first + ' is typing…' : replied ? 'Waiting for ' + first + ' to reply' : first + ' is writing to you') + '</b>' +
        '<p>' + (replied ? first + ' usually replies in ' + pace + '. Meanwhile, work on your other conversations.' : 'The first message is on its way.') + '</p></div>' +
        (replied ? '<div class="cw-timer" title="Time since your last reply"><span>Your last reply</span><b id="custWait">' + fmtDur(E.st.clock - c.lastSentAt) + ' ago</b></div>' : '') +
      '</div></div>';
    } else if (c.status === 'ended') {
      const oc = OUTCOMES[c.outcome];
      const sel = ui.wrapSel[c.id];
      html = '<div class="cmp">' +
        '<div class="wrap-h"><div><b>' + icon('file', 15) + 'Wrap-up</b><span class="sub">Choose the resolution code that best describes this conversation.</span></div>' +
        '<div class="wrap-res"><span class="pill pill-' + oc.tone + '">' + icon(oc.icon, 12) + oc.label + '</span><span class="wrap-csat">CSAT ' + starsHTML(c.csat, 13) + '</span></div></div>' +
        '<div class="codes" role="radiogroup" aria-label="Resolution code">' + D.dispositions.map((d, k) =>
          '<button class="code' + (sel === d.id ? ' sel' : '') + '" style="--k:' + k + '" data-act="code" data-code="' + d.id + '" role="radio" aria-checked="' + (sel === d.id) + '">' + esc(d.label) + '</button>').join('') + '</div>' +
        '<div class="cmp-foot"><span class="cmp-note">' + icon('info', 13) + 'After-chat work: pick a code, then close the conversation.</span>' +
        '<button class="btn btn-primary" data-act="close-conv" id="closeBtn"' + (sel ? '' : ' disabled') + '>' + icon('check', 15) + 'Close conversation</button></div>' +
      '</div>';
    } else {
      const oc = OUTCOMES[c.outcome];
      const d = DISP[c.disposition];
      html = '<div class="cmp"><div class="closed-sum">' +
        '<div class="cs-item"><span>Outcome</span><b class="tone-' + oc.tone + '">' + icon(oc.icon, 14) + oc.label + '</b></div>' +
        '<div class="cs-item"><span>Customer rating</span><b>' + starsHTML(c.csat, 13) + '</b></div>' +
        '<div class="cs-item"><span>Reply quality</span><b>' + pct(c.accuracy) + '</b></div>' +
        '<div class="cs-item"><span>Wrap-up code</span><b class="' + (c.dispOk ? 'tone-success' : 'tone-danger') + '">' + icon(c.dispOk ? 'check' : 'x', 13) + esc(d ? d.label : '') + '</b></div>' +
      '</div></div>';
    }
    if (host._html !== html) {
      // The composer can change height (e.g. long reply options): keep the latest message in view
      const box = $('#msgs');
      const near = box && box.scrollHeight - box.scrollTop - box.clientHeight < 160;
      host.innerHTML = html;
      host._html = html;
      // Animate only when the conversation moves to a new state (your turn, waiting, wrap-up…)
      if (animate !== false && host._status !== c.status) host.firstChild.classList.add('cmp-in');
      if (near) scrollBottom(true);
    }
    host._status = c.status;
  }

  function chooseOption(c, i) {
    if (!c || c.status !== 'agent') return;
    E.select(c.id, i);
    $$('.opt').forEach(b => {
      const on = Number(b.dataset.i) === c.selected;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-selected', on);
    });
    const btn = $('#sendBtn');
    if (btn) btn.disabled = c.selected == null;
  }

  function sendSelected() {
    const c = activeConv();
    if (!c || c.status !== 'agent' || c.selected == null) return;
    E.send(c.id, c.selected);
  }

  function chooseCode(c, code) {
    if (!c || c.status !== 'ended') return;
    ui.wrapSel[c.id] = code;
    $$('.code').forEach(b => {
      const on = b.dataset.code === code;
      b.classList.toggle('sel', on);
      b.setAttribute('aria-checked', on);
    });
    const btn = $('#closeBtn');
    if (btn) btn.disabled = false;
  }

  function closeConversation() {
    const c = activeConv();
    if (!c || c.status !== 'ended' || !ui.wrapSel[c.id]) return;
    E.wrapUp(c.id, ui.wrapSel[c.id]);
  }

  /* ---------- customer file: tiles in the side panel ---------- */
  function planPill(cu) {
    const plus = /plus/i.test(cu.plan);
    return '<span class="pill ' + (plus ? 'pill-plus' : 'pill-neutral') + '">' + icon(plus ? 'award' : 'user', 12) + esc(cu.plan) + '</span>';
  }
  function verifyPill(sc) {
    if (sc.verified === true) return '<span class="pill pill-success">' + icon('shieldCheck', 12) + 'Verified</span>';
    if (sc.verified === 'na') return '<span class="pill pill-neutral">' + icon('info', 12) + 'No verification needed</span>';
    return '<span class="pill pill-warning">' + icon('shieldAlert', 12) + 'Not verified</span>';
  }
  function textOf(v) {
    if (v == null) return '';
    if (typeof v === 'string' || typeof v === 'number') return String(v);
    if (v.pill) return v.pill;
    if (v.mono) return v.mono;
    if (v.date) return fmtDate(v.date, true) + (v.time ? ' · ' + v.time : '');
    if (v.strong) return v.strong;
    return '';
  }

  // Short preview of a section for its tile: a status pill + two key facts
  function sectionPreview(rows) {
    const kv = (rows || []).filter(Array.isArray);
    let statusRow = kv.find(r => r[1] && r[1].pill && /status/i.test(r[0])) || kv.find(r => r[1] && r[1].pill);
    const facts = [];
    (rows || []).forEach(r => {
      if (facts.length >= 2) return;
      if (Array.isArray(r)) { if (r !== statusRow) facts.push([r[0], textOf(r[1])]); }
      else if (r.items) facts.push(['Items', r.items.map(i => i.name).join(', ')]);
      else if (r.ledger) r.ledger.slice(0, 2 - facts.length).forEach(l => facts.push([l[1], l[2] + ' · ' + l[3]]));
    });
    if (!facts.length) { const note = (rows || []).find(r => r.note); if (note) facts.push(['Note', note.note]); }
    return { status: statusRow ? statusRow[1] : null, facts };
  }

  // Every document in this customer's file
  function docsFor(c) {
    const sc = c.sc, cu = sc.customer;
    const docs = [{ key: 'contact', title: 'Contact info', icon: 'user', page: () => contactDocHTML(c) }];
    (sc.sections || []).forEach((s, i) => {
      const pv = sectionPreview(s.rows);
      const items = [].concat.apply([], (s.rows || []).filter(r => r && r.items).map(r => r.items));
      const photo = items.find(it => productImg(it.name));
      docs.push({ key: 'sec' + i, title: s.title, icon: s.icon || 'box', status: pv.status, facts: pv.facts,
        photo: photo ? photo.name : null, more: Math.max(0, items.length - 1), page: () => rowsHTML(s.rows) });
    });
    if (sc.timeline && sc.timeline.length) {
      const tl = sc.timeline.slice(-2).reverse();
      docs.push({ key: 'timeline', title: 'Events timeline', icon: 'clock', facts: tl.map(e => [e[0], e[1]]), page: () => timelineHTML(sc.timeline) });
    }
    docs.push({ key: 'policy', title: 'Relevant policies', icon: 'book', chips: (sc.policies || []).map(k => D.policies[k].title), page: () => policiesDocHTML(sc) });
    const notes = sc.notes || [];
    docs.push({
      key: 'notes', title: 'Internal notes', icon: 'note',
      facts: notes.length ? [[notes.length + (notes.length === 1 ? ' note' : ' notes'), notes[0]]] : [['', 'No previous notes for ' + cu.first]],
      page: () => notesHTML(sc)
    });
    return docs;
  }

  function tileHTML(d) {
    let body = '';
    if (d.chips) body = '<span class="tile-chips">' + d.chips.map(t => '<span class="tile-chip">' + esc(t) + '</span>').join('') + '</span>';
    else if (d.facts && d.facts.length) body = '<span class="tile-lines">' + d.facts.map(f => '<span class="tile-line">' + (f[0] ? '<i>' + esc(f[0]) + '</i>' : '') + '<span>' + esc(f[1]) + '</span></span>').join('') + '</span>';
    const pill = d.status ? '<span class="pill pill-' + (d.status.tone || 'neutral') + '">' + esc(d.status.pill) + '</span>' : '';
    const media = d.photo
      ? '<span class="tile-ph"><img src="' + productImg(d.photo) + '" alt="' + esc(d.photo) + '" loading="lazy" decoding="async" draggable="false">' +
        (d.more ? '<b>+' + d.more + '</b>' : '') + '</span>'
      : '<span class="tile-ic">' + icon(d.icon, 16) + '</span>';
    return '<button class="tile' + (d.photo ? ' has-ph' : '') + (ui.doc && ui.doc.key === d.key ? ' on' : '') + '" data-act="doc" data-doc="' + d.key + '" title="Open ' + esc(d.title) + '">' +
      media +
      '<span class="tile-b"><span class="tile-top"><b>' + esc(d.title) + '</b>' + pill + '</span>' + body + '</span>' +
      '<span class="tile-go">' + icon('external', 14) + '</span></button>';
  }

  function renderDetails(animate) {
    const host = $('#details');
    if (!host) return;
    const c = activeConv();
    if (!c) {
      host.innerHTML = '<div class="details-empty"><div class="le-ic">' + icon('user', 20) + '</div>Customer details appear here when you open a conversation.</div>';
      return;
    }
    const cu = c.sc.customer;
    const docs = docsFor(c);
    let html =
      '<div class="dp-head"><button class="icon-btn" data-act="toggle-details" aria-label="Close customer file">' + icon('arrowLeft', 20) + '</button><b>Customer file</b></div>' +
      '<button class="dp-cust' + (ui.doc && ui.doc.key === 'contact' ? ' on' : '') + '" data-act="doc" data-doc="contact" title="Open contact info">' +
        avatarHTML(cu, 46) +
        '<span class="dp-cust-b"><span class="ct-name" style="display:block">' + esc(cu.first + ' ' + cu.last) + '</span>' +
        '<span class="ct-loc">' + icon('pin', 12) + esc(cu.location) + '</span>' +
        '<span class="ct-badges">' + planPill(cu) + verifyPill(c.sc) + '</span></span>' +
        '<span class="tile-go">' + icon('external', 15) + '</span>' +
      '</button>' +
      '<div class="dp-sec-h"><span>Customer file</span><span>' + docs.length + ' documents</span></div>';
    docs.forEach(d => { if (d.key !== 'contact') html += tileHTML(d); });
    html += '<button class="dp-kb" data-act="kb">' + icon('search', 14) + 'Search the knowledge base</button>';
    host.innerHTML = html;
    host.scrollTop = 0;
    if (animate) { host.classList.remove('swap'); void host.offsetWidth; host.classList.add('swap'); }
  }

  function contactDocHTML(c) {
    const sc = c.sc, cu = sc.customer;
    const kv = (k, v) => '<div class="kv"><span class="k">' + esc(k) + '</span><span class="v">' + v + '</span></div>';
    return '<div class="doc-contact">' + avatarHTML(cu, 64) +
        '<div><div class="ct-name">' + esc(cu.first + ' ' + cu.last) + '</div><div class="ct-loc">' + icon('pin', 12) + esc(cu.location) + '</div>' +
        '<div class="ct-badges">' + planPill(cu) + verifyPill(sc) + '</div>' +
        (sc.verifyNote ? '<div class="ct-vnote">' + esc(sc.verifyNote) + '</div>' : '') + '</div></div>' +
      kv('Email address', '<b class="link" style="font-size:13.5px;color:var(--primary)">' + esc(cu.email) + '</b>' + (cu.emailNote ? '<small class="warn-note" style="justify-content:flex-end">' + icon('alert', 11) + esc(cu.emailNote) + '</small>' : '')) +
      kv('Phone', esc(cu.phone)) +
      kv('Customer since', cu.since ? esc(fmtDate(cu.since, true)) + '<span class="ago">' + sinceLabel(cu.since) + '</span>' : 'No account') +
      kv('Lifetime value', '<b>' + esc(cu.ltv) + '</b><span class="ago">' + cu.orders + ' order' + (cu.orders === 1 ? '' : 's') + '</span>') +
      kv('Membership', esc(cu.plan)) +
      kv('Channel', CH[sc.channel].label + '<span class="ago">Ticket #' + c.ticket + ' · Priority ' + esc(sc.priority) + '</span>') +
      kv('Customer type', esc(c.persona.label) + '<span class="ago">Replies: ' + paceShort(E.replyIn(c)) + '</span>') +
      (cu.tags && cu.tags.length ? kv('Tags', cu.tags.map(t => '<span class="tag">' + esc(t) + '</span>').join(' ')) : '');
  }

  function policiesDocHTML(sc) {
    return (sc.policies || []).map(k => {
      const p = D.policies[k];
      return '<section class="doc-pol"><h3>' + icon(p.icon, 16) + esc(p.title) + '</h3><p>' + esc(p.summary) + '</p>' +
        '<ul>' + p.points.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' + (p.table ? tableHTML(p.table) : '') + '</section>';
    }).join('') + '<button class="link-btn" data-act="kb">' + icon('book', 14) + 'Open the full knowledge base</button>';
  }

  /* ---------- document viewer ---------- */
  const docLayer = document.createElement('div');
  docLayer.className = 'doc-layer';
  docLayer.innerHTML = '<div class="doc-backdrop" data-act="doc-close"></div><section class="doc-sheet" role="dialog" aria-modal="true" aria-labelledby="docTitle"></section>';
  document.body.appendChild(docLayer);
  let docReturnFocus = null;

  function openDoc(key, fromEl) {
    const c = activeConv();
    if (!c) return;
    const docs = docsFor(c);
    const doc = docs.find(d => d.key === key) || docs[0];
    ui.doc = { id: c.id, key: doc.key };
    docReturnFocus = fromEl || null;
    const sheet = $('.doc-sheet', docLayer);
    sheet.innerHTML =
      '<header class="doc-h"><span class="doc-file" id="docIcon"></span>' +
        '<div class="doc-ht"><span class="doc-kicker">Customer file · ' + esc(c.sc.customer.first + ' ' + c.sc.customer.last) + ' · Ticket #' + c.ticket + '</span><h2 id="docTitle"></h2></div>' +
        '<span class="doc-live" id="docLive"></span>' +
        '<button class="icon-btn" data-act="doc-close" title="Close (Esc)" aria-label="Close">' + icon('x', 18) + '</button></header>' +
      '<nav class="doc-tabs" role="tablist">' + docs.map(d =>
        '<button class="doc-tab" role="tab" data-act="doc-tab" data-doc="' + d.key + '">' + icon(d.icon, 14) + '<span>' + esc(d.title) + '</span></button>').join('') +
        '<span class="doc-ind"></span></nav>' +
      '<div class="doc-body" id="docBody"></div>' +
      '<footer class="doc-f"><span><kbd>←</kbd><kbd>→</kbd> switch documents · <kbd>Esc</kbd> close</span>' +
        '<button class="btn btn-primary btn-sm" data-act="doc-close">' + icon('chat', 14) + 'Back to chat</button></footer>';
    // Grow out of the tile that was clicked
    if (fromEl) {
      const r = fromEl.getBoundingClientRect();
      const s = sheet.getBoundingClientRect();
      sheet.style.setProperty('--doc-origin', Math.round(r.left + r.width / 2 - s.left) + 'px ' + Math.round(r.top + r.height / 2 - s.top) + 'px');
    } else sheet.style.removeProperty('--doc-origin');
    showDoc(doc.key, false);
    docLayer.classList.add('open');
    markTiles();
    updateDocLive();
    requestAnimationFrame(() => moveDocIndicator(true));
    setTimeout(() => { const b = $('.doc-h .icon-btn', docLayer); if (b) b.focus({ preventScroll: true }); }, 30);
  }

  function showDoc(key, animate) {
    const c = ui.doc && E.get(ui.doc.id);
    if (!c) return;
    const docs = docsFor(c);
    const doc = docs.find(d => d.key === key) || docs[0];
    ui.doc.key = doc.key;
    $('#docTitle').textContent = doc.title;
    $('#docIcon').innerHTML = icon(doc.icon, 18);
    $$('.doc-tab', docLayer).forEach(t => {
      const on = t.dataset.doc === doc.key;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on);
    });
    const body = $('#docBody');
    body.innerHTML = '<article class="doc-page' + (animate ? ' doc-pane-in' : '') + '">' +
      '<div class="doc-page-h"><b>Lumen &amp; Co. · ' + esc(doc.title) + '</b><span>' + fmtDate(simToday(), true) + ' · ' + clockLabel(E.st ? E.st.clock : 0) + '</span></div>' +
      doc.page() + '</article>';
    body.scrollTop = 0;
    if (animate) moveDocIndicator(false);
    markTiles();
  }

  function moveDocIndicator(instant) {
    const on = $('.doc-tab.on', docLayer), ind = $('.doc-ind', docLayer);
    if (!on || !ind) return;
    if (instant) ind.style.transition = 'none';
    ind.style.transform = 'translateX(' + on.offsetLeft + 'px) scaleX(' + (on.offsetWidth / 100) + ')';
    if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  function stepDoc(dir) {
    if (!ui.doc) return;
    const c = E.get(ui.doc.id);
    if (!c) return;
    const docs = docsFor(c);
    const i = docs.findIndex(d => d.key === ui.doc.key);
    showDoc(docs[(i + dir + docs.length) % docs.length].key, true);
  }

  function closeDoc() {
    if (!ui.doc) return;
    ui.doc = null;
    docLayer.classList.remove('open');
    markTiles();
    if (docReturnFocus && docReturnFocus.isConnected) docReturnFocus.focus({ preventScroll: true });
    docReturnFocus = null;
  }

  function markTiles() {
    $$('#details [data-act="doc"]').forEach(t => t.classList.toggle('on', !!ui.doc && t.dataset.doc === ui.doc.key));
  }

  function updateDocLive() {
    const el = $('#docLive');
    if (!el || !ui.doc || !E.st) return;
    const c = E.get(ui.doc.id);
    if (!c) return;
    const others = E.st.convs.filter(x => x.status === 'agent' && x.id !== c.id).length;
    let html = '', mood = '';
    if (c.status === 'agent') { html = icon('timer', 13) + c.sc.customer.first + ' waiting · ' + fmtDur(E.st.clock - c.turnStart); mood = moodOf(c.patience).k; }
    else if (c.status === 'customer') html = c.typing ? c.sc.customer.first + ' is typing…' : 'Waiting for ' + c.sc.customer.first;
    else if (c.status === 'ended') html = icon('file', 13) + 'Wrap-up pending';
    if (others) html += (html ? ' · ' : '') + '+' + others + ' waiting on you';
    if (el._html !== html) { el.innerHTML = html; el._html = html; }
    if (el.dataset.mood !== mood) el.dataset.mood = mood;
  }

  function valueHTML(v) {
    if (v == null) return '<span class="muted">—</span>';
    if (typeof v === 'string' || typeof v === 'number') return esc(v);
    if (v.pill) return '<span class="pill pill-' + (v.tone || 'neutral') + '">' + esc(v.pill) + '</span>';
    if (v.mono) return '<span class="mono">' + esc(v.mono) + '</span><button class="copy" data-act="copy" data-copy="' + esc(v.mono) + '" title="Copy">' + icon('copy', 13) + '</button>';
    if (v.date) return esc(fmtDate(v.date, true)) + (v.time ? ' · ' + esc(v.time) : '') + '<span class="ago">' + agoLabel(v.date) + '</span>';
    if (v.strong) return '<b>' + esc(v.strong) + '</b>';
    return esc(String(v));
  }

  function rowsHTML(rows) {
    return (rows || []).map(r => {
      if (Array.isArray(r)) return '<div class="kv"><span class="k">' + esc(r[0]) + '</span><span class="v">' + valueHTML(r[1]) + '</span></div>';
      if (r.items) return '<div class="items">' + r.items.map(itemHTML).join('') + '</div>';
      if (r.note) return '<div class="callout callout-' + (r.tone || 'info') + '">' + icon(r.tone === 'warning' || r.tone === 'danger' ? 'alert' : 'info', 14) + '<span>' + esc(r.note) + '</span></div>';
      if (r.ledger) return '<div class="ledger">' + r.ledger.map(l => '<div class="lg-row"><div class="lg-l"><b>' + esc(l[1]) + '</b><span>' + esc(l[0]) + '</span></div><div class="lg-r"><b>' + esc(l[2]) + '</b><span class="pill pill-' + l[4] + '">' + esc(l[3]) + '</span></div></div>').join('') + '</div>';
      return '';
    }).join('');
  }

  // Product photo for an ordered item (assets/img/products/), or null
  function productImg(name) {
    const p = D.products && D.products[name];
    return p ? 'assets/img/products/' + p.img + '.jpg' : null;
  }
  function productPhoto(name, cls) {
    const src = productImg(name);
    return src ? '<span class="' + cls + '"><img src="' + src + '" alt="' + esc(name) + '" loading="lazy" decoding="async" draggable="false"></span>' : '';
  }

  function itemHTML(it) {
    let stocks = '';
    if (it.stocks) stocks = '<div class="stocks">' + it.stocks.map(s => '<span class="stock stock-' + s[1] + '"><i></i>' + esc(s[0]) + '</span>').join('') + '</div>';
    else if (it.stock) stocks = '<div class="stocks"><span class="stock stock-' + (it.tone || 'success') + '"><i></i>' + esc(it.stock) + '</span></div>';
    return '<div class="item">' + (productPhoto(it.name, 'item-ph') || '<span class="item-ic">' + icon('box', 16) + '</span>') + '<div class="item-b">' +
      '<div class="item-top"><span class="item-n">' + esc(it.name) + '</span><span class="item-p">' + esc(it.price || '') + '</span></div>' +
      (it.meta ? '<div class="item-m">' + esc(it.meta) + '</div>' : '') + stocks + '</div></div>';
  }

  function timelineHTML(tl) {
    return '<ol class="tl">' + tl.map(e => '<li class="tl-' + (e[2] || 'neutral') + '"><span class="tl-dot"></span><div><div class="tl-t">' + esc(e[1]) + '</div><div class="tl-d">' + esc(e[0]) + '</div></div></li>').join('') + '</ol>';
  }

  function tableHTML(t) {
    return '<table class="ptable"><thead><tr>' + t.head.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      t.rows.map(r => '<tr>' + r.map(x => '<td>' + esc(x) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }

  function notesHTML(sc) {
    if (!sc.notes || !sc.notes.length) return '<p class="muted" style="font-size:12.5px">No previous notes for this customer.</p>';
    return sc.notes.map(n => '<div class="note-i">' + esc(n) + '</div>').join('');
  }

  /* ---------- knowledge base drawer ---------- */
  function highlight(text, q) {
    const safe = esc(text);
    if (!q) return safe;
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    return safe.replace(re, '<mark>$1</mark>');
  }
  function kbList() {
    const q = ui.kbQuery.trim().toLowerCase();
    const items = Object.keys(D.policies).filter(k => {
      if (!q) return true;
      const p = D.policies[k];
      const hay = (p.title + ' ' + p.summary + ' ' + p.points.join(' ') + (p.table ? ' ' + p.table.rows.map(r => r.join(' ')).join(' ') : '')).toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    if (!items.length) return '<div class="kb-empty">No policies match “' + esc(ui.kbQuery) + '”.</div>';
    return items.map(k => {
      const p = D.policies[k];
      return '<article class="kb-item" id="kb-' + k + '"><h3>' + icon(p.icon, 16) + esc(p.title) + '</h3><p class="kb-sum">' + esc(p.summary) + '</p>' +
        '<ul>' + p.points.map(x => '<li>' + highlight(x, q) + '</li>').join('') + '</ul>' + (p.table ? tableHTML(p.table) : '') + '</article>';
    }).join('');
  }
  function openKB(key) {
    const el = $('#kb');
    if (!el) return;
    ui.kb = true;
    el.innerHTML = '<div class="kb-h"><div><b>' + icon('book', 17) + 'Knowledge base</b><span>Lumen &amp; Co. customer care policies · ' + Object.keys(D.policies).length + ' articles</span></div>' +
      '<button class="icon-btn" data-act="kb-close" title="Close (Esc)">' + icon('x', 18) + '</button></div>' +
      '<div class="kb-search"><label class="search">' + icon('search', 15) + '<input id="kbSearch" placeholder="Search policies… e.g. refund, 48 hours, warranty" value="' + esc(ui.kbQuery) + '" autocomplete="off" spellcheck="false"></label></div>' +
      '<div class="kb-body" id="kbBody">' + kbList() + '</div>';
    el.classList.add('open');
    el.setAttribute('aria-hidden', 'false');
    const scrim = $('#kbScrim');
    if (scrim) scrim.classList.add('open');
    if (key && D.policies[key]) {
      ui.kbQuery = '';
      $('#kbSearch').value = '';
      $('#kbBody').innerHTML = kbList();
      const target = $('#kb-' + key);
      if (target) { target.scrollIntoView({ block: 'start' }); target.classList.add('flash'); }
    } else {
      setTimeout(() => { const i = $('#kbSearch'); if (i) i.focus(); }, 60);
    }
  }
  function closeKB() {
    const el = $('#kb');
    ui.kb = false;
    if (el) { el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); }
    const scrim = $('#kbScrim');
    if (scrim) scrim.classList.remove('open');
  }

  /* ---------- modals ---------- */
  function openModal(kind) {
    ui.modal = kind;
    const running = ui.view === 'shift' && E.st && !E.st.ended;
    if (running) E.setPaused(true);
    let html = '';
    if (kind === 'pause') {
      html = '<div class="modal"><div class="md-ic">' + icon('pause', 22) + '</div><h3>Shift paused</h3>' +
        '<p>Your customers are on hold — their patience won’t drop and nobody new will arrive while the shift is paused.</p>' +
        '<div class="md-actions"><button class="btn btn-primary btn-block btn-lg" data-act="resume">' + icon('play', 14) + 'Resume shift</button></div></div>';
    } else if (kind === 'shortcuts') {
      html = '<div class="modal"><div class="md-ic">' + icon('keyboard', 22) + '</div><h3>Keyboard shortcuts</h3><p>Work faster — the shift is paused while this is open.</p>' +
        '<div class="keys">' +
          keyRow('Choose a reply', '<kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd>') +
          keyRow('Send the selected reply', '<kbd>Enter</kbd>') +
          keyRow('Send immediately', 'Double-click a reply') +
          keyRow('Next / previous conversation', '<kbd>Alt</kbd><kbd>↓</kbd> <kbd>Alt</kbd><kbd>↑</kbd>') +
          keyRow('Close conversation after wrap-up', '<kbd>Enter</kbd>') +
          keyRow('Search the knowledge base', '<kbd>K</kbd>') +
          keyRow('Pause the shift', '<kbd>P</kbd>') +
          keyRow('Close panels', '<kbd>Esc</kbd>') +
        '</div><div class="md-actions"><button class="btn btn-primary" data-act="resume">Got it</button></div></div>';
    } else if (kind === 'settings') {
      html = '<div class="modal"><div class="md-ic">' + icon('sliders', 22) + '</div><h3>Settings</h3><p>The shift is paused while you change settings.</p>' +
        '<div class="md-toggles">' +
          toggleHTML('coach', 'Coach notes', 'Show a feedback note under each reply you send', store.coach) +
          toggleHTML('sound', 'Sound', 'Button sounds, notifications and the welcome voice', store.sound) +
          toggleHTML('dark', 'Dark mode', 'Dark colors for the whole simulator', store.theme === 'dark') +
          toggleHTML('intro', 'Welcome screen', 'Show the welcome message and logo when the app opens', store.intro !== false) +
        '</div><div class="md-actions"><button class="btn btn-primary" data-act="resume">Done</button></div></div>';
    } else if (kind === 'exit') {
      html = '<div class="modal"><div class="md-ic warn">' + icon('logout', 22) + '</div><h3>End this shift?</h3>' +
        '<p>Your open conversations will be dropped and this day won’t be scored. You can restart it from the lobby anytime.</p>' +
        '<div class="md-actions"><button class="btn" data-act="resume">Keep working</button><button class="btn btn-danger" data-act="confirm-exit">End shift</button></div></div>';
    } else if (kind === 'reset') {
      html = '<div class="modal"><div class="md-ic warn">' + icon('rotate', 22) + '</div><h3>Reset all progress?</h3>' +
        '<p>This clears your scores and stars and locks Days 2–5 again. Your agent name and settings are kept.</p>' +
        '<div class="md-actions"><button class="btn" data-act="resume">Cancel</button><button class="btn btn-danger" data-act="confirm-reset">Reset progress</button></div></div>';
    }
    overlay.innerHTML = html;
    overlay.classList.add('open');
    const primary = $('.btn-primary, .btn-danger', overlay);
    if (primary) setTimeout(() => primary.focus(), 30);
  }
  function keyRow(label, keys) { return '<div><span>' + esc(label) + '</span><span>' + keys + '</span></div>'; }
  function closeModal(silent) {
    if (!ui.modal) return;
    ui.modal = null;
    overlay.classList.remove('open');
    overlay.innerHTML = '';
    if (!silent && ui.view === 'shift' && E.st && !E.st.ended && !rotEl && !tour) E.setPaused(false);
  }

  /* ---------- toasts ---------- */
  function clearToasts() { toastHost.innerHTML = ''; hideAlarm(); }
  function toast(o) {
    const el = document.createElement('div');
    el.className = 'toast ' + (o.tone || '');
    el.innerHTML = (o.av || '<span class="toast-ic">' + icon(o.icon || 'info', 17) + '</span>') +
      '<div class="toast-t"><b>' + esc(o.title) + '</b>' + (o.body ? '<span>' + esc(o.body) + '</span>' : '') + '</div>';
    if (o.id) { el.dataset.act = 'open-conv'; el.dataset.id = o.id; }
    toastHost.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 300); }, o.ms || 4200);
    while (toastHost.children.length > 3) toastHost.firstChild.remove();
  }

  /* ---------- angry-customer alarm: red flash + shake + message ---------- */
  const alarmEl = document.createElement('div');
  alarmEl.className = 'alarm';
  alarmEl.innerHTML = '<div class="alarm-glow"></div><div class="alarm-card" role="alert"></div>';
  document.body.appendChild(alarmEl);
  let alarmTimer = 0;
  function hideAlarm() { clearTimeout(alarmTimer); alarmEl.classList.remove('on'); }
  function alarm(c, kind) {
    if (ui.view !== 'shift' || !E.st) return;
    const cu = c.sc.customer;
    const left = kind === 'left';
    const title = left ? cu.first + ' left the chat!' : cu.first + ' is getting angry!';
    const body = left
      ? 'They waited too long and gave up. Complete the wrap-up.'
      : cu.first + ' ' + cu.last + ' has been waiting ' + fmtDur(E.st.clock - c.turnStart) + ' for your reply. Answer now!';
    $('.alarm-card', alarmEl).innerHTML =
      '<span class="alarm-ic">' + icon(left ? 'logout' : 'angry', 22) + '</span>' +
      '<div class="alarm-t"><b>' + esc(title) + '</b><span>' + esc(body) + '</span></div>' +
      (ui.active !== c.id || (isPhone() && ui.mview !== 'chat') ? '<button class="btn btn-sm btn-danger" data-act="open-conv" data-id="' + c.id + '">Open chat</button>' : '');
    alarmEl.classList.remove('on');
    void alarmEl.offsetWidth;
    alarmEl.classList.add('on');
    clearTimeout(alarmTimer);
    alarmTimer = setTimeout(hideAlarm, 2400);
    notifySound({ rate: 0.78 });   // same chime, lower pitch = alert
    const touched = !navigator.userActivation || navigator.userActivation.hasBeenActive;
    if (navigator.vibrate && touched) { try { navigator.vibrate([90, 60, 90]); } catch (e) { /* not allowed */ } }
    const shell = $('#appShell');
    if (shell && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shell.animate([
        { transform: 'translate(0,0)' }, { transform: 'translate(-9px,2px)' }, { transform: 'translate(8px,-2px)' },
        { transform: 'translate(-7px,1px)' }, { transform: 'translate(6px,-1px)' }, { transform: 'translate(-4px,0)' },
        { transform: 'translate(3px,0)' }, { transform: 'translate(0,0)' }
      ], { duration: 520, easing: 'ease-out' });
    }
  }

  /* ---------- sound effects: the user's own sound files (assets/js/sounds.js) ----------
     click   (sonido_4, bright)  → any button, wrap-up code, day card
     option  (sonido_3, ding)    → choosing a reply (click or keys 1–4)
     send    (sonido_6, firm)    → send, close the chat, start / retry / next shift, confirmations
     menu    (sonido_7, soft)    → open a chat, tabs, documents, menus, knowledge base, How to start
     back    (sonido_8, low)     → close or go back, switches, theme, sound, pause
     notify  (sonido_3 twice)    → new chat, customer waiting; lower pitch = angry customer
     success (chime)             → chat closed, shift complete */
  const SFX_GAIN = { click: 1.1, option: 0.6, send: 0.34, menu: 1.0, back: 0.65, success: 1.1 };
  let actx = null;
  let decodeStarted = false;
  const buffers = {};
  function b64ToArrayBuffer(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  }
  function unlockAudio() {
    try {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      if (!decodeStarted && SR.sounds) {
        decodeStarted = true;
        Object.keys(SFX_GAIN).forEach(name => {
          const s = SR.sounds[name];
          if (!s) return;
          try {
            const p = actx.decodeAudioData(b64ToArrayBuffer(s.data), buf => { buffers[name] = buf; }, () => { /* unsupported */ });
            if (p && p.catch) p.catch(() => { /* handled above */ });
          } catch (e) { /* unsupported */ }
        });
      }
    } catch (e) { actx = null; }
  }
  // Fallback for the very first press (before the audio engine is ready)
  const fallbackEls = {};
  let lastNotify = 0;
  function sfx(name, opt) {
    opt = opt || {};
    const s = SR.sounds && SR.sounds[name];
    if (!store.sound || !s) return;
    if (name === 'success') {
      // Two notifications at the same moment sound like one
      const now = performance.now();
      if (now - lastNotify < 400) return;
      lastNotify = now;
    }
    const gain = SFX_GAIN[name] * (opt.gain == null ? 1 : opt.gain);
    const rate = opt.rate || 1;
    try {
      if (actx && buffers[name] && actx.state === 'running') {
        const src = actx.createBufferSource();
        const g = actx.createGain();
        g.gain.value = gain;
        src.buffer = buffers[name];
        src.playbackRate.value = rate;
        src.connect(g);
        g.connect(actx.destination);
        src.start();
      } else {
        const el = fallbackEls[name] || (fallbackEls[name] = new Audio('data:' + s.type + ';base64,' + s.data));
        el.volume = Math.min(1, gain);
        el.preservesPitch = false;
        el.playbackRate = rate;
        el.currentTime = 0;
        const p = el.play();
        if (p && p.catch) p.catch(() => { /* blocked until the first gesture */ });
      }
    } catch (e) { /* audio unavailable */ }
  }
  const optionSound = () => sfx('option');
  // Notifications: the same ding twice, the second one a step higher (rate < 1 = lower = alert)
  function notifySound(opt) {
    opt = opt || {};
    const now = performance.now();
    if (now - lastNotify < 400) return;   // two at the same moment sound like one
    lastNotify = now;
    const rate = opt.rate || 1, gain = 1.2 * (opt.gain == null ? 1 : opt.gain);
    sfx('option', { gain, rate });
    setTimeout(() => sfx('option', { gain, rate: rate * 1.335 }), 120);
  }
  const confirmSound = () => sfx('send');
  const navSound = () => sfx('menu');

  const CLICKABLE = 'button, [role="button"], [data-act], a[href], label.tgl, input[type="checkbox"], .ci';
  const SOUND_BY_ACT = {
    opt: 'option',
    send: 'send', 'close-conv': 'send', start: 'send', retry: 'send', next: 'send',
    'confirm-exit': 'send', 'confirm-reset': 'send', 'replay-boot': 'send',
    kb: 'menu', settings: 'menu', shortcuts: 'menu', doc: 'menu', 'doc-tab': 'menu', 'toggle-details': 'menu',
    'm-chats': 'menu', 'open-conv': 'menu', sort: 'menu', 'toggle-closed': 'menu', 'rc-toggle': 'menu', howto: 'menu',
    'kb-close': 'back', 'doc-close': 'back', 'm-back': 'back', theme: 'back', sound: 'back',
    pause: 'back', resume: 'back', exit: 'back', lobby: 'back'
  };
  function soundFor(t) {
    const act = t.getAttribute('data-act');
    if (act && SOUND_BY_ACT[act]) return SOUND_BY_ACT[act];
    if (t.matches('label.tgl, input[type="checkbox"]')) return 'back';
    if (t.matches('.ci, .rail-btn, .mnav-btn, .tile, .doc-tab, .toast')) return 'menu';
    return 'click';
  }
  document.addEventListener('pointerdown', e => {
    unlockAudio();
    if (e.button !== 0) return;
    const t = e.target.closest(CLICKABLE);
    if (!t || t.disabled || t.closest('[disabled]') || t.closest('.boot')) return;
    sfx(soundFor(t));
  }, true);
  document.addEventListener('keydown', () => unlockAudio(), true);
  // Phones only allow sound once a tap has finished
  document.addEventListener('click', () => unlockAudio(), true);
  document.addEventListener('touchend', () => unlockAudio(), { capture: true, passive: true });

  /* ---------- "How to start": the voice guide, its words shown as they are spoken ----------
     Timed to assets/audio/how-to-start-voice.mp3: [from ms, to ms, words, highlight]. */
  const HOWTO_LINES = [
    { out: 2560, runs: [[120, 660, 'Hi there!'], [940, 2300, 'Welcome to the simulator.']] },
    { out: 5620, runs: [[2700, 5320, 'Here you will improve your problem-solving skills.']] },
    { runs: [[5820, 6340, 'Please press'], [6560, 7280, 'Start Shift', true], [7560, 8900, 'and I wish you good luck!']] }
  ];
  const HOWTO_START_CUE = 6560;   // "Start Shift" is spoken: highlight the button
  let howto = null;

  function howtoWords(line) {
    // Spread each phrase's words over the time it takes to say them
    const out = [];
    line.runs.forEach(([a, b, text, hl]) => {
      const words = text.split(' ');
      const total = words.reduce((s, w) => s + w.length, 0);
      let acc = 0;
      words.forEach(w => { out.push({ w, at: Math.round(a + (b - a) * 0.85 * acc / total), hl: !!hl }); acc += w.length; });
    });
    return out;
  }
  // Press! moves like a real button: pushed in while held, with a ripple from where it was touched
  function pressButton(b, x, y) {
    b.classList.add('is-pressed');
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const s = document.createElement('span');
    s.className = 'press-ripple';
    s.style.width = s.style.height = size + 'px';
    s.style.left = (x - r.left - size / 2) + 'px';
    s.style.top = (y - r.top - size / 2) + 'px';
    b.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
  document.addEventListener('pointerdown', e => {
    const b = e.button === 0 && e.target.closest && e.target.closest('.howto-btn');
    if (!b) return;
    pressButton(b, e.clientX, e.clientY);
    const release = () => {
      b.classList.remove('is-pressed');
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
  });
  document.addEventListener('keydown', e => {
    const b = document.activeElement;
    if (e.repeat || (e.key !== 'Enter' && e.key !== ' ') || !b || !b.classList || !b.classList.contains('howto-btn')) return;
    const r = b.getBoundingClientRect();
    pressButton(b, r.left + r.width / 2, r.top + r.height / 2);
    setTimeout(() => b.classList.remove('is-pressed'), 140);
  });

  function setHowtoBtn(playing) {
    const btn = $('.howto-btn');
    if (!btn) return;
    btn.classList.toggle('playing', playing);
    btn.setAttribute('aria-pressed', String(playing));
  }
  function playHowto() {
    const s = SR.sounds && SR.sounds.howto;
    const cap = $('.howto-cap');
    if (!s || !cap) return;
    stopHowto(true);
    const h = howto = { audio: new Audio('data:' + s.type + ';base64,' + s.data), timers: [] };
    setHowtoBtn(true);
    cap.innerHTML = HOWTO_LINES.map(l => '<p class="cap-line">' +
      howtoWords(l).map(x => '<span class="cw' + (x.hl ? ' hl' : '') + '">' + esc(x.w) + '</span>').join('') + '</p>').join('');
    cap.classList.add('on');
    const begin = () => {
      if (howto !== h) return;
      const lines = $$('.cap-line', cap);
      HOWTO_LINES.forEach((l, i) => {
        const spans = $$('.cw', lines[i]);
        howtoWords(l).forEach((x, k) => h.timers.push(setTimeout(() => spans[k].classList.add('on'), x.at)));
        if (l.out) h.timers.push(setTimeout(() => lines[i].classList.add('gone'), l.out));
      });
      h.timers.push(setTimeout(cueStartButton, HOWTO_START_CUE));
    };
    h.audio.addEventListener('ended', () => { h.timers.push(setTimeout(() => { if (howto === h) stopHowto(); }, 1600)); });
    let p;
    try { p = h.audio.play(); } catch (e) { p = Promise.reject(e); }
    Promise.resolve(p).then(begin, () => { if (howto === h) stopHowto(); });
  }
  function stopHowto(instant) {
    const h = howto;
    if (!h) return;
    howto = null;
    h.timers.forEach(clearTimeout);
    try { h.audio.pause(); h.audio.removeAttribute('src'); h.audio.load(); } catch (e) { /* ignore */ }
    setHowtoBtn(false);
    const cap = $('.howto-cap');
    if (!cap) return;
    cap.classList.remove('on');
    if (instant) cap.innerHTML = '';
    else setTimeout(() => { if (!howto) cap.innerHTML = ''; }, 420);
  }
  function cueStartButton() {
    const b = $('#brief [data-act="start"]');
    if (!b) return;
    b.classList.remove('cue');
    void b.offsetWidth;
    b.classList.add('cue');
    const r = b.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      b.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  /* ---------- Phones: the shift is played sideways, with the computer layout ----------
     Phone held upright during a shift → blurred screen with a phone turning sideways (the clock pauses).
     Phone sideways → the page is laid out at computer width and fitted to the screen.
     The welcome screen, lobby and report keep working upright. */
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  const VIEWPORT_DEFAULT = viewportMeta ? viewportMeta.getAttribute('content') : '';
  const PC_WIDTH = 1280;
  if (viewportMeta) viewportMeta.dataset.mode = 'default';
  let rotEl = null, rotPausedClock = false, rotTimer = 0, vpTimer = 0;
  const rotate = SR.rotate = {
    isPhone() {
      return window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 600;
    },
    // The visible area is wider than tall (stays correct while the computer layout is on)
    isLandscape() { return window.matchMedia('(orientation: landscape)').matches; },
    update: updateRotate,
    get shown() { return !!rotEl; }
  };
  function updateRotate() {
    const phone = rotate.isPhone();
    const landscape = rotate.isLandscape();
    setPcViewport(phone && landscape && ui.view === 'shift');
    if (phone && !landscape && ui.view === 'shift' && E.st && !E.st.ended) showRotate();
    else hideRotate();
  }
  function setPcViewport(on) {
    document.documentElement.classList.toggle('pc-mode', on);
    if (!viewportMeta || viewportMeta.dataset.mode === (on ? 'pc' : 'default')) return;
    viewportMeta.dataset.mode = on ? 'pc' : 'default';
    let locked, relaxed, s = 1;
    if (on) {
      // Lay the page out at computer width and zoom out so all of it fits the screen
      // The width the phone really shows sideways (Safari already leaves out the notch)
      let w = document.documentElement.clientWidth;
      if (w < document.documentElement.clientHeight) w = Math.max(screen.width, screen.height);
      s = Math.min(1, +(w / PC_WIDTH).toFixed(4));
      relaxed = 'width=' + PC_WIDTH + ', initial-scale=' + s + ', minimum-scale=' + s + ', interactive-widget=resizes-content';
      locked = relaxed + ', maximum-scale=' + s;
    } else {
      relaxed = VIEWPORT_DEFAULT;
      locked = 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, interactive-widget=resizes-content';
    }
    // Lock the zoom until the browser has applied it, then allow pinch-zoom again
    clearInterval(vpTimer);
    viewportMeta.setAttribute('content', locked);
    let tries = 0;
    vpTimer = setInterval(() => {
      const applied = !window.visualViewport || Math.abs(window.visualViewport.scale - s) < 0.02;
      if (applied && ++tries >= 2) { clearInterval(vpTimer); viewportMeta.setAttribute('content', relaxed); }
    }, 150);
  }
  function showRotate() {
    if (rotEl) return;
    rotEl = document.createElement('div');
    rotEl.className = 'rotate';
    rotEl.setAttribute('role', 'dialog');
    rotEl.setAttribute('aria-modal', 'true');
    rotEl.setAttribute('aria-label', 'Turn your phone sideways');
    rotEl.innerHTML =
      '<div class="rot-card">' +
        '<div class="rot-stage" aria-hidden="true">' +
          '<svg class="rot-arrow" viewBox="0 0 160 160" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M122 52a58 58 0 0 0-84-6"/><path d="M38 30v16h16"/></svg>' +
          '<div class="rot-phone"><span class="rot-screen"><img src="assets/img/logo-192.png" alt="" draggable="false"></span></div>' +
        '</div>' +
        '<h2>Turn your phone sideways</h2>' +
        '<p>Your shift plays in landscape, just like on a computer. The clock is paused until you turn it.</p>' +
        '<button class="link-quiet rot-back" data-act="confirm-exit">Back to lobby</button>' +
      '</div>';
    document.body.appendChild(rotEl);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (rotEl) rotEl.classList.add('on'); }));
    if (E.st && !E.st.paused) { E.setPaused(true); rotPausedClock = true; }
  }
  function hideRotate() {
    if (!rotEl) return;
    const el = rotEl;
    rotEl = null;
    el.classList.remove('on');
    el.classList.add('off');
    setTimeout(() => el.remove(), 320);
    if (rotPausedClock) {
      rotPausedClock = false;
      resumeIfFree();
    }
  }
  const onTurn = () => { clearTimeout(rotTimer); rotTimer = setTimeout(updateRotate, 80); };
  if (screen.orientation && screen.orientation.addEventListener) screen.orientation.addEventListener('change', onTurn);
  const landscapeQuery = window.matchMedia('(orientation: landscape)');
  if (landscapeQuery.addEventListener) landscapeQuery.addEventListener('change', onTurn);
  else if (landscapeQuery.addListener) landscapeQuery.addListener(onTurn);
  window.addEventListener('orientationchange', onTurn);
  window.addEventListener('resize', onTurn);
  // Backup for browsers that miss the events: re-check during a shift on a phone
  let lastLandscape = null;
  setInterval(() => {
    if (ui.view !== 'shift' || !rotate.isPhone()) { lastLandscape = null; return; }
    const l = rotate.isLandscape();
    if (lastLandscape !== null && l !== lastLandscape) updateRotate();
    lastLandscape = l;
  }, 700);

  /* ---------- Day 1 tour: what each part of the workspace is for ----------
     The rest of the screen is blurred while the part being explained stays sharp. The clock is paused. */
  const TOUR = [
    { title: 'Welcome to your first shift', text: 'You’re joining the chat support team at Lumen & Co. Here’s a quick look at your workspace. The clock is paused until you finish.' },
    { target: '.inbox', title: 'Your chats', text: 'Every customer you’re helping appears here. The ring around each photo is their patience: it shrinks while they wait for your reply. Click a chat to open it.' },
    { target: '.chat', title: 'The conversation', text: 'Read what the customer writes, then choose the best reply at the bottom and press Send. On a keyboard: 1–4 to choose, Enter to send.' },
    { target: '#details', details: true, title: 'Customer file', text: 'Contact info, the order with its product photos, shipping, history and company policies. Open any card to read it, and check the facts before you answer.' },
    { target: '.topbar', title: 'Your shift at a glance', text: 'How many chats are open, who is waiting on you, how many you’ve closed, and the shift clock. You can pause at any time.' },
    { target: '.rail', title: 'Your tools', text: 'The knowledge base with every company policy, keyboard shortcuts, settings, and End shift.' },
    { title: 'You’re ready!', text: 'When a conversation ends, choose the wrap-up code and close it. Customers get upset if they wait too long, so keep an eye on every chat. Good luck!' }
  ];
  let tour = null;

  function startTourWhenReady() {
    let since = performance.now();
    const check = () => {
      if (ui.view !== 'shift' || !E.st || E.st.ended || tour) return;
      if (rotEl) since = performance.now();          // wait until the phone is sideways
      // ...and for the first customer message, so the tour shows a real conversation
      const c = ui.active && E.get(ui.active);
      const hasMessage = c && c.messages.some(m => m.from === 'customer');
      if (!rotEl && (hasMessage || performance.now() - since > 7000)) startTour();
      else setTimeout(check, 150);
    };
    setTimeout(check, 400);
  }
  function tourEl(s) { return s.target ? document.querySelector(s.target) : null; }
  function isShown(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    return r.width > 40 && r.height > 30 && cs.display !== 'none' && cs.visibility !== 'hidden' && r.left < window.innerWidth - 20 && r.right > 20;
  }
  function startTour() {
    if (tour) return;
    const el = document.createElement('div');
    el.className = 'tour';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'tourTitle');
    el.innerHTML =
      '<div class="tour-shade"></div><div class="tour-shade"></div><div class="tour-shade"></div><div class="tour-shade"></div>' +
      '<div class="tour-ring"></div>' +
      '<div class="tour-card"><div class="tour-body">' +
        '<span class="tour-count"></span><h3 id="tourTitle"></h3><p></p>' +
        '<div class="tour-actions"><button class="tour-skip" data-tour="skip">Skip tour</button>' +
        '<button class="btn btn-primary tour-next" data-tour="next">Continue ' + icon('arrowRight', 16) + '</button></div>' +
      '</div></div>';
    document.body.appendChild(el);
    // Only the parts that exist in this layout (e.g. no side rail on a narrow window)
    const steps = TOUR.filter(s => !s.target || isShown(tourEl(s)) || (s.details && tourEl(s)));
    tour = { el, steps, i: -1, paused: false, openedDetails: false, placed: false };
    if (E.st && !E.st.paused) { E.setPaused(true); tour.paused = true; }
    clearToasts();
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-tour]');
      if (!b || !tour) return;
      if (b.dataset.tour === 'next') tourStep(tour.i + 1); else endTour();
    });
    window.addEventListener('keydown', tourKey, true);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
    setTimeout(() => el.classList.add('on'), 60);
    tourStep(0);
  }
  function tourStep(i) {
    if (!tour) return;
    if (i >= tour.steps.length) { endTour(); return; }
    if (tour.openedDetails) { toggleDetails(false); tour.openedDetails = false; }
    tour.i = i;
    const s = tour.steps[i];
    const card = $('.tour-card', tour.el);
    $('.tour-count', card).textContent = 'Step ' + (i + 1) + ' of ' + tour.steps.length;
    $('#tourTitle', card).textContent = s.title;
    $('p', card).textContent = s.text;
    $('.tour-skip', card).style.visibility = i === tour.steps.length - 1 ? 'hidden' : '';
    const body = $('.tour-body', card);
    body.classList.remove('in');
    void body.offsetWidth;
    body.classList.add('in');
    // On narrower screens the customer file slides in: open it for its step
    if (s.details && !isShown(tourEl(s))) { toggleDetails(true); tour.openedDetails = true; setTimeout(tourLayout, 420); }
    tourLayout();
    const next = $('.tour-next', card);
    try { next.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
  }
  function tourLayout() {
    if (!tour) return;
    const s = tour.steps[tour.i];
    const vw = window.innerWidth, vh = window.innerHeight, pad = 6, m = 12;
    const target = tourEl(s);
    let hole = null;
    if (target && isShown(target)) {
      const b = target.getBoundingClientRect();
      hole = { l: Math.max(0, b.left - pad), t: Math.max(0, b.top - pad), r: Math.min(vw, b.right + pad), b: Math.min(vh, b.bottom + pad) };
    }
    const h = hole || { l: vw / 2, t: vh / 2, r: vw / 2, b: vh / 2 };
    const box = (el, x, y, w, ht) => { el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = Math.max(0, w) + 'px'; el.style.height = Math.max(0, ht) + 'px'; };
    const sh = $$('.tour-shade', tour.el);
    box(sh[0], 0, 0, vw, h.t);
    box(sh[1], 0, h.b, vw, vh - h.b);
    box(sh[2], 0, h.t, h.l, h.b - h.t);
    box(sh[3], h.r, h.t, vw - h.r, h.b - h.t);
    const ring = $('.tour-ring', tour.el);
    box(ring, h.l, h.t, h.r - h.l, h.b - h.t);
    ring.style.opacity = hole ? '1' : '0';
    // The card sits beside the highlighted part, where there's room
    const card = $('.tour-card', tour.el);
    const w = card.offsetWidth, ch = card.offsetHeight;
    let x, y;
    if (!hole) { x = (vw - w) / 2; y = (vh - ch) / 2; }
    else if (vw - h.r >= w + m + 8) { x = h.r + m; y = h.t + (h.b - h.t - ch) / 2; }
    else if (h.l >= w + m + 8) { x = h.l - m - w; y = h.t + (h.b - h.t - ch) / 2; }
    else if (vh - h.b >= ch + 2 * m) { x = h.l + (h.r - h.l - w) / 2; y = h.b + m; }
    else if (h.t >= ch + 2 * m) { x = h.l + (h.r - h.l - w) / 2; y = h.t - m - ch; }
    else { x = h.l + (h.r - h.l - w) / 2; y = h.b - ch - m; }
    x = Math.max(8, Math.min(vw - w - 8, x));
    y = Math.max(8, Math.min(vh - ch - 8, y));
    if (!tour.placed) { card.style.transition = 'none'; tour.placed = true; requestAnimationFrame(() => { card.style.transition = ''; }); }
    card.style.left = Math.round(x) + 'px';
    card.style.top = Math.round(y) + 'px';
  }
  function tourKey(e) {
    if (!tour || e.key === 'Tab' || e.ctrlKey || e.metaKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { sfx('click'); tourStep(tour.i + 1); }
    else if (e.key === 'ArrowLeft' && tour.i > 0) { sfx('click'); tourStep(tour.i - 1); }
    else if (e.key === 'Escape') endTour();
  }
  function endTour() {
    if (!tour) return;
    const t = tour;
    tour = null;
    window.removeEventListener('keydown', tourKey, true);
    if (t.openedDetails) toggleDetails(false);
    t.el.classList.remove('on');
    t.el.classList.add('off');
    setTimeout(() => t.el.remove(), 320);
    if (t.paused) resumeIfFree();
  }
  // Restart the clock only when nothing else is holding it (a menu, the rotate screen, the tour)
  function resumeIfFree() {
    if (ui.view === 'shift' && E.st && !E.st.ended && !ui.modal && !rotEl && !tour) E.setPaused(false);
  }
  window.addEventListener('resize', () => { if (tour) tourLayout(); });

  function updateSoundBtn() {
    const b = $('#soundBtn');
    if (b) b.innerHTML = icon(store.sound ? 'volume' : 'mute', 18);
  }

  function updateTitle() {
    if (ui.view !== 'shift' || !E.st) return;
    const unread = E.st.convs.reduce((s, c) => s + (c.unread || 0), 0);
    document.title = (unread ? '(' + unread + ') ' : '') + 'Team Inbox · Day ' + E.st.day.n + ' · ShiftReady';
    const b = $('#mnavBadge');
    if (b) b.textContent = unread ? String(unread) : '';
  }

  /* ---------- live updates (every tick) ---------- */
  let lastLive = 0;
  function updateLive() {
    const now = performance.now();
    if (now - lastLive < 200) return;
    lastLive = now;
    const st = E.st;
    if (!st) return;
    const clk = $('#clock');
    const t = clockLabel(st.clock);
    if (clk && clk.textContent !== t) clk.textContent = t;
    st.convs.forEach(c => {
      const el = listEls.get(c.id);
      if (!el || !el.isConnected) return;
      updateRing(el, c);
      if (c.status === 'agent') {
        const w = $('[data-wait]', el);
        const v = fmtDur(st.clock - c.turnStart);
        if (w && w.textContent !== v) w.textContent = v;
      }
    });
    const c = activeConv();
    if (c) updateHeaderLive(c);
    if (ui.doc) updateDocLive();
    renderStats();
  }

  /* =========================================================
     REPORT
     ========================================================= */
  function showReport(rep) {
    const d = rep.day;
    const prev = store.progress[d.n];
    const isBest = !prev || rep.score > prev.best;
    store.progress[d.n] = {
      best: Math.max(rep.score, prev ? prev.best : 0),
      stars: Math.max(rep.stars, prev ? prev.stars : 0),
      passed: !!((prev && prev.passed) || rep.passed),
      last: rep.score
    };
    saveStore();
    closeModal(true);
    closeKB();
    closeDoc();
    clearToasts();
    ui.view = 'report';
    endTour();
    updateRotate();
    document.title = 'Shift report · Day ' + d.n + ' · ShiftReady';
    const next = D.days.find(x => x.n === d.n + 1);
    const nextOpen = next && isUnlocked(next.n);
    let headline, sub;
    if (rep.passed) {
      headline = rep.stars === 3 ? 'Outstanding shift!' : rep.stars === 2 ? 'Great shift — well done.' : 'Shift passed.';
      sub = next ? 'You passed Day ' + d.n + '. Day ' + next.n + ' · ' + next.title + ' is unlocked.' : 'You completed the final day of training — you’re ready for the floor.';
    } else {
      headline = 'Shift complete — keep practicing.';
      sub = 'You need a score of 60 or more to pass this day. Review the coaching below and try again.';
    }
    const firstIssue = rep.convs.findIndex(c => c.decisions.some(x => x.q < 3) || !c.dispOk || c.outcome !== 'resolved');
    const actions =
      (rep.passed && next ? '<button class="btn btn-primary btn-lg" data-act="next" data-day="' + next.n + '">Start Day ' + next.n + ' ' + icon('arrowRight', 16) + '</button>' : '') +
      '<button class="btn btn-lg' + (rep.passed && next ? '' : ' btn-primary') + '" data-act="retry" data-day="' + d.n + '">' + icon('rotate', 15) + 'Retry Day ' + d.n + '</button>' +
      '<button class="btn btn-lg btn-ghost" data-act="lobby">' + icon('home', 15) + 'Back to lobby</button>';

    app.innerHTML =
      '<div class="report rp-enter">' +
        '<main class="rp-main">' +
          '<section class="rp-hero">' +
            '<div><span class="eyebrow">Shift report · Day ' + d.n + ' · ' + esc(d.title) + '</span>' +
              '<h1>' + esc(headline) + '</h1><p>' + esc(sub) + '</p>' +
              '<div class="rp-actions">' + actions + '</div></div>' +
            '<div class="rp-score">' + scoreRing(rep.score, rep.passed) +
              '<div class="big-stars">' + [1, 2, 3].map(i => '<span class="' + (i <= rep.stars ? '' : 'off') + '">' + icon('star', 26) + '</span>').join('') + '</div>' +
              (isBest && prev ? '<span class="pill pill-success">' + icon('trending', 12) + 'New personal best</span>' : '<span class="pill pill-neutral">Shift length ' + secs(rep.duration) + '</span>') +
            '</div>' +
          '</section>' +
          '<section class="kpis">' +
            kpi(0, 'users', 'Customers', rep.n, rep.resolved + ' resolved · ' + rep.abandoned + ' left') +
            kpi(1, 'smile', 'Avg. CSAT', rep.avgCsat.toFixed(1) + ' / 5', 'Customer satisfaction') +
            kpi(2, 'target', 'Reply quality', pct(rep.acc), 'Versus the best answers') +
            kpi(3, 'zap', 'First response', secs(rep.frt), 'Avg. time to first reply') +
            kpi(4, 'timer', 'Avg. response', secs(rep.art), 'Across all replies') +
            kpi(5, 'file', 'Wrap-up accuracy', pct(rep.wrap), 'Correct resolution codes') +
          '</section>' +
          '<div class="sec-h"><h2>Conversation review</h2><span>Open a conversation to see every reply with coaching</span></div>' +
          '<section class="rp-convs">' + rep.convs.map((c, i) => convRow(c, i === firstIssue)).join('') + '</section>' +
          '<p class="rp-formula">Score = 45% customer satisfaction · 30% reply quality · 15% resolution rate · 10% wrap-up accuracy &nbsp;·&nbsp; 60+ passes · 75+ ★★ · 90+ ★★★</p>' +
        '</main>' +
      '</div>';
    window.scrollTo(0, 0);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const fg = $('.score-ring .fg');
      if (fg) fg.style.strokeDashoffset = String(100 - rep.score);
    }));
  }

  function scoreRing(score, passed) {
    const color = score >= 90 ? '#12915c' : score >= 75 ? '#2b62e3' : score >= 60 ? '#b07214' : '#cf3a3a';
    return '<div class="score-ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52" pathLength="100"/>' +
      '<circle class="fg" cx="60" cy="60" r="52" pathLength="100" style="stroke:' + color + ';stroke-dashoffset:100"/></svg>' +
      '<div class="num"><b>' + score + '</b><span>' + (passed ? 'Passed' : 'Score / 100') + '</span></div></div>';
  }

  function kpi(k, ic, label, value, sub) {
    return '<div class="kpi" style="--k:' + k + '"><div class="kpi-top">' + icon(ic, 14) + esc(label) + '</div><b>' + esc(value) + '</b><small>' + esc(sub) + '</small></div>';
  }

  function convRow(c, open) {
    const oc = OUTCOMES[c.outcome] || OUTCOMES.resolved;
    const cu = c.sc.customer;
    const chosen = DISP[c.disposition];
    const expected = c.correctDisp.map(id => DISP[id].label).join(' or ');
    return '<div class="rc' + (open ? ' open' : '') + '">' +
      '<button class="rc-h" data-act="rc-toggle">' + avatarHTML(cu, 38) +
        '<span class="rc-id"><b>' + esc(cu.first + ' ' + cu.last) + '</b><span>' + esc(c.sc.topic) + '</span></span>' +
        '<span class="pill pill-' + oc.tone + '">' + icon(oc.icon, 12) + oc.label + '</span>' +
        '<span class="rc-stat"><small>CSAT</small>' + starsHTML(c.csat, 12) + '</span>' +
        '<span class="rc-stat"><small>Quality</small><b>' + pct(c.accuracy) + '</b></span>' +
        '<span class="rc-stat"><small>1st reply</small><b>' + secs(c.firstResponse) + '</b></span>' +
        '<span class="rc-stat"><small>Wrap-up</small><b class="' + (c.dispOk ? 'tone-success' : 'tone-danger') + '">' + icon(c.dispOk ? 'check' : 'x', 14) + (c.dispOk ? 'Correct' : 'Wrong') + '</b></span>' +
        '<span class="chev">' + icon('chevDown', 17) + '</span>' +
      '</button>' +
      '<div class="rc-bw"><div class="rc-bi"><div class="rc-b">' +
        (c.decisions.length ? c.decisions.map(decHTML).join('') : '<p class="muted" style="margin-top:12px">No replies were sent in this conversation.</p>') +
        '<div class="dec wrapdec"><span class="dec-n">' + icon('file', 13) + '</span><span>Wrap-up code: <b>' + esc(chosen ? chosen.label : '—') + '</b>' +
          (c.dispOk ? ' <span class="tone-success">— correct.</span>' : ' — expected <b>' + esc(expected) + '</b>.') + '</span></div>' +
      '</div></div></div></div>';
  }

  function decHTML(d, i) {
    const ql = Q[d.q];
    return '<div class="dec q' + d.q + '"><span class="dec-n">' + (i + 1) + '</span><div class="dec-c">' +
      (d.prompt ? '<div class="dec-q"><span class="lbl">Customer</span><p>“' + esc(d.prompt) + '”</p></div>' : '') +
      '<div class="dec-a"><span class="lbl">Your reply <span class="qpill q' + d.q + '">' + ql.label + '</span><span class="dec-rt">' + icon('timer', 12) + ' ' + secs(d.rt) + '</span></span><p>' + esc(d.chosen) + '</p></div>' +
      (d.fb ? '<div class="dec-fb">' + icon(ql.icon, 14) + '<span>' + esc(d.fb) + '</span></div>' : '') +
      (d.best ? '<div class="dec-best"><span class="lbl">' + icon('sparkle', 12) + 'Best reply</span><p>' + esc(d.best) + '</p></div>' : '') +
    '</div></div>';
  }

  /* =========================================================
     EVENTS
     ========================================================= */
  document.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    const item = e.target.closest('.ci');
    if (item && item.dataset.id) select(item.dataset.id, true);
  });

  document.addEventListener('click', e => {
    if (e.target === overlay && ui.modal) { closeModal(); return; }
    const t = e.target.closest('[data-act]');
    if (!t) return;
    const act = t.dataset.act;
    const c = activeConv();
    switch (act) {
      case 'pick-day': {
        const n = Number(t.dataset.day);
        if (!isUnlocked(n)) return;
        ui.day = n;
        $$('.day-card').forEach(b => b.classList.toggle('on', Number(b.dataset.day) === n));
        $('#brief').innerHTML = briefHTML(n);
        $('#brief .brief-card').classList.add('brief-in');
        break;
      }
      case 'start': startShift(Number(t.dataset.day)); break;
      case 'retry': startShift(Number(t.dataset.day)); break;
      case 'next': ui.day = Number(t.dataset.day); startShift(ui.day); break;
      case 'lobby': renderLobby(); window.scrollTo(0, 0); break;
      case 'unlock-all': store.unlockAll = true; saveStore(); renderLobby(); break;
      case 'reset-progress': openModal('reset'); break;
      case 'confirm-reset':
        store.progress = {}; store.unlockAll = false; saveStore();
        closeModal(true); ui.day = 1; renderLobby();
        break;
      case 'opt': chooseOption(c, Number(t.dataset.i)); break;
      case 'send': sendSelected(); break;
      case 'code': chooseCode(c, t.dataset.code); break;
      case 'close-conv': closeConversation(); break;
      case 'doc': openDoc(t.dataset.doc, t); break;
      case 'doc-tab': if (ui.doc && t.dataset.doc !== ui.doc.key) showDoc(t.dataset.doc, true); break;
      case 'doc-close': closeDoc(); break;
      case 'replay-boot': stopHowto(); if (SR.boot) SR.boot.play({ instant: true }); break;
      case 'howto': if (howto) stopHowto(); else playHowto(); break;
      case 'theme': store.theme = store.theme === 'dark' ? 'light' : 'dark'; saveStore(); applyTheme(); break;
      case 'm-back': case 'm-chats': closeDoc(); setMobileView('list'); break;
      case 'kb': closeDoc(); openKB(t.dataset.key); break;
      case 'kb-close': closeKB(); break;
      case 'sort': ui.sort = ui.sort === 'newest' ? 'waiting' : 'newest'; renderSortLabel(); renderList(); break;
      case 'toggle-closed': ui.closedOpen = !ui.closedOpen; renderList(); break;
      case 'sound': store.sound = !store.sound; saveStore(); updateSoundBtn(); if (store.sound) unlockAudio(); break;
      case 'pause': openModal('pause'); break;
      case 'shortcuts': openModal('shortcuts'); break;
      case 'settings': openModal('settings'); break;
      case 'exit': openModal('exit'); break;
      case 'resume': closeModal(); break;
      case 'confirm-exit': closeModal(true); closeKB(); closeDoc(); E.quit(); renderLobby(); break;
      case 'toggle-details': toggleDetails(); break;
      case 'open-conv': closeDoc(); select(t.dataset.id, true); if (t.classList.contains('toast')) t.remove(); else hideAlarm(); break;
      case 'copy': {
        const txt = t.dataset.copy;
        try { navigator.clipboard.writeText(txt); } catch (err) { /* ignore */ }
        toast({ title: 'Copied', body: txt, icon: 'copy', tone: 'good', ms: 1600 });
        break;
      }
      case 'rc-toggle': t.closest('.rc').classList.toggle('open'); break;
    }
  });

  document.addEventListener('dblclick', e => {
    const t = e.target.closest('.opt');
    if (!t) return;
    const c = activeConv();
    if (!c || c.status !== 'agent') return;
    chooseOption(c, Number(t.dataset.i));
    sendSelected();
  });

  document.addEventListener('input', e => {
    const id = e.target.id;
    if (id === 'search' || id === 'search2') {
      ui.search = e.target.value;
      const other = $(id === 'search' ? '#search2' : '#search');
      if (other && other.value !== ui.search) other.value = ui.search;
      renderList();
    }
    else if (id === 'kbSearch') { ui.kbQuery = e.target.value; const b = $('#kbBody'); if (b) b.innerHTML = kbList(); }
    else if (id === 'agentName') {
      store.agentName = e.target.value.replace(/\s+/g, ' ').trim() || 'Alex Morgan';
      saveStore();
      const chip = $('#meChip');
      if (chip) chip.innerHTML = agentAvatar(28) + '<span>' + esc(store.agentName) + '</span>';
    }
  });

  document.addEventListener('change', e => {
    const key = e.target.dataset && e.target.dataset.setting;
    if (!key) return;
    if (key === 'dark') { store.theme = e.target.checked ? 'dark' : 'light'; saveStore(); applyTheme(); return; }
    store[key] = !!e.target.checked;
    saveStore();
    if (key === 'sound') { updateSoundBtn(); if (store.sound) unlockAudio(); }
    if (key === 'coach' && ui.view === 'shift') { const c = activeConv(); if (c) { renderMessages(c); scrollBottom(true); } }
  });

  document.addEventListener('keydown', e => {
    if (ui.doc && !ui.modal) {
      if (e.key === 'Escape') { e.preventDefault(); closeDoc(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stepDoc(e.key === 'ArrowRight' ? 1 : -1); }
      return;
    }
    if (e.key === 'Escape') {
      if (ui.modal) { closeModal(); return; }
      if (ui.kb) { closeKB(); return; }
      if (ui.detailsOpen) { toggleDetails(false); return; }
      if (document.activeElement && document.activeElement.matches('input')) document.activeElement.blur();
      return;
    }
    if (ui.view !== 'shift' || ui.modal) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.altKey && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); navSound(); cycle(e.key === 'ArrowDown' ? 1 : -1); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'k' || e.key === 'K') { e.preventDefault(); navSound(); openKB(); return; }
    if (e.key === 'p' || e.key === 'P') { e.preventDefault(); sfx('back'); openModal('pause'); return; }
    if (e.key === '?') { navSound(); openModal('shortcuts'); return; }
    if (ui.kb) return;
    const c = activeConv();
    if (!c) return;
    if (c.status === 'agent') {
      if (/^[1-9]$/.test(e.key)) {
        const k = Number(e.key) - 1;
        if (k < c.order.length) { e.preventDefault(); optionSound(); chooseOption(c, c.order[k]); }
      } else if (e.key === 'Enter' && c.selected != null) {
        e.preventDefault();
        confirmSound();
        sendSelected();
      }
    } else if (c.status === 'ended' && e.key === 'Enter' && ui.wrapSel[c.id]) {
      e.preventDefault();
      confirmSound();
      closeConversation();
    }
  });

  function cycle(dir) {
    const items = $$('#convList .ci');
    if (!items.length) return;
    let i = items.findIndex(el => el.dataset.id === ui.active);
    i = i === -1 ? 0 : (i + dir + items.length) % items.length;
    select(items[i].dataset.id);
    items[i].scrollIntoView({ block: 'nearest' });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ui.view === 'shift' && E.st && !E.st.ended && !ui.modal) openModal('pause');
  });

  /* =========================================================
     ENGINE HOOKS
     ========================================================= */
  function needsAttentionNext() {
    if (!E.st) return null;
    const open = E.st.convs.filter(c => c.arrived && c.status !== 'closed' && c.id !== ui.active);
    const waiting = open.filter(c => c.status === 'agent').sort((a, b) => a.turnStart - b.turnStart);
    if (waiting.length) return waiting[0];
    const wrap = open.filter(c => c.status === 'ended');
    if (wrap.length) return wrap[0];
    return open[0] || null;
  }

  E.hooks = {
    arrive(c) {
      if (ui.view !== 'shift') return;
      renderList();
      renderStats();
      const cu = c.sc.customer;
      notifySound();
      if (!ui.active) select(c.id);
      else toast({ title: 'New chat · ' + cu.first + ' ' + cu.last, body: c.sc.topic + ' · via ' + CH[c.sc.channel].label, av: avatarHTML(cu, 34), id: c.id });
      updateTitle();
    },
    message(c, m) {
      if (ui.view !== 'shift') return;
      if (ui.active === c.id) {
        appendMessage(c, m);
        c.unread = 0;
      } else if (m.from === 'customer') {
        if (m.nudge) {
          notifySound({ gain: 0.7 });
          toast({ title: c.sc.customer.first + ' is waiting', body: '“' + m.text + '”', icon: 'timer', tone: 'warn', id: c.id });
        }
      }
      renderList();
      updateTitle();
    },
    typing(c) {
      if (ui.view !== 'shift') return;
      if (ui.active === c.id) {
        renderTyping(c);
        updateHeaderLive(c);
        if (c.status === 'customer') renderComposer(c);
      }
      renderList();
    },
    status(c) {
      if (ui.view !== 'shift') return;
      if (ui.active === c.id) { renderComposer(c); updateHeaderLive(c); renderTyping(c); }
      renderList();
      renderStats();
    },
    turn(c) {
      if (ui.view !== 'shift') return;
      if (ui.active === c.id) { renderComposer(c); updateHeaderLive(c); }
      renderList();
      renderStats();
    },
    end(c) {
      if (ui.view !== 'shift') return;
      if (ui.active === c.id) { renderComposer(c); updateHeaderLive(c); renderTyping(c); }
      if (c.outcome === 'abandoned') alarm(c, 'left');
      renderList();
      renderStats();
    },
    closed(c) {
      if (ui.view !== 'shift') return;
      delete ui.wrapSel[c.id];
      sfx('success', { gain: 0.85 });
      renderList();
      renderStats();
      if (ui.active === c.id) {
        const next = needsAttentionNext();
        if (next) select(next.id);
        else { renderComposer(c); updateHeaderLive(c); }
        if (isPhone()) setMobileView('list');
      }
    },
    angry(c) { alarm(c, 'angry'); },
    tick() { if (ui.view === 'shift') updateLive(); },
    pause() { },
    dayEnd(rep) {
      sfx('success');
      toast({ title: 'All conversations closed', body: 'Preparing your shift report…', icon: 'checkCircle', tone: 'good', ms: 2000 });
      setTimeout(() => { if (ui.view === 'shift') showReport(rep); }, 1500);
    }
  };

  renderLobby();
})();
