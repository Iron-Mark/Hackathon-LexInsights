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
const DEFAULT_RAG_PROVIDER_MODE = 'local-providerless'

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

interface DnsCheckOptions {
  critical?: boolean
  failureMessage?: string
  missingHostMessage?: string
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
      : 'Project ref comparison skipped because URL is not a recognized project URL shape',
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
        message: 'A secret Supabase key must not be exposed through NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
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

function optionalEnvCheck(name: string, value: string | null, target?: string): ReadinessCheck {
  return {
    name,
    status: value ? 'pass' : 'skip',
    critical: false,
    message: value ? 'Configured' : 'Optional in providerless mode',
    target,
  }
}

async function dnsCheck(
  name: string,
  host: string | null,
  options: DnsCheckOptions = {}
): Promise<ReadinessCheck> {
  const startedAt = Date.now()
  const critical = options.critical ?? true

  if (!host) {
    return {
      name,
      status: 'skip',
      critical,
      message: options.missingHostMessage || 'Skipped because no valid host is configured',
      durationMs: elapsedSince(startedAt),
    }
  }

  try {
    await lookup(host)

    return {
      name,
      status: 'pass',
      critical,
      message: 'DNS resolves',
      durationMs: elapsedSince(startedAt),
      target: host,
    }
  } catch (error) {
    return {
      name,
      status: critical ? 'fail' : 'warn',
      critical,
      message: options.failureMessage || (error instanceof Error ? error.message : 'DNS lookup failed'),
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

function skippedExternalCheck(name: string, target?: string | null): ReadinessCheck {
  return {
    name,
    status: 'skip',
    critical: false,
    message: 'Skipped because externalChecks=skip was requested; run the full readiness check before claiming backend E2E.',
    ...(target ? { target } : {}),
  }
}

function skippedProviderlessCheck(name: string, target?: string | null): ReadinessCheck {
  return {
    name,
    status: 'skip',
    critical: false,
    message: 'Skipped because providerless local research is the active provider mode.',
    ...(target ? { target } : {}),
  }
}

function getTimeoutMs(request: NextRequest) {
  const requestedTimeout = Number(request.nextUrl.searchParams.get('timeoutMs'))

  if (!Number.isFinite(requestedTimeout) || requestedTimeout <= 0) {
    return DEFAULT_CHECK_TIMEOUT_MS
  }

  return Math.min(Math.max(requestedTimeout, MIN_CHECK_TIMEOUT_MS), MAX_CHECK_TIMEOUT_MS)
}

function shouldSkipExternalChecks(request: NextRequest) {
  return request.nextUrl.searchParams.get('externalChecks') === 'skip'
}

function getRagProviderMode() {
  const value = getEnvValue('NEXT_PUBLIC_RAG_PROVIDER_MODE')?.toLowerCase()

  if (value === 'remote' || value === 'remote-rag') {
    return 'remote-rag'
  }

  return DEFAULT_RAG_PROVIDER_MODE
}

function detailTokenMatches(request: NextRequest) {
  const token = getEnvValue('DIAGNOSTIC_DETAIL_TOKEN')

  if (!token) {
    return false
  }

  return request.headers.get('x-lexinsights-diagnostics') === token
}

function shouldExposeDiagnosticDetails(request: NextRequest) {
  if (detailTokenMatches(request)) {
    return true
  }

  return process.env.NODE_ENV !== 'production' && request.nextUrl.searchParams.get('details') === '1'
}

function publicCheck(check: ReadinessCheck): ReadinessCheck {
  return {
    name: check.name,
    status: check.status,
    critical: check.critical,
    message: check.message,
    ...(Number.isFinite(check.durationMs) ? { durationMs: check.durationMs } : {}),
  }
}

export async function GET(request: NextRequest) {
  const checkedAt = new Date().toISOString()
  const origin = request.nextUrl.origin
  const timeoutMs = getTimeoutMs(request)
  const skipExternalChecks = shouldSkipExternalChecks(request)
  const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
  const supabasePublishableKey = getEnvValue('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')
  const supabaseAnonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const supabasePublicKey = supabasePublishableKey || supabaseAnonKey
  const ragApiUrl = getEnvValue('NEXT_PUBLIC_RAG_API_URL') || DEFAULT_RAG_API_URL
  const ragWsUrl = getEnvValue('NEXT_PUBLIC_RAG_WS_URL') || DEFAULT_RAG_WS_URL
  const useRagProxy = getEnvValue('NEXT_PUBLIC_USE_RAG_PROXY') ?? 'true'
  const ragProviderMode = getRagProviderMode()
  const remoteRagEnabled = ragProviderMode === 'remote-rag'

  const supabaseParsedUrl = safeUrl(supabaseUrl)
  const ragParsedUrl = safeUrl(ragApiUrl)
  const ragWsParsedUrl = safeUrl(ragWsUrl)
  const supabaseProjectRef = getStandardSupabaseProjectRef(supabaseParsedUrl)
  const supabaseDnsHost = supabaseParsedUrl?.hostname || null
  const ragDnsHost = ragParsedUrl?.hostname || null
  const ragHealthTarget = ragParsedUrl
    ? new URL('/api/research/health', ragParsedUrl).toString()
    : null
  const ragProxyHealthTarget = `${origin}/api/rag-proxy?endpoint=/api/research/health&timeoutMs=${timeoutMs}`

  const ragExternalChecks = !remoteRagEnabled
    ? [
        skippedProviderlessCheck('rag.dns', ragDnsHost),
        skippedProviderlessCheck('rag.direct_health', ragHealthTarget),
        skippedProviderlessCheck('rag.proxy_health', ragProxyHealthTarget),
      ]
    : skipExternalChecks
      ? [
          skippedExternalCheck('rag.dns', ragDnsHost),
          skippedExternalCheck('rag.direct_health', ragHealthTarget),
          skippedExternalCheck('rag.proxy_health', ragProxyHealthTarget),
        ]
      : await Promise.all([
          dnsCheck('rag.dns', ragDnsHost),
          fetchHealthCheck('rag.direct_health', ragHealthTarget, timeoutMs),
          fetchHealthCheck('rag.proxy_health', ragProxyHealthTarget, timeoutMs),
        ])

  const externalChecks = skipExternalChecks
    ? [
        skippedExternalCheck('supabase.dns', supabaseDnsHost),
        ...ragExternalChecks,
      ]
    : await Promise.all([
        dnsCheck('supabase.dns', supabaseDnsHost, {
          critical: false,
          failureMessage:
            'Supabase DNS did not resolve during this diagnostic check; public providerless chat remains usable, but authenticated persistence may be degraded.',
        }),
      ]).then((checks) => [...checks, ...ragExternalChecks])

  const checks: ReadinessCheck[] = [
    envPresenceCheck('supabase.url', supabaseUrl, supabaseParsedUrl?.host),
    envPresenceCheck('supabase.anon_key', supabasePublicKey),
    supabaseProjectRefCheck(supabaseProjectRef, supabaseParsedUrl?.host),
    ...supabaseAnonKeyChecks(supabasePublicKey, supabaseProjectRef),
    {
      name: 'rag.provider_mode',
      status: 'pass',
      critical: false,
      message:
        ragProviderMode === 'remote-rag'
          ? 'Remote RAG provider is explicitly enabled.'
          : 'Providerless local research is the default provider mode.',
      details: {
        value: ragProviderMode,
      },
    },
    remoteRagEnabled
      ? envPresenceCheck('rag.api_url', ragApiUrl, ragParsedUrl?.origin)
      : optionalEnvCheck('rag.api_url', ragApiUrl, ragParsedUrl?.origin),
    remoteRagEnabled
      ? envPresenceCheck('rag.websocket_url', ragWsUrl, ragWsParsedUrl?.origin)
      : optionalEnvCheck('rag.websocket_url', ragWsUrl, ragWsParsedUrl?.origin),
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
        externalChecks: skipExternalChecks ? 'skip' : 'run',
      },
    },
    ...externalChecks,
  ]

  const ready = checks.every((check) => !check.critical || check.status === 'pass')
  const statusCode = ready ? 200 : 503
  const exposeDetails = shouldExposeDiagnosticDetails(request)

  return NextResponse.json(
    {
      ready,
      checkedAt,
      providerMode: ragProviderMode,
      externalChecks: skipExternalChecks ? 'skip' : 'run',
      checks: exposeDetails ? checks : checks.map(publicCheck),
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
