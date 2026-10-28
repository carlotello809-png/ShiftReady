// Stage 1 database rules, tested on real Postgres (PGlite) with a stand-in for Supabase's auth.
// Each check signs in as one person (JWT claims + the `authenticated` role, as Supabase does)
// and confirms what that person can and cannot see or change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const here = new URL('.', import.meta.url);
const read = p => readFileSync(new URL(p, here), 'utf8');

const db = new PGlite();
await db.exec(read('./supabase-stub.sql'));
for (const f of readdirSync(new URL('../migrations/', here)).filter(f => f.endsWith('.sql')).sort()) {
  await db.exec(read('../migrations/' + f));
}

const U = {};     // person key -> user id
const T = {};     // invitation tokens
const O = {};     // organisation ids
const TEAM = {};

async function addUser(key, email, { confirmed = true, mfa = false } = {}) {
  const r = await db.query(
    'insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ($1, $2::timestamptz, $3::jsonb) returning id',
    [email, confirmed ? new Date().toISOString() : null, JSON.stringify({ full_name: key })]);
  U[key] = r.rows[0].id;
  if (mfa) await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [U[key]]);
}

// Run one statement as a person (null = an anonymous visitor). aal2 = two-step verification done.
async function as(key, sql, params = [], aal = 'aal2') {
  return db.transaction(async tx => {
    const claims = key ? JSON.stringify({ sub: U[key], role: 'authenticated', aal }) : '';
    await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
    await tx.exec(key ? 'set local role authenticated' : 'set local role anon');
    return tx.query(sql, params);
  });
}
const rows = async (...a) => (await as(...a)).rows;
const count = async (key, sql, params, aal) => Number((await rows(key, sql, params, aal))[0].n);

function grantScript({ email, role = 'superadmin', requestedBy, approvers, reason = 'Prueba automatizada' }) {
  return read('../scripts/grant-platform-role.sql')
    .replace("'persona@tu-dominio.com';", `'${email}';`)
    .replace("'superadmin';", `'${role}';`)
    .replace("'solicitante@tu-dominio.com';", `'${requestedBy}';`)
    .replace("array['aprobador1@tu-dominio.com', 'aprobador2@tu-dominio.com']", 'array[' + approvers.map(a => `'${a}'`).join(', ') + ']')
    .replace("'Motivo y, si es temporal, hasta cuándo';", `'${reason}';`);
}

async function invite(by, org, email, role, team = null) {
  const r = await rows(by, 'select * from public.create_invitation($1, $2, $3, $4)', [org, email, role, team]);
  return r[0].token;
}
const accept = (key, token) => as(key, 'select public.accept_invitation($1) as org', [token], 'aal1');

test('set-up: people and the first superadmin', async () => {
  await addUser('sa', 'martin@shiftready.test');
  await addUser('laura', 'laura@bahia.test');
  await addUser('marcos', 'marcos@bahia.test');
  await addUser('diego', 'diego@bahia.test');
  await addUser('ana', 'ana@bahia.test');
  await addUser('bruno', 'bruno@bahia.test');
  await addUser('jorge', 'jorge@bahia.test', { confirmed: false });
  await addUser('tomas', 'tomas@andes.test');
  await addUser('cami', 'cami@costa.test');
  await addUser('mallory', 'mallory@evil.test');

  // a new account gets a profile and nothing else
  assert.equal(await count('mallory', 'select count(*) n from public.profiles'), 1);
  assert.equal((await rows('mallory', 'select * from public.my_workspaces()')).length, 0);

  // the platform role needs two-step verification first
  await assert.rejects(db.exec(grantScript({ email: 'martin@shiftready.test', requestedBy: 'martin@shiftready.test', approvers: ['martin@shiftready.test'] })), /verificación en dos pasos/);
  await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [U.sa]);
  await db.exec(grantScript({ email: 'martin@shiftready.test', requestedBy: 'martin@shiftready.test', approvers: ['martin@shiftready.test'] }));
  const pa = (await db.query('select role, reason from public.platform_admins')).rows;
  assert.equal(pa.length, 1);
  assert.match(pa[0].reason, /Arranque inicial/);
});

test('after the first one, a platform role needs two distinct approvers who are not the person', async () => {
  await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [U.mallory]);
  await assert.rejects(db.exec(grantScript({ email: 'mallory@evil.test', role: 'support', requestedBy: 'mallory@evil.test', approvers: ['a@shiftready.test'] })), /dos aprobadores distintos/);
  await assert.rejects(db.exec(grantScript({ email: 'mallory@evil.test', role: 'support', requestedBy: 'x@shiftready.test', approvers: ['mallory@evil.test', 'b@shiftready.test'] })), /Ni la persona/);
  assert.equal(Number((await db.query('select count(*) n from public.platform_admins')).rows[0].n), 1);
});

