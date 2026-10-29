-- ShiftReady — AI usage per account: visitors get one free try (one day); signed-in people get a daily allowance.
-- user_id is null for visitors. Written only by the generate-training function (service role).
begin;
alter table public.ai_usage add column user_id uuid references auth.users (id) on delete set null;
create index ai_usage_user_idx on public.ai_usage (user_id, created_at desc);
commit;
