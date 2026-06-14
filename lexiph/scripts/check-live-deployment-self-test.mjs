#!/usr/bin/env node

import assert from 'node:assert/strict'

import {
  appendPath,
  compareSha,
  parseArgs,
  publicCheckDetails,
  safeUrl,
} from './check-live-deployment.mjs'

function assertNoSensitiveMarkers(value) {
  const text = JSON.stringify(value)
  assert.equal(text.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), false, 'Output leaked Supabase key names')
  assert.equal(text.includes('secret-value'), false, 'Output leaked private body fields')
}

assert.deepEqual(parseArgs([]), {
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
      app: 'LexInSight',
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
assert.equal(details.body.app, 'LexInSight')
assert.equal(details.body.secret, undefined)
assert.equal(details.commitMatches, true)
assertNoSensitiveMarkers(details)

console.log('Live deployment self-test passed.')
