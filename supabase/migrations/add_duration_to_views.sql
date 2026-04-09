-- Run this in your Supabase Dashboard > SQL Editor
ALTER TABLE public.handbook_views 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN public.handbook_views.duration_seconds IS 'Time spent on the section in seconds';
