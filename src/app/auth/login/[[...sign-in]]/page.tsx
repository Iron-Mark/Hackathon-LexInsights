import { SignIn } from '@clerk/nextjs'
import type { Metadata } from 'next'
import Image from 'next/image'
import { AuthErrorBoundary } from '@/components/auth/auth-error-boundary'
import { AuthSetupBlocker } from '@/components/auth/auth-setup-blocker'
import { AuthSetupNotice } from '@/components/auth/auth-setup-notice'
import { authFormAppearance } from '@/lib/auth/clerk-appearance'
import { isClerkConfigured } from '@/lib/auth/clerk-config'
import { NO_INDEX_ROBOTS } from '@/lib/seo'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to LexInsights.',
  robots: NO_INDEX_ROBOTS,
}

export default function LoginPage() {
  if (!isClerkConfigured()) {
    return <AuthSetupBlocker />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] p-4 sm:p-6 dark:bg-[#171322] dark:bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.16),transparent_34%),linear-gradient(135deg,#171322_0%,#211a35_45%,#120d1f_100%)]">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10 ring-1 ring-white dark:border-iris-300/15 dark:bg-iris-300/10 dark:shadow-iris-950/30 dark:ring-iris-100/10">
            <Image
              src="/logo/LOGO-0.5-woBG.svg"
              alt=""
              width={52}
              height={52}
              className="h-12 w-12 drop-shadow-[0_0_12px_rgba(99,102,241,0.35)]"
              priority
            />
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">Sign in to LexInsights</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Continue to your legal compliance workspace.
          </p>
        </div>
        <AuthErrorBoundary
          fallback={
            <AuthSetupNotice
              message="The sign-in service could not load. You can keep using LexInsights in guest mode while the auth provider is checked."
              showDeveloperDetails={false}
              title="Sign-in could not load"
            />
          }
        >
          <SignIn
            routing="path"
            path="/auth/login"
            signUpUrl="/auth/signup"
            fallbackRedirectUrl="/chat"
            appearance={authFormAppearance}
          />
        </AuthErrorBoundary>
      </div>
    </main>
  )
}
