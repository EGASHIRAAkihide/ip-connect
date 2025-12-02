-- Legacy migration: early prototypes used `ip_connect_assets`. The codebase and
-- 0001_init.sql now standardize on `ip_assets`, so this only renames when the old
-- table exists; otherwise it is a safe no-op. It also refreshes the inquiries FK.

do $$
begin
  if to_regclass('public.ip_connect_assets') is not null
     and to_regclass('public.ip_assets') is null then
    execute 'alter table ip_connect_assets rename to ip_assets';
  end if;
end $$;

alter table if exists inquiries drop constraint if exists inquiries_ip_id_fkey;

alter table if exists inquiries
  add constraint inquiries_ip_id_fkey
  foreign key (ip_id) references ip_assets(id) on delete cascade;
