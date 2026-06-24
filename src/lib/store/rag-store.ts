'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { 
  queryRAG, 
  checkRAGHealth, 
  RAGWebSocket,
  type RAGResponse, 
  type HealthResponse,
  type WebSocketEvent 
} from '@/lib/services/rag-api'
import { RAG_PROVIDER_MODE, USE_REMOTE_RAG } from '@/lib/services/rag-config'
import {
  RAG_BACKEND_TOAST_ACTION,
  RAG_BACKEND_UNAVAILABLE_MESSAGE,
  isRagBackendUnavailableError,
} from '@/lib/services/rag-unavailable'
import { showToast } from '@/components/ui/toast'
import { CHAT_EVENTS, dispatchChatEvent } from '@/lib/chat/events'

// Cache utilities
const CACHE_TTL = 3600000 // 1 hour in milliseconds
const CACHE_PREFIX = 'rag_cache_'

function hashQuery(query: string): string {
  // Simple hash function for query caching
  let hash = 0
  for (let i = 0; i < query.length; i++) {
    const char = query.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

function getCachedResponse(query: string): RAGResponse | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cacheKey = CACHE_PREFIX + hashQuery(`${RAG_PROVIDER_MODE}:${USE_REMOTE_RAG ? 'remote' : 'local'}:${query.toLowerCase().trim()}`)
    const cached = localStorage.getItem(cacheKey)
    
    if (cached) {
      const { response, timestamp } = JSON.parse(cached)
      if (Date.now() - timestamp < CACHE_TTL) {
        console.log('Using cached RAG response')
        return response
      } else {
        // Remove expired cache
        localStorage.removeItem(cacheKey)
      }
    }
  } catch (error) {
    console.error('Cache read error:', error)
  }
  
  return null
}

function setCachedResponse(query: string, response: RAGResponse): void {
  if (typeof window === 'undefined') return
  
  try {
    const cacheKey = CACHE_PREFIX + hashQuery(`${RAG_PROVIDER_MODE}:${USE_REMOTE_RAG ? 'remote' : 'local'}:${query.toLowerCase().trim()}`)
    const cacheData = {
      response,
      timestamp: Date.now()
    }
    localStorage.setItem(cacheKey, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Cache write error:', error)
  }
}

function dispatchRAGResponse(query: string, response: RAGResponse): void {
  dispatchChatEvent(CHAT_EVENTS.ragResponse, { query, response })
}

function buildDemoFallbackResponse(query: string, reason: string): RAGResponse {
  const normalizedQuery = query.trim() || 'Demo legal research query'

  return {
    status: 'completed',
    query: normalizedQuery,
    summary: [
      '# Demo Legal Research Brief',
      '',
      `Query: ${normalizedQuery}`,
      '',
      '## Demo Mode',
      '',
      'The configured AI/RAG provider is not reachable, so LexInSight generated this local demo response to keep the chat workflow usable.',
      '',
      '## Practical Next Steps',
      '',
      '- Identify the Philippine law, ordinance, agency rule, or compliance topic involved.',
      '- Check whether the question is about authority, procedure, penalties, privacy, safety, procurement, environment, disaster risk, or local government powers.',
      '- Ask a narrower follow-up with a Republic Act number, agency, regulated activity, and location for a more useful local result.',
      '',
      '## Limits',
      '',
      'This fallback keeps the demo conversation moving but is not legal advice and does not verify live laws, cases, agency issuances, or local ordinances. Verify against official sources and qualified counsel.',
    ].join('\n'),
    search_queries_used: [normalizedQuery],
    documents_found: 0,
    processing_stages: {
      query_generator: 'local demo fallback',
      search_executor: 'skipped because provider was unavailable',
      summarizer: 'deterministic local template',
    },
    deep_search_used: false,
    processing_time_seconds: 0,
    provider_mode: 'local-providerless',
    fallback_used: true,
    fallback_reason: reason,
    confidence_score: 0.1,
    matched_documents: [],
  }
}

function commitRAGResponse(
  query: string,
  response: RAGResponse,
  mode: 'http' | 'websocket',
  userId: string | undefined,
  set: (partial: Partial<RAGStore>) => void,
  get: () => RAGStore
) {
  setCachedResponse(query, response)
  set({
    currentResponse: response,
    loading: false,
    error: null,
  })
  get().addToHistory(query, response, mode, userId)
  dispatchRAGResponse(query, response)
}

export interface RAGQueryHistory {
  id: string
  query: string
  response: RAGResponse
  timestamp: Date
  userId?: string
  mode: 'http' | 'websocket'
}

interface RAGStore {
  // State
  currentQuery: string | null
  currentResponse: RAGResponse | null
  loading: boolean
  error: string | null
  wsConnected: boolean
  wsEvents: WebSocketEvent[]
  queryHistory: RAGQueryHistory[]
  ragWebSocket: RAGWebSocket | null
  wsAutoReconnect: boolean
  
  // Actions
  submitQuery: (query: string, userId?: string, retryCount?: number) => Promise<void>
  clearError: () => void
  connectWebSocket: () => void
  disconnectWebSocket: () => void
  sendWebSocketQuery: (query: string, userId?: string) => void
  checkHealth: () => Promise<HealthResponse>
  addToHistory: (query: string, response: RAGResponse, mode: 'http' | 'websocket', userId?: string) => void
  clearHistory: () => void
  clearPrivateState: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export function clearRAGLocalCache(): void {
  if (typeof window === 'undefined') return

  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)

      if (key?.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key)
      }
    }
  } catch (error) {
    console.error('RAG cache clear error:', error)
  }
}

