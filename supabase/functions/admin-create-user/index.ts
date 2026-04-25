import { createClient, User } from 'https://esm.sh/@supabase/supabase-js@2.42.0'

type CreateUserRole = 'system_admin' | 'academic_admin' | 'staff' | 'student'

type CreateUserPayload = {
  email: string
  password: string
  role: CreateUserRole
  idNumber: string
  firstName?: string
  middleName?: string
  lastName?: string
  nickname?: string

  // Student Specific
  programId?: string
  departmentId?: string
  yearLevelId?: number
  sectionId?: string
  streetAddress?: string
  barangayId?: number
  guardianName?: string
  guardianContact?: string

  // Staff Specific
  staffType?: string
  employmentStatus?: string
  office?: string

  // Admin Specific
  approverPosition?: string

  markVerified?: boolean
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Authorization
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Security Check: Only Level 90 (System Admin) can provision users
    // Note: This function uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS for DB operations.
    const { data: { user: actor } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
    
    // Resolve role and level sequentially
    const { data: userRole } = await supabaseClient.rpc('get_user_role', { uid: actor?.id })
    const { data: roleLevel } = await supabaseClient.rpc('get_role_level', { r: userRole })

    if (!roleLevel || roleLevel < 90) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 2. Parse Payload
    const payload: CreateUserPayload = await req.json() as CreateUserPayload
    const {
      email, password, role, idNumber,
      firstName = '', middleName = '', lastName = '', nickname = '',
      markVerified = true
    } = payload

    // 3. Strict Identity Validation
    let userId: string | null = null

    // A. Check for Student ID Conflict (User Requested Strictness)
    const { data: profileByID } = await supabaseClient
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('student_employee_id', idNumber)
      .maybeSingle()

    if (profileByID) {
      // Check if the emails match
      if (profileByID.email.toLowerCase() !== email.toLowerCase()) {
        const existingName = `${profileByID.first_name || ''} ${profileByID.last_name || ''}`.trim()
        const batchName = `${firstName} ${lastName}`.trim()

        return new Response(JSON.stringify({
          error: `ID Conflict: Student ID ${idNumber} is already linked to "${existingName}" (${profileByID.email}). Your batch record is for "${batchName}" (${email}).`
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // If same ID and same email, we proceed (idempotent update)
      userId = profileByID.id
    } else {
      // B. Check for Email Existence (In profiles or Auth)
      const { data: profileByEmail } = await supabaseClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle()

      if (profileByEmail) {
        userId = profileByEmail.id
      } else {
        // C. Fallback: Search Auth Users ( handles cases where user exists but profile is missing)
        let page = 1;
        while (true) {
          const { data: { users }, error: listError } = await supabaseClient.auth.admin.listUsers({ page, perPage: 100 });
          if (listError || !users || users.length === 0) break;
          const match = users.find((u: User) => u.email?.toLowerCase() === email.toLowerCase());
          if (match) { userId = match.id; break; }
          if (users.length < 100) break;
          page++;
        }

        // D. Create Auth if missing
        if (!userId) {
          const { data: authVersion } = await supabaseClient.rpc('get_auth_version')

          const { data: authUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              role,
              firstName,
              lastName,
              auth_version: authVersion || 1
            }
          })
          if (createUserError) throw createUserError
          userId = authUser.user?.id || null
        }
      }
    }

    if (!userId) throw new Error('Identity resolution failed')

    // 4. Atomic Database Upsert (Forcing Bootstrap State)
    try {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .upsert({
          id: userId,
          email: email.toLowerCase(),
          student_employee_id: idNumber,
          first_name: (firstName && firstName.trim() !== '') ? firstName.trim() : 'Provisioned',
          last_name: (lastName && lastName.trim() !== '') ? lastName.trim() : 'User',
          middle_name: middleName || null,
          nickname: nickname || null,
          verified: markVerified,
          profile_complete: false,
          password_reset_required: true,
          password_reset_requested_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' })

      if (profileError) throw profileError

      const { error: roleInsertError } = await supabaseClient
        .from('user_roles')
        .upsert({ user_id: userId, role }, { onConflict: 'user_id' })

      if (roleInsertError) throw roleInsertError

      if (role === 'student') {
        const { error: studentError } = await supabaseClient
          .from('student_profiles')
          .upsert({
            profile_id: userId,
            department_id: payload.departmentId || null,
            program_id: payload.programId || null,
            year_level_id: payload.yearLevelId || null,
            section_id: payload.sectionId || null,
            street_address: payload.streetAddress || null,
            barangay_id: payload.barangayId || null,
            guardian_name: payload.guardianName || null,
            guardian_contact: payload.guardianContact || null,
            enrolled_academic_year_id: null, // FORCE NULL for Gate 2
            updated_at: new Date().toISOString()
          }, { onConflict: 'profile_id' })
        if (studentError) throw studentError
      } else {
        const { error: staffError } = await supabaseClient
          .from('staff_profiles')
          .upsert({
            profile_id: userId,
            staff_type: payload.staffType || 'administrative',
            employment_status: payload.employmentStatus || 'regular',
            office: payload.office || null,
            updated_at: new Date().toISOString()
          }, { onConflict: 'profile_id' })
        if (staffError) throw staffError
      }

      return new Response(JSON.stringify({ success: true, userId }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    } catch (dbError) {
      throw dbError
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Fatal:', error)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
