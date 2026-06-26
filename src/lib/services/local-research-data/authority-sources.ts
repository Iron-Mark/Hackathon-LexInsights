import { LEGAL_CORPUS } from './corpus'
import type { LocalAuthoritySource, LocalLegalDocument, LocalProvenanceStatus } from './types'

const DEFAULT_LAST_VERIFIED = '2026-06-25'

const PROVENANCE_NOTES: Partial<Record<string, string>> = {
  'npc-irr-2016': 'Official NPC Data Privacy Act implementing rules in the bundled local corpus; verify current NPC circulars and portal procedures before operational use.',
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
  'sec-mc-01-2021': 'Official SEC beneficial ownership transparency circular in the bundled local corpus; verify current BO disclosure rules, HARBOR portal instructions, entity records, and later SEC issuances before filing.',
  'sec-mc-15-2025': 'Official SEC revised beneficial ownership disclosure rules in the bundled local corpus; verify current circular text, HARBOR portal procedures, deadlines, entity coverage, and filing status before operational use.',
  'sec-harbor-2026': 'Official SEC HARBOR beneficial ownership registry guidance in the bundled local corpus; verify live portal behavior, access credentials, deadlines, and entity filing status before operational use.',
  'dti-jao-24-03-2024': 'Official DTI-led Internet Transactions Act implementing rules in the bundled local corpus; verify current E-Commerce Bureau, DTI, and sector-agency advisories before operational use.',
  'bsp-circular-1108-2021': 'Official BSP virtual asset service provider guidance in the bundled local corpus; verify current BSP/AMLC virtual-asset guidance and registration status before operational use.',
  'bsp-circular-1140-2022': 'Official BSP fraud-management system guidance in the bundled local corpus; verify current BSP technology-risk and fraud-reporting expectations before operational use.',
  'bsp-circular-1160-2022': 'Official BSP financial consumer protection implementing regulations in the bundled local corpus; verify current Manual of Regulations amendments and BSP issuances before operational use.',
  'bsp-circular-1169-2023': 'Official BSP consumer assistance mechanism guidance in the bundled local corpus; verify current BSP complaint categories, reporting forms, and supervisory expectations before operational use.',
  'amlc-irr-2018': 'Official AMLC 2018 AMLA implementing rules, using the January 2021 amendment PDF, in the bundled local corpus; verify current AMLC issuances, portal procedures, covered-person registration, and reporting rules before operational use.',
  'cybercrime-irr-2015': 'Official Supreme Court E-Library text of the DOJ-DILG-DOST implementing rules for RA 10175; verify current DOJ Office of Cybercrime, CICC, court-rule, warrant, service-provider, evidence, and privacy procedures before operational use.',
  'am-17-11-03-sc': 'Official Judiciary/OCA PDF of the Supreme Court Rule on Cybercrime Warrants; verify current cybercrime court assignments, forms, court issuances, provider procedures, and case-specific evidence orders before operational use.',
  'ra-12001': 'Official Lawphil text of the Real Property Valuation and Assessment Reform Act; verify current BLGF, DOF, LGU assessor, treasurer, and appeal-board procedures before operational use.',
  'blgf-mc-001-2025-rpvara-irr': 'Official BLGF memorandum circular PDF containing the IRR of RA 12001; verify current BLGF issuances, LGU SMV adoption status, system deadlines, and appeal procedures before operational use.',
  'ra-10121': 'Official Lawphil text of the Philippine Disaster Risk Reduction and Management Act; verify current NDRRMC, OCD, DILG, and LGU DRRM plans, advisories, and fund rules before operational use.',
  'ra-12287': 'Official Lawphil text of the Declaration of State of Imminent Disaster Act; verify current NDRRMC, OCD, Regional DRRM Council, and LGU implementing rules before operational use.',
  'ra-10863': 'Official Lawphil text of the Customs Modernization and Tariff Act; verify current BOC memoranda, tariff treatment, electronic filing systems, commodity permits, and port-specific procedures before operational use.',
  'boc-cao-09-2020': 'Official BOC customs administrative order for formal-entry import processing; verify current E2M/NSW systems, BOC issuances, commodity permits, and port instructions before filing or releasing goods.',
  'ra-11934': 'Official Lawphil text of the SIM Registration Act; verify current NTC, DICT, NPC, PTE, telco, and law-enforcement request procedures before operational use.',
  'ntc-mc-001-12-2022-sim-irr': 'Official Supreme Court E-Library copy of the SIM Registration Act IRR; verify current NTC, DICT, NPC, PTE, telco, deactivation, correction, and authorized-disclosure procedures before operational use.',
  'ra-11055': 'Official Lawphil text of the Philippine Identification System Act; verify current PSA, PhilSys, authentication, relying-party, service-access, data-sharing, and privacy procedures before operational use.',
  'bir-rr-2024-03': 'Official BIR EOPT VAT and percentage-tax regulation in the bundled local corpus; verify current BIR forms, filing channels, rates, and later issuances before operational use.',
  'bir-rr-2024-04': 'Official BIR EOPT filing and payment regulation in the bundled local corpus; verify current eFPS/eBIRForms/payment channels, forms, deadlines, and later issuances before operational use.',
  'bir-rr-2024-05': 'Official BIR EOPT tax-refund regulation in the bundled local corpus; verify current documentary, portal, audit, and deadline requirements before filing a claim.',
  'bir-rr-2024-06': 'Official BIR EOPT reduced-interest and penalty regulation for micro and small taxpayers in the bundled local corpus; verify taxpayer classification and current assessment/payment rules before operational use.',
  'bir-rr-2024-07': 'Official BIR EOPT registration and invoicing regulation in the bundled local corpus; verify current BIR amendments, circulars, and taxpayer-specific registration instructions before operational use.',
  'bir-rr-2024-08': 'Official BIR EOPT taxpayer-classification regulation in the bundled local corpus; verify current BIR thresholds, notices, and later issuances before operational use.',
  'bir-rr-2024-11': 'Official BIR amendment to EOPT invoicing transitory provisions in the bundled local corpus; verify current BIR circulars and later amendments before relying on unused-form transition steps.',
  'bir-rmc-2024-77': 'Official BIR circular clarifying EOPT invoicing requirements in the bundled local corpus; verify later BIR issuances before relying on operational details.',
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
