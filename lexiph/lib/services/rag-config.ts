export const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
export const DEFAULT_RAG_WS_URL = 'wss://devkada.resqlink.org'

export const USE_RAG_PROXY = process.env.NEXT_PUBLIC_USE_RAG_PROXY !== 'false'

export const RAG_API_BASE_URL = USE_RAG_PROXY
  ? '/api/rag-proxy'
  : process.env.NEXT_PUBLIC_RAG_API_URL || DEFAULT_RAG_API_URL

export const RAG_WS_URL = process.env.NEXT_PUBLIC_RAG_WS_URL || DEFAULT_RAG_WS_URL

export function buildRagUrl(endpoint: string) {
  return USE_RAG_PROXY ? `${RAG_API_BASE_URL}?endpoint=${endpoint}` : `${RAG_API_BASE_URL}${endpoint}`
}
