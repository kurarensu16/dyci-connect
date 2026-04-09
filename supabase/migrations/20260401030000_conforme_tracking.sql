-- Migration: Add conforme tracking to profiles
-- When the academic year changes, all users must re-accept the DYCI Conforme.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS conforme_accepted_year text;

-- Reset all existing users so they must accept on next login
-- (Initially NULL means "not accepted for any year")
