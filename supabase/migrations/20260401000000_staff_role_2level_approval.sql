-- ============================================================
-- Option B: Rename faculty→staff, 2-level approval, position=identity
-- ============================================================

-- 1) Drop the old role constraint (could be either name), then rename, then re-add
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_chk;

UPDATE public.profiles SET role = 'staff' WHERE role = 'faculty';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','staff','student'));

-- 2) Drop all RLS policies that reference is_approver / approver_active
DROP POLICY IF EXISTS handbook_approvals_approver_write ON public.handbook_approvals;
DROP POLICY IF EXISTS handbook_approvals_approver_update ON public.handbook_approvals;
DROP POLICY IF EXISTS handbook_sections_l2_edit ON public.handbook_sections;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_approver;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS approver_active;

-- Re-create handbook_sections_l2_edit using approver_position
CREATE POLICY handbook_sections_l2_edit ON public.handbook_sections
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approver_position IS NOT NULL
    )
    AND current_level = 2
  );

-- Re-create equivalent policies using approver_position instead
CREATE POLICY handbook_approvals_approver_write ON public.handbook_approvals
  FOR INSERT
  WITH CHECK (
    approver_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approver_position IS NOT NULL
        AND p.approver_position = handbook_approvals.position
    )
  );

CREATE POLICY handbook_approvals_approver_update ON public.handbook_approvals
  FOR UPDATE
  USING (
    approver_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.approver_position IS NOT NULL
        AND p.approver_position = handbook_approvals.position
    )
  );

-- 3) Expand approver_position to include all office roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_approver_position_chk;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_approver_position_chk CHECK (
    approver_position IS NULL
    OR approver_position IN (
      'scholarship','finance','registrar',
      'guidance','property_security','academic_council',
      'vice_president','president'
    )
  );

-- 4) Add max_level to handbook_sections (2 = dept only, 3 = dept + final approver)
ALTER TABLE public.handbook_sections
  ADD COLUMN IF NOT EXISTS max_level int NOT NULL DEFAULT 3;

-- 5) Migrate section statuses to new 2-level names
ALTER TABLE public.handbook_sections DROP CONSTRAINT IF EXISTS handbook_sections_status_chk;

UPDATE public.handbook_sections SET status = 'dept_review' WHERE status IN ('l2_review');
UPDATE public.handbook_sections SET status = 'final_review' WHERE status IN ('l3_review','l4_review');

ALTER TABLE public.handbook_sections
  ADD CONSTRAINT handbook_sections_status_chk CHECK (
    status IN ('draft','dept_review','final_review','published')
  );

-- 6) Rewrite evaluation trigger for 2-level flow
CREATE OR REPLACE FUNCTION public.evaluate_handbook_section_approval(section_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sec record;
  req_count int;
  dept_approved_count int;
  latest_decision text;
  latest_level int;
  section_handbook_id uuid;
  sections_total int;
  sections_published int;
  sec_max_level int;
BEGIN
  SELECT id, handbook_id, current_level, status, max_level
  INTO sec
  FROM public.handbook_sections
  WHERE id = section_uuid;

  IF sec IS NULL THEN RETURN; END IF;
  section_handbook_id := sec.handbook_id;
  sec_max_level := sec.max_level;

  SELECT a.decision, a.level
  INTO latest_decision, latest_level
  FROM public.handbook_approvals a
  WHERE a.handbook_section_id = section_uuid
  ORDER BY a.decided_at DESC
  LIMIT 1;

  IF latest_level IS NULL THEN RETURN; END IF;

  -- ── Department Review (level 2) ──
  IF latest_level = 2 AND latest_decision = 'approved' THEN
    SELECT count(*) INTO req_count
    FROM public.handbook_approval_requirements
    WHERE handbook_section_id = section_uuid
      AND public.is_l2_position(required_position);

    SELECT count(DISTINCT a.position) INTO dept_approved_count
    FROM public.handbook_approvals a
    WHERE a.handbook_section_id = section_uuid
      AND a.level = 2
      AND a.decision = 'approved'
      AND public.is_l2_position(a.position);

    IF req_count > 0 AND dept_approved_count >= req_count THEN
      IF sec_max_level <= 2 THEN
        -- Auto-publish: no final approver needed
        UPDATE public.handbook_sections
        SET status = 'published', is_locked = true, current_level = 2
        WHERE id = section_uuid;

        SELECT count(*), count(*) FILTER (WHERE status = 'published')
        INTO sections_total, sections_published
        FROM public.handbook_sections
        WHERE handbook_id = section_handbook_id;

        IF sections_total > 0 AND sections_total = sections_published THEN
          UPDATE public.handbooks
          SET status = 'published', published_at = coalesce(published_at, now())
          WHERE id = section_handbook_id;
        END IF;
      ELSE
        -- Move to final review
        UPDATE public.handbook_sections
        SET current_level = 3, status = 'final_review'
        WHERE id = section_uuid;
      END IF;
    END IF;
    RETURN;
  END IF;

  -- ── Final Approver (level 3) ──
  IF latest_level = 3 THEN
    IF latest_decision = 'approved' THEN
      UPDATE public.handbook_sections
      SET status = 'published', is_locked = true, current_level = 3
      WHERE id = section_uuid;

      SELECT count(*), count(*) FILTER (WHERE status = 'published')
      INTO sections_total, sections_published
      FROM public.handbook_sections
      WHERE handbook_id = section_handbook_id;

      IF sections_total > 0 AND sections_total = sections_published THEN
        UPDATE public.handbooks
        SET status = 'published', published_at = coalesce(published_at, now())
        WHERE id = section_handbook_id;
      END IF;
    ELSE
      -- Rejection: back to department review
      DELETE FROM public.handbook_approvals
      WHERE handbook_section_id = section_uuid AND level = 2;

      UPDATE public.handbook_sections
      SET current_level = 2, status = 'dept_review', is_locked = false
      WHERE id = section_uuid;
    END IF;
    RETURN;
  END IF;
END;
$$;

-- 7) Update index for role
DROP INDEX IF EXISTS idx_profiles_role;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 8) Recreate admin_users_view to include approver_position
DROP VIEW IF EXISTS public.admin_users_view;
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT
  p.id,
  p.email,
  p.student_employee_id AS user_id,
  concat_ws(' ', p.first_name, p.middle_name, p.last_name) AS full_name,
  p.avatar_url,
  p.role,
  p.approver_position,
  p.verified,
  p.is_archived,
  p.archived_at,
  p.disabled_at,
  p.last_login,
  p.department,
  0 AS storage_mb
FROM public.profiles p;

GRANT SELECT ON public.admin_users_view TO authenticated;
GRANT SELECT ON public.admin_users_view TO service_role;
