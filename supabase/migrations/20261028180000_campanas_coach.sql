-- ShiftReady — coaches create campaigns for the teams they coach, and campaigns can be assigned to chosen people.
-- Decision (docs/saas/06 §6.4): a coach creates and publishes campaigns for their own teams.
-- Each campaign also keeps the instructions written in the chat and the names of the attached files
-- (the files themselves are not uploaded yet).
begin;

alter table public.campaigns
  add column instructions text not null default '' check (length(instructions) <= 20000),
  add column sources jsonb not null default '[]'::jsonb check (jsonb_typeof(sources) = 'array');

-- People assigned one by one (besides whole teams)
create table public.campaign_people (
  campaign_id  uuid not null,
  user_id      uuid not null,
  org_id       uuid not null,
  primary key (campaign_id, user_id),
  foreign key (campaign_id, org_id) references public.campaigns (id, org_id) on delete cascade,
  foreign key (org_id, user_id) references public.memberships (org_id, user_id) on delete cascade
);
create index campaign_people_user_idx on public.campaign_people (user_id);
create trigger audit_campaign_people after insert or update or delete on public.campaign_people
  for each row execute function private.audit_row_change();

-- The caller coaches a team that includes this person (helper already exists: private.coaches_user)
-- The caller created this campaign and is (still) a coach or admin of its company
create function private.owns_campaign(p_campaign uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.campaigns c where c.id = p_campaign and c.created_by = auth.uid() and private.org_role(c.org_id) in ('coach', 'admin'))
$$;

-- Assigned through a team or one by one
create or replace function private.is_assigned(p_campaign uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.campaign_teams ct
    join public.team_members tm on tm.team_id = ct.team_id and tm.user_id = auth.uid()
    where ct.campaign_id = p_campaign and private.is_org_member(ct.org_id)
  ) or exists (
    select 1 from public.campaign_people cp
    where cp.campaign_id = p_campaign and cp.user_id = auth.uid() and private.is_org_member(cp.org_id)
  )
$$;

-- Campaigns: coaches insert their own and change only their own
create policy campaigns_insert_coach on public.campaigns for insert to authenticated
  with check (private.org_role(org_id) = 'coach' and created_by = auth.uid());
create policy campaigns_update_coach on public.campaigns for update to authenticated
  using (private.owns_campaign(id)) with check (private.org_role(org_id) = 'coach' and created_by = auth.uid());
create policy campaigns_delete_coach on public.campaigns for delete to authenticated
  using (private.owns_campaign(id));

-- Teams: a coach assigns their own campaign only to teams they coach
create policy campaign_teams_insert_coach on public.campaign_teams for insert to authenticated
  with check (private.owns_campaign(campaign_id) and private.is_team_coach(team_id));
create policy campaign_teams_delete_coach on public.campaign_teams for delete to authenticated
  using (private.owns_campaign(campaign_id));

-- People: admins (with two-step) assign anyone of the company; a coach, people of the teams they coach
alter table public.campaign_people enable row level security;
create policy campaign_people_select on public.campaign_people for select to authenticated
  using (user_id = auth.uid() or private.is_org_admin(org_id) or private.owns_campaign(campaign_id) or private.coaches_user(org_id, user_id));
create policy campaign_people_insert on public.campaign_people for insert to authenticated
  with check ((private.is_org_admin(org_id) and private.mfa_satisfied()) or (private.owns_campaign(campaign_id) and private.coaches_user(org_id, user_id)));
create policy campaign_people_delete on public.campaign_people for delete to authenticated
  using ((private.is_org_admin(org_id) and private.mfa_satisfied()) or private.owns_campaign(campaign_id));

revoke all on public.campaign_people from anon, authenticated;
grant select, insert (campaign_id, user_id, org_id), delete on public.campaign_people to authenticated;
grant insert (instructions, sources), update (instructions, sources) on public.campaigns to authenticated;

revoke all on function private.owns_campaign(uuid) from public, anon, authenticated;
grant execute on function private.owns_campaign(uuid), private.is_assigned(uuid) to authenticated;

commit;
