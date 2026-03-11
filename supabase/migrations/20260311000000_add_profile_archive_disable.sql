-- Add soft-disable and archive fields for admin user actions.
alter table public.profiles
  add column if not exists disabled_at timestamptz,
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists idx_profiles_is_archived on public.profiles(is_archived);
create index if not exists idx_profiles_archived_at on public.profiles(archived_at);
create index if not exists idx_profiles_disabled_at on public.profiles(disabled_at);

