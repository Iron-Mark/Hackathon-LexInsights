'use client'

import { useCallback, useState, useEffect, useRef, type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react'
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
import { checkDraft, type DraftCheckerResponse, type Finding } from '@/lib/services/rag-api'
import { AlertCircle, ChevronDown, FileText } from 'lucide-react'
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
import { announceToAssistiveTechnology } from '@/lib/utils/browser-actions'
import { getValidComplianceDocuments } from '@/lib/utils/compliance-upload'
import {
  addChatEventListener,
  CHAT_EVENTS,
  dispatchChatEvent,
  type DeepSearchCompleteEventDetail,
  type FileUploadedEventDetail,
  type QuerySubmittedEventDetail,
  type RAGResponseEventDetail,
} from '@/lib/chat/events'

interface ChatContainerProps {
  messages: Message[]
}

const MIN_THINKING_DURATION_MS = 700
const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 160
const DEFAULT_CANVAS_WIDTH_PERCENT = 60
const MIN_CANVAS_WIDTH_PERCENT = 38
const MAX_CANVAS_WIDTH_PERCENT = 72
const CHAT_SURFACE_FOCUS_BLOCK_SELECTOR = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[role="menu"]',
  '[role="menuitem"]',
  '[role="menuitemradio"]',
  '[data-chat-content]',
  '[data-chat-no-background-focus]',
].join(',')

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

