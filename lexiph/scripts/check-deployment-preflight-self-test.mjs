#!/usr/bin/env node

import assert from 'node:assert/strict'
import { win32 } from 'node:path'

import {
  collectProjectAliases,
  compareSha,
  gitWorktreeCheck,
  parseArgs,
  parseGitHubRepoUrl,
  publicDetails,
  safeTeamScopes,
  safeProjectSummary,
  safeUrl,
  vercelRecoveryHintCheck,
  vercelProjectVisibilityChecks,
  windowsVercelCommandCandidates,
} from './check-deployment-preflight.mjs'

function getCheck(checks, name) {
  const check = checks.find((item) => item.name === name)
  assert.ok(check, `Expected check ${name} to exist`)
  return check
}

function assertNoSensitiveMarkers(value) {
  const text = JSON.stringify(value)
  assert.equal(text.includes('encrypted-payload'), false, 'Output leaked encrypted Vercel env payloads')
  assert.equal(text.includes('RESEND_API_KEY'), false, 'Output leaked Vercel env key names')
  assert.equal(text.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), false, 'Output leaked Supabase env key names')
}

const repoInfo = {
  owner: 'Iron-Mark',
  repo: 'Hackathon-LexInsights',
  slug: 'Iron-Mark/Hackathon-LexInsights',
}
const matchingProject = {
  name: 'lexiph',
  framework: 'nextjs',
  rootDirectory: 'lexiph',
  env: [
    {
      key: 'RESEND_API_KEY',
      value: 'encrypted-payload',
    },
  ],
  link: {
    type: 'github',
    org: 'Iron-Mark',
    repo: 'Hackathon-LexInsights',
    productionBranch: 'main',
  },
  latestDeployments: [
    {
      alias: ['lexiph.vercel.app', 'lexiph-git-main.vercel.app'],
    },
  ],
  targets: {
    production: {
      alias: ['lexiph.vercel.app'],
    },
  },
}
const unrelatedProject = {
  name: 'portfolio',
  framework: 'nextjs',
  rootDirectory: null,
  link: {
    type: 'github',
    org: 'Iron-Mark',
    repo: 'Portfolio-Mark-Siazon',
    productionBranch: 'main',
  },
  latestDeployments: [
    {
      alias: ['marksiazon.dev'],
    },
  ],
}
const baseUrl = safeUrl('https://lexiph.vercel.app')

assert.deepEqual(parseGitHubRepoUrl('https://github.com/Iron-Mark/Hackathon-LexInsights.git'), repoInfo)
assert.deepEqual(parseGitHubRepoUrl('git@github.com:Iron-Mark/Hackathon-LexInsights.git'), repoInfo)
assert.equal(parseGitHubRepoUrl('https://example.com/Iron-Mark/Hackathon-LexInsights.git'), null)

assert.equal(compareSha('b13673820a4677fe838e6b9052eb97bc5dbf9175', 'b136738'), true)
assert.equal(compareSha('b136738', 'b13673820a4677fe838e6b9052eb97bc5dbf9175'), true)
assert.equal(compareSha('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbb'), false)
assert.equal(gitWorktreeCheck('').status, 'pass')
assert.equal(gitWorktreeCheck(null).status, 'warn')
const dirtyWorktreeCheck = gitWorktreeCheck(' M README.md\n?? local.txt')
assert.equal(dirtyWorktreeCheck.status, 'fail')
assert.equal(dirtyWorktreeCheck.critical, true)
assert.equal(dirtyWorktreeCheck.details.changedCount, 2)
const allowedDirtyWorktreeCheck = gitWorktreeCheck(' M README.md\n?? local.txt', true)
assert.equal(allowedDirtyWorktreeCheck.status, 'warn')
assert.equal(allowedDirtyWorktreeCheck.critical, false)
assert.equal(allowedDirtyWorktreeCheck.details.allowDirty, true)

assert.equal(parseArgs(['--base-url', 'https://example.com', '--timeout-ms', '3000', '--with-vercel-cli']).baseUrl, 'https://example.com')
assert.equal(parseArgs(['--allow-dirty']).allowDirty, true)
assert.deepEqual(
  parseArgs(['--with-vercel-cli', '--discover-vercel-scopes', '--vercel-scope', 'marksiazon-dev']),
  {
    allowDirty: false,
    baseUrl: 'https://lexiph.vercel.app',
    discoverVercelScopes: true,
    json: false,
    sourceOnly: false,
    timeoutMs: 20000,
    withVercelCli: true,
    vercelScope: 'marksiazon-dev',
  }
)
assert.equal(parseArgs(['--vercel-scope=marksiazon-dev']).vercelScope, 'marksiazon-dev')
assert.equal(parseArgs(['--discover-vercel-scopes']).discoverVercelScopes, true)
assert.equal(parseArgs(['--source-only']).sourceOnly, true)
assert.equal(parseArgs(['--skip-backend']).sourceOnly, true)
assert.equal(parseArgs(['--skip-backend', '--source-only']).sourceOnly, true)
assert.equal(parseArgs(['--timeout-ms=-1']).timeoutMs, 20000)
assert.equal(safeUrl('not a url'), null)

