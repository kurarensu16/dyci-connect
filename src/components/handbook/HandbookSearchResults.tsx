import React from 'react'
import { FaChevronRight } from 'react-icons/fa'
import type { HandbookSearchHit } from '../../lib/handbookSearch'

type Props = {
  hits: HandbookSearchHit[]
  query: string
  onSelect: (hit: HandbookSearchHit) => void
}

const HandbookSearchResults: React.FC<Props> = ({ hits, query, onSelect }) => {
  if (hits.length === 0) {
    return (
      <div className="col-span-full py-12 text-center text-slate-500">
        <p className="text-sm">
          No sections match <span className="font-medium text-slate-700">"{query.trim()}"</span>.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Try different keywords, or search for words that appear in a section title or its text.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 mb-3">
        {hits.length} result{hits.length === 1 ? '' : 's'} for &quot;{query.trim()}&quot;
      </p>
      <ul className="space-y-2">
        {hits.map((hit) => {
          const { node, pathTitles, snippet } = hit
          const trail =
            pathTitles.length > 1 ? pathTitles.slice(0, -1).join(' › ') : null
          const isLeaf = node.children.length === 0

          return (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => onSelect(hit)}
                className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-400 hover:shadow-md transition-all flex items-start gap-3 group"
              >
                <div className="h-9 min-w-9 shrink-0 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-mono text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {node.id}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {node.title}
                    </span>
                    {!isLeaf && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        Section group
                      </span>
                    )}
                  </div>
                  {trail && (
                    <p className="text-xs text-slate-500 mt-1 truncate" title={trail}>
                      {trail}
                    </p>
                  )}
                  {snippet && (
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                      {snippet}
                    </p>
                  )}
                </div>
                <FaChevronRight className="text-slate-300 group-hover:text-blue-500 text-xs shrink-0 mt-1" />
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default HandbookSearchResults
