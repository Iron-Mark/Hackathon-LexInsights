'use client'

import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Globe, ExternalLink, BookOpen, FileText, ShieldCheck, Trash2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TermsPrivacyPanel } from './terms-privacy-panel'
import { clearPrivateClientState } from '@/lib/store/private-client-state'
import { trackHelpResourcesOpen, trackSourceLinkClick } from '@/lib/analytics/events'

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
  corpusCount?: number
}

const LOCAL_CORPUS_AUTHORITY_COUNT = 271
const LOCAL_CORPUS_SOURCE_COUNT = 13
const LOCAL_COMPLIANCE_FRAMEWORK_COUNT = 45

const GOVERNMENT_RESOURCES: GovernmentResource[] = [
  {
    id: 'lawphil',
    title: 'Lawphil Legal Information Archive',
    description: 'Primary archive used by the local corpus for Philippine statutes, executive issuances, rules, and cases',
    url: 'https://lawphil.net/',
    category: 'Primary Law',
    corpusCount: 230,
  },
  {
    id: 'official-gazette',
    title: 'Official Gazette - Laws and Issuances',
    description: 'Official repository of Philippine laws, executive orders, proclamations, and public issuances',
    url: 'https://www.officialgazette.gov.ph/section/laws/',
    category: 'Primary Law'
  },
  {
    id: 'supreme-court-elibrary',
    title: 'Supreme Court E-Library',
    description: 'Access to Supreme Court decisions and jurisprudence',
    url: 'https://elibrary.judiciary.gov.ph/',
    category: 'Courts',
    corpusCount: 3,
  },
  {
    id: 'oca',
    title: 'Office of the Court Administrator',
    description: 'Court circulars and administrative issuances used for cybercrime and court-procedure references',
    url: 'https://oca.judiciary.gov.ph/',
    category: 'Courts',
    corpusCount: 1,
  },
  {
    id: 'house',
    title: 'House of Representatives',
    description: 'Bills, resolutions, and legislative information',
    url: 'https://www.congress.gov.ph/',
    category: 'Legislature'
  },
  {
    id: 'senate',
    title: 'Senate of the Philippines',
    description: 'Senate bills, resolutions, and committee reports',
    url: 'https://legacy.senate.gov.ph/',
    category: 'Legislature'
  },
  {
    id: 'doj',
    title: 'Department of Justice',
    description: 'Legal opinions, circulars, and department orders',
    url: 'https://www.doj.gov.ph/',
    category: 'Executive'
  },
  {
    id: 'npc',
    title: 'National Privacy Commission',
    description: 'Data privacy advisories, circulars, and compliance guides',
    url: 'https://www.privacy.gov.ph/',
    category: 'Privacy & Data',
    corpusCount: 10,
  },
  {
    id: 'dole',
    title: 'Department of Labor and Employment',
    description: 'Labor advisories, department orders, and employment regulations',
    url: 'https://www.dole.gov.ph/',
    category: 'Labor',
    corpusCount: 3,
  },
  {
    id: 'bir',
    title: 'Bureau of Internal Revenue',
    description: 'Tax regulations, revenue memorandum circulars, and rulings',
    url: 'https://www.bir.gov.ph/',
    category: 'Finance & Tax',
    corpusCount: 10,
  },
  {
    id: 'bsp',
    title: 'Bangko Sentral ng Pilipinas',
    description: 'Financial consumer protection, payments, virtual assets, and banking regulations',
    url: 'https://www.bsp.gov.ph/',
    category: 'Finance & Tax',
    corpusCount: 4,
  },
  {
    id: 'amlc',
    title: 'Anti-Money Laundering Council',
    description: 'AMLA implementing rules, covered-person guidance, and financial crime controls',
    url: 'https://www.amlc.gov.ph/',
    category: 'Finance & Tax',
    corpusCount: 2,
  },
  {
    id: 'dti',
    title: 'Department of Trade and Industry',
    description: 'Business regulations, consumer protection, and trade policies',
    url: 'https://www.dti.gov.ph/',
    category: 'Business & Trade',
    corpusCount: 1,
  },
  {
    id: 'sec',
    title: 'Securities and Exchange Commission',
    description: 'Corporate regulations, securities laws, and compliance requirements',
    url: 'https://www.sec.gov.ph/',
    category: 'Business & Trade',
    corpusCount: 4,
  },
  {
    id: 'blgf',
    title: 'Bureau of Local Government Finance',
    description: 'Local treasury, assessment, and real property valuation guidance',
    url: 'https://blgf.gov.ph/',
    category: 'Local Government',
    corpusCount: 1,
  },
  {
    id: 'customs',
    title: 'Bureau of Customs',
    description: 'Customs rules, import/export workflows, tariffs, and border compliance materials',
    url: 'https://customs.gov.ph/',
    category: 'Business & Trade',
    corpusCount: 1,
  },
]

