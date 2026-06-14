#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const DEFAULT_BASE_URL = 'https://lexinsights.vercel.app'
const DEFAULT_TIMEOUT_MS = 20000

function parseArgs(argv) {
  const args = {
    baseUrl: DEFAULT_BASE_URL,
    json: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    withVercelCli: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--json') {
      args.json = true
      continue
    }

    if (arg === '--with-vercel-cli') {
      args.withVercelCli = true
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

function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function runCommand(command, args, timeoutMs = 10000) {
  const candidates =
    process.platform === 'win32' ? [command, `${command}.cmd`, `${command}.exe`] : [command]
  let lastError = null

  for (const commandName of candidates) {
    try {
      const output = execFileSync(commandName, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: timeoutMs,
      }).trim()

      return {
        ok: true,
        output,
      }
    } catch (error) {
      lastError = error
    }
  }

  const stderr = lastError?.stderr?.toString?.().trim()
  const stdout = lastError?.stdout?.toString?.().trim()

  return {
    ok: false,
    output: stderr || stdout || (lastError instanceof Error ? lastError.message : 'Command failed'),
  }
}

function getGitHead() {
  const result = runCommand('git', ['rev-parse', 'HEAD'], 5000)
  return result.ok ? result.output : null
}

function compareSha(actualSha, expectedSha) {
  if (!actualSha || !expectedSha) {
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

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text.slice(0, 240)
  }
}

function localAppRootCheck(cwd) {
  const packagePath = join(cwd, 'package.json')
  const packageJson = readJsonFile(packagePath)

  if (!packageJson) {
    return {
      name: 'app.root',
      status: 'fail',
      critical: true,
      message: 'Run this command from the lexiph app root.',
      details: {
        cwd,
        packageJsonPresent: false,
      },
    }
  }

  const hasNext = Boolean(packageJson.dependencies?.next || packageJson.devDependencies?.next)

  return {
    name: 'app.root',
    status: hasNext ? 'pass' : 'fail',
    critical: true,
    message: hasNext
      ? `Using ${packageJson.name || 'unnamed package'} ${packageJson.version || 'unknown version'}`
      : 'package.json is present but this does not look like the Next.js app root.',
    details: {
      cwd,
      packageName: packageJson.name,
      packageVersion: packageJson.version,
      hasNext,
    },
  }
}

function gitHeadCheck(expectedSha) {
  return {
    name: 'git.head',
    status: expectedSha ? 'pass' : 'warn',
    critical: false,
    message: expectedSha ? `Local HEAD is ${expectedSha.slice(0, 12)}` : 'Could not read local git HEAD.',
    details: {
      expectedSha,
    },
  }
}

function vercelLinkCheck(cwd) {
  const projectPath = join(cwd, '.vercel', 'project.json')

  if (!existsSync(projectPath)) {
    return {
      name: 'vercel.local_link',
      status: 'warn',
      critical: false,
      message: 'No lexiph/.vercel/project.json link file; Vercel Git deploys may still work, but CLI deploy/inspect cannot prove the project from this checkout.',
      details: {
        linked: false,
      },
    }
  }

  const projectJson = readJsonFile(projectPath)

  if (!projectJson) {
    return {
      name: 'vercel.local_link',
      status: 'warn',
      critical: false,
      message: 'lexiph/.vercel/project.json exists but could not be parsed.',
      details: {
        linked: false,
      },
    }
  }

  return {
    name: 'vercel.local_link',
    status: 'pass',
    critical: false,
    message: 'Local checkout is linked to a Vercel project.',
    details: {
      linked: true,
      orgIdPresent: Boolean(projectJson.orgId),
      projectIdPresent: Boolean(projectJson.projectId),
    },
  }
}

async function fetchJsonCheck(name, target, timeoutMs, expectedStatuses) {
  const startedAt = Date.now()

  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        Accept: 'application/json,text/html',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
    })
    const body = await readJsonResponse(response)
    const statusMatches = expectedStatuses.includes(response.status)

    return {
      name,
      status: statusMatches ? 'pass' : 'fail',
      critical: true,
      message: `HTTP ${response.status}`,
      durationMs: Date.now() - startedAt,
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
      durationMs: Date.now() - startedAt,
      target,
    }
  }
}

