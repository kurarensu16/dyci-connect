import React from 'react'
import { FaUpload, FaFolderPlus, FaEllipsisV, FaFileAlt, FaFolder } from 'react-icons/fa'

interface StoredItem {
  id: string
  name: string
  sizeMb?: number
  date: string
  type: 'file' | 'folder'
}

const mockItems: StoredItem[] = [
  {
    id: '1',
    name: 'Syllabus_CS101.pdf',
    sizeMb: 2.5,
    date: '2025-12-05',
    type: 'file',
  },
  {
    id: '2',
    name: 'Lecture_Notes.docx',
    sizeMb: 1.2,
    date: '2025-12-04',
    type: 'file',
  },
  {
    id: '3',
    name: 'Assignment_1.pdf',
    sizeMb: 0.8,
    date: '2025-12-03',
    type: 'file',
  },
  {
    id: '4',
    name: 'Research Papers',
    date: '2025-12-01',
    type: 'folder',
  },
  {
    id: '5',
    name: 'Lab_Report.docx',
    sizeMb: 1.5,
    date: '2025-12-02',
    type: 'file',
  },
]

const Files: React.FC = () => {
  const usedMb = 6
  const totalMb = 500
  const usedPercent = (usedMb / totalMb) * 100

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <h1 className="text-xl font-semibold">Document Storage</h1>
          <p className="mt-1 text-xs text-blue-100">Secure file management</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        {/* Storage bar */}
        <section className="bg-white rounded-2xl shadow-md border border-slate-100 p-4">
          <div className="flex justify-between items-center text-xs text-slate-600 mb-2">
            <span>Storage Used</span>
            <span>
              {usedMb.toFixed(2)} MB / {totalMb} MB
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
          >
            <FaUpload className="mr-2 h-4 w-4" />
            Upload File
          </button>
          <button
            type="button"
            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm"
          >
            <FaFolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </button>
        </section>

        {/* File list */}
        <section className="space-y-3">
          {mockItems.map((item) => {
            const isFolder = item.type === 'folder'
            const Icon = isFolder ? FaFolder : FaFileAlt

            return (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                      isFolder ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      {isFolder
                        ? item.date
                        : `${item.sizeMb?.toFixed(2)} MB \u00A0\u00A0 ${item.date}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="More options"
                >
                  <FaEllipsisV className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export default Files


