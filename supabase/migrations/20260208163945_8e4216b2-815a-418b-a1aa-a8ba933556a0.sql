-- Add session_id column (nullable for backward compatibility)
ALTER TABLE public.session_reports
ADD COLUMN session_id TEXT;

-- Add index for session_id lookups
CREATE INDEX idx_session_reports_session_id
ON public.session_reports (session_id)
WHERE session_id IS NOT NULL;

-- Add GIN index for JSONB topic_breakdown (faster topic filtering if needed)
CREATE INDEX idx_session_reports_topic_breakdown
ON public.session_reports USING GIN (topic_breakdown);

-- Backfill session_id for existing reports (use report ID as fallback)
UPDATE public.session_reports
SET session_id = 'legacy-' || id::text
WHERE session_id IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.session_reports.session_id IS
'UUID v4 generated on session start. Used for deduplication and tracking.';