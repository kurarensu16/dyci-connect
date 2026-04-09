import { supabase } from '../supabaseClient'

// ── Types ─────────────────────────────────────────────────────────────────

export type HandbookStatus = 'draft' | 'pending_approval' | 'published' | 'rejected'
export type SectionStatus = 'draft' | 'dept_review' | 'published'

export type ApproverPosition =
  | 'scholarship'
  | 'finance'
  | 'registrar'
  | 'guidance'
  | 'property_security'
  | 'academic_council'

export const L2_POSITIONS: ApproverPosition[] = [
  'scholarship', 'finance', 'registrar',
  'guidance', 'property_security', 'academic_council',
]

export const ALL_POSITIONS: ApproverPosition[] = [...L2_POSITIONS]

export function positionToLevel(position: ApproverPosition): number {
  if (L2_POSITIONS.includes(position)) return 2
  return 0
}

export interface Handbook {
  id: string
  title: string
  school_year: string
  status: HandbookStatus
  publish_at: string | null
  published_at: string | null
  school_year_locked: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface HandbookSection {
  id: string
  handbook_id: string
  title: string
  content: string
  legacy_content: string | null
  current_level: number
  change_reason: string | null
  sort_order: number
  status: SectionStatus
  is_locked: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface HandbookSectionInput {
  title: string
  content: string
  sort_order: number
}

export interface SectionApproval {
  id: string
  handbook_section_id: string
  approver_user_id: string
  position: ApproverPosition
  level: number
  decision: 'approved' | 'rejected'
  comment: string | null
  decided_at: string
}

export interface AuditTrailEntry {
  id: string
  position: ApproverPosition
  level: number
  decision: 'approved' | 'rejected'
  comment: string | null
  decided_at: string
  approver_name: string
  approver_email: string
}

export interface HandbookApprovalMonitorRow {
  section_id: string
  section_title: string
  section_status: string
  sort_order: number
  current_level: number
  required_positions: ApproverPosition[]
  approvals: Array<{
    handbook_section_id: string
    position: ApproverPosition
    level: number
    decision: 'approved' | 'rejected'
    comment: string | null
    decided_at: string
    approver_user_id: string
    approver_name: string
    approver_email: string
  }>
}

// ── Labels ────────────────────────────────────────────────────────────────

export function approverLabel(position: ApproverPosition): string {
  const map: Record<ApproverPosition, string> = {
    finance: 'Department of Finance',
    registrar: "Office of the Registrar",
    scholarship: 'Scholarship',
    guidance: 'Guidance Office',
    property_security: 'Property/Security Office',
    academic_council: 'Academic Council',
  }
  return map[position] ?? position
}

export function levelLabel(level: number): string {
  switch (level) {
    case 1: return 'Admin Draft'
    case 2: return 'Department Approval'
    default: return `Level ${level}`
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

const DEPT_TO_POSITION: Record<string, ApproverPosition> = {
  'Scholarship': 'scholarship',
  'Department of Finance': 'finance',
  'Office of the Registrar': 'registrar',
  'Guidance Office': 'guidance',
  'Property/Security Office': 'property_security',
  'Academic Council': 'academic_council',
}

export function derivePositionFromProfile(profile: {
  approver_position?: string | null
  department?: string | null
}): ApproverPosition | null {
  if (profile.approver_position && profile.approver_position.trim().length > 0) {
    return profile.approver_position as ApproverPosition
  }
  if (profile.department) {
    return DEPT_TO_POSITION[profile.department] ?? null
  }
  return null
}

// ── Notifications ─────────────────────────────────────────────────────────

async function notifyPosition(position: ApproverPosition, message: string, actionUrl: string) {
  const { data: recipients } = await supabase
    .from('profiles')
    .select('id')
    .eq('approver_position', position)
  if (!recipients?.length) return
  const rows = recipients.map((r: { id: string }) => ({
    user_id: r.id, title: 'Handbook Workflow', message, type: 'info', read: false, action_url: actionUrl,
  }))
  await supabase.from('notifications').insert(rows)
}

async function notifyAdmins(message: string, actionUrl: string) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
  if (!admins?.length) return
  const rows = admins.map((r: { id: string }) => ({
    user_id: r.id, title: 'Handbook Workflow', message, type: 'info', read: false, action_url: actionUrl,
  }))
  await supabase.from('notifications').insert(rows)
}

async function notifyAssignedL2(sectionId: string, message: string, actionUrl: string) {
  const { data: reqs } = await supabase
    .from('handbook_approval_requirements')
    .select('required_position')
    .eq('handbook_section_id', sectionId)
  if (!reqs) return
  for (const r of reqs) {
    if (L2_POSITIONS.includes(r.required_position as ApproverPosition)) {
      await notifyPosition(r.required_position as ApproverPosition, message, actionUrl)
    }
  }
}

// ── Handbook CRUD ─────────────────────────────────────────────────────────

export async function fetchHandbooks() {
  const { data, error } = await supabase
    .from('handbooks')
    .select('*')
    .order('updated_at', { ascending: false })
  return { data: (data as Handbook[] | null) ?? null, error: error?.message ?? null }
}

export async function createHandbook(title: string, schoolYear: string) {
  const userId = await getCurrentUserId()
  if (!userId) return { data: null, error: 'Not authenticated.' }
  const { data, error } = await supabase
    .from('handbooks')
    .insert({ title, school_year: schoolYear, created_by: userId, status: 'draft' })
    .select('*')
    .single()
  return { data: (data as Handbook | null) ?? null, error: error?.message ?? null }
}

export async function updateHandbookMeta(
  handbookId: string,
  patch: Partial<Pick<Handbook, 'title' | 'school_year' | 'school_year_locked' | 'publish_at' | 'status'>>
) {
  const { data, error } = await supabase
    .from('handbooks')
    .update(patch)
    .eq('id', handbookId)
    .select('*')
    .single()
  return { data: (data as Handbook | null) ?? null, error: error?.message ?? null }
}

export async function deleteHandbook(handbookId: string) {
  const { error } = await supabase
    .from('handbooks')
    .delete()
    .eq('id', handbookId)
  return { error: error?.message ?? null }
}

// ── Section CRUD ──────────────────────────────────────────────────────────

export async function fetchSections(handbookId: string) {
  const { data, error } = await supabase
    .from('handbook_sections')
    .select('*')
    .eq('handbook_id', handbookId)
    .order('sort_order', { ascending: true })
  return { data: (data as HandbookSection[] | null) ?? null, error: error?.message ?? null }
}

export async function fetchSingleSection(sectionId: string) {
  const { data, error } = await supabase
    .from('handbook_sections')
    .select('*')
    .eq('id', sectionId)
    .single()
  return { data: (data as HandbookSection | null) ?? null, error: error?.message ?? null }
}

export async function replaceHandbookSections(handbookId: string, sections: HandbookSectionInput[]) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated.' }
  if (sections.length === 0) return { error: 'No sections to sync.' }

  const { data: existing } = await supabase
    .from('handbook_sections')
    .select('id, sort_order')
    .eq('handbook_id', handbookId)

  const existingMap = new Map((existing || []).map((s: any) => [s.sort_order, s.id]))
  const handledIds = new Set<string>()

  for (const s of sections) {
    const existingId = existingMap.get(s.sort_order)
    if (existingId) {
      // Safely update existing without wiping required columns like created_by
      const { error } = await supabase
        .from('handbook_sections')
        .update({
          title: s.title,
          content: s.content,
          legacy_content: s.content,
        })
        .eq('id', existingId)
      
      if (error) return { error: error.message }
      handledIds.add(existingId)
    } else {
      const { data, error } = await supabase
        .from('handbook_sections')
        .insert({
          handbook_id: handbookId,
          title: s.title,
          content: s.content,
          legacy_content: s.content,
          sort_order: s.sort_order,
          status: 'draft',
          current_level: 1,
          is_locked: false,
          created_by: userId,
        })
        .select('id')
        .single()
        
      if (error) return { error: error.message }
      if (data) handledIds.add(data.id)
    }
  }

  const toDelete = (existing || []).map((s: any) => s.id).filter((id: string) => !handledIds.has(id))

  if (toDelete.length > 0) {
    const { error: deleteErr } = await supabase.from('handbook_sections').delete().in('id', toDelete)
    if (deleteErr) return { error: deleteErr.message }
  }

  return { error: null }
}

// ── L1 Admin Actions ──────────────────────────────────────────────────────

export async function assignSectionToDepartments(sectionId: string, positions: ApproverPosition[]) {
  // Clear old assignments
  await supabase
    .from('handbook_approval_requirements')
    .delete()
    .eq('handbook_section_id', sectionId)

  if (positions.length === 0) return { error: null }

  const rows = positions.map((p) => ({
    handbook_section_id: sectionId,
    required_position: p,
  }))
  const { error } = await supabase
    .from('handbook_approval_requirements')
    .insert(rows)
  return { error: error?.message ?? null }
}

export async function fetchSectionAssignments(sectionId: string) {
  const { data, error } = await supabase
    .from('handbook_approval_requirements')
    .select('required_position')
    .eq('handbook_section_id', sectionId)
  return {
    data: (data ?? []).map((r: { required_position: string }) => r.required_position as ApproverPosition),
    error: error?.message ?? null,
  }
}

export async function submitSectionToDeptReview(sectionId: string) {
  const { data: reqs } = await supabase
    .from('handbook_approval_requirements')
    .select('required_position')
    .eq('handbook_section_id', sectionId)

  const deptAssigned = (reqs ?? []).filter((r: { required_position: string }) =>
    L2_POSITIONS.includes(r.required_position as ApproverPosition)
  )
  if (deptAssigned.length === 0) {
    return { error: 'Assign at least one department before submitting.' }
  }

  const { error } = await supabase
    .from('handbook_sections')
    .update({ current_level: 2, status: 'dept_review' })
    .eq('id', sectionId)
  if (error) return { error: error.message }

  await notifyAssignedL2(sectionId, 'A handbook section has been assigned to your department for review.', '/staff/handbook-approvals')

  return { error: null }
}

/** @deprecated Use submitSectionToDeptReview */
export const submitSectionToL2 = submitSectionToDeptReview

export async function submitAllSectionsToL2(handbookId: string) {
  const { data: sections, error: secErr } = await supabase
    .from('handbook_sections')
    .select('id')
    .eq('handbook_id', handbookId)
    .eq('current_level', 1)
  if (secErr) return { error: secErr.message }
  if (!sections || sections.length === 0) return { error: 'No sections at L1 to submit.' }

  const errors: string[] = []
  for (const s of sections) {
    const res = await submitSectionToDeptReview(s.id)
    if (res.error) errors.push(`${s.id}: ${res.error}`)
  }
  if (errors.length > 0) return { error: errors.join('; ') }

  await supabase
    .from('handbooks')
    .update({ status: 'pending_approval' })
    .eq('id', handbookId)

  return { error: null }
}

// ── L2 Department Actions ─────────────────────────────────────────────────

export async function saveSectionEdit(sectionId: string, content: string, changeReason: string) {
  if (!changeReason.trim()) return { error: 'Change reason is required.' }
  const { error } = await supabase
    .from('handbook_sections')
    .update({ content, change_reason: changeReason.trim() })
    .eq('id', sectionId)
  return { error: error?.message ?? null }
}

export async function approveSectionAtLevel(
  sectionId: string,
  position: ApproverPosition,
  level: number,
  comment?: string
) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('handbook_approvals')
    .upsert({
      handbook_section_id: sectionId,
      approver_user_id: userId,
      position,
      level,
      decision: 'approved',
      comment: comment?.trim() || null,
      decided_at: new Date().toISOString(),
    }, { onConflict: 'handbook_section_id,approver_user_id,position,level' })

  if (error) return { error: error.message }

  // Fetch section title for notifications
  const { data: sec } = await supabase
    .from('handbook_sections')
    .select('title')
    .eq('id', sectionId)
    .single()
  const sectionTitle = sec?.title ?? 'a section'

  if (level === 2) {
    await notifyAdmins(`Update: ${approverLabel(position)} approved "${sectionTitle}".`, '/admin/cms')
  }

  return { error: null }
}

export async function rejectSectionAtLevel(
  sectionId: string,
  position: ApproverPosition,
  level: number,
  comment: string
) {
  const userId = await getCurrentUserId()
  if (!userId) return { error: 'Not authenticated.' }
  if (!comment.trim()) return { error: 'A comment is required when rejecting.' }

  const { error } = await supabase
    .from('handbook_approvals')
    .upsert({
      handbook_section_id: sectionId,
      approver_user_id: userId,
      position,
      level,
      decision: 'rejected',
      comment: comment.trim(),
      decided_at: new Date().toISOString(),
    }, { onConflict: 'handbook_section_id,approver_user_id,position,level' })

  if (error) return { error: error.message }

  const { data: sec } = await supabase
    .from('handbook_sections')
    .select('title')
    .eq('id', sectionId)
    .single()
  const sectionTitle = sec?.title ?? 'a section'

  if (level === 2) {
    await notifyAdmins(`Alert: "${sectionTitle}" returned by department reviewer.`, '/admin/cms')
  }

  return { error: null }
}

// ── Approval Queue (for approver pages) ───────────────────────────────────

export async function fetchApproverQueue(position: ApproverPosition) {
  const { data, error } = await supabase
    .from('handbook_approval_requirements')
    .select(`
      handbook_section_id,
      required_position,
      handbook_sections!inner(id, title, content, legacy_content, status, is_locked, handbook_id, sort_order, current_level, change_reason)
    `)
    .eq('required_position', position)
  return { data: data ?? null, error: error?.message ?? null }
}

// ── Audit Trail ───────────────────────────────────────────────────────────

export async function fetchSectionAuditTrail(sectionId: string): Promise<{ data: AuditTrailEntry[] | null; error: string | null }> {
  const { data: approvals, error } = await supabase
    .from('handbook_approvals')
    .select('id, position, level, decision, comment, decided_at, approver_user_id')
    .eq('handbook_section_id', sectionId)
    .order('decided_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  if (!approvals || approvals.length === 0) return { data: [], error: null }

  const userIds = Array.from(new Set(approvals.map((a: any) => a.approver_user_id)))
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, email, first_name, last_name').in('id', userIds)
    : { data: [] }

  const profileMap = new Map<string, { name: string; email: string }>()
  for (const p of profiles ?? []) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Unknown'
    profileMap.set(p.id, { name, email: p.email ?? '' })
  }

  const entries: AuditTrailEntry[] = approvals.map((a: any) => {
    const profile = profileMap.get(a.approver_user_id)
    return {
      id: a.id,
      position: a.position,
      level: a.level,
      decision: a.decision,
      comment: a.comment,
      decided_at: a.decided_at,
      approver_name: profile?.name ?? 'Unknown',
      approver_email: profile?.email ?? '',
    }
  })

  return { data: entries, error: null }
}

// ── Diff Data ─────────────────────────────────────────────────────────────

export async function fetchSectionDiff(sectionId: string) {
  const { data, error } = await supabase
    .from('handbook_sections')
    .select('legacy_content, content, change_reason')
    .eq('id', sectionId)
    .single()
  if (error) return { data: null, error: error.message }
  return { data: data as { legacy_content: string | null; content: string; change_reason: string | null }, error: null }
}

// ── Approval Monitor (admin) ──────────────────────────────────────────────

export async function fetchHandbookApprovalMonitor(handbookId: string) {
  const { data: sections, error: secErr } = await supabase
    .from('handbook_sections')
    .select('id, title, status, sort_order, current_level')
    .eq('handbook_id', handbookId)
    .order('sort_order', { ascending: true })
  if (secErr) return { data: null, error: secErr.message }

  const list = sections ?? []
  if (list.length === 0) return { data: [] as HandbookApprovalMonitorRow[], error: null }

  const sectionIds = list.map((s: any) => s.id)

  const { data: reqs } = await supabase
    .from('handbook_approval_requirements')
    .select('handbook_section_id, required_position')
    .in('handbook_section_id', sectionIds)

  const { data: approvals } = await supabase
    .from('handbook_approvals')
    .select('handbook_section_id, position, level, decision, comment, decided_at, approver_user_id')
    .in('handbook_section_id', sectionIds)

  const userIds = Array.from(new Set((approvals ?? []).map((a: any) => a.approver_user_id)))
  const { data: profiles } = userIds.length > 0
    ? await supabase.from('profiles').select('id, email, first_name, last_name').in('id', userIds)
    : { data: [] }

  const profileMap = new Map<string, { name: string; email: string }>()
  for (const p of profiles ?? []) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || 'Unknown'
    profileMap.set(p.id, { name, email: p.email ?? '' })
  }

