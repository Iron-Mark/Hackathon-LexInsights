import { lookup } from 'node:dns/promises'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
const DEFAULT_RAG_WS_URL = 'wss://devkada.resqlink.org'
const DEFAULT_CHECK_TIMEOUT_MS = 10000
const MIN_CHECK_TIMEOUT_MS = 500
const MAX_CHECK_TIMEOUT_MS = 60000
const SUPABASE_PROJECT_HOST_SUFFIX = '.supabase.co'

type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip'

interface ReadinessCheck {
  name: string
  status: CheckStatus
  critical: boolean
  message: string
  durationMs?: number
  target?: string
  details?: Record<string, unknown>
}

function elapsedSince(startedAt: number) {
  return Date.now() - startedAt
}

function getEnvValue(name: string) {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : null
}

function safeUrl(value: string | null) {
  if (!value) {
    return null
  }

  try {
    return new URL(value)
  } catch {
    return null
  }
}

function base64UrlDecodeJson(segment: string): Record<string, unknown> | null {
  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    const decoded = Buffer.from(padded, 'base64').toString('utf8')
    const parsed = JSON.parse(decoded)

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

function getStandardSupabaseProjectRef(url: URL | null) {
  if (!url) {
    return null
  }

  const host = url.hostname.toLowerCase()

  if (!host.endsWith(SUPABASE_PROJECT_HOST_SUFFIX)) {
    return null
  }

  const projectRef = host.slice(0, -SUPABASE_PROJECT_HOST_SUFFIX.length)
  return projectRef || null
}

function getIssuerProjectRef(issuer: unknown) {
  if (typeof issuer !== 'string') {
    return null
  }

  const issuerUrl = safeUrl(issuer)

  if (!issuerUrl || issuerUrl.pathname !== '/auth/v1') {
    return null
  }

  return getStandardSupabaseProjectRef(issuerUrl)
}

function inspectSupabaseKey(value: string | null) {
  if (!value) {
    return {
      kind: 'missing' as const,
    }
  }

  if (value.startsWith('sb_secret_')) {
    return {
      kind: 'secret' as const,
    }
  }

  if (value.startsWith('sb_publishable_')) {
    return {
      kind: 'publishable' as const,
    }
  }

  const parts = value.split('.')

  if (parts.length !== 3) {
    return {
      kind: 'unknown' as const,
    }
  }

  const header = base64UrlDecodeJson(parts[0])
  const payload = base64UrlDecodeJson(parts[1])

  if (!header || !payload) {
    return {
      kind: 'unknown' as const,
    }
  }

  return {
    kind: 'jwt' as const,
    alg: typeof header.alg === 'string' ? header.alg : null,
    role: typeof payload.role === 'string' ? payload.role : null,
    issuerProjectRef:
      getIssuerProjectRef(payload.iss) || (typeof payload.ref === 'string' ? payload.ref : null),
  }
}

function supabaseProjectRefCheck(projectRef: string | null, host: string | undefined): ReadinessCheck {
  return {
    name: 'supabase.project_ref',
    status: projectRef ? 'pass' : 'warn',
    critical: false,
    message: projectRef
      ? 'Project ref parsed from standard Supabase URL'
      : 'Project ref comparison skipped because URL is not the standard <ref>.supabase.co shape',
    target: host,
    details: {
      projectRef,
    },
  }
}

function supabaseAnonKeyChecks(value: string | null, expectedProjectRef: string | null) {
  const inspection = inspectSupabaseKey(value)

  if (inspection.kind === 'missing') {
    return []
  }

  if (inspection.kind === 'secret') {
    return [
      {
        name: 'supabase.anon_key_format',
        status: 'fail' as const,
        critical: true,
        message: 'A secret Supabase key must not be exposed through NEXT_PUBLIC_SUPABASE_ANON_KEY',
      },
    ]
  }

  if (inspection.kind === 'publishable') {
    return [
      {
        name: 'supabase.anon_key_format',
        status: 'pass' as const,
        critical: true,
        message: 'Supabase publishable key format detected',
        details: {
          kind: inspection.kind,
        },
      },
      {
        name: 'supabase.anon_key_project_ref',
        status: 'skip' as const,
        critical: false,
        message: 'Publishable keys do not expose a legacy JWT issuer project ref',
        details: {
          expectedProjectRef,
        },
      },
    ]
  }

  if (inspection.kind === 'unknown') {
    return [
      {
        name: 'supabase.anon_key_format',
        status: 'fail' as const,
        critical: true,
        message: 'Supabase anon key is not a recognizable legacy JWT or publishable key',
      },
    ]
  }

  const projectRefMatches =
    expectedProjectRef && inspection.issuerProjectRef
      ? expectedProjectRef === inspection.issuerProjectRef
      : null

  return [
    {
      name: 'supabase.anon_key_format',
      status: 'pass' as const,
      critical: true,
      message: 'Legacy Supabase JWT anon key format detected',
      details: {
        kind: inspection.kind,
        alg: inspection.alg,
      },
    },
    {
      name: 'supabase.anon_key_role',
      status: inspection.role === 'anon' ? 'pass' as const : 'fail' as const,
      critical: true,
      message:
        inspection.role === 'anon'
          ? 'Anon key role claim is correct'
          : 'Supabase anon key role claim is not anon',
      details: {
        role: inspection.role,
      },
    },
    {
      name: 'supabase.anon_key_project_ref',
      status: projectRefMatches === null ? 'warn' as const : projectRefMatches ? 'pass' as const : 'fail' as const,
      critical: projectRefMatches !== null,
      message:
        projectRefMatches === null
          ? 'Project ref comparison skipped because issuer or URL project ref is unavailable'
          : projectRefMatches
            ? 'Anon key issuer matches the configured Supabase project ref'
            : 'Anon key issuer does not match the configured Supabase project ref',
      details: {
        expectedProjectRef,
        issuerProjectRef: inspection.issuerProjectRef,
      },
    },
  ]
}

function envPresenceCheck(name: string, value: string | null, target?: string): ReadinessCheck {
  return {
    name,
    status: value ? 'pass' : 'fail',
    critical: true,
    message: value ? 'Configured' : 'Missing required environment value',
    target,
  }
}

async function dnsCheck(name: string, host: string | null): Promise<ReadinessCheck> {
  const startedAt = Date.now()

  if (!host) {
    return {
      name,
      status: 'skip',
      critical: true,
      message: 'Skipped because no valid host is configured',
      durationMs: elapsedSince(startedAt),
    }
  }

  try {
    await lookup(host)

    return {
      name,
      status: 'pass',
      critical: true,
      message: 'DNS resolves',
      durationMs: elapsedSince(startedAt),
      target: host,
    }
  } catch (error) {
    return {
      name,
      status: 'fail',
      critical: true,
      message: error instanceof Error ? error.message : 'DNS lookup failed',
      durationMs: elapsedSince(startedAt),
      target: host,
    }
  }
}

async function fetchHealthCheck(
  name: string,
  target: string | null,
  timeoutMs: number
): Promise<ReadinessCheck> {
  const startedAt = Date.now()

  if (!target) {
    return {
      name,
      status: 'skip',
      critical: true,
      message: 'Skipped because no valid target URL is configured',
      durationMs: elapsedSince(startedAt),
    }
  }

  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })

    const text = await response.text()
    let parsedBody: unknown = null

    try {
      parsedBody = text ? JSON.parse(text) : null
    } catch {
      parsedBody = text.slice(0, 200)
    }

    return {
      name,
      status: response.ok ? 'pass' : 'fail',
      critical: true,
      message: `HTTP ${response.status}`,
      durationMs: elapsedSince(startedAt),
      target,
      details: {
        responseStatus: response.status,
        body: parsedBody,
      },
    }
  } catch (error) {
    return {
      name,
      status: 'fail',
      critical: true,
      message: error instanceof Error ? error.message : 'Health request failed',
      durationMs: elapsedSince(startedAt),
      target,
    }
  }
}

