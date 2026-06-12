'use client'

import { useState, useRef } from 'react'
import { Send, Paperclip, X, Loader2, Sparkles } from 'lucide-react'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useRAGStore } from '@/lib/store/rag-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { ChatModeToggle } from './chat-mode-toggle'
import { performDeepSearch } from '@/lib/services/deep-search-api'
import { UploadedFilesList } from './uploaded-files-list'

export function ChatInput() {
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isDeepSearching, setIsDeepSearching] = useState(false)
  const { mode, uploadedFile, setUploadedFile } = useChatModeStore()
  const { submitQuery, loading } = useRAGStore()
  const { user } = useAuthStore()
  const { isMobile, close } = useSidebarStore()
  const { uploadedFiles, clearFiles } = useFileUploadStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    if ((!message.trim() && !uploadedFile && uploadedFiles.length === 0) || isSending || loading) return

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
          console.log('Calling RAG API with message:', message)
          
          // Dispatch event to notify container
          const event = new CustomEvent('query-submitted', {
            detail: { query: message.trim() }
          })
          window.dispatchEvent(event)
          
          await submitQuery(message.trim(), user?.id)
        }
      } else {
        // Compliance mode - process uploaded files from drag-drop store
        if (uploadedFiles.length > 0) {
          console.log('Processing uploaded files:', uploadedFiles.length)
          
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
        } else if (uploadedFile) {
          // Legacy single file upload
          console.log('Processing compliance file:', uploadedFile.name)
          const event = new CustomEvent('file-uploaded', { 
            detail: { 
              file: uploadedFile,
              query: message.trim() || 'Analyze this document for compliance'
            } 
          })
          window.dispatchEvent(event)
        } else if (message.trim()) {
          // Text-only query - use RAG API
          await submitQuery(message.trim(), user?.id)
        }
      }
      
      // Clear textarea after send
      setMessage('')
      // Only clear file in compliance mode
      if (mode === 'compliance') {
        setUploadedFile(null)
      }
    } catch (error) {
      console.error('Error sending message:', error)
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
      // Validate file type
      const validTypes = [
        'application/pdf',
        'text/markdown',
        'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/msword'
      ]
      
      if (validTypes.includes(file.type) || file.name.endsWith('.md')) {
        setUploadedFile(file)
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
        alert('Please upload a valid file: PDF, MD, TXT, or Word document')
      }
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDeepSearch = async () => {
    if (!message.trim() && !uploadedFile) {
      alert('Please enter a query or upload a document first')
      return
    }

    setIsDeepSearching(true)

    try {
      const query = message.trim() || 'Perform comprehensive analysis'
      const context = uploadedFile ? `Analyzing file: ${uploadedFile.name}` : undefined

      const result = await performDeepSearch({
        query,
        context,
        document_name: uploadedFile?.name,
        user_id: user?.id || 'chat-user',
        max_results: 50
      })

      // Dispatch event with deep search results
      const event = new CustomEvent('deep-search-complete', {
        detail: {
          query,
          result,
          file: uploadedFile
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
      alert('Deep search failed. Please try again.')
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

        {/* File Upload Preview (Compliance Mode) */}
        {mode === 'compliance' && uploadedFile && (
          <div 
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
            role="status"
            aria-label={`Uploaded file: ${uploadedFile.name}`}
          >
            <Paperclip className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span className="flex-1 truncate text-sm text-slate-700">
              {uploadedFile.name}
            </span>
            <button
              onClick={handleRemoveFile}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-colors"
              aria-label={`Remove file ${uploadedFile.name}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

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
                className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
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
            disabled={isSending || loading}
            rows={1}
            aria-label={placeholder}
            aria-describedby="message-hint"
            className="flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none disabled:opacity-50 transition-opacity"
            style={{
              minHeight: '36px',
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
              disabled={!message.trim() || isDeepSearching || isSending || loading}
              className="relative rounded-lg bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-2 text-white shadow-lg shadow-purple-500/50 transition-all duration-200 hover:shadow-xl hover:shadow-purple-500/60 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:scale-100 min-h-[40px] min-w-[40px] flex items-center justify-center group"
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
            disabled={(!message.trim() && !uploadedFile) || isSending || loading}
            className="rounded-lg bg-primary p-2 text-primary-foreground transition-all duration-200 hover:bg-iris-700 hover:shadow-md hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:hover:scale-100 disabled:hover:shadow-none min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label={isSending || loading ? 'Sending message...' : 'Send message'}
            type="submit"
          >
            {isSending || loading ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            )}
            <span className="sr-only">{isSending || loading ? 'Sending...' : 'Send'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
