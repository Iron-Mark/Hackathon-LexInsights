#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

import ts from 'typescript'

const rootDir = process.cwd()
const dataSourceDir = path.join(rootDir, 'src/lib/services/local-research-data')
const require = createRequire(import.meta.url)

const DATA_FILES = [
  'types.ts',
  'corpus.ts',
  'topic-expansions.ts',
  'compliance-frameworks.ts',
  'authority-sources.ts',
  'evidence-anchors.ts',
  'authority-relations.ts',
  'coverage-map.ts',
]

const EDUCATION_GOVERNANCE_LAW_IDS = [
  'ra-9155',
  'ra-10157',
  'ra-12199',
  'ra-10650',
  'ra-11650',
]

const EDUCATION_GOVERNANCE_STATUTES = [
  'RA 9155',
  'RA 10157',
  'RA 12199',
  'RA 10650',
  'RA 11650',
]

const PUBLIC_LAND_AGRARIAN_LAW_IDS = [
  'ra-11573',
  'ra-10023',
  'ra-11231',
  'ra-6657',
  'ra-9700',
  'ra-11953',
]

const PUBLIC_LAND_AGRARIAN_STATUTES = [
  'RA 11573',
  'RA 10023',
  'RA 11231',
  'RA 6657',
  'RA 9700',
  'RA 11953',
]

const PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID = 'public-land-free-patent-and-agrarian-reform'

const REAL_PROPERTY_VALUATION_LAW_IDS = [
  'ra-12001',
  'blgf-mc-001-2025-rpvara-irr',
]

const REAL_PROPERTY_VALUATION_STATUTES = [
  'RA 12001',
  'BLGF MC No. 001-2025',
]

const REAL_PROPERTY_VALUATION_FRAMEWORK_ID = 'real-property-valuation-local-tax-and-assessment'

const CHILD_ADOPTION_STATUS_LAW_IDS = [
  'ra-11642',
  'ra-11222',
  'ra-11767',
]

const CHILD_ADOPTION_STATUS_STATUTES = [
  'RA 11642',
  'RA 11222',
  'RA 11767',
]

const CHILD_ADOPTION_STATUS_FRAMEWORK_ID = 'child-adoption-foundling-and-civil-status'

const PRIVACY_OPERATIONS_LAW_IDS = [
  'npc-irr-2016',
  'npc-circular-16-03',
  'npc-advisory-2026-02',
  'npc-circular-2023-06',
  'npc-circular-2023-04',
  'npc-circular-2022-04',
  'npc-circular-2020-03',
  'npc-advisory-2025-02',
]

const PRIVACY_OPERATIONS_STATUTES = [
  'Data Privacy Act IRR',
  'NPC Circular No. 16-03',
  'NPC Advisory No. 2026-02',
  'NPC Circular No. 2023-06',
  'NPC Circular No. 2023-04',
  'NPC Circular No. 2022-04',
  'NPC Circular No. 2020-03',
  'NPC Advisory No. 2025-02',
]

const PRIVACY_OPERATIONS_FRAMEWORK_ID = 'privacy-operations-and-npc-compliance'

const PRIVACY_OPERATIONS_AUTHORITY_TYPES = new Map([
  ['npc-irr-2016', 'regulation'],
  ['npc-circular-16-03', 'regulation'],
  ['npc-advisory-2026-02', 'advisory'],
  ['npc-circular-2023-06', 'regulation'],
  ['npc-circular-2023-04', 'regulation'],
  ['npc-circular-2022-04', 'regulation'],
  ['npc-circular-2020-03', 'regulation'],
  ['npc-advisory-2025-02', 'advisory'],
])

const ACCESSIBILITY_BENEFITS_LAW_IDS = [
  'ra-9994',
  'ra-7277',
  'ra-9442',
  'ra-10070',
  'ra-10524',
  'ra-10754',
  'bp-344',
]

const ACCESSIBILITY_BENEFITS_STATUTES = [
  'RA 9994',
  'RA 7277',
  'RA 9442',
  'RA 10070',
  'RA 10524',
  'RA 10754',
  'BP 344',
]

const ACCESSIBILITY_BENEFITS_DRAFT_IDS = [
  'ra-9994',
  'ra-7277',
  'ra-9442',
  'ra-10070',
  'ra-10524',
  'ra-10754',
]

const ACCESSIBILITY_BENEFITS_FRAMEWORK_ID = 'health-welfare-and-accessibility'

const BUSINESS_TAX_LAW_IDS = [
  'ra-8424',
  'ra-11976',
  'ra-10963',
  'ra-11534',
  'ra-12066',
  'ra-12023',
]

const BUSINESS_TAX_STATUTES = [
  'RA 8424',
  'RA 11976',
  'RA 10963',
  'RA 11534',
  'RA 12066',
  'RA 12023',
]

const BUSINESS_TAX_FRAMEWORK_ID = 'business-tax-registration-invoicing-and-incentives'
const EOPT_IMPLEMENTATION_LAW_IDS = [
  'bir-rr-2024-03',
  'bir-rr-2024-04',
  'bir-rr-2024-05',
  'bir-rr-2024-06',
  'bir-rr-2024-07',
  'bir-rr-2024-08',
  'bir-rr-2024-11',
  'bir-rmc-2024-77',
]

const EOPT_IMPLEMENTATION_STATUTES = [
  'RR 3-2024',
  'RR 4-2024',
  'RR 5-2024',
  'RR 6-2024',
  'RR 7-2024',
  'RR 8-2024',
  'RR 11-2024',
  'RMC 77-2024',
]

const EOPT_IMPLEMENTATION_AUTHORITY_TYPES = new Map([
  ['bir-rmc-2024-77', 'advisory'],
])

const EOPT_IMPLEMENTATION_REQUIRED_TERMS = new Map([
  ['bir-rr-2024-03', ['vat', 'percentage tax']],
  ['bir-rr-2024-04', ['filing', 'payment']],
  ['bir-rr-2024-05', ['refund']],
  ['bir-rr-2024-06', ['penalty', 'micro']],
  ['bir-rr-2024-07', ['invoice', 'official receipt']],
  ['bir-rr-2024-08', ['taxpayer classification']],
  ['bir-rr-2024-11', ['transitory', 'unused official receipt']],
  ['bir-rmc-2024-77', ['invoice', 'clarification']],
])

const DIGITAL_SERVICES_VAT_LAW_ID = 'ra-12023'

const AMLC_AMLA_IRR_ID = 'amlc-irr-2018'
const AMLC_AMLA_IRR_FRAMEWORK_IDS = [
  'payment-systems-cft-and-sanctions-controls',
  'financial-account-scam-response',
  'banking-lending-insurance-and-financial-institutions',
]

const CYBERCRIME_IRR_ID = 'cybercrime-irr-2015'
const CYBERCRIME_IRR_FRAMEWORK_IDS = [
  'data-incident-response',
  'privacy-operations-and-npc-compliance',
  'financial-account-scam-response',
  'payment-systems-cft-and-sanctions-controls',
  'digital-government-and-public-ict',
  'ai-governance-privacy-public-sector-automation',
]

