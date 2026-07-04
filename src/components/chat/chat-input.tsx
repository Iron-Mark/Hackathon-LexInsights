'use client'

import { useState, useRef, type ChangeEvent, type KeyboardEvent } from 'react'
import { Send, Paperclip, Loader2, Sparkles } from 'lucide-react'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useRAGStore } from '@/lib/store/rag-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { useChatStore } from '@/lib/store/chat-store'
import { ChatModeToggle } from './chat-mode-toggle'
import { performDeepSearch } from '@/lib/services/deep-search-api'
import { UploadedFilesList } from './uploaded-files-list'
import { showToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import {
  COMPLIANCE_DOCUMENT_ACCEPT,
  getComplianceDocumentRejection,
} from '@/lib/utils/compliance-upload'
import { announceToAssistiveTechnology } from '@/lib/utils/browser-actions'
import { useComposerTextarea } from '@/hooks/use-composer-textarea'
import { CHAT_EVENTS, dispatchChatEvent } from '@/lib/chat/events'
import {
  RAG_BACKEND_TOAST_ACTION,
  RAG_BACKEND_UNAVAILABLE_MESSAGE,
  isRagBackendUnavailableError,
} from '@/lib/services/rag-unavailable'

export function ChatInput() {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDeepSearching, setIsDeepSearching] = useState(false)
  const { mode } = useChatModeStore()
  const { submitQuery, sendWebSocketQuery, wsConnected, loading } = useRAGStore()
  const { user } = useAuthStore()
  const { isMobile, close } = useSidebarStore()
  const { uploadedFiles, addFiles, clearFiles, canAddMore, uploadToSupabase, uploading } = useFileUploadStore()
  const { activeChat, createChat, addMessage } = useChatStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const {
    textareaRef,
    resizeTextarea,
    resetTextarea,
    focusTextareaFromShellClick,
  } = useComposerTextarea(220)

  const ensureActiveChat = async (fallbackTitle: string) => {
    if (activeChat?.id) {
      return activeChat.id
    }

    const newChat = await createChat(fallbackTitle)
    return newChat.id
  }

  const runRAGQuery = async (query: string) => {
    if (mode === 'compliance' && wsConnected) {
      sendWebSocketQuery(query, user?.id)
      return
    }

    await submitQuery(query, user?.id)
  }

  const handleSend = async () => {
    if ((!message.trim() && uploadedFiles.length === 0) || isSending || loading || uploading) return

    // Close sidebar on mobile when sending message
    if (isMobile) {
      close()
    }

    setIsSending(true)
    
    try {
      // Both modes now use RAG API for text queries
      if (mode === 'general') {
        // General mode - use RAG API for Philippine law questions
        if (message.trim()) {
          const chatId = await ensureActiveChat(message.trim())
          
          // Dispatch event to notify container
          dispatchChatEvent(CHAT_EVENTS.querySubmitted, { query: message.trim(), chatId })
          
          await runRAGQuery(message.trim())
        }
      } else {
        // Compliance mode - process uploaded files from drag-drop store
        if (uploadedFiles.length > 0) {
          const chatId = await ensureActiveChat(message.trim() || 'Compliance Analysis')

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
          
          // Process each uploaded file
          uploadedFiles.forEach(uploadedFile => {
            dispatchChatEvent(CHAT_EVENTS.fileUploaded, {
              file: uploadedFile.file,
              query: message.trim() || `Analyze ${uploadedFile.file.name} for compliance`,
            })
          })
          
          // Clear uploaded files after processing
          clearFiles()
        } else if (message.trim()) {
          // Text-only query - use RAG API
          const chatId = await ensureActiveChat(message.trim())
          dispatchChatEvent(CHAT_EVENTS.querySubmitted, { query: message.trim(), chatId })
          await runRAGQuery(message.trim())
        }
      }
      
      // Clear textarea after send
      setMessage('')
      resetTextarea()
    } catch (error) {
      console.error('Error sending message:', error)
      showToast(error instanceof Error ? error.message : 'Failed to send message', 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleMessageChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    resizeTextarea(e.target)
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
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
  }

  const handleDeepSearch = async () => {
    if (!message.trim()) {
      showToast('Please enter a query first', 'error')
      return
    }

    setIsDeepSearching(true)

    try {
      const query = message.trim() || 'Perform comprehensive analysis'
      const chatId = await ensureActiveChat(query)

      const result = await performDeepSearch({
        query,
        user_id: user?.id || 'chat-user',
        max_results: 50
      })

      if (result.fallback_used) {
        showToast(RAG_BACKEND_UNAVAILABLE_MESSAGE, 'info', {
          action: RAG_BACKEND_TOAST_ACTION,
          durationMs: 7000,
        })
      }

      await addMessage(chatId, {
        role: 'user',
        content: query,
      })

      await addMessage(chatId, {
        role: 'assistant',
        content: result.enhanced_summary,
        metadata: {
          deepSearch: true,
          documentsSearched: result.documents_searched,
          providerMode: result.provider_mode,
          fallbackUsed: result.fallback_used,
          relatedDocuments: result.related_documents,
        },
      })

      // Dispatch event with deep search results
      dispatchChatEvent(CHAT_EVENTS.deepSearchComplete, { query, result })
      setMessage('')

      // Show success message
      announceToAssistiveTechnology('Deep search completed. Enhanced analysis available.')

    } catch (error) {
      console.error('Deep search failed:', error)
      if (isRagBackendUnavailableError(error)) {
        showToast(RAG_BACKEND_UNAVAILABLE_MESSAGE, 'info', {
          action: RAG_BACKEND_TOAST_ACTION,
          durationMs: 10000,
        })
      } else {
        showToast(error instanceof Error ? error.message : 'Deep search failed. Please try again.', 'error')
      }
    } finally {
      setIsDeepSearching(false)
    }
  }

  const placeholder = mode === 'general' 
    ? 'Ask about PH law...'
    : 'Upload or ask...'

  return (
    <div className="border-t border-[#8A82DC] bg-[#F8F6FF]/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgba(63,51,189,0.12)] backdrop-blur-xl dark:border-iris-300/15 dark:bg-[#171322]/95 dark:shadow-none" role="region" aria-label="Message input">
      {/* Uploaded Files List - Shows files from drag-drop */}
      {uploadedFiles.length > 0 && (
        <div className="border-b border-[#8A82DC]/80 bg-[#EFECFF]/70 dark:border-iris-300/15 dark:bg-[#1a1625]">
          <div className="mx-auto max-w-5xl px-3 sm:px-4 py-3">
            <UploadedFilesList />
            {!user && mode === 'compliance' && (
              <p className="mt-2 text-xs text-slate-700 dark:text-slate-400">
                Guest document checks are temporary and are not saved to an account.
              </p>
            )}
          </div>
        </div>
      )}
      
      <div className="mx-auto max-w-5xl cursor-text px-2.5 pb-3 pt-2.5 sm:p-4" onClick={focusTextareaFromShellClick}>
        {/* Input Area */}
        <div className="flex flex-wrap items-end gap-2 rounded-lg border-2 border-[#8A82DC] bg-[#FBFAFF]/95 p-2.5 shadow-sm shadow-iris-950/12 transition-all focus-within:border-iris-600 focus-within:shadow-md focus-within:shadow-iris-950/16 min-[360px]:flex-nowrap dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-none dark:focus-within:border-iris-400/35 dark:focus-within:ring-0">
          {/* File Upload Button (Compliance Mode Only) */}
          {mode === 'compliance' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept={COMPLIANCE_DOCUMENT_ACCEPT}
                onChange={handleFileSelect}
                className="sr-only"
                id="file-upload"
                aria-label="Upload compliance document (PDF, Markdown, Text, or Word)"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-12 min-w-12 items-center justify-center rounded-lg p-2.5 text-iris-700 transition-all hover:bg-[#EFECFF] hover:text-iris-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-1 sm:min-h-11 sm:min-w-11 dark:text-slate-300 dark:hover:bg-iris-400/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#241f32]"
                aria-label="Upload compliance document"
                type="button"
              >
                <Paperclip className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

          <ChatModeToggle />

          <label htmlFor="message-input" className="sr-only">
            {placeholder}
          </label>
          <textarea
            ref={textareaRef}
            id="message-input"
            value={message}
            onChange={handleMessageChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSending || loading || uploading}
            rows={1}
            aria-label={placeholder}
            aria-describedby="message-hint"
            className="scrollbar-none order-first min-w-0 basis-full flex-1 resize-none overflow-hidden bg-transparent px-2 py-3 text-base leading-6 text-slate-900 placeholder-slate-600 transition-opacity focus:outline-none disabled:opacity-50 min-[360px]:order-none min-[360px]:basis-auto sm:py-2 sm:text-sm dark:text-slate-100 dark:placeholder:text-slate-400"
            style={{
              minHeight: 'clamp(64px, 9dvh, 88px)',
              maxHeight: '220px',
              overflowY: 'hidden',
            }}
          />
          <span id="message-hint" className="sr-only">
            Press Enter to send, Shift+Enter for new line
          </span>
          
          {/* Deep Search Button (General Mode Only) */}
          {mode === 'general' && (
            <button
              onClick={handleDeepSearch}
              disabled={!message.trim() || isDeepSearching || isSending || loading || uploading}
              className="group ml-auto flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-lg border border-[#8A82DC] bg-[#EFECFF] px-3 py-2.5 text-iris-800 shadow-sm transition-all duration-200 hover:border-iris-600 hover:bg-iris-100 hover:text-iris-900 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-500 disabled:hover:shadow-sm min-[360px]:ml-0 sm:min-h-11 sm:min-w-[7rem] dark:border-iris-400/30 dark:bg-iris-400/10 dark:text-iris-200 dark:hover:border-iris-300/50 dark:hover:bg-iris-400/20 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#241f32] dark:disabled:border-iris-300/10 dark:disabled:bg-[#1a1625] dark:disabled:text-slate-600"
              aria-label={isDeepSearching ? 'Running deep research...' : 'Run deep research'}
              type="button"
              title="Run deep research"
            >
              {isDeepSearching ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-5 w-5 group-hover:animate-pulse" aria-hidden="true" />
              )}
              <span className="hidden text-sm font-semibold sm:inline">
                {isDeepSearching ? 'Researching' : 'Research'}
              </span>
            </button>
          )}
          
          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!message.trim() && uploadedFiles.length === 0) || isSending || loading || uploading}
            className={cn(
              'group flex min-h-12 min-w-12 items-center justify-center rounded-lg bg-primary p-2.5 text-primary-foreground transition-all duration-200 hover:scale-105 hover:bg-iris-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100 disabled:hover:shadow-none sm:min-h-11 sm:min-w-11 dark:hover:bg-iris-300 dark:focus-visible:ring-offset-[#241f32] dark:disabled:bg-[#39334a] dark:disabled:text-slate-500',
              mode !== 'general' && 'ml-auto min-[360px]:ml-0'
            )}
            aria-label={isSending || loading || uploading ? 'Sending standard message...' : 'Send standard message'}
            type="submit"
            title="Send standard message"
          >
            {isSending || loading || uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            )}
            <span className="sr-only">{isSending || loading || uploading ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
