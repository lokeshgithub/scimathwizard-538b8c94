
-- Drop existing functions first (return type is changing)
DROP FUNCTION IF EXISTS public.get_public_questions();
DROP FUNCTION IF EXISTS public.get_questions_by_topics(uuid[]);

-- Recreate get_public_questions WITHOUT correct_answer
CREATE FUNCTION public.get_public_questions()
RETURNS TABLE(
  id uuid, topic_id uuid, level integer, question text,
  option_a text, option_b text, option_c text, option_d text,
  explanation text, hint text, created_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, topic_id, level, question,
         option_a, option_b, option_c, option_d,
         explanation, hint, created_at
  FROM public.questions;
$$;

-- Recreate get_questions_by_topics WITHOUT correct_answer
CREATE FUNCTION public.get_questions_by_topics(p_topic_ids uuid[])
RETURNS TABLE(
  id uuid, topic_id uuid, level integer, question text,
  option_a text, option_b text, option_c text, option_d text,
  explanation text, hint text, created_at timestamp with time zone
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    q.id, q.topic_id, q.level, q.question,
    q.option_a, q.option_b, q.option_c, q.option_d,
    q.explanation, q.hint, q.created_at
  FROM public.questions q
  WHERE q.topic_id = ANY(p_topic_ids);
$$;
