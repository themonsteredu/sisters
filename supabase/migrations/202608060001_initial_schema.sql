-- Sisters multi-tenant learning management schema
begin;

create extension if not exists pgcrypto;

do $$ begin create type public.sisters_app_role as enum ('admin', 'parent'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sisters_task_status as enum ('scheduled', 'in_progress', 'submitted', 'ai_review', 'parent_review', 'approved', 'rejected', 'remediation', 'overdue'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sisters_task_type as enum ('lecture', 'workbook', 'memorize', 'review', 'test', 'custom'); exception when duplicate_object then null; end $$;
do $$ begin create type public.sisters_test_status as enum ('draft', 'published', 'completed', 'retest'); exception when duplicate_object then null; end $$;

create table if not exists public.sisters_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  phone text,
  role public.sisters_app_role not null default 'parent',
  quiet_hours_start time,
  quiet_hours_end time,
  notification_preferences jsonb not null default '{"in_app":true,"web_push":true,"email":true,"kakao":true}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Asia/Seoul',
  plan text not null default 'beta' check (plan in ('beta', 'plus')),
  suspended boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_family_members (
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  user_id uuid not null references public.sisters_profiles(id) on delete cascade,
  role public.sisters_app_role not null default 'parent',
  primary key (family_id, user_id)
);

create table if not exists public.sisters_students (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  name text not null,
  handle text not null unique check (handle = lower(handle)),
  birth_date date not null,
  grade smallint not null check (grade between 1 and 12),
  avatar text not null default '🌱',
  color text not null default '#7c5ce7',
  weekly_goal_minutes integer not null default 600 check (weekly_goal_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_student_credentials (
  student_id uuid primary key references public.sisters_students(id) on delete cascade,
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  pin_hash text not null,
  failed_attempts smallint not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.sisters_student_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_consents (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  guardian_user_id uuid not null references public.sisters_profiles(id),
  consent_type text not null check (consent_type in ('child_privacy', 'ai_processing', 'overseas_transfer', 'notifications')),
  verified_by text not null,
  verification_reference text,
  consented_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table if not exists public.sisters_subjects (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  name text not null,
  color text not null,
  icon text not null,
  sort_order smallint not null default 0,
  unique (family_id, name)
);

create table if not exists public.sisters_courses (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  subject_id uuid not null references public.sisters_subjects(id),
  title text not null,
  teacher text,
  source text not null default 'manual' check (source in ('mbest', 'manual')),
  external_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_lessons (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  course_id uuid not null references public.sisters_courses(id) on delete cascade,
  lesson_index integer not null,
  title text not null,
  duration_minutes integer,
  external_url text,
  unique (course_id, lesson_index)
);

create table if not exists public.sisters_workbooks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  subject_id uuid not null references public.sisters_subjects(id),
  title text not null,
  unit text,
  current_page integer not null,
  end_page integer not null,
  target_date date not null,
  check (end_page >= current_page)
);

create table if not exists public.sisters_plans (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  title text not null,
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'confirmed', 'published', 'archived')),
  version integer not null default 1,
  created_by uuid not null references public.sisters_profiles(id),
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_plan_versions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  plan_id uuid not null references public.sisters_plans(id) on delete cascade,
  version integer not null,
  snapshot jsonb not null,
  changed_by uuid not null references public.sisters_profiles(id),
  created_at timestamptz not null default now(),
  unique (plan_id, version)
);

create table if not exists public.sisters_tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  plan_id uuid references public.sisters_plans(id) on delete set null,
  subject_id uuid not null references public.sisters_subjects(id),
  task_type public.sisters_task_type not null,
  title text not null,
  detail text not null default '',
  scheduled_date date not null,
  due_time time,
  estimated_minutes integer not null default 30,
  status public.sisters_task_status not null default 'scheduled',
  evidence_requirements jsonb not null default '["check"]'::jsonb,
  source_id uuid,
  priority text not null default 'normal' check (priority in ('normal', 'high')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sisters_submissions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  task_id uuid not null references public.sisters_tasks(id) on delete cascade,
  note text,
  elapsed_minutes integer,
  ai_review jsonb,
  parent_decision text check (parent_decision in ('approved', 'rejected')),
  parent_feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table if not exists public.sisters_submission_assets (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  submission_id uuid not null references public.sisters_submissions(id) on delete cascade,
  kind text not null check (kind in ('image', 'audio')),
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  delete_after timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_tests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  subject_id uuid not null references public.sisters_subjects(id),
  title text not null,
  scheduled_date date not null,
  pass_score smallint not null default 80 check (pass_score between 0 and 100),
  time_limit_minutes integer not null default 20,
  max_attempts smallint not null default 2,
  shuffle_questions boolean not null default true,
  status public.sisters_test_status not null default 'draft',
  created_by uuid not null references public.sisters_profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_questions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  test_id uuid not null references public.sisters_tests(id) on delete cascade,
  question_type text not null,
  prompt text not null,
  choices jsonb,
  answer jsonb not null,
  accepted_answers jsonb,
  explanation text,
  points smallint not null default 10,
  source text not null default 'parent' check (source in ('parent', 'ai_draft', 'ai_auto')),
  sort_order smallint not null default 0
);

create table if not exists public.sisters_attempts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  student_id uuid not null references public.sisters_students(id) on delete cascade,
  test_id uuid not null references public.sisters_tests(id) on delete cascade,
  attempt_number smallint not null,
  responses jsonb not null,
  grading jsonb not null,
  score smallint not null check (score between 0 and 100),
  passed boolean not null,
  needs_parent_review boolean not null default false,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (test_id, student_id, attempt_number)
);

create table if not exists public.sisters_notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  recipient_user_id uuid references public.sisters_profiles(id) on delete cascade,
  recipient_student_id uuid references public.sisters_students(id) on delete cascade,
  event_type text not null,
  title text not null,
  body text not null,
  channels jsonb not null default '["in_app"]'::jsonb,
  dedupe_key text not null unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_ai_provider_configs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.sisters_families(id) on delete cascade,
  provider text not null check (provider in ('openai', 'google')),
  encrypted_api_key text not null,
  key_last_four text not null,
  enabled boolean not null default true,
  updated_by uuid not null references public.sisters_profiles(id),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (family_id, provider)
);

create table if not exists public.sisters_ai_model_assignments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.sisters_families(id) on delete cascade,
  capability text not null,
  primary_provider text not null,
  primary_model text not null,
  fallback_provider text,
  fallback_model text,
  updated_by uuid not null references public.sisters_profiles(id),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (family_id, capability)
);

create table if not exists public.sisters_ai_jobs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  capability text not null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'manual_review')),
  attempt_count smallint not null default 0,
  max_attempts smallint not null default 2,
  result jsonb,
  last_error text,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  notification_id uuid not null references public.sisters_notifications(id) on delete cascade,
  channel text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'sent', 'failed', 'skipped')),
  attempt_count smallint not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  sent_at timestamptz,
  last_error text,
  unique (notification_id, channel)
);

