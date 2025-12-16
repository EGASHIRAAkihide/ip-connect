-- 0006_admin_role_switch.sql
-- Adds admin flag and constrains role switching to admins only (self-update of role).

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- RLS for users (open select; controlled update; self insert)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_select_all" ON users;
CREATE POLICY "users_select_all"
ON users FOR SELECT
USING (true);

DROP POLICY IF EXISTS "users_insert_self" ON users;
CREATE POLICY "users_insert_self"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "users_update_admin_role_only" ON users;
CREATE POLICY "users_update_admin_role_only"
ON users FOR UPDATE
USING (auth.uid() = id AND is_admin = true)
WITH CHECK (
  auth.uid() = id
  AND is_admin = true
  AND role IN ('creator','company')
);

-- Trigger to prevent updates to columns other than role
create or replace function enforce_role_only_updates()
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
  if new.is_admin is distinct from old.is_admin then
    raise exception 'Updating is_admin is not allowed';
  end if;
  if new.role not in ('creator','company') then
    raise exception 'Invalid role value';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_users_role_only on users;
create trigger trg_users_role_only
before update on users
for each row
execute function enforce_role_only_updates();
