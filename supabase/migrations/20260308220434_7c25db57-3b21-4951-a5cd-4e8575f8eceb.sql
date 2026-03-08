
-- Lessons table: stores pre-generated/cached lesson content
CREATE TABLE public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 7,
  level INTEGER NOT NULL DEFAULT 1,
  content TEXT NOT NULL,
  generated_by TEXT DEFAULT 'ai',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(topic_name, subject, grade, level)
);

-- Anyone can read lessons (public content)
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lessons"
  ON public.lessons FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage lessons"
  ON public.lessons FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions can insert (service role bypasses RLS, but also allow anon insert for caching)
CREATE POLICY "Allow lesson caching via insert"
  ON public.lessons FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow lesson caching via update"
  ON public.lessons FOR UPDATE
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
