/**
 * Legacy RAG API wrapper.
 *
 * New code should import from src/lib/services/rag-api.ts. This file remains
 * for older diagnostics and now delegates to the maintained service layer,
 * including providerless local fallback behavior.
 */

import {
  checkRAGHealth,
  queryRAG,
  type HealthResponse,
  type RAGResponse,
} from '../services/rag-api'

const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'

export type { RAGResponse }

export interface RAGRequest {
  query: string
  user_id?: string
}

export async function ragSummary(query: string, userId?: string): Promise<RAGResponse> {
  return queryRAG({
    query,
    user_id: userId || 'lexinsight-user',
  })
}

export async function healthCheck(): Promise<HealthResponse> {
  return checkRAGHealth()
}

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
  const ragApiUrl = process.env.NEXT_PUBLIC_RAG_API_URL || DEFAULT_RAG_API_URL
  const wsUrl = ragApiUrl.replace('http://', 'ws://').replace('https://', 'wss://')
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

  ws.onerror = () => {
    if (onError) {
      onError(new Error('WebSocket connection failed'))
    }
  }

  return ws
}

export function validateQuery(query: string): { valid: boolean; error?: string } {
  if (!query || query.trim().length < 5) {
    return { valid: false, error: 'Query must be at least 5 characters' }
  }

  if (query.length > 500) {
    return { valid: false, error: 'Query must be less than 500 characters' }
  }

  return { valid: true }
}
