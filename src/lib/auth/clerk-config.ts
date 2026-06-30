export const CLERK_SETUP_TITLE = 'Account sign-in is unavailable'
export const CLERK_SETUP_MESSAGE =
  'LexInsights is running in guest mode because Clerk is not fully configured. Add the Clerk publishable and secret keys to enable sign-in, sign-up, and protected routes.'

export const CLERK_SETUP_REQUIRED_ENV = [
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
] as const

export type ClerkSetupKey = (typeof CLERK_SETUP_REQUIRED_ENV)[number]

export interface ClerkSetupStatus {
  configured: boolean
  clientConfigured: boolean
  serverConfigured: boolean
  missingKeys: ClerkSetupKey[]
}

function normalizeEnvValue(value: string | undefined) {
  return value?.trim() || ''
}

function hasUsableEnvValue(value: string | undefined) {
  const normalized = normalizeEnvValue(value)

  if (!normalized) return false

  const lower = normalized.toLowerCase()

  return !(
    lower === 'undefined' ||
    lower === 'null' ||
    lower.includes('your_') ||
    lower.includes('placeholder') ||
    lower.includes('<') ||
    lower.includes('>')
  )
}

function hasClerkPublishableKey(value: string | undefined) {
  const normalized = normalizeEnvValue(value)

  return hasUsableEnvValue(normalized) && /^pk_(test|live)_/.test(normalized)
}

function hasClerkSecretKey(value: string | undefined) {
  const normalized = normalizeEnvValue(value)

  return hasUsableEnvValue(normalized) && /^sk_(test|live)_/.test(normalized)
}

export function getClerkSetupStatus(): ClerkSetupStatus {
  const clientConfigured = hasClerkPublishableKey(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
  const serverConfigured = hasClerkSecretKey(process.env.CLERK_SECRET_KEY)
  const missingKeys: ClerkSetupKey[] = []

  if (!clientConfigured) {
    missingKeys.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')
  }

  if (!serverConfigured) {
    missingKeys.push('CLERK_SECRET_KEY')
  }

  return {
    configured: clientConfigured && serverConfigured,
    clientConfigured,
    serverConfigured,
    missingKeys,
  }
}

export function isClerkClientConfigured() {
  return getClerkSetupStatus().clientConfigured
}

export function isClerkConfigured() {
  return getClerkSetupStatus().configured
}
