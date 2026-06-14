#!/usr/bin/env node

import { lookup } from 'node:dns/promises'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_RAG_API_URL = 'https://devkada.resqlink.org'
const DEFAULT_RAG_WS_URL = 'wss://devkada.resqlink.org'
const DEFAULT_TIMEOUT_MS = 15000
const ROUTES_TO_CHECK = [
  '/',
  '/auth/login',
  '/chat',
  '/documents',
  '/test-rag',
]

const scriptDir = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(scriptDir, '..')

function parseArgs(argv) {
  const args = {
    baseUrl: null,
    json: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
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
  }

  return args
}

function parseEnvFile(path) {
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

function safeUrl(value) {
  if (!value) {
    return null
  }

  try {
    return new URL(value)
  } catch {
    return null
  }
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

async function checkDns(name, host) {
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
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null
  const ragApiUrl = env.NEXT_PUBLIC_RAG_API_URL?.trim() || DEFAULT_RAG_API_URL
  const ragWsUrl = env.NEXT_PUBLIC_RAG_WS_URL?.trim() || DEFAULT_RAG_WS_URL
  const useRagProxy = env.NEXT_PUBLIC_USE_RAG_PROXY?.trim() || 'true'

  const supabaseParsedUrl = safeUrl(supabaseUrl)
  const ragParsedUrl = safeUrl(ragApiUrl)
  const ragWsParsedUrl = safeUrl(ragWsUrl)
  const ragHealthTarget = ragParsedUrl
    ? new URL('/api/research/health', ragParsedUrl).toString()
    : null

  const asyncChecks = [
    checkDns('supabase.dns', supabaseParsedUrl?.host || null),
    checkDns('rag.dns', ragParsedUrl?.host || null),
    checkFetch('rag.direct_health', ragHealthTarget, args.timeoutMs),
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
        checkFetch('app.readiness', new URL('/api/readiness', baseUrl).toString(), args.timeoutMs),
        checkFetch(
          'app.rag_proxy_health',
          new URL('/api/rag-proxy?endpoint=/api/research/health', baseUrl).toString(),
          args.timeoutMs
        )
      )
    }
  }

  const checks = [
    checkEnv('supabase.url', supabaseUrl, supabaseParsedUrl?.host),
    checkEnv('supabase.anon_key', supabaseAnonKey),
    checkEnv('rag.api_url', ragApiUrl, ragParsedUrl?.origin),
    checkEnv('rag.websocket_url', ragWsUrl, ragWsParsedUrl?.origin),
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
    console.log(`LexInSight readiness: ${ready ? 'ready' : 'blocked'}`)
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

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
