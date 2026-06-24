'use client'

import Link from 'next/link'
import { AlertTriangle, KeyRound, ShieldCheck } from 'lucide-react'
import {
  CLERK_SETUP_MESSAGE,
  CLERK_SETUP_REQUIRED_ENV,
  CLERK_SETUP_TITLE,
  type ClerkSetupKey,
} from '@/lib/auth/clerk-config'
import { cn } from '@/lib/utils'

interface AuthSetupNoticeProps {
  compact?: boolean
  message?: string
  missingKeys?: readonly ClerkSetupKey[]
  onContinue?: () => void
  showDeveloperDetails?: boolean
  title?: string
}

export function AuthSetupNotice({
  compact = false,
  message = CLERK_SETUP_MESSAGE,
  missingKeys = CLERK_SETUP_REQUIRED_ENV,
  onContinue,
  showDeveloperDetails = true,
  title = CLERK_SETUP_TITLE,
}: AuthSetupNoticeProps) {
  const visibleMissingKeys = missingKeys.length > 0 ? missingKeys : CLERK_SETUP_REQUIRED_ENV

  return (
    <section
      className={cn(
        'w-full text-left text-slate-900 dark:text-iris-50',
        compact
          ? 'space-y-4'
          : 'rounded-xl border border-iris-200/80 bg-white/90 p-5 shadow-sm shadow-iris-950/10 ring-1 ring-white/80 sm:p-6 dark:border-iris-300/20 dark:bg-[#211a35]/80 dark:shadow-iris-950/35 dark:ring-iris-200/10'
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck
          className="mt-0.5 h-5 w-5 shrink-0 text-iris-600 dark:text-iris-200"
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-base font-extrabold leading-6 text-slate-950 dark:text-white">
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-iris-100/72">
            {message}
          </p>
        </div>
      </div>

      <div
        className={cn(
          'flex items-start gap-2 border-l-2 border-emerald-400/70 pl-3 text-sm text-emerald-900 dark:border-emerald-300/60 dark:text-emerald-100',
          compact ? '' : 'mt-4'
        )}
      >
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p className="leading-5">
          Guest mode remains available. Chats and document checks can still be explored without
          account sync.
        </p>
      </div>

      <div className={cn('flex flex-col gap-2 sm:flex-row', compact ? 'mt-4' : 'mt-5')}>
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-iris-600 px-4 text-sm font-bold text-white shadow-sm shadow-iris-950/20 transition-all hover:bg-iris-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:bg-iris-500 dark:hover:bg-iris-400 dark:focus-visible:ring-offset-[#211a35]"
          >
            Continue as guest
          </button>
        ) : (
          <Link
            href="/chat"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-iris-600 px-4 text-sm font-bold text-white shadow-sm shadow-iris-950/20 transition-all hover:bg-iris-500 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:bg-iris-500 dark:hover:bg-iris-400 dark:focus-visible:ring-offset-[#211a35]"
          >
            Continue as guest
          </Link>
        )}
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-all hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#171322]/80 dark:text-iris-100 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10 dark:focus-visible:ring-offset-[#211a35]"
        >
          Back to home
        </Link>
      </div>

      {showDeveloperDetails && (
        <details
          className={cn(
            'border-t border-iris-100/90 pt-4 dark:border-iris-300/15',
            compact ? '' : 'mt-4'
          )}
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md text-sm font-bold text-slate-800 marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:text-iris-100 dark:focus-visible:ring-offset-[#171322]">
            <KeyRound className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
            Developer setup details
          </summary>
          <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-iris-100/65">
            Add these environment variable names in your deployment settings. Values are intentionally never shown here.
          </p>
          <div className="mt-3 space-y-2">
            {visibleMissingKeys.map((key) => (
              <div
                key={key}
                className="flex min-h-9 items-center justify-between gap-3 border-b border-slate-200/80 pb-2 text-xs dark:border-iris-300/12"
              >
                <span className="font-medium text-slate-500 dark:text-iris-100/55">Missing</span>
                <code className="min-w-0 break-all text-right font-mono font-bold text-amber-800 dark:text-amber-100">
                  {key}
                </code>
              </div>
            ))}
          </div>
        </details>
      )}

      {!compact && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-iris-100/52">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Sign-in and saved account features will become available after the app is redeployed with valid Clerk keys.
        </p>
      )}
    </section>
  )
}
