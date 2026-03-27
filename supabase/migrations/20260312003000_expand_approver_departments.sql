-- Expand approver departments/offices:
-- scholarship, finance, registrar, vice_president, president

alter table public.profiles
  drop constraint if exists profiles_approver_position_chk;

alter table public.profiles
  add constraint profiles_approver_position_chk
  check (
    approver_position is null
    or approver_position in (
      'scholarship',
      'finance',
      'registrar',
      'vice_president',
      'president'
    )
  );

alter table public.handbook_approval_requirements
  drop constraint if exists handbook_approval_requirements_pos_chk;

alter table public.handbook_approval_requirements
  add constraint handbook_approval_requirements_pos_chk
  check (
    required_position in (
      'scholarship',
      'finance',
      'registrar',
      'vice_president',
      'president'
    )
  );

alter table public.handbook_approvals
  drop constraint if exists handbook_approvals_position_chk;

alter table public.handbook_approvals
  add constraint handbook_approvals_position_chk
  check (
    position in (
      'scholarship',
      'finance',
      'registrar',
      'vice_president',
      'president'
    )
  );

