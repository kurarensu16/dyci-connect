import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import ApprovalQueueWidget from '../../components/faculty/widgets/ApprovalQueueWidget'
import QuickActionsWidget from '../../components/faculty/widgets/QuickActionsWidget'
import UpcomingEventsWidget from '../../components/faculty/widgets/UpcomingEventsWidget'
import RecentActivityWidget from '../../components/faculty/widgets/RecentActivityWidget'
import { VideoCarousel } from '../../components/video/VideoCarousel'

const FacultyDashboard: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="unified-header">
        <div className="unified-header-content">
          <h1 className="unified-header-title">
            Welcome back, {user?.user_metadata?.full_name || 'Staff'}!
          </h1>
          <p className="unified-header-subtitle">
            Manage approvals, events, and department activities from your dashboard.
          </p>
        </div>
      </header>

      <main className="unified-main">
        {/* Layout Grid: 2/3 Main, 1/3 Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-6">
            <QuickActionsWidget />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ApprovalQueueWidget />
              <UpcomingEventsWidget />
            </div>

            <RecentActivityWidget />
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* Video Broadcast Network */}
            <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-indigo-600 shadow-sm p-6 overflow-hidden text-slate-800">
              <VideoCarousel
                category="INSTITUTIONAL"
                userRole="STAFF"
                title="Campus Broadcasts"
                subtitle="Latest institutional announcements"
                allowDelete={false}
              />
            </div>
            <div className="bg-white rounded-2xl border-y border-r border-y-slate-100 border-r-slate-100 border-l-[6px] border-l-rose-500 shadow-sm p-6 overflow-hidden text-slate-800">
              <VideoCarousel
                category="TUTORIAL"
                userRole="STAFF"
                title="Platform Tutorials"
                subtitle="Guides for your digital campus"
                allowDelete={false}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default FacultyDashboard