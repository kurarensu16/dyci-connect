import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { fetchPublishedHandbook } from '../../lib/api/handbookWorkflow'
import { VideoCarousel } from '../../components/video/VideoCarousel'
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const [chapterCount, setChapterCount] = useState<number | null>(null)
  const [sectionCount, setSectionCount] = useState<number | null>(null)
  const [engagement, setEngagement] = useState<{ count: number; seconds: number } | null>(null)
  const [activities, setActivities] = useState<any[]>([])

  const COLLEGE_COLORS: Record<string, string> = {
    'College of Accountancy': '#3266AD',
    'College of Arts and Sciences': '#8C52C4',
    'College of Business Administration': '#1D9E75',
    'College of Computer Studies': '#378ADD',
    'College of Education': '#E06B2D',
    'College of Health Sciences': '#D4537E',
    'College of Hospitality Management & Tourism': '#E8B400',
    'College of Maritime Education': '#0F6E56',
    'School of Mechanical Engineering': '#888780',
    'School of Psychology': '#D85A30',
  }
  const FALLBACK_COLOR = '#94a3b8'

  const getDeptColor = (dept: string) => {
    if (COLLEGE_COLORS[dept]) return COLLEGE_COLORS[dept]
    const match = Object.keys(COLLEGE_COLORS).find(k => dept.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(dept.toLowerCase()))
    if (match) return COLLEGE_COLORS[match]

    // Cycle through palette for unknown depts
    const extraColors = [
      '#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'
    ]
    const index = Math.abs(dept.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % extraColors.length
    return extraColors[index]
  }

  const getDeptNameFromJoin = (data: any) => {
    if (!data) return null;
    const d = data.departments;
    if (!d) return null;
    if (Array.isArray(d)) return d[0]?.name;
    return d.name;
  };

  // Simple "time ago" formatter
  const getTimeAgo = (dateStr: string) => {
    const now = new Date()
    const past = new Date(dateStr)
    const diffMs = now.getTime() - past.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHrs = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHrs / 24)

    if (diffSec < 60) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffHrs < 24) return `${diffHrs}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return past.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  useEffect(() => {
    if (!isSupabaseConfigured) return

    const load = async () => {
      // Active users (verified profiles) call - not used in UI currently but keeping logic reference
      await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('verified', true)

      // Get published handbook only
      const { data: publishedHandbook } = await fetchPublishedHandbook()

      // 1. Metric Counts
      if (publishedHandbook) {
        const { count: cCount } = await supabase
          .from('handbook_sections')
          .select('id', { count: 'exact', head: true })
          .eq('handbook_id', publishedHandbook.id)
          .is('parent_id', null)
        if (typeof cCount === 'number') setChapterCount(cCount)

        const { count: sCount } = await supabase
          .from('handbook_sections')
          .select('id', { count: 'exact', head: true })
          .eq('handbook_id', publishedHandbook.id)
          .not('parent_id', 'is', null)
        if (typeof sCount === 'number') setSectionCount(sCount)

        const { data: sections } = await supabase
          .from('handbook_sections')
          .select('id')
          .eq('handbook_id', publishedHandbook.id)

        if (sections && sections.length > 0) {
          const sectionIds = sections.map(s => s.id)
          const { data: viewData } = await supabase
            .from('handbook_views')
            .select('duration_seconds')
            .in('section_id', sectionIds)
          if (viewData) {
            const totalSeconds = viewData.reduce((sum, v) => sum + (v.duration_seconds || 0), 0)
            setEngagement({ count: viewData.length, seconds: totalSeconds })
          }
        }
      } else {
        setChapterCount(0); setSectionCount(0); setEngagement({ count: 0, seconds: 0 })
      }

      // 2. UNIFIED ACTIVITY FETCH (Increased limit for scrolling)
      const LIMIT = 20
      const [viewsRes, l2Res, l3Res, sectionsRes] = await Promise.all([
        // Engagement
        supabase.from('handbook_views').select(`
          viewed_at,
          profiles(
            first_name, last_name, 
            student:student_profiles(departments(name)), 
            staff:staff_profiles(departments(name))
          ),
          handbook_sections(title)
        `).order('viewed_at', { ascending: false }).limit(LIMIT),

        // L2 Departmental Approvals
        supabase.from('handbook_approvals').select(`
          decided_at, position, decision,
          profiles:approver_user_id(
            first_name, last_name, 
            student:student_profiles(departments(name)), 
            staff:staff_profiles(departments(name))
          ),
          handbook_sections(title)
        `).order('decided_at', { ascending: false }).limit(LIMIT),

        // L3 Executive Approvals
        supabase.from('handbook_l3_approvals').select(`
          created_at, approver_position, decision,
          profiles:approver_user_id(
            first_name, last_name, 
            student:student_profiles(departments(name)), 
            staff:staff_profiles(departments(name))
          ),
          handbooks(title)
        `).order('created_at', { ascending: false }).limit(LIMIT),

        // Handbook-level Publications (Simplified to avoid section noise)
        supabase.from('handbooks').select(`
          updated_at, published_at, title, status
        `).eq('status', 'published').order('published_at', { ascending: false }).limit(LIMIT)
      ])

      const allItems: any[] = []
      const now = new Date()

      // Map Views
      if (viewsRes.data) {
        viewsRes.data.forEach(v => {
          const p = v.profiles as any
          const sp = Array.isArray(p?.student) ? p.student[0] : p?.student
          const sfp = Array.isArray(p?.staff) ? p.staff[0] : p?.staff
          const dept = getDeptNameFromJoin(sp) || getDeptNameFromJoin(sfp) || ''
          const actor = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : 'Student'
          const actionDate = new Date(v.viewed_at)

          allItems.push({
            date: actionDate,
            isNew: now.getTime() - actionDate.getTime() < 24 * 60 * 60 * 1000,
            title: (v.handbook_sections as any)?.title || 'Handbook Section',
            subtitle: `${actor}${dept ? ` (${dept})` : ''} read this section`,
            time: getTimeAgo(v.viewed_at),
            statusColor: 'bg-blue-500',
            deptColor: getDeptColor(dept)
          })
        })
      }

      // Map L2 Approvals
      if (l2Res.data) {
        l2Res.data.forEach(a => {
          const p = a.profiles as any
          const sp = Array.isArray(p?.student) ? p.student[0] : p?.student
          const sfp = Array.isArray(p?.staff) ? p.staff[0] : p?.staff
          const dept = getDeptNameFromJoin(sp) || getDeptNameFromJoin(sfp) || ''
          const actor = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : a.position
          const actionDate = new Date(a.decided_at)

          allItems.push({
            date: actionDate,
            isNew: now.getTime() - actionDate.getTime() < 24 * 60 * 60 * 1000,
            title: (a.handbook_sections as any)?.title || 'Handbook Section',
            subtitle: `${a.decision === 'approved' ? 'Approved' : 'Rejected'} by ${actor}${dept ? ` (${dept})` : ''}`,
            time: getTimeAgo(a.decided_at),
            statusColor: a.decision === 'approved' ? 'bg-indigo-500' : 'bg-rose-500',
            deptColor: getDeptColor(dept)
          })
        })
      }

      // Map L3 Approvals
      if (l3Res.data) {
        l3Res.data.forEach(a => {
          const p = a.profiles as any
          const actor = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() : a.approver_position
          const actionDate = new Date(a.created_at)

          allItems.push({
            date: actionDate,
            isNew: now.getTime() - actionDate.getTime() < 24 * 60 * 60 * 1000,
            title: (a.handbooks as any)?.title || 'Academics Handbook',
            subtitle: `Executive ${a.decision === 'approved' ? 'Approval' : 'Rejection'} by ${actor} (${a.approver_position})`,
            time: getTimeAgo(a.created_at),
            statusColor: 'bg-purple-600',
            deptColor: '#7c3aed' // Purple for executive
          })
        })
      }

      // Map Handbook Publications
      if (sectionsRes.data) {
        sectionsRes.data.forEach(h => {
          const actionDate = new Date(h.published_at || h.updated_at)

          allItems.push({
            date: actionDate,
            isNew: now.getTime() - actionDate.getTime() < 24 * 60 * 60 * 1000,
            title: h.title,
            subtitle: `Handbook is now Live / Published`,
            time: getTimeAgo(h.published_at || h.updated_at),
            statusColor: 'bg-emerald-500',
            deptColor: FALLBACK_COLOR
          })
        })
      }

      // Sort and take top 20
      allItems.sort((a, b) => b.date.getTime() - a.date.getTime())
      setActivities(allItems.slice(0, LIMIT))
    }

    load()
  }, [])

  const fmt = (n: number | null | undefined) => (n !== null && n !== undefined ? n.toLocaleString() : '—')

  return (
    <>
      <header className="unified-header">
        <div className="unified-header-content">
          <h1 className="unified-header-title">Admin Dashboard</h1>
          <p className="unified-header-subtitle">
            Institutional Academics Overview & Real-time Governance Pulse
          </p>
        </div>
      </header>

      <main className="unified-main animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Top metric cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-blue-600 p-6 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Handbook Chapters</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{fmt(chapterCount)}</p>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest opacity-60">Top-level categories</p>
          </div>
          <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-indigo-600 p-6 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Handbook Sections</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{fmt(sectionCount)}</p>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest opacity-60">Policies & Detailed content</p>
          </div>
          <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-emerald-500 p-6 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Handbook Views</p>
            <p className="mt-2 text-2xl font-bold text-slate-800">{fmt(engagement?.count)}</p>
            <p className="text-[10px] text-slate-400 mt-2 font-bold uppercase tracking-widest opacity-60">Total section opens</p>
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
            <div className="legacy-card flex flex-col overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                <h2 className="text-sm font-semibold text-slate-900">
                  Recent Activity
                </h2>
                <div className="flex gap-2">
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                    Auto-Refreshing
                  </span>
                  <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                    Last 24h Highlighted
                  </span>
                </div>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                {activities.length > 0 ? activities.map((item, idx) => (
                  <div
                    key={idx}
                    className={`px-5 py-3 flex items-center justify-between text-xs transition-all duration-300 ${item.isNew ? 'border-l-4 border-l-blue-500' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <span className={`h-2.5 w-2.5 rounded-full block ${item.statusColor}`} />
                        {item.deptColor && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-white"
                            style={{ backgroundColor: item.deptColor }}
                          />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 leading-none">
                            {item.title}
                          </p>
                          {item.isNew && (
                            <span className="text-[9px] font-bold uppercase tracking-tight text-blue-600 bg-blue-100 px-1 py-0.5 rounded shrink-0">
                              New
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-slate-400 shrink-0 font-medium">{item.time}</span>
                  </div>
                )) : (
                  <div className="px-5 py-10 text-center text-slate-400 text-xs">
                    No activity recorded in the system yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: video broadcasts */}
          <aside className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Institutional Broadcasts
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  School-wide announcements
                </p>
              </div>
            </div>

            {/* Live Video Carousel */}
            <VideoCarousel
              category="INSTITUTIONAL"
              userRole="ACADEMIC_ADMIN"
              title=""
              allowDelete={false}
            />

            {/* Read-Only System Tutorials for L80 to learn */}
            <div className="pt-6">
              <VideoCarousel
                category="TUTORIAL"
                userRole="ACADEMIC_ADMIN"
                title="Platform Tutorials"
                subtitle="CMS Training provided by System Admin"
                allowDelete={false}
              />
            </div>
          </aside>
        </section>
      </main>
    </>
  )
}

export default AdminDashboard
