-- 0010_fix_inquiry_events.sql
-- Align inquiry_events for environments created from older migrations that lacked event_type.

ALTER TABLE inquiry_events
ADD COLUMN IF NOT EXISTS event_type text;

-- Backfill event_type from legacy columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inquiry_events' AND column_name = 'to_status'
  ) THEN
    UPDATE inquiry_events
    SET event_type = CASE
      WHEN event_type IS NOT NULL THEN event_type
      WHEN to_status = 'approved' THEN 'accepted'
      WHEN to_status = 'pending' THEN 'in_review'
      WHEN to_status = 'rejected' THEN 'rejected'
      ELSE 'created'
    END;
  ELSE
    UPDATE inquiry_events
    SET event_type = COALESCE(event_type, 'created');
  END IF;
END$$;

-- Set default and constraint safely
ALTER TABLE inquiry_events
ALTER COLUMN event_type SET DEFAULT 'created';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inquiry_events_event_type_check'
      AND conrelid = 'inquiry_events'::regclass
  ) THEN
    ALTER TABLE inquiry_events
    ADD CONSTRAINT inquiry_events_event_type_check
    CHECK (event_type IN ('created','in_review','accepted','rejected'));
  END IF;
END$$;
