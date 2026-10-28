// Shared set-up for the database tests: Postgres (PGlite) + the Supabase stand-in + every migration,
// and helpers to act as a given person (JWT claims + the authenticated role, like Supabase).
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const here = new URL('.', import.meta.url);
export const read = p => readFileSync(new URL(p, here), 'utf8');

export async function createDb() {
  const db = new PGlite();
  await db.exec(read('./supabase-stub.sql'));
  for (const f of readdirSync(new URL('../migrations/', here)).filter(f => f.endsWith('.sql')).sort()) await db.exec(read('../migrations/' + f));
  const U = {};
  const api = {
    db, U,
    async addUser(key, email, { confirmed = true, mfa = false } = {}) {
      const r = await db.query('insert into auth.users (email, email_confirmed_at, raw_user_meta_data) values ($1, $2::timestamptz, $3::jsonb) returning id',
        [email, confirmed ? new Date().toISOString() : null, JSON.stringify({ full_name: key })]);
      U[key] = r.rows[0].id;
      if (mfa) await db.query("insert into auth.mfa_factors (user_id, status) values ($1, 'verified')", [U[key]]);
      return U[key];
    },
    // Runs one statement as a person (null = an anonymous visitor). aal2 = two-step verification done.
    as(key, sql, params = [], aal = 'aal2') {
      return db.transaction(async tx => {
        const claims = key ? JSON.stringify({ sub: U[key], role: 'authenticated', aal }) : '';
        await tx.query("select set_config('request.jwt.claims', $1, true)", [claims]);
        await tx.exec(key ? 'set local role authenticated' : 'set local role anon');
        return tx.query(sql, params);
      });
    },
    async rows(...a) { return (await api.as(...a)).rows; },
    async count(key, sql, params, aal) { return Number((await api.rows(key, sql, params, aal))[0].n); },
    // A platform superadmin (inserted directly, as the SQL editor would)
    async superadmin(key, email) {
      await api.addUser(key, email, { mfa: true });
      await db.query("insert into public.platform_admins (user_id, role, requested_by, approved_by, reason) values ($1, 'superadmin', 'tests', array['tests'], 'Pruebas automatizadas')", [U[key]]);
    },
    async createOrg(by, name, adminKey, seats = 50) {
      const r = await api.rows(by, 'select * from public.platform_create_org($1, $2, $3, $4)', [name, 'business', seats, adminEmail(adminKey)]);
      await api.as(adminKey, 'select public.accept_invitation($1)', [r[0].invitation_token], 'aal1');
      return r[0].new_org_id;
    },
    async invite(by, org, key, role, team = null) {
      const r = await api.rows(by, 'select * from public.create_invitation($1, $2, $3, $4)', [org, adminEmail(key), role, team]);
      await api.as(key, 'select public.accept_invitation($1)', [r[0].token], 'aal1');
    }
  };
  const emails = {};
  const adminEmail = key => emails[key];
  const addUser = api.addUser;
  api.addUser = async (key, email, o) => { emails[key] = email; return addUser(key, email, o); };
  return api;
}
