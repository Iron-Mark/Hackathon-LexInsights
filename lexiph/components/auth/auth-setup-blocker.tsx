import Link from 'next/link'
import { CLERK_SETUP_MESSAGE, CLERK_SETUP_TITLE } from '@/lib/auth/clerk-config'

export function AuthSetupBlocker() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col justify-center px-6 py-12 text-center">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
        <h1 className="text-2xl font-semibold text-amber-950">{CLERK_SETUP_TITLE}</h1>
        <p className="mt-3 text-sm leading-6">{CLERK_SETUP_MESSAGE}</p>
        <div className="mt-5 rounded-md bg-white p-4 text-left font-mono text-xs text-amber-950">
          <div>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=</div>
          <div>CLERK_SECRET_KEY=</div>
        </div>
        <Link
          href="/"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-amber-900 px-4 text-sm font-medium text-white hover:bg-amber-800"
        >
          Back to home
        </Link>
      </div>
    </section>
  )
}

