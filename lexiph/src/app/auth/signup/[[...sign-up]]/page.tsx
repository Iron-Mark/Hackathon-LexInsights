import { SignUp } from '@clerk/nextjs'
import { AuthSetupBlocker } from '@/components/auth/auth-setup-blocker'
import { isClerkConfigured } from '@/lib/auth/clerk-config'

export default function SignupPage() {
  if (!isClerkConfigured()) {
    return <AuthSetupBlocker />
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 sm:p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-950">Create your LexInSight account</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign up to save chats, documents, and compliance work.
          </p>
        </div>
        <SignUp
          routing="path"
          path="/auth/signup"
          signInUrl="/auth/login"
          fallbackRedirectUrl="/chat"
        />
      </div>
    </main>
  )
}
