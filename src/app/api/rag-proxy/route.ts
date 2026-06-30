import { NextRequest, NextResponse } from 'next/server'

import {
  buildPublicApiErrorBody,
  buildThrottleErrorBody,
  checkPublicApiThrottle,
  createPublicApiRequestContext,
  getThrottleHeaders,
  logPublicApiEvent,
  safeEndpointPath,
  type PublicApiRequestContext,
  type ThrottleResult,
} from '@/lib/server/request-guardrails'
import {
  DEFAULT_GET_TIMEOUT_MS,
  DEFAULT_POST_TIMEOUT_MS,
  DEFAULT_RAG_API_URL,
  MAX_GET_TIMEOUT_MS,
  MAX_POST_TIMEOUT_MS,
  getProxyFailure,
  validateProxyContentLength,
  getProxyTimeoutMs,
  getProxyUpstream,
  publicUpstreamHttpErrorDetail,
  publicUpstreamPayloadErrorDetail,
  validateProxyPostBody,
} from '../../../lib/services/rag-proxy-helpers.mjs'

const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || DEFAULT_RAG_API_URL
const SUPPRESS_EXPECTED_TEST_NOISE = process.env.RAG_PROXY_SUPPRESS_TEST_NOISE === 'true'
const EXPECTED_NOISE_ENDPOINTS = new Set(['/missing-rag-upstream'])

function shouldSuppressProxyLog(endpoint: string, status?: number) {
  if (!SUPPRESS_EXPECTED_TEST_NOISE) {
    return false
  }

  if (!EXPECTED_NOISE_ENDPOINTS.has(endpoint)) {
    return false
  }

  if (status === undefined) {
    return true
  }

  return status === 404
}

function noStoreJson(
  body: unknown,
  status: number,
  context: PublicApiRequestContext,
  throttle?: ThrottleResult,
  headers: Record<string, string> = {}
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(throttle ? getThrottleHeaders(throttle, context.requestId) : { 'X-Request-ID': context.requestId }),
      ...headers,
    },
  })
}

function rateLimitedJson(context: PublicApiRequestContext, throttle: ThrottleResult) {
  logPublicApiEvent('warn', 'public_api.rate_limited', context, {
    limit: throttle.limit,
    retryAfterSeconds: throttle.retryAfterSeconds,
    route: context.route,
  })

  return noStoreJson(buildThrottleErrorBody(context, throttle), 429, context, throttle)
}

function discardUpstreamBody(response: Response) {
  void response.body?.cancel().catch(() => undefined)
}

type UpstreamParseResult =
  | {
      ok: true
      data: unknown
    }
  | {
      ok: false
      detail: string
    }

function readUpstreamSuccess(responseText: string): UpstreamParseResult {
  const text = responseText.trim()

  if (!text) {
    return { ok: false, detail: publicUpstreamPayloadErrorDetail('an empty response body') }
  }

  try {
    return {
      ok: true,
      data: JSON.parse(text),
    }
  } catch {
    return {
      ok: false,
      detail: publicUpstreamPayloadErrorDetail('a non-JSON response body'),
    }
  }
}

/**
 * POST proxy for RAG API endpoints
 * Bypasses CORS by making server-side requests
 */
