import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3100'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm run dev -- -H 127.0.0.1 -p 3100',
        env: {
          CLERK_SECRET_KEY: '',
          ENABLE_DIAGNOSTIC_ROUTES: 'true',
          NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: '',
          NEXT_PUBLIC_RAG_API_URL: baseURL,
          NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ci_smoke_placeholder',
          NEXT_PUBLIC_USE_RAG_PROXY: 'true',
        },
        url: baseURL,
        reuseExistingServer: false,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