const CYBERCRIME_WARRANT_RULE_ID = 'am-17-11-03-sc'
const CYBERCRIME_WARRANT_RULE_FRAMEWORK_IDS = [
  'data-incident-response',
  'privacy-operations-and-npc-compliance',
  'financial-account-scam-response',
  'payment-systems-cft-and-sanctions-controls',
  'digital-government-and-public-ict',
  'ai-governance-privacy-public-sector-automation',
  'rights-criminal-enforcement-and-public-order',
]

const SEC_BENEFICIAL_OWNERSHIP_IDS = ['sec-mc-01-2021', 'sec-mc-15-2025', 'sec-harbor-2026']
const SEC_BENEFICIAL_OWNERSHIP_STATUTES = [
  'SEC Memorandum Circular No. 1, s. 2021',
  'SEC Memorandum Circular No. 15, s. 2025',
  'SEC HARBOR',
]
const SEC_BENEFICIAL_OWNERSHIP_FRAMEWORK_ID = 'business-market-entry-ownership-and-secured-finance'
const SEC_BENEFICIAL_OWNERSHIP_DRAFT_IDS = ['sec-mc-15-2025', 'sec-harbor-2026']

async function loadLocalResearchData() {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsight-local-rag-governance-'))
  const tempDataDir = path.join(tempDir, 'local-research-data')
  await mkdir(tempDataDir, { recursive: true })

  const transpileToCommonJs = (inputPath, outputPath) => {
    const source = readFileSync(inputPath, 'utf8')
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        strict: true,
      },
      fileName: inputPath,
    })

    writeFileSync(outputPath, transpiled.outputText, 'utf8')
  }

  for (const fileName of DATA_FILES) {
    const inputPath = path.join(dataSourceDir, fileName)
    const outputPath = path.join(tempDataDir, fileName.replace(/\.ts$/, '.js'))

    assert.equal(existsSync(inputPath), true, `${fileName} is missing`)
    transpileToCommonJs(inputPath, outputPath)
  }

  try {
    return {
      corpus: require(path.join(tempDataDir, 'corpus.js')).LEGAL_CORPUS,
      frameworks: require(path.join(tempDataDir, 'compliance-frameworks.js')).COMPLIANCE_FRAMEWORKS,
      sources: require(path.join(tempDataDir, 'authority-sources.js')).AUTHORITY_SOURCES,
      evidenceAnchors: require(path.join(tempDataDir, 'evidence-anchors.js')).EVIDENCE_ANCHORS,
      relations: require(path.join(tempDataDir, 'authority-relations.js')).AUTHORITY_RELATIONS,
      coverage: require(path.join(tempDataDir, 'coverage-map.js')).AUTHORITY_COVERAGE,
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function duplicateValues(values) {
  const seen = new Set()
  const duplicates = new Set()

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value)
    }

    seen.add(value)
  }

  return [...duplicates]
}

function assertKnownId(id, knownIds, label) {
  assert.ok(knownIds.has(id), `${label} references unknown authority id: ${id}`)
}

function assertNotFutureDate(value, label) {
  const parsed = Date.parse(value)
  assert.ok(Number.isFinite(parsed), `${label} must be a parseable date`)

  const oneDayFromNow = Date.now() + 24 * 60 * 60 * 1000
  assert.ok(parsed <= oneDayFromNow, `${label} must not be in the future`)
}

const data = await loadLocalResearchData()

