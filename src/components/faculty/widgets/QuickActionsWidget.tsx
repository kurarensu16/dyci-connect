import React from 'react'
import { Link } from 'react-router-dom'
import { 
  FaBookOpen, 
  FaCheckSquare
} from 'react-icons/fa'
interface QuickAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  color: string
  description: string
}

const QuickActionsWidget: React.FC = () => {
  const actions: QuickAction[] = [
    {
      label: 'View Handbook',
      icon: FaBookOpen,
      path: '/staff/handbook',
      color: 'bg-emerald-500',
      description: 'Browse policies'
    },
    {
      label: 'My Approvals',
      icon: FaCheckSquare,
      path: '/staff/handbook-approvals',
      color: 'bg-amber-500',
      description: 'Pending reviews'
    }
  ]

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-3">
        Quick Actions
      </h3>
      
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link
              key={action.label}
              to={action.path}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all group"
            >
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform`}>
                <Icon className="text-lg" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">{action.label}</p>
                <p className="text-xs text-slate-400 truncate">{action.description}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export default QuickActionsWidget