test('nobody can give themselves a platform role or a membership from the app', async () => {
  await assert.rejects(as('mallory', "insert into public.platform_admins (user_id, role, requested_by, approved_by, reason) values ($1, 'superadmin', 'me', array['me'], 'because')", [U.mallory]), /permission denied/);
  await assert.rejects(as('mallory', "insert into public.organizations (name) values ('Mía')"), /permission denied/);
});

test('only a superadmin with two-step verification creates companies', async () => {
  await assert.rejects(as('sa', "select * from public.platform_create_org('Bahía', 'business', 150, 'laura@bahia.test')", [], 'aal1'), /not_allowed/);
  await assert.rejects(as('laura', "select * from public.platform_create_org('Falsa', 'business', 150, 'laura@bahia.test')"), /not_allowed/);
  let r = await rows('sa', "select * from public.platform_create_org('Bahía Contact Center', 'business', 150, 'laura@bahia.test')");
  O.bahia = r[0].new_org_id; T.laura = r[0].invitation_token;
  r = await rows('sa', "select * from public.platform_create_org('Andes BPO', 'starter', 50, 'tomas@andes.test')");
  O.andes = r[0].new_org_id; T.tomas = r[0].invitation_token;
  r = await rows('sa', "select * from public.platform_create_org('Costa Retail', 'trial', 2, 'cami@costa.test')");
  O.costa = r[0].new_org_id; T.cami = r[0].invitation_token;
  assert.equal(T.laura.length, 64);
});

test('the invitation screen shows a masked address and nothing without a valid code', async () => {
  const p = await rows(null, 'select * from public.get_invitation_preview($1)', [T.laura]);
  assert.equal(p.length, 1);
  assert.equal(p[0].org_name, 'Bahía Contact Center');
  assert.equal(p[0].role, 'admin');
  assert.equal(p[0].email_hint, 'l•••@bahia.test');
  assert.equal(p[0].valid, true);
  assert.equal((await rows(null, 'select * from public.get_invitation_preview($1)', ['not-a-real-code'])).length, 0);
  await assert.rejects(as(null, 'select * from public.organizations'), /permission denied/);
});

test('accepting: right person, confirmed email, valid code', async () => {
  await assert.rejects(accept('mallory', T.laura), /email_mismatch/);
  await accept('laura', T.laura);
  await accept('tomas', T.tomas);
  await accept('cami', T.cami);
  await assert.rejects(accept('laura', T.laura), /invitation_invalid/);          // a code works once
  const ws = await rows('laura', 'select * from public.my_workspaces()');
  assert.deepEqual(ws.map(w => [w.org_name, w.role]), [['Bahía Contact Center', 'admin']]);
});

test('company admins need two-step verification to change anything', async () => {
  await assert.rejects(as('laura', 'insert into public.teams (org_id, name) values ($1, $2)', [O.bahia, 'Retail A'], 'aal1'), /row-level security/);
  await assert.rejects(as('laura', 'select * from public.create_invitation($1, $2, $3)', [O.bahia, 'x@bahia.test', 'agent'], 'aal1'), /mfa_required/);
  TEAM.a = (await rows('laura', 'insert into public.teams (org_id, name) values ($1, $2) returning id', [O.bahia, 'Retail A']))[0].id;
  TEAM.b = (await rows('laura', 'insert into public.teams (org_id, name) values ($1, $2) returning id', [O.bahia, 'Retail B']))[0].id;
});

test('building the Bahía team through invitations', async () => {
  await accept('diego', await invite('laura', O.bahia, 'diego@bahia.test', 'coach', TEAM.a));
  await accept('ana', await invite('laura', O.bahia, 'ana@bahia.test', 'agent', TEAM.a));
  await accept('bruno', await invite('laura', O.bahia, 'bruno@bahia.test', 'agent', TEAM.b));
  await accept('marcos', await invite('laura', O.bahia, 'MARCOS@bahia.test ', 'admin'));
  const roles = await rows('laura', 'select p.email, m.role from public.memberships m join public.profiles p on p.id = m.user_id where m.org_id = $1 order by p.email', [O.bahia]);
  assert.deepEqual(roles.map(r => r.role), ['agent', 'agent', 'coach', 'admin', 'admin']);
  const coach = await rows('laura', 'select team_role from public.team_members where team_id = $1 and user_id = $2', [TEAM.a, U.diego]);
  assert.equal(coach[0].team_role, 'coach');
  await assert.rejects(invite('laura', O.bahia, 'ana@bahia.test', 'agent'), /already_member/);
});

