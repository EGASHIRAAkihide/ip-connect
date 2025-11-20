-- Minimal schema derived from docs/06_PoC/poc_spec.md section 9.3

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null check (role in ('creator', 'company')),
  created_at timestamptz default now()
);

create table if not exists ip_assets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references users(id) on delete cascade,
  title text not null,
  description text,
  category text not null check (category in ('voice', 'illustration', 'choreography')),
  file_url text not null,
  terms jsonb,
  price_min integer,
  price_max integer,
  created_at timestamptz default now()
);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  ip_id uuid not null references ip_assets(id) on delete cascade,
  creator_id uuid not null references users(id) on delete cascade,
  company_id uuid not null references users(id) on delete cascade,
  purpose text,
  region text,
  period text,
  budget integer,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

