'use client'

import { useState, useRef } from 'react'
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
import {
  MAX_BROWSER_TEXT_DOCUMENT_BYTES,
  isSupportedComplianceDocument,
} from '@/lib/utils/document-text'
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
          const event = new CustomEvent('query-submitted', {
            detail: { query: message.trim(), chatId }
          })
          window.dispatchEvent(event)
          
          await runRAGQuery(message.trim())
        }
      } else {
        // Compliance mode - process uploaded files from drag-drop store
        if (uploadedFiles.length > 0) {
          const chatId = await ensureActiveChat(message.trim() || 'Compliance Analysis')

          if (user) {
            await uploadToSupabase(user.id, chatId)
          }
          
          // Process each uploaded file
          uploadedFiles.forEach(uploadedFile => {
            const event = new CustomEvent('file-uploaded', { 
              detail: { 
                file: uploadedFile.file,
                query: message.trim() || `Analyze ${uploadedFile.file.name} for compliance`
              } 
            })
            window.dispatchEvent(event)
          })
          
          // Clear uploaded files after processing
          clearFiles()
        } else if (message.trim()) {
          // Text-only query - use RAG API
          const chatId = await ensureActiveChat(message.trim())
          const event = new CustomEvent('query-submitted', {
            detail: { query: message.trim(), chatId }
          })
          window.dispatchEvent(event)
          await runRAGQuery(message.trim())
        }
      }
      
      // Clear textarea after send
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
      showToast(error instanceof Error ? error.message : 'Failed to send message', 'error')
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!canAddMore()) {
        showToast('Maximum 3 documents allowed', 'error')
        e.target.value = ''
        return
      }

      if (file.size > MAX_BROWSER_TEXT_DOCUMENT_BYTES) {
        showToast('Maximum file size is 5MB', 'error')
        e.target.value = ''
        return
      }

      if (isSupportedComplianceDocument(file)) {
        addFiles([file])
        showToast(`${file.name} added. Click send to analyze.`, 'success')
        // Announce to screen readers
        const announcement = `File ${file.name} uploaded successfully`
        const liveRegion = document.createElement('div')
        liveRegion.setAttribute('role', 'status')
        liveRegion.setAttribute('aria-live', 'polite')
        liveRegion.className = 'sr-only'
        liveRegion.textContent = announcement
        document.body.appendChild(liveRegion)
        setTimeout(() => document.body.removeChild(liveRegion), 1000)
      } else {
        showToast('Please upload a valid file: PDF, MD, TXT, or Word document', 'error')
      }

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
      const event = new CustomEvent('deep-search-complete', {
        detail: {
          query,
          result,
        }
      })
      window.dispatchEvent(event)

      // Show success message
      const announcement = 'Deep search completed. Enhanced analysis available.'
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('role', 'status')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.className = 'sr-only'
      liveRegion.textContent = announcement
      document.body.appendChild(liveRegion)
      setTimeout(() => document.body.removeChild(liveRegion), 1000)

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
    ? 'Ask about Philippine compliance laws...'
    : 'Upload a document and ask about compliance...'

  return (
    <div className="border-t bg-white" role="region" aria-label="Message input">
      {/* Uploaded Files List - Shows files from drag-drop */}
      {uploadedFiles.length > 0 && (
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-5xl px-3 sm:px-4 py-3">
            <UploadedFilesList />
          </div>
        </div>
      )}
      
      <div className="mx-auto max-w-5xl space-y-3 p-3 sm:p-4">
        {/* Mode Toggle */}
        <div className="flex justify-center">
          <ChatModeToggle />
        </div>

        {/* Input Area */}
        <div className="flex items-end gap-2 rounded-lg border-2 border-slate-200 bg-white p-2 focus-within:border-iris-500 focus-within:ring-2 focus-within:ring-iris-100 transition-all">
          {/* File Upload Button (Compliance Mode Only) */}
          {mode === 'compliance' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.md,.txt,.doc,.docx"
                onChange={handleFileSelect}
                className="sr-only"
                id="file-upload"
                aria-label="Upload compliance document (PDF, Markdown, Text, or Word)"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2.5 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                aria-label="Upload compliance document"
                type="button"
              >
                <Paperclip className="h-5 w-5" aria-hidden="true" />
              </button>
            </>
          )}

          <label htmlFor="message-input" className="sr-only">
            {placeholder}
          </label>
          <textarea
            id="message-input"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isSending || loading || uploading}
            rows={1}
            aria-label={placeholder}
            aria-describedby="message-hint"
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50 transition-opacity"
            style={{
              minHeight: '44px',
              maxHeight: '100px',
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
              className="group relative flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-2.5 text-white shadow-lg shadow-purple-500/50 transition-all duration-200 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:scale-100 disabled:opacity-50 disabled:shadow-none"
              aria-label={isDeepSearching ? 'Performing deep search...' : 'Perform deep search'}
              type="button"
              title="Deep Search - Enhanced analysis with cross-references"
            >
              {/* Animated glow effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-200" />
              
              {isDeepSearching ? (
                <Loader2 className="h-5 w-5 animate-spin relative z-10" aria-hidden="true" />
              ) : (
                <Sparkles className="h-5 w-5 relative z-10 group-hover:animate-pulse" aria-hidden="true" />
              )}
              <span className="sr-only">{isDeepSearching ? 'Searching...' : 'Deep Search'}</span>
            </button>
          )}
          
          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={(!message.trim() && uploadedFiles.length === 0) || isSending || loading || uploading}
            className="group flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-primary p-2.5 text-primary-foreground transition-all duration-200 hover:scale-105 hover:bg-iris-700 hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100 disabled:hover:shadow-none"
            aria-label={isSending || loading || uploading ? 'Sending message...' : 'Send message'}
            type="submit"
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
