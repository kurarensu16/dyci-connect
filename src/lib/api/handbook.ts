import { supabase } from '../supabaseClient'

// ── Types ──────────────────────────────────────────────────────────────────

export interface HandbookNode {
    id: string
    db_id?: string      // Real Supabase UUID — set when loaded from DB
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
    handbook_id: string
    parent_id: string | null
    title: string
    content: string | null
    sort_order: number
    workflow_stage_id: string
    updated_at: string
}

// Write shape for upsert — handbook_id and workflow_stage_id are optional since
// they may already exist in the DB or be handled separately
interface UpsertHandbookNodeInput {
    id: string
    handbook_id?: string
    parent_id: string | null
    title: string
    content: string | null
    sort_order: number
    workflow_stage_id?: string
    depth?: number  // Used for tree logic, NOT stored in DB
}

// ── Tree builder ───────────────────────────────────────────────────────────

/**
 * Converts a flat array of DB rows into a recursive tree.
 * Works for any depth (1.1, 1.1.2, 1.1.2.3.4.5, …)
 */
export function buildTree(rows: DbHandbookNode[]): HandbookNode[] {
    const nodeMap = new Map<string, HandbookNode>()

    // First pass: create all nodes (initially at depth 0)
    for (const row of rows) {
        nodeMap.set(row.id, { ...row, db_id: row.id, depth: 0, children: [] })
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

    // Sort each level and recursively calculate depth
    const processLevel = (nodes: HandbookNode[], currentDepth: number) => {
        nodes.sort((a, b) => a.sort_order - b.sort_order)
        nodes.forEach((n) => {
            n.depth = currentDepth
            processLevel(n.children, currentDepth + 1)
        })
    }
    processLevel(roots, 0)

    return roots
}

// ── API functions ──────────────────────────────────────────────────────────

/**
 * Fetch the entire handbook tree from Supabase.
 */
export async function fetchHandbookTree(handbookId: string): Promise<{
    data: HandbookNode[] | null
    error: string | null
}> {
    const { data, error } = await supabase
        .from('handbook_sections')
        .select('id, handbook_id, parent_id, title, content, sort_order, workflow_stage_id, updated_at')
        .eq('handbook_id', handbookId)
        .order('sort_order', { ascending: true })

    if (error) {
        console.error('fetchHandbookTree error:', error)
        return { data: null, error: error.message }
    }

    return { data: buildTree(data as DbHandbookNode[]), error: null }
}

/**
 * Upsert a single node (create or update).
 * Note: `depth` is a UI-only concept and is NOT stored in the DB.
 */
export async function upsertHandbookNode(
    node: UpsertHandbookNodeInput
): Promise<{ error: string | null }> {
    // Destructure to avoid passing UI-only fields to the DB
    const { depth: _depth, ...dbPayload } = node
    const { error } = await supabase
        .from('handbook_sections')
        .upsert(dbPayload, { onConflict: 'id' })

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
        .from('handbook_sections')
        .delete()
        .eq('id', id)

    if (error) {
        console.error('deleteHandbookNode error:', error)
        return { error: error.message }
    }

    return { error: null }
}
