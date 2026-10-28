-- ShiftReady — Stage 3: campaigns, team assignments and training sessions
--
-- Run once in the Supabase SQL editor, after 20261027180000_etapa1_base.sql.
-- A session starts on the server (start_session), which fixes its settings and seed: the
-- campaign's when it belongs to one, otherwise the agent's free-practice choice. The simulator
-- plays it and the agent's browser submits the step-by-step log with the result it computed
-- (submit_session). The server later replays the log with the same engine (assets/js/replay.js)
-- and stores its own result; until then the session shows as "pending verification".
-- Decisions applied: same seed for everyone in a campaign; Easy or a shorter shift still counts
-- for completing a campaign; the pass mark stays 60 (the engine's rule).

begin;

alter table public.organizations add column practice_enabled boolean not null default true;
grant update (practice_enabled) on public.organizations to authenticated;          -- admins, through the existing policy

-- =====================================================================
-- 1. Tables
-- =====================================================================

create table public.campaigns (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations (id) on delete cascade,
  name        text not null check (length(trim(name)) between 2 and 120),
  goal        text not null default '' check (length(goal) <= 500),
  days        integer[] not null check (cardinality(days) >= 1 and days <@ array[1, 2, 3, 4, 5]),
  difficulty  text not null check (difficulty in ('easy', 'medium', 'hard')),
  customers   integer check (customers is null or customers between 1 and 10),
  reply       text not null default 'auto' check (reply in ('auto', 'fast', 'normal', 'slow')),
  seed        bigint not null default floor(random() * 4294967296)::bigint,    -- same customers and order for everyone
  status      text not null default 'active' check (status in ('draft', 'active', 'finished')),
  starts_on   date,
  ends_on     date,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (id, org_id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

create table public.campaign_teams (
  campaign_id  uuid not null,
  team_id      uuid not null,
  org_id       uuid not null,
  primary key (campaign_id, team_id),
  foreign key (campaign_id, org_id) references public.campaigns (id, org_id) on delete cascade,
  foreign key (team_id, org_id) references public.teams (id, org_id) on delete cascade
);
create index campaign_teams_team_idx on public.campaign_teams (team_id);

create table public.training_sessions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null,
  campaign_id     uuid,                                        -- null = free practice
  config          jsonb not null,                              -- { days, difficulty, customers, reply }
  seed            bigint not null,
  status          text not null default 'started' check (status in ('started', 'submitted', 'verified', 'mismatch')),
  final           boolean not null default false,              -- the agent finished or ended the session
  log             jsonb,                                       -- per-day steps and actions from the simulator
  client_report   jsonb,                                       -- what the browser computed (shown until verified)
  server_report   jsonb,                                       -- recomputed by the server
  verify_notes    jsonb,                                       -- differences or problems found by the replay
  score           integer,                                     -- total points (server's once verified)
  max_score       integer,
  result          text,                                        -- passed | failed | practice | incomplete
  started_at      timestamptz not null default now(),
  submitted_at    timestamptz,
  verified_at     timestamptz,
  foreign key (campaign_id, org_id) references public.campaigns (id, org_id) on delete set null (campaign_id),
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade
);
create index training_sessions_user_idx on public.training_sessions (user_id, started_at desc);
create index training_sessions_org_idx on public.training_sessions (org_id, started_at desc);
create index training_sessions_pending_idx on public.training_sessions (status) where status = 'submitted';

-- =====================================================================
-- 2. Helpers and triggers
-- =====================================================================

-- The caller belongs to a team the campaign is assigned to
create function private.is_assigned(p_campaign uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.campaign_teams ct
    join public.team_members tm on tm.team_id = ct.team_id and tm.user_id = auth.uid()
    where ct.campaign_id = p_campaign and private.is_org_member(ct.org_id)
  )
$$;

-- Days are kept sorted and without repeats
create function private.normalize_days() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.days := array(select distinct x from unnest(new.days) x order by x);
  return new;
end $$;
create trigger campaigns_days before insert or update of days on public.campaigns
  for each row execute function private.normalize_days();

create trigger audit_campaigns after insert or update or delete on public.campaigns
  for each row execute function private.audit_row_change();
create trigger audit_campaign_teams after insert or update or delete on public.campaign_teams
  for each row execute function private.audit_row_change();

-- =====================================================================
-- 3. Row level security
-- =====================================================================

alter table public.campaigns         enable row level security;
alter table public.campaign_teams    enable row level security;
alter table public.training_sessions enable row level security;

create policy campaigns_select on public.campaigns for select to authenticated
  using (private.is_org_admin(org_id) or private.org_role(org_id) = 'coach' or private.is_assigned(id) or private.is_superadmin());
create policy campaigns_insert on public.campaigns for insert to authenticated
  with check (private.is_org_admin(org_id) and private.mfa_satisfied());
create policy campaigns_update on public.campaigns for update to authenticated
  using (private.is_org_admin(org_id) and private.mfa_satisfied())
  with check (private.is_org_admin(org_id) and private.mfa_satisfied());
create policy campaigns_delete on public.campaigns for delete to authenticated
  using (private.is_org_admin(org_id) and private.mfa_satisfied());

create policy campaign_teams_select on public.campaign_teams for select to authenticated
  using (private.is_org_member(org_id) or private.is_superadmin());
create policy campaign_teams_insert on public.campaign_teams for insert to authenticated
  with check (private.is_org_admin(org_id) and private.mfa_satisfied());
create policy campaign_teams_delete on public.campaign_teams for delete to authenticated
  using (private.is_org_admin(org_id) and private.mfa_satisfied());

-- Results: the person, the coaches of their teams and the company's admins (not ShiftReady staff)
create policy training_sessions_select on public.training_sessions for select to authenticated
  using (user_id = auth.uid() or private.is_org_admin(org_id) or private.coaches_user(org_id, user_id));

revoke all on public.campaigns, public.campaign_teams, public.training_sessions from anon, authenticated;
grant select on public.campaigns, public.campaign_teams, public.training_sessions to authenticated;
grant insert (org_id, name, goal, days, difficulty, customers, reply, status, starts_on, ends_on),
      update (name, goal, days, difficulty, customers, reply, status, starts_on, ends_on), delete
  on public.campaigns to authenticated;                                  -- never seed or created_by
grant insert (campaign_id, team_id, org_id), delete on public.campaign_teams to authenticated;
-- training_sessions: no direct writes; only start_session / submit_session (and the server's verification)

-- =====================================================================
-- 4. Functions the app calls
-- =====================================================================

-- Starts a session and fixes its settings and seed on the server
create function public.start_session(p_org uuid, p_campaign uuid, p_days integer[], p_difficulty text, p_customers integer, p_reply text)
returns table (new_session_id uuid, session_seed bigint, session_config jsonb, session_started_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_role text := private.org_role(p_org);
  v_c public.campaigns;
  v_days integer[];
  v_cfg jsonb;
  v_seed bigint;
  v_id uuid;
  v_at timestamptz;
begin
  if v_role is null then raise exception 'not_allowed' using errcode = '42501'; end if;
  if (select count(*) from public.training_sessions where user_id = auth.uid() and started_at > now() - interval '1 hour') >= 30 then
    raise exception 'too_many_sessions' using errcode = '54000';
  end if;
  v_days := array(select distinct x from unnest(coalesce(p_days, '{}'::integer[])) x order by x);
  if cardinality(v_days) = 0 or not (v_days <@ array[1, 2, 3, 4, 5]) then raise exception 'invalid_days' using errcode = '22023'; end if;

  if p_campaign is not null then
    select * into v_c from public.campaigns where id = p_campaign and org_id = p_org;
    if not found then raise exception 'not_allowed' using errcode = '42501'; end if;
    if not (private.is_assigned(v_c.id) or v_role in ('admin', 'coach')) then raise exception 'not_allowed' using errcode = '42501'; end if;
    if v_c.status <> 'active' or (v_c.starts_on is not null and current_date < v_c.starts_on) or (v_c.ends_on is not null and current_date > v_c.ends_on) then
      raise exception 'campaign_closed' using errcode = '22023';
    end if;
    if not (v_days <@ v_c.days) then raise exception 'invalid_days' using errcode = '22023'; end if;
    v_cfg := jsonb_build_object('days', to_jsonb(v_days), 'difficulty', v_c.difficulty, 'customers', v_c.customers, 'reply', v_c.reply);
    v_seed := v_c.seed;
  else
    if not coalesce((select practice_enabled from public.organizations where id = p_org), false) then
      raise exception 'practice_disabled' using errcode = '42501';
    end if;
    if p_difficulty is null or p_difficulty not in ('easy', 'medium', 'hard') then raise exception 'invalid_difficulty' using errcode = '22023'; end if;
    if p_customers is not null and (p_customers < 1 or p_customers > 10) then raise exception 'invalid_customers' using errcode = '22023'; end if;
    if coalesce(p_reply, 'auto') not in ('auto', 'fast', 'normal', 'slow') then raise exception 'invalid_reply' using errcode = '22023'; end if;
    v_cfg := jsonb_build_object('days', to_jsonb(v_days), 'difficulty', p_difficulty, 'customers', p_customers, 'reply', coalesce(p_reply, 'auto'));
    v_seed := floor(random() * 4294967296)::bigint;
  end if;

  insert into public.training_sessions (org_id, user_id, campaign_id, config, seed)
  values (p_org, auth.uid(), p_campaign, v_cfg, v_seed)
  returning id, started_at into v_id, v_at;
  return query select v_id, v_seed, v_cfg, v_at;
end $$;

-- The owner sends the simulator's log and the result the browser computed (it can update it
-- day by day until the server has verified it). The score shown is provisional until verified.
create function public.submit_session(p_session uuid, p_log jsonb, p_report jsonb, p_final boolean) returns void
language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_s public.training_sessions;
begin
  select * into v_s from public.training_sessions where id = p_session for update;
  if not found or v_s.user_id is distinct from auth.uid() then raise exception 'not_allowed' using errcode = '42501'; end if;
  if v_s.status in ('verified', 'mismatch') then raise exception 'session_closed' using errcode = '22023'; end if;
  if jsonb_typeof(p_log) is distinct from 'array' or jsonb_typeof(p_report) is distinct from 'object' then raise exception 'invalid_result' using errcode = '22023'; end if;
  if octet_length(p_log::text) > 500000 or octet_length(p_report::text) > 2000000 then raise exception 'result_too_large' using errcode = '54000'; end if;
  update public.training_sessions
     set log = p_log, client_report = p_report, final = coalesce(p_final, false), status = 'submitted', submitted_at = now(),
         score = (p_report ->> 'totalScore')::integer, max_score = (p_report ->> 'maxScore')::integer, result = p_report ->> 'status'
   where id = p_session;
end $$;

revoke all on function public.start_session(uuid, uuid, integer[], text, integer, text), public.submit_session(uuid, jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.start_session(uuid, uuid, integer[], text, integer, text), public.submit_session(uuid, jsonb, jsonb, boolean) to authenticated;
revoke all on function private.is_assigned(uuid), private.normalize_days() from public, anon, authenticated;
grant execute on function private.is_assigned(uuid) to authenticated;     -- used inside the RLS policies

commit;
