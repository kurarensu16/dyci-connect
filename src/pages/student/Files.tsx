import React, { useState, useRef, useEffect, useCallback } from 'react'
import { FaUpload, FaFolderPlus, FaEllipsisV, FaFileAlt, FaFolder, FaChevronLeft, FaTrash, FaTimes, FaDownload, FaSpinner, FaFilePdf, FaFileImage, FaFileVideo, FaFileAudio } from 'react-icons/fa'
import { supabase } from '../../lib/supabaseClient'

interface StoredItem {
  id: string
  name: string
  sizeMb?: number
  date: string
  type: 'file' | 'folder'
  originalId: string
  contentType?: string
}

type PreviewType = 'image' | 'pdf' | 'video' | 'audio' | 'text' | 'other'

const getPreviewType = (contentType: string): PreviewType => {
  if (contentType.startsWith('image/')) return 'image'
  if (contentType === 'application/pdf') return 'pdf'
  if (contentType.startsWith('video/')) return 'video'
  if (contentType.startsWith('audio/')) return 'audio'
  if (contentType.startsWith('text/') || contentType === 'application/json') return 'text'
  return 'other'
}

const getFileIcon = (contentType?: string) => {
  if (!contentType) return FaFileAlt
  if (contentType.startsWith('image/')) return FaFileImage
  if (contentType === 'application/pdf') return FaFilePdf
  if (contentType.startsWith('video/')) return FaFileVideo
  if (contentType.startsWith('audio/')) return FaFileAudio
  return FaFileAlt
}

