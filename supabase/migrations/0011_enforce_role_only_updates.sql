-- 0011_enforce_role_only_updates.sql
-- Update trigger function to allow is_admin changes only for service_role or postgres/supabase_admin.

create or replace function public.enforce_role_only_updates()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Updating id is not allowed';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Updating email is not allowed';
  end if;

  -- Guard is_admin changes: only allow for service_role or super users
  if new.is_admin is distinct from old.is_admin then
    if auth.role() != 'service_role' and current_user not in ('postgres', 'supabase_admin') then
      raise exception 'Updating is_admin is not allowed';
    end if;
  end if;

  if new.role not in ('creator','company') then
    raise exception 'Invalid role value';
  end if;

  return new;
end;
$$;
