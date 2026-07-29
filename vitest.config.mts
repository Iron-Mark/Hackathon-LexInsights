import { fileURLToPath } from 'node:url'

import { configDefaults, defineConfig } from 'vitest/config'

// Unit-test runner (PRD section 10 infra risk: E2E-only coverage). Scoped to
// *.test.ts files under src/ so the Playwright specs in tests/e2e/ stay with
// their own runner (playwright.config.ts). Pure-logic modules run in the node
// environment; a DOM-dependent test can opt in with a per-file
// `// @vitest-environment jsdom` pragma once jsdom is added.
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'tests/unit/**/*.test.{ts,tsx}'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
  },
})
