/**
 * RAG API Service for Philippine Legislative Research
 * Base URL: https://devkada.resqlink.org
 * 
 * API Documentation:
 * - Main Endpoint: POST /api/research/rag-summary
 * - WebSocket: wss://devkada.resqlink.org/api/research/ws/rag-summary
 * - Timeout: 300 seconds (5 minutes) for full pipeline
 * - Pipeline: Query Generation → Database Search → AI Summarization
 */

const RAG_API_BASE_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'https://devkada.resqlink.org'

export interface RAGRequest {
  query: string
  user_id?: string
}

export interface RAGResponse {
  status: 'completed' | 'no_results' | 'error'
  query: string
  summary: string
  search_queries_used?: string[]
  documents_found?: number
  processing_stages?: {
    query_generator: string
    search_executor: string
    summarizer: string
  }
}

export interface RAGError {
  detail: string
}

/**
 * RAG API Call - Full 3-Stage Pipeline
 * Executes: Query Generation → Database Search → AI Summarization
 * Expected time: 50-90 seconds
 * Timeout: 300 seconds (5 minutes)
 */
export async function ragSummary(query: string, userId?: string): Promise<RAGResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 300000) // 300 seconds

  try {
    const response = await fetch(`${RAG_API_BASE_URL}/api/research/rag-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        user_id: userId || 'lexinsight-user',
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const error: RAGError = await response.json()
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    const data: RAGResponse = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out after 5 minutes. Please try again.')
      }
    }
    
    console.error('RAG API Error:', error)
    throw error
  }
}

/**
 * Health Check
 * Verify API is available
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  try {
    const response = await fetch(`${RAG_API_BASE_URL}/api/research/health`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Health Check Error:', error)
    throw error
  }
}

/**
 * WebSocket Streaming (for real-time updates)
 */
export interface RAGStreamEvent {
  stage: 'query_generation' | 'search' | 'summarization'
  status: 'in_progress' | 'completed'
  message: string
  queries?: string[]
  summary?: string
}

export function createRAGWebSocket(
  query: string,
  userId: string,
  onEvent: (event: RAGStreamEvent) => void,
  onError?: (error: Error) => void
): WebSocket {
  const wsUrl = RAG_API_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://')
  const ws = new WebSocket(`${wsUrl}/api/research/ws/rag-summary`)

  ws.onopen = () => {
    ws.send(JSON.stringify({ query, user_id: userId }))
  }

  ws.onmessage = (event) => {
    try {
      const data: RAGStreamEvent = JSON.parse(event.data)
      onEvent(data)
    } catch (error) {
      console.error('WebSocket parse error:', error)
    }
  }

  ws.onerror = (error) => {
    console.error('WebSocket error:', error)
    if (onError) {
      onError(new Error('WebSocket connection failed'))
    }
  }

  return ws
}

/**
 * Validate query before sending
 */
export function validateQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length < 5) {
    return { valid: false, error: 'Query must be at least 5 characters' }
  }

  if (query.length > 500) {
    return { valid: false, error: 'Query must be less than 500 characters' }
  }

  return { valid: true }
}
