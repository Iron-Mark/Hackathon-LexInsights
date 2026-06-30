export const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
export const DEFAULT_GET_TIMEOUT_MS = 20000
export const DEFAULT_POST_TIMEOUT_MS = 300000
export const MIN_PROXY_TIMEOUT_MS = 500
export const MAX_GET_TIMEOUT_MS = 60000
export const MAX_POST_TIMEOUT_MS = 300000
export const MAX_PROXY_POST_BODY_BYTES = 64 * 1024
export const MAX_PROXY_QUERY_LENGTH = 4000
export const MAX_PROXY_USER_ID_LENGTH = 128

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
  if (
    errorName === 'AbortError' ||
    errorName === 'TimeoutError' ||
    causeCode === 'UND_ERR_CONNECT_TIMEOUT'
  ) {
    return {
      status: 504,
      type: 'upstream_timeout',
      detail: 'RAG backend request timed out. Providerless local research may still be available.',
    }
  }

  if (error instanceof TypeError || causeCode) {
    return {
      status: 502,
      type: 'upstream_fetch_failed',
      detail: 'RAG backend request failed. Providerless local research may still be available.',
    }
  }

  return {
    status: 500,
    type: 'proxy_error',
    detail: 'RAG proxy request failed.',
  }
}

export function publicUpstreamHttpErrorDetail(status) {
  return `RAG backend returned HTTP ${status}. Check server logs or readiness status.`
}

export function publicUpstreamPayloadErrorDetail(kind) {
  return `RAG backend returned ${kind}. Check server logs or readiness status.`
}

export function summarizeProxyLogDetail(value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()

  if (!normalized) {
    return 'empty upstream error body'
  }

  return normalized.length > 200 ? `${normalized.slice(0, 197)}...` : normalized
}

export function getProxyContentLength(headers) {
  const rawValue = headers?.get?.('content-length')

  if (!rawValue) {
    return null
  }

  const parsed = Number(rawValue)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function validateProxyContentLength(headers) {
  const contentLength = getProxyContentLength(headers)

  if (contentLength !== null && contentLength > MAX_PROXY_POST_BODY_BYTES) {
    return {
      ok: false,
      status: 413,
      type: 'payload_too_large',
      detail: 'RAG proxy requests are limited to 64KB.',
      contentLength,
    }
  }

  return {
    ok: true,
    contentLength,
  }
}

export function validateProxyPostBody(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {
      ok: false,
      status: 400,
      type: 'invalid_request_body',
      detail: 'RAG proxy requests must be JSON objects.',
    }
  }

  const query = typeof value.query === 'string' ? value.query.trim() : ''

  if (!query) {
    return {
      ok: false,
      status: 400,
      type: 'invalid_query',
      detail: 'RAG proxy requests require a non-empty query.',
    }
  }

  if (query.length > MAX_PROXY_QUERY_LENGTH) {
    return {
      ok: false,
      status: 413,
      type: 'query_too_large',
      detail: 'RAG proxy queries are limited to 4,000 characters.',
    }
  }

  const useDeepSearch = Boolean(value.use_deep_search)
  const userId = typeof value.user_id === 'string' ? value.user_id.trim().slice(0, MAX_PROXY_USER_ID_LENGTH) : undefined

  return {
    ok: true,
    body: {
      query,
      ...(userId ? { user_id: userId } : {}),
      ...(useDeepSearch ? { use_deep_search: true } : {}),
    },
  }
}
