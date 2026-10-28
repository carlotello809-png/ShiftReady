-- ShiftReady — Stage 1: server base (companies, people, roles, teams, invitations, audit)
--
-- Run once in the Supabase SQL editor (or with `supabase db push`). See supabase/README.md.
-- Every rule lives in the database:
--   * row level security (RLS) on every table: each company only ever sees its own rows;
--   * changes to roles, members and invitations go through functions that check who is calling;
--   * the audit log is written by triggers, never by the app, and cannot be edited from it.
-- Hiding a button in the interface is never the protection (docs/saas/02-roles-y-permisos.md).
--
-- Decisions applied (docs/saas/06 §6.4, 27 Oct 2026): companies are created by ShiftReady;
-- a coach invites agents only, and only to the teams they coach; administrators need two-step
-- verification (aal2) to change anything; no public sign-up ever grants a role.

begin;

create schema if not exists private;          -- helpers, not exposed by the Data API
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- =====================================================================
-- 1. Tables
-- =====================================================================

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) between 2 and 120),
  plan        text not null default 'trial' check (plan in ('trial', 'starter', 'business', 'enterprise')),
  status      text not null default 'trial' check (status in ('active', 'trial', 'suspended')),
  seat_limit  integer not null default 25 check (seat_limit > 0),
  timezone    text not null default 'America/Mexico_City',
  locale      text not null default 'es' check (locale in ('es', 'en')),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);

-- One row per account, created automatically when someone signs up
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null default '',
  full_name   text not null default '' check (length(full_name) <= 120),
  locale      text not null default 'es' check (locale in ('es', 'en')),
  theme       text not null default 'system' check (theme in ('system', 'light', 'dark')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ShiftReady staff. Written only from the SQL editor with supabase/scripts/grant-platform-role.sql
create table public.platform_admins (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         text not null check (role in ('superadmin', 'support')),
  granted_at   timestamptz not null default now(),
  requested_by text not null,
  approved_by  text[] not null check (cardinality(approved_by) >= 1),
  reason       text not null check (length(trim(reason)) >= 5)
);

-- A person's role inside one company
create table public.memberships (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('admin', 'coach', 'agent')),
  status      text not null default 'active' check (status in ('active', 'disabled')),
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);
create index memberships_user_idx on public.memberships (user_id);

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null check (length(trim(name)) between 1 and 80),
  created_at  timestamptz not null default now(),
  unique (org_id, name),
  unique (id, org_id)
);

-- The foreign keys guarantee the team and the person belong to the same company
create table public.team_members (
  team_id     uuid not null,
  org_id      uuid not null,
  user_id     uuid not null,
  team_role   text not null default 'member' check (team_role in ('coach', 'member')),
  created_at  timestamptz not null default now(),
  primary key (team_id, user_id),
  foreign key (team_id, org_id) references public.teams (id, org_id) on delete cascade,
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade
);
create index team_members_user_idx on public.team_members (user_id);

