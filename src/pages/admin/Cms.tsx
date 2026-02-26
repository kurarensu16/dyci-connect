import React, { useState, useEffect, useCallback, useRef } from 'react'
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

// Build a fallback tree from static data when Supabase is not set up
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

// ── Confirm delete modal ─────────────────────────────────────────────────────
interface ConfirmModalProps {
  nodeId: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ nodeId, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-rose-50 flex items-center justify-center">
          <FaExclamationTriangle className="text-rose-500 text-sm" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 text-sm">Delete node?</h3>
          <p className="mt-1 text-xs text-slate-500">
            This will permanently delete <span className="font-mono font-semibold text-slate-700">{nodeId}</span> and all its children. This cannot be undone.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
)

// ── Recursive tree node for the sidebar ──────────────────────────────────────
interface TreeNodeProps {
  node: HandbookNode
  selectedId: string | null
  onSelect: (id: string) => void
  onAddChild: (parentId: string, parentDepth: number) => void
  onDelete: (id: string) => void
  depth?: number
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, selectedId, onSelect, onAddChild, onDelete, depth = 0 }) => {
  const [open, setOpen] = useState(depth === 0)
  const isSelected = selectedId === node.id
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-700'
          }`}
        style={{ paddingLeft: `${8 + depth * 12}px` }}
        onClick={() => { onSelect(node.id); setOpen(true) }}
      >
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          {hasChildren ? (
            <button
              className="shrink-0 text-slate-400 hover:text-slate-600"
              onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
            >
              {open ? <FaChevronDown className="text-[10px]" /> : <FaChevronRight className="text-[10px]" />}
            </button>
          ) : (
            <FaFileAlt className={`shrink-0 text-xs ${isSelected ? 'text-blue-400' : 'text-slate-300'}`} />
          )}
          <span className="truncate">{node.title}</span>
        </div>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          <button
            onClick={(e) => { e.stopPropagation(); onAddChild(node.id, node.depth) }}
            title="Add child"
            className="p-1 hover:bg-blue-200 rounded text-blue-600"
          >
            <FaPlus className="text-[10px]" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(node.id) }}
            className="p-1 hover:bg-rose-200 rounded text-rose-500"
          >
            <FaTrash className="text-[10px]" />
          </button>
        </div>
      </div>

      {open && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onAddChild={onAddChild}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Find a node by id in the tree ────────────────────────────────────────────
function findNode(nodes: HandbookNode[], id: string): HandbookNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNode(n.children, id)
    if (found) return found
  }
  return null
}

// ── CMS Component ─────────────────────────────────────────────────────────────
const Cms: React.FC = () => {
  const [tree, setTree] = useState<HandbookNode[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const selectedNode = selectedId ? findNode(tree, selectedId) : null

  // Sync the contenteditable div whenever the selected node changes
  useEffect(() => {
    if (editorRef.current && selectedNode) {
      editorRef.current.innerHTML = selectedNode.content ?? ''
    }
    // Only re-sync when the node ID changes, NOT on every content edit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // -- Load data ──────────────────────────────────────────────────────────────
  const loadTree = useCallback(async () => {
    setLoading(true)
    const { data, error } = await fetchHandbookTree()
    if (error || !data || data.length === 0) {
      setTree(buildFallback())
      if (error) toast.error('Could not load from database — showing cached data.')
    } else {
      setTree(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadTree() }, [loadTree])

  // -- Local edit helpers ─────────────────────────────────────────────────────
  const updateNodeInTree = (nodes: HandbookNode[], id: string, patch: Partial<HandbookNode>): HandbookNode[] =>
    nodes.map((n) =>
      n.id === id ? { ...n, ...patch } : { ...n, children: updateNodeInTree(n.children, id, patch) }
    )

  const removeNodeFromTree = (nodes: HandbookNode[], id: string): HandbookNode[] =>
    nodes
      .filter((n) => n.id !== id)
      .map((n) => ({ ...n, children: removeNodeFromTree(n.children, id) }))

  // -- Actions ─────────────────────────────────────────────────────────────────

  /**
   * Walks the ancestor chain for a given path-ID (e.g. "1.2.3" → "1", "1.2")
   * and upserts each ancestor into Supabase, ensuring no FK violation when
   * inserting a child whose parent only exists in local state.
   */
  const ensureAncestorsExist = async (childId: string, currentTree: HandbookNode[]) => {
    const parts = childId.split('.')
    // upsert from root down to the immediate parent
    for (let i = 1; i < parts.length; i++) {
      const ancestorId = parts.slice(0, i).join('.')
      const ancestor = findNode(currentTree, ancestorId)
      if (ancestor) {
        await upsertHandbookNode({
          id: ancestor.id,
          parent_id: ancestor.parent_id,
          title: ancestor.title,
          content: ancestor.content,
          sort_order: ancestor.sort_order,
          depth: ancestor.depth,
        })
      }
    }
  }

  const handleAddRoot = async () => {
    const newId = `${tree.length + 1}`
    const node = { id: newId, parent_id: null, title: `CHAPTER ${newId}`, content: null, sort_order: tree.length + 1, depth: 0, updated_at: '', children: [] }
    setTree((t) => [...t, node])
    setSelectedId(newId)
    if (isSupabaseConfigured) {
      const { error } = await upsertHandbookNode({ id: newId, parent_id: null, title: node.title, content: null, sort_order: node.sort_order, depth: 0 })
      if (error) toast.error('Failed to save to database: ' + error)
      else toast.success('Chapter created')
    }
  }

  const handleAddChild = async (parentId: string, parentDepth: number) => {
    const parent = findNode(tree, parentId)
    if (!parent) return
    const childCount = parent.children.length + 1
    const newId = `${parentId}.${childCount}`
    const newDepth = parentDepth + 1
    const node: HandbookNode = { id: newId, parent_id: parentId, title: 'New Section', content: '<p>Start writing here...</p>', sort_order: childCount, depth: newDepth, updated_at: '', children: [] }
    setTree((t) => updateNodeInTree(t, parentId, { children: [...(findNode(t, parentId)?.children ?? []), node] }))
    setSelectedId(newId)
    if (isSupabaseConfigured) {
      // Guarantee the entire ancestor chain exists in DB before inserting this child
      await ensureAncestorsExist(newId, tree)
      const { error } = await upsertHandbookNode({ id: newId, parent_id: parentId, title: node.title, content: node.content, sort_order: childCount, depth: newDepth })
      if (error) toast.error('Failed to save: ' + error)
      else toast.success('Section added')
    }
  }

  const handleDelete = (id: string) => {
    setPendingDelete(id)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    const id = pendingDelete
    setPendingDelete(null)
    setTree((t) => removeNodeFromTree(t, id))
    if (selectedId === id) setSelectedId(null)
    if (isSupabaseConfigured) {
      const { error } = await deleteHandbookNode(id)
      if (error) toast.error('Delete failed: ' + error)
      else toast.success('Deleted')
    }
  }

  const handleFieldChange = (key: 'title' | 'content', value: string) => {
    if (!selectedId) return
    setTree((t) => updateNodeInTree(t, selectedId, { [key]: value }))
  }

  // Read content from the contenteditable div into React state
  const handleEditorInput = () => {
    if (selectedId && editorRef.current) {
      handleFieldChange('content', editorRef.current.innerHTML)
    }
  }

  // Run a formatting command and sync state
  const execCmd = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    editorRef.current?.focus()
    handleEditorInput()
  }

  const handleSave = async () => {
    if (!selectedNode || !isSupabaseConfigured) {
      toast(isSupabaseConfigured ? 'No node selected' : 'Supabase not configured — changes are local only.', { icon: '⚠️' })
      return
    }
    setSaving(true)
    const { error } = await upsertHandbookNode({
      id: selectedNode.id,
      parent_id: selectedNode.parent_id,
      title: selectedNode.title,
      content: selectedNode.content,   // HTML stored directly
      sort_order: selectedNode.sort_order,
      depth: selectedNode.depth,
    })
    setSaving(false)
    if (error) toast.error('Save failed: ' + error)
    else toast.success('Saved to database ✓')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Confirm delete modal */}
      {pendingDelete && (
        <ConfirmModal
          nodeId={pendingDelete}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Handbook CMS</h1>
            <p className="mt-1 text-xs text-blue-100">Manage handbook chapters and sections</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddRoot}
              className="flex items-center gap-2 bg-blue-700 hover:bg-blue-600 border border-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <FaPlus className="text-xs" /> Add Chapter
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selectedNode}
              className="flex items-center gap-2 bg-white hover:bg-slate-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <FaSpinner className="text-xs animate-spin" /> : <FaSave className="text-xs" />}
              {saving ? 'Saving…' : 'Save Node'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-4 grid grid-cols-12 gap-4" style={{ height: 'calc(100vh - 65px)' }}>
        {/* Sidebar */}
        <aside className="col-span-12 md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Structure</span>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {loading && (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <FaSpinner className="animate-spin mr-2" /> Loading…
              </div>
            )}
            {!loading && tree.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center py-6">No chapters yet. Click "Add Chapter".</p>
            )}
            {!loading && tree.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </aside>

        {/* Editor */}
        <section className="col-span-12 md:col-span-9 flex flex-col gap-4 overflow-hidden">
          {!selectedNode && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
              <FaBook className="h-10 w-10 mb-3 opacity-20" />
              <p>Select a node from the sidebar to edit</p>
            </div>
          )}

          {selectedNode && (
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-3 bg-slate-50 shrink-0">
                <span className="text-sm font-semibold text-slate-700">
                  {selectedNode.depth === 0 ? 'Chapter Editor' : 'Section Editor'}
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs text-slate-500 font-mono">{selectedNode.id}</span>
                {selectedNode.depth > 0 && (
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                    depth {selectedNode.depth}
                  </span>
                )}
              </div>

              {/* Formatting toolbar */}
              <div className="px-3 py-2 border-b border-slate-100 bg-slate-50 flex items-center gap-1 shrink-0">
                {[
                  { cmd: 'bold', icon: <FaBold />, title: 'Bold (Ctrl+B)' },
                  { cmd: 'italic', icon: <FaItalic />, title: 'Italic (Ctrl+I)' },
                  { cmd: 'underline', icon: <FaUnderline />, title: 'Underline (Ctrl+U)' },
                ].map(({ cmd, icon, title }) => (
                  <button
                    key={cmd}
                    title={title}
                    onMouseDown={(e) => { e.preventDefault(); execCmd(cmd) }}
                    className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs transition-colors"
                  >
                    {icon}
                  </button>
                ))}
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <button
                  title="Bullet list"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    editorRef.current?.focus()
                    document.execCommand('insertHTML', false, '<ul><li></li></ul>')
                    handleEditorInput()
                  }}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs transition-colors"
                >
                  <FaListUl />
                </button>
                <button
                  title="Numbered list"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    editorRef.current?.focus()
                    document.execCommand('insertHTML', false, '<ol><li></li></ol>')
                    handleEditorInput()
                  }}
                  className="p-1.5 rounded hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs transition-colors"
                >
                  <FaListOl />
                </button>
                <div className="w-px h-4 bg-slate-200 mx-1" />
                <span className="text-[10px] text-slate-400">Tab = indent · Ctrl+B/I/U for formatting</span>
              </div>

              {/* Title */}
              <div className="px-5 py-4 border-b border-slate-100 shrink-0">
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  className="w-full text-lg font-bold text-slate-800 border-none px-0 focus:ring-0 outline-none placeholder-slate-300"
                  placeholder="Section title…"
                />
              </div>

              {/* Rich text content */}
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyDown={(e) => {
                  if (e.key === 'Tab') {
                    e.preventDefault()
                    document.execCommand('insertHTML', false, '\u00a0\u00a0\u00a0\u00a0')
                    handleEditorInput()
                  }
                }}
                className="flex-1 overflow-y-auto px-5 py-4 text-sm text-slate-700 leading-relaxed focus:outline-none prose prose-sm prose-slate max-w-none"
                style={{ minHeight: '150px' }}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Cms
