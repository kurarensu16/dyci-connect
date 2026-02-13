import React, { useEffect, useMemo, useState } from 'react'
import {
  FaPlus,
  FaDownload,
  FaRedo,
  FaBan,
  FaTrashAlt,
  FaCheckCircle,
  FaTimes,
  FaCheck,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

type Role = 'Student' | 'Faculty' | 'Admin'
type Status = 'Active' | 'Inactive'

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
  Inactive: 'bg-slate-50 text-slate-500',
}

const Users: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [roleFilter, setRoleFilter] = useState<'All' | Role>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10
  const [reviewingUser, setReviewingUser] = useState<AdminUserRow | null>(null)
  const [reviewProfile, setReviewProfile] = useState<any | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [verifySaving, setVerifySaving] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    role: 'student' as 'student' | 'faculty' | 'admin',
    idNumber: '',
    markVerified: false,
  })

  useEffect(() => {
    const loadUsers = async () => {
      if (!isSupabaseConfigured) {
        // Supabase not configured: show empty state
        setUsers([])
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from('admin_users_view')
        .select('*')

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

          const status: Status =
            role === 'Admin'
              ? 'Active'
              : verified
                ? 'Active'
                : 'Inactive'

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
    }

    loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return users.filter((u) => {
      if (roleFilter !== 'All' && u.role !== roleFilter) return false
      if (statusFilter !== 'All' && u.status !== statusFilter) return false
      if (!q) return true
      return (
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q)
      )
    })
  }, [users, roleFilter, statusFilter, searchQuery])

  // Reset to first page when filters/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [roleFilter, statusFilter, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize))

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredUsers.slice(start, start + pageSize)
  }, [filteredUsers, currentPage])

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
                  className={`px-2 py-1 rounded-xl font-medium ${
                    roleFilter === role
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
                    fullName: '',
                    email: '',
                    role: 'student',
                    idNumber: '',
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
                className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
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
                <option value="Inactive">Inactive</option>
              </select>
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
                  Delete selected
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
                    className={`grid grid-cols-1 md:grid-cols-12 px-3 py-3 gap-3 md:gap-0 items-start md:items-center hover:bg-slate-50 ${
                      isSelected ? 'bg-slate-50' : ''
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
                    <div className="md:col-span-1 flex items-center justify-end space-x-2 text-slate-400">
                      {u.role !== 'Admin' && u.verified && (
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold">
                          <FaCheck className="h-3 w-3" />
                        </span>
                      )}
                      <button
                        type="button"
                        title="Reset password"
                        className="hover:text-slate-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FaRedo className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Disable account"
                        className="hover:text-amber-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FaBan className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        title="Delete user"
                        className="hover:text-rose-600"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FaTrashAlt className="h-3 w-3" />
                      </button>
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

        {/* Create user modal (UI only for now) */}
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4">
              <div className="flex items-start justify-between">
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
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                  {createError}
                </div>
              )}

              <form
                className="space-y-3 text-[11px]"
                onSubmit={(e) => {
                  e.preventDefault()
                  // For now, just show a message – creating auth users must be done via Supabase dashboard or a secure backend.
                  setCreateSaving(true)
                  setTimeout(() => {
                    setCreateSaving(false)
                    setCreateOpen(false)
                    toast.error(
                      'Creating users from this screen is not yet wired to Supabase. Please use the Supabase dashboard for now.'
                    )
                  }, 400)
                }}
              >
                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Full name</label>
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="e.g. Juan Dela Cruz"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="user@example.com"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-medium text-slate-700">Role</label>
                    <select
                      value={createForm.role}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          role: e.target.value as 'student' | 'faculty' | 'admin',
                        }))
                      }
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="student">Student</option>
                      <option value="faculty">Faculty</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block font-medium text-slate-700">
                      {createForm.role === 'faculty' ? 'Employee ID' : 'Student ID'}
                    </label>
                    <input
                      type="text"
                      value={createForm.idNumber}
                      onChange={(e) =>
                        setCreateForm((prev) => ({ ...prev, idNumber: e.target.value }))
                      }
                      className="mt-1 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={createForm.role === 'faculty' ? 'FAC-2024-00001' : '2024-00001'}
                    />
                  </div>
                </div>

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

                <p className="text-[10px] text-slate-500">
                  Note: This UI is for planning. To actually create authentication accounts,
                  you&apos;ll need a secure backend or use the Supabase dashboard.
                </p>

                <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-2 sm:space-y-0 pt-1">
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
        )}
      </main>
    </div>
  )
}

export default Users