-- Only a hash of the invitation code is stored; the code itself travels in the link
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null references public.organizations (id) on delete cascade,
  email        text not null check (email = lower(trim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role         text not null check (role in ('admin', 'coach', 'agent')),
  team_id      uuid,
  token_hash   text not null unique,
  invited_by   uuid references auth.users (id) on delete set null,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_by  uuid references auth.users (id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  foreign key (team_id, org_id) references public.teams (id, org_id) on delete set null (team_id)
);
create unique index invitations_one_pending_idx on public.invitations (org_id, email) where status = 'pending';

-- org_id null = a platform-level event. No foreign keys, so records outlive what they describe.
create table public.audit_log (
  id            bigint generated always as identity primary key,
  org_id        uuid,
  actor_id      uuid,                 -- null = system or the SQL editor
  action        text not null,
  target_table  text,
  target_id     text,
  detail        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);
create index audit_log_org_idx on public.audit_log (org_id, created_at desc);

-- =====================================================================
-- 2. Helpers (private schema, SECURITY DEFINER so they can read past RLS)
-- =====================================================================

create function private.mfa_satisfied() returns boolean
language sql stable set search_path = ''
as $$ select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' $$;

create function private.require_mfa() returns void
language plpgsql stable set search_path = ''
as $$
begin
  if not private.mfa_satisfied() then
    raise exception 'mfa_required' using errcode = '42501', hint = 'Two-step verification is required for this action.';
  end if;
end $$;

create function private.platform_role() returns text
language sql stable security definer set search_path = ''
as $$ select role from public.platform_admins where user_id = auth.uid() $$;

-- Platform powers always require two-step verification
create function private.is_superadmin() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.mfa_satisfied() and coalesce(private.platform_role() = 'superadmin', false) $$;

create function private.is_platform_staff() returns boolean
language sql stable security definer set search_path = ''
as $$ select private.mfa_satisfied() and private.platform_role() is not null $$;

-- The caller's role in a company: null when not an active member or the company is suspended
create function private.org_role(p_org uuid) returns text
language sql stable security definer set search_path = ''
as $$
  select m.role
  from public.memberships m
  join public.organizations o on o.id = m.org_id
  where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active' and o.status <> 'suspended'
$$;

create function private.is_org_member(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select private.org_role(p_org) is not null $$;

create function private.is_org_admin(p_org uuid) returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(private.org_role(p_org) = 'admin', false) $$;

create function private.is_team_coach(p_team uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = p_team and tm.user_id = auth.uid() and tm.team_role = 'coach'
      and private.org_role(tm.org_id) in ('coach', 'admin')
  )
$$;

-- The caller coaches a team that includes this person
create function private.coaches_user(p_org uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.team_members tm
    where tm.org_id = p_org and tm.user_id = p_user and private.is_team_coach(tm.team_id)
  )
$$;

-- Who can see someone's profile: themselves, an admin of a company they belong to, a coach of
-- one of their teams, a person whose team they coach (agents see their coach), and superadmins
create function private.can_see_user(p_user uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select p_user = auth.uid()
    or private.is_superadmin()
    or exists (select 1 from public.memberships m where m.user_id = p_user and private.is_org_admin(m.org_id))
    or exists (select 1 from public.team_members tm where tm.user_id = p_user and private.is_team_coach(tm.team_id))
    or exists (
      select 1 from public.team_members mine
      join public.team_members theirs on theirs.team_id = mine.team_id
      where mine.user_id = auth.uid() and theirs.user_id = p_user and theirs.team_role = 'coach'
        and private.is_org_member(mine.org_id)
    )
$$;

create function private.active_admins(p_org uuid) returns integer
language sql stable security definer set search_path = ''
as $$ select count(*)::int from public.memberships where org_id = p_org and role = 'admin' and status = 'active' $$;

create function private.hash_token(p_token text) returns text
language sql immutable set search_path = ''
as $$ select encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex') $$;

-- =====================================================================
-- 3. Triggers
-- =====================================================================

-- Profile for every new account (the account alone grants nothing: no company, no role)
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(lower(new.email), ''), left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.profiles set email = coalesce(lower(new.email), ''), updated_at = now() where id = new.id;
  return new;
end $$;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function private.handle_user_email_change();

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$ begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Only coaches (or admins) can hold the coach seat of a team
create function private.check_team_coach() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.team_role = 'coach' and not exists (
    select 1 from public.memberships
    where org_id = new.org_id and user_id = new.user_id and role in ('coach', 'admin')
  ) then
    raise exception 'coach_role_required' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger team_members_coach_check before insert or update of team_role on public.team_members
  for each row execute function private.check_team_coach();

-- Audit: every change to these tables, with who did it. A reason can be attached with
-- set_config('app.audit_reason', ..., true) inside the same transaction.
create function private.audit_row_change() returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) - 'token_hash' end;
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) - 'token_hash' end;
  v_row jsonb := coalesce(v_new, v_old);
  v_detail jsonb;
  v_reason text := nullif(current_setting('app.audit_reason', true), '');
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(key, jsonb_build_object('from', v_old -> key, 'to', value)), '{}'::jsonb)
      into v_detail
      from jsonb_each(v_new)
      where (v_old -> key) is distinct from value;
    if v_detail = '{}'::jsonb then return null; end if;
  else
    v_detail := v_row;
  end if;
  if v_reason is not null then v_detail := v_detail || jsonb_build_object('reason', v_reason); end if;
  insert into public.audit_log (org_id, actor_id, action, target_table, target_id, detail)
  values (
    case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid else (v_row ->> 'org_id')::uuid end,
    auth.uid(),
    tg_table_name || '.' || lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', concat_ws(':', v_row ->> 'team_id', v_row ->> 'user_id')),
    v_detail
  );
  return null;
end $$;

create trigger audit_organizations after insert or update or delete on public.organizations
  for each row execute function private.audit_row_change();
create trigger audit_memberships after insert or update or delete on public.memberships
  for each row execute function private.audit_row_change();
create trigger audit_teams after insert or update or delete on public.teams
  for each row execute function private.audit_row_change();
create trigger audit_team_members after insert or update or delete on public.team_members
  for each row execute function private.audit_row_change();
create trigger audit_invitations after insert or update or delete on public.invitations
  for each row execute function private.audit_row_change();
create trigger audit_platform_admins after insert or update or delete on public.platform_admins
  for each row execute function private.audit_row_change();

-- =====================================================================
-- 4. Row level security
-- =====================================================================

alter table public.organizations   enable row level security;
alter table public.profiles        enable row level security;
alter table public.platform_admins enable row level security;
alter table public.memberships     enable row level security;
alter table public.teams           enable row level security;
alter table public.team_members    enable row level security;
alter table public.invitations     enable row level security;
alter table public.audit_log       enable row level security;

create policy organizations_select on public.organizations for select to authenticated
  using (private.is_org_member(id) or private.is_platform_staff());
create policy organizations_update on public.organizations for update to authenticated
  using (private.is_org_admin(id) and private.mfa_satisfied())
  with check (private.is_org_admin(id) and private.mfa_satisfied());

create policy profiles_select on public.profiles for select to authenticated
  using (private.can_see_user(id));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy platform_admins_select on public.platform_admins for select to authenticated
  using (user_id = auth.uid() or private.is_superadmin());

create policy memberships_select on public.memberships for select to authenticated
  using (user_id = auth.uid() or private.is_org_admin(org_id) or private.coaches_user(org_id, user_id) or private.is_superadmin());

create policy teams_select on public.teams for select to authenticated
  using (private.is_org_member(org_id) or private.is_superadmin());
create policy teams_insert on public.teams for insert to authenticated
  with check (private.is_org_admin(org_id) and private.mfa_satisfied());
create policy teams_update on public.teams for update to authenticated
  using (private.is_org_admin(org_id) and private.mfa_satisfied())
  with check (private.is_org_admin(org_id) and private.mfa_satisfied());
create policy teams_delete on public.teams for delete to authenticated
  using (private.is_org_admin(org_id) and private.mfa_satisfied());

create policy team_members_select on public.team_members for select to authenticated
  using (user_id = auth.uid() or private.is_org_admin(org_id) or private.is_team_coach(team_id) or private.is_superadmin());
create policy team_members_insert on public.team_members for insert to authenticated
  with check (private.is_org_admin(org_id) and private.mfa_satisfied());
create policy team_members_update on public.team_members for update to authenticated
  using (private.is_org_admin(org_id) and private.mfa_satisfied())
  with check (private.is_org_admin(org_id) and private.mfa_satisfied());
create policy team_members_delete on public.team_members for delete to authenticated
  using (private.is_org_admin(org_id) and private.mfa_satisfied());

create policy invitations_select on public.invitations for select to authenticated
  using (private.is_org_admin(org_id) or (invited_by = auth.uid() and private.is_org_member(org_id)) or private.is_superadmin());

create policy audit_log_select on public.audit_log for select to authenticated
  using ((org_id is not null and private.is_org_admin(org_id)) or private.is_superadmin());

-- Table privileges: nothing for visitors (anon); the minimum for signed-in users.
-- Columns such as plan, seat_limit, status or role can only change through the functions below.
revoke all on public.organizations, public.profiles, public.platform_admins, public.memberships,
  public.teams, public.team_members, public.invitations, public.audit_log from anon, authenticated;
revoke all on sequence public.audit_log_id_seq from anon, authenticated;

grant select on public.organizations, public.profiles, public.platform_admins, public.memberships,
  public.teams, public.team_members, public.audit_log to authenticated;
grant select (id, org_id, email, role, team_id, invited_by, status, expires_at, accepted_by, accepted_at, created_at)
  on public.invitations to authenticated;                                  -- never token_hash
grant update (name, timezone, locale) on public.organizations to authenticated;
grant update (full_name, locale, theme) on public.profiles to authenticated;
grant insert (org_id, name), update (name), delete on public.teams to authenticated;
grant insert (team_id, org_id, user_id, team_role), update (team_role), delete on public.team_members to authenticated;

-- =====================================================================
-- 5. Functions the app calls (RPC)
-- =====================================================================

-- Internal: creates the invitation once the caller has been checked. Returns the code once.
create function private.issue_invitation(p_org uuid, p_email text, p_role text, p_team uuid)
returns table (invitation_id uuid, token text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_org public.organizations;
  v_id uuid;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  select * into v_org from public.organizations where id = p_org for update;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_org.status = 'suspended' then raise exception 'org_suspended' using errcode = '42501'; end if;
  if exists (
    select 1 from public.memberships m join auth.users u on u.id = m.user_id
    where m.org_id = p_org and lower(u.email) = v_email
  ) then
    raise exception 'already_member' using errcode = '23505';
  end if;
  -- a new invitation replaces an older pending one for the same address
  update public.invitations set status = 'revoked' where org_id = p_org and email = v_email and status = 'pending';
  if (select count(*) from public.memberships where org_id = p_org and status = 'active')
     + (select count(*) from public.invitations where org_id = p_org and status = 'pending' and expires_at > now())
     >= v_org.seat_limit then
    raise exception 'seat_limit' using errcode = '23514';
  end if;
  insert into public.invitations (org_id, email, role, team_id, token_hash, invited_by)
  values (p_org, v_email, p_role, p_team, private.hash_token(v_token), auth.uid())
  returning id into v_id;
  return query select v_id, v_token;
end $$;

-- Admins invite any company role; a coach invites agents to a team they coach
create function public.create_invitation(p_org uuid, p_email text, p_role text, p_team uuid default null)
returns table (invitation_id uuid, token text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_caller text := private.org_role(p_org);
begin
  if v_caller = 'admin' then
    perform private.require_mfa();
    if p_role is null or p_role not in ('admin', 'coach', 'agent') then
      raise exception 'invalid_role' using errcode = '22023';
    end if;
  elsif v_caller = 'coach' then
    if p_role is distinct from 'agent' or p_team is null or not private.is_team_coach(p_team) then
      raise exception 'not_allowed' using errcode = '42501';
    end if;
  else
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_team is not null and not exists (select 1 from public.teams where id = p_team and org_id = p_org) then
    raise exception 'invalid_team' using errcode = '22023';
  end if;
  return query select i.invitation_id, i.token from private.issue_invitation(p_org, p_email, p_role, p_team) i;
end $$;

create function public.revoke_invitation(p_invitation uuid) returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_inv public.invitations;
begin
  select * into v_inv from public.invitations where id = p_invitation for update;
  if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
  if private.is_org_admin(v_inv.org_id) then
    perform private.require_mfa();
  elsif not (v_inv.invited_by = auth.uid() and private.org_role(v_inv.org_id) = 'coach') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_inv.status <> 'pending' then raise exception 'invitation_not_pending' using errcode = '22023'; end if;
  update public.invitations set status = 'revoked' where id = p_invitation;
end $$;

-- What the invitation screen shows before signing in. Reveals nothing without the code,
-- and only a masked address with it.
create function public.get_invitation_preview(p_token text)
returns table (org_name text, role text, team_name text, invited_by_name text, email_hint text, expires_at timestamptz, valid boolean)
language sql stable security definer set search_path = ''
as $$
  select o.name,
         i.role,
         t.name,
         nullif(p.full_name, ''),
         left(i.email, 1) || '•••@' || split_part(i.email, '@', 2),
         i.expires_at,
         i.status = 'pending' and i.expires_at > now() and o.status <> 'suspended'
  from public.invitations i
  join public.organizations o on o.id = i.org_id
  left join public.teams t on t.id = i.team_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = private.hash_token(p_token)
$$;

-- The signed-in person accepts. The role comes from the stored invitation, never from the request.
create function public.accept_invitation(p_token text) returns uuid
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_user record;
  v_inv public.invitations;
  v_mem public.memberships;
  v_org public.organizations;
  v_role text;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select email, email_confirmed_at into v_user from auth.users where id = v_uid;
  select * into v_inv from public.invitations where token_hash = private.hash_token(p_token) for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'invitation_invalid' using errcode = '22023';   -- same message for unknown, used, revoked or expired
  end if;
  if lower(coalesce(v_user.email, '')) <> v_inv.email then
    raise exception 'email_mismatch' using errcode = '42501';
  end if;
  if v_user.email_confirmed_at is null then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;
  select * into v_org from public.organizations where id = v_inv.org_id for update;
  if v_org.status = 'suspended' then raise exception 'org_suspended' using errcode = '42501'; end if;

  select * into v_mem from public.memberships where org_id = v_inv.org_id and user_id = v_uid;
  if found then
    if v_mem.status = 'disabled' then raise exception 'membership_disabled' using errcode = '42501'; end if;
    v_role := v_mem.role;                  -- an invitation never changes an existing role
  else
    if (select count(*) from public.memberships where org_id = v_inv.org_id and status = 'active') >= v_org.seat_limit then
      raise exception 'seat_limit' using errcode = '23514';
    end if;
    insert into public.memberships (org_id, user_id, role, invited_by) values (v_inv.org_id, v_uid, v_inv.role, v_inv.invited_by);
    v_role := v_inv.role;
  end if;

  if v_inv.team_id is not null then
    insert into public.team_members (team_id, org_id, user_id, team_role)
    values (v_inv.team_id, v_inv.org_id, v_uid, case when v_inv.role = 'coach' and v_role in ('coach', 'admin') then 'coach' else 'member' end)
    on conflict (team_id, user_id) do nothing;
  end if;
  update public.invitations set status = 'accepted', accepted_by = v_uid, accepted_at = now() where id = v_inv.id;
  return v_inv.org_id;
end $$;

-- Change someone's role inside a company. Never the last active admin; never a platform role.
create function public.set_member_role(p_membership uuid, p_role text) returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_mem public.memberships;
begin
  select * into v_mem from public.memberships where id = p_membership for update;
  if not found or not private.is_org_admin(v_mem.org_id) then raise exception 'not_allowed' using errcode = '42501'; end if;
  perform private.require_mfa();
  if p_role is null or p_role not in ('admin', 'coach', 'agent') then raise exception 'invalid_role' using errcode = '22023'; end if;
  if v_mem.role = 'admin' and p_role <> 'admin' and v_mem.status = 'active' and private.active_admins(v_mem.org_id) <= 1 then
    raise exception 'last_admin' using errcode = '23514';
  end if;
  update public.memberships set role = p_role where id = p_membership;
  if p_role = 'agent' then          -- an agent cannot keep a coach seat
    update public.team_members set team_role = 'member'
    where org_id = v_mem.org_id and user_id = v_mem.user_id and team_role = 'coach';
  end if;
end $$;

create function public.set_member_status(p_membership uuid, p_status text) returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_mem public.memberships;
begin
  select * into v_mem from public.memberships where id = p_membership for update;
  if not found or not private.is_org_admin(v_mem.org_id) then raise exception 'not_allowed' using errcode = '42501'; end if;
  perform private.require_mfa();
  if p_status is null or p_status not in ('active', 'disabled') then raise exception 'invalid_status' using errcode = '22023'; end if;
  if p_status = 'disabled' and v_mem.role = 'admin' and v_mem.status = 'active' and private.active_admins(v_mem.org_id) <= 1 then
    raise exception 'last_admin' using errcode = '23514';
  end if;
  update public.memberships set status = p_status where id = p_membership;
end $$;

-- The companies and roles of the signed-in person (workspace picker)
create function public.my_workspaces()
returns table (org_id uuid, org_name text, org_status text, role text, membership_status text)
language sql stable security definer set search_path = ''
as $$
  select o.id, o.name, o.status, m.role, m.status
  from public.memberships m join public.organizations o on o.id = m.org_id
  where m.user_id = auth.uid()
  order by o.name
$$;

-- ----- Platform (superadmin, always with two-step verification) -----

create function public.platform_create_org(p_name text, p_plan text, p_seat_limit integer, p_admin_email text)
returns table (new_org_id uuid, invitation_token text)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_org uuid;
begin
  if not private.is_superadmin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  insert into public.organizations (name, plan, status, seat_limit, created_by)
  values (trim(p_name), p_plan, case when p_plan = 'trial' then 'trial' else 'active' end, p_seat_limit, auth.uid())
  returning id into v_org;
  return query select v_org, i.token from private.issue_invitation(v_org, p_admin_email, 'admin', null) i;
end $$;

create function public.platform_set_org_status(p_org uuid, p_status text, p_reason text) returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not private.is_superadmin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  perform set_config('app.audit_reason', trim(p_reason), true);
  update public.organizations set status = p_status where id = p_org;
  if not found then raise exception 'not_found' using errcode = '22023'; end if;
end $$;

create function public.platform_update_plan(p_org uuid, p_plan text, p_seat_limit integer, p_reason text) returns void
language plpgsql volatile security definer set search_path = ''
as $$
begin
  if not private.is_superadmin() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if length(trim(coalesce(p_reason, ''))) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  perform set_config('app.audit_reason', trim(p_reason), true);
  update public.organizations set plan = p_plan, seat_limit = p_seat_limit where id = p_org;
  if not found then raise exception 'not_found' using errcode = '22023'; end if;
end $$;

-- =====================================================================
-- 6. Function privileges (Postgres lets everyone run new functions by default)
-- =====================================================================

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function
  private.mfa_satisfied(), private.platform_role(), private.is_superadmin(), private.is_platform_staff(),
  private.org_role(uuid), private.is_org_member(uuid), private.is_org_admin(uuid), private.is_team_coach(uuid),
  private.coaches_user(uuid, uuid), private.can_see_user(uuid)
  to authenticated;                     -- used inside the RLS policies

revoke all on function
  public.create_invitation(uuid, text, text, uuid), public.revoke_invitation(uuid), public.get_invitation_preview(text),
  public.accept_invitation(text), public.set_member_role(uuid, text), public.set_member_status(uuid, text),
  public.my_workspaces(), public.platform_create_org(text, text, integer, text),
  public.platform_set_org_status(uuid, text, text), public.platform_update_plan(uuid, text, integer, text)
  from public, anon, authenticated;
grant execute on function
  public.create_invitation(uuid, text, text, uuid), public.revoke_invitation(uuid), public.get_invitation_preview(text),
  public.accept_invitation(text), public.set_member_role(uuid, text), public.set_member_status(uuid, text),
  public.my_workspaces(), public.platform_create_org(text, text, integer, text),
  public.platform_set_org_status(uuid, text, text), public.platform_update_plan(uuid, text, integer, text)
  to authenticated;
grant execute on function public.get_invitation_preview(text) to anon;

commit;