function getTimeoutMs(request: NextRequest) {
  const requestedTimeout = Number(request.nextUrl.searchParams.get('timeoutMs'))

  if (!Number.isFinite(requestedTimeout) || requestedTimeout <= 0) {
    return DEFAULT_CHECK_TIMEOUT_MS
  }

  return Math.min(Math.max(requestedTimeout, MIN_CHECK_TIMEOUT_MS), MAX_CHECK_TIMEOUT_MS)
}

export async function GET(request: NextRequest) {
  const checkedAt = new Date().toISOString()
  const origin = request.nextUrl.origin
  const timeoutMs = getTimeoutMs(request)
  const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const ragApiUrl = getEnvValue('NEXT_PUBLIC_RAG_API_URL') || DEFAULT_RAG_API_URL
  const ragWsUrl = getEnvValue('NEXT_PUBLIC_RAG_WS_URL') || DEFAULT_RAG_WS_URL
  const useRagProxy = getEnvValue('NEXT_PUBLIC_USE_RAG_PROXY') ?? 'true'

  const supabaseParsedUrl = safeUrl(supabaseUrl)
  const ragParsedUrl = safeUrl(ragApiUrl)
  const ragWsParsedUrl = safeUrl(ragWsUrl)
  const supabaseProjectRef = getStandardSupabaseProjectRef(supabaseParsedUrl)
  const ragHealthTarget = ragParsedUrl
    ? new URL('/api/research/health', ragParsedUrl).toString()
    : null
  const ragProxyHealthTarget = `${origin}/api/rag-proxy?endpoint=/api/research/health`

  const externalChecks = await Promise.all([
    dnsCheck('supabase.dns', supabaseParsedUrl?.host || null),
    dnsCheck('rag.dns', ragParsedUrl?.host || null),
    fetchHealthCheck('rag.direct_health', ragHealthTarget, timeoutMs),
    fetchHealthCheck('rag.proxy_health', ragProxyHealthTarget, timeoutMs),
  ])

  const checks: ReadinessCheck[] = [
    envPresenceCheck('supabase.url', supabaseUrl, supabaseParsedUrl?.host),
    envPresenceCheck('supabase.anon_key', supabaseAnonKey),
    supabaseProjectRefCheck(supabaseProjectRef, supabaseParsedUrl?.host),
    ...supabaseAnonKeyChecks(supabaseAnonKey, supabaseProjectRef),
    envPresenceCheck('rag.api_url', ragApiUrl, ragParsedUrl?.origin),
    envPresenceCheck('rag.websocket_url', ragWsUrl, ragWsParsedUrl?.origin),
    {
      name: 'rag.proxy_enabled',
      status: useRagProxy === 'false' ? 'warn' : 'pass',
      critical: false,
      message:
        useRagProxy === 'false'
          ? 'Browser clients will call the RAG backend directly'
          : 'Browser clients use the Next.js RAG proxy',
      details: {
        value: useRagProxy,
      },
    },
    {
      name: 'readiness.timeout_ms',
      status: 'pass',
      critical: false,
      message: 'External health check timeout',
      details: {
        value: timeoutMs,
      },
    },
    ...externalChecks,
  ]

  const ready = checks.every((check) => !check.critical || check.status === 'pass')
  const statusCode = ready ? 200 : 503

  return NextResponse.json(
    {
      ready,
      checkedAt,
      checks,
      summary: ready
        ? 'All critical backend readiness checks passed.'
        : 'One or more critical backend readiness checks failed.',
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}
