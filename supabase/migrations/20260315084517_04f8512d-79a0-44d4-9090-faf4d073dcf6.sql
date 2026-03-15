
-- Fix: SELECT policies on test_feedback already created table but failed on policies
-- Drop and recreate if tables exist from partial migration
DROP TABLE IF EXISTS public.test_overall_feedback;
DROP TABLE IF EXISTS public.test_feedback;

CREATE TABLE public.test_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_name text NOT NULL,
  device text NOT NULL,
  browser text NOT NULL,
  test_number integer NOT NULL,
  test_name text NOT NULL,
  checkpoints jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.test_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert test feedback"
ON public.test_feedback FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view all test feedback"
ON public.test_feedback FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.test_overall_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tester_name text NOT NULL,
  device text NOT NULL,
  browser text NOT NULL,
  favorite_feature text,
  most_confusing text,
  suggestions text,
  bugs_found text,
  rating integer,
  mode_tested text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.test_overall_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert overall feedback"
ON public.test_overall_feedback FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Admins can view overall feedback"
ON public.test_overall_feedback FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
