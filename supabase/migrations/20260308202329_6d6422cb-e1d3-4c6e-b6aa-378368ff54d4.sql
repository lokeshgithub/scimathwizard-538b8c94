
-- Premium access table: tracks who has premium and when it expires
CREATE TABLE public.premium_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'admin_grant' CHECK (source IN ('admin_grant', 'trial', 'razorpay')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.premium_access ENABLE ROW LEVEL SECURITY;

-- Users can view their own premium status
CREATE POLICY "Users can view own premium access"
  ON public.premium_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all premium access
CREATE POLICY "Admins can manage premium access"
  ON public.premium_access FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Premium requests table: users can request trial access
CREATE TABLE public.premium_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  admin_notes text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  trial_days integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.premium_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests"
  ON public.premium_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create requests
CREATE POLICY "Users can create requests"
  ON public.premium_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view and manage all requests
CREATE POLICY "Admins can manage all requests"
  ON public.premium_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper function to check if a user has active premium
CREATE OR REPLACE FUNCTION public.has_premium(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.premium_access
    WHERE user_id = p_user_id
      AND starts_at <= now()
      AND expires_at > now()
  )
$$;
