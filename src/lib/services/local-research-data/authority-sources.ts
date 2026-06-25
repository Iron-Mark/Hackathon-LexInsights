import { LEGAL_CORPUS } from './corpus'
import type { LocalAuthoritySource, LocalLegalDocument, LocalProvenanceStatus } from './types'

const DEFAULT_LAST_VERIFIED = '2026-06-25'

const PROVENANCE_NOTES: Partial<Record<string, string>> = {
  'npc-circular-16-03': 'Official NPC breach-management circular in the bundled local corpus.',
  'npc-advisory-2026-02': 'Official NPC DBNMS breach-notification advisory in the bundled local corpus.',
  'npc-circular-2023-06': 'Official NPC personal-data security circular in the bundled local corpus.',
  'npc-circular-2023-04': 'Official NPC consent circular in the bundled local corpus.',
  'npc-circular-2022-04': 'Official NPC registration, DPO, and automated-decision circular in the bundled local corpus.',
  'npc-circular-2020-03': 'Official NPC data-sharing agreement circular in the bundled local corpus.',
  'npc-advisory-2025-02': 'Official NPC privacy-engineering advisory in the bundled local corpus.',
  'npc-advisory-2024-04': 'Official NPC guidance source in the bundled local corpus.',
  'sc-ai-governance-framework-2026': 'Official Supreme Court publication summarized as local providerless guidance.',
  'ra-9442': 'Official Lawphil PWD privileges amendment in the bundled local corpus.',
  'ra-10070': 'Official Lawphil PDAO local implementation statute in the bundled local corpus.',
  'ra-10524': 'Official Lawphil PWD employment amendment in the bundled local corpus.',
  'ra-10754': 'Official Lawphil PWD benefits and VAT-exemption statute in the bundled local corpus.',
}

function getAuthorityType(document: LocalLegalDocument): NonNullable<LocalLegalDocument['authorityType']> {
  return document.authorityType || 'statute'
}

function getSourceTier(document: LocalLegalDocument): NonNullable<LocalLegalDocument['sourceTier']> {
  return document.sourceTier || 'official-primary'
}

function getProvenanceStatus(document: LocalLegalDocument): LocalProvenanceStatus {
  if (document.lastVerified || document.sourceTier === 'official-guidance' || document.sourceTier === 'official-summary') {
    return 'verified'
  }

  return 'seeded'
}

function getCatalogTags(document: LocalLegalDocument) {
  return [
    getAuthorityType(document),
    getSourceTier(document),
    ...document.topics.slice(0, 4),
  ]
}

export const AUTHORITY_SOURCES: LocalAuthoritySource[] = LEGAL_CORPUS.map((document) => ({
  authorityId: document.id,
  sourceName: document.sourceName,
  sourceUrl: document.sourceUrl,
  authorityType: getAuthorityType(document),
  sourceTier: getSourceTier(document),
  lastVerified: document.lastVerified || DEFAULT_LAST_VERIFIED,
  provenanceStatus: getProvenanceStatus(document),
  catalogTags: getCatalogTags(document),
  provenanceNotes: PROVENANCE_NOTES[document.id],
}))
