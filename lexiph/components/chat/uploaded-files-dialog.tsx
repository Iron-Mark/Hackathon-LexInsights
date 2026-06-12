'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Eye, Trash2, Calendar, FileIcon, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'
import { showToast } from '@/components/ui/toast'

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

  // Load uploaded files from Supabase
  useEffect(() => {
    if (open && user) {
      fetchFiles()
    }
  }, [open, user, fetchFiles])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄'
    if (type.includes('word') || type.includes('document')) return '📝'
    if (type.includes('markdown') || type.includes('text')) return '📋'
    return '📁'
  }

  const getFileType = (fileName: string, mimeType: string) => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.pdf') || mimeType.includes('pdf')) return 'PDF'
    if (lower.endsWith('.docx') || mimeType.includes('wordprocessingml')) return 'Word'
    if (lower.endsWith('.doc') || mimeType.includes('msword')) return 'Word'
    if (lower.endsWith('.md') || mimeType.includes('markdown')) return 'MD'
    if (lower.endsWith('.txt') || mimeType.includes('text/plain')) return 'TXT'
    return 'File'
  }

  const handleView = async (file: UploadedFile) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 3600) // 1 hour expiry

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

      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('File downloaded', 'success')
    } catch (error) {
      console.error('Error downloading file:', error)
      showToast('Failed to download file', 'error')
    }
  }

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return

    setDeletingId(fileId)
    try {
      const file = files.find(f => f.id === fileId)
      if (!file) return

      const supabase = createClient()

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.storage_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', fileId)

      if (dbError) throw dbError

      setFiles(files.filter(f => f.id !== fileId))
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
      <DialogContent className="max-w-3xl max-h-[75vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-iris-600" />
            Uploaded Files
          </DialogTitle>
          <DialogDescription>
            View and manage your uploaded documents
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-iris-600" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileIcon className="h-16 w-16 mx-auto mb-3 text-slate-300" />
              <p className="text-lg font-medium">No files uploaded yet</p>
              <p className="text-sm mt-1">Upload documents to analyze them for compliance</p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:border-iris-300 hover:bg-iris-50/30 transition-colors group"
              >
                {/* File Icon */}
                <div className="text-3xl flex-shrink-0">
                  {getFileIcon(file.type)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 truncate">{file.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-iris-600 bg-iris-50 px-1.5 py-0.5 rounded text-[10px]">
                      {getFileType(file.name, file.type)}
                    </span>
                    <span>{formatFileSize(file.size)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleView(file)}
                    className="h-8 w-8"
                    title="View file"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDownload(file)}
                    className="h-8 w-8"
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                    title="Delete file"
                  >
                    {deletingId === file.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {files.length > 0 && (
          <div className="pt-3 border-t text-sm text-slate-500">
            Total: {files.length} file{files.length !== 1 ? 's' : ''} ({formatFileSize(files.reduce((acc, f) => acc + f.size, 0))})
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
