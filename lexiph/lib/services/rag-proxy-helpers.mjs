export const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
export const DEFAULT_GET_TIMEOUT_MS = 20000
export const DEFAULT_POST_TIMEOUT_MS = 300000
export const MIN_PROXY_TIMEOUT_MS = 500
export const MAX_GET_TIMEOUT_MS = 60000
export const MAX_POST_TIMEOUT_MS = 300000

export function getProxyTimeoutMs(searchParams, defaultTimeoutMs, maxTimeoutMs) {
  const requestedTimeout = Number(searchParams.get('timeoutMs'))

  if (!Number.isFinite(requestedTimeout) || requestedTimeout <= 0) {
    return defaultTimeoutMs
  }

  return Math.min(Math.max(requestedTimeout, MIN_PROXY_TIMEOUT_MS), maxTimeoutMs)
}

export function getProxyUpstream(searchParams, defaultEndpoint, ragApiUrl = DEFAULT_RAG_API_URL) {
  const endpoint = searchParams.get('endpoint') || defaultEndpoint

  try {
    const baseUrl = new URL(ragApiUrl)
    const upstreamUrl = new URL(endpoint, baseUrl)

    if (upstreamUrl.origin !== baseUrl.origin) {
      return {
        endpoint,
        error: 'Endpoint must stay on the configured RAG API origin',
      }
    }

    return {
      endpoint,
      upstreamUrl: upstreamUrl.toString(),
      upstreamOrigin: baseUrl.origin,
    }
  } catch {
    return {
      endpoint,
      error: 'Invalid RAG API URL or endpoint',
    }
  }
}

export function getProxyFailure(error) {
  const cause = error && typeof error === 'object' && 'cause' in error ? error.cause : null
  const causeCode = cause && typeof cause === 'object' && 'code' in cause ? cause.code : null
  const errorName = error instanceof Error ? error.name : null
  const detail = error instanceof Error ? error.message : 'Failed to fetch from RAG API'

  if (
    errorName === 'AbortError' ||
    errorName === 'TimeoutError' ||
    causeCode === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return {
      status: 504,
      type: 'upstream_timeout',
      detail,
    }
  }

  if (error instanceof TypeError || causeCode) {
    return {
      status: 502,
      type: 'upstream_fetch_failed',
      detail,
    }
  }

  return {
    status: 500,
    type: 'proxy_error',
    detail,
  }
}

export function summarizeProxyLogDetail(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return 'empty upstream error body'
  }

  return normalized.length > 200 ? `${normalized.slice(0, 197)}...` : normalized
}
