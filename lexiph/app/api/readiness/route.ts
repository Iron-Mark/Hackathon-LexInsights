import { lookup } from 'node:dns/promises'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
const DEFAULT_RAG_WS_URL = 'wss://devkada.resqlink.org'
const CHECK_TIMEOUT_MS = 10000

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

async function fetchHealthCheck(name: string, target: string | null): Promise<ReadinessCheck> {
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
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
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

export async function GET(request: NextRequest) {
  const checkedAt = new Date().toISOString()
  const origin = request.nextUrl.origin
  const supabaseUrl = getEnvValue('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = getEnvValue('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const ragApiUrl = getEnvValue('NEXT_PUBLIC_RAG_API_URL') || DEFAULT_RAG_API_URL
  const ragWsUrl = getEnvValue('NEXT_PUBLIC_RAG_WS_URL') || DEFAULT_RAG_WS_URL
  const useRagProxy = getEnvValue('NEXT_PUBLIC_USE_RAG_PROXY') ?? 'true'

  const supabaseParsedUrl = safeUrl(supabaseUrl)
  const ragParsedUrl = safeUrl(ragApiUrl)
  const ragWsParsedUrl = safeUrl(ragWsUrl)
  const ragHealthTarget = ragParsedUrl
    ? new URL('/api/research/health', ragParsedUrl).toString()
    : null
  const ragProxyHealthTarget = `${origin}/api/rag-proxy?endpoint=/api/research/health`

  const externalChecks = await Promise.all([
    dnsCheck('supabase.dns', supabaseParsedUrl?.host || null),
    dnsCheck('rag.dns', ragParsedUrl?.host || null),
    fetchHealthCheck('rag.direct_health', ragHealthTarget),
    fetchHealthCheck('rag.proxy_health', ragProxyHealthTarget),
  ])

  const checks: ReadinessCheck[] = [
    envPresenceCheck('supabase.url', supabaseUrl, supabaseParsedUrl?.host),
    envPresenceCheck('supabase.anon_key', supabaseAnonKey),
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
