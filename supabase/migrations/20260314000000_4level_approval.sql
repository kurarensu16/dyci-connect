-- 4-Level Approval Engine migration
-- Converts the parallel approval model into a linear L1 > L2 > L3 > L4 flow.

-- ---------------------------------------------------------------------------
-- 1a) Expand approver positions across all check constraints
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_approver_position_chk;
alter table public.profiles
  add constraint profiles_approver_position_chk check (
    approver_position is null
    or approver_position in (
      'scholarship','finance','registrar',
      'guidance','property_security','academic_council',
      'vice_president','president'
    )
  );

alter table public.handbook_approval_requirements
  drop constraint if exists handbook_approval_requirements_pos_chk;
alter table public.handbook_approval_requirements
  add constraint handbook_approval_requirements_pos_chk check (
    required_position in (
      'scholarship','finance','registrar',
      'guidance','property_security','academic_council',
      'vice_president','president'
    )
  );

alter table public.handbook_approvals
  drop constraint if exists handbook_approvals_position_chk;
alter table public.handbook_approvals
  add constraint handbook_approvals_position_chk check (
    position in (
      'scholarship','finance','registrar',
      'guidance','property_security','academic_council',
      'vice_president','president'
    )
  );

-- ---------------------------------------------------------------------------
-- 1b) New columns on handbook_sections
-- ---------------------------------------------------------------------------
alter table public.handbook_sections
  add column if not exists legacy_content text,
  add column if not exists current_level int not null default 1,
  add column if not exists change_reason text;

-- Drop old constraint first, then migrate data, then add new constraint
alter table public.handbook_sections drop constraint if exists handbook_sections_status_chk;

update public.handbook_sections set status = 'draft' where status in ('pending_approval','rejected');
update public.handbook_sections set status = 'published' where status = 'approved';

alter table public.handbook_sections
  add constraint handbook_sections_status_chk check (
    status in ('draft','l2_review','l3_review','l4_review','published')
  );

-- ---------------------------------------------------------------------------
-- 1c) Add level column to handbook_approvals
-- ---------------------------------------------------------------------------
alter table public.handbook_approvals
  add column if not exists level int not null default 2;

-- Replace the old unique constraint with one that includes level
alter table public.handbook_approvals
  drop constraint if exists handbook_approvals_unique;
alter table public.handbook_approvals
  add constraint handbook_approvals_unique
  unique (handbook_section_id, approver_user_id, position, level);

-- ---------------------------------------------------------------------------
-- 1d) Rewrite evaluation trigger for linear 4-level flow
-- ---------------------------------------------------------------------------

-- L2 positions list used inside the trigger
create or replace function public.is_l2_position(pos text) returns boolean
language sql immutable as $$
  select pos in ('scholarship','finance','registrar','guidance','property_security','academic_council');
$$;

create or replace function public.evaluate_handbook_section_approval(section_uuid uuid)
returns void
language plpgsql
as $$
declare
  sec record;
  req_count int;
  l2_approved_count int;
  latest_decision text;
  latest_level int;
  section_handbook_id uuid;
  sections_total int;
  sections_published int;
begin
  select id, handbook_id, current_level, status
  into sec
  from public.handbook_sections
  where id = section_uuid;

  if sec is null then return; end if;
  section_handbook_id := sec.handbook_id;

  -- Find the latest approval record for this section to determine what just happened
  select a.decision, a.level
  into latest_decision, latest_level
  from public.handbook_approvals a
  where a.handbook_section_id = section_uuid
  order by a.decided_at desc
  limit 1;

  if latest_level is null then return; end if;

  -- ── Level 2 decision ──────────────────────────────────────────────────
  if latest_level = 2 and latest_decision = 'approved' then
    -- Count required L2 departments
    select count(*) into req_count
    from public.handbook_approval_requirements
    where handbook_section_id = section_uuid
      and public.is_l2_position(required_position);

    -- Count distinct L2 approved decisions (latest per position only)
    select count(distinct a.position) into l2_approved_count
    from public.handbook_approvals a
    where a.handbook_section_id = section_uuid
      and a.level = 2
      and a.decision = 'approved'
      and public.is_l2_position(a.position);

    if req_count > 0 and l2_approved_count >= req_count then
      update public.handbook_sections
      set current_level = 3, status = 'l3_review'
      where id = section_uuid;
    end if;
    -- else: still waiting for other L2 depts
    return;
  end if;

  -- ── Level 3 (VP) decision ─────────────────────────────────────────────
  if latest_level = 3 then
    if latest_decision = 'approved' then
      update public.handbook_sections
      set current_level = 4, status = 'l4_review'
      where id = section_uuid;
    else
      -- VP rejection -> back to L2, clear L2 approvals for fresh cycle
      delete from public.handbook_approvals
      where handbook_section_id = section_uuid and level = 2;

      update public.handbook_sections
      set current_level = 2, status = 'l2_review', is_locked = false
      where id = section_uuid;
    end if;
    return;
  end if;

  -- ── Level 4 (President) decision ──────────────────────────────────────
  if latest_level = 4 then
    if latest_decision = 'approved' then
      update public.handbook_sections
      set status = 'published', is_locked = true, current_level = 4
      where id = section_uuid;

      -- Check if all sections in the handbook are published
      select count(*), count(*) filter (where status = 'published')
      into sections_total, sections_published
      from public.handbook_sections
      where handbook_id = section_handbook_id;

      if sections_total > 0 and sections_total = sections_published then
        update public.handbooks
        set status = 'published',
            published_at = coalesce(published_at, now())
        where id = section_handbook_id;
      end if;
    else
      -- President rejection -> bypass VP, back to L2
      delete from public.handbook_approvals
      where handbook_section_id = section_uuid and level in (2, 3);

      update public.handbook_sections
      set current_level = 2, status = 'l2_review', is_locked = false
      where id = section_uuid;
    end if;
    return;
  end if;
