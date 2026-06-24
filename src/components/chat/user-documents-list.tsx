'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Trash2, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/store/auth-store'
import { showToast } from '@/components/ui/toast'
import { downloadBlob, formatFileSize, formatShortDate, getDocumentFileType } from '@/lib/utils/browser-actions'

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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!user) {
      setDocuments([])
      setLoading(false)
      return
    }

    setLoading(true)
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
    fetchDocuments()
  }, [fetchDocuments])

  const handleDownload = async (doc: Document) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)

      if (error) throw error

      downloadBlob(data, doc.file_name)

      showToast('Document downloaded', 'success')
    } catch (error) {
      console.error('Error downloading document:', error)
      showToast('Failed to download document', 'error')
    }
  }

  const handleDelete = async (doc: Document) => {
    if (confirmDeleteId !== doc.id) {
      setConfirmDeleteId(doc.id)
      return
    }

    setDeletingId(doc.id)

    try {
      const supabase = createClient()

      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([doc.storage_path])

      if (storageError) throw storageError

      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError

      setDocuments(docs => docs.filter(d => d.id !== doc.id))
      setConfirmDeleteId(null)
      showToast('Document deleted', 'success')
    } catch (error) {
      console.error('Error deleting document:', error)
      showToast('Failed to delete document', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-iris-600 dark:text-iris-200" aria-hidden="true" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="py-8 text-center">
        <FileText className="mx-auto mb-3 h-12 w-12 text-slate-300 dark:text-slate-600" aria-hidden="true" />
        <p className="text-sm text-slate-500 dark:text-slate-300">No documents uploaded yet</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          Upload documents in compliance mode to see them here
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {documents.map((doc) => {
          const isConfirmingDelete = confirmDeleteId === doc.id

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition-all hover:border-iris-300 hover:shadow-sm dark:border-iris-300/15 dark:bg-[#241f32] dark:hover:border-iris-400/50 dark:hover:shadow-iris-950/20"
            >
              <FileText className="h-5 w-5 flex-shrink-0 text-iris-600 dark:text-iris-200" aria-hidden="true" />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-950 dark:text-slate-100">
                  {doc.file_name}
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="rounded bg-iris-50 px-1.5 py-0.5 text-[10px] font-semibold text-iris-600 dark:bg-iris-400/10 dark:text-iris-200">
                    {getDocumentFileType(doc.file_name, doc.file_type)}
                  </span>
                  <span>{formatFileSize(doc.file_size)}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-iris-300/30" aria-hidden="true" />
                  <span>{formatShortDate(doc.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isConfirmingDelete ? (
                  <>
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-red-600 transition-all hover:bg-red-50 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:text-red-300 dark:hover:bg-red-400/10"
                      aria-label={`Confirm delete ${doc.file_name}`}
                      title="Confirm delete"
                      type="button"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === doc.id}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-iris-200"
                      aria-label={`Cancel delete ${doc.file_name}`}
                      title="Cancel"
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-slate-100 hover:text-iris-600 active:scale-95 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-iris-200"
                      aria-label={`Download ${doc.file_name}`}
                      title="Download"
                      type="button"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 transition-all hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:opacity-50 disabled:active:scale-100 dark:text-slate-300 dark:hover:bg-red-400/10 dark:hover:text-red-300"
                      aria-label={`Delete ${doc.file_name}`}
                      title="Delete"
                      type="button"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
