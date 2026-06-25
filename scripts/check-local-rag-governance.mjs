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
