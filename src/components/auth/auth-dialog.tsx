'use client'

import { SignIn, SignUp } from '@clerk/nextjs'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { authFormAppearance } from '@/lib/auth/clerk-appearance'
import { CLERK_SETUP_MESSAGE, CLERK_SETUP_TITLE } from '@/lib/auth/clerk-config'
import { cn } from '@/lib/utils'

export type AuthDialogMode = 'sign-in' | 'sign-up'

interface AuthDialogProps {
  clerkConfigured: boolean
  mode: AuthDialogMode
  open: boolean
  onModeChange: (mode: AuthDialogMode) => void
  onOpenChange: (open: boolean) => void
}

const authDialogAppearance = {
  ...authFormAppearance,
  elements: {
    ...authFormAppearance.elements,
    rootBox: 'w-full',
    cardBox: 'w-full shadow-none',
    card: 'w-full border-0 bg-transparent shadow-none',
    headerTitle: 'sr-only',
    headerSubtitle: 'sr-only',
    footer: 'text-sm',
  },
}

const authHashToMode: Record<string, AuthDialogMode> = {
  '#lexinsight-sign-in': 'sign-in',
  '#lexinsight-sign-up': 'sign-up',
}

function clearAuthHash() {
  if (typeof window === 'undefined') return

  if (window.location.hash in authHashToMode) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }
}

export function AuthDialog({ clerkConfigured, mode, open, onModeChange, onOpenChange }: AuthDialogProps) {
  const pathname = usePathname()
  const fallbackRedirectUrl = pathname?.startsWith('/chat') ? pathname : '/chat'

  useEffect(() => {
    if (!open || typeof window === 'undefined') return

    const syncModeFromHash = () => {
      const nextMode = authHashToMode[window.location.hash]
      if (nextMode) {
        onModeChange(nextMode)
      }
    }

    syncModeFromHash()
    window.addEventListener('hashchange', syncModeFromHash)

    return () => window.removeEventListener('hashchange', syncModeFromHash)
  }, [onModeChange, open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      clearAuthHash()
    }

    onOpenChange(nextOpen)
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="auth-dialog-overlay"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-black/75"
        />
        <DialogPrimitive.Content
          data-slot="auth-dialog-content"
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[25rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-3 shadow-2xl shadow-slate-950/25 outline-none backdrop-blur-xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-white/10 dark:bg-neutral-950/95 dark:shadow-black/50"
          aria-describedby="lexinsight-auth-dialog-description"
        >
          <DialogPrimitive.Title className="sr-only">
            {mode === 'sign-in' ? 'Sign in to LexInSight' : 'Create your LexInSight account'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description id="lexinsight-auth-dialog-description" className="sr-only">
            Sign in or create an account without leaving the current chat.
          </DialogPrimitive.Description>

          {clerkConfigured && (
            <div className="mb-3 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-white/10 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => onModeChange('sign-in')}
                className={cn(
                  'h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950',
                  mode === 'sign-in'
                    ? 'bg-white text-slate-950 shadow-sm shadow-slate-900/10 dark:bg-neutral-900 dark:text-white dark:shadow-black/30'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => onModeChange('sign-up')}
                className={cn(
                  'h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950',
                  mode === 'sign-up'
                    ? 'bg-white text-slate-950 shadow-sm shadow-slate-900/10 dark:bg-neutral-900 dark:text-white dark:shadow-black/30'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
                )}
              >
                Sign up
              </button>
            </div>
          )}

          <div className="flex justify-center overflow-hidden rounded-xl">
            {!clerkConfigured ? (
              <div className="w-full rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-300/15 dark:text-amber-200">
                    <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-base font-bold leading-6">{CLERK_SETUP_TITLE}</h2>
                    <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/85">
                      {CLERK_SETUP_MESSAGE}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-amber-200 bg-white/80 p-3 font-mono text-xs leading-5 text-amber-950 dark:border-amber-300/20 dark:bg-black/20 dark:text-amber-100">
                  <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=</div>
                  <div>CLERK_SECRET_KEY=</div>
                </div>
              </div>
            ) : mode === 'sign-in' ? (
              <SignIn
                key="sign-in"
                routing="hash"
                signUpUrl="#lexinsight-sign-up"
                fallbackRedirectUrl={fallbackRedirectUrl}
                signUpFallbackRedirectUrl={fallbackRedirectUrl}
                appearance={authDialogAppearance}
              />
            ) : (
              <SignUp
                key="sign-up"
                routing="hash"
                signInUrl="#lexinsight-sign-in"
                fallbackRedirectUrl={fallbackRedirectUrl}
                signInFallbackRedirectUrl={fallbackRedirectUrl}
                appearance={authDialogAppearance}
              />
            )}
          </div>

          <DialogPrimitive.Close
            className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition-all duration-200 hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-neutral-900/90 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white dark:focus-visible:ring-offset-neutral-950"
            aria-label="Close auth dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
