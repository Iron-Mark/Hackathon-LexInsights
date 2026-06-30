'use client'

import { SignIn, SignUp } from '@clerk/nextjs'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import Image from 'next/image'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { AuthSetupNotice } from '@/components/auth/auth-setup-notice'
import { authFormAppearance } from '@/lib/auth/clerk-appearance'
import type { ClerkSetupKey } from '@/lib/auth/clerk-config'
import { cn } from '@/lib/utils'

export type AuthDialogMode = 'sign-in' | 'sign-up'

interface AuthDialogProps {
  clerkConfigured: boolean
  missingClerkKeys?: readonly ClerkSetupKey[]
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
    cardBox: 'w-full !shadow-none',
    card: 'w-full !border-0 !bg-transparent !shadow-none',
    headerTitle: 'sr-only',
    headerSubtitle: 'sr-only',
    logoBox: 'hidden',
    logoImage: 'hidden',
    footer: 'text-sm',
  },
}

const authHashToMode: Record<string, AuthDialogMode> = {
  '#lexinsights-sign-in': 'sign-in',
  '#lexinsights-sign-up': 'sign-up',
}

function clearAuthHash() {
  if (typeof window === 'undefined') return

  if (window.location.hash in authHashToMode) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
  }
}

export function AuthDialog({
  clerkConfigured,
  missingClerkKeys = [],
  mode,
  open,
  onModeChange,
  onOpenChange,
}: AuthDialogProps) {
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
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 dark:bg-[#0d0a16]/78"
        />
        <DialogPrimitive.Content
          data-slot="auth-dialog-content"
          className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[25rem] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-3 shadow-2xl shadow-slate-950/25 outline-none backdrop-blur-xl duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 dark:border-iris-300/15 dark:bg-[#171322]/95 dark:shadow-iris-950/50"
          aria-describedby="lexinsights-auth-dialog-description"
        >
          <DialogPrimitive.Title className="sr-only">
            {mode === 'sign-in' ? 'Sign in to LexInsights' : 'Create your LexInsights account'}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description id="lexinsights-auth-dialog-description" className="sr-only">
            Sign in or create an account without leaving the current chat.
          </DialogPrimitive.Description>

          <div className="mb-4 flex items-start gap-3 pr-10">
            <Image
              src="/logo/LOGO-0.5-woBG.svg"
              alt=""
              width={44}
              height={44}
              className="mt-0.5 h-11 w-11 shrink-0 drop-shadow-[0_0_12px_rgba(99,102,241,0.32)]"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-lg font-extrabold leading-tight text-slate-950 dark:text-white">
                LexInsights
              </p>
              <p className="mt-1 max-w-[18rem] text-sm font-medium leading-5 text-slate-600 dark:text-slate-300">
                {mode === 'sign-in'
                  ? 'Continue to your legal compliance workspace.'
                  : 'Save chats, documents, and compliance work.'}
              </p>
            </div>
          </div>

          {clerkConfigured && (
            <div className="mb-3 flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-iris-300/15 dark:bg-[#241f32]/65">
              <button
                type="button"
                onClick={() => onModeChange('sign-in')}
                className={cn(
                  'h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]',
                  mode === 'sign-in'
                    ? 'bg-white text-slate-950 shadow-sm shadow-slate-900/10 dark:bg-[#241f32] dark:text-white dark:shadow-iris-950/30'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-iris-300/12 dark:hover:text-white'
                )}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => onModeChange('sign-up')}
                className={cn(
                  'h-10 flex-1 cursor-pointer rounded-lg px-3 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]',
                  mode === 'sign-up'
                    ? 'bg-white text-slate-950 shadow-sm shadow-slate-900/10 dark:bg-[#241f32] dark:text-white dark:shadow-iris-950/30'
                    : 'text-slate-600 hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-iris-300/12 dark:hover:text-white'
                )}
              >
                Sign up
              </button>
            </div>
          )}

          <div className="flex justify-center overflow-hidden">
            {!clerkConfigured ? (
              <AuthSetupNotice
                compact
                missingKeys={missingClerkKeys}
                onContinue={() => handleOpenChange(false)}
              />
            ) : mode === 'sign-in' ? (
              <AuthErrorBoundary
                fallback={
                  <AuthSetupNotice
                    compact
                    message="The sign-in service could not load. You can keep using LexInsights in guest mode while the auth provider is checked."
                    onContinue={() => handleOpenChange(false)}
                    showDeveloperDetails={false}
                    title="Sign-in could not load"
                  />
                }
              >
                <SignIn
                  key="sign-in"
                  routing="hash"
                  signUpUrl="#lexinsights-sign-up"
                  fallbackRedirectUrl={fallbackRedirectUrl}
                  signUpFallbackRedirectUrl={fallbackRedirectUrl}
                  appearance={authDialogAppearance}
                />
              </AuthErrorBoundary>
            ) : (
              <AuthErrorBoundary
                fallback={
                  <AuthSetupNotice
                    compact
                    message="The sign-up service could not load. You can keep using LexInsights in guest mode while the auth provider is checked."
                    onContinue={() => handleOpenChange(false)}
                    showDeveloperDetails={false}
                    title="Sign-up could not load"
                  />
                }
              >
                <SignUp
                  key="sign-up"
                  routing="hash"
                  signInUrl="#lexinsights-sign-in"
                  fallbackRedirectUrl={fallbackRedirectUrl}
                  signInFallbackRedirectUrl={fallbackRedirectUrl}
                  appearance={authDialogAppearance}
                />
              </AuthErrorBoundary>
            )}
          </div>

          <DialogPrimitive.Close
            className="absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white/90 text-slate-500 shadow-sm transition-all duration-200 hover:border-slate-300 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32]/90 dark:text-slate-300 dark:hover:border-iris-300/30 dark:hover:text-white dark:focus-visible:ring-offset-[#171322]"
            aria-label="Close auth dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
