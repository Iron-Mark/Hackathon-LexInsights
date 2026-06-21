'use client'

import { Globe, ExternalLink, BookOpen } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface ResourcesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface GovernmentResource {
  id: string
  title: string
  description: string
  url: string
  category: string
}

const GOVERNMENT_RESOURCES: GovernmentResource[] = [
  {
    id: '1',
    title: 'Official Gazette - Laws and Issuances',
    description: 'Official repository of Philippine laws, executive orders, and proclamations',
    url: 'https://www.officialgazette.gov.ph/section/laws/',
    category: 'Laws'
  },
  {
    id: '2',
    title: 'Supreme Court E-Library',
    description: 'Access to Supreme Court decisions and jurisprudence',
    url: 'https://elibrary.judiciary.gov.ph/',
    category: 'Jurisprudence'
  },
  {
    id: '3',
    title: 'House of Representatives',
    description: 'Bills, resolutions, and legislative information',
    url: 'https://www.congress.gov.ph/',
    category: 'Legislature'
  },
  {
    id: '4',
    title: 'Senate of the Philippines',
    description: 'Senate bills, resolutions, and committee reports',
    url: 'https://legacy.senate.gov.ph/',
    category: 'Legislature'
  },
  {
    id: '5',
    title: 'Department of Justice',
    description: 'Legal opinions, circulars, and department orders',
    url: 'https://www.doj.gov.ph/',
    category: 'Executive'
  },
  {
    id: '6',
    title: 'National Privacy Commission',
    description: 'Data privacy advisories, circulars, and compliance guides',
    url: 'https://www.privacy.gov.ph/',
    category: 'Regulatory'
  },
  {
    id: '7',
    title: 'Department of Labor and Employment',
    description: 'Labor advisories, department orders, and employment regulations',
    url: 'https://www.dole.gov.ph/',
    category: 'Labor'
  },
  {
    id: '8',
    title: 'Bureau of Internal Revenue',
    description: 'Tax regulations, revenue memorandum circulars, and rulings',
    url: 'https://www.bir.gov.ph/',
    category: 'Taxation'
  },
  {
    id: '9',
    title: 'Department of Trade and Industry',
    description: 'Business regulations, consumer protection, and trade policies',
    url: 'https://www.dti.gov.ph/',
    category: 'Business'
  },
  {
    id: '10',
    title: 'Securities and Exchange Commission',
    description: 'Corporate regulations, securities laws, and compliance requirements',
    url: 'https://www.sec.gov.ph/',
    category: 'Corporate'
  },
]

export function ResourcesDialog({ open, onOpenChange }: ResourcesDialogProps) {
  const handleResourceClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const resourceGroups = Array.from(new Set(GOVERNMENT_RESOURCES.map(r => r.category))).map((category) => ({
    category,
    resources: GOVERNMENT_RESOURCES.filter((resource) => resource.category === category),
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] overflow-hidden p-0 sm:max-w-2xl lg:max-w-5xl xl:max-w-6xl">
        <DialogHeader className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-7">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-iris-100 text-iris-700">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-bold leading-tight text-slate-950">
                Philippine Government Resources
              </DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Official sources for Philippine laws, regulations, jurisprudence, and compliance information.
              </DialogDescription>
              <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-iris-700 shadow-sm">
                {GOVERNMENT_RESOURCES.length} official sources
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <div className="grid gap-6 lg:grid-cols-[190px_1fr]">
            <aside className="hidden lg:block">
              <div className="sticky top-0 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Categories</p>
                <div className="mt-3 space-y-2">
                  {resourceGroups.map(({ category, resources }) => (
                    <div
                      key={category}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-600"
                    >
                      <span>{category}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                        {resources.length}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            <div className="space-y-7">
              {resourceGroups.map(({ category, resources }) => (
                <section key={category} aria-labelledby={`resource-category-${category}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3
                      id={`resource-category-${category}`}
                      className="text-sm font-bold text-slate-900"
                    >
                      {category}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>

                  <div className="grid gap-3 xl:grid-cols-2">
                    {resources.map((resource) => (
                      <button
                        key={resource.id}
                        onClick={() => handleResourceClick(resource.url)}
                        className="group rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-iris-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2"
                        type="button"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-700 transition-colors group-hover:bg-iris-100">
                            <Globe className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="text-base font-bold leading-snug text-slate-950 group-hover:text-iris-700">
                                {resource.title}
                              </h4>
                              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-iris-600" />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {resource.description}
                            </p>
                            <div className="mt-3 truncate text-xs font-medium text-slate-500">
                              {resource.url}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 sm:px-7">
          <p className="max-w-4xl">
            <strong className="text-slate-700">Note:</strong> These are official Philippine government websites.
            Always verify information with the relevant authorities for legal compliance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
