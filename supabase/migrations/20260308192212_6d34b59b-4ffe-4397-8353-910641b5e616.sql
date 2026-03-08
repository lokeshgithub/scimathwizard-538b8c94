-- Performance indexes for 100s-1000s concurrent users
-- Questions: hot path - fetched by topic_id and level
CREATE INDEX IF NOT EXISTS idx_questions_topic_level ON public.questions (topic_id, level);

-- Session reports: fetched by user_id + created_at (report page queries)
CREATE INDEX IF NOT EXISTS idx_session_reports_user_created ON public.session_reports (user_id, created_at DESC);

-- Session reports: dedup check by user_id + session_id
CREATE INDEX IF NOT EXISTS idx_session_reports_user_session ON public.session_reports (user_id, session_id);

-- Profiles: looked up by user_id on every page load
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Practice schedules: fetched by user_id + next_practice_date
CREATE INDEX IF NOT EXISTS idx_practice_schedules_user_next ON public.practice_schedules (user_id, next_practice_date);

-- Adaptive results: leaderboard query uses user_id + subject + skill_score
CREATE INDEX IF NOT EXISTS idx_adaptive_results_user_subject ON public.adaptive_challenge_results (user_id, subject, skill_score DESC);

-- Topics: fetched by subject_id + grade
CREATE INDEX IF NOT EXISTS idx_topics_subject_grade ON public.topics (subject_id, grade);

-- Usage logs: admin dashboard queries by created_at
CREATE INDEX IF NOT EXISTS idx_usage_logs_created ON public.usage_logs (created_at DESC);