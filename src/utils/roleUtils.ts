/**
 * Institutional Role Mapping Utility
 * Maps internal system levels and roles to human-readable titles.
 * optimized for UI display while maintaining legacy SQL values.
 */

export const L2_POSITIONS: any[] = [
    'scholarship', 'finance', 'registrar',
    'guidance', 'property_security', 'academic_council',
]

export const L3_POSITIONS: any[] = ['president', 'vice_president']

/**
 * Converts a role level (1, 2, 3, 10, 50, 80, 90) to an institutional title.
 */
export function formatLevel(level: number | string): string {
    const lvl = Number(level)
    switch (lvl) {
        case 90: return 'System Admin'
        case 80:
        case 1: return 'Academic Admin'
        case 50:
        case 2: return 'Departmental Approver'
        case 3: return 'Executive Approver'
        case 10: return 'Student'
        default: return `Level ${lvl}`
    }
}

/**
 * Converts a system role string to an institutional title.
 * Optionally takes position/level for context-sensitive naming.
 */
export function formatRole(role: string, context?: { level?: number; position?: string }): string {
    // Priority 1: Direct Level mapping
    if (context?.level) return formatLevel(context.level)

    // Priority 2: Position mapping for Staff/Approvers
    if (context?.position) {
        if (L3_POSITIONS.includes(context.position)) return 'Executive Approver'
        if (L2_POSITIONS.includes(context.position)) return 'Departmental Approver'
    }

    // Priority 3: Fallback Role mapping
    switch (role) {
        case 'system_admin': return 'System Admin'
        case 'academic_admin': return 'Academic Admin'
        case 'staff': return 'Departmental Approver'
        case 'student': return 'Student'
        default: return role?.replace('_', ' ').toUpperCase() || 'Unknown'
    }
}