try {
  const corpusIds = data.corpus.map((document) => document.id)
  const corpusIdSet = new Set(corpusIds)

  assert.deepEqual(duplicateValues(corpusIds), [], 'Corpus authority ids must be unique')
  assert.deepEqual(
    duplicateValues(data.sources.map((source) => source.authorityId)),
    [],
    'Authority source records must be unique'
  )
  assert.deepEqual(
    duplicateValues(data.coverage.map((coverage) => coverage.authorityId)),
    [],
    'Authority coverage records must be unique'
  )

  const sourcesById = new Map(data.sources.map((source) => [source.authorityId, source]))
  const coverageById = new Map(data.coverage.map((coverage) => [coverage.authorityId, coverage]))
  const evidenceById = data.evidenceAnchors.reduce((index, anchor) => {
    const anchors = index.get(anchor.authorityId) || []
    anchors.push(anchor)
    index.set(anchor.authorityId, anchors)
    return index
  }, new Map())

  for (const [index, lawId] of EDUCATION_GOVERNANCE_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `Education governance corpus should include ${EDUCATION_GOVERNANCE_STATUTES[index]}`
    )
  }

  const educationGovernanceFramework = data.frameworks.find((framework) => (
    EDUCATION_GOVERNANCE_LAW_IDS.every((lawId) => framework.lawIds.includes(lawId))
  ))

  assert.ok(
    educationGovernanceFramework,
    `A single education governance framework should include ${EDUCATION_GOVERNANCE_STATUTES.join(', ')}`
  )

  const educationGovernanceFrameworkText = [
    educationGovernanceFramework.title,
    educationGovernanceFramework.summary,
    ...educationGovernanceFramework.triggers,
  ].join(' ').toLowerCase()

  assert.ok(
    educationGovernanceFrameworkText.includes('education'),
    `${educationGovernanceFramework.id} should be education-facing`
  )
  assert.ok(
    educationGovernanceFrameworkText.includes('inclusive') ||
      educationGovernanceFrameworkText.includes('learning') ||
      educationGovernanceFrameworkText.includes('disability') ||
      educationGovernanceFrameworkText.includes('deped'),
    `${educationGovernanceFramework.id} should cover inclusive learning or DepEd governance`
  )

  for (const lawId of EDUCATION_GOVERNANCE_LAW_IDS) {
    assert.ok(
      coverageById.get(lawId)?.frameworkIds.includes(educationGovernanceFramework.id),
      `${lawId} coverage should reference ${educationGovernanceFramework.id}`
    )
  }

  for (const [index, lawId] of PUBLIC_LAND_AGRARIAN_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `Public land and agrarian corpus should include ${PUBLIC_LAND_AGRARIAN_STATUTES[index]}`
    )
  }

  const publicLandAgrarianFramework = data.frameworks.find((framework) => (
    framework.id === PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID
  ))

  assert.ok(
    publicLandAgrarianFramework,
    `${PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID} framework should exist`
  )
  assert.ok(
    PUBLIC_LAND_AGRARIAN_LAW_IDS.every((lawId) => publicLandAgrarianFramework.lawIds.includes(lawId)),
    `${PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID} should include ${PUBLIC_LAND_AGRARIAN_STATUTES.join(', ')}`
  )

  const publicLandAgrarianFrameworkText = [
    publicLandAgrarianFramework.title,
    publicLandAgrarianFramework.summary,
    ...publicLandAgrarianFramework.triggers,
  ].join(' ').toLowerCase()

  assert.ok(
    publicLandAgrarianFrameworkText.includes('land'),
    `${PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID} should be land-facing`
  )
  assert.ok(
    publicLandAgrarianFrameworkText.includes('free patent') ||
      publicLandAgrarianFrameworkText.includes('agrarian') ||
      publicLandAgrarianFrameworkText.includes('tenure'),
    `${PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID} should cover free-patent or agrarian-reform workflows`
  )

  for (const lawId of PUBLIC_LAND_AGRARIAN_LAW_IDS) {
    assert.ok(
      coverageById.get(lawId)?.frameworkIds.includes(PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID),
      `${lawId} coverage should reference ${PUBLIC_LAND_AGRARIAN_FRAMEWORK_ID}`
    )
  }

  for (const [index, lawId] of REAL_PROPERTY_VALUATION_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `Real property valuation corpus should include ${REAL_PROPERTY_VALUATION_STATUTES[index]}`
    )
  }

  const realPropertyValuationFramework = data.frameworks.find((framework) => (
    framework.id === REAL_PROPERTY_VALUATION_FRAMEWORK_ID
  ))

  assert.ok(
    realPropertyValuationFramework,
    `${REAL_PROPERTY_VALUATION_FRAMEWORK_ID} framework should exist`
  )
  assert.ok(
    REAL_PROPERTY_VALUATION_LAW_IDS.every((lawId) => realPropertyValuationFramework.lawIds.includes(lawId)),
    `${REAL_PROPERTY_VALUATION_FRAMEWORK_ID} should include ${REAL_PROPERTY_VALUATION_STATUTES.join(', ')}`
  )

  const realPropertyValuationFrameworkText = [
    realPropertyValuationFramework.title,
    realPropertyValuationFramework.summary,
    ...realPropertyValuationFramework.triggers,
    ...realPropertyValuationFramework.checkpoints,
  ].join(' ').toLowerCase()

  for (const term of [
    'real property',
    'schedule of market values',
    'assessor',
    'treasurer',
    'tax declaration',
    'appeal',
  ]) {
    assert.ok(
      realPropertyValuationFrameworkText.includes(term),
      `${REAL_PROPERTY_VALUATION_FRAMEWORK_ID} should cover ${term}`
    )
  }

  for (const lawId of REAL_PROPERTY_VALUATION_LAW_IDS) {
    const coverage = coverageById.get(lawId)

    assert.equal(coverage?.coverageStatus, 'golden', `${lawId} should have golden coverage`)
    assert.ok(coverage?.goldenQueryLabels.includes('local-rag-golden'), `${lawId} should list local golden coverage`)
    assert.equal(coverage?.draftCheckCovered, true, `${lawId} should be covered by draft checks`)
    assert.ok(
      coverage?.frameworkIds.includes(REAL_PROPERTY_VALUATION_FRAMEWORK_ID),
      `${lawId} coverage should reference ${REAL_PROPERTY_VALUATION_FRAMEWORK_ID}`
    )
  }
  assert.ok(
    !realPropertyValuationFramework.lawIds.some((id) => id.startsWith('bir-') || id === 'ra-8424'),
    `${REAL_PROPERTY_VALUATION_FRAMEWORK_ID} should not route RPT through national BIR tax authorities`
  )

  const rpvaraSource = sourcesById.get('ra-12001')
  assert.equal(rpvaraSource?.authorityType, 'statute', 'RA 12001 authority type should be statute')
  assert.equal(rpvaraSource?.sourceName, 'Lawphil', 'RA 12001 should use Lawphil as source')
  assert.ok(
    rpvaraSource?.sourceUrl.startsWith('https://lawphil.net/statutes/repacts/ra2024/ra_12001_2024.html'),
    'RA 12001 should link to the official Lawphil text'
  )
  assert.equal(rpvaraSource?.sourceTier, 'official-primary', 'RA 12001 source tier should be official-primary')
  assert.equal(rpvaraSource?.lastVerified, '2026-06-26', 'RA 12001 source should have current verification date')
  assert.equal(rpvaraSource?.provenanceStatus, 'verified', 'RA 12001 should have verified provenance')
  assert.ok(rpvaraSource?.provenanceNotes?.includes('Official Lawphil'), 'RA 12001 provenance should note Lawphil')

  const rpvaraIrrSource = sourcesById.get('blgf-mc-001-2025-rpvara-irr')
  assert.equal(
    rpvaraIrrSource?.authorityType,
    'regulation',
    'RPVARA IRR authority type should be regulation'
  )
  assert.equal(
    rpvaraIrrSource?.sourceName,
    'Bureau of Local Government Finance',
    'RPVARA IRR should use BLGF as source'
  )
  assert.ok(
    rpvaraIrrSource?.sourceUrl.startsWith('https://blgf.gov.ph/'),
    'RPVARA IRR should link to the official BLGF source'
  )
  assert.equal(
    rpvaraIrrSource?.sourceTier,
    'official-guidance',
    'RPVARA IRR source tier should be official-guidance'
  )
  assert.equal(
    rpvaraIrrSource?.lastVerified,
    '2026-06-26',
    'RPVARA IRR source should have current verification date'
  )
  assert.equal(rpvaraIrrSource?.provenanceStatus, 'verified', 'RPVARA IRR should have verified provenance')
  assert.ok(rpvaraIrrSource?.provenanceNotes?.includes('Official BLGF'), 'RPVARA IRR provenance should note BLGF')

  assert.ok(
    data.relations.some((relation) => (
      relation.sourceId === 'blgf-mc-001-2025-rpvara-irr' &&
      relation.targetId === 'ra-12001' &&
      relation.type === 'implements'
    )),
    'RPVARA IRR should implement RA 12001 through authority relations'
  )
  assert.ok(
    data.relations.some((relation) => (
      relation.sourceId === 'ra-12001' &&
      relation.targetId === 'ra-7160'
    )),
    'RA 12001 should relate to Local Government Code workflows'
  )
  for (const [sourceId, targetId, type] of [
    ['blgf-mc-001-2025-rpvara-irr', 'ra-7160', 'workflow_related_to'],
    ['ra-12001', 'ra-9470', 'workflow_related_to'],
    ['ra-12001', 'ra-10173', 'workflow_related_to'],
    ['ra-12001', 'pd-1529', 'workflow_related_to'],
    ['ra-12001', 'ra-9646', 'workflow_related_to'],
    ['ra-12001', 'ra-11032', 'workflow_related_to'],
  ]) {
    assert.ok(
      data.relations.some((relation) => (
        relation.sourceId === sourceId &&
        relation.targetId === targetId &&
        relation.type === type
      )),
      `${sourceId} should relate to ${targetId} as ${type}`
    )
  }

  for (const [index, lawId] of CHILD_ADOPTION_STATUS_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `Child adoption and civil-status corpus should include ${CHILD_ADOPTION_STATUS_STATUTES[index]}`
    )
  }

  const childAdoptionStatusFramework = data.frameworks.find((framework) => (
    framework.id === CHILD_ADOPTION_STATUS_FRAMEWORK_ID
  ))

  assert.ok(
    childAdoptionStatusFramework,
    `${CHILD_ADOPTION_STATUS_FRAMEWORK_ID} framework should exist`
  )
  assert.ok(
    CHILD_ADOPTION_STATUS_LAW_IDS.every((lawId) => childAdoptionStatusFramework.lawIds.includes(lawId)),
    `${CHILD_ADOPTION_STATUS_FRAMEWORK_ID} should include ${CHILD_ADOPTION_STATUS_STATUTES.join(', ')}`
  )

  const childAdoptionStatusFrameworkText = [
    childAdoptionStatusFramework.title,
    childAdoptionStatusFramework.summary,
    ...childAdoptionStatusFramework.triggers,
  ].join(' ').toLowerCase()

  assert.ok(
    childAdoptionStatusFrameworkText.includes('child'),
    `${CHILD_ADOPTION_STATUS_FRAMEWORK_ID} should be child-facing`
  )
  assert.ok(
    childAdoptionStatusFrameworkText.includes('adoption') ||
      childAdoptionStatusFrameworkText.includes('foundling') ||
      childAdoptionStatusFrameworkText.includes('civil status'),
    `${CHILD_ADOPTION_STATUS_FRAMEWORK_ID} should cover adoption, foundling, or civil-status workflows`
  )

  for (const lawId of CHILD_ADOPTION_STATUS_LAW_IDS) {
    assert.ok(
      coverageById.get(lawId)?.frameworkIds.includes(CHILD_ADOPTION_STATUS_FRAMEWORK_ID),
      `${lawId} coverage should reference ${CHILD_ADOPTION_STATUS_FRAMEWORK_ID}`
    )
  }

  for (const [index, lawId] of ACCESSIBILITY_BENEFITS_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `Accessibility and benefits corpus should include ${ACCESSIBILITY_BENEFITS_STATUTES[index]}`
    )
  }

  const accessibilityBenefitsFramework = data.frameworks.find((framework) => (
    framework.id === ACCESSIBILITY_BENEFITS_FRAMEWORK_ID
  ))

  assert.ok(
    accessibilityBenefitsFramework,
    `${ACCESSIBILITY_BENEFITS_FRAMEWORK_ID} framework should exist`
  )
  assert.ok(
    ACCESSIBILITY_BENEFITS_LAW_IDS.every((lawId) => accessibilityBenefitsFramework.lawIds.includes(lawId)),
    `${ACCESSIBILITY_BENEFITS_FRAMEWORK_ID} should include ${ACCESSIBILITY_BENEFITS_STATUTES.join(', ')}`
  )

  const accessibilityBenefitsFrameworkText = [
    accessibilityBenefitsFramework.title,
    accessibilityBenefitsFramework.summary,
    ...accessibilityBenefitsFramework.triggers,
    ...accessibilityBenefitsFramework.sequence,
    ...accessibilityBenefitsFramework.checkpoints,
  ].join(' ').toLowerCase()

  for (const requiredTopic of ['pwd', 'pdao', 'discount', 'vat', 'employment', 'accommodation']) {
    assert.ok(
      accessibilityBenefitsFrameworkText.includes(requiredTopic),
      `${ACCESSIBILITY_BENEFITS_FRAMEWORK_ID} should cover ${requiredTopic}`
    )
  }

  for (const lawId of ACCESSIBILITY_BENEFITS_LAW_IDS) {
    const coverage = coverageById.get(lawId)
    const source = sourcesById.get(lawId)

    assert.ok(
      coverage?.frameworkIds.includes(ACCESSIBILITY_BENEFITS_FRAMEWORK_ID),
      `${lawId} coverage should reference ${ACCESSIBILITY_BENEFITS_FRAMEWORK_ID}`
    )
    assert.equal(coverage?.coverageStatus, 'golden', `${lawId} should have golden coverage`)
    assert.ok(source, `${lawId} should have an authority source record`)
    assert.equal(source.sourceTier, 'official-primary', `${lawId} should use official primary source tier`)
    assert.ok(
      source.sourceName === 'Lawphil' || source.sourceName === 'Supreme Court E-Library',
      `${lawId} should use an official Philippine legal source`
    )
  }

  for (const lawId of ACCESSIBILITY_BENEFITS_DRAFT_IDS) {
    assert.equal(coverageById.get(lawId)?.draftCheckCovered, true, `${lawId} should be covered by draft checks`)
  }

  for (const [index, lawId] of BUSINESS_TAX_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `Business tax corpus should include ${BUSINESS_TAX_STATUTES[index]}`
    )
  }

  const businessTaxFramework = data.frameworks.find((framework) => (
    framework.id === BUSINESS_TAX_FRAMEWORK_ID
  ))

  assert.ok(
    businessTaxFramework,
    `${BUSINESS_TAX_FRAMEWORK_ID} framework should exist`
  )
  assert.ok(
    BUSINESS_TAX_LAW_IDS.every((lawId) => businessTaxFramework.lawIds.includes(lawId)),
    `${BUSINESS_TAX_FRAMEWORK_ID} should include ${BUSINESS_TAX_STATUTES.join(', ')}`
  )

  const businessTaxFrameworkText = [
    businessTaxFramework.title,
    businessTaxFramework.summary,
    ...businessTaxFramework.triggers,
    ...businessTaxFramework.sequence,
    ...businessTaxFramework.checkpoints,
  ].join(' ').toLowerCase()

  for (const requiredTopic of ['bir', 'vat', 'remittance']) {
    assert.ok(
      businessTaxFrameworkText.includes(requiredTopic),
      `${BUSINESS_TAX_FRAMEWORK_ID} should cover ${requiredTopic}`
    )
  }
  assert.ok(
    businessTaxFrameworkText.includes('digital service'),
    `${BUSINESS_TAX_FRAMEWORK_ID} should cover digital services`
  )
  assert.ok(
    businessTaxFrameworkText.includes('invoice') || businessTaxFrameworkText.includes('invoicing'),
    `${BUSINESS_TAX_FRAMEWORK_ID} should cover invoicing`
  )
  for (const requiredTopic of ['taxpayer classification', 'official receipt', 'refund', 'unused-form']) {
    assert.ok(
      businessTaxFrameworkText.includes(requiredTopic),
      `${BUSINESS_TAX_FRAMEWORK_ID} should cover EOPT ${requiredTopic}`
    )
  }
  assert.ok(
    businessTaxFrameworkText.includes('nrdsp') ||
      businessTaxFrameworkText.includes('nonresident digital service provider'),
    `${BUSINESS_TAX_FRAMEWORK_ID} should cover NRDSP workflows`
  )

  for (const [index, lawId] of EOPT_IMPLEMENTATION_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `EOPT implementation corpus should include ${EOPT_IMPLEMENTATION_STATUTES[index]}`
    )
    assert.ok(
      businessTaxFramework.lawIds.includes(lawId),
      `${BUSINESS_TAX_FRAMEWORK_ID} should include ${EOPT_IMPLEMENTATION_STATUTES[index]}`
    )

    const document = data.corpus.find((corpusDocument) => corpusDocument.id === lawId)
    const coverage = coverageById.get(lawId)
    const source = sourcesById.get(lawId)
    const evidenceText = (evidenceById.get(lawId) || [])
      .map((anchor) => `${anchor.label} ${anchor.note} ${anchor.supports.join(' ')}`)
      .join(' ')
      .toLowerCase()
    const documentText = [
      document?.statute || '',
      document?.title || '',
      document?.shortTitle || '',
      document?.summary || '',
      ...(document?.aliases || []),
      ...(document?.topics || []),
      ...(document?.keywords || []),
      ...(document?.obligations || []),
      ...(document?.commonGaps || []),
    ].join(' ').toLowerCase()

    assert.ok(document, `${lawId} should have a corpus document`)
    assert.equal(coverage?.coverageStatus, 'golden', `${lawId} should have golden coverage`)
    assert.equal(coverage?.draftCheckCovered, true, `${lawId} should be covered by draft checks`)
    assert.ok(
      coverage?.frameworkIds.includes(BUSINESS_TAX_FRAMEWORK_ID),
      `${lawId} coverage should reference ${BUSINESS_TAX_FRAMEWORK_ID}`
    )
    assert.ok(source, `${lawId} should have an authority source record`)
    assert.equal(source?.sourceName, 'Bureau of Internal Revenue', `${lawId} should use BIR as source`)
    assert.equal(
      source?.authorityType,
      EOPT_IMPLEMENTATION_AUTHORITY_TYPES.get(lawId) || 'regulation',
      `${lawId} should have the expected authority type`
    )
    assert.equal(source?.sourceTier, 'official-guidance', `${lawId} should use official BIR guidance`)
    assert.equal(source?.provenanceStatus, 'verified', `${lawId} should have verified provenance`)
    assert.ok(source?.sourceUrl.startsWith('https://bir-cdn.bir.gov.ph/'), `${lawId} should link to a BIR-hosted PDF`)
    assert.ok(source?.provenanceNotes?.includes('Official BIR'), `${lawId} should have explicit BIR provenance notes`)
    assert.ok(documentText.includes('eopt') || documentText.includes('ease of paying taxes'), `${lawId} should mention EOPT`)

    for (const requiredTerm of EOPT_IMPLEMENTATION_REQUIRED_TERMS.get(lawId) || []) {
      assert.ok(
        documentText.includes(requiredTerm),
        `${lawId} should cover ${requiredTerm}`
      )
    }
    assert.ok(
      evidenceText.length > 0 && (evidenceText.includes('eopt') || evidenceText.includes('tax')),
      `${lawId} evidence anchors should describe EOPT or tax support`
    )
  }

  const digitalServicesVatDocument = data.corpus.find((document) => document.id === DIGITAL_SERVICES_VAT_LAW_ID)
  assert.ok(digitalServicesVatDocument, 'Corpus should include RA 12023 digital services VAT document')

  const digitalServicesVatDocumentText = [
    digitalServicesVatDocument.statute,
    digitalServicesVatDocument.title,
    digitalServicesVatDocument.shortTitle || '',
    digitalServicesVatDocument.summary,
    ...digitalServicesVatDocument.aliases,
    ...digitalServicesVatDocument.topics,
    ...digitalServicesVatDocument.keywords,
    ...digitalServicesVatDocument.obligations,
    ...digitalServicesVatDocument.commonGaps,
  ].join(' ').toLowerCase()

  for (const requiredTopic of ['vat', 'bir', 'registration', 'remittance']) {
    assert.ok(
      digitalServicesVatDocumentText.includes(requiredTopic),
      `${DIGITAL_SERVICES_VAT_LAW_ID} should cover ${requiredTopic}`
    )
  }
  assert.ok(
    digitalServicesVatDocumentText.includes('digital service'),
    `${DIGITAL_SERVICES_VAT_LAW_ID} should cover digital services`
  )
  assert.ok(
    digitalServicesVatDocumentText.includes('invoice') ||
      digitalServicesVatDocumentText.includes('invoicing'),
    `${DIGITAL_SERVICES_VAT_LAW_ID} should cover invoicing`
  )
  assert.ok(
    digitalServicesVatDocumentText.includes('nrdsp') ||
      digitalServicesVatDocumentText.includes('nonresident digital service provider'),
    `${DIGITAL_SERVICES_VAT_LAW_ID} should cover NRDSP terminology`
  )

  const digitalServicesVatCoverage = coverageById.get(DIGITAL_SERVICES_VAT_LAW_ID)
  const digitalServicesVatSource = sourcesById.get(DIGITAL_SERVICES_VAT_LAW_ID)
  const digitalServicesVatEvidenceText = (evidenceById.get(DIGITAL_SERVICES_VAT_LAW_ID) || [])
    .map((anchor) => `${anchor.label} ${anchor.note} ${anchor.supports.join(' ')}`)
    .join(' ')
    .toLowerCase()

  assert.ok(
    digitalServicesVatCoverage?.frameworkIds.includes(BUSINESS_TAX_FRAMEWORK_ID),
    `${DIGITAL_SERVICES_VAT_LAW_ID} coverage should reference ${BUSINESS_TAX_FRAMEWORK_ID}`
  )
  assert.equal(
    digitalServicesVatCoverage?.coverageStatus,
    'golden',
    `${DIGITAL_SERVICES_VAT_LAW_ID} should have golden coverage`
  )
  assert.ok(digitalServicesVatSource, `${DIGITAL_SERVICES_VAT_LAW_ID} should have an authority source record`)
  assert.equal(
    digitalServicesVatSource?.authorityType,
    'statute',
    `${DIGITAL_SERVICES_VAT_LAW_ID} should be a statute`
  )
  assert.equal(
    digitalServicesVatSource?.sourceTier,
    'official-primary',
    `${DIGITAL_SERVICES_VAT_LAW_ID} should use an official primary source tier`
  )
  assert.ok(
    ['seeded', 'verified'].includes(digitalServicesVatSource?.provenanceStatus),
    `${DIGITAL_SERVICES_VAT_LAW_ID} should expose provenance status`
  )
  assert.ok(
    digitalServicesVatEvidenceText.includes('digital') && digitalServicesVatEvidenceText.includes('vat'),
    `${DIGITAL_SERVICES_VAT_LAW_ID} evidence anchors should describe digital services VAT`
  )

  const amlaIrrDocument = data.corpus.find((document) => document.id === AMLC_AMLA_IRR_ID)
  assert.ok(amlaIrrDocument, 'Corpus should include 2018 AMLA IRR document')
  assert.equal(amlaIrrDocument?.statute, '2018 AMLA IRR', '2018 AMLA IRR statute label should be stable')

  const amlaIrrCoverage = coverageById.get(AMLC_AMLA_IRR_ID)
  const amlaIrrSource = sourcesById.get(AMLC_AMLA_IRR_ID)
  const amlaIrrEvidenceText = (evidenceById.get(AMLC_AMLA_IRR_ID) || [])
    .map((anchor) => `${anchor.label} ${anchor.note} ${anchor.supports.join(' ')}`)
    .join(' ')
    .toLowerCase()

  for (const frameworkId of AMLC_AMLA_IRR_FRAMEWORK_IDS) {
    assert.ok(
      amlaIrrCoverage?.frameworkIds.includes(frameworkId),
      `${AMLC_AMLA_IRR_ID} coverage should reference ${frameworkId}`
    )
  }

  assert.equal(amlaIrrCoverage?.coverageStatus, 'golden', `${AMLC_AMLA_IRR_ID} should have golden coverage`)
  assert.equal(amlaIrrCoverage?.draftCheckCovered, true, `${AMLC_AMLA_IRR_ID} should be covered by draft checks`)
  assert.ok(amlaIrrSource, `${AMLC_AMLA_IRR_ID} should have an authority source record`)
  assert.equal(amlaIrrSource?.sourceName, 'Anti-Money Laundering Council', `${AMLC_AMLA_IRR_ID} should use AMLC as source`)
  assert.equal(amlaIrrSource?.authorityType, 'regulation', `${AMLC_AMLA_IRR_ID} should be a regulation`)
  assert.equal(amlaIrrSource?.sourceTier, 'official-guidance', `${AMLC_AMLA_IRR_ID} should use official guidance source tier`)
  assert.equal(amlaIrrSource?.provenanceStatus, 'verified', `${AMLC_AMLA_IRR_ID} should have verified provenance`)
  assert.ok(amlaIrrSource?.sourceUrl.startsWith('https://www.amlc.gov.ph/'), `${AMLC_AMLA_IRR_ID} should link to AMLC`)
  assert.ok(amlaIrrSource?.provenanceNotes?.includes('Official AMLC'), `${AMLC_AMLA_IRR_ID} should have explicit AMLC provenance notes`)
  assert.ok(
    amlaIrrEvidenceText.includes('customer due diligence'),
    `${AMLC_AMLA_IRR_ID} evidence should cover customer due diligence`
  )
  assert.ok(
    amlaIrrEvidenceText.includes('suspicious transaction'),
    `${AMLC_AMLA_IRR_ID} evidence should cover suspicious transaction reporting`
  )

  const cybercrimeIrrDocument = data.corpus.find((document) => document.id === CYBERCRIME_IRR_ID)
  assert.ok(cybercrimeIrrDocument, 'Corpus should include Cybercrime Prevention Act IRR document')
  assert.equal(
    cybercrimeIrrDocument?.statute,
    'Cybercrime Prevention Act IRR',
    'Cybercrime Prevention Act IRR statute label should be stable'
  )

  const cybercrimeIrrCoverage = coverageById.get(CYBERCRIME_IRR_ID)
  const cybercrimeIrrSource = sourcesById.get(CYBERCRIME_IRR_ID)
  const cybercrimeIrrEvidenceText = (evidenceById.get(CYBERCRIME_IRR_ID) || [])
    .map((anchor) => `${anchor.label} ${anchor.note} ${anchor.supports.join(' ')}`)
    .join(' ')
    .toLowerCase()
  const cybercrimeIrrDocumentText = [
    cybercrimeIrrDocument?.statute || '',
    cybercrimeIrrDocument?.title || '',
    cybercrimeIrrDocument?.shortTitle || '',
    cybercrimeIrrDocument?.summary || '',
    ...(cybercrimeIrrDocument?.aliases || []),
    ...(cybercrimeIrrDocument?.topics || []),
    ...(cybercrimeIrrDocument?.keywords || []),
    ...(cybercrimeIrrDocument?.obligations || []),
    ...(cybercrimeIrrDocument?.commonGaps || []),
  ].join(' ').toLowerCase()

  for (const frameworkId of CYBERCRIME_IRR_FRAMEWORK_IDS) {
    assert.ok(
      cybercrimeIrrCoverage?.frameworkIds.includes(frameworkId),
      `${CYBERCRIME_IRR_ID} coverage should reference ${frameworkId}`
    )
  }

  assert.equal(cybercrimeIrrCoverage?.coverageStatus, 'golden', `${CYBERCRIME_IRR_ID} should have golden coverage`)
  assert.equal(cybercrimeIrrCoverage?.draftCheckCovered, true, `${CYBERCRIME_IRR_ID} should be covered by draft checks`)
  assert.ok(cybercrimeIrrSource, `${CYBERCRIME_IRR_ID} should have an authority source record`)
  assert.equal(cybercrimeIrrSource?.sourceName, 'Supreme Court E-Library', `${CYBERCRIME_IRR_ID} should use Supreme Court E-Library as source`)
  assert.equal(cybercrimeIrrSource?.authorityType, 'regulation', `${CYBERCRIME_IRR_ID} should be a regulation`)
  assert.equal(cybercrimeIrrSource?.sourceTier, 'official-guidance', `${CYBERCRIME_IRR_ID} should use official guidance source tier`)
  assert.equal(cybercrimeIrrSource?.provenanceStatus, 'verified', `${CYBERCRIME_IRR_ID} should have verified provenance`)
  assert.ok(
    cybercrimeIrrSource?.sourceUrl.startsWith('https://elibrary.judiciary.gov.ph/'),
    `${CYBERCRIME_IRR_ID} should link to the Supreme Court E-Library`
  )
  assert.ok(
    cybercrimeIrrSource?.provenanceNotes?.includes('DOJ-DILG-DOST'),
    `${CYBERCRIME_IRR_ID} should have explicit IRR provenance notes`
  )
  assert.ok(
    data.relations.some((relation) => (
      relation.sourceId === CYBERCRIME_IRR_ID &&
      relation.targetId === 'ra-10175' &&
      relation.type === 'implements'
    )),
    `${CYBERCRIME_IRR_ID} should implement RA 10175`
  )

  for (const requiredTopic of ['preservation', 'service provider', 'traffic data', 'content data', 'office of cybercrime', 'cicc', 'chain of custody']) {
    assert.ok(
      cybercrimeIrrDocumentText.includes(requiredTopic),
      `${CYBERCRIME_IRR_ID} should cover ${requiredTopic}`
    )
  }
  assert.ok(
    cybercrimeIrrEvidenceText.includes('preservation') &&
      cybercrimeIrrEvidenceText.includes('service') &&
      (cybercrimeIrrEvidenceText.includes('office of cybercrime') || cybercrimeIrrEvidenceText.includes('cicc')),
    `${CYBERCRIME_IRR_ID} evidence should cover preservation, service-provider, and OOC/CICC coordination`
  )

  const cybercrimeWarrantRuleDocument = data.corpus.find((document) => document.id === CYBERCRIME_WARRANT_RULE_ID)
  assert.ok(cybercrimeWarrantRuleDocument, 'Corpus should include Rule on Cybercrime Warrants document')
  assert.equal(
    cybercrimeWarrantRuleDocument?.statute,
    'A.M. No. 17-11-03-SC',
    'Rule on Cybercrime Warrants statute label should be stable'
  )

  const cybercrimeWarrantRuleCoverage = coverageById.get(CYBERCRIME_WARRANT_RULE_ID)
  const cybercrimeWarrantRuleSource = sourcesById.get(CYBERCRIME_WARRANT_RULE_ID)
  const cybercrimeWarrantRuleEvidenceText = (evidenceById.get(CYBERCRIME_WARRANT_RULE_ID) || [])
    .map((anchor) => `${anchor.label} ${anchor.note} ${anchor.supports.join(' ')}`)
    .join(' ')
    .toLowerCase()
  const cybercrimeWarrantRuleDocumentText = [
    cybercrimeWarrantRuleDocument?.statute || '',
    cybercrimeWarrantRuleDocument?.title || '',
    cybercrimeWarrantRuleDocument?.shortTitle || '',
    cybercrimeWarrantRuleDocument?.summary || '',
    ...(cybercrimeWarrantRuleDocument?.aliases || []),
    ...(cybercrimeWarrantRuleDocument?.topics || []),
    ...(cybercrimeWarrantRuleDocument?.keywords || []),
    ...(cybercrimeWarrantRuleDocument?.obligations || []),
    ...(cybercrimeWarrantRuleDocument?.commonGaps || []),
  ].join(' ').toLowerCase()

  for (const frameworkId of CYBERCRIME_WARRANT_RULE_FRAMEWORK_IDS) {
    assert.ok(
      cybercrimeWarrantRuleCoverage?.frameworkIds.includes(frameworkId),
      `${CYBERCRIME_WARRANT_RULE_ID} coverage should reference ${frameworkId}`
    )
  }

  assert.equal(cybercrimeWarrantRuleCoverage?.coverageStatus, 'golden', `${CYBERCRIME_WARRANT_RULE_ID} should have golden coverage`)
  assert.equal(cybercrimeWarrantRuleCoverage?.draftCheckCovered, true, `${CYBERCRIME_WARRANT_RULE_ID} should be covered by draft checks`)
  assert.ok(cybercrimeWarrantRuleSource, `${CYBERCRIME_WARRANT_RULE_ID} should have an authority source record`)
  assert.equal(
    cybercrimeWarrantRuleSource?.sourceName,
    'Office of the Court Administrator',
    `${CYBERCRIME_WARRANT_RULE_ID} should use OCA as source`
  )
  assert.equal(cybercrimeWarrantRuleSource?.authorityType, 'rule', `${CYBERCRIME_WARRANT_RULE_ID} should be a rule`)
  assert.equal(cybercrimeWarrantRuleSource?.sourceTier, 'official-guidance', `${CYBERCRIME_WARRANT_RULE_ID} should use official guidance source tier`)
  assert.equal(cybercrimeWarrantRuleSource?.provenanceStatus, 'verified', `${CYBERCRIME_WARRANT_RULE_ID} should have verified provenance`)
  assert.ok(
    cybercrimeWarrantRuleSource?.sourceUrl.startsWith('https://oca.judiciary.gov.ph/'),
    `${CYBERCRIME_WARRANT_RULE_ID} should link to the Judiciary/OCA PDF`
  )
  assert.ok(
    cybercrimeWarrantRuleSource?.provenanceNotes?.includes('Rule on Cybercrime Warrants'),
    `${CYBERCRIME_WARRANT_RULE_ID} should have explicit warrant-rule provenance notes`
  )
  assert.ok(
    data.relations.some((relation) => (
      relation.sourceId === CYBERCRIME_WARRANT_RULE_ID &&
      relation.targetId === 'ra-10175' &&
      relation.type === 'implements'
    )),
    `${CYBERCRIME_WARRANT_RULE_ID} should implement RA 10175 warrant procedure`
  )
  assert.ok(
    data.relations.some((relation) => (
      relation.sourceId === CYBERCRIME_WARRANT_RULE_ID &&
      relation.targetId === CYBERCRIME_IRR_ID
    )),
    `${CYBERCRIME_WARRANT_RULE_ID} should relate to the Cybercrime Prevention Act IRR`
  )

  for (const requiredTopic of ['wdcd', 'wicd', 'wssecd', 'wecd', 'probable cause', 'service provider', 'forensic image', 'chain of custody', 'retention', 'destruction']) {
    assert.ok(
      cybercrimeWarrantRuleDocumentText.includes(requiredTopic),
      `${CYBERCRIME_WARRANT_RULE_ID} should cover ${requiredTopic}`
    )
  }
  assert.ok(
    cybercrimeWarrantRuleEvidenceText.includes('warrant') &&
      cybercrimeWarrantRuleEvidenceText.includes('computer data') &&
      cybercrimeWarrantRuleEvidenceText.includes('custody'),
    `${CYBERCRIME_WARRANT_RULE_ID} evidence should cover warrant, computer-data, and custody support`
  )

  const secBeneficialOwnershipFramework = data.frameworks.find((framework) => (
    framework.id === SEC_BENEFICIAL_OWNERSHIP_FRAMEWORK_ID
  ))

  assert.ok(
    secBeneficialOwnershipFramework,
    `${SEC_BENEFICIAL_OWNERSHIP_FRAMEWORK_ID} framework should exist`
  )
  assert.ok(
    SEC_BENEFICIAL_OWNERSHIP_IDS.every((lawId) => secBeneficialOwnershipFramework.lawIds.includes(lawId)),
    `${SEC_BENEFICIAL_OWNERSHIP_FRAMEWORK_ID} should include ${SEC_BENEFICIAL_OWNERSHIP_STATUTES.join(', ')}`
  )

  const secBeneficialOwnershipFrameworkText = [
    secBeneficialOwnershipFramework.title,
    secBeneficialOwnershipFramework.summary,
    ...secBeneficialOwnershipFramework.triggers,
    ...secBeneficialOwnershipFramework.sequence,
    ...secBeneficialOwnershipFramework.checkpoints,
  ].join(' ').toLowerCase()

  for (const requiredTopic of ['beneficial ownership', 'harbor', 'gis', 'authorized filer', 'privacy']) {
    assert.ok(
      secBeneficialOwnershipFrameworkText.includes(requiredTopic),
      `${SEC_BENEFICIAL_OWNERSHIP_FRAMEWORK_ID} should cover SEC BO ${requiredTopic}`
    )
  }

  for (const [index, lawId] of SEC_BENEFICIAL_OWNERSHIP_IDS.entries()) {
    const document = data.corpus.find((corpusDocument) => corpusDocument.id === lawId)
    const coverage = coverageById.get(lawId)
    const source = sourcesById.get(lawId)
    const documentText = [
      document?.statute || '',
      document?.title || '',
      document?.shortTitle || '',
      document?.summary || '',
      ...(document?.aliases || []),
      ...(document?.topics || []),
      ...(document?.keywords || []),
      ...(document?.obligations || []),
      ...(document?.commonGaps || []),
    ].join(' ').toLowerCase()
    const evidenceText = (evidenceById.get(lawId) || [])
      .map((anchor) => `${anchor.label} ${anchor.note} ${anchor.supports.join(' ')}`)
      .join(' ')
      .toLowerCase()

    assert.ok(
      corpusIdSet.has(lawId),
      `SEC beneficial ownership corpus should include ${SEC_BENEFICIAL_OWNERSHIP_STATUTES[index]}`
    )
    assert.ok(document, `${lawId} should have a corpus document`)
    assert.equal(coverage?.coverageStatus, 'golden', `${lawId} should have golden coverage`)
    assert.ok(
      coverage?.frameworkIds.includes(SEC_BENEFICIAL_OWNERSHIP_FRAMEWORK_ID),
      `${lawId} coverage should reference ${SEC_BENEFICIAL_OWNERSHIP_FRAMEWORK_ID}`
    )
    assert.ok(source, `${lawId} should have an authority source record`)
    assert.equal(source?.sourceName, 'Securities and Exchange Commission', `${lawId} should use SEC as source`)
    assert.equal(source?.sourceTier, 'official-guidance', `${lawId} should use official SEC guidance`)
    assert.equal(source?.provenanceStatus, 'verified', `${lawId} should have verified provenance`)
    assert.ok(
      source?.sourceUrl.startsWith('https://www.sec.gov.ph/') || source?.sourceUrl.startsWith('https://harbor.sec.gov.ph/'),
      `${lawId} should link to an SEC-hosted source`
    )
    assert.ok(source?.provenanceNotes?.includes('Official SEC'), `${lawId} should have explicit SEC provenance notes`)
    assert.ok(documentText.includes('beneficial ownership'), `${lawId} should mention beneficial ownership`)
    assert.ok(
      documentText.includes('harbor') || documentText.includes('corporate transparency'),
      `${lawId} should cover HARBOR or corporate transparency`
    )
    assert.ok(
      evidenceText.includes('beneficial ownership') || evidenceText.includes('harbor'),
      `${lawId} evidence should cover SEC BO or HARBOR support`
    )
  }

  for (const lawId of SEC_BENEFICIAL_OWNERSHIP_DRAFT_IDS) {
    assert.equal(coverageById.get(lawId)?.draftCheckCovered, true, `${lawId} should be covered by draft checks`)
  }

  for (const [index, lawId] of PRIVACY_OPERATIONS_LAW_IDS.entries()) {
    assert.ok(
      corpusIdSet.has(lawId),
      `NPC privacy operations corpus should include ${PRIVACY_OPERATIONS_STATUTES[index]}`
    )
  }

  const privacyOperationsFramework = data.frameworks.find((framework) => (
    framework.id === PRIVACY_OPERATIONS_FRAMEWORK_ID
  ))

  assert.ok(
    privacyOperationsFramework,
    `${PRIVACY_OPERATIONS_FRAMEWORK_ID} framework should exist`
  )
  assert.ok(
    privacyOperationsFramework.lawIds.includes('ra-10173'),
    `${PRIVACY_OPERATIONS_FRAMEWORK_ID} should anchor to RA 10173`
  )
  assert.ok(
    PRIVACY_OPERATIONS_LAW_IDS.every((lawId) => privacyOperationsFramework.lawIds.includes(lawId)),
    `${PRIVACY_OPERATIONS_FRAMEWORK_ID} should include ${PRIVACY_OPERATIONS_STATUTES.join(', ')}`
  )

  const privacyOperationsFrameworkText = [
    privacyOperationsFramework.title,
    privacyOperationsFramework.summary,
    ...privacyOperationsFramework.triggers,
    ...privacyOperationsFramework.sequence,
    ...privacyOperationsFramework.checkpoints,
  ].join(' ').toLowerCase()

  assert.ok(
    privacyOperationsFrameworkText.includes('privacy'),
    `${PRIVACY_OPERATIONS_FRAMEWORK_ID} should be privacy-facing`
  )

  for (const requiredTopic of ['lawful processing', 'breach', 'dpo', 'registration', 'consent', 'data sharing', 'privacy engineering']) {
    assert.ok(
      privacyOperationsFrameworkText.includes(requiredTopic),
      `${PRIVACY_OPERATIONS_FRAMEWORK_ID} should cover ${requiredTopic}`
    )
  }

  for (const lawId of PRIVACY_OPERATIONS_LAW_IDS) {
    const coverage = coverageById.get(lawId)
    const source = sourcesById.get(lawId)

    assert.ok(
      coverage?.frameworkIds.includes(PRIVACY_OPERATIONS_FRAMEWORK_ID),
      `${lawId} coverage should reference ${PRIVACY_OPERATIONS_FRAMEWORK_ID}`
    )
    assert.equal(coverage?.coverageStatus, 'golden', `${lawId} should have golden coverage`)
    assert.equal(coverage?.draftCheckCovered, true, `${lawId} should be covered by draft checks`)

    assert.ok(source, `${lawId} should have an authority source record`)
    assert.equal(source.sourceName, 'National Privacy Commission', `${lawId} should use NPC as source`)
    assert.equal(source.sourceTier, 'official-guidance', `${lawId} should be official NPC guidance`)
    assert.equal(source.provenanceStatus, 'verified', `${lawId} should have verified provenance`)
    assert.equal(
      source.authorityType,
      PRIVACY_OPERATIONS_AUTHORITY_TYPES.get(lawId),
      `${lawId} authority type should match issuance type`
    )
    assert.ok(source.sourceUrl.startsWith('https://privacy.gov.ph/'), `${lawId} should link to privacy.gov.ph`)
    assert.ok(source.provenanceNotes?.includes('Official NPC'), `${lawId} should have explicit NPC provenance notes`)
  }

  for (const document of data.corpus) {
    const source = sourcesById.get(document.id)
    const coverage = coverageById.get(document.id)
    const evidenceAnchors = evidenceById.get(document.id) || []

    assert.ok(source, `${document.id} must have a canonical authority source record`)
    assert.ok(coverage, `${document.id} must have a coverage record`)
    assert.ok(evidenceAnchors.length > 0, `${document.id} must have at least one evidence anchor`)

    assert.equal(source.sourceName, document.sourceName, `${document.id} sourceName must match source registry`)
    assert.equal(source.sourceUrl, document.sourceUrl, `${document.id} sourceUrl must match source registry`)

    if (document.authorityType) {
      assert.equal(source.authorityType, document.authorityType, `${document.id} authorityType must match source registry`)
    }

    if (document.sourceTier) {
      assert.equal(source.sourceTier, document.sourceTier, `${document.id} sourceTier must match source registry`)
    }

    if (document.lastVerified) {
      assert.equal(source.lastVerified, document.lastVerified, `${document.id} lastVerified must match source registry`)
    }

    assert.ok(source.sourceUrl.trim().length > 0, `${document.id} official source URL is required`)
    assert.ok(source.sourceTier.trim().length > 0, `${document.id} source tier is required`)
    assert.ok(source.lastVerified.trim().length > 0, `${document.id} source date metadata is required`)
    assertNotFutureDate(source.lastVerified, `${document.id} lastVerified`)

    assert.ok(
      coverage.coverageStatus === 'golden' || coverage.coverageStatus === 'draft' ||
        coverage.coverageStatus === 'framework' || coverage.coverageStatus === 'seeded',
      `${document.id} must have a valid coverage status`
    )

    assert.ok(
      coverage.coverageStatus !== 'seeded' || coverage.notes?.includes('Seeded corpus record'),
      `${document.id} seeded coverage must be explicit`
    )
  }

  for (const source of data.sources) {
    assertKnownId(source.authorityId, corpusIdSet, 'Authority source')
  }

  for (const anchor of data.evidenceAnchors) {
    assertKnownId(anchor.authorityId, corpusIdSet, 'Evidence anchor')
    assert.ok(anchor.label.trim().length > 0, `${anchor.authorityId} evidence anchor label is required`)
    assert.ok(anchor.note.trim().length > 0, `${anchor.authorityId} evidence anchor note is required`)
    assert.ok(anchor.supports.length > 0, `${anchor.authorityId} evidence anchor supports are required`)
  }

  for (const relation of data.relations) {
    assertKnownId(relation.sourceId, corpusIdSet, 'Authority relation source')
    assertKnownId(relation.targetId, corpusIdSet, 'Authority relation target')
    assert.notEqual(relation.sourceId, relation.targetId, 'Authority relation must not point to itself')
    assert.ok(relation.label.trim().length > 0, 'Authority relation label is required')
    assert.ok(relation.weight > 0, 'Authority relation weight must be positive')
  }

  for (const framework of data.frameworks) {
    for (const lawId of framework.lawIds) {
      assertKnownId(lawId, corpusIdSet, `${framework.id} framework`)
    }
  }

  for (const coverage of data.coverage) {
    assertKnownId(coverage.authorityId, corpusIdSet, 'Coverage record')

    for (const frameworkId of coverage.frameworkIds) {
      assert.ok(
        data.frameworks.some((framework) => framework.id === frameworkId),
        `${coverage.authorityId} coverage references unknown framework id: ${frameworkId}`
      )
    }
  }

  console.log('Local RAG governance self-test passed.')
} finally {
  data.cleanup()
}
