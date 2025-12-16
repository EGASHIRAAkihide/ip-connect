-- 0005_poc_core_update.sql
-- Align ip_assets / inquiries with PoC core (search × conditions × inquiry)
-- Adds lightweight events table and RLS policies required for PoC.

---------------------------------------
-- 1. ip_assets schema
---------------------------------------

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('choreography','voice')) DEFAULT 'choreography';

UPDATE ip_assets
SET type = COALESCE(type, asset_type, category, 'choreography')
WHERE type IS NULL;

ALTER TABLE ip_assets
ALTER COLUMN type SET NOT NULL;

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS preview_url text;

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS usage_purposes text[] DEFAULT '{}'::text[];

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS ai_allowed boolean DEFAULT false;

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS region_scope text;

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS secondary_use_allowed boolean DEFAULT false;

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS derivative_allowed boolean DEFAULT false;

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS status text DEFAULT 'published' CHECK (status IN ('draft','published'));

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);

UPDATE ip_assets
SET created_by = COALESCE(created_by, creator_id)
WHERE created_by IS NULL;

ALTER TABLE ip_assets
ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE ip_assets
ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb;

UPDATE ip_assets
SET meta = COALESCE(meta, metadata, '{}'::jsonb)
WHERE (meta IS NULL OR meta = '{}'::jsonb) AND metadata IS NOT NULL;


---------------------------------------
-- 2. inquiries schema
---------------------------------------

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS asset_id uuid REFERENCES ip_assets(id) ON DELETE CASCADE;

UPDATE inquiries
SET asset_id = COALESCE(asset_id, ip_id)
WHERE asset_id IS NULL;

ALTER TABLE inquiries
ALTER COLUMN asset_id SET NOT NULL;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS company_user_id uuid REFERENCES users(id);

UPDATE inquiries
SET company_user_id = COALESCE(company_user_id, company_id)
WHERE company_user_id IS NULL;

ALTER TABLE inquiries
ALTER COLUMN company_user_id SET NOT NULL;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS creator_user_id uuid REFERENCES users(id);

UPDATE inquiries
SET creator_user_id = COALESCE(creator_user_id, creator_id)
WHERE creator_user_id IS NULL;

ALTER TABLE inquiries
ALTER COLUMN creator_user_id SET NOT NULL;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS media text;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS period_start date;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS period_end date;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS secondary_use boolean DEFAULT false;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS derivative boolean DEFAULT false;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS ai_use boolean DEFAULT false;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS budget_min integer;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS budget_max integer;

-- Normalize existing freeform columns into the new ones when possible
UPDATE inquiries
SET purpose = COALESCE(purpose, usage_purpose),
    media = COALESCE(media, usage_media);

-- Status: switch to PoC states (new / in_review / accepted / rejected)
ALTER TABLE inquiries DROP CONSTRAINT IF EXISTS inquiries_status_check;

UPDATE inquiries SET status = 'new' WHERE status = 'pending';
UPDATE inquiries SET status = 'accepted' WHERE status = 'approved';
UPDATE inquiries SET status = 'rejected' WHERE status = 'rejected';

ALTER TABLE inquiries
ALTER COLUMN status SET DEFAULT 'new';

ALTER TABLE inquiries
ADD CONSTRAINT inquiries_status_check CHECK (status IN ('new','in_review','accepted','rejected'));


---------------------------------------
-- 3. inquiry_events alignment (optional history)
---------------------------------------

ALTER TABLE inquiry_events
ADD COLUMN IF NOT EXISTS event_type text;

ALTER TABLE inquiry_events DROP CONSTRAINT IF EXISTS inquiry_events_event_type_check;

ALTER TABLE inquiry_events
ADD CONSTRAINT inquiry_events_event_type_check CHECK (
  event_type IN ('created','in_review','accepted','rejected')
);


---------------------------------------
-- 4. events table for KPI logging
---------------------------------------

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  user_id uuid REFERENCES users(id),
  asset_id uuid REFERENCES ip_assets(id) ON DELETE CASCADE,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);


---------------------------------------
-- 5. Row Level Security
---------------------------------------

-- ip_assets: published viewable by all; owners can manage their rows
ALTER TABLE ip_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ip_assets_select_public_or_owner" ON ip_assets;
CREATE POLICY "ip_assets_select_public_or_owner"
ON ip_assets FOR SELECT
USING (status = 'published' OR created_by = auth.uid());

DROP POLICY IF EXISTS "ip_assets_insert_owner" ON ip_assets;
CREATE POLICY "ip_assets_insert_owner"
ON ip_assets FOR INSERT
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "ip_assets_update_owner" ON ip_assets;
CREATE POLICY "ip_assets_update_owner"
ON ip_assets FOR UPDATE
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "ip_assets_delete_owner" ON ip_assets;
CREATE POLICY "ip_assets_delete_owner"
ON ip_assets FOR DELETE
USING (created_by = auth.uid());

-- inquiries: company can see their own submissions; creators can see their inbox and update status
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_select_company" ON inquiries;
CREATE POLICY "inquiries_select_company"
ON inquiries FOR SELECT
USING (company_user_id = auth.uid());

DROP POLICY IF EXISTS "inquiries_select_creator" ON inquiries;
CREATE POLICY "inquiries_select_creator"
ON inquiries FOR SELECT
USING (creator_user_id = auth.uid());

DROP POLICY IF EXISTS "inquiries_insert_company" ON inquiries;
CREATE POLICY "inquiries_insert_company"
ON inquiries FOR INSERT
WITH CHECK (company_user_id = auth.uid());

DROP POLICY IF EXISTS "inquiries_update_creator" ON inquiries;
CREATE POLICY "inquiries_update_creator"
ON inquiries FOR UPDATE
USING (creator_user_id = auth.uid());

-- events: only owners or actors can see/insert their own rows
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "events_select_owner_or_actor" ON events;
CREATE POLICY "events_select_owner_or_actor"
ON events FOR SELECT
USING (
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR (asset_id IS NOT NULL AND asset_id IN (SELECT id FROM ip_assets WHERE created_by = auth.uid()))
);

DROP POLICY IF EXISTS "events_insert_actor" ON events;
CREATE POLICY "events_insert_actor"
ON events FOR INSERT
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
