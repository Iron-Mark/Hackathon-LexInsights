const PRODUCTION_SITE_ORIGIN = 'https://lexiph.vercel.app'
const VERCEL_HOST_SUFFIX = '.vercel.app'

function parseAllowedOrigin(value: string | undefined) {
  if (!value) {
    return null
  }

  const candidate = value.includes('://') ? value : `https://${value}`

  try {
    const url = new URL(candidate)
    const host = url.hostname.toLowerCase()
    const isAllowedHost = host === 'lexiph.vercel.app' || host.endsWith(VERCEL_HOST_SUFFIX)

    if (url.protocol !== 'https:' || !isAllowedHost || url.username || url.password) {
      return null
    }

    return url.origin
  } catch {
    return null
  }
}

interface ReadinessEnvironment {
  NEXT_PUBLIC_SITE_URL?: string
  VERCEL_URL?: string
}

export function resolveReadinessOrigin(
  env: ReadinessEnvironment = {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  }
) {
  return (
    parseAllowedOrigin(env.NEXT_PUBLIC_SITE_URL?.trim()) ||
    parseAllowedOrigin(env.VERCEL_URL?.trim()) ||
    PRODUCTION_SITE_ORIGIN
  )
}
