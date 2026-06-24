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

async function loadProviderlessModule() {
  assert.equal(existsSync(sourcePath), true, 'local-legal-research.ts is missing')

  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsight-local-rag-golden-'))
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

  for (const fileName of ['types.ts', 'corpus.ts', 'topic-expansions.ts', 'compliance-frameworks.ts']) {
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

function assertCompletedMatch(response, expectedStatute, label, minConfidence = 0.3) {
  assert.equal(response.status, 'completed', `${label} should complete`)
  assert.equal(response.provider_mode, 'local-providerless', `${label} should use local providerless mode`)
  assert.ok((response.confidence_score || 0) >= minConfidence, `${label} should meet confidence threshold`)
  assert.ok(statutes(response).includes(expectedStatute), `${label} should include ${expectedStatute}`)
  assert.ok(response.retrieval_metadata, `${label} should include retrieval metadata`)
}

function assertCompletedMatches(response, expectedStatutes, label, minConfidence = 0.3) {
  assert.equal(response.status, 'completed', `${label} should complete`)
  assert.equal(response.provider_mode, 'local-providerless', `${label} should use local providerless mode`)
  assert.ok((response.confidence_score || 0) >= minConfidence, `${label} should meet confidence threshold`)

  for (const expectedStatute of expectedStatutes) {
    assert.ok(statutes(response).includes(expectedStatute), `${label} should include ${expectedStatute}`)
  }

  assert.ok(response.retrieval_metadata, `${label} should include retrieval metadata`)
}

const { module: providerless, cleanup } = await loadProviderlessModule()

try {
  const { runLocalResearch } = providerless

  const exactCitation = runLocalResearch({ query: 'What does RA 10173 require for breach response?', user_id: 'golden' })
  assertCompletedMatch(exactCitation, 'RA 10173', 'exact RA citation', 0.55)
  assert.equal(statutes(exactCitation)[0], 'RA 10173', 'exact citation should be the top match')
  assert.deepEqual(exactCitation.retrieval_metadata.citation_numbers, ['10173'], 'exact citation metadata')

  const citationVariant = runLocalResearch({
    query: 'What controls apply under R.A. No. 10173 and RA No. 8792 for online consent records?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatch(citationVariant, 'RA 10173', 'citation variant privacy')
  assertCompletedMatch(citationVariant, 'RA 8792', 'citation variant e-commerce')

  const directTopic = runLocalResearch({
    query: 'What copyright, software license, trademark, and investment offer controls should an online product launch check?',
    user_id: 'golden',
  })
  assertCompletedMatch(directTopic, 'RA 8293', 'direct IP topic')
  assertCompletedMatch(directTopic, 'RA 8799', 'direct securities topic')
  assert.ok(
    statutes(directTopic).indexOf('RA 8799') < 6,
    'direct securities topic should not be pushed out by broad expansion terms'
  )

  const crossLawWorkflow = runLocalResearch({
    query: 'What controls apply to BSP supervision, bank loans, lending companies, financing companies, insurance claims, pre-need plans, PDIC deposit insurance, AML, bank secrecy, credit reports, and borrower privacy?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatch(crossLawWorkflow, 'RA 7653', 'financial workflow BSP')
  assertCompletedMatch(crossLawWorkflow, 'RA 8791', 'financial workflow banking')
  assertCompletedMatch(crossLawWorkflow, 'RA 10607', 'financial workflow insurance')
  assert.ok(
    crossLawWorkflow.summary.includes('Banking, Lending, Insurance, and Financial Institutions Stack'),
    'financial workflow should include its framework section'
  )

  const publicAccountabilityWorkflow = runLocalResearch({
    query: 'What controls apply to public procurement bidding, BAC award, contract implementation, COA audit trail, public funds, and conflict of interest?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    publicAccountabilityWorkflow,
    ['RA 12009', 'PD 1445', 'RA 6713'],
    'public accountability workflow'
  )
  assert.ok(
    publicAccountabilityWorkflow.summary.includes('Public Accountability, Ethics, Audit, and Government Funds Stack') ||
      publicAccountabilityWorkflow.summary.includes('Imports, Public Procurement, Assets, and Audit Stack'),
    'public accountability workflow should include a relevant framework section'
  )

  const civilRegistryWorkflow = runLocalResearch({
    query: 'How can a wrong first name, clerical error, or birth certificate entry be corrected at the local civil registrar?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(civilRegistryWorkflow, ['RA 9048', 'Act No. 3753'], 'civil registry workflow')

  const electionWorkflow = runLocalResearch({
    query: 'What campaign poster, political advertising, automated election, voter registration, and SK controls should a local candidate check?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(electionWorkflow, ['RA 9006', 'BP 881', 'RA 8189'], 'election and civic workflow')

  const womenProtectionWorkflow = runLocalResearch({
    query: 'What GAD, women desk, gender equality, livelihood, health service, VAWC referral, and confidentiality controls should an LGU women protection program include?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(womenProtectionWorkflow, ['RA 9710', 'RA 9262'], 'women protection workflow')

  const onlineChildProtectionWorkflow = runLocalResearch({
    query: 'What OSAEC, CSAEM, child online safety, takedown, platform reporting, victim confidentiality, and evidence preservation controls should a school or platform use?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(onlineChildProtectionWorkflow, ['RA 11930', 'RA 9775', 'RA 10175'], 'online child protection workflow')

  const internetTransactionsWorkflow = runLocalResearch({
    query: 'What seller verification, online merchant identity, e-marketplace platform responsibility, consumer redress, takedown, and transaction record controls apply to internet transactions?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(internetTransactionsWorkflow, ['RA 11967', 'RA 7394', 'RA 8792'], 'internet transactions workflow')

  const financialAccountScamWorkflow = runLocalResearch({
    query: 'What money mule, mule account, phishing, social engineering, account takeover, transaction hold, suspicious transaction, and evidence preservation controls apply to a wallet scam response?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(financialAccountScamWorkflow, ['RA 12010', 'RA 11765', 'RA 9160'], 'financial account scam workflow')

  const digitalGovernmentWorkflow = runLocalResearch({
    query: 'What e-governance, government portal, online government transaction, interoperability, data exchange, DICT, cybersecurity, accessibility, and records controls apply to a digital permit service?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(digitalGovernmentWorkflow, ['RA 12254', 'RA 10844', 'RA 10173'], 'digital government workflow')
  assert.ok(
    digitalGovernmentWorkflow.summary.includes('Digital Government, E-Governance, and Public ICT Stack'),
    'digital government workflow should include its framework section'
  )

  const pppWorkflow = runLocalResearch({
    query: 'What public-private partnership, PPP concession, unsolicited proposal, infrastructure project, value-for-money, risk allocation, procurement, contract management, public consultation, and audit controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(pppWorkflow, ['RA 11966', 'RA 12009'], 'PPP infrastructure workflow')

  const workplacePayFlexWorkflow = runLocalResearch({
    query: 'What workplace controls apply to telecommuting work from home, service charge distribution, minimum wage orders, lactation stations, payroll records, employee privacy, and safety?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    workplacePayFlexWorkflow,
    ['RA 11165', 'RA 11360', 'RA 6727', 'RA 10028'],
    'workplace pay and flexible work workflow'
  )
  assert.ok(
    workplacePayFlexWorkflow.summary.includes('Workplace Pay, Flexible Work, and Family Support Stack'),
    'workplace pay and flexible work workflow should include its framework section'
  )

  const immigrationWorkflow = runLocalResearch({
    query: 'What authority applies to foreign visitor admission, visa status, passport handling, reacquired citizenship, and overseas Filipino records?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(immigrationWorkflow, ['CA 613', 'RA 11983', 'RA 9225'], 'immigration and passport workflow')

  const agricultureFoodSafetyWorkflow = runLocalResearch({
    query: 'What controls apply to farm produce, food safety, organic agriculture, crop inventory, traceability, and recall handling?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(agricultureFoodSafetyWorkflow, ['RA 10611', 'RA 10068', 'RA 8435'], 'agriculture and food safety workflow')

  const noResult = runLocalResearch({ query: 'How do I bake sourdough bread at high altitude?', user_id: 'golden' })
  assert.equal(noResult.status, 'no_results', 'unrelated query should return no_results')
  assert.equal(noResult.documents_found, 0, 'unrelated query should not report documents')
  assert.equal(noResult.confidence_score, 0, 'unrelated query should have zero confidence')
  assert.ok(noResult.summary.includes('No strong match was found'), 'unrelated query should explain no local match')

  const unknownCitation = runLocalResearch({ query: 'What is RA 999999 about?', user_id: 'golden' })
  assert.equal(unknownCitation.status, 'no_results', 'unknown RA citation should return no_results')
  assert.deepEqual(unknownCitation.retrieval_metadata.citation_numbers, ['999999'], 'unknown RA citation metadata')
  assert.ok(
    unknownCitation.summary.includes('RA 999999 was cited but is not in the bundled local corpus'),
    'unknown RA citation should be explained in citation coverage'
  )

  const aiGovernanceQuery = runLocalResearch({
    query: 'What privacy and governance controls apply to AI chatbots that process personal data in the Philippines?',
    user_id: 'golden',
  })
  assertCompletedMatches(
    aiGovernanceQuery,
    ['NPC Advisory No. 2024-04', 'RA 10173'],
    'AI chatbot privacy governance',
    0.25
  )
  assert.ok(
    aiGovernanceQuery.matched_documents.some((document) => document.support_level === 'direct'),
    'AI governance query should include direct source support metadata'
  )

  const publicSectorAutomationQuery = runLocalResearch({
    query: 'What controls should a government AI system use for automated public service decisions, human review, privacy impact assessment, and citizen complaints?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    publicSectorAutomationQuery,
    ['NPC Advisory No. 2024-04', 'A.M. No. 25-11-28-SC', 'RA 12254'],
    'public-sector AI automation workflow',
    0.2
  )
  assert.ok(
    publicSectorAutomationQuery.summary.includes('AI Governance, Privacy, and Public-Sector Automation Stack'),
    'public-sector automation should include AI governance framework section'
  )
  assert.ok(
    publicSectorAutomationQuery.summary.includes('Related Authority Path'),
    'deep public-sector automation should include a related authority path'
  )

  const vagueCryptoQuery = runLocalResearch({
    query: 'Tell me about cryptocurrency exchange rules in the Philippines',
    user_id: 'golden',
  })
  assert.equal(vagueCryptoQuery.status, 'no_results', 'unsupported crypto query should not match generic rules')

  const privacyPenaltyQuery = runLocalResearch({
    query: 'What are penalties for violating privacy law?',
    user_id: 'golden',
  })
  assertCompletedMatch(privacyPenaltyQuery, 'RA 10173', 'privacy penalties topic')

  const cctvBarangayQuery = runLocalResearch({
    query: 'Can our barangay require CCTV in all homes?',
    user_id: 'golden',
  })
  assertCompletedMatch(cctvBarangayQuery, 'RA 10173', 'CCTV privacy topic')
  assertCompletedMatch(cctvBarangayQuery, 'RA 7160', 'CCTV barangay authority topic', 0.2)
  assert.ok(
    !statutes(cctvBarangayQuery).includes('RA 9679'),
    'CCTV home wording should not drift into Pag-IBIG housing matches'
  )

  console.log('Local RAG golden-query self-test passed.')
} finally {
  cleanup()
}
