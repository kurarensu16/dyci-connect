-- Add auth_provider to profiles so we can block "Forgot password" for Google sign-in users.
-- Run this in Supabase Dashboard: SQL Editor → New query → paste and run.

-- 1) Add column (nullable for existing rows; new/updated rows set it via app)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auth_provider text;

COMMENT ON COLUMN public.profiles.auth_provider IS 'Auth method: email | google. Used to block forgot-password for OAuth users.';

-- 2) Optional: backfill existing email users (if you have no Google users yet, skip or run once)
-- UPDATE public.profiles SET auth_provider = 'email' WHERE auth_provider IS NULL;

-- 3) RPC so Forgot Password page can check provider by email without exposing full profile.
--    anon can call this; it returns only 'email' | 'google' | null.
CREATE OR REPLACE FUNCTION public.get_auth_provider_for_email(em text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth_provider FROM public.profiles WHERE email = em LIMIT 1;
$$;

-- Allow anon (and authenticated) to call this function
GRANT EXECUTE ON FUNCTION public.get_auth_provider_for_email(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_auth_provider_for_email(text) TO authenticated;
