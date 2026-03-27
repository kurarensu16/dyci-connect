-- Handbook approver workflow
-- Keeps existing broad roles and adds scoped approver metadata + approval tables.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1) Profiles approver metadata
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_approver boolean not null default false,
  add column if not exists approver_position text,
  add column if not exists approver_active boolean not null default true;

alter table public.profiles
  drop constraint if exists profiles_approver_position_chk;

alter table public.profiles
  add constraint profiles_approver_position_chk
  check (
    approver_position is null
    or approver_position in ('scholarship', 'finance', 'registrar', 'vice_president', 'president')
  );

create index if not exists idx_profiles_is_approver on public.profiles(is_approver);
create index if not exists idx_profiles_approver_position on public.profiles(approver_position);
create index if not exists idx_profiles_approver_active on public.profiles(approver_active);

-- ---------------------------------------------------------------------------
-- 2) Workflow tables
-- ---------------------------------------------------------------------------
create table if not exists public.handbooks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  school_year text not null,
  status text not null default 'draft',
  publish_at timestamptz,
  published_at timestamptz,
  school_year_locked boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handbooks_status_chk check (
    status in ('draft', 'pending_approval', 'published', 'rejected')
  )
);

create index if not exists idx_handbooks_status on public.handbooks(status);
create index if not exists idx_handbooks_publish_at on public.handbooks(publish_at);
create index if not exists idx_handbooks_school_year on public.handbooks(school_year);

create table if not exists public.handbook_sections (
  id uuid primary key default gen_random_uuid(),
  handbook_id uuid not null references public.handbooks(id) on delete cascade,
  title text not null,
  content text not null default '',
  sort_order int not null default 0,
  status text not null default 'draft',
  is_locked boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handbook_sections_status_chk check (
    status in ('draft', 'pending_approval', 'approved', 'rejected')
  )
);

create index if not exists idx_handbook_sections_handbook_id on public.handbook_sections(handbook_id);
create index if not exists idx_handbook_sections_status on public.handbook_sections(status);
create index if not exists idx_handbook_sections_sort on public.handbook_sections(handbook_id, sort_order);

create table if not exists public.handbook_approval_requirements (
  id uuid primary key default gen_random_uuid(),
  handbook_section_id uuid not null references public.handbook_sections(id) on delete cascade,
  required_position text not null,
  created_at timestamptz not null default now(),
  constraint handbook_approval_requirements_pos_chk check (
    required_position in ('scholarship', 'finance', 'registrar', 'vice_president', 'president')
  ),
  constraint handbook_approval_requirements_unique unique (handbook_section_id, required_position)
);

create table if not exists public.handbook_approvals (
  id uuid primary key default gen_random_uuid(),
  handbook_section_id uuid not null references public.handbook_sections(id) on delete cascade,
  approver_user_id uuid not null references auth.users(id) on delete cascade,
  position text not null,
  decision text not null,
  comment text,
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint handbook_approvals_position_chk check (
    position in ('scholarship', 'finance', 'registrar', 'vice_president', 'president')
  ),
  constraint handbook_approvals_decision_chk check (
    decision in ('approved', 'rejected')
  ),
  constraint handbook_approvals_unique unique (handbook_section_id, approver_user_id, position)
);

create index if not exists idx_handbook_approvals_section on public.handbook_approvals(handbook_section_id);
create index if not exists idx_handbook_approvals_user on public.handbook_approvals(approver_user_id);

-- ---------------------------------------------------------------------------
-- 3) Updated-at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at_generic()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_handbooks_updated_at on public.handbooks;
create trigger trg_handbooks_updated_at
before update on public.handbooks
for each row execute function public.set_updated_at_generic();

drop trigger if exists trg_handbook_sections_updated_at on public.handbook_sections;
create trigger trg_handbook_sections_updated_at
before update on public.handbook_sections
for each row execute function public.set_updated_at_generic();

drop trigger if exists trg_handbook_approvals_updated_at on public.handbook_approvals;
create trigger trg_handbook_approvals_updated_at
before update on public.handbook_approvals
for each row execute function public.set_updated_at_generic();

-- ---------------------------------------------------------------------------
-- 4) Rule enforcement
-- ---------------------------------------------------------------------------
create or replace function public.prevent_locked_section_edits()
returns trigger
language plpgsql
as $$
begin
  if old.is_locked and (
    new.title is distinct from old.title
    or new.content is distinct from old.content
    or new.sort_order is distinct from old.sort_order
  ) then
    raise exception 'Approved/locked section cannot be edited';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_locked_section_edits on public.handbook_sections;
create trigger trg_prevent_locked_section_edits
before update on public.handbook_sections
for each row execute function public.prevent_locked_section_edits();

create or replace function public.prevent_school_year_locked_changes()
returns trigger
language plpgsql
as $$
declare
  locked boolean;
  target_handbook_id uuid;
begin
  if tg_table_name = 'handbook_sections' then
    target_handbook_id := coalesce(new.handbook_id, old.handbook_id);
  elsif tg_table_name = 'handbook_approval_requirements' then
    select s.handbook_id
    into target_handbook_id
    from public.handbook_sections s
    where s.id = coalesce(new.handbook_section_id, old.handbook_section_id);
  else
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if target_handbook_id is not null then
    select h.school_year_locked
    into locked
    from public.handbooks h
    where h.id = target_handbook_id;

    if coalesce(locked, false) then
      raise exception 'Handbook is school-year locked and cannot be modified';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sections_school_year_lock on public.handbook_sections;
create trigger trg_sections_school_year_lock
before insert or update or delete on public.handbook_sections
for each row execute function public.prevent_school_year_locked_changes();

