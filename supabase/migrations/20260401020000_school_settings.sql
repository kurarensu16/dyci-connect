-- Global School Settings
-- Simple table to store the global active academic year and other system-wide settings.

create table if not exists public.school_settings (
  id int primary key default 1,
  current_academic_year text not null default '2025-2026',
  updated_at timestamptz not null default now()
);

-- Ensure only one row exists (id = 1)
alter table public.school_settings
  add constraint school_settings_single_row_chk check (id = 1);

-- Insert the default configuration
insert into public.school_settings (id, current_academic_year)
values (1, '2025-2026')
on conflict (id) do nothing;

create or replace function public.set_updated_at_school_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_school_settings_updated_at on public.school_settings;
create trigger trg_school_settings_updated_at
before update on public.school_settings
for each row execute function public.set_updated_at_school_settings();

-- RLS policies
alter table public.school_settings enable row level security;

drop policy if exists school_settings_read_auth on public.school_settings;
create policy school_settings_read_auth on public.school_settings
for select to authenticated
using (true);

drop policy if exists school_settings_admin_write on public.school_settings;
create policy school_settings_admin_write on public.school_settings
for all to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);