const Files: React.FC = () => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [displayItems, setDisplayItems] = useState<StoredItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [usedBytes, setUsedBytes] = useState(0)

  const [isUploading, setIsUploading] = useState(false)
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Modal state
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [currentFolderName, setCurrentFolderName] = useState<string | null>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState('')
  const [previewContentType, setPreviewContentType] = useState('')
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const totalBytes = 500 * 1024 * 1024 // 500 MB limit
  const usedMb = usedBytes / (1024 * 1024)
  const totalMb = 500
  const usedPercent = Math.min((usedBytes / totalBytes) * 100, 100)

  // Fetch logic directly inside component
  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Fetch Folders
      let folderQuery = supabase.from('folders').select('*').eq('user_id', user.id)
      if (currentFolderId) {
        folderQuery = folderQuery.eq('parent_id', currentFolderId)
      } else {
        folderQuery = folderQuery.is('parent_id', null)
      }
      const { data: foldersData, error: foldersError } = await folderQuery.order('name')
      if (foldersError) throw foldersError

      // Fetch Files
      let fileQuery = supabase.from('files').select('*').eq('user_id', user.id)
      if (currentFolderId) {
        fileQuery = fileQuery.eq('folder_id', currentFolderId)
      } else {
        fileQuery = fileQuery.is('folder_id', null)
      }
      const { data: filesData, error: filesError } = await fileQuery.order('created_at', { ascending: false })
      if (filesError) throw filesError

      // Calculate total storage usage
      const { data: allFilesData, error: allFilesError } = await supabase
        .from('files')
        .select('size')
        .eq('user_id', user.id)

      if (allFilesError) throw allFilesError
      const total = allFilesData.reduce((acc: number, curr: { size: number | null }) => acc + (curr.size || 0), 0)

      setUsedBytes(total)

      // Transform into display items for UI mapping
      const combined: StoredItem[] = [
        ...(foldersData || []).map((f: any) => ({
          id: `folder-${f.id}`,
          originalId: f.id,
          name: f.name,
          date: new Date(f.created_at).toLocaleDateString(),
          type: 'folder' as const
        })),
        ...(filesData || []).map((f: any) => ({
          id: `file-${f.id}`,
          originalId: f.id,
          name: f.name,
          sizeMb: f.size / (1024 * 1024),
          date: new Date(f.created_at).toLocaleDateString(),
          type: 'file' as const,
          contentType: f.type || 'application/octet-stream'
        }))
      ]
      setDisplayItems(combined)

    } catch (err: any) {
      setError(err.message || 'Failed to fetch items')
    } finally {
      setLoading(false)
    }
  }, [currentFolderId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 25 * 1024 * 1024) {
      alert("File size exceeds 25MB limit")
      return
    }

    try {
      setIsUploading(true)
      setError(null)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // 1. Get Presigned URL
      const { data: uploadData, error: uploadFuncError } = await supabase.functions.invoke('files-upload-url', {
        body: {
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          fileSize: file.size,
          folderId: currentFolderId
        }
      })

      if (uploadFuncError) {
        console.error("RPC Raw Error Object:", uploadFuncError)
        let msg = uploadFuncError.message
        if (uploadFuncError instanceof Error && 'context' in (uploadFuncError as any)) {
          try {
            const context = (uploadFuncError as any).context;
            if (context && typeof context.json === 'function') {
              const errorBody = await context.json();
              msg += " | Server Error: " + JSON.stringify(errorBody);
            }
          } catch (e) {
            console.error("Failed to parse error body", e);
          }
        }
        throw new Error(`Edge Function failed: ${msg}`)
      }

      if (uploadData?.error) throw new Error(`Edge Function returned explicit error: ${uploadData.error}`)
      if (!uploadData?.uploadUrl) throw new Error(`Edge Function did not return an uploadUrl.`);

      // 2. Upload to R2
      const uploadResponse = await fetch(uploadData.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
      })
      if (!uploadResponse.ok) throw new Error(`Upload to R2 returned ${uploadResponse.status}`)

      // 3. Insert metadata
      const { error: dbError } = await supabase.from('files').insert({
        user_id: user.id,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        path: currentFolderId ? `${currentFolderId}/${file.name}` : file.name,
        object_key: uploadData.objectKey,
        folder_id: currentFolderId
      })

      if (dbError) throw dbError
      await fetchItems()

    } catch (err: any) {
      console.error("Upload error:", err)
      setError(err.message || 'Failed to upload file')
      alert(`Upload Error: ${err.message}`)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openFolderModal = () => {
    setNewFolderName('')
    setShowFolderModal(true)
    setTimeout(() => folderInputRef.current?.focus(), 100)
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return

    try {
      setIsCreatingFolder(true)
      setError(null)
      const { data, error: invokeError } = await supabase.functions.invoke('folders-create', {
        body: { name: newFolderName.trim(), parentId: currentFolderId }
      })

      if (invokeError) {
        console.error("RPC Raw Error Object:", invokeError)
        let msg = invokeError.message
        if (invokeError instanceof Error && 'context' in (invokeError as any)) {
          try {
            const context = (invokeError as any).context;
            if (context && typeof context.json === 'function') {
              const errorBody = await context.json();
              msg += " | Server Error: " + JSON.stringify(errorBody);
            }
          } catch (e) { }
        }
        throw new Error(`Failed to create folder: ${msg}`)
      }
      if (data?.error) throw new Error(data.error)

      setShowFolderModal(false)
      setNewFolderName('')
      await fetchItems()
    } catch (err: any) {
      console.error("Folder creation error:", err)
      setError(err.message || 'Failed to create folder')
      alert(`Folder Creation Error: ${err.message}`)
    } finally {
      setIsCreatingFolder(false)
    }
  }

  const handleDeleteItem = async (item: StoredItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const isFolder = item.type === 'folder'
    const confirmDelete = window.confirm(`Are you sure you want to delete this ${isFolder ? 'folder and its contents' : 'file'}?`)
    if (!confirmDelete) return

    try {
      setLoading(true)
      setError(null)
      if (isFolder) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        const { error: dbError } = await supabase.from('folders')
          .delete()
          .eq('id', item.originalId)
          .eq('user_id', user.id)
        if (dbError) throw dbError
      } else {
        const { error: invokeError } = await supabase.functions.invoke('files-delete', {
          body: { fileId: item.originalId }
        })
        if (invokeError) {
          console.error("RPC Raw Error Object:", invokeError)
          let msg = invokeError.message
          if (invokeError instanceof Error && 'context' in (invokeError as any)) {
            try {
              const context = (invokeError as any).context;
              if (context && typeof context.json === 'function') {
                const errorBody = await context.json();
                msg += " | Server Error: " + JSON.stringify(errorBody);
              }
            } catch (e) { }
          }
          throw new Error(`Failed to delete file: ${msg}`)
        }
      }
      await fetchItems()
    } catch (err: any) {
      console.error("Delete error:", err)
      setError(err.message || 'Failed to delete item')
      alert(`Delete Error: ${err.message}`)
    } finally {
      setLoading(false)
      setActionMenuOpenId(null)
    }
  }

  const toggleActionMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActionMenuOpenId(actionMenuOpenId === id ? null : id)
  }

  const navigateToFolder = async (folderId: string | null, folderName?: string) => {
    setCurrentFolderId(folderId)
    setCurrentFolderName(folderId ? (folderName || 'Folder') : null)
  }

  const handleFileClick = async (item: StoredItem) => {
    if (item.type === 'folder') return

    try {
      setIsLoadingPreview(true)
      setShowPreview(true)
      setPreviewFileName(item.name)
      setPreviewContentType(item.contentType || 'application/octet-stream')
      setPreviewUrl(null)

      const { data, error: invokeError } = await supabase.functions.invoke('files-view-url', {
        body: { fileId: item.originalId }
      })

      if (invokeError) throw new Error(`Failed to load preview: ${invokeError.message}`)
      if (data?.error) throw new Error(data.error)

      setPreviewUrl(data.viewUrl)
    } catch (err: any) {
      console.error('Preview error:', err)
      setError(err.message || 'Failed to load file preview')
      setShowPreview(false)
    } finally {
      setIsLoadingPreview(false)
    }
  }

  const closePreview = () => {
    setShowPreview(false)
    setPreviewUrl(null)
    setPreviewFileName('')
    setPreviewContentType('')
  }

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
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
            {error}
          </div>
        )}

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
              className={`h-full rounded-full transition-all duration-300 ${usedPercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-col sm:flex-row gap-3">
          {currentFolderId !== null && (
            <button
              onClick={() => navigateToFolder(null)}
              className="inline-flex items-center justify-center rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
              title="Back to root"
            >
              <FaChevronLeft className="mr-2 h-4 w-4" />
              Back
            </button>
          )}

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading || loading}
            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm disabled:opacity-50"
          >
            <FaUpload className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload File'}
          </button>

          <button
            type="button"
            onClick={openFolderModal}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center rounded-2xl bg-slate-700 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm disabled:opacity-50"
          >
            <FaFolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </button>
        </section>

        {/* Current location indicator */}
        {currentFolderId && (
          <div className="flex items-center text-sm text-slate-500 gap-1">
            <FaFolder className="h-3 w-3 text-amber-500" />
            <span>Current folder: <strong className="text-slate-700">{currentFolderName}</strong></span>
          </div>
        )}

        {/* File list */}
        <section className="space-y-3">
          {loading && !displayItems.length ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading items...</div>
          ) : displayItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-sm">No files or folders here yet.</div>
          ) : (
            displayItems.map((item) => {
              const isFolder = item.type === 'folder'
              const Icon = isFolder ? FaFolder : getFileIcon(item.contentType)

              return (
                <div
                  key={item.id}
                  onClick={() => isFolder ? navigateToFolder(item.originalId, item.name) : handleFileClick(item)}
                  className={`flex items-center justify-between bg-white rounded-2xl shadow-sm border border-slate-100 px-4 py-3 relative cursor-pointer hover:bg-slate-50 transition-colors`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center ${isFolder ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
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

                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => toggleActionMenu(item.id, e)}
                      className="text-slate-400 hover:text-slate-600 p-2 -mr-2 rounded-full hover:bg-slate-100"
                      aria-label="More options"
                    >
                      <FaEllipsisV className="h-4 w-4" />
                    </button>
                    {actionMenuOpenId === item.id && (
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-slate-100 z-10 py-1">
                        <button
                          onClick={(e) => handleDeleteItem(item, e)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <FaTrash className="mr-2 h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </section>
      </main>

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!isCreatingFolder) setShowFolderModal(false) }}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <FaFolderPlus className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Create New Folder</h2>
                  {currentFolderName && (
                    <p className="text-xs text-slate-500">Inside: {currentFolderName}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => { if (!isCreatingFolder) setShowFolderModal(false) }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <FaTimes className="h-4 w-4" />
              </button>
            </div>
            <div className="px-6 py-5">
              <label className="block text-sm font-medium text-slate-700 mb-2">Folder Name</label>
              <input
                ref={folderInputRef}
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) handleCreateFolder() }}
                placeholder="e.g. Semester 1 Documents"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                disabled={isCreatingFolder}
                maxLength={100}
              />
              <p className="mt-2 text-xs text-slate-400">{newFolderName.length}/100 characters</p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={() => setShowFolderModal(false)}
                disabled={isCreatingFolder}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingFolder ? 'Creating...' : 'Create Folder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closePreview} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  {React.createElement(getFileIcon(previewContentType), { className: 'h-4 w-4 text-blue-600' })}
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-slate-900 truncate">{previewFileName}</h2>
                  <p className="text-xs text-slate-400">{previewContentType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download={previewFileName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <FaDownload className="h-3 w-3" /> Download
                  </a>
                )}
                <button
                  onClick={closePreview}
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <FaTimes className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Preview Body */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-50 min-h-[300px]">
              {isLoadingPreview ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <FaSpinner className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Loading preview...</span>
                </div>
              ) : previewUrl ? (
                (() => {
                  const pType = getPreviewType(previewContentType)
                  switch (pType) {
                    case 'image':
                      return (
                        <img
                          src={previewUrl}
                          alt={previewFileName}
                          className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-sm"
                        />
                      )
                    case 'pdf':
                      return (
                        <iframe
                          src={previewUrl}
                          title={previewFileName}
                          className="w-full h-[70vh] rounded-lg border border-slate-200"
                        />
                      )
                    case 'video':
                      return (
                        <video controls className="max-w-full max-h-[70vh] rounded-lg shadow-sm">
                          <source src={previewUrl} type={previewContentType} />
                          Your browser does not support this video.
                        </video>
                      )
                    case 'audio':
                      return (
                        <div className="flex flex-col items-center gap-4 p-8">
                          <div className="h-24 w-24 rounded-2xl bg-blue-100 flex items-center justify-center">
                            <FaFileAudio className="h-10 w-10 text-blue-600" />
                          </div>
                          <p className="text-sm font-medium text-slate-700">{previewFileName}</p>
                          <audio controls className="w-full max-w-md">
                            <source src={previewUrl} type={previewContentType} />
                          </audio>
                        </div>
                      )
                    default:
                      return (
                        <div className="flex flex-col items-center gap-4 p-8 text-center">
                          <div className="h-20 w-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <FaFileAlt className="h-8 w-8 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-700">{previewFileName}</p>
                            <p className="text-xs text-slate-400 mt-1">Preview not available for this file type</p>
                          </div>
                          <a
                            href={previewUrl}
                            download={previewFileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                          >
                            <FaDownload className="h-3 w-3" /> Download File
                          </a>
                        </div>
                      )
                  }
                })()
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Files
