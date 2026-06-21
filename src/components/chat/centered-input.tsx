'use client'

import { useState, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useChatStore } from '@/lib/store/chat-store'
import { showToast } from '@/components/ui/toast'

interface CenteredInputProps {
  onSend: (message: string) => void
  placeholder?: string
  disabled?: boolean
  isTransitioning?: boolean
}

export function CenteredInput({ 
  onSend, 
  placeholder = "Ask about Philippine legal compliance...",
  disabled = false,
  isTransitioning = false
}: CenteredInputProps) {
  const [message, setMessage] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { mode } = useChatModeStore()
  const { uploadedFiles, clearFiles, uploadToSupabase, uploading } = useFileUploadStore()
  const { user } = useAuthStore()
  const { activeChat, createChat } = useChatStore()

  const handleSend = async () => {
    const query = message.trim()

    if ((!query && uploadedFiles.length === 0) || disabled || isSending || uploading) return
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
          const event = new CustomEvent('file-uploaded', {
            detail: {
              file: uploadedFile.file,
              query: query || `Analyze ${uploadedFile.file.name} for compliance`,
            },
          })
          window.dispatchEvent(event)
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (error) {
      console.error('Error sending message:', error)
      showToast(error instanceof Error ? error.message : 'Failed to send message', 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: isTransitioning ? 0 : 1, 
        y: 0 
      }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-3xl px-4"
    >
      <div
        className={`relative rounded-xl border bg-white transition-all duration-200 dark:bg-neutral-800 ${
          isFocused
            ? 'border-iris-500 shadow-lg shadow-iris-100 dark:border-iris-400 dark:shadow-black/30'
            : 'border-slate-200 shadow-md shadow-slate-200/60 dark:border-neutral-700 dark:shadow-black/20'
        }`}
      >
        <div className="flex items-end gap-2 p-2.5">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50 dark:text-slate-100 dark:placeholder:text-slate-500"
            style={{
              minHeight: '42px',
              maxHeight: '150px',
            }}
          />

          <button
            onClick={handleSend}
            disabled={(!message.trim() && uploadedFiles.length === 0) || disabled || isSending || uploading}
            className="flex-shrink-0 rounded-lg bg-iris-600 p-3 text-white transition-all duration-200 hover:bg-iris-700 hover:shadow-md active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-iris-600 dark:bg-iris-400 dark:text-neutral-900 dark:hover:bg-iris-300 dark:disabled:hover:bg-iris-400"
            aria-label="Send message"
          >
            {(disabled || isSending || uploading) ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
