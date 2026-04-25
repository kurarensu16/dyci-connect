import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabaseClient'
import { FaHistory, FaCheckCircle, FaTimesCircle, FaClock, FaFileAlt } from 'react-icons/fa'

interface ActivityItem {
  id: string
  type: 'approval' | 'rejection' | 'view' | 'upload'
  title: string
  description: string
  timestamp: string
}

const RecentActivityWidget: React.FC = () => {
  const { user } = useAuth()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [user])

  const fetchRecentActivity = async () => {
    try {
      if (!user?.id) return

      // Fetch recent handbook approvals (Level 2) by this user
      const { data: approvals } = await supabase
        .from('handbook_approvals')
        .select(`
          id,
          decision,
          created_at,
          handbook_sections!inner(title)
        `)
        .eq('approver_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch recent handbook-level approvals (Level 3) by this user
      const { data: l3Approvals } = await supabase
        .from('handbook_l3_approvals')
        .select(`
          id,
          decision,
          created_at,
          handbooks!inner(title)
        `)
        .eq('approver_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch recent file uploads
      const { data: files } = await supabase
        .from('files')
        .select('id, name, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3)

      const formattedActivities: ActivityItem[] = []

      // Map L2 Approvals
      approvals?.forEach((approval: any) => {
        formattedActivities.push({
          id: approval.id,
          type: approval.decision === 'approved' ? 'approval' : 'rejection',
          title: approval.decision === 'approved' ? 'Approved Section' : 'Rejected Section',
          description: approval.handbook_sections?.title || 'Handbook Section',
          timestamp: approval.created_at
        })
      })

      // Map L3 Approvals (Executive Sign-off)
      l3Approvals?.forEach((approval: any) => {
        formattedActivities.push({
          id: approval.id,
          type: approval.decision === 'approved' ? 'approval' : 'rejection',
          title: approval.decision === 'approved' ? 'Approved Handbook' : 'Rejected Handbook',
          description: approval.handbooks?.title || 'Handbook',
          timestamp: approval.created_at
        })
      })

      // Map File Uploads
      files?.forEach((file: any) => {
        formattedActivities.push({
          id: file.id,
          type: 'upload',
          title: 'Uploaded File',
          description: file.name,
          timestamp: file.created_at
        })
      })

      // Sort by timestamp and take top 5
      formattedActivities.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setActivities(formattedActivities.slice(0, 5))
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <FaCheckCircle className="text-emerald-500" />
      case 'rejection':
        return <FaTimesCircle className="text-rose-500" />
      case 'upload':
        return <FaFileAlt className="text-blue-500" />
      default:
        return <FaClock className="text-slate-400" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'approval':
        return 'bg-emerald-50 border-emerald-100'
      case 'rejection':
        return 'bg-rose-50 border-rose-100'
      case 'upload':
        return 'bg-blue-50 border-blue-100'
      default:
        return 'bg-slate-50 border-slate-100'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3"></div>
          <div className="h-12 bg-slate-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
        <FaHistory className="text-slate-500" />
        Recent Activity
      </h3>

      {activities.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <FaHistory className="text-slate-400 text-xl" />
          </div>
          <p className="text-sm text-slate-600">No recent activity</p>
          <p className="text-xs text-slate-400 mt-1">Your actions will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${getActivityColor(activity.type)}`}
            >
              <div className="flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{activity.title}</p>
                <p className="text-xs text-slate-500 truncate">{activity.description}</p>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {formatTimeAgo(activity.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default RecentActivityWidget
