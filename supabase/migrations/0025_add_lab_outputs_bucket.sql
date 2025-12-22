-- 0025_add_lab_outputs_bucket.sql
-- Add lab-outputs bucket for cached pose JSON (admin only, same policy as lab-inputs).

insert into storage.buckets (id, name, public)
values ('lab-outputs', 'lab-outputs', false)
on conflict (id) do nothing;

-- RLS is enabled on storage.objects by default.
drop policy if exists "lab_outputs_admin_select" on storage.objects;
create policy "lab_outputs_admin_select"
on storage.objects for select
using (
  bucket_id = 'lab-outputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
);

drop policy if exists "lab_outputs_admin_insert" on storage.objects;
create policy "lab_outputs_admin_insert"
on storage.objects for insert
with check (
  bucket_id = 'lab-outputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
);

drop policy if exists "lab_outputs_admin_update" on storage.objects;
create policy "lab_outputs_admin_update"
on storage.objects for update
using (
  bucket_id = 'lab-outputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
)
with check (
  bucket_id = 'lab-outputs'
  and (
    auth.role() = 'service_role'
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  )
);
