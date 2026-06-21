export const RAG_BACKEND_UNAVAILABLE_MESSAGE =
  'AI/RAG provider unavailable. Using local providerless legal research mode.'

export const RAG_BACKEND_ISSUE_URL =
  process.env.NEXT_PUBLIC_RAG_BACKEND_ISSUE_URL ||
  'https://github.com/Iron-Mark/Hackathon-LexInsights/issues/1'

export const RAG_BACKEND_TOAST_ACTION = {
  label: 'View backend issue',
  href: RAG_BACKEND_ISSUE_URL,
}

const RAG_UNAVAILABLE_PATTERNS = [
  /\b50[234]\b/i,
  /bad gateway/i,
  /service unavailable/i,
  /gateway timeout/i,
  /timeout/i,
  /timed out/i,
  /fetch failed/i,
  /failed to fetch/i,
  /network/i,
  /cannot connect to rag api/i,
  /cannot connect to draft checker api/i,
  /upstream_timeout/i,
  /upstream_fetch_failed/i,
]

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  try {
    return JSON.stringify(error)
  } catch {
    return ''
  }
}

export function isRagBackendUnavailableError(error: unknown) {
  const message = getErrorMessage(error)

  return RAG_UNAVAILABLE_PATTERNS.some((pattern) => pattern.test(message))
}
