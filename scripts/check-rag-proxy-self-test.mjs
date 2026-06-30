#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

import {
  DEFAULT_GET_TIMEOUT_MS,
  DEFAULT_POST_TIMEOUT_MS,
  MAX_GET_TIMEOUT_MS,
  MAX_POST_TIMEOUT_MS,
  MAX_PROXY_POST_BODY_BYTES,
  MIN_PROXY_TIMEOUT_MS,
  getProxyFailure,
  getProxyContentLength,
  getProxyTimeoutMs,
  getProxyUpstream,
  publicUpstreamHttpErrorDetail,
  publicUpstreamPayloadErrorDetail,
  summarizeProxyLogDetail,
  validateProxyContentLength,
  validateProxyPostBody,
} from '../src/lib/services/rag-proxy-helpers.mjs'

const rootDir = process.cwd()
const guardrailsSourcePath = path.join(rootDir, 'src/lib/server/request-guardrails.ts')

async function loadGuardrailsModule() {
  assert.equal(existsSync(guardrailsSourcePath), true, 'request-guardrails.ts is missing')

  const source = readFileSync(guardrailsSourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    fileName: guardrailsSourcePath,
  })
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsights-rag-guardrails-'))
  const tempModulePath = path.join(tempDir, 'request-guardrails.mjs')

  writeFileSync(tempModulePath, transpiled.outputText, 'utf8')

  try {
    return {
      module: await import(pathToFileURL(tempModulePath).href),
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function params(value) {
  return new URLSearchParams(value)
}

function headers(value) {
  return new Headers(value)
}

function assertNoSecretMarkers(value) {
  const text = JSON.stringify(value)
  assert.equal(text.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), false, 'Proxy helper leaked Supabase env key names')
  assert.equal(text.includes('sb_secret_'), false, 'Proxy helper leaked Supabase secret key markers')
}

const baseUrl = 'https://devkada.resqlink.org'

assert.equal(getProxyTimeoutMs(params(''), DEFAULT_GET_TIMEOUT_MS, MAX_GET_TIMEOUT_MS), DEFAULT_GET_TIMEOUT_MS)
assert.equal(getProxyTimeoutMs(params('timeoutMs=-1'), DEFAULT_GET_TIMEOUT_MS, MAX_GET_TIMEOUT_MS), DEFAULT_GET_TIMEOUT_MS)
assert.equal(getProxyTimeoutMs(params('timeoutMs=100'), DEFAULT_GET_TIMEOUT_MS, MAX_GET_TIMEOUT_MS), MIN_PROXY_TIMEOUT_MS)
assert.equal(getProxyTimeoutMs(params('timeoutMs=999999'), DEFAULT_GET_TIMEOUT_MS, MAX_GET_TIMEOUT_MS), MAX_GET_TIMEOUT_MS)
assert.equal(getProxyTimeoutMs(params('timeoutMs=120000'), DEFAULT_POST_TIMEOUT_MS, MAX_POST_TIMEOUT_MS), 120000)

const defaultUpstream = getProxyUpstream(params(''), '/api/research/health', baseUrl)
assert.equal(defaultUpstream.endpoint, '/api/research/health')
assert.equal(defaultUpstream.upstreamUrl, 'https://devkada.resqlink.org/api/research/health')
assert.equal(defaultUpstream.upstreamOrigin, baseUrl)

const relativeUpstream = getProxyUpstream(params('endpoint=api/research/health'), '/fallback', baseUrl)
assert.equal(relativeUpstream.upstreamUrl, 'https://devkada.resqlink.org/api/research/health')

const sameOriginUpstream = getProxyUpstream(
  params('endpoint=https://devkada.resqlink.org/api/research/health'),
  '/fallback',
  baseUrl
)
assert.equal(sameOriginUpstream.upstreamUrl, 'https://devkada.resqlink.org/api/research/health')

const crossOriginUpstream = getProxyUpstream(
  params('endpoint=https://example.com/api/research/health'),
  '/fallback',
  baseUrl
)
assert.equal(crossOriginUpstream.error, 'Endpoint must stay on the configured RAG API origin')
assert.equal(crossOriginUpstream.upstreamUrl, undefined)

const protocolRelativeUpstream = getProxyUpstream(
  params('endpoint=//example.com/api/research/health'),
  '/fallback',
  baseUrl
)
assert.equal(protocolRelativeUpstream.error, 'Endpoint must stay on the configured RAG API origin')
assert.equal(protocolRelativeUpstream.upstreamUrl, undefined)

const invalidBaseUpstream = getProxyUpstream(params('endpoint=/api/research/health'), '/fallback', 'not a url')
assert.equal(invalidBaseUpstream.error, 'Invalid RAG API URL or endpoint')

const timeoutError = new DOMException('operation timed out', 'TimeoutError')
assert.deepEqual(getProxyFailure(timeoutError), {
  status: 504,
  type: 'upstream_timeout',
  detail: 'RAG backend request timed out. Providerless local research may still be available.',
})

const connectTimeoutError = new TypeError('fetch failed')
connectTimeoutError.cause = {
  code: 'UND_ERR_CONNECT_TIMEOUT',
}
assert.deepEqual(getProxyFailure(connectTimeoutError), {
  status: 504,
  type: 'upstream_timeout',
  detail: 'RAG backend request timed out. Providerless local research may still be available.',
})

assert.deepEqual(getProxyFailure(new TypeError('fetch failed')), {
  status: 502,
  type: 'upstream_fetch_failed',
  detail: 'RAG backend request failed. Providerless local research may still be available.',
})

assert.deepEqual(getProxyFailure('unknown'), {
  status: 500,
  type: 'proxy_error',
  detail: 'RAG proxy request failed.',
})

assert.equal(
  publicUpstreamHttpErrorDetail(500),
  'RAG backend returned HTTP 500. Check server logs or readiness status.'
)
assert.equal(
  publicUpstreamPayloadErrorDetail('a non-JSON response body'),
  'RAG backend returned a non-JSON response body. Check server logs or readiness status.'
)

const summarizedHtml = summarizeProxyLogDetail(`<!DOCTYPE html>
<html>${'x'.repeat(500)}</html>`)
assert.equal(summarizedHtml.includes('\n'), false)
assert.equal(summarizedHtml.length <= 200, true)
const summarizedEndpoint = summarizeProxyLogDetail(`/api/research/health
X-Injected: ${'x'.repeat(500)}`)
assert.equal(summarizedEndpoint.includes('\n'), false)
assert.equal(summarizedEndpoint.includes('X-Injected'), true)
assert.equal(summarizedEndpoint.length <= 200, true)
assert.equal(summarizeProxyLogDetail(''), 'empty upstream error body')

assert.equal(getProxyContentLength(headers({ 'content-length': '123' })), 123)
assert.equal(getProxyContentLength(headers({ 'content-length': 'nope' })), null)
assert.deepEqual(validateProxyContentLength(headers({ 'content-length': String(MAX_PROXY_POST_BODY_BYTES) })).ok, true)
assert.deepEqual(validateProxyContentLength(headers({ 'content-length': String(MAX_PROXY_POST_BODY_BYTES + 1) })), {
  ok: false,
  status: 413,
  type: 'payload_too_large',
  detail: 'RAG proxy requests are limited to 64KB.',
  contentLength: MAX_PROXY_POST_BODY_BYTES + 1,
})

assert.deepEqual(validateProxyPostBody(null), {
  ok: false,
  status: 400,
  type: 'invalid_request_body',
  detail: 'RAG proxy requests must be JSON objects.',
})
assert.deepEqual(validateProxyPostBody({ query: '   ' }), {
  ok: false,
  status: 400,
  type: 'invalid_query',
  detail: 'RAG proxy requests require a non-empty query.',
})
assert.deepEqual(validateProxyPostBody({ query: 'x'.repeat(4001) }), {
  ok: false,
  status: 413,
  type: 'query_too_large',
  detail: 'RAG proxy queries are limited to 4,000 characters.',
})
assert.deepEqual(validateProxyPostBody({
  query: '  RA 10173 privacy  ',
  user_id: 'user-1',
  use_deep_search: true,
  injected: 'ignored',
}), {
  ok: true,
  body: {
    query: 'RA 10173 privacy',
    user_id: 'user-1',
    use_deep_search: true,
  },
})

assertNoSecretMarkers({
  defaultUpstream,
  relativeUpstream,
  sameOriginUpstream,
  crossOriginUpstream,
  protocolRelativeUpstream,
  invalidBaseUpstream,
})

const { module: guardrails, cleanup } = await loadGuardrailsModule()

try {
  const {
    buildPublicApiErrorBody,
    buildThrottleErrorBody,
    checkPublicApiThrottle,
    createPublicApiRequestContext,
    getClientKey,
    getThrottleHeaders,
    resetPublicApiThrottleForSelfTest,
    safeEndpointPath,
    sanitizeForStructuredLog,
  } = guardrails

  const requestHeaders = headers({
    'x-forwarded-for': '203.0.113.9, 10.0.0.1',
    'x-request-id': 'rag-self-test-0001',
  })
  assert.equal(getClientKey(requestHeaders), '203.0.113.9')

  const context = createPublicApiRequestContext({
    method: 'POST',
    headers: requestHeaders,
  }, '/api/rag-proxy')
  assert.equal(context.requestId, 'rag-self-test-0001')
  assert.equal(context.routeKey, 'POST /api/rag-proxy')
  assert.notEqual(context.clientFingerprint, context.clientKey, 'Logs should not use raw IP addresses')

  resetPublicApiThrottleForSelfTest()
  const limit = {
    windowMs: 1000,
    max: 2,
  }
  assert.deepEqual(checkPublicApiThrottle(context, limit, 1000), {
    ok: true,
    limit: 2,
    remaining: 1,
    resetAt: 2000,
    retryAfterSeconds: 0,
  })
  assert.deepEqual(checkPublicApiThrottle(context, limit, 1100), {
    ok: true,
    limit: 2,
    remaining: 0,
    resetAt: 2000,
    retryAfterSeconds: 0,
  })
  assert.deepEqual(checkPublicApiThrottle(context, limit, 1200), {
    ok: false,
    limit: 2,
    remaining: 0,
    resetAt: 2000,
    retryAfterSeconds: 1,
  })
  assert.equal(checkPublicApiThrottle(context, limit, 2100).ok, true, 'Throttle buckets should reset after the window')

  const throttled = checkPublicApiThrottle(context, limit, 2200)
  assert.equal(throttled.ok, true)
  const throttleHeaders = getThrottleHeaders({
    ok: false,
    limit: 2,
    remaining: 0,
    resetAt: 3000,
    retryAfterSeconds: 1,
  }, context.requestId)
  assert.equal(throttleHeaders['X-Request-ID'], context.requestId)
  assert.equal(throttleHeaders['Retry-After'], '1')
  assert.equal(throttleHeaders['X-RateLimit-Limit'], '2')

  assert.deepEqual(buildThrottleErrorBody(context, {
    ok: false,
    limit: 2,
    remaining: 0,
    resetAt: 3000,
    retryAfterSeconds: 1,
  }), {
    detail: 'Too many requests. Try again shortly.',
    error: {
      type: 'rate_limited',
      requestId: 'rag-self-test-0001',
      route: '/api/rag-proxy',
      retryAfterSeconds: 1,
    },
  })

  assert.equal(safeEndpointPath('/api/research/health?token=sb_secret_should_not_leak'), '/api/research/health')

  const publicError = buildPublicApiErrorBody(context, 'Invalid request.', 'invalid_request', {
    query: 'What is the private fact?',
    fileName: 'Maria Dela Cruz draft.pdf',
    endpointPath: safeEndpointPath('/api/research/health?token=sb_secret_should_not_leak'),
    contentLength: 123,
  })
  const publicErrorText = JSON.stringify(publicError)
  assert.equal(publicError.error.requestId, 'rag-self-test-0001')
  assert.equal(publicError.error.type, 'invalid_request')
  assert.equal(publicError.error.endpointPath, '/api/research/health')
  assert.equal(publicError.error.contentLength, 123)
  assert.equal(publicErrorText.includes('private fact'), false)
  assert.equal(publicErrorText.includes('Maria Dela Cruz'), false)
  assert.equal(publicErrorText.includes('sb_secret_should_not_leak'), false)

  const sanitizedLog = sanitizeForStructuredLog({
    requestId: context.requestId,
    query: 'RA 10173 for juan@example.com',
    text: 'extracted document text',
    fileName: 'Juan Dela Cruz draft.pdf',
    authorization: 'Bearer secret-token-value',
    endpointPath: '/api/research/health',
    detail: 'Contact juan@example.com from 203.0.113.9 using sb_secret_should_not_leak.',
  })
  const sanitizedLogText = JSON.stringify(sanitizedLog)
  assert.equal(sanitizedLog.query, '[redacted]')
  assert.equal(sanitizedLog.text, '[redacted]')
  assert.equal(sanitizedLog.fileName, '[redacted]')
  assert.equal(sanitizedLog.authorization, '[redacted]')
  assert.equal(sanitizedLogText.includes('juan@example.com'), false)
  assert.equal(sanitizedLogText.includes('203.0.113.9'), false)
  assert.equal(sanitizedLogText.includes('sb_secret_should_not_leak'), false)
} finally {
  cleanup()
}

console.log('RAG proxy self-test passed.')
