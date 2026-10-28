-- A minimal stand-in for what a Supabase project provides, so the migrations can be tested
-- offline with PGlite (Postgres in WebAssembly). Only used by the tests; never run it in Supabase.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  email               text,
  email_confirmed_at  timestamptz,
  raw_user_meta_data  jsonb not null default '{}'::jsonb
);
create table auth.mfa_factors (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users (id) on delete cascade,
  status   text not null                       -- 'unverified' | 'verified'
);

-- Supabase fills request.jwt.claims from the signed-in user's token
create function auth.jwt() returns jsonb
language sql stable
as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid
language sql stable
as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;

grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;

-- Supabase's default privileges on the public schema (new tables and functions are open
-- to anon and authenticated until a migration says otherwise)
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
