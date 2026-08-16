-- Archiving a published plan touches two things that must land together:
--   1. the plan row flips to 'archived'
--   2. its not-yet-started tasks ('scheduled' / 'overdue') disappear from the
--      student's list
-- Tasks the student already worked on (in_progress, submitted, approved, …)
-- are kept, so the learning history survives the plan.
--
-- Unlike sisters_create_plan_with_tasks this function does not need
-- SECURITY DEFINER: every table it touches is family-writable under RLS, so it
-- runs with the caller's rights and the policies stay in force. The explicit
-- checks below only exist to fail with a clear message instead of a silent
-- zero-row update.

begin;

create or replace function public.sisters_archive_plan(
  p_family_id uuid,
  p_plan_id uuid
)
returns integer
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_status text;
  v_removed integer;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.sisters_family_members
    where family_id = p_family_id and user_id = v_actor
  ) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;

  select status into v_status
  from public.sisters_plans
  where id = p_plan_id and family_id = p_family_id
  for update;

  if v_status is null then
    raise exception 'plan not found' using errcode = 'P0002';
  end if;
  if v_status = 'archived' then
    raise exception 'plan already archived' using errcode = '22023';
  end if;

  delete from public.sisters_tasks
  where plan_id = p_plan_id
    and family_id = p_family_id
    and status in ('scheduled', 'overdue');
  get diagnostics v_removed = row_count;

  update public.sisters_plans
  set status = 'archived'
  where id = p_plan_id and family_id = p_family_id;

  return v_removed;
end;
$$;

revoke all on function public.sisters_archive_plan(uuid, uuid) from public;
grant execute on function public.sisters_archive_plan(uuid, uuid) to authenticated;

commit;
