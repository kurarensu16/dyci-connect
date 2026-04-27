import React from 'react'
import type { IconType } from 'react-icons'
import { FaUsers, FaBook, FaFileUpload, FaCalendarAlt } from 'react-icons/fa'

interface StatsWidgetProps {
  title: string
  value: string | number
  icon: 'users' | 'book' | 'file' | 'calendar'
  color: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ title, value, icon, color, trend }) => {
  const IconComponent: Record<string, IconType> = {
    users: FaUsers,
    book: FaBook,
    file: FaFileUpload,
    calendar: FaCalendarAlt,
  }

  const SelectedIcon = IconComponent[icon] || FaUsers

  const borderColor = color.replace('text-', 'border-l-')

  return (
    <div className={`bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] ${borderColor} shadow-sm px-4 py-4 flex items-center justify-between`}>
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
        {trend && (
          <p className={`mt-1 text-[10px] font-bold ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.value}
          </p>
        )}
      </div>
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
        <SelectedIcon className={`text-2xl ${color}`} />
      </div>
    </div>
  )
}

export default StatsWidget