function clampCanvasWidthPercent(value: number) {
  return Math.min(MAX_CANVAS_WIDTH_PERCENT, Math.max(MIN_CANVAS_WIDTH_PERCENT, value))
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
  const { addFiles, uploadedFiles, maxFiles } = useFileUploadStore()
  
  const [showCanvas, setShowCanvas] = useState(false)
  const [canvasContent, setCanvasContent] = useState('')
  const [canvasFileName, setCanvasFileName] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [deepSearchResult, setDeepSearchResult] = useState<DeepSearchResponse | null>(null)
  const [currentQuery, setCurrentQuery] = useState<string>('')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [canvasWidthPercent, setCanvasWidthPercent] = useState(DEFAULT_CANVAS_WIDTH_PERCENT)
  const [isResizingCanvas, setIsResizingCanvas] = useState(false)
  const [pendingTurns, setPendingTurns] = useState<Array<PendingChatTurn & { chatId: string }>>([])
  const [revealingMessageIds, setRevealingMessageIds] = useState<Set<string>>(() => new Set())
  const pendingRAGTargetRef = useRef<{ query: string; chatId: string; startedAt: number } | null>(null)
  const checkedRAGHealthRef = useRef(false)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const canvasResizeCleanupRef = useRef<(() => void) | null>(null)
  const isNearBottomRef = useRef(true)
  const shouldFollowLatestRef = useRef(false)
  const scrollStateRef = useRef({
    conversationKey: '',
    messageCount: 0,
    pendingCount: 0,
  })
  const suppressInitialHistoryScrollRef = useRef(true)

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

  const removeRevealingMessage = useCallback((messageId: string) => {
    setRevealingMessageIds((currentIds) => {
      if (!currentIds.has(messageId)) {
        return currentIds
      }

      const nextIds = new Set(currentIds)
      nextIds.delete(messageId)
      return nextIds
    })
  }, [])

  const markLatestAssistantMessageForReveal = useCallback((chatId: string) => {
    const chatMessagesForId = useChatStore.getState().messages[chatId] || []
    const latestAssistantMessage = [...chatMessagesForId].reverse().find((message) => message.role === 'assistant')

    if (!latestAssistantMessage) {
      return
    }

    setRevealingMessageIds((currentIds) => {
      if (currentIds.has(latestAssistantMessage.id)) {
        return currentIds
      }

      const nextIds = new Set(currentIds)
      nextIds.add(latestAssistantMessage.id)
      return nextIds
    })

    window.setTimeout(() => {
      removeRevealingMessage(latestAssistantMessage.id)
    }, 60_000)
  }, [removeRevealingMessage])

  // Handle file drop - only add to list, don't process yet
  const handleFileDrop = (files: File[]) => {
    const availableSlots = maxFiles - uploadedFiles.length

    if (availableSlots <= 0) {
      showToast('Maximum 3 documents allowed', 'error')
      return
    }

    const { acceptedFiles, rejectedFiles } = getValidComplianceDocuments(files, availableSlots)

    if (rejectedFiles.length > 0) {
      const reasons = Array.from(new Set(rejectedFiles.map((rejection) => rejection.reason)))
      showToast(reasons.length === 1 ? reasons[0] : `${rejectedFiles.length} document(s) were not added`, 'error')
    }

    if (acceptedFiles.length > 0) {
      addFiles(acceptedFiles)
      showToast(`${acceptedFiles.length} document(s) added. Click send to analyze.`, 'success')
    }
  }

  // Get messages for active chat
  const messages = activeChat ? (chatMessages[activeChat.id] || []) : initialMessages
  const visiblePendingTurns = activeChat
    ? pendingTurns.filter((turn) => turn.chatId === activeChat.id)
    : []
  const hasMessages = messages.length > 0 || visiblePendingTurns.length > 0

  const updateScrollToBottomVisibility = useCallback(() => {
    const container = scrollContainerRef.current

    if (!container || !hasMessages) {
      setShowScrollToBottom(false)
      return
    }

    const distanceFromBottom = Math.max(0, container.scrollHeight - container.scrollTop - container.clientHeight)
    const isNearBottom = distanceFromBottom <= AUTO_SCROLL_BOTTOM_THRESHOLD_PX

    isNearBottomRef.current = isNearBottom
    setShowScrollToBottom(!isNearBottom)
  }, [hasMessages])

  const scrollToLatestMessage = useCallback(() => {
    const container = scrollContainerRef.current

    if (!container) {
      return
    }

    setShowScrollToBottom(false)
    container.scrollTo({
      top: container.scrollHeight,
      behavior: 'smooth',
    })
  }, [])

  const focusVisibleComposer = useCallback(() => {
    const inputId = hasMessages ? 'message-input' : 'centered-message-input'
    const input = document.getElementById(inputId)

    if (!(input instanceof HTMLTextAreaElement) || input.disabled) {
      return
    }

    input.focus({ preventScroll: true })
  }, [hasMessages])

  const handleChatSurfaceClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null

    if (!target || target.closest(CHAT_SURFACE_FOCUS_BLOCK_SELECTOR)) {
      return
    }

    if (window.getSelection()?.toString()) {
      return
    }

    focusVisibleComposer()
  }, [focusVisibleComposer])

  const beginCanvasResize = useCallback((clientX: number) => {
    const container = splitContainerRef.current

    if (!container) {
      return
    }

    const containerWidth = container.getBoundingClientRect().width
    const startClientX = clientX
    const startWidthPercent = canvasWidthPercent

    setIsResizingCanvas(true)

    canvasResizeCleanupRef.current?.()

    const previousCursor = document.body.style.cursor
    const previousUserSelect = document.body.style.userSelect

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      moveEvent.preventDefault()
      const deltaPercent = ((moveEvent.clientX - startClientX) / containerWidth) * 100
      setCanvasWidthPercent(clampCanvasWidthPercent(startWidthPercent - deltaPercent))
    }

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      moveEvent.preventDefault()
      const deltaPercent = ((moveEvent.clientX - startClientX) / containerWidth) * 100
      setCanvasWidthPercent(clampCanvasWidthPercent(startWidthPercent - deltaPercent))
    }

    const stopResizing = () => {
      setIsResizingCanvas(false)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousUserSelect
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResizing)
      window.removeEventListener('pointercancel', stopResizing)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResizing)
      canvasResizeCleanupRef.current = null
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResizing)
    window.addEventListener('pointercancel', stopResizing)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopResizing)

    canvasResizeCleanupRef.current = stopResizing
  }, [canvasWidthPercent])

  const startCanvasResize = useCallback((event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    beginCanvasResize(event.clientX)
  }, [beginCanvasResize])

  const startCanvasMouseResize = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0 || canvasResizeCleanupRef.current) {
      return
    }

    event.preventDefault()
    beginCanvasResize(event.clientX)
  }, [beginCanvasResize])

  const handleCanvasResizeKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 4

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setCanvasWidthPercent((currentWidth) => clampCanvasWidthPercent(currentWidth + step))
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setCanvasWidthPercent((currentWidth) => clampCanvasWidthPercent(currentWidth - step))
    }

    if (event.key === 'Home') {
      event.preventDefault()
      setCanvasWidthPercent(MAX_CANVAS_WIDTH_PERCENT)
    }

    if (event.key === 'End') {
      event.preventDefault()
      setCanvasWidthPercent(MIN_CANVAS_WIDTH_PERCENT)
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setCanvasWidthPercent(DEFAULT_CANVAS_WIDTH_PERCENT)
    }
  }, [])

  useEffect(() => () => {
    canvasResizeCleanupRef.current?.()
  }, [])

  // Fetch messages when active chat changes
  useEffect(() => {
    if (activeChat && !chatMessages[activeChat.id]) {
      fetchMessages(activeChat.id)
    }
  }, [activeChat, chatMessages, fetchMessages])

  useEffect(() => {
    const container = scrollContainerRef.current

    if (!container) {
      setShowScrollToBottom(false)
      return
    }

    updateScrollToBottomVisibility()
    container.addEventListener('scroll', updateScrollToBottomVisibility, { passive: true })

    return () => {
      container.removeEventListener('scroll', updateScrollToBottomVisibility)
    }
  }, [loadingMessages, updateScrollToBottomVisibility])

  useEffect(() => {
    updateScrollToBottomVisibility()

    const frameId = window.requestAnimationFrame(updateScrollToBottomVisibility)
    const timeoutId = window.setTimeout(updateScrollToBottomVisibility, 250)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [
    activeChat?.id,
    loadingMessages,
    messages.length,
    visiblePendingTurns.length,
    isProcessing,
    updateScrollToBottomVisibility,
  ])

  useEffect(() => {
    const conversationKey = activeChat?.id ?? 'initial'
    const nextState = {
      conversationKey,
      messageCount: messages.length,
      pendingCount: visiblePendingTurns.length,
    }
    const previousState = scrollStateRef.current
    const conversationChanged = previousState.conversationKey !== conversationKey

    if (conversationChanged) {
      scrollStateRef.current = nextState
      shouldFollowLatestRef.current = false
      suppressInitialHistoryScrollRef.current = true
      window.requestAnimationFrame(updateScrollToBottomVisibility)
      return
    }

    const pendingStarted = nextState.pendingCount > previousState.pendingCount
    const contentAdded =
      nextState.messageCount > previousState.messageCount ||
      pendingStarted

    if (pendingStarted) {
      shouldFollowLatestRef.current = true
    }

    if (
      contentAdded &&
      suppressInitialHistoryScrollRef.current &&
      previousState.messageCount === 0 &&
      previousState.pendingCount === 0 &&
      nextState.pendingCount === 0
    ) {
      scrollStateRef.current = nextState
      suppressInitialHistoryScrollRef.current = false
      window.requestAnimationFrame(updateScrollToBottomVisibility)
      return
    }

    suppressInitialHistoryScrollRef.current = false

    if (contentAdded && (shouldFollowLatestRef.current || isNearBottomRef.current)) {
      const frameId = window.requestAnimationFrame(() => {
        const container = scrollContainerRef.current

        if (!container) {
          return
        }

        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        })
        updateScrollToBottomVisibility()

        if (nextState.pendingCount === 0) {
          shouldFollowLatestRef.current = false
        }
      })

      scrollStateRef.current = nextState
      return () => window.cancelAnimationFrame(frameId)
    }

    if (nextState.pendingCount === 0) {
      shouldFollowLatestRef.current = false
    }

    scrollStateRef.current = nextState
    window.requestAnimationFrame(updateScrollToBottomVisibility)
  }, [activeChat?.id, messages.length, visiblePendingTurns.length, updateScrollToBottomVisibility])

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
    dispatchChatEvent(CHAT_EVENTS.querySubmitted, {
      query: prompt,
      chatId: pendingRAGTargetRef.current?.chatId,
    })
    
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
    dispatchChatEvent(CHAT_EVENTS.querySubmitted, {
      query,
      chatId: pendingRAGTargetRef.current?.chatId,
    })
    
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
    const handleQuerySubmit = (event: CustomEvent<QuerySubmittedEventDetail>) => {
      const { query, chatId } = event.detail
      setCurrentQuery(query)

      if (chatId) {
        pendingRAGTargetRef.current = { query, chatId, startedAt: Date.now() }
        addPendingTurn(chatId, query)
      }
    }

    return addChatEventListener(CHAT_EVENTS.querySubmitted, handleQuerySubmit)
  }, [addPendingTurn])

  // Persist RAG responses into the active chat when the RAG store completes a query.
  useEffect(() => {
    const handleRAGResponse = (event: CustomEvent<RAGResponseEventDetail>) => {
      const { query, response } = event.detail
      const pendingTarget = pendingRAGTargetRef.current

      if (pendingTarget?.query === query) {
        pendingRAGTargetRef.current = null
        void (async () => {
          await waitForThinkingWindow(pendingTarget.startedAt)
          await addRAGMessageToChat(pendingTarget.chatId, query, response)
          markLatestAssistantMessageForReveal(pendingTarget.chatId)
        })().finally(() => {
          removePendingTurn(pendingTarget.chatId, query)
        })
        return
      }

      void addRAGMessage(query, response).then(() => {
        const currentChatId = useChatStore.getState().activeChat?.id

        if (currentChatId) {
          markLatestAssistantMessageForReveal(currentChatId)
        }
      }).finally(() => {
        const currentChatId = useChatStore.getState().activeChat?.id

        if (currentChatId) {
          removePendingTurn(currentChatId, query)
        }
      })
    }

    return addChatEventListener(CHAT_EVENTS.ragResponse, handleRAGResponse)
  }, [addRAGMessage, addRAGMessageToChat, markLatestAssistantMessageForReveal, removePendingTurn])

  // Listen for file upload and deep search events
  useEffect(() => {
    const handleFileUpload = async (event: CustomEvent<FileUploadedEventDetail>) => {
      const { file, query } = event.detail
      
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
        announceToAssistiveTechnology(`Compliance analysis complete for ${file.name}`)
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
    const handleDeepSearchComplete = (event: CustomEvent<DeepSearchCompleteEventDetail>) => {
      const { query, result, file } = event.detail
      
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

    const removeFileUploadListener = addChatEventListener(CHAT_EVENTS.fileUploaded, handleFileUpload)
    const removeDeepSearchListener = addChatEventListener(CHAT_EVENTS.deepSearchComplete, handleDeepSearchComplete)

    return () => {
      removeFileUploadListener()
      removeDeepSearchListener()
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
  const splitPaneStyle = {
    '--chat-pane-width': `${100 - canvasWidthPercent}%`,
    '--canvas-pane-width': `${canvasWidthPercent}%`,
  } as CSSProperties

  return (
    <div className="chat-viewport-surface flex h-full min-h-0 flex-col text-slate-900 dark:text-slate-100">
      {/* Drag and Drop Overlay */}
      <DragDropOverlay onFileDrop={handleFileDrop} maxFiles={3} />
      
      <ChatHeader />
      
      <div ref={splitContainerRef} className="flex flex-1 overflow-hidden" style={splitPaneStyle}>
        {/* Chat Area - 40% width in compliance mode with canvas, full width otherwise */}
        <div 
          className={cn(
            'relative flex flex-col overflow-hidden',
            isComplianceWithCanvas ? 'w-full lg:w-[var(--chat-pane-width)] lg:flex-none' : 'w-full',
            !isResizingCanvas && 'transition-all duration-300'
          )}
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
                  className="mb-4 rounded-lg border border-iris-100 bg-white/90 p-4 shadow-sm shadow-iris-950/5 dark:border-iris-300/15 dark:bg-[#241f32]"
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
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/40"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-body text-sm text-red-800 dark:text-red-200">{error}</p>
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
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto"
                onClick={handleChatSurfaceClick}
              >
                {hasMessages ? (
                  <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
                    <ChatMessages
                      messages={messages}
                      pendingTurns={visiblePendingTurns}
                      revealingMessageIds={revealingMessageIds}
                      onMessageRevealComplete={removeRevealingMessage}
                    />
                    
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
                    className="pointer-events-none flex min-h-full flex-col gap-8 pt-6 sm:gap-9 sm:pt-12 md:pt-16"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: isTransitioning ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* 1. Greeting and assistant text */}
                    <EmptyState onPromptSelect={handlePromptSelect} />

                    {/* 2. Bottom composer with disclaimer */}
                    <div className="pointer-events-none sticky bottom-0 mt-auto w-full pb-[calc(env(safe-area-inset-bottom)+0.875rem)] pt-5">
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

          <AnimatePresence>
            {hasMessages && showScrollToBottom && (
              <motion.button
                type="button"
                aria-label="Scroll to latest message"
                initial={{ opacity: 0, y: 10, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.94 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.18 }}
                onClick={scrollToLatestMessage}
                className="absolute bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] right-4 z-20 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-iris-100 bg-white/95 text-iris-700 shadow-lg shadow-iris-950/10 backdrop-blur transition-all hover:border-iris-300 hover:bg-iris-50 hover:text-iris-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32]/95 dark:text-slate-100 dark:shadow-iris-950/30 dark:hover:border-iris-300/60 dark:hover:bg-iris-300/12 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#171322] sm:right-6"
              >
                <ChevronDown className="h-5 w-5" aria-hidden="true" />
              </motion.button>
            )}
          </AnimatePresence>
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
              className="fixed right-4 top-20 z-30 rounded-full bg-iris-600 p-2.5 text-white shadow-md transition-all hover:bg-iris-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2"
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
              className="relative hidden shrink-0 lg:flex lg:w-[var(--canvas-pane-width)]"
            >
              <div
                role="separator"
                aria-label="Resize compliance report panel"
                aria-orientation="vertical"
                aria-valuemin={MIN_CANVAS_WIDTH_PERCENT}
                aria-valuemax={MAX_CANVAS_WIDTH_PERCENT}
                aria-valuenow={Math.round(canvasWidthPercent)}
                tabIndex={0}
                onPointerDown={startCanvasResize}
                onMouseDown={startCanvasMouseResize}
                onKeyDown={handleCanvasResizeKeyDown}
                data-chat-no-background-focus
                className={cn(
                  'group relative z-50 flex w-3 shrink-0 cursor-col-resize touch-none items-center justify-center bg-iris-500/[0.03] outline-none transition-colors hover:bg-iris-500/10 dark:bg-iris-300/[0.04] dark:hover:bg-iris-300/10',
                  'focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171322]'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none h-20 w-1 rounded-full bg-slate-300/80 transition-all duration-150 group-hover:h-28 group-hover:bg-iris-500 group-focus-visible:h-28 group-focus-visible:bg-iris-500 dark:bg-iris-300/30 dark:group-hover:bg-iris-300 dark:group-focus-visible:bg-iris-300',
                    isResizingCanvas && 'h-32 bg-iris-500 dark:bg-iris-300'
                  )}
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0 flex-1">
                <ComplianceCanvas
                  content={canvasContent}
                  fileName={canvasFileName}
                  ragResponse={currentResponse || undefined}
                  searchQueries={currentResponse?.search_queries_used}
                  documentCount={currentResponse?.documents_found}
                  deepSearchResult={deepSearchResult}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
