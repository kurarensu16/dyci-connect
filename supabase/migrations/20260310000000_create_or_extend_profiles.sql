-- Create/extend public.profiles to match app usage.
-- This app relies on profiles.role = 'admin' for admin-only features.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'student',
  auth_provider text,
  student_employee_id text,
  first_name text,
  middle_name text,
  last_name text,
  nickname text,
  address text,
  region text,
  province text,
  city text,
  barangay text,
  program text,
  department text,
  year_level text,
  section text,
  avatar_url text,
  cor_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add any missing columns if the table already exists.
alter table public.profiles
  add column if not exists email text,
  add column if not exists role text,
  add column if not exists auth_provider text,
  add column if not exists student_employee_id text,
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists nickname text,
  add column if not exists address text,
  add column if not exists region text,
  add column if not exists province text,
  add column if not exists city text,
  add column if not exists barangay text,
  add column if not exists program text,
  add column if not exists department text,
  add column if not exists year_level text,
  add column if not exists section text,
  add column if not exists avatar_url text,
  add column if not exists cor_url text,
  add column if not exists verified boolean,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

-- Defaults (idempotent)
alter table public.profiles
  alter column role set default 'student';

alter table public.profiles
  alter column verified set default false;

-- Ensure NOT NULL where possible without breaking existing rows
update public.profiles set role = 'student' where role is null;
update public.profiles set verified = false where verified is null;

alter table public.profiles
  alter column role set not null,
  alter column verified set not null;

-- Keep updated_at fresh
create or replace function public.set_profile_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profile_updated_at();

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_verified on public.profiles(verified);

