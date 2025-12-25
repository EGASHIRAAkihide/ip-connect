create table public.choreo_ip_assets (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.users(id),
  title text not null,
  video_bucket text not null,
  video_path text not null,
  pose_cache_path text,
  created_at timestamptz not null default now()
);

create index choreo_ip_assets_creator_id_created_at_idx
  on public.choreo_ip_assets (creator_id, created_at desc);
