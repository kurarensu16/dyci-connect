import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaPlus,
  FaDownload,
  FaCheckCircle,
  FaTimes,
  FaEllipsisV,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

type Role = 'Student' | 'Faculty' | 'Admin'
type Status = 'Active' | 'Pending' | 'Disabled' | 'Archived'

interface AdminUserRow {
  id: string
  fullName: string
  email: string
  userId: string
  avatarUrl?: string
  verified: boolean
  role: Role
  status: Status
  lastLogin: string
  storageMb: number
}

const rolePillClasses: Record<Role, string> = {
  Student: 'bg-blue-50 text-blue-700',
  Faculty: 'bg-purple-50 text-purple-700',
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
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All')
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
    role: 'student' as 'student' | 'faculty' | 'admin',
    idNumber: '',
    nickname: '',
    address: '',
    region: '',
    province: '',
    city: '',
    barangay: '',
    department: '',
    program: '',
    yearLevel: '',
    section: '',
    markVerified: false,
  })

  // Live PSGC data
  const [regions, setRegions] = useState<any[]>([])
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [barangays, setBarangays] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [yearLevels, setYearLevels] = useState<any[]>([])

  useEffect(() => {
    const loadRegions = async () => {
      try {
        const res = await fetch('https://psgc.cloud/api/regions')
        if (!res.ok) throw new Error(`Failed to load regions: ${res.status}`)
        const data = await res.json()
        setRegions(data)
      } catch (error) {
        console.error('Error loading PSGC regions', error)
      }
    }

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

    loadRegions()
    loadAcademicLookups()
  }, [])

  const handleRegionChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setCreateForm((prev) => ({ ...prev, region: value, province: '', city: '', barangay: '' }))
    setProvinces([])
    setCities([])
    setBarangays([])
    if (!value) return
    try {
      const res = await fetch(`https://psgc.cloud/api/regions/${value}/provinces`)
      if (!res.ok) throw new Error(`Failed to load provinces: ${res.status}`)
      const data = await res.json()
      setProvinces(data)
      if (Array.isArray(data) && data.length === 0) {
        const cityRes = await fetch(`https://psgc.cloud/api/regions/${value}/cities-municipalities`)
        if (!cityRes.ok) throw new Error(`Failed to load cities: ${cityRes.status}`)
        const cityData = await cityRes.json()
        setCities(cityData)
      }
    } catch (error) {
      console.error('Error loading PSGC provinces / cities', error)
    }
  }

  const handleProvinceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setCreateForm((prev) => ({ ...prev, province: value, city: '', barangay: '' }))
    setCities([])
    setBarangays([])
    if (!value) return
    try {
      const res = await fetch(`https://psgc.cloud/api/provinces/${value}/cities-municipalities`)
      if (!res.ok) throw new Error(`Failed to load cities: ${res.status}`)
      const data = await res.json()
      setCities(data)
    } catch (error) {
      console.error('Error loading PSGC cities', error)
    }
  }

  const handleCityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setCreateForm((prev) => ({ ...prev, city: value, barangay: '' }))
    setBarangays([])
    if (!value) return
    try {
      const res = await fetch(`https://psgc.cloud/api/cities-municipalities/${value}/barangays`)
      if (!res.ok) throw new Error(`Failed to load barangays: ${res.status}`)
      const data = await res.json()
      setBarangays(data)
    } catch (error) {
      console.error('Error loading PSGC barangays', error)
    }
  }

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
        const dbRole = (row.role ?? '').toString().toLowerCase()
        let role: Role
        if (dbRole === 'admin') role = 'Admin'
        else if (dbRole === 'faculty') role = 'Faculty'
        else role = 'Student'

        const verified = row.verified === true
        const isArchived = row.is_archived === true || !!row.archived_at
        const isDisabled = row.disabled === true || !!row.disabled_at

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

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return users.filter((u) => {
      if (roleFilter !== 'All' && u.role !== roleFilter) return false
      if (statusFilter !== 'All' && u.status !== statusFilter) return false
      if (!showArchived && u.status === 'Archived') return false
      if (!q) return true
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q)
      )
    })
  }, [users, roleFilter, statusFilter, searchQuery, showArchived])

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, statusFilter, searchQuery, showArchived])

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
            <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-200 px-1 py-1 text-[11px]">
              {(['All', 'Student', 'Faculty', 'Admin'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`px-2 py-1 rounded-xl font-medium ${roleFilter === role
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  {role}
                </button>
              ))}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setCreateForm({
                    firstName: '',
                    middleName: '',
                    lastName: '',
                    email: '',
                    password: '',
                    role: 'student',
                    idNumber: '',
                    nickname: '',
                    address: '',
                    region: '',
                    province: '',
                    city: '',
                    barangay: '',
                    department: '',
                    program: '',
                    yearLevel: '',
                    section: '',
                    markVerified: false,
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
                    <div className="md:col-span-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${rolePillClasses[u.role]}`}
                      >
                        {u.role}
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
                          {reviewingUser.role === 'Faculty' ? 'Program' : 'Year level'}
                        </p>
                        <p className="mt-0.5 text-slate-800">
                          {reviewingUser.role === 'Faculty'
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
                  {reviewingUser.role === 'Faculty'
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
                        {reviewingUser.role === 'Faculty' ? 'ID' : 'COR'}
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
                    Manually add a student, faculty, or admin account.
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
                        address: createForm.address,
                        region: createForm.region,
                        province: createForm.province,
                        city: createForm.city,
                        barangay: createForm.barangay,
                        department: createForm.department,
                        program: createForm.program,
                        yearLevel: createForm.yearLevel,
                        section: createForm.section,
                        markVerified: createForm.markVerified,
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

                      const { error } = await supabase.functions.invoke('admin-create-user', {
                        body: payload,
                        headers: {
                          Authorization: `Bearer ${session.access_token}`,
                        },
                      })

                      if (error) {
                        const msg = error.message || 'Failed to create user.'
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
                        <label className="block font-medium text-slate-700">Role</label>
                        <select
                          value={createForm.role}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value as 'student' | 'faculty' | 'admin' }))}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="student">Student</option>
                          <option value="faculty">Faculty</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">
                          {createForm.role === 'faculty' ? 'Employee ID' : 'Student ID'}
                        </label>
                        <input
                          type="text"
                          value={createForm.idNumber}
                          onChange={(e) => setCreateForm((prev) => ({ ...prev, idNumber: e.target.value }))}
                          className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder={createForm.role === 'faculty' ? 'FAC-2024-00001' : '2024-00001'}
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Region</label>
                        <select value={createForm.region} onChange={handleRegionChange} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">Select region</option>
                          {regions.map((r: any) => <option key={r.code} value={r.code}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Province</label>
                        <select value={createForm.province} onChange={handleProvinceChange} disabled={!createForm.region || provinces.length === 0} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">{!createForm.region ? 'Select region first' : provinces.length === 0 ? 'No provinces for this region' : 'Select province'}</option>
                          {provinces.map((p: any) => <option key={p.code} value={p.code}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">City / Municipality</label>
                        <select value={createForm.city} onChange={handleCityChange} disabled={!createForm.region || (provinces.length > 0 && !createForm.province)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">{!createForm.region ? 'Select region first' : provinces.length > 0 && !createForm.province ? 'Select province first' : 'Select city'}</option>
                          {cities.map((c: any) => <option key={c.code} value={c.code}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block font-medium text-slate-700">Barangay</label>
                        <select value={createForm.barangay} onChange={(e) => setCreateForm(prev => ({ ...prev, barangay: e.target.value }))} disabled={!createForm.city} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 disabled:bg-slate-100 disabled:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                          <option value="">{!createForm.city ? 'Select city first' : 'Select barangay'}</option>
                          {barangays.map((b: any) => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-medium text-slate-700">Street / House number</label>
                      <input type="text" value={createForm.address} onChange={(e) => setCreateForm((prev) => ({ ...prev, address: e.target.value }))} className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. 123 Sampaguita St." />
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
                            {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
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

                  <div className="pt-2 border-t border-slate-100 flex items-center">
                    <label className="inline-flex items-center gap-2 text-slate-600">
                      <input
                        type="checkbox"
                        checked={createForm.markVerified}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            markVerified: e.target.checked,
                          }))
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span>Mark as verified immediately</span>
                    </label>
                  </div>

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


