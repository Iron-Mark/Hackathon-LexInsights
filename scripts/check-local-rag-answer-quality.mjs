#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'

import ts from 'typescript'

const rootDir = process.cwd()
const sourcePath = path.join(rootDir, 'src/lib/services/local-legal-research.ts')
const dataSourceDir = path.join(rootDir, 'src/lib/services/local-research-data')
const fixturePath = path.join(rootDir, 'tests/fixtures/rag-golden/answer-quality-cases.json')
const require = createRequire(import.meta.url)

function assertStringArray(value, label, { allowEmpty = false } = {}) {
  assert.equal(Array.isArray(value), true, `${label} must be an array`)
  assert.equal(
    allowEmpty || value.length > 0,
    true,
    `${label} must include at least one value`
  )

  for (const item of value) {
    assert.equal(typeof item, 'string', `${label} entries must be strings`)
    assert.ok(item.trim().length > 0, `${label} entries must not be empty`)
  }
}

function loadAnswerQualityCases() {
  assert.equal(existsSync(fixturePath), true, 'RAG answer-quality fixture is missing')

  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  assert.equal(fixture.schemaVersion, 1, 'RAG answer-quality fixture schemaVersion must be 1')
  assert.equal(Array.isArray(fixture.cases), true, 'RAG answer-quality fixture must include a cases array')
  assert.ok(fixture.cases.length > 0, 'RAG answer-quality fixture must include at least one case')

  const seenIds = new Set()

  for (const testCase of fixture.cases) {
    assert.equal(typeof testCase.id, 'string', 'RAG answer-quality case id must be a string')
    assert.ok(testCase.id.trim().length > 0, 'RAG answer-quality case id must not be empty')
    assert.equal(seenIds.has(testCase.id), false, `Duplicate RAG answer-quality case id: ${testCase.id}`)
    seenIds.add(testCase.id)

    assert.equal(typeof testCase.query, 'string', `${testCase.id} query must be a string`)
    assert.ok(testCase.query.trim().length > 0, `${testCase.id} query must not be empty`)
    assertStringArray(testCase.expectedStatutes, `${testCase.id} expectedStatutes`)
    assertStringArray(testCase.requiredFragments, `${testCase.id} requiredFragments`)

    if (testCase.forbiddenStatutes !== undefined) {
      assertStringArray(testCase.forbiddenStatutes, `${testCase.id} forbiddenStatutes`, { allowEmpty: true })
    }

    if (testCase.expectedUnknownCitations !== undefined) {
      assertStringArray(
        testCase.expectedUnknownCitations,
        `${testCase.id} expectedUnknownCitations`,
        { allowEmpty: true }
      )
    }

    assert.equal(typeof testCase.minConfidence, 'number', `${testCase.id} minConfidence must be a number`)
    assert.ok(testCase.minConfidence >= 0 && testCase.minConfidence <= 1, `${testCase.id} minConfidence must be 0..1`)
  }

  return fixture.cases
}

async function loadProviderlessModule() {
  assert.equal(existsSync(sourcePath), true, 'local-legal-research.ts is missing')

  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsight-local-rag-answer-quality-'))
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

  for (const fileName of [
    'types.ts',
    'corpus.ts',
    'topic-expansions.ts',
    'compliance-frameworks.ts',
    'authority-sources.ts',
    'evidence-anchors.ts',
    'authority-relations.ts',
    'coverage-map.ts',
  ]) {
    const inputPath = path.join(dataSourceDir, fileName)
    const outputPath = path.join(tempDataDir, fileName.replace(/\.ts$/, '.js'))

    assert.equal(existsSync(inputPath), true, `${fileName} is missing`)
    transpileToCommonJs(inputPath, outputPath)
  }

  const tempModulePath = path.join(tempDir, 'local-legal-research.js')
  transpileToCommonJs(sourcePath, tempModulePath)

  try {
    return {
      module: require(tempModulePath),
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

function statutes(response) {
  return response.matched_documents?.map((document) => document.statute) || []
}

function textIncludes(value, fragment) {
  return value.toLowerCase().includes(fragment.toLowerCase())
}

const cases = loadAnswerQualityCases()
const { module: providerless, cleanup } = await loadProviderlessModule()

try {
  for (const testCase of cases) {
    const response = providerless.runLocalResearch({
      query: testCase.query,
      use_deep_search: true,
    })
    const responseStatutes = statutes(response)

    assert.equal(response.status, 'completed', `${testCase.id} should complete`)
    assert.equal(response.provider_mode, 'local-providerless', `${testCase.id} should use local providerless mode`)
    assert.ok(
      (response.confidence_score || 0) >= testCase.minConfidence,
      `${testCase.id} should meet confidence threshold`
    )
    assert.ok(response.retrieval_metadata, `${testCase.id} should include retrieval metadata`)
    assert.ok(response.matched_documents?.length > 0, `${testCase.id} should include matched documents`)

    for (const expectedStatute of testCase.expectedStatutes) {
      assert.ok(responseStatutes.includes(expectedStatute), `${testCase.id} should include ${expectedStatute}`)
    }

    for (const forbiddenStatute of testCase.forbiddenStatutes || []) {
      assert.equal(responseStatutes.includes(forbiddenStatute), false, `${testCase.id} should not include ${forbiddenStatute}`)
    }

    for (const fragment of testCase.requiredFragments) {
      assert.ok(textIncludes(response.summary, fragment), `${testCase.id} summary should include "${fragment}"`)
    }

    for (const unknownCitation of testCase.expectedUnknownCitations || []) {
      assert.ok(
        response.retrieval_metadata.unknown_citation_numbers?.includes(unknownCitation),
        `${testCase.id} should report unknown citation ${unknownCitation}`
      )
    }

    for (const document of response.matched_documents.slice(0, 3)) {
      assert.ok(document.source_url?.startsWith('https://'), `${testCase.id} top sources should use HTTPS`)
      assert.ok(document.source_name, `${testCase.id} top sources should include source names`)
      assert.ok(document.source_tier, `${testCase.id} top sources should include source tiers`)
      assert.ok(document.provenance_status, `${testCase.id} top sources should include provenance status`)
    }
  }

  console.log(`Local RAG answer-quality check passed (${cases.length} cases).`)
} finally {
  cleanup()
}
