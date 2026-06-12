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
    }
    searchQueries?: string[]
    documentCount?: number
    deepSearch?: boolean
    documentsSearched?: number
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
