export type LocalLegalDocument = {
  id: string
  statute: string
  title: string
  shortTitle: string
  year: number
  sourceName: string
  sourceUrl: string
  authorityType?: 'statute' | 'regulation' | 'advisory' | 'court-framework' | 'executive-issuance' | 'rule'
  sourceTier?: 'official-primary' | 'official-guidance' | 'official-summary' | 'local-reference'
  lastVerified?: string
  sourceNotes?: string
  aliases: string[]
  topics: string[]
  keywords: string[]
  summary: string
  obligations: string[]
  commonGaps: string[]
}

export type LocalComplianceFramework = {
  id: string
  title: string
  triggers: string[]
  lawIds: string[]
  summary: string
  sequence: string[]
  checkpoints: string[]
}


export type LocalTopicExpansion = {
  triggers: string[]
  expansions: string[]
}

export type LocalProvenanceStatus = 'verified' | 'seeded' | 'needs-review'

export type LocalEvidenceSupportType =
  | 'summary'
  | 'obligation'
  | 'gap'
  | 'definition'
  | 'procedure'
  | 'penalty'
  | 'source'

export type LocalAuthoritySource = {
  authorityId: string
  sourceName: string
  sourceUrl: string
  authorityType: NonNullable<LocalLegalDocument['authorityType']>
  sourceTier: NonNullable<LocalLegalDocument['sourceTier']>
  lastVerified: string
  provenanceStatus: LocalProvenanceStatus
  catalogTags: string[]
  provenanceNotes?: string
}

export type LocalEvidenceAnchor = {
  authorityId: string
  label: string
  supports: LocalEvidenceSupportType[]
  note: string
}

export type LocalAuthorityRelationType =
  | 'amends'
  | 'implements'
  | 'cross_references'
  | 'agency_guidance_for'
  | 'workflow_related_to'
  | 'supersedes'
  | 'requires'

export type LocalAuthorityRelation = {
  sourceId: string
  targetId: string
  type: LocalAuthorityRelationType
  label: string
  weight: number
}

export type LocalCoverageStatus = 'golden' | 'draft' | 'framework' | 'seeded'

export type LocalAuthorityCoverage = {
  authorityId: string
  coverageStatus: LocalCoverageStatus
  goldenQueryLabels: string[]
  draftCheckCovered: boolean
  frameworkIds: string[]
  notes?: string
}
