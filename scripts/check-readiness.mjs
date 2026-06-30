#!/usr/bin/env node

import { lookup } from 'node:dns/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
const DEFAULT_RAG_WS_URL = 'wss://devkada.resqlink.org'
const DEFAULT_RAG_PROVIDER_MODE = 'local-providerless'
const DEFAULT_TIMEOUT_MS = 15000
const SUPABASE_PROJECT_HOST_SUFFIX = '.supabase.co'
const ROUTES_TO_CHECK = [
  '/',
  '/auth/login',
  '/chat',
  '/documents',
  '/test-rag',
  '/test-document',
]

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')

export function parseArgs(argv) {
  const args = {
    baseUrl: null,
    json: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    skipExternalChecks: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--json') {
      args.json = true
      continue
    }

    if (arg === '--base-url') {
      args.baseUrl = argv[index + 1] || null
      index += 1
      continue
    }

    if (arg.startsWith('--base-url=')) {
      args.baseUrl = arg.slice('--base-url='.length)
      continue
    }

    if (arg === '--timeout-ms') {
      const value = Number(argv[index + 1])
      args.timeoutMs = Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS
      index += 1
      continue
    }

    if (arg.startsWith('--timeout-ms=')) {
      const value = Number(arg.slice('--timeout-ms='.length))
      args.timeoutMs = Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS
    }

    if (arg === '--skip-external-checks') {
      args.skipExternalChecks = true
    }

    if (arg === '--include-external-checks') {
      args.skipExternalChecks = false
    }
  }

  return args
}

export function readinessEndpointPath(timeoutMs, skipExternalChecks) {
  const params = new URLSearchParams({
    timeoutMs: String(timeoutMs),
  })

  if (skipExternalChecks) {
    params.set('externalChecks', 'skip')
  }

  return `/api/readiness?${params.toString()}`
}

function skippedExternalCheck(name) {
  return {
    name,
    status: 'skip',
    critical: false,
    message: 'External checks skipped by CLI flag',
  }
}

function skippedProviderlessCheck(name, target) {
  return {
    name,
    status: 'skip',
    critical: false,
    message: 'Skipped because providerless local research is the active provider mode.',
    ...(target ? { target } : {}),
  }
}

export function parseEnvFile(path) {
  if (!existsSync(path)) {
    return {}
  }

  return readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim()

      if (!trimmed || trimmed.startsWith('#')) {
        return env
      }

      const separatorIndex = trimmed.indexOf('=')

      if (separatorIndex === -1) {
        return env
      }

      const key = trimmed.slice(0, separatorIndex).trim()
      let value = trimmed.slice(separatorIndex + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (value.length === 0) {
        return env
      }

      env[key] = value
      return env
    }, {})
}

function loadEnvironment() {
  return {
    ...parseEnvFile(resolve(projectRoot, '.env')),
    ...parseEnvFile(resolve(projectRoot, '.env.local')),
    ...process.env,
  }
}

function elapsedSince(startedAt) {
  return Date.now() - startedAt
}

export function safeUrl(value) {
  if (!value) {
    return null
  }

  try {
    return new URL(value)
  } catch {
    return null
  }
}

