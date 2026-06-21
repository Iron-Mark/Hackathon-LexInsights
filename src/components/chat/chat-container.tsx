'use client'

import { useCallback, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatHeader } from '@/components/layout/chat-header'
import { ChatMessages, type PendingChatTurn } from './chat-messages'
import { ChatInput } from './chat-input'
import { ComplianceCanvas } from './compliance-canvas'
import { RAGProgress } from './rag-progress'
import { TypingIndicator, EnhancedLoading } from './loading-indicator'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useRAGStore } from '@/lib/store/rag-store'
import { useAuthStore } from '@/lib/store/auth-store'
import { useChatStore } from '@/lib/store/chat-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import type { Message } from '@/types'
import type { DeepSearchResponse } from '@/lib/services/deep-search-api'
import { checkDraft, type DraftCheckerResponse, type Finding, type RAGResponse } from '@/lib/services/rag-api'
import { AlertCircle, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DragDropOverlay } from './drag-drop-overlay'
import { showToast } from '@/components/ui/toast'
import { EmptyState } from './empty-state'
import { CenteredInput } from './centered-input'
import { extractComplianceDocumentText, type ExtractedDocumentText } from '@/lib/utils/document-text'
import {
  RAG_BACKEND_TOAST_ACTION,
  RAG_BACKEND_UNAVAILABLE_MESSAGE,
  isRagBackendUnavailableError,
} from '@/lib/services/rag-unavailable'

interface ChatContainerProps {
  messages: Message[]
}

const MIN_THINKING_DURATION_MS = 700

async function waitForThinkingWindow(startedAt: number) {
  const remainingMs = Math.max(0, MIN_THINKING_DURATION_MS - (Date.now() - startedAt))

  if (remainingMs > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, remainingMs))
  }
}

function formatAnalysisDate() {
  return new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatFindings(title: string, findings: Finding[]) {
  if (findings.length === 0) {
    return [`## ${title}`, '', 'No findings returned for this category.', '']
  }

  return [
    `## ${title}`,
    '',
    ...findings.flatMap((finding, index) => [
      `### ${index + 1}. ${finding.title}`,
      `- Status: ${finding.status}`,
      `- Category: ${finding.category}`,
      `- Severity Score: ${finding.severity_score}`,
      `- Description: ${finding.description}`,
      `- References: ${finding.references.length > 0 ? finding.references.join('; ') : 'None provided'}`,
      `- Recommendation: ${finding.recommendation}`,
      '',
    ]),
  ]
}

function formatDraftCheckerReport(
  fileName: string,
  query: string,
  response: DraftCheckerResponse,
  extraction?: Pick<ExtractedDocumentText, 'extractionMode' | 'warnings'>
) {
  const { analysis } = response
  const timestamp = new Date().toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })

  return [
    '# Compliance Analysis Report',
    '',
    '## Analysis Source',
    '',
    `- Document: ${fileName}`,
    `- Analysis Date: ${timestamp}`,
    `- Query: ${query}`,
    `- Draft Title: ${analysis.draft_title}`,
    extraction ? `- Text Extraction: ${formatExtractionMode(extraction.extractionMode)}` : null,
    `- Processing Time: ${analysis.processing_time_seconds.toFixed(1)}s`,
    analysis.documents_searched !== undefined ? `- Documents Searched: ${analysis.documents_searched}` : null,
    analysis.chunks_analyzed !== undefined ? `- Chunks Analyzed: ${analysis.chunks_analyzed}` : null,
    analysis.keywords_extracted !== undefined ? `- Keywords Extracted: ${analysis.keywords_extracted}` : null,
    extraction && extraction.warnings.length > 0 ? `- Extraction Warnings: ${extraction.warnings.join('; ')}` : null,
    '',
    '## Overall Assessment',
    '',
    `Compliance Score: ${analysis.compliance_score}%`,
    '',
    analysis.overall_assessment,
    '',
    analysis.summary ? '## Summary' : null,
    analysis.summary ? '' : null,
    analysis.summary || null,
    analysis.summary ? '' : null,
    '## Findings Summary',
    '',
    `- Total Findings: ${analysis.total_findings}`,
    `- Green: ${analysis.green_count}`,
    `- Amber: ${analysis.amber_count}`,
    `- Red: ${analysis.red_count}`,
    '',
    ...formatFindings('Green Findings', analysis.green_findings),
    ...formatFindings('Amber Findings', analysis.amber_findings),
    ...formatFindings('Red Findings', analysis.red_findings),
    '## Legal Disclaimer',
    '',
    'This generated analysis is for informational purposes only. It is not legal advice and should be verified against official sources and qualified legal counsel before any compliance decision.',
  ].filter((line): line is string => line !== null).join('\n')
}

