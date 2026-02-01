-- Reset all user stars to 0 due to star calculation bug fix
-- This migration resets total_stars for all users to ensure fair starting point
-- after fixing the star sync logic that caused random inflation

-- Reset all user stars to 0
UPDATE public.profiles
SET total_stars = 0
WHERE total_stars IS NOT NULL AND total_stars > 0;

-- Log the reset (optional - for audit purposes)
-- This comment serves as documentation that stars were reset on 2026-02-01
-- Reason: Star sync bug caused stars to inflate randomly (1,100 → 3,500 → 11,000)
-- Fix: Database is now source of truth, localStorage syncs FROM database

COMMENT ON TABLE public.profiles IS 'User profiles. Stars were reset to 0 on 2026-02-01 due to sync bug fix.';
