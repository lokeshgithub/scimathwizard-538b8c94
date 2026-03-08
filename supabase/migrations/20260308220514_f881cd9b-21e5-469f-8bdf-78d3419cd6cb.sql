
-- Remove overly permissive policies
DROP POLICY "Allow lesson caching via insert" ON public.lessons;
DROP POLICY "Allow lesson caching via update" ON public.lessons;
