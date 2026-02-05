import React from 'react'
import { FaBookOpen } from 'react-icons/fa'

interface HandbookChapter {
  id: number
  title: string
  subtitle: string
  sections: number
}

const chapters: HandbookChapter[] = [
  {
    id: 1,
    title: 'CHAPTER 1:',
    subtitle: 'INTRODUCTION',
    sections: 4,
  },
  {
    id: 2,
    title: 'CHAPTER 2: GENERAL',
    subtitle: 'PROVISIONS',
    sections: 12,
  },
  {
    id: 3,
    title: 'CHAPTER 3: UNDERGRADUATE',
    subtitle: 'STUDENTS',
    sections: 6,
  },
  {
    id: 4,
    title: 'CHAPTER 4: GRADUATE',
    subtitle: 'STUDENTS',
    sections: 8,
  },
  {
    id: 5,
    title: 'APPENDICES',
    subtitle: '',
    sections: 5,
  },
]

const HandbookPreview: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Handbook Preview</h1>
            <p className="mt-1 text-xs text-blue-100">
              View the digital handbook as students see it
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Digital handbook header */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-100 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FaBookOpen className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Digital Handbook
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Student Handbook 2025–2026
              </p>
            </div>
          </div>
        </section>

        {/* Table of contents + chapters */}
        <section className="space-y-3">
          {/* TOC summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 px-6 py-4 text-center">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
              Table of Contents
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Student Handbook Academic Year 2025–2026
            </p>
          </div>

          {/* Chapters list */}
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              type="button"
              className="w-full bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FaBookOpen className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-semibold text-slate-900 leading-tight">
                    {chapter.title}
                  </p>
                  {chapter.subtitle && (
                    <p className="text-[11px] font-medium text-slate-800 leading-tight">
                      {chapter.subtitle}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-slate-500">
                    {chapter.sections} sections
                  </p>
                </div>
              </div>
              <span className="text-slate-400 text-xs">{'>'}</span>
            </button>
          ))}
        </section>
      </main>
    </div>
  )
}

export default HandbookPreview


