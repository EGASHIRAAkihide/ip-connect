-- 0007_add_status_to_ip_assets.sql
-- Safety migration to ensure `status` exists on ip_assets for catalog filters/RLS.

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS status text;

UPDATE ip_assets
SET status = 'published'
WHERE status IS NULL;

ALTER TABLE ip_assets
ALTER COLUMN status SET DEFAULT 'published';

-- Avoid duplicate constraint errors on reruns
ALTER TABLE ip_assets DROP CONSTRAINT IF EXISTS ip_assets_status_check;

ALTER TABLE ip_assets
ADD CONSTRAINT ip_assets_status_check
CHECK (status IN ('draft','published'));
