'use client'

import { Gauge, Sparkles } from 'lucide-react'
import {
  CURRENT_TIER,
  FREE_TIER_LIMITS,
  FUTURE_TIERS,
  formatPerMinute,
} from '@/lib/plan-limits'

/**
 * Read-only transparency surface for the current plan tier and its per-minute
 * request limits. There is no billing backend: the numbers here mirror the
 * server-side throttle configuration so users can see the quotas that apply.
 */
export function PlanLimitsPanel() {
  return (
    <section
      aria-labelledby="plan-limits-heading"
      className="space-y-3 border-t border-slate-200 pt-4 dark:border-iris-300/15"
    >
      <div className="flex items-center justify-between gap-3">
        <h3
          id="plan-limits-heading"
          className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-100"
        >
          <Gauge className="h-4 w-4 text-iris-600 dark:text-iris-200" />
          Plan &amp; request limits
        </h3>
        <span className="inline-flex items-center rounded-full bg-iris-100 px-2.5 py-0.5 text-xs font-medium text-iris-700 dark:bg-iris-400/15 dark:text-iris-200">
          {CURRENT_TIER.name} tier
        </span>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">{CURRENT_TIER.tagline}</p>

      <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#241f32]">
        <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          Per-minute request limits
        </p>
        <ul className="space-y-2">
          {FREE_TIER_LIMITS.map((limit) => (
            <li key={limit.label} className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-slate-950 dark:text-slate-100">{limit.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{limit.description}</p>
              </div>
              <span className="mt-0.5 flex-shrink-0 whitespace-nowrap font-mono text-xs font-medium text-iris-700 dark:text-iris-200">
                {formatPerMinute(limit)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 dark:bg-[#241f32]">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          <Sparkles className="h-3.5 w-3.5" />
          What Education &amp; Pro would add
        </p>
        <ul className="space-y-1.5">
          {FUTURE_TIERS.map((tier) => (
            <li key={tier.id} className="text-xs text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-950 dark:text-slate-100">{tier.name}:</span>{' '}
              {tier.summary}
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Tiers are directional only. Enforcement and student verification are not yet available.
        </p>
      </div>
    </section>
  )
}