const ALL_CATEGORIES = 'All'
type HelpView = 'sources' | 'terms-privacy'

const HELP_TABS: Array<{ id: HelpView; label: string; panelId: string; Icon: typeof BookOpen }> = [
  { id: 'sources', label: 'Sources', panelId: 'help-panel-sources', Icon: BookOpen },
  { id: 'terms-privacy', label: 'Terms & Privacy', panelId: 'help-panel-terms-privacy', Icon: FileText },
]

export function ResourcesDialog({ open, onOpenChange }: ResourcesDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const [activeView, setActiveView] = useState<HelpView>('sources')
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearStatus, setClearStatus] = useState<string | null>(null)
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const handleResourceClick = (resource: GovernmentResource) => {
    trackSourceLinkClick({
      category: resource.category,
      id: resource.id,
    })
    window.open(resource.url, '_blank', 'noopener,noreferrer')
  }

  const resourceGroups = useMemo(
    () => Array.from(new Set(GOVERNMENT_RESOURCES.map(r => r.category))).map((category) => ({
      category,
      resources: GOVERNMENT_RESOURCES.filter((resource) => resource.category === category),
    })),
    []
  )

  const visibleResourceGroups = useMemo(() => {
    if (selectedCategory === ALL_CATEGORIES) {
      return resourceGroups
    }

    return resourceGroups.filter(({ category }) => category === selectedCategory)
  }, [resourceGroups, selectedCategory])

  const visibleResourceCount = visibleResourceGroups.reduce((total, group) => total + group.resources.length, 0)
  const categoryFilters = [
    { category: ALL_CATEGORIES, count: GOVERNMENT_RESOURCES.length },
    ...resourceGroups.map(({ category, resources }) => ({
      category,
      count: resources.length,
    })),
  ]

  useEffect(() => {
    if (open) {
      setSelectedCategory(ALL_CATEGORIES)
      setActiveView('sources')
      setConfirmingClear(false)
      setClearStatus(null)
      trackHelpResourcesOpen('sidebar_control')
    }
  }, [open])

  const handleClearLocalData = () => {
    clearPrivateClientState()
    setConfirmingClear(false)
    setClearStatus('Local chats, uploaded document selections, compliance drafts, and research caches were cleared. Your theme was kept.')
  }

  const focusTab = (index: number) => {
    const tab = HELP_TABS[index]

    if (!tab) {
      return
    }

    setActiveView(tab.id)
    tabRefs.current[index]?.focus()
  }

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const lastIndex = HELP_TABS.length - 1
    let nextIndex: number | null = null

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = index === lastIndex ? 0 : index + 1
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = index === 0 ? lastIndex : index - 1
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = lastIndex
        break
      default:
        break
    }

    if (nextIndex !== null) {
      event.preventDefault()
      focusTab(nextIndex)
    }
  }

  const filterButtonClassName = (isSelected: boolean) => [
    'flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#241f32]',
    isSelected
      ? 'bg-iris-50 text-iris-800 dark:bg-iris-300/16 dark:text-iris-100'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-slate-100',
  ].join(' ')

  const filterCountClassName = (isSelected: boolean) => [
    'rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
    isSelected
      ? 'bg-iris-100 text-iris-700 dark:bg-iris-300/22 dark:text-iris-100'
      : 'bg-slate-100 text-slate-500 dark:bg-iris-300/12 dark:text-slate-300',
  ].join(' ')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 dark:border-iris-300/15 dark:bg-[#171322] sm:max-h-[88dvh] sm:max-w-2xl lg:max-w-[min(calc(100vw-2rem),60rem)] xl:max-w-6xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-4 dark:border-iris-300/15 dark:bg-[#1a1625] sm:px-7 sm:py-5">
          <div className="flex flex-col gap-4 pr-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="grid min-w-0 grid-cols-[2.5rem_1fr] items-start gap-3 sm:grid-cols-[2.75rem_1fr]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-iris-100 text-iris-700 dark:bg-iris-400/15 dark:text-iris-200 sm:h-11 sm:w-11">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-left text-lg font-bold leading-tight text-slate-950 dark:text-slate-100 sm:text-xl">
                  Help & Resources
                </DialogTitle>
                <DialogDescription className="mt-1.5 max-w-2xl text-left text-sm leading-6 text-slate-600 dark:text-slate-300 sm:mt-2">
                  Official source directory, service terms, and privacy notes for LexInsights.
                </DialogDescription>
                <div className="mt-3 grid max-w-full grid-cols-3 gap-1.5 max-sm:-ml-[3.25rem] max-sm:w-[calc(100%+3.25rem)] max-sm:max-w-none sm:flex sm:flex-wrap sm:gap-2">
                  <span className="flex min-h-10 min-w-0 flex-col items-center justify-center rounded-lg bg-white px-1.5 py-1 text-center text-iris-700 shadow-sm dark:bg-[#241f32] dark:text-iris-200 sm:inline-flex sm:min-h-0 sm:flex-row sm:rounded-full sm:px-3">
                    <strong className="text-xs font-extrabold leading-none sm:mr-1">{GOVERNMENT_RESOURCES.length}</strong>
                    <span className="mt-0.5 max-w-full truncate text-[10px] font-semibold leading-none sm:mt-0 sm:text-xs">source links</span>
                  </span>
                  <span className="flex min-h-10 min-w-0 flex-col items-center justify-center rounded-lg bg-white px-1.5 py-1 text-center text-emerald-700 shadow-sm dark:bg-[#241f32] dark:text-emerald-200 sm:inline-flex sm:min-h-0 sm:flex-row sm:rounded-full sm:px-3">
                    <strong className="text-xs font-extrabold leading-none sm:mr-1">{LOCAL_CORPUS_AUTHORITY_COUNT}</strong>
                    <span className="mt-0.5 max-w-full truncate text-[10px] font-semibold leading-none sm:mt-0 sm:text-xs">authorities</span>
                  </span>
                  <span className="flex min-h-10 min-w-0 flex-col items-center justify-center rounded-lg bg-white px-1.5 py-1 text-center text-sky-700 shadow-sm dark:bg-[#241f32] dark:text-sky-200 sm:inline-flex sm:min-h-0 sm:flex-row sm:rounded-full sm:px-3">
                    <strong className="text-xs font-extrabold leading-none sm:mr-1">{LOCAL_COMPLIANCE_FRAMEWORK_COUNT}</strong>
                    <span className="mt-0.5 max-w-full truncate text-[10px] font-semibold leading-none sm:mt-0 sm:text-xs">frameworks</span>
                  </span>
                </div>
              </div>
            </div>

            <div
              className="grid min-h-[3.25rem] w-full grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-iris-300/15 dark:bg-[#241f32]/80 lg:w-auto lg:min-w-80"
              role="tablist"
              aria-label="Help sections"
            >
              {HELP_TABS.map(({ id, label, panelId, Icon }, index) => {
                const isSelected = activeView === id

                return (
                  <button
                    key={id}
                    ref={(node) => {
                      tabRefs.current[index] = node
                    }}
                    type="button"
                    id={`help-tab-${id}`}
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={panelId}
                    tabIndex={isSelected ? 0 : -1}
                    className={[
                      'inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 text-sm font-semibold leading-tight transition-colors sm:px-3',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#241f32]',
                      isSelected
                        ? 'bg-iris-50 text-iris-800 dark:bg-iris-300/16 dark:text-iris-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-slate-100',
                    ].join(' ')}
                    onClick={() => setActiveView(id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-7 sm:py-5">
          {activeView === 'sources' ? (
          <div
            id="help-panel-sources"
            role="tabpanel"
            aria-labelledby="help-tab-sources"
            className="grid w-full max-w-full gap-6 overflow-x-hidden lg:grid-cols-[190px_minmax(0,1fr)]"
          >
            <aside className="hidden lg:block">
              <div className="sticky top-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-iris-300/15 dark:bg-[#241f32]">
                <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Categories</p>
                <div className="mt-3 space-y-1.5" role="group" aria-label="Filter government resources by category">
                  {categoryFilters.map(({ category, count }) => {
                    const isSelected = selectedCategory === category

                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={isSelected}
                        className={filterButtonClassName(isSelected)}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <span className="min-w-0 truncate">{category}</span>
                        <span className={filterCountClassName(isSelected)}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </aside>

            <div className="min-w-0 max-w-full space-y-7 overflow-x-hidden">
              <div className="space-y-3 lg:hidden">
                <p className="text-xs font-semibold uppercase text-slate-400 dark:text-slate-500">Categories</p>
                <div
                  className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3"
                  role="group"
                  aria-label="Filter government resources by category"
                >
                  {categoryFilters.map(({ category, count }) => {
                    const isSelected = selectedCategory === category

                    return (
                      <button
                        key={category}
                        type="button"
                        aria-pressed={isSelected}
                        className={[
                          'inline-flex min-h-10 min-w-0 cursor-pointer items-center justify-between gap-2 rounded-full border px-3 py-2 text-sm transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]',
                          isSelected
                            ? 'border-iris-300 bg-iris-50 text-iris-800 dark:border-iris-300/35 dark:bg-iris-300/16 dark:text-iris-100'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-iris-200 hover:text-slate-950 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-300 dark:hover:border-iris-300/30 dark:hover:text-slate-100',
                        ].join(' ')}
                        onClick={() => setSelectedCategory(category)}
                      >
                        <span className="min-w-0 truncate">{category}</span>
                        <span className={filterCountClassName(isSelected)}>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Showing <span className="font-bold text-slate-950 dark:text-slate-100">{visibleResourceCount}</span>{' '}
                  {selectedCategory === ALL_CATEGORIES ? 'official sources' : `${selectedCategory.toLowerCase()} source${visibleResourceCount === 1 ? '' : 's'}`}
                </p>
                {selectedCategory !== ALL_CATEGORIES && (
                  <button
                    type="button"
                    className="min-h-10 cursor-pointer rounded-lg px-3 text-sm font-semibold text-iris-700 transition-colors hover:bg-iris-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:text-iris-200 dark:hover:bg-iris-300/10 dark:focus-visible:ring-offset-[#171322]"
                    onClick={() => setSelectedCategory(ALL_CATEGORIES)}
                  >
                    Clear filter
                  </button>
                )}
              </div>

              {visibleResourceGroups.map(({ category, resources }) => (
                <section key={category} className="min-w-0 max-w-full overflow-x-hidden" aria-labelledby={`resource-category-${category}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3
                      id={`resource-category-${category}`}
                      className="text-sm font-bold text-slate-900 dark:text-slate-100"
                    >
                      {category}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200 dark:bg-iris-300/15" />
                  </div>

                  <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 overflow-x-hidden xl:grid-cols-2">
                    {resources.map((resource) => (
                      <button
                        key={resource.id}
                        onClick={() => handleResourceClick(resource)}
                        className="group min-w-0 w-full max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-iris-300 hover:shadow-md active:translate-y-0 active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32] dark:hover:border-iris-300/50 dark:hover:bg-[#2b2438] dark:focus-visible:ring-offset-[#171322]"
                        type="button"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-700 transition-colors group-hover:bg-iris-100 dark:bg-iris-400/10 dark:text-iris-200 dark:group-hover:bg-iris-400/20">
                            <Globe className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-start justify-between gap-3">
                              <h4 className="min-w-0 break-words text-base font-bold leading-snug text-slate-950 group-hover:text-iris-700 dark:text-slate-100 dark:group-hover:text-iris-200">
                                {resource.title}
                              </h4>
                              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-iris-600 dark:text-slate-500 dark:group-hover:text-iris-200" />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                              {resource.description}
                            </p>
                            <div className="mt-3 max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
                              {resource.url}
                            </div>
                            {resource.corpusCount !== undefined && (
                              <div className="mt-3 inline-flex rounded-full bg-iris-50 px-2.5 py-1 text-[11px] font-semibold text-iris-700 dark:bg-iris-300/12 dark:text-iris-200">
                                {resource.corpusCount} local corpus {resource.corpusCount === 1 ? 'entry' : 'entries'}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
          ) : (
            <div
              id="help-panel-terms-privacy"
              role="tabpanel"
              aria-labelledby="help-tab-terms-privacy"
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-iris-300/15">
                <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Open the public legal pages for sharing, review, or direct browser access.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-iris-700 transition-colors hover:bg-iris-50 hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:text-iris-200 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                  >
                    Terms
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-iris-700 transition-colors hover:bg-iris-50 hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:text-iris-200 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                  >
                    Privacy Policy
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
              <section
                className="border-b border-slate-200 pb-5 dark:border-iris-300/15"
                aria-labelledby="local-data-controls"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-700 dark:bg-iris-300/12 dark:text-iris-100">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <h3 id="local-data-controls" className="text-sm font-bold text-slate-950 dark:text-slate-100">
                        Local data
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                        Clear guest chats, temporary document selections, compliance drafts, and saved research results on this device.
                      </p>
                      {clearStatus && (
                        <p className="mt-2 text-sm font-medium leading-6 text-emerald-700 dark:text-emerald-200" role="status">
                          {clearStatus}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                    {confirmingClear ? (
                      <>
                        <button
                          type="button"
                          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-bold text-white transition-colors hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400 dark:focus-visible:ring-offset-[#171322]"
                          onClick={handleClearLocalData}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Clear now
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-slate-100 dark:focus-visible:ring-offset-[#171322]"
                          onClick={() => setConfirmingClear(false)}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-bold text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:border-rose-300/20 dark:bg-[#241f32] dark:text-rose-200 dark:hover:border-rose-300/40 dark:hover:bg-rose-300/10 dark:hover:text-rose-100 dark:focus-visible:ring-offset-[#171322]"
                        onClick={() => {
                          setClearStatus(null)
                          setConfirmingClear(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Clear local data
                      </button>
                    )}
                  </div>
                </div>
              </section>
              <TermsPrivacyPanel />
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 dark:border-iris-300/15 dark:bg-[#1a1625] dark:text-slate-400 sm:px-7 sm:py-4">
          <p className="max-w-4xl">
            <strong className="text-slate-700 dark:text-slate-200">Note:</strong>{' '}
            {activeView === 'sources'
              ? `This directory summarizes ${LOCAL_CORPUS_SOURCE_COUNT} local corpus source groups and keeps high-value official sites handy.`
              : 'Terms and Privacy are available as public pages for direct browser access.'}{' '}
            Always verify legal information with the relevant authorities for compliance.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
