import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
  FaPlus,
  FaDownload,
  FaCheckCircle,
  FaTimes,
  FaEllipsisV,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { buildAdminDepartmentOptions, isOfficeDepartment } from '../../lib/departmentOptions'
import * as XLSX from 'xlsx'

type Role = 'Student' | 'Staff' | 'Admin'
type StaffPosition =
  | ''
  | 'scholarship'
  | 'finance'
  | 'registrar'
  | 'guidance'
  | 'property_security'
  | 'academic_council'
  | 'vice_president'
  | 'president'
type Status = 'Active' | 'Pending' | 'Disabled' | 'Archived'

const POSITION_LABELS: Record<string, string> = {
  scholarship: 'Scholarship',
  finance: 'Finance',
  registrar: 'Registrar',
  guidance: 'Guidance',
  property_security: 'Property / Security',
  academic_council: 'Academic Council',
  vice_president: 'Vice President',
  president: 'President',
}

interface AdminUserRow {
  id: string
  fullName: string
  email: string
  userId: string
  avatarUrl?: string
  verified: boolean
  role: Role
  position: StaffPosition
  roleLabel: string
  /** College / office when staff has no approver_position */
  department: string | null
  status: Status
  lastLogin: string
  storageMb: number
}

function normalizeStaffPosition(raw: unknown): StaffPosition {
  const s = (raw ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_')
  if (!s) return ''
  if (s in POSITION_LABELS) return s as StaffPosition
  return s as StaffPosition
}

/** Office approver role, or department name when no approver_position is set */
function buildStaffRoleLabel(position: StaffPosition, department: string | null): string {
  if (position) {
    return POSITION_LABELS[position] ?? position.replace(/_/g, ' ')
  }
  const d = (department ?? '').trim()
  return d || 'Staff'
}

const rolePillClasses: Record<Role, string> = {
  Student: 'bg-blue-50 text-blue-700',
  Staff: 'bg-purple-50 text-purple-700',
  Admin: 'bg-rose-50 text-rose-700',
}

const statusPillClasses: Record<Status, string> = {
  Active: 'bg-emerald-50 text-emerald-700',
  Pending: 'bg-slate-50 text-slate-500',
  Disabled: 'bg-amber-50 text-amber-700',
  Archived: 'bg-rose-50 text-rose-700',
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)

  const handleBatchImportChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
      return
    }

    setIsImporting(true)
    try {
      let rows: any[] = []
      const fileName = file.name.toLowerCase()

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        // Handle Excel
        const data = await file.arrayBuffer()
        const workbook = XLSX.read(data)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
        rows = jsonData.filter(r => r.length >= 2)
      } else {
        // Handle CSV
        const text = await file.text()
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
        rows = lines.map(l => l.split(',').map(p => p.trim().replace(/^"|"$/g, '')))
      }

      if (rows.length === 0) {
        toast.error('The file is empty or invalid.')
        setIsImporting(false)
        return
      }

      let successCount = 0
      let errorCount = 0
      const errorMessages: string[] = []

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        toast.error('You are not logged in.')
        setIsImporting(false)
        return
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      const fnUrl = `${supabaseUrl}/functions/v1/admin-create-user`

      let emailIdx = 0
      let firstIdx = 1
      let lastIdx = 2
      let passwordIdx = 3
      let isHeaderProcessed = false

      for (let i = 0; i < rows.length; i++) {
        const parts = rows[i]
        if (!parts || parts.length < 2) continue

        // Check first row for headers
        if (!isHeaderProcessed) {
          const lowerParts = parts.map((p: any) => (p || '').toString().toLowerCase())
          const eIdx = lowerParts.findIndex((p: string) => p.includes('email') || p.includes('user'))
          const pIdx = lowerParts.findIndex((p: string) => p.includes('pass'))
          const fIdx = lowerParts.findIndex((p: string) => p.includes('first') || p.includes('fname'))
          const lIdx = lowerParts.findIndex((p: string) => p.includes('last') || p.includes('lname'))

          if (eIdx !== -1 && pIdx !== -1) {
            emailIdx = eIdx
            passwordIdx = pIdx
            firstIdx = fIdx === -1 ? 1 : fIdx
            lastIdx = lIdx === -1 ? 2 : lIdx
            console.log(`[Import Debug] Detected headers at indices: Email=${emailIdx}, Pass=${passwordIdx}, First=${firstIdx}, Last=${lastIdx}`)
            isHeaderProcessed = true
            continue
          }
          isHeaderProcessed = true
        }

        const email = (parts[emailIdx] || '').toString().trim()
        const password = (parts[passwordIdx] || '').toString().trim()
        const firstName = firstIdx !== -1 ? (parts[firstIdx] || '').toString().trim() : ''
        const lastName = lastIdx !== -1 ? (parts[lastIdx] || '').toString().trim() : ''

        if (!email || !email.includes('@')) continue

        const payload = {
          email,
          password,
          firstName,
          lastName,
          role: 'student',
          markVerified: true,
          mustResetPassword: true,
        }

        console.log(`[Import Debug] Mapped ${email}:`, { 
          passwordLength: password.length,
          passwordValue: password,
          firstName,
          lastName
        })

        try {
          const res = await fetch(fnUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payload),
          })

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({ error: 'Unknown error' }))
            const errMsg = errBody.error || `HTTP ${res.status}`
            console.error(`Failed to import ${email}: [${res.status}] ${errMsg}`)
            errorMessages.push(`${email}: ${errMsg}`)
            errorCount++
          } else {
            successCount++
          }
        } catch (fetchErr) {
          console.error(`Failed to import ${email}:`, fetchErr)
          errorMessages.push(`${email}: Network error`)
          errorCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Imported ${successCount} user${successCount > 1 ? 's' : ''} successfully!`)
      }
      if (errorCount > 0) {
        const summary = errorMessages.slice(0, 3).join('\n')
        const more = errorMessages.length > 3 ? `\n...and ${errorMessages.length - 3} more` : ''
        toast.error(`${errorCount} failed:\n${summary}${more}`, { duration: 8000 })
        console.error('All import errors:', errorMessages)
      }
      await loadUsers()
    } catch (err) {
      console.error('Batch import failed', err)
      toast.error('Failed to parse or import data.')
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All')
  const [positionFilter, setPositionFilter] = useState<'All' | 'Faculty' | StaffPosition>('All')
  const [departmentFilter, setDepartmentFilter] = useState<'All' | string>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All')
  const [showArchived, setShowArchived] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [reviewingUser, setReviewingUser] = useState<AdminUserRow | null>(null)
  const [reviewProfile, setReviewProfile] = useState<any | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [verifySaving, setVerifySaving] = useState(false)
  const [resetConfirmUser, setResetConfirmUser] = useState<AdminUserRow | null>(null)
  const [resetSending, setResetSending] = useState(false)
  const [disableConfirmUser, setDisableConfirmUser] = useState<AdminUserRow | null>(null)
  const [disableSaving, setDisableSaving] = useState(false)
  const [archiveConfirmUser, setArchiveConfirmUser] = useState<AdminUserRow | null>(null)
  const [archiveSaving, setArchiveSaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'staff' | 'admin',
    idNumber: '',
    nickname: '',
    department: '',
    program: '',
    yearLevel: '',
    section: '',
    approverPosition: '' as '' | 'scholarship' | 'finance' | 'registrar' | 'guidance' | 'property_security' | 'academic_council' | 'vice_president' | 'president',
  })

  const [departments, setDepartments] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [yearLevels, setYearLevels] = useState<any[]>([])
  const adminDepartmentOptions = buildAdminDepartmentOptions(
    departments,
    createForm.role !== 'student'
  )

  useEffect(() => {
    const loadAcademicLookups = async () => {
      if (!isSupabaseConfigured) return
      try {
        const [deptRes, progRes, yearRes] = await Promise.all([
          supabase.from('departments').select('id, name').order('name'),
          supabase.from('programs').select('id, name, short_code, department_id').order('name'),
          supabase.from('year_levels').select('id, label, sort_order').order('sort_order'),
        ])
        if (!deptRes.error && deptRes.data) setDepartments(deptRes.data)
        if (!progRes.error && progRes.data) setPrograms(progRes.data)
        if (!yearRes.error && yearRes.data) setYearLevels(yearRes.data)
      } catch (error) {
        console.error('Error loading academic lookups', error)
      }
    }

    loadAcademicLookups()
  }, [])

  const loadUsers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Supabase not configured: show empty state
      setUsers([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error } = await supabase.from('admin_users_view').select('*')

    if (error) {
      console.error('Error loading admin users:', error)
      setError('Failed to load users from the server.')
      setUsers([])
    } else {
      const mapped: AdminUserRow[] = (data || []).map((row: any) => {
        const dbRole = (row.role ?? '').toString().toLowerCase().trim()
        let role: Role
        if (dbRole === 'admin') role = 'Admin'
        else if (dbRole === 'staff' || dbRole === 'faculty') role = 'Staff'
        else role = 'Student'

        const dept =
          row.department != null && String(row.department).trim() !== ''
            ? String(row.department).trim()
            : null

        const position: StaffPosition =
          role === 'Staff' ? normalizeStaffPosition(row.approver_position) : ''
        const roleLabel =
          role === 'Staff' ? buildStaffRoleLabel(position, dept) : role

        const verified = row.verified === true
        const isArchived = row.is_archived === true || !!row.archived_at
        const isDisabled = !!row.disabled_at

        const status: Status = isArchived
          ? 'Archived'
          : isDisabled
            ? 'Disabled'
            : role === 'Admin'
              ? 'Active'
              : verified
                ? 'Active'
                : 'Pending'

        return {
          id: row.id,
          fullName: row.full_name ?? '',
          email: row.email ?? '',
          userId: row.user_id ?? '',
          avatarUrl: row.avatar_url ?? undefined,
          verified,
          role,
          position,
          roleLabel,
          department: dept,
          status,
          lastLogin: row.last_login ?? '',
          storageMb: Number(row.storage_mb ?? 0),
        }
      })
      setUsers(mapped)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const staffDepartmentOptions = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) {
      if (u.role === 'Staff' && u.department) set.add(u.department)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [users])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return users.filter((u) => {
      if (roleFilter !== 'All' && u.role !== roleFilter) return false
      if (roleFilter === 'Staff' && positionFilter !== 'All') {
        if (positionFilter === 'Faculty') {
          if (u.position !== '') return false
        } else {
          if (u.position !== positionFilter) return false
        }
      }
      if (roleFilter === 'Staff' && departmentFilter !== 'All' && u.department !== departmentFilter) {
        return false
      }
      if (statusFilter !== 'All' && u.status !== statusFilter) return false
      if (!showArchived && u.status === 'Archived') return false
      if (!q) return true
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q) ||
        u.roleLabel.toLowerCase().includes(q) ||
        (u.department?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [users, roleFilter, positionFilter, departmentFilter, statusFilter, searchQuery, showArchived])

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, positionFilter, departmentFilter, statusFilter, searchQuery, showArchived])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage])

  const escapeCsvValue = (value: string | number | boolean | null | undefined): string => {
    const raw = value == null ? '' : String(value)
    const escaped = raw.replace(/"/g, '""')
    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
  }

  const handleExportCsv = () => {
    if (filteredUsers.length === 0) {
      toast.error('No users to export for the current filters.')
      return
    }

    const headers = [
      'full_name',
      'email',
      'student_employee_id',
      'role',
      'status',
      'verified',
      'last_sign_in',
      'storage_mb',
    ]

    const rows = filteredUsers.map((u) => [
      u.fullName,
      u.email,
      u.userId,
      u.role,
      u.status,
      u.verified,
      u.lastLogin || '',
      u.storageMb.toFixed(1),
    ])

    const csvContent = [
      headers.map((h) => escapeCsvValue(h)).join(','),
      ...rows.map((row) => row.map((cell) => escapeCsvValue(cell)).join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    link.href = url
    link.download = `users-export-${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${filteredUsers.length} user${filteredUsers.length > 1 ? 's' : ''}.`)
  }

  const allVisibleSelected =
    paginatedUsers.length > 0 &&
    paginatedUsers.every((u) => selectedIds.includes(u.id))

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !paginatedUsers.some((u) => u.id === id)))
    } else {
      setSelectedIds((prev) => [
        ...prev,
        ...paginatedUsers
          .filter((u) => !prev.includes(u.id))
          .map((u) => u.id),
      ])
    }
  }

  const toggleRowSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const storageClass = (mb: number) => {
    if (mb >= 150) return 'text-rose-600'
    if (mb >= 100) return 'text-amber-600'
    return 'text-slate-600'
  }

  const openReviewModal = async (user: AdminUserRow) => {
    if (!isSupabaseConfigured) return

    setReviewingUser(user)
    setReviewOpen(true)
    setReviewProfile(null)
    setReviewError(null)
    setReviewLoading(true)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error loading profile for review:', error)
      setReviewError('Failed to load full profile details for this user.')
    } else {
      setReviewProfile(data)
    }

    setReviewLoading(false)
  }

  const closeReviewModal = () => {
    setReviewOpen(false)
    setReviewingUser(null)
    setReviewProfile(null)
    setReviewError(null)
    setVerifySaving(false)
  }

  const handleResetPassword = async (user: AdminUserRow) => {
    setActionMenuOpenId(null)
    setResetConfirmUser(user)
  }

  const confirmResetPassword = async () => {
    if (!resetConfirmUser) return
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
      return
    }
    const email = resetConfirmUser.email?.trim()
    if (!email) {
      toast.error('This user has no email address on file.')
      return
    }

    setResetSending(true)
    try {
      // Match Forgot Password behavior: don't allow password reset for Google-only accounts.
      const { data: authProvider } = await supabase.rpc('get_auth_provider_for_email', {
        em: email,
      })

      if (authProvider === 'google') {
        toast.error(
          'This account uses Google sign-in. Password reset email is not applicable.'
        )
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) {
        toast.error(error.message || 'Failed to send reset email.')
        return
      }

      toast.success(`Password reset email sent to ${email}.`)
      setResetConfirmUser(null)
    } catch (error) {
      console.error('Error sending reset email', error)
      toast.error('Failed to send reset email.')
    } finally {
      setResetSending(false)
    }
  }

  const handleDisableUser = async (user: AdminUserRow) => {
    setActionMenuOpenId(null)
    setDisableConfirmUser(user)
  }

  const confirmDisableUser = async () => {
    if (!disableConfirmUser) return
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
      return
    }
    setDisableSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ verified: false, disabled_at: new Date().toISOString() } as any)
      .eq('id', disableConfirmUser.id)

    if (error) {
      toast.error(error.message || 'Failed to disable account.')
      setDisableSaving(false)
      return
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === disableConfirmUser.id
          ? { ...u, verified: false, status: 'Disabled' as Status }
          : u
      )
    )
    toast.success('Account disabled.')
    setDisableSaving(false)
    setDisableConfirmUser(null)
  }

  const handleArchiveUser = async (user: AdminUserRow) => {
    setActionMenuOpenId(null)
    setArchiveConfirmUser(user)
  }

  const confirmArchiveUser = async () => {
    if (!archiveConfirmUser) return
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured.')
      return
    }
    setArchiveSaving(true)

    const { error } = await supabase
      .from('profiles')
      .update({ is_archived: true, archived_at: new Date().toISOString() } as any)
      .eq('id', archiveConfirmUser.id)

    if (error) {
      toast.error(error.message || 'Failed to archive account.')
      setArchiveSaving(false)
      return
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === archiveConfirmUser.id ? { ...u, status: 'Archived' as Status } : u
      )
    )
    toast.success('Account archived.')
    setArchiveSaving(false)
    setArchiveConfirmUser(null)
  }

  const handleVerifyUser = async () => {
    if (!isSupabaseConfigured) {
      toast.error('Supabase is not configured. Cannot verify users.')
      return
    }

    if (!reviewingUser) {
      toast.error('No user selected for verification. Please close and reopen the review dialog.')
      return
    }

    const targetId = reviewProfile?.id ?? reviewingUser.id

    setVerifySaving(true)
    setReviewError(null)

    const { error } = await supabase
      .from('profiles')
      .update({ verified: true })
      .eq('id', targetId)

    if (error) {
      console.error('Error verifying user:', error)
      setReviewError('Failed to verify this user. Please try again.')
      toast.error(`Failed to verify user: ${error.message || 'Unknown error'}`)
      setVerifySaving(false)
      return
    }

    // Update local table status and verified flag
    setUsers((prev) =>
      prev.map((u) =>
        u.id === targetId ? { ...u, status: 'Active' as Status, verified: true } : u
      )
    )

    setReviewProfile((prev: any) => (prev ? { ...prev, verified: true } : prev))

    toast.success('User has been verified and can now access the app.')

    setVerifySaving(false)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Dark blue header bar */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">User Management</h1>
          <p className="mt-1 text-xs text-blue-100">
            View and manage all users in the system
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {error && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
            {error}
          </div>
        )}

        {/* Filters, actions, and search */}
        <section className="space-y-2">
          {/* Role tabs & actions */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-200 px-1 py-1 text-[11px]">
                {(['All', 'Student', 'Staff', 'Admin'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => {
                      setRoleFilter(role)
                      setPositionFilter('All')
                      setDepartmentFilter('All')
                    }}
                    className={`px-2 py-1 rounded-xl font-medium ${roleFilter === role
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    {role}
                  </button>
                ))}
              </div>

              {roleFilter === 'Staff' && (
                <>
                  <select
                    value={positionFilter}
                    onChange={(e) => setPositionFilter(e.target.value as typeof positionFilter)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[140px] sm:max-w-none"
                  >
                    <option value="All">All staff</option>
                    <option value="Faculty">No approver role</option>
                    {Object.entries(POSITION_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <select
                    value={departmentFilter}
                    onChange={(e) => setDepartmentFilter(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[200px]"
                    title="Filter by department / office"
                  >
                    <option value="All">All departments</option>
                    {staffDepartmentOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleBatchImportChange} 
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="inline-flex items-center rounded-xl bg-purple-700 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FaDownload className="mr-2 h-3 w-3" />
                {isImporting ? (
                  'Importing...'
                ) : (
                  <div className="flex items-center">
                    <span>Batch Import Users</span>
                    <span className="ml-2 inline-flex items-center rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Students only
                    </span>
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreateForm({
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    role: 'student',
                    idNumber: '',
                    nickname: '',
                    department: '',
                    program: '',
                    yearLevel: '',
                    section: '',
                    approverPosition: '',
                  })
                  setCreateError(null)
                  setCreateOpen(true)
                }}
                className="inline-flex items-center rounded-xl bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 shadow-sm"
              >
                <FaPlus className="mr-2 h-3 w-3" />
                Create User
              </button>
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={filteredUsers.length === 0}
                className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-100 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FaDownload className="mr-2 h-3 w-3" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="mt-1 bg-white rounded-2xl border border-slate-200 shadow-sm px-3 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-xs border-0 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as 'All' | Status)
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Disabled">Disabled</option>
                <option value="Archived">Archived</option>
              </select>
              <label className="inline-flex items-center gap-1.5 text-slate-600 ml-1">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Show archived</span>
              </label>
            </div>
          </div>

          {/* Bulk selection summary */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
              <span>
                {selectedIds.length} user{selectedIds.length > 1 ? 's' : ''}{' '}
                selected
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-amber-600 hover:underline"
                >
                  Disable selected
                </button>
                <button
                  type="button"
                  className="text-rose-600 hover:underline"
                >
                  Archive selected
                </button>
              </div>
            </div>
          )}
        </section>

        {/* User table */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Table header (desktop only) */}
          <div className="hidden md:grid grid-cols-12 px-3 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
            <div className="col-span-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleSelectAllVisible}
                className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>User</span>
            </div>
            <span className="col-span-1">ID</span>
            <span className="col-span-2">Role</span>
            <span className="col-span-2">Status</span>
            <span className="col-span-3">Last sign in</span>
            <span className="col-span-1 text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {loading && (
              <div className="px-3 py-6 text-center text-[11px] text-slate-500">
                Loading users...
              </div>
            )}
            {!loading && filteredUsers.length === 0 && (
              <div className="px-3 py-6 text-center text-[11px] text-slate-500">
                No users found for the selected filters.
              </div>
            )}
            {!loading &&
              paginatedUsers.map((u) => {
                const isSelected = selectedIds.includes(u.id)
                const initials = u.fullName
                  .split(' ')
                  .map((part) => part[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()

                return (
                  <div
                    key={u.id}
                    className={`grid grid-cols-1 md:grid-cols-12 px-3 py-3 gap-3 md:gap-0 items-start md:items-center hover:bg-slate-50 ${isSelected ? 'bg-slate-50' : ''
                      }`}
                    onClick={() => openReviewModal(u)}
                  >
                    {/* User info */}
                    <div className="md:col-span-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleRowSelected(u.id)
                          }}
                          className="h-3 w-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-semibold text-blue-800 overflow-hidden">
                          {u.avatarUrl ? (
                            <img
                              src={u.avatarUrl}
                              alt={u.fullName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{u.fullName}</p>
                          <p className="text-[11px] text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* ID (hidden label on desktop) */}
                    <div className="md:col-span-1 text-[11px] text-slate-600 md:text-slate-800">
                      <span className="md:hidden font-medium text-slate-500 mr-1">ID:</span>
                      {u.userId}
                    </div>

                    {/* Role */}
                    <div className="md:col-span-2 min-w-0">
                      <span
                        title={u.roleLabel}
                        className={`inline-flex max-w-full rounded-full px-2 py-0.5 text-[11px] font-semibold wrap-break-word text-left leading-snug ${rolePillClasses[u.role]}`}
                      >
                        {u.roleLabel}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClasses[u.status]}`}
                      >
                        {u.status}
                      </span>
                    </div>

                    {/* Last sign-in */}
                    <div className="md:col-span-3 text-[11px] text-slate-600">
                      <span className="md:hidden font-medium text-slate-500 mr-1">
                        Last sign in:
                      </span>
                      {u.lastLogin || '—'}
                    </div>

                    {/* Actions */}
                    <div className="md:col-span-1 relative flex items-center justify-end text-slate-400">
                      <button
                        type="button"
                        title="Actions"
                        className="rounded-md p-1.5 hover:bg-slate-100 hover:text-slate-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setActionMenuOpenId((prev) => (prev === u.id ? null : u.id))
                        }}
                      >
                        <FaEllipsisV className="h-3 w-3" />
                      </button>

                      {actionMenuOpenId === u.id && (
                        <>
                          <button
                            type="button"
                            className="fixed inset-0 z-10 cursor-default"
                            aria-label="Close menu overlay"
                            onClick={(e) => {
                              e.stopPropagation()
                              setActionMenuOpenId(null)
                            }}
                          />
                          <div className="absolute right-0 top-7 z-20 min-w-[180px] rounded-xl border border-slate-200 bg-white py-1 text-[11px] shadow-lg">
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                setActionMenuOpenId(null)
                                openReviewModal(u)
                              }}
                            >
                              View profile
                            </button>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleResetPassword(u)
                              }}
                            >
                              Reset password
                            </button>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-amber-700 hover:bg-amber-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDisableUser(u)
                              }}
                            >
                              Disable account
                            </button>
                            <button
                              type="button"
                              className="w-full px-3 py-2 text-left text-rose-700 hover:bg-rose-50"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleArchiveUser(u)
                              }}
                            >
                              Archive account
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </section>

        {/* Pagination */}
        {!loading && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between text-[11px] text-slate-600 px-2">
            <span>
              Page {currentPage} of {totalPages} · Showing{' '}
              {(currentPage - 1) * pageSize + 1}‑
              {Math.min(currentPage * pageSize, filteredUsers.length)} of{' '}
              {filteredUsers.length} users
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-2 py-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Review / verify modal */}
        {reviewOpen && reviewingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Review user
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Check the user&apos;s profile and uploaded document before verifying.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-[11px] font-semibold text-blue-800 overflow-hidden">
                    {reviewProfile?.avatar_url || reviewingUser.avatarUrl ? (
                      <img
                        src={reviewProfile?.avatar_url || reviewingUser.avatarUrl}
                        alt={reviewingUser.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      reviewingUser.fullName
                        .split(' ')
                        .map((p) => p[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {reviewingUser.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {reviewingUser.email}
                    </p>
                  </div>
                  <span
                    className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${rolePillClasses[reviewingUser.role]}`}
                  >
                    {reviewingUser.role}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
                  <div>
                    <p className="font-medium text-slate-500">ID</p>
                    <p className="mt-0.5 text-slate-800">{reviewingUser.userId}</p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Status</p>
                    <p className="mt-0.5">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClasses[reviewingUser.status]}`}
                      >
                        {reviewingUser.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-slate-500">Last sign in</p>
                    <p className="mt-0.5 text-slate-800">
                      {reviewingUser.lastLogin || '—'}
                    </p>
                  </div>
                  {reviewingUser.role === 'Student' && (
                    <div>
                      <p className="font-medium text-slate-500">Storage</p>
                      <p
                        className={`mt-0.5 text-slate-800 ${storageClass(
                          reviewingUser.storageMb
                        )}`}
                      >
                        {reviewingUser.storageMb.toFixed(1)} MB
                      </p>
                    </div>
                  )}
                  {reviewProfile && (
                    <>
                      <div>
                        <p className="font-medium text-slate-500">Department</p>
                        <p className="mt-0.5 text-slate-800">
                          {reviewProfile.department || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-slate-500">
                          {reviewingUser.role === 'Staff' ? 'Program' : 'Year level'}
                        </p>
                        <p className="mt-0.5 text-slate-800">
                          {reviewingUser.role === 'Staff'
                            ? reviewProfile.program || '—'
                            : reviewProfile.year_level || '—'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 space-y-3">
                <p className="text-[11px] font-medium text-slate-700">
                  {reviewingUser.role === 'Staff'
                    ? 'Employee ID picture'
                    : 'Certificate of Registration (COR)'}
                </p>
                {reviewLoading && (
                  <p className="text-[11px] text-slate-500">Loading profile…</p>
                )}
                {!reviewLoading && (
                  <>
                    {reviewError && (
                      <p className="text-[11px] text-rose-600">{reviewError}</p>
                    )}
                    {reviewProfile?.cor_url ? (
                      <a
                        href={reviewProfile.cor_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                      >
                        View uploaded{' '}
                        {reviewingUser.role === 'Staff' ? 'ID' : 'COR'}
                      </a>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        No document uploaded for this user.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0 pt-1">
                <button
                  type="button"
                  onClick={closeReviewModal}
                  className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
                {reviewingUser.role !== 'Admin' && (
                  <button
                    type="button"
                    onClick={handleVerifyUser}
                    disabled={verifySaving || reviewProfile?.verified}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <FaCheckCircle className="h-3 w-3 mr-1" />
                    {reviewProfile?.verified ? 'Verified' : verifySaving ? 'Verifying…' : 'Verify user'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Reset password confirm modal */}
        {resetConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Confirm password reset</h2>
              <p className="text-[11px] text-slate-600">
                Send a password reset email to{' '}
                <span className="font-medium text-slate-800">{resetConfirmUser.email}</span>?
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setResetConfirmUser(null)}
                  disabled={resetSending}
                  className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmResetPassword}
                  disabled={resetSending}
                  className="inline-flex justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resetSending ? 'Sending…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disable account confirm modal */}
        {disableConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Confirm disable account</h2>
              <p className="text-[11px] text-slate-600">
                Disable{' '}
                <span className="font-medium text-slate-800">{disableConfirmUser.fullName}</span>
                ? They will lose access until re-enabled.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setDisableConfirmUser(null)}
                  disabled={disableSaving}
                  className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDisableUser}
                  disabled={disableSaving}
                  className="inline-flex justify-center rounded-xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {disableSaving ? 'Disabling…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Archive account confirm modal */}
        {archiveConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5 space-y-4">
              <h2 className="text-sm font-semibold text-slate-900">Confirm archive account</h2>
              <p className="text-[11px] text-slate-600">
                Archive{' '}
                <span className="font-medium text-slate-800">{archiveConfirmUser.fullName}</span>
                ? This hides the user from the default list.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setArchiveConfirmUser(null)}
                  disabled={archiveSaving}
                  className="inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmArchiveUser}
                  disabled={archiveSaving}
                  className="inline-flex justify-center rounded-xl bg-rose-700 hover:bg-rose-800 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {archiveSaving ? 'Archiving…' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create user modal (UI only for now) */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="w-full max-w-3xl max-h-full flex flex-col rounded-2xl bg-white shadow-xl">
              <div className="flex-none flex items-start justify-between p-6 border-b border-slate-100">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Create user
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Manually add a student, staff, or admin account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>

              {createError && (
                <div className="flex-none px-6 pt-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    {createError}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6">
                <form
                  className="space-y-6 text-[11px]"
                  onSubmit={async (e) => {
                    e.preventDefault()
                    if (!isSupabaseConfigured) {
                      toast.error('Supabase is not configured.')
                      return
                    }

                    if (createForm.password !== createForm.confirmPassword) {
                      setCreateError('Passwords do not match.')
                      toast.error('Passwords do not match.')
                      return
                    }

                    setCreateSaving(true)
                    setCreateError(null)
                    try {
                      const payload = {
                        email: createForm.email,
                        password: createForm.password,
                        role: createForm.role,
                        idNumber: createForm.idNumber,
                        firstName: createForm.firstName,
                        middleName: createForm.middleName,
                        lastName: createForm.lastName,
                        nickname: createForm.nickname,
                        department: createForm.department,
                        program: createForm.program,
                        yearLevel: createForm.yearLevel,
                        section: createForm.section,
                        approverPosition: createForm.approverPosition || null,
                        markVerified: true,
                      }

                      const {
                        data: { session },
                        error: sessionError,
                      } = await supabase.auth.getSession()

                      if (sessionError || !session?.access_token) {
                        const msg = 'You are not logged in. Please log in again and retry.'
                        setCreateError(msg)
                        toast.error(msg)
                        return
                      }

                      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
                      const fnUrl = `${supabaseUrl}/functions/v1/admin-create-user`

                      const res = await fetch(fnUrl, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'apikey': supabaseAnonKey,
                          'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify(payload),
                      })

                      if (!res.ok) {
                        const errBody = await res.json().catch(() => ({ error: 'Failed to create user.' }))
                        const msg = errBody.error || 'Failed to create user.'
                        setCreateError(msg)
                        toast.error(msg)
                        return
                      }

                      toast.success('User created.')
                      setCreateOpen(false)
                      await loadUsers()
                    } catch (err) {
                      console.error('Create user failed', err)
                      const msg = err instanceof Error ? err.message : 'Failed to create user.'
                      setCreateError(msg)
                      toast.error(msg)
                    } finally {
                      setCreateSaving(false)
                    }
                  }}
                >
                  {/* Account Settings */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1">Account Info</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Email</label>
                        <input
                          type="email"
                          value={createForm.email}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="user@example.com"
                          required
                        />
                      </div>
                    <div className="space-y-1">
                      <label className="block font-medium text-slate-700">Temporary password</label>
                      <input
                        type="password"
                        value={createForm.password}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Minimum 8 characters"
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-medium text-slate-700">Confirm password</label>
                      <input
                        type="password"
                        value={createForm.confirmPassword}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className={`mt-1 block w-full rounded-xl border bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 ${
                          createForm.confirmPassword && createForm.password !== createForm.confirmPassword
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500'
                            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder="Re-enter password"
                        required
                        minLength={8}
                      />
                      {createForm.confirmPassword && createForm.password !== createForm.confirmPassword && (
                        <p className="text-[10px] text-rose-500 mt-1">Passwords do not match</p>
                      )}
                    </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Role</label>
                          <select
                            value={createForm.role}
                            onChange={(e) =>
                              setCreateForm((prev) => {
                                const nextRole = e.target.value as 'student' | 'staff' | 'admin'
                                const isStudent = nextRole === 'student'
                                return {
                                  ...prev,
                                  role: nextRole,
                                  // Prevent office departments from being kept when switching to student.
                                  department:
                                    isStudent &&
                                    isOfficeDepartment(prev.department)
                                      ? ''
                                      : prev.department,
                                }
                              })
                            }
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff / Faculty</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">
                          {createForm.role === 'staff' ? 'Employee ID' : 'Student ID'}
                        </label>
                        <input
                          type="text"
                          value={createForm.idNumber}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={createForm.role === 'staff' ? 'FAC-2024-00001' : '2024-00001'}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Personal Info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1">Personal Info</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">First name</label>
                        <input type="text" value={createForm.firstName} onChange={(e) => setCreateForm((prev) => ({ ...prev, firstName: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Juan" required />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Middle name</label>
                        <input type="text" value={createForm.middleName} onChange={(e) => setCreateForm((prev) => ({ ...prev, middleName: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Dela" />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Last name</label>
                        <input type="text" value={createForm.lastName} onChange={(e) => setCreateForm((prev) => ({ ...prev, lastName: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Cruz" required />
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Nickname</label>
                        <input type="text" value={createForm.nickname} onChange={(e) => setCreateForm((prev) => ({ ...prev, nickname: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Juan" />
                      </div>
                    </div>

                  </div>

                  {/* Academic Info */}
                  {createForm.role !== 'admin' && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-slate-800 border-b border-slate-100 pb-1">Academic Info</h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block font-medium text-slate-700">Department</label>
                          <select value={createForm.department} onChange={(e) => setCreateForm(prev => ({ ...prev, department: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="">Select department</option>
                            {adminDepartmentOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                          </select>
                        </div>

                        {createForm.role === 'student' && (
                          <div className="space-y-1">
                            <label className="block font-medium text-slate-700">Program</label>
                            <select value={createForm.program} onChange={(e) => setCreateForm(prev => ({ ...prev, program: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="">Select program</option>
                              {createForm.department
                                ? programs.filter((p: any) => departments.find((d: any) => d.id === p.department_id && d.name === createForm.department)).map((p: any) => (
                                  <option key={p.id} value={p.short_code || p.name}>{p.name}</option>
                                ))
                                : programs.map((p: any) => <option key={p.id} value={p.short_code || p.name}>{p.name}</option>)
                              }
                            </select>
                          </div>
                        )}
                      </div>

                      {createForm.role === 'student' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block font-medium text-slate-700">Year level</label>
                            <select value={createForm.yearLevel} onChange={(e) => setCreateForm(prev => ({ ...prev, yearLevel: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                              <option value="">Select year level</option>
                              {yearLevels.map((y: any) => <option key={y.id} value={y.label}>{y.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block font-medium text-slate-700">Section</label>
                            <input type="text" value={createForm.section} onChange={(e) => setCreateForm((prev) => ({ ...prev, section: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. A" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                  {createForm.role === 'staff' && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-2">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">
                          Approver position <span className="text-slate-400 font-normal">(optional)</span>
                        </label>
                        <p className="text-[10px] text-slate-500 mb-1">
                          Assign a position to make this staff member a handbook approver.
                        </p>
                        <select
                          value={createForm.approverPosition}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              approverPosition: e.target.value as '' | 'scholarship' | 'finance' | 'registrar' | 'guidance' | 'property_security' | 'academic_council' | 'vice_president' | 'president',
                            }))
                          }
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">None (no approver role)</option>
                          <option value="scholarship">Scholarship</option>
                          <option value="finance">Department of Finance</option>
                          <option value="registrar">Office of the Registrar</option>
                          <option value="guidance">Guidance Office</option>
                          <option value="property_security">Property/Security Office</option>
                          <option value="academic_council">Academic Council</option>
                          <option value="vice_president">Office of the Vice President</option>
                          <option value="president">Office of the President</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-500">
                    Accounts created here are added to Supabase Auth and a matching row is saved in
                    the profiles table.
                  </p>

                  <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0 pt-3">
                    <button
                      type="button"
                      onClick={() => setCreateOpen(false)}
                      className="w-full sm:w-auto inline-flex justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createSaving}
                      className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-700 hover:bg-blue-800 px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {createSaving ? 'Saving…' : 'Create user'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Users


