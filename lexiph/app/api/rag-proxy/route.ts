import { NextRequest, NextResponse } from 'next/server'

import {
  DEFAULT_GET_TIMEOUT_MS,
  DEFAULT_POST_TIMEOUT_MS,
  DEFAULT_RAG_API_URL,
  MAX_GET_TIMEOUT_MS,
  MAX_POST_TIMEOUT_MS,
  getProxyFailure,
  getProxyTimeoutMs,
  getProxyUpstream,
  summarizeProxyLogDetail,
} from '../../../lib/services/rag-proxy-helpers.mjs'

const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || DEFAULT_RAG_API_URL

function noStoreJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

async function readUpstreamError(response: Response) {
  const text = await response.text()
  return text.slice(0, 1000)
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
    return { ok: false, detail: 'Empty upstream body' }
  }

  try {
    return {
      ok: true,
      data: JSON.parse(text),
    }
  } catch {
    return {
      ok: false,
      detail: `Non-JSON upstream response: ${text.slice(0, 250)}`,
    }
  }
}

/**
 * POST proxy for RAG API endpoints
 * Bypasses CORS by making server-side requests
 */
export async function POST(request: NextRequest) {
  const upstream = getProxyUpstream(request.nextUrl.searchParams, '/api/research/rag-summary', RAG_API_URL)
  const timeoutMs = getProxyTimeoutMs(request.nextUrl.searchParams, DEFAULT_POST_TIMEOUT_MS, MAX_POST_TIMEOUT_MS)

  if (!upstream.upstreamUrl) {
    return noStoreJson(
      {
        detail: upstream.error,
        error: {
          type: 'invalid_endpoint',
          endpoint: upstream.endpoint,
        },
      },
      400
    )
  }

  try {
    const body = await request.json()

    console.log(`[RAG Proxy] POST ${summarizeProxyLogDetail(upstream.endpoint)}`)

    const response = await fetch(upstream.upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      const errorText = await readUpstreamError(response)
      console.error(
        `[RAG Proxy] Error ${response.status} from ${summarizeProxyLogDetail(upstream.endpoint)}: ${summarizeProxyLogDetail(errorText)}`
      )
      return noStoreJson(
        {
          detail: errorText || 'Backend request failed',
          error: {
            type: 'upstream_http_error',
            status: response.status,
            endpoint: upstream.endpoint,
            upstreamOrigin: upstream.upstreamOrigin,
            timeoutMs,
          },
        },
        response.status
      )
    }

    const responseText = await response.text()
    const parsed = readUpstreamSuccess(responseText)

    if (!parsed.ok) {
      return noStoreJson(
        {
          detail: parsed.detail,
          error: {
            type: 'upstream_payload_parse_error',
            endpoint: upstream.endpoint,
            upstreamOrigin: upstream.upstreamOrigin,
            timeoutMs,
          },
        },
        502
      )
    }

    return noStoreJson(parsed.data, 200)
  } catch (error) {
    const failure = getProxyFailure(error)
    console.error(`[RAG Proxy] ${failure.type}: ${failure.detail}`)

    return noStoreJson(
      {
        detail: failure.detail,
        error: {
          type: failure.type,
          endpoint: upstream.endpoint,
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        },
      },
      failure.status
    )
  }
}

/**
 * GET proxy for health checks and other GET endpoints
 */
export async function GET(request: NextRequest) {
  const upstream = getProxyUpstream(request.nextUrl.searchParams, '/api/research/health', RAG_API_URL)
  const timeoutMs = getProxyTimeoutMs(request.nextUrl.searchParams, DEFAULT_GET_TIMEOUT_MS, MAX_GET_TIMEOUT_MS)

  if (!upstream.upstreamUrl) {
    return noStoreJson(
      {
        detail: upstream.error,
        error: {
          type: 'invalid_endpoint',
          endpoint: upstream.endpoint,
        },
      },
      400
    )
  }

  try {
    console.log(`[RAG Proxy] GET ${summarizeProxyLogDetail(upstream.endpoint)}`)

    const response = await fetch(upstream.upstreamUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })

    if (!response.ok) {
      const errorText = await readUpstreamError(response)
      console.error(
        `[RAG Proxy] Error ${response.status} from ${summarizeProxyLogDetail(upstream.endpoint)}: ${summarizeProxyLogDetail(errorText)}`
      )
      return noStoreJson(
        {
          detail: errorText || 'Backend request failed',
          error: {
            type: 'upstream_http_error',
            status: response.status,
            endpoint: upstream.endpoint,
            upstreamOrigin: upstream.upstreamOrigin,
            timeoutMs,
          },
        },
        response.status
      )
    }

    const responseText = await response.text()
    const parsed = readUpstreamSuccess(responseText)

    if (!parsed.ok) {
      return noStoreJson(
        {
          detail: parsed.detail,
          error: {
            type: 'upstream_payload_parse_error',
            endpoint: upstream.endpoint,
            upstreamOrigin: upstream.upstreamOrigin,
            timeoutMs,
          },
        },
        502
      )
    }

    return noStoreJson(parsed.data, 200)
  } catch (error) {
    const failure = getProxyFailure(error)
    console.error(`[RAG Proxy] ${failure.type}: ${failure.detail}`)

    return noStoreJson(
      {
        detail: failure.detail,
        error: {
          type: failure.type,
          endpoint: upstream.endpoint,
          upstreamOrigin: upstream.upstreamOrigin,
          timeoutMs,
        },
      },
      failure.status
    )
  }
}