end;
$$;

-- The trigger function stays the same shape
create or replace function public.trg_evaluate_handbook_section_approval()
returns trigger
language plpgsql
as $$
begin
  perform public.evaluate_handbook_section_approval(
    coalesce(new.handbook_section_id, old.handbook_section_id)
  );
  return coalesce(new, old);
end;
$$;

-- ---------------------------------------------------------------------------
-- 1e) RLS: Allow L2 departments to edit their assigned sections
-- ---------------------------------------------------------------------------

-- L2 can update content + change_reason on sections assigned to their position at level 2
drop policy if exists handbook_sections_l2_edit on public.handbook_sections;
create policy handbook_sections_l2_edit on public.handbook_sections
for update to authenticated
using (
  current_level = 2
  and exists (
    select 1
    from public.handbook_approval_requirements r
    join public.profiles p on p.id = auth.uid()
    where r.handbook_section_id = handbook_sections.id
      and (
        r.required_position = p.approver_position
        or r.required_position = (
          case p.department
            when 'Department of Finance' then 'finance'
            when 'Office of the Registrar' then 'registrar'
            when 'Office of the Vice President' then 'vice_president'
            when 'Office of the President' then 'president'
            when 'Guidance Office' then 'guidance'
            when 'Property/Security Office' then 'property_security'
            when 'Academic Council' then 'academic_council'
            else '___none___'
          end
        )
      )
      and coalesce(p.approver_active, true) = true
  )
)
with check (
  current_level = 2
);

-- L2 can also insert approval decisions for their own position
-- (existing approver_write policy already covers inserts, but let's ensure
--  the position check is expanded for the new positions)
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
using (approver_user_id = auth.uid())
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

-- Relax the validate_approver_identity trigger to also accept department-based fallbacks
create or replace function public.validate_approver_identity()
returns trigger
language plpgsql
as $$
declare
  p record;
  derived_position text;
begin
  select is_approver, approver_active, approver_position, department
  into p
  from public.profiles
  where id = new.approver_user_id;

  if p is null then
    raise exception 'Approver profile does not exist';
  end if;

  -- Derive position from explicit field or department fallback
  derived_position := p.approver_position;
  if derived_position is null or derived_position = '' then
    derived_position := case p.department
      when 'Department of Finance' then 'finance'
      when 'Office of the Registrar' then 'registrar'
      when 'Office of the Vice President' then 'vice_president'
      when 'Office of the President' then 'president'
      when 'Guidance Office' then 'guidance'
      when 'Property/Security Office' then 'property_security'
      when 'Academic Council' then 'academic_council'
      else null
    end;
  end if;

  if coalesce(p.approver_active, true) = false then
    raise exception 'User is not an active approver';
  end if;

  if derived_position is distinct from new.position then
    raise exception 'Approver position does not match decision position (expected %, got %)', derived_position, new.position;
  end if;

  return new;
end;
$$;

-- Update handbook status constraint to include the new section statuses
alter table public.handbooks drop constraint if exists handbooks_status_chk;
alter table public.handbooks
  add constraint handbooks_status_chk check (
    status in ('draft','pending_approval','published','rejected')
  );
