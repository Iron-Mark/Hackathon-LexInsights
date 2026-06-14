#!/usr/bin/env node

import assert from 'node:assert/strict'

import {
  collectProjectAliases,
  compareSha,
  parseArgs,
  parseGitHubRepoUrl,
  publicDetails,
  safeProjectSummary,
  safeUrl,
  vercelProjectVisibilityChecks,
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
  name: 'lexinsights',
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
      alias: ['lexinsights.vercel.app', 'lexinsights-git-main.vercel.app'],
    },
  ],
  targets: {
    production: {
      alias: ['lexinsights.vercel.app'],
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
const baseUrl = safeUrl('https://lexinsights.vercel.app')

assert.deepEqual(parseGitHubRepoUrl('https://github.com/Iron-Mark/Hackathon-LexInsights.git'), repoInfo)
assert.deepEqual(parseGitHubRepoUrl('git@github.com:Iron-Mark/Hackathon-LexInsights.git'), repoInfo)
assert.equal(parseGitHubRepoUrl('https://example.com/Iron-Mark/Hackathon-LexInsights.git'), null)

assert.equal(compareSha('b13673820a4677fe838e6b9052eb97bc5dbf9175', 'b136738'), true)
assert.equal(compareSha('b136738', 'b13673820a4677fe838e6b9052eb97bc5dbf9175'), true)
assert.equal(compareSha('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbbb'), false)

assert.equal(parseArgs(['--base-url', 'https://example.com', '--timeout-ms', '3000', '--with-vercel-cli']).baseUrl, 'https://example.com')
assert.equal(parseArgs(['--timeout-ms=-1']).timeoutMs, 20000)
assert.equal(safeUrl('not a url'), null)

assert.deepEqual(collectProjectAliases(matchingProject), ['lexinsights.vercel.app', 'lexinsights-git-main.vercel.app'])

const summary = safeProjectSummary(matchingProject)
assert.deepEqual(summary, {
  name: 'lexinsights',
  framework: 'nextjs',
  rootDirectory: 'lexiph',
  git: {
    org: 'Iron-Mark',
    repo: 'Hackathon-LexInsights',
    productionBranch: 'main',
  },
  aliases: ['lexinsights.vercel.app', 'lexinsights-git-main.vercel.app'],
})
assertNoSensitiveMarkers(summary)

const matchingChecks = vercelProjectVisibilityChecks([unrelatedProject, matchingProject], baseUrl, repoInfo)
assert.equal(getCheck(matchingChecks, 'vercel.repo_project').status, 'pass')
assert.equal(getCheck(matchingChecks, 'vercel.live_url_project').status, 'pass')
assertNoSensitiveMarkers(matchingChecks)

const missingChecks = vercelProjectVisibilityChecks([unrelatedProject], baseUrl, repoInfo)
assert.equal(getCheck(missingChecks, 'vercel.repo_project').status, 'warn')
assert.equal(getCheck(missingChecks, 'vercel.live_url_project').status, 'warn')

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
