export const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
export const DEFAULT_RAG_WS_URL = 'wss://devkada.resqlink.org'

export type RAGProviderMode = 'local-providerless' | 'remote-rag'

function getRagProviderMode(): RAGProviderMode {
  const value = process.env.NEXT_PUBLIC_RAG_PROVIDER_MODE?.trim().toLowerCase()

  if (value === 'remote' || value === 'remote-rag') {
    return 'remote-rag'
  }

  return 'local-providerless'
}

export const RAG_PROVIDER_MODE = getRagProviderMode()
export const USE_REMOTE_RAG = RAG_PROVIDER_MODE === 'remote-rag'
export const USE_RAG_PROXY = process.env.NEXT_PUBLIC_USE_RAG_PROXY !== 'false'

export const RAG_API_BASE_URL = USE_RAG_PROXY
  ? '/api/rag-proxy'
  : process.env.NEXT_PUBLIC_RAG_API_URL || DEFAULT_RAG_API_URL

export const RAG_WS_URL = process.env.NEXT_PUBLIC_RAG_WS_URL || DEFAULT_RAG_WS_URL

export function buildRagUrl(endpoint: string) {
  if (USE_RAG_PROXY) {
    const query = new URLSearchParams({ endpoint })
    return `${RAG_API_BASE_URL}?${query.toString()}`
  }

  return `${RAG_API_BASE_URL}${endpoint}`
}
