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

function assertNoFinding(response, titleFragment) {
  const findings = [
    ...response.analysis.green_findings,
    ...response.analysis.amber_findings,
    ...response.analysis.red_findings,
  ]
  const match = findings.find((finding) => finding.title.toLowerCase().includes(titleFragment.toLowerCase()))

  assert.equal(match, undefined, `Did not expect finding containing "${titleFragment}"`)
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
    getLocalComplianceFrameworks,
    getLocalResearchCorpus,
    getLocalResearchHealth,
    runLocalDraftCheck,
    runLocalResearch,
  } = providerless

  assert.equal(typeof runLocalResearch, 'function', 'runLocalResearch export is missing')
  assert.equal(typeof runLocalDraftCheck, 'function', 'runLocalDraftCheck export is missing')

  const corpus = getLocalResearchCorpus()
  const frameworks = getLocalComplianceFrameworks()
  assert.ok(corpus.length >= 15, 'Local corpus should include at least 15 authorities')
  assert.ok(frameworks.length >= 8, 'Local corpus should include compliance framework bundles')
  assert.ok(
    frameworks.some((framework) => framework.id === 'data-incident-response'),
    'Frameworks should include data incident response'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'environmental-operations'),
    'Frameworks should include environmental operations'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'health-welfare-and-accessibility'),
    'Frameworks should include health and welfare accessibility'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'ip-investment-and-regulated-products'),
    'Frameworks should include IP, investment, and regulated products'
  )
  assert.ok(corpus.some((document) => document.statute === 'RA 9003'), 'Corpus should include RA 9003')
  assert.ok(corpus.some((document) => document.statute === 'RA 10173'), 'Corpus should include RA 10173')
  assert.ok(corpus.some((document) => document.statute === 'RA 11058'), 'Corpus should include RA 11058')
  assert.ok(corpus.some((document) => document.statute === 'RA 12009'), 'Corpus should include RA 12009')
  assert.ok(corpus.some((document) => document.statute === 'RA 11032'), 'Corpus should include RA 11032')
  assert.ok(corpus.some((document) => document.statute === 'RA 10175'), 'Corpus should include RA 10175')
  assert.ok(corpus.some((document) => document.statute === 'RA 9775'), 'Corpus should include RA 9775')
  assert.ok(corpus.some((document) => document.statute === 'RA 9160'), 'Corpus should include RA 9160')
  assert.ok(corpus.some((document) => document.statute === 'RA 7394'), 'Corpus should include RA 7394')
  assert.ok(corpus.some((document) => document.statute === 'RA 10667'), 'Corpus should include RA 10667')
  assert.ok(corpus.some((document) => document.statute === 'RA 11765'), 'Corpus should include RA 11765')
  assert.ok(corpus.some((document) => document.statute === 'RA 6969'), 'Corpus should include RA 6969')
  assert.ok(corpus.some((document) => document.statute === 'RA 11285'), 'Corpus should include RA 11285')
  assert.ok(corpus.some((document) => document.statute === 'RA 11934'), 'Corpus should include RA 11934')
  assert.ok(corpus.some((document) => document.statute === 'RA 9995'), 'Corpus should include RA 9995')
  assert.ok(corpus.some((document) => document.statute === 'RA 7877'), 'Corpus should include RA 7877')
  assert.ok(corpus.some((document) => document.statute === 'RA 10627'), 'Corpus should include RA 10627')
  assert.ok(corpus.some((document) => document.statute === 'RA 10863'), 'Corpus should include RA 10863')
  assert.ok(corpus.some((document) => document.statute === 'RA 11976'), 'Corpus should include RA 11976')
  assert.ok(corpus.some((document) => document.statute === 'RA 11055'), 'Corpus should include RA 11055')
  assert.ok(corpus.some((document) => document.statute === 'RA 11038'), 'Corpus should include RA 11038')
  assert.ok(corpus.some((document) => document.statute === 'PD 442'), 'Corpus should include PD 442')
  assert.ok(corpus.some((document) => document.statute === 'RA 10911'), 'Corpus should include RA 10911')
  assert.ok(corpus.some((document) => document.statute === 'RA 11036'), 'Corpus should include RA 11036')
  assert.ok(corpus.some((document) => document.statute === 'RA 9262'), 'Corpus should include RA 9262')
  assert.ok(corpus.some((document) => document.statute === 'RA 10364'), 'Corpus should include RA 10364')
  assert.ok(corpus.some((document) => document.statute === 'RA 8293'), 'Corpus should include RA 8293')
  assert.ok(corpus.some((document) => document.statute === 'RA 8799'), 'Corpus should include RA 8799')
  assert.ok(corpus.some((document) => document.statute === 'RA 9711'), 'Corpus should include RA 9711')
  assert.ok(corpus.some((document) => document.statute === 'RA 11223'), 'Corpus should include RA 11223')
  assert.ok(corpus.some((document) => document.statute === 'RA 10066'), 'Corpus should include RA 10066')
  assert.ok(corpus.some((document) => document.statute === 'RA 9994'), 'Corpus should include RA 9994')
  assert.ok(corpus.some((document) => document.statute === 'RA 7277'), 'Corpus should include RA 7277')

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
    deepSearchResponse.summary,
    '## Local Compliance Framework',
    'Privacy deep-search framework section'
  )
  assertIncludes(
    deepSearchResponse.summary,
    'Data, Cyber, and Mobile Incident Response Stack',
    'Privacy deep-search framework title'
  )
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

  assertResearchMatch(
    runLocalResearch(
      { query: 'How should a city avoid price fixing, bid rigging, and exclusive supplier competition risks?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10667',
    'competition query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What financial consumer protection controls apply to wallet fraud and unauthorized transactions?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11765',
    'financial consumer query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What permits and manifests are needed for hazardous chemical waste storage and transport?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 6969',
    'hazardous waste query'
  )

  const environmentalFrameworkResponse = runLocalResearch(
    { query: 'What environmental compliance controls apply to hazardous waste, wastewater, and air emissions?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(environmentalFrameworkResponse, 'RA 6969', 'environmental framework query')
  assertIncludes(
    environmentalFrameworkResponse.summary,
    'Environmental Operations and Facility Controls Stack',
    'Environmental framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What energy efficiency audit and conservation officer controls apply to public buildings?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11285',
    'energy efficiency query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What SIM registration and subscriber data safeguards apply to mobile number fraud reports?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11934',
    'sim registration query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What safeguards apply to intimate photo and video takedown complaints?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9995',
    'private image query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What committee on decorum and investigation steps are required for workplace sexual harassment complaints?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7877',
    'sexual harassment query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What school policy controls are needed for cyberbullying reports?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10627',
    'anti-bullying query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What customs declaration, valuation, tariff, and broker controls apply to imported equipment?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10863',
    'customs query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What invoice, receipt, VAT, filing, and taxpayer controls apply to local payment collection?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11976',
    'tax administration query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What privacy safeguards apply when collecting PhilSys national ID and biometric data?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11055',
    'philsys query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What approvals are needed for ecotourism inside a protected area buffer zone and PAMB jurisdiction?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11038',
    'protected areas query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Labor Code controls apply to wage, overtime, rest day, and termination policies?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'PD 442',
    'labor code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'Can a job post set a maximum age requirement for applicants?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10911',
    'age discrimination query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What mental health counseling confidentiality and crisis referral safeguards should a school policy include?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11036',
    'mental health query'
  )

  const healthWelfareFrameworkResponse = runLocalResearch(
    { query: 'What mental health, PWD accessibility, and senior citizen service safeguards should an LGU policy include?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(healthWelfareFrameworkResponse, 'RA 7277', 'health welfare framework PWD query')
  assertResearchMatch(healthWelfareFrameworkResponse, 'RA 9994', 'health welfare framework senior query')
  assertIncludes(
    healthWelfareFrameworkResponse.summary,
    'Health, Welfare, Accessibility, and Protection Stack',
    'Health welfare framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What VAWC protection order and confidentiality controls should a barangay desk follow?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9262',
    'VAWC protection query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What anti-trafficking victim referral and recovery controls apply to recruitment complaints?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10364',
    'anti-trafficking query'
  )

  const ipInvestmentFrameworkResponse = runLocalResearch(
    { query: 'What copyright, software license, trademark, and investment offer controls should an online product launch check?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(ipInvestmentFrameworkResponse, 'RA 8293', 'IP investment framework query')
  assertResearchMatch(ipInvestmentFrameworkResponse, 'RA 8799', 'IP investment securities query')
  assertIncludes(
    ipInvestmentFrameworkResponse.summary,
    'IP, Investment, Health Product, and Market Claims Stack',
    'IP investment framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What FDA registration, labeling, adverse event, and recall controls apply to health product sellers?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9711',
    'FDA health product query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Universal Health Care referral and primary care network controls apply to local health services?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11223',
    'universal health care query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What heritage conservation approvals are needed before altering a historic building or cultural property?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10066',
    'cultural heritage query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What senior citizen OSCA discount and VAT exemption controls should a local benefit desk use?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9994',
    'senior citizen query'
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

  const partialChildSafetyDraft = `# Online Child Safety Reporting Ordinance

## Purpose
This ordinance addresses online child safety incidents in internet cafes.

## Legal Basis
Pursuant to RA 9775 and RA 10175.

## Scope
This applies to covered establishments and online reporting channels.

## Responsible Office
The social welfare office shall implement this ordinance.

## Requirements
Covered establishments shall report child online safety incidents.

## Monitoring
The information office shall submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const partialChildSafetyDraftResponse = runLocalDraftCheck(
    { draft_markdown: partialChildSafetyDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(partialChildSafetyDraftResponse.status, 'success', 'Partial child-safety draft check should succeed locally')
  assertFinding(partialChildSafetyDraftResponse, 'amber', 'Child online safety controls')

  const minorScholarshipDraft = `# Minor Student Scholarship Ordinance

## Purpose
This ordinance creates a scholarship program for minor students.

## Legal Basis
Pursuant to RA 7160.

## Scope
This applies to students who meet eligibility requirements.

## Responsible Office
The education office shall implement this ordinance.

## Requirements
Applicants shall submit school records.

## Monitoring
The office shall submit annual reports.

## Budget
Funds shall come from the education budget.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const minorScholarshipDraftResponse = runLocalDraftCheck(
    { draft_markdown: minorScholarshipDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(minorScholarshipDraftResponse.status, 'success', 'Minor scholarship draft check should succeed locally')
  assertNoFinding(minorScholarshipDraftResponse, 'Child online safety controls')

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

  const partialAmlDraft = `# Local Remittance Monitoring Ordinance

## Purpose
This ordinance addresses money laundering risks in local remittance and payment services.

## Legal Basis
Pursuant to RA 9160.

## Scope
This applies to covered money service businesses operating in the municipality.

## Responsible Office
The licensing office shall implement this ordinance.

## Requirements
Covered businesses shall conduct KYC before transactions.

## Monitoring
The licensing office shall submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const partialAmlDraftResponse = runLocalDraftCheck(
    { draft_markdown: partialAmlDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(partialAmlDraftResponse.status, 'success', 'Partial AML draft check should succeed locally')
  assertFinding(partialAmlDraftResponse, 'amber', 'AML controls')

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

  const thinFinancialConsumerDraft = `# Wallet Fraud Assistance Policy

## Purpose
This policy handles wallet fraud and unauthorized transaction complaints.

## Legal Basis
Pursuant to RA 11765 and RA 10173.

## Scope
This applies to local payment partners and consumer reports.

## Responsible Office
The consumer desk shall implement this policy.

## Requirements
Customers shall report suspicious transfers.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinFinancialConsumerDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinFinancialConsumerDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinFinancialConsumerDraftResponse.status, 'success', 'Financial consumer draft check should succeed locally')
  assertFinding(thinFinancialConsumerDraftResponse, 'amber', 'Financial consumer protection')

  const thinHazardousWasteDraft = `# Chemical Waste Storage Ordinance

## Purpose
This ordinance regulates hazardous waste and chemical spill risks.

## Legal Basis
Pursuant to RA 6969.

## Scope
This applies to covered establishments storing toxic substances.

## Responsible Office
The environment office shall implement this ordinance.

## Requirements
Covered establishments shall store chemicals safely.

## Monitoring
The environment office shall submit annual reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinHazardousWasteDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinHazardousWasteDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinHazardousWasteDraftResponse.status, 'success', 'Hazardous waste draft check should succeed locally')
  assertFinding(thinHazardousWasteDraftResponse, 'amber', 'Hazardous substance controls')

  const thinCompetitionDraft = `# Exclusive Supplier Accreditation Ordinance

## Purpose
This ordinance creates an exclusive supplier list for public market services.

## Legal Basis
Pursuant to RA 10667 and RA 12009.

## Scope
This applies to accredited suppliers.

## Responsible Office
The procurement office shall implement this ordinance.

## Requirements
Accredited suppliers shall be listed by the city.

## Monitoring
The office shall submit annual reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinCompetitionDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinCompetitionDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinCompetitionDraftResponse.status, 'success', 'Competition draft check should succeed locally')
  assertFinding(thinCompetitionDraftResponse, 'amber', 'Competition safeguards')

  const thinSimDraft = `# Mobile Number Fraud Reporting Policy

## Purpose
This policy handles SIM and mobile number fraud reports from residents.

## Legal Basis
Pursuant to RA 11934 and RA 10173.

## Scope
This applies to resident reports involving SMS fraud.

## Responsible Office
The information office shall implement this policy.

## Requirements
Residents shall report suspicious mobile messages.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinSimDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinSimDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinSimDraftResponse.status, 'success', 'SIM draft check should succeed locally')
  assertFinding(thinSimDraftResponse, 'amber', 'SIM and mobile-number controls')

  const thinLaborDraft = `# Worker Scheduling Policy

## Purpose
This policy governs labor service workers and contractors assigned to municipal facilities.

## Legal Basis
Pursuant to PD 442.

## Scope
This applies to workers assigned through local service arrangements.

## Responsible Office
The administration office shall implement this policy.

## Requirements
Workers shall follow the posted schedule and supervisor instructions.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinLaborDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinLaborDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinLaborDraftResponse.status, 'success', 'Labor draft check should succeed locally')
  assertFinding(thinLaborDraftResponse, 'amber', 'Employment and labor-standard')

  const thinMentalHealthDraft = `# School Mental Health Referral Program

## Purpose
This program offers mental health and psychosocial assistance to students.

## Legal Basis
Pursuant to RA 11036 and RA 10173.

## Scope
This applies to school support requests.

## Responsible Office
The guidance office shall implement this program.

## Requirements
Students may request counseling support.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This program takes effect 30 days after publication.`

  const thinMentalHealthDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinMentalHealthDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinMentalHealthDraftResponse.status, 'success', 'Mental health draft check should succeed locally')
  assertFinding(thinMentalHealthDraftResponse, 'amber', 'Mental-health support')

  const thinProtectionDraft = `# Recruitment Complaint Assistance Protocol

## Purpose
This protocol handles trafficking and forced labor complaints involving recruitment promises.

## Legal Basis
Pursuant to RA 10364 and RA 9262.

## Scope
This applies to reports from residents and families.

## Responsible Office
The help desk shall implement this protocol.

## Requirements
Residents shall report suspicious recruitment activity.

## Monitoring
The help desk shall submit quarterly reports.

## Effectivity
This protocol takes effect 30 days after publication.`

  const thinProtectionDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinProtectionDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinProtectionDraftResponse.status, 'success', 'Protection draft check should succeed locally')
  assertFinding(thinProtectionDraftResponse, 'amber', 'Anti-trafficking response')

  const thinIpInvestmentDraft = `# Online Product Launch Policy

## Purpose
This policy governs software, logo, brand, user generated content, and investment offer materials.

## Legal Basis
Pursuant to RA 8293 and RA 8799.

## Scope
This applies to product teams and public launch pages.

## Responsible Office
The product office shall implement this policy.

## Requirements
Teams shall publish launch materials after manager approval.

## Monitoring
The product office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinIpInvestmentDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinIpInvestmentDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinIpInvestmentDraftResponse.status, 'success', 'IP investment draft check should succeed locally')
  assertFinding(thinIpInvestmentDraftResponse, 'amber', 'Intellectual-property controls')
  assertFinding(thinIpInvestmentDraftResponse, 'amber', 'Investment or securities')

  const thinHealthProductDraft = `# Wellness Product Sales Policy

## Purpose
This policy covers health product and supplement sales through online channels.

## Legal Basis
Pursuant to RA 9711 and RA 7394.

## Scope
This applies to marketplace sellers.

## Responsible Office
The consumer desk shall implement this policy.

## Requirements
Sellers shall submit product details before listing.

## Monitoring
The consumer desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinHealthProductDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinHealthProductDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinHealthProductDraftResponse.status, 'success', 'Health product draft check should succeed locally')
  assertFinding(thinHealthProductDraftResponse, 'amber', 'Health-product controls')

  const thinAccessibilityDraft = `# PWD and Senior Citizen Desk Policy

## Purpose
This policy creates a PWD and senior citizen benefit desk.

## Legal Basis
Pursuant to RA 7277 and RA 9994.

## Scope
This applies to local resident support requests.

## Responsible Office
The social services office shall implement this policy.

## Requirements
Residents shall submit benefit requests to the desk.

## Monitoring
The social services office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinAccessibilityDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinAccessibilityDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinAccessibilityDraftResponse.status, 'success', 'Accessibility draft check should succeed locally')
  assertFinding(thinAccessibilityDraftResponse, 'amber', 'Senior-citizen benefit')
  assertFinding(thinAccessibilityDraftResponse, 'amber', 'PWD accessibility')

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
