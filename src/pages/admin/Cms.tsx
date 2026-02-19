import React, { useState } from 'react'
import {
  FaPlus,
  FaSave,
  FaTrash,
  FaBook,
  FaFileAlt,
  FaEye,
  FaCode,
} from 'react-icons/fa'
import toast from 'react-hot-toast'
import {
  handbookData as initialData,
  type HandbookChapter,
  type HandbookSection,
} from '../../data/handbookData'

const Cms: React.FC = () => {
  // Local state for editing (simulating DB)
  const [chapters, setChapters] = useState<HandbookChapter[]>(initialData)
  const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null)
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState(false)

  // Derived state
  const selectedChapter = chapters.find((c) => c.id === selectedChapterId)
  const selectedSection = selectedChapter?.sections.find(
    (s) => s.id === selectedSectionId
  )

  // -- Actions --

  const handleAddChapter = () => {
    const newId = Math.max(...chapters.map((c) => c.id), 0) + 1
    const newChapter: HandbookChapter = {
      id: newId,
      title: `CHAPTER ${newId}`,
      subtitle: 'NEW CHAPTER',
      sections: [],
    }
    setChapters([...chapters, newChapter])
    setSelectedChapterId(newId)
    setSelectedSectionId(null)
    toast.success('New chapter added')
  }

  const handleAddSection = () => {
    if (!selectedChapter) return
    const newId = `${selectedChapter.id}.${selectedChapter.sections.length + 1}`
    const newSection: HandbookSection = {
      id: newId,
      title: 'New Section',
      content: '<p>Start writing content here...</p>',
    }
    const updatedChapter = {
      ...selectedChapter,
      sections: [...selectedChapter.sections, newSection],
    }
    setChapters(chapters.map((c) => (c.id === selectedChapter.id ? updatedChapter : c)))
    setSelectedSectionId(newId)
    toast.success('New section added')
  }

  const handleUpdateChapter = (key: keyof HandbookChapter, value: any) => {
    if (!selectedChapter) return
    const updated = { ...selectedChapter, [key]: value }
    setChapters(chapters.map((c) => (c.id === selectedChapter.id ? updated : c)))
  }

  const handleUpdateSection = (key: keyof HandbookSection, value: any) => {
    if (!selectedChapter || !selectedSection) return
    const updatedSection = { ...selectedSection, [key]: value }
    const updatedChapter = {
      ...selectedChapter,
      sections: selectedChapter.sections.map((s) =>
        s.id === selectedSection.id ? updatedSection : s
      ),
    }
    setChapters(chapters.map((c) => (c.id === selectedChapter.id ? updatedChapter : c)))
  }

  const handleDeleteChapter = (id: number) => {
    if (confirm('Are you sure you want to delete this chapter?')) {
      setChapters(chapters.filter((c) => c.id !== id))
      if (selectedChapterId === id) {
        setSelectedChapterId(null)
        setSelectedSectionId(null)
      }
      toast.success('Chapter deleted')
    }
  }

  const handleDeleteSection = (chapterId: number, sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      const chapter = chapters.find((c) => c.id === chapterId)
      if (!chapter) return
      const updatedChapter = {
        ...chapter,
        sections: chapter.sections.filter((s) => s.id !== sectionId),
      }
      setChapters(chapters.map((c) => (c.id === chapterId ? updatedChapter : c)))
      if (selectedSectionId === sectionId) {
        setSelectedSectionId(null)
      }
      toast.success('Section deleted')
    }
  }

  const handleSave = () => {
    // In a real app, this would make an API call
    console.log('Saved data:', chapters)
    toast.success('Changes saved (local mock)')
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">Handbook CMS</h1>
          <p className="mt-1 text-xs text-blue-100">
            Manage handbook chapters and sections
          </p>
        </div>
      </header>

      <div className="bg-slate-50">
        <div className="max-w-6xl mx-auto px-6 py-2 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <FaSave className="text-xs" />
            Save Changes
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 grid grid-cols-12 gap-6 overflow-hidden">

        {/* Sidebar: Hierarchy Tree */}
        <aside className="col-span-12 md:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Structure
            </span>
            <button
              onClick={handleAddChapter}
              className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
            >
              <FaPlus className="text-[10px]" /> Chapter
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="space-y-1">
                {/* Chapter Item */}
                <div
                  className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${selectedChapterId === chapter.id && !selectedSectionId
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  onClick={() => {
                    setSelectedChapterId(chapter.id)
                    setSelectedSectionId(null)
                  }}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FaBook className={`text-xs ${selectedChapterId === chapter.id ? 'text-blue-500' : 'text-slate-400'
                      }`} />
                    <span className="truncate">{chapter.title}</span>
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedChapterId(chapter.id)
                        handleAddSection()
                      }}
                      title="Add Section"
                      className="p-1 hover:bg-blue-200 rounded text-blue-600"
                    >
                      <FaPlus className="text-[10px]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteChapter(chapter.id)
                      }}
                      className="p-1 hover:bg-rose-200 rounded text-rose-500 ml-1"
                    >
                      <FaTrash className="text-[10px]" />
                    </button>
                  </div>
                </div>

                {/* Sections List */}
                {selectedChapterId === chapter.id && (
                  <div className="ml-4 border-l border-slate-200 pl-2 space-y-1">
                    {chapter.sections.length === 0 && (
                      <p className="text-[10px] text-slate-400 italic px-2 py-1">No sections</p>
                    )}
                    {chapter.sections.map((section) => (
                      <div
                        key={section.id}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm transition-colors ${selectedSectionId === section.id
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'hover:bg-slate-50 text-slate-600'
                          }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedChapterId(chapter.id)
                          setSelectedSectionId(section.id)
                        }}
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FaFileAlt className={`text-xs ${selectedSectionId === section.id ? 'text-blue-400' : 'text-slate-300'
                            }`} />
                          <span className="truncate">{section.title}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSection(chapter.id, section.id)
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-200 rounded text-rose-500 transition-opacity"
                        >
                          <FaTrash className="text-[10px]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content: Editor */}
        <section className="col-span-12 md:col-span-9 flex flex-col gap-4 h-full overflow-hidden">
          {/* Default State */}
          {!selectedChapter && (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
              <FaBook className="h-10 w-10 mb-3 opacity-20" />
              <p>Select a chapter or section to start editing</p>
            </div>
          )}

          {/* Chapter Editor */}
          {selectedChapter && !selectedSection && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FaBook className="text-blue-500" />
                Edit Chapter
              </h2>
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Chapter Title (e.g., Chapter 1)
                  </label>
                  <input
                    type="text"
                    value={selectedChapter.title}
                    onChange={(e) => handleUpdateChapter('title', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                    Chapter Subtitle (e.g., Introduction)
                  </label>
                  <input
                    type="text"
                    value={selectedChapter.subtitle}
                    onChange={(e) => handleUpdateChapter('subtitle', e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section Editor */}
          {selectedSection && (
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-300">
              {/* Editor Toolbar */}
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">Section Editor</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs text-slate-500 font-mono">{selectedSection.id}</span>
                </div>
                <div className="flex bg-slate-200 rounded-lg p-1">
                  <button
                    onClick={() => setPreviewMode(false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!previewMode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                      }`}
                  >
                    <FaCode /> Code
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${previewMode ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
                      }`}
                  >
                    <FaEye /> Preview
                  </button>
                </div>
              </div>

              <div className="p-4 border-b border-slate-100">
                <input
                  type="text"
                  value={selectedSection.title}
                  onChange={(e) => handleUpdateSection('title', e.target.value)}
                  className="w-full text-lg font-bold text-slate-800 border-none px-0 focus:ring-0 placeholder-slate-300"
                  placeholder="Section Title"
                />
              </div>

              <div className="flex-1 overflow-hidden relative">
                {previewMode ? (
                  <div className="h-full overflow-y-auto p-4 prose prose-sm prose-slate max-w-none">
                    <div dangerouslySetInnerHTML={{ __html: selectedSection.content }} />
                  </div>
                ) : (
                  <textarea
                    value={selectedSection.content}
                    onChange={(e) => handleUpdateSection('content', e.target.value)}
                    className="w-full h-full p-4 font-mono text-sm resize-none focus:outline-none text-slate-700"
                    placeholder="<html> Enter content here... </html>"
                  />
                )}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Cms


