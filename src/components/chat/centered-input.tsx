'use client'

import { useEffect, useState, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { Send, Loader2, Paperclip } from 'lucide-react'
import { motion } from 'framer-motion'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useChatStore } from '@/lib/store/chat-store'
import { showToast } from '@/components/ui/toast'
import { ChatModeToggle } from './chat-mode-toggle'
import { UploadedFilesList } from './uploaded-files-list'
import {
  COMPLIANCE_DOCUMENT_ACCEPT,
  getComplianceDocumentRejection,
} from '@/lib/utils/compliance-upload'
import { announceToAssistiveTechnology } from '@/lib/utils/browser-actions'
import { useComposerTextarea } from '@/hooks/use-composer-textarea'
import { CHAT_EVENTS, dispatchChatEvent } from '@/lib/chat/events'

interface CenteredInputProps {
  onSend: (message: string) => void
  placeholder?: string
  disabled?: boolean
  isTransitioning?: boolean
}

export function CenteredInput({ 
  onSend, 
  placeholder = "Ask about Philippine law...",
  disabled = false,
  isTransitioning = false
}: CenteredInputProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    textareaRef,
    resizeTextarea,
    resetTextarea,
    focusTextareaFromShellClick,
  } = useComposerTextarea(150)
  const { mode } = useChatModeStore()
  const { uploadedFiles, addFiles, clearFiles, canAddMore, uploadToSupabase, uploading } = useFileUploadStore()
  const { user } = useAuthStore()
  const { activeChat, createChat } = useChatStore()

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const handleSend = async () => {
    const query = message.trim()

    if ((!query && uploadedFiles.length === 0) || disabled || !isHydrated || isSending || uploading) return
    if (!query && mode !== 'compliance') {
      showToast('Please enter a query first', 'error')
      return
    }
    
    setIsSending(true)
    
    try {
      const hasComplianceFiles = mode === 'compliance' && uploadedFiles.length > 0

      // Create chat if none exists
      let chatId = activeChat?.id
      if (!chatId) {
        const newChat = await createChat(query || 'Compliance Analysis')
        chatId = newChat.id
      }

      // Upload files to Supabase if in compliance mode
      if (hasComplianceFiles) {
        if (user) {
          try {
            await uploadToSupabase(user.id, chatId)
          } catch (error) {
            console.warn('Supabase upload unavailable; running local document analysis only:', error)
            showToast('Supabase upload unavailable. Running a temporary local document check.', 'info')
          }
        } else {
          showToast('Guest document checks are temporary and not saved.', 'info')
        }

        uploadedFiles.forEach((uploadedFile) => {
          dispatchChatEvent(CHAT_EVENTS.fileUploaded, {
            file: uploadedFile.file,
            query: query || `Analyze ${uploadedFile.file.name} for compliance`,
          })
        })
      }

      if (query && !hasComplianceFiles) {
        onSend(query)
      }

      setMessage('')
      
      // Clear files after sending
      if (uploadedFiles.length > 0) {
        clearFiles()
      }
      
      // Reset textarea height
      resetTextarea()
    } catch (error) {
      console.error('Error sending message:', error)
      showToast(error instanceof Error ? error.message : 'Failed to send message', 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    resizeTextarea(e.target)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    const rejection = getComplianceDocumentRejection(file, canAddMore())

    if (rejection) {
      showToast(rejection, 'error')
      e.target.value = ''
      return
    }

    addFiles([file])
    showToast(`${file.name} added. Click send to analyze.`, 'success')
    announceToAssistiveTechnology(`File ${file.name} uploaded successfully`)
    e.target.value = ''
  }

  const effectivePlaceholder = mode === 'compliance'
    ? 'Upload or ask compliance...'
    : placeholder

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isTransitioning ? 0 : 1, 
        y: 0 
      }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto mx-auto w-full max-w-3xl px-4 pb-[env(safe-area-inset-bottom)] sm:pb-0"
    >
      <label htmlFor="centered-message-input" className="sr-only">
        {effectivePlaceholder}
      </label>
      <div
        onClick={focusTextareaFromShellClick}
        className={`relative rounded-xl border bg-white transition-all duration-200 dark:bg-neutral-800 ${
          isFocused
            ? 'border-iris-500 shadow-lg shadow-iris-100 dark:border-iris-400 dark:shadow-black/30'
            : 'border-slate-200 shadow-md shadow-slate-200/60 dark:border-neutral-700 dark:shadow-black/20'
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-2.5 py-2 dark:border-white/10">
          <ChatModeToggle showLabelOnMobile />

          {mode === 'compliance' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={COMPLIANCE_DOCUMENT_ACCEPT}
                onChange={handleFileSelect}
                className="sr-only"
                id="centered-file-upload"
                aria-label="Upload compliance document (PDF, Markdown, Text, or Word)"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:border-iris-300 hover:bg-iris-50 hover:text-iris-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-neutral-950/80 dark:text-slate-200 dark:hover:border-iris-400/50 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-neutral-800"
                aria-label="Upload compliance document"
                type="button"
              >
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                <span className="hidden min-[380px]:inline">Attach</span>
              </button>
            </>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/70 p-2.5 dark:border-white/10 dark:bg-neutral-900/70">
            <UploadedFilesList />
            {!user && mode === 'compliance' && (
              <p className="mt-2 px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Guest document checks are temporary and are not saved to an account.
              </p>
            )}
          </div>
        )}

        <div className="flex items-end gap-2 p-2.5">
          <textarea
            id="centered-message-input"
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={effectivePlaceholder}
            disabled={disabled || !isHydrated}
            rows={1}
            aria-label={effectivePlaceholder}
            aria-describedby="centered-message-disclaimer"
            className="scrollbar-none min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-3 py-2.5 text-base leading-6 text-slate-900 placeholder-slate-500 focus:outline-none disabled:opacity-50 sm:text-sm dark:text-slate-100 dark:placeholder:text-slate-400"
            style={{
              minHeight: '48px',
              maxHeight: '150px',
              overflowY: 'hidden',
            }}
          />

          <button
            onClick={handleSend}
            disabled={(!message.trim() && uploadedFiles.length === 0) || disabled || !isHydrated || isSending || uploading}
            className="flex min-h-11 min-w-11 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg bg-iris-600 p-3 text-white transition-all duration-200 hover:bg-iris-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-iris-600 dark:bg-iris-400 dark:text-neutral-900 dark:hover:bg-iris-300 dark:focus-visible:ring-offset-neutral-800 dark:disabled:hover:bg-iris-400"
            aria-label="Send message"
            type="button"
          >
            {(disabled || isSending || uploading) ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <p
        id="centered-message-disclaimer"
        className="mx-auto mt-2 max-w-2xl px-2 text-center text-[11px] leading-5 text-slate-500 dark:text-slate-400"
      >
        LexInSight can make mistakes. Verify legal information with official sources; this is not legal advice.
      </p>
    </motion.div>
  )
}
