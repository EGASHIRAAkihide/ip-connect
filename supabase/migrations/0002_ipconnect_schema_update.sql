-- Add asset_type and metadata columns to ip_assets
ALTER TABLE ip_assets
ADD COLUMN asset_type text CHECK (asset_type IN ('choreography','voice'))
NOT NULL DEFAULT 'choreography';

ALTER TABLE ip_assets
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Extend inquiries with usage and payment fields
ALTER TABLE inquiries
ADD COLUMN usage_purpose text;

ALTER TABLE inquiries
ADD COLUMN usage_media text;

ALTER TABLE inquiries
ADD COLUMN usage_period text;

ALTER TABLE inquiries
ADD COLUMN payment_status text CHECK (
  payment_status IN ('unpaid','pending','paid','cancelled')
) NOT NULL DEFAULT 'unpaid';

-- Create inquiry_events to log status/payment changes
CREATE TABLE inquiry_events (
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
