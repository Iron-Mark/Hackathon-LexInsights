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
  assert.equal(
    response.matched_documents[0].provenance_status,
    'seeded',
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
  assert.equal(
    exactCitation.matched_documents[0].provenance_status,
    'seeded',
    'exact citation top match should expose provenance status'
  )

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
    query: 'What controls apply to operator of payment system registration, wallet settlement, payment switch reconciliation, AML suspicious transactions, CFT sanctions screening, asset freeze, Anti-Terrorism Council referrals, fraud evidence, cybercrime escalation, customer privacy, and consumer remediation?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    paymentCftSanctionsWorkflow,
    ['RA 11127', 'RA 9160', 'RA 10168', 'RA 11479', 'RA 12010', 'RA 11765', 'RA 8484'],
    'payment systems CFT sanctions workflow'
  )
  assert.ok(
    paymentCftSanctionsWorkflow.summary.includes('Payment Systems, CFT, and Sanctions Controls Stack'),
    'payment systems CFT sanctions workflow should include its framework section'
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

  const businessTaxWorkflow = runLocalResearch({
    query: 'What BIR registration, NIRC income tax, VAT, withholding certificates, EOPT invoices, tax returns, TRAIN excise tax, CREATE Act corporate incentives, and CREATE MORE registered business enterprise controls should a small platform business keep?',
    user_id: 'golden',
    use_deep_search: true,
  })
  assertCompletedMatches(
    businessTaxWorkflow,
    ['RA 8424', 'RA 11976', 'RA 10963', 'RA 11534', 'RA 12066'],
    'business tax registration and incentives workflow'
  )
  assert.ok(
    businessTaxWorkflow.summary.includes('Business Tax Registration, Invoicing, and Incentives Stack'),
    'business tax workflow should include its framework section'
  )

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

  const noResult = runLocalResearch({ query: 'How do I bake sourdough bread at high altitude?', user_id: 'golden' })
  assert.equal(noResult.status, 'no_results', 'unrelated query should return no_results')
  assert.equal(noResult.documents_found, 0, 'unrelated query should not report documents')
  assert.equal(noResult.confidence_score, 0, 'unrelated query should have zero confidence')
  assert.ok(noResult.summary.includes('No strong match was found'), 'unrelated query should explain no local match')

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
    ['NPC Advisory No. 2024-04', 'RA 10173'],
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
