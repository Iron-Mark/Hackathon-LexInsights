import { ArrowLeft, BookOpen, FileText } from 'lucide-react'
import Link from 'next/link'
import { TermsPrivacyPanel } from './terms-privacy-panel'

interface LegalNoticePageProps {
  title?: string
  eyebrow?: string
  description?: string
}

export function LegalNoticePage({
  title = 'Terms & Privacy',
  eyebrow = 'Last updated July 1, 2026',
  description = 'Public terms for using LexInsights and a Philippine privacy notice for account, chat, document review, and legal research workflows.',
}: LegalNoticePageProps) {
  return (
    <main className="min-h-dvh bg-[linear-gradient(180deg,#F0EDFF_0%,#F8F6FF_54%,#F4F2FF_100%)] px-4 py-6 text-slate-950 dark:bg-[linear-gradient(180deg,#211a35_0%,#171322_55%,#120d1f_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/chat"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#8A82DC] bg-[#FBFAFF] px-4 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-200 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to chat
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-iris-800 transition-colors hover:bg-[#EFECFF] hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:text-iris-200 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
          >
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            LexInsights
          </Link>
        </div>

        <header className="mb-8 grid gap-6 border-b border-[#8A82DC]/70 pb-8 dark:border-iris-300/15 lg:grid-cols-[1fr_14rem]">
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EFECFF] text-iris-800 dark:bg-iris-400/15 dark:text-iris-200">
              <FileText className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-400">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950 dark:text-white sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">
                {description}
              </p>
            </div>
          </div>

          <nav
            className="border-l border-[#8A82DC]/70 pl-4 text-sm dark:border-iris-300/15"
            aria-label="Legal notice sections"
          >
            <p className="text-xs font-bold uppercase text-slate-700 dark:text-slate-400">Sections</p>
            <div className="mt-3 grid gap-2">
              <a className="font-bold text-slate-700 hover:text-iris-700 dark:text-slate-200 dark:hover:text-iris-200" href="#terms-heading">
                01 Terms
              </a>
              <a className="font-bold text-slate-700 hover:text-iris-700 dark:text-slate-200 dark:hover:text-iris-200" href="#privacy-heading">
                02 Privacy
              </a>
            </div>
          </nav>
        </header>

        <TermsPrivacyPanel showHighlights={false} showIntro={false} />
      </div>
    </main>
  )
}
