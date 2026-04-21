import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.87.1'

type CreateUserRole = 'student' | 'staff' | 'admin'

type CreateUserPayload = {
  email: string
  password: string
  role: CreateUserRole
  idNumber?: string
  firstName?: string
  middleName?: string
  lastName?: string
  nickname?: string
  address?: string
  region?: string
  province?: string
  city?: string
  barangay?: string
  department?: string
  program?: string
  yearLevel?: string
  section?: string
  approverPosition?:
    | 'scholarship'
    | 'finance'
    | 'registrar'
    | 'guidance'
    | 'property_security'
    | 'academic_council'
    | 'vice_president'
    | 'president'
    | null
  markVerified?: boolean
  body?: Partial<CreateUserPayload>
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  })
}

function getBearerToken(req: Request): string | null {
  // Supabase may not always forward the original Authorization header
  // when Verify JWT is disabled. In that case it can expose the JWT via
  // internal headers such as x-supabase-auth.
  const raw =
    req.headers.get('Authorization') ||
    req.headers.get('authorization') ||
    req.headers.get('x-supabase-auth') ||
    req.headers.get('X-Supabase-Auth')

  if (!raw) return null

  // Accept either "Bearer <token>" or just "<token>"
  const m = raw.match(/^Bearer\s+(.+)$/i)
  return (m ? m[1] : raw).trim() || null
}

function getJwtSub(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const json = atob(padded)
    const payload = JSON.parse(json) as { sub?: string }
    return payload.sub?.trim() || null
  } catch {
    return null
  }
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json(200, { ok: true })
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json(500, {
      error:
        'Server is not configured (missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY).',
    })
  }

  const token = getBearerToken(req)
  if (!token) return json(401, { error: 'Missing Authorization bearer token.' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Derive caller id from JWT subject claim.
  // This avoids relying on non-standard forwarded headers.
  const callerId = getJwtSub(token)
  if (!callerId) {
    return json(401, { error: 'Invalid or expired token.' })
  }

  // Authorize caller (profiles.role = 'admin')
  const { data: callerProfile, error: callerProfileErr } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerId)
    .maybeSingle()

  if (callerProfileErr) return json(500, { error: 'Failed to verify admin role.' })
  if ((callerProfile?.role ?? '').toString().toLowerCase() !== 'admin') {
    return json(403, { error: 'Forbidden: admin access required.' })
  }

  // Parse payload
  let payload: CreateUserPayload
  try {
    payload = (await req.json()) as CreateUserPayload
  } catch {
    return json(400, { error: 'Invalid JSON body.' })
  }

  const maybeWrapped = payload.body ?? {}
  const emailSource =
    typeof payload.email === 'string'
      ? payload.email
      : typeof maybeWrapped.email === 'string'
        ? maybeWrapped.email
        : ''
  const passwordSource =
    typeof payload.password === 'string'
      ? payload.password
      : typeof maybeWrapped.password === 'string'
        ? maybeWrapped.password
        : ''
  const roleSource =
    payload.role ??
    (typeof maybeWrapped.role === 'string'
      ? (maybeWrapped.role as CreateUserRole)
      : undefined)
  const approverPositionSource =
    (payload.approverPosition as string | null | undefined) ??
    (maybeWrapped.approverPosition as string | null | undefined) ??
    null

  const email = emailSource.trim().toLowerCase()
  const password = passwordSource
  const role = roleSource
  const approverPosition = approverPositionSource?.trim() || null

  if (!email || !isEmail(email)) return json(400, { error: 'Valid email is required.' })
  if (!password || password.length < 8)
    return json(400, { error: 'Password must be at least 8 characters.' })
  if (!role || !['student', 'staff', 'admin'].includes(role)) return json(400, { error: 'Invalid role.' })
  const validPositions = ['scholarship', 'finance', 'registrar', 'guidance', 'property_security', 'academic_council', 'vice_president', 'president']
  if (approverPosition && !validPositions.includes(approverPosition)) {
    return json(400, { error: 'Invalid approver position.' })
  }

  const firstName = (payload.firstName ?? '').trim()
  const middleName = (payload.middleName ?? '').trim()
  const lastName = (payload.lastName ?? '').trim()
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ')

  const verified = role === 'admin' ? true : payload.markVerified === true

  // Create auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role,
      full_name: fullName || undefined,
      must_reset_password: payload.mustResetPassword === true ? true : undefined,
    },
  })

  if (createErr || !created?.user) {
    const msg = createErr?.message || 'Failed to create user.'
    return json(400, { error: msg })
  }

  const newUserId = created.user.id

  // Upsert profile
  const { error: profileErr } = await admin.from('profiles').upsert({
    id: newUserId,
    email,
    student_employee_id: (payload.idNumber ?? '').trim() || null,
    role,
    auth_provider: 'email',
    first_name: firstName || '',
    middle_name: middleName || null,
    last_name: lastName || '',
    nickname: (payload.nickname ?? '').trim() || null,
    department: payload.department || null,
    program: payload.program || null,
    year_level: payload.yearLevel || null,
    section: payload.section || null,
    approver_position: approverPosition,
    verified,
  })

  if (profileErr) {
    // Roll back auth user if profile write fails (best-effort)
    try {
      await admin.auth.admin.deleteUser(newUserId)
    } catch {
      // ignore
    }
    return json(500, { error: `User created, but saving profile failed: ${profileErr.message}` })
  }

  return json(200, { userId: newUserId, profileId: newUserId })
})

