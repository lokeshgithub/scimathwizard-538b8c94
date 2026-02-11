-- Backfill any NULL session_id values with generated UUIDs
UPDATE public.session_reports
SET session_id = gen_random_uuid()::text
WHERE session_id IS NULL;

-- Make session_id NOT NULL
ALTER TABLE public.session_reports
ALTER COLUMN session_id SET NOT NULL;

-- Set a default for future inserts as safety net
ALTER TABLE public.session_reports
ALTER COLUMN session_id SET DEFAULT gen_random_uuid()::text;