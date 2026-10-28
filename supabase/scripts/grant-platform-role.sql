-- ShiftReady — grant a platform role (superadmin or support).
-- Internal procedure, docs/saas/03-acceso-e-invitaciones.md §3.6. There is no screen or API for
-- this on purpose: it only runs from the Supabase SQL editor, by someone with access to the project.
--
-- Before running:
--   1. The person already has an account (signed up with their email and confirmed it).
--   2. They turned on two-step verification (an authenticator app) in their account.
--   3. Two different people approved it. Neither the person nor whoever asked for it can approve.
--      Exception: the very FIRST superadmin of the platform (nobody can approve yet). Then one
--      approver is enough and it is recorded as the initial set-up.
-- Fill in the values below and run the whole block.

do $$
declare
  v_email        text   := 'persona@tu-dominio.com';                 -- who receives the role
  v_role         text   := 'superadmin';                             -- 'superadmin' or 'support'
  v_requested_by text   := 'solicitante@tu-dominio.com';             -- who asked for it
  v_approvers    text[] := array['aprobador1@tu-dominio.com', 'aprobador2@tu-dominio.com'];
  v_reason       text   := 'Motivo y, si es temporal, hasta cuándo';
  v_uid          uuid;
  v_first        boolean;
begin
  if v_role not in ('superadmin', 'support') then raise exception 'El rol debe ser superadmin o support'; end if;
  if length(trim(v_reason)) < 5 then raise exception 'Escribe el motivo'; end if;

  select id into v_uid from auth.users where lower(email) = lower(v_email) and email_confirmed_at is not null;
  if v_uid is null then raise exception 'No existe una cuenta confirmada con el correo %', v_email; end if;

  if not exists (select 1 from auth.mfa_factors where user_id = v_uid and status = 'verified') then
    raise exception 'La persona debe activar antes la verificación en dos pasos';
  end if;

  v_first := v_role = 'superadmin' and not exists (select 1 from public.platform_admins where role = 'superadmin');
  if v_first then
    if cardinality(v_approvers) < 1 then raise exception 'Indica quién aprueba el arranque inicial'; end if;
    v_reason := 'Arranque inicial de la plataforma. ' || v_reason;
  else
    if (select count(distinct lower(a)) from unnest(v_approvers) a) < 2 then
      raise exception 'Hacen falta dos aprobadores distintos';
    end if;
    if exists (select 1 from unnest(v_approvers) a where lower(a) in (lower(v_email), lower(v_requested_by))) then
      raise exception 'Ni la persona ni quien lo solicita pueden aprobarlo';
    end if;
  end if;

  insert into public.platform_admins (user_id, role, requested_by, approved_by, reason)
  values (v_uid, v_role, v_requested_by, v_approvers, v_reason)
  on conflict (user_id) do update
    set role = excluded.role, granted_at = now(), requested_by = excluded.requested_by,
        approved_by = excluded.approved_by, reason = excluded.reason;
  -- the audit trigger on platform_admins records the change

  raise notice 'Rol % asignado a % (%).', v_role, v_email, case when v_first then 'arranque inicial' else 'doble aprobación' end;
end $$;

-- To remove a platform role later (also recorded in the audit log):
--   delete from public.platform_admins where user_id = (select id from auth.users where lower(email) = lower('persona@tu-dominio.com'));
