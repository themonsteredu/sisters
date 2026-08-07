-- Publishing a plan writes three things that must land together:
--   1. the sisters_plans row
--   2. one sisters_tasks row per scheduled unit
--   3. a sisters_plan_versions snapshot
--
-- supabase-js has no multi-statement transaction, and the compensating-delete
-- pattern used in src/app/onboarding/actions.ts is fragile. A function gives us
-- a real transaction.
--
-- SECURITY DEFINER is required because 202608070001_tighten_rls.sql made
-- sisters_plan_versions read-only for family members. The membership check
-- below is therefore load-bearing: it is the authorization for the whole
-- function. search_path is pinned so the body cannot be hijacked by a
-- caller-controlled schema.

begin;

create or replace function public.sisters_create_plan_with_tasks(
  p_family_id uuid,
  p_student_id uuid,
  p_subject_id uuid,
  p_title text,
  p_period_start date,
  p_period_end date,
  p_tasks jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
  v_actor uuid := auth.uid();
  v_task_count integer;
begin
  if v_actor is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  -- Authorization: the caller must belong to the family they are writing to.
  if not exists (
    select 1 from public.sisters_family_members
    where family_id = p_family_id and user_id = v_actor
  ) then
    raise exception 'not a member of this family' using errcode = '42501';
  end if;

  -- The student and subject must belong to that same family, so a valid member
  -- cannot graft another family's rows onto their plan.
  if not exists (
    select 1 from public.sisters_students
    where id = p_student_id and family_id = p_family_id
  ) then
    raise exception 'student does not belong to this family' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.sisters_subjects
    where id = p_subject_id and family_id = p_family_id
  ) then
    raise exception 'subject does not belong to this family' using errcode = '42501';
  end if;

  if p_period_end < p_period_start then
    raise exception 'period_end must not precede period_start' using errcode = '22007';
  end if;

  select count(*) into v_task_count from jsonb_array_elements(p_tasks);
  if v_task_count = 0 then
    raise exception 'a plan needs at least one task' using errcode = '22023';
  end if;
  if v_task_count > 400 then
    raise exception 'a plan cannot contain more than 400 tasks' using errcode = '22023';
  end if;

  insert into public.sisters_plans (
    family_id, student_id, title, period_start, period_end, status, version, created_by, published_at
  )
  values (
    p_family_id, p_student_id, p_title, p_period_start, p_period_end, 'published', 1, v_actor, now()
  )
  returning id into v_plan_id;

  insert into public.sisters_tasks (
    family_id, student_id, plan_id, subject_id, task_type, title, detail,
    scheduled_date, estimated_minutes, status, evidence_requirements, source_id
  )
  select
    p_family_id,
    p_student_id,
    v_plan_id,
    p_subject_id,
    (task->>'task_type')::public.sisters_task_type,
    task->>'title',
    coalesce(task->>'detail', ''),
    (task->>'scheduled_date')::date,
    coalesce((task->>'estimated_minutes')::integer, 30),
    'scheduled',
    coalesce(task->'evidence_requirements', '["check"]'::jsonb),
    nullif(task->>'source_id', '')::uuid
  from jsonb_array_elements(p_tasks) as task;

  insert into public.sisters_plan_versions (family_id, plan_id, version, snapshot, changed_by)
  values (
    p_family_id,
    v_plan_id,
    1,
    jsonb_build_object(
      'title', p_title,
      'student_id', p_student_id,
      'subject_id', p_subject_id,
      'period_start', p_period_start,
      'period_end', p_period_end,
      'tasks', p_tasks
    ),
    v_actor
  );

  return v_plan_id;
end;
$$;

revoke all on function public.sisters_create_plan_with_tasks(uuid, uuid, uuid, text, date, date, jsonb) from public;
grant execute on function public.sisters_create_plan_with_tasks(uuid, uuid, uuid, text, date, date, jsonb) to authenticated;

commit;
