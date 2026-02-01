-- Add sub_topic column to questions table for chapter/sub-topic hierarchy
-- Physics and Chemistry will use this for sub-topics within chapters
-- Math will have sub_topic = topic name (same as chapter) for backward compatibility

-- Add the column (nullable initially)
ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS sub_topic TEXT;

-- Update existing questions: set sub_topic to NULL for now
-- The application will treat NULL as "same as topic" for display purposes
-- This allows existing Math data to work without changes

-- Create an index for efficient filtering by sub_topic
CREATE INDEX IF NOT EXISTS idx_questions_sub_topic ON public.questions(sub_topic);

-- Update the get_public_questions function to include sub_topic
CREATE OR REPLACE FUNCTION public.get_public_questions()
RETURNS TABLE (
  id UUID,
  topic_id UUID,
  level INTEGER,
  question TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT,
  explanation TEXT,
  hint TEXT,
  sub_topic TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    q.id,
    q.topic_id,
    q.level,
    q.question,
    q.option_a,
    q.option_b,
    q.option_c,
    q.option_d,
    q.correct_answer,
    q.explanation,
    q.hint,
    q.sub_topic
  FROM public.questions q;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_public_questions() TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_questions() TO authenticated;

COMMENT ON COLUMN public.questions.sub_topic IS 'Sub-topic within a chapter. NULL means same as topic name (for Math backward compatibility). Physics/Chemistry use this for chapter sub-sections.';
