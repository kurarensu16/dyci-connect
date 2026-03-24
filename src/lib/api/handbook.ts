import { supabase } from '../supabaseClient'

// ── Types ──────────────────────────────────────────────────────────────────

export interface HandbookNode {
    id: string
    parent_id: string | null
    title: string
    content: string | null
    sort_order: number
    depth: number
    updated_at: string
    children: HandbookNode[]
}

// Row shape returned from Supabase (no children yet)
interface DbHandbookNode {
    id: string
    parent_id: string | null
    title: string
    content: string | null
    sort_order: number
    depth: number
    updated_at: string
}

// ── Tree builder ───────────────────────────────────────────────────────────

/**
 * Converts a flat array of DB rows into a recursive tree.
 * Works for any depth (1.1, 1.1.2, 1.1.2.3.4.5, …)
 */
export function buildTree(rows: DbHandbookNode[]): HandbookNode[] {
    const nodeMap = new Map<string, HandbookNode>()

    // First pass: create all nodes
    for (const row of rows) {
        nodeMap.set(row.id, { ...row, children: [] })
    }

    const roots: HandbookNode[] = []

    // Second pass: wire parent → children
    for (const node of nodeMap.values()) {
        if (node.parent_id === null) {
            roots.push(node)
        } else {
            const parent = nodeMap.get(node.parent_id)
            if (parent) {
                parent.children.push(node)
            }
        }
    }

    // Sort each level by sort_order
    const sortChildren = (nodes: HandbookNode[]) => {
        nodes.sort((a, b) => a.sort_order - b.sort_order)
        nodes.forEach((n) => sortChildren(n.children))
    }
    sortChildren(roots)

    return roots
}

// ── API functions ──────────────────────────────────────────────────────────

/**
 * Fetch the entire handbook tree from Supabase.
 */
export async function fetchHandbookTree(): Promise<{
    data: HandbookNode[] | null
    error: string | null
}> {
    const { data, error } = await supabase
        .from('handbook_nodes')
        .select('id, parent_id, title, content, sort_order, depth, updated_at')
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('fetchHandbookTree error:', error)
        return { data: null, error: error.message }
    }

    return { data: buildTree(data as DbHandbookNode[]), error: null }
}

/**
 * Upsert a single node (create or update).
 */
export async function upsertHandbookNode(
    node: Omit<DbHandbookNode, 'updated_at'>
): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('handbook_nodes')
        .upsert(node, { onConflict: 'id' })

    if (error) {
        console.error('upsertHandbookNode error:', error)
        return { error: error.message }
    }

    return { error: null }
}

/**
 * Delete a node (and its children via DB cascade).
 */
export async function deleteHandbookNode(id: string): Promise<{ error: string | null }> {
    const { error } = await supabase
        .from('handbook_nodes')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('deleteHandbookNode error:', error)
        return { error: error.message }
    }

    return { error: null }
}
