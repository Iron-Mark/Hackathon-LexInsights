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
