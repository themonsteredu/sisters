-- Parent-supplied study material attached to a task.
--
-- Uploads until now only went student -> parent (submission evidence). This is
-- the other direction: a parent scans a paper worksheet, attaches it to the
-- task, and the student opens it on a PC to work through.
--
-- Materials get their own bucket rather than reusing sisters-submissions,
-- because that bucket's contents are deleted 90 days after approval. A
-- worksheet must outlive the submission it produced.

begin;

create table if not exists public.sisters_task_materials (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.sisters_families(id) on delete cascade,
  task_id uuid not null references public.sisters_tasks(id) on delete cascade,
  title text not null,
  kind text not null check (kind in ('pdf', 'image')),
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  uploaded_by uuid not null references public.sisters_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists sisters_task_materials_task_idx
  on public.sisters_task_materials (task_id, created_at);

alter table public.sisters_task_materials enable row level security;

drop policy if exists "family read sisters_task_materials" on public.sisters_task_materials;
drop policy if exists "family write sisters_task_materials" on public.sisters_task_materials;

-- Parents manage materials directly. Students reach them through the
-- service-role client, since auth.uid() is null for a cookie-session student.
create policy "family read sisters_task_materials" on public.sisters_task_materials for select
  using (public.sisters_is_family_member(family_id) or public.sisters_is_app_admin());
create policy "family write sisters_task_materials" on public.sisters_task_materials for all
  using (public.sisters_is_family_member(family_id) or public.sisters_is_app_admin())
  with check (public.sisters_is_family_member(family_id) or public.sisters_is_app_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sisters-materials',
  'sisters-materials',
  false,
  20971520,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Same shape as the submissions bucket: the first path segment is the family
-- UUID and the policy authorizes on it.
drop policy if exists "sisters family material read" on storage.objects;
drop policy if exists "sisters family material write" on storage.objects;
drop policy if exists "sisters family material delete" on storage.objects;
create policy "sisters family material read" on storage.objects for select to authenticated
  using (bucket_id = 'sisters-materials' and public.sisters_is_family_member((storage.foldername(name))[1]::uuid));
create policy "sisters family material write" on storage.objects for insert to authenticated
  with check (bucket_id = 'sisters-materials' and public.sisters_is_family_member((storage.foldername(name))[1]::uuid));
create policy "sisters family material delete" on storage.objects for delete to authenticated
  using (bucket_id = 'sisters-materials' and public.sisters_is_family_member((storage.foldername(name))[1]::uuid));

commit;
