import { type PlanDailyQuota } from '@/lib/plan-limits'

/**
 * Client-side daily quota metering (PRD P2-1).
 *
 * Counters live in `localStorage` under one key per quota id, storing the
 * local calendar day they belong to; a new day resets the count implicitly.
 * This meters per browser, matching the product's guest-first, local-first
 * storage model — there is no billing backend or server-side account quota.
 *
 * The date/storage seams exist so the logic is unit-testable in Node.
 */

const QUOTA_STORAGE_PREFIX = 'lexinsights_daily_quota_v1:'

export type QuotaStorage = Pick<Storage, 'getItem' | 'setItem'>

export type DailyQuotaUsage = {
  quota: PlanDailyQuota
  /** Successful uses recorded today (clamped to >= 0). */
  used: number
  /** Uses remaining today (clamped to >= 0). */
  remaining: number
  /** True when `used >= maxPerDay`. */
  exhausted: boolean
  /** Local calendar day the counter belongs to, as YYYY-MM-DD. */
  day: string
}

type StoredQuotaCount = {
  day: string
  used: number
}

/** Local calendar day (not UTC): quotas reset at the user's midnight. */
export function localCalendarDay(now: Date = new Date()): string {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultStorage(): QuotaStorage | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    // Storage access can throw in privacy modes; treat as unmetered.
    return null
  }
}

function readStoredCount(storage: QuotaStorage, quotaId: string): StoredQuotaCount | null {
  try {
    const raw = storage.getItem(QUOTA_STORAGE_PREFIX + quotaId)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredQuotaCount>

    if (typeof parsed.day !== 'string' || typeof parsed.used !== 'number' || !Number.isFinite(parsed.used)) {
      return null
    }

    return { day: parsed.day, used: Math.max(0, Math.floor(parsed.used)) }
  } catch {
    return null
  }
}

export function getDailyQuotaUsage(
  quota: PlanDailyQuota,
  storage: QuotaStorage | null = defaultStorage(),
  now: Date = new Date()
): DailyQuotaUsage {
  const day = localCalendarDay(now)
  const stored = storage ? readStoredCount(storage, quota.id) : null
  const used = stored && stored.day === day ? Math.min(stored.used, quota.maxPerDay) : 0

  return {
    quota,
    used,
    remaining: Math.max(0, quota.maxPerDay - used),
    exhausted: used >= quota.maxPerDay,
    day,
  }
}

/**
 * Record one successful use of the quota and return the updated usage.
 * A storage failure never blocks the user's action — metering degrades open.
 */
export function recordDailyQuotaUse(
  quota: PlanDailyQuota,
  storage: QuotaStorage | null = defaultStorage(),
  now: Date = new Date()
): DailyQuotaUsage {
  const current = getDailyQuotaUsage(quota, storage, now)
  const used = Math.min(quota.maxPerDay, current.used + 1)

  if (storage) {
    try {
      storage.setItem(
        QUOTA_STORAGE_PREFIX + quota.id,
        JSON.stringify({ day: current.day, used } satisfies StoredQuotaCount)
      )
    } catch {
      // Quota persistence is best-effort.
    }
  }

  return {
    quota,
    used,
    remaining: Math.max(0, quota.maxPerDay - used),
    exhausted: used >= quota.maxPerDay,
    day: current.day,
  }
}
