import Image from 'next/image'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <Image
          src="/logo/LOGO-0.5-woBG.svg"
          alt="LexInSight"
          width={72}
          height={72}
          priority
        />
        <h1 className="mt-6 text-2xl font-semibold text-slate-950">You are offline</h1>
        <p className="mt-3 text-sm text-slate-600">
          Reconnect to continue using chat, documents, and compliance checks.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Return home</Link>
        </Button>
      </section>
    </main>
  )
}
