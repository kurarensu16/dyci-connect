import type { HandbookNode } from './api/handbook'

/** Plain text for matching (no HTML tags). */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  if (typeof document !== 'undefined') {
    const d = document.createElement('div')
    d.innerHTML = html
    return (d.textContent || d.innerText || '').replace(/\s+/g, ' ').trim()
  }
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export interface HandbookSearchHit {
  node: HandbookNode
  /** Human-readable path, e.g. ["Chapter 1", "Attendance"] */
  pathTitles: string[]
  /** True if every search word appears in the title */
  titleMatch: boolean
  /** Short excerpt when match is mainly in body text */
  snippet: string | null
}

function makeSnippet(plain: string, tokens: string[], maxLen: number): string {
  const lower = plain.toLowerCase()
  let pos = Infinity
  for (const t of tokens) {
    const i = lower.indexOf(t)
    if (i >= 0 && i < pos) pos = i
  }
  if (pos === Infinity) pos = 0
  const start = Math.max(0, pos - 48)
  let slice = plain.slice(start, start + maxLen).trim()
  if (start > 0) slice = '…' + slice
  if (start + maxLen < plain.length) slice = slice + '…'
  return slice
}

/**
 * Depth-first search: all nodes whose title or body text matches every word in the query.
 * Results are sorted with title matches first, then leaf pages, then by path.
 */
export function searchHandbook(tree: HandbookNode[], rawQuery: string): HandbookSearchHit[] {
  const q = rawQuery.trim()
  if (!q) return []
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []

  const hits: HandbookSearchHit[] = []

  const visit = (nodes: HandbookNode[], ancestors: string[]) => {
    for (const n of nodes) {
      const titleLower = n.title.toLowerCase()
      const plain = stripHtml(n.content)
      const plainLower = plain.toLowerCase()
      const combined = `${titleLower} ${plainLower}`

      const allMatch = tokens.every((t) => combined.includes(t))
      if (allMatch) {
        const titleMatch = tokens.every((t) => titleLower.includes(t))
        const snippet =
          !titleMatch && plain ? makeSnippet(plain, tokens, 180) : null
        hits.push({
          node: n,
          pathTitles: [...ancestors, n.title],
          titleMatch,
          snippet,
        })
      }
      visit(n.children, [...ancestors, n.title])
    }
  }

  visit(tree, [])

  hits.sort((a, b) => {
    if (a.titleMatch !== b.titleMatch) return a.titleMatch ? -1 : 1
    const aLeaf = a.node.children.length === 0
    const bLeaf = b.node.children.length === 0
    if (aLeaf !== bLeaf) return aLeaf ? -1 : 1
    return a.pathTitles.join(' › ').localeCompare(b.pathTitles.join(' › '))
  })

  return hits
}

/** Path from root to node (inclusive), for navigation stack. */
export function findPathToNode(
  nodes: HandbookNode[],
  targetId: string,
  path: HandbookNode[] = []
): HandbookNode[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return [...path, n]
    const found = findPathToNode(n.children, targetId, [...path, n])
    if (found) return found
  }
  return null
}