function base64UrlDecodeJson(segment) {
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

export function getStandardSupabaseProjectRef(url) {
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

function getIssuerProjectRef(issuer) {
  if (typeof issuer !== 'string') {
    return null
  }

  const issuerUrl = safeUrl(issuer)

  if (!issuerUrl || issuerUrl.pathname !== '/auth/v1') {
    return null
  }

  return getStandardSupabaseProjectRef(issuerUrl)
}

export function inspectSupabaseKey(value) {
  if (!value) {
    return {
      kind: 'missing',
    }
  }

  if (value.startsWith('sb_secret_')) {
    return {
      kind: 'secret',
    }
  }

  if (value.startsWith('sb_publishable_')) {
    return {
      kind: 'publishable',
    }
  }

  const parts = value.split('.')

  if (parts.length !== 3) {
    return {
      kind: 'unknown',
    }
  }

  const header = base64UrlDecodeJson(parts[0])
  const payload = base64UrlDecodeJson(parts[1])

  if (!header || !payload) {
    return {
      kind: 'unknown',
    }
  }

  return {
    kind: 'jwt',
    alg: typeof header.alg === 'string' ? header.alg : null,
    role: typeof payload.role === 'string' ? payload.role : null,
    issuerProjectRef:
      getIssuerProjectRef(payload.iss) || (typeof payload.ref === 'string' ? payload.ref : null),
  }
}

export function checkSupabaseProjectRef(projectRef, host) {
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

export function checkSupabaseAnonKey(value, expectedProjectRef) {
  const inspection = inspectSupabaseKey(value)

  if (inspection.kind === 'missing') {
    return []
  }

  if (inspection.kind === 'secret') {
    return [
      {
        name: 'supabase.anon_key_format',
        status: 'fail',
        critical: true,
        message: 'A secret Supabase key must not be exposed through NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY',
      },
    ]
  }

  if (inspection.kind === 'publishable') {
    return [
      {
        name: 'supabase.anon_key_format',
        status: 'pass',
        critical: true,
        message: 'Supabase publishable key format detected',
        details: {
          kind: inspection.kind,
        },
      },
      {
        name: 'supabase.anon_key_project_ref',
        status: 'skip',
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
        status: 'fail',
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
      status: 'pass',
      critical: true,
      message: 'Legacy Supabase JWT anon key format detected',
      details: {
        kind: inspection.kind,
        alg: inspection.alg,
      },
    },
    {
      name: 'supabase.anon_key_role',
      status: inspection.role === 'anon' ? 'pass' : 'fail',
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
      status: projectRefMatches === null ? 'warn' : projectRefMatches ? 'pass' : 'fail',
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

function checkEnv(name, value, target) {
  return {
    name,
    status: value ? 'pass' : 'fail',
    critical: true,
    message: value ? 'Configured' : 'Missing required environment value',
    target,
  }
}

function checkOptionalEnv(name, value, target) {
  return {
    name,
    status: value ? 'pass' : 'skip',
    critical: false,
    message: value ? 'Configured' : 'Optional in providerless mode',
    target,
  }
}

function getRagProviderMode(env) {
  const value = env.NEXT_PUBLIC_RAG_PROVIDER_MODE?.trim().toLowerCase()

  if (value === 'remote' || value === 'remote-rag') {
    return 'remote-rag'
  }

  return DEFAULT_RAG_PROVIDER_MODE
}

export async function checkDns(name, host, options = {}) {
  const startedAt = Date.now()
  const critical = options.critical !== false
  const lookupFn = options.lookup || lookup

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
    await lookupFn(host)

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

async function checkFetch(name, target, timeoutMs, expectedStatuses = [200]) {
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
        Accept: 'application/json,text/html',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })

    return {
      name,
      status: expectedStatuses.includes(response.status) ? 'pass' : 'fail',
      critical: true,
      message: `HTTP ${response.status}`,
      durationMs: elapsedSince(startedAt),
      target,
      details: {
        responseStatus: response.status,
      },
    }
  } catch (error) {
    return {
      name,
      status: 'fail',
      critical: true,
      message: error instanceof Error ? error.message : 'Request failed',
      durationMs: elapsedSince(startedAt),
      target,
    }
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const env = loadEnvironment()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null
  const supabasePublishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null
  const supabasePublicKey = supabasePublishableKey || supabaseAnonKey
  const ragApiUrl = env.NEXT_PUBLIC_RAG_API_URL?.trim() || DEFAULT_RAG_API_URL
  const ragWsUrl = env.NEXT_PUBLIC_RAG_WS_URL?.trim() || DEFAULT_RAG_WS_URL
  const useRagProxy = env.NEXT_PUBLIC_USE_RAG_PROXY?.trim() || 'true'
  const ragProviderMode = getRagProviderMode(env)
  const remoteRagEnabled = ragProviderMode === 'remote-rag'

  const supabaseParsedUrl = safeUrl(supabaseUrl)
  const ragParsedUrl = safeUrl(ragApiUrl)
  const ragWsParsedUrl = safeUrl(ragWsUrl)
  const supabaseProjectRef = getStandardSupabaseProjectRef(supabaseParsedUrl)
  const ragHealthTarget = ragParsedUrl
    ? new URL('/api/research/health', ragParsedUrl).toString()
    : null

  const ragAsyncChecks = !remoteRagEnabled
    ? [
        skippedProviderlessCheck('rag.dns', ragParsedUrl?.hostname || null),
        skippedProviderlessCheck('rag.direct_health', ragHealthTarget),
      ]
    : args.skipExternalChecks
      ? [
          skippedExternalCheck('rag.dns'),
          skippedExternalCheck('rag.direct_health'),
        ]
      : [
          checkDns('rag.dns', ragParsedUrl?.hostname || null),
          checkFetch('rag.direct_health', ragHealthTarget, args.timeoutMs),
        ]

  const asyncChecks = args.skipExternalChecks
    ? [
        skippedExternalCheck('supabase.dns'),
        ...ragAsyncChecks,
      ]
    : [
        checkDns('supabase.dns', supabaseParsedUrl?.hostname || null, {
          critical: false,
          failureMessage:
            'Supabase DNS did not resolve during this diagnostic check; public providerless chat remains usable, but authenticated persistence may be degraded.',
        }),
        ...ragAsyncChecks,
      ]
  const immediateChecks = []

  if (args.baseUrl) {
    const baseUrl = safeUrl(args.baseUrl)

    if (!baseUrl) {
      immediateChecks.push({
        name: 'app.base_url',
        status: 'fail',
        critical: true,
        message: 'Invalid --base-url value',
        target: args.baseUrl,
      })
    } else {
      for (const route of ROUTES_TO_CHECK) {
        asyncChecks.push(
          checkFetch(`app.route:${route}`, new URL(route, baseUrl).toString(), args.timeoutMs)
        )
      }

      asyncChecks.push(
        checkFetch(
          'app.readiness',
          new URL(readinessEndpointPath(args.timeoutMs, args.skipExternalChecks), baseUrl).toString(),
          args.timeoutMs
        )
      )

      if (!remoteRagEnabled) {
        asyncChecks.push(
          skippedProviderlessCheck(
            'app.rag_proxy_health',
            new URL(
              `/api/rag-proxy?endpoint=/api/research/health&timeoutMs=${args.timeoutMs}`,
              baseUrl
            ).toString()
          )
        )
      } else if (args.skipExternalChecks) {
        asyncChecks.push(skippedExternalCheck('app.rag_proxy_health'))
      } else {
        asyncChecks.push(
          checkFetch(
            'app.rag_proxy_health',
            new URL(
              `/api/rag-proxy?endpoint=/api/research/health&timeoutMs=${args.timeoutMs}`,
              baseUrl
            ).toString(),
            args.timeoutMs
          )
        )
      }
    }
  }

  const checks = [
    checkEnv('supabase.url', supabaseUrl, supabaseParsedUrl?.hostname),
    checkEnv('supabase.anon_key', supabasePublicKey),
    checkSupabaseProjectRef(supabaseProjectRef, supabaseParsedUrl?.hostname),
    ...checkSupabaseAnonKey(supabasePublicKey, supabaseProjectRef),
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
      ? checkEnv('rag.api_url', ragApiUrl, ragParsedUrl?.origin)
      : checkOptionalEnv('rag.api_url', ragApiUrl, ragParsedUrl?.origin),
    remoteRagEnabled
      ? checkEnv('rag.websocket_url', ragWsUrl, ragWsParsedUrl?.origin)
      : checkOptionalEnv('rag.websocket_url', ragWsUrl, ragWsParsedUrl?.origin),
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
    ...immediateChecks,
    ...(await Promise.all(asyncChecks)),
  ]

  const ready = checks.every((check) => !check.critical || check.status === 'pass')
  const result = {
    ready,
    checkedAt: new Date().toISOString(),
    baseUrl: args.baseUrl,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`LexInsights readiness: ${ready ? 'ready' : 'blocked'}`)
    console.log(`Checked at: ${result.checkedAt}`)

    for (const check of checks) {
      const target = check.target ? ` (${check.target})` : ''
      const duration = Number.isFinite(check.durationMs) ? ` ${check.durationMs}ms` : ''
      console.log(`[${check.status.toUpperCase()}] ${check.name}${target} - ${check.message}${duration}`)
    }
  }

  if (!ready) {
    process.exitCode = 1
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
