alter table public.choreo_checks
  add column if not exists reference_check_id uuid null;

alter table public.choreo_checks
  add constraint choreo_checks_reference_check_id_fkey
  foreign key (reference_check_id)
  references public.choreo_checks (id)
  on delete set null;

create index if not exists choreo_checks_reference_check_id_idx
  on public.choreo_checks (reference_check_id);
