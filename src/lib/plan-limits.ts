/**
 * Client-safe description of the current plan tier and its request limits.
 *
 * IMPORTANT: This module is imported by client components, so it MUST NOT import
 * anything from `src/lib/server/*`. The per-minute limits below are mirrored by
 * hand from the server-side source of truth:
 *   `src/lib/server/request-guardrails.ts` -> `PUBLIC_API_THROTTLE_LIMITS`
 * Keep these numbers in sync with that file. This is a transparency surface, not
 * an enforcement mechanism: the real throttling lives on the server.
 */

export type PlanTierId = 'free' | 'education' | 'pro'

export type PlanRequestLimit = {
  /** Human-readable name of the guarded capability. */
  label: string
  /** Short description of what the limit covers. */
  description: string
  /** Maximum number of requests allowed within the window. */
  max: number
  /** Length of the rolling window, in seconds. */
  windowSeconds: number
}

export type PlanTier = {
  id: PlanTierId
  name: string
  /** One-line summary of who the tier is for. */
  tagline: string
  /** Whether this tier is the one currently in effect for every visitor. */
  current: boolean
}

/**
 * The tier every visitor is on today. There is no billing backend, so this is
 * the only active tier; Education and Pro are described as roadmap intent only.
 */
export const CURRENT_TIER: PlanTier = {
  id: 'free',
  name: 'Free',
  tagline: 'Guest-first access with generous per-minute request limits.',
  current: true,
}

/**
 * Per-minute request limits for the current (Free) tier.
 *
 * Mirrored from `PUBLIC_API_THROTTLE_LIMITS` in
 * `src/lib/server/request-guardrails.ts`. All server windows are 60_000ms.
 * Do not invent numbers here that do not exist server-side.
 */
export const FREE_TIER_LIMITS: readonly PlanRequestLimit[] = [
  {
    label: 'Research reads',
    description: 'Retrieval / RAG proxy lookups (GET /api/rag-proxy)',
    max: 120,
    windowSeconds: 60,
  },
  {
    label: 'Research queries',
    description: 'AI research + retrieval requests (POST /api/rag-proxy)',
    max: 30,
    windowSeconds: 60,
  },
  {
    label: 'Document extractions',
    description: 'Text extraction from uploads (POST /api/document-text)',
    max: 12,
    windowSeconds: 60,
  },
  {
    label: 'Analytics events',
    description: 'Product analytics beacons (POST /api/analytics)',
    max: 120,
    windowSeconds: 60,
  },
] as const

/**
 * Roadmap intent for future paid tiers. These are directional descriptions
 * only; there are no committed numbers and no enforcement behind them.
 */
export const FUTURE_TIERS: readonly {
  id: Exclude<PlanTierId, 'free'>
  name: string
  summary: string
}[] = [
  {
    id: 'education',
    name: 'Education',
    summary:
      'Keeps guest-first free entry, adds higher per-minute quotas for verified students and educators (student verification required).',
  },
  {
    id: 'pro',
    name: 'Pro',
    summary:
      'Higher quotas and priority throughput for heavy research workloads, on top of everything in Free.',
  },
] as const

/** Format a limit as a short "N / min" style string. */
export function formatPerMinute(limit: PlanRequestLimit): string {
  const unit = limit.windowSeconds === 60 ? 'min' : `${limit.windowSeconds}s`
  return `${limit.max} / ${unit}`
}
