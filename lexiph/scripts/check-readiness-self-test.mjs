#!/usr/bin/env node

import assert from 'node:assert/strict'

import {
  checkSupabaseAnonKey,
  checkSupabaseProjectRef,
  getStandardSupabaseProjectRef,
  inspectSupabaseKey,
  safeUrl,
} from './check-readiness.mjs'

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64url')
}

function makeLegacySupabaseJwt(payload) {
  return [
    encodeJwtPart({ alg: 'HS256', typ: 'JWT' }),
    encodeJwtPart(payload),
    'signature',
  ].join('.')
}

function getCheck(checks, name) {
  const check = checks.find((item) => item.name === name)
  assert.ok(check, `Expected check ${name} to exist`)
  return check
}

function assertNoRawKeyLeak(checks, rawKey) {
  assert.equal(JSON.stringify(checks).includes(rawKey), false, 'Readiness checks leaked the raw key')
}

const projectRef = 'abcdefghijklmnopqrst'
const projectUrl = safeUrl(`https://${projectRef}.supabase.co`)
const matchingAnonKey = makeLegacySupabaseJwt({
  iss: 'supabase',
  ref: projectRef,
  role: 'anon',
  iat: 1710000000,
  exp: 4102444800,
})
const mismatchedAnonKey = makeLegacySupabaseJwt({
  iss: 'supabase',
  ref: 'zzzzzzzzzzzzzzzzzzzz',
  role: 'anon',
  iat: 1710000000,
  exp: 4102444800,
})
const serviceRoleKey = makeLegacySupabaseJwt({
  iss: 'supabase',
  ref: projectRef,
  role: 'service_role',
  iat: 1710000000,
  exp: 4102444800,
})

assert.equal(getStandardSupabaseProjectRef(projectUrl), projectRef)
assert.equal(getStandardSupabaseProjectRef(safeUrl('https://db.example.com')), null)

const projectRefCheck = checkSupabaseProjectRef(projectRef, `${projectRef}.supabase.co`)
assert.equal(projectRefCheck.status, 'pass')
assert.equal(projectRefCheck.critical, false)

const matchingChecks = checkSupabaseAnonKey(matchingAnonKey, projectRef)
assert.equal(getCheck(matchingChecks, 'supabase.anon_key_format').status, 'pass')
assert.equal(getCheck(matchingChecks, 'supabase.anon_key_role').status, 'pass')
assert.equal(getCheck(matchingChecks, 'supabase.anon_key_project_ref').status, 'pass')
assertNoRawKeyLeak(matchingChecks, matchingAnonKey)

const mismatchedChecks = checkSupabaseAnonKey(mismatchedAnonKey, projectRef)
assert.equal(getCheck(mismatchedChecks, 'supabase.anon_key_project_ref').status, 'fail')
assert.equal(getCheck(mismatchedChecks, 'supabase.anon_key_project_ref').critical, true)
assertNoRawKeyLeak(mismatchedChecks, mismatchedAnonKey)

const serviceRoleChecks = checkSupabaseAnonKey(serviceRoleKey, projectRef)
assert.equal(inspectSupabaseKey(serviceRoleKey).role, 'service_role')
assert.equal(getCheck(serviceRoleChecks, 'supabase.anon_key_role').status, 'fail')
assert.equal(getCheck(serviceRoleChecks, 'supabase.anon_key_role').critical, true)
assertNoRawKeyLeak(serviceRoleChecks, serviceRoleKey)

const secretChecks = checkSupabaseAnonKey('sb_secret_local_example', projectRef)
assert.equal(getCheck(secretChecks, 'supabase.anon_key_format').status, 'fail')
assert.equal(getCheck(secretChecks, 'supabase.anon_key_format').critical, true)
assertNoRawKeyLeak(secretChecks, 'sb_secret_local_example')

const publishableChecks = checkSupabaseAnonKey('sb_publishable_local_example', projectRef)
assert.equal(getCheck(publishableChecks, 'supabase.anon_key_format').status, 'pass')
assert.equal(getCheck(publishableChecks, 'supabase.anon_key_project_ref').status, 'skip')
assert.equal(getCheck(publishableChecks, 'supabase.anon_key_project_ref').critical, false)
assertNoRawKeyLeak(publishableChecks, 'sb_publishable_local_example')

const unknownChecks = checkSupabaseAnonKey('not-a-valid-key', projectRef)
assert.equal(getCheck(unknownChecks, 'supabase.anon_key_format').status, 'fail')
assert.equal(getCheck(unknownChecks, 'supabase.anon_key_format').critical, true)
assertNoRawKeyLeak(unknownChecks, 'not-a-valid-key')

console.log('Readiness self-test passed.')
