// Stage 3 database rules: campaigns, team assignments and training sessions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from './helpers.mjs';

const t = await createDb();
const { U, as, rows, count, db } = t;
const O = {}, TEAM = {}, C = {}, S = {};

const LOG = JSON.stringify([{ n: 1, attempt: 0, steps: 900, actions: [[100, 's', 'd1-daniel', 1]] }]);
const REPORT = s => JSON.stringify({ totalScore: s, maxScore: 100, status: s >= 60 ? 'passed' : 'failed', perDay: [{ n: 1, score: s }] });

test('set-up: two companies, two teams, a coach and two agents', async () => {
  await t.superadmin('sa', 'sa@shiftready.test');
  for (const [k, e] of [['laura', 'laura@bahia.test'], ['diego', 'diego@bahia.test'], ['ana', 'ana@bahia.test'], ['bruno', 'bruno@bahia.test'], ['tomas', 'tomas@andes.test']]) await t.addUser(k, e);
  O.bahia = await t.createOrg('sa', 'Bahía', 'laura');
  O.andes = await t.createOrg('sa', 'Andes', 'tomas');
  TEAM.a = (await rows('laura', 'insert into public.teams (org_id, name) values ($1, $2) returning id', [O.bahia, 'Retail A']))[0].id;
  TEAM.b = (await rows('laura', 'insert into public.teams (org_id, name) values ($1, $2) returning id', [O.bahia, 'Retail B']))[0].id;
  await t.invite('laura', O.bahia, 'diego', 'coach', TEAM.a);
  await t.invite('laura', O.bahia, 'ana', 'agent', TEAM.a);
  await t.invite('laura', O.bahia, 'bruno', 'agent', TEAM.b);
});

test('only admins with two-step verification create and assign campaigns; days are normalised', async () => {
  const sql = 'insert into public.campaigns (org_id, name, days, difficulty) values ($1, $2, $3, $4) returning id, days, seed';
  await assert.rejects(as('laura', sql, [O.bahia, 'Sin 2 pasos', [1], 'medium'], 'aal1'), /row-level security/);
  // Since 20261028180000_campanas_coach.sql a coach may create campaigns (their own); see campanas-coach.test.mjs
  await assert.rejects(as('diego', 'insert into public.campaigns (org_id, name, days, difficulty, created_by) values ($1, $2, $3, $4, $5)', [O.bahia, 'A nombre de otra', [1], 'medium', U.laura]), /row-level security|permission denied/);
  await assert.rejects(as('ana', sql, [O.bahia, 'De la agente', [1], 'medium']), /row-level security/);
  await assert.rejects(as('laura', 'insert into public.campaigns (org_id, name, days, difficulty, seed) values ($1, $2, $3, $4, 1)', [O.bahia, 'Semilla', [1], 'medium']), /permission denied/);
  const c = (await rows('laura', sql, [O.bahia, 'Onboarding', [2, 1, 2], 'medium']))[0];
  assert.deepEqual(c.days, [1, 2]);
  assert.ok(Number(c.seed) >= 0);
  C.onb = c.id;
  await as('laura', 'insert into public.campaign_teams (campaign_id, team_id, org_id) values ($1, $2, $3)', [C.onb, TEAM.a, O.bahia]);
  await assert.rejects(as('tomas', sql, [O.bahia, 'Intrusa', [1], 'easy']), /row-level security/);
  await assert.rejects(as('laura', 'insert into public.campaign_teams (campaign_id, team_id, org_id) values ($1, $2, $3)', [C.onb, TEAM.a, O.andes]), /violates|row-level/);
});

test('who sees a campaign: its assigned teams, coaches and admins of the company', async () => {
  assert.equal(await count('ana', 'select count(*) n from public.campaigns'), 1);
  assert.equal(await count('bruno', 'select count(*) n from public.campaigns'), 0);
  assert.equal(await count('diego', 'select count(*) n from public.campaigns'), 1);
  assert.equal(await count('tomas', 'select count(*) n from public.campaigns'), 0);
});

test('starting a campaign session: settings and seed come from the campaign', async () => {
  const r = (await rows('ana', 'select * from public.start_session($1, $2, $3, $4, $5, $6)', [O.bahia, C.onb, [2], 'easy', 1, 'slow'], 'aal1'))[0];
  assert.deepEqual(r.session_config, { days: [2], difficulty: 'medium', customers: null, reply: 'auto' });
  const camp = (await db.query('select seed from public.campaigns where id = $1', [C.onb])).rows[0];
  assert.equal(String(r.session_seed), String(camp.seed));
  S.ana = r.new_session_id;
  await assert.rejects(as('ana', 'select * from public.start_session($1, $2, $3, null, null, null)', [O.bahia, C.onb, [3]], 'aal1'), /invalid_days/);
  await assert.rejects(as('bruno', 'select * from public.start_session($1, $2, $3, null, null, null)', [O.bahia, C.onb, [1]], 'aal1'), /not_allowed/);
  await assert.rejects(as('tomas', 'select * from public.start_session($1, $2, $3, null, null, null)', [O.bahia, C.onb, [1]], 'aal1'), /not_allowed/);
});

