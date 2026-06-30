type RequestHeaders = {
  get: (name: string) => string | null
}

type RequestLike = {
  headers: RequestHeaders
  method?: string
}

export type PublicApiRoute = '/api/rag-proxy' | '/api/document-text' | '/api/analytics'

export type PublicApiRequestContext = {
  requestId: string
  method: string
  route: PublicApiRoute
  routeKey: string
  clientKey: string
  clientFingerprint: string
}

export type ThrottleLimit = {
  windowMs: number
  max: number
}

export type ThrottleResult = {
  ok: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfterSeconds: number
}

type ThrottleBucket = {
  count: number
  resetAt: number
}

type LogLevel = 'info' | 'warn' | 'error'

const REQUEST_ID_HEADER = 'x-request-id'
const DEFAULT_CLIENT_KEY = 'unknown-client'
const MAX_LOG_STRING_LENGTH = 180
const MAX_LOG_ARRAY_ITEMS = 8
const MAX_LOG_DEPTH = 4
const MAX_THROTTLE_BUCKETS = 5000
const DEFAULT_HASH_SALT = 'lexinsights-public-api-observability'

export const PUBLIC_API_THROTTLE_LIMITS: Record<string, ThrottleLimit> = {
  'GET /api/rag-proxy': {
    windowMs: 60_000,
    max: 120,
  },
  'POST /api/rag-proxy': {
    windowMs: 60_000,
    max: 30,
  },
  'POST /api/document-text': {
    windowMs: 60_000,
    max: 12,
  },
  'POST /api/analytics': {
    windowMs: 60_000,
    max: 120,
  },
}

const REDACTED = '[redacted]'
const SAFE_LOG_KEYS = new Set([
  'clientFingerprint',
  'contentLength',
  'count',
  'detail',
  'durationMs',
  'endpointPath',
  'errorName',
  'event',
  'extension',
  'fileSize',
  'fileType',
  'level',
  'limit',
  'maxBytes',
  'maxSize',
  'method',
  'remaining',
  'requestId',
  'resetAt',
  'retryAfterSeconds',
  'route',
  'routeKey',
  'status',
  'support',
  'timeoutMs',
  'type',
  'upstreamOrigin',
  'analyticsEvent',
  'category',
  'component',
  'path',
  'resourceId',
  'source',
  'viewport',
])
const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|token|secret|password|credential|api[-_]?key|prompt|query|draft|text|content|body|buffer|file(name)?|email|phone|ip|user[-_]?id)/i
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
const SECRET_MARKER_PATTERN = /\b(?:sk|sb|pk)_[A-Za-z0-9_=-]{8,}\b/g
const IPV4_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const PHONE_PATTERN = /(?:\+?\d[\d\s().-]{7,}\d)/g

const globalThrottleStore = globalThis as typeof globalThis & {
  __lexInsightsPublicApiThrottle?: Map<string, ThrottleBucket>
}

const throttleStore = globalThrottleStore.__lexInsightsPublicApiThrottle || new Map<string, ThrottleBucket>()
globalThrottleStore.__lexInsightsPublicApiThrottle = throttleStore

function getHashSalt() {
  return process.env.PUBLIC_API_LOG_HASH_SALT || DEFAULT_HASH_SALT
}

function stableHash(value: string) {
  let hash1 = 0xdeadbeef
  let hash2 = 0x41c6ce57
  const input = `${getHashSalt()}:${value}`

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    hash1 = Math.imul(hash1 ^ code, 2654435761)
    hash2 = Math.imul(hash2 ^ code, 1597334677)
  }

  hash1 = Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^ Math.imul(hash2 ^ (hash2 >>> 13), 3266489909)
  hash2 = Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^ Math.imul(hash1 ^ (hash1 >>> 13), 3266489909)

  return `${(hash2 >>> 0).toString(16).padStart(8, '0')}${(hash1 >>> 0).toString(16).padStart(8, '0')}`.slice(0, 16)
}

function randomRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function getOrCreateRequestId(headers: RequestHeaders) {
  const incoming = headers.get(REQUEST_ID_HEADER)?.trim()

  if (incoming && /^[A-Za-z0-9._:-]{8,80}$/.test(incoming)) {
    return incoming
  }

  return randomRequestId()
}

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || ''
}

function normalizeClientKey(value: string) {
  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return DEFAULT_CLIENT_KEY
  }

  return normalized.slice(0, 128)
}

export function getClientKey(headers: RequestHeaders) {
  return normalizeClientKey(
    firstHeaderValue(headers.get('x-forwarded-for')) ||
      headers.get('cf-connecting-ip') ||
      headers.get('x-real-ip') ||
      DEFAULT_CLIENT_KEY
  )
}

export function createPublicApiRequestContext(
  request: RequestLike,
  route: PublicApiRoute
): PublicApiRequestContext {
  const method = (request.method || 'GET').toUpperCase()
  const clientKey = getClientKey(request.headers)

  return {
    requestId: getOrCreateRequestId(request.headers),
    method,
    route,
    routeKey: `${method} ${route}`,
    clientKey,
    clientFingerprint: stableHash(clientKey),
  }
}

export function getPublicApiThrottleLimit(routeKey: string) {
  return PUBLIC_API_THROTTLE_LIMITS[routeKey]
}

function pruneThrottleStore(now: number) {
  if (throttleStore.size <= MAX_THROTTLE_BUCKETS) {
    return
  }

  for (const [key, bucket] of throttleStore.entries()) {
    if (bucket.resetAt <= now) {
      throttleStore.delete(key)
    }
  }
}