export const useRAGStore = create<RAGStore>()(
  persist(
    (set, get) => ({
      // Initial state
      currentQuery: null,
      currentResponse: null,
      loading: false,
      error: null,
      wsConnected: false,
      wsEvents: [],
      queryHistory: [],
      ragWebSocket: null,
      wsAutoReconnect: false,

      // Submit query via HTTP with retry logic and caching
      submitQuery: async (query: string, userId?: string, retryCount = 0) => {
        const maxRetries = 3
        const retryDelay = Math.pow(2, retryCount) * 1000 // Exponential backoff
        
        set({ loading: true, error: null, currentQuery: query })

        // Check cache first
        const cachedResponse = getCachedResponse(query)
        if (cachedResponse) {
          commitRAGResponse(query, cachedResponse, 'http', userId, set, get)
          return
        }

        try {
          const response = await queryRAG({ query, user_id: userId })

          if (response.fallback_used) {
            showToast(RAG_BACKEND_UNAVAILABLE_MESSAGE, 'info', {
              action: RAG_BACKEND_TOAST_ACTION,
              durationMs: 7000,
            })
          }
          
          commitRAGResponse(query, response, 'http', userId, set, get)
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
          
          if (isRagBackendUnavailableError(errorMessage)) {
            console.error('RAG provider is unavailable; using demo fallback:', errorMessage)
            showToast(RAG_BACKEND_UNAVAILABLE_MESSAGE, 'info', {
              action: RAG_BACKEND_TOAST_ACTION,
              durationMs: 10000,
            })
            commitRAGResponse(
              query,
              buildDemoFallbackResponse(query, errorMessage),
              'http',
              userId,
              set,
              get
            )
            return
          }
          
          // Retry logic for network errors
          if (retryCount < maxRetries && (errorMessage.includes('fetch') || errorMessage.includes('network'))) {
            console.log(`Retrying query (attempt ${retryCount + 1}/${maxRetries})...`)
            setTimeout(() => {
              get().submitQuery(query, userId, retryCount + 1)
            }, retryDelay)
            return
          }
          
          console.error('RAG query failed; using demo fallback:', errorMessage)
          commitRAGResponse(
            query,
            buildDemoFallbackResponse(query, errorMessage),
            'http',
            userId,
            set,
            get
          )
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null })
      },

      // Connect WebSocket with auto-reconnect
      connectWebSocket: () => {
        if (!USE_REMOTE_RAG) {
          return
        }

        set({ wsAutoReconnect: true })

        const existingSocket = get().ragWebSocket

        if (existingSocket?.isConnected() || existingSocket?.isConnecting()) {
          return
        }

        const scheduleReconnect = () => {
          setTimeout(() => {
            const currentState = get()
            if (currentState.wsAutoReconnect && !currentState.wsConnected && currentState.ragWebSocket === null) {
              console.log('Attempting to reconnect WebSocket...')
              get().connectWebSocket()
            }
          }, 5000)
        }

        const ws = new RAGWebSocket()

        set({
          ragWebSocket: ws,
          wsConnected: false,
          wsEvents: [],
          error: null,
        })
        
        ws.connect(
          (event: WebSocketEvent) => {
            // Add event to list
            set((state) => ({
              wsEvents: [...state.wsEvents, event]
            }))

            // If summarization is complete, set the response
            if (event.stage === 'summarization' && event.status === 'completed' && event.data?.summary) {
              const response: RAGResponse = {
                status: 'completed',
                query: get().currentQuery || '',
                summary: event.data.summary,
                search_queries_used: [],
                documents_found: event.data.documents_found || 0
              }
              
              set({ 
                currentResponse: response,
                loading: false
              })

              // Add to history
              get().addToHistory(get().currentQuery || '', response, 'websocket')
              
              // Dispatch event for chat history
              dispatchRAGResponse(get().currentQuery || '', response)
            }
          },
          () => {
            console.error('WebSocket error, attempting reconnect in 5 seconds...')
            set({ 
              error: 'WebSocket connection lost. Reconnecting...',
              wsConnected: false,
              ragWebSocket: null,
            })
            ws.disconnect()
            scheduleReconnect()
          },
          () => {
            set({
              wsConnected: true,
              error: null,
            })
          },
          () => {
            set({
              wsConnected: false,
              ragWebSocket: null,
            })
            scheduleReconnect()
          }
        )
      },

      // Disconnect WebSocket
      disconnectWebSocket: () => {
        const ws = get().ragWebSocket
        if (ws) {
          ws.disconnect()
        }
        
        set({ 
          ragWebSocket: null, 
          wsConnected: false,
          wsEvents: [],
          wsAutoReconnect: false,
        })
      },

      // Send query via WebSocket
      sendWebSocketQuery: (query: string, userId?: string) => {
        const ws = get().ragWebSocket
        
        if (!ws || !ws.isConnected()) {
          set({ error: 'WebSocket not connected' })
          return
        }

        set({ 
          loading: true, 
          error: null, 
          currentQuery: query,
          wsEvents: [],
          currentResponse: null
        })

        ws.sendQuery(query, userId)
      },

      // Check health
      checkHealth: async () => {
        try {
          const health = await checkRAGHealth()
          return health
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Health check failed'
          set({ error: errorMessage })
          throw error
        }
      },

      // Add to history
      addToHistory: (query: string, response: RAGResponse, mode: 'http' | 'websocket', userId?: string) => {
        const historyItem: RAGQueryHistory = {
          id: `rag-${Date.now()}`,
          query,
          response,
          timestamp: new Date(),
          userId,
          mode
        }

        set((state) => ({
          queryHistory: [historyItem, ...state.queryHistory].slice(0, 50) // Keep last 50
        }))
      },

      // Clear history
      clearHistory: () => {
        set({ queryHistory: [] })
      },

      clearPrivateState: () => {
        const ws = get().ragWebSocket

        if (ws) {
          ws.disconnect()
        }

        clearRAGLocalCache()
        set({
          currentQuery: null,
          currentResponse: null,
          loading: false,
          error: null,
          wsConnected: false,
          wsEvents: [],
          queryHistory: [],
          ragWebSocket: null,
          wsAutoReconnect: false,
        })
      },

      // Set loading
      setLoading: (loading: boolean) => {
        set({ loading })
      },

      // Set error
      setError: (error: string | null) => {
        set({ error })
      }
    }),
    {
      name: 'rag-storage',
      storage: createJSONStorage(() => window.localStorage),
      partialize: (state) => ({
        queryHistory: state.queryHistory
      })
    }
  )
)
