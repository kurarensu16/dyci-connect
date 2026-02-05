import React from 'react'
import { FaPlay } from 'react-icons/fa'

const AdminDashboard: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* Top metric cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-slate-500">Active Users</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">1,247</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-slate-500">Published Sections</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">48</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-slate-500">Pending Conformes</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">892</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-[11px] text-slate-500">Handbook Views</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">5,432</p>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: quick actions + recent activity */}
        <div className="lg:col-span-2 space-y-4">
          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              className="bg-blue-700 text-white rounded-lg px-5 py-4 text-left shadow-md hover:bg-blue-800"
            >
              <p className="text-sm font-semibold">Manage Handbook</p>
              <p className="mt-1 text-[11px] text-blue-100">
                Access CMS to update policies
              </p>
            </button>
            <button
              type="button"
              className="bg-white rounded-lg px-5 py-4 text-left border border-slate-100 shadow-sm hover:bg-slate-50"
            >
              <p className="text-sm font-semibold text-slate-900">View Reports</p>
              <p className="mt-1 text-[11px] text-slate-500">
                Export analytics and audit logs
              </p>
            </button>
          </div>

          {/* Recent activity */}
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent Activity
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {[
                {
                  title: 'Section 2.1 - Rights of Students',
                  subtitle: 'Published by Admin User',
                  time: '2 hours ago',
                  statusColor: 'bg-emerald-500',
                },
                {
                  title: '342 students acknowledged Section 2.6',
                  subtitle: 'Student Code of Discipline',
                  time: '3 hours ago',
                  statusColor: 'bg-blue-500',
                },
                {
                  title: 'Section 3.2 - Course Management',
                  subtitle: 'Draft saved by Admin User',
                  time: 'Yesterday',
                  statusColor: 'bg-amber-500',
                },
                {
                  title: 'Section 1.1 - DYCI Vision, Mission, and Core Values',
                  subtitle: 'Published by Admin User',
                  time: 'Nov 28',
                  statusColor: 'bg-emerald-500',
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="px-5 py-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-3">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${item.statusColor}`}
                    />
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: video tutorials */}
        <aside className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Video Tutorials
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Learn how to use the system
              </p>
            </div>
            <button
              type="button"
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              + Add
            </button>
          </div>

          {[
            {
              title: 'How to Navigate the CMS',
              subtitle: 'Learn the basics of content management',
              length: '5:30',
            },
            {
              title: 'Publishing Handbook Updates',
              subtitle: 'Step-by-step guide to publishing content',
              length: '7:15',
            },
          ].map((video, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-b from-blue-800 to-blue-900 rounded-lg shadow-sm overflow-hidden text-white"
            >
              <div className="h-32 flex items-center justify-center">
                <button
                  type="button"
                  className="h-12 w-12 rounded-full border border-white/60 flex items-center justify-center bg-white/10 hover:bg-white/20"
                >
                  <FaPlay className="h-4 w-4" />
                </button>
              </div>
              <div className="bg-white text-slate-900 px-4 py-3 text-xs">
                <p className="font-semibold text-slate-900">{video.title}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {video.subtitle}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{video.length}</p>
              </div>
            </div>
          ))}
        </aside>
      </section>
    </div>
  )
}

export default AdminDashboard

