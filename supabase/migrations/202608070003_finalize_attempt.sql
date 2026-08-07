-- Recording a test attempt has to write two things together: the attempt row
-- and the resulting test status (completed, or retest when the student failed).
-- It also has to pick the next attempt_number without racing a concurrent
-- submit, since (test_id, student_id, attempt_number) is unique.
--
-- SECURITY DEFINER because the student is not a Supabase Auth user — they hold
-- a signed cookie, so auth.uid() is null for them and no RLS policy can grant
-- the insert. The caller therefore proves nothing by itself, and this function
-- is only reachable through the service-role client in
-- src/lib/data/attempts.ts, which has already verified the student session and
-- that the test belongs to that student. The p_student_id / p_family_id pair is
-- re-checked here as defence in depth.

begin;

create or replace function public.sisters_finalize_attempt(
  p_family_id uuid,
  p_student_id uuid,
  p_test_id uuid,
  p_responses jsonb,
  p_grading jsonb,
  p_score smallint,
  p_passed boolean,
  p_needs_parent_review boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attempt_id uuid;
  v_attempt_number smallint;
  v_max_attempts smallint;
  v_status public.sisters_test_status;
begin
  select max_attempts, status into v_max_attempts, v_status
  from public.sisters_tests
  where id = p_test_id and family_id = p_family_id and student_id = p_student_id;

  if v_max_attempts is null then
    raise exception 'test does not belong to this student' using errcode = '42501';
  end if;

  if v_status not in ('published', 'retest') then
    raise exception 'test is not open for attempts' using errcode = '22023';
  end if;

  -- Lock the test row so two concurrent submissions cannot pick the same
  -- attempt_number and collide on the unique constraint.
  perform 1 from public.sisters_tests where id = p_test_id for update;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_number
  from public.sisters_attempts
  where test_id = p_test_id and student_id = p_student_id;

  if v_attempt_number > v_max_attempts then
    raise exception 'no attempts remaining' using errcode = '22023';
  end if;

  insert into public.sisters_attempts (
    family_id, student_id, test_id, attempt_number, responses, grading,
    score, passed, needs_parent_review, completed_at
  )
  values (
    p_family_id, p_student_id, p_test_id, v_attempt_number, p_responses, p_grading,
    p_score, p_passed, p_needs_parent_review, now()
  )
  returning id into v_attempt_id;

  -- A pass closes the test. A fail reopens it as a retest while attempts remain;
  -- once they are exhausted it closes too and the parent takes over.
  update public.sisters_tests
  set status = case
    when p_passed then 'completed'::public.sisters_test_status
    when v_attempt_number >= v_max_attempts then 'completed'::public.sisters_test_status
    else 'retest'::public.sisters_test_status
  end
  where id = p_test_id and family_id = p_family_id;

  return jsonb_build_object(
    'attempt_id', v_attempt_id,
    'attempt_number', v_attempt_number,
    'attempts_remaining', greatest(0, v_max_attempts - v_attempt_number)
  );
end;
$$;

revoke all on function public.sisters_finalize_attempt(uuid, uuid, uuid, jsonb, jsonb, smallint, boolean, boolean) from public;
revoke all on function public.sisters_finalize_attempt(uuid, uuid, uuid, jsonb, jsonb, smallint, boolean, boolean) from authenticated;

commit;
