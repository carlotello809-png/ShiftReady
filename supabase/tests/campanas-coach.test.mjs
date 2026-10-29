// Coaches create campaigns for the teams they coach and assign them to whole teams or chosen people.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from './helpers.mjs';

const t = await createDb();
const { U, as, rows, count } = t;
const O = {}, TEAM = {}, C = {};
const NEW = 'insert into public.campaigns (org_id, name, days, difficulty, instructions, sources) values ($1, $2, $3, $4, $5, $6::jsonb) returning id';

test('set-up: one company, two teams, a coach of team A and three agents', async () => {
  await t.superadmin('sa', 'sa@shiftready.test');
  for (const [k, e] of [['laura', 'laura@bahia.test'], ['diego', 'diego@bahia.test'], ['ana', 'ana@bahia.test'], ['eva', 'eva@bahia.test'], ['bruno', 'bruno@bahia.test']]) await t.addUser(k, e);
  O.bahia = await t.createOrg('sa', 'Bahía', 'laura');
  TEAM.a = (await rows('laura', 'insert into public.teams (org_id, name) values ($1, $2) returning id', [O.bahia, 'Retail A']))[0].id;
  TEAM.b = (await rows('laura', 'insert into public.teams (org_id, name) values ($1, $2) returning id', [O.bahia, 'Retail B']))[0].id;
  await t.invite('laura', O.bahia, 'diego', 'coach', TEAM.a);
  await t.invite('laura', O.bahia, 'ana', 'agent', TEAM.a);
  await t.invite('laura', O.bahia, 'eva', 'agent', TEAM.a);
  await t.invite('laura', O.bahia, 'bruno', 'agent', TEAM.b);
});

test('a coach creates a campaign with instructions and file names', async () => {
  C.d = (await rows('diego', NEW, [O.bahia, 'Devoluciones', [1, 2], 'medium', 'Clientes molestos', JSON.stringify(['manual.pdf'])], 'aal1'))[0].id;
  const c = (await rows('diego', 'select created_by, instructions, sources from public.campaigns where id = $1', [C.d], 'aal1'))[0];
  assert.equal(c.created_by, U.diego);
  assert.equal(c.instructions, 'Clientes molestos');
  assert.deepEqual(c.sources, ['manual.pdf']);
  await assert.rejects(as('ana', NEW, [O.bahia, 'De la agente', [1], 'easy', '', '[]'], 'aal1'), /row-level security/);
});

test('a coach assigns only to the teams they coach and to people of those teams', async () => {
  const team = 'insert into public.campaign_teams (campaign_id, team_id, org_id) values ($1, $2, $3)';
  const person = 'insert into public.campaign_people (campaign_id, user_id, org_id) values ($1, $2, $3)';
  await as('diego', team, [C.d, TEAM.a, O.bahia], 'aal1');
  await assert.rejects(as('diego', team, [C.d, TEAM.b, O.bahia], 'aal1'), /row-level security/);
  await assert.rejects(as('diego', person, [C.d, U.bruno, O.bahia], 'aal1'), /row-level security/);
  // a second campaign only for Eva
  C.eva = (await rows('diego', NEW, [O.bahia, 'Solo Eva', [3], 'easy', '', '[]'], 'aal1'))[0].id;
  await as('diego', person, [C.eva, U.eva, O.bahia], 'aal1');
});

test('who sees which campaign', async () => {
  assert.equal(await count('ana', 'select count(*) n from public.campaigns', [], 'aal1'), 1);      // through team A
  assert.equal(await count('eva', 'select count(*) n from public.campaigns', [], 'aal1'), 2);      // team A + her own
  assert.equal(await count('bruno', 'select count(*) n from public.campaigns', [], 'aal1'), 0);
  const r = (await rows('eva', 'select * from public.start_session($1, $2, $3, null, null, null)', [O.bahia, C.eva, [3]], 'aal1'))[0];
  assert.deepEqual(r.session_config.days, [3]);
  await assert.rejects(as('ana', 'select * from public.start_session($1, $2, $3, null, null, null)', [O.bahia, C.eva, [3]], 'aal1'), /not_allowed/);
});

test('a coach edits and deletes only their own campaigns', async () => {
  const camp = (await rows('laura', 'insert into public.campaigns (org_id, name, days, difficulty) values ($1, $2, $3, $4) returning id', [O.bahia, 'De la admin', [1], 'medium']))[0].id;
  const r = await as('diego', "update public.campaigns set name = 'Cambiada' where id = $1", [camp], 'aal1');
  assert.equal(r.affectedRows, 0);
  const own = await as('diego', "update public.campaigns set name = 'Devoluciones 2' where id = $1", [C.d], 'aal1');
  assert.equal(own.affectedRows, 1);
  await as('diego', 'delete from public.campaigns where id = $1', [C.eva], 'aal1');
  assert.equal(await count('eva', 'select count(*) n from public.campaigns', [], 'aal1'), 1);
});
