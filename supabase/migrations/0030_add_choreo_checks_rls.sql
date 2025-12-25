alter table public.choreo_checks enable row level security;

drop policy if exists "choreo_checks_select_company" on public.choreo_checks;
create policy "choreo_checks_select_company"
  on public.choreo_checks
  for select
  using (company_id = auth.uid());

drop policy if exists "choreo_checks_update_company" on public.choreo_checks;
create policy "choreo_checks_update_company"
  on public.choreo_checks
  for update
  using (company_id = auth.uid())
  with check (company_id = auth.uid());
