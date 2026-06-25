import Image from 'next/image'
import { WifiOff } from 'lucide-react'

import { OfflineActions } from '@/components/pwa/offline-actions'

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,rgba(224,222,250,0.72)_0%,rgba(248,250,252,0.94)_17rem,#f8fafc_100%)] px-5 py-[calc(env(safe-area-inset-top)+2rem)] pb-[calc(env(safe-area-inset-bottom)+2rem)] supports-[min-height:100dvh]:min-h-dvh dark:bg-[linear-gradient(135deg,#171322_0%,#211a35_46%,#120d1f_100%)]">
      <section className="flex w-full max-w-md flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-iris-100 bg-white/90 shadow-lg shadow-iris-950/10 ring-1 ring-white dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-iris-950/30 dark:ring-iris-100/10">
          <Image
            src="/logo/LOGO-0.5-woBG.svg"
            alt="LexInSight"
            width={56}
            height={56}
            priority
          />
        </div>

        <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-iris-100 bg-white/80 px-3 py-1.5 text-xs font-bold uppercase tracking-normal text-iris-700 shadow-sm shadow-iris-950/5 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-iris-100">
          <WifiOff className="h-4 w-4" aria-hidden="true" />
          Offline mode
        </div>

        <h1 className="mt-4 text-3xl font-bold leading-tight text-slate-950 dark:text-slate-50">
          You are offline
        </h1>
        <p className="mt-3 max-w-sm text-base leading-7 text-slate-600 dark:text-slate-300">
          Reconnect to continue legal chat, document review, and compliance checks. Recently opened pages may still be available from your device.
        </p>

        <OfflineActions />
      </section>
    </main>
  )
}
