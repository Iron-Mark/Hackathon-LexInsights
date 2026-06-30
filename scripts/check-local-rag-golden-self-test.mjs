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

function assertSummaryIncludesAny(response, expectedFragments, label) {
  assert.ok(
    expectedFragments.some((fragment) => response.summary.includes(fragment)),
    `${label} should include one of: ${expectedFragments.join(', ')}`
  )
}

function countOccurrences(source, fragment) {
  return source.split(fragment).length - 1
}

function assertExactCitationMatch(response, expectedStatute, citationNumber, label, minConfidence = 0.55) {
  assertCompletedMatch(response, expectedStatute, label, minConfidence)
  assert.equal(statutes(response)[0], expectedStatute, `${label} should be the top match`)
  assert.deepEqual(response.retrieval_metadata.citation_numbers, [citationNumber], `${label} citation metadata`)
  assert.ok(response.retrieval_metadata.provenance_coverage, `${label} should include provenance coverage`)
  assert.ok(
    response.matched_documents[0].source_last_verified,
    `${label} top match should include last verified source metadata`
  )
  assert.ok(
    response.matched_documents[0].evidence_anchors?.length > 0,
    `${label} top match should include evidence anchors`
  )
  assert.ok(
    ['seeded', 'verified'].includes(response.matched_documents[0].provenance_status),
    `${label} top match should expose provenance status`
  )
}

const { module: providerless, cleanup } = await loadProviderlessModule()

