'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Eye, Trash2, Calendar, FileIcon, Loader2, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'
import { showToast } from '@/components/ui/toast'
import { downloadBlob, formatFileSize, getDocumentFileType } from '@/lib/utils/browser-actions'

interface UploadedFilesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  uploadedAt: string
  storage_path: string
}

interface DocumentRow {
  id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  created_at: string
}

export function UploadedFilesDialog({ open, onOpenChange }: UploadedFilesDialogProps) {
  const { user } = useAuthStore()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchFiles = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_size, file_type, storage_path, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedFiles: UploadedFile[] = ((data || []) as DocumentRow[]).map((doc) => ({
        id: doc.id,
        name: doc.file_name,
        size: doc.file_size,
        type: doc.file_type,
        uploadedAt: doc.created_at,
        storage_path: doc.storage_path
      }))

      setFiles(formattedFiles)
    } catch (error) {
      console.error('Error fetching files:', error)
      showToast('Failed to load files', 'error')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (open && user) {
      fetchFiles()
    }
  }, [open, user, fetchFiles])

  useEffect(() => {
    if (!open) {
      setConfirmDeleteId(null)
    }
  }, [open])

  const handleView = async (file: UploadedFile) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 3600)

      if (error) throw error

      window.open(data.signedUrl, '_blank')
    } catch (error) {
      console.error('Error viewing file:', error)
      showToast('Failed to open file', 'error')
    }
  }

  const handleDownload = async (file: UploadedFile) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('documents')
        .download(file.storage_path)

      if (error) throw error

      downloadBlob(data, file.name)

      showToast('File downloaded', 'success')
    } catch (error) {
      console.error('Error downloading file:', error)
      showToast('Failed to download file', 'error')
    }
  }

  const handleDelete = async (fileId: string) => {
    if (confirmDeleteId !== fileId) {
      setConfirmDeleteId(fileId)
      return
    }

    setDeletingId(fileId)
    try {
      const file = files.find(f => f.id === fileId)
      if (!file) return

      const supabase = createClient()

      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.storage_path])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      setFiles(currentFiles => currentFiles.filter(f => f.id !== fileId))
      setConfirmDeleteId(null)
      showToast('File deleted', 'success')
    } catch (error) {
      console.error('Error deleting file:', error)
      showToast('Failed to delete file', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[75vh] max-w-3xl flex-col overflow-hidden dark:border-iris-300/15 dark:bg-[#171322]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
            <FileText className="h-5 w-5 text-iris-600 dark:text-iris-200" aria-hidden="true" />
            Uploaded Files
          </DialogTitle>
          <DialogDescription>
            View and manage your uploaded documents
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-iris-600" aria-hidden="true" />
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <FileIcon className="mx-auto mb-3 h-16 w-16 text-slate-300 dark:text-slate-600" aria-hidden="true" />
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200">No files uploaded yet</p>
              <p className="mt-1 text-sm">Upload documents to analyze them for compliance</p>
            </div>
          ) : (
            files.map((file) => {
              const isConfirmingDelete = confirmDeleteId === file.id

              return (
                <div
                  key={file.id}
                  className="group flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-iris-300 hover:bg-iris-50/30 dark:border-iris-300/15 dark:hover:border-iris-400/50 dark:hover:bg-iris-400/10"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-iris-50 text-iris-600 dark:bg-iris-400/10 dark:text-iris-200">
                    <FileText className="h-5 w-5" aria-hidden="true" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="truncate font-medium text-slate-950 dark:text-slate-100">{file.name}</h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded bg-iris-50 px-1.5 py-0.5 text-[10px] font-semibold text-iris-600 dark:bg-iris-400/10 dark:text-iris-200">
                        {getDocumentFileType(file.name, file.type)}
                      </span>
                      <span>{formatFileSize(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    {isConfirmingDelete ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          className="h-10 w-10 text-red-600 transition-all hover:bg-red-50 hover:text-red-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:text-red-300 dark:hover:bg-red-400/10 dark:hover:text-red-200"
                          title="Confirm delete"
                          aria-label={`Confirm delete ${file.name}`}
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === file.id}
                          className="h-10 w-10 text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:active:scale-100 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-iris-200"
                          title="Cancel"
                          aria-label={`Cancel delete ${file.name}`}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleView(file)}
                          className="h-10 w-10 transition-all active:scale-95"
                          title="View file"
                          aria-label={`View ${file.name}`}
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(file)}
                          className="h-10 w-10 transition-all active:scale-95"
                          title="Download file"
                          aria-label={`Download ${file.name}`}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file.id)}
                          disabled={deletingId === file.id}
                          className="h-10 w-10 text-red-600 transition-all hover:bg-red-50 hover:text-red-700 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:text-red-300 dark:hover:bg-red-400/10 dark:hover:text-red-200"
                          title="Delete file"
                          aria-label={`Delete ${file.name}`}
                        >
                          {deletingId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {files.length > 0 && (
          <div className="border-t border-slate-200 pt-3 text-sm text-slate-500 dark:border-iris-300/15 dark:text-slate-400">
            Total: {files.length} file{files.length !== 1 ? 's' : ''} ({formatFileSize(files.reduce((acc, f) => acc + f.size, 0))})
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
