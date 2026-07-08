/**
 * Framework-specific report templates (Deliverable P2-2).
 *
 * Pure, dependency-free, side-effect-free helpers that map a compliance report
 * (its RAG response and/or markdown body) to one of the bundled
 * {@link COMPLIANCE_FRAMEWORKS}. When a framework is confidently identified the
 * caller can surface that framework's structured checklist/sections.
 *
 * The module only reads the static local-research-data arrays and does not
 * import any React/runtime/browser code, so it is unit-testable directly in
 * Node.
 */

import type { LocalComplianceFramework } from './types'
import { COMPLIANCE_FRAMEWORKS } from './compliance-frameworks'
import { LEGAL_CORPUS } from './corpus'

/**
 * Structural, narrowed view of the fields we read from a RAG response. Defined
 * locally (rather than importing `RAGResponse`) so this module stays free of
 * any runtime dependency on the RAG service. A full `RAGResponse` structurally
 * satisfies this type.
 */
export interface FrameworkDetectionRagResponse {
  summary?: string
  search_queries_used?: string[]
  matched_documents?: Array<{
    statute?: string
    title?: string
  }>
}

export interface FrameworkDetectionInput {
  /** Rendered report markdown/body, if available. */
  content?: string | null
  /** RAG response backing the report, if available. */
  ragResponse?: FrameworkDetectionRagResponse | null
  /** Search queries used for the report (supplements ragResponse). */
  searchQueries?: string[] | null
}

export type FrameworkConfidence = 'high' | 'medium' | 'low'

export interface FrameworkMatch {
  framework: LocalComplianceFramework
  /** Weighted relevance score (higher is stronger). */
  score: number
  confidence: FrameworkConfidence
  /** Framework lawIds that were retrieved as source documents. */
  matchedLawIds: string[]
  /** Distinct framework triggers found in the report text. */
  matchedTriggers: string[]
  signals: {
    /** Framework lawIds present among the matched documents. */
    documentHits: number
    /** Distinct triggers matched in the report text. */
    triggerHits: number
    /** Whether the framework title appeared verbatim in the report text. */
    titleHit: boolean
  }
}

export interface FrameworkTemplateSection {
  heading: string
  items: string[]
}

export interface FrameworkTemplateView {
  id: string
  title: string
  summary: string
  sections: FrameworkTemplateSection[]
}

export interface SelectFrameworksOptions {
  /** Maximum number of matches to return. Defaults to 3. */
  limit?: number
  /**
   * Minimum score required for a framework to be returned. Defaults to
   * {@link MIN_CONFIDENT_SCORE}. Set to 0 to disable graceful degradation.
   */
  minScore?: number
}

// Scoring weights. Document retrieval is the most trustworthy signal because
// those authorities are what the RAG pipeline actually surfaced; triggers and a
// verbatim title mention are corroborating textual signals.
const WEIGHT_DOCUMENT_HIT = 3
const WEIGHT_TITLE_HIT = 4
const WEIGHT_TRIGGER_HIT = 1
// Triggers can be numerous and partly generic, so cap their contribution.
const MAX_TRIGGER_HITS_COUNTED = 4

const MIN_CONFIDENT_SCORE = 3
const DEFAULT_LIMIT = 3

/** Map a corpus `statute` string (or `title`) to its canonical document id. */
const STATUTE_TO_ID = buildStatuteIndex()

