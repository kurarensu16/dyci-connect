import React, { useState, useMemo, useEffect } from 'react'
import {
  FaBookOpen,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import { fetchHandbookTree, buildTree, type HandbookNode } from '../../lib/api/handbook'
import { handbookData } from '../../data/handbookData'

// Fallback: build tree from static data
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

// Flatten all leaf nodes for prev/next navigation
function flattenLeaves(nodes: HandbookNode[]): HandbookNode[] {
  const result: HandbookNode[] = []
  const traverse = (list: HandbookNode[]) => {
    for (const n of list) {
      if (n.children.length === 0) result.push(n)
      else traverse(n.children)
    }
  }
  traverse(nodes)
  return result
}

const HandbookPreview: React.FC = () => {
  const [tree, setTree] = useState<HandbookNode[]>([])
  const [loading, setLoading] = useState(true)
  const [navStack, setNavStack] = useState<HandbookNode[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  const currentLevel: HandbookNode[] = navStack.length === 0 ? tree : navStack[navStack.length - 1].children
  const activeNode = navStack[navStack.length - 1] ?? null
  const isReading = activeNode !== null && activeNode.children.length === 0

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const { data, error } = await fetchHandbookTree()
      if (!cancelled) {
        if (error || !data || data.length === 0) {
          setTree(buildFallback())
        } else {
          setTree(data)
        }
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleNodeClick = (node: HandbookNode) => {
    setNavStack((prev) => [...prev, node])
    setSearchQuery('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setNavStack((prev) => prev.slice(0, -1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filteredLevel = useMemo(() => {
    if (!searchQuery || navStack.length > 0) return currentLevel
    const q = searchQuery.toLowerCase()
    return tree.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.content ?? '').toLowerCase().includes(q)
    )
  }, [currentLevel, searchQuery, navStack, tree])

  // Prev / Next across all leaves
  const allLeaves = useMemo(() => flattenLeaves(tree), [tree])
  const leafIndex = isReading ? allLeaves.findIndex((l) => l.id === activeNode.id) : -1
  const prevLeaf = leafIndex > 0 ? allLeaves[leafIndex - 1] : null
  const nextLeaf = leafIndex >= 0 && leafIndex < allLeaves.length - 1 ? allLeaves[leafIndex + 1] : null

  const navigateToLeaf = (leaf: HandbookNode) => {
    const buildStack = (nodes: HandbookNode[], target: string): HandbookNode[] | null => {
      for (const n of nodes) {
        if (n.id === target) return [n]
        const sub = buildStack(n.children, target)
        if (sub) return [n, ...sub]
      }
      return null
    }
    const stack = buildStack(tree, leaf.id)
    if (stack) {
      setNavStack(stack)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const breadcrumbs = navStack.map((n) => n.id).join(' / ')

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">Student Handbook</h1>
          <p className="mt-1 text-xs text-blue-100">
            Admin Preview
          </p>
        </div>
      </header>

      {/* Sub-bar: Back button + Search — sits below header */}
      <div className="max-w-6xl mx-auto px-6 pt-4 pb-2 flex items-center gap-3">
        {navStack.length > 0 && (
          <button
            onClick={handleBack}
            className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
          >
            <FaChevronLeft className="text-[10px]" />
            Back
          </button>
        )}
        {navStack.length === 0 && (
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search handbook topics..."
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all shadow-sm"
            />
          </div>
        )}
        {navStack.length > 0 && (
          <p className="text-xs text-slate-400 font-mono">{breadcrumbs}</p>
        )}
      </div>

      <main className="max-w-6xl mx-auto px-6 py-2">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading handbook…
          </div>
        )}

        {/* Chapter list */}
        {!loading && navStack.length === 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center mb-6">
              <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaBookOpen className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Welcome to the Student Handbook</h2>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Your guide to academic policies, student conduct, and campus life at Dr. Yanga's Colleges, Inc.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredLevel.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="group bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left flex items-start gap-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="font-bold text-sm">{node.id}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{node.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{node.children.length} sections</p>
                  </div>
                </button>
              ))}
              {filteredLevel.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-500">
                  No results for "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drill-down list */}
        {!loading && navStack.length > 0 && !isReading && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-md">
                {activeNode.id}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">{activeNode.title}</h2>
            </div>
            <div className="space-y-2">
              {currentLevel.map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    <span className="mr-2 opacity-60 text-sm font-mono">{node.id}</span>
                    {node.title}
                  </span>
                  <FaChevronRight className="text-slate-300 group-hover:text-blue-500 text-xs" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content reader */}
        {!loading && isReading && (
          <div className="animate-in zoom-in-95 duration-300 max-w-4xl mx-auto">
            <div className="bg-white rounded-t-2xl border-x border-t border-slate-200 p-6 pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-2">
                {activeNode.id}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{activeNode.title}</h2>
            </div>
            <div className="bg-white rounded-b-2xl border border-slate-200 p-6 pt-2 shadow-sm min-h-[300px]">
              <div
                className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600"
                dangerouslySetInnerHTML={{ __html: activeNode.content ?? '' }}
              />
            </div>
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                onClick={() => prevLeaf ? navigateToLeaf(prevLeaf) : handleBack()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-sm transition-colors"
              >
                <FaChevronLeft className="text-xs" />
                {prevLeaf ? prevLeaf.title : 'Back'}
              </button>
              {nextLeaf && (
                <button
                  onClick={() => navigateToLeaf(nextLeaf)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 shadow-sm transition-colors"
                >
                  {nextLeaf.title}
                  <FaChevronRight className="text-xs" />
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default HandbookPreview
