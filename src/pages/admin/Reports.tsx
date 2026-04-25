import React, { useEffect, useState, useMemo } from 'react'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import { fetchPublishedHandbook } from '../../lib/api/handbookWorkflow'

interface ViewRecord {
  section_id: string
  user_id: string
  viewed_at: string
  duration_seconds: number
}

interface NodeRecord {
  id: string
  title: string
  parent_id: string | null
}

interface ProfileRecord {
  id: string
  email: string | null
  verified: boolean
  first_name: string | null
  last_name: string | null
  department: string | null
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ProfileRecord[]>([])
  const [views, setViews] = useState<ViewRecord[]>([])
  const [nodes, setNodes] = useState<NodeRecord[]>([])
  const [dbDepts, setDbDepts] = useState<string[]>([])
  const [metricsPage, setMetricsPage] = useState(1)
  const [metricsSearch, setMetricsSearch] = useState('')
  const [metricsTypeFilter, setMetricsTypeFilter] = useState<'all' | 'chapter' | 'section'>('all')
  const [metricsSortCol, setMetricsSortCol] = useState<'views' | 'time' | 'readers' | 'rate' | null>(null)
  const [metricsSortDir, setMetricsSortDir] = useState<'asc' | 'desc'>('desc')
  const METRICS_PER_PAGE = 10

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      setLoading(true)

      // Get published handbook first
      const { data: publishedHandbook, error: handbookError } = await fetchPublishedHandbook()

      if (handbookError || !publishedHandbook) {
        // No published handbook - show empty state
        if (!cancelled) {
          setProfiles([])
          setViews([])
          setNodes([])
          setLoading(false)
        }
        return
      }

      // Fetch data only for published handbook + all departments for legend
      const [profilesRes, nodesRes, deptsRes] = await Promise.all([
        supabase.from('profiles').select(`
          id, email, verified, first_name, last_name,
          student:student_profiles(departments(name)),
          staff:staff_profiles(departments(name))
        `),
        supabase.from('handbook_sections').select('id, title, parent_id').eq('handbook_id', publishedHandbook.id),
        supabase.from('departments').select('name').order('name')
      ])

      const sectionIds = (nodesRes.data || []).map((n: any) => n.id)
      const viewsRes = sectionIds.length > 0
        ? await supabase.from('handbook_views').select('section_id, user_id, viewed_at, duration_seconds').in('section_id', sectionIds)
        : { data: [], error: null }

      if (profilesRes.error) console.error('Reports: profiles query failed', profilesRes.error)
      if (viewsRes.error) console.error('Reports: views query failed', viewsRes.error)
      if (nodesRes.error) console.error('Reports: nodes query failed', nodesRes.error)
      if (deptsRes.error) console.error('Reports: depts query failed', deptsRes.error)

      if (!cancelled) {
        // Map departments for legend
        const uniqueDeptNames = (deptsRes.data || []).map((d: any) => d.name).filter(Boolean);
        setDbDepts(uniqueDeptNames);

        const mappedProfiles: ProfileRecord[] = (profilesRes.data || []).map((p: any) => {
          // Supabase returns aliased joins as single objects or arrays of one object
          const sp = Array.isArray(p.student) ? p.student[0] : p.student;
          const sfp = Array.isArray(p.staff) ? p.staff[0] : p.staff;

          const getDeptNameFromJoin = (data: any) => {
            if (!data) return null;
            const d = data.departments;
            if (!d) return null;
            if (Array.isArray(d)) return d[0]?.name;
            return d.name;
          };

          const dept = getDeptNameFromJoin(sp) || getDeptNameFromJoin(sfp) || 'Unknown';

          return {
            id: p.id,
            email: p.email,
            verified: p.verified,
            first_name: p.first_name,
            last_name: p.last_name,
            department: dept
          };
        })

        setProfiles(mappedProfiles)
        setViews((viewsRes.data as any) || [])
        setNodes(nodesRes.data || [])
        setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [])

  // Calculate top-level stats
  const activeUsers = profiles.filter(p => p.verified).length
  const totalViews = views.length

  const uniqueReaders = useMemo(() => {
    const s = new Set(views.map(v => v.user_id))
    return s.size
  }, [views])

  const chaptersCount = nodes.filter(n => n.parent_id === null).length
  const sectionsCount = nodes.filter(n => n.parent_id !== null).length

