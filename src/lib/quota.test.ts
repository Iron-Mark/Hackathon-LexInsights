import { describe, expect, it } from 'vitest'

import type { PlanDailyQuota } from '@/lib/plan-limits'
import { getDailyQuotaUsage, localCalendarDay, recordDailyQuotaUse, type QuotaStorage } from '@/lib/quota'

const TEST_QUOTA: PlanDailyQuota = {
  id: 'test-analyses',
  label: 'Test analyses',
  description: 'Test quota.',
  maxPerDay: 3,
}

function memoryStorage(): QuotaStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('daily quota metering (PRD P2-1)', () => {
  it('starts at zero and counts successful uses up to the cap', () => {
    const storage = memoryStorage()
    const now = new Date(2026, 6, 30, 10, 0, 0)

    expect(getDailyQuotaUsage(TEST_QUOTA, storage, now)).toMatchObject({
      used: 0,
      remaining: 3,
      exhausted: false,
    })

    recordDailyQuotaUse(TEST_QUOTA, storage, now)
    recordDailyQuotaUse(TEST_QUOTA, storage, now)
    const third = recordDailyQuotaUse(TEST_QUOTA, storage, now)

    expect(third).toMatchObject({ used: 3, remaining: 0, exhausted: true })

    // Recording past the cap clamps rather than overflowing.
    const fourth = recordDailyQuotaUse(TEST_QUOTA, storage, now)
    expect(fourth).toMatchObject({ used: 3, remaining: 0, exhausted: true })
  })

  it('resets implicitly on the next local calendar day', () => {
    const storage = memoryStorage()
    const today = new Date(2026, 6, 30, 23, 59, 0)
    const tomorrow = new Date(2026, 6, 31, 0, 1, 0)

    recordDailyQuotaUse(TEST_QUOTA, storage, today)
    recordDailyQuotaUse(TEST_QUOTA, storage, today)
    expect(getDailyQuotaUsage(TEST_QUOTA, storage, today).used).toBe(2)

    expect(getDailyQuotaUsage(TEST_QUOTA, storage, tomorrow)).toMatchObject({
      used: 0,
      remaining: 3,
      exhausted: false,
      day: localCalendarDay(tomorrow),
    })
  })

  it('treats corrupted storage as empty and degrades open without storage', () => {
    const storage = memoryStorage()
    storage.data.set('lexinsights_daily_quota_v1:test-analyses', '{not json')

    expect(getDailyQuotaUsage(TEST_QUOTA, storage).used).toBe(0)

    // No storage at all (SSR / blocked privacy mode): metering never throws
    // and never blocks the action.
    expect(getDailyQuotaUsage(TEST_QUOTA, null).exhausted).toBe(false)
    expect(recordDailyQuotaUse(TEST_QUOTA, null).used).toBe(1)
  })

  it('uses local time, not UTC, for the calendar day', () => {
    // 2026-07-30T23:30 local is 2026-07-30 regardless of what UTC says.
    const lateEvening = new Date(2026, 6, 30, 23, 30, 0)
    expect(localCalendarDay(lateEvening)).toBe('2026-07-30')
  })
})
