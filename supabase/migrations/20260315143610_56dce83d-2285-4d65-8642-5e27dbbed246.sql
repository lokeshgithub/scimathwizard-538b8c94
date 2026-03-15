
CREATE TABLE public.tutor_chat_histories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  subject text NOT NULL,
  grade integer NOT NULL DEFAULT 7,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic, subject, grade)
);

ALTER TABLE public.tutor_chat_histories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat history"
  ON public.tutor_chat_histories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat history"
  ON public.tutor_chat_histories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat history"
  ON public.tutor_chat_histories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat history"
  ON public.tutor_chat_histories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