function formatExtractionMode(mode: ExtractedDocumentText['extractionMode']) {
  switch (mode) {
    case 'browser-text':
      return 'Browser text/Markdown'
    case 'server-pdf':
      return 'Server PDF text extraction'
    case 'server-docx':
      return 'Server DOCX text extraction'
    case 'server-doc':
      return 'Server legacy DOC text extraction'
  }
}

function buildComplianceUnavailableReport(fileName: string, query: string, reason: string) {
  const timestamp = formatAnalysisDate()

  return `# Compliance Analysis Unavailable

## Analysis Source

- Document: ${fileName}
- Analysis Date: ${timestamp}
- Query: ${query}

## Status

Browser-readable compliance analysis could not be completed.

## Reason

${reason}

## What This Means

No compliance report was generated for this file. Plain text and Markdown drafts can be reviewed locally. PDF and Word files are sent to the internal document-text route for extraction before draft checks run.

## Legal Disclaimer

This status message is not legal advice. Submit documents to qualified counsel or the appropriate government agency for official review.`
}

function buildDeepSearchOnlyReport(fileName: string, query: string) {
  return `# Deep Search Results

## Analysis Source

- Document: ${fileName}
- Analysis Date: ${formatAnalysisDate()}
- Query: ${query}

## Status

Deep Search results are available in the section above. For a full local draft check, upload a plain text, Markdown, PDF, or Word file.`
}