drop trigger if exists trg_requirements_school_year_lock on public.handbook_approval_requirements;
create trigger trg_requirements_school_year_lock
before insert or update or delete on public.handbook_approval_requirements
for each row execute function public.prevent_school_year_locked_changes();

create or replace function public.evaluate_handbook_section_approval(section_uuid uuid)
returns void
language plpgsql
as $$
declare
  req_count int;
  approved_count int;
  rejected_count int;
  section_handbook_id uuid;
  sections_total int;
  sections_approved int;
begin
  select handbook_id into section_handbook_id
  from public.handbook_sections
  where id = section_uuid;

  if section_handbook_id is null then
    return;
  end if;

  select count(*) into req_count
  from public.handbook_approval_requirements
  where handbook_section_id = section_uuid;

  select count(*) into approved_count
  from public.handbook_approvals
  where handbook_section_id = section_uuid
    and decision = 'approved';

  select count(*) into rejected_count
  from public.handbook_approvals
  where handbook_section_id = section_uuid
    and decision = 'rejected';

  if rejected_count > 0 then
    update public.handbook_sections
    set status = 'rejected', is_locked = false
    where id = section_uuid;
  elsif req_count > 0 and approved_count = req_count then
    update public.handbook_sections
    set status = 'approved', is_locked = true
    where id = section_uuid;
  else
    update public.handbook_sections
    set status = 'pending_approval', is_locked = false
    where id = section_uuid;
  end if;

  -- Update handbook high-level status from its sections.
  select count(*), count(*) filter (where status = 'approved')
  into sections_total, sections_approved
  from public.handbook_sections
  where handbook_id = section_handbook_id;

  if sections_total > 0 and sections_total = sections_approved then
    update public.handbooks
    set status = case when publish_at is not null and publish_at > now()
      then 'pending_approval'
      else 'published'
    end,
    published_at = case when publish_at is null or publish_at <= now() then now() else published_at end
    where id = section_handbook_id;
  else
    update public.handbooks
    set status = 'pending_approval'
    where id = section_handbook_id
      and status <> 'draft';
  end if;
end;
$$;

create or replace function public.trg_evaluate_handbook_section_approval()
returns trigger
language plpgsql
as $$
begin
  perform public.evaluate_handbook_section_approval(coalesce(new.handbook_section_id, old.handbook_section_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_evaluate_handbook_section_approval on public.handbook_approvals;
create trigger trg_evaluate_handbook_section_approval
after insert or update or delete on public.handbook_approvals
for each row execute function public.trg_evaluate_handbook_section_approval();

create or replace function public.validate_approver_identity()
returns trigger
language plpgsql
as $$
declare
  p record;
begin
  select is_approver, approver_active, approver_position
  into p
  from public.profiles
  where id = new.approver_user_id;

  if p is null then
    raise exception 'Approver profile does not exist';
  end if;

  if p.is_approver is distinct from true or p.approver_active is distinct from true then
    raise exception 'User is not an active approver';
  end if;

  if p.approver_position is distinct from new.position then
    raise exception 'Approver position does not match decision position';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_approver_identity on public.handbook_approvals;
create trigger trg_validate_approver_identity
before insert or update on public.handbook_approvals
for each row execute function public.validate_approver_identity();

create or replace function public.publish_due_handbooks()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
begin
  with ready as (
    select h.id
    from public.handbooks h
    where h.status = 'pending_approval'
      and h.publish_at is not null
      and h.publish_at <= now()
      and not exists (
        select 1
        from public.handbook_sections s
        where s.handbook_id = h.id
          and s.status <> 'approved'
      )
  )
  update public.handbooks h
  set status = 'published',
      published_at = now()
  from ready
  where h.id = ready.id;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5) RLS policies
-- ---------------------------------------------------------------------------
alter table public.handbooks enable row level security;
alter table public.handbook_sections enable row level security;
alter table public.handbook_approval_requirements enable row level security;
alter table public.handbook_approvals enable row level security;

drop policy if exists handbooks_read_auth on public.handbooks;
create policy handbooks_read_auth on public.handbooks
for select to authenticated
using (true);

drop policy if exists handbooks_admin_write on public.handbooks;
create policy handbooks_admin_write on public.handbooks
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

drop policy if exists handbook_sections_read_auth on public.handbook_sections;
create policy handbook_sections_read_auth on public.handbook_sections
for select to authenticated
using (true);

drop policy if exists handbook_sections_admin_write on public.handbook_sections;
create policy handbook_sections_admin_write on public.handbook_sections
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

drop policy if exists handbook_requirements_read_auth on public.handbook_approval_requirements;
create policy handbook_requirements_read_auth on public.handbook_approval_requirements
for select to authenticated
using (true);

drop policy if exists handbook_requirements_admin_write on public.handbook_approval_requirements;
create policy handbook_requirements_admin_write on public.handbook_approval_requirements
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

drop policy if exists handbook_approvals_read_auth on public.handbook_approvals;
create policy handbook_approvals_read_auth on public.handbook_approvals
for select to authenticated
using (true);

drop policy if exists handbook_approvals_approver_write on public.handbook_approvals;
create policy handbook_approvals_approver_write on public.handbook_approvals
for insert to authenticated
with check (
  approver_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_approver = true
      and p.approver_active = true
      and p.approver_position = position
  )
);

drop policy if exists handbook_approvals_approver_update on public.handbook_approvals;
create policy handbook_approvals_approver_update on public.handbook_approvals
for update to authenticated
using (
  approver_user_id = auth.uid()
)
with check (
  approver_user_id = auth.uid()
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_approver = true
      and p.approver_active = true
      and p.approver_position = position
  )
);

