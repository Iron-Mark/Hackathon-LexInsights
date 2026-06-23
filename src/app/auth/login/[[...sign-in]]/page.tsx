import { SignIn } from '@clerk/nextjs'
import Image from 'next/image'
import { AuthSetupBlocker } from '@/components/auth/auth-setup-blocker'
import { authFormAppearance } from '@/lib/auth/clerk-appearance'
import { isClerkConfigured } from '@/lib/auth/clerk-config'

export default function LoginPage() {
  if (!isClerkConfigured()) {
    return <AuthSetupBlocker />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] p-4 sm:p-6 dark:bg-neutral-950 dark:bg-[radial-gradient(circle_at_top_right,rgba(129,140,248,0.16),transparent_32%),linear-gradient(135deg,#101719_0%,#18181b_100%)]">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-950/10 ring-1 ring-white dark:border-white/10 dark:bg-white/[0.07] dark:shadow-black/30 dark:ring-white/[0.06]">
            <Image
              src="/logo/LOGO-0.5-woBG.svg"
              alt=""
              width={52}
              height={52}
              className="h-12 w-12 drop-shadow-[0_0_12px_rgba(99,102,241,0.35)]"
              priority
            />
          </span>
          <h1 className="text-2xl font-extrabold text-slate-950 dark:text-white">Sign in to LexInSight</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Continue to your legal compliance workspace.
          </p>
        </div>
        <SignIn
          routing="path"
          path="/auth/login"
          signUpUrl="/auth/signup"
          fallbackRedirectUrl="/chat"
          appearance={authFormAppearance}
        />
      </div>
    </main>
  )
}