  // Calculate detailed section metrics
  const sectionMetrics = useMemo(() => {
    const map = new Map<string, { views: number, uniqueUsers: Set<string>, totalSeconds: number }>()

    // Initialize map with all nodes
    nodes.forEach(n => {
      map.set(n.id, { views: 0, uniqueUsers: new Set(), totalSeconds: 0 })
    })

    // Populate with views
    views.forEach(v => {
      if (!map.has(v.section_id)) {
        map.set(v.section_id, { views: 0, uniqueUsers: new Set(), totalSeconds: 0 })
      }
      const entry = map.get(v.section_id)!
      entry.views += 1
      entry.uniqueUsers.add(v.user_id)
      entry.totalSeconds += v.duration_seconds || 0
    })

    // Convert to array
    const result = Array.from(map.entries()).map(([id, data]) => {
      const nodeInfo = nodes.find(n => n.id === id)
      return {
        id,
        title: nodeInfo ? nodeInfo.title : (data.views > 0 ? `Legacy/Other Section (${id.slice(0, 8)})` : `Section ${id}`),
        depth: nodeInfo ? (nodeInfo.parent_id === null ? 0 : 1) : -1,
        views: data.views,
        uniqueUsersCount: data.uniqueUsers.size,
        totalSeconds: data.totalSeconds
      }
    })

    // Sort by views descending
    result.sort((a, b) => b.views - a.views)

    return result
  }, [views, nodes])

  const topSections = sectionMetrics.slice(0, 5)

  // Top 5 users by duration
  const topUsers = useMemo(() => {
    const userDurations = new Map<string, number>()
    views.forEach(v => {
      const current = userDurations.get(v.user_id) || 0
      userDurations.set(v.user_id, current + (v.duration_seconds || 0))
    })

    const result = Array.from(userDurations.entries()).map(([userId, duration]) => {
      const profile = profiles.find(p => p.id === userId)
      let fullName = ''
      if (profile) {
        const nameParts = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        fullName = nameParts || profile.email || userId.slice(0, 8)
      }
      return {
        id: userId,
        fullName: fullName || 'Unknown User',
        department: profile?.department || 'Unknown',
        duration
      }
    })

    result.sort((a, b) => b.duration - a.duration)
    return result.slice(0, 5).filter(u => u.duration > 0)
  }, [views, profiles])

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

