import React from 'react'

export interface ActivityPoint {
  name: string
  todos: number
  files: number
  views: number
  total: number
}

interface ActivityChartProps {
  data: ActivityPoint[]
}

const ActivityChart: React.FC<ActivityChartProps> = ({ data }) => {
  // Find max total to scale the bars (busiest day = 100%)
  const maxTotal = Math.max(...data.map(p => p.total), 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Academic Overview</h2>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
          Last 7 Days
        </span>
      </div>

      <div className="space-y-4">
        {data.map((point) => (
          <div key={point.name} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-500 w-10 uppercase tracking-tighter">{point.name}</span>
              <div className="flex-1 mx-4 h-3 bg-slate-50 rounded-full overflow-hidden flex border border-slate-100/50 shadow-inner">
                {/* Stacked Bars */}
                <div
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: maxTotal > 0 ? `${(point.todos / maxTotal) * 100}%` : '0%' }}
                  title={`${point.todos} Tasks`}
                />
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 ease-out border-l border-white/20"
                  style={{ width: maxTotal > 0 ? `${(point.files / maxTotal) * 100}%` : '0%' }}
                  title={`${point.files} Files`}
                />
                <div
                  className="h-full bg-purple-500 transition-all duration-500 ease-out border-l border-white/20"
                  style={{ width: maxTotal > 0 ? `${(point.views / maxTotal) * 100}%` : '0%' }}
                  title={`${point.views} Handbook Visited`}
                />
              </div>
              <span className="text-sm font-black text-slate-800 w-6 text-right">{point.total}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasks</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">File Uploads</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-purple-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Handbook Visits</span>
        </div>
      </div>

      <p className="mt-4 text-[10px] text-slate-400 font-medium italic">
        Engagement overview based on your recent platform activity.
      </p>
    </div>
  )
}

export default ActivityChart


