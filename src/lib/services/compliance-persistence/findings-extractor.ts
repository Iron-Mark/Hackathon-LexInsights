/**
 * Findings extraction for server-side persistence (PRD P0-1).
 *
 * Turns a compliance report into normalized rows for public.report_findings.
 * Two sources, in order of fidelity:
 *
 *  1. The structured draft-checker analysis (green/amber/red Finding arrays
 *     from runLocalDraftCheck or the remote checker) — exact, preferred.
 *  2. The rendered report markdown (formatDraftCheckerReport conventions in
 *     chat-container.tsx) — fallback for edited saves, where only the edited
 *     markdown exists.
 *
 * Practical Checklist bullets become `isChecklist` rows in both paths (the
 * markdown is the only place they exist; see
 * src/lib/utils/practical-checklist.ts for the rendering-side convention).
 *
 * Pure and dependency-free (structural types only, no imports) so the module
 * is directly unit-testable in Node and safe for the standalone-transpile
 * self-test loader.
 */

export type FindingSeedSeverity = 'green' | 'amber' | 'red'

/**
 * A finding ready for persistence, minus the reportId/userId that the sync
 * layer stamps on. Field names mirror NewReportFinding in ./types.
 */
export interface FindingSeed {
  severity: FindingSeedSeverity
  title: string
  detail: string | null
  authorityCitation: string | null
  authoritySourceUrl: string | null
  checklistItem: string | null
  isChecklist: boolean
  isChecked: boolean
  position: number
}

/**
 * Structural view of one draft-checker finding. A full `Finding` from
 * src/lib/services/rag-api.ts structurally satisfies this type.
 */
export interface DraftFindingLike {
  status?: string
  title?: string
  description?: string
  references?: string[]
  recommendation?: string
}

/**
 * Structural view of the draft-checker analysis. A full `DraftAnalysis` from
 * src/lib/services/rag-api.ts structurally satisfies this type.
 */
export interface DraftAnalysisLike {
  green_findings?: DraftFindingLike[]
  amber_findings?: DraftFindingLike[]
  red_findings?: DraftFindingLike[]
}

const SEVERITIES: readonly FindingSeedSeverity[] = ['green', 'amber', 'red']

function isSeverity(value: string): value is FindingSeedSeverity {
  return (SEVERITIES as readonly string[]).includes(value)
}

function buildDetail(description?: string, recommendation?: string): string | null {
  const parts: string[] = []
  if (description?.trim()) parts.push(description.trim())
  if (recommendation?.trim()) parts.push(`Recommendation: ${recommendation.trim()}`)
  return parts.length > 0 ? parts.join('\n\n') : null
}

function seedFromFinding(
  finding: DraftFindingLike,
  fallbackSeverity: FindingSeedSeverity,
  position: number
): FindingSeed {
  const status = (finding.status ?? '').trim().toLowerCase()
  const references = (finding.references ?? []).map((ref) => ref.trim()).filter(Boolean)

  return {
    severity: isSeverity(status) ? status : fallbackSeverity,
    title: finding.title?.trim() || 'Untitled finding',
    detail: buildDetail(finding.description, finding.recommendation),
    authorityCitation: references.length > 0 ? references.join('; ') : null,
    authoritySourceUrl: null,
    checklistItem: null,
    isChecklist: false,
    isChecked: false,
    position,
  }
}

/**
 * Extract normalized finding seeds from the structured draft-checker analysis.
 * Ordering follows the rendered report: green, then amber, then red.
 */
export function extractFindingSeedsFromAnalysis(analysis: DraftAnalysisLike): FindingSeed[] {
  const seeds: FindingSeed[] = []
  const groups: Array<[FindingSeedSeverity, DraftFindingLike[] | undefined]> = [
    ['green', analysis.green_findings],
    ['amber', analysis.amber_findings],
    ['red', analysis.red_findings],
  ]

  for (const [severity, findings] of groups) {
    for (const finding of findings ?? []) {
      seeds.push(seedFromFinding(finding, severity, seeds.length))
    }
  }

  return seeds
}

// ---------------------------------------------------------------------------
// Markdown fallback parser
// ---------------------------------------------------------------------------
// Mirrors formatDraftCheckerReport in src/components/chat/chat-container.tsx:
//
//   ## Green Findings
//   ### 1. <title>
//   - Status: green
//   - Category: gap
//   - Severity Score: 6
//   - Description: <text>
//   - References: <ref>; <ref>
//   - Recommendation: <text>
//
// and the Practical Checklist convention (a "Practical Checklist" heading
// followed by "- item" / "- [ ] item" bullets) from practical-checklist.ts.

