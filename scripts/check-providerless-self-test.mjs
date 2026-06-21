#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import ts from 'typescript'

const rootDir = process.cwd()
const sourcePath = path.join(rootDir, 'src/lib/services/local-legal-research.ts')

function assertIncludes(source, expected, label) {
  assert.equal(
    source.includes(expected),
    true,
    `${label} must include ${expected}`
  )
}

function assertFinding(response, status, titleFragment) {
  const findings = [
    ...response.analysis.green_findings,
    ...response.analysis.amber_findings,
    ...response.analysis.red_findings,
  ]
  const match = findings.find((finding) => (
    finding.status === status && finding.title.toLowerCase().includes(titleFragment.toLowerCase())
  ))

  assert.ok(match, `Expected ${status} finding containing "${titleFragment}"`)
}

function assertResearchMatch(response, expectedStatute, label) {
  assert.equal(response.status, 'completed', `${label} should complete`)
  assert.equal(response.provider_mode, 'local-providerless', `${label} should use local providerless mode`)
  assert.equal(response.fallback_used, true, `${label} should record fallback use`)
  assert.ok((response.documents_found || 0) > 0, `${label} should find documents`)
  assert.ok((response.confidence_score || 0) > 0.3, `${label} should include confidence`)
  assert.ok(
    response.matched_documents?.some((document) => document.statute === expectedStatute),
    `${label} should match ${expectedStatute}`
  )
  assertIncludes(response.summary, expectedStatute, `${label} summary`)
}

function assertMatchedTerm(response, expectedStatute, expectedTerm, label) {
  const match = response.matched_documents?.find((document) => document.statute === expectedStatute)

  assert.ok(match, `${label} should include ${expectedStatute}`)
  assert.ok(
    match.matched_terms.includes(expectedTerm),
    `${label} should include matched term "${expectedTerm}"`
  )
}