function buildStatuteIndex(): Map<string, string> {
  const index = new Map<string, string>()
  for (const doc of LEGAL_CORPUS) {
    if (doc.statute) index.set(normalizeText(doc.statute), doc.id)
    if (doc.title) index.set(normalizeText(doc.title), doc.id)
    for (const alias of doc.aliases ?? []) {
      if (alias) index.set(normalizeText(alias), doc.id)
    }
  }
  return index
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Resolve the set of corpus document ids referenced by a RAG response's matched
 * documents, keyed by their statute/title strings.
 */
function resolveMatchedLawIds(rag: FrameworkDetectionRagResponse | null | undefined): Set<string> {
  const ids = new Set<string>()
  for (const doc of rag?.matched_documents ?? []) {
    const byStatute = doc.statute ? STATUTE_TO_ID.get(normalizeText(doc.statute)) : undefined
    if (byStatute) ids.add(byStatute)
    const byTitle = doc.title ? STATUTE_TO_ID.get(normalizeText(doc.title)) : undefined
    if (byTitle) ids.add(byTitle)
  }
  return ids
}

/** Combine every textual signal from the report into one lowercased haystack. */
function buildHaystack(input: FrameworkDetectionInput): string {
  const parts: string[] = []
  if (input.content) parts.push(input.content)
  if (input.ragResponse?.summary) parts.push(input.ragResponse.summary)
  for (const q of input.ragResponse?.search_queries_used ?? []) parts.push(q)
  for (const q of input.searchQueries ?? []) parts.push(q)
  return normalizeText(parts.join('\n'))
}

/** Whole-word (phrase) containment test against a prepared lowercased haystack. */
function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = normalizeText(phrase)
  if (!needle) return false
  // Word-boundary match so short triggers (e.g. "dpo") don't match inside words.
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}([^a-z0-9]|$)`)
  return pattern.test(haystack)
}

function classifyConfidence(signals: FrameworkMatch['signals']): FrameworkConfidence {
  const { documentHits, triggerHits, titleHit } = signals
  if (titleHit || documentHits >= 2 || (documentHits >= 1 && triggerHits >= 2)) {
    return 'high'
  }
  if (documentHits >= 1 || triggerHits >= 2) {
    return 'medium'
  }
  return 'low'
}

/**
 * Identify the bundled compliance framework(s) most relevant to a report.
 *
 * Detection combines two signals:
 *  1. Document retrieval — framework `lawIds` that appear among the RAG
 *     response's matched documents (authoritative).
 *  2. Text matching — framework `triggers` and a verbatim `title` mention found
 *     in the report content / summary / search queries (corroborating).
 *
 * Returns matches sorted strongest-first. Degrades gracefully: returns an empty
 * array when no framework clears the confidence threshold.
 */
export function selectComplianceFrameworks(
  input: FrameworkDetectionInput,
  options: SelectFrameworksOptions = {}
): FrameworkMatch[] {
  const limit = options.limit ?? DEFAULT_LIMIT
  const minScore = options.minScore ?? MIN_CONFIDENT_SCORE

  const matchedLawIds = resolveMatchedLawIds(input.ragResponse)
  const haystack = buildHaystack(input)

  if (matchedLawIds.size === 0 && !haystack) {
    return []
  }

  // Track the corpus ordering alongside each match for a stable tiebreaker.
  const scored: Array<{ match: FrameworkMatch; order: number }> = []

  COMPLIANCE_FRAMEWORKS.forEach((framework, order) => {
    const frameworkLawHits = framework.lawIds.filter((id) => matchedLawIds.has(id))

    const triggerHitsList: string[] = []
    if (haystack) {
      for (const trigger of framework.triggers) {
        if (containsPhrase(haystack, trigger)) {
          triggerHitsList.push(trigger)
        }
      }
    }

    const titleHit = haystack ? containsPhrase(haystack, framework.title) : false

    const documentHits = frameworkLawHits.length
    const triggerHits = triggerHitsList.length

    const score =
      documentHits * WEIGHT_DOCUMENT_HIT +
      Math.min(triggerHits, MAX_TRIGGER_HITS_COUNTED) * WEIGHT_TRIGGER_HIT +
      (titleHit ? WEIGHT_TITLE_HIT : 0)

    if (score <= 0 || score < minScore) return

    const signals = { documentHits, triggerHits, titleHit }

    scored.push({
      order,
      match: {
        framework,
        score,
        confidence: classifyConfidence(signals),
        matchedLawIds: frameworkLawHits,
        matchedTriggers: triggerHitsList,
        signals,
      },
    })
  })

  return scored
    .sort((a, b) => (b.match.score !== a.match.score ? b.match.score - a.match.score : a.order - b.order))
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.match)
}

/**
 * Convenience wrapper returning the single most relevant framework match, or
 * `null` when none is confidently identified.
 */
export function selectPrimaryFramework(
  input: FrameworkDetectionInput,
  options: SelectFrameworksOptions = {}
): FrameworkMatch | null {
  const [primary] = selectComplianceFrameworks(input, { ...options, limit: 1 })
  return primary ?? null
}

/**
 * Build a normalized, presentation-ready template view for a framework: its
 * title/summary plus its recommended sequence and checkpoint sections read from
 * {@link COMPLIANCE_FRAMEWORKS}. Returns `null` when the framework is unknown or
 * carries no checklist content.
 */
export function getFrameworkTemplate(
  framework: string | LocalComplianceFramework | null | undefined
): FrameworkTemplateView | null {
  if (!framework) return null

  const resolved: LocalComplianceFramework | undefined =
    typeof framework === 'string'
      ? COMPLIANCE_FRAMEWORKS.find((entry) => entry.id === framework)
      : framework

  if (!resolved) return null

  const sections: FrameworkTemplateSection[] = []

  const sequence = (resolved.sequence ?? []).filter((item) => item.trim().length > 0)
  if (sequence.length > 0) {
    sections.push({ heading: 'Recommended sequence', items: sequence })
  }

  const checkpoints = (resolved.checkpoints ?? []).filter((item) => item.trim().length > 0)
  if (checkpoints.length > 0) {
    sections.push({ heading: 'Checkpoints', items: checkpoints })
  }

  if (sections.length === 0) return null

  return {
    id: resolved.id,
    title: resolved.title,
    summary: resolved.summary,
    sections,
  }
}
