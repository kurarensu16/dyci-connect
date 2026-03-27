import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  FaPlus,
  FaSave,
  FaTrash,
  FaBook,
  FaFileAlt,
  FaSpinner,
  FaChevronRight,
  FaChevronDown,
  FaExclamationTriangle,
  FaBold,
  FaItalic,
  FaUnderline,
  FaListUl,
  FaListOl,
  FaEllipsisV,
  FaArrowLeft,
  FaCalendarAlt,
  FaHistory,
  FaExchangeAlt,
  FaPaperPlane,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import {
  fetchHandbookTree,
  upsertHandbookNode,
  deleteHandbookNode,
  buildTree,
  type HandbookNode,
} from '../../lib/api/handbook'
import { handbookData } from '../../data/handbookData'
import { isSupabaseConfigured } from '../../lib/supabaseClient'
import {
  createHandbook,
  fetchHandbookApprovalMonitor,
  fetchHandbooks,
  fetchSections,
  fetchSectionAssignments,
  assignSectionToDepartments,
  submitSectionToL2,
  publishHandbookNow,
  replaceHandbookSections,
  scheduleHandbookPublish,
  fetchSectionAuditTrail,
  fetchSectionDiff,
  approverLabel,
  levelLabel,
  L2_POSITIONS,
  type HandbookApprovalMonitorRow,
  type HandbookSection,
  type ApproverPosition,
  type AuditTrailEntry,
  type Handbook,
} from '../../lib/api/handbookWorkflow'

// ── Helpers ───────────────────────────────────────────────────────────────

const buildFallback = (): HandbookNode[] => {
  const rows = handbookData.flatMap((ch) => [
    { id: String(ch.id), parent_id: null, title: `${ch.title}: ${ch.subtitle}`, content: null, sort_order: ch.id, depth: 0, updated_at: '' },
    ...ch.sections.map((s, si) => ({
      id: s.id, parent_id: String(ch.id), title: s.title,
      content: s.content, sort_order: si + 1, depth: 1, updated_at: '',
    })),
  ])
  return buildTree(rows as any)
}

const statusColors: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border border-slate-200',
  l2_review: 'bg-blue-50 text-blue-700 border border-blue-200',
  l3_review: 'bg-violet-50 text-violet-700 border border-violet-200',
  l4_review: 'bg-amber-50 text-amber-700 border border-amber-200',
  pending_approval: 'bg-amber-50 text-amber-700 border border-amber-200',
  published: 'bg-emerald-50 text-emerald-700 border border-emerald-300 font-bold',
  rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
}

function stripHtml(html: string): string {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent || d.innerText || ''
}

function wordDiff(oldText: string, newText: string): { type: 'same' | 'add' | 'del'; text: string }[] {
  const oldWords = stripHtml(oldText).split(/\s+/).filter(Boolean)
  const newWords = stripHtml(newText).split(/\s+/).filter(Boolean)
  const result: { type: 'same' | 'add' | 'del'; text: string }[] = []
  let oi = 0, ni = 0
  while (oi < oldWords.length && ni < newWords.length) {
    if (oldWords[oi] === newWords[ni]) {
      result.push({ type: 'same', text: oldWords[oi] })
      oi++; ni++
    } else {
      const newIdx = newWords.indexOf(oldWords[oi], ni)
      if (newIdx !== -1 && newIdx - ni < 6) {
        while (ni < newIdx) { result.push({ type: 'add', text: newWords[ni] }); ni++ }
      } else {
        result.push({ type: 'del', text: oldWords[oi] }); oi++
        continue
      }
    }
  }
  while (oi < oldWords.length) { result.push({ type: 'del', text: oldWords[oi] }); oi++ }
  while (ni < newWords.length) { result.push({ type: 'add', text: newWords[ni] }); ni++ }
  return result
}

