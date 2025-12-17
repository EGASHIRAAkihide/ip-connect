-- 0017_add_ip_ai_meta.sql
-- Add lab_run linkage and AI meta to ip_assets, set draft as default.

alter table if exists ip_assets
  add column if not exists lab_run_id uuid;

alter table if exists ip_assets
  add column if not exists ai_meta jsonb default '{}'::jsonb;

alter table if exists ip_assets
  alter column status set default 'draft';
