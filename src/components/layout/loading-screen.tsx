import Image from 'next/image'

interface LoadingScreenProps {
  message?: string
}

const promptRows = [
  { tone: 'iris', width: 'w-11/12' },
  { tone: 'emerald', width: 'w-10/12' },
  { tone: 'amber', width: 'w-9/12' },
  { tone: 'sky', width: 'w-10/12' },
] as const

const toneClasses = {
  iris: 'border-[#8A82DC]/35 bg-[#FBFAFF]/78 dark:border-iris-300/12 dark:bg-iris-300/8',
  emerald: 'border-emerald-500/30 bg-emerald-50/45 dark:border-emerald-300/12 dark:bg-emerald-300/8',
  amber: 'border-amber-500/32 bg-amber-50/45 dark:border-amber-300/12 dark:bg-amber-300/8',
  sky: 'border-sky-500/30 bg-sky-50/45 dark:border-sky-300/12 dark:bg-sky-300/8',
} as const

export function LoadingScreen({ message = 'Preparing LexInsights' }: LoadingScreenProps) {
  return (
    <main
      className="chat-viewport-surface flex min-h-screen overflow-hidden supports-[height:100dvh]:min-h-dvh"
      aria-busy="true"
      aria-live="polite"
    >
      <aside className="hidden w-16 shrink-0 border-r border-[#8A82DC]/50 bg-[#F4F2FF]/70 dark:border-iris-300/10 dark:bg-[#171322]/95 sm:flex sm:flex-col sm:items-center sm:py-4">
        <div className="h-9 w-9 rounded-xl border border-[#8A82DC]/45 bg-[#FBFAFF]/80 dark:border-iris-300/15 dark:bg-iris-300/10" />
        <div className="mt-8 space-y-5">
          <div className="h-5 w-5 rounded-md bg-iris-500/18 dark:bg-iris-200/16" />
          <div className="h-5 w-5 rounded-md bg-iris-500/14 dark:bg-iris-200/12" />
        </div>
        <div className="mt-auto space-y-4">
          <div className="h-5 w-5 rounded-md bg-iris-500/14 dark:bg-iris-200/12" />
          <div className="h-9 w-9 rounded-full bg-[#171322]/85 dark:bg-[#0d0a14]" />
        </div>
      </aside>

      <section className="hidden w-[17rem] shrink-0 border-r border-[#8A82DC]/40 bg-[#F8F6FF]/74 dark:border-iris-300/10 dark:bg-[#171322]/72 lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-[#8A82DC]/30 px-4 dark:border-iris-300/10">
          <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#8A82DC]/50 bg-[#FBFAFF]/85 dark:border-iris-300/15 dark:bg-iris-300/10">
            <Image src="/logo/LOGO-0.5-NOBG.png" alt="" fill sizes="40px" className="object-contain p-1.5" priority />
          </div>
          <div className="min-w-0 flex-1">
            <div className="h-4 w-28 rounded bg-slate-900/15 dark:bg-white/16" />
            <div className="mt-1.5 h-2.5 w-32 rounded bg-slate-600/14 dark:bg-white/10" />
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="rounded-lg border border-[#8A82DC]/35 bg-[#FBFAFF]/70 p-4 dark:border-iris-300/12 dark:bg-[#241f32]/58">
            <div className="h-4 w-28 rounded bg-slate-900/12 dark:bg-white/14" />
            <div className="mt-3 h-3 w-40 rounded bg-slate-700/12 dark:bg-white/10" />
            <div className="mt-2 h-3 w-32 rounded bg-slate-700/10 dark:bg-white/8" />
            <div className="mt-5 h-10 rounded-lg bg-iris-600/20 dark:bg-iris-300/12" />
          </div>
          <div className="rounded-lg border border-dashed border-[#8A82DC]/35 p-4 dark:border-iris-300/12">
            <div className="h-3 w-24 rounded bg-slate-600/14 dark:bg-white/10" />
            <div className="mt-4 h-3 w-44 rounded bg-slate-600/10 dark:bg-white/8" />
            <div className="mt-2 h-3 w-36 rounded bg-slate-600/10 dark:bg-white/8" />
          </div>
        </div>
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-center border-b border-[#8A82DC]/35 bg-[#F8F6FF]/70 px-4 dark:border-iris-300/10 dark:bg-[#171322]/80">
          <div className="text-center">
            <p className="text-base font-extrabold leading-5 text-slate-950 dark:text-white">LexInsights</p>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Legal compliance assistant</p>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-5 pb-6 pt-12 sm:px-8 sm:pt-16">
          <div className="mx-auto w-full max-w-xl text-center">
            <div className="mx-auto h-7 w-64 rounded-lg bg-slate-950/12 dark:bg-white/13" />
            <div className="mx-auto mt-3 h-4 w-72 max-w-full rounded bg-slate-700/12 dark:bg-white/9" />
          </div>

          <div className="mx-auto mt-10 grid w-full max-w-3xl gap-3">
            {promptRows.map((row) => (
              <div
                key={row.tone}
                className={`min-h-16 rounded-lg border px-3 py-3 shadow-[0_10px_24px_rgba(63,51,189,0.025)] dark:shadow-none ${toneClasses[row.tone]}`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white/72 ring-1 ring-[#8A82DC]/20 dark:bg-white/7 dark:ring-white/8" />
                  <div className="min-w-0 flex-1">
                    <div className="h-3 w-28 rounded bg-slate-600/18 dark:bg-white/12" />
                    <div className={`mt-2 h-4 rounded bg-slate-950/14 dark:bg-white/16 ${row.width}`} />
                  </div>
                  <div className="h-5 w-5 rounded bg-slate-700/14 dark:bg-white/12" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto">
            <div className="mx-auto w-full max-w-4xl rounded-xl border border-[#8A82DC]/45 bg-[#FBFAFF]/78 shadow-lg shadow-iris-950/8 dark:border-iris-300/12 dark:bg-[#241f32]/70 dark:shadow-iris-950/25">
              <div className="flex min-h-14 items-center border-b border-[#8A82DC]/24 px-3 dark:border-iris-300/10">
                <div className="h-10 w-28 rounded-lg bg-[#EFECFF]/80 ring-1 ring-[#8A82DC]/25 dark:bg-iris-300/10 dark:ring-iris-300/12" />
              </div>
              <div className="flex min-h-16 items-center gap-3 px-4">
                <div className="h-4 flex-1 rounded bg-slate-600/12 dark:bg-white/9" />
                <div className="h-11 w-11 rounded-lg bg-iris-600/50 dark:bg-iris-300/20" />
              </div>
            </div>
            <div className="mx-auto mt-4 h-1 w-full max-w-64 overflow-hidden rounded-full bg-[#D8D3F6] dark:bg-iris-300/12">
              <div className="h-full w-1/2 rounded-full bg-iris-600 motion-safe:animate-[loading-progress_1.4s_ease-in-out_infinite] dark:bg-iris-300" />
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-400">{message}</p>
          </div>
        </div>
      </section>
    </main>
  )
}
