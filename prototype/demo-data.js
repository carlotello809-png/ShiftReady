/* ShiftReady — DEMO DATA for the design prototype.
   Every company, person, number and date here is invented to show the layout.
   None of it comes from a real customer, a real backend or real usage. */
window.PROTO_DEMO = (function () {
  'use strict';

  const orgs = [
    { id: 'bahia', name: 'Bahía Contact Center (demo)', short: 'BC', plan: 'Business', status: 'Activa', seats: 120, seatLimit: 150, admins: 2, coaches: 6, agents: 112, created: '2026-03-12', region: 'México', sessions30: 1840 },
    { id: 'andes', name: 'Andes BPO (demo)', short: 'AB', plan: 'Starter', status: 'Activa', seats: 38, seatLimit: 50, admins: 1, coaches: 2, agents: 35, created: '2026-05-02', region: 'Colombia', sessions30: 410 },
    { id: 'costa', name: 'Costa Retail Care (demo)', short: 'CR', plan: 'Prueba', status: 'Prueba', seats: 9, seatLimit: 25, admins: 1, coaches: 1, agents: 7, created: '2026-10-20', region: 'Perú', sessions30: 52 },
    { id: 'meridian', name: 'Meridian Help Desk (demo)', short: 'MH', plan: 'Business', status: 'Suspendida', seats: 64, seatLimit: 150, admins: 1, coaches: 3, agents: 60, created: '2026-01-18', region: 'Chile', sessions30: 0 },
    { id: 'pampa', name: 'Pampa Soporte (demo)', short: 'PS', plan: 'Enterprise', status: 'Activa', seats: 410, seatLimit: 500, admins: 4, coaches: 18, agents: 388, created: '2025-11-30', region: 'Argentina', sessions30: 6120 }
  ];

  const plans = [
    { id: 'trial', name: 'Prueba', seats: 25, days: '30 días', channels: 'Chat', reports: 'Básicos', sso: false, companies: 1 },
    { id: 'starter', name: 'Starter', seats: 50, days: 'Mensual', channels: 'Chat', reports: 'Básicos', sso: false, companies: 1 },
    { id: 'business', name: 'Business', seats: 150, days: 'Mensual / anual', channels: 'Chat', reports: 'Equipo y campaña', sso: false, companies: 2 },
    { id: 'enterprise', name: 'Enterprise', seats: 'A medida', days: 'Anual', channels: 'Chat · voz (futuro)', reports: 'Avanzados (futuro)', sso: true, companies: 1 }
  ];

  // Bahía Contact Center: the organisation used for the company, coach and agent views
  const people = [
    { id: 'u1', name: 'Laura Méndez', email: 'laura.mendez@bahia.demo', role: 'Administradora de empresa', team: '—', status: 'Activo', last: 'Hoy, 09:12' },
    { id: 'u2', name: 'Marcos Peña', email: 'marcos.pena@bahia.demo', role: 'Administrador de empresa', team: '—', status: 'Activo', last: 'Ayer' },
    { id: 'u3', name: 'Diego Ramos', email: 'diego.ramos@bahia.demo', role: 'Supervisor / coach', team: 'Retail A · Mañana', status: 'Activo', last: 'Hoy, 08:40' },
    { id: 'u4', name: 'Sofía Herrera', email: 'sofia.herrera@bahia.demo', role: 'Supervisor / coach', team: 'Retail B · Tarde', status: 'Activo', last: 'Hace 2 días' },
    { id: 'a1', name: 'Ana Torres', email: 'ana.torres@bahia.demo', role: 'Agente', team: 'Retail A · Mañana', status: 'Activo', last: 'Hoy, 10:05' },
    { id: 'a2', name: 'Bruno Silva', email: 'bruno.silva@bahia.demo', role: 'Agente', team: 'Retail A · Mañana', status: 'Activo', last: 'Hoy, 09:50' },
    { id: 'a3', name: 'Carla Núñez', email: 'carla.nunez@bahia.demo', role: 'Agente', team: 'Retail A · Mañana', status: 'Activo', last: 'Ayer' },
    { id: 'a4', name: 'Daniel Ortega', email: 'daniel.ortega@bahia.demo', role: 'Agente', team: 'Retail A · Mañana', status: 'Activo', last: 'Hace 3 días' },
    { id: 'a5', name: 'Elena Ruiz', email: 'elena.ruiz@bahia.demo', role: 'Agente', team: 'Retail A · Mañana', status: 'Invitado', last: '—' },
    { id: 'a6', name: 'Felipe Castro', email: 'felipe.castro@bahia.demo', role: 'Agente', team: 'Retail B · Tarde', status: 'Activo', last: 'Hoy, 07:58' },
    { id: 'a7', name: 'Gabriela León', email: 'gabriela.leon@bahia.demo', role: 'Agente', team: 'Retail B · Tarde', status: 'Activo', last: 'Ayer' },
    { id: 'a8', name: 'Hugo Paredes', email: 'hugo.paredes@bahia.demo', role: 'Agente', team: 'Retail B · Tarde', status: 'Desactivado', last: 'Hace 40 días' },
    { id: 'a9', name: 'Inés Molina', email: 'ines.molina@bahia.demo', role: 'Agente', team: 'Nuevos ingresos', status: 'Activo', last: 'Hoy, 11:20' },
    { id: 'a10', name: 'Jorge Vidal', email: 'jorge.vidal@bahia.demo', role: 'Agente', team: 'Nuevos ingresos', status: 'Invitado', last: '—' }
  ];

  const teams = [
    { id: 't1', name: 'Retail A · Mañana', coach: 'Diego Ramos', members: 5, campaigns: 2, avg: 78 },
    { id: 't2', name: 'Retail B · Tarde', coach: 'Sofía Herrera', members: 3, campaigns: 1, avg: 71 },
    { id: 't3', name: 'Nuevos ingresos', coach: 'Sin asignar', members: 2, campaigns: 1, avg: null }
  ];

  const invitations = [
    { email: 'elena.ruiz@bahia.demo', role: 'Agente', team: 'Retail A · Mañana', sent: '24 oct', expires: '31 oct', status: 'Pendiente', by: 'Laura Méndez' },
    { email: 'jorge.vidal@bahia.demo', role: 'Agente', team: 'Nuevos ingresos', sent: '25 oct', expires: '1 nov', status: 'Pendiente', by: 'Laura Méndez' },
    { email: 'paula.rios@bahia.demo', role: 'Supervisor / coach', team: 'Nuevos ingresos', sent: '15 oct', expires: '22 oct', status: 'Caducada', by: 'Marcos Peña' },
    { email: 'ines.molina@bahia.demo', role: 'Agente', team: 'Nuevos ingresos', sent: '12 oct', expires: '19 oct', status: 'Aceptada', by: 'Laura Méndez' }
  ];

  // days / difficulty refer to the real training days and levels of the simulator
  const campaigns = [
    { id: 'c1', name: 'Onboarding Retail · semana 1', status: 'Activa', days: [1, 2], difficulty: 'medium', groups: 'Nuevos ingresos', dates: '1–15 nov', done: 1, total: 2, owner: 'Laura Méndez', goal: 'Saludo, verificación de invitados y estado de pedidos.' },
    { id: 'c2', name: 'Clientes difíciles', status: 'Programada', days: [4, 5], difficulty: 'hard', groups: 'Retail A · Mañana', dates: '16–30 nov', done: 0, total: 5, owner: 'Diego Ramos', goal: 'Desescalar, decir que no sin perder al cliente y escalar cuando corresponde.' },
    { id: 'c3', name: 'Repaso de facturación', status: 'Borrador', days: [3], difficulty: 'easy', groups: '—', dates: 'Sin fechas', done: 0, total: 0, owner: 'Laura Méndez', goal: 'Cargos pendientes, reembolsos y ajustes de precio.' },
    { id: 'c4', name: 'Certificación Q3', status: 'Finalizada', days: [1, 2, 3, 4, 5], difficulty: 'medium', groups: 'Retail A · Mañana, Retail B · Tarde', dates: '1–30 sep', done: 7, total: 8, owner: 'Marcos Peña', goal: 'Recorrido completo de los cinco días.' }
  ];

  // Results of one agent (Ana Torres) — invented, to show history and trends
  const agentHistory = [
    { id: 'h6', date: '27 oct', campaign: 'Onboarding Retail · semana 1', days: [1, 2], difficulty: 'medium', score: 183, max: 200, status: 'Aprobado', csat: 4.7, quality: 0.89 },
    { id: 'h5', date: '24 oct', campaign: 'Práctica libre', days: [3], difficulty: 'easy', score: 76, max: 100, status: 'Práctica', csat: 4.1, quality: 0.81 },
    { id: 'h4', date: '21 oct', campaign: 'Onboarding Retail · semana 1', days: [1], difficulty: 'medium', score: 64, max: 100, status: 'Aprobado', csat: 3.7, quality: 0.72 },
    { id: 'h3', date: '17 oct', campaign: 'Práctica libre', days: [1], difficulty: 'easy', score: 58, max: 100, status: 'Práctica', csat: 3.3, quality: 0.66 },
    { id: 'h2', date: '14 oct', campaign: 'Práctica libre', days: [1], difficulty: 'medium', score: 51, max: 100, status: 'No aprobado', csat: 3.0, quality: 0.6 }
  ];

  // Team trend for the coach view (weekly average score, invented)
  const teamTrend = { labels: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'], retailA: [61, 64, 69, 72, 75, 78], retailB: [58, 62, 61, 66, 69, 71] };

  // Per-agent summary for the coach (invented)
  const roster = [
    { id: 'a1', name: 'Ana Torres', sessions: 5, last: 91, avg: 78, trend: '+12', weak: 'Ajustes de precio', status: 'Al día' },
    { id: 'a2', name: 'Bruno Silva', sessions: 4, last: 72, avg: 70, trend: '+4', weak: 'Códigos de cierre', status: 'Al día' },
    { id: 'a3', name: 'Carla Núñez', sessions: 3, last: 58, avg: 61, trend: '−3', weak: 'Verificación de identidad', status: 'Necesita apoyo' },
    { id: 'a4', name: 'Daniel Ortega', sessions: 1, last: 66, avg: 66, trend: '—', weak: 'Tiempo de primera respuesta', status: 'Atrasado' },
    { id: 'a5', name: 'Elena Ruiz', sessions: 0, last: null, avg: null, trend: '—', weak: '—', status: 'Invitación pendiente' }
  ];

  const audit = [
    { when: 'Hoy, 10:14', who: 'Soporte ShiftReady (Rocío G.)', what: 'Acceso de soporte a Andes BPO (demo)', detail: 'Motivo: ticket #1042 · 30 min · aprobado por la empresa', scope: 'Plataforma' },
    { when: 'Hoy, 09:30', who: 'Laura Méndez', what: 'Invitó a jorge.vidal@bahia.demo como Agente', detail: 'Equipo: Nuevos ingresos', scope: 'Empresa' },
    { when: 'Ayer, 18:02', who: 'Superadministrador (Martín A.)', what: 'Cambió el plan de Andes BPO (demo)', detail: 'Starter → Starter (límite 50 → 50) · sin cambio', scope: 'Plataforma' },
    { when: 'Ayer, 16:45', who: 'Marcos Peña', what: 'Desactivó a hugo.paredes@bahia.demo', detail: 'Motivo: baja laboral', scope: 'Empresa' },
    { when: '24 oct, 11:20', who: 'Superadministrador (Martín A.)', what: 'Suspendió Meridian Help Desk (demo)', detail: 'Motivo: incumplimiento de pago', scope: 'Plataforma' }
  ];

  const tickets = [
    { id: '#1042', org: 'Andes BPO (demo)', subject: 'No llegan las invitaciones', priority: 'Alta', status: 'Abierto', updated: 'Hoy' },
    { id: '#1039', org: 'Bahía Contact Center (demo)', subject: 'Exportar resultados de campaña', priority: 'Media', status: 'En espera', updated: 'Ayer' },
    { id: '#1031', org: 'Pampa Soporte (demo)', subject: 'Configurar SSO', priority: 'Media', status: 'Planificado (función futura)', updated: '20 oct' }
  ];

  return { orgs, plans, people, teams, invitations, campaigns, agentHistory, teamTrend, roster, audit, tickets };
})();
