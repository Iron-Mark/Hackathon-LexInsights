'use client'

import type { LucideIcon } from 'lucide-react'
import { BrainCircuit, ChevronDown, ExternalLink, FileCheck2, GitBranch, Images, Palette, ServerCog, Sparkles, UsersRound, Wrench } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DEMO_VIDEO_URL,
  LEGACY_SHOWCASE_URL,
  PORTFOLIO_CASE_STUDY_URL,
  REPOSITORY_URL,
} from '@/lib/seo'
import { EventGallery } from '@/components/about/event-gallery'

interface AttributionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AUTHORS = [
  {
    name: 'Jam Emmanuel Villarosa',
    role: 'AI Engineer & Lead Developer',
    href: 'https://ph.linkedin.com/in/jamthedev2004',
    Icon: BrainCircuit,
  },
  {
    name: 'Ken Patrick Garcia',
    role: 'Full stack AI engineer',
    href: 'https://ph.linkedin.com/in/ken-patrick-garcia',
    Icon: ServerCog,
  },
  {
    name: 'Mark Siazon',
    role: 'UI/UX Product Design & Front-end Developer',
    href: 'https://ph.linkedin.com/in/mark-siazon',
    Icon: Palette,
  },
  {
    name: 'Ashlyn Jam Torres',
    role: 'QA & Documentation',
    href: 'https://ph.linkedin.com/in/ashlyn-torres-120354329',
    Icon: FileCheck2,
  },
] satisfies Array<{
  name: string
  role: string
  href: string
  Icon: LucideIcon
}>

const PROJECT_FACTS = [
  {
    label: 'Built for',
    value: 'DevKada CodeKada 2025',
    href: 'https://www.facebook.com/events/kmc-armstrong-corporate-center/codekada-the-innovation-hackathon/1122064766115595/',
  },
  { label: 'Product focus', value: 'Philippine legal research, RAG, and compliance review workflows' },
  { label: 'Public proof', value: 'Live app and portfolio case study' },
]

const MAINTAINER_FACTS = [
  'Product designer and full-stack developer based in the Philippines.',
  'Focus areas include AI products, design systems, mobile, Web3, and public-facing product work.',
  'Currently stewarding LexInsights polish, repository hygiene, releases, and ongoing maintenance.',
]

const PUBLIC_LINKS = [
  { label: 'GitHub repository', href: REPOSITORY_URL },
  { label: 'Read case study', href: PORTFOLIO_CASE_STUDY_URL },
  { label: 'Watch demo video', href: DEMO_VIDEO_URL },
  { label: 'Legacy showcase', href: LEGACY_SHOWCASE_URL },
]

export function AttributionDialog({ open, onOpenChange }: AttributionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1rem)] gap-0 overflow-hidden border-slate-200 bg-white p-0 dark:border-iris-300/15 dark:bg-[#171322] sm:max-w-2xl">
        <DialogHeader className="border-b border-slate-200 px-5 py-5 text-left dark:border-iris-300/15">
          <div className="flex items-start gap-3 pr-8">
            <UsersRound className="mt-0.5 h-7 w-7 shrink-0 text-iris-600 dark:text-iris-200" aria-hidden="true" />
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold leading-tight text-slate-950 dark:text-slate-100">
                Authors & Attribution
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                LexInsights was built during DevKada CodeKada 2025 and is now maintained as a public
                Philippine legal research and compliance project.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[min(72vh,640px)] overflow-y-auto px-5 py-5">
          <section aria-labelledby="attribution-team">
            <h3 id="attribution-team" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Hackathon Team
            </h3>
            <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {AUTHORS.map(({ Icon, ...author }) => (
                <a
                  key={author.name}
                  href={author.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group -mx-2 block min-w-0 rounded-lg px-2 py-2 transition-all duration-200 hover:bg-iris-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-iris-300/10 dark:focus-visible:ring-offset-[#171322]"
                  aria-label={`Open ${author.name} on LinkedIn`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-iris-500/80 transition-colors group-hover:text-iris-700 dark:text-iris-200/70 dark:group-hover:text-iris-100" aria-hidden="true" />
                    <span className="truncate text-sm font-semibold text-slate-950 transition-colors group-hover:text-iris-700 dark:text-slate-100 dark:group-hover:text-iris-100">
                      {author.name}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-iris-200/55" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">
                    {author.role}
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="mt-5 border-t border-slate-200 pt-5 dark:border-iris-300/15" aria-labelledby="attribution-project">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-iris-600 dark:text-iris-200" aria-hidden="true" />
              <div className="min-w-0">
                <h3 id="attribution-project" className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-iris-100">
                  Project Context
                </h3>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  A hackathon-origin legal assistant shaped into a public Philippine legal research and compliance tool.
                </p>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-slate-200 text-sm dark:divide-iris-300/10 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {PROJECT_FACTS.map((fact) => (
                <div key={fact.label} className="min-w-0 py-3 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-iris-700 dark:text-iris-200">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium leading-6 text-slate-900 dark:text-slate-100">
                    {'href' in fact ? (
                      <a
                        href={fact.href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-sm font-semibold text-iris-700 transition-colors hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-iris-200 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                      >
                        {fact.value}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-5 border-t border-slate-200 pt-5 dark:border-iris-300/15" aria-labelledby="attribution-maintainer">
            <details className="group">
              <summary className="-mx-3 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-iris-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:hover:bg-iris-300/10 dark:focus-visible:ring-offset-[#171322] [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 items-center gap-2">
                  <Wrench className="h-4 w-4 shrink-0 text-iris-600 dark:text-iris-200" aria-hidden="true" />
                  <span className="min-w-0">
                    <h3 id="attribution-maintainer" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Active Maintainer
                    </h3>
                    <span className="mt-1 block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Mark Siazon / Iron-Mark
                    </span>
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-iris-700 transition-transform duration-200 group-open:rotate-180 dark:text-iris-200" aria-hidden="true" />
              </summary>
              <div className="mt-3 px-3 pb-1">
                <p className="text-sm leading-6 text-slate-800 dark:text-slate-200">
                  Mark Siazon, also publishing under Iron-Mark, is the solo active maintainer for now.
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
                {MAINTAINER_FACTS.map((fact) => (
                  <li key={fact} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-iris-500 dark:bg-iris-300" aria-hidden="true" />
                    <span>{fact}</span>
                  </li>
                ))}
                </ul>
              </div>
            </details>
          </section>

          <section className="mt-5 border-t border-slate-200 pt-5 dark:border-iris-300/15" aria-labelledby="attribution-sources">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
              <h3 id="attribution-sources" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Public Sources
              </h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PUBLIC_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-iris-300 hover:bg-iris-50 hover:text-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 dark:border-iris-300/15 dark:text-slate-200 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10 dark:hover:text-white"
                >
                  {link.label}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
              The repository shows implementation context; the legacy showcase is retained as a historical reference.
            </p>
          </section>

          <section className="mt-5 border-t border-slate-200 pt-5 dark:border-iris-300/15" aria-labelledby="attribution-gallery">
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
              <h3 id="attribution-gallery" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Event Gallery
              </h3>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Moments from CodeKada 2025 on 8 November. Tap any photo to open it full-screen.
            </p>
            <EventGallery />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
