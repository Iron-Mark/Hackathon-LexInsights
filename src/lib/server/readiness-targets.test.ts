import { describe, expect, it } from 'vitest'

import { resolveReadinessOrigin } from './readiness-targets'

describe('resolveReadinessOrigin', () => {
  it('accepts the production site origin', () => {
    expect(resolveReadinessOrigin({ NEXT_PUBLIC_SITE_URL: 'https://lexiph.vercel.app/path' })).toBe(
      'https://lexiph.vercel.app'
    )
  })

  it('accepts a Vercel preview host without a scheme', () => {
    expect(resolveReadinessOrigin({ VERCEL_URL: 'lexinsights-preview.vercel.app' })).toBe(
      'https://lexinsights-preview.vercel.app'
    )
  })

  it.each([
    'http://lexiph.vercel.app',
    'https://lexiph.vercel.app.evil.example',
    'https://127.0.0.1:3000',
    'https://169.254.169.254',
    'https://user:password@lexiph.vercel.app',
  ])('rejects an unsafe configured origin: %s', (value) => {
    expect(resolveReadinessOrigin({ NEXT_PUBLIC_SITE_URL: value })).toBe(
      'https://lexiph.vercel.app'
    )
  })
})
