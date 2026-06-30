import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Github, Sparkles } from 'lucide-react'

import {
  buildBreadcrumbStructuredData,
  buildProjectStructuredData,
  CURRENT_APP_URL,
  LEGACY_SHOWCASE_URL,
  PHILIPPINE_COMPLIANCE_TOPICS,
  PORTFOLIO_CASE_STUDY_URL,
  PORTFOLIO_URL,
  REPOSITORY_URL,
  SITE_DESCRIPTION,
  SITE_OG_IMAGE,
} from '@/lib/seo'

const description =
  'About LexInsights, a Philippine legal compliance assistant connected to its current app, public repository, Mark Siazon portfolio, and legacy showcase.'

const sourceFamilies = [
  'Lawphil and Official Gazette primary law references',
  'Supreme Court and court-administration materials',
  'National Privacy Commission and data privacy guidance',
  'Finance, tax, AML, corporate, labor, and consumer compliance sources',
]

const projectLinks = [
  { label: 'Current app', href: CURRENT_APP_URL },
  { label: 'Mark Siazon portfolio', href: PORTFOLIO_URL },
  { label: 'LexInsights case study', href: PORTFOLIO_CASE_STUDY_URL },
  { label: 'Legacy showcase', href: LEGACY_SHOWCASE_URL },
  { label: 'GitHub repository', href: REPOSITORY_URL },
]

export const metadata: Metadata = {
  title: {
    absolute: 'About LexInsights',
  },
  description,
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: 'About LexInsights',
    description,
    url: '/about',
    type: 'website',
    images: [SITE_OG_IMAGE],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About LexInsights',
    description,
    images: [SITE_OG_IMAGE],
  },
}

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProjectStructuredData()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            buildBreadcrumbStructuredData([
              { name: 'LexInsights', path: '/' },
              { name: 'About', path: '/about' },
            ])
          ),
        }}
      />
      <main className="min-h-dvh bg-[linear-gradient(180deg,#f7f6ff_0%,#ffffff_54%,#f8fafc_100%)] px-4 py-6 text-slate-950 dark:bg-[linear-gradient(180deg,#211a35_0%,#171322_55%,#120d1f_100%)] dark:text-slate-100 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/chat"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-200 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to chat
            </Link>
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold text-iris-700 transition-colors hover:bg-iris-50 hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:text-iris-200 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
            >
              <Github className="h-4 w-4" aria-hidden="true" />
              Repository
            </a>
          </div>

          <header className="border-b border-slate-200 pb-8 dark:border-iris-300/15">
            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
              Project profile
            </p>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-slate-950 dark:text-white sm:text-4xl">
              About LexInsights
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">
              {SITE_DESCRIPTION}
            </p>
          </header>

          <section className="grid gap-6 border-b border-slate-200 py-8 dark:border-iris-300/15 lg:grid-cols-[14rem_1fr]">
            <h2 className="text-sm font-extrabold uppercase text-slate-500 dark:text-slate-400">
              What it supports
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                'Philippine legal chat and compliance research',
                'Document review for text, Markdown, PDF, and Word drafts',
                'Local providerless RAG research and citation support',
                'Compliance reports with source-support signals',
              ].map((item) => (
                <div key={item} className="flex gap-3">
                  <Sparkles className="mt-1 h-4 w-4 shrink-0 text-iris-600 dark:text-iris-200" aria-hidden="true" />
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{item}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 border-b border-slate-200 py-8 dark:border-iris-300/15 lg:grid-cols-[14rem_1fr]">
            <h2 className="text-sm font-extrabold uppercase text-slate-500 dark:text-slate-400">
              Philippine focus
            </h2>
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {PHILIPPINE_COMPLIANCE_TOPICS.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-iris-100 bg-white px-3 py-1 text-xs font-bold text-iris-700 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-iris-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {sourceFamilies.map((source) => (
                  <p key={source} className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {source}
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 py-8 lg:grid-cols-[14rem_1fr]">
            <h2 className="text-sm font-extrabold uppercase text-slate-500 dark:text-slate-400">
              Public proof
            </h2>
            <div className="divide-y divide-slate-200 dark:divide-iris-300/15">
              {projectLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-12 items-center justify-between gap-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:text-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:text-slate-200 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#171322]"
                >
                  <span>{link.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-iris-600 dark:text-slate-500 dark:group-hover:text-iris-200" aria-hidden="true" />
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}
