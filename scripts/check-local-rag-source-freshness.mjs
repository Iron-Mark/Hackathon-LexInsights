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
const MAX_REVIEW_AGE_DAYS = 550
const MIN_PROVENANCE_NOTE_RATIO = 0.18
const TRUSTED_SOURCE_HOSTS = new Set([
  'bir-cdn.bir.gov.ph',
  'blgf.gov.ph',
  'customs.gov.ph',
  'dtiwebfiles.s3.ap-southeast-1.amazonaws.com',
  'elibrary.judiciary.gov.ph',
  'lawphil.net',
  'oca.judiciary.gov.ph',
  'privacy.gov.ph',
  'sc.judiciary.gov.ph',
  'www.amlc.gov.ph',
  'www.bsp.gov.ph',
  'www.dole.gov.ph',
  'www.lawphil.net',
  'www.sec.gov.ph',
])

async function loadLocalRagData() {
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsight-rag-source-freshness-'))
  const tempDataDir = path.join(tempDir, 'local-research-data')
  await mkdir(tempDataDir, { recursive: true })

  const transpileToCommonJs = (fileName) => {
    const inputPath = path.join(dataSourceDir, fileName)
    const outputPath = path.join(tempDataDir, fileName.replace(/\.ts$/, '.js'))

    assert.equal(existsSync(inputPath), true, `${fileName} is missing`)

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

  for (const fileName of [
    'types.ts',
    'corpus.ts',
    'compliance-frameworks.ts',
    'authority-sources.ts',
    'coverage-map.ts',
  ]) {
    transpileToCommonJs(fileName)
  }

  try {
    return {
      corpus: require(path.join(tempDataDir, 'corpus.js')).LEGAL_CORPUS,
      sources: require(path.join(tempDataDir, 'authority-sources.js')).AUTHORITY_SOURCES,
      coverage: require(path.join(tempDataDir, 'coverage-map.js')).AUTHORITY_COVERAGE,
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function parseDateOnly(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null
  }

  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(left, right) {
  return Math.floor((right.getTime() - left.getTime()) / 86400000)
}

function assertUnique(items, getKey, label) {
  const seen = new Set()
  const duplicates = []

  for (const item of items) {
    const key = getKey(item)

    if (seen.has(key)) {
      duplicates.push(key)
    }

    seen.add(key)
  }

  assert.deepEqual(duplicates, [], `${label} contains duplicate values`)
}

const { corpus, sources, coverage, cleanup } = await loadLocalRagData()

try {
  const today = new Date()
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
  const corpusIds = new Set(corpus.map((document) => document.id))
  const sourceIds = new Set(sources.map((source) => source.authorityId))
  const coverageIds = new Set(coverage.map((item) => item.authorityId))

  assert.equal(sources.length, corpus.length, 'Every corpus record should have an authority source record')
  assert.equal(coverage.length, corpus.length, 'Every corpus record should have a coverage record')
  assertUnique(corpus, (document) => document.id, 'LEGAL_CORPUS')
  assertUnique(sources, (source) => source.authorityId, 'AUTHORITY_SOURCES')
  assertUnique(coverage, (item) => item.authorityId, 'AUTHORITY_COVERAGE')

  for (const id of corpusIds) {
    assert.equal(sourceIds.has(id), true, `${id} is missing from authority sources`)
    assert.equal(coverageIds.has(id), true, `${id} is missing from authority coverage`)
  }

  let provenanceNotes = 0
  let seededWithCatalogDate = 0
  const seededSources = []
  const verifiedSources = []

  for (const source of sources) {
    assert.equal(typeof source.sourceName, 'string', `${source.authorityId} sourceName must be a string`)
    assert.ok(source.sourceName.trim().length > 0, `${source.authorityId} sourceName must not be empty`)
    assert.equal(typeof source.sourceUrl, 'string', `${source.authorityId} sourceUrl must be a string`)

    const url = new URL(source.sourceUrl)
    assert.equal(url.protocol, 'https:', `${source.authorityId} sourceUrl must use HTTPS`)
    assert.equal(
      TRUSTED_SOURCE_HOSTS.has(url.hostname),
      true,
      `${source.authorityId} source host ${url.hostname} must be reviewed before it enters the local corpus`
    )

    const verifiedDate = parseDateOnly(source.lastVerified)
    assert.ok(verifiedDate, `${source.authorityId} lastVerified must be YYYY-MM-DD`)
    assert.ok(daysBetween(verifiedDate, todayUtc) >= 0, `${source.authorityId} lastVerified is in the future`)
    assert.ok(
      daysBetween(verifiedDate, todayUtc) <= MAX_REVIEW_AGE_DAYS,
      `${source.authorityId} lastVerified is older than ${MAX_REVIEW_AGE_DAYS} days`
    )

    assert.ok(
      ['verified', 'seeded'].includes(source.provenanceStatus),
      `${source.authorityId} provenanceStatus must be verified or seeded`
    )

    if (source.provenanceNotes?.trim()) {
      provenanceNotes += 1
    }

    if (source.provenanceStatus === 'verified') {
      verifiedSources.push(source.authorityId)
    } else {
      seededSources.push(source.authorityId)
      seededWithCatalogDate += source.lastVerified ? 1 : 0
    }
  }

  const provenanceNoteRatio = provenanceNotes / sources.length
  assert.ok(
    provenanceNoteRatio >= MIN_PROVENANCE_NOTE_RATIO,
    `At least ${Math.round(MIN_PROVENANCE_NOTE_RATIO * 100)}% of sources should carry provenance notes`
  )

  console.log('Local RAG source freshness check passed.')
  console.log(`Sources: ${sources.length}; verified: ${verifiedSources.length}; seeded: ${seededSources.length}.`)
  console.log(`Seeded records with catalog dates: ${seededWithCatalogDate}.`)
  console.log(`Provenance note coverage: ${Math.round(provenanceNoteRatio * 100)}%.`)
} finally {
  cleanup()
}
