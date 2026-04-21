import React, { useEffect, useState } from 'react'
import { FaPlay } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [activeUsers, setActiveUsers] = useState<number | null>(null)
  const [chapterCount, setChapterCount] = useState<number | null>(null)
  const [sectionCount, setSectionCount] = useState<number | null>(null)

  const [engagement, setEngagement] = useState<{ count: number; seconds: number } | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const load = async () => {
      // Active users (verified profiles)
      const { count: userCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('verified', true)
      if (typeof userCount === 'number') setActiveUsers(userCount)

      // Handbook Chapters (depth = 0)
      const { count: cCount } = await supabase
        .from('handbook_nodes')
        .select('id', { count: 'exact', head: true })
        .eq('depth', 0)
      if (typeof cCount === 'number') setChapterCount(cCount)

      // Handbook Sections (depth > 0)
      const { count: sCount } = await supabase
        .from('handbook_nodes')
        .select('id', { count: 'exact', head: true })
        .gt('depth', 0)
      if (typeof sCount === 'number') setSectionCount(sCount)



      // Handbook engagement (total views + total time)
      const { data: viewData, error: viewError } = await supabase
        .from('handbook_views')
        .select('duration_seconds')
      if (viewError) {
        console.error('handbook_views query error:', viewError.message)
        setEngagement({ count: 0, seconds: 0 })
      } else if (viewData) {
        const totalSeconds = viewData.reduce((sum, v) => sum + (v.duration_seconds || 0), 0)
        setEngagement({ count: viewData.length, seconds: totalSeconds })
      }
    }

    load()
  }, [])

  const fmt = (n: number | null | undefined) => (n !== null && n !== undefined ? n.toLocaleString() : '—')
  const fmtDuration = (s: number | undefined) => {
    if (s === undefined) return '—'
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m`
    const h = (s / 3600).toFixed(1)
    return `${h}h`
  }

  return (
    <>
      {/* Dark blue header bar */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <p className="mt-1 text-xs text-blue-100">
            Overview of DYCI Connect activity and quick actions.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500">Active Users</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{fmt(activeUsers)}</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Handbook Chapters</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{fmt(chapterCount)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Top-level categories</p>
          </div>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Handbook Sections</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{fmt(sectionCount)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Polices &amp; Detailed content</p>
          </div>

          <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Handbook Engagement</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{fmtDuration(engagement?.seconds)}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{fmt(engagement?.count)} total section opens</p>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left: quick actions + recent activity */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => navigate('/admin/cms')}
                className="bg-blue-700 text-white rounded-lg px-5 py-4 text-left shadow-md hover:bg-blue-800"
              >
                <p className="text-sm font-semibold">Manage Handbook</p>
                <p className="mt-1 text-[11px] text-blue-100">
                  Access CMS to update policies
                </p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/admin/reports')}
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
      </main>
    </>
  )
}

export default AdminDashboard
