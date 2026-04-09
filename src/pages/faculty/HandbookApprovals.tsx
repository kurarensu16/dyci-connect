import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  FaSpinner,
  FaBook,
  FaArrowLeft,
  FaCalendarAlt,
  FaBold,
  FaItalic,
  FaUnderline,
  FaListUl,
  FaListOl,
  FaHistory,
  FaCheckDouble,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import {
  fetchApproverQueue,
  fetchHandbooks,
  fetchSectionDiff,
  fetchSectionAuditTrail,
  saveSectionEdit,
  approveSectionAtLevel,
  rejectSectionAtLevel,
  derivePositionFromProfile,
  positionToLevel,
  approverLabel,
  levelLabel,
  type ApproverPosition,
  type Handbook,
  type AuditTrailEntry,
} from '../../lib/api/handbookWorkflow'

function stripHtml(html: string): string {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent || d.innerText || ''
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  dept_review: 'bg-blue-50 text-blue-700 border border-blue-200',
  pending_approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
}

const ProgressBar: React.FC<{ currentLevel: number }> = ({ currentLevel }) => {
  const levels = [
    { n: 1, label: 'Admin Draft' },
    { n: 2, label: 'Department' },
  ]
  return (
    <div className="flex items-center gap-0.5">
      {levels.map((l, i) => {
        const done = currentLevel > l.n
        const active = currentLevel === l.n
        return (
          <React.Fragment key={l.n}>
            {i > 0 && <div className={`h-0.5 w-3 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            <div className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{l.label}</div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

type SectionItem = {
  id: string
  title: string
  content: string
  legacy_content: string | null
  status: string
  handbook_id: string
  sort_order: number
  current_level: number
  change_reason: string | null
}

type PageView = 'list' | 'detail'

const HandbookApprovals: React.FC = () => {
  const [view, setView] = useState<PageView>('list')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [bulkSaving, setBulkSaving] = useState(false)
  const [position, setPosition] = useState<ApproverPosition | null>(null)
  const [userLevel, setUserLevel] = useState(0)
  const [handbooks, setHandbooks] = useState<Handbook[]>([])
  const [sections, setSections] = useState<SectionItem[]>([])
  const [activeHandbook, setActiveHandbook] = useState<Handbook | null>(null)
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [changeReason, setChangeReason] = useState('')
  const [commentBySection, setCommentBySection] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 5
  const editorRef = useRef<HTMLDivElement>(null)

  const loadContext = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); return }
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) { setLoading(false); setPosition(null); return }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    const derived = derivePositionFromProfile(profile ?? {})

    if (!derived) { setPosition(null); setSections([]); setLoading(false); return }

    setPosition(derived)
    const lvl = positionToLevel(derived)
    setUserLevel(lvl)

    const [queueRes, handbooksRes] = await Promise.all([fetchApproverQueue(derived), fetchHandbooks()])
    if (queueRes.error) toast.error(`Approvals: ${queueRes.error}`)

    setHandbooks(handbooksRes.data ?? [])

    // Normalize queue data into SectionItem[]
    const raw = queueRes.data ?? []
    const items: SectionItem[] = []

    if (lvl === 2) {
      for (const row of raw as any[]) {
        const rawSec = row.handbook_sections
        const sec = Array.isArray(rawSec) ? rawSec[0] : rawSec
        if (!sec || sec.current_level !== 2) continue
        items.push(sec as SectionItem)
      }
    } else {
      for (const sec of raw as any[]) {
        if (sec.current_level !== lvl) continue
        items.push(sec as SectionItem)
      }
    }
    setSections(items)
    setLoading(false)
  }, [])

  useEffect(() => { loadContext() }, [loadContext])

  // Sync editor ref when editing section changes
  useEffect(() => {
    if (editorRef.current && editingSectionId) {
      editorRef.current.innerHTML = editContent
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingSectionId])

  const sectionsByHandbook = useCallback(() => {
    const map: Record<string, SectionItem[]> = {}
    for (const s of sections) {
      if (!map[s.handbook_id]) map[s.handbook_id] = []
      if (!map[s.handbook_id].some((x) => x.id === s.id)) map[s.handbook_id].push(s)
    }
    for (const hid of Object.keys(map)) map[hid].sort((a, b) => a.sort_order - b.sort_order)
    return map
  }, [sections])

  const handbooksWithSections = useCallback(() => {
    const m = sectionsByHandbook()
    return handbooks.filter((h) => m[h.id] && m[h.id].length > 0)
  }, [handbooks, sectionsByHandbook])

  const openHandbook = (handbook: Handbook) => {
    setActiveHandbook(handbook)
    setEditingSectionId(null)
    setCurrentPage(1)
    setView('detail')
  }

  const startEditing = (sec: SectionItem) => {
    setEditingSectionId(sec.id)
    setEditContent(sec.content)
    setChangeReason('')
  }

  const handleEditorInput = () => {
    if (editorRef.current) setEditContent(editorRef.current.innerHTML)
  }

  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleEditorInput()
  }

  const handleL2SaveAndApprove = async (sectionId: string) => {
    if (!position) return
    if (!changeReason.trim()) { toast.error('Change reason is required.'); return }
    setSavingId(sectionId)
    const saveRes = await saveSectionEdit(sectionId, editContent, changeReason)
    if (saveRes.error) { setSavingId(null); toast.error(saveRes.error); return }
    const { error } = await approveSectionAtLevel(sectionId, position, 2)
    setSavingId(null)
    if (error) { toast.error(error); return }
    toast.success('Section approved.')
    setEditingSectionId(null)
    await loadContext()
  }

  const handleApprove = async (sectionId: string) => {
    if (!position) return
    setSavingId(sectionId)
    const { error } = await approveSectionAtLevel(sectionId, position, userLevel, commentBySection[sectionId])
    setSavingId(null)
    if (error) { toast.error(error); return }
    toast.success(`Section approved at ${levelLabel(userLevel)}.`)
    setCommentBySection((p) => ({ ...p, [sectionId]: '' }))
    await loadContext()
  }

  const handleReject = async (sectionId: string) => {
    if (!position) return
    const comment = commentBySection[sectionId]
    if (!comment?.trim()) { toast.error('A comment is required when rejecting.'); return }
    setSavingId(sectionId)
    const { error } = await rejectSectionAtLevel(sectionId, position, userLevel, comment)
    setSavingId(null)
    if (error) { toast.error(error); return }
    toast.success('Section rejected and returned to admin.')
    setCommentBySection((p) => ({ ...p, [sectionId]: '' }))
    await loadContext()
  }

  const handleBulkApprove = async () => {
    if (!position || !activeHandbook) return
    const sectionsToApprove = sectionsByHandbook()[activeHandbook.id] ?? []
    if (sectionsToApprove.length === 0) return
    setBulkSaving(true)
    let errors = 0
    for (const sec of sectionsToApprove) {
      const { error } = await approveSectionAtLevel(sec.id, position, userLevel)
      if (error) errors++
    }
    setBulkSaving(false)
    if (errors > 0) toast.error(`${errors} sections failed to approve.`)
    else toast.success(`Approved all ${sectionsToApprove.length} pending sections.`)
    await loadContext()
  }

  if (!isSupabaseConfigured) return <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-sm text-slate-600">Supabase not configured.</div>

  // ── LIST VIEW ───────────────────────────────────────────────────────────
  if (view === 'list') {
    const pending = handbooksWithSections()
    const sMap = sectionsByHandbook()

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <header className="bg-blue-800 text-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-3">
            <h1 className="text-xl font-semibold">Handbook Approvals</h1>
            <p className="mt-1 text-xs text-blue-100">
              {userLevel === 2 ? 'Edit and approve sections assigned to your department.' :
                  'Review handbook sections.'}
            </p>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 space-y-4">

        {!loading && !position && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Your account is not configured as an active approver.</div>
        )}

        {position && (
          <div className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            {levelLabel(userLevel)} — {approverLabel(position as ApproverPosition)}
          </div>
        )}

        {loading && <div className="flex items-center justify-center py-16 text-slate-400"><FaSpinner className="animate-spin mr-2" /> Loading…</div>}

        {!loading && position && pending.length === 0 && (
          <div className="mt-8 flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <FaBook className="h-12 w-12 mb-4 text-slate-200" />
            <p className="text-sm font-medium text-slate-600 mb-1">You're all caught up!</p>
            <p className="text-xs text-slate-400">No handbooks are pending your action at this time.</p>
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map((h) => {
            const count = sMap[h.id]?.length ?? 0
            return (
              <button key={h.id} type="button" onClick={() => openHandbook(h)} className="text-left rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col">
                <h3 className="text-sm font-semibold text-slate-900 truncate">{h.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{h.school_year}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[h.status] ?? 'bg-slate-100 text-slate-600'}`}>{h.status}</span>
                  {h.publish_at && <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><FaCalendarAlt className="h-2.5 w-2.5" /> {new Date(h.publish_at).toLocaleDateString()}</span>}
                </div>
                <p className="mt-3 text-xs font-medium text-amber-700">{count} section{count !== 1 ? 's' : ''} pending</p>
              </button>
            )
          })}
        </div>
        </main>
      </div>
    )
  }

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────
  const handbookSections = activeHandbook ? (sectionsByHandbook()[activeHandbook.id] ?? []) : []
  const totalPages = Math.ceil(handbookSections.length / ITEMS_PER_PAGE)
  const currentSections = handbookSections.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setView('list'); setEditingSectionId(null) }} className="p-2 rounded-lg hover:bg-blue-700 transition-colors">
              <FaArrowLeft className="h-3 w-3" />
            </button>
            <div>
              <h1 className="text-xl font-semibold">{activeHandbook?.title}</h1>
              <p className="mt-1 text-xs text-blue-100">{activeHandbook?.school_year}</p>
            </div>
          </div>
          {userLevel === 2 && handbookSections.length > 0 && (
            <button type="button" onClick={handleBulkApprove} disabled={bulkSaving} className="shrink-0 flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-60">
              {bulkSaving ? <FaSpinner className="animate-spin text-xs" /> : <FaCheckDouble className="text-xs" />} {bulkSaving ? 'Approving All…' : `Bulk Approve All (${handbookSections.length})`}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6 space-y-4">
        {position && (
          <div className="mb-4 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 border border-blue-100">
            {levelLabel(userLevel)} — {approverLabel(position as ApproverPosition)}
          </div>
        )}


      {handbookSections.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
          <FaBook className="h-12 w-12 mb-4 text-slate-200" />
          <p className="text-sm font-medium text-slate-600 mb-1">No pending sections.</p>
          <p className="text-xs text-slate-400">All sections for this handbook have been processed.</p>
        </div>
      )}

      <div className="space-y-4">
        {currentSections.map((sec) => (
          <SectionCard
            key={sec.id}
            section={sec}
            userLevel={userLevel}
            position={position}
            savingId={savingId}
            isEditing={editingSectionId === sec.id}
            editContent={editContent}
            changeReason={changeReason}
            comment={commentBySection[sec.id] ?? ''}
            editorRef={editingSectionId === sec.id ? editorRef : null}
            onStartEdit={() => startEditing(sec)}
            onEditorInput={handleEditorInput}
            onExecCmd={execCmd}
            onChangeReason={setChangeReason}
            onComment={(v) => setCommentBySection((p) => ({ ...p, [sec.id]: v }))}
            onL2SaveAndApprove={() => handleL2SaveAndApprove(sec.id)}
            onApprove={() => handleApprove(sec.id)}
            onReject={() => handleReject(sec.id)}
          />
        ))}
      </div>

      {totalPages > 0 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          <button
            type="button"
            onClick={() => {
              setCurrentPage(p => Math.max(1, p - 1))
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => {
              setCurrentPage(p => Math.min(totalPages, p + 1))
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
      </main>
    </div>
  )
}

// ── Section Card (Level-Adaptive) ─────────────────────────────────────────

interface SectionCardProps {
  section: SectionItem
  userLevel: number
  position: ApproverPosition | null
  savingId: string | null
  isEditing: boolean
  editContent: string
  changeReason: string
  comment: string
  editorRef: React.RefObject<HTMLDivElement | null> | null
  onStartEdit: () => void
  onEditorInput: () => void
  onExecCmd: (cmd: string, val?: string) => void
  onChangeReason: (v: string) => void
  onComment: (v: string) => void
  onL2SaveAndApprove: () => void
  onApprove: () => void
  onReject: () => void
}

const SectionCard: React.FC<SectionCardProps> = ({
  section, userLevel, savingId, isEditing,
  changeReason, comment, editorRef,
  onStartEdit, onEditorInput, onExecCmd, onChangeReason, onComment,
  onL2SaveAndApprove, onApprove, onReject,
}) => {
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([])
  const isSaving = savingId === section.id

  useEffect(() => {
    fetchSectionAuditTrail(section.id).then((res) => { if (res.data) setAuditTrail(res.data) })
  }, [section.id])

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{section.sort_order}. {section.title}</h3>
          <div className="mt-1 flex items-center gap-2">
            <ProgressBar currentLevel={section.current_level} />
            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[section.status] ?? 'bg-slate-100 text-slate-600'}`}>{section.status}</span>
          </div>
        </div>
      </div>

      {/* ── Level 2: Editor mode ──────────────────────────────── */}
      {userLevel === 2 && (
        <div className="p-5 space-y-3">
          {!isEditing ? (
            <>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 max-h-48 overflow-y-auto">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{section.content ? stripHtml(section.content) : '(No content)'}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={onStartEdit} className="px-4 py-2 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800">
                  Edit content
                </button>
                <button type="button" disabled={isSaving} onClick={onApprove} className="px-4 py-2 rounded-lg bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {isSaving ? 'Approving…' : 'Approve Section'}
                </button>
                <div className="ml-auto w-1/3">
                   <div className="flex gap-2">
                     <textarea value={comment} onChange={(e) => onComment(e.target.value)} placeholder="Reason for rejection..." className="flex-1 min-h-[30px] rounded-lg border border-slate-200 px-3 py-1.5 text-xs" />
                     <button type="button" disabled={isSaving} onClick={onReject} className="px-4 py-2 rounded-lg bg-rose-700 text-xs font-semibold text-white hover:bg-rose-800 disabled:opacity-60">
                       Reject
                     </button>
                   </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1">
                  {[{ cmd: 'bold', icon: <FaBold /> }, { cmd: 'italic', icon: <FaItalic /> }, { cmd: 'underline', icon: <FaUnderline /> }].map(({ cmd, icon }) => (
                    <button key={cmd} onMouseDown={(e) => { e.preventDefault(); onExecCmd(cmd) }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 text-xs">{icon}</button>
                  ))}
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button onMouseDown={(e) => { e.preventDefault(); editorRef?.current?.focus(); document.execCommand('insertHTML', false, '<ul><li></li></ul>'); onEditorInput() }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 text-xs"><FaListUl /></button>
                  <button onMouseDown={(e) => { e.preventDefault(); editorRef?.current?.focus(); document.execCommand('insertHTML', false, '<ol><li></li></ol>'); onEditorInput() }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 text-xs"><FaListOl /></button>
                </div>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={onEditorInput}
                  onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertHTML', false, '\u00a0\u00a0\u00a0\u00a0'); onEditorInput() } }}
                  className="px-4 py-3 text-sm text-slate-700 leading-relaxed focus:outline-none prose prose-sm prose-slate max-w-none min-h-[120px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Change Reason (required)</label>
                <textarea value={changeReason} onChange={(e) => onChangeReason(e.target.value)} placeholder="e.g., Updated Article II to include hybrid learning rules" className="w-full min-h-[60px] rounded-lg border border-slate-200 px-3 py-2 text-xs" />
              </div>
              <button type="button" disabled={isSaving} onClick={onL2SaveAndApprove} className="px-4 py-2 rounded-lg bg-emerald-700 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
                {isSaving ? 'Saving…' : 'Save & Approve Section'}
              </button>
            </>
          )}

          {auditTrail.length > 0 && (
            <div className="mt-4 rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-4">
              <h5 className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1.5"><FaHistory /> Discussion & Audit Timeline</h5>
              <div className="space-y-4 pl-2 border-l-2 border-slate-100">
                {auditTrail.map((e) => (
                  <div key={e.id} className="relative pl-4">
                    <div className={`absolute -left-[11px] top-1.5 h-2 w-2 rounded-full border border-white ${e.decision === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-slate-900">{e.approver_name}</span>
                        <span className="text-[10px] text-slate-500">{levelLabel(e.level)} • {approverLabel(e.position)}</span>
                      </div>
                      {e.decided_at && <span className="text-[10px] text-slate-400">{new Date(e.decided_at).toLocaleString()}</span>}
                      {e.comment && (
                        <div className="mt-1.5 rounded-r-xl rounded-bl-xl bg-white border border-slate-200 p-3 shadow-sm relative">
                          <p className="text-xs text-slate-700">"{e.comment}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

export default HandbookApprovals
