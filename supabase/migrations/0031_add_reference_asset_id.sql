alter table public.choreo_checks
  add column if not exists reference_asset_id uuid;

create index if not exists choreo_checks_reference_asset_id_idx
  on public.choreo_checks (reference_asset_id);