  // Top 5 users by number of accesses
  const topBrowsers = useMemo(() => {
    const userViews = new Map<string, number>()
    views.forEach(v => {
      userViews.set(v.user_id, (userViews.get(v.user_id) || 0) + 1)
    })

    const result = Array.from(userViews.entries()).map(([userId, count]) => {
      const profile = profiles.find(p => p.id === userId)
      let fullName = ''
      if (profile) {
        const nameParts = [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        fullName = nameParts || profile.email || userId.slice(0, 8)
      }
      return {
        id: userId,
        fullName: fullName || 'Unknown User',
        department: profile?.department || 'Unknown',
        count
      }
    })

    result.sort((a, b) => b.count - a.count)
    return result.slice(0, 5).filter(u => u.count > 0)
  }, [views, profiles])

  const fmtDuration = (s: number) => {
    if (s < 60) return `${s}s`
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ${s % 60}s`
    const h = Math.floor(s / 3600)
    const remM = Math.floor((s % 3600) / 60)
    return `${h}h ${remM}m`
  }

  const toggleMetricsSort = (col: 'views' | 'time' | 'readers' | 'rate') => {
    if (metricsSortCol === col) {
      if (metricsSortDir === 'desc') setMetricsSortDir('asc')
      else { setMetricsSortCol(null); setMetricsSortDir('desc') }
    } else {
      setMetricsSortCol(col)
      setMetricsSortDir('desc')
    }
    setMetricsPage(1)
  }

  const filteredMetrics = useMemo(() => {
    let list = sectionMetrics
    if (metricsTypeFilter === 'chapter') list = list.filter(s => s.depth === 0)
    else if (metricsTypeFilter === 'section') list = list.filter(s => s.depth > 0)
    if (metricsSearch.trim()) {
      const q = metricsSearch.trim().toLowerCase()
      list = list.filter(s => s.id.toLowerCase().includes(q) || s.title.toLowerCase().includes(q))
    }
    if (metricsSortCol) {
      const dir = metricsSortDir === 'asc' ? 1 : -1
      list = [...list].sort((a, b) => {
        let va: number, vb: number
        switch (metricsSortCol) {
          case 'views': va = a.views; vb = b.views; break
          case 'time': va = a.totalSeconds; vb = b.totalSeconds; break
          case 'readers': va = a.uniqueUsersCount; vb = b.uniqueUsersCount; break
          case 'rate':
            va = activeUsers > 0 ? a.uniqueUsersCount / activeUsers : 0
            vb = activeUsers > 0 ? b.uniqueUsersCount / activeUsers : 0
            break
        }
        return (va - vb) * dir
      })
    }
    return list
  }, [sectionMetrics, metricsTypeFilter, metricsSearch, metricsSortCol, metricsSortDir, activeUsers])

  const metricsTotalPages = Math.max(1, Math.ceil(filteredMetrics.length / METRICS_PER_PAGE))
  const safePage = Math.min(metricsPage, metricsTotalPages)
  const paginatedMetrics = filteredMetrics.slice(
    (safePage - 1) * METRICS_PER_PAGE,
    safePage * METRICS_PER_PAGE
  )



  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans tracking-tight">
      {/* Standard Legacy Header */}
      <header className="legacy-header">
        <div className="max-w-6xl mx-auto px-10">
          <h1 className="legacy-header-title">Governance Reports</h1>
          <p className="legacy-header-subtitle">
            Export academic audit trails and institutional analytics.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-10 py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <svg className="animate-spin h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Loading reports…
          </div>
        ) : (
          <>
            {/* Top metric cards */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-dyci-blue px-4 py-3 shadow-sm">
                <p className="text-[11px] text-slate-500">Active Users</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{activeUsers.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Verified student and staff profiles
                </p>
              </div>
              <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-blue-500 px-4 py-3 shadow-sm">
                <p className="text-[11px] text-slate-500">Handbook Views</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{totalViews.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Total times sections were opened
                </p>
              </div>
              <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-emerald-500 px-4 py-3 shadow-sm">
                <p className="text-[11px] text-slate-500">Unique Readers</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{uniqueReaders.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Users who read at least one section
                </p>
              </div>
              <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-indigo-600 px-4 py-3 shadow-sm">
                <p className="text-[11px] text-slate-500">Chapters</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{chaptersCount.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Top-level handbook chapters
                </p>
              </div>
              <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-purple-600 px-4 py-3 shadow-sm">
                <p className="text-[11px] text-slate-500">Sections</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{sectionsCount.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Sections and subsections available
                </p>
              </div>
            </section>

            {/* College color legend - now DYNAMIC from database */}
            {dbDepts.length > 0 && (
              <section className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Department Legend</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {dbDepts.map((dept) => (
                    <div key={dept} className="flex items-center gap-1.5 text-[10px] text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getDeptColor(dept) }} />
                      <span>{dept}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FALLBACK_COLOR }} />
                    <span>Unknown/Other</span>
                  </div>
                </div>
              </section>
            )}

            {/* Charts row */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Top accessed sections */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Top 5 Accessed Sections
                </h2>
                <div className="space-y-4">
                  {topSections.length > 0 ? topSections.map((sec) => {
                    const maxViews = topSections[0].views || 1;
                    const percent = Math.max(5, Math.round((sec.views / maxViews) * 100));
                    return (
                      <div key={sec.id} className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 truncate pr-4">{sec.title}</span>
                          <span className="text-slate-500 shrink-0">{sec.views} views</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="text-center py-8 text-[11px] text-slate-400">
                      No handbook views recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Top 5 Handbook Browsers (by access count) */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-4 flex flex-col">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Top 5 Handbook Browsers
                </h2>
                <div className="space-y-4 flex-1">
                  {topBrowsers.length > 0 ? topBrowsers.map((u, idx) => {
                    const maxCount = topBrowsers[0].count || 1;
                    const percent = Math.max(5, Math.round((u.count / maxCount) * 100));
                    const color = getDeptColor(u.department);
                    return (
                      <div key={u.id} className="relative">
                        <div className="flex justify-between items-end text-xs mb-1.5 px-0.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 leading-tight">
                              {idx + 1}. {u.fullName}
                            </span>
                            <div className="flex items-center mt-1">
                              <span className="w-2 h-2 rounded-full shrink-0 mr-1.5" style={{ backgroundColor: color }} />
                              <span className="text-[10px] text-slate-400 leading-tight">
                                {u.department}
                              </span>
                            </div>
                          </div>
                          <span className="font-semibold text-slate-700 shrink-0 ml-2">
                            {u.count.toLocaleString()} views
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${percent}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-[11px] text-slate-400">
                      No browsing data recorded yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Top 5 Most Engaged Users (by duration) */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-4 flex flex-col">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Top 5 Most Engaged Users
                </h2>
                <div className="space-y-4 flex-1">
                  {topUsers.length > 0 ? topUsers.map((u, idx) => {
                    const maxDuration = topUsers[0].duration || 1;
                    const percent = Math.max(5, Math.round((u.duration / maxDuration) * 100));
                    const color = getDeptColor(u.department);
                    return (
                      <div key={u.id} className="relative">
                        <div className="flex justify-between items-end text-xs mb-1.5 px-0.5">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800 leading-tight">
                              {idx + 1}. {u.fullName}
                            </span>
                            <div className="flex items-center mt-1">
                              <span className="w-2 h-2 rounded-full shrink-0 mr-1.5" style={{ backgroundColor: color }} />
                              <span className="text-[10px] text-slate-400 leading-tight">
                                {u.department}
                              </span>
                            </div>
                          </div>
                          <span className="font-semibold text-slate-700 shrink-0 ml-2">
                            {fmtDuration(u.duration)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${percent}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  }) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-[11px] text-slate-400">
                      No duration data recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Detailed metrics table */}
            <section className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3 text-[11px] text-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-900">
                  Detailed Section Metrics
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={metricsTypeFilter}
                    onChange={e => { setMetricsTypeFilter(e.target.value as 'all' | 'chapter' | 'section'); setMetricsPage(1) }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All Types</option>
                    <option value="chapter">Chapters Only</option>
                    <option value="section">Sections Only</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Search by title…"
                    value={metricsSearch}
                    onChange={e => { setMetricsSearch(e.target.value); setMetricsPage(1) }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-700 placeholder:text-slate-400 w-48 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border-t border-slate-100">
                  <thead>
                    <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider">
                      <th className="py-2 pr-4 font-semibold">Section Title</th>
                      {([
                        ['views', 'Total Views'],
                        ['time', 'Time Spent'],
                        ['readers', 'Unique Readers'],
                        ['rate', 'Read Rate'],
                      ] as const).map(([col, label]) => (
                        <th key={col} className="py-2 pr-4 font-semibold text-right">
                          <button
                            type="button"
                            onClick={() => toggleMetricsSort(col)}
                            className="inline-flex items-center gap-1 hover:text-slate-700 transition-colors"
                          >
                            {label}
                            <span className="text-[9px]">
                              {metricsSortCol === col
                                ? metricsSortDir === 'desc' ? '▼' : '▲'
                                : '⇅'}
                            </span>
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedMetrics.length > 0 ? paginatedMetrics.map((sec) => {
                      const readRate = activeUsers > 0
                        ? Math.round((sec.uniqueUsersCount / activeUsers) * 100)
                        : 0;

                      return (
                        <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4 font-medium text-slate-900">{sec.title}</td>
                          <td className="py-3 pr-4 text-right">{sec.views.toLocaleString()}</td>
                          <td className="py-3 pr-4 text-right">{fmtDuration(sec.totalSeconds)}</td>
                          <td className="py-3 pr-4 text-right">{sec.uniqueUsersCount.toLocaleString()}</td>
                          <td className="py-3 pr-4 text-right">
                            <span className="inline-block bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                              {readRate}%
                            </span>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No handbook node data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredMetrics.length > METRICS_PER_PAGE && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-2">
                  <p className="text-[10px] text-slate-400">
                    Showing {(safePage - 1) * METRICS_PER_PAGE + 1}–{Math.min(safePage * METRICS_PER_PAGE, filteredMetrics.length)} of {filteredMetrics.length} sections
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setMetricsPage(1)}
                      disabled={metricsPage === 1}
                      className="px-2 py-1 rounded text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricsPage(p => Math.max(1, p - 1))}
                      disabled={metricsPage === 1}
                      className="px-2 py-1 rounded text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>
                    {Array.from({ length: metricsTotalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === metricsTotalPages || Math.abs(p - metricsPage) <= 1)
                      .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                        if (idx > 0 && p - (arr[idx - 1]) > 1) acc.push('...')
                        acc.push(p)
                        return acc
                      }, [])
                      .map((p, idx) =>
                        p === '...' ? (
                          <span key={`ellipsis-${idx}`} className="px-1 text-[10px] text-slate-400">...</span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setMetricsPage(p)}
                            className={`min-w-[24px] px-1.5 py-1 rounded text-[10px] font-medium transition-colors ${metricsPage === p
                              ? 'bg-blue-700 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                              }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      type="button"
                      onClick={() => setMetricsPage(p => Math.min(metricsTotalPages, p + 1))}
                      disabled={metricsPage === metricsTotalPages}
                      className="px-2 py-1 rounded text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      type="button"
                      onClick={() => setMetricsPage(metricsTotalPages)}
                      disabled={metricsPage === metricsTotalPages}
                      className="px-2 py-1 rounded text-[10px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default Reports