create table if not exists public.sisters_web_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  user_id uuid not null references public.sisters_profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_audit_logs (
  id bigint generated always as identity primary key,
  family_id uuid references public.sisters_families(id) on delete cascade,
  actor_user_id uuid references public.sisters_profiles(id),
  actor_student_id uuid references public.sisters_students(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.sisters_data_requests (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  requested_by uuid not null references public.sisters_profiles(id),
  request_type text not null check (request_type in ('export', 'delete', 'withdraw_consent')),
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'rejected')),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Safe upgrades when an earlier Sisters migration was only partially applied.
alter table public.sisters_submission_assets add column if not exists deleted_at timestamptz;
alter table public.sisters_notification_jobs add column if not exists locked_at timestamptz;
alter table public.sisters_notification_jobs drop constraint if exists sisters_notification_jobs_status_check;
alter table public.sisters_notification_jobs add constraint sisters_notification_jobs_status_check
  check (status in ('queued', 'running', 'sent', 'failed', 'skipped'));

create index if not exists sisters_tasks_student_date_idx on public.sisters_tasks(student_id, scheduled_date);
create index if not exists sisters_submissions_review_idx on public.sisters_submissions(family_id, parent_decision, submitted_at desc);
create index if not exists sisters_ai_jobs_queue_idx on public.sisters_ai_jobs(status, run_after) where status in ('queued', 'failed');
create index if not exists sisters_notification_jobs_queue_idx on public.sisters_notification_jobs(status, run_after) where status in ('queued', 'failed');
create index if not exists sisters_assets_retention_idx on public.sisters_submission_assets(delete_after) where delete_after is not null;

create or replace function public.sisters_is_family_member(target_family_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sisters_family_members
    where family_id = target_family_id and user_id = auth.uid()
  );
$$;

create or replace function public.sisters_is_app_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sisters_profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.sisters_profiles enable row level security;
drop policy if exists "sisters profiles self or admin" on public.sisters_profiles;
drop policy if exists "sisters profiles parent self update" on public.sisters_profiles;
drop policy if exists "sisters profiles admin update" on public.sisters_profiles;
create policy "sisters profiles self or admin" on public.sisters_profiles for select using (id = auth.uid() or public.sisters_is_app_admin());
create policy "sisters profiles parent self update" on public.sisters_profiles for update
using (id = auth.uid() and role = 'parent')
with check (id = auth.uid() and role = 'parent');
create policy "sisters profiles admin update" on public.sisters_profiles for update
using (public.sisters_is_app_admin()) with check (public.sisters_is_app_admin());
alter table public.sisters_families enable row level security;
drop policy if exists "sisters family read families" on public.sisters_families;
drop policy if exists "sisters family write families" on public.sisters_families;
create policy "sisters family read families" on public.sisters_families for select using (public.sisters_is_family_member(id) or public.sisters_is_app_admin());
create policy "sisters family write families" on public.sisters_families for all using (public.sisters_is_family_member(id) or public.sisters_is_app_admin()) with check (public.sisters_is_family_member(id) or public.sisters_is_app_admin());

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'sisters_family_members','sisters_students','sisters_consents','sisters_subjects','sisters_courses','sisters_lessons',
    'sisters_workbooks','sisters_plans','sisters_plan_versions','sisters_tasks','sisters_submissions','sisters_submission_assets','sisters_tests','sisters_questions','sisters_attempts',
    'sisters_notifications','sisters_ai_jobs','sisters_notification_jobs','sisters_web_push_subscriptions','sisters_audit_logs','sisters_data_requests'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('drop policy if exists "family read %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "family write %1$s" on public.%1$I', table_name);
    execute format(
      'create policy "family read %1$s" on public.%1$I for select using (public.sisters_is_family_member(family_id) or public.sisters_is_app_admin())',
      table_name
    );
    execute format(
      'create policy "family write %1$s" on public.%1$I for all using (public.sisters_is_family_member(family_id) or public.sisters_is_app_admin()) with check (public.sisters_is_family_member(family_id) or public.sisters_is_app_admin())',
      table_name
    );
  end loop;
end $$;

-- Credential material and server sessions are service-role only. Enabling RLS
-- without authenticated policies prevents browser clients from reading them.
alter table public.sisters_student_credentials enable row level security;
alter table public.sisters_student_sessions enable row level security;

-- AI keys are encrypted at rest but still never exposed to parents or students.
alter table public.sisters_ai_provider_configs enable row level security;
alter table public.sisters_ai_model_assignments enable row level security;
drop policy if exists "sisters admin manage ai provider configs" on public.sisters_ai_provider_configs;
drop policy if exists "sisters admin manage ai model assignments" on public.sisters_ai_model_assignments;
create policy "sisters admin manage ai provider configs" on public.sisters_ai_provider_configs for all
using (public.sisters_is_app_admin()) with check (public.sisters_is_app_admin());
create policy "sisters admin manage ai model assignments" on public.sisters_ai_model_assignments for all
using (public.sisters_is_app_admin()) with check (public.sisters_is_app_admin());

-- Parents can edit presentation fields but cannot change plan or suspension.
revoke update on public.sisters_families from authenticated;
grant update (name, timezone) on public.sisters_families to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sisters-submissions', 'sisters-submissions', false, 10485760, array['image/jpeg','image/png','image/webp','audio/webm','audio/mpeg'])
on conflict (id) do nothing;

drop policy if exists "sisters family submission asset read" on storage.objects;
drop policy if exists "sisters family submission asset write" on storage.objects;
drop policy if exists "sisters family submission asset delete" on storage.objects;
create policy "sisters family submission asset read" on storage.objects for select to authenticated
using (bucket_id = 'sisters-submissions' and public.sisters_is_family_member((storage.foldername(name))[1]::uuid));
create policy "sisters family submission asset write" on storage.objects for insert to authenticated
with check (bucket_id = 'sisters-submissions' and public.sisters_is_family_member((storage.foldername(name))[1]::uuid));
create policy "sisters family submission asset delete" on storage.objects for delete to authenticated
using (bucket_id = 'sisters-submissions' and public.sisters_is_family_member((storage.foldername(name))[1]::uuid));

-- Seed subjects are created per family by the app after onboarding.
commit;
