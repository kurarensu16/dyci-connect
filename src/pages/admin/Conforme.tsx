import React from 'react'
import { FaDownload, FaSearch } from 'react-icons/fa'

type ConformeStatus = 'Pending' | 'Acknowledged'

interface ConformeRow {
  id: string
  studentName: string
  studentEmail: string
  studentId: string
  section: string
  status: ConformeStatus
  dateRequired: string
  dateAcknowledged?: string
  corFile?: string
}

const mockRows: ConformeRow[] = [
  {
    id: '1',
    studentName: 'Juan Dela Cruz',
    studentEmail: 'juan.delacruz@dyci.edu.ph',
    studentId: '2024-00001',
    section: 'Section 2.1 – Student Code of Discipline',
    status: 'Pending',
    dateRequired: '12/1/2025',
  },
  {
    id: '2',
    studentName: 'Maria Santos',
    studentEmail: 'maria.santos@dyci.edu.ph',
    studentId: '2024-00002',
    section: 'Section 2.6 – Student Code of Discipline',
    status: 'Acknowledged',
    dateRequired: '12/1/2025',
    dateAcknowledged: '12/2/2025 10:30 AM',
    corFile: 'COR_2024-00002_S1_2024-2025.pdf',
  },
  {
    id: '3',
    studentName: 'Pedro Reyes',
    studentEmail: 'pedro.reyes@dyci.edu.ph',
    studentId: '2024-00003',
    section: 'Section 2.6 – Student Code of Discipline',
    status: 'Pending',
    dateRequired: '12/1/2025',
  },
  {
    id: '4',
    studentName: 'Ana Mendoza',
    studentEmail: 'ana.mendoza@dyci.edu.ph',
    studentId: '2024-00004',
    section: 'Section 2.6 – Student Code of Discipline',
    status: 'Acknowledged',
    dateRequired: '12/1/2025',
    dateAcknowledged: '12/1/2025 2:15 PM',
    corFile: 'COR_2024-00004_S1_2024-2025.pdf',
  },
]

const statusPillClasses: Record<ConformeStatus, string> = {
  Pending: 'bg-amber-50 text-amber-700',
  Acknowledged: 'bg-emerald-50 text-emerald-700',
}

const Conforme: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">Conforme Monitoring</h1>
          <p className="mt-1 text-xs text-blue-100">
            Track student acknowledgements of policy updates
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Top metrics */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">Pending Acknowledgments</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">3</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">Acknowledged</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">3</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">Completion Rate</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">50%</p>
          </div>
        </section>

        {/* Filters & search */}
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-900">
                Conforme Monitoring
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Track student acknowledgements of policy updates
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
            >
              <FaDownload className="mr-2 h-3 w-3" />
              Export Report
            </button>
          </div>

          <div className="mt-1 flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, ID, or section..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <input
              type="text"
              placeholder="Filters..."
              className="w-full md:w-48 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </section>

        {/* Table */}
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-500">
            <span className="col-span-3">Student</span>
            <span className="col-span-3">Section</span>
            <span className="col-span-1">Status</span>
            <span className="col-span-2">Date Required</span>
            <span className="col-span-2">Date Acknowledged</span>
            <span className="col-span-1 text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {mockRows.map((row) => (
              <div
                key={row.id}
                className="grid grid-cols-12 px-4 py-3 items-center hover:bg-slate-50"
              >
                <div className="col-span-3">
                  <p className="font-medium text-slate-900">{row.studentName}</p>
                  <p className="text-[11px] text-slate-500">{row.studentEmail}</p>
                  <p className="text-[11px] text-slate-400">{row.studentId}</p>
                </div>
                <div className="col-span-3">
                  <p className="font-medium text-slate-900">
                    Section
                  </p>
                  <p className="text-[11px] text-slate-500">{row.section}</p>
                </div>
                <div className="col-span-1">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusPillClasses[row.status]}`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="col-span-2 text-[11px] text-slate-600">
                  {row.dateRequired}
                </div>
                <div className="col-span-2 text-[11px] text-slate-600">
                  {row.dateAcknowledged || '—'}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    className="rounded-xl bg-blue-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-800"
                  >
                    Manual Approve
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

export default Conforme

