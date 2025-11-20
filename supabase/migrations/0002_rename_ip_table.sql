-- Align table naming with docs/06_PoC/poc_spec.md section 9

alter table if exists ip_connect_assets rename to ip_assets;

alter table if exists inquiries drop constraint if exists inquiries_ip_id_fkey;

alter table if exists inquiries
  add constraint inquiries_ip_id_fkey
  foreign key (ip_id) references ip_assets(id) on delete cascade;

