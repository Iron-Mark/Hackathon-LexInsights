import assert from 'node:assert/strict'

import { runSupabaseKeepalive } from './run-supabase-keepalive.mjs'

const env = {
  SUPABASE_ANON_KEY: 'sb_publishable_test_key',
  SUPABASE_URL: 'https://project-ref.supabase.co',
}

const requests = []
const messages = []
const logger = {
  info: (message) => messages.push(message),
  warn: (message) => messages.push(message),
}

const result = await runSupabaseKeepalive({
  env,
  fetchImpl: async (url, options) => {
    requests.push({ options, url: String(url) })
    return { body: null, ok: true, status: 200 }
  },
  logger,
})

assert.equal(result.status, 200)
assert.equal(requests.length, 1)
assert.equal(
  requests[0].url,
  'https://project-ref.supabase.co/rest/v1/compliance_reports?select=id&limit=0',
)
assert.equal(requests[0].options.method, 'GET')
assert.equal(requests[0].options.headers.accept, 'application/openapi+json')
assert.equal(requests[0].options.headers.apikey, env.SUPABASE_ANON_KEY)
assert.equal('authorization' in requests[0].options.headers, false)
assert.equal(messages.some((message) => message.includes(env.SUPABASE_ANON_KEY)), false)

const denied = await runSupabaseKeepalive({
  env,
  fetchImpl: async () => ({
    ok: false,
    status: 401,
    text: async () => JSON.stringify({
      code: '42501',
      message: 'permission denied for table compliance_reports',
    }),
  }),
  logger,
})
assert.equal(denied.permissionDenied, true)
assert.equal(denied.status, 401)

await assert.rejects(
  runSupabaseKeepalive({
    env,
    attempts: 1,
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ message: 'Invalid API key' }),
    }),
    logger,
  }),
  /failed after 1 attempt.*HTTP 401/,
)

const legacyRequests = []
const legacyKey = 'eyJlegacy.anon.jwt'
await runSupabaseKeepalive({
  env: { ...env, SUPABASE_ANON_KEY: legacyKey },
  fetchImpl: async (url, options) => {
    legacyRequests.push({ options, url: String(url) })
    return { body: null, ok: true, status: 200 }
  },
  logger,
})
assert.equal(legacyRequests[0].options.headers.apikey, legacyKey)
assert.equal(legacyRequests[0].options.headers.authorization, `Bearer ${legacyKey}`)

await assert.rejects(
  runSupabaseKeepalive({
    env: { ...env, SUPABASE_ANON_KEY: 'sb_secret_test_key' },
    attempts: 1,
  }),
  /must be a public publishable or legacy anon key/,
)

await assert.rejects(
  runSupabaseKeepalive({
    env: { ...env, SUPABASE_ANON_KEY: 'not-a-supported-key' },
    attempts: 1,
  }),
  /unsupported public key format/,
)

await assert.rejects(
  runSupabaseKeepalive({ env: {}, attempts: 1 }),
  /SUPABASE_ANON_KEY is required/,
)

let failedRequests = 0
await assert.rejects(
  runSupabaseKeepalive({
    env,
    attempts: 3,
    fetchImpl: async () => {
      failedRequests += 1
      return { ok: false, status: 503 }
    },
    logger,
    sleep: async () => {},
  }),
  /failed after 3 attempts.*HTTP 503/,
)
assert.equal(failedRequests, 3)

let dnsAttempts = 0
await assert.rejects(
  runSupabaseKeepalive({
    env,
    attempts: 3,
    fetchImpl: async () => {
      dnsAttempts += 1
      throw Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('getaddrinfo ENOTFOUND project-ref.supabase.co'), {
          code: 'ENOTFOUND',
        }),
      })
    },
    logger,
    sleep: async () => {},
  }),
  /failed after 3 attempts.*ENOTFOUND/,
)
assert.equal(dnsAttempts, 3)

await assert.rejects(
  runSupabaseKeepalive({
    env: { ...env, SUPABASE_URL: 'http://project-ref.supabase.co' },
    attempts: 1,
  }),
  /must use HTTPS/,
)

console.log('Supabase keep-alive self-test passed.')