export function resetPublicApiThrottleForSelfTest() {
  throttleStore.clear()
}

export function checkPublicApiThrottle(
  context: PublicApiRequestContext,
  limit = getPublicApiThrottleLimit(context.routeKey),
  now = Date.now()
): ThrottleResult {
  if (!limit) {
    return {
      ok: true,
      limit: Number.POSITIVE_INFINITY,
      remaining: Number.POSITIVE_INFINITY,
      resetAt: now,
      retryAfterSeconds: 0,
    }
  }

  pruneThrottleStore(now)

  const bucketKey = `${context.routeKey}:${context.clientKey}`
  const current = throttleStore.get(bucketKey)
  const bucket =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          resetAt: now + limit.windowMs,
        }

  bucket.count += 1
  throttleStore.set(bucketKey, bucket)

  const remaining = Math.max(0, limit.max - bucket.count)
  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))

  return {
    ok: bucket.count <= limit.max,
    limit: limit.max,
    remaining,
    resetAt: bucket.resetAt,
    retryAfterSeconds: bucket.count <= limit.max ? 0 : retryAfterSeconds,
  }
}

export function getThrottleHeaders(result: ThrottleResult, requestId: string) {
  const headers: Record<string, string> = {
    'X-Request-ID': requestId,
    'X-RateLimit-Limit': Number.isFinite(result.limit) ? String(result.limit) : 'unlimited',
    'X-RateLimit-Remaining': Number.isFinite(result.remaining) ? String(result.remaining) : 'unlimited',
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
  }

  if (!result.ok) {
    headers['Retry-After'] = String(result.retryAfterSeconds)
  }

  return headers
}

export function buildPublicApiErrorBody(
  context: Pick<PublicApiRequestContext, 'requestId'>,
  detail: string,
  type: string,
  details: Record<string, unknown> = {}
) {
  return {
    detail,
    error: {
      type,
      requestId: context.requestId,
      ...sanitizePublicErrorDetails(details),
    },
  }
}

export function buildThrottleErrorBody(context: PublicApiRequestContext, result: ThrottleResult) {
  return buildPublicApiErrorBody(context, 'Too many requests. Try again shortly.', 'rate_limited', {
    route: context.route,
    retryAfterSeconds: result.retryAfterSeconds,
  })
}

function sanitizePublicErrorDetails(value: Record<string, unknown>) {
  const sanitized: Record<string, unknown> = {}

  for (const [key, item] of Object.entries(value)) {
    if (item === undefined || (!SAFE_LOG_KEYS.has(key) && SENSITIVE_KEY_PATTERN.test(key))) {
      continue
    }

    if (typeof item === 'string') {
      sanitized[key] = redactSensitiveString(item)
      continue
    }

    if (typeof item === 'number' || typeof item === 'boolean' || item === null) {
      sanitized[key] = item
    }
  }

  return sanitized
}

function redactSensitiveString(value: string) {
  return value
    .replace(BEARER_PATTERN, REDACTED)
    .replace(JWT_PATTERN, REDACTED)
    .replace(SECRET_MARKER_PATTERN, REDACTED)
    .replace(EMAIL_PATTERN, '[redacted-email]')
    .replace(IPV4_PATTERN, '[redacted-ip]')
    .replace(PHONE_PATTERN, '[redacted-phone]')
}

function normalizeLogString(value: string) {
  const redacted = redactSensitiveString(value).replace(/\s+/g, ' ').trim()
  return redacted.length > MAX_LOG_STRING_LENGTH ? `${redacted.slice(0, MAX_LOG_STRING_LENGTH - 3)}...` : redacted
}

function isSensitiveLogKey(key: string) {
  return !SAFE_LOG_KEYS.has(key) && SENSITIVE_KEY_PATTERN.test(key)
}

export function sanitizeForStructuredLog(value: unknown, key = '', depth = 0): unknown {
  if (isSensitiveLogKey(key)) {
    return REDACTED
  }

  if (value === null || value === undefined) {
    return value
  }

  if (typeof value === 'string') {
    return normalizeLogString(value)
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: normalizeLogString(value.message),
    }
  }

  if (depth >= MAX_LOG_DEPTH) {
    return '[truncated]'
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_LOG_ARRAY_ITEMS).map((item) => sanitizeForStructuredLog(item, key, depth + 1))
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {}

    for (const [childKey, childValue] of Object.entries(value)) {
      output[childKey] = sanitizeForStructuredLog(childValue, childKey, depth + 1)
    }

    return output
  }

  return String(value)
}

export function safeEndpointPath(value: string | undefined) {
  if (!value) {
    return ''
  }

  try {
    return new URL(value, 'https://lexinsights.local').pathname.slice(0, MAX_LOG_STRING_LENGTH)
  } catch {
    return normalizeLogString(value)
  }
}

export function logPublicApiEvent(
  level: LogLevel,
  event: string,
  context: PublicApiRequestContext,
  details: Record<string, unknown> = {}
) {
  const entry = sanitizeForStructuredLog({
    time: new Date().toISOString(),
    level,
    event,
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    clientFingerprint: context.clientFingerprint,
    ...details,
  })
  const message = JSON.stringify(entry)

  if (level === 'error') {
    console.error(message)
  } else if (level === 'warn') {
    console.warn(message)
  } else {
    console.log(message)
  }
}
