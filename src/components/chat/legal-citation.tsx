'use client'

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'
import { AlertTriangle, BookOpen, ExternalLink, Info, Link2, ShieldCheck } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

type RagResponseMetadata = NonNullable<Message['metadata']>['ragResponse']
type MatchedDocument = NonNullable<NonNullable<RagResponseMetadata>['matched_documents']>[number]
type CitationRagResponse = {
  matched_documents?: MatchedDocument[]
  retrieval_metadata?: {
    unknown_citation_numbers?: string[]
  }
}

type CitationStatus = 'known' | 'unknown' | 'metadata-missing'

interface ResolvedCitation {
  number: string
  status: CitationStatus
  document?: MatchedDocument
  hasRagMetadata: boolean
}

export interface LegalCitationContext {
  resolveCitation: (citationNumber: string) => ResolvedCitation
}

interface LegalCitationRenderOptions {
  isRevealing?: boolean
}

const RA_CITATION_PATTERN = /\b(?:R\.?\s*A\.?(?:\s*(?:No\.?|Number))?|Republic\s+Act(?:\s*(?:No\.?|Number))?)\s*[-.]?\s*(\d{3,6})\b/gi
const MAX_INLINE_CITATION_CHIPS_PER_TEXT = 8
const SKIPPED_INLINE_ELEMENTS = new Set(['a', 'code', 'pre', 'kbd', 'samp', 'script', 'style', 'button'])

function collectRaNumbers(value?: string) {
  if (!value) {
    return []
  }

  return Array.from(value.matchAll(new RegExp(RA_CITATION_PATTERN))).map((match) => match[1])
}

function firstRaNumber(value?: string) {
  return collectRaNumbers(value)[0]
}

function normalizeCitationNumber(value: string) {
  return value.replace(/\D/g, '')
}

function formatStatusLabel(status?: string) {
  if (!status) {
    return 'Cataloged'
  }

  return status
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatSupportLevel(value?: string) {
  if (!value) {
    return null
  }

  return `${formatStatusLabel(value)} support`
}

function formatVerificationSummary(status?: string, lastVerified?: string) {
  const label = formatStatusLabel(status)

  if (status === 'verified') {
    return lastVerified ? `${label} ${lastVerified}` : label
  }

  if (lastVerified) {
    return `${label} catalog date ${lastVerified}`
  }

  return label
}

export function buildLegalCitationContext(ragResponse?: CitationRagResponse): LegalCitationContext {
  const documentsByNumber = new Map<string, MatchedDocument>()

  for (const document of ragResponse?.matched_documents || []) {
    const documentNumbers = [
      firstRaNumber(document.statute),
      firstRaNumber(document.title),
    ].filter((number): number is string => Boolean(number))

    for (const number of documentNumbers) {
      documentsByNumber.set(normalizeCitationNumber(number), document)
    }
  }

  const unknownNumbers = new Set(
    (ragResponse?.retrieval_metadata?.unknown_citation_numbers || []).map(normalizeCitationNumber)
  )

  return {
    resolveCitation: (citationNumber: string) => {
      const number = normalizeCitationNumber(citationNumber)
      const document = documentsByNumber.get(number)

      if (document) {
        return {
          number,
          status: 'known',
          document,
          hasRagMetadata: Boolean(ragResponse),
        }
      }

      if (unknownNumbers.has(number)) {
        return {
          number,
          status: 'unknown',
          hasRagMetadata: Boolean(ragResponse),
        }
      }

      return {
        number,
        status: 'metadata-missing',
        hasRagMetadata: Boolean(ragResponse),
      }
    },
  }
}

function shouldSkipElement(element: ReactElement) {
  return typeof element.type === 'string' && SKIPPED_INLINE_ELEMENTS.has(element.type)
}

export function renderLegalCitationNodes(
  children: ReactNode,
  citationContext: LegalCitationContext,
  keyPrefix: string,
  options: LegalCitationRenderOptions = {}
): ReactNode {
  return Children.map(children, (child, childIndex) => {
    const childKey = `${keyPrefix}-${childIndex}`

    if (typeof child === 'string') {
      return renderCitationText(child, citationContext, childKey, options)
    }

    if (Array.isArray(child)) {
      return renderLegalCitationNodes(child, citationContext, childKey, options)
    }

    if (isValidElement<{ children?: ReactNode }>(child)) {
      if (shouldSkipElement(child)) {
        return child
      }

      if (!child.props.children) {
        return child
      }

      return cloneElement(child, {
        children: renderLegalCitationNodes(child.props.children, citationContext, childKey, options),
      })
    }

    return child
  })
}

function renderCitationText(
  text: string,
  citationContext: LegalCitationContext,
  keyPrefix: string,
  options: LegalCitationRenderOptions
) {
  const parts: ReactNode[] = []
  let lastIndex = 0
  let renderedCitationCount = 0

  for (const match of text.matchAll(new RegExp(RA_CITATION_PATTERN))) {
    const matchedText = match[0]
    const citationNumber = match[1]
    const matchIndex = match.index || 0

    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex))
    }

    if (renderedCitationCount < MAX_INLINE_CITATION_CHIPS_PER_TEXT) {
      const citation = citationContext.resolveCitation(citationNumber)

      if (options.isRevealing || citation.status === 'metadata-missing') {
        parts.push(matchedText)
      } else {
        parts.push(
          <LegalCitationInline
            key={`${keyPrefix}-${matchIndex}-${citationNumber}`}
            citation={citation}
            displayText={matchedText}
            previewDisabled={options.isRevealing}
          />
        )
        renderedCitationCount += 1
      }
    } else {
      parts.push(matchedText)
    }

    lastIndex = matchIndex + matchedText.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : text
}

