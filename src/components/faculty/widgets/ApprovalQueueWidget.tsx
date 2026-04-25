import React, { useState, useEffect } from 'react'
import { useAuth } from '../../../contexts/AuthContext'
import { supabase } from '../../../lib/supabaseClient'
import { FaCheckSquare, FaArrowRight, FaClock } from 'react-icons/fa'
import { Link } from 'react-router-dom'

interface ApprovalItem {
  id: string
  section_id: string
  section_title: string
  handbook_title: string
  status: string
  current_level: number
  submitted_at: string
  department_name?: string
}

const ApprovalQueueWidget: React.FC = () => {
  const { user } = useAuth()
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetchPendingApprovals()
  }, [user])

  const fetchPendingApprovals = async () => {
    try {
      if (!user?.id) return

      // Get user's approver position
      const { data: profile } = await supabase
        .from('profiles')
        .select('approver_position')
        .eq('id', user.id)
        .single()

      if (!profile?.approver_position) {
        setLoading(false)
        return
      }

      // Fetch sections requiring this position's approval
      const { data: requirements } = await supabase
        .from('handbook_approval_requirements')
        .select('handbook_section_id')
        .eq('required_position', profile.approver_position)

      if (!requirements?.length) {
        setLoading(false)
        return
      }

      const sectionIds = requirements.map(r => r.handbook_section_id)

      // Fetch pending sections
      const { data: sections } = await supabase
        .from('handbook_sections')
        .select(`
          id,
          title,
          status,
          current_level,
          updated_at,
          handbooks!inner(title)
        `)
        .in('id', sectionIds)
        .eq('status', 'dept_review')
        .order('updated_at', { ascending: false })
        .limit(5)

      if (sections) {
        const formatted = sections.map((section: any) => ({
          id: section.id,
          section_id: section.id,
          section_title: section.title,
          handbook_title: section.handbooks?.title || 'Unknown Handbook',
          status: section.status,
          current_level: section.current_level,
          submitted_at: section.updated_at,
        }))
        setApprovals(formatted)
        setCount(formatted.length)
      }
    } catch (error) {
      console.error('Error fetching approvals:', error)
    } finally {
      setLoading(false)
    }
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

  if (approvals.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <FaCheckSquare className="text-emerald-500" />
            Approval Queue
          </h3>
        </div>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <FaCheckSquare className="text-emerald-500 text-xl" />
          </div>
          <p className="text-sm text-slate-600">No pending approvals</p>
          <p className="text-xs text-slate-400 mt-1">All caught up!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <FaCheckSquare className="text-amber-500" />
          Approval Queue
          {count > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </h3>
        <Link 
          to="/staff/handbook-approvals" 
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          View all <FaArrowRight />
        </Link>
      </div>

      <div className="space-y-2">
        {approvals.map((item) => (
          <Link
            key={item.id}
            to={`/staff/handbook-approvals`}
            className="block p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {item.section_title}
                </p>
                <p className="text-xs text-slate-500">{item.handbook_title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                    Level {item.current_level} Review
                  </span>
                </div>
              </div>
              <div className="flex items-center text-slate-400">
                <FaClock className="text-xs mr-1" />
                <span className="text-xs">
                  {new Date(item.submitted_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default ApprovalQueueWidget
