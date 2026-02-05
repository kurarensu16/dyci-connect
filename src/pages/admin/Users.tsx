import React from 'react'
import {
  FaPlus,
  FaDownload,
  FaRedo,
  FaBan,
  FaTrashAlt,
} from 'react-icons/fa'

type Role = 'Student' | 'Faculty' | 'Admin'
type Status = 'Active' | 'Inactive'

interface AdminUserRow {
  id: string
  fullName: string
  email: string
  userId: string
  role: Role
  status: Status
  lastLogin: string
  storageMb: number
}

const mockUsers: AdminUserRow[] = [
  {
    id: '1',
    fullName: 'Juan Dela Cruz',
    email: 'juan.delacruz@dyci.edu.ph',
    userId: '2024-00001',
    role: 'Student',
    status: 'Active',
    lastLogin: '12/7/2025 8:30 AM',
    storageMb: 45.2,
  },
  {
    id: '2',
    fullName: 'Maria Santos',
    email: 'maria.santos@dyci.edu.ph',
    userId: '2024-00002',
    role: 'Student',
    status: 'Active',
    lastLogin: '12/7/2025 9:15 AM',
    storageMb: 32.8,
  },
  {
    id: '3',
    fullName: 'Prof. Robert Garcia',
    email: 'robert.garcia@dyci.edu.ph',
    userId: 'FAC-2023-001',
    role: 'Faculty',
    status: 'Active',
    lastLogin: '12/7/2025 7:45 AM',
    storageMb: 128.5,
  },
  {
    id: '4',
    fullName: 'Admin User',
    email: 'admin@dyci.edu.ph',
    userId: 'ADM-2023-001',
    role: 'Admin',
    status: 'Active',
    lastLogin: '12/7/2025 10:00 AM',
    storageMb: 85.3,
  },
  {
    id: '5',
    fullName: 'Pedro Reyes',
    email: 'pedro.reyes@dyci.edu.ph',
    userId: '2024-00003',
    role: 'Student',
    status: 'Inactive',
    lastLogin: '11/20/2025 2:20 PM',
    storageMb: 12.4,
  },
  {
    id: '6',
    fullName: 'Ana Mendoza',
    email: 'ana.mendoza@dyci.edu.ph',
    userId: '2024-00004',
    role: 'Student',
    status: 'Active',
    lastLogin: '12/6/2025 4:30 PM',
    storageMb: 67.9,
  },
]

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
        {/* Header actions and search */}
        <section className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="hidden sm:block" />
            <div className="flex gap-2">
              <button
                type="button"
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
          <div className="mt-1 bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
            <input
              type="text"
              placeholder="Search by name, email, or ID..."
              className="w-full border-0 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
            />
          </div>
        </section>

        {/* User table */}
        <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 px-4 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
          <span className="col-span-3">User</span>
          <span className="col-span-1">ID</span>
          <span className="col-span-2">Role</span>
          <span className="col-span-2">Status</span>
          <span className="col-span-2">Last Login</span>
          <span className="col-span-1 text-right">Storage</span>
          <span className="col-span-1 text-right">Actions</span>
        </div>

          <div className="divide-y divide-slate-100 text-xs">
            {mockUsers.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-50"
              >
                <div className="col-span-3">
                  <p className="font-medium text-slate-900">{u.fullName}</p>
                  <p className="text-[11px] text-slate-500">{u.email}</p>
                </div>
                <div className="col-span-1 text-slate-800">{u.userId}</div>
                <div className="col-span-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${rolePillClasses[u.role]}`}
                  >
                    {u.role}
                  </span>
                </div>
                <div className="col-span-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClasses[u.status]}`}
                  >
                    {u.status}
                  </span>
                </div>
                <div className="col-span-2 text-[11px] text-slate-600">
                  {u.lastLogin}
                </div>
                <div className="col-span-1 text-right text-[11px] text-slate-600">
                  {u.storageMb.toFixed(1)} MB
                </div>
                <div className="col-span-1 flex items-center justify-end space-x-2 text-slate-400">
                  <button type="button" className="hover:text-slate-600">
                    <FaRedo className="h-3 w-3" />
                  </button>
                  <button type="button" className="hover:text-amber-600">
                    <FaBan className="h-3 w-3" />
                  </button>
                  <button type="button" className="hover:text-rose-600">
                    <FaTrashAlt className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

export default Users


