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
const require = createRequire(import.meta.url)

const CASES = [
  {
    id: 'privacy-breach-notification',
    query: 'What should a Philippine company do after a personal data breach affecting customers?',
    expectedStatutes: ['NPC Circular No. 16-03', 'NPC Advisory No. 2026-02', 'RA 10173'],
    requiredFragments: ['breach', 'NPC', 'personal data'],
    minConfidence: 0.38,
  },
  {
    id: 'cybercrime-warrants',
    query: 'Explain cybercrime warrant and online evidence steps for an incident response plan.',
    expectedStatutes: ['A.M. No. 17-11-03-SC', 'Cybercrime Prevention Act IRR', 'RA 10175'],
    requiredFragments: ['cybercrime', 'warrant', 'evidence'],
    minConfidence: 0.34,
  },
  {
    id: 'child-online-safety-reporting',
    query: 'What does RA 9775 require for online child safety reporting by a platform?',
    expectedStatutes: ['RA 9775', 'RA 11930'],
    requiredFragments: ['child', 'report'],
    forbiddenStatutes: ['RA 9160'],
    minConfidence: 0.45,
  },
  {
    id: 'procurement-ra-12009',
    query: 'Build a barangay procurement checklist under RA 12009 with bid records and supplier controls.',
    expectedStatutes: ['RA 12009', 'RA 11032'],
    requiredFragments: ['procurement', 'records'],
    minConfidence: 0.34,
  },
  {
    id: 'local-government-services',
    query: 'What local government service standards apply to an LGU permit counter?',
    expectedStatutes: ['RA 11032', 'RA 7160'],
    requiredFragments: ['service', 'LGU'],
    minConfidence: 0.32,
  },
  {
    id: 'beneficial-ownership-sec',
    query: 'What SEC beneficial ownership and official contact records should a corporation maintain?',
    expectedStatutes: ['SEC Memorandum Circular No. 15, s. 2025', 'SEC Memorandum Circular No. 28, s. 2020'],
    requiredFragments: ['beneficial ownership', 'SEC'],
    minConfidence: 0.32,
  },
  {
    id: 'dole-termination-due-process',
    query: 'Review an employee termination process for twin notice and due process under DOLE rules.',
    expectedStatutes: ['DOLE Department Order No. 147-15'],
    requiredFragments: ['termination', 'notice'],
    minConfidence: 0.33,
  },
  {
    id: 'accessibility-built-environment',
    query: 'What accessibility controls apply to a public building and PWD access plan?',
    expectedStatutes: ['BP 344', 'RA 7277'],
    requiredFragments: ['accessibility', 'PWD'],
    minConfidence: 0.32,
  },
  {
    id: 'aml-covered-person',
    query: 'What AML controls apply for covered-person registration, reporting, and customer due diligence?',
    expectedStatutes: ['RA 9160', '2018 AMLA IRR'],
    requiredFragments: ['AML', 'covered'],
    forbiddenStatutes: ['RA 9775'],
    minConfidence: 0.32,
  },
  {
    id: 'consumer-online-transaction',
    query: 'What controls apply to an online marketplace under the Internet Transactions Act and consumer law?',
    expectedStatutes: ['RA 11967', 'Joint Administrative Order No. 24-03, s. 2024', 'RA 7394'],
    requiredFragments: ['consumer', 'online'],
    minConfidence: 0.33,
  },
  {
    id: 'imminent-disaster',
    query: 'How should an LGU prepare DRRM, LDRRMF, pre-emptive evacuation, and anticipatory action for a state of imminent disaster?',
    expectedStatutes: ['RA 12287', 'RA 10121'],
    requiredFragments: ['disaster', 'LGU'],
    minConfidence: 0.32,
  },
  {
    id: 'unknown-citation',
    query: 'Compare RA 999999 with RA 10173 for a privacy program.',
    expectedStatutes: ['RA 10173'],
    expectedUnknownCitations: ['999999'],
    requiredFragments: ['RA 999999'],
    minConfidence: 0.3,
  },
]

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

const { module: providerless, cleanup } = await loadProviderlessModule()

try {
  for (const testCase of CASES) {
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

  console.log(`Local RAG answer-quality check passed (${CASES.length} cases).`)
} finally {
  cleanup()
}
