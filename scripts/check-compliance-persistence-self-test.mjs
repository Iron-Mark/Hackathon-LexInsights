#!/usr/bin/env node

// Self-test for the compliance-persistence scaffold (PRD P0-1 and P0-3).
// Follows the repo's existing self-test pattern (see
// check-document-text-self-test.mjs): transpile the TypeScript source with the
// `typescript` dev dependency, import the emitted module, and assert with
// node:assert/strict. No database, no vitest, no new toolchain.

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

const rootDir = process.cwd()
const baseDir = path.join(rootDir, 'src/lib/services/compliance-persistence')

async function loadModule(relativeSourcePath) {
  const sourcePath = path.join(baseDir, relativeSourcePath)
  assert.equal(existsSync(sourcePath), true, `${relativeSourcePath} is missing`)

  const source = readFileSync(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    fileName: sourcePath,
  })
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsights-compliance-persistence-'))
  const tempModulePath = path.join(tempDir, `${path.basename(relativeSourcePath, '.ts')}.mjs`)
  writeFileSync(tempModulePath, transpiled.outputText, 'utf8')

  return {
    module: await import(pathToFileURL(tempModulePath).href),
    cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
  }
}

const repository = await loadModule('repository.ts')
const disclosure = await loadModule('ai-use-disclosure.ts')

try {
  const {
    isFindingSeverity,
    mapReportRow,
    mapVersionRow,
    mapFindingRow,
    createComplianceReportRepository,
    CompliancePersistenceNotWiredError,
  } = repository.module

  // --- isFindingSeverity ---
  assert.equal(isFindingSeverity('green'), true)
  assert.equal(isFindingSeverity('amber'), true)
  assert.equal(isFindingSeverity('red'), true)
  assert.equal(isFindingSeverity('blue'), false, 'Unknown severity should be rejected')
  assert.equal(isFindingSeverity(''), false)

  // --- mapReportRow: snake_case row -> camelCase record, metadata null -> {} ---
  const reportRecord = mapReportRow({
    id: 'r1',
    user_id: 'user_123',
    chat_id: null,
    document_id: 'doc_9',
    title: 'Privacy Policy Review',
    content: '# Report',
    compliance_score: 82,
    metadata: null,
    created_at: '2026-07-08T00:00:00Z',
    updated_at: '2026-07-08T01:00:00Z',
  })
  assert.equal(reportRecord.userId, 'user_123')
  assert.equal(reportRecord.documentId, 'doc_9')
  assert.equal(reportRecord.complianceScore, 82)
  assert.deepEqual(reportRecord.metadata, {}, 'Null metadata should map to an empty object')

  // --- mapVersionRow ---
  const versionRecord = mapVersionRow({
    id: 'v1',
    report_id: 'r1',
    user_id: 'user_123',
    version_number: 3,
    label: 'Version 3',
    content: '# v3',
    change_note: 'Fixed section 4',
    created_at: '2026-07-08T02:00:00Z',
  })
  assert.equal(versionRecord.reportId, 'r1')
  assert.equal(versionRecord.versionNumber, 3)
  assert.equal(versionRecord.changeNote, 'Fixed section 4')

  // --- mapFindingRow: valid severity preserved ---
  const findingRecord = mapFindingRow({
    id: 'f1',
    report_id: 'r1',
    user_id: 'user_123',
    severity: 'red',
    title: 'No breach notification clause',
    detail: 'RA 10173 requires NPC notification within 72 hours.',
    authority_citation: 'RA 10173',
    authority_source_url: 'https://privacy.gov.ph/data-privacy-act/',
    checklist_item: 'Add breach notification procedure',
    is_checklist: true,
    is_checked: false,
    position: 2,
    created_at: '2026-07-08T03:00:00Z',
    updated_at: '2026-07-08T03:00:00Z',
  })
  assert.equal(findingRecord.severity, 'red')
  assert.equal(findingRecord.authorityCitation, 'RA 10173')
  assert.equal(findingRecord.isChecklist, true)
  assert.equal(findingRecord.position, 2)

  // --- mapFindingRow: unknown severity falls back to 'amber', not a crash ---
  const coercedFinding = mapFindingRow({
    id: 'f2',
    report_id: 'r1',
    user_id: 'user_123',
    severity: 'purple',
    title: 'Odd severity',
    detail: null,
    authority_citation: null,
    authority_source_url: null,
    checklist_item: null,
    is_checklist: false,
    is_checked: false,
    position: 0,
    created_at: '2026-07-08T03:00:00Z',
    updated_at: '2026-07-08T03:00:00Z',
  })
  assert.equal(coercedFinding.severity, 'amber', 'Unknown severity should coerce to amber')

  // --- Unwired repository throws loudly, never silently drops data ---
  const repo = createComplianceReportRepository()
  assert.throws(
    () => repo.createReport({}),
    CompliancePersistenceNotWiredError,
    'Unwired repository must throw, not silently succeed'
  )
  assert.throws(() => repo.appendVersion({}), CompliancePersistenceNotWiredError)
  assert.throws(() => repo.listFindings('r1'), CompliancePersistenceNotWiredError)

  // --- AI-use disclosure (P0-3) ---
  const { buildAiUseDisclosure, renderAiUseDisclosureMarkdown } = disclosure.module

  const localDisclosure = buildAiUseDisclosure({
    version: '0.5.2',
    providerMode: 'local-providerless',
    reason: 'Philippine legal research and document compliance review',
    humanOversight: 'Reviewed and edited by the filing lawyer before use',
    citedAuthorities: [
      { citation: 'RA 10173', sourceUrl: 'https://privacy.gov.ph/data-privacy-act/', verifiedAt: '2026-06-25' },
    ],
    generatedAt: '2026-07-08T04:00:00Z',
  })
  assert.equal(localDisclosure.tool, 'LexInsights', 'Tool should default to LexInsights')
  assert.equal(localDisclosure.modelInvoked, false, 'Local providerless mode invokes no model')

  const localMarkdown = renderAiUseDisclosureMarkdown(localDisclosure)
  for (const required of ['**Tool used:**', '**Version:**', '**Reason for use:**', '**Degree of human oversight:**']) {
    assert.ok(localMarkdown.includes(required), `Disclosure must declare ${required} (A.M. No. 25-11-28-SC)`)
  }
  assert.ok(localMarkdown.includes('A.M. No. 25-11-28-SC'), 'Disclosure must cite the SC framework')
  assert.ok(localMarkdown.includes('RA 10173'), 'Cited authorities should appear in the disclosure')
  assert.ok(localMarkdown.includes('source last verified 2026-06-25'), 'Verification date should render')
  assert.ok(localMarkdown.includes('Generative model invoked:** No'), 'Local mode should declare no model invoked')
  assert.ok(localMarkdown.includes('sole'), 'Disclosure must include the not-sole-basis caveat')

  const remoteDisclosure = buildAiUseDisclosure({
    tool: 'LexInsights',
    version: '0.5.2',
    providerMode: 'remote-rag',
    reason: 'Deep search research',
    humanOversight: 'Draft only; not yet reviewed',
    generatedAt: '2026-07-08T05:00:00Z',
  })
  assert.equal(remoteDisclosure.modelInvoked, true, 'Remote RAG mode may invoke a model')
  assert.deepEqual(remoteDisclosure.citedAuthorities, [], 'Missing authorities should default to empty')

  console.log('Compliance persistence self-test passed.')
} finally {
  repository.cleanup()
  disclosure.cleanup()
}
