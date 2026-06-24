'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { getValidComplianceDocuments } from '@/lib/utils/compliance-upload'

interface DragDropOverlayProps {
  onFileDrop: (files: File[]) => void
  maxFiles?: number
}

export function DragDropOverlay({ onFileDrop, maxFiles = 3 }: DragDropOverlayProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [, setDragCounter] = useState(0)
  const { setMode } = useChatModeStore()

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      // Check if dragging files
      if (e.dataTransfer?.types.includes('Files')) {
        setDragCounter(prev => prev + 1)
        setIsDragging(true)
      }
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      setDragCounter(prev => {
        const newCounter = prev - 1
        if (newCounter === 0) {
          setIsDragging(false)
        }
        return newCounter
      })
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      
      setIsDragging(false)
      setDragCounter(0)

      const files = Array.from(e.dataTransfer?.files || [])
      
      const { acceptedFiles } = getValidComplianceDocuments(files, maxFiles)

      if (acceptedFiles.length > 0) {
        // Switch to compliance mode
        setMode('compliance')
        
        // Pass files to parent
        onFileDrop(acceptedFiles)
      }
    }

    // Add event listeners to document
    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [onFileDrop, maxFiles, setMode])

  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
          style={{ pointerEvents: 'none' }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative mx-4 max-w-2xl w-full"
          >
            {/* Main Drop Zone */}
            <div className="relative rounded-2xl border-4 border-dashed border-iris-400 bg-white/95 p-12 shadow-2xl dark:bg-[#171322]/95">
              {/* Animated Background */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-iris-50 to-purple-50 opacity-50 dark:from-iris-400/10 dark:to-purple-400/10" />
              
              {/* Content */}
              <div className="relative flex flex-col items-center gap-6 text-center">
                {/* Icon */}
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="rounded-full bg-gradient-to-br from-iris-500 to-purple-500 p-6 shadow-lg"
                >
                  <Upload className="h-12 w-12 text-white" />
                </motion.div>

                {/* Text */}
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-950 dark:text-slate-100">
                    Drop Your Documents Here
                  </h3>
                  <p className="text-base text-slate-600 dark:text-slate-300">
                    Release to upload and analyze for compliance
                  </p>
                </div>

                {/* Supported Files */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-iris-300/15 dark:bg-[#241f32]">
                    <FileText className="h-4 w-4 text-iris-600 dark:text-iris-200" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">PDF</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-iris-300/15 dark:bg-[#241f32]">
                    <FileText className="h-4 w-4 text-iris-600 dark:text-iris-200" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Word</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-iris-300/15 dark:bg-[#241f32]">
                    <FileText className="h-4 w-4 text-iris-600 dark:text-iris-200" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Markdown</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm dark:border-iris-300/15 dark:bg-[#241f32]">
                    <FileText className="h-4 w-4 text-iris-600 dark:text-iris-200" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Text</span>
                  </div>
                </div>

                {/* Limit Notice */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 dark:border-amber-400/30 dark:bg-amber-400/10">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-200" />
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-100">
                      Maximum {maxFiles} documents at a time
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 dark:border-blue-400/30 dark:bg-blue-400/10">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-200" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-100">
                      Maximum 5MB per file
                    </span>
                  </div>
                </div>
              </div>

              {/* Animated Border Glow */}
              <motion.div
                animate={{
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.02, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 rounded-2xl border-4 border-iris-400 opacity-50"
                style={{ pointerEvents: 'none' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