try {
  const { runLocalResearch } = providerless

  const exactCitation = runLocalResearch({ query: 'What does RA 10173 require for breach response?', user_id: 'golden' })
  assertCompletedMatch(exactCitation, 'RA 10173', 'exact RA citation', 0.55)
  assert.equal(statutes(exactCitation)[0], 'RA 10173', 'exact citation should be the top match')
  assert.deepEqual(exactCitation.retrieval_metadata.citation_numbers, ['10173'], 'exact citation metadata')
  assert.ok(exactCitation.retrieval_metadata.provenance_coverage, 'exact citation should include provenance coverage')
  assert.ok(
    exactCitation.matched_documents[0].source_last_verified,
    'exact citation top match should include last verified source metadata'
  )
  assert.ok(
    exactCitation.matched_documents[0].evidence_anchors?.length > 0,
    'exact citation top match should include evidence anchors'
  )
  assert.ok(
    ['seeded', 'verified'].includes(exactCitation.matched_documents[0].provenance_status),
    'exact citation top match should expose provenance status'
  )
  assert.ok(
    countOccurrences(exactCitation.summary, 'RA 10173') <= 2,
    'exact citation summary should avoid repeated visible RA mentions'
  )

  const dpaIrrImplementation = runLocalResearch({
    query:
      'What does the Data Privacy Act IRR require for PIC, PIP, lawful processing, privacy notice, data subject rights, security measures, DPO, registration, data sharing, outsourcing, and breach notification?',
    user_id: 'golden',
  })
  assertCompletedMatch(dpaIrrImplementation, 'Data Privacy Act IRR', 'Data Privacy Act IRR implementation', 0.45)
  assertCompletedMatch(dpaIrrImplementation, 'RA 10173', 'Data Privacy Act IRR related statute', 0.35)
  assert.equal(statutes(dpaIrrImplementation)[0], 'Data Privacy Act IRR', 'Data Privacy Act IRR should be the top implementation match')

  const amlaIrrImplementation = runLocalResearch({
    query:
      'What does the 2018 AMLA IRR require for covered-person classification, customer due diligence, beneficial ownership, covered and suspicious transaction reporting, recordkeeping, confidentiality, and AMLC compliance program controls?',
    user_id: 'golden',
  })
  assertCompletedMatch(amlaIrrImplementation, '2018 AMLA IRR', '2018 AMLA IRR implementation', 0.45)
  assertCompletedMatch(amlaIrrImplementation, 'RA 9160', '2018 AMLA IRR related statute', 0.35)
  assert.equal(statutes(amlaIrrImplementation)[0], '2018 AMLA IRR', '2018 AMLA IRR should be the top implementation match')

  const cybercrimeIrrImplementation = runLocalResearch({
    query:
      'What does the Cybercrime Prevention Act IRR require for law enforcement authorities, preservation orders, service providers, traffic data, content data, subscriber information, computer data, DOJ Office of Cybercrime, CICC, CERT, electronic evidence, cyber warrants, and chain of custody?',
    user_id: 'golden',
  })
  assertCompletedMatch(cybercrimeIrrImplementation, 'Cybercrime Prevention Act IRR', 'Cybercrime Prevention Act IRR implementation', 0.45)
  assertCompletedMatch(cybercrimeIrrImplementation, 'RA 10175', 'Cybercrime Prevention Act IRR related statute', 0.35)
  assert.equal(
    statutes(cybercrimeIrrImplementation)[0],
    'Cybercrime Prevention Act IRR',
    'Cybercrime Prevention Act IRR should be the top implementation match'
  )

  const cybercrimeWarrantRule = runLocalResearch({
    query:
      'What does A.M. No. 17-11-03-SC Rule on Cybercrime Warrants require for WDCD, WICD, WSSECD, WECD, probable cause, service-provider disclosure, forensic image, inventory, return, chain of custody, retention, destruction, confidentiality, and motion to suppress?',
    user_id: 'golden',
  })
  assertCompletedMatch(cybercrimeWarrantRule, 'A.M. No. 17-11-03-SC', 'Rule on Cybercrime Warrants implementation', 0.45)
  assertCompletedMatch(cybercrimeWarrantRule, 'RA 10175', 'Rule on Cybercrime Warrants related statute', 0.35)
  assert.equal(
    statutes(cybercrimeWarrantRule)[0],
    'A.M. No. 17-11-03-SC',
    'Rule on Cybercrime Warrants should be the top warrant-procedure match'
  )

  const secBeneficialOwnershipImplementation = runLocalResearch({
    query:
      'What does SEC MC 15 s. 2025 require for beneficial ownership disclosure, HARBOR portal filing, GIS records, authorized filers, nominees, control persons, privacy safeguards, and corporate secretary review?',
    user_id: 'golden',
  })
  assertCompletedMatch(
    secBeneficialOwnershipImplementation,
    'SEC Memorandum Circular No. 15, s. 2025',
    'SEC beneficial ownership disclosure rules',
    0.45
  )
  assertCompletedMatch(secBeneficialOwnershipImplementation, 'SEC HARBOR', 'SEC HARBOR related workflow', 0.35)
  assert.equal(
    statutes(secBeneficialOwnershipImplementation)[0],
    'SEC Memorandum Circular No. 15, s. 2025',
    'SEC beneficial ownership rules should be the top implementation match'
  )

  const npcBreachManagement = runLocalResearch({
    query: 'What does NPC Circular 16-03 require for personal data breach management, notification, containment, and incident records?',
    user_id: 'golden',
  })
  assertCompletedMatch(npcBreachManagement, 'NPC Circular No. 16-03', 'NPC Circular 16-03 breach management', 0.45)
  assert.equal(statutes(npcBreachManagement)[0], 'NPC Circular No. 16-03', 'NPC Circular 16-03 should be the top match')

  const npcDbnmsAdvisory = runLocalResearch({
    query: 'What does NPC Advisory 2026-02 require for DBNMS breach notification submissions and supporting evidence?',
    user_id: 'golden',
  })
  assertCompletedMatch(npcDbnmsAdvisory, 'NPC Advisory No. 2026-02', 'NPC Advisory 2026-02 DBNMS', 0.45)
  assert.equal(statutes(npcDbnmsAdvisory)[0], 'NPC Advisory No. 2026-02', 'NPC Advisory 2026-02 should be the top match')

  const npcSecurityCircular = runLocalResearch({
    query: 'What does NPC Circular 2023-06 require for security of personal data, access control, authentication, logs, backups, and incident response?',
    user_id: 'golden',
  })
  assertCompletedMatch(npcSecurityCircular, 'NPC Circular No. 2023-06', 'NPC Circular 2023-06 security', 0.45)
  assert.equal(statutes(npcSecurityCircular)[0], 'NPC Circular No. 2023-06', 'NPC Circular 2023-06 should be the top match')

  const npcRegistrationCircular = runLocalResearch({
    query: 'What does NPC Circular 2022-04 require for DPO designation, personal data processing system registration, automated decision-making, and profiling?',
    user_id: 'golden',
  })
  assertCompletedMatch(npcRegistrationCircular, 'NPC Circular No. 2022-04', 'NPC Circular 2022-04 registration', 0.45)
  assert.equal(statutes(npcRegistrationCircular)[0], 'NPC Circular No. 2022-04', 'NPC Circular 2022-04 should be the top match')

  const exactEprCitation = runLocalResearch({
    query: 'What does RA 11898 require for plastic packaging and EPR reporting?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactEprCitation, 'RA 11898', '11898', 'exact RA 11898 citation')

  const exactPaymentSystemCitation = runLocalResearch({
    query: 'What does RA 11127 require for an operator of a payment system?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactPaymentSystemCitation, 'RA 11127', '11127', 'exact RA 11127 citation')

  const exactAntiGraftCitation = runLocalResearch({
    query: 'What does RA 3019 require for conflict of interest, unwarranted benefits, undue injury, kickbacks, and supplier selection?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactAntiGraftCitation, 'RA 3019', '3019', 'exact RA 3019 citation')

  const exactEthicsCitation = runLocalResearch({
    query: 'What does RA 6713 require for SALN, gifts, public officials, ethical standards, conflict disclosure, and financial interests?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactEthicsCitation, 'RA 6713', '6713', 'exact RA 6713 citation')

  const exactPlunderCitation = runLocalResearch({
    query: 'What does RA 7080 require for plunder, ill-gotten wealth, public funds conversion, kickbacks, commissions, and asset preservation?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactPlunderCitation, 'RA 7080', '7080', 'exact RA 7080 citation')

  const exactArchivesCitation = runLocalResearch({
    query: 'What does RA 9470 require for public records, records management, archives, retention schedules, disposal, and records custody?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactArchivesCitation, 'RA 9470', '9470', 'exact RA 9470 citation')

  const governmentAuditCode = runLocalResearch({
    query: 'What does PD 1445 require for COA audit, public funds, cash advances, liquidation, vouchers, accountable officers, and audit disallowance?',
    user_id: 'golden',
  })
  assertCompletedMatch(governmentAuditCode, 'PD 1445', 'PD 1445 government auditing code', 0.45)
  assert.equal(statutes(governmentAuditCode)[0], 'PD 1445', 'PD 1445 should rank first for government audit query')
  assert.ok(
    governmentAuditCode.matched_documents[0].source_last_verified,
    'PD 1445 top match should include last verified source metadata'
  )

  const foiExecutiveOrder = runLocalResearch({
    query: 'What does EO 2 s. 2016 require for FOI requests, information request intake, redaction, exceptions, written denial, appeal, and eFOI records?',
    user_id: 'golden',
  })
  assertCompletedMatch(foiExecutiveOrder, 'EO 2, s. 2016', 'EO 2 FOI executive order', 0.45)
  assert.equal(statutes(foiExecutiveOrder)[0], 'EO 2, s. 2016', 'EO 2 should rank first for FOI request query')
  assert.ok(
    foiExecutiveOrder.matched_documents[0].source_last_verified,
    'EO 2 top match should include last verified source metadata'
  )

  const exactCftCitation = runLocalResearch({
    query: 'What does RA 10168 require for terrorism financing and asset freeze controls?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactCftCitation, 'RA 10168', '10168', 'exact RA 10168 citation')

  const exactAntiTerrorismCitation = runLocalResearch({
    query: 'What does RA 11479 require for Anti-Terrorism Council designation safeguards?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactAntiTerrorismCitation, 'RA 11479', '11479', 'exact RA 11479 citation')

  const exactDownstreamOilCitation = runLocalResearch({
    query: 'What does RA 8479 require for downstream oil industry fuel retail pricing and petroleum product quality?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactDownstreamOilCitation, 'RA 8479', '8479', 'exact RA 8479 citation')

  const exactLpgCitation = runLocalResearch({
    query: 'What does RA 11592 require for LPG refilling plants, cylinders, dealers, and retail outlets?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactLpgCitation, 'RA 11592', '11592', 'exact RA 11592 citation')

  const exactBiofuelsCitation = runLocalResearch({
    query: 'What does RA 9367 require for biofuel blends, biodiesel, bioethanol, and fuel labeling compliance?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactBiofuelsCitation, 'RA 9367', '9367', 'exact RA 9367 citation')

  const exactDoeCitation = runLocalResearch({
    query: 'What does RA 7638 require for DOE energy planning, monitoring, and coordination?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactDoeCitation, 'RA 7638', '7638', 'exact RA 7638 citation')

  const exactEducationGovernanceCitation = runLocalResearch({
    query: 'What does RA 9155 require for DepEd basic education governance, school divisions, and school heads?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactEducationGovernanceCitation, 'RA 9155', '9155', 'exact RA 9155 citation')

  const exactKindergartenCitation = runLocalResearch({
    query: 'What does RA 10157 require for kindergarten education and learner admission?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactKindergartenCitation, 'RA 10157', '10157', 'exact RA 10157 citation')

  const exactEccdCitation = runLocalResearch({
    query: 'What does RA 12199 require for ECCD, early childhood care, child development centers, and LGU coordination?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactEccdCitation, 'RA 12199', '12199', 'exact RA 12199 citation')

  const exactOpenDistanceLearningCitation = runLocalResearch({
    query: 'What does RA 10650 require for open learning, distance education, and flexible learning delivery?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactOpenDistanceLearningCitation, 'RA 10650', '10650', 'exact RA 10650 citation')

  const exactInclusiveEducationCitation = runLocalResearch({
    query: 'What does RA 11650 require for inclusive education services for learners with disabilities?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactInclusiveEducationCitation, 'RA 11650', '11650', 'exact RA 11650 citation')

  const exactImminentDisasterCitation = runLocalResearch({
    query: 'What does RA 12287 require for declaration of state of imminent disaster and anticipatory action?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactImminentDisasterCitation, 'RA 12287', '12287', 'exact RA 12287 citation')

  const exactPwdPrivilegesCitation = runLocalResearch({
    query: 'What does RA 9442 require for PWD privileges, discounts, and anti-discrimination controls?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactPwdPrivilegesCitation, 'RA 9442', '9442', 'exact RA 9442 citation')

  const exactPdaoCitation = runLocalResearch({
    query: 'What does RA 10070 require for PDAO and local PWD affairs office services?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactPdaoCitation, 'RA 10070', '10070', 'exact RA 10070 citation')

  const exactPwdEmploymentCitation = runLocalResearch({
    query: 'What does RA 10524 require for PWD employment, reserved positions, and reasonable accommodation?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactPwdEmploymentCitation, 'RA 10524', '10524', 'exact RA 10524 citation')

  const exactPwdBenefitsCitation = runLocalResearch({
    query: 'What does RA 10754 require for PWD discount, VAT exemption, and benefit verification?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactPwdBenefitsCitation, 'RA 10754', '10754', 'exact RA 10754 citation')

  const exactImperfectTitleCitation = runLocalResearch({
    query: 'What does RA 11573 require for confirmation of imperfect and incomplete land titles?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactImperfectTitleCitation, 'RA 11573', '11573', 'exact RA 11573 citation')

  const exactResidentialFreePatentCitation = runLocalResearch({
    query: 'What does RA 10023 require for residential free patents and public land titling?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactResidentialFreePatentCitation, 'RA 10023', '10023', 'exact RA 10023 citation')

  const exactAgriculturalFreePatentCitation = runLocalResearch({
    query: 'What does RA 11231 require for agricultural free patents and restrictions on agricultural land patents?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactAgriculturalFreePatentCitation, 'RA 11231', '11231', 'exact RA 11231 citation')

  const exactCarpCitation = runLocalResearch({
    query: 'What does RA 6657 require for CARP agrarian reform coverage and agrarian reform beneficiaries?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactCarpCitation, 'RA 6657', '6657', 'exact RA 6657 citation')

  const exactCarperCitation = runLocalResearch({
    query: 'What does RA 9700 require for CARPER amendments to agrarian reform implementation?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactCarperCitation, 'RA 9700', '9700', 'exact RA 9700 citation')

  const exactAgrarianEmancipationCitation = runLocalResearch({
    query: 'What does RA 11953 require for agrarian emancipation and agrarian reform debt condonation?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactAgrarianEmancipationCitation, 'RA 11953', '11953', 'exact RA 11953 citation')

  const exactAdministrativeAdoptionCitation = runLocalResearch({
    query: 'What does RA 11642 require for domestic administrative adoption and alternative child care?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactAdministrativeAdoptionCitation, 'RA 11642', '11642', 'exact RA 11642 citation')

  const exactSimulatedBirthCitation = runLocalResearch({
    query: 'What does RA 11222 require for simulated birth rectification and birth certificate records?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactSimulatedBirthCitation, 'RA 11222', '11222', 'exact RA 11222 citation')

  const exactFoundlingCitation = runLocalResearch({
    query: 'What does RA 11767 require for foundling recognition, birth registration, and child identity protection?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactFoundlingCitation, 'RA 11767', '11767', 'exact RA 11767 citation')

  const citationVariant = runLocalResearch({
    query: 'What controls apply under R.A. No. 10173 and RA No. 8792 for online consent records?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatch(citationVariant, 'RA 10173', 'citation variant privacy')
  assertCompletedMatch(citationVariant, 'RA 8792', 'citation variant e-commerce')

  const relationExpansion = runLocalResearch({
    query: 'What does RA 10172 require for civil registry correction?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatch(relationExpansion, 'RA 10172', 'civil registry relation source')
  assertCompletedMatch(relationExpansion, 'RA 9048', 'civil registry relation target')
  assert.equal(statutes(relationExpansion)[0], 'RA 10172', 'related authority should not outrank exact citation')
  assert.ok(
    relationExpansion.retrieval_metadata.relation_paths.some((path) => (
      path.source === 'RA 10172' && path.target === 'RA 9048'
    )),
    'civil registry relation path should be reported'
  )

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

  const eprTopic = runLocalResearch({
    query: 'What EPR controls apply to plastic packaging footprint, producer responsibility organization, recovery targets, third party audit, and DENR reporting?',
    user_id: 'golden',
  })
  assertCompletedMatch(eprTopic, 'RA 11898', 'EPR plastic packaging topic')
  assert.equal(statutes(eprTopic)[0], 'RA 11898', 'EPR topic should rank RA 11898 first')
  assert.ok(
    eprTopic.summary.includes('Environmental Operations and Facility Controls Stack'),
    'EPR topic should include the environmental operations framework section'
  )

  const paymentSystemsTopic = runLocalResearch({
    query: 'What payment system operator controls apply to QR payment settlement and remittance rails?',
    user_id: 'golden',
  })
  assertCompletedMatch(paymentSystemsTopic, 'RA 11127', 'payment systems topic')
  assert.equal(statutes(paymentSystemsTopic)[0], 'RA 11127', 'payment systems topic should rank RA 11127 first')
  assert.ok(
    paymentSystemsTopic.summary.includes('Payment Systems, CFT, and Sanctions Controls Stack'),
    'payment systems topic should include its framework section'
  )

  const bspFinancialConsumerRegulations = runLocalResearch({
    query:
      'What does BSP Circular 1160 require for financial consumer protection regulations, market conduct, transparent pricing, complaint handling, fraud response, and consumer data protection?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    bspFinancialConsumerRegulations,
    ['BSP Circular No. 1160, s. 2022', 'RA 11765'],
    'BSP Circular 1160 financial consumer protection workflow',
    0.25
  )
  assert.equal(statutes(bspFinancialConsumerRegulations)[0], 'BSP Circular No. 1160, s. 2022', 'BSP Circular 1160 should rank first')

  const bspConsumerAssistance = runLocalResearch({
    query:
      'What does BSP Circular 1169 require for consumer assistance mechanism, complaint intake, acknowledgment, resolution timeline, escalation, root cause analysis, and remediation?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    bspConsumerAssistance,
    ['BSP Circular No. 1169, s. 2023', 'BSP Circular No. 1160, s. 2022'],
    'BSP Circular 1169 consumer assistance workflow',
    0.25
  )
  assert.equal(statutes(bspConsumerAssistance)[0], 'BSP Circular No. 1169, s. 2023', 'BSP Circular 1169 should rank first')

  const bspFraudManagement = runLocalResearch({
    query:
      'What does BSP Circular 1140 require for a robust fraud management system, fraud monitoring, transaction monitoring, customer authentication, account takeover, incident response, and fraud reporting?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    bspFraudManagement,
    ['BSP Circular No. 1140, s. 2022', 'RA 12010'],
    'BSP Circular 1140 fraud management workflow',
    0.25
  )
  assert.equal(statutes(bspFraudManagement)[0], 'BSP Circular No. 1140, s. 2022', 'BSP Circular 1140 should rank first')

  const bspVaspGuidelines = runLocalResearch({
    query:
      'What does BSP Circular 1108 require for virtual asset service providers, VASP registration, crypto exchange custody, wallet-address records, customer due diligence, transaction monitoring, cybersecurity, and consumer disclosure?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    bspVaspGuidelines,
    ['BSP Circular No. 1108, s. 2021', 'RA 11127', 'RA 9160', '2018 AMLA IRR'],
    'BSP Circular 1108 VASP workflow',
    0.25
  )
  assert.equal(statutes(bspVaspGuidelines)[0], 'BSP Circular No. 1108, s. 2021', 'BSP Circular 1108 should rank first')

  const sanctionsTopic = runLocalResearch({
    query: 'What sanctions screening and asset-freeze controls apply to a donation transfer flagged for terrorism financing?',
    user_id: 'golden',
  })
  assertCompletedMatches(sanctionsTopic, ['RA 10168', 'RA 11479'], 'CFT sanctions topic')
  assert.equal(statutes(sanctionsTopic)[0], 'RA 10168', 'CFT sanctions topic should rank RA 10168 first')
  assert.ok(
    sanctionsTopic.summary.includes('Payment Systems, CFT, and Sanctions Controls Stack'),
    'CFT sanctions topic should include the payment systems CFT framework section'
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

  const paymentCftSanctionsWorkflow = runLocalResearch({
    query: 'What controls apply to operator of payment system registration, wallet settlement, payment switch reconciliation, AML suspicious transactions, CFT sanctions screening, asset freeze, Anti-Terrorism Council referrals, fraud evidence, cybercrime escalation, preservation orders, service-provider coordination, traffic data, customer privacy, and consumer remediation?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    paymentCftSanctionsWorkflow,
    ['RA 11127', 'RA 9160', '2018 AMLA IRR', 'RA 10168', 'RA 11479', 'RA 12010', 'RA 11765', 'RA 10175', 'Cybercrime Prevention Act IRR', 'A.M. No. 17-11-03-SC'],
    'payment systems CFT sanctions workflow'
  )
  assert.ok(
    paymentCftSanctionsWorkflow.summary.includes('Payment Systems, CFT, and Sanctions Controls Stack'),
    'payment systems CFT sanctions workflow should include its framework section'
  )

  const publicAccountabilityWorkflow = runLocalResearch({
    query: 'What controls apply to public procurement bidding, BAC award, contract implementation, COA audit trail, public funds, SALN, gifts, conflict of interest, unwarranted benefits, and plunder red flags?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    publicAccountabilityWorkflow,
    ['RA 12009', 'PD 1445', 'RA 3019', 'RA 6713', 'RA 7080'],
    'public accountability workflow'
  )
  assert.ok(
    publicAccountabilityWorkflow.summary.includes('Public Accountability, Ethics, Audit, and Government Funds Stack') ||
      publicAccountabilityWorkflow.summary.includes('Imports, Public Procurement, Assets, and Audit Stack'),
    'public accountability workflow should include a relevant framework section'
  )

  const foiRecordsWorkflow = runLocalResearch({
    query: 'What controls should an agency FOI manual include for eFOI request intake, public records, privacy redaction, exceptions, denial appeal, retention schedule, archives, and authorized document disposal?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    foiRecordsWorkflow,
    ['EO 2, s. 2016', 'RA 9470', 'RA 10173'],
    'FOI records archives privacy workflow'
  )
  assert.ok(
    foiRecordsWorkflow.summary.includes('Digital Government, E-Governance, and Public ICT Stack') ||
      foiRecordsWorkflow.summary.includes('Education, Housing, Records, and Social Benefits Stack'),
    'FOI records workflow should include a relevant records framework section'
  )

  const publicPersonnelWorkflow = runLocalResearch({
    query: 'What controls apply to civil service appointments, promotions, reassignment, preventive suspension, administrative cases, service records, personnel files, and CSC appeals?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    publicPersonnelWorkflow,
    ['PD 807', 'EO 292, s. 1987'],
    'public personnel appointment and discipline workflow'
  )
  assert.ok(
    publicPersonnelWorkflow.summary.includes('Public Personnel Appointment and Discipline Stack'),
    'public personnel workflow should include its framework section'
  )

  const barangayJusticeWorkflow = runLocalResearch({
    query: 'What barangay justice, lupon conciliation, pangkat settlement, certificate to file action, local mediation, privacy, and referral controls apply to neighborhood disputes?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    barangayJusticeWorkflow,
    ['RA 7160', 'RA 9285'],
    'barangay justice and local complaint workflow'
  )
  assert.ok(
    barangayJusticeWorkflow.summary.includes('Barangay Justice and Local Complaint Routing Stack'),
    'barangay justice workflow should include its framework section'
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

  const hospitalPatientRightsWorkflow = runLocalResearch({
    query: 'What hospital no-deposit emergency care, refusal to treat, patient transfer, unpaid bill discharge, hospital detention, health facility license, inspection, complaint, and patient record controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    hospitalPatientRightsWorkflow,
    ['RA 10932', 'RA 8344', 'RA 9439', 'RA 4226'],
    'hospital emergency care and patient rights workflow'
  )
  assert.ok(
    hospitalPatientRightsWorkflow.summary.includes('Health Facility, Emergency Care, and Patient Rights Stack'),
    'hospital patient rights workflow should include its framework section'
  )

  const onlineChildProtectionWorkflow = runLocalResearch({
    query: 'What OSAEC, CSAEM, child online safety, takedown, platform reporting, victim confidentiality, and evidence preservation controls should a school or platform use?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(onlineChildProtectionWorkflow, ['RA 11930', 'RA 9775', 'RA 10175'], 'online child protection workflow')

  const internetTransactionsWorkflow = runLocalResearch({
    query: 'What seller verification, online merchant identity, e-marketplace platform responsibility, consumer redress, takedown, electronic commerce records, and transaction record controls apply to internet transactions?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(internetTransactionsWorkflow, ['RA 11967', 'RA 7394', 'RA 8792'], 'internet transactions workflow')

  const internetTransactionsIrrWorkflow = runLocalResearch({
    query:
      'What does Joint Administrative Order No. 24-03 require for RA 11967 Internet Transactions Act IRR merchant onboarding, seller verification, e-marketplace takedown, consumer redress, E-Commerce Bureau routing, and transaction records?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    internetTransactionsIrrWorkflow,
    ['Joint Administrative Order No. 24-03, s. 2024', 'RA 11967', 'RA 7394', 'RA 8792'],
    'internet transactions IRR workflow'
  )
  assert.equal(
    statutes(internetTransactionsIrrWorkflow)[0],
    'Joint Administrative Order No. 24-03, s. 2024',
    'Internet Transactions Act IRR should rank first'
  )

  const financialAccountScamWorkflow = runLocalResearch({
    query: 'What money mule, mule account, phishing, social engineering, account takeover, transaction hold, suspicious transaction, preservation order, service-provider traffic data, and evidence preservation controls apply to a wallet scam response?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    financialAccountScamWorkflow,
    ['RA 12010', 'RA 11765', 'RA 9160', '2018 AMLA IRR', 'RA 10175', 'Cybercrime Prevention Act IRR'],
    'financial account scam workflow'
  )

  const exactDigitalServicesVatCitation = runLocalResearch({
    query: 'What does RA 12023 require for VAT on Digital Services, NRDSP BIR registration, invoicing, and remittance?',
    user_id: 'golden',
  })
  assertExactCitationMatch(exactDigitalServicesVatCitation, 'RA 12023', '12023', 'exact RA 12023 citation')

  const eoptInvoicingImplementation = runLocalResearch({
    query: 'What does RA 11976 plus BIR RR 7-2024, RR 11-2024, and RMC 77-2024 require for EOPT registration, COR, invoices, service invoices, official receipts, ATP, unused official receipts, serial numbers, and transition records?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    eoptInvoicingImplementation,
    ['RR 7-2024', 'RR 11-2024', 'RMC 77-2024'],
    'EOPT invoicing implementation workflow'
  )

  const eoptTaxAdministrationImplementation = runLocalResearch({
    query: 'What EOPT VAT, percentage tax, filing, payment, refund, reduced interest, reduced penalties, and taxpayer classification controls apply under BIR RR 3-2024, RR 4-2024, RR 5-2024, RR 6-2024, and RR 8-2024?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    eoptTaxAdministrationImplementation,
    ['RR 3-2024', 'RR 4-2024', 'RR 5-2024', 'RR 6-2024', 'RR 8-2024', 'RA 11976'],
    'EOPT tax administration implementation workflow'
  )

  const businessTaxWorkflow = runLocalResearch({
    query: 'What BIR registration, NIRC income tax, VAT, withholding certificates, EOPT invoices, tax returns, TRAIN excise tax, NRDSP digital services VAT invoicing and remittance, CREATE Act corporate incentives, and CREATE MORE registered business enterprise controls should a small platform business keep?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    businessTaxWorkflow,
    ['RA 8424', 'RR 3-2024', 'RR 7-2024', 'RA 10963', 'RA 11534', 'RA 12066', 'RA 12023'],
    'business tax registration and incentives workflow'
  )
  assert.ok(
    businessTaxWorkflow.summary.includes('Business Tax Registration, Invoicing, and Incentives Stack'),
    'business tax workflow should include its framework section'
  )

  const digitalGovernmentWorkflow = runLocalResearch({
    query: 'What e-governance, government portal, online government transaction, interoperability, data exchange, DICT, cybersecurity, incident logs, computer data, accessibility, and records controls apply to a digital permit service?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(digitalGovernmentWorkflow, ['RA 12254', 'RA 10844', 'RA 10173', 'RA 10175', 'Cybercrime Prevention Act IRR'], 'digital government workflow')
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

  const basicEducationGovernanceWorkflow = runLocalResearch({
    query: 'What DepEd basic education governance controls apply to school divisions, school heads, school operations, learner enrollment, K to 12 curriculum, learner records, and parent or guardian notices?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    basicEducationGovernanceWorkflow,
    ['RA 9155', 'RA 10533'],
    'DepEd basic education governance workflow'
  )
  assertSummaryIncludesAny(
    basicEducationGovernanceWorkflow,
    [
      'Education Governance and Inclusive Learning Stack',
      'Education, Housing, Records, and Social Benefits Stack',
    ],
    'DepEd basic education governance workflow'
  )

  const kindergartenEccdWorkflow = runLocalResearch({
    query: 'What kindergarten, ECCD, early childhood care, child development center, learner admission, parent consent, health referral, and child record controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    kindergartenEccdWorkflow,
    ['RA 10157', 'RA 12199'],
    'kindergarten and ECCD workflow'
  )
  assertSummaryIncludesAny(
    kindergartenEccdWorkflow,
    [
      'Education Governance and Inclusive Learning Stack',
      'Education, Housing, Records, and Social Benefits Stack',
    ],
    'kindergarten and ECCD workflow'
  )

  const openDistanceLearningWorkflow = runLocalResearch({
    query: 'What open distance learning, flexible learning delivery, distance education module, learner assessment, technology access, and learner record controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatch(openDistanceLearningWorkflow, 'RA 10650', 'open distance learning workflow')
  assert.equal(statutes(openDistanceLearningWorkflow)[0], 'RA 10650', 'open distance learning workflow should rank RA 10650 first')
  assertSummaryIncludesAny(
    openDistanceLearningWorkflow,
    [
      'Education Governance and Inclusive Learning Stack',
      'Education, Housing, Records, and Social Benefits Stack',
    ],
    'open distance learning workflow'
  )

  const inclusiveEducationWorkflow = runLocalResearch({
    query: 'What inclusive education, learner with disability, individualized education plan, accommodation, accessibility, referral, parent participation, and confidential learner record controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    inclusiveEducationWorkflow,
    ['RA 11650', 'RA 7277'],
    'inclusive education learners with disabilities workflow'
  )
  assert.equal(statutes(inclusiveEducationWorkflow)[0], 'RA 11650', 'inclusive education workflow should rank RA 11650 first')
  assertSummaryIncludesAny(
    inclusiveEducationWorkflow,
    [
      'Education Governance and Inclusive Learning Stack',
      'Education, Housing, Records, and Social Benefits Stack',
    ],
    'inclusive education learners with disabilities workflow'
  )

  const educationGovernanceInclusiveWorkflow = runLocalResearch({
    query: 'What controls apply to DepEd governance, school division authority, kindergarten, ECCD, open distance learning, inclusive education for learners with disabilities, learner records, parent participation, accommodations, referrals, and privacy?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    educationGovernanceInclusiveWorkflow,
    ['RA 9155', 'RA 10157', 'RA 12199', 'RA 10650', 'RA 11650'],
    'education governance and inclusive learning workflow',
    0.25
  )
  assertSummaryIncludesAny(
    educationGovernanceInclusiveWorkflow,
    [
      'Education Governance and Inclusive Learning Stack',
      'Education, Housing, Records, and Social Benefits Stack',
    ],
    'education governance and inclusive learning workflow'
  )

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

  const terminationDueProcessWorkflow = runLocalResearch({
    query:
      'What DOLE Department Order 147-15, twin notice, notice to explain, hearing, just cause, authorized cause, separation pay, final pay, and dismissal records apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    terminationDueProcessWorkflow,
    ['DOLE Department Order No. 147-15', 'PD 442'],
    'labor termination due process workflow',
    0.25
  )
  assert.equal(statutes(terminationDueProcessWorkflow)[0], 'DOLE Department Order No. 147-15', 'termination workflow should rank DOLE DO 147-15 first')
  assert.ok(
    terminationDueProcessWorkflow.summary.includes('Workplace Pay, Flexible Work, and Family Support Stack'),
    'termination workflow should include the workplace pay and labor framework section'
  )

  const contractingWorkflow = runLocalResearch({
    query:
      'What PD 442 Labor Code and DOLE Department Order 174-17 labor-only contracting, contractor registration, service agreement, principal contractor, worker deployment, supervision boundary, payroll, and benefits records apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    contractingWorkflow,
    ['DOLE Department Order No. 174-17', 'PD 442'],
    'labor contracting and subcontracting workflow',
    0.25
  )
  assert.equal(statutes(contractingWorkflow)[0], 'DOLE Department Order No. 174-17', 'contracting workflow should rank DOLE DO 174-17 first')

  const oshIrrWorkflow = runLocalResearch({
    query:
      'What DOLE Department Order 198-18, OSH program, safety officer, safety committee, worker safety training, PPE, workplace accident report, DOLE inspection, and corrective action controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(oshIrrWorkflow, ['DOLE Department Order No. 198-18', 'RA 11058'], 'OSH IRR workflow', 0.25)
  assert.equal(statutes(oshIrrWorkflow)[0], 'DOLE Department Order No. 198-18', 'OSH IRR workflow should rank DOLE DO 198-18 first')
  assert.ok(
    oshIrrWorkflow.summary.includes('Workplace, School, Public Safety, and Protection Stack'),
    'OSH IRR workflow should include the workplace safety framework section'
  )

  const imminentDisasterWorkflow = runLocalResearch({
    query:
      'What state of imminent disaster, forecasted hazard, pre-disaster risk assessment, anticipatory action, pre-emptive evacuation, relief prepositioning, LDRRMF, special trust fund, national DRRM fund, OCD monitoring, and false hazard information controls should an LGU disaster plan include?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    imminentDisasterWorkflow,
    ['RA 12287', 'RA 10121'],
    'imminent disaster anticipatory action workflow',
    0.25
  )
  assert.equal(statutes(imminentDisasterWorkflow)[0], 'RA 12287', 'imminent disaster workflow should rank RA 12287 first')
  assert.ok(
    imminentDisasterWorkflow.summary.includes('Workplace, School, Public Safety, and Protection Stack'),
    'imminent disaster workflow should include the public safety framework section'
  )

  const secContactWorkflow = runLocalResearch({
    query:
      'What SEC MC 28 official email address, official cellphone number, authorized representative, MC28 portal, corporate contact, notice, reportorial records, and Revised Corporation Code context should a corporation maintain?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    secContactWorkflow,
    ['SEC Memorandum Circular No. 28, s. 2020', 'RA 11232'],
    'SEC official email and mobile number workflow',
    0.25
  )
  assert.equal(statutes(secContactWorkflow)[0], 'SEC Memorandum Circular No. 28, s. 2020', 'SEC contact workflow should rank SEC MC28 first')
  assert.ok(
    secContactWorkflow.summary.includes('Business Market Entry, Ownership, Cooperative, and Secured Finance Stack'),
    'SEC contact workflow should include the business market-entry framework section'
  )

  const secBeneficialOwnershipWorkflow = runLocalResearch({
    query:
      'What controls apply to corporate beneficial ownership, SEC HARBOR, GIS, authorized filer, ultimate beneficial owner, nominee shareholder, control person, corporate secretary records, AML due diligence links, and privacy safeguards?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    secBeneficialOwnershipWorkflow,
    ['SEC Memorandum Circular No. 15, s. 2025', 'SEC HARBOR', 'RA 11232'],
    'SEC beneficial ownership and HARBOR workflow',
    0.25
  )
  assert.equal(
    statutes(secBeneficialOwnershipWorkflow)[0],
    'SEC HARBOR',
    'SEC beneficial ownership workflow should rank the HARBOR portal first when the query emphasizes portal filing'
  )
  assert.ok(
    secBeneficialOwnershipWorkflow.summary.includes('Business Market Entry, Ownership, Cooperative, and Secured Finance Stack'),
    'SEC beneficial ownership workflow should include the business market-entry framework section'
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

  const eprPlasticPackagingWorkflow = runLocalResearch({
    query: 'What EPR controls apply to a retailer with plastic packaging footprint, producer responsibility organization, recovery targets, recycling partners, third party audit, DENR reporting, and consumer takeback claims?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(eprPlasticPackagingWorkflow, ['RA 11898', 'RA 9003'], 'EPR plastic packaging workflow')
  assert.ok(
    eprPlasticPackagingWorkflow.summary.includes('Environmental Operations and Facility Controls Stack'),
    'EPR plastic packaging workflow should include its framework section'
  )

  const environmentalImpactWildlifeForestryWorkflow = runLocalResearch({
    query: 'What ECC, EIS, environmental impact assessment, wildlife permit, threatened species habitat, tree cutting, timber transport, forest land, watershed, mitigation, consultation, monitoring, and LGU coordination controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    environmentalImpactWildlifeForestryWorkflow,
    ['PD 1586', 'RA 9147', 'PD 705'],
    'environmental impact wildlife forestry workflow'
  )
  assert.ok(
    environmentalImpactWildlifeForestryWorkflow.summary.includes('Environmental Impact, Wildlife, and Forestry Controls Stack'),
    'environmental impact wildlife forestry workflow should include its framework section'
  )

  const tourismHospitalityWorkflow = runLocalResearch({
    query: 'What DOT accreditation, hotel resort guest intake, tour operator safety, sanitation, fire safety, accessibility, refund, complaint, online booking record, and tourist privacy controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    tourismHospitalityWorkflow,
    ['RA 9593', 'PD 856', 'RA 9514', 'RA 11967'],
    'tourism hospitality events and travel services workflow'
  )
  assert.ok(
    tourismHospitalityWorkflow.summary.includes('Tourism, Hospitality, Events, and Travel Services Stack'),
    'tourism hospitality workflow should include its framework section'
  )

  const aviationMaritimeWorkflow = runLocalResearch({
    query: 'What domestic shipping, ferry route, vessel safety, Coast Guard search and rescue, oil spill response, port cargo handling, seafarer STCW certificate, seafarer welfare, airport, aircraft, air operator, flight safety, passenger manifest, cargo log, and privacy controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    aviationMaritimeWorkflow,
    ['RA 9295', 'RA 10635', 'RA 9993', 'RA 12021', 'RA 9497', 'PD 857'],
    'aviation maritime ports and seafarer workflow',
    0.25
  )
  assert.ok(
    aviationMaritimeWorkflow.summary.includes('Aviation, Maritime, Ports, and Seafarer Operations Stack'),
    'aviation maritime workflow should include its framework section'
  )

  const realEstateHousingWorkflow = runLocalResearch({
    query: 'What controls apply to subdivision and condominium buyers, license to sell, contract to sell, homeowners association HOA dues, residential rent control, Maceda installment cancellation, title verification, and real estate service broker referrals?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    realEstateHousingWorkflow,
    ['PD 957', 'RA 9904', 'RA 9653', 'RA 6552', 'RA 9646'],
    'real estate housing buyer and tenant workflow'
  )
  assert.ok(
    realEstateHousingWorkflow.summary.includes('Real Estate, Housing Buyer, HOA, and Tenant Protection Stack'),
    'real estate housing workflow should include its framework section'
  )

  const rpvaraExactCitation = runLocalResearch({
    query:
      'What does RA 12001 require for real property valuation, schedule of market values, assessor, treasurer, tax declaration, assessment roll, taxpayer notice, and assessment appeal?',
    user_id: 'golden',
  })
  assertExactCitationMatch(
    rpvaraExactCitation,
    'RA 12001',
    '12001',
    'RA 12001 real property valuation exact citation',
    0.55
  )

  const rpvaraIrrImplementation = runLocalResearch({
    query:
      'What does BLGF MC No. 001-2025 RPVARA IRR require for SMV adoption, valuation database, tax declarations, publication, assessment roll, appeals, and property-record custody?',
    user_id: 'golden',
  })
  assertCompletedMatch(
    rpvaraIrrImplementation,
    'BLGF MC No. 001-2025',
    'RPVARA IRR implementation',
    0.45
  )
  assertCompletedMatch(rpvaraIrrImplementation, 'RA 12001', 'RPVARA IRR related statute', 0.35)
  assert.equal(
    statutes(rpvaraIrrImplementation)[0],
    'BLGF MC No. 001-2025',
    'RPVARA IRR should be the top implementation match'
  )

  const realPropertyValuationWorkflow = runLocalResearch({
    query:
      'What real property tax, RPT, Local Government Code RA 7160, assessor, schedule of market values, tax declaration, assessment roll, local treasurer, delinquency, appeal, property record, privacy, and citizen charter controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    realPropertyValuationWorkflow,
    ['RA 12001', 'BLGF MC No. 001-2025', 'RA 7160'],
    'real property valuation RPT local assessment workflow',
    0.25
  )
  assert.ok(
    realPropertyValuationWorkflow.summary.includes('Real Property Valuation, RPT, and Local Assessment Stack'),
    'real property valuation workflow should include its framework section'
  )

  const publicLandAgrarianWorkflow = runLocalResearch({
    query: 'What public land, imperfect title, incomplete title, residential free patent, agricultural free patent, alienable and disposable land, DENR CENRO, CARP, CARPER, CLOA, ARB, DAR clearance, debt condonation, agrarian emancipation, and register of deeds controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    publicLandAgrarianWorkflow,
    ['RA 11573', 'RA 10023', 'RA 11231', 'RA 6657', 'RA 9700', 'RA 11953'],
    'public land free patent agrarian reform workflow',
    0.25
  )
  assert.ok(
    publicLandAgrarianWorkflow.summary.includes('Public Land, Free Patent, and Agrarian Reform Stack'),
    'public land free patent agrarian reform workflow should include its framework section'
  )

  const childAdoptionFoundlingWorkflow = runLocalResearch({
    query: 'What adoption, administrative adoption, alternative child care, NACC, simulated birth rectification, foundling recognition, birth certificate, civil registry, child identity, social welfare, and confidentiality controls should a child services desk check?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    childAdoptionFoundlingWorkflow,
    ['RA 11642', 'RA 11222', 'RA 11767', 'RA 10173'],
    'child adoption foundling civil status workflow',
    0.25
  )
  assert.ok(
    childAdoptionFoundlingWorkflow.summary.includes('Child Adoption, Foundling, and Civil Status Stack'),
    'child adoption foundling civil status workflow should include its framework section'
  )

  const pwdBenefitsAccessibilityWorkflow = runLocalResearch({
    query:
      'What controls apply to a PDAO PWD benefit desk covering PWD ID verification, discounts, VAT exemption, reasonable accommodation, accessible service channels, PWD employment support, complaint handling, and confidential records?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    pwdBenefitsAccessibilityWorkflow,
    ['RA 7277', 'RA 9442', 'RA 10070', 'RA 10524', 'RA 10754'],
    'PWD benefits accessibility and employment workflow',
    0.25
  )
  assert.ok(
    pwdBenefitsAccessibilityWorkflow.summary.includes('Health, Welfare, Accessibility, and Protection Stack'),
    'PWD benefits accessibility workflow should include its framework section'
  )

  const roadSafetyWorkflow = runLocalResearch({
    query: 'What driver license renewal, seat belt, motorcycle helmet, drunk driving, distracted driving, child restraint, traffic accident evidence, and vehicle record controls should an LGU road safety program check?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    roadSafetyWorkflow,
    ['RA 4136', 'RA 10930', 'RA 8750', 'RA 10054', 'RA 10586', 'RA 10913', 'RA 11229'],
    'road safety driver and vehicle compliance workflow'
  )
  assert.ok(
    roadSafetyWorkflow.summary.includes('Road Safety, Driver, and Vehicle Compliance Stack'),
    'road safety workflow should include its framework section'
  )

  const builtEnvironmentPermitWorkflow = runLocalResearch({
    query: 'What building permit, licensed contractor, registered architect signed plans, civil engineer structural review, sanitary permit, occupancy, and accessibility controls apply to a public market renovation?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    builtEnvironmentPermitWorkflow,
    ['PD 1096', 'RA 4566', 'RA 9266', 'RA 544', 'PD 856', 'BP 344'],
    'built environment permit and licensed professional workflow'
  )
  assert.ok(
    builtEnvironmentPermitWorkflow.summary.includes('Built Environment, Sanitation, Accessibility, and Public Facilities Stack'),
    'built environment permit workflow should include its framework section'
  )

  const buildingSystemsProfessionalWorkflow = runLocalResearch({
    query: 'What electrical engineer wiring plan, mechanical engineer HVAC equipment, master plumber drainage plan, testing, inspection, maintenance, and signed plan records apply to a facility fit-out?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    buildingSystemsProfessionalWorkflow,
    ['RA 7920', 'RA 8495', 'RA 1378'],
    'building systems licensed professional workflow'
  )
  assert.ok(
    buildingSystemsProfessionalWorkflow.summary.includes('Built Environment, Sanitation, Accessibility, and Public Facilities Stack'),
    'building systems workflow should include its framework section'
  )

  const utilitiesWorkflow = runLocalResearch({
    query: 'What public utility, electric power distribution, telecom network outage, water district disconnection, rates, consumer complaint, regulator reporting, and customer record controls apply to critical utility services?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    utilitiesWorkflow,
    ['RA 11659', 'RA 9136', 'RA 7925', 'PD 198'],
    'critical utilities energy telecom and water workflow'
  )
  assert.ok(
    utilitiesWorkflow.summary.includes('Critical Utilities, Energy, Telecom, and Water Services Stack'),
    'critical utilities workflow should include its framework section'
  )

  const fuelRetailPetroleumWorkflow = runLocalResearch({
    query: 'What fuel retail, gasoline station, petroleum price display, oil product quality, and fair market competition controls apply to a local fuel station?',
    user_id: 'golden',
  })
  assertCompletedMatch(fuelRetailPetroleumWorkflow, 'RA 8479', 'fuel retail petroleum pricing and quality topic')
  assert.equal(statutes(fuelRetailPetroleumWorkflow)[0], 'RA 8479', 'fuel retail topic should rank RA 8479 first')
  assert.ok(
    fuelRetailPetroleumWorkflow.summary.includes('Downstream Fuel, LPG, and Biofuel Controls Stack'),
    'fuel retail topic should include the downstream fuels framework section'
  )

  const lpgRefillingWorkflow = runLocalResearch({
    query: 'What LPG refilling plant, cylinder safety, dealer, retail outlet, seal, weighing, and consumer complaint controls apply?',
    user_id: 'golden',
  })
  assertCompletedMatch(lpgRefillingWorkflow, 'RA 11592', 'LPG refilling cylinders and dealers topic')
  assert.equal(statutes(lpgRefillingWorkflow)[0], 'RA 11592', 'LPG topic should rank RA 11592 first')
  assert.ok(
    lpgRefillingWorkflow.summary.includes('Downstream Fuel, LPG, and Biofuel Controls Stack'),
    'LPG topic should include the downstream fuels framework section'
  )

  const biofuelBlendsWorkflow = runLocalResearch({
    query: 'What biofuel blend, biodiesel, bioethanol, fuel supplier, quality testing, and pump labeling controls apply?',
    user_id: 'golden',
  })
  assertCompletedMatch(biofuelBlendsWorkflow, 'RA 9367', 'biofuel blends topic')
  assert.equal(statutes(biofuelBlendsWorkflow)[0], 'RA 9367', 'biofuel blends topic should rank RA 9367 first')
  assert.ok(
    biofuelBlendsWorkflow.summary.includes('Downstream Fuel, LPG, and Biofuel Controls Stack'),
    'biofuel blends topic should include the downstream fuels framework section'
  )

  const doeEnergyCoordinationWorkflow = runLocalResearch({
    query: 'What DOE energy monitoring, energy planning, supply coordination, petroleum data, and local energy office reporting controls apply?',
    user_id: 'golden',
  })
  assertCompletedMatch(doeEnergyCoordinationWorkflow, 'RA 7638', 'DOE energy monitoring and coordination topic')
  assert.equal(statutes(doeEnergyCoordinationWorkflow)[0], 'RA 7638', 'DOE coordination topic should rank RA 7638 first')
  assert.ok(
    doeEnergyCoordinationWorkflow.summary.includes('Downstream Fuel, LPG, and Biofuel Controls Stack'),
    'DOE coordination topic should include the downstream fuels framework section'
  )

  const downstreamFuelsWorkflow = runLocalResearch({
    query: 'What controls apply to a city fuel and LPG inspection workflow covering gasoline station petroleum price display, fuel quality sampling, LPG refilling plants, cylinders, dealers, biofuel blend compliance, DOE energy monitoring, supply coordination, consumer complaints, and local regulator referrals?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    downstreamFuelsWorkflow,
    ['RA 8479', 'RA 11592', 'RA 9367', 'RA 7638'],
    'downstream fuels LPG biofuels and DOE coordination workflow'
  )
  assert.ok(
    downstreamFuelsWorkflow.summary.includes('Downstream Fuel, LPG, and Biofuel Controls Stack'),
    'downstream fuels workflow should include its framework section'
  )

  const privacyOperationsWorkflow = runLocalResearch({
    query: 'What RA 10173 and Data Privacy Act IRR controls should a privacy office check for DPO, PIC, PIP, lawful processing, DPS registration, consent, data sharing agreement, outsourcing, DBNMS breach notification, personal data security, privacy engineering, AI personal data, automated decision-making, profiling, and data-subject rights?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    privacyOperationsWorkflow,
    [
      'RA 10173',
      'Data Privacy Act IRR',
      'NPC Circular No. 16-03',
      'NPC Advisory No. 2026-02',
      'NPC Circular No. 2023-06',
      'NPC Circular No. 2023-04',
      'NPC Circular No. 2022-04',
      'NPC Circular No. 2020-03',
      'NPC Advisory No. 2025-02',
    ],
    'privacy operations and NPC compliance workflow',
    0.25
  )
  assert.ok(
    privacyOperationsWorkflow.summary.includes('Privacy Operations and NPC Compliance Stack'),
    'privacy operations workflow should include its framework section'
  )

  const culturalHeritageWorkflow = runLocalResearch({
    query: 'What does RA 10066 require before altering a heritage building, archive, monument, or cultural property?',
    user_id: 'golden',
  })
  assertCompletedMatch(culturalHeritageWorkflow, 'RA 10066', 'cultural heritage exact citation topic')
  assert.equal(statutes(culturalHeritageWorkflow)[0], 'RA 10066', 'cultural heritage topic should rank RA 10066 first')

  const earlyYearsWorkflow = runLocalResearch({
    query: 'Historically, what did RA 10410 require for early childhood care, child development centers, ECCD services, and young learner records before RA 12199 replaced it?',
    user_id: 'golden',
  })
  assertCompletedMatch(earlyYearsWorkflow, 'RA 10410', 'early years ECCD exact citation topic')
  assert.equal(statutes(earlyYearsWorkflow)[0], 'RA 12199', 'early years topic should rank the current RA 12199 framework first')
  assert.ok(
    earlyYearsWorkflow.summary.includes('repealed by RA 12199') ||
      earlyYearsWorkflow.summary.includes('superseded') ||
      earlyYearsWorkflow.summary.includes('historical'),
    'early years historical topic should flag RA 10410 as superseded by RA 12199'
  )

  const condominiumWorkflow = runLocalResearch({
    query:
      'What condominium master deed, unit title, common area, condominium corporation, developer turnover, license to sell, buyer disclosure, and HOA record controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    condominiumWorkflow,
    ['RA 4726', 'PD 957', 'RA 9904'],
    'condominium buyer governance workflow',
    0.2
  )
  assert.equal(statutes(condominiumWorkflow)[0], 'RA 4726', 'condominium workflow should rank RA 4726 first')
  assert.ok(
    condominiumWorkflow.summary.includes('Real Estate, Housing Buyer, HOA, and Tenant Protection Stack'),
    'condominium workflow should include the real estate housing framework section'
  )

  const socializedHousingWorkflow = runLocalResearch({
    query:
      'What BP 220 economic housing, socialized housing standards, site development, beneficiary validation, DHSUD, relocation, and grievance controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    socializedHousingWorkflow,
    ['BP 220', 'RA 7279', 'RA 11201'],
    'economic and socialized housing workflow',
    0.2
  )
  assert.equal(statutes(socializedHousingWorkflow)[0], 'BP 220', 'socialized housing standards should rank BP 220 first')
  assert.ok(
    socializedHousingWorkflow.summary.includes('Real Estate, Housing Buyer, HOA, and Tenant Protection Stack'),
    'socialized housing workflow should include the real estate housing framework section'
  )

  const professionalLicensingWorkflow = runLocalResearch({
    query:
      'What PRC license, professional board, CPD units, license renewal, signed and sealed plans, pharmacist, registered architect, licensed engineer, real estate broker, and credential records should be checked?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    professionalLicensingWorkflow,
    ['RA 8981', 'RA 10912', 'RA 9646'],
    'professional licensing and CPD workflow',
    0.2
  )
  assert.equal(statutes(professionalLicensingWorkflow)[0], 'RA 10912', 'professional licensing workflow should rank CPD evidence first for CPD-heavy query')
  assert.ok(
    professionalLicensingWorkflow.summary.includes('Professional Licensing, CPD, and Regulated Practice Stack'),
    'professional licensing workflow should include its framework section'
  )

  const pharmacyWorkflow = runLocalResearch({
    query:
      'What pharmacy, responsible pharmacist, prescription dispensing, compounding, patient counseling, drugstore, online pharmacy, and medicine records controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatch(pharmacyWorkflow, 'RA 10918', 'pharmacy professional practice workflow', 0.25)
  assert.equal(statutes(pharmacyWorkflow)[0], 'RA 10918', 'pharmacy workflow should rank RA 10918 first')
  assert.ok(
    pharmacyWorkflow.summary.includes('IP, Investment, Health Product, and Market Claims Stack'),
    'pharmacy workflow should include the health product framework section'
  )

  const medicineAccessWorkflow = runLocalResearch({
    query:
      'What cheaper medicines, generic substitution, drug price, medicine access, quality affordable medicines, pharmacy retail, and patient complaint controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(medicineAccessWorkflow, ['RA 9502', 'RA 10918'], 'medicine access and pharmacy workflow', 0.25)
  assert.equal(statutes(medicineAccessWorkflow)[0], 'RA 9502', 'medicine access workflow should rank RA 9502 first')
  assert.ok(
    medicineAccessWorkflow.summary.includes('IP, Investment, Health Product, and Market Claims Stack'),
    'medicine access workflow should include the health product framework section'
  )

  const tobaccoWarningWorkflow = runLocalResearch({
    query:
      'What graphic health warning, tobacco package, cigarette label, product warning, manufacturer, distributor, retailer, and consumer disclosure controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(tobaccoWarningWorkflow, ['RA 10643', 'RA 9211'], 'tobacco graphic health warning workflow', 0.25)
  assert.equal(statutes(tobaccoWarningWorkflow)[0], 'RA 10643', 'graphic health warning workflow should rank RA 10643 first')
  assert.ok(
    tobaccoWarningWorkflow.summary.includes('IP, Investment, Health Product, and Market Claims Stack'),
    'tobacco warning workflow should include the health product framework section'
  )

  const agriculturalSabotageWorkflow = runLocalResearch({
    query:
      'What RA 12022 agricultural economic sabotage, agricultural smuggling, agricultural hoarding, food profiteering, food cartel, customs documents for agricultural imports, rice warehouse inventory, rice price monitoring, and food traceability controls apply?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    agriculturalSabotageWorkflow,
    ['RA 12022', 'RA 10863', 'RA 10611'],
    'agricultural economic sabotage workflow',
    0.2
  )
  assert.equal(statutes(agriculturalSabotageWorkflow)[0], 'RA 12022', 'agricultural sabotage workflow should rank RA 12022 first')
  assert.ok(
    agriculturalSabotageWorkflow.summary.includes('Agricultural Economic Sabotage and Food Supply Chain Stack'),
    'agricultural sabotage workflow should include the agricultural economic sabotage framework section'
  )

  const customsFormalEntryWorkflow = runLocalResearch({
    query:
      'What RA 10863 CMTA and BOC CAO 09-2020 controls apply to formal entry, goods declaration, customs valuation, tariff classification, duties and taxes, product permits, customs broker responsibility, regulated goods, examination, release, post-clearance audit, seizure, forfeiture, protest, and appeal for imported public equipment?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    customsFormalEntryWorkflow,
    ['RA 10863', 'BOC CAO No. 09-2020'],
    'customs formal entry and imported public equipment workflow',
    0.2
  )
  assert.equal(
    statutes(customsFormalEntryWorkflow)[0],
    'BOC CAO No. 09-2020',
    'customs formal-entry workflow should rank the BOC formal-entry guidance first'
  )
  assert.ok(
    customsFormalEntryWorkflow.summary.includes('Imports, Public Procurement, Assets, and Audit Stack'),
    'customs workflow should include the imports/procurement framework section'
  )

  const noResult = runLocalResearch({ query: 'How do I bake sourdough bread at high altitude?', user_id: 'golden' })
  assert.equal(noResult.status, 'no_results', 'unrelated query should return no_results')
  assert.equal(noResult.documents_found, 0, 'unrelated query should not report documents')
  assert.equal(noResult.confidence_score, 0, 'unrelated query should have zero confidence')
  assert.ok(noResult.summary.includes('No strong match was found'), 'unrelated query should explain no local match')
  assert.ok(
    noResult.summary.includes('non-legal topic') &&
      noResult.summary.includes('food business'),
    'unrelated query should suggest a topic-aware legal framing'
  )

  const unknownCitation = runLocalResearch({ query: 'What is RA 999999 about?', user_id: 'golden' })
  assert.equal(unknownCitation.status, 'no_results', 'unknown RA citation should return no_results')
  assert.deepEqual(unknownCitation.retrieval_metadata.citation_numbers, ['999999'], 'unknown RA citation metadata')
  assert.deepEqual(unknownCitation.retrieval_metadata.relation_paths, [], 'unknown citation should not invent relation paths')
  assert.deepEqual(
    unknownCitation.retrieval_metadata.provenance_coverage,
    {},
    'unknown citation should not invent provenance coverage'
  )
  assert.ok(
    unknownCitation.retrieval_metadata.coverage_warnings.some((warning) => warning.includes('RA 999999')),
    'unknown citation should include a coverage warning'
  )
  assert.ok(
    unknownCitation.summary.includes('RA 999999 was cited but is not in the bundled local corpus'),
    'unknown RA citation should be explained in citation coverage'
  )

  const seededCoverage = runLocalResearch({ query: 'What is RA 12254 about?', user_id: 'golden' })
  assertCompletedMatch(seededCoverage, 'RA 12254', 'seeded source coverage warning', 0.5)
  assert.ok(
    seededCoverage.retrieval_metadata.coverage_warnings.some((warning) => warning.includes('RA 12254')),
    'seeded source should expose coverage warning'
  )

  const aiGovernanceQuery = runLocalResearch({
    query: 'What privacy and governance controls apply to AI chatbots that process personal data in the Philippines?',
    user_id: 'golden',
  })
  assertCompletedMatches(
    aiGovernanceQuery,
    ['NPC Advisory No. 2024-04', 'NPC Circular No. 2023-06'],
    'AI chatbot privacy governance',
    0.25
  )
  assert.ok(
    aiGovernanceQuery.matched_documents.some((document) => document.support_level === 'direct'),
    'AI governance query should include direct source support metadata'
  )

  const publicSectorAutomationQuery = runLocalResearch({
    query: 'What e-governance and digital public service controls should a government AI system use for automated public service decisions, human review, privacy impact assessment, and citizen complaints?',
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
