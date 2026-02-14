import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import StatsWidget from '../../components/dashboard/widgets/StatsWidget'
import ActivityChart from '../../components/dashboard/charts/ActivityChart'
import TodoList from '../../components/dashboard/widgets/TodoList'
import RecentFiles from '../../components/dashboard/widgets/RecentFiles'
import { supabase } from '../../lib/supabaseClient'
import toast from 'react-hot-toast'
import type { FileMetadata, Todo } from '../../types'

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    todoCount: 0,
    fileCount: 0,
    gwa: 0,
    storageUsed: '0 MB',
  })
  const [activityData, setActivityData] = useState<Array<{ name: string; users: number }>>([])
  const [recentFiles, setRecentFiles] = useState<FileMetadata[]>([])
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch todos
      const { data: todosData } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch recent files
      const { data: filesData } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch GWA
      const { data: grades } = await supabase
        .from('grades')
        .select('grade, units')
        .eq('user_id', user?.id)

      type GradeRow = { grade?: number; units?: number }
      const gradeList = grades ?? []
      const totalUnits = gradeList.reduce((sum, g: GradeRow) => sum + (g.units ?? 0), 0)
      const weightedSum = gradeList.reduce((sum, g: GradeRow) => sum + ((g.grade ?? 0) * (g.units ?? 0)), 0)
      const gwa = totalUnits > 0 ? (weightedSum / totalUnits).toFixed(2) : '0'

      // Calculate storage used
      const { data: allFiles } = await supabase
        .from('files')
        .select('size')
        .eq('user_id', user?.id)

      const totalSize = allFiles?.reduce((sum: number, file: { size: number }) => sum + (file.size || 0), 0) || 0
      const storageUsed = `${(totalSize / (1024 * 1024)).toFixed(2)} MB`

      setStats({
        todoCount: todosData?.length || 0,
        fileCount: filesData?.length || 0,
        gwa: parseFloat(gwa),
        storageUsed,
      })

      setTodos(todosData || [])
      setRecentFiles(filesData || [])

      // Generate activity data
      setActivityData([
        { name: 'Mon', users: 40 },
        { name: 'Tue', users: 30 },
        { name: 'Wed', users: 50 },
        { name: 'Thu', users: 45 },
        { name: 'Fri', users: 55 },
        { name: 'Sat', users: 35 },
        { name: 'Sun', users: 25 },
      ])

    } catch (error: any) {
      toast.error('Error loading dashboard data')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.user_metadata?.full_name || 'Student'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here's what's happening with your academic journey today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          title="Current GWA"
          value={stats.gwa}
          icon="book"
          color="text-purple-500"
        />
        <StatsWidget
          title="Storage Used"
          value={stats.storageUsed}
          icon="users"
          color="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <ActivityChart data={activityData} />
          <RecentFiles files={recentFiles} />
        </div>
        <div>
          <TodoList todos={todos} onUpdate={fetchDashboardData} />
        </div>
      </div>
    </div>
  )
}

export default FacultyDashboard