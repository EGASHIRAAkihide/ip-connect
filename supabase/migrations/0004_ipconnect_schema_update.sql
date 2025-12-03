-- supabase/migrations/0004_ipconnect_schema_update.sql

---------------------------------------
-- 1. Update ip_assets table
---------------------------------------

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS asset_type text CHECK (asset_type IN ('choreography','voice'))
NOT NULL DEFAULT 'choreography';

ALTER TABLE ip_assets
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;


---------------------------------------
-- 2. Update inquiries table
---------------------------------------

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS usage_purpose text;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS usage_media text;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS usage_period text;

ALTER TABLE inquiries
ADD COLUMN IF NOT EXISTS payment_status text CHECK (
  payment_status IN ('unpaid','pending','paid','cancelled')
) NOT NULL DEFAULT 'unpaid';


---------------------------------------
-- 3. Create inquiry_events table
---------------------------------------

CREATE TABLE IF NOT EXISTS inquiry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES inquiries(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id),
  event_type text CHECK (
    event_type IN (
      'created',
      'approved',
      'rejected',
      'payment_marked_paid'
    )
  ),
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
