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
  assert.ok(corpus.length >= 133, 'Local corpus should include at least 133 authorities')
  assert.ok(frameworks.length >= 20, 'Local corpus should include compliance framework bundles')
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
    frameworks.some((framework) => framework.id === 'public-health-disease-reporting-and-sensitive-health-records'),
    'Frameworks should include public health, disease reporting, and sensitive health records'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'ip-investment-and-regulated-products'),
    'Frameworks should include IP, investment, and regulated products'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'built-environment-and-public-facilities'),
    'Frameworks should include built environment and public facilities'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'land-climate-coastal-and-resource-governance'),
    'Frameworks should include land, climate, coastal, and resource governance'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'education-housing-records-and-benefits'),
    'Frameworks should include education, housing, records, and benefits'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'mobility-land-agriculture-and-community-rights'),
    'Frameworks should include mobility, land, agriculture, and community rights'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'public-accountability-and-government-funds'),
    'Frameworks should include public accountability and government funds'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'employee-benefits-and-social-insurance'),
    'Frameworks should include employee benefits and social insurance'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'payments-credit-evidence-and-dispute-resolution'),
    'Frameworks should include payments, credit, evidence, and dispute resolution'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'civil-documents-family-and-claims'),
    'Frameworks should include civil documents, family status, evidence, and small claims'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'rights-criminal-enforcement-and-public-order'),
    'Frameworks should include rights, criminal enforcement, public order, and custody'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'business-market-entry-ownership-and-secured-finance'),
    'Frameworks should include business market entry, ownership, cooperative, and secured finance'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'immigration-citizenship-passports-and-overseas-filipino-records'),
    'Frameworks should include immigration, citizenship, passports, and overseas Filipino records'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'elections-civic-participation-and-youth-governance'),
    'Frameworks should include elections, civic participation, campaigns, and youth governance'
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
  assert.ok(corpus.some((document) => document.statute === 'RA 11332'), 'Corpus should include RA 11332')
  assert.ok(corpus.some((document) => document.statute === 'RA 9211'), 'Corpus should include RA 9211')
  assert.ok(corpus.some((document) => document.statute === 'RA 11900'), 'Corpus should include RA 11900')
  assert.ok(corpus.some((document) => document.statute === 'RA 11166'), 'Corpus should include RA 11166')
  assert.ok(corpus.some((document) => document.statute === 'RA 10152'), 'Corpus should include RA 10152')
  assert.ok(corpus.some((document) => document.statute === 'RA 7719'), 'Corpus should include RA 7719')
  assert.ok(corpus.some((document) => document.statute === 'RA 11215'), 'Corpus should include RA 11215')
  assert.ok(corpus.some((document) => document.statute === 'RA 10354'), 'Corpus should include RA 10354')
  assert.ok(corpus.some((document) => document.statute === 'RA 10066'), 'Corpus should include RA 10066')
  assert.ok(corpus.some((document) => document.statute === 'RA 9994'), 'Corpus should include RA 9994')
  assert.ok(corpus.some((document) => document.statute === 'RA 7277'), 'Corpus should include RA 7277')
  assert.ok(corpus.some((document) => document.statute === 'PD 1096'), 'Corpus should include PD 1096')
  assert.ok(corpus.some((document) => document.statute === 'PD 856'), 'Corpus should include PD 856')
  assert.ok(corpus.some((document) => document.statute === 'BP 344'), 'Corpus should include BP 344')
  assert.ok(corpus.some((document) => document.statute === 'RA 7610'), 'Corpus should include RA 7610')
  assert.ok(corpus.some((document) => document.statute === 'RA 8042'), 'Corpus should include RA 8042')
  assert.ok(corpus.some((document) => document.statute === 'RA 10022'), 'Corpus should include RA 10022')
  assert.ok(corpus.some((document) => document.statute === 'RA 11641'), 'Corpus should include RA 11641')
  assert.ok(corpus.some((document) => document.statute === 'CA 613'), 'Corpus should include CA 613')
  assert.ok(corpus.some((document) => document.statute === 'CA 473'), 'Corpus should include CA 473')
  assert.ok(corpus.some((document) => document.statute === 'RA 9139'), 'Corpus should include RA 9139')
  assert.ok(corpus.some((document) => document.statute === 'RA 9225'), 'Corpus should include RA 9225')
  assert.ok(corpus.some((document) => document.statute === 'RA 11983'), 'Corpus should include RA 11983')
  assert.ok(corpus.some((document) => document.statute === 'RA 8239'), 'Corpus should include RA 8239')
  assert.ok(corpus.some((document) => document.statute === 'BP 881'), 'Corpus should include BP 881')
  assert.ok(corpus.some((document) => document.statute === 'RA 8189'), 'Corpus should include RA 8189')
  assert.ok(corpus.some((document) => document.statute === 'RA 7166'), 'Corpus should include RA 7166')
  assert.ok(corpus.some((document) => document.statute === 'RA 9006'), 'Corpus should include RA 9006')
  assert.ok(corpus.some((document) => document.statute === 'RA 8436'), 'Corpus should include RA 8436')
  assert.ok(corpus.some((document) => document.statute === 'RA 9369'), 'Corpus should include RA 9369')
  assert.ok(corpus.some((document) => document.statute === 'RA 10742'), 'Corpus should include RA 10742')
  assert.ok(corpus.some((document) => document.statute === 'RA 11768'), 'Corpus should include RA 11768')
  assert.ok(corpus.some((document) => document.statute === 'RA 1405'), 'Corpus should include RA 1405')
  assert.ok(corpus.some((document) => document.statute === 'RA 7581'), 'Corpus should include RA 7581')
  assert.ok(corpus.some((document) => document.statute === 'RA 9178'), 'Corpus should include RA 9178')
  assert.ok(corpus.some((document) => document.statute === 'RA 9501'), 'Corpus should include RA 9501')
  assert.ok(corpus.some((document) => document.statute === 'RA 9513'), 'Corpus should include RA 9513')
  assert.ok(corpus.some((document) => document.statute === 'RA 9729'), 'Corpus should include RA 9729')
  assert.ok(corpus.some((document) => document.statute === 'RA 8550'), 'Corpus should include RA 8550')
  assert.ok(corpus.some((document) => document.statute === 'RA 7942'), 'Corpus should include RA 7942')
  assert.ok(corpus.some((document) => document.statute === 'RA 10533'), 'Corpus should include RA 10533')
  assert.ok(corpus.some((document) => document.statute === 'RA 10931'), 'Corpus should include RA 10931')
  assert.ok(corpus.some((document) => document.statute === 'RA 7279'), 'Corpus should include RA 7279')
  assert.ok(corpus.some((document) => document.statute === 'RA 11201'), 'Corpus should include RA 11201')
  assert.ok(corpus.some((document) => document.statute === 'RA 9470'), 'Corpus should include RA 9470')
  assert.ok(corpus.some((document) => document.statute === 'EO 2, s. 2016'), 'Corpus should include EO 2, s. 2016')
  assert.ok(corpus.some((document) => document.statute === 'RA 11310'), 'Corpus should include RA 11310')
  assert.ok(corpus.some((document) => document.statute === 'RA 11861'), 'Corpus should include RA 11861')
  assert.ok(corpus.some((document) => document.statute === 'RA 11596'), 'Corpus should include RA 11596')
  assert.ok(corpus.some((document) => document.statute === 'RA 11510'), 'Corpus should include RA 11510')
  assert.ok(corpus.some((document) => document.statute === 'RA 4136'), 'Corpus should include RA 4136')
  assert.ok(corpus.some((document) => document.statute === 'RA 11659'), 'Corpus should include RA 11659')
  assert.ok(corpus.some((document) => document.statute === 'RA 8371'), 'Corpus should include RA 8371')
  assert.ok(corpus.some((document) => document.statute === 'PD 1529'), 'Corpus should include PD 1529')
  assert.ok(corpus.some((document) => document.statute === 'RA 8435'), 'Corpus should include RA 8435')
  assert.ok(corpus.some((document) => document.statute === 'RA 10068'), 'Corpus should include RA 10068')
  assert.ok(corpus.some((document) => document.statute === 'RA 10611'), 'Corpus should include RA 10611')
  assert.ok(corpus.some((document) => document.statute === 'RA 11321'), 'Corpus should include RA 11321')
  assert.ok(corpus.some((document) => document.statute === 'RA 3019'), 'Corpus should include RA 3019')
  assert.ok(corpus.some((document) => document.statute === 'RA 6713'), 'Corpus should include RA 6713')
  assert.ok(corpus.some((document) => document.statute === 'PD 1445'), 'Corpus should include PD 1445')
  assert.ok(corpus.some((document) => document.statute === 'RA 7080'), 'Corpus should include RA 7080')
  assert.ok(corpus.some((document) => document.statute === 'RA 10149'), 'Corpus should include RA 10149')
  assert.ok(corpus.some((document) => document.statute === 'RA 6758'), 'Corpus should include RA 6758')
  assert.ok(corpus.some((document) => document.statute === 'RA 11199'), 'Corpus should include RA 11199')
  assert.ok(corpus.some((document) => document.statute === 'RA 8291'), 'Corpus should include RA 8291')
  assert.ok(corpus.some((document) => document.statute === 'RA 9679'), 'Corpus should include RA 9679')
  assert.ok(corpus.some((document) => document.statute === 'RA 11210'), 'Corpus should include RA 11210')
  assert.ok(corpus.some((document) => document.statute === 'RA 8187'), 'Corpus should include RA 8187')
  assert.ok(corpus.some((document) => document.statute === 'RA 10361'), 'Corpus should include RA 10361')
  assert.ok(corpus.some((document) => document.statute === 'RA 10606'), 'Corpus should include RA 10606')
  assert.ok(corpus.some((document) => document.statute === 'RA 8484'), 'Corpus should include RA 8484')
  assert.ok(corpus.some((document) => document.statute === 'RA 4200'), 'Corpus should include RA 4200')
  assert.ok(corpus.some((document) => document.statute === 'BP 22'), 'Corpus should include BP 22')
  assert.ok(corpus.some((document) => document.statute === 'RA 9285'), 'Corpus should include RA 9285')
  assert.ok(corpus.some((document) => document.statute === 'RA 10142'), 'Corpus should include RA 10142')
  assert.ok(corpus.some((document) => document.statute === 'RA 9510'), 'Corpus should include RA 9510')
  assert.ok(corpus.some((document) => document.statute === 'RA 386'), 'Corpus should include RA 386')
  assert.ok(corpus.some((document) => document.statute === 'EO 209, s. 1987'), 'Corpus should include EO 209, s. 1987')
  assert.ok(corpus.some((document) => document.statute === 'Act No. 3753'), 'Corpus should include Act No. 3753')
  assert.ok(corpus.some((document) => document.statute === 'RA 9048'), 'Corpus should include RA 9048')
  assert.ok(corpus.some((document) => document.statute === 'RA 10172'), 'Corpus should include RA 10172')
  assert.ok(corpus.some((document) => document.statute === 'A.M. No. 02-8-13-SC'), 'Corpus should include A.M. No. 02-8-13-SC')
  assert.ok(corpus.some((document) => document.statute === 'Rules of Court'), 'Corpus should include Rules of Court')
  assert.ok(corpus.some((document) => document.statute === 'A.M. No. 08-8-7-SC'), 'Corpus should include A.M. No. 08-8-7-SC')
  assert.ok(corpus.some((document) => document.statute === '1987 Constitution'), 'Corpus should include the 1987 Constitution')
  assert.ok(corpus.some((document) => document.statute === 'Act No. 3815'), 'Corpus should include Act No. 3815')
  assert.ok(corpus.some((document) => document.id === 'rules-criminal-procedure'), 'Corpus should include criminal procedure rules')
  assert.ok(corpus.some((document) => document.statute === 'RA 9344'), 'Corpus should include RA 9344')
  assert.ok(corpus.some((document) => document.id === 'ra-9165-drugs'), 'Corpus should include RA 9165 dangerous-drugs coverage')
  assert.ok(corpus.some((document) => document.statute === 'RA 10591'), 'Corpus should include RA 10591')
  assert.ok(corpus.some((document) => document.statute === 'BP 880'), 'Corpus should include BP 880')
  assert.ok(corpus.some((document) => document.statute === 'RA 9745'), 'Corpus should include RA 9745')
  assert.ok(corpus.some((document) => document.statute === 'RA 9520'), 'Corpus should include RA 9520')
  assert.ok(corpus.some((document) => document.statute === 'RA 7042'), 'Corpus should include RA 7042')
  assert.ok(corpus.some((document) => document.statute === 'RA 11647'), 'Corpus should include RA 11647')
  assert.ok(corpus.some((document) => document.statute === 'RA 8762'), 'Corpus should include RA 8762')
  assert.ok(corpus.some((document) => document.statute === 'RA 11595'), 'Corpus should include RA 11595')
  assert.ok(corpus.some((document) => document.statute === 'RA 11057'), 'Corpus should include RA 11057')

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
      { query: 'What anti-graft controls apply to conflict of interest, kickbacks, unwarranted benefits, and supplier selection?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 3019',
    'anti-graft query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What SALN, gift, financial interest, and code of conduct controls apply to public officials?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 6713',
    'public ethics query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What COA audit, cash advance, liquidation, voucher, and public funds controls should a local aid program include?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'PD 1445',
    'government audit query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What plunder and ill-gotten wealth red flags apply to repeated public funds conversion, kickbacks, and commissions?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7080',
    'plunder query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What GOCC board, fit and proper, performance agreement, and compensation review controls apply to a public corporation?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10149',
    'GOCC governance query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What salary grade, honorarium, allowance, position classification, and DBM controls apply to government personnel compensation?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 6758',
    'public compensation query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What SSS employer contribution, member registration, sickness benefit, and retirement benefit controls should private payroll include?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11199',
    'SSS social security query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What GSIS service record, government employee retirement, separation benefit, and survivorship controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8291',
    'GSIS benefits query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Pag-IBIG HDMF contribution, member savings, remittance, and housing loan eligibility controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9679',
    'Pag-IBIG query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What 105-day maternity leave, miscarriage, solo parent extension, and non-discrimination controls apply to women workers?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11210',
    'maternity leave query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What paternity leave controls apply for spouse childbirth, miscarriage, seven days of leave, notice, and paid leave?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8187',
    'paternity leave query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What kasambahay domestic worker contract, minimum wage, rest day, SSS, PhilHealth, and Pag-IBIG controls apply to household employers?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10361',
    'kasambahay query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What PhilHealth national health insurance premium contribution, employer remittance, dependent coverage, and benefit claim controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10606',
    'PhilHealth insurance query'
  )

  const employeeBenefitsFrameworkResponse = runLocalResearch(
    {
      query: 'What employee benefits, SSS, GSIS, Pag-IBIG, PhilHealth, maternity leave, paternity leave, and kasambahay controls should payroll and HR check?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(employeeBenefitsFrameworkResponse, 'RA 11199', 'employee benefits framework SSS query')
  assertResearchMatch(employeeBenefitsFrameworkResponse, 'RA 10606', 'employee benefits framework PhilHealth query')
  assertResearchMatch(employeeBenefitsFrameworkResponse, 'RA 10361', 'employee benefits framework kasambahay query')
  assertIncludes(
    employeeBenefitsFrameworkResponse.summary,
    'Employee Benefits, Leave, and Social Insurance Stack',
    'Employee benefits framework title'
  )

  const publicAccountabilityFrameworkResponse = runLocalResearch(
    {
      query: 'What public accountability checks apply to a local cash aid program with supplier selection, conflict of interest, COA liquidation, public funds, gifts, and honoraria?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(publicAccountabilityFrameworkResponse, 'RA 3019', 'public accountability framework anti-graft query')
  assertResearchMatch(publicAccountabilityFrameworkResponse, 'PD 1445', 'public accountability framework audit query')
  assertIncludes(
    publicAccountabilityFrameworkResponse.summary,
    'Public Accountability, Ethics, Audit, and Government Funds Stack',
    'Public accountability framework title'
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
      { query: 'What access device and credit card fraud controls apply to unauthorized transactions, cardholder data, and skimming evidence?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8484',
    'access device fraud query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What anti-wiretapping safeguards apply to recorded conversations, phone call recording, interception, consent, and evidence custody?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 4200',
    'anti-wiretapping query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What BP 22 controls apply to bouncing checks, dishonored checks, insufficient funds, notice of dishonor, and payment demand?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'BP 22',
    'bouncing checks query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What ADR arbitration, mediation, neutral selection, confidentiality, and settlement agreement controls apply to supplier disputes?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9285',
    'ADR query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What financial rehabilitation, insolvency, liquidation, creditor claims, stay order, and restructuring controls apply to a distressed business?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10142',
    'financial rehabilitation query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What credit information, credit report, credit score, borrower data, CIC, correction, and authorized access controls apply to lending?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9510',
    'credit information query'
  )

  const paymentsCreditEvidenceFrameworkResponse = runLocalResearch(
    {
      query: 'What controls apply to payment fraud, access devices, recorded conversations, bouncing checks, credit reports, insolvency, mediation, and arbitration evidence?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(paymentsCreditEvidenceFrameworkResponse, 'RA 8484', 'payments framework access device query')
  assertResearchMatch(paymentsCreditEvidenceFrameworkResponse, 'RA 4200', 'payments framework recording query')
  assertResearchMatch(paymentsCreditEvidenceFrameworkResponse, 'RA 9285', 'payments framework ADR query')
  assertIncludes(
    paymentsCreditEvidenceFrameworkResponse.summary,
    'Payments, Credit, Evidence, and Dispute Resolution Stack',
    'Payments credit evidence framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Civil Code controls apply to contracts, obligations, consent, object, cause, breach, and damages?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 386',
    'civil code contract query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Family Code safeguards apply to marriage, custody, support, parental authority, and child welfare records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'EO 209, s. 1987',
    'family code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What civil registry controls apply to birth certificates, marriage certificates, local civil registrar records, and PSA certified copies?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'Act No. 3753',
    'civil registry law query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 9048 petition controls apply to clerical error correction, typographical error correction, and change of first name in a civil registry entry?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9048',
    'civil registry clerical correction query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 10172 controls apply to correction of sex, day of birth, month of birth, and supporting medical or public records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10172',
    'civil registry sex and birth-date correction query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What notarial practice controls apply to notarized affidavits, jurats, acknowledgments, personal appearance, competent evidence of identity, and notarial register entries?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'A.M. No. 02-8-13-SC',
    'notarial practice query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Rules on Evidence controls apply to admissibility, authentication, original documents, witnesses, hearsay, official records, and chain of custody?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'Rules of Court',
    'rules on evidence query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What small claims controls apply to money claims, unpaid accounts, demand letters, statements of claim, court filing, settlement, and evidence?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'A.M. No. 08-8-7-SC',
    'small claims query'
  )

  const civilDocumentsFrameworkResponse = runLocalResearch(
    {
      query: 'What controls apply to contracts, civil registry birth certificate corrections, notarized affidavits, evidence custody, family support, and small claims?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(civilDocumentsFrameworkResponse, 'RA 386', 'civil documents framework contract query')
  assertResearchMatch(civilDocumentsFrameworkResponse, 'Act No. 3753', 'civil documents framework registry query')
  assertResearchMatch(civilDocumentsFrameworkResponse, 'A.M. No. 02-8-13-SC', 'civil documents framework notarial query')
  assertIncludes(
    civilDocumentsFrameworkResponse.summary,
    'Civil Documents, Family Status, Evidence, and Small Claims Stack',
    'Civil documents framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Bill of Rights due process controls apply to search warrants, warrantless search, custodial investigation, free speech, and public assembly?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    '1987 Constitution',
    'constitutional rights query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Revised Penal Code controls apply to theft, estafa, falsification, libel, physical injuries, and criminal complaint intake?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'Act No. 3815',
    'revised penal code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What criminal procedure controls apply to complaint affidavits, preliminary investigation, inquest, arrest, search warrant, prosecutor review, bail, and custody records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'Rules of Court',
    'criminal procedure query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What juvenile justice controls apply to a child in conflict with the law, age verification, discernment, diversion, social worker coordination, and confidentiality?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9344',
    'juvenile justice query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What dangerous drugs controls apply to drug testing, PDEA coordination, controlled substances, chain of custody, laboratory examination, rehabilitation referral, and confidentiality?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9165',
    'dangerous drugs query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What firearms controls apply to LTOPF, firearm registration, ammunition, permit to carry, security guards, safe custody, transport, and incident reporting?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10591',
    'firearms query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What public assembly controls apply to rally permits, protests, demonstrations, freedom parks, maximum tolerance, police coordination, and written decisions?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'BP 880',
    'public assembly query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What anti-torture controls apply to detention, interrogation, custody, medical examination, complaint documentation, rights notice, and anti-retaliation?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9745',
    'anti-torture query'
  )

  const rightsCriminalFrameworkResponse = runLocalResearch(
    {
      query: 'What controls apply to police reports, criminal complaints for theft, estafa, falsification, search warrants, arrests, custody, minors, drug testing, firearms, public assemblies, and torture-risk safeguards?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(rightsCriminalFrameworkResponse, '1987 Constitution', 'rights framework constitutional query')
  assertResearchMatch(rightsCriminalFrameworkResponse, 'Act No. 3815', 'rights framework penal code query')
  assertResearchMatch(rightsCriminalFrameworkResponse, 'Rules of Court', 'rights framework procedure query')
  assertIncludes(
    rightsCriminalFrameworkResponse.summary,
    'Rights, Criminal Enforcement, Public Order, and Custody Stack',
    'Rights criminal enforcement framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What cooperative governance controls apply under RA 9520 for CDA registration, members, articles of cooperation, bylaws, general assembly, board duties, audit, and patronage refunds?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9520',
    'cooperative code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What foreign investment controls apply under RA 7042 for foreign equity, ownership restrictions, domestic market enterprises, export enterprises, negative list, and paid-in capital?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7042',
    'foreign investments act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 11647 amendments apply to foreign investors, startup or advanced technology claims, domestic market enterprise thresholds, negative list, and investment promotion coordination?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11647',
    'foreign investments amendment query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What retail trade controls apply under RA 8762 for foreign retailers, retail enterprises, retail stores, paid-up capital, investment per store, SEC or DTI registration, and consumer obligations?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8762',
    'retail trade liberalization query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 11595 updated retail trade controls apply to foreign retailer paid-up capital, investment per store, store opening, capitalization evidence, and registration?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11595',
    'retail trade amendment query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What personal property security controls apply under RA 11057 for security interests, movable collateral, secured creditors, debtors, financing statements, perfection, priority, enforcement, and release?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11057',
    'personal property security query'
  )

  const businessMarketEntryFrameworkResponse = runLocalResearch(
    {
      query: 'What controls apply to cooperative registration, foreign equity, retail trade entry, startup foreign investment, secured transactions, movable collateral, tax, consumer, and privacy records?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(businessMarketEntryFrameworkResponse, 'RA 9520', 'business market entry framework cooperative query')
  assertResearchMatch(businessMarketEntryFrameworkResponse, 'RA 7042', 'business market entry framework foreign investment query')
  assertResearchMatch(businessMarketEntryFrameworkResponse, 'RA 11057', 'business market entry framework secured finance query')
  assertIncludes(
    businessMarketEntryFrameworkResponse.summary,
    'Business Market Entry, Ownership, Cooperative, and Secured Finance Stack',
    'Business market entry framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What immigration and visa controls apply under Commonwealth Act 613 for foreign national admission, alien registration, overstay, exclusion, and deportation?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'CA 613',
    'philippine immigration act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What passport application, renewal, lost passport, minor passport, citizenship proof, biometric, and DFA consular controls apply under RA 11983?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11983',
    'new philippine passport act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'How should legacy RA 8239 passport records be handled when checking passport renewal, travel document, and current passport law requirements?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8239',
    'legacy passport act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What dual citizenship controls apply under RA 9225 for natural-born Filipinos, oath of allegiance, derivative citizenship, certificates, and passport consequences?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9225',
    'dual citizenship query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What judicial naturalization controls apply under Commonwealth Act 473 for citizenship petitions, residence, publication, hearing, oath, and certificate records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'CA 473',
    'revised naturalization law query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What administrative naturalization controls apply under RA 9139 for petition eligibility, special committee review, publication, hearing, oath, and certificate handling?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9139',
    'administrative naturalization query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Department of Migrant Workers controls apply under RA 11641 for OFW case intake, welfare, repatriation, legal assistance, and agency coordination?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11641',
    'department of migrant workers query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 10022 amendments apply to migrant worker deployment, overseas employment contracts, illegal recruitment, repatriation, legal assistance, and welfare safeguards?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10022',
    'migrant workers amendment query'
  )

  const immigrationCitizenshipFrameworkResponse = runLocalResearch(
    {
      query: 'What controls apply to immigration visas, foreign national status, passport and travel document records, dual citizenship, naturalization, OFW deployment, DMW assistance, and privacy safeguards?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(immigrationCitizenshipFrameworkResponse, 'CA 613', 'immigration framework immigration query')
  assertResearchMatch(immigrationCitizenshipFrameworkResponse, 'RA 11983', 'immigration framework passport query')
  assertResearchMatch(immigrationCitizenshipFrameworkResponse, 'RA 9225', 'immigration framework citizenship query')
  assertResearchMatch(immigrationCitizenshipFrameworkResponse, 'RA 11641', 'immigration framework DMW query')
  assertIncludes(
    immigrationCitizenshipFrameworkResponse.summary,
    'Immigration, Citizenship, Passports, and Overseas Filipino Records Stack',
    'Immigration citizenship passport framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What election controls apply under BP 881 for candidates, campaign period, vote buying, polling place watchers, ballots, canvass records, and election offenses?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'BP 881',
    'omnibus election code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What voter registration controls apply under RA 8189 for voter lists, precinct assignment, election registration board action, deactivation, reactivation, objections, and biometrics?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8189',
    'voters registration act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What synchronized election controls apply under RA 7166 for campaign period, election returns, canvassing, watchers, SOCE, contributions, and expenditures?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7166',
    'synchronized elections act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What fair election controls apply under RA 9006 for campaign materials, political advertisements, posters, media time, sponsor disclosure, and election propaganda?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9006',
    'fair election act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What automated election system controls apply under RA 8436 for vote counting machines, election returns, ballot data, source code, transmission, and security audit?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8436',
    'automated election system act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 9369 amended automated election controls apply to source code review, random manual audit, paper audit trail, transmission, canvassing, and election technology security?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9369',
    'automated election amendment query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Sangguniang Kabataan controls apply under RA 10742 for SK elections, Katipunan ng Kabataan, youth development plan, SK funds, age qualification, training, and records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10742',
    'SK reform act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 11768 strengthened SK governance controls apply to youth development, SK funds, local youth development council, budget, training, reporting, and accountability?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11768',
    'strengthened SK reform query'
  )

  const electionsCivicFrameworkResponse = runLocalResearch(
    {
      query: 'What controls apply to COMELEC elections, voter registration, campaign posters, political ads, SOCE campaign finance, automated election source code, canvassing, SK funds, youth development plans, public resources, and privacy?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(electionsCivicFrameworkResponse, 'BP 881', 'elections framework election code query')
  assertResearchMatch(electionsCivicFrameworkResponse, 'RA 8189', 'elections framework voter registration query')
  assertResearchMatch(electionsCivicFrameworkResponse, 'RA 9006', 'elections framework campaign materials query')
  assertResearchMatch(electionsCivicFrameworkResponse, 'RA 10742', 'elections framework SK query')
  assertIncludes(
    electionsCivicFrameworkResponse.summary,
    'Elections, Civic Participation, Campaigns, and Youth Governance Stack',
    'Elections civic participation framework title'
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

  const educationBenefitsFrameworkResponse = runLocalResearch(
    {
      query: 'What learner records, scholarship, alternative learning, FOI, housing, 4Ps, and solo parent safeguards should an LGU service desk check?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(educationBenefitsFrameworkResponse, 'RA 10533', 'education benefits framework basic education query')
  assertResearchMatch(educationBenefitsFrameworkResponse, 'RA 10931', 'education benefits framework tertiary query')
  assertResearchMatch(educationBenefitsFrameworkResponse, 'RA 11510', 'education benefits framework ALS query')
  assertResearchMatch(educationBenefitsFrameworkResponse, 'RA 11310', 'education benefits framework 4Ps query')
  assertIncludes(
    educationBenefitsFrameworkResponse.summary,
    'Education, Housing, Records, and Social Benefits Stack',
    'Education benefits framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 9470 require for records management, archives, retention schedules, and document disposal?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9470',
    'records management query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What should an FOI request and records retention policy include for public records and redaction?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'EO 2, s. 2016',
    'FOI request query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What controls apply to socialized housing, resettlement, relocation, and informal settler beneficiary validation?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7279',
    'urban housing query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What DHSUD and homeowners association safeguards apply to subdivision and human settlements planning?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11201',
    'DHSUD housing query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What age verification and child protection referral controls apply to child marriage prevention?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11596',
    'child marriage query'
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
      { query: 'What traffic ordinance controls apply to driver license, vehicle registration, parking, and road safety enforcement?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 4136',
    'traffic transport query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What public service franchise and public utility safeguards apply to a transport or telecom operator?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11659',
    'public service query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What land title, Torrens, register of deeds, encumbrance, and survey plan checks apply to a relocation project?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'PD 1529',
    'property registration query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What FPIC, NCIP, customary law, and ancestral domain safeguards apply to an infrastructure project?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8371',
    'indigenous peoples query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What agriculture and fisheries modernization controls apply to farm support, irrigation, rural credit, and market access?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8435',
    'agriculture modernization query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What organic agriculture certification, organic label, farm input, and traceability controls apply to local food procurement?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10068',
    'organic agriculture query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What food safety, food chain, contamination, traceability, inspection, and recall controls apply to public market vendors?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10611',
    'food safety query'
  )

  const mobilityLandAgriFrameworkResponse = runLocalResearch(
    {
      query: 'What traffic, public utility, land title, FPIC, agriculture, food safety, organic, and Sagip Saka controls should an LGU project check?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(mobilityLandAgriFrameworkResponse, 'RA 4136', 'mobility framework traffic query')
  assertResearchMatch(mobilityLandAgriFrameworkResponse, 'RA 8371', 'mobility framework FPIC query')
  assertResearchMatch(mobilityLandAgriFrameworkResponse, 'RA 11321', 'mobility framework Sagip Saka query')
  assertIncludes(
    mobilityLandAgriFrameworkResponse.summary,
    'Mobility, Land, Agriculture, and Community Rights Stack',
    'Mobility land agriculture framework title'
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
      { query: 'What disease surveillance, mandatory reporting, notifiable disease, outbreak, contact tracing, quarantine, and public health event controls apply under RA 11332?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11332',
    'notifiable disease reporting query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What tobacco, smoking, designated smoking area, sale to minors, advertising, signage, and health warning controls apply under RA 9211?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9211',
    'tobacco regulation query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What vape, vaporized nicotine, heated tobacco, online sale, age verification, packaging warning, and advertising controls apply under RA 11900?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11900',
    'vape products regulation query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What HIV testing, AIDS counseling, informed consent, partner notification, confidentiality, and anti-discrimination controls apply under RA 11166?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11166',
    'HIV and AIDS policy query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What child immunization, vaccination, immunization card, parent guardian records, health center referral, and school entry vaccine controls apply under RA 10152?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10152',
    'child immunization query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What blood donation, blood donor, blood bank, voluntary blood service, donor screening, transfusion, and confidentiality controls apply under RA 7719?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7719',
    'blood services query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What cancer screening, cancer registry, patient navigation, palliative care, survivorship, and confidentiality controls apply under RA 11215?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11215',
    'cancer control query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What reproductive health, family planning, responsible parenthood, maternal health, adolescent health, informed choice, and counseling controls apply under RA 10354?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10354',
    'responsible parenthood reproductive health query'
  )

  const publicHealthFrameworkResponse = runLocalResearch(
    {
      query: 'What public health controls apply to notifiable disease reporting, outbreak contact tracing, tobacco and vape sales, HIV status, immunization, blood donation, cancer registry, reproductive health counseling, and sensitive health records?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(publicHealthFrameworkResponse, 'RA 11332', 'public health framework disease reporting query')
  assertResearchMatch(publicHealthFrameworkResponse, 'RA 11900', 'public health framework vape query')
  assertResearchMatch(publicHealthFrameworkResponse, 'RA 11166', 'public health framework HIV query')
  assertResearchMatch(publicHealthFrameworkResponse, 'RA 11215', 'public health framework cancer query')
  assertIncludes(
    publicHealthFrameworkResponse.summary,
    'Public Health, Disease Reporting, and Sensitive Health Records Stack',
    'Public health framework title'
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

  const builtEnvironmentFrameworkResponse = runLocalResearch(
    { query: 'What building permit, sanitary permit, accessibility, and occupancy controls should a public market renovation check?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(builtEnvironmentFrameworkResponse, 'PD 1096', 'built environment building query')
  assertResearchMatch(builtEnvironmentFrameworkResponse, 'PD 856', 'built environment sanitation query')
  assertIncludes(
    builtEnvironmentFrameworkResponse.summary,
    'Built Environment, Sanitation, Accessibility, and Public Facilities Stack',
    'Built environment framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What BP 344 ramp, accessible toilet, parking, and barrier-free controls apply to a public office?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'BP 344',
    'accessibility law query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What child abuse reporting and confidentiality safeguards apply to minor-facing youth programs?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7610',
    'child protection query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What OFW illegal recruitment and placement agency controls apply to overseas job referrals?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8042',
    'migrant worker query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What bank secrecy controls apply when collecting bank statements and deposit account details?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 1405',
    'bank secrecy query'
  )

  const marketControlsResponse = runLocalResearch(
    { query: 'What price freeze, basic necessities, BMBE, and MSME controls apply during a local market assistance program?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(marketControlsResponse, 'RA 7581', 'price act query')
  assertResearchMatch(marketControlsResponse, 'RA 9178', 'BMBE query')
  assertResearchMatch(marketControlsResponse, 'RA 9501', 'MSME query')

  const resourceGovernanceResponse = runLocalResearch(
    { query: 'What climate action, renewable energy, fishery permit, quarry, and mining controls apply to coastal resource projects?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(resourceGovernanceResponse, 'RA 9513', 'renewable energy query')
  assertResearchMatch(resourceGovernanceResponse, 'RA 8550', 'fisheries query')
  assertIncludes(
    resourceGovernanceResponse.summary,
    'Land, Climate, Coastal, and Natural Resource Governance Stack',
    'Resource governance framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What climate action plan, LCCAP, adaptation, mitigation, and vulnerable-sector indicators should an LGU include?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9729',
    'climate query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What quarry permit, tailings, mine safety, and rehabilitation controls apply to mineral extraction?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7942',
    'mining query'
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

  const thinPublicAccountabilityDraft = `# Public Funds Integrity and GOCC Support Policy

## Purpose
This policy handles public funds, cash advance, liquidation, COA audit, supplier selection, conflict of interest, gifts, SALN, plunder red flags, kickback reports, GOCC board actions, honorarium, allowance, and salary grade issues.

## Legal Basis
Pursuant to RA 3019, RA 6713, PD 1445, RA 7080, RA 10149, and RA 6758.

## Scope
This applies to public officials, accountable officers, suppliers, and government personnel.

## Responsible Office
The administration office shall implement this policy.

## Requirements
Officials shall process public funds, select suppliers, receive gift reports, release allowances, and monitor GOCC board actions.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinPublicAccountabilityDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinPublicAccountabilityDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinPublicAccountabilityDraftResponse.status, 'success', 'Public accountability draft check should succeed locally')
  assertFinding(thinPublicAccountabilityDraftResponse, 'amber', 'Anti-graft safeguards')
  assertFinding(thinPublicAccountabilityDraftResponse, 'amber', 'Public-official ethics')
  assertFinding(thinPublicAccountabilityDraftResponse, 'amber', 'Public-funds audit')
  assertFinding(thinPublicAccountabilityDraftResponse, 'amber', 'High-value corruption risk')
  assertFinding(thinPublicAccountabilityDraftResponse, 'amber', 'GOCC governance')
  assertFinding(thinPublicAccountabilityDraftResponse, 'amber', 'Public-sector compensation')

  const thinEmployeeBenefitsDraft = `# Employee Benefits and Household Worker Policy

## Purpose
This policy covers SSS, social security, employer contribution, GSIS service record, Pag-IBIG housing loan, PhilHealth premium contribution, maternity leave, paternity leave, kasambahay, domestic workers, household employers, and benefit claims.

## Legal Basis
Pursuant to RA 11199, RA 8291, RA 9679, RA 10606, RA 11210, RA 8187, and RA 10361.

## Scope
This applies to private employees, government employees, household workers, and benefit claimants.

## Responsible Office
The human resources office shall implement this policy.

## Requirements
Workers shall submit employment, payroll, leave, health, and household work records when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinEmployeeBenefitsDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinEmployeeBenefitsDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinEmployeeBenefitsDraftResponse.status, 'success', 'Employee benefits draft check should succeed locally')
  assertFinding(thinEmployeeBenefitsDraftResponse, 'amber', 'SSS social-security')
  assertFinding(thinEmployeeBenefitsDraftResponse, 'amber', 'GSIS benefit')
  assertFinding(thinEmployeeBenefitsDraftResponse, 'amber', 'Pag-IBIG contribution')
  assertFinding(thinEmployeeBenefitsDraftResponse, 'amber', 'Maternity leave')
  assertFinding(thinEmployeeBenefitsDraftResponse, 'amber', 'Paternity leave')
  assertFinding(thinEmployeeBenefitsDraftResponse, 'amber', 'Kasambahay employment')
  assertFinding(thinEmployeeBenefitsDraftResponse, 'amber', 'PhilHealth insurance')

  const thinPaymentsCreditEvidenceDraft = `# Payment, Credit, Recording, and Dispute Policy

## Purpose
This policy covers access device fraud, credit card and debit card unauthorized transactions, cardholder account number handling, wiretapping and recorded conversation evidence, bouncing check and dishonored check collection, ADR mediation and arbitration, insolvency and financial rehabilitation, credit report and credit score use, borrower data, and credit information correction.

## Legal Basis
Pursuant to RA 8484, RA 4200, BP 22, RA 9285, RA 10142, and RA 9510.

## Scope
This applies to customers, borrowers, merchants, cardholders, creditors, debtors, and dispute parties.

## Responsible Office
The compliance office shall implement this policy.

## Requirements
Covered persons shall submit payment, recording, check, dispute, credit, and financial records when requested.

## Monitoring
The compliance office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinPaymentsCreditEvidenceDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinPaymentsCreditEvidenceDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinPaymentsCreditEvidenceDraftResponse.status, 'success', 'Payments credit evidence draft check should succeed locally')
  assertFinding(thinPaymentsCreditEvidenceDraftResponse, 'amber', 'Access-device fraud')
  assertFinding(thinPaymentsCreditEvidenceDraftResponse, 'amber', 'Recording and wiretapping')
  assertFinding(thinPaymentsCreditEvidenceDraftResponse, 'amber', 'Bouncing-check collection')
  assertFinding(thinPaymentsCreditEvidenceDraftResponse, 'amber', 'ADR process')
  assertFinding(thinPaymentsCreditEvidenceDraftResponse, 'amber', 'Rehabilitation and insolvency')
  assertFinding(thinPaymentsCreditEvidenceDraftResponse, 'amber', 'Credit-information')

  const thinCivilDocumentsFamilyDraft = `# Civil Documents, Registry, Family, and Claims Policy

## Purpose
This policy covers contract obligations, civil liability, damages, negligence, sale, lease, agency, breach, marriage, family support, child custody, parental authority, minor child records, family home records, birth certificate, marriage certificate, death certificate, civil registry, local civil registrar, PSA certificate, clerical error correction, typographical error correction, change of first name, sex correction, day of birth correction, month of birth correction, notarized affidavit, jurat, acknowledgment, notarial register, evidence admissibility, authentication, witness records, official records, small claims, money claims, debt collection, demand letters, and statements of claim.

## Legal Basis
Pursuant to RA 386, EO 209, Act No. 3753, RA 9048, RA 10172, A.M. No. 02-8-13-SC, the Rules of Court, and A.M. No. 08-8-7-SC.

## Scope
This applies to residents, families, claimants, respondents, document signers, and record holders.

## Responsible Office
The legal records office shall implement this policy.

## Requirements
Persons shall submit documents and records when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinCivilDocumentsFamilyDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinCivilDocumentsFamilyDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinCivilDocumentsFamilyDraftResponse.status, 'success', 'Civil documents family draft check should succeed locally')
  assertFinding(thinCivilDocumentsFamilyDraftResponse, 'amber', 'Civil contract')
  assertFinding(thinCivilDocumentsFamilyDraftResponse, 'amber', 'Family-status')
  assertFinding(thinCivilDocumentsFamilyDraftResponse, 'amber', 'Civil registry controls')
  assertFinding(thinCivilDocumentsFamilyDraftResponse, 'amber', 'Civil registry correction')
  assertFinding(thinCivilDocumentsFamilyDraftResponse, 'amber', 'Notarial controls')
  assertFinding(thinCivilDocumentsFamilyDraftResponse, 'amber', 'Evidence controls')
  assertFinding(thinCivilDocumentsFamilyDraftResponse, 'amber', 'Small-claims')

  const thinRightsCriminalDraft = `# Public Order, Complaint, and Custody Policy

## Purpose
This policy covers Bill of Rights, due process, search warrant, warrantless search, search and seizure, custodial investigation, free speech, public assembly, criminal offenses, Revised Penal Code, theft, estafa, falsification, libel, physical injuries, criminal complaint, complaint affidavit, preliminary investigation, inquest, arrest, prosecutor review, bail, juvenile, child in conflict with the law, diversion, dangerous drugs, drug testing, PDEA, controlled substances, firearms, ammunition, LTOPF, permit to carry, public assembly, rally permit, protest, freedom park, maximum tolerance, torture, detention, interrogation, custody, medical examination, and forced confession concerns.

## Legal Basis
Pursuant to the 1987 Constitution, Act No. 3815, the Rules of Criminal Procedure, RA 9344, RA 9165, RA 10591, BP 880, and RA 9745.

## Scope
This applies to local incidents, complaints, assemblies, students, workers, residents, visitors, and security personnel.

## Responsible Office
The security and legal office shall implement this policy.

## Requirements
Persons shall submit incident documents and cooperate with security checks when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinRightsCriminalDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinRightsCriminalDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinRightsCriminalDraftResponse.status, 'success', 'Rights criminal enforcement draft check should succeed locally')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Constitutional rights')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Criminal complaint')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Criminal procedure')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Juvenile justice')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Dangerous-drugs')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Firearms controls')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Public assembly')
  assertFinding(thinRightsCriminalDraftResponse, 'amber', 'Custody and anti-torture')

  const thinBusinessMarketEntryDraft = `# Business Market Entry and Secured Finance Policy

## Purpose
This policy covers cooperative formation, CDA, cooperative members, articles of cooperation, bylaws, patronage refund, general assembly, net surplus, foreign investment, foreign investor, foreign equity, foreign ownership, domestic market enterprise, export enterprise, negative list, nationality restriction, retail trade, foreign retailer, retail enterprise, retail store, paid up capital, investment per store, store opening, secured transactions, security interest, movable property, personal property security, secured creditor, debtor, financing statement, notice registry, perfection, and priority.

## Legal Basis
Pursuant to RA 9520, RA 7042, RA 11647, RA 8762, RA 11595, and RA 11057.

## Scope
This applies to businesses, members, investors, stores, borrowers, lenders, debtors, and secured creditors.

## Responsible Office
The business development office shall implement this policy.

## Requirements
Applicants shall submit business and financing documents when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinBusinessMarketEntryDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinBusinessMarketEntryDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinBusinessMarketEntryDraftResponse.status, 'success', 'Business market entry draft check should succeed locally')
  assertFinding(thinBusinessMarketEntryDraftResponse, 'amber', 'Cooperative governance')
  assertFinding(thinBusinessMarketEntryDraftResponse, 'amber', 'Foreign-investment')
  assertFinding(thinBusinessMarketEntryDraftResponse, 'amber', 'Retail trade entry')
  assertFinding(thinBusinessMarketEntryDraftResponse, 'amber', 'Secured-transaction')

  const thinImmigrationCitizenshipDraft = `# Immigration, Passport, Citizenship, and OFW Records Policy

## Purpose
This policy covers immigration status, visa checks, foreign national admission, alien registration, overstay and deportation issues, passport applications, passport renewal, lost passport handling, travel document records, minor passport concerns, dual citizenship, citizenship re-acquisition, oath of allegiance, natural-born Filipino proof, naturalization, administrative naturalization, judicial naturalization, citizenship petitions, OFW deployment, overseas employment, illegal recruitment, and migrant worker assistance.

## Legal Basis
Pursuant to CA 613, CA 473, RA 9139, RA 9225, RA 11983, RA 8239, RA 8042, RA 10022, and RA 11641.

## Scope
This applies to foreign nationals, applicants, Filipino citizens, overseas workers, families, recruiters, and support officers.

## Responsible Office
The records office shall implement this policy.

## Requirements
Applicants shall submit identity, travel, citizenship, and employment documents when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinImmigrationCitizenshipDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinImmigrationCitizenshipDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinImmigrationCitizenshipDraftResponse.status, 'success', 'Immigration citizenship draft check should succeed locally')
  assertFinding(thinImmigrationCitizenshipDraftResponse, 'amber', 'Migrant-worker protection')
  assertFinding(thinImmigrationCitizenshipDraftResponse, 'amber', 'Immigration-status')
  assertFinding(thinImmigrationCitizenshipDraftResponse, 'amber', 'Passport and travel-document')
  assertFinding(thinImmigrationCitizenshipDraftResponse, 'amber', 'Citizenship re-acquisition')
  assertFinding(thinImmigrationCitizenshipDraftResponse, 'amber', 'Naturalization controls')

  const thinElectionsCivicDraft = `# Election, Campaign, Voter, and Youth Governance Policy

## Purpose
This policy covers COMELEC election coordination, candidates, campaign period activity, polling place concerns, ballot handling, watchers, canvass records, election offenses, voter registration, voter lists, registered voter records, precinct assignment, deactivation and reactivation, campaign materials, campaign posters, political advertisements, election propaganda, media time, SOCE, campaign contributions and expenditures, automated election systems, vote counting, source code review, random manual audit, election transmission, Sangguniang Kabataan, Katipunan ng Kabataan, SK funds, SK budget, local youth development council, youth development plan, and youth council programs.

## Legal Basis
Pursuant to BP 881, RA 8189, RA 7166, RA 9006, RA 8436, RA 9369, RA 10742, and RA 11768.

## Scope
This applies to candidates, voters, youth councils, barangay officers, election volunteers, campaign teams, and technology support personnel.

## Responsible Office
The civic affairs office shall implement this policy.

## Requirements
Participants shall submit election, campaign, voter, technology, and youth program documents when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinElectionsCivicDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinElectionsCivicDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinElectionsCivicDraftResponse.status, 'success', 'Elections civic draft check should succeed locally')
  assertFinding(thinElectionsCivicDraftResponse, 'amber', 'Election process')
  assertFinding(thinElectionsCivicDraftResponse, 'amber', 'Voter-registration')
  assertFinding(thinElectionsCivicDraftResponse, 'amber', 'Campaign material')
  assertFinding(thinElectionsCivicDraftResponse, 'amber', 'Automated election')
  assertFinding(thinElectionsCivicDraftResponse, 'amber', 'SK and youth-governance')

  const thinMobilityLandAgriDraft = `# Mobility, Land, and Farm Support Program

## Purpose
This program covers traffic enforcement, driver license, vehicle registration, public utility franchise coordination, land title verification, Torrens and register of deeds records, FPIC, ancestral domain, NCIP coordination, agriculture and fisheries support, organic labels, food safety traceability, and Sagip Saka direct purchase.

## Legal Basis
Pursuant to RA 4136, RA 11659, PD 1529, RA 8371, RA 8435, RA 10068, RA 10611, and RA 11321.

## Scope
This applies to local projects, drivers, operators, farmers, fisherfolk, and affected communities.

## Responsible Office
The project office shall implement this program.

## Requirements
Participants shall submit records and project documents when requested.

## Monitoring
The project office shall submit annual reports.

## Effectivity
This program takes effect 30 days after publication.`

  const thinMobilityLandAgriDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinMobilityLandAgriDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinMobilityLandAgriDraftResponse.status, 'success', 'Mobility land agriculture draft check should succeed locally')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Transport and traffic controls')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Public-service operation')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Land-title verification')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'FPIC and indigenous-community')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Agriculture support')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Organic agriculture')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Food-safety')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Sagip Saka')

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

  const thinPublicHealthDraft = `# Public Health and Sensitive Records Protocol

## Purpose
This protocol covers notifiable disease response, outbreak alerts, contact tracing, quarantine notices, tobacco inspections, vape online sale monitoring, HIV testing, immunization, blood donation drives, cancer registry records, and reproductive health counseling.

## Legal Basis
Pursuant to RA 11332, RA 9211, RA 11900, RA 11166, RA 10152, RA 7719, RA 11215, RA 10354, and RA 10173.

## Scope
The local health office shall collect health status, donor records, HIV status, vaccine records, cancer records, and family planning records.

## Responsible Office
The local health office shall implement this protocol.

## Requirements
Covered persons shall cooperate with reporting, inspection, testing, counseling, screening, and monitoring.

## Monitoring
The responsible office shall submit quarterly reports.

## Effectivity
This protocol takes effect after publication.`

  const thinPublicHealthDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinPublicHealthDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinPublicHealthDraftResponse.status, 'success', 'Public health draft check should succeed locally')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'Disease-reporting controls')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'Tobacco controls')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'Vape product controls')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'HIV confidentiality controls')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'Child immunization controls')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'Blood services controls')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'Cancer control controls')
  assertFinding(thinPublicHealthDraftResponse, 'amber', 'Reproductive health controls')

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

  const thinFacilityDraft = `# Public Market Renovation Policy

## Purpose
This policy covers construction, occupancy permit, sanitary permit, and accessibility improvements for a public market.

## Legal Basis
Pursuant to PD 1096, PD 856, and BP 344.

## Scope
This applies to vendors and public market facilities.

## Responsible Office
The engineering office shall implement this policy.

## Requirements
Vendors shall cooperate with renovation schedules.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinFacilityDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinFacilityDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinFacilityDraftResponse.status, 'success', 'Facility draft check should succeed locally')
  assertFinding(thinFacilityDraftResponse, 'amber', 'Building and occupancy controls')
  assertFinding(thinFacilityDraftResponse, 'amber', 'Sanitation controls')
  assertFinding(thinFacilityDraftResponse, 'amber', 'Physical accessibility features')

  const thinChildMigrantDraft = `# Youth and OFW Referral Desk Protocol

## Purpose
This protocol handles child protection reports and OFW illegal recruitment complaints.

## Legal Basis
Pursuant to RA 7610 and RA 8042.

## Scope
This applies to residents seeking assistance.

## Responsible Office
The public assistance desk shall implement this protocol.

## Requirements
Residents shall submit reports to the desk.

## Monitoring
The desk shall submit quarterly reports.

## Effectivity
This protocol takes effect 30 days after publication.`

  const thinChildMigrantDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinChildMigrantDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinChildMigrantDraftResponse.status, 'success', 'Child migrant draft check should succeed locally')
  assertFinding(thinChildMigrantDraftResponse, 'amber', 'Child-protection controls')
  assertFinding(thinChildMigrantDraftResponse, 'amber', 'Migrant-worker protection')

  const thinFinanceMarketDraft = `# Emergency Market Assistance Policy

## Purpose
This policy collects bank statements for local aid and handles price freeze monitoring for basic necessities.

## Legal Basis
Pursuant to RA 1405 and RA 7581.

## Scope
This applies to aid applicants and market vendors.

## Responsible Office
The market office shall implement this policy.

## Requirements
Applicants and vendors shall submit documents when requested.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinFinanceMarketDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinFinanceMarketDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinFinanceMarketDraftResponse.status, 'success', 'Finance market draft check should succeed locally')
  assertFinding(thinFinanceMarketDraftResponse, 'amber', 'Bank-deposit confidentiality')
  assertFinding(thinFinanceMarketDraftResponse, 'amber', 'Price-control measures')

  const thinResourceDraft = `# Coastal Resource and Quarry Project Ordinance

## Purpose
This ordinance covers climate action, renewable energy, fishery permit, and quarry activities.

## Legal Basis
Pursuant to RA 9729, RA 9513, RA 8550, and RA 7942.

## Scope
This applies to coastal resource projects.

## Responsible Office
The environment office shall implement this ordinance.

## Requirements
Project proponents shall submit project details.

## Monitoring
The environment office shall submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinResourceDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinResourceDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinResourceDraftResponse.status, 'success', 'Resource draft check should succeed locally')
  assertFinding(thinResourceDraftResponse, 'amber', 'Climate action controls')
  assertFinding(thinResourceDraftResponse, 'amber', 'Renewable-energy project')
  assertFinding(thinResourceDraftResponse, 'amber', 'Fisheries controls')
  assertFinding(thinResourceDraftResponse, 'amber', 'Mining or quarry controls')

  const thinCivicServicesDraft = `# Civic Services Desk Policy

## Purpose
This policy handles basic education enrollment, scholarship assistance, alternative learning, public records, FOI requests, socialized housing, DHSUD coordination, 4Ps cash assistance, solo parent benefits, and child marriage prevention.

## Legal Basis
Pursuant to RA 10533, RA 10931, RA 11510, RA 9470, EO 2 s. 2016, RA 7279, RA 11201, RA 11310, RA 11861, and RA 11596.

## Scope
This applies to residents seeking public assistance.

## Responsible Office
The civic services desk shall implement this policy.

## Requirements
Residents shall submit documents when requested.

## Monitoring
The desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinCivicServicesDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinCivicServicesDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinCivicServicesDraftResponse.status, 'success', 'Civic services draft check should succeed locally')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Basic-education controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Student-aid controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Alternative-learning controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Records-management controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'FOI request controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Housing or resettlement controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Human-settlements governance')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Social-assistance controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Solo-parent benefit controls')
  assertFinding(thinCivicServicesDraftResponse, 'amber', 'Child-marriage prevention')

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
