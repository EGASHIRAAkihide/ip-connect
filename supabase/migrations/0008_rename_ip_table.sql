-- 0008_rename_ip_table.sql
-- Legacy migration to ensure ip_connect_assets is renamed to ip_assets; safe no-op otherwise.

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
