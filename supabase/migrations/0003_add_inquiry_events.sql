create table if not exists inquiry_events (
  id uuid primary key default gen_random_uuid(),
  inquiry_id uuid not null references inquiries(id) on delete cascade,
  actor_id uuid not null references users(id) on delete cascade,
  actor_role text not null check (actor_role in ('creator', 'company')),
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);


