#!/usr/bin/env node

import assert from 'node:assert/strict'

import {
  DEFAULT_GET_TIMEOUT_MS,
  DEFAULT_POST_TIMEOUT_MS,
  MAX_GET_TIMEOUT_MS,
  MAX_POST_TIMEOUT_MS,
  MIN_PROXY_TIMEOUT_MS,
  getProxyFailure,
  getProxyTimeoutMs,
  getProxyUpstream,
} from '../lib/services/rag-proxy-helpers.mjs'

function params(value) {
  return new URLSearchParams(value)
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
  detail: 'operation timed out',
})

const connectTimeoutError = new TypeError('fetch failed')
connectTimeoutError.cause = {
  code: 'UND_ERR_CONNECT_TIMEOUT',
}
assert.deepEqual(getProxyFailure(connectTimeoutError), {
  status: 504,
  type: 'upstream_timeout',
  detail: 'fetch failed',
})

assert.deepEqual(getProxyFailure(new TypeError('fetch failed')), {
  status: 502,
  type: 'upstream_fetch_failed',
  detail: 'fetch failed',
})

assert.deepEqual(getProxyFailure('unknown'), {
  status: 500,
  type: 'proxy_error',
  detail: 'Failed to fetch from RAG API',
})

assertNoSecretMarkers({
  defaultUpstream,
  relativeUpstream,
  sameOriginUpstream,
  crossOriginUpstream,
  protocolRelativeUpstream,
  invalidBaseUpstream,
})

console.log('RAG proxy self-test passed.')
