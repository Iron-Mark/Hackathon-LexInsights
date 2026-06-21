#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()

function readProjectFile(relativePath) {
  const filePath = path.join(rootDir, relativePath)
  assert.equal(existsSync(filePath), true, `${relativePath} is missing`)
  return readFileSync(filePath, 'utf8')
}

function assertIncludes(source, expected, label) {
  assert.equal(
    source.includes(expected),
    true,
    `${label} must include ${expected}`
  )
}

function assertMatches(source, pattern, label) {
  assert.match(source, pattern, label)
}

function readPngSize(relativePath) {
  const filePath = path.join(rootDir, relativePath)
  assert.equal(existsSync(filePath), true, `${relativePath} is missing`)
  const buffer = readFileSync(filePath)
  assert.equal(buffer.subarray(1, 4).toString('ascii'), 'PNG', `${relativePath} must be a PNG`)

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

const manifest = readProjectFile('src/app/manifest.ts')
assertIncludes(manifest, "name: 'LexInSight'", 'PWA manifest')
assertIncludes(manifest, "short_name: 'LexInSight'", 'PWA manifest')
assertIncludes(manifest, "start_url: '/'", 'PWA manifest')
assertIncludes(manifest, "display: 'standalone'", 'PWA manifest')
assertIncludes(manifest, "scope: '/'", 'PWA manifest')
assertIncludes(manifest, "theme_color: '#3F33BD'", 'PWA manifest')
assertIncludes(manifest, "background_color: '#FFFFFF'", 'PWA manifest')
assertIncludes(manifest, "src: '/icons/icon-192x192.png'", 'PWA manifest')
assertIncludes(manifest, "src: '/icons/icon-512x512.png'", 'PWA manifest')
assertIncludes(manifest, "purpose: 'maskable'", 'PWA manifest')

const layout = readProjectFile('src/app/layout.tsx')
assertIncludes(layout, 'ServiceWorkerRegistration', 'Root layout')
assertIncludes(layout, 'export const viewport', 'Root layout')
assertIncludes(layout, "themeColor: '#3F33BD'", 'Root layout viewport')
assertMatches(layout, /apple:\s*["']\/icons\/apple-touch-icon\.png["']/, 'Root layout metadata icons')

const registration = readProjectFile('src/components/pwa/service-worker-registration.tsx')
assertIncludes(registration, "'use client'", 'Service worker registration component')
assertIncludes(registration, "navigator.serviceWorker.register('/sw.js'", 'Service worker registration component')
assertIncludes(registration, "scope: '/'", 'Service worker registration component')
assertIncludes(registration, "updateViaCache: 'none'", 'Service worker registration component')

const serviceWorker = readProjectFile('public/sw.js')
assertIncludes(serviceWorker, "const CACHE_NAME = 'lexinsight-pwa-v1'", 'Service worker')
assertMatches(serviceWorker, /self\.addEventListener\('install'/, 'Service worker must handle install')
assertMatches(serviceWorker, /self\.addEventListener\('activate'/, 'Service worker must handle activate')
assertMatches(serviceWorker, /self\.addEventListener\('fetch'/, 'Service worker must handle fetch')
assertIncludes(serviceWorker, "event.request.mode === 'navigate'", 'Service worker')
assertIncludes(serviceWorker, "request.url.includes('/api/')", 'Service worker')
assertIncludes(serviceWorker, "'/offline'", 'Service worker')

const nextConfig = readProjectFile('next.config.ts')
assertIncludes(nextConfig, 'async headers()', 'Next config')
assertIncludes(nextConfig, "source: '/sw.js'", 'Next config service worker headers')
assertIncludes(nextConfig, 'application/javascript; charset=utf-8', 'Next config service worker content type')
assertIncludes(nextConfig, 'Service-Worker-Allowed', 'Next config service worker scope header')
assertIncludes(nextConfig, 'nosniff', 'Next config service worker nosniff header')
assertIncludes(nextConfig, 'no-cache, no-store, must-revalidate', 'Next config service worker cache control')

for (const [relativePath, expectedSize] of [
  ['public/icons/icon-192x192.png', 192],
  ['public/icons/icon-512x512.png', 512],
  ['public/icons/maskable-192x192.png', 192],
  ['public/icons/maskable-512x512.png', 512],
  ['public/icons/apple-touch-icon.png', 180],
]) {
  const size = readPngSize(relativePath)
  assert.deepEqual(size, { width: expectedSize, height: expectedSize }, `${relativePath} must be ${expectedSize}x${expectedSize}`)
}

console.log('PWA readiness check passed.')
