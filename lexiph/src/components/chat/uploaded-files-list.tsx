'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { showToast } from '@/components/ui/toast'

export function UploadedFilesList() {
  const { uploadedFiles, removeFile, maxFiles } = useFileUploadStore()

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.pdf')) return '📄'
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return '📝'
    if (lower.endsWith('.md')) return '📋'
    if (lower.endsWith('.txt')) return '📃'
    return '📁'
  }

  const getFileType = (fileName: string) => {
    const lower = fileName.toLowerCase()
    if (lower.endsWith('.pdf')) return 'PDF'
    if (lower.endsWith('.docx')) return 'Word'
    if (lower.endsWith('.doc')) return 'Word'
    if (lower.endsWith('.md')) return 'MD'
    if (lower.endsWith('.txt')) return 'TXT'
    return 'File'
  }

  const handleRemove = (id: string, fileName: string) => {
    removeFile(id)
    showToast(`Removed ${fileName}`, 'info')
  }

  if (uploadedFiles.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Compliance Mode Indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-iris-50 border border-iris-200 rounded-lg">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full bg-iris-600 animate-pulse" />
          <span className="text-xs font-medium text-iris-900">Compliance Mode</span>
        </div>
        <span className="text-xs text-iris-700">
          {uploadedFiles.length}/{maxFiles} documents ready
        </span>
      </div>
      
      {/* Compact Single Row Files */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <AnimatePresence>
          {uploadedFiles.map((uploadedFile) => (
            <motion.div
              key={uploadedFile.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm hover:border-iris-300 hover:shadow-md transition-all flex-shrink-0"
            >
              {/* File Icon */}
              <div className="flex-shrink-0 text-base">
                {getFileIcon(uploadedFile.file.name)}
              </div>

              {/* File Info - Compact */}
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-medium text-slate-900 truncate max-w-[120px]">
                  {uploadedFile.file.name}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-iris-600 bg-iris-50 px-1 py-0.5 rounded">
                    {getFileType(uploadedFile.file.name)}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatFileSize(uploadedFile.file.size)}
                  </span>
                </div>
              </div>

              {/* Remove Button - Smaller */}
              <button
                onClick={() => handleRemove(uploadedFile.id, uploadedFile.file.name)}
                className="flex-shrink-0 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label={`Remove ${uploadedFile.file.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
