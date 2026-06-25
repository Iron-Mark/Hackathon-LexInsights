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
  'npc-circular-16-03',
  'npc-advisory-2026-02',
  'npc-circular-2023-06',
  'npc-circular-2023-04',
  'npc-circular-2022-04',
  'npc-circular-2020-03',
  'npc-advisory-2025-02',
]

const PRIVACY_OPERATIONS_STATUTES = [
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

  for (const requiredTopic of ['breach', 'dpo', 'registration', 'consent', 'data sharing', 'privacy engineering']) {
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