test('free practice: the agent chooses, the server draws the seed; the company can turn it off', async () => {
  const r = (await rows('bruno', 'select * from public.start_session($1, null, $2, $3, $4, $5)', [O.bahia, [3, 1], 'hard', 2, 'fast'], 'aal1'))[0];
  assert.deepEqual(r.session_config, { days: [1, 3], difficulty: 'hard', customers: 2, reply: 'fast' });
  S.bruno = r.new_session_id;
  await assert.rejects(as('bruno', 'select * from public.start_session($1, null, $2, $3, null, null)', [O.bahia, [1], 'impossible'], 'aal1'), /invalid_difficulty/);
  await assert.rejects(as('bruno', 'select * from public.start_session($1, null, $2, $3, $4, null)', [O.bahia, [1], 'easy', 99], 'aal1'), /invalid_customers/);
  await assert.rejects(as('bruno', 'select * from public.start_session($1, null, $2, $3, null, null)', [O.bahia, [9], 'easy'], 'aal1'), /invalid_days/);
  await as('laura', 'update public.organizations set practice_enabled = false where id = $1', [O.bahia]);
  await assert.rejects(as('bruno', 'select * from public.start_session($1, null, $2, $3, null, null)', [O.bahia, [1], 'easy'], 'aal1'), /practice_disabled/);
  await as('laura', 'update public.organizations set practice_enabled = true where id = $1', [O.bahia]);
});

test('a closed campaign cannot be played', async () => {
  await as('laura', "update public.campaigns set status = 'finished' where id = $1", [C.onb]);
  await assert.rejects(as('ana', 'select * from public.start_session($1, $2, $3, null, null, null)', [O.bahia, C.onb, [1]], 'aal1'), /campaign_closed/);
  await as('laura', "update public.campaigns set status = 'active' where id = $1", [C.onb]);
});

test('only the owner submits, while it is not verified; no direct writes', async () => {
  await as('ana', 'select public.submit_session($1, $2::jsonb, $3::jsonb, true)', [S.ana, LOG, REPORT(88)], 'aal1');
  const s = (await db.query('select status, score, max_score, result, final from public.training_sessions where id = $1', [S.ana])).rows[0];
  assert.deepEqual(s, { status: 'submitted', score: 88, max_score: 100, result: 'passed', final: true });
  await assert.rejects(as('bruno', 'select public.submit_session($1, $2::jsonb, $3::jsonb, true)', [S.ana, LOG, REPORT(100)], 'aal1'), /not_allowed/);
  await assert.rejects(as('laura', 'select public.submit_session($1, $2::jsonb, $3::jsonb, true)', [S.ana, LOG, REPORT(100)]), /not_allowed/);
  await assert.rejects(as('ana', 'select public.submit_session($1, $2::jsonb, $3::jsonb, true)', [S.ana, '{}', REPORT(90)], 'aal1'), /invalid_result/);
  await assert.rejects(as('ana', "update public.training_sessions set score = 100 where id = $1", [S.ana], 'aal1'), /permission denied/);
  await assert.rejects(as('ana', "insert into public.training_sessions (org_id, user_id, config, seed) values ($1, $2, '{}', 1)", [O.bahia, U.ana], 'aal1'), /permission denied/);
  await db.query("update public.training_sessions set status = 'verified' where id = $1", [S.ana]);       // as the server would
  await assert.rejects(as('ana', 'select public.submit_session($1, $2::jsonb, $3::jsonb, true)', [S.ana, LOG, REPORT(100)], 'aal1'), /session_closed/);
});

test('who sees results: the person, their team coaches and the company admins', async () => {
  assert.equal(await count('ana', 'select count(*) n from public.training_sessions'), 1);
  assert.equal(await count('bruno', 'select count(*) n from public.training_sessions'), 1);
  assert.equal(await count('diego', 'select count(*) n from public.training_sessions where user_id = $1', [U.ana]), 1);
  assert.equal(await count('diego', 'select count(*) n from public.training_sessions where user_id = $1', [U.bruno]), 0);
  assert.equal(await count('laura', 'select count(*) n from public.training_sessions'), 2);
  assert.equal(await count('tomas', 'select count(*) n from public.training_sessions'), 0);
  assert.equal(await count('sa', 'select count(*) n from public.training_sessions'), 0);
  await assert.rejects(as(null, 'select * from public.training_sessions'), /permission denied/);
});

test('too many sessions in an hour are refused', async () => {
  let refused = false;
  for (let i = 0; i < 31 && !refused; i++) {
    try { await as('bruno', 'select * from public.start_session($1, null, $2, $3, null, null)', [O.bahia, [1], 'easy'], 'aal1'); }
    catch (e) { refused = /too_many_sessions/.test(e.message); if (!refused) throw e; }
  }
  assert.ok(refused);
});

test('campaign changes are audited for the company', async () => {
  const actions = (await rows('laura', 'select distinct action from public.audit_log where org_id = $1', [O.bahia])).map(r => r.action);
  for (const a of ['campaigns.insert', 'campaign_teams.insert', 'campaigns.update']) assert.ok(actions.includes(a), 'missing ' + a);
});
