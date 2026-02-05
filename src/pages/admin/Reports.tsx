import React from 'react'
import { FaDownload } from 'react-icons/fa'

const Reports: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold">Activity Analytics</p>
            <p className="mt-1 text-[11px] text-blue-100">
              Dashboard with system usage metrics and insights
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
            >
              <FaDownload className="mr-2 h-3 w-3" />
              Export CSV
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 shadow-sm"
            >
              <FaDownload className="mr-2 h-3 w-3" />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Top metric cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">Active Users</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">1,247</p>
            <p className="mt-1 text-[11px] text-emerald-600">
              ▲ +5.2% from last month
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">Handbook Views</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">5,432</p>
            <p className="mt-1 text-[11px] text-emerald-600">
              ▲ +12.8% from last week
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">To-Do List Users</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">823</p>
            <p className="mt-1 text-[11px] text-emerald-600">
              ▲ 65% usage rate
            </p>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">Total Sessions</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">3,456</p>
            <p className="mt-1 text-[11px] text-emerald-600">
              ▲ +8.9% from last month
            </p>
          </div>
        </section>

        {/* Charts row (placeholder blocks) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3 h-64 flex items-center justify-center text-[11px] text-slate-400 border-dashed">
            User Activity Trend – chart placeholder
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3 h-64 flex items-center justify-center text-[11px] text-slate-400 border-dashed">
            To-Do List Usage – chart placeholder
          </div>
        </section>

        {/* Top accessed sections */}
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Top Accessed Handbook Sections
          </h2>
          <div className="h-40 flex items-center justify-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-md">
            Horizontal bar chart placeholder
          </div>
        </section>

        {/* Detailed metrics table */}
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3 text-[11px] text-slate-700">
          <h2 className="text-sm font-semibold text-slate-900 mb-2">
            Detailed Section Metrics
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-t border-slate-100">
              <thead>
                <tr className="text-left text-[10px] text-slate-500">
                  <th className="py-2 pr-4">Section</th>
                  <th className="py-2 pr-4">Total Views</th>
                  <th className="py-2 pr-4">Unique Users</th>
                  <th className="py-2 pr-4">Avg. Time on Section</th>
                  <th className="py-2 pr-4">Conforme Rate</th>
                  <th className="py-2 pr-4">% of Total Users</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  '1.1 Vision & Mission',
                  '2.1 Rights of Students',
                  '2.6 Code of Discipline',
                  '3.2 Course Management',
                  '3.3 Grading System',
                  '4.2 General Decorum',
                  '4.1 Admission',
                ].map((label, idx) => (
                  <tr key={label}>
                    <td className="py-2 pr-4">{label}</td>
                    <td className="py-2 pr-4">{1200 - idx * 80}</td>
                    <td className="py-2 pr-4">{900 - idx * 60}</td>
                    <td className="py-2 pr-4">4m {20 - idx}s</td>
                    <td className="py-2 pr-4">90%</td>
                    <td className="py-2 pr-4">60%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Reports


