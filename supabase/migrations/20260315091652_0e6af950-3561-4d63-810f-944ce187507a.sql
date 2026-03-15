CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  feedback_type text NOT NULL DEFAULT 'general',
  message text,
  page_url text,
  screenshot_path text,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert feedback"
  ON public.user_feedback FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all feedback"
  ON public.user_feedback FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-screenshots', 'feedback-screenshots', true);

CREATE POLICY "Anyone can upload feedback screenshots"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'feedback-screenshots');

CREATE POLICY "Public read feedback screenshots"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'feedback-screenshots');

CREATE POLICY "Admins can delete feedback screenshots"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'feedback-screenshots' AND has_role(auth.uid(), 'admin'::app_role));