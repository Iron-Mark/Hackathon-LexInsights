'use client'

// RAG API Service for Philippine Legislation Research

import {
  buildRagUrl,
  DEFAULT_RAG_API_URL,
  RAG_API_BASE_URL,
  RAG_WS_URL,
  USE_RAG_PROXY,
} from './rag-config'

const HEALTH_CHECK_TIMEOUT_MS = 20000

async function readTextSafely(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function extractErrorDetail(response: Response): Promise<string> {
  const text = (await readTextSafely(response)).trim()

  if (!text) {
    return 'No response body'
  }

  try {
    const parsed = JSON.parse(text) as { detail?: string }

    if (typeof parsed?.detail === 'string' && parsed.detail.trim().length > 0) {
      return parsed.detail.trim()
    }
  } catch {
    return text.slice(0, 250)
  }

  return `Unexpected response: ${text.slice(0, 250)}`
}

// Debug: Log the API URL being used (only in development)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('RAG API Configuration:')
  console.log('- Use Proxy:', USE_RAG_PROXY)
  console.log('- Base URL:', RAG_API_BASE_URL)
  console.log('- WS URL:', RAG_WS_URL)
  console.log('- Backend URL:', process.env.NEXT_PUBLIC_RAG_API_URL || DEFAULT_RAG_API_URL)
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Standard RAG Query
export interface RAGQuery {
  query: string
  user_id?: string
  use_deep_search?: boolean
}

// Standard RAG Response
export interface RAGResponse {
  status: 'completed' | 'no_results' | 'error'
  query: string
  summary: string
  search_queries_used?: string[]
  documents_found?: number
  processing_stages?: {
    query_generator: string
    search_executor: string
    deep_search_orchestrator?: string
    summarizer: string
  }
  deep_search_used?: boolean
  processing_time_seconds?: number
}

// Draft Checker Request
export interface DraftCheckerRequest {
  draft_markdown: string
  user_id?: string
  include_summary?: boolean
}

// Draft Checker Finding
export interface Finding {
  category: 'conflict' | 'alignment' | 'gap' | 'compliant'
  status: 'green' | 'amber' | 'red'
  title: string
  description: string
  references: string[]
  recommendation: string
  severity_score: number
}

// Draft Checker Response
export interface DraftAnalysis {
  status: 'completed' | 'error'
  draft_title: string
  total_findings: number
  green_count: number
  amber_count: number
  red_count: number
  green_findings: Finding[]
  amber_findings: Finding[]
  red_findings: Finding[]
  overall_assessment: string
  compliance_score: number
  keywords_extracted?: number
  documents_searched?: number
  chunks_analyzed?: number
  processing_time_seconds: number
  summary?: string
}

export interface DraftCheckerResponse {
  status: 'success' | 'error'
  timestamp: string
  analysis: DraftAnalysis
  error?: string
}

// Health Response
export interface HealthResponse {
  status: string
  service: string
}

// WebSocket Event
export interface WebSocketEvent {
  stage: 'query_generation' | 'search' | 'summarization' | 'deep_search'
  status: 'started' | 'in_progress' | 'completed' | 'error'
  message: string
  timestamp?: string
  data?: {
    queries_generated?: number
    documents_found?: number
    summary?: string
  }
}

// ============================================================================
// STANDARD RAG API (with optional Deep Search)
// ============================================================================

/**
 * Query the RAG API for Philippine legislation research
 * @param params - Query parameters including optional deep_search flag
 * @returns RAG response with summary and metadata
 */
export async function queryRAG(params: RAGQuery): Promise<RAGResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes for deep search

  try {
    const url = buildRagUrl('/api/research/rag-summary')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const detail = await extractErrorDetail(response)
      throw new Error(`API Error ${response.status}: ${detail}`)
    }

    const data: RAGResponse = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(
          'Request timed out after 5 minutes. The query may be too complex or the server is busy.'
        )
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot connect to RAG API at ${RAG_API_BASE_URL}. Check if the server is running and CORS is configured.`
        )
      }

      throw error
    }

    throw new Error('Unknown error occurred')
  }
}

// ============================================================================
// DRAFT CHECKER API
// ============================================================================

/**
 * Check legislation draft for conflicts and compliance issues
 * @param params - Draft markdown and options
 * @returns Analysis with color-coded findings (green/amber/red)
 */
export async function checkDraft(params: DraftCheckerRequest): Promise<DraftCheckerResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minutes

  try {
    const url = buildRagUrl('/api/legislation/draft-checker')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const detail = await extractErrorDetail(response)
      throw new Error(`API Error ${response.status}: ${detail}`)
    }

    const data: DraftCheckerResponse = await response.json()
    return data
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Draft check timed out after 2 minutes.')
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot connect to Draft Checker API at ${RAG_API_BASE_URL}. Check if the server is running.`
        )
      }

      throw error
    }

    throw new Error('Unknown error occurred during draft check')
  }
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

