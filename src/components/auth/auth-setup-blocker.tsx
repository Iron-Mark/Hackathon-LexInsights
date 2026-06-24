import { AuthSetupNotice } from '@/components/auth/auth-setup-notice'
import { getClerkSetupStatus } from '@/lib/auth/clerk-config'

export function AuthSetupBlocker() {
  const clerkSetup = getClerkSetupStatus()

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 bg-[radial-gradient(circle_at_top_right,rgba(79,70,229,0.14),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] px-4 py-8 dark:bg-[#171322] dark:bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.16),transparent_34%),linear-gradient(135deg,#171322_0%,#211a35_45%,#120d1f_100%)]">
      <div className="w-full max-w-xl">
        <AuthSetupNotice missingKeys={clerkSetup.missingKeys} />
      </div>
    </main>
  )
}

