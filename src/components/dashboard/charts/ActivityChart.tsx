import React from 'react'

interface ActivityPoint {
  name: string
  users: number
}

interface ActivityChartProps {
  data: ActivityPoint[]
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Activity</h2>
      <div className="space-y-2">
        {data.map((point) => (
          <div key={point.name} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 w-12">{point.name}</span>
            <div className="flex-1 mx-3 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-2 bg-blue-500 rounded-full"
                style={{ width: `${Math.min(point.users, 100)}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-900">{point.users}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Activity is based on recent logins, to-do updates, file uploads, and GWA changes.
      </p>
    </div>
  )
}

export default ActivityChart