async function versionCheck(baseUrl, timeoutMs, expectedSha) {
  const expectedParam = expectedSha ? `?expectedSha=${encodeURIComponent(expectedSha)}` : ''
  const check = await fetchJsonCheck(
    'live.version',
    appendPath(baseUrl, `/api/version${expectedParam}`),
    timeoutMs,
    [200]
  )

  if (check.status !== 'pass') {
    check.message = `${check.message}; live app does not expose /api/version from this codebase.`
    return check
  }

  const body = check.details?.body
  const actualSha = body && typeof body === 'object' ? body.source?.commitSha || null : null
  const commitMatches = expectedSha ? compareSha(actualSha, expectedSha) : null

  check.details = {
    ...check.details,
    expectedSha,
    actualSha,
    commitMatches,
  }

  if (expectedSha && !commitMatches) {
    check.status = 'fail'
    check.message = actualSha
      ? `Live commit ${actualSha.slice(0, 12)} does not match local HEAD ${expectedSha.slice(0, 12)}.`
      : 'Live app did not expose a commit SHA to compare with local HEAD.'
  }

  return check
}

async function readinessRouteCheck(baseUrl, timeoutMs) {
  const check = await fetchJsonCheck(
    'live.readiness_route',
    appendPath(baseUrl, '/api/readiness?timeoutMs=2000'),
    timeoutMs,
    [200, 503]
  )

  if (check.status === 'pass' && check.details?.responseStatus === 503) {
    check.message = 'Route is deployed, but backend readiness is blocked.'
  }

  if (check.status === 'fail') {
    check.message = `${check.message}; live app does not expose /api/readiness from this codebase.`
  }

  return check
}

async function ragProxyRouteCheck(baseUrl, timeoutMs) {
  const check = await fetchJsonCheck(
    'live.rag_proxy_route',
    appendPath(baseUrl, '/api/rag-proxy?endpoint=/api/research/health'),
    timeoutMs,
    [200]
  )

  if (check.status === 'pass') {
    return check
  }

  if (check.details?.responseStatus && check.details.responseStatus !== 404) {
    check.status = 'warn'
    check.critical = false
    check.message = `Route responded HTTP ${check.details.responseStatus}; RAG backend may still be unavailable.`
    return check
  }

  check.message = `${check.message}; live app does not expose the RAG proxy route.`
  return check
}

function vercelCliChecks() {
  const version = runCommand('vercel', ['--version'], 10000)
  const checks = [
    {
      name: 'vercel.cli_version',
      status: version.ok ? 'pass' : 'warn',
      critical: false,
      message: version.ok ? version.output : 'Vercel CLI is not available in this shell.',
      details: {
        available: version.ok,
      },
    },
  ]

  if (!version.ok) {
    return checks
  }

  const whoami = runCommand('vercel', ['whoami'], 10000)
  checks.push({
    name: 'vercel.cli_whoami',
    status: whoami.ok ? 'pass' : 'warn',
    critical: false,
    message: whoami.ok ? `Authenticated as ${whoami.output}` : 'Vercel CLI is not authenticated or cannot read the current account.',
    details: {
      authenticated: whoami.ok,
    },
  })

  return checks
}

function publicDetails(check) {
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

  const cwd = process.cwd()
  const expectedSha = getGitHead()
  const localChecks = [
    localAppRootCheck(cwd),
    gitHeadCheck(expectedSha),
    vercelLinkCheck(cwd),
    ...(args.withVercelCli ? vercelCliChecks() : []),
  ]
  const liveChecks = await Promise.all([
    versionCheck(baseUrl, args.timeoutMs, expectedSha),
    readinessRouteCheck(baseUrl, args.timeoutMs),
    ragProxyRouteCheck(baseUrl, args.timeoutMs),
  ])
  const checks = [...localChecks, ...liveChecks]
  const ready = checks.every((check) => !check.critical || check.status === 'pass')
  const result = {
    ready,
    checkedAt: new Date().toISOString(),
    baseUrl: baseUrl.toString(),
    expectedSha,
    withVercelCli: args.withVercelCli,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`LexInSight deployment preflight: ${ready ? 'ready' : 'blocked'}`)
    console.log(`Base URL: ${result.baseUrl}`)
    console.log(`Expected commit: ${expectedSha || 'not available'}`)
    console.log(`Checked at: ${result.checkedAt}`)

    for (const check of checks) {
      const duration = Number.isFinite(check.durationMs) ? ` ${check.durationMs}ms` : ''
      console.log(`[${check.status.toUpperCase()}] ${check.name} - ${check.message}${duration}`)

      const details = publicDetails(check)
      const headers = details.headers

      if (headers?.cache || headers?.age || headers?.matchedPath) {
        console.log(
          `  cache=${headers.cache || 'n/a'} age=${headers.age || 'n/a'} matchedPath=${headers.matchedPath || 'n/a'}`
        )
      }

      if (details.actualSha || typeof details.commitMatches !== 'undefined') {
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

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
