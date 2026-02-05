import React from 'react'
import { FaBookOpen, FaPlus, FaSearch } from 'react-icons/fa'

interface CmsSection {
  id: number
  title: string
  category: string
  status: 'Published' | 'Draft'
  updatedAt: string
}

const sections: CmsSection[] = [
  {
    id: 1,
    title: 'Section 1.1 – DYCI Vision, Mission, and Core Values',
    category: 'Introduction',
    status: 'Published',
    updatedAt: 'Nov 28, 2025',
  },
  {
    id: 2,
    title: 'Section 2.1 – Rights of Students',
    category: 'Student Code of Discipline',
    status: 'Published',
    updatedAt: 'Dec 1, 2025',
  },
  {
    id: 3,
    title: 'Section 2.6 – Student Obligations',
    category: 'Student Code of Discipline',
    status: 'Draft',
    updatedAt: 'Dec 7, 2025',
  },
]

const statusPillClasses = {
  Published: 'bg-emerald-50 text-emerald-700',
  Draft: 'bg-slate-50 text-slate-600',
}

const Cms: React.FC = () => {
  const activeSection = sections[0]

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <FaBookOpen className="h-4 w-4" />
            </div> */}
            <div>
              <h1 className="text-xl font-semibold">Handbook CMS</h1>
              <p className="mt-1 text-xs text-blue-100">
                Manage handbook sections and publish updates
              </p>
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 shadow-sm"
          >
            <FaPlus className="mr-2 h-3 w-3" />
            New Section
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <section className="bg-white rounded-lg border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-3 min-h-[480px]">
          {/* Left: sections list */}
          <div className="lg:border-r border-slate-100 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Sections
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Browse and select sections to edit
                </p>
              </div>
            </div>

            {/* Search + filter */}
            <div className="px-4 py-2 border-b border-slate-100">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search sections..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-[11px] text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto text-xs">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`w-full text-left px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
                    s.id === activeSection.id ? 'bg-slate-50' : ''
                  }`}
                >
                  <p className="font-medium text-slate-900 line-clamp-2">
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {s.category}
                  </p>
                  <div className="mt-1 flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        statusPillClasses[s.status]
                      }`}
                    >
                      {s.status}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {s.updatedAt}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: editor preview */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-slate-900">
                  {activeSection.title}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {activeSection.category}
                </p>
              </div>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  statusPillClasses[activeSection.status]
                }`}
              >
                {activeSection.status}
              </span>
            </div>

            <div className="flex-1 px-5 py-4 text-xs text-slate-700 bg-slate-50">
              <div className="h-full rounded-lg border border-dashed border-slate-300 bg-white flex items-center justify-center text-[11px] text-slate-400">
                Rich-text editor placeholder – this is where content editing
                controls will appear.
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default Cms


