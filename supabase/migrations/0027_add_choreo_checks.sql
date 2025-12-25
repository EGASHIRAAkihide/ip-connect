create table public.choreo_checks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.users(id),
  video_path text not null,
  video_hash text not null,
  status text not null default 'pending' check (status in ('pending','running','done','error')),
  result_json jsonb not null default '{}'::jsonb,
  confidence text null check (confidence in ('high','medium','low')),
  created_at timestamptz not null default now()
);

create index choreo_checks_company_id_created_at_idx
  on public.choreo_checks (company_id, created_at desc);

alter table public.choreo_checks enable row level security;

create policy "company select choreo_checks"
  on public.choreo_checks
  for select
  using (
    auth.uid() = company_id
    and exists (
      select 1
      from public.users
      where public.users.id = company_id
        and public.users.role = 'company'
    )
  );

create policy "company insert choreo_checks"
  on public.choreo_checks
  for insert
  with check (
    auth.uid() = company_id
    and exists (
      select 1
      from public.users
      where public.users.id = company_id
        and public.users.role = 'company'
    )
  );
