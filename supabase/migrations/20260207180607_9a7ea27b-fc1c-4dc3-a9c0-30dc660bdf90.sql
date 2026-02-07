
-- Table to store historical session reports for each user
CREATE TABLE public.session_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  accuracy NUMERIC NOT NULL,
  total_time_seconds NUMERIC NOT NULL DEFAULT 0,
  avg_time_per_question NUMERIC NOT NULL DEFAULT 0,
  stars_earned INTEGER NOT NULL DEFAULT 0,
  max_streak INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  topics_mastered INTEGER NOT NULL DEFAULT 0,
  topic_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  strengths TEXT[] NOT NULL DEFAULT '{}'::text[],
  weaknesses TEXT[] NOT NULL DEFAULT '{}'::text[]
);

-- Enable RLS
ALTER TABLE public.session_reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.session_reports
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
  ON public.session_reports
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON public.session_reports
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for efficient querying by user and date
CREATE INDEX idx_session_reports_user_date ON public.session_reports (user_id, created_at DESC);

-- Index for filtering by subject
CREATE INDEX idx_session_reports_subject ON public.session_reports (user_id, subject);
