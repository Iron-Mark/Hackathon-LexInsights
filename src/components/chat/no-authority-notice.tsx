'use client'

import { AlertTriangle } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Minimal shape needed to decide whether an assistant response resolved to at
 * least one authority in the bundled local corpus. This intentionally mirrors
 * the fields on `RAGResponse` / `Message['metadata']['ragResponse']` without
 * coupling to either exact type, so both general chat and compliance mode can
 * share the same guarantee.
 */
type RagResponseLike = {
  status?: string
  matched_documents?: Array<unknown> | null
  retrieval_metadata?: {
    citation_numbers?: string[]
    known_citation_numbers?: string[]
  } | null
}

/**
 * A response "resolves to a corpus authority" when it either matched at least
 * one document in the local corpus, or reported at least one citation number
 * that is known to that corpus. Unknown / unresolved citation numbers do NOT
 * count as authority — they are unsupported mentions.
 */
export function hasResolvedCorpusAuthority(ragResponse?: RagResponseLike | null): boolean {
  if (!ragResponse) {
    return false
  }

  if (Array.isArray(ragResponse.matched_documents) && ragResponse.matched_documents.length > 0) {
    return true
  }

  const knownCitations = ragResponse.retrieval_metadata?.known_citation_numbers
  if (Array.isArray(knownCitations) && knownCitations.length > 0) {
    return true
  }

  return false
}

/**
 * Decide whether the explicit "no supporting authority" notice must be shown.
 *
 * The notice is guaranteed whenever a response carried retrieval metadata (i.e.
 * it is a research / compliance answer) but did not resolve to any corpus
 * authority. This covers:
 *   - `status === 'no_results'`
 *   - `status === 'error'`
 *   - a `'completed'` answer whose only citations are unknown / unresolved
 *
 * When there is no RAG response at all there is nothing to assert, so no notice
 * is rendered.
 */
export function shouldShowNoAuthorityNotice(ragResponse?: RagResponseLike | null): boolean {
  if (!ragResponse) {
    return false
  }

  return !hasResolvedCorpusAuthority(ragResponse)
}

/**
 * Explicit, always-visible notice rendered in place of inline citations when a
 * response is not backed by any local corpus authority. Styled to match the
 * amber AI-disclaimer / warning notices used elsewhere in the app.
 */
export function NoAuthorityNotice({ className }: { className?: string }) {
  return (
    <div
      role="note"
      aria-label="No supporting authority found"
      data-no-authority-notice="true"
      className={cn(
        'my-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/95 p-3 text-left shadow-sm shadow-amber-950/5 dark:border-amber-400/30 dark:bg-amber-950/40',
        className
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-sm font-semibold text-amber-950 dark:text-amber-100">
          No supporting authority found
        </h3>
        <p className="font-body mt-1 text-xs leading-5 text-amber-800 dark:text-amber-200">
          No supporting authority was found in the local corpus for this response. Verify this
          against official sources and qualified counsel before relying on it.
        </p>
      </div>
    </div>
  )
}
