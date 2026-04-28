import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import StatsWidget from '../../components/dashboard/widgets/StatsWidget'
import ActivityChart from '../../components/dashboard/charts/ActivityChart'
import type { ActivityPoint } from '../../components/dashboard/charts/ActivityChart'
import TodoList from '../../components/dashboard/widgets/TodoList'
import RecentFiles from '../../components/dashboard/widgets/RecentFiles'
import HandbookQuicklinks from '../../components/dashboard/widgets/HandbookQuicklinks'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import type { FileMetadata, Grade, Todo } from '../../types'
import { VideoCarousel } from '../../components/video/VideoCarousel'
import { DashboardSkeleton } from '../../components/ui/Skeleton'

const StudentDashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    todoCount: 0,
    fileCount: 0,
    gwa: 0,
    isEligible: false,
    classification: null as string | null,
    storageUsed: '0 MB',
  })
  const [activityData, setActivityData] = useState<ActivityPoint[]>([])
  const [recentFiles, setRecentFiles] = useState<FileMetadata[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      if (!user) return

      // Calculate dates for activity (Last 7 Days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
      sevenDaysAgo.setHours(0, 0, 0, 0)

      // Fetch todos from Supabase
      const { data: todosData, error: todosError } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })

      if (todosError) throw todosError

      // Fetch recent files (Latest 5 for the list)
      const { data: latestFiles } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user?.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch all files from the last 7 days for activity chart
      const { data: activityFiles } = await supabase
        .from('files')
        .select('created_at')
        .eq('user_id', user?.id)
        .is('deleted_at', null)
        .gte('created_at', sevenDaysAgo.toISOString())

      // Fetch real-time GWA from Supabase
      const { data: gwaRecord } = await supabase
        .from('student_gwa_results')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      const gwa = gwaRecord?.gwa || 0
      const isEligible = gwaRecord?.is_eligible || false
      const classification = gwaRecord?.classification || null

      // Calculate storage used (active files only)
      const { data: allFiles } = await supabase
        .from('files')
        .select('size')
        .eq('user_id', user?.id)
        .is('deleted_at', null)

      const totalSize = allFiles?.reduce((sum: number, file: { size: number }) => sum + (Number(file.size) || 0), 0) || 0
      const storageUsed = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`

      // Count 'Pending' tasks as Backlog (0), Active (1), and Review (2)
      const pendingTasksCount = todosData?.filter(t => t.status >= 0 && t.status <= 2).length || 0

      // Get total file count (including archived)
      const { count: totalFileCount } = await supabase
        .from('files')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('deleted_at', null)

      setStats({
        todoCount: pendingTasksCount,
        fileCount: totalFileCount || 0,
        gwa: parseFloat(gwa.toString()),
        isEligible,
        classification,
        storageUsed,
      })

      // Show latest 5 todos and files
      setTodos(todosData?.slice(0, 5) || [])
      setRecentFiles(latestFiles || [])

      // Fetch handbook views for activity
      const { data: viewsData } = await supabase
        .from('handbook_views')
        .select('viewed_at')
        .eq('user_id', user.id)
        .gte('viewed_at', sevenDaysAgo.toISOString())

      // Helper to group by day
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const activityMap = new Map<string, { todos: number; files: number; views: number }>()

      // Initialize last 7 days
      const last7Days: string[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dateKey = d.toISOString().split('T')[0]
        last7Days.push(dateKey)
        activityMap.set(dateKey, { todos: 0, files: 0, views: 0 })
      }

      // Aggregate To-dos (Created/Updated)
      todosData?.forEach(t => {
        const cDate = new Date(t.created_at).toISOString().split('T')[0]
        const uDate = new Date(t.updated_at).toISOString().split('T')[0]
        if (activityMap.has(cDate)) activityMap.get(cDate)!.todos++
        if (uDate !== cDate && activityMap.has(uDate)) activityMap.get(uDate)!.todos++
      })

      // Aggregate Files
      activityFiles?.forEach(f => {
        const fDate = new Date(f.created_at).toISOString().split('T')[0]
        if (activityMap.has(fDate)) activityMap.get(fDate)!.files++
      })

      // Aggregate Handbook Views (Total visits)
      viewsData?.forEach(v => {
        const vDate = new Date(v.viewed_at).toISOString().split('T')[0]
        if (activityMap.has(vDate)) {
          activityMap.get(vDate)!.views++
        }
      })

      setActivityData(last7Days.map(dateKey => {
        const d = new Date(dateKey)
        const breakdown = activityMap.get(dateKey) || { todos: 0, files: 0, views: 0 }
        return {
          name: dayLabels[d.getDay()],
          ...breakdown,
          total: breakdown.todos + breakdown.files + breakdown.views
        }
      }))

    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) return <DashboardSkeleton />

  return (
    <>
      <header className="unified-header">
        <div className="unified-header-content">
          <h1 className="unified-header-title">
            Welcome back, {user?.user_metadata?.full_name || 'Student'}!
          </h1>
          <p className="unified-header-subtitle">
            Here&apos;s what&apos;s happening with your academic journey today.
          </p>
        </div>
      </header>

      <main className="unified-main">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsWidget
            title="Pending Tasks"
            value={stats.todoCount}
            icon="calendar"
            color="text-blue-500"
          />
          <StatsWidget
            title="Files Uploaded"
            value={stats.fileCount}
            icon="file"
            color="text-green-500"
          />
          <StatsWidget
            title="Academic GWA"
            value={stats.gwa.toFixed(2)}
            icon="book"
            color="text-purple-500"
            trend={stats.isEligible ? { value: stats.classification || 'PL Eligible', isPositive: true } : undefined}
          />
          <StatsWidget
            title="Storage Used"
            value={stats.storageUsed}
            icon="users"
            color="text-orange-500"
          />
        </div>

        {/* Layout Grid: 2/3 Main, 1/3 Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-6">
            <HandbookQuicklinks />
            <ActivityChart data={activityData} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentFiles files={recentFiles} />
              <TodoList todos={todos} />
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* Video Broadcast Network */}
            <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-indigo-600 shadow-sm p-6 overflow-hidden">
              <VideoCarousel
                category="INSTITUTIONAL"
                userRole="STUDENT"
                title="Campus Broadcasts"
                subtitle="Latest institutional announcements"
                allowDelete={false}
              />
            </div>
            <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-rose-500 shadow-sm p-6 overflow-hidden">
              <VideoCarousel
                category="TUTORIAL"
                userRole="STUDENT"
                title="Platform Tutorials"
                subtitle="Guides for your digital campus"
                allowDelete={false}
              />
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}

export default StudentDashboard