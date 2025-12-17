-- 0012_add_lab_runs.sql
-- Admin-only lab_runs table for AI Lab experiments and storage bucket policies.

-----------------------------
-- lab_runs table
-----------------------------

create table if not exists lab_runs (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  status text not null default 'queued',
  input_bucket text not null,
  input_path text not null,
  output_json jsonb,
  duration_ms integer,
  error_message text,
  created_by uuid not null references users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  constraint lab_runs_type_check check (type in ('asr','diarization')),
  constraint lab_runs_status_check check (status in ('queued','running','success','failed'))
);

alter table lab_runs enable row level security;

drop policy if exists "lab_runs_admin_select" on lab_runs;
create policy "lab_runs_admin_select"
on lab_runs for select
using (
  auth.role() = 'service_role'
  or exists (select 1 from users where id = auth.uid() and is_admin = true)
);

drop policy if exists "lab_runs_admin_insert" on lab_runs;
create policy "lab_runs_admin_insert"
on lab_runs for insert
with check (
  auth.role() = 'service_role'
  or exists (select 1 from users where id = auth.uid() and is_admin = true)
);

drop policy if exists "lab_runs_admin_update" on lab_runs;
create policy "lab_runs_admin_update"
on lab_runs for update
using (
  auth.role() = 'service_role'
  or exists (select 1 from users where id = auth.uid() and is_admin = true)
)
with check (
  auth.role() = 'service_role'
  or exists (select 1 from users where id = auth.uid() and is_admin = true)
);

-----------------------------
-- storage bucket for lab inputs
-----------------------------

insert into storage.buckets (id, name, public)
values ('lab-inputs', 'lab-inputs', false)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by default
drop policy if exists "lab_inputs_admin_select" on storage.objects;
create policy "lab_inputs_admin_select"
on storage.objects for select
using (
  bucket_id = 'lab-inputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
);

drop policy if exists "lab_inputs_admin_insert" on storage.objects;
create policy "lab_inputs_admin_insert"
on storage.objects for insert
with check (
  bucket_id = 'lab-inputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
);

drop policy if exists "lab_inputs_admin_update" on storage.objects;
create policy "lab_inputs_admin_update"
on storage.objects for update
using (
  bucket_id = 'lab-inputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
)
with check (
  bucket_id = 'lab-inputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
);
