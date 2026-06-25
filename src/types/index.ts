export interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  created_at?: string
  email_confirmed_at?: string | null
  user_metadata?: {
    full_name?: string
    name?: string
    avatar_url?: string
  }
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  metadata?: {
    ragResponse?: {
      status: string
      query: string
      summary: string
      search_queries_used: string[]
      documents_found: number
      provider_mode?: 'remote-rag' | 'local-providerless'
      fallback_used?: boolean
      confidence_score?: number
      retrieval_metadata?: {
        result_limit: number
        total_candidates: number
        top_score: number
        score_threshold: number
        citation_numbers: string[]
        known_citation_numbers?: string[]
        unknown_citation_numbers?: string[]
        source_type_counts?: Record<string, number>
        provenance_coverage?: Record<string, number>
        relation_paths?: Array<{
          source: string
          relation_type: string
          target: string
          label: string
        }>
        coverage_warnings?: string[]
        local_corpus_limitations?: string[]
        processing_ms?: number
      }
      matched_documents?: Array<{
        title: string
        statute: string
        source_name: string
        source_url: string
        relevance_score: number
        matched_terms: string[]
        support_level?: 'direct' | 'related' | 'framework'
        authority_type?: string
        source_tier?: string
        source_last_verified?: string
        provenance_status?: string
        evidence_anchors?: Array<{
          label: string
          supports: string[]
          note: string
        }>
        related_authorities?: Array<{
          statute: string
          title: string
          relation_type: string
          label: string
        }>
        supporting_fields?: string[]
      }>
    }
    searchQueries?: string[]
    documentCount?: number
    deepSearch?: boolean
    documentsSearched?: number
    providerMode?: 'remote-rag' | 'local-providerless'
    fallbackUsed?: boolean
    relatedDocuments?: Array<{
      title: string
      relevance_score: number
      excerpt: string
      reference: string
    }>
  }
}

export interface Chat {
  id: string
  title: string
  mode?: 'general' | 'compliance'
  created_at: string
  updated_at: string
  user_id: string
  message_count?: number
  last_message_preview?: string
}

export interface AuthError {
  message: string
  status?: number
}
