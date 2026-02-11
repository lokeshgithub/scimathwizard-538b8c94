
-- RPC to fetch questions for specific topic IDs (for lazy-loading)
CREATE OR REPLACE FUNCTION public.get_questions_by_topics(p_topic_ids uuid[])
 RETURNS TABLE(id uuid, topic_id uuid, level integer, question text, option_a text, option_b text, option_c text, option_d text, correct_answer text, explanation text, hint text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
    q.created_at
  FROM public.questions q
  WHERE q.topic_id = ANY(p_topic_ids);
$$;
