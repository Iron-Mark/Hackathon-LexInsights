import { NextRequest, NextResponse } from 'next/server'

import {
  buildPublicApiErrorBody,
  buildThrottleErrorBody,
  checkPublicApiThrottle,
  createPublicApiRequestContext,
  getThrottleHeaders,
  logPublicApiEvent,
  type PublicApiRequestContext,
  type ThrottleResult,
} from '@/lib/server/request-guardrails'

export const dynamic = 'force-dynamic'

const ALLOWED_EVENTS = new Set(['page_view', 'help_resources_open', 'source_link_click', 'chat_start'])
const ALLOWED_PATHS = new Set(['/', '/chat', '/about', '/privacy', '/terms'])
const MAX_BODY_BYTES = 2 * 1024
const MAX_VALUE_LENGTH = 80

type AnalyticsMetadata = {
  category?: string
  component?: string
  path?: string
  resourceId?: string
  source?: string
  viewport?: string
}

function noStoreJson(
  body: unknown,
  status: number,
  context: PublicApiRequestContext,
  throttle?: ThrottleResult
) {
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...(throttle ? getThrottleHeaders(throttle, context.requestId) : { 'X-Request-ID': context.requestId }),
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

function normalizeText(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, MAX_VALUE_LENGTH)

  return normalized || undefined
}

function sanitizePath(value: unknown) {
  const path = normalizeText(value)

  if (!path) {
    return undefined
  }

  return ALLOWED_PATHS.has(path) ? path : undefined
}

function sanitizeMetadata(value: unknown): AnalyticsMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const record = value as Record<string, unknown>

  return {
    category: normalizeText(record.category),
    component: normalizeText(record.component),
    path: sanitizePath(record.path),
    resourceId: normalizeText(record.resourceId),
    source: normalizeText(record.source),
    viewport: normalizeText(record.viewport),
  }
}

export async function POST(request: NextRequest) {
  const context = createPublicApiRequestContext(request, '/api/analytics')
  const throttle = checkPublicApiThrottle(context)

  if (!throttle.ok) {
    return rateLimitedJson(context, throttle)
  }

  const contentLength = Number(request.headers.get('content-length') || 0)

  if (contentLength > MAX_BODY_BYTES) {
    return noStoreJson(
      buildPublicApiErrorBody(context, 'Analytics event is too large.', 'payload_too_large', {
        maxBytes: MAX_BODY_BYTES,
        contentLength,
      }),
      413,
      context,
      throttle
    )
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return noStoreJson(
      buildPublicApiErrorBody(context, 'Analytics event must be valid JSON.', 'invalid_json'),
      400,
      context,
      throttle
    )
  }

  const record = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
  const event = record ? normalizeText(record.event) : undefined

  if (!event || !ALLOWED_EVENTS.has(event)) {
    return noStoreJson(
      buildPublicApiErrorBody(context, 'Analytics event is not supported.', 'unsupported_event'),
      400,
      context,
      throttle
    )
  }

  const metadata = sanitizeMetadata(record?.metadata)

  logPublicApiEvent('info', 'analytics.event', context, {
    analyticsEvent: event,
    category: metadata.category,
    component: metadata.component,
    path: metadata.path,
    resourceId: metadata.resourceId,
    source: metadata.source,
    viewport: metadata.viewport,
  })

  return new Response(null, {
    status: 204,
    headers: {
      'Cache-Control': 'no-store',
      ...getThrottleHeaders(throttle, context.requestId),
    },
  })
}
