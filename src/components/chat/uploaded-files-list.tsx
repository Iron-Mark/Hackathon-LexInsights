'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X } from 'lucide-react'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { showToast } from '@/components/ui/toast'
import { formatFileSize, getDocumentFileType } from '@/lib/utils/browser-actions'

export function UploadedFilesList() {
  const { uploadedFiles, removeFile, maxFiles } = useFileUploadStore()

  const handleRemove = (id: string, fileName: string) => {
    removeFile(id)
    showToast(`Removed ${fileName}`, 'info')
  }

  if (uploadedFiles.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-iris-200 bg-iris-50 px-3 py-1.5 dark:border-iris-400/30 dark:bg-iris-400/10">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-iris-600 animate-pulse" aria-hidden="true" />
          <span className="text-xs font-medium text-iris-900 dark:text-iris-100">Compliance Mode</span>
        </div>
        <span className="text-xs text-iris-700 dark:text-iris-200">
          {uploadedFiles.length}/{maxFiles} documents ready
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <AnimatePresence>
          {uploadedFiles.map((uploadedFile) => (
            <motion.div
              key={uploadedFile.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex flex-shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm transition-all hover:border-iris-300 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-iris-400/50 dark:hover:shadow-black/20"
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-iris-50 text-iris-600 dark:bg-iris-400/10 dark:text-iris-200">
                <FileText className="h-4 w-4" aria-hidden="true" />
              </div>

              <div className="flex min-w-0 flex-col">
                <p className="max-w-[120px] truncate text-xs font-medium text-slate-950 dark:text-slate-100">
                  {uploadedFile.file.name}
                </p>
                <div className="flex items-center gap-1">
                  <span className="rounded bg-iris-50 px-1 py-0.5 text-[10px] font-semibold text-iris-600 dark:bg-iris-400/10 dark:text-iris-200">
                    {getDocumentFileType(uploadedFile.file.name, uploadedFile.file.type)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {formatFileSize(uploadedFile.file.size)}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleRemove(uploadedFile.id, uploadedFile.file.name)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-slate-500 dark:hover:bg-red-400/10 dark:hover:text-red-300"
                aria-label={`Remove ${uploadedFile.file.name}`}
                type="button"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
