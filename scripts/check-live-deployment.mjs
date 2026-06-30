#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_BASE_URL = 'https://lexiph.vercel.app'
const DEFAULT_TIMEOUT_MS = 20000
const ROUTES_TO_CHECK = [
  { path: '/', expectedStatuses: [200] },
  { path: '/auth/login', expectedStatuses: [200] },
  { path: '/chat', expectedStatuses: [200] },
  { path: '/documents', expectedStatuses: [200] },
  { path: '/test-rag', expectedStatuses: [200, 404] },
  { path: '/test-document', expectedStatuses: [200, 404] },
]

function parseArgs(argv) {
  const args = {
    allowDirty: false,
    baseUrl: DEFAULT_BASE_URL,
    expectedSha: null,
    json: false,
    sourceOnly: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--json') {
      args.json = true
      continue
    }

    if (arg === '--allow-dirty') {
      args.allowDirty = true
      continue
    }

    if (arg === '--source-only') {
      args.sourceOnly = true
      continue
    }

    if (arg === '--skip-backend') {
      args.sourceOnly = true
      continue
    }

    if (arg === '--base-url') {
      args.baseUrl = argv[index + 1] || DEFAULT_BASE_URL
      index += 1
      continue
    }

    if (arg.startsWith('--base-url=')) {
      args.baseUrl = arg.slice('--base-url='.length)
      continue
    }

    if (arg === '--expect-sha') {
      args.expectedSha = argv[index + 1] || null
      index += 1
      continue
    }

    if (arg.startsWith('--expect-sha=')) {
      args.expectedSha = arg.slice('--expect-sha='.length)
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

function getCurrentGitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function getCurrentGitStatusShort() {
  try {
    return execFileSync('git', ['status', '--short'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function gitWorktreeCheck(statusText, allowDirty = false) {
  if (statusText === null) {
    return {
      name: 'git.worktree',
      status: 'warn',
      critical: false,
      message: 'Could not read local git worktree status.',
      details: {
        dirty: null,
      },
    }
  }

  const changedPaths = statusText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  return {
    name: 'git.worktree',
    status: changedPaths.length > 0 ? (allowDirty ? 'warn' : 'fail') : 'pass',
    critical: !allowDirty,
    message:
      changedPaths.length > 0
        ? allowDirty
          ? `${changedPaths.length} uncommitted change(s); continuing because --allow-dirty was provided.`
          : `${changedPaths.length} uncommitted change(s); live deployment cannot include them yet.`
        : 'Local git worktree is clean.',
    details: {
      allowDirty,
      dirty: changedPaths.length > 0,
      changedCount: changedPaths.length,
      changedPaths: changedPaths.slice(0, 20),
    },
  }
}

function elapsedSince(startedAt) {
  return Date.now() - startedAt
}

function safeUrl(value) {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function appendPath(baseUrl, path) {
  return new URL(path, baseUrl).toString()
}

function compareSha(actualSha, expectedSha) {
  if (!expectedSha) {
    return null
  }

  if (!actualSha) {
    return false
  }

  const actual = actualSha.toLowerCase()
  const expected = expectedSha.toLowerCase()

  return actual === expected || actual.startsWith(expected) || expected.startsWith(actual)
}

function responseHeaders(response) {
  return {
    age: response.headers.get('age'),
    cache: response.headers.get('x-vercel-cache'),
    matchedPath: response.headers.get('x-matched-path'),
    vercelId: response.headers.get('x-vercel-id'),
  }
}

async function readResponseBody(response, parseJson) {
  const text = await response.text()

  if (!text) {
    return null
  }

  if (!parseJson) {
    return text.slice(0, 240)
  }

  try {
    return JSON.parse(text)
  } catch {
    return text.slice(0, 240)
  }
}

async function fetchCheck(name, target, timeoutMs, expectedStatuses, parseJson = false) {
  const startedAt = Date.now()

  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        Accept: parseJson ? 'application/json,text/html' : 'text/html,application/json',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = await readResponseBody(response, parseJson)
    const statusMatches = expectedStatuses.includes(response.status)

    return {
      name,
      status: statusMatches ? 'pass' : 'fail',
      critical: true,
      message: `HTTP ${response.status}`,
      durationMs: elapsedSince(startedAt),
      target,
      details: {
        responseStatus: response.status,
        finalUrl: response.url,
        headers: responseHeaders(response),
        body,
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

async function versionCheck(baseUrl, timeoutMs, expectedSha) {
  const expectedParam = expectedSha ? `?expectedSha=${encodeURIComponent(expectedSha)}` : ''
  const check = await fetchCheck(
    'app.version',
    appendPath(baseUrl, `/api/version${expectedParam}`),
    timeoutMs,
    [200],
    true
  )

  if (check.status !== 'pass') {
    check.message = `${check.message}; deployment does not expose /api/version`
    return check
  }

  const body = check.details?.body
  const actualSha = body && typeof body === 'object' ? body.source?.commitSha || null : null
  const matches = compareSha(actualSha, expectedSha)

  check.details = {
    ...check.details,
    expectedSha,
    actualSha,
    commitMatches: matches,
  }

  if (expectedSha && !matches) {
    check.status = 'fail'
    check.message = actualSha
      ? `Deployment commit ${actualSha.slice(0, 12)} does not match expected ${expectedSha.slice(0, 12)}`
      : 'Deployment did not expose a commit SHA to compare'
  }

  return check
}

function providerModeFromReadiness(check) {
  const body = check.details?.body
  const checks = body && typeof body === 'object' && Array.isArray(body.checks) ? body.checks : []
  const providerModeCheck = checks.find((item) => item?.name === 'rag.provider_mode')
  const value = providerModeCheck?.details?.value

  return typeof value === 'string' ? value : null
}

function skippedProviderlessCheck(name, target) {
  return {
    name,
    status: 'skip',
    critical: false,
    message: 'Skipped because providerless local research is the active provider mode.',
    target,
  }
}

async function providerAwareBackendChecks(baseUrl, timeoutMs) {
  const readiness = await fetchCheck(
    'app.readiness',
    appendPath(baseUrl, `/api/readiness?timeoutMs=${timeoutMs}`),
    timeoutMs,
    [200],
    true
  )
  const ragProxyTarget = appendPath(baseUrl, `/api/rag-proxy?endpoint=/api/research/health&timeoutMs=${timeoutMs}`)

  if (providerModeFromReadiness(readiness) === 'local-providerless') {
    return [
      readiness,
      skippedProviderlessCheck('app.rag_proxy_health', ragProxyTarget),
    ]
  }

  return [
    readiness,
    await fetchCheck(
      'app.rag_proxy_health',
      ragProxyTarget,
      timeoutMs,
      [200],
      true
    ),
  ]
}

function publicCheckDetails(check) {
  const details = check.details || {}
  const body = details.body

  return {
    responseStatus: details.responseStatus,
    finalUrl: details.finalUrl,
    headers: details.headers,
    expectedSha: details.expectedSha,
    actualSha: details.actualSha,
    commitMatches: details.commitMatches,
    body:
      body && typeof body === 'object'
        ? {
            ready: body.ready,
            app: body.app,
            packageVersion: body.packageVersion,
            summary: body.summary,
            source: body.source,
            expected: body.expected,
            providerMode: providerModeFromReadiness(check),
          }
        : body,
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2))
  const baseUrl = safeUrl(args.baseUrl)

  if (!baseUrl) {
    console.error(`Invalid --base-url value: ${args.baseUrl}`)
    process.exitCode = 1
    return
  }

  const expectedSha = args.expectedSha || getCurrentGitSha()
  const localChecks = [gitWorktreeCheck(getCurrentGitStatusShort(), args.allowDirty)]
  const routeChecks = ROUTES_TO_CHECK.map((route) =>
    fetchCheck(
      `app.route:${route.path}`,
      appendPath(baseUrl, route.path),
      args.timeoutMs,
      route.expectedStatuses
    )
  )
  const backendChecks = args.sourceOnly ? [] : await providerAwareBackendChecks(baseUrl, args.timeoutMs)

  const checks = await Promise.all([
    ...localChecks,
    ...routeChecks,
    versionCheck(baseUrl, args.timeoutMs, expectedSha),
    ...backendChecks,
  ])

  const ready = checks.every((check) => !check.critical || check.status === 'pass')
  const result = {
    ready,
    checkedAt: new Date().toISOString(),
    baseUrl: baseUrl.toString(),
    expectedSha,
    allowDirty: args.allowDirty,
    mode: args.sourceOnly ? 'source-only' : 'full',
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`LexInsights live deployment: ${ready ? 'ready' : 'blocked'}`)
    console.log(`Base URL: ${result.baseUrl}`)
    console.log(`Expected commit: ${expectedSha || 'not available'}`)
    console.log(`Mode: ${result.mode}`)
    if (args.allowDirty) {
      console.log('Dirty worktree: allowed by --allow-dirty')
    }
    console.log(`Checked at: ${result.checkedAt}`)

    for (const check of checks) {
      const duration = Number.isFinite(check.durationMs) ? ` ${check.durationMs}ms` : ''
      console.log(`[${check.status.toUpperCase()}] ${check.name} - ${check.message}${duration}`)

      const details = publicCheckDetails(check)
      const headers = details.headers

      if (headers?.cache || headers?.age || headers?.matchedPath) {
        console.log(
          `  cache=${headers.cache || 'n/a'} age=${headers.age || 'n/a'} matchedPath=${headers.matchedPath || 'n/a'}`
        )
      }

      if (details.actualSha || details.expectedSha) {
        console.log(
          `  deploymentSha=${details.actualSha || 'missing'} expectedSha=${details.expectedSha || 'n/a'} match=${details.commitMatches}`
        )
      }

      if (details.body?.summary) {
        console.log(`  summary=${details.body.summary}`)
      }
    }
  }

  if (!ready) {
    process.exitCode = 1
  }
}

export {
  appendPath,
  compareSha,
  gitWorktreeCheck,
  parseArgs,
  publicCheckDetails,
  safeUrl,
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