async function loadProviderlessModule() {
  assert.equal(existsSync(sourcePath), true, 'local-legal-research.ts is missing')

  const source = readFileSync(sourcePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    fileName: sourcePath,
  })
  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsight-providerless-'))
  const tempModulePath = path.join(tempDir, 'local-legal-research.mjs')

  writeFileSync(tempModulePath, transpiled.outputText, 'utf8')

  try {
    return {
      module: await import(pathToFileURL(tempModulePath).href),
      cleanup: () => rmSync(tempDir, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(tempDir, { recursive: true, force: true })
    throw error
  }
}

const { module: providerless, cleanup } = await loadProviderlessModule()

try {
  const {
    getLocalResearchCorpus,
    getLocalResearchHealth,
    runLocalDraftCheck,
    runLocalResearch,
  } = providerless

  assert.equal(typeof runLocalResearch, 'function', 'runLocalResearch export is missing')
  assert.equal(typeof runLocalDraftCheck, 'function', 'runLocalDraftCheck export is missing')

  const corpus = getLocalResearchCorpus()
  assert.ok(corpus.length >= 15, 'Local corpus should include at least 15 authorities')
  assert.ok(corpus.some((document) => document.statute === 'RA 9003'), 'Corpus should include RA 9003')
  assert.ok(corpus.some((document) => document.statute === 'RA 10173'), 'Corpus should include RA 10173')
  assert.ok(corpus.some((document) => document.statute === 'RA 11058'), 'Corpus should include RA 11058')
  assert.ok(corpus.some((document) => document.statute === 'RA 12009'), 'Corpus should include RA 12009')
  assert.ok(corpus.some((document) => document.statute === 'RA 11032'), 'Corpus should include RA 11032')
  assert.ok(corpus.some((document) => document.statute === 'RA 10175'), 'Corpus should include RA 10175')
  assert.ok(corpus.some((document) => document.statute === 'RA 9775'), 'Corpus should include RA 9775')
  assert.ok(corpus.some((document) => document.statute === 'RA 9160'), 'Corpus should include RA 9160')
  assert.ok(corpus.some((document) => document.statute === 'RA 7394'), 'Corpus should include RA 7394')

  assertResearchMatch(
    runLocalResearch(
      { query: 'What is RA 9003 and its main requirements?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9003',
    'solid waste query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What are workplace safety requirements for construction sites?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11058',
    'workplace safety query'
  )

  const deepSearchResponse = runLocalResearch(
    {
      query: 'What privacy controls are needed for health records and breach response?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )

  assertResearchMatch(deepSearchResponse, 'RA 10173', 'privacy deep-search query')
  assert.equal(deepSearchResponse.deep_search_used, true, 'Deep search flag should be retained')
  assertIncludes(
    deepSearchResponse.processing_stages?.deep_search_orchestrator || '',
    'local cross-reference expansion',
    'Deep search processing metadata'
  )

  const formattedCitationResponse = runLocalResearch(
    {
      query: 'What controls apply under R.A. No. 10173 and RA No. 8792 for online consent records?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )

  assertResearchMatch(formattedCitationResponse, 'RA 10173', 'formatted citation query')
  assertMatchedTerm(
    formattedCitationResponse,
    'RA 10173',
    'explicit citation: RA 10173',
    'formatted citation query'
  )
  assertMatchedTerm(
    formattedCitationResponse,
    'RA 8792',
    'explicit citation: RA 8792',
    'formatted citation query'
  )
  assertIncludes(
    formattedCitationResponse.summary,
    'RA 10173 was cited and is included in the bundled local corpus',
    'Formatted citation coverage summary'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What safeguards apply under RA 12009 for LGU procurement and BAC bidding?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 12009',
    'procurement query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 11032 require for business permit processing and citizen charter timelines?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11032',
    'service delivery query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'How should an online fraud and account compromise ordinance handle cyber incident reports?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10175',
    'cybercrime query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 9775 require for online child safety reporting by internet content hosts?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9775',
    'child online safety query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What AML controls apply under RA 9160 for covered persons, KYC, and suspicious transaction reports?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9160',
    'anti-money laundering query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What consumer warranty and labeling controls apply to local product sellers?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7394',
    'consumer protection query'
  )

  const noResultsResponse = runLocalResearch(
    { query: 'banana smoothie recipe with cinnamon', user_id: 'self-test' },
    'simulated remote outage'
  )
  assert.equal(noResultsResponse.status, 'no_results', 'Unrelated query should return no_results')
  assert.equal(noResultsResponse.documents_found, 0, 'Unrelated query should not find documents')
  assertIncludes(noResultsResponse.summary, 'No strong match', 'No-results summary')

  const riskyDraft = `# Barangay Resident Registry Ordinance

## Purpose
Create a registry of residents for local services.

## Requirements
All residents shall submit name, address, phone number, government ID number, and health status.

## Penalties
Failure to submit shall be fined PHP 5,000 and may result in suspension of barangay clearance.

## Reporting
The barangay office shall submit monthly registry reports.`

  const riskyDraftResponse = runLocalDraftCheck(
    { draft_markdown: riskyDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(riskyDraftResponse.status, 'success', 'Risky draft check should succeed locally')
  assert.equal(riskyDraftResponse.analysis.status, 'completed', 'Risky draft analysis should complete')
  assert.ok(riskyDraftResponse.analysis.red_count >= 3, 'Risky draft should surface red findings')
  assert.ok(riskyDraftResponse.analysis.compliance_score < 70, 'Risky draft score should be conservative')
  assertFinding(riskyDraftResponse, 'red', 'No explicit legal authority')
  assertFinding(riskyDraftResponse, 'red', 'Personal-data processing')
  assertFinding(riskyDraftResponse, 'red', 'Penalties lack due process')

  const unknownCitationDraft = `# Local Licensing Ordinance

## Purpose
Create a local licensing workflow for covered businesses.

## Legal Basis
Pursuant to RA No. 12345 and implementing local authority.

## Scope
This applies to all covered establishments operating in the municipality.

## Responsible Office
The Business Permits and Licensing Office shall implement this ordinance.

## Requirements
Covered establishments shall file applications and maintain records.

## Monitoring
The responsible office shall inspect and submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const unknownCitationDraftResponse = runLocalDraftCheck(
    { draft_markdown: unknownCitationDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(unknownCitationDraftResponse.status, 'success', 'Unknown-citation draft check should succeed locally')
  assertFinding(unknownCitationDraftResponse, 'amber', 'Cited authority is outside the local corpus')

  const thinProcurementDraft = `# Municipal Procurement Ordinance

## Purpose
This ordinance creates a procurement program for supplies and infrastructure contracts.

## Legal Basis
Pursuant to RA 12009 and RA 7160.

## Scope
This applies to local procurement of goods and services.

## Responsible Office
The procurement office shall implement this ordinance.

## Requirements
The municipality shall select suppliers and issue contract awards.

## Monitoring
The responsible office shall submit annual procurement reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinProcurementDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinProcurementDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinProcurementDraftResponse.status, 'success', 'Procurement draft check should succeed locally')
  assertFinding(thinProcurementDraftResponse, 'amber', 'Procurement safeguards')

  const thinServiceDraft = `# Business Permit Streamlining Ordinance

## Purpose
This ordinance creates a faster application process for business permits.

## Legal Basis
Pursuant to RA 11032 and RA 7160.

## Scope
This applies to covered business permit applications.

## Responsible Office
The licensing office shall implement this ordinance.

## Requirements
Applicants shall submit forms and pay applicable fees.

## Monitoring
The licensing office shall submit annual reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinServiceDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinServiceDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinServiceDraftResponse.status, 'success', 'Service delivery draft check should succeed locally')
  assertFinding(thinServiceDraftResponse, 'amber', 'Government service delivery')

  const thinCyberDraft = `# Online Safety Incident Ordinance

## Purpose
This ordinance addresses online fraud and account compromise reports.

## Legal Basis
Pursuant to RA 10175 and RA 10173.

## Scope
This applies to municipal digital services and public reports.

## Responsible Office
The information office shall implement this ordinance.

## Requirements
Users shall report hacking, phishing, and account compromise incidents.

## Monitoring
The information office shall submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinCyberDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinCyberDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinCyberDraftResponse.status, 'success', 'Cyber draft check should succeed locally')
  assertFinding(thinCyberDraftResponse, 'amber', 'Cyber incident controls')

  const thinChildSafetyDraft = `# Online Child Safety Reporting Ordinance

## Purpose
This ordinance addresses online child safety incidents in internet cafes and local digital platforms.

## Legal Basis
Pursuant to RA 9775 and RA 10175.

## Scope
This applies to covered establishments and online reporting channels.

## Responsible Office
The information office shall implement this ordinance.

## Requirements
Covered establishments shall report child online safety incidents.

## Monitoring
The information office shall submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinChildSafetyDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinChildSafetyDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinChildSafetyDraftResponse.status, 'success', 'Child-safety draft check should succeed locally')
  assertFinding(thinChildSafetyDraftResponse, 'amber', 'Child online safety controls')

  const thinAmlDraft = `# Local Remittance Monitoring Ordinance

## Purpose
This ordinance addresses money laundering risks in local remittance and payment services.

## Legal Basis
Pursuant to RA 9160.

## Scope
This applies to covered money service businesses operating in the municipality.

## Responsible Office
The licensing office shall implement this ordinance.

## Requirements
Covered businesses shall monitor transactions and report issues.

## Monitoring
The licensing office shall submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinAmlDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinAmlDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinAmlDraftResponse.status, 'success', 'AML draft check should succeed locally')
  assertFinding(thinAmlDraftResponse, 'amber', 'AML controls')

  const thinConsumerDraft = `# Local Consumer Complaint Ordinance

## Purpose
This ordinance creates a consumer complaint desk for product sellers.

## Legal Basis
Pursuant to RA 7394 and RA 7160.

## Scope
This applies to local sellers and consumer complaints.

## Responsible Office
The consumer welfare desk shall implement this ordinance.

## Requirements
Sellers shall respond to customer quality and sales issues.

## Monitoring
The responsible office shall submit monthly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinConsumerDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinConsumerDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinConsumerDraftResponse.status, 'success', 'Consumer draft check should succeed locally')
  assertFinding(thinConsumerDraftResponse, 'amber', 'Consumer protection')

  const strongerDraft = `# Solid Waste Segregation Ordinance

## Purpose
This ordinance establishes source segregation and collection controls.

## Legal Basis
Pursuant to RA 9003 and RA 7160.

## Scope
This applies to households, business establishments, and barangay facilities.

## Definition of Terms
Biodegradable, recyclable, residual, and special waste shall refer to the waste streams used in this ordinance.

## Responsible Office
The Municipal Environment and Natural Resources Office shall implement this ordinance with the barangay council.

## Requirements
Covered persons shall segregate waste at source, use collection schedules, and bring recyclables to the materials recovery facility.

## Monitoring
The responsible office shall inspect collection points and submit monthly reports.

## Budget
Implementation shall be funded from the annual environmental management allocation.

## Effectivity
This takes effect 30 days after publication.

## Penalties and Appeal
Violations require written notice, a hearing, and an appeal period before any fine is imposed.

## Public Consultation
The local government shall conduct public consultation before updating collection routes.`

  const strongerDraftResponse = runLocalDraftCheck(
    { draft_markdown: strongerDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(strongerDraftResponse.status, 'success', 'Stronger draft check should succeed locally')
  assert.equal(strongerDraftResponse.analysis.red_count, 0, 'Stronger draft should not have red findings')
  assert.ok(strongerDraftResponse.analysis.green_count >= 4, 'Stronger draft should have green findings')
  assert.ok(strongerDraftResponse.analysis.compliance_score >= 75, 'Stronger draft should score as usable')
  assertFinding(strongerDraftResponse, 'green', 'Legal authority')
  assertFinding(strongerDraftResponse, 'green', 'Solid waste controls')

  const health = getLocalResearchHealth('simulated health outage')
  assert.equal(health.status, 'healthy', 'Local health should be healthy')
  assert.equal(health.provider_mode, 'local-providerless', 'Local health should expose provider mode')
  assert.equal(health.degraded, true, 'Local health should mark degraded when fallback reason is present')

  console.log('Providerless research self-test passed.')
} finally {
  cleanup()
}
