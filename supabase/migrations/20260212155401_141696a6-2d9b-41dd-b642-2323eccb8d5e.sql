
-- Add grade column to topics table (default 7 for existing data)
ALTER TABLE public.topics ADD COLUMN grade integer NOT NULL DEFAULT 7;

-- Add check constraint for valid grades
ALTER TABLE public.topics ADD CONSTRAINT topics_grade_check CHECK (grade >= 6 AND grade <= 12);

-- Create index for fast grade-based filtering
CREATE INDEX idx_topics_grade ON public.topics(grade);

-- Create unique constraint so same topic name can exist in different grades within a subject
ALTER TABLE public.topics ADD CONSTRAINT topics_name_subject_grade_unique UNIQUE (name, subject_id, grade);

-- Recreate get_question_summary with grade column
DROP FUNCTION IF EXISTS public.get_question_summary();
CREATE FUNCTION public.get_question_summary()
 RETURNS TABLE(subject_name text, topic_name text, topic_id uuid, question_count bigint, grade integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    s.name AS subject_name,
    t.name AS topic_name,
    t.id AS topic_id,
    COUNT(q.id) AS question_count,
    t.grade AS grade
  FROM subjects s
  LEFT JOIN topics t ON t.subject_id = s.id
  LEFT JOIN questions q ON q.topic_id = t.id
  GROUP BY s.name, t.name, t.id, t.grade
  ORDER BY s.name, t.grade, t.name;
$function$;
