import React, { useState, useMemo } from 'react'
import {
  FaBookOpen,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa'
import {
  handbookData,
  type HandbookChapter,
  type HandbookSection,
} from '../../data/handbookData'

const Handbook: React.FC = () => {
  const [activeChapter, setActiveChapter] = useState<HandbookChapter | null>(null)
  const [activeSection, setActiveSection] = useState<HandbookSection | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Reset section when chapter changes
  const handleChapterClick = (chapter: HandbookChapter) => {
    setActiveChapter(chapter)
    setActiveSection(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle section click
  const handleSectionClick = (section: HandbookSection) => {
    setActiveSection(section)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Go back to chapter list
  const handleBackToChapters = () => {
    setActiveChapter(null)
    setActiveSection(null)
  }

  // Go back to section list (from content)
  const handleBackToSections = () => {
    setActiveSection(null)
  }

  // Filter content based on search
  const filteredChapters = useMemo(() => {
    if (!searchQuery) return handbookData

    const query = searchQuery.toLowerCase()
    return handbookData
      .map((chapter) => {
        // Check if chapter title matches
        if (
          chapter.title.toLowerCase().includes(query) ||
          chapter.subtitle.toLowerCase().includes(query)
        ) {
          return chapter
        }

        // Check if any sections match
        const matchingSections = chapter.sections.filter(
          (section) =>
            section.title.toLowerCase().includes(query) ||
            section.content.toLowerCase().includes(query)
        )

        if (matchingSections.length > 0) {
          return { ...chapter, sections: matchingSections }
        }

        return null
      })
      .filter((c): c is HandbookChapter => c !== null)
  }, [searchQuery])

  // Get next/prev section for navigation
  const currentSectionIndex =
    activeChapter && activeSection
      ? activeChapter.sections.findIndex((s) => s.id === activeSection.id)
      : -1

  const nextSection =
    activeChapter && currentSectionIndex >= 0 && currentSectionIndex < activeChapter.sections.length - 1
      ? activeChapter.sections[currentSectionIndex + 1]
      : null

  const prevSection =
    activeChapter && currentSectionIndex > 0
      ? activeChapter.sections[currentSectionIndex - 1]
      : null

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                <span>Student Handbook</span>
              </h1>
              <p className="mt-1 text-xs text-blue-100">Academic Year 2025–2026</p>
            </div>
            {/* Breadcrumbs / Back navigation */}
            {(activeChapter || activeSection) && (
              <button
                onClick={activeSection ? handleBackToSections : handleBackToChapters}
                className="text-xs bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"
              >
                <FaChevronLeft className="text-[10px]" />
                Back
              </button>
            )}
          </div>
        </div>

        {/* Search bar (only show on home or if needed universally) */}
        {!activeSection && (
          <div className="bg-blue-800 pb-4">
            <div className="max-w-6xl mx-auto px-6">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-200" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search handbook topics..."
                  className="w-full rounded-xl bg-blue-700/50 border border-blue-500/30 pl-9 pr-3 py-2 text-sm text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-blue-700 transition-all"
                />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* VIEW 1: CHAPTER LIST (Home) */}
        {!activeChapter && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center mb-6">
              <div className="h-16 w-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <FaBookOpen className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">
                Welcome to the Student Handbook
              </h2>
              <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
                Your guide to academic policies, student conduct, and campus life at
                Dr. Yanga's Colleges, Inc.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {filteredChapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => handleChapterClick(chapter)}
                  className="group bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all text-left flex items-start gap-4"
                >
                  <div className="h-10 w-10 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    <span className="font-bold text-sm">{chapter.id}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {chapter.title}: {chapter.subtitle}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {chapter.sections.length} sections
                    </p>
                  </div>
                </button>
              ))}

              {filteredChapters.length === 0 && (
                <div className="col-span-full py-10 text-center text-slate-500">
                  No chapters found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: SECTION LIST (Chapter Selected) */}
        {activeChapter && !activeSection && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="mb-6">
              <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-md">
                Chapter {activeChapter.id}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 mt-2">
                {activeChapter.subtitle}
              </h2>
            </div>

            <div className="space-y-2">
              {activeChapter.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => handleSectionClick(section)}
                  className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-blue-400 hover:shadow-md transition-all flex items-center justify-between group"
                >
                  <span className="font-medium text-slate-700 group-hover:text-blue-700">
                    <span className="mr-2 opacity-60 text-sm">{section.id}</span>
                    {section.title}
                  </span>
                  <FaChevronRight className="text-slate-300 group-hover:text-blue-500 text-xs" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 3: CONTENT READER (Section Selected) */}
        {activeChapter && activeSection && (
          <div className="animate-in zoom-in-95 duration-300 max-w-4xl mx-auto">
            {/* Content Header */}
            <div className="bg-white rounded-t-2xl border-x border-t border-slate-200 p-6 pb-4">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                <span className="bg-slate-100 px-1.5 py-0.5 rounded">Chapter {activeChapter.id}</span>
                <span>/</span>
                <span>Section {activeSection.id}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {activeSection.title}
              </h2>
            </div>

            {/* Content Body */}
            <div className="bg-white rounded-b-2xl border border-slate-200 p-6 pt-2 shadow-sm min-h-[300px]">
              <div
                className="prose prose-sm prose-slate max-w-none prose-headings:text-slate-800 prose-p:text-slate-600 prose-li:text-slate-600"
                dangerouslySetInnerHTML={{ __html: activeSection.content }}
              />
            </div>

            {/* Navigation Footer */}
            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                onClick={() => prevSection ? handleSectionClick(prevSection) : handleBackToSections()}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border font-medium text-sm transition-colors ${prevSection
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  : 'bg-transparent border-transparent text-slate-400 hover:bg-slate-100' // "Back to list" style if no prev
                  }`}
              >
                <FaChevronLeft className="text-xs" />
                {prevSection ? 'Previous' : 'Back to List'}
              </button>

              {nextSection && (
                <button
                  onClick={() => handleSectionClick(nextSection)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 shadow-sm hover:shadow transition-colors"
                >
                  Next
                  <FaChevronRight className="text-xs" />
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Handbook