// ── Progress Bar ──────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ currentLevel: number }> = ({ currentLevel }) => {
  const levels = [
    { n: 1, label: 'L1 Admin' },
    { n: 2, label: 'L2 Dept' },
    { n: 3, label: 'L3 VP' },
    { n: 4, label: 'L4 President' },
  ]
  return (
    <div className="flex items-center gap-1">
      {levels.map((l, i) => {
        const done = currentLevel > l.n
        const active = currentLevel === l.n
        return (
          <React.Fragment key={l.n}>
            {i > 0 && <div className={`h-0.5 w-5 ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
              ${done ? 'bg-emerald-100 text-emerald-700' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {l.label}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ── Modals ─────────────────────────────────────────────────────────────────

interface ConfirmModalProps { nodeId: string; onConfirm: () => void; onCancel: () => void }
const ConfirmModal: React.FC<ConfirmModalProps> = ({ nodeId, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-rose-50 flex items-center justify-center">
          <FaExclamationTriangle className="text-rose-500 text-sm" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Delete node?</h3>
          <p className="mt-1 text-xs text-slate-500">This will permanently delete <span className="font-mono font-semibold text-slate-700">{nodeId}</span> and all its children.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold">Delete</button>
      </div>
    </div>
  </div>
)

// ── Tree node ─────────────────────────────────────────────────────────────

interface TreeNodeProps { node: HandbookNode; selectedId: string | null; onSelect: (id: string) => void; onAddChild: (parentId: string, parentDepth: number) => void; onDelete: (id: string) => void; depth?: number }
const TreeNode: React.FC<TreeNodeProps> = ({ node, selectedId, onSelect, onAddChild, onDelete, depth = 0 }) => {
  const [open, setOpen] = useState(depth === 0)
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0
  return (
    <div>
      <div className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-700'}`} style={{ paddingLeft: `${8 + depth * 12}px` }} onClick={() => { onSelect(node.id); setOpen(true) }}>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {hasChildren ? (
            <button className="shrink-0 text-slate-400 hover:text-slate-600" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}>{open ? <FaChevronDown className="text-[10px]" /> : <FaChevronRight className="text-[10px]" />}</button>
          ) : (<FaFileAlt className={`shrink-0 text-xs ${isSelected ? 'text-blue-400' : 'text-slate-300'}`} />)}
          <span className="truncate">{node.title}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          <button onClick={(e) => { e.stopPropagation(); onAddChild(node.id, node.depth) }} title="Add child" className="p-1 hover:bg-blue-200 rounded text-blue-600"><FaPlus className="text-[10px]" /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(node.id) }} className="p-1 hover:bg-rose-200 rounded text-rose-500"><FaTrash className="text-[10px]" /></button>
        </div>
      </div>
      {open && hasChildren && <div>{node.children.map((child) => <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} onAddChild={onAddChild} onDelete={onDelete} depth={depth + 1} />)}</div>}
    </div>
  )
}

function findNode(nodes: HandbookNode[], id: string): HandbookNode | null {
  for (const n of nodes) { if (n.id === id) return n; const f = findNode(n.children, id); if (f) return f }
  return null
}

type CmsView = 'list' | 'editor' | 'monitor' | 'assignment'

// ── Main CMS Component ────────────────────────────────────────────────────