test('email must be confirmed; expired and replaced codes stop working', async () => {
  const t1 = await invite('laura', O.bahia, 'jorge@bahia.test', 'agent', TEAM.b);
  await assert.rejects(accept('jorge', t1), /email_not_confirmed/);
  const t2 = await invite('laura', O.bahia, 'jorge@bahia.test', 'agent', TEAM.b);       // replaces t1
  await db.query('update auth.users set email_confirmed_at = now() where id = $1', [U.jorge]);
  await assert.rejects(accept('jorge', t1), /invitation_invalid/);
  await db.query("update public.invitations set expires_at = now() - interval '1 minute' where email = 'jorge@bahia.test' and status = 'pending'");
  await assert.rejects(accept('jorge', t2), /invitation_invalid/);
  const p = await rows(null, 'select valid from public.get_invitation_preview($1)', [t2]);
  assert.equal(p[0].valid, false);
});

test('a coach invites agents only, and only to the teams they coach', async () => {
  const ok = await invite('diego', O.bahia, 'nuevo@bahia.test', 'agent', TEAM.a);
  assert.equal(ok.length, 64);
  await assert.rejects(invite('diego', O.bahia, 'otro@bahia.test', 'coach', TEAM.a), /not_allowed/);
  await assert.rejects(invite('diego', O.bahia, 'otro@bahia.test', 'admin', TEAM.a), /not_allowed/);
  await assert.rejects(invite('diego', O.bahia, 'otro@bahia.test', 'agent', TEAM.b), /not_allowed/);
  await assert.rejects(invite('diego', O.bahia, 'otro@bahia.test', 'agent', null), /not_allowed/);
  await assert.rejects(invite('ana', O.bahia, 'otro@bahia.test', 'agent', TEAM.a), /not_allowed/);
  // the coach sees and can revoke their own invitations, not the admin's
  const mine = await rows('diego', 'select id, email from public.invitations');
  assert.deepEqual(mine.map(i => i.email), ['nuevo@bahia.test']);
  await as('diego', 'select public.revoke_invitation($1)', [mine[0].id], 'aal1');
  const lauras = await rows('laura', "select id from public.invitations where invited_by = $1 and status = 'pending' limit 1", [U.laura]);
  if (lauras.length) await assert.rejects(as('diego', 'select public.revoke_invitation($1)', [lauras[0].id], 'aal1'), /not_allowed/);
});

test('companies are isolated from each other', async () => {
  assert.equal(await count('tomas', 'select count(*) n from public.organizations where id = $1', [O.bahia]), 0);
  assert.equal(await count('tomas', 'select count(*) n from public.memberships where org_id = $1', [O.bahia]), 0);
  assert.equal(await count('tomas', 'select count(*) n from public.teams where org_id = $1', [O.bahia]), 0);
  assert.equal(await count('tomas', 'select count(*) n from public.profiles where id = $1', [U.laura]), 0);
  assert.equal(await count('tomas', 'select count(*) n from public.audit_log where org_id = $1', [O.bahia]), 0);
  await assert.rejects(invite('tomas', O.bahia, 'spy@andes.test', 'admin'), /not_allowed/);
  const m = await db.query('select id from public.memberships where org_id = $1 and user_id = $2', [O.bahia, U.ana]);
  await assert.rejects(as('tomas', "select public.set_member_role($1, 'admin')", [m.rows[0].id]), /not_allowed/);
  await assert.rejects(as('tomas', 'insert into public.teams (org_id, name) values ($1, $2)', [O.bahia, 'Intrusos']), /row-level security/);
});

test('an agent sees only themselves and their coach', async () => {
  assert.equal(await count('ana', 'select count(*) n from public.memberships'), 1);
  const profiles = await rows('ana', 'select email from public.profiles order by email');
  assert.deepEqual(profiles.map(p => p.email), ['ana@bahia.test', 'diego@bahia.test']);
  assert.equal(await count('ana', 'select count(*) n from public.invitations'), 0);
  assert.equal(await count('ana', 'select count(*) n from public.audit_log'), 0);
  assert.equal(await count('ana', 'select count(*) n from public.team_members'), 1);
  assert.equal(await count('ana', 'select count(*) n from public.teams'), 2);        // team names only
});

test('a coach sees the people of their teams, not other teams', async () => {
  const profiles = await rows('diego', 'select email from public.profiles order by email');
  assert.deepEqual(profiles.map(p => p.email), ['ana@bahia.test', 'diego@bahia.test']);
  const members = await rows('diego', 'select user_id from public.memberships');
  assert.deepEqual(members.map(m => m.user_id).sort(), [U.ana, U.diego].sort());
  assert.equal(await count('diego', 'select count(*) n from public.team_members where team_id = $1', [TEAM.b]), 0);
});

