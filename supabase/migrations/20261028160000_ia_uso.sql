-- ShiftReady — usage counter for the "generate-training" AI function (limits per address and per day).
-- Only the function writes it, with the service role. Visitors and signed-in users cannot read or write it.
-- Addresses are stored hashed (SHA-256), never in clear.
begin;

create table public.ai_usage (
  id          bigint generated always as identity primary key,
  ip_hash     text not null,
  created_at  timestamptz not null default now()
);
create index ai_usage_ip_idx on public.ai_usage (ip_hash, created_at desc);
create index ai_usage_time_idx on public.ai_usage (created_at desc);

alter table public.ai_usage enable row level security;          -- no policies: closed to the app
revoke all on public.ai_usage from anon, authenticated;
revoke all on sequence public.ai_usage_id_seq from anon, authenticated;

commit;
