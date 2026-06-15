import { SignIn } from '@clerk/nextjs'
import { AuthSetupBlocker } from '@/components/auth/auth-setup-blocker'
import { isClerkConfigured } from '@/lib/auth/clerk-config'

export default function LoginPage() {
  if (!isClerkConfigured()) {
    return <AuthSetupBlocker />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Sign in to LexInSight</h1>
          <p className="mt-2 text-sm text-slate-600">
            Continue to your legal compliance workspace.
          </p>
        </div>
        <SignIn
          routing="path"
          path="/auth/login"
          signUpUrl="/auth/signup"
          fallbackRedirectUrl="/chat"
        />
      </div>
    </main>
  )
}
