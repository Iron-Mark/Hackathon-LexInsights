'use client'

/**
 * Deep Search API Service
 *
 * The configured RAG provider is tried first through queryRAG(). When that
 * provider is unavailable, queryRAG() returns deterministic providerless
 * local research, so Deep Search still produces a structured result.
 */

import {
  checkRAGHealth,
  queryRAG,
  type RAGResponse,
} from './rag-api'
import { runLocalResearch } from './local-legal-research'

export interface DeepSearchRequest {
  query: string
  context?: string
  document_name?: string
  user_id?: string
  max_results?: number
}

export interface DeepSearchResponse {
  status: 'completed' | 'processing' | 'error'
  query: string
  enhanced_summary: string
  related_documents: Array<{
    title: string
    relevance_score: number
    excerpt: string
    reference: string
  }>
  additional_insights: string[]
  cross_references: string[]
  documents_searched: number
  processing_time: number
  deep_search_used?: boolean
  provider_mode?: 'remote-rag' | 'local-providerless'
  fallback_used?: boolean
  fallback_reason?: string
  processing_stages?: {
    query_generator: string
    search_executor: string
    deep_search_orchestrator: string
    summarizer: string
  }
}

export interface DeepSearchError {
  detail: string
}

function toDeepSearchResponse(data: RAGResponse): DeepSearchResponse {
  return {
    status: data.status === 'no_results' ? 'completed' : data.status,
    query: data.query,
    enhanced_summary: data.summary,
    related_documents: extractRelatedDocuments(data),
    additional_insights: extractInsights(data.summary),
    cross_references: extractCrossReferences(data.summary),
    documents_searched: data.documents_found || data.matched_documents?.length || 0,
    processing_time: data.processing_time_seconds || 0,
    deep_search_used: data.deep_search_used,
    provider_mode: data.provider_mode,
    fallback_used: data.fallback_used,
    fallback_reason: data.fallback_reason,
    processing_stages: data.processing_stages?.deep_search_orchestrator
      ? {
          query_generator: data.processing_stages.query_generator,
          search_executor: data.processing_stages.search_executor,
          deep_search_orchestrator: data.processing_stages.deep_search_orchestrator,
          summarizer: data.processing_stages.summarizer,
        }
      : undefined,
  }
}

/**
 * Perform enhanced research.
 *
 * Remote mode uses the RAG API's deep-search flag. Providerless mode expands
 * the local corpus search and cross-reference extraction without remote PDFs or
 * an AI provider.
 */
export async function performDeepSearch(params: DeepSearchRequest): Promise<DeepSearchResponse> {
  const data = await queryRAG({
    query: params.query,
    user_id: params.user_id || 'deep-search-user',
    use_deep_search: true,
  })

  return toDeepSearchResponse(data)
}

function extractRelatedDocuments(data: RAGResponse): Array<{
  title: string
  relevance_score: number
  excerpt: string
  reference: string
}> {
  if (data.matched_documents && data.matched_documents.length > 0) {
    return data.matched_documents.map((document) => ({
      title: document.title,
      relevance_score: document.relevance_score,
      excerpt: document.matched_terms.length > 0
        ? `Matched local corpus terms: ${document.matched_terms.join(', ')}`
        : 'Matched by local providerless research.',
      reference: `${document.source_name}: ${document.source_url}`,
    }))
  }

  const docs: Array<{ title: string; relevance_score: number; excerpt: string; reference: string }> = []
  const raPattern = /(?:RA|Republic Act)\s+(?:No\.\s+)?(\d+)/gi
  const matches = data.summary.match(raPattern)

  if (matches) {
    const uniqueRAs = [...new Set(matches)]
    uniqueRAs.slice(0, 5).forEach((ra, index) => {
      docs.push({
        title: ra,
        relevance_score: 0.95 - index * 0.05,
        excerpt: 'Referenced in the research summary.',
        reference: ra,
      })
    })
  }

  return docs
}

function extractInsights(summary: string): string[] {
  const insights: string[] = []
  const lines = summary.split('\n')

  lines.forEach((line) => {
    const trimmed = line.trim()

    if (trimmed.startsWith('- ') || /^\d+\./.test(trimmed)) {
      const insight = trimmed.replace(/^-\s*/, '').replace(/^\d+\.\s*/, '')

      if (insight.length > 20 && insight.length < 240) {
        insights.push(insight)
      }
    }
  })

  return insights.slice(0, 10)
}

function extractCrossReferences(summary: string): string[] {
  const refs: string[] = []
  const patterns = [
    /(?:RA|Republic Act)\s+(?:No\.\s+)?\d+/gi,
    /Data Privacy Act(?: of 2012)?/gi,
    /Local Government Code(?: of 1991)?/gi,
    /Fire Code(?: of the Philippines)?/gi,
    /Clean Air Act(?: of 1999)?/gi,
    /Clean Water Act(?: of 2004)?/gi,
    /Revised Corporation Code(?: of the Philippines)?/gi,
    /Safe Spaces Act/gi,
  ]

  patterns.forEach((pattern) => {
    const matches = summary.match(pattern)

    if (matches) {
      refs.push(...matches)
    }
  })

  return [...new Set(refs)].slice(0, 12)
}

/**
 * Compatibility helper for old call sites. It now returns the same providerless
 * local engine output instead of hard-coded mock content.
 */
export async function performDeepSearchMock(params: DeepSearchRequest): Promise<DeepSearchResponse> {
  const data = runLocalResearch(
    {
      query: params.query,
      user_id: params.user_id || 'mock-deep-search-user',
      use_deep_search: true,
    },
    'Mock mode requested; using bundled providerless corpus.'
  )

  return toDeepSearchResponse(data)
}

export async function checkDeepSearchAvailability(): Promise<boolean> {
  const health = await checkRAGHealth()

  return health.status === 'healthy'
}
