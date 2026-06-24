'use client'

import { ExternalLink, GitBranch, Sparkles, UsersRound, Wrench } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AttributionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const AUTHORS = [
  { name: 'Jam', role: 'Hackathon contributor' },
  { name: 'Ken', role: 'Hackathon contributor' },
  { name: 'Mark Siazon', role: 'Hackathon contributor and active maintainer' },
  { name: 'Ashlyn', role: 'Hackathon contributor' },
]

const PROJECT_FACTS = [
  { label: 'Built for', value: 'Devkada Codekada 2025' },
  { label: 'Product focus', value: 'AI legal compliance chat for Philippine legal research workflows' },
  { label: 'Public proof', value: 'Portfolio case study, live app, and Iron-Mark repository' },
]

const MAINTAINER_FACTS = [
  'Product designer and full-stack developer based in the Philippines.',
  'Focus areas include AI products, design systems, mobile, Web3, and proof-backed product work.',
  'Currently stewarding LexInSight polish, repository hygiene, releases, and ongoing maintenance.',
]

const PUBLIC_LINKS = [
  { label: 'Mark Siazon portfolio', href: 'https://www.marksiazon.dev' },
  { label: 'LexInSight case study', href: 'https://www.marksiazon.dev/projects/lexinsights' },
  { label: 'Iron-Mark repository', href: 'https://github.com/Iron-Mark/Hackathon-LexInsights' },
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
                LexInSight was built during Devkada Codekada 2025 and is now maintained as a public
                proof-backed AI legal compliance project.
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
              {AUTHORS.map((author) => (
                <div key={author.name} className="border-b border-slate-100 pb-3 dark:border-iris-300/10">
                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">{author.name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{author.role}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-5 border-t border-slate-200 pt-5 dark:border-iris-300/15" aria-labelledby="attribution-project">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
              <h3 id="attribution-project" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Project Context
              </h3>
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
              {PROJECT_FACTS.map((fact) => (
                <div key={fact.label} className="border-l border-slate-200 pl-3 dark:border-iris-300/15">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 leading-6 text-slate-800 dark:text-slate-200">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-5 border-t border-slate-200 pt-5 dark:border-iris-300/15" aria-labelledby="attribution-maintainer">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
              <h3 id="attribution-maintainer" className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Active Maintainer
              </h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-800 dark:text-slate-200">
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
              This panel uses public portfolio and repository context only.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}