test('admins cannot change plan, seats or status, nor bypass the functions', async () => {
  await assert.rejects(as('laura', 'update public.organizations set seat_limit = 9999 where id = $1', [O.bahia]), /permission denied/);
  await assert.rejects(as('laura', "update public.organizations set status = 'active', plan = 'enterprise' where id = $1", [O.bahia]), /permission denied/);
  const r = await as('laura', "update public.organizations set name = 'Bahía CC' where id = $1", [O.bahia]);
  assert.equal(r.affectedRows, 1);
  await assert.rejects(as('laura', "insert into public.memberships (org_id, user_id, role) values ($1, $2, 'admin')", [O.bahia, U.mallory]), /permission denied/);
  await assert.rejects(as('laura', "update public.memberships set role = 'admin' where user_id = $1", [U.ana]), /permission denied/);
  await assert.rejects(as('laura', 'select token_hash from public.invitations'), /permission denied/);
  await assert.rejects(as('laura', 'delete from public.audit_log'), /permission denied/);
  await assert.rejects(as('laura', "update public.audit_log set action = 'nada'"), /permission denied/);
});

test('the last active admin cannot be demoted or disabled', async () => {
  const m = (await db.query('select id from public.memberships where org_id = $1 and user_id = $2', [O.andes, U.tomas])).rows[0].id;
  await assert.rejects(as('tomas', "select public.set_member_role($1, 'agent')", [m]), /last_admin/);
  await assert.rejects(as('tomas', "select public.set_member_status($1, 'disabled')", [m]), /last_admin/);
  // with a second admin, it is allowed
  const mm = (await db.query('select id from public.memberships where org_id = $1 and user_id = $2', [O.bahia, U.marcos])).rows[0].id;
  await as('laura', "select public.set_member_role($1, 'coach')", [mm]);
  await as('laura', "select public.set_member_role($1, 'admin')", [mm]);
});

test('seat limit counts members and pending invitations', async () => {
  await invite('cami', O.costa, 'uno@costa.test', 'agent');
  await assert.rejects(invite('cami', O.costa, 'dos@costa.test', 'agent'), /seat_limit/);
});

test('suspending a company needs a reason, cuts access and is audited', async () => {
  await assert.rejects(as('sa', "select public.platform_set_org_status($1, 'suspended', '')", [O.bahia]), /reason_required/);
  await as('sa', "select public.platform_set_org_status($1, 'suspended', 'Prueba de suspensión')", [O.bahia]);
  assert.equal(await count('laura', 'select count(*) n from public.teams'), 0);
  assert.equal(await count('ana', 'select count(*) n from public.organizations'), 0);
  const ws = await rows('laura', 'select org_status from public.my_workspaces()');
  assert.equal(ws[0].org_status, 'suspended');
  await assert.rejects(invite('laura', O.bahia, 'x@bahia.test', 'agent'), /not_allowed/);
  const a = (await db.query("select detail from public.audit_log where action = 'organizations.update' and org_id = $1 order by id desc limit 1", [O.bahia])).rows[0];
  assert.equal(a.detail.reason, 'Prueba de suspensión');
  assert.equal(a.detail.status.to, 'suspended');
  await as('sa', "select public.platform_set_org_status($1, 'active', 'Fin de la prueba')", [O.bahia]);
  assert.equal(await count('laura', 'select count(*) n from public.teams'), 2);
});

test('a coach turned agent loses the coach seat and what came with it', async () => {
  const m = (await db.query('select id from public.memberships where org_id = $1 and user_id = $2', [O.bahia, U.diego])).rows[0].id;
  await as('laura', "select public.set_member_role($1, 'agent')", [m]);
  assert.equal(await count('diego', 'select count(*) n from public.profiles where id = $1', [U.ana]), 0);
  await assert.rejects(as('laura', "update public.team_members set team_role = 'coach' where user_id = $1", [U.diego]), /coach_role_required/);
});

test('audit: complete, per company, without invitation codes, and platform staff need two-step', async () => {
  const actions = await rows('laura', 'select distinct action from public.audit_log where org_id = $1', [O.bahia]);
  for (const a of ['organizations.insert', 'invitations.insert', 'memberships.insert', 'team_members.insert', 'teams.insert', 'memberships.update']) {
    assert.ok(actions.some(r => r.action === a), 'missing ' + a);
  }
  const join = (await db.query("select actor_id from public.audit_log where action = 'memberships.insert' and detail ->> 'user_id' = $1", [U.ana])).rows[0];
  assert.equal(join.actor_id, U.ana);
  assert.equal(Number((await db.query("select count(*) n from public.audit_log where detail ? 'token_hash'")).rows[0].n), 0);
  assert.ok(await count('sa', 'select count(*) n from public.organizations') >= 3);
  assert.equal(await count('sa', 'select count(*) n from public.organizations', [], 'aal1'), 0);
  assert.ok(Number((await db.query("select count(*) n from public.audit_log where action = 'platform_admins.insert'")).rows[0].n) >= 1);
});
