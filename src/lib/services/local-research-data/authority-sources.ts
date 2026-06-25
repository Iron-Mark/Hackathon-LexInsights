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
  'dole-do-147-15': 'Official DOLE termination and Book VI implementing guidance in the bundled local corpus; verify current DOLE/NLRC guidance before operational use.',
  'dole-do-174-17': 'Official DOLE contracting and subcontracting guidance in the bundled local corpus; verify current contractor registration and labor-only contracting guidance before operational use.',
  'dole-do-198-18': 'Official DOLE OSH implementing guidance for RA 11058 in the bundled local corpus; verify current OSH standards, forms, and thresholds before operational use.',
  'sec-mc-28-2020': 'Official SEC memorandum circular for designated email and cellphone contacts; verify current MC28 portal and later SEC issuances before filing.',
  'dti-jao-24-03-2024': 'Official DTI-led Internet Transactions Act implementing rules in the bundled local corpus; verify current E-Commerce Bureau, DTI, and sector-agency advisories before operational use.',
  'bsp-circular-1108-2021': 'Official BSP virtual asset service provider guidance in the bundled local corpus; verify current BSP/AMLC virtual-asset guidance and registration status before operational use.',
  'bsp-circular-1140-2022': 'Official BSP fraud-management system guidance in the bundled local corpus; verify current BSP technology-risk and fraud-reporting expectations before operational use.',
  'bsp-circular-1160-2022': 'Official BSP financial consumer protection implementing regulations in the bundled local corpus; verify current Manual of Regulations amendments and BSP issuances before operational use.',
  'bsp-circular-1169-2023': 'Official BSP consumer assistance mechanism guidance in the bundled local corpus; verify current BSP complaint categories, reporting forms, and supervisory expectations before operational use.',
  'ra-12023': 'Official Lawphil VAT on digital services statute in the bundled local corpus.',
  'bir-rr-2025-03': 'Official BIR implementing regulations for VAT on digital services; verify against current BIR issuances before relying on operational details.',
  'bir-rmc-2025-47': 'Official BIR circular guidance for digital-services VAT implementation; verify against current BIR issuances before relying on form or portal details.',
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