  const rows: HandbookApprovalMonitorRow[] = list.map((section: any) => {
    const sectionReqs = (reqs ?? [])
      .filter((r: any) => r.handbook_section_id === section.id)
      .map((r: any) => r.required_position as ApproverPosition)
    const sectionApprovals = (approvals ?? [])
      .filter((a: any) => a.handbook_section_id === section.id)
      .map((a: any) => {
        const profile = profileMap.get(a.approver_user_id)
        return {
          handbook_section_id: a.handbook_section_id,
          position: a.position as ApproverPosition,
          level: a.level as number,
          decision: a.decision as 'approved' | 'rejected',
          comment: a.comment,
          decided_at: a.decided_at,
          approver_user_id: a.approver_user_id,
          approver_name: profile?.name ?? 'Unknown',
          approver_email: profile?.email ?? '',
        }
      })
    return {
      section_id: section.id,
      section_title: section.title,
      section_status: section.status,
      sort_order: section.sort_order,
      current_level: section.current_level,
      required_positions: sectionReqs,
      approvals: sectionApprovals,
    }
  })

  return { data: rows, error: null }
}

// ── Schedule / Publish ────────────────────────────────────────────────────

export async function scheduleHandbookPublish(handbookId: string, publishAtIso: string) {
  const { error } = await supabase
    .from('handbooks')
    .update({ publish_at: publishAtIso, status: 'pending_approval' })
    .eq('id', handbookId)
  return { error: error?.message ?? null }
}

export async function publishHandbookNow(handbookId: string) {
  const { data: sections, error: sectionErr } = await supabase
    .from('handbook_sections')
    .select('status')
    .eq('handbook_id', handbookId)
  if (sectionErr) return { error: sectionErr.message, waitingForDate: false }
  if (!sections || sections.length === 0) return { error: 'No sections found.', waitingForDate: false }
  if (sections.some((s: { status: string }) => s.status !== 'published')) {
    return { error: 'All sections must complete the approval workflow before publishing.', waitingForDate: false }
  }

  const { data: hb } = await supabase.from('handbooks').select('publish_at').eq('id', handbookId).single()
  const now = new Date()
  const publishAt = hb?.publish_at ? new Date(hb.publish_at) : null
  const waitingForDate = !!publishAt && publishAt.getTime() > now.getTime()

  const { error } = await supabase
    .from('handbooks')
    .update(waitingForDate
      ? { status: 'pending_approval' }
      : { published_at: now.toISOString(), status: 'published' }
    )
    .eq('id', handbookId)
  return { error: error?.message ?? null, waitingForDate }
}
