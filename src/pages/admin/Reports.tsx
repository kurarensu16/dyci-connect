import React, { useEffect, useState, useMemo } from 'react'
import { FaDownload } from 'react-icons/fa'
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ViewRecord {
  node_id: string
  user_id: string
  viewed_at: string
}

interface NodeRecord {
  id: string
  title: string
}

interface ProfileRecord {
  id: string
  verified: boolean
}

const Reports: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<ProfileRecord[]>([])
  const [views, setViews] = useState<ViewRecord[]>([])
  const [nodes, setNodes] = useState<NodeRecord[]>([])

  useEffect(() => {
    let cancelled = false
    const loadData = async () => {
      if (!isSupabaseConfigured) {
        setLoading(false)
        return
      }

      setLoading(true)

      const [profilesRes, viewsRes, nodesRes] = await Promise.all([
        supabase.from('profiles').select('id, verified'),
        supabase.from('handbook_views').select('node_id, user_id, viewed_at'),
        supabase.from('handbook_nodes').select('id, title')
      ])

      if (!cancelled) {
        setProfiles(profilesRes.data || [])
        setViews(viewsRes.data || [])
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

  const sectionsPublished = nodes.length

  // Calculate detailed section metrics
  const sectionMetrics = useMemo(() => {
    const map = new Map<string, { views: number, uniqueUsers: Set<string> }>()

    // Initialize map with all nodes
    nodes.forEach(n => {
      map.set(n.id, { views: 0, uniqueUsers: new Set() })
    })

    // Populate with views
    views.forEach(v => {
      if (!map.has(v.node_id)) {
        map.set(v.node_id, { views: 0, uniqueUsers: new Set() })
      }
      const entry = map.get(v.node_id)!
      entry.views += 1
      entry.uniqueUsers.add(v.user_id)
    })

    // Convert to array
    const result = Array.from(map.entries()).map(([id, data]) => {
      const nodeInfo = nodes.find(n => n.id === id)
      return {
        id,
        title: nodeInfo ? nodeInfo.title : `Section ${id}`,
        views: data.views,
        uniqueUsersCount: data.uniqueUsers.size
      }
    })

    // Sort by views descending
    result.sort((a, b) => b.views - a.views)

    return result
  }, [views, nodes])

  const topSections = sectionMetrics.slice(0, 5)

  const exportCsv = () => {
    const headers = ['Node ID', 'Section Title', 'Total Views', 'Unique Readers', 'Read Rate (%)']
    const rows = sectionMetrics.map(sec => {
      const readRate = activeUsers > 0 ? Math.round((sec.uniqueUsersCount / activeUsers) * 100) : 0
      return [
        sec.id,
        `"${sec.title.replace(/"/g, '""')}"`, // escape quotes for CSV
        sec.views,
        sec.uniqueUsersCount,
        readRate
      ]
    })

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.setAttribute('download', `dyci_handbook_metrics_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportPdf = () => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(18)
    doc.text('DYCI Connect - Handbook Analytics', 14, 22)

    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

    doc.setTextColor(0)

    // Overall Stats
    doc.text(`Active Users: ${activeUsers.toLocaleString()}`, 14, 40)
    doc.text(`Handbook Views: ${totalViews.toLocaleString()}`, 14, 46)
    doc.text(`Unique Readers: ${uniqueReaders.toLocaleString()}`, 14, 52)
    doc.text(`Published Sections: ${sectionsPublished.toLocaleString()}`, 14, 58)

    // Detailed Table
    const tableColumn = ['Node ID', 'Section Title', 'Total Views', 'Unique Readers', 'Read Rate']
    const tableRows = sectionMetrics.map(sec => {
      const readRate = activeUsers > 0 ? Math.round((sec.uniqueUsersCount / activeUsers) * 100) : 0
      return [
        sec.id,
        sec.title,
        sec.views.toString(),
        sec.uniqueUsersCount.toString(),
        `${readRate}%`
      ]
    })

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 65,
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175] }, // blue-800
    })

    doc.save(`dyci_handbook_metrics_${new Date().toISOString().split('T')[0]}.pdf`)
  }

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
              onClick={exportCsv}
              className="inline-flex items-center rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-100"
            >
              <FaDownload className="mr-2 h-3 w-3" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center rounded-xl bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 shadow-sm border border-slate-200"
            >
              <FaDownload className="mr-2 h-3 w-3" />
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
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
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
                <p className="text-[11px] text-slate-500">Active Users</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{activeUsers.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Total verified student and faculty profiles
                </p>
              </div>
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
                <p className="text-[11px] text-slate-500">Handbook Views</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{totalViews.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Total times handbook sections were opened
                </p>
              </div>
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
                <p className="text-[11px] text-slate-500">Unique Readers</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{uniqueReaders.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Users who have read at least one section
                </p>
              </div>
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
                <p className="text-[11px] text-slate-500">Published Sections</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{sectionsPublished.toLocaleString()}</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Total handbook chapters and sections available
                </p>
              </div>
            </section>

            {/* Charts row */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Top accessed sections (Horizontal Bar approximation) */}
              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Top 5 Accessed Handbook Sections
                </h2>
                <div className="space-y-4">
                  {topSections.length > 0 ? topSections.map((sec) => {
                    const maxViews = topSections[0].views || 1;
                    const percent = Math.max(5, Math.round((sec.views / maxViews) * 100));
                    return (
                      <div key={sec.id} className="relative">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-700 truncate pr-4">{sec.id} - {sec.title}</span>
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

              <div className="bg-white rounded-lg border border-slate-100 shadow-sm px-4 py-3 flex flex-col items-center justify-center text-[11px] text-slate-400 border-dashed">
                {/* Placeholder for future trends chart */}
                <svg className="h-12 w-12 text-slate-200 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
                Trends Chart Coming Soon
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
                    <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider">
                      <th className="py-2 pr-4 font-semibold">Node ID</th>
                      <th className="py-2 pr-4 font-semibold">Section Title</th>
                      <th className="py-2 pr-4 font-semibold text-right">Total Views</th>
                      <th className="py-2 pr-4 font-semibold text-right">Unique Readers</th>
                      <th className="py-2 pr-4 font-semibold text-right">Read Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sectionMetrics.length > 0 ? sectionMetrics.map((sec) => {
                      const readRate = activeUsers > 0
                        ? Math.round((sec.uniqueUsersCount / activeUsers) * 100)
                        : 0;

                      return (
                        <tr key={sec.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 pr-4 font-medium text-slate-900">{sec.id}</td>
                          <td className="py-3 pr-4">{sec.title}</td>
                          <td className="py-3 pr-4 text-right">{sec.views.toLocaleString()}</td>
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
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default Reports