const Cms: React.FC = () => {
  const [view, setView] = useState<CmsView>('list')
  const [tree, setTree] = useState<HandbookNode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [workflowSaving, setWorkflowSaving] = useState(false)
  const [newHandbookTitle, setNewHandbookTitle] = useState('')
  const [newSchoolYear, setNewSchoolYear] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [publishAt, setPublishAt] = useState('')
  const [scheduleHandbookTarget, setScheduleHandbookTarget] = useState<Handbook | null>(null)
  const [workflowHandbooks, setWorkflowHandbooks] = useState<Handbook[]>([])
  const [activeHandbookId, setActiveHandbookId] = useState('')
  const [editingHandbookLabel, setEditingHandbookLabel] = useState('')
  const [cardMenuOpenId, setCardMenuOpenId] = useState<string | null>(null)
  const [approvalMonitor, setApprovalMonitor] = useState<HandbookApprovalMonitorRow[]>([])
  const [approvalMonitorLoading, setApprovalMonitorLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Pagination state
  const [hbPage, setHbPage] = useState(1)
  const HB_ITEMS_PER_PAGE = 12
  const [monitorPage, setMonitorPage] = useState(1)
  const MONITOR_ITEMS_PER_PAGE = 5
  const [assignmentPage, setAssignmentPage] = useState(1)
  const ASSIGNMENT_ITEMS_PER_PAGE = 5

  // Section-level workflow state
  const [sectionMeta, setSectionMeta] = useState<HandbookSection | null>(null)
  const [sectionAssignments, setSectionAssignments] = useState<ApproverPosition[]>([])
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([])
  const [showAudit, setShowAudit] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [diffData, setDiffData] = useState<{ legacy_content: string | null; content: string; change_reason: string | null } | null>(null)
  const [workflowSections, setWorkflowSections] = useState<HandbookSection[]>([])

  const editorRef = useRef<HTMLDivElement>(null)
  const selectedNode = selectedId ? findNode(tree, selectedId) : null

  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return tree;
    const term = searchTerm.toLowerCase();
    const filterNode = (node: HandbookNode): HandbookNode | null => {
      const titleMatch = node.title.toLowerCase().includes(term);
      const children = node.children.map(filterNode).filter(Boolean) as HandbookNode[];
      if (titleMatch || children.length > 0) return { ...node, children };
      return null;
    };
    return tree.map(filterNode).filter(Boolean) as HandbookNode[];
  }, [tree, searchTerm]);

  useEffect(() => {
    if (editorRef.current && selectedNode) editorRef.current.innerHTML = selectedNode.content ?? ''
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // ── Data loading ────────────────────────────────────────────────────────

  const loadTree = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchHandbookTree()
    if (error || !data || data.length === 0) { setTree(buildFallback()); if (error) toast.error('Could not load from database — showing cached data.') }
    else setTree(data)
    setLoading(false)
  }, [])

  useEffect(() => { loadTree() }, [loadTree])

  const loadWorkflowHandbooks = useCallback(async () => {
    const { data, error } = await fetchHandbooks()
    if (error) { toast.error(`Failed to load handbooks: ${error}`); return }
    setWorkflowHandbooks(data ?? [])
  }, [])

  const loadApprovalMonitor = useCallback(async (handbookId?: string) => {
    const id = handbookId || activeHandbookId
    if (!id) { setApprovalMonitor([]); return }
    setApprovalMonitorLoading(true)
    const { data, error } = await fetchHandbookApprovalMonitor(id)
    setApprovalMonitorLoading(false)
    if (error) { toast.error(`Monitor: ${error}`); return }
    setApprovalMonitor(data ?? [])
  }, [activeHandbookId])

  const loadWorkflowSections = useCallback(async (handbookId?: string) => {
    const id = handbookId || activeHandbookId
    if (!id) return
    const { data } = await fetchSections(id)
    setWorkflowSections(data ?? [])
  }, [activeHandbookId])

  useEffect(() => { if (isSupabaseConfigured) loadWorkflowHandbooks() }, [loadWorkflowHandbooks])

  // Load section-level workflow data when a section node is selected in editor
  const loadSectionWorkflowData = useCallback(async (sectionIdx: number) => {
    if (!activeHandbookId || workflowSections.length === 0) { setSectionMeta(null); return }
    const sec = workflowSections[sectionIdx]
    if (!sec) { setSectionMeta(null); return }
    setSectionMeta(sec)
    const [assignRes, auditRes, diffRes] = await Promise.all([
      fetchSectionAssignments(sec.id),
      fetchSectionAuditTrail(sec.id),
      fetchSectionDiff(sec.id),
    ])
    setSectionAssignments(assignRes.data ?? [])
    setAuditTrail(auditRes.data ?? [])
    setDiffData(diffRes.data ?? null)
  }, [activeHandbookId, workflowSections])

  // When selectedId changes in editor mode, derive the section index
  useEffect(() => {
    if (view !== 'editor' || !selectedId) { setSectionMeta(null); return }
    const parts = selectedId.split('.')
    if (parts.length < 2) { setSectionMeta(null); return }
    const idx = parseInt(parts[1], 10) - 1
    if (isNaN(idx) || idx < 0) { setSectionMeta(null); return }
    loadSectionWorkflowData(idx)
  }, [selectedId, view, loadSectionWorkflowData])

  // ── Tree edit helpers ───────────────────────────────────────────────────

  const updateNodeInTree = (nodes: HandbookNode[], id: string, patch: Partial<HandbookNode>): HandbookNode[] =>
    nodes.map((n) => n.id === id ? { ...n, ...patch } : { ...n, children: updateNodeInTree(n.children, id, patch) })

  const removeNodeFromTree = (nodes: HandbookNode[], id: string): HandbookNode[] =>
    nodes.filter((n) => n.id !== id).map((n) => ({ ...n, children: removeNodeFromTree(n.children, id) }))

  const ensureAncestorsExist = async (childId: string, currentTree: HandbookNode[]) => {
    const parts = childId.split('.')
    for (let i = 1; i < parts.length; i++) {
      const ancestorId = parts.slice(0, i).join('.')
      const ancestor = findNode(currentTree, ancestorId)
      if (ancestor) await upsertHandbookNode({ id: ancestor.id, parent_id: ancestor.parent_id, title: ancestor.title, content: ancestor.content, sort_order: ancestor.sort_order, depth: ancestor.depth })
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────

  const syncTreeToSections = async (currentTree: HandbookNode[], handbookId: string) => {
    if (!handbookId) return
    const contentNodes: HandbookNode[] = []
    const walk = (nodes: HandbookNode[]) => { nodes.forEach((n) => { if (n.depth > 0) contentNodes.push(n); if (n.children.length > 0) walk(n.children) }) }
    walk(currentTree)
    if (contentNodes.length === 0) return
    await replaceHandbookSections(handbookId, contentNodes.map((n, idx) => ({ title: n.title, content: n.content ?? '', sort_order: idx + 1 })))
  }

  const handleAddRoot = async () => {
    const newId = `${tree.length + 1}`
    const node: HandbookNode = { id: newId, parent_id: null, title: `CHAPTER ${newId}`, content: null, sort_order: tree.length + 1, depth: 0, updated_at: '', children: [] }
    const newTree = [...tree, node]
    setTree(newTree); setSelectedId(newId)
    if (isSupabaseConfigured) {
      const { error } = await upsertHandbookNode({ id: newId, parent_id: null, title: node.title, content: null, sort_order: node.sort_order, depth: 0 })
      await syncTreeToSections(newTree, activeHandbookId)
      if (error) toast.error('Save failed: ' + error); else toast.success('Chapter created')
    }
  }

  const handleAddChild = async (parentId: string, parentDepth: number) => {
    const parent = findNode(tree, parentId); if (!parent) return
    const childCount = parent.children.length + 1
    const newId = `${parentId}.${childCount}`
    const node: HandbookNode = { id: newId, parent_id: parentId, title: 'New Section', content: '<p>Start writing here...</p>', sort_order: childCount, depth: parentDepth + 1, updated_at: '', children: [] }
    const newTree = updateNodeInTree(tree, parentId, { children: [...(findNode(tree, parentId)?.children ?? []), node] })
    setTree(newTree); setSelectedId(newId)
    if (isSupabaseConfigured) {
      await ensureAncestorsExist(newId, newTree)
      const { error } = await upsertHandbookNode({ id: newId, parent_id: parentId, title: node.title, content: node.content, sort_order: childCount, depth: parentDepth + 1 })
      await syncTreeToSections(newTree, activeHandbookId)
      if (error) toast.error('Save failed: ' + error); else toast.success('Section added')
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete; setPendingDelete(null)
    const newTree = removeNodeFromTree(tree, id)
    setTree(newTree); if (selectedId === id) setSelectedId(null)
    if (isSupabaseConfigured) {
      const { error } = await deleteHandbookNode(id)
      await syncTreeToSections(newTree, activeHandbookId)
      if (error) toast.error('Delete failed: ' + error); else toast.success('Deleted')
    }
  }

  const handleFieldChange = (key: 'title' | 'content', value: string) => { if (!selectedId) return; setTree((t) => updateNodeInTree(t, selectedId, { [key]: value })) }
  const handleEditorInput = () => { if (selectedId && editorRef.current) handleFieldChange('content', editorRef.current.innerHTML) }
  const execCmd = (command: string, value?: string) => { document.execCommand(command, false, value); editorRef.current?.focus(); handleEditorInput() }

  const handleSave = async () => {
    if (!selectedNode || !isSupabaseConfigured) { toast(isSupabaseConfigured ? 'No node selected' : 'Supabase not configured.', { icon: '⚠️' }); return }
    setSaving(true)
    const { error } = await upsertHandbookNode({ id: selectedNode.id, parent_id: selectedNode.parent_id, title: selectedNode.title, content: selectedNode.content, sort_order: selectedNode.sort_order, depth: selectedNode.depth })
    await syncTreeToSections(tree, activeHandbookId)
    setSaving(false)
    if (error) toast.error('Save failed: ' + error); else toast.success('Saved ✓')
  }

  const handleCreateHandbook = async () => {
    if (!newHandbookTitle.trim() || !newSchoolYear.trim()) { toast.error('Title and school year required.'); return }
    setWorkflowSaving(true)
    const { error } = await createHandbook(newHandbookTitle.trim(), newSchoolYear.trim())
    setWorkflowSaving(false)
    if (error) { toast.error(error); return }
    toast.success('Handbook created.'); setNewHandbookTitle(''); setNewSchoolYear(''); setShowCreateForm(false)
    await loadWorkflowHandbooks()
  }

  const openEditorForHandbook = async (handbook: Handbook) => {
    const { data, error } = await fetchSections(handbook.id)
    if (error) { toast.error(`Failed to load: ${error}`); return }
    const sections = data ?? []
    setWorkflowSections(sections)
    const rootId = '1'
    const childNodes: HandbookNode[] = sections.map((s, idx) => ({
      id: `${rootId}.${idx + 1}`, parent_id: rootId, title: s.title || `Section ${idx + 1}`,
      content: s.content ?? '', sort_order: idx + 1, depth: 1, updated_at: s.updated_at ?? '', children: [],
    }))
    const rootNode: HandbookNode = { id: rootId, parent_id: null, title: handbook.title, content: null, sort_order: 1, depth: 0, updated_at: handbook.updated_at ?? '', children: childNodes }
    setTree([rootNode]); setSelectedId(childNodes.length > 0 ? childNodes[0].id : rootId)
    setActiveHandbookId(handbook.id); setEditingHandbookLabel(`${handbook.title} (${handbook.school_year})`)
    setCardMenuOpenId(null); setView('editor')
  }

  const handleAssignmentToggle = async (pos: ApproverPosition) => {
    if (!sectionMeta) return
    const next = sectionAssignments.includes(pos)
      ? sectionAssignments.filter((p) => p !== pos)
      : [...sectionAssignments, pos]
    setSectionAssignments(next)
    const { error } = await assignSectionToDepartments(sectionMeta.id, next)
    if (error) toast.error(error)
  }

  const handleSubmitSingleToL2 = async () => {
    if (!sectionMeta) return
    setWorkflowSaving(true)
    const { error } = await submitSectionToL2(sectionMeta.id)
    setWorkflowSaving(false)
    if (error) { toast.error(error); return }
    toast.success('Section assigned to L2.')
    await loadWorkflowSections()
  }

  const handleAssignmentSubmitSingle = async (sectionId: string) => {
    if (!activeHandbookId) return
    setWorkflowSaving(true)
    const { error } = await submitSectionToL2(sectionId)
    setWorkflowSaving(false)
    if (error) { toast.error(error); return }
    toast.success('Section submitted to L2.')
    await loadApprovalMonitor(activeHandbookId)
  }

  const handleSchedulePublish = async () => {
    if (!scheduleHandbookTarget || !publishAt) { toast.error('Select date/time.'); return }
    const { error } = await scheduleHandbookPublish(scheduleHandbookTarget.id, new Date(publishAt).toISOString())
    if (error) { toast.error(error); return }
    toast.success('Schedule saved.'); setScheduleHandbookTarget(null); setPublishAt('')
    await loadWorkflowHandbooks()
  }

  const handlePublishNow = async (handbookId: string) => {
    setCardMenuOpenId(null)
    const { error, waitingForDate } = await publishHandbookNow(handbookId)
    if (error) { toast.error(error); return }
    toast.success(waitingForDate ? 'Waiting for release date.' : 'Handbook published.')
    await loadWorkflowHandbooks()
  }
  const openMonitor = async (handbook: Handbook) => {
    setActiveHandbookId(handbook.id); setEditingHandbookLabel(`${handbook.title} (${handbook.school_year})`)
    setCardMenuOpenId(null); setView('monitor'); setMonitorPage(1)
    await loadApprovalMonitor(handbook.id)
  }

  const openAssignmentForHandbook = async (handbook: Handbook) => {
    setActiveHandbookId(handbook.id); setEditingHandbookLabel(`${handbook.title} (${handbook.school_year})`)
    setCardMenuOpenId(null); setView('assignment'); setAssignmentPage(1)
    await loadApprovalMonitor(handbook.id)
  }

  const handleBulkAssignmentToggle = async (sectionId: string, pos: ApproverPosition, currentReqs: ApproverPosition[]) => {
    const next = currentReqs.includes(pos)
      ? currentReqs.filter(p => p !== pos)
      : [...currentReqs, pos]
    setApprovalMonitor(prev => prev.map(r => r.section_id === sectionId ? { ...r, required_positions: next } : r))
    const { error } = await assignSectionToDepartments(sectionId, next)
    if (error) {
      toast.error(error)
      setApprovalMonitor(prev => prev.map(r => r.section_id === sectionId ? { ...r, required_positions: currentReqs } : r))
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  if (!isSupabaseConfigured) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Supabase not configured.</div>

  // ── LIST VIEW ───────────────────────────────────────────────────────────
  if (view === 'list') {
    const totalHbPages = Math.ceil(workflowHandbooks.length / HB_ITEMS_PER_PAGE)
    const currentHandbooks = workflowHandbooks.slice((hbPage - 1) * HB_ITEMS_PER_PAGE, hbPage * HB_ITEMS_PER_PAGE)

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-blue-800 text-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
            <div><h1 className="text-xl font-semibold">Handbook CMS</h1><p className="mt-1 text-xs text-blue-100">4-Level Approval Workflow</p></div>
            <button type="button" onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-semibold"><FaPlus className="text-xs" /> New handbook</button>
          </div>
        </header>

        <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
          {loading && <div className="flex items-center justify-center py-16 text-slate-400"><FaSpinner className="animate-spin mr-2" /> Loading…</div>}
          {!loading && workflowHandbooks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <FaBook className="h-12 w-12 mb-4 text-slate-200" />
              <p className="text-sm font-medium text-slate-600 mb-1">No handbooks found.</p>
              <p className="text-xs text-slate-400 mb-4">Get started by creating your first handbook.</p>
              <button type="button" onClick={() => setShowCreateForm(true)} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm"><FaPlus className="text-xs" /> Create Handbook</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentHandbooks.map((h) => (
              <div key={h.id} className="relative rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold text-slate-900 truncate">{h.title}</h3><p className="text-xs text-slate-500 mt-1">{h.school_year}</p></div>
                  <button type="button" onClick={() => setCardMenuOpenId(cardMenuOpenId === h.id ? null : h.id)} className="shrink-0 p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"><FaEllipsisV className="h-3.5 w-3.5" /></button>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[h.status] ?? 'bg-slate-100 text-slate-600'}`}>{h.status}</span>
                  {h.publish_at && <span className="inline-flex items-center gap-1 text-[10px] text-slate-500"><FaCalendarAlt className="h-2.5 w-2.5" /> {new Date(h.publish_at).toLocaleDateString()}</span>}
                </div>
                <p className="mt-2 text-[10px] text-slate-400">Updated {new Date(h.updated_at).toLocaleString()}</p>

                {cardMenuOpenId === h.id && (
                  <div className="absolute right-3 top-12 z-10 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                    <button type="button" onClick={() => openEditorForHandbook(h)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Edit contents</button>
                    <button type="button" onClick={() => openAssignmentForHandbook(h)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Assign L2 Departments</button>
                    <button type="button" onClick={() => { setScheduleHandbookTarget(h); setCardMenuOpenId(null) }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Schedule publish date</button>
                    <button type="button" onClick={() => handlePublishNow(h.id)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Publish now</button>
                    <button type="button" onClick={() => openMonitor(h)} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">View approval status</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {totalHbPages > 0 && (
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 pb-2">
              <button type="button" onClick={() => { setHbPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={hbPage === 1} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
              <span className="text-sm text-slate-500 font-medium">Page {hbPage} of {totalHbPages}</span>
              <button type="button" onClick={() => { setHbPage(p => Math.min(totalHbPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={hbPage === totalHbPages} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </main>

        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Create handbook</h2>
              <input value={newHandbookTitle} onChange={(e) => setNewHandbookTitle(e.target.value)} placeholder="Title" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input value={newSchoolYear} onChange={(e) => setNewSchoolYear(e.target.value)} placeholder="School year (e.g. 2026-2027)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleCreateHandbook} disabled={workflowSaving || !newHandbookTitle.trim() || !newSchoolYear.trim()} className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed">{workflowSaving ? 'Creating…' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}

        {scheduleHandbookTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Schedule publish</h2>
              <p className="text-xs text-slate-500">{scheduleHandbookTarget.title} ({scheduleHandbookTarget.school_year})</p>
              <input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setScheduleHandbookTarget(null); setPublishAt('') }} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={handleSchedulePublish} disabled={!publishAt} className="px-4 py-2 rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ASSIGNMENT VIEW ──────────────────────────────────────────────────────
  if (view === 'assignment') {
    const totalAssignmentPages = Math.ceil(approvalMonitor.length / ASSIGNMENT_ITEMS_PER_PAGE)
    const currentAssignmentRows = approvalMonitor.slice((assignmentPage - 1) * ASSIGNMENT_ITEMS_PER_PAGE, assignmentPage * ASSIGNMENT_ITEMS_PER_PAGE)

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-blue-800 text-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
            <button type="button" onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-blue-700"><FaArrowLeft className="h-3 w-3" /></button>
            <div><h1 className="text-xl font-semibold">Bulk L2 Assignment</h1><p className="mt-1 text-xs text-blue-100">{editingHandbookLabel}</p></div>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-6 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-4 shadow-sm">
            <p className="text-sm text-slate-600 font-medium mb-1">Select departments responsible for approving each section.</p>
            <p className="text-[11px] text-slate-500">Changes are saved automatically when you toggle a department. Only sections in Draft or L2 Review can have their assignments updated.</p>
          </div>
          {approvalMonitorLoading && <div className="flex items-center justify-center py-16 text-slate-400"><FaSpinner className="animate-spin mr-2" /> Loading sections...</div>}
          {!approvalMonitorLoading && approvalMonitor.length === 0 && <p className="text-sm text-slate-500 py-10 text-center">No sections found for this handbook.</p>}

          <div className="grid grid-cols-1 gap-4">
            {currentAssignmentRows.map((row) => (
              <div key={row.section_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-full sm:w-1/3 pr-4">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-2">{row.sort_order}. {row.section_title || `Section ${row.sort_order}`}</h3>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${statusColors[row.section_status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {row.section_status || 'draft'}
                    </span>
                  </div>
                </div>
                <div className="w-full sm:w-2/3 border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-5">
                  <div className="flex flex-wrap gap-2">
                    {L2_POSITIONS.map(pos => {
                      const isAssigned = row.required_positions.includes(pos)
                      const disabled = row.current_level > 1
                      return (
                        <label key={pos} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors select-none ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${isAssigned ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isAssigned}
                            disabled={disabled}
                            onChange={() => !disabled && handleBulkAssignmentToggle(row.section_id, pos, row.required_positions)}
                          />
                          {approverLabel(pos)}
                        </label>
                      )
                    })}
                  </div>
                  {row.section_status === 'draft' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAssignmentSubmitSingle(row.section_id)}
                        disabled={workflowSaving || row.required_positions.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                      >
                        {workflowSaving ? <FaSpinner className="animate-spin text-[10px]" /> : <FaPaperPlane className="text-[10px]" />} Submit to L2
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalAssignmentPages > 0 && (
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 pb-2">
              <button type="button" onClick={() => { setAssignmentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={assignmentPage === 1} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
              <span className="text-sm text-slate-500 font-medium">Page {assignmentPage} of {totalAssignmentPages}</span>
              <button type="button" onClick={() => { setAssignmentPage(p => Math.min(totalAssignmentPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={assignmentPage === totalAssignmentPages} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── MONITOR VIEW ────────────────────────────────────────────────────────
  if (view === 'monitor') {
    const totalMonitorPages = Math.ceil(approvalMonitor.length / MONITOR_ITEMS_PER_PAGE)
    const currentMonitorRows = approvalMonitor.slice((monitorPage - 1) * MONITOR_ITEMS_PER_PAGE, monitorPage * MONITOR_ITEMS_PER_PAGE)

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-blue-800 text-white shadow-sm">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
            <button type="button" onClick={() => setView('list')} className="p-2 rounded-lg hover:bg-blue-700"><FaArrowLeft className="h-3 w-3" /></button>
            <div><h1 className="text-xl font-semibold">Approval Monitor</h1><p className="mt-1 text-xs text-blue-100">{editingHandbookLabel}</p></div>
          </div>
        </header>
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-6 space-y-3">
          {approvalMonitorLoading && <p className="text-sm text-slate-500">Loading...</p>}
          {!approvalMonitorLoading && approvalMonitor.length === 0 && <p className="text-sm text-slate-500">No sections yet.</p>}
          {currentMonitorRows.map((row) => (
            <div key={row.section_id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-900">{row.sort_order}. {row.section_title}</p>
                <div className="flex items-center gap-2">
                  <ProgressBar currentLevel={row.current_level} />
                  <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${statusColors[row.section_status] ?? 'bg-slate-100 text-slate-600'}`}>{row.section_status}</span>
                </div>
              </div>
              <p className="text-xs text-slate-500">Assigned: {row.required_positions.length > 0 ? row.required_positions.map(approverLabel).join(', ') : '—'}</p>
              {row.approvals.length === 0 ? <p className="text-xs text-slate-400">No decisions yet.</p> : (
                <div className="space-y-1">{row.approvals.map((a, idx) => (
                  <div key={`${a.approver_user_id}-${a.position}-${idx}`} className="text-xs text-slate-600">
                    <span className={`inline-block rounded px-1.5 py-0.5 mr-1 text-[10px] font-semibold ${a.decision === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{a.decision}</span>
                    {levelLabel(a.level)} — {approverLabel(a.position)} — {a.approver_name}
                    {a.decided_at ? ` — ${new Date(a.decided_at).toLocaleString()}` : ''}
                    {a.comment ? ` — "${a.comment}"` : ''}
                  </div>
                ))}</div>
              )}
            </div>
          ))}

          {totalMonitorPages > 0 && (
            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6 pb-2">
              <button type="button" onClick={() => { setMonitorPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={monitorPage === 1} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Previous</button>
              <span className="text-sm text-slate-500 font-medium">Page {monitorPage} of {totalMonitorPages}</span>
              <button type="button" onClick={() => { setMonitorPage(p => Math.min(totalMonitorPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }} disabled={monitorPage === totalMonitorPages} className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
            </div>
          )}
        </main>
      </div>
    )
  }

  // ── EDITOR VIEW ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {pendingDelete && <ConfirmModal nodeId={pendingDelete} onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setView('list'); loadWorkflowHandbooks() }} className="p-2 rounded-lg hover:bg-blue-700"><FaArrowLeft className="h-3 w-3" /></button>
            <div><h1 className="text-xl font-semibold">Handbook CMS</h1><p className="mt-1 text-xs text-blue-100">{editingHandbookLabel || 'Edit sections'}</p></div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleAddRoot} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 border border-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"><FaPlus className="text-xs" /> Add Chapter</button>
            <button onClick={handleSave} disabled={saving || !selectedNode} className="flex items-center gap-2 bg-white hover:bg-slate-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? <FaSpinner className="text-xs animate-spin" /> : <FaSave className="text-xs" />} {saving ? 'Saving…' : 'Save Node'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-4 grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex flex-col gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Structure</span>
            <input type="text" placeholder="Search sections..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400" />
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {loading && <div className="flex items-center justify-center py-10 text-slate-400"><FaSpinner className="animate-spin mr-2" /> Loading…</div>}
            {!loading && filteredTree.length === 0 && <p className="text-xs text-slate-400 italic text-center py-6">No chapters or matches found.</p>}
            {!loading && filteredTree.map((node) => <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={setSelectedId} onAddChild={handleAddChild} onDelete={(id) => setPendingDelete(id)} />)}
          </div>
        </aside>

        {/* Editor + Workflow panel */}
        <section className="col-span-12 md:col-span-9 flex flex-col gap-3 overflow-y-auto">
          {!selectedNode && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <FaBook className="h-10 w-10 mb-3 opacity-20" /><p>Select a node to edit</p>
            </div>
          )}

          {selectedNode && (
            <>
              {/* Progress bar for sections */}
              {sectionMeta && (
                <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center justify-between gap-3">
                  <ProgressBar currentLevel={sectionMeta.current_level} />
                  <span className={`text-[10px] rounded-full px-2 py-0.5 font-semibold ${statusColors[sectionMeta.status] ?? 'bg-slate-100 text-slate-600'}`}>{sectionMeta.status}</span>
                </div>
              )}

              {/* Rich text editor */}
              <div className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50 shrink-0">
                  <span className="text-sm font-semibold text-slate-700">{selectedNode.depth === 0 ? 'Chapter Editor' : 'Section Editor'}</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-500 font-mono">{selectedNode.id}</span>
                </div>
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1 shrink-0">
                  {[{ cmd: 'bold', icon: <FaBold />, title: 'Bold' }, { cmd: 'italic', icon: <FaItalic />, title: 'Italic' }, { cmd: 'underline', icon: <FaUnderline />, title: 'Underline' }].map(({ cmd, icon, title }) => (
                    <button key={cmd} title={title} onMouseDown={(e) => { e.preventDefault(); execCmd(cmd) }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 text-xs">{icon}</button>
                  ))}
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button title="Bullet list" onMouseDown={(e) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand('insertHTML', false, '<ul><li></li></ul>'); handleEditorInput() }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 text-xs"><FaListUl /></button>
                  <button title="Numbered list" onMouseDown={(e) => { e.preventDefault(); editorRef.current?.focus(); document.execCommand('insertHTML', false, '<ol><li></li></ol>'); handleEditorInput() }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 text-xs"><FaListOl /></button>
                </div>
                <div className="px-5 py-4 border-b border-slate-100 shrink-0">
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                  <input type="text" value={selectedNode.title} onChange={(e) => handleFieldChange('title', e.target.value)} className="w-full text-lg font-bold text-slate-800 border-none px-0 focus:ring-0 outline-none placeholder-slate-300" placeholder="Section title…" />
                </div>
                <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={handleEditorInput} onKeyDown={(e) => { if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertHTML', false, '\u00a0\u00a0\u00a0\u00a0'); handleEditorInput() } }} className="overflow-y-auto px-5 py-4 text-sm text-slate-700 leading-relaxed focus:outline-none prose prose-sm prose-slate max-w-none" style={{ minHeight: '150px' }} />
              </div>

              {/* Workflow panel (only for depth>0 sections) */}
              {sectionMeta && selectedNode.depth > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  {/* Department assignment */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-700 mb-2">Assign to L2 Departments</h4>
                    <div className="flex flex-wrap gap-2">
                      {L2_POSITIONS.map((pos) => (
                        <label key={pos} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-colors ${sectionAssignments.includes(pos) ? 'border-blue-400 bg-blue-50 text-blue-800' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                          <input type="checkbox" className="sr-only" checked={sectionAssignments.includes(pos)} onChange={() => handleAssignmentToggle(pos)} disabled={sectionMeta.current_level > 1} />
                          {approverLabel(pos)}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Legacy text + assign actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {sectionMeta.current_level === 1 && (
                      <button type="button" onClick={handleSubmitSingleToL2} disabled={workflowSaving || sectionAssignments.length === 0} className="px-3 py-1.5 rounded-lg bg-blue-700 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
                        {workflowSaving ? 'Submitting…' : 'Assign to L2'}
                      </button>
                    )}
                    {sectionMeta.legacy_content && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-200">Baseline sync confirmed</span>
                    )}
                  </div>

                  {/* Change reason (from L2) */}
                  {sectionMeta.change_reason && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <h5 className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Change Reason (from L2)</h5>
                      <p className="text-xs text-slate-700">{sectionMeta.change_reason}</p>
                    </div>
                  )}

                  {/* Audit trail toggle */}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAudit(!showAudit)} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
                      <FaHistory className="h-3 w-3" /> {showAudit ? 'Hide' : 'Show'} audit trail
                    </button>
                    {sectionMeta.legacy_content && (
                      <button type="button" onClick={() => setShowDiff(!showDiff)} className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
                        <FaExchangeAlt className="h-3 w-3" /> {showDiff ? 'Hide' : 'Show'} version compare
                      </button>
                    )}
                  </div>

                  {showAudit && (
                    <div className="rounded-lg border border-slate-200 p-4 bg-slate-50/50 space-y-4">
                      <h5 className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1.5"><FaHistory /> Audit Timeline</h5>
                      {auditTrail.length === 0 && <p className="text-xs text-slate-400 italic">No decisions yet.</p>}
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
                              <div className="mt-1">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold border ${e.decision === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>{e.decision}</span>
                              </div>
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

                  {showDiff && diffData && (
                    <div className="rounded-lg border border-slate-200 p-3 space-y-2">
                      <h5 className="text-[10px] font-semibold text-slate-500 uppercase">Version Compare (Legacy vs New)</h5>
                      <div className="text-xs leading-relaxed text-slate-700">
                        {wordDiff(diffData.legacy_content ?? '', diffData.content).map((seg, i) => (
                          <span key={i} className={
                            seg.type === 'del' ? 'bg-rose-100 text-rose-800 line-through mx-0.5' :
                              seg.type === 'add' ? 'bg-emerald-100 text-emerald-800 mx-0.5' : ''
                          }>{seg.text} </span>
                        ))}
                      </div>
                      {diffData.change_reason && (
                        <p className="text-[10px] text-slate-500 mt-1">Change reason: {diffData.change_reason}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  )
}

export default Cms
