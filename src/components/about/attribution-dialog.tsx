'use client'

import type { LucideIcon } from 'lucide-react'
import { BrainCircuit, ExternalLink, FileCheck2, GitBranch, Palette, ServerCog, Sparkles, UsersRound, Wrench } from 'lucide-react'
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
  {
    name: 'Jam Emmanuel Villarosa',
    role: 'AI Engineer & Lead Developer',
    href: 'https://ph.linkedin.com/in/jamthedev2004',
    Icon: BrainCircuit,
  },
  {
    name: 'Ken Patrick Garcia',
    role: 'Backend & API Developer',
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
    name: 'Ashlyn Torres',
    role: 'QA & Project Assistant Manager',
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
  { label: 'Built for', value: 'Devkada Codekada 2025' },
  { label: 'Product focus', value: 'Philippine legal research and compliance review workflows' },
  { label: 'Public proof', value: 'Live app, portfolio case study, and Iron-Mark repository' },
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
                    <span className="truncate text-sm font-semibold text-slate-950 transition-colors group-hover:text-iris-700 dark:text-slate-100 dark:group-hover:text-iris-100">
                      {author.name}
                    </span>
                    <Icon className="h-3.5 w-3.5 shrink-0 text-iris-500/80 transition-colors group-hover:text-iris-700 dark:text-iris-200/70 dark:group-hover:text-iris-100" aria-hidden="true" />
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-iris-200/55" aria-hidden="true" />
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 transition-colors group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-200">
                    {author.role}
                  </span>
                </a>
              ))}
            </div>
          </section>

          <section className="mt-5 border-y border-slate-200 py-5 dark:border-iris-300/15" aria-labelledby="attribution-project">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-iris-600 dark:text-iris-200" aria-hidden="true" />
              <div className="min-w-0">
                <h3 id="attribution-project" className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-iris-100">
                  Project Context
                </h3>
                <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  A hackathon-origin legal assistant shaped into a public, proof-backed product demo.
                </p>
              </div>
            </div>
            <dl className="mt-4 divide-y divide-slate-200 border-y border-slate-100 text-sm dark:divide-iris-300/10 dark:border-iris-300/10 sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {PROJECT_FACTS.map((fact) => (
                <div key={fact.label} className="min-w-0 py-3 sm:px-4 sm:first:pl-0 sm:last:pr-0">
                  <dt className="text-[11px] font-bold uppercase tracking-wide text-iris-700 dark:text-iris-200">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-[15px] font-medium leading-6 text-slate-900 dark:text-slate-100">{fact.value}</dd>
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