export async function POST(request: NextRequest) {
  const context = createPublicApiRequestContext(request, '/api/rag-proxy')
  const throttle = checkPublicApiThrottle(context)

  if (!throttle.ok) {
    return rateLimitedJson(context, throttle)
  }

  const upstream = getProxyUpstream(request.nextUrl.searchParams, '/api/research/rag-summary', RAG_API_URL)
  const timeoutMs = getProxyTimeoutMs(request.nextUrl.searchParams, DEFAULT_POST_TIMEOUT_MS, MAX_POST_TIMEOUT_MS)
  const contentLengthCheck = validateProxyContentLength(request.headers)

  if (!contentLengthCheck.ok) {
    const status = contentLengthCheck.status || 413

    return noStoreJson(
      buildPublicApiErrorBody(
        context,
        contentLengthCheck.detail || 'RAG proxy request is too large.',
        contentLengthCheck.type || 'payload_too_large',
        {
          maxBytes: 64 * 1024,
          contentLength: contentLengthCheck.contentLength,
        }
      ),
      status,
      context,
      throttle
    )
  }

  if (!upstream.upstreamUrl) {
    return noStoreJson(
      buildPublicApiErrorBody(context, upstream.error || 'Invalid RAG proxy endpoint.', 'invalid_endpoint', {
        endpointPath: safeEndpointPath(upstream.endpoint),
      }),
      400,
      context,
      throttle
    )
  }

  try {
    const rawBody = await request.json()
    const bodyCheck = validateProxyPostBody(rawBody)

    if (!bodyCheck.ok) {
      const status = bodyCheck.status || 400

      return noStoreJson(
        buildPublicApiErrorBody(
          context,
          bodyCheck.detail || 'Invalid RAG proxy request body.',
          bodyCheck.type || 'invalid_request_body'
        ),
        status,
        context,
        throttle
      )
    }

    if (!shouldSuppressProxyLog(upstream.endpoint)) {
      logPublicApiEvent('info', 'rag_proxy.request', context, {
        endpointPath: safeEndpointPath(upstream.endpoint),
        timeoutMs,
      })
    }

    const response = await fetch(upstream.upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyCheck.body),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      discardUpstreamBody(response)
      if (!shouldSuppressProxyLog(upstream.endpoint, response.status)) {
        logPublicApiEvent('error', 'rag_proxy.upstream_http_error', context, {
          status: response.status,
          endpointPath: safeEndpointPath(upstream.endpoint),
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        })
      }
      return noStoreJson(
        buildPublicApiErrorBody(context, publicUpstreamHttpErrorDetail(response.status), 'upstream_http_error', {
          status: response.status,
          endpointPath: safeEndpointPath(upstream.endpoint),
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        }),
        response.status,
        context,
        throttle
      )
    }

    const responseText = await response.text()
    const parsed = readUpstreamSuccess(responseText)

    if (!parsed.ok) {
      return noStoreJson(
        buildPublicApiErrorBody(context, parsed.detail, 'upstream_payload_parse_error', {
          endpointPath: safeEndpointPath(upstream.endpoint),
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        }),
        502,
        context,
        throttle
      )
    }

    return noStoreJson(parsed.data, 200, context, throttle)
  } catch (error) {
    const failure = getProxyFailure(error)
    if (!shouldSuppressProxyLog(upstream.endpoint, failure.status)) {
      logPublicApiEvent('error', 'rag_proxy.failed', context, {
        type: failure.type,
        status: failure.status,
        endpointPath: safeEndpointPath(upstream.endpoint),
        upstreamOrigin: upstream.upstreamOrigin,
        timeoutMs,
        errorName: error instanceof Error ? error.name : typeof error,
      })
    }

    return noStoreJson(
      buildPublicApiErrorBody(context, failure.detail, failure.type, {
        endpointPath: safeEndpointPath(upstream.endpoint),
        upstreamOrigin: upstream.upstreamOrigin,
        timeoutMs,
      }),
      failure.status,
      context,
      throttle
    )
  }
}

/**
 * GET proxy for health checks and other GET endpoints
 */
export async function GET(request: NextRequest) {
  const context = createPublicApiRequestContext(request, '/api/rag-proxy')
  const throttle = checkPublicApiThrottle(context)

  if (!throttle.ok) {
    return rateLimitedJson(context, throttle)
  }

  const upstream = getProxyUpstream(request.nextUrl.searchParams, '/api/research/health', RAG_API_URL)
  const timeoutMs = getProxyTimeoutMs(request.nextUrl.searchParams, DEFAULT_GET_TIMEOUT_MS, MAX_GET_TIMEOUT_MS)

  if (!upstream.upstreamUrl) {
    return noStoreJson(
      buildPublicApiErrorBody(context, upstream.error || 'Invalid RAG proxy endpoint.', 'invalid_endpoint', {
        endpointPath: safeEndpointPath(upstream.endpoint),
      }),
      400,
      context,
      throttle
    )
  }

  try {
    if (!shouldSuppressProxyLog(upstream.endpoint)) {
      logPublicApiEvent('info', 'rag_proxy.request', context, {
        endpointPath: safeEndpointPath(upstream.endpoint),
        timeoutMs,
      })
    }

    const response = await fetch(upstream.upstreamUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      discardUpstreamBody(response)
      if (!shouldSuppressProxyLog(upstream.endpoint, response.status)) {
        logPublicApiEvent('error', 'rag_proxy.upstream_http_error', context, {
          status: response.status,
          endpointPath: safeEndpointPath(upstream.endpoint),
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        })
      }
      return noStoreJson(
        buildPublicApiErrorBody(context, publicUpstreamHttpErrorDetail(response.status), 'upstream_http_error', {
          status: response.status,
          endpointPath: safeEndpointPath(upstream.endpoint),
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        }),
        response.status,
        context,
        throttle
      )
    }

    const responseText = await response.text()
    const parsed = readUpstreamSuccess(responseText)

    if (!parsed.ok) {
      return noStoreJson(
        buildPublicApiErrorBody(context, parsed.detail, 'upstream_payload_parse_error', {
          endpointPath: safeEndpointPath(upstream.endpoint),
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        }),
        502,
        context,
        throttle
      )
    }

    return noStoreJson(parsed.data, 200, context, throttle)
  } catch (error) {
    const failure = getProxyFailure(error)
    if (!shouldSuppressProxyLog(upstream.endpoint, failure.status)) {
      logPublicApiEvent('error', 'rag_proxy.failed', context, {
        type: failure.type,
        status: failure.status,
        endpointPath: safeEndpointPath(upstream.endpoint),
        upstreamOrigin: upstream.upstreamOrigin,
        timeoutMs,
        errorName: error instanceof Error ? error.name : typeof error,
      })
    }

    return noStoreJson(
      buildPublicApiErrorBody(context, failure.detail, failure.type, {
        endpointPath: safeEndpointPath(upstream.endpoint),
        upstreamOrigin: upstream.upstreamOrigin,
        timeoutMs,
      }),
      failure.status,
      context,
      throttle
    )
  }
}
