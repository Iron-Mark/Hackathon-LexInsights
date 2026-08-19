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

  // A zero-row table request exercises Postgres without returning protected data.
  const url = new URL('/rest/v1/compliance_reports', baseUrl)
  url.searchParams.set('select', 'id')
  url.searchParams.set('limit', '0')
  return url
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function apiKeyType(apiKey) {
  if (apiKey.startsWith('sb_secret_')) {
    throw new Error('SUPABASE_ANON_KEY must be a public publishable or legacy anon key.')
  }

  if (apiKey.startsWith('sb_publishable_')) {
    return 'publishable'
  }

  if (apiKey.split('.').length === 3) {
    return 'legacy anon JWT'
  }

  throw new Error('SUPABASE_ANON_KEY has an unsupported public key format.')
}

function requestHeaders(apiKey, keyType) {

  const headers = {
    accept: 'application/json',
    apikey: apiKey,
  }

  // Legacy anon keys are JWTs. Modern sb_publishable_ keys are not and are
  // rejected if they are sent as Bearer tokens.
  if (keyType === 'legacy anon JWT') {
    headers.authorization = `Bearer ${apiKey}`
  }

  return headers
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

async function isExpectedPermissionDenial(response) {
  if (response.status !== 401 && response.status !== 403) {
    return false
  }

  try {
    const payload = JSON.parse(await response.text())
    return payload?.code === '42501' && /permission denied/i.test(String(payload?.message || ''))
  } catch {
    return false
  }
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
  const keyType = apiKeyType(anonKey)
  const url = keepaliveUrl(env)
  let lastError

  logger.info(`Using a Supabase ${keyType} key.`)

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
        headers: requestHeaders(anonKey, keyType),
        method: 'GET',
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (await isExpectedPermissionDenial(response)) {
        logger.info(
          `Supabase database keep-alive reached Postgres; anonymous table access was denied as expected with HTTP ${response.status}.`,
        )
        return { permissionDenied: true, status: response.status, url: url.origin }
      }

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