/**
 * Check RAG API health status
 */
export async function checkRAGHealth(): Promise<HealthResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)

  try {
    const url = buildRagUrl('/api/research/health')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const detail = await extractErrorDetail(response)
      throw new Error(`Health check failed with status ${response.status}: ${detail}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(
          'Health check timed out after 20 seconds. The RAG API server may be unreachable.'
        )
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot connect to RAG API at ${RAG_API_BASE_URL}. Check if the server is running and CORS is configured.`
        )
      }

      throw error
    }

    throw new Error('Unknown error occurred during health check')
  }
}

/**
 * Check Draft Checker API health status
 */
export async function checkDraftCheckerHealth(): Promise<HealthResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS)

  try {
    const url = buildRagUrl('/api/legislation/draft-checker/health')

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-cache',
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const detail = await extractErrorDetail(response)
      throw new Error(`Health check failed with status ${response.status}: ${detail}`)
    }

    return await response.json()
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Health check timed out after 20 seconds.')
      }

      if (error.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot connect to Draft Checker API at ${RAG_API_BASE_URL}. Check if the server is running.`
        )
      }

      throw error
    }

    throw new Error('Unknown error occurred during health check')
  }
}

// ============================================================================
// WEBSOCKET STREAMING
// ============================================================================

/**
 * WebSocket client for real-time RAG updates
 */
export class RAGWebSocket {
  private ws: WebSocket | null = null
  private onMessage: ((event: WebSocketEvent) => void) | null = null
  private onError: ((error: unknown) => void) | null = null
  private wsUrl: string

  constructor() {
    this.wsUrl = RAG_WS_URL
  }

  connect(onMessage: (event: WebSocketEvent) => void, onError?: (error: unknown) => void) {
    this.onMessage = onMessage
    this.onError = onError || null

    try {
      this.ws = new WebSocket(`${this.wsUrl}/api/research/ws/rag-summary`)

      this.ws.onopen = () => {
        console.log('RAG WebSocket connected')
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketEvent
          this.onMessage?.(data)
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      }

      this.ws.onerror = (error) => {
        console.error('RAG WebSocket error:', error)
        this.onError?.(error)
      }

      this.ws.onclose = () => {
        console.log('RAG WebSocket disconnected')
      }
    } catch (error) {
      console.error('WebSocket connection error:', error)
      this.onError?.(error)
    }
  }

  sendQuery(query: string, userId?: string, useDeepSearch?: boolean) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ 
        query, 
        user_id: userId, 
        use_deep_search: useDeepSearch 
      }))
    } else {
      console.error('WebSocket not connected')
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

export const SAMPLE_QUERIES = [
  'What is RA 9003 and its main requirements?',
  'What are workplace safety requirements in Philippines?',
  'Tell me about environmental protection laws',
  'What legislation covers solid waste management?',
  'What is the Data Privacy Act of 2012?',
  'What are the requirements for business permits?',
  'What laws govern labor and employment?',
  'What is RA 10173 about?',
]

export const SAMPLE_DRAFT = `# Solid Waste Management Compliance Act 2025

## Purpose
Establish comprehensive waste management procedures for all establishments.

## Key Requirements
- Source segregation mandatory for all waste generators
- Monthly reporting to DENR required
- Collection centers must be within 5km of residential areas

## Penalties
- Non-compliance: PHP 5,000-50,000
- Failure to report: PHP 2,000 per month
- Repeat violations: License suspension

## Implementation Timeline
- Phase 1: Metro Manila (6 months)
- Phase 2: Major cities (12 months)
- Phase 3: All municipalities (24 months)
`
