import { supabase } from '../supabaseClient'

export interface InfrastructureHealth {
  id: number
  cpu_load_percent: number
  db_replica_lag_ms: number
  security_gateway_status: string
  ssl_enabled: boolean
  rls_enforced: boolean
  ip_whitelist_enabled: boolean
  hwid_auth_enabled: boolean
  last_updated: string
}

export interface SecurityConfig {
  id: number
  brute_force_protection: boolean
  audit_logging_enabled: boolean
  session_timeout_hours: number
  two_factor_required: boolean
  password_policy: string
  updated_at: string
}

export interface RLSStatus {
  table_name: string
  rls_enabled: boolean
}

export interface SystemAlert {
  id: string
  type: string
  severity: string
  title: string
  message: string
  metadata: any
  is_resolved: boolean
  resolved_at: string | null
  resolved_by: string | null
  resolution_notes: string | null
  created_at: string
  // Optional join data
  resolver?: {
    first_name: string | null
    last_name: string | null
  }
}

/**
 * Fetch current infrastructure health metrics (L90 only)
 */
export async function getSystemHealth() {
  const { data, error } = await supabase.rpc('get_infrastructure_health')
  return { data: data as InfrastructureHealth | null, error }
}

/**
 * Fetch security configuration (L90 only)
 */
export async function getSecurityConfig() {
  const { data, error } = await supabase.rpc('get_security_config')
  return { data: data as SecurityConfig | null, error }
}

/**
 * Fetch RLS status for critical tables (L90 only)
 */
export async function getRLSStatus() {
  const { data, error } = await supabase.rpc('check_rls_status')
  return { data: data as RLSStatus[] | null, error }
}

/**
 * Fetch entries from the System Alerts Ledger
 */
export async function getSystemAlerts(includeResolved = false) {
  let query = supabase
    .from('system_alerts')
    .select(`
      *,
      resolver:profiles!resolved_by(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  if (!includeResolved) {
    query = query.eq('is_resolved', false)
  }

  const { data, error } = await query
  return { data: data as SystemAlert[] | null, error }
}

/**
 * Mark a system alert as resolved (L90 only via RPC)
 */
export async function resolveSystemAlert(alertId: string, notes: string | null = null) {
  const { data, error } = await supabase.rpc('resolve_system_alert', {
    p_alert_id: alertId,
    p_notes: notes
  })
  return { data, error }
}

/**
 * Check if maintenance mode is active
 */
export async function isMaintenanceMode() {
  const { data, error } = await supabase.rpc('is_maintenance_mode')
  return { data: !!data, error }
}

/**
 * Get full maintenance status from school_settings
 */
export async function getMaintenanceDetails() {
  const { data, error } = await supabase
    .from('school_settings')
    .select('maintenance_mode, maintenance_message, maintenance_started_at')
    .eq('id', 1)
    .single()
  return { data, error }
}
