#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_BASE_URL = 'https://lexiph.vercel.app'
const DEFAULT_TIMEOUT_MS = 20000

function parseArgs(argv) {
  const args = {
    allowDirty: false,
    baseUrl: DEFAULT_BASE_URL,
    discoverVercelScopes: false,
    json: false,
    sourceOnly: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    withVercelCli: false,
    vercelScope: null,
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

    if (arg === '--with-vercel-cli') {
      args.withVercelCli = true
      continue
    }

    if (arg === '--discover-vercel-scopes') {
      args.discoverVercelScopes = true
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

    if (arg === '--vercel-scope') {
      args.vercelScope = argv[index + 1] || null
      index += 1
      continue
    }

    if (arg.startsWith('--vercel-scope=')) {
      args.vercelScope = arg.slice('--vercel-scope='.length) || null
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

function quoteCmdArg(value) {
  const text = String(value)

  if (!text) {
    return '""'
  }

  if (/^[A-Za-z0-9_./:=@-]+$/.test(text)) {
    return text
  }

  return `"${text.replaceAll('"', '""')}"`
}

function cmdExeCandidate(scriptPath, args) {
  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', [quoteCmdArg(scriptPath), ...args.map(quoteCmdArg)].join(' ')],
  }
}

function windowsVercelCommandCandidates(args, options = {}) {
  const env = options.env || process.env
  const exists = options.exists || existsSync
  const joinPath = options.joinPath || join
  const userProfile = env.USERPROFILE || null
  const cmdWrappers = [
    // Prefer the profile-aware local wrapper used by this workstation's shell.
    userProfile ? joinPath(userProfile, '.local', 'bin', 'vercel-current.cmd') : null,
    userProfile ? joinPath(userProfile, '.local', 'bin', 'vercel.cmd') : null,
    env.APPDATA ? joinPath(env.APPDATA, 'npm', 'vercel.cmd') : null,
  ].filter(Boolean)
  const windowsVercelJsCandidates = [
    env.APPDATA ? joinPath(env.APPDATA, 'npm', 'node_modules', 'vercel', 'dist', 'vc.js') : null,
  ].filter(Boolean)

  return [
    ...cmdWrappers.filter((candidate) => exists(candidate)).map((candidate) => cmdExeCandidate(candidate, args)),
    { command: 'cmd.exe', args: ['/d', '/s', '/c', ['vercel', ...args.map(quoteCmdArg)].join(' ')] },
    ...windowsVercelJsCandidates
      .filter((candidate) => exists(candidate))
      .map((candidate) => ({ command: process.execPath, args: [candidate, ...args] })),
  ]
}

function runCommand(command, args, timeoutMs = 10000) {
  const candidates =
    process.platform === 'win32' && command === 'vercel'
      ? windowsVercelCommandCandidates(args)
      : process.platform === 'win32'
        ? [
            { command: command, args },
            { command: `${command}.cmd`, args },
            { command: `${command}.exe`, args },
          ]
        : [{ command, args }]
  let lastError = null

  for (const candidate of candidates) {
    try {
      const output = execFileSync(candidate.command, candidate.args, {
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

function getGitStatusShort() {
  const result = runCommand('git', ['status', '--short'], 5000)
  return result.ok ? result.output : null
}

function getGitHubRepoInfo() {
  const result = runCommand('git', ['config', '--get', 'remote.origin.url'], 5000)

  if (!result.ok) {
    return null
  }

  return parseGitHubRepoUrl(result.output)
}

function parseGitHubRepoUrl(value) {
  const url = value.trim()
  const httpsMatch = url.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i)
  const sshMatch = url.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i)
  const match = httpsMatch || sshMatch

  if (!match) {
    return null
  }

  return {
    owner: match[1],
    repo: match[2],
    slug: `${match[1]}/${match[2]}`,
  }
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
      message: 'Run this command from the repository app root.',
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

function gitRemoteCheck(repoInfo) {
  return {
    name: 'git.remote_origin',
    status: repoInfo ? 'pass' : 'warn',
    critical: false,
    message: repoInfo
      ? `Origin repo is ${repoInfo.slug}`
      : 'Could not parse origin as a GitHub repository.',
    details: {
      repo: repoInfo?.slug || null,
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
      message: 'No .vercel/project.json link file; Vercel Git deploys may still work, but CLI deploy/inspect cannot prove the project from this checkout.',
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
      message: '.vercel/project.json exists but could not be parsed.',
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

function collectProjectAliases(project) {
  const aliases = new Set()

  for (const target of Object.values(project.targets || {})) {
    for (const alias of target?.alias || []) {
      aliases.add(alias)
    }
  }

  for (const deployment of project.latestDeployments || []) {
    for (const alias of deployment.alias || []) {
      aliases.add(alias)
    }
  }

  return [...aliases]
}

function vercelScopeArgs(scope) {
  return scope ? ['--scope', scope] : []
}

function safeTeamScopes(teams) {
  return teams
    .filter((team) => typeof team?.slug === 'string' && team.slug)
    .map((team) => ({
      slug: team.slug,
      current: Boolean(team.current),
    }))
}

function listVercelTeamScopes() {
  const result = runCommand('vercel', ['teams', 'ls', '--format', 'json'], 20000)

  if (!result.ok) {
    return {
      name: 'vercel.team_scopes',
      status: 'warn',
      critical: false,
      message: 'Could not discover available Vercel team scopes.',
      details: {
        accessible: false,
        scopes: [],
      },
    }
  }

  try {
    const body = JSON.parse(result.output)
    const scopes = safeTeamScopes(Array.isArray(body.teams) ? body.teams : [])

    return {
      name: 'vercel.team_scopes',
      status: 'pass',
      critical: false,
      message:
        scopes.length > 0
          ? `Available Vercel team scope(s): ${scopes.map((scope) => scope.slug).join(', ')}`
          : 'No Vercel team scopes are visible to the current account.',
      details: {
        accessible: true,
        scopes,
      },
    }
  } catch {
    return {
      name: 'vercel.team_scopes',
      status: 'warn',
      critical: false,
      message: 'Vercel team list output was not valid JSON.',
      details: {
        accessible: false,
        scopes: [],
      },
    }
  }
}

function listVisibleVercelProjects(scope) {
  const result = runCommand('vercel', ['api', '/v9/projects', '--raw', ...vercelScopeArgs(scope)], 20000)

  if (!result.ok) {
    return {
      check: {
        name: 'vercel.project_api',
        status: 'warn',
        critical: false,
        message: scope
          ? `Could not read visible Vercel projects from scope ${scope}.`
          : 'Could not read visible Vercel projects from the current account.',
        details: {
          accessible: false,
          scope,
        },
      },
      projects: [],
    }
  }

  try {
    const body = JSON.parse(result.output)
    const projects = Array.isArray(body.projects) ? body.projects : []

    return {
      check: {
        name: 'vercel.project_api',
        status: 'pass',
        critical: false,
        message: scope
          ? `Read ${projects.length} visible Vercel project(s) from scope ${scope}.`
          : `Read ${projects.length} visible Vercel project(s) from the current account.`,
        details: {
          accessible: true,
          visibleProjectCount: projects.length,
          scope,
        },
      },
      projects,
    }
  } catch {
    return {
      check: {
        name: 'vercel.project_api',
        status: 'warn',
        critical: false,
        message: 'Vercel project API output was not valid JSON.',
        details: {
          accessible: false,
          scope,
        },
      },
      projects: [],
    }
  }
}

function safeProjectSummary(project) {
  return {
    name: project.name,
    framework: project.framework,
    rootDirectory: project.rootDirectory,
    git:
      project.link?.type === 'github'
        ? {
            org: project.link.org,
            repo: project.link.repo,
            productionBranch: project.link.productionBranch,
          }
        : null,
    aliases: collectProjectAliases(project).slice(0, 8),
  }
}

function vercelProjectVisibilityChecks(projects, baseUrl, repoInfo) {
  const liveHost = baseUrl.hostname
  const repoMatches = repoInfo
    ? projects.filter(
        (project) =>
          project.link?.type === 'github' &&
          project.link?.org?.toLowerCase() === repoInfo.owner.toLowerCase() &&
          project.link?.repo?.toLowerCase() === repoInfo.repo.toLowerCase()
      )
    : []
  const liveHostMatches = projects.filter((project) => collectProjectAliases(project).includes(liveHost))
  const checks = []

  if (repoInfo) {
    checks.push({
      name: 'vercel.repo_project',
      status: repoMatches.length > 0 ? 'pass' : 'warn',
      critical: false,
      message:
        repoMatches.length > 0
          ? `Current Vercel account can see a project linked to ${repoInfo.slug}.`
          : `No visible Vercel project is linked to ${repoInfo.slug} in the current account/scope.`,
      details: {
        repo: repoInfo.slug,
        matches: repoMatches.map(safeProjectSummary),
      },
    })
  }

  checks.push({
    name: 'vercel.live_url_project',
    status: liveHostMatches.length > 0 ? 'pass' : 'warn',
    critical: false,
    message:
      liveHostMatches.length > 0
        ? `Current Vercel account can see a project with alias ${liveHost}.`
        : `No visible Vercel project has alias ${liveHost} in the current account/scope.`,
    details: {
      host: liveHost,
      matches: liveHostMatches.map(safeProjectSummary),
    },
  })

  return checks
}

function vercelRecoveryHintCheck(baseUrl, repoInfo, scope, discoveredScopes, visibilityChecks) {
  const repoCheck = visibilityChecks.find((check) => check.name === 'vercel.repo_project')
  const liveUrlCheck = visibilityChecks.find((check) => check.name === 'vercel.live_url_project')
  const repoVisible = repoCheck?.status === 'pass'
  const liveUrlVisible = liveUrlCheck?.status === 'pass'

  if (repoVisible && liveUrlVisible) {
    return null
  }

  const host = baseUrl.hostname
  const baseUrlText = baseUrl.toString().replace(/\/$/, '')
  const availableScopes = discoveredScopes.map((teamScope) => teamScope.slug)
  const suggestedScope = scope || availableScopes[0] || null
  const scopedCommand = suggestedScope
    ? `npm run check:deployment -- --base-url ${baseUrlText} --with-vercel-cli --discover-vercel-scopes --vercel-scope ${suggestedScope}`
    : null
  const repoText = repoInfo?.slug || 'this repository'

  return {
    name: 'vercel.recovery_hint',
    status: 'warn',
    critical: false,
    message: scope
      ? `Scope ${scope} does not expose a Vercel project linked to ${repoText} or alias ${host}. Import/link the repo in that scope or switch to the owning account.`
      : scopedCommand
        ? `Rerun the preflight with a discovered Vercel scope, then import/link ${repoText} if the scoped check is still missing.`
        : `No Vercel scope exposes a project linked to ${repoText} or alias ${host}; switch to the owning account or import/link the repo.`,
    details: {
      availableScopes,
      command: scopedCommand,
      scope,
      repo: repoInfo?.slug || null,
      host,
    },
  }
}

function vercelInspectCheck(baseUrl, scope) {
  const target = baseUrl.toString().replace(/\/$/, '')
  const result = runCommand('vercel', ['inspect', target, ...vercelScopeArgs(scope)], 20000)

  return {
    name: 'vercel.live_inspect',
    status: result.ok ? 'pass' : 'warn',
    critical: false,
    message: result.ok
      ? `Current Vercel account can inspect ${baseUrl.hostname}.`
      : `Current Vercel account cannot inspect ${baseUrl.hostname}.`,
    details: {
      inspectable: result.ok,
      host: baseUrl.hostname,
      scope,
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
    appendPath(baseUrl, `/api/readiness?timeoutMs=${timeoutMs}`),
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
    appendPath(baseUrl, `/api/rag-proxy?endpoint=/api/research/health&timeoutMs=${timeoutMs}`),
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

  if (!check.details?.responseStatus && check.message.toLowerCase().includes('timeout')) {
    check.status = 'warn'
    check.critical = false
    check.message = 'Route did not respond before timeout; RAG backend or stale proxy behavior may be blocking.'
    return check
  }

  check.message = `${check.message}; live app does not expose the RAG proxy route.`
  return check
}

function vercelCliChecks(baseUrl, repoInfo, scope, discoverScopes) {
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
    message: whoami.ok
      ? scope
        ? `Authenticated as ${whoami.output}; checking scope ${scope}`
        : `Authenticated as ${whoami.output}`
      : 'Vercel CLI is not authenticated or cannot read the current account.',
    details: {
      authenticated: whoami.ok,
      scope,
    },
  })

  let discoveredScopes = []

  if (discoverScopes) {
    const teamScopeCheck = listVercelTeamScopes()
    discoveredScopes = teamScopeCheck.details?.scopes || []
    checks.push(teamScopeCheck)
  }

  const { check, projects } = listVisibleVercelProjects(scope)
  checks.push(check)

  let visibilityChecks = []

  if (check.status === 'pass') {
    visibilityChecks = vercelProjectVisibilityChecks(projects, baseUrl, repoInfo)
    checks.push(...visibilityChecks)
  }

  const recoveryHint = vercelRecoveryHintCheck(baseUrl, repoInfo, scope, discoveredScopes, visibilityChecks)

  if (recoveryHint) {
    checks.push(recoveryHint)
  }

  checks.push(vercelInspectCheck(baseUrl, scope))

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
    command: details.command,
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
  const gitStatus = getGitStatusShort()
  const repoInfo = getGitHubRepoInfo()
  const localChecks = [
    localAppRootCheck(cwd),
    gitHeadCheck(expectedSha),
    gitWorktreeCheck(gitStatus, args.allowDirty),
    gitRemoteCheck(repoInfo),
    vercelLinkCheck(cwd),
    ...(args.withVercelCli
      ? vercelCliChecks(baseUrl, repoInfo, args.vercelScope, args.discoverVercelScopes)
      : []),
  ]
  const liveChecks = await Promise.all(
    args.sourceOnly
      ? [versionCheck(baseUrl, args.timeoutMs, expectedSha)]
      : [
          versionCheck(baseUrl, args.timeoutMs, expectedSha),
          readinessRouteCheck(baseUrl, args.timeoutMs),
          ragProxyRouteCheck(baseUrl, args.timeoutMs),
        ]
  )
  const checks = [...localChecks, ...liveChecks]
  const ready = checks.every((check) => !check.critical || check.status === 'pass')
  const result = {
    ready,
    checkedAt: new Date().toISOString(),
    baseUrl: baseUrl.toString(),
    expectedSha,
    allowDirty: args.allowDirty,
    discoverVercelScopes: args.discoverVercelScopes,
    mode: args.sourceOnly ? 'source-only' : 'full',
    withVercelCli: args.withVercelCli,
    vercelScope: args.vercelScope,
    checks,
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`LexInsights deployment preflight: ${ready ? 'ready' : 'blocked'}`)
    console.log(`Base URL: ${result.baseUrl}`)
    console.log(`Expected commit: ${expectedSha || 'not available'}`)
    console.log(`Mode: ${result.mode}`)
    if (args.allowDirty) {
      console.log('Dirty worktree: allowed by --allow-dirty')
    }
    if (args.withVercelCli && args.vercelScope) {
      console.log(`Vercel scope: ${args.vercelScope}`)
    }
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

      if (details.command) {
        console.log(`  command=${details.command}`)
      }
    }
  }

  if (!ready) {
    process.exitCode = 1
  }
}

export {
  collectProjectAliases,
  compareSha,
  gitWorktreeCheck,
  listVercelTeamScopes,
  parseArgs,
  parseGitHubRepoUrl,
  publicDetails,
  safeTeamScopes,
  safeProjectSummary,
  safeUrl,
  vercelRecoveryHintCheck,
  vercelProjectVisibilityChecks,
  windowsVercelCommandCandidates,
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
