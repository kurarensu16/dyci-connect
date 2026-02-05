import React from 'react'
import type { FileMetadata } from '../../../types'
import { FaFileAlt } from 'react-icons/fa'

interface RecentFilesProps {
  files: FileMetadata[]
}

const RecentFiles: React.FC<RecentFilesProps> = ({ files }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Files</h2>
      {files.length === 0 ? (
        <p className="text-gray-500 text-sm">No recent uploads yet.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {files.map((file) => (
            <li key={file.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-blue-50">
                  <FaFileAlt className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB ·{' '}
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <span className="text-xs text-gray-400">{file.type}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default RecentFiles


