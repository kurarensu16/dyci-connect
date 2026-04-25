import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FaBookOpen, FaCalendarAlt, FaArrowRight } from 'react-icons/fa'

interface QuickLink {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  path: string
}

const quickLinks: QuickLink[] = [
  {
    id: 'handbook',
    title: 'Full Handbook',
    description: 'Browse all sections',
    icon: <FaBookOpen className="h-5 w-5" />,
    color: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    path: '/student/handbook',
  },
  {
    id: 'calendar',
    title: 'School Calendar',
    description: 'View academic dates',
    icon: <FaCalendarAlt className="h-5 w-5" />,
    color: 'bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white',
    path: '/student/calendar',
  },
]

const HandbookQuicklinks: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-blue-100 flex items-center justify-center">
            <FaBookOpen className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Handbook Quick Links</h2>
        </div>
        <span className="text-xs text-gray-400">Student Guide</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quickLinks.map((link) => (
          <button
            key={link.id}
            onClick={() => navigate(link.path)}
            className="group flex items-center gap-3 p-3 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all text-left"
          >
            <div className={`h-10 w-10 shrink-0 rounded-lg flex items-center justify-center transition-colors ${link.color}`}>
              {link.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-slate-900 text-sm group-hover:text-blue-700 transition-colors">
                {link.title}
              </h3>
              <p className="text-xs text-slate-500 truncate">{link.description}</p>
            </div>
            <FaArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-blue-400 transition-colors" />
          </button>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <FaCalendarAlt className="h-3.5 w-3.5 text-blue-500" />
          <span>Access your handbook and academic calendar</span>
        </div>
      </div>
    </div>
  )
}

export default HandbookQuicklinks
