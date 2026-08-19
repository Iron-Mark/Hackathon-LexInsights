import { pathToFileURL } from 'node:url'

const DEFAULT_ATTEMPTS = 3
const DEFAULT_TIMEOUT_MS = 30_000

function requiredEnv(env, name) {
  const value = String(env[name] || '').trim()
  if (!value) {
    throw new Error(`${name} is required; configure it as a GitHub Actions secret.`)
  }
  return value
}

function keepaliveUrl(env) {
  const baseUrl = new URL(requiredEnv(env, 'SUPABASE_URL'))
  if (baseUrl.protocol !== 'https:') {
    throw new Error('SUPABASE_URL must use HTTPS.')
  }

  // Exercise the database API without granting the public key access to protected app tables.
  return new URL('/rest/v1/', baseUrl)
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function errorDetails(error) {
  const normalized = error instanceof Error ? error : new Error(String(error))
  const causeCode = normalized.cause && typeof normalized.cause === 'object'
    ? normalized.cause.code
    : undefined

  return typeof causeCode === 'string'
    ? `${normalized.message} (${causeCode})`
    : normalized.message
}

export async function runSupabaseKeepalive({
  env = process.env,
  fetchImpl = fetch,
  logger = console,
  sleep = delay,
  attempts = DEFAULT_ATTEMPTS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const anonKey = requiredEnv(env, 'SUPABASE_ANON_KEY')
  const url = keepaliveUrl(env)
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          accept: 'application/openapi+json',
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
        },
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (!response.ok) {
        throw new Error(`Supabase database keep-alive returned HTTP ${response.status}.`)
      }

      await response.body?.cancel()
      logger.info(`Supabase database keep-alive succeeded with HTTP ${response.status}.`)
      return { status: response.status, url: url.origin }
    } catch (error) {
      lastError = errorDetails(error)
      if (attempt < attempts) {
        logger.warn(`Supabase keep-alive attempt ${attempt}/${attempts} failed; retrying.`)
        await sleep(attempt * 1_000)
      }
    }
  }

  throw new Error(
    `Supabase database keep-alive failed after ${attempts} attempts: ${lastError || 'unknown error'}`,
  )
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : ''
if (import.meta.url === entrypoint) {
  runSupabaseKeepalive().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