function CitationPreview({ citation }: { citation: ResolvedCitation }) {
  const document = citation.document

  if (citation.status === 'known' && document) {
    return (
      <span className="inline-flex w-full flex-col gap-1.5 text-left">
        <span className="font-display text-sm font-semibold leading-5 text-slate-950 dark:text-slate-50">
          {document.title}
        </span>
        <span className="text-xs leading-5 text-slate-600 dark:text-slate-300">
          {[
            document.source_tier,
            formatVerificationSummary(document.provenance_status, document.source_last_verified),
          ].filter(Boolean).join(' | ')}
        </span>
      </span>
    )
  }

  if (citation.status === 'unknown') {
    return (
      <span className="inline-block text-left text-xs leading-5 text-amber-800 dark:text-amber-100">
        RA {citation.number} was cited, but it is not in the bundled providerless corpus.
      </span>
    )
  }

  return (
    <span className="inline-block text-left text-xs leading-5 text-slate-600 dark:text-slate-300">
      Source details were not saved with this response.
    </span>
  )
}

function CitationInspectorContent({ citation }: { citation: ResolvedCitation }) {
  const document = citation.document

  if (citation.status === 'known' && document) {
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-400/25 dark:bg-emerald-400/10">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-200" aria-hidden="true" />
            <p className="text-sm leading-6 text-emerald-900 dark:text-emerald-100">
              This citation matched saved local RAG provenance metadata for the assistant response.
            </p>
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Authority</dt>
            <dd className="mt-1 font-medium text-slate-950 dark:text-slate-100">{document.title}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Source</dt>
            <dd className="mt-1 font-medium text-slate-950 dark:text-slate-100">{document.source_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Source Tier</dt>
            <dd className="mt-1 font-medium text-slate-950 dark:text-slate-100">{document.source_tier || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Verification</dt>
            <dd className="mt-1 font-medium text-slate-950 dark:text-slate-100">
              {formatVerificationSummary(document.provenance_status, document.source_last_verified)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Confidence</dt>
            <dd className="mt-1 font-medium text-slate-950 dark:text-slate-100">
              {(document.relevance_score * 100).toFixed(0)}%
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Support</dt>
            <dd className="mt-1 font-medium text-slate-950 dark:text-slate-100">
              {formatSupportLevel(document.support_level) || 'Not specified'}
            </dd>
          </div>
        </dl>

        {((document.matched_terms && document.matched_terms.length > 0) ||
          (document.supporting_fields && document.supporting_fields.length > 0)) && (
          <section aria-labelledby={`citation-${citation.number}-signals`}>
            <h4 id={`citation-${citation.number}-signals`} className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              Matched Signals
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {(document.matched_terms || []).slice(0, 5).map((term) => (
                <span
                  key={`term-${term}`}
                  className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-slate-200"
                >
                  {term}
                </span>
              ))}
              {(document.supporting_fields || []).slice(0, 4).map((field) => (
                <span
                  key={`field-${field}`}
                  className="inline-flex rounded-md border border-iris-100 bg-iris-50 px-2.5 py-1 text-xs font-medium text-iris-800 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-iris-100"
                >
                  {formatStatusLabel(field)}
                </span>
              ))}
            </div>
          </section>
        )}

        {document.evidence_anchors && document.evidence_anchors.length > 0 && (
          <section aria-labelledby={`citation-${citation.number}-anchors`}>
            <h4 id={`citation-${citation.number}-anchors`} className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              Evidence Anchors
            </h4>
            <div className="mt-2 space-y-2">
              {document.evidence_anchors.map((anchor) => (
                <div
                  key={anchor.label}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm dark:border-iris-300/15 dark:bg-[#241f32]"
                >
                  <p className="font-medium text-slate-950 dark:text-slate-100">{anchor.label}</p>
                  <p className="mt-1 leading-6 text-slate-600 dark:text-slate-300">{anchor.note}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {document.related_authorities && document.related_authorities.length > 0 && (
          <section aria-labelledby={`citation-${citation.number}-related`}>
            <h4 id={`citation-${citation.number}-related`} className="text-sm font-semibold text-slate-950 dark:text-slate-100">
              Related Authorities
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {document.related_authorities.slice(0, 4).map((authority) => (
                <span
                  key={`${authority.statute}-${authority.relation_type}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-iris-100 bg-iris-50 px-2.5 py-1.5 text-xs font-medium text-iris-800 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-iris-100"
                >
                  <Link2 className="h-3 w-3" aria-hidden="true" />
                  {authority.statute} ({authority.relation_type})
                </span>
              ))}
            </div>
          </section>
        )}

        {document.source_url && (
          <a
            href={document.source_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-iris-200 bg-white px-3 text-sm font-semibold text-iris-700 transition-colors hover:border-iris-300 hover:bg-iris-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/20 dark:bg-[#171322] dark:text-iris-200 dark:hover:bg-iris-300/10 dark:focus-visible:ring-offset-[#171322]"
          >
            Open official source
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    )
  }

  if (citation.status === 'unknown') {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/25 dark:bg-amber-400/10">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-200" aria-hidden="true" />
            <p className="text-sm leading-6 text-amber-900 dark:text-amber-100">
              RA {citation.number} was detected in the response, but LexInsights does not have it in the bundled providerless corpus for this local result.
            </p>
          </div>
        </div>
        <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
          No title, evidence anchors, source tier, or verification date are shown because the app should not invent provenance for an unsupported citation.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-iris-300/15 dark:bg-[#241f32]">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-600 dark:text-slate-300" aria-hidden="true" />
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
            This message mentions RA {citation.number}, but source metadata was not saved with this response.
          </p>
        </div>
      </div>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        Ask a new local providerless RAG question for richer citation provenance, evidence anchors, and verification details.
      </p>
    </div>
  )
}

function LegalCitationInline({
  citation,
  displayText,
  previewDisabled = false,
}: {
  citation: ResolvedCitation
  displayText: string
  previewDisabled?: boolean
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const id = useId()
  const previewId = `${id}-preview`
  const isKnown = citation.status === 'known'
  const isUnknown = citation.status === 'unknown'
  const statusLabel = isKnown
    ? 'Matched local source'
    : isUnknown
    ? 'Unsupported local citation'
    : 'Citation metadata unavailable'

  useEffect(() => {
    if (previewDisabled) {
      setIsPreviewOpen(false)
    }
  }, [previewDisabled])

  const buttonClassName = cn(
    'group/citation relative mx-0.5 inline-flex min-h-7 cursor-pointer items-center rounded-md border px-1.5 py-0.5 align-baseline text-[0.95em] font-semibold leading-normal underline decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#241f32]',
    previewDisabled
      ? 'transition-none active:scale-100'
      : 'transition-all duration-150 active:scale-[0.98]',
    isKnown &&
      cn(
        'border-emerald-200 bg-emerald-50/80 text-emerald-800 decoration-emerald-500 focus-visible:ring-emerald-500 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-100 dark:decoration-emerald-300',
        !previewDisabled && 'hover:border-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-400/15'
      ),
    isUnknown &&
      cn(
        'border-amber-200 bg-amber-50/80 text-amber-800 decoration-amber-500 focus-visible:ring-amber-500 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100 dark:decoration-amber-300',
        !previewDisabled && 'hover:border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-400/15'
      ),
    !isKnown &&
      !isUnknown &&
      cn(
        'border-slate-200 bg-slate-50 text-slate-700 decoration-slate-400 focus-visible:ring-slate-400 dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-200 dark:decoration-slate-300',
        !previewDisabled && 'hover:border-slate-300 hover:bg-slate-100 dark:hover:bg-iris-300/10'
      )
  )

  const preview = useMemo(() => <CitationPreview citation={citation} />, [citation])
  const openPreview = () => {
    if (!previewDisabled) {
      setIsPreviewOpen(true)
    }
  }
  const closePreview = () => setIsPreviewOpen(false)

  return (
    <>
      <span className="relative inline-flex">
        <button
          type="button"
          className={buttonClassName}
          aria-label={`Open citation details for RA ${citation.number}`}
          aria-describedby={!previewDisabled && isPreviewOpen ? previewId : undefined}
          data-legal-citation={citation.number}
          data-citation-status={citation.status}
          data-citation-preview-disabled={previewDisabled ? 'true' : undefined}
          onClick={() => setIsDialogOpen(true)}
          onMouseEnter={openPreview}
          onMouseLeave={closePreview}
          onFocus={openPreview}
          onBlur={closePreview}
        >
          <BookOpen className="mr-1 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {displayText}
        </button>

        {!previewDisabled && isPreviewOpen && (
          <span
            id={previewId}
            role="tooltip"
            data-citation-preview={citation.number}
            className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 hidden w-72 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-slate-700 shadow-xl shadow-slate-950/15 dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-200 dark:shadow-iris-950/35 sm:block"
          >
            <span className="mb-2 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[0.68rem] font-semibold uppercase text-slate-500 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-300">
              {statusLabel}
            </span>
            {preview}
          </span>
        )}
      </span>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bottom-0 left-0 top-auto max-h-[88dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-b-none rounded-t-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-iris-300/15 dark:bg-[#171322] sm:bottom-auto sm:left-[50%] sm:top-[50%] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-xl">
          <DialogHeader
            className={cn(
              'border-b px-5 py-5 pr-12 text-left sm:px-6',
              isKnown && 'border-emerald-200 bg-emerald-50 dark:border-emerald-400/25 dark:bg-emerald-400/10',
              isUnknown && 'border-amber-200 bg-amber-50 dark:border-amber-400/25 dark:bg-amber-400/10',
              !isKnown && !isUnknown && 'border-slate-200 bg-slate-50 dark:border-iris-300/15 dark:bg-[#241f32]'
            )}
          >
            <DialogTitle className="flex items-center gap-2 text-xl font-bold leading-tight text-slate-950 dark:text-slate-100">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              RA {citation.number}
            </DialogTitle>
            <DialogDescription className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-300">
              {statusLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 overflow-y-auto px-5 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:px-6">
            <CitationInspectorContent citation={citation} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