const safeScopes = safeTeamScopes([
  {
    id: 'team_secret_id',
    slug: 'marksiazon-dev',
    name: 'marksiazon-dev',
    current: true,
    inviteCode: 'do-not-include',
    billing: {
      email: 'private@example.com',
    },
  },
  {
    id: 'personal_user_id',
    slug: '',
  },
])
assert.deepEqual(safeScopes, [{ slug: 'marksiazon-dev', current: true }])
assertNoSensitiveMarkers(safeScopes)
assert.equal(JSON.stringify(safeScopes).includes('do-not-include'), false)
assert.equal(JSON.stringify(safeScopes).includes('private@example.com'), false)

const windowsVercelCandidates = windowsVercelCommandCandidates(['inspect', 'https://lexiph.vercel.app'], {
  env: {
    APPDATA: 'C:\\Users\\Admin\\AppData\\Roaming',
    USERPROFILE: 'C:\\Users\\Admin',
  },
  exists: (path) =>
    [
      'C:\\Users\\Admin\\.local\\bin\\vercel-current.cmd',
      'C:\\Users\\Admin\\AppData\\Roaming\\npm\\vercel.cmd',
    ].includes(path),
  joinPath: win32.join,
})
assert.deepEqual(windowsVercelCandidates[0], {
  command: 'cmd.exe',
  args: [
    '/d',
    '/s',
    '/c',
    '"C:\\Users\\Admin\\.local\\bin\\vercel-current.cmd" inspect https://lexiph.vercel.app',
  ],
})
assert.deepEqual(windowsVercelCandidates[1], {
  command: 'cmd.exe',
  args: [
    '/d',
    '/s',
    '/c',
    '"C:\\Users\\Admin\\AppData\\Roaming\\npm\\vercel.cmd" inspect https://lexiph.vercel.app',
  ],
})

assert.deepEqual(collectProjectAliases(matchingProject), ['lexiph.vercel.app', 'lexiph-git-main.vercel.app'])

const summary = safeProjectSummary(matchingProject)
assert.deepEqual(summary, {
  name: 'lexiph',
  framework: 'nextjs',
  rootDirectory: 'lexiph',
  git: {
    org: 'Iron-Mark',
    repo: 'Hackathon-LexInsights',
    productionBranch: 'main',
  },
  aliases: ['lexiph.vercel.app', 'lexiph-git-main.vercel.app'],
})
assertNoSensitiveMarkers(summary)

const matchingChecks = vercelProjectVisibilityChecks([unrelatedProject, matchingProject], baseUrl, repoInfo)
assert.equal(getCheck(matchingChecks, 'vercel.repo_project').status, 'pass')
assert.equal(getCheck(matchingChecks, 'vercel.live_url_project').status, 'pass')
assertNoSensitiveMarkers(matchingChecks)

const missingChecks = vercelProjectVisibilityChecks([unrelatedProject], baseUrl, repoInfo)
assert.equal(getCheck(missingChecks, 'vercel.repo_project').status, 'warn')
assert.equal(getCheck(missingChecks, 'vercel.live_url_project').status, 'warn')

const discoveredScopeHint = vercelRecoveryHintCheck(
  baseUrl,
  repoInfo,
  null,
  [{ slug: 'marksiazon-dev', current: true }],
  missingChecks
)
assert.equal(discoveredScopeHint.name, 'vercel.recovery_hint')
assert.equal(discoveredScopeHint.status, 'warn')
assert.equal(
  discoveredScopeHint.details.command,
  'npm run check:deployment -- --base-url https://lexiph.vercel.app --with-vercel-cli --discover-vercel-scopes --vercel-scope marksiazon-dev'
)
assert.equal(publicDetails(discoveredScopeHint).command, discoveredScopeHint.details.command)
assertNoSensitiveMarkers(discoveredScopeHint)

const explicitScopeHint = vercelRecoveryHintCheck(
  baseUrl,
  repoInfo,
  'marksiazon-dev',
  [{ slug: 'marksiazon-dev', current: true }],
  missingChecks
)
assert.equal(explicitScopeHint.details.command, discoveredScopeHint.details.command)
assert.equal(explicitScopeHint.message.includes('Scope marksiazon-dev does not expose'), true)
assertNoSensitiveMarkers(explicitScopeHint)

const publicBody = publicDetails({
  name: 'live.version',
  details: {
    expectedSha: 'b136738',
    actualSha: 'b13673820a4677fe838e6b9052eb97bc5dbf9175',
    commitMatches: true,
    body: {
      app: 'LexInSight',
      packageVersion: '0.1.0',
      secret: 'do-not-include',
      source: {
        commitSha: 'b13673820a4677fe838e6b9052eb97bc5dbf9175',
      },
      expected: {
        matches: true,
      },
    },
  },
})
assert.equal(publicBody.body.secret, undefined)
assert.equal(publicBody.body.app, 'LexInSight')
assert.equal(publicBody.commitMatches, true)

console.log('Deployment preflight self-test passed.')
