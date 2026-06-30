#!/usr/bin/env node

import assert from 'node:assert/strict'

import {
  appendPath,
  compareSha,
  gitWorktreeCheck,
  parseArgs,
  productionDiagnosticsCheck,
  publicCheckDetails,
  safeUrl,
} from './check-live-deployment.mjs'

function assertNoSensitiveMarkers(value) {
  const text = JSON.stringify(value)
  assert.equal(text.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), false, 'Output leaked Supabase key names')
  assert.equal(text.includes('secret-value'), false, 'Output leaked private body fields')
}

assert.deepEqual(parseArgs([]), {
  allowDirty: false,
  baseUrl: 'https://lexiph.vercel.app',
  expectedSha: null,
  json: false,
  sourceOnly: false,
  timeoutMs: 20000,
})
assert.equal(parseArgs(['--base-url', 'https://example.com', '--source-only']).baseUrl, 'https://example.com')
assert.equal(parseArgs(['--base-url=https://example.com']).baseUrl, 'https://example.com')
assert.equal(parseArgs(['--expect-sha', 'abc123']).expectedSha, 'abc123')
assert.equal(parseArgs(['--expect-sha=abc123']).expectedSha, 'abc123')
assert.equal(parseArgs(['--timeout-ms', '3000']).timeoutMs, 3000)
assert.equal(parseArgs(['--timeout-ms=-1']).timeoutMs, 20000)
assert.equal(parseArgs(['--json']).json, true)
assert.equal(parseArgs(['--allow-dirty']).allowDirty, true)
assert.equal(parseArgs(['--source-only']).sourceOnly, true)
assert.equal(parseArgs(['--skip-backend']).sourceOnly, true)
assert.equal(parseArgs(['--skip-backend', '--source-only']).sourceOnly, true)
assert.equal(parseArgs(['--source-only', '--skip-backend']).sourceOnly, true)
assert.equal(parseArgs(['--skip-backend', '--base-url=https://example.com']).baseUrl, 'https://example.com')

assert.equal(safeUrl('not-a-url'), null)
assert.equal(safeUrl('https://lexiph.vercel.app')?.hostname, 'lexiph.vercel.app')
assert.equal(appendPath(safeUrl('https://lexiph.vercel.app/app/'), '/api/version'), 'https://lexiph.vercel.app/api/version')

assert.equal(compareSha('5363fa7699f88f2bcb974c55a4d42a6b1c7e941f', '5363fa7'), true)
assert.equal(compareSha('5363fa7', '5363fa7699f88f2bcb974c55a4d42a6b1c7e941f'), true)
assert.equal(compareSha('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'bbbbbbb'), false)
assert.equal(compareSha(null, 'bbbbbbb'), false)
assert.equal(compareSha('aaaaaaaa', null), null)
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

const details = publicCheckDetails({
  name: 'app.version',
  details: {
    responseStatus: 200,
    finalUrl: 'https://lexiph.vercel.app/api/version',
    expectedSha: '5363fa7',
    actualSha: '5363fa7699f88f2bcb974c55a4d42a6b1c7e941f',
    commitMatches: true,
    headers: {
      age: '0',
      cache: 'MISS',
      matchedPath: '/api/version',
      vercelId: 'private-region-id',
    },
    body: {
      app: 'LexInsights',
      packageVersion: '0.1.0',
      summary: 'Ready',
      secret: 'secret-value',
      source: {
        commitSha: '5363fa7699f88f2bcb974c55a4d42a6b1c7e941f',
      },
      expected: {
        matches: true,
      },
    },
  },
})

assert.equal(details.responseStatus, 200)
assert.equal(details.body.app, 'LexInsights')
assert.equal(details.body.secret, undefined)
assert.equal(details.commitMatches, true)
assertNoSensitiveMarkers(details)

const restrictedDiagnostics = productionDiagnosticsCheck(
  {
    name: 'app.version',
    status: 'pass',
    details: {
      body: {
        source: {
          commitSha: '5363fa7699f88f2bcb974c55a4d42a6b1c7e941f',
        },
        deployment: {
          details: 'restricted',
        },
      },
    },
  },
  {
    name: 'app.readiness',
    status: 'pass',
    details: {
      body: {
        checks: [
          {
            name: 'supabase.url',
            status: 'pass',
            critical: true,
            message: 'Configured',
          },
        ],
      },
    },
  }
)
assert.equal(restrictedDiagnostics.status, 'pass')

const exposedDiagnostics = productionDiagnosticsCheck(
  {
    name: 'app.version',
    status: 'pass',
    details: {
      body: {
        source: {
          commitSha: '5363fa7699f88f2bcb974c55a4d42a6b1c7e941f',
          branch: 'main',
          repoOwner: 'private-owner',
        },
        deployment: {
          url: 'private.vercel.app',
        },
      },
    },
  },
  {
    name: 'app.readiness',
    status: 'pass',
    details: {
      body: {
        checks: [
          {
            name: 'supabase.url',
            status: 'pass',
            critical: true,
            message: 'Configured',
            details: {
              target: 'private-target',
            },
          },
        ],
      },
    },
  }
)
assert.equal(exposedDiagnostics.status, 'fail')
assert.equal(exposedDiagnostics.critical, true)

console.log('Live deployment self-test passed.')
