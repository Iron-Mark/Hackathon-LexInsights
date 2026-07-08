/**
 * AI-use disclosure builder (PRD requirement P0-3).
 *
 * Grounded in A.M. No. 25-11-28-SC, the Philippine Supreme Court's Governance
 * Framework on the Use of Human-Centered Augmented Intelligence in the
 * Judiciary (En Banc Resolution dated 18 February 2026). That framework
 * requires anyone who uses AI to prepare court documents to declare four
 * things:
 *   1. which tool was used,
 *   2. its version,
 *   3. the reason for its use, and
 *   4. the degree of human oversight applied.
 * It also holds that AI output cannot be the sole basis for a ruling, and that
 * confidential, privileged, or sensitive information must not be entered into
 * an AI tool without authority.
 *
 * This module turns provenance the app already has (provider mode, cited
 * authorities with verification dates, app version) into a disclosure artifact
 * a user can attach to a compliance report or court-bound work. It is a pure
 * builder: the caller supplies `generatedAt`, so output is deterministic and
 * testable. It is NOT wired into the UI yet.
 *
 * The generated wording is a working draft. Review it against the official
 * issuance before relying on it for a filing:
 * https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/11/101138
 */

export type RagProviderMode = 'local-providerless' | 'remote-rag'

export interface DisclosureAuthority {
  /** e.g. "RA 10173" */
  citation: string
  /** Canonical source URL, e.g. a Lawphil page. */
  sourceUrl?: string | null
  /** ISO date the source was last verified, e.g. "2026-06-25". */
  verifiedAt?: string | null
}

export interface AiUseDisclosureInput {
  /** Defaults to "LexInsights". */
  tool?: string
  /** App version, e.g. "0.5.2". */
  version: string
  /** Which research mode produced the output. */
  providerMode: RagProviderMode
  /** Plain-language reason the tool was used (SC requirement 3). */
  reason: string
  /** Degree of human oversight applied (SC requirement 4). */
  humanOversight: string
  /** Authorities cited in the output, with verification dates where known. */
  citedAuthorities?: DisclosureAuthority[]
  /** ISO timestamp supplied by the caller (keeps this builder pure). */
  generatedAt: string
}

export interface AiUseDisclosure {
  tool: string
  version: string
  providerMode: RagProviderMode
  /**
   * Whether a generative model was invoked. False in local-providerless mode,
   * which is deterministic template generation with no model in the loop.
   */
  modelInvoked: boolean
  reason: string
  humanOversight: string
  citedAuthorities: DisclosureAuthority[]
  generatedAt: string
}

const DEFAULT_TOOL = 'LexInsights'

/**
 * Assemble a structured AI-use disclosure from report provenance.
 * `modelInvoked` is derived: only remote-rag mode can invoke a model.
 */
export function buildAiUseDisclosure(input: AiUseDisclosureInput): AiUseDisclosure {
  return {
    tool: input.tool?.trim() || DEFAULT_TOOL,
    version: input.version,
    providerMode: input.providerMode,
    modelInvoked: input.providerMode !== 'local-providerless',
    reason: input.reason,
    humanOversight: input.humanOversight,
    citedAuthorities: input.citedAuthorities ?? [],
    generatedAt: input.generatedAt,
  }
}

function describeMode(disclosure: AiUseDisclosure): string {
  if (!disclosure.modelInvoked) {
    return 'Local providerless mode (deterministic retrieval from a bundled corpus; no generative AI model was invoked).'
  }
  return 'Remote RAG mode (a configured external retrieval-augmented provider was queried, which may invoke a generative model).'
}

function renderAuthorityLine(authority: DisclosureAuthority): string {
  const parts = [authority.citation]
  if (authority.verifiedAt) {
    parts.push(`source last verified ${authority.verifiedAt}`)
  }
  if (authority.sourceUrl) {
    parts.push(authority.sourceUrl)
  }
  return `- ${parts.join(' — ')}`
}

/**
 * Render the disclosure as a Markdown block suitable for attaching to a
 * compliance report export. Covers the four A.M. No. 25-11-28-SC declarations
 * plus provenance and the standing caveats.
 */
export function renderAiUseDisclosureMarkdown(disclosure: AiUseDisclosure): string {
  const lines: string[] = []

  lines.push('## AI-Use Disclosure')
  lines.push('')
  lines.push(
    'Prepared under the Philippine Supreme Court Governance Framework on the Use of ' +
      'Human-Centered Augmented Intelligence in the Judiciary (A.M. No. 25-11-28-SC).'
  )
  lines.push('')
  lines.push(`- **Tool used:** ${disclosure.tool}`)
  lines.push(`- **Version:** ${disclosure.version}`)
  lines.push(`- **Reason for use:** ${disclosure.reason}`)
  lines.push(`- **Degree of human oversight:** ${disclosure.humanOversight}`)
  lines.push(`- **Research mode:** ${describeMode(disclosure)}`)
  lines.push(`- **Generative model invoked:** ${disclosure.modelInvoked ? 'Yes' : 'No'}`)
  lines.push(`- **Generated:** ${disclosure.generatedAt}`)
  lines.push('')

  if (disclosure.citedAuthorities.length > 0) {
    lines.push('**Authorities cited in this output:**')
    lines.push('')
    for (const authority of disclosure.citedAuthorities) {
      lines.push(renderAuthorityLine(authority))
    }
    lines.push('')
  }

  lines.push(
    'This output is a research aid, not legal advice, and must not serve as the sole ' +
      'basis for any ruling or filing. Verify every citation against the official source ' +
      'and qualified counsel before use. Do not enter confidential, privileged, or ' +
      'sensitive information into any AI tool without authority.'
  )

  return lines.join('\n')
}