export function ChatContainer({ messages: initialMessages }: ChatContainerProps) {
  const { mode } = useChatModeStore()
  const { user } = useAuthStore()
  const { 
    currentQuery: ragCurrentQuery,
    currentResponse, 
    loading, 
    error, 
    wsConnected,
    wsEvents, 
    submitQuery, 
    clearError,
    connectWebSocket,
    disconnectWebSocket,
    sendWebSocketQuery,
    checkHealth,
  } = useRAGStore()
  const { activeChat, messages: chatMessages, fetchMessages, loadingMessages, createChat, addRAGMessage, addRAGMessageToChat } = useChatStore()
  const { addFiles, canAddMore } = useFileUploadStore()
  
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasContent, setCanvasContent] = useState('')
  const [canvasFileName, setCanvasFileName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [deepSearchResult, setDeepSearchResult] = useState<DeepSearchResponse | null>(null)
  const [currentQuery, setCurrentQuery] = useState<string>('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pendingTurns, setPendingTurns] = useState<Array<PendingChatTurn & { chatId: string }>>([])
  const pendingRAGTargetRef = useRef<{ query: string; chatId: string; startedAt: number } | null>(null)
  const checkedRAGHealthRef = useRef(false)

  const ensureActiveChat = async (fallbackTitle: string) => {
    const currentChat = useChatStore.getState().activeChat

    if (currentChat?.id) {
      return currentChat.id
    }

    const newChat = await createChat(fallbackTitle)
    return newChat.id
  }

  const runRAGQuery = (query: string) => {
    if (mode === 'compliance' && wsConnected) {
      sendWebSocketQuery(query, user?.id)
      return
    }

    void submitQuery(query, user?.id)
  }

  const addPendingTurn = useCallback((chatId: string, query: string) => {
    setPendingTurns((currentTurns) => {
      const existingTurn = currentTurns.find((turn) => turn.chatId === chatId && turn.query === query)

      if (existingTurn) {
        return currentTurns
      }

      return [
        ...currentTurns,
        {
          id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          chatId,
          query,
          createdAt: new Date().toISOString(),
        },
      ]
    })
  }, [])

  const removePendingTurn = useCallback((chatId: string, query: string) => {
    setPendingTurns((currentTurns) =>
      currentTurns.filter((turn) => !(turn.chatId === chatId && turn.query === query))
    )
  }, [])

  // Handle file drop - only add to list, don't process yet
  const handleFileDrop = (files: File[]) => {
    if (!canAddMore()) {
      showToast('Maximum 3 documents allowed', 'error')
      return
    }

    // Validate file sizes (5MB limit)
    const maxSize = 5 * 1024 * 1024 // 5MB in bytes
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      showToast(`Some files exceed 5MB limit and were not added`, 'error')
    }

    const validFiles = files.filter(file => file.size <= maxSize)
    
    if (validFiles.length > 0) {
      addFiles(validFiles)
      showToast(`${validFiles.length} document(s) added. Click send to analyze.`, 'success')
    }
  }

  // Get messages for active chat
  const messages = activeChat ? (chatMessages[activeChat.id] || []) : initialMessages
  const visiblePendingTurns = activeChat
    ? pendingTurns.filter((turn) => turn.chatId === activeChat.id)
    : []
  const hasMessages = messages.length > 0 || visiblePendingTurns.length > 0

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat && !chatMessages[activeChat.id]) {
      fetchMessages(activeChat.id)
    }
  }, [activeChat, chatMessages, fetchMessages])

  useEffect(() => {
    if (mode !== 'compliance') {
      disconnectWebSocket()
      return
    }

    if (!checkedRAGHealthRef.current) {
      checkedRAGHealthRef.current = true
      void checkHealth().catch((error) => {
        console.error('RAG health check failed:', error)
      })
    }

    connectWebSocket()

    return () => {
      disconnectWebSocket()
    }
  }, [mode, checkHealth, connectWebSocket, disconnectWebSocket])

  // Handle prompt selection from empty state
  const handlePromptSelect = async (prompt: string) => {
    try {
      const chatId = await ensureActiveChat(prompt)
      pendingRAGTargetRef.current = { query: prompt, chatId, startedAt: Date.now() }
    } catch (error) {
      console.error('Failed to prepare chat for prompt:', error)
      showToast(error instanceof Error ? error.message : 'Failed to start chat', 'error')
      return
    }

    // Dispatch event to notify container
    const event = new CustomEvent('query-submitted', {
      detail: { query: prompt, chatId: pendingRAGTargetRef.current?.chatId }
    })
    window.dispatchEvent(event)
    
    runRAGQuery(prompt)
  }

  // Handle centered input send
  const handleCenteredSend = async (message: string) => {
    const query = message.trim()

    if (!query) {
      return
    }

    try {
      const chatId = await ensureActiveChat(query)
      pendingRAGTargetRef.current = { query, chatId, startedAt: Date.now() }
    } catch (error) {
      console.error('Failed to prepare chat for centered input:', error)
      showToast(error instanceof Error ? error.message : 'Failed to start chat', 'error')
      return
    }

    // Start transition animation
    setIsTransitioning(true)
    
    // Close sidebar on send (always, not just mobile)
    const sidebarStore = useSidebarStore.getState()
    sidebarStore.close()
    
    // Dispatch event to notify container
    const event = new CustomEvent('query-submitted', {
      detail: { query, chatId: pendingRAGTargetRef.current?.chatId }
    })
    window.dispatchEvent(event)
    
    runRAGQuery(query)
    
    // Reset transition after animation
    setTimeout(() => setIsTransitioning(false), 300)
  }

  // Show canvas when we have a RAG response in compliance mode
  useEffect(() => {
    if (mode === 'compliance' && currentResponse) {
      setShowCanvas(true)
      setCanvasContent(currentResponse.summary)
      setCanvasFileName('rag-analysis')
    } else if (mode !== 'compliance') {
      setShowCanvas(false)
      setCanvasContent('')
      setCanvasFileName('')
    }
  }, [mode, currentResponse])

  // Add RAG responses to messages in general mode
  // Note: This is handled by the chat store now, but keeping for backward compatibility
  useEffect(() => {
    if (currentResponse && mode === 'general' && currentQuery) {
      // Messages are now managed by the store
      // This effect is kept for any additional UI updates needed
      setCurrentQuery('')
    }
  }, [currentResponse, mode, currentQuery])

  // Listen for query submissions
  useEffect(() => {
    const handleQuerySubmit = (event: Event) => {
      const customEvent = event as CustomEvent<{ query: string; chatId?: string }>
      const { query, chatId } = customEvent.detail
      setCurrentQuery(query)

      if (chatId) {
        pendingRAGTargetRef.current = { query, chatId, startedAt: Date.now() }
        addPendingTurn(chatId, query)
      }
    }

    window.addEventListener('query-submitted', handleQuerySubmit)
    
    return () => {
      window.removeEventListener('query-submitted', handleQuerySubmit)
    }
  }, [addPendingTurn])

  // Persist RAG responses into the active chat when the RAG store completes a query.
  useEffect(() => {
    const handleRAGResponse = (event: Event) => {
      const customEvent = event as CustomEvent<{ query: string; response: RAGResponse }>
      const { query, response } = customEvent.detail
      const pendingTarget = pendingRAGTargetRef.current

      if (pendingTarget?.query === query) {
        pendingRAGTargetRef.current = null
        void (async () => {
          await waitForThinkingWindow(pendingTarget.startedAt)
          await addRAGMessageToChat(pendingTarget.chatId, query, response)
        })().finally(() => {
          removePendingTurn(pendingTarget.chatId, query)
        })
        return
      }

      void addRAGMessage(query, response).finally(() => {
        const currentChatId = useChatStore.getState().activeChat?.id

        if (currentChatId) {
          removePendingTurn(currentChatId, query)
        }
      })
    }

    window.addEventListener('rag-response', handleRAGResponse)

    return () => {
      window.removeEventListener('rag-response', handleRAGResponse)
    }
  }, [addRAGMessage, addRAGMessageToChat, removePendingTurn])

  // Listen for file upload and deep search events
  useEffect(() => {
    const handleFileUpload = async (event: Event) => {
      const customEvent = event as CustomEvent<{ file: File; query: string }>
      const { file, query } = customEvent.detail
      
      // Show loading state
      setIsProcessing(true)
      setShowCanvas(true)
      setCanvasContent('') // Clear previous content
      setCanvasFileName(file.name)
      setDeepSearchResult(null) // Clear previous deep search
      
      try {
        const extractedDocument = await extractComplianceDocumentText(file)

        const response = await checkDraft({
          draft_markdown: extractedDocument.text,
          user_id: user?.id || 'compliance-user',
          include_summary: true,
        })

        if (response.status !== 'success') {
          throw new Error(response.error || 'Draft Checker returned an error response.')
        }

        setCanvasContent(formatDraftCheckerReport(file.name, query, response, extractedDocument))
        showToast(`Compliance analysis complete for ${file.name}`, 'success')

        const announcement = `Compliance analysis complete for ${file.name}`
        const liveRegion = document.createElement('div')
        liveRegion.setAttribute('role', 'status')
        liveRegion.setAttribute('aria-live', 'polite')
        liveRegion.className = 'sr-only'
        liveRegion.textContent = announcement
        document.body.appendChild(liveRegion)
        setTimeout(() => document.body.removeChild(liveRegion), 1000)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown Draft Checker error'
        setCanvasContent(buildComplianceUnavailableReport(file.name, query, errorMessage))
        if (isRagBackendUnavailableError(error)) {
          showToast(RAG_BACKEND_UNAVAILABLE_MESSAGE, 'info', {
            action: RAG_BACKEND_TOAST_ACTION,
            durationMs: 10000,
          })
        } else {
          showToast('Compliance analysis unavailable', 'error')
        }
      } finally {
        setIsProcessing(false)
      }
    }

    // DEEP SEARCH EVENT HANDLER - This is where deep search results are processed
    const handleDeepSearchComplete = (event: Event) => {
      const customEvent = event as CustomEvent<{
        query: string
        result: DeepSearchResponse
        file?: File
      }>
      const { query, result, file } = customEvent.detail
      
      // Store deep search result for display
      setDeepSearchResult(result)
      
      if (mode === 'compliance') {
        // COMPLIANCE MODE: Show deep search results in canvas
        if (file) {
          setShowCanvas(true)
          setCanvasFileName(file.name)
          
          // Keep the canvas open even when a full document analysis has not run.
          if (!canvasContent) {
            setCanvasContent(buildDeepSearchOnlyReport(file.name, query))
          }
        }
      } else {
        // GENERAL MODE: Deep search results are handled by the RAG store
        // Messages are automatically added through the submitQuery flow
      }
    }

    window.addEventListener('file-uploaded', handleFileUpload)
    window.addEventListener('deep-search-complete', handleDeepSearchComplete)
    
    return () => {
      window.removeEventListener('file-uploaded', handleFileUpload)
      window.removeEventListener('deep-search-complete', handleDeepSearchComplete)
    }
  }, [mode, canvasContent, user?.id])

  // Toggle canvas visibility
  const toggleCanvas = () => {
    setShowCanvas(!showCanvas)
  }

  // Handle retry for errors
  const handleRetry = () => {
    const retryQuery = (ragCurrentQuery || currentQuery).trim()
    clearError()

    if (!retryQuery) {
      return
    }

    if (activeChat?.id && !pendingRAGTargetRef.current) {
      pendingRAGTargetRef.current = { query: retryQuery, chatId: activeChat.id, startedAt: Date.now() }
      addPendingTurn(activeChat.id, retryQuery)
    }

    runRAGQuery(retryQuery)
  }

  // In compliance mode with canvas, show split view
  const isComplianceWithCanvas = mode === 'compliance' && showCanvas && canvasContent

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* Drag and Drop Overlay */}
      <DragDropOverlay onFileDrop={handleFileDrop} maxFiles={3} />
      
      <ChatHeader />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area - 40% width in compliance mode with canvas, full width otherwise */}
        <div 
          className={`flex flex-col ${
            isComplianceWithCanvas ? 'w-full lg:w-[40%]' : 'w-full'
          } transition-all duration-300 overflow-hidden`}
        >
          <div className="flex w-full flex-1 flex-col overflow-hidden">
            <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 flex-shrink-0">
            {/* RAG Loading State */}
            <AnimatePresence>
              {loading && mode === 'compliance' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm"
                >
                  <RAGProgress 
                    events={wsEvents} 
                    isComplete={false} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* RAG Error State */}
            <AnimatePresence>
              {error && mode === 'compliance' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-body text-sm text-red-800">{error}</p>
                      <Button
                        onClick={handleRetry}
                        variant="outline"
                        size="sm"
                        className="mt-2"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <EnhancedLoading stage="searching" />
              </div>
            ) : null}
            </div>
            
            {/* Messages with scrollbar on far right OR Empty State */}
            {!loadingMessages && (
              <div className="flex-1 overflow-y-auto">
                {hasMessages ? (
                  <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
                    <ChatMessages messages={messages} pendingTurns={visiblePendingTurns} />
                    
                    <AnimatePresence>
                      {isProcessing && (
                        <div className="mt-4 flex justify-start">
                          <TypingIndicator />
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  /* Empty State with Centered Input */
                  <motion.div 
                    className="flex h-full flex-col justify-start py-12 sm:py-16"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: isTransitioning ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-7">
                      {/* 1. Greeting and assistant text */}
                      <EmptyState onPromptSelect={handlePromptSelect} />
                      
                      {/* 2. Centered Input */}
                      <CenteredInput 
                        onSend={handleCenteredSend}
                        disabled={loading}
                        isTransitioning={isTransitioning}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>
          {/* Only show ChatInput when there are messages */}
          {hasMessages && <ChatInput />}
        </div>

        {/* Canvas Toggle Button - Icon Only */}
        <AnimatePresence>
          {mode === 'compliance' && canvasContent && canvasFileName && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
              onClick={toggleCanvas}
              className={cn(
                'fixed right-4 top-20 z-30 rounded-full bg-iris-600 p-2.5 text-white shadow-md transition-all hover:bg-iris-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2',
                showCanvas && 'lg:right-[calc(60%+1rem)]'
              )}
              aria-label={showCanvas ? 'Close compliance analysis' : 'Open compliance analysis'}
              title={showCanvas ? 'Close Analysis' : 'View Analysis'}
            >
              <AnimatePresence mode="wait">
                {showCanvas ? (
                  <motion.svg 
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-4 w-4" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </motion.svg>
                ) : (
                  <motion.div
                    key="open"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <FileText className="h-4 w-4" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Compliance Canvas - 60% width, only shown when there's content */}
        <AnimatePresence>
          {mode === 'compliance' && showCanvas && canvasContent && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="hidden lg:block lg:w-[60%] relative"
            >
              <ComplianceCanvas 
                content={canvasContent}
                fileName={canvasFileName}
                ragResponse={currentResponse || undefined}
                searchQueries={currentResponse?.search_queries_used}
                documentCount={currentResponse?.documents_found}
                deepSearchResult={deepSearchResult}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
