'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Trash2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'
import { showToast } from '@/components/ui/toast'

interface Document {
  id: string
  file_name: string
  file_size: number
  file_type: string
  storage_path: string
  created_at: string
}

export function UserDocumentsList() {
  const { user } = useAuthStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!user) return

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      setDocuments(data || [])
    } catch (error) {
      console.error('Error fetching documents:', error)
      showToast('Failed to load documents', 'error')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [user, fetchDocuments])

  const handleDownload = async (doc: Document) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast('Document downloaded', 'success')
    } catch (error) {
      console.error('Error downloading document:', error)
      showToast('Failed to download document', 'error')
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete ${doc.file_name}?`)) return

    setDeletingId(doc.id)

    try {
      const supabase = createClient()

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path])

      if (storageError) throw storageError

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      setDocuments(docs => docs.filter(d => d.id !== doc.id))
      showToast('Document deleted', 'success')
    } catch (error) {
      console.error('Error deleting document:', error)
      showToast('Failed to delete document', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-iris-600" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500">No documents uploaded yet</p>
        <p className="text-xs text-slate-400 mt-1">
          Upload documents in compliance mode to see them here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {documents.map((doc) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:border-iris-300 hover:shadow-sm transition-all"
          >
            <FileText className="h-5 w-5 text-iris-600 flex-shrink-0" />
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {doc.file_name}
              </p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-iris-600 bg-iris-50 px-1.5 py-0.5 rounded text-[10px]">
                  {getFileType(doc.file_name, doc.file_type)}
                </span>
                <span>{formatFileSize(doc.file_size)}</span>
                <span>•</span>
                <span>{formatDate(doc.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleDownload(doc)}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-iris-600 transition-colors"
                aria-label={`Download ${doc.file_name}`}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </button>

              <button
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id}
                className="p-2 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label={`Delete ${doc.file_name}`}
                title="Delete"
              >
                {deletingId === doc.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