const FINDINGS_SECTION_PATTERN = /^#{2,3}\s*(green|amber|red)\s+findings\s*$/i
const FINDING_TITLE_PATTERN = /^#{3,4}(?!#)\s*(?:\d+[.)]\s*)?(.+)$/
const FIELD_PATTERN = /^[-*]\s*(status|category|severity score|description|references|recommendation)\s*:\s*(.*)$/i
const CHECKLIST_HEADING_PATTERN = /^(?:#{1,6}\s*)?(?:\*\*)?practical checklist(?:\*\*)?\s*:?\s*$/i
const HEADING_PATTERN = /^#{1,6}\s+\S/
const CHECKLIST_BULLET_PATTERN = /^\s*[-*•]\s+(?:\[[ xX]\]\s+)?(.+)$/
// Research summaries follow "Practical Checklist" with bare-label sections
// rather than '#' headings; mirror isChecklistEndHeading in
// src/lib/utils/practical-checklist.ts so those bullets don't bleed into the
// persisted checklist.
const CHECKLIST_END_LABEL_PATTERN =
  /^(?:\*\*)?(Answer|Better Search|Citation Coverage|Common Drafting or Compliance Gaps to Check|Gaps To Avoid|How This Was Found|Limits|Provider Mode|Relevant Authorities|Likely Relevant Authorities|Result|To Make This More Precise|What You Can Try)(?:\*\*)?\s*:?\s*$/i

interface ParsedFindingBlock {
  severity: FindingSeedSeverity
  title: string
  fields: Record<string, string>
}

function flushBlock(blocks: ParsedFindingBlock[], block: ParsedFindingBlock | null) {
  if (block) blocks.push(block)
}

/**
 * Extract normalized finding seeds from rendered report markdown. Used when a
 * structured analysis is unavailable (e.g. an edited save). Returns findings
 * from the Green/Amber/Red sections plus Practical Checklist bullets as
 * checklist rows. Unrecognized markdown yields an empty array, never throws.
 */
export function extractFindingSeedsFromMarkdown(markdown: string): FindingSeed[] {
  const lines = markdown.split('\n')
  const blocks: ParsedFindingBlock[] = []
  const checklistItems: string[] = []

  let currentSeverity: FindingSeedSeverity | null = null
  let currentBlock: ParsedFindingBlock | null = null
  let insideChecklist = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    const sectionMatch = line.match(FINDINGS_SECTION_PATTERN)
    if (sectionMatch) {
      flushBlock(blocks, currentBlock)
      currentBlock = null
      currentSeverity = sectionMatch[1].toLowerCase() as FindingSeedSeverity
      insideChecklist = false
      continue
    }

    if (CHECKLIST_HEADING_PATTERN.test(line)) {
      flushBlock(blocks, currentBlock)
      currentBlock = null
      currentSeverity = null
      insideChecklist = true
      continue
    }

    if (insideChecklist) {
      if (HEADING_PATTERN.test(line) || CHECKLIST_END_LABEL_PATTERN.test(line)) {
        insideChecklist = false
        // Fall through: the heading may start a findings section next loop
        // iteration only; here it simply ends the checklist scope.
      } else {
        const bulletMatch = line.match(CHECKLIST_BULLET_PATTERN)
        if (bulletMatch && bulletMatch[1].trim()) {
          checklistItems.push(bulletMatch[1].trim())
        }
        continue
      }
    }

    if (currentSeverity) {
      // A top-level heading (e.g. "## Legal Disclaimer") ends the section;
      // deeper #####/###### notes are skipped as ordinary content below.
      if (/^#{1,2}(?!#)\s+\S/.test(line)) {
        flushBlock(blocks, currentBlock)
        currentBlock = null
        currentSeverity = null
        continue
      }

      const titleMatch = line.match(FINDING_TITLE_PATTERN)
      if (titleMatch && line.startsWith('#')) {
        flushBlock(blocks, currentBlock)
        currentBlock = {
          severity: currentSeverity,
          title: titleMatch[1].trim(),
          fields: {},
        }
        continue
      }

      const fieldMatch = line.match(FIELD_PATTERN)
      if (fieldMatch && currentBlock) {
        currentBlock.fields[fieldMatch[1].toLowerCase()] = fieldMatch[2].trim()
        continue
      }
    }
  }

  flushBlock(blocks, currentBlock)

  const seeds: FindingSeed[] = blocks.map((block, index) => {
    const references = (block.fields['references'] ?? '')
      .split(';')
      .map((ref) => ref.trim())
      .filter((ref) => ref && !/^none( provided)?$/i.test(ref))
    const status = (block.fields['status'] ?? '').toLowerCase()

    return {
      severity: isSeverity(status) ? status : block.severity,
      title: block.title || 'Untitled finding',
      detail: buildDetail(block.fields['description'], block.fields['recommendation']),
      authorityCitation: references.length > 0 ? references.join('; ') : null,
      authoritySourceUrl: null,
      checklistItem: null,
      isChecklist: false,
      isChecked: false,
      position: index,
    }
  })

  for (const item of checklistItems) {
    seeds.push({
      // Checklist entries are pending actions, so they persist as amber.
      severity: 'amber',
      title: item,
      detail: null,
      authorityCitation: null,
      authoritySourceUrl: null,
      checklistItem: item,
      isChecklist: true,
      isChecked: false,
      position: seeds.length,
    })
  }

  return seeds
}

/**
 * Preferred entry point: structured analysis when available, markdown
 * otherwise. Checklist bullets only exist in the markdown, so the markdown's
 * checklist rows are merged in even when the structured analysis is used.
 */
export function extractFindingSeeds(input: {
  analysis?: DraftAnalysisLike | null
  markdown?: string | null
}): FindingSeed[] {
  const fromMarkdown = input.markdown ? extractFindingSeedsFromMarkdown(input.markdown) : []

  if (!input.analysis) {
    return fromMarkdown
  }

  const seeds = extractFindingSeedsFromAnalysis(input.analysis)
  for (const seed of fromMarkdown) {
    if (seed.isChecklist) {
      seeds.push({ ...seed, position: seeds.length })
    }
  }

  return seeds
}
