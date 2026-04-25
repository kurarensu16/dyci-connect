import React from 'react'
import { FaSearch, FaChevronLeft } from 'react-icons/fa'

type Props = {
  showBack: boolean
  onBack: () => void
  searchQuery: string
  onSearchChange: (value: string) => void
  /** Shown when navigated and search is empty */
  breadcrumbText: string | null
}

export const HandbookSearchToolbar: React.FC<Props> = ({
  showBack,
  onBack,
  searchQuery,
  onSearchChange,
  breadcrumbText,
}) => {
  const trimmed = searchQuery.trim()
  
  return (
    <div className="max-w-6xl mx-auto px-6 pt-4 pb-2 flex flex-col gap-2">
      <div className="flex items-center gap-3 w-full min-w-0">
        {showBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm shrink-0"
          >
            <FaChevronLeft className="text-[10px]" />
            Back
          </button>
        )}
        <div className="relative flex-1 min-w-0">
          <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search all sections by title or keywords…"
            aria-label="Search handbook"
            autoComplete="off"
            className="w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-10 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all shadow-sm"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-lg leading-none"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>
      {breadcrumbText && !trimmed && (
        <p className="text-xs text-slate-400 truncate tracking-tight">
          {breadcrumbText}
        </p>
      )}
    </div>
  )
}

export default HandbookSearchToolbar
