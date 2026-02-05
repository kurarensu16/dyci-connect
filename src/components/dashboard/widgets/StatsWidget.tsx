import React from 'react'
import type { IconType } from 'react-icons'
import { FaUsers, FaBook, FaFileUpload, FaCalendarAlt } from 'react-icons/fa'

interface StatsWidgetProps {
  title: string
  value: string | number
  icon: 'users' | 'book' | 'file' | 'calendar'
  color: string
}

const StatsWidget: React.FC<StatsWidgetProps> = ({ title, value, icon, color }) => {
  const IconComponent: Record<string, IconType> = {
    users: FaUsers,
    book: FaBook,
    file: FaFileUpload,
    calendar: FaCalendarAlt,
  }

  const SelectedIcon = IconComponent[icon] || FaUsers

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color} bg-opacity-20`}>
          <SelectedIcon className={`text-2xl ${color}`} />
        </div>
      </div>
    </div>
  )
}

export default StatsWidget