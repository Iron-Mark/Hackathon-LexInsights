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

function assertIncludes(source, expected, label) {
  assert.equal(
    source.includes(expected),
    true,
    `${label} must include ${expected}`
  )
}

function assertIncludesAny(source, expectedOptions, label) {
  assert.equal(
    expectedOptions.some((expected) => source.includes(expected)),
    true,
    `${label} must include one of: ${expectedOptions.join(', ')}`
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
  assert.ok(response.fallback_reason, `${label} should record fallback reason`)
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

  const tempDir = mkdtempSync(path.join(tmpdir(), 'lexinsight-providerless-'))
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
  assert.ok(corpus.length >= 232, 'Local corpus should include at least 232 authorities')
  assert.ok(frameworks.length >= 42, 'Local corpus should include compliance framework bundles')
  assert.ok(
    frameworks.some((framework) => framework.id === 'data-incident-response'),
    'Frameworks should include data incident response'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'privacy-operations-and-npc-compliance'),
    'Frameworks should include privacy operations and NPC compliance'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'financial-account-scam-response'),
    'Frameworks should include financial account scam response'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'payment-systems-cft-and-sanctions-controls'),
    'Frameworks should include payment systems, CFT, and sanctions controls'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'business-tax-registration-invoicing-and-incentives'),
    'Frameworks should include business tax registration, invoicing, and incentives'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'digital-government-and-public-ict'),
    'Frameworks should include digital government and public ICT'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'environmental-operations'),
    'Frameworks should include environmental operations'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'environmental-impact-wildlife-and-forestry'),
    'Frameworks should include environmental impact, wildlife, and forestry controls'
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
    frameworks.some((framework) => framework.id === 'banking-lending-insurance-and-financial-institutions'),
    'Frameworks should include banking, lending, insurance, and financial institutions'
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
    frameworks.some((framework) => framework.id === 'basic-education-governance-and-inclusive-learning'),
    'Frameworks should include basic education governance and inclusive learning'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'child-adoption-foundling-and-civil-status'),
    'Frameworks should include child adoption, foundling, and civil status'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'real-estate-housing-buyer-and-tenant-protection'),
    'Frameworks should include real estate, housing buyer, HOA, and tenant protection'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'mobility-land-agriculture-and-community-rights'),
    'Frameworks should include mobility, land, agriculture, and community rights'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'public-land-free-patent-and-agrarian-reform'),
    'Frameworks should include public land, free patent, and agrarian reform'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'road-safety-driver-and-vehicle-compliance'),
    'Frameworks should include road safety, driver, and vehicle compliance'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'critical-utilities-energy-telecom-and-water-services'),
    'Frameworks should include critical utilities, energy, telecom, and water services'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'downstream-fuel-lpg-and-biofuel-controls'),
    'Frameworks should include downstream fuel, LPG, and biofuel controls'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'tourism-hospitality-events-and-travel-services'),
    'Frameworks should include tourism, hospitality, events, and travel services'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'aviation-maritime-ports-and-seafarer-operations'),
    'Frameworks should include aviation, maritime, ports, and seafarer operations'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'health-facility-emergency-care-and-patient-rights'),
    'Frameworks should include health facility, emergency care, and patient rights'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'public-accountability-and-government-funds'),
    'Frameworks should include public accountability and government funds'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'barangay-justice-and-local-complaint-routing'),
    'Frameworks should include barangay justice and local complaint routing'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'public-personnel-appointment-and-discipline'),
    'Frameworks should include public personnel appointment and discipline'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'employee-benefits-and-social-insurance'),
    'Frameworks should include employee benefits and social insurance'
  )
  assert.ok(
    frameworks.some((framework) => framework.id === 'workplace-pay-flex-work-and-family-support'),
    'Frameworks should include workplace pay, flexible work, and family support'
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
  assert.ok(
    frameworks.some((framework) => framework.id === 'ai-governance-privacy-public-sector-automation'),
    'Frameworks should include AI governance, privacy, and public-sector automation'
  )
  assert.ok(corpus.some((document) => document.statute === 'RA 9003'), 'Corpus should include RA 9003')
  assert.ok(corpus.some((document) => document.statute === 'RA 10173'), 'Corpus should include RA 10173')
  assert.ok(corpus.some((document) => document.id === 'npc-circular-16-03'), 'Corpus should include NPC Circular 16-03')
  assert.ok(corpus.some((document) => document.id === 'npc-advisory-2026-02'), 'Corpus should include NPC Advisory 2026-02')
  assert.ok(corpus.some((document) => document.id === 'npc-circular-2023-06'), 'Corpus should include NPC Circular 2023-06')
  assert.ok(corpus.some((document) => document.id === 'npc-circular-2023-04'), 'Corpus should include NPC Circular 2023-04')
  assert.ok(corpus.some((document) => document.id === 'npc-circular-2022-04'), 'Corpus should include NPC Circular 2022-04')
  assert.ok(corpus.some((document) => document.id === 'npc-circular-2020-03'), 'Corpus should include NPC Circular 2020-03')
  assert.ok(corpus.some((document) => document.id === 'npc-advisory-2025-02'), 'Corpus should include NPC Advisory 2025-02')
  assert.ok(corpus.some((document) => document.statute === 'RA 11898'), 'Corpus should include RA 11898')
  assert.ok(
    corpus.some((document) => document.statute === 'NPC Advisory No. 2024-04'),
    'Corpus should include NPC AI privacy advisory'
  )
  assert.ok(
    corpus.some((document) => document.statute === 'A.M. No. 25-11-28-SC'),
    'Corpus should include Supreme Court AI governance framework'
  )
  assert.ok(corpus.some((document) => document.statute === 'RA 11058'), 'Corpus should include RA 11058')
  assert.ok(corpus.some((document) => document.statute === 'RA 12009'), 'Corpus should include RA 12009')
  assert.ok(corpus.some((document) => document.statute === 'RA 11032'), 'Corpus should include RA 11032')
  assert.ok(corpus.some((document) => document.statute === 'RA 10175'), 'Corpus should include RA 10175')
  assert.ok(corpus.some((document) => document.statute === 'RA 9775'), 'Corpus should include RA 9775')
  assert.ok(corpus.some((document) => document.statute === 'RA 9160'), 'Corpus should include RA 9160')
  assert.ok(corpus.some((document) => document.statute === 'RA 10168'), 'Corpus should include RA 10168')
  assert.ok(corpus.some((document) => document.statute === 'RA 11479'), 'Corpus should include RA 11479')
  assert.ok(corpus.some((document) => document.statute === 'RA 7394'), 'Corpus should include RA 7394')
  assert.ok(corpus.some((document) => document.statute === 'RA 10667'), 'Corpus should include RA 10667')
  assert.ok(corpus.some((document) => document.statute === 'RA 11765'), 'Corpus should include RA 11765')
  assert.ok(corpus.some((document) => document.id === 'bsp-circular-1160-2022'), 'Corpus should include BSP Circular No. 1160, s. 2022')
  assert.ok(corpus.some((document) => document.id === 'bsp-circular-1169-2023'), 'Corpus should include BSP Circular No. 1169, s. 2023')
  assert.ok(corpus.some((document) => document.id === 'bsp-circular-1140-2022'), 'Corpus should include BSP Circular No. 1140, s. 2022')
  assert.ok(corpus.some((document) => document.id === 'bsp-circular-1108-2021'), 'Corpus should include BSP Circular No. 1108, s. 2021')
  assert.ok(corpus.some((document) => document.statute === 'RA 6969'), 'Corpus should include RA 6969')
  assert.ok(corpus.some((document) => document.statute === 'RA 11285'), 'Corpus should include RA 11285')
  assert.ok(corpus.some((document) => document.statute === 'RA 11934'), 'Corpus should include RA 11934')
  assert.ok(corpus.some((document) => document.statute === 'RA 9995'), 'Corpus should include RA 9995')
  assert.ok(corpus.some((document) => document.statute === 'RA 7877'), 'Corpus should include RA 7877')
  assert.ok(corpus.some((document) => document.statute === 'RA 10627'), 'Corpus should include RA 10627')
  assert.ok(corpus.some((document) => document.statute === 'RA 10863'), 'Corpus should include RA 10863')
  assert.ok(corpus.some((document) => document.statute === 'RA 11976'), 'Corpus should include RA 11976')
  assert.ok(corpus.some((document) => document.statute === 'RA 8424'), 'Corpus should include RA 8424')
  assert.ok(corpus.some((document) => document.statute === 'RA 10963'), 'Corpus should include RA 10963')
  assert.ok(corpus.some((document) => document.statute === 'RA 11534'), 'Corpus should include RA 11534')
  assert.ok(corpus.some((document) => document.statute === 'RA 12066'), 'Corpus should include RA 12066')
  assert.ok(corpus.some((document) => document.id === 'ra-12023'), 'Corpus should include RA 12023 digital services VAT')
  assert.ok(corpus.some((document) => document.statute === 'RA 11055'), 'Corpus should include RA 11055')
  assert.ok(corpus.some((document) => document.statute === 'RA 11038'), 'Corpus should include RA 11038')
  assert.ok(corpus.some((document) => document.statute === 'EO 292, s. 1987'), 'Corpus should include EO 292')
  assert.ok(corpus.some((document) => document.statute === 'PD 807'), 'Corpus should include PD 807')
  assert.ok(corpus.some((document) => document.statute === 'PD 442'), 'Corpus should include PD 442')
  assert.ok(corpus.some((document) => document.statute === 'RA 11165'), 'Corpus should include RA 11165')
  assert.ok(corpus.some((document) => document.statute === 'RA 11360'), 'Corpus should include RA 11360')
  assert.ok(corpus.some((document) => document.statute === 'RA 6727'), 'Corpus should include RA 6727')
  assert.ok(corpus.some((document) => document.statute === 'RA 10028'), 'Corpus should include RA 10028')
  assert.ok(corpus.some((document) => document.statute === 'RA 10911'), 'Corpus should include RA 10911')
  assert.ok(corpus.some((document) => document.statute === 'RA 11036'), 'Corpus should include RA 11036')
  assert.ok(corpus.some((document) => document.id === 'dole-do-147-15'), 'Corpus should include DOLE Department Order No. 147-15')
  assert.ok(corpus.some((document) => document.id === 'dole-do-174-17'), 'Corpus should include DOLE Department Order No. 174-17')
  assert.ok(corpus.some((document) => document.id === 'dole-do-198-18'), 'Corpus should include DOLE Department Order No. 198-18')
  assert.ok(corpus.some((document) => document.id === 'sec-mc-28-2020'), 'Corpus should include SEC Memorandum Circular No. 28, s. 2020')
  assert.ok(corpus.some((document) => document.statute === 'RA 9262'), 'Corpus should include RA 9262')
  assert.ok(corpus.some((document) => document.statute === 'RA 10364'), 'Corpus should include RA 10364')
  assert.ok(corpus.some((document) => document.statute === 'RA 8293'), 'Corpus should include RA 8293')
  assert.ok(corpus.some((document) => document.statute === 'RA 8799'), 'Corpus should include RA 8799')
  assert.ok(corpus.some((document) => document.statute === 'RA 9711'), 'Corpus should include RA 9711')
  assert.ok(corpus.some((document) => document.statute === 'RA 11223'), 'Corpus should include RA 11223')
  assert.ok(corpus.some((document) => document.statute === 'PD 1586'), 'Corpus should include PD 1586')
  assert.ok(corpus.some((document) => document.statute === 'RA 9147'), 'Corpus should include RA 9147')
  assert.ok(corpus.some((document) => document.statute === 'PD 705'), 'Corpus should include PD 705')
  assert.ok(corpus.some((document) => document.statute === 'RA 10932'), 'Corpus should include RA 10932')
  assert.ok(corpus.some((document) => document.statute === 'RA 8344'), 'Corpus should include RA 8344')
  assert.ok(corpus.some((document) => document.statute === 'RA 9439'), 'Corpus should include RA 9439')
  assert.ok(corpus.some((document) => document.statute === 'RA 4226'), 'Corpus should include RA 4226')
  assert.ok(corpus.some((document) => document.statute === 'RA 11332'), 'Corpus should include RA 11332')
  assert.ok(corpus.some((document) => document.statute === 'RA 9211'), 'Corpus should include RA 9211')
  assert.ok(corpus.some((document) => document.statute === 'RA 10643'), 'Corpus should include RA 10643')
  assert.ok(corpus.some((document) => document.statute === 'RA 11900'), 'Corpus should include RA 11900')
  assert.ok(corpus.some((document) => document.statute === 'RA 10918'), 'Corpus should include RA 10918')
  assert.ok(corpus.some((document) => document.statute === 'RA 9502'), 'Corpus should include RA 9502')
  assert.ok(corpus.some((document) => document.statute === 'RA 8981'), 'Corpus should include RA 8981')
  assert.ok(corpus.some((document) => document.statute === 'RA 10912'), 'Corpus should include RA 10912')
  assert.ok(corpus.some((document) => document.statute === 'RA 4726'), 'Corpus should include RA 4726')
  assert.ok(corpus.some((document) => document.statute === 'BP 220'), 'Corpus should include BP 220')
  assert.ok(corpus.some((document) => document.statute === 'RA 12022'), 'Corpus should include RA 12022')
  assert.ok(corpus.some((document) => document.statute === 'RA 11166'), 'Corpus should include RA 11166')
  assert.ok(corpus.some((document) => document.statute === 'RA 10152'), 'Corpus should include RA 10152')
  assert.ok(corpus.some((document) => document.statute === 'RA 7719'), 'Corpus should include RA 7719')
  assert.ok(corpus.some((document) => document.statute === 'RA 11215'), 'Corpus should include RA 11215')
  assert.ok(corpus.some((document) => document.statute === 'RA 10354'), 'Corpus should include RA 10354')
  assert.ok(corpus.some((document) => document.statute === 'RA 10066'), 'Corpus should include RA 10066')
  assert.ok(corpus.some((document) => document.statute === 'RA 9994'), 'Corpus should include RA 9994')
  assert.ok(corpus.some((document) => document.statute === 'RA 7277'), 'Corpus should include RA 7277')
  assert.ok(corpus.some((document) => document.statute === 'RA 9442'), 'Corpus should include RA 9442')
  assert.ok(corpus.some((document) => document.statute === 'RA 10070'), 'Corpus should include RA 10070')
  assert.ok(corpus.some((document) => document.statute === 'RA 10524'), 'Corpus should include RA 10524')
  assert.ok(corpus.some((document) => document.statute === 'RA 10754'), 'Corpus should include RA 10754')
  assert.ok(corpus.some((document) => document.statute === 'PD 1096'), 'Corpus should include PD 1096')
  assert.ok(corpus.some((document) => document.statute === 'RA 4566'), 'Corpus should include RA 4566')
  assert.ok(corpus.some((document) => document.statute === 'RA 9266'), 'Corpus should include RA 9266')
  assert.ok(corpus.some((document) => document.statute === 'RA 544'), 'Corpus should include RA 544')
  assert.ok(corpus.some((document) => document.statute === 'RA 7920'), 'Corpus should include RA 7920')
  assert.ok(corpus.some((document) => document.statute === 'RA 8495'), 'Corpus should include RA 8495')
  assert.ok(corpus.some((document) => document.statute === 'RA 1378'), 'Corpus should include RA 1378')
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
  assert.ok(corpus.some((document) => document.statute === 'RA 7653'), 'Corpus should include RA 7653')
  assert.ok(corpus.some((document) => document.statute === 'RA 11211'), 'Corpus should include RA 11211')
  assert.ok(corpus.some((document) => document.statute === 'RA 8791'), 'Corpus should include RA 8791')
  assert.ok(corpus.some((document) => document.statute === 'RA 9474'), 'Corpus should include RA 9474')
  assert.ok(corpus.some((document) => document.statute === 'RA 8556'), 'Corpus should include RA 8556')
  assert.ok(corpus.some((document) => document.statute === 'RA 10607'), 'Corpus should include RA 10607')
  assert.ok(corpus.some((document) => document.statute === 'RA 9829'), 'Corpus should include RA 9829')
  assert.ok(corpus.some((document) => document.statute === 'RA 10846'), 'Corpus should include RA 10846')
  assert.ok(corpus.some((document) => document.statute === 'RA 7581'), 'Corpus should include RA 7581')
  assert.ok(corpus.some((document) => document.statute === 'RA 9178'), 'Corpus should include RA 9178')
  assert.ok(corpus.some((document) => document.statute === 'RA 9501'), 'Corpus should include RA 9501')
  assert.ok(corpus.some((document) => document.statute === 'RA 9513'), 'Corpus should include RA 9513')
  assert.ok(corpus.some((document) => document.statute === 'RA 9729'), 'Corpus should include RA 9729')
  assert.ok(corpus.some((document) => document.statute === 'RA 8550'), 'Corpus should include RA 8550')
  assert.ok(corpus.some((document) => document.statute === 'RA 7942'), 'Corpus should include RA 7942')
  assert.ok(corpus.some((document) => document.statute === 'RA 9593'), 'Corpus should include RA 9593')
  assert.ok(corpus.some((document) => document.statute === 'RA 9295'), 'Corpus should include RA 9295')
  assert.ok(corpus.some((document) => document.statute === 'RA 10635'), 'Corpus should include RA 10635')
  assert.ok(corpus.some((document) => document.statute === 'RA 9993'), 'Corpus should include RA 9993')
  assert.ok(corpus.some((document) => document.statute === 'RA 12021'), 'Corpus should include RA 12021')
  assert.ok(corpus.some((document) => document.statute === 'RA 9497'), 'Corpus should include RA 9497')
  assert.ok(corpus.some((document) => document.statute === 'PD 857'), 'Corpus should include PD 857')
  assert.ok(corpus.some((document) => document.statute === 'RA 9155'), 'Corpus should include RA 9155')
  assert.ok(corpus.some((document) => document.statute === 'RA 10157'), 'Corpus should include RA 10157')
  assert.ok(corpus.some((document) => document.statute === 'RA 12199'), 'Corpus should include RA 12199')
  assert.ok(corpus.some((document) => document.statute === 'RA 10533'), 'Corpus should include RA 10533')
  assert.ok(corpus.some((document) => document.statute === 'RA 10650'), 'Corpus should include RA 10650')
  assert.ok(corpus.some((document) => document.statute === 'RA 10931'), 'Corpus should include RA 10931')
  assert.ok(corpus.some((document) => document.statute === 'RA 11650'), 'Corpus should include RA 11650')
  assert.ok(corpus.some((document) => document.statute === 'RA 7279'), 'Corpus should include RA 7279')
  assert.ok(corpus.some((document) => document.statute === 'RA 11201'), 'Corpus should include RA 11201')
  assert.ok(corpus.some((document) => document.statute === 'PD 957'), 'Corpus should include PD 957')
  assert.ok(corpus.some((document) => document.statute === 'RA 9904'), 'Corpus should include RA 9904')
  assert.ok(corpus.some((document) => document.statute === 'RA 9653'), 'Corpus should include RA 9653')
  assert.ok(corpus.some((document) => document.statute === 'RA 6552'), 'Corpus should include RA 6552')
  assert.ok(corpus.some((document) => document.statute === 'RA 9646'), 'Corpus should include RA 9646')
  assert.ok(corpus.some((document) => document.statute === 'RA 9470'), 'Corpus should include RA 9470')
  assert.ok(corpus.some((document) => document.statute === 'EO 2, s. 2016'), 'Corpus should include EO 2, s. 2016')
  assert.ok(corpus.some((document) => document.statute === 'RA 11310'), 'Corpus should include RA 11310')
  assert.ok(corpus.some((document) => document.statute === 'RA 11861'), 'Corpus should include RA 11861')
  assert.ok(corpus.some((document) => document.statute === 'RA 11596'), 'Corpus should include RA 11596')
  assert.ok(corpus.some((document) => document.statute === 'RA 11642'), 'Corpus should include RA 11642')
  assert.ok(corpus.some((document) => document.statute === 'RA 11222'), 'Corpus should include RA 11222')
  assert.ok(corpus.some((document) => document.statute === 'RA 11767'), 'Corpus should include RA 11767')
  assert.ok(corpus.some((document) => document.statute === 'RA 11510'), 'Corpus should include RA 11510')
  assert.ok(corpus.some((document) => document.statute === 'RA 9710'), 'Corpus should include RA 9710')
  assert.ok(corpus.some((document) => document.statute === 'RA 11930'), 'Corpus should include RA 11930')
  assert.ok(corpus.some((document) => document.statute === 'RA 11967'), 'Corpus should include RA 11967')
  assert.ok(corpus.some((document) => document.statute === 'RA 10844'), 'Corpus should include RA 10844')
  assert.ok(corpus.some((document) => document.statute === 'RA 12254'), 'Corpus should include RA 12254')
  assert.ok(corpus.some((document) => document.statute === 'RA 11966'), 'Corpus should include RA 11966')
  assert.ok(corpus.some((document) => document.statute === 'RA 12010'), 'Corpus should include RA 12010')
  assert.ok(corpus.some((document) => document.statute === 'RA 4136'), 'Corpus should include RA 4136')
  assert.ok(corpus.some((document) => document.statute === 'RA 10930'), 'Corpus should include RA 10930')
  assert.ok(corpus.some((document) => document.statute === 'RA 8750'), 'Corpus should include RA 8750')
  assert.ok(corpus.some((document) => document.statute === 'RA 10054'), 'Corpus should include RA 10054')
  assert.ok(corpus.some((document) => document.statute === 'RA 10586'), 'Corpus should include RA 10586')
  assert.ok(corpus.some((document) => document.statute === 'RA 10913'), 'Corpus should include RA 10913')
  assert.ok(corpus.some((document) => document.statute === 'RA 11229'), 'Corpus should include RA 11229')
  assert.ok(corpus.some((document) => document.statute === 'RA 11659'), 'Corpus should include RA 11659')
  assert.ok(corpus.some((document) => document.statute === 'RA 9136'), 'Corpus should include RA 9136')
  assert.ok(corpus.some((document) => document.statute === 'RA 7925'), 'Corpus should include RA 7925')
  assert.ok(corpus.some((document) => document.statute === 'PD 198'), 'Corpus should include PD 198')
  assert.ok(corpus.some((document) => document.statute === 'RA 8479'), 'Corpus should include RA 8479')
  assert.ok(corpus.some((document) => document.statute === 'RA 11592'), 'Corpus should include RA 11592')
  assert.ok(corpus.some((document) => document.statute === 'RA 9367'), 'Corpus should include RA 9367')
  assert.ok(corpus.some((document) => document.statute === 'RA 7638'), 'Corpus should include RA 7638')
  assert.ok(corpus.some((document) => document.statute === 'RA 8371'), 'Corpus should include RA 8371')
  assert.ok(corpus.some((document) => document.statute === 'PD 1529'), 'Corpus should include PD 1529')
  assert.ok(corpus.some((document) => document.statute === 'RA 11573'), 'Corpus should include RA 11573')
  assert.ok(corpus.some((document) => document.statute === 'RA 10023'), 'Corpus should include RA 10023')
  assert.ok(corpus.some((document) => document.statute === 'RA 11231'), 'Corpus should include RA 11231')
  assert.ok(corpus.some((document) => document.statute === 'RA 6657'), 'Corpus should include RA 6657')
  assert.ok(corpus.some((document) => document.statute === 'RA 9700'), 'Corpus should include RA 9700')
  assert.ok(corpus.some((document) => document.statute === 'RA 11953'), 'Corpus should include RA 11953')
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
  assert.ok(corpus.some((document) => document.statute === 'RA 11127'), 'Corpus should include RA 11127')
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

  const eprCitationResponse = runLocalResearch(
    {
      query: 'What does RA 11898 require for plastic packaging and EPR reporting?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(eprCitationResponse, 'RA 11898', 'EPR exact citation query')
  assert.deepEqual(eprCitationResponse.retrieval_metadata?.citation_numbers, ['11898'], 'EPR exact citation metadata')
  assertMatchedTerm(
    eprCitationResponse,
    'RA 11898',
    'explicit citation: RA 11898',
    'EPR exact citation query'
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
      { query: 'What barangay justice controls apply to lupon conciliation, pangkat settlement, certificate to file action, and neighborhood dispute records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7160',
    'barangay justice query'
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
      { query: 'What Administrative Code controls apply to agency authority, delegated office action, administrative orders, records, and appeal routes?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'EO 292, s. 1987',
    'administrative code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What civil service controls apply to government appointments, promotions, service records, preventive suspension, administrative cases, and CSC appeals?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'PD 807',
    'civil service personnel query'
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
      { query: 'What telecommuting, work from home, remote work, equipment, data security, monitoring privacy, and equal treatment controls apply to hybrid employees?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11165',
    'telecommuting query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What service charge distribution, covered employee, hotel restaurant payroll, tips, gratuity, and payout records controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11360',
    'service charge query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What minimum wage, regional wage order, RTWPB, wage board, wage distortion, payroll computation, and DOLE records controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 6727',
    'wage rationalization query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What breastfeeding, lactation station, nursing mother, lactation period, hygiene, privacy, and workplace accommodation controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10028',
    'breastfeeding lactation query'
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

  const workplacePayFlexFrameworkResponse = runLocalResearch(
    {
      query: 'What workplace controls apply to telecommuting, work from home, service charge distribution, minimum wage orders, lactation stations, employee privacy, payroll, and safety?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(workplacePayFlexFrameworkResponse, 'RA 11165', 'workplace flexible work framework query')
  assertResearchMatch(workplacePayFlexFrameworkResponse, 'RA 11360', 'workplace service charge framework query')
  assertResearchMatch(workplacePayFlexFrameworkResponse, 'RA 6727', 'workplace wage framework query')
  assertResearchMatch(workplacePayFlexFrameworkResponse, 'RA 10028', 'workplace lactation framework query')
  assertIncludes(
    workplacePayFlexFrameworkResponse.summary,
    'Workplace Pay, Flexible Work, and Family Support Stack',
    'Workplace pay flexible work framework title'
  )

  const laborImplementationFallbackResponse = runLocalResearch(
    {
      query:
        'What workplace controls apply to termination twin notice, notice to explain, outsourcing labor-only contracting, contractor registration, OSH program, safety officer, telecommuting, service charge distribution, wage orders, and payroll privacy?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(laborImplementationFallbackResponse, 'DOLE Department Order No. 147-15', 'labor termination guidance fallback query')
  assertResearchMatch(laborImplementationFallbackResponse, 'DOLE Department Order No. 174-17', 'labor contracting guidance fallback query')
  assertResearchMatch(laborImplementationFallbackResponse, 'DOLE Department Order No. 198-18', 'labor OSH guidance fallback query')
  assertIncludes(
    laborImplementationFallbackResponse.summary,
    'Workplace Pay, Flexible Work, and Family Support Stack',
    'Labor implementation fallback framework title'
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
      { query: 'What does NPC Circular 16-03 require for personal data breach notification, breach reports, and incident records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'NPC Circular No. 16-03',
    'NPC breach management query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does NPC Advisory 2026-02 require for DBNMS breach notification submissions and supporting evidence?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'NPC Advisory No. 2026-02',
    'NPC DBNMS advisory query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does NPC Circular 2023-06 require for security of personal data, access controls, logs, and backups?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'NPC Circular No. 2023-06',
    'NPC personal data security query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What do the NPC consent guidelines require for consent withdrawal, privacy notices, and specific processing purposes?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'NPC Circular No. 2023-04',
    'NPC consent guidelines query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does NPC Circular 2022-04 require for DPO designation, DPS registration, automated decision-making, profiling, and the NPC seal?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'NPC Circular No. 2022-04',
    'NPC DPS registration query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does NPC Circular 2020-03 require for data sharing agreements, recipients, safeguards, retention, and breach responsibilities?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'NPC Circular No. 2020-03',
    'NPC data sharing agreement query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does NPC Advisory 2025-02 require for privacy engineering, privacy by design, system lifecycle, testing, deployment, and decommissioning?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'NPC Advisory No. 2025-02',
    'NPC privacy engineering query'
  )

  const privacyOperationsFrameworkResponse = runLocalResearch(
    {
      query: 'What RA 10173, DPO, PIC, PIP, DPS registration, consent, data sharing agreement, DBNMS breach notification, personal data security, privacy engineering, AI personal data, automated decision-making, profiling, and data-subject rights controls should a privacy office check?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(privacyOperationsFrameworkResponse, 'RA 10173', 'privacy operations framework Data Privacy Act query')
  assertResearchMatch(privacyOperationsFrameworkResponse, 'NPC Circular No. 16-03', 'privacy operations framework breach query')
  assertResearchMatch(privacyOperationsFrameworkResponse, 'NPC Advisory No. 2026-02', 'privacy operations framework DBNMS query')
  assertResearchMatch(privacyOperationsFrameworkResponse, 'NPC Circular No. 2023-06', 'privacy operations framework security query')
  assertResearchMatch(privacyOperationsFrameworkResponse, 'NPC Circular No. 2023-04', 'privacy operations framework consent query')
  assertResearchMatch(privacyOperationsFrameworkResponse, 'NPC Circular No. 2022-04', 'privacy operations framework registration query')
  assertResearchMatch(privacyOperationsFrameworkResponse, 'NPC Circular No. 2020-03', 'privacy operations framework data sharing query')
  assertResearchMatch(privacyOperationsFrameworkResponse, 'NPC Advisory No. 2025-02', 'privacy operations framework privacy engineering query')
  assertIncludes(
    privacyOperationsFrameworkResponse.summary,
    'Privacy Operations and NPC Compliance Stack',
    'Privacy operations framework title'
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
      { query: 'What BSP supervision and Monetary Board controls apply under the New Central Bank Act?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7653',
    'BSP supervision query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 11211 Bangko Sentral amendments apply to financial stability, payment systems, and regulatory examination?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11211',
    'BSP amendments query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What General Banking Law controls apply to bank loans, bank directors, related interests, and depositor records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8791',
    'general banking query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What lending company controls apply to loan apps, microloans, borrower disclosures, loan collection, and borrower data?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9474',
    'lending company query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What financing company controls apply to lease financing, factoring, receivables financing, installment financing, and collateral records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8556',
    'financing company query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What insurance controls apply to policyholders, premiums, insurance claims, agents, brokers, underwriting, and complaint records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10607',
    'insurance code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What pre-need plan controls apply to planholders, education plans, memorial plans, pension plans, trust funds, cancellation, and claims?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9829',
    'pre-need code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What PDIC deposit insurance controls apply to insured deposits, closed banks, receivership, liquidation, depositor proof, and payout claims?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10846',
    'PDIC deposit insurance query'
  )

  const financialInstitutionsFrameworkResponse = runLocalResearch(
    {
      query: 'What controls apply to BSP supervision, bank loans, lending companies, financing companies, insurance claims, pre-need plans, PDIC deposit insurance, AML, bank secrecy, credit reports, and borrower privacy?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(financialInstitutionsFrameworkResponse, 'RA 7653', 'financial institutions framework BSP query')
  assertResearchMatch(financialInstitutionsFrameworkResponse, 'RA 8791', 'financial institutions framework banking query')
  assertResearchMatch(financialInstitutionsFrameworkResponse, 'RA 9474', 'financial institutions framework lending query')
  assertResearchMatch(financialInstitutionsFrameworkResponse, 'RA 10607', 'financial institutions framework insurance query')
  assertResearchMatch(financialInstitutionsFrameworkResponse, 'RA 10846', 'financial institutions framework PDIC query')
  assertIncludes(
    financialInstitutionsFrameworkResponse.summary,
    'Banking, Lending, Insurance, and Financial Institutions Stack',
    'Financial institutions framework title'
  )

  const paymentCftCitationResponse = runLocalResearch(
    {
      query: 'What controls apply under RA 11127, RA 10168, and RA 11479 for payment-system CFT sanctions screening?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(paymentCftCitationResponse, 'RA 11127', 'payment systems exact citation query')
  assertResearchMatch(paymentCftCitationResponse, 'RA 10168', 'CFT exact citation query')
  assertResearchMatch(paymentCftCitationResponse, 'RA 11479', 'anti-terrorism exact citation query')
  assertMatchedTerm(
    paymentCftCitationResponse,
    'RA 11127',
    'explicit citation: RA 11127',
    'payment systems exact citation query'
  )
  assertMatchedTerm(
    paymentCftCitationResponse,
    'RA 10168',
    'explicit citation: RA 10168',
    'CFT exact citation query'
  )
  assertMatchedTerm(
    paymentCftCitationResponse,
    'RA 11479',
    'explicit citation: RA 11479',
    'anti-terrorism exact citation query'
  )

  const paymentSystemsTopicResponse = runLocalResearch(
    {
      query: 'What payment system operator controls apply to QR payment settlement and remittance rails?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(paymentSystemsTopicResponse, 'RA 11127', 'payment systems topic query')
  assertIncludes(
    paymentSystemsTopicResponse.summary,
    'Payment Systems, CFT, and Sanctions Controls Stack',
    'Payment systems topic framework title'
  )

  const bspFinancialConsumerRegulationsResponse = runLocalResearch(
    {
      query:
        'What does BSP Circular 1160 require for financial consumer protection regulations, market conduct, transparent pricing, complaint handling, fraud response, and consumer data protection?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(bspFinancialConsumerRegulationsResponse, 'BSP Circular No. 1160, s. 2022', 'BSP Circular 1160 financial consumer query')
  assertResearchMatch(bspFinancialConsumerRegulationsResponse, 'RA 11765', 'BSP Circular 1160 RA 11765 relationship query')

  const bspConsumerAssistanceResponse = runLocalResearch(
    {
      query:
        'What does BSP Circular 1169 require for consumer assistance mechanism, complaint intake, acknowledgment, resolution timeline, escalation, root cause analysis, and remediation?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(bspConsumerAssistanceResponse, 'BSP Circular No. 1169, s. 2023', 'BSP Circular 1169 consumer assistance query')
  assertResearchMatch(bspConsumerAssistanceResponse, 'BSP Circular No. 1160, s. 2022', 'BSP Circular 1169 financial consumer relationship query')

  const bspFraudManagementResponse = runLocalResearch(
    {
      query:
        'What does BSP Circular 1140 require for a robust fraud management system, fraud monitoring, transaction monitoring, customer authentication, account takeover, incident response, and fraud reporting?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(bspFraudManagementResponse, 'BSP Circular No. 1140, s. 2022', 'BSP Circular 1140 fraud management query')
  assertResearchMatch(bspFraudManagementResponse, 'RA 12010', 'BSP Circular 1140 fraud law relationship query')

  const bspVaspGuidelinesResponse = runLocalResearch(
    {
      query:
        'What does BSP Circular 1108 require for virtual asset service providers, VASP registration, crypto exchange custody, wallet-address records, customer due diligence, transaction monitoring, cybersecurity, and consumer disclosure?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(bspVaspGuidelinesResponse, 'BSP Circular No. 1108, s. 2021', 'BSP Circular 1108 VASP query')
  assertResearchMatch(bspVaspGuidelinesResponse, 'RA 11127', 'BSP Circular 1108 payment-system relationship query')
  assertResearchMatch(bspVaspGuidelinesResponse, 'RA 9160', 'BSP Circular 1108 AML relationship query')

  const sanctionsTopicResponse = runLocalResearch(
    {
      query: 'What sanctions screening and asset-freeze controls apply to a donation transfer flagged for terrorism financing?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(sanctionsTopicResponse, 'RA 10168', 'CFT sanctions topic query')
  assertResearchMatch(sanctionsTopicResponse, 'RA 11479', 'anti-terrorism sanctions topic query')

  const paymentSystemsCftWorkflowResponse = runLocalResearch(
    {
      query: 'What controls apply to operator of payment system registration, wallet settlement, payment switch reconciliation, AML suspicious transactions, CFT sanctions screening, asset freeze, Anti-Terrorism Council referrals, fraud evidence, cybercrime escalation, customer privacy, and consumer remediation?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(paymentSystemsCftWorkflowResponse, 'RA 11127', 'payment systems CFT workflow payment-system query')
  assertResearchMatch(paymentSystemsCftWorkflowResponse, 'RA 9160', 'payment systems CFT workflow AML query')
  assertResearchMatch(paymentSystemsCftWorkflowResponse, 'RA 10168', 'payment systems CFT workflow CFT query')
  assertResearchMatch(paymentSystemsCftWorkflowResponse, 'RA 11479', 'payment systems CFT workflow anti-terrorism query')
  assertResearchMatch(paymentSystemsCftWorkflowResponse, 'RA 12010', 'payment systems CFT workflow scam query')
  assertResearchMatch(paymentSystemsCftWorkflowResponse, 'RA 11765', 'payment systems CFT workflow financial consumer query')
  assertResearchMatch(paymentSystemsCftWorkflowResponse, 'RA 8484', 'payment systems CFT workflow access device query')
  assertIncludes(
    paymentSystemsCftWorkflowResponse.summary,
    'Payment Systems, CFT, and Sanctions Controls Stack',
    'Payment systems CFT workflow framework title'
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

  const secContactFallbackResponse = runLocalResearch(
    {
      query:
        'What SEC MC 28 official email address, official cellphone number, authorized representative, MC28 portal, corporate contact, notice, reportorial records, and Revised Corporation Code context should a corporation maintain?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(secContactFallbackResponse, 'SEC Memorandum Circular No. 28, s. 2020', 'SEC MC28 fallback query')
  assertResearchMatch(secContactFallbackResponse, 'RA 11232', 'SEC MC28 corporation code fallback query')
  assertIncludes(
    secContactFallbackResponse.summary,
    'Business Market Entry, Ownership, Cooperative, and Secured Finance Stack',
    'SEC MC28 fallback framework title'
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

  const eprTopicResponse = runLocalResearch(
    {
      query: 'What EPR controls apply to plastic packaging footprint, producer responsibility organization, recovery targets, third party audit, and DENR reporting?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(eprTopicResponse, 'RA 11898', 'EPR plastic packaging topic query')
  assertResearchMatch(eprTopicResponse, 'RA 9003', 'EPR solid waste topic query')

  const eprPlasticPackagingWorkflowResponse = runLocalResearch(
    {
      query: 'What EPR controls apply to a retailer with plastic packaging footprint, producer responsibility organization, recovery targets, recycling partners, third party audit, DENR reporting, and consumer takeback claims?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(eprPlasticPackagingWorkflowResponse, 'RA 11898', 'EPR plastic packaging workflow query')
  assertResearchMatch(eprPlasticPackagingWorkflowResponse, 'RA 9003', 'EPR solid waste workflow query')
  assertIncludes(
    eprPlasticPackagingWorkflowResponse.summary,
    'Environmental Operations and Facility Controls Stack',
    'EPR plastic packaging workflow framework title'
  )

  const environmentalImpactWildlifeForestryResponse = runLocalResearch(
    {
      query: 'What ECC, EIS, environmental impact assessment, wildlife permit, threatened species habitat, tree cutting, timber transport, forest land, watershed, mitigation, consultation, monitoring, and LGU coordination controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(environmentalImpactWildlifeForestryResponse, 'PD 1586', 'environmental impact assessment query')
  assertResearchMatch(environmentalImpactWildlifeForestryResponse, 'RA 9147', 'wildlife resources query')
  assertResearchMatch(environmentalImpactWildlifeForestryResponse, 'PD 705', 'forestry controls query')
  assertIncludes(
    environmentalImpactWildlifeForestryResponse.summary,
    'Environmental Impact, Wildlife, and Forestry Controls Stack',
    'Environmental impact wildlife forestry framework title'
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
      { query: 'What GAD, women desk, gender equality, livelihood, health service, complaint, and confidentiality controls should an LGU women protection program include?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9710',
    'Magna Carta of Women query'
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
      { query: 'What OSAEC and CSAEM reporting, takedown, victim confidentiality, and evidence preservation controls should an online platform use?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11930',
    'OSAEC and CSAEM query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What seller verification, consumer redress, takedown, and transaction record controls apply to an online marketplace under the Internet Transactions Act?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11967',
    'internet transactions query'
  )

  const financialAccountScamFrameworkResponse = runLocalResearch(
    { query: 'What money mule, phishing, account takeover, transaction hold, evidence preservation, and law-enforcement escalation controls apply to financial account scams?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(
    financialAccountScamFrameworkResponse,
    'RA 12010',
    'financial account scamming query'
  )
  assertIncludes(
    financialAccountScamFrameworkResponse.summary,
    'Financial Account Scam, Mule Account, and Wallet Fraud Stack',
    'Financial account scam framework title'
  )

  const digitalGovernmentFrameworkResponse = runLocalResearch(
    {
      query: 'What e-governance, government portal, online public service, interoperability, data exchange, accessibility, cybersecurity, and DICT controls apply to digital permit systems?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(digitalGovernmentFrameworkResponse, 'RA 12254', 'digital government e-governance query')
  assertResearchMatch(digitalGovernmentFrameworkResponse, 'RA 10844', 'digital government DICT query')
  assertResearchMatch(digitalGovernmentFrameworkResponse, 'RA 10173', 'digital government privacy query')
  assertIncludes(
    digitalGovernmentFrameworkResponse.summary,
    'Digital Government, E-Governance, and Public ICT Stack',
    'Digital government framework title'
  )

  const pppFrameworkResponse = runLocalResearch(
    {
      query: 'What PPP concession, unsolicited proposal, infrastructure project, value-for-money, risk allocation, procurement, contract management, and public accountability controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(pppFrameworkResponse, 'RA 11966', 'PPP framework query')
  assertResearchMatch(pppFrameworkResponse, 'RA 12009', 'PPP procurement query')
  assertIncludes(
    pppFrameworkResponse.summary,
    'Public Accountability, Ethics, Audit, and Government Funds Stack',
    'PPP public accountability framework title'
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

  const educationGovernanceFrameworkResponse = runLocalResearch(
    {
      query: 'What DepEd basic education governance, school division, school head, kindergarten, ECCD, open distance learning, and inclusive education safeguards for learners with disabilities should a school program check?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(educationGovernanceFrameworkResponse, 'RA 9155', 'education governance framework DepEd query')
  assertResearchMatch(educationGovernanceFrameworkResponse, 'RA 10157', 'education governance framework kindergarten query')
  assertResearchMatch(educationGovernanceFrameworkResponse, 'RA 12199', 'education governance framework ECCD query')
  assertResearchMatch(educationGovernanceFrameworkResponse, 'RA 10650', 'education governance framework open distance learning query')
  assertResearchMatch(educationGovernanceFrameworkResponse, 'RA 11650', 'education governance framework inclusive education query')
  assertIncludesAny(
    educationGovernanceFrameworkResponse.summary,
    [
      'Education Governance and Inclusive Learning Stack',
      'Education, Housing, Records, and Social Benefits Stack',
    ],
    'Education governance framework title'
  )

  const childAdoptionFoundlingFrameworkResponse = runLocalResearch(
    {
      query: 'What adoption, administrative adoption, alternative child care, NACC, simulated birth rectification, foundling recognition, birth certificate, civil registry, child identity, social welfare, and confidentiality controls should a child services desk check?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(childAdoptionFoundlingFrameworkResponse, 'RA 11642', 'child adoption framework administrative adoption query')
  assertResearchMatch(childAdoptionFoundlingFrameworkResponse, 'RA 11222', 'child adoption framework simulated birth query')
  assertResearchMatch(childAdoptionFoundlingFrameworkResponse, 'RA 11767', 'child adoption framework foundling query')
  assertResearchMatch(childAdoptionFoundlingFrameworkResponse, 'RA 10173', 'child adoption framework privacy query')
  assertIncludes(
    childAdoptionFoundlingFrameworkResponse.summary,
    'Child Adoption, Foundling, and Civil Status Stack',
    'Child adoption foundling framework title'
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

  const realEstateHousingResponse = runLocalResearch(
    { query: 'What subdivision condominium buyer, license to sell, contract to sell, homeowners association HOA dues, rent control, Maceda installment buyer, and real estate broker controls apply?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(realEstateHousingResponse, 'PD 957', 'real estate housing PD 957 query')
  assertResearchMatch(realEstateHousingResponse, 'RA 9904', 'real estate housing HOA query')
  assertResearchMatch(realEstateHousingResponse, 'RA 9653', 'real estate housing rent control query')
  assertResearchMatch(realEstateHousingResponse, 'RA 6552', 'real estate housing Maceda query')
  assertResearchMatch(realEstateHousingResponse, 'RA 9646', 'real estate housing broker query')
  assertIncludes(
    realEstateHousingResponse.summary,
    'Real Estate, Housing Buyer, HOA, and Tenant Protection Stack',
    'Real estate housing framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What license to sell, approved plan, facilities, title, refund, and buyer remedies apply to a condominium or subdivision developer?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'PD 957',
    'subdivision condominium buyer query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What broker license, salesperson accreditation, appraisal, authority to sell, commission, and listing agreement checks apply to real estate services?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9646',
    'real estate service query'
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
      { query: 'What does RA 11642 require for domestic administrative adoption, NACC alternative child care, child placement, and post-adoption confidentiality?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11642',
    'administrative adoption query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 11222 require for simulated birth rectification, birth certificate correction, adoption-linked records, and confidentiality?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11222',
    'simulated birth rectification query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 11767 require for foundling recognition, birth registration, child identity, services, and confidentiality?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11767',
    'foundling recognition query'
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
      { query: 'What NIRC income tax, VAT, percentage tax, withholding, tax return, books of account, and BIR assessment controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8424',
    'national internal revenue code query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What TRAIN Law personal income tax, VAT threshold, excise tax, documentary stamp tax, estate tax, and donor tax checks apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10963',
    'TRAIN law query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What CREATE Act corporate income tax, registered business enterprise, investment promotion agency, PEZA, BOI, and tax incentive controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11534',
    'CREATE Act query'
  )

  const digitalServicesVatCitationResponse = runLocalResearch(
    {
      query: 'What does RA 12023 require for VAT on Digital Services, NRDSP BIR registration, invoicing, and remittance?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(digitalServicesVatCitationResponse, 'RA 12023', 'digital services VAT exact citation query')
  assert.deepEqual(
    digitalServicesVatCitationResponse.retrieval_metadata?.citation_numbers,
    ['12023'],
    'digital services VAT exact citation metadata'
  )
  assertMatchedTerm(
    digitalServicesVatCitationResponse,
    'RA 12023',
    'explicit citation: RA 12023',
    'digital services VAT exact citation query'
  )

  const businessTaxFrameworkResponse = runLocalResearch(
    { query: 'What BIR registration, invoices, receipts, withholding certificates, VAT, NRDSP digital services VAT remittance, corporate income tax, CREATE MORE incentives, and tax-return controls should a registered business enterprise keep?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(businessTaxFrameworkResponse, 'RA 12066', 'business tax framework CREATE MORE query')
  assertResearchMatch(businessTaxFrameworkResponse, 'RA 12023', 'business tax framework digital services VAT query')
  assertIncludes(
    businessTaxFrameworkResponse.summary,
    'RA 8424',
    'business tax framework NIRC query summary'
  )
  assertIncludes(
    businessTaxFrameworkResponse.summary,
    'RA 11976',
    'business tax framework EOPT query summary'
  )
  assertIncludes(
    businessTaxFrameworkResponse.summary,
    'Business Tax Registration, Invoicing, and Incentives Stack',
    'Business tax framework title'
  )

  const professionalLicensingFallbackResponse = runLocalResearch(
    {
      query: 'What PRC license renewal, CPD units, professional board, signed and sealed plans, pharmacist credential, and professional record controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(professionalLicensingFallbackResponse, 'RA 8981', 'professional licensing fallback PRC query')
  assertResearchMatch(professionalLicensingFallbackResponse, 'RA 10912', 'professional licensing fallback CPD query')
  assertResearchMatch(professionalLicensingFallbackResponse, 'RA 10918', 'professional licensing fallback pharmacy query')
  assertIncludes(
    professionalLicensingFallbackResponse.summary,
    'Professional Licensing, CPD, and Regulated Practice Stack',
    'Professional licensing fallback framework title'
  )

  const housingFallbackResponse = runLocalResearch(
    {
      query: 'What condominium master deed, unit title, common area, condominium corporation, BP 220 socialized housing standards, beneficiary validation, and DHSUD records apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(housingFallbackResponse, 'RA 4726', 'condominium fallback query')
  assertResearchMatch(housingFallbackResponse, 'BP 220', 'socialized housing fallback query')
  assertIncludes(
    housingFallbackResponse.summary,
    'Real Estate, Housing Buyer, HOA, and Tenant Protection Stack',
    'Housing fallback framework title'
  )

  const agriculturalSabotageFallbackResponse = runLocalResearch(
    {
      query: 'What RA 12022 agricultural smuggling, agricultural hoarding, customs documents for agricultural imports, food traceability, rice warehouse inventory, and rice price monitoring controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(agriculturalSabotageFallbackResponse, 'RA 12022', 'agricultural sabotage fallback query')
  assertResearchMatch(agriculturalSabotageFallbackResponse, 'RA 10863', 'agricultural sabotage customs fallback query')
  assertResearchMatch(agriculturalSabotageFallbackResponse, 'RA 10611', 'agricultural sabotage food traceability fallback query')
  assertIncludes(
    agriculturalSabotageFallbackResponse.summary,
    'Agricultural Economic Sabotage and Food Supply Chain Stack',
    'Agricultural sabotage fallback framework title'
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
      { query: 'What LTO driver license renewal and validity controls apply under RA 10930?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10930',
    'driver license validity query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What seat belt and front seat passenger road safety duties apply under RA 8750?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8750',
    'seat belt query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What motorcycle helmet, rider, back rider, and product standard controls apply under RA 10054?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10054',
    'motorcycle helmet query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What drunk driving, drugged driving, field sobriety, breath analyzer, and chemical test controls apply under RA 10586?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10586',
    'anti drunk and drugged driving query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What distracted driving, mobile phone, and electronic device controls apply under RA 10913?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10913',
    'anti distracted driving query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What child car seat and child restraint system duties apply under RA 11229?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11229',
    'child restraint query'
  )

  const roadSafetyFrameworkResponse = runLocalResearch(
    {
      query: 'What driver license, seat belt, motorcycle helmet, drunk driving, distracted driving, child restraint, traffic accident evidence, and vehicle record controls should a road safety program include?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(roadSafetyFrameworkResponse, 'RA 4136', 'road safety framework traffic code query')
  assertResearchMatch(roadSafetyFrameworkResponse, 'RA 8750', 'road safety framework seat belt query')
  assertResearchMatch(roadSafetyFrameworkResponse, 'RA 10054', 'road safety framework motorcycle helmet query')
  assertResearchMatch(roadSafetyFrameworkResponse, 'RA 10586', 'road safety framework anti drunk driving query')
  assertResearchMatch(roadSafetyFrameworkResponse, 'RA 10913', 'road safety framework anti distracted driving query')
  assertResearchMatch(roadSafetyFrameworkResponse, 'RA 11229', 'road safety framework child restraint query')
  assertIncludes(
    roadSafetyFrameworkResponse.summary,
    'Road Safety, Driver, and Vehicle Compliance Stack',
    'Road safety framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What public service franchise and public utility safeguards apply to a transport or telecom operator?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11659',
    'public service query'
  )

  const utilitiesFrameworkResponse = runLocalResearch(
    {
      query: 'What electric utility power interruption, telecom network outage, water district disconnection, rates, complaints, regulator reporting, and customer record controls apply to critical utility services?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(utilitiesFrameworkResponse, 'RA 11659', 'utilities public service query')
  assertResearchMatch(utilitiesFrameworkResponse, 'RA 9136', 'electric power utility query')
  assertResearchMatch(utilitiesFrameworkResponse, 'RA 7925', 'telecommunications utility query')
  assertResearchMatch(utilitiesFrameworkResponse, 'PD 198', 'water district utility query')
  assertIncludes(
    utilitiesFrameworkResponse.summary,
    'Critical Utilities, Energy, Telecom, and Water Services Stack',
    'Critical utilities framework title'
  )

  const downstreamOilCitationResponse = runLocalResearch(
    {
      query: 'What does RA 8479 require for downstream oil industry fuel retail pricing and petroleum product quality?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(downstreamOilCitationResponse, 'RA 8479', 'downstream oil exact citation query')
  assert.deepEqual(
    downstreamOilCitationResponse.retrieval_metadata?.citation_numbers,
    ['8479'],
    'downstream oil exact citation metadata'
  )
  assertMatchedTerm(
    downstreamOilCitationResponse,
    'RA 8479',
    'explicit citation: RA 8479',
    'downstream oil exact citation query'
  )

  const lpgCitationResponse = runLocalResearch(
    {
      query: 'What does RA 11592 require for LPG refilling plants, cylinders, dealers, and retail outlets?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(lpgCitationResponse, 'RA 11592', 'LPG exact citation query')
  assert.deepEqual(lpgCitationResponse.retrieval_metadata?.citation_numbers, ['11592'], 'LPG exact citation metadata')
  assertMatchedTerm(lpgCitationResponse, 'RA 11592', 'explicit citation: RA 11592', 'LPG exact citation query')

  const biofuelsCitationResponse = runLocalResearch(
    {
      query: 'What does RA 9367 require for biofuel blends, biodiesel, bioethanol, and fuel labeling compliance?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(biofuelsCitationResponse, 'RA 9367', 'biofuels exact citation query')
  assert.deepEqual(
    biofuelsCitationResponse.retrieval_metadata?.citation_numbers,
    ['9367'],
    'biofuels exact citation metadata'
  )
  assertMatchedTerm(
    biofuelsCitationResponse,
    'RA 9367',
    'explicit citation: RA 9367',
    'biofuels exact citation query'
  )

  const doeCitationResponse = runLocalResearch(
    {
      query: 'What does RA 7638 require for DOE energy planning, monitoring, and coordination?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(doeCitationResponse, 'RA 7638', 'DOE exact citation query')
  assert.deepEqual(doeCitationResponse.retrieval_metadata?.citation_numbers, ['7638'], 'DOE exact citation metadata')
  assertMatchedTerm(doeCitationResponse, 'RA 7638', 'explicit citation: RA 7638', 'DOE exact citation query')

  const fuelRetailTopicResponse = runLocalResearch(
    {
      query: 'What fuel retail, gasoline station, petroleum price display, oil product quality, and fair market competition controls apply to a local fuel station?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(fuelRetailTopicResponse, 'RA 8479', 'fuel retail petroleum pricing and quality query')

  const lpgTopicResponse = runLocalResearch(
    {
      query: 'What LPG refilling plant, cylinder safety, dealer, retail outlet, seal, weighing, and consumer complaint controls apply?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(lpgTopicResponse, 'RA 11592', 'LPG refilling cylinders and dealers query')

  const biofuelsTopicResponse = runLocalResearch(
    {
      query: 'What biofuel blend, biodiesel, bioethanol, fuel supplier, quality testing, and pump labeling controls apply?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(biofuelsTopicResponse, 'RA 9367', 'biofuel blends query')

  const doeEnergyCoordinationResponse = runLocalResearch(
    {
      query: 'What DOE energy monitoring, energy planning, supply coordination, petroleum data, and local energy office reporting controls apply?',
      user_id: 'self-test',
    },
    'simulated remote outage'
  )
  assertResearchMatch(doeEnergyCoordinationResponse, 'RA 7638', 'DOE energy monitoring and coordination query')

  const downstreamFuelsWorkflowResponse = runLocalResearch(
    {
      query: 'What controls apply to a city fuel and LPG inspection workflow covering gasoline station petroleum price display, fuel quality sampling, LPG refilling plants, cylinders, dealers, biofuel blend compliance, DOE energy monitoring, supply coordination, consumer complaints, and local regulator referrals?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(downstreamFuelsWorkflowResponse, 'RA 8479', 'downstream fuels workflow oil deregulation query')
  assertResearchMatch(downstreamFuelsWorkflowResponse, 'RA 11592', 'downstream fuels workflow LPG query')
  assertResearchMatch(downstreamFuelsWorkflowResponse, 'RA 9367', 'downstream fuels workflow biofuels query')
  assertResearchMatch(downstreamFuelsWorkflowResponse, 'RA 7638', 'downstream fuels workflow DOE query')
  assertIncludes(
    downstreamFuelsWorkflowResponse.summary,
    'Downstream Fuel, LPG, and Biofuel Controls Stack',
    'Downstream fuels framework title'
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
      { query: 'What does RA 11573 require for confirmation of imperfect land titles, free patents, alienable and disposable land, and DENR records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11573',
    'imperfect title confirmation query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 10023 require for residential free patent applications, occupation evidence, and land title registration?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10023',
    'residential free patent query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 11231 require for agricultural free patent transfer, mortgage, and title restriction review?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11231',
    'agricultural free patent query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 6657 require for CARP agrarian reform beneficiaries, CLOA, land acquisition, and landowner compensation?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 6657',
    'comprehensive agrarian reform query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'How does RA 9700 update CARPER agrarian reform coverage, support services, and beneficiary safeguards?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9700',
    'CARPER agrarian reform query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What does RA 11953 require for agrarian reform beneficiary debt condonation, amortization, DAR, and LandBank records?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11953',
    'agrarian emancipation query'
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

  const publicLandAgrarianFrameworkResponse = runLocalResearch(
    {
      query: 'What public land, imperfect title, residential free patent, agricultural free patent, land tenure, CARP, CARPER, CLOA, ARB, DAR clearance, and agrarian emancipation controls should a land services desk check?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(publicLandAgrarianFrameworkResponse, 'RA 11573', 'public land framework imperfect title query')
  assertResearchMatch(publicLandAgrarianFrameworkResponse, 'RA 10023', 'public land framework residential free patent query')
  assertResearchMatch(publicLandAgrarianFrameworkResponse, 'RA 11231', 'public land framework agricultural free patent query')
  assertResearchMatch(publicLandAgrarianFrameworkResponse, 'RA 6657', 'public land framework CARP query')
  assertResearchMatch(publicLandAgrarianFrameworkResponse, 'RA 9700', 'public land framework CARPER query')
  assertResearchMatch(publicLandAgrarianFrameworkResponse, 'RA 11953', 'public land framework agrarian emancipation query')
  assertIncludes(
    publicLandAgrarianFrameworkResponse.summary,
    'Public Land, Free Patent, and Agrarian Reform Stack',
    'Public land agrarian framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What approvals are needed for ecotourism inside a protected area buffer zone and PAMB jurisdiction?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11038',
    'protected areas query'
  )

  const tourismHospitalityFrameworkResponse = runLocalResearch(
    {
      query: 'What DOT accreditation, hotel resort guest registration, tour operator safety, sanitation, fire safety, accessibility, refund, complaint, booking record, and tourism enterprise controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(tourismHospitalityFrameworkResponse, 'RA 9593', 'tourism hospitality framework query')
  assertResearchMatch(tourismHospitalityFrameworkResponse, 'PD 856', 'tourism hospitality sanitation query')
  assertResearchMatch(tourismHospitalityFrameworkResponse, 'RA 9514', 'tourism hospitality fire safety query')
  assertIncludes(
    tourismHospitalityFrameworkResponse.summary,
    'Tourism, Hospitality, Events, and Travel Services Stack',
    'Tourism hospitality framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What domestic shipping operator, ferry route, vessel safety, passenger manifest, and MARINA controls apply under RA 9295?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9295',
    'domestic shipping query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What STCW certificate, seafarer training, MARINA assessment, and crew qualification controls apply under RA 10635?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10635',
    'seafarer STCW query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Coast Guard marine safety, search and rescue, oil spill, maritime security, and incident report controls apply under RA 9993?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9993',
    'coast guard maritime safety query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What shipboard employment, repatriation, welfare, grievance, and seafarer rights controls apply under RA 12021?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 12021',
    'seafarer welfare query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What CAAP air operator, aircraft, airport, flight safety, passenger handling, and aviation records controls apply under RA 9497?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9497',
    'civil aviation query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What port authority, terminal operations, berth, cargo handling, port fees, and PPA controls apply under PD 857?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'PD 857',
    'port authority query'
  )

  const maritimeAviationFrameworkResponse = runLocalResearch(
    {
      query: 'What domestic shipping, ferry route, port cargo handling, Coast Guard incident, seafarer STCW and welfare, airport, aircraft, air operator, flight safety, passenger record, cargo manifest, and privacy controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(maritimeAviationFrameworkResponse, 'RA 9295', 'maritime aviation framework shipping query')
  assertResearchMatch(maritimeAviationFrameworkResponse, 'RA 10635', 'maritime aviation framework STCW query')
  assertResearchMatch(maritimeAviationFrameworkResponse, 'RA 9993', 'maritime aviation framework Coast Guard query')
  assertResearchMatch(maritimeAviationFrameworkResponse, 'RA 12021', 'maritime aviation framework seafarer welfare query')
  assertResearchMatch(maritimeAviationFrameworkResponse, 'RA 9497', 'maritime aviation framework aviation query')
  assertResearchMatch(maritimeAviationFrameworkResponse, 'PD 857', 'maritime aviation framework port query')
  assertIncludes(
    maritimeAviationFrameworkResponse.summary,
    'Aviation, Maritime, Ports, and Seafarer Operations Stack',
    'Aviation maritime ports framework title'
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

  const medicineAccessFallbackResponse = runLocalResearch(
    {
      query: 'What cheaper medicines, generic substitution, drug price, quality affordable medicines, pharmacy retail, and patient complaint controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(medicineAccessFallbackResponse, 'RA 9502', 'medicine access fallback query')
  assertResearchMatch(medicineAccessFallbackResponse, 'RA 10918', 'medicine access pharmacy fallback query')
  assertIncludes(
    medicineAccessFallbackResponse.summary,
    'IP, Investment, Health Product, and Market Claims Stack',
    'Medicine access fallback framework title'
  )

  const graphicWarningFallbackResponse = runLocalResearch(
    {
      query: 'What graphic health warning, tobacco package, cigarette label, manufacturer, distributor, retailer, and consumer disclosure controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(graphicWarningFallbackResponse, 'RA 10643', 'graphic health warning fallback query')
  assertResearchMatch(graphicWarningFallbackResponse, 'RA 9211', 'graphic health warning tobacco fallback query')
  assertIncludes(
    graphicWarningFallbackResponse.summary,
    'IP, Investment, Health Product, and Market Claims Stack',
    'Graphic health warning fallback framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What Universal Health Care referral and primary care network controls apply to local health services?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 11223',
    'universal health care query'
  )

  const healthFacilityPatientRightsResponse = runLocalResearch(
    {
      query: 'What hospital no-deposit emergency care, refusal to treat, patient transfer, unpaid bill discharge, hospital detention, facility license, inspection, complaint, and patient record controls apply?',
      user_id: 'self-test',
      use_deep_search: true,
    },
    'simulated remote outage'
  )
  assertResearchMatch(healthFacilityPatientRightsResponse, 'RA 10932', 'anti hospital deposit query')
  assertResearchMatch(healthFacilityPatientRightsResponse, 'RA 8344', 'hospital refusal emergency care query')
  assertResearchMatch(healthFacilityPatientRightsResponse, 'RA 9439', 'hospital detention query')
  assertResearchMatch(healthFacilityPatientRightsResponse, 'RA 4226', 'hospital licensure query')
  assertIncludes(
    healthFacilityPatientRightsResponse.summary,
    'Health Facility, Emergency Care, and Patient Rights Stack',
    'Health facility patient rights framework title'
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

  assertResearchMatch(
    runLocalResearch(
      { query: 'What RA 10754 PWD discount and VAT exemption controls should a store or benefit desk follow?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10754',
    'PWD discount and VAT exemption query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What PDAO and PWD affairs office controls should an LGU disability benefit desk use?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10070',
    'PDAO local implementation query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What PWD employment, reserved positions, and reasonable accommodation controls apply under RA 10524?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 10524',
    'PWD employment query'
  )

  const builtEnvironmentFrameworkResponse = runLocalResearch(
    { query: 'What building permit, licensed contractor, architect, civil engineer, sanitary permit, accessibility, and occupancy controls should a public market renovation check?', user_id: 'self-test' },
    'simulated remote outage'
  )
  assertResearchMatch(builtEnvironmentFrameworkResponse, 'PD 1096', 'built environment building query')
  assertResearchMatch(builtEnvironmentFrameworkResponse, 'RA 4566', 'built environment contractor query')
  assertResearchMatch(builtEnvironmentFrameworkResponse, 'RA 9266', 'built environment architect query')
  assertResearchMatch(builtEnvironmentFrameworkResponse, 'RA 544', 'built environment civil engineer query')
  assertResearchMatch(builtEnvironmentFrameworkResponse, 'PD 856', 'built environment sanitation query')
  assertIncludes(
    builtEnvironmentFrameworkResponse.summary,
    'Built Environment, Sanitation, Accessibility, and Public Facilities Stack',
    'Built environment framework title'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What contractor license and PCAB qualification controls apply to a municipal fit-out contractor?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 4566',
    'contractor license query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What registered architect signed and sealed architectural plan controls apply to a building permit package?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 9266',
    'architecture act query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What civil engineer structural plans, estimates, and inspection controls apply to public works?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 544',
    'civil engineering query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What electrical engineer wiring, load, electrical plan, testing, and inspection controls apply to facility fit-out?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 7920',
    'electrical engineering query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What mechanical engineer HVAC, elevator, boiler, equipment inspection, and maintenance controls apply to a public building?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 8495',
    'mechanical engineering query'
  )

  assertResearchMatch(
    runLocalResearch(
      { query: 'What registered master plumber plumbing plan, water supply, drainage, septic, and sanitary plumbing controls apply?', user_id: 'self-test' },
      'simulated remote outage'
    ),
    'RA 1378',
    'plumbing law query'
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
  assertIncludes(noResultsResponse.summary, 'DOLE Department Order 147-15', 'No-results labor example')
  assertIncludes(noResultsResponse.summary, 'SEC MC 28 s. 2020', 'No-results SEC example')

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

  const thinPrivacyOperationsDraft = `# Privacy Operations Policy

## Purpose
This policy handles personal data, DPO inquiries, consent forms, data sharing, breach notification, automated profiling, and system privacy review.

## Legal Basis
Pursuant to RA 10173 and National Privacy Commission issuances.

## Scope
This applies to customer records, employee records, app logs, partner access, and automated scoring.

## Responsible Office
The privacy team shall process requests.

## Requirements
Teams shall submit forms and reports when needed.

## Monitoring
The privacy team shall prepare an annual report.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinPrivacyOperationsDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinPrivacyOperationsDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinPrivacyOperationsDraftResponse.status, 'success', 'Thin privacy operations draft check should succeed locally')
  assertFinding(thinPrivacyOperationsDraftResponse, 'amber', 'Privacy operations')

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

  const thinPppDraft = `# Municipal PPP Infrastructure Ordinance

## Purpose
This ordinance creates a public-private partnership and concession program for infrastructure projects.

## Legal Basis
Pursuant to RA 11966, RA 12009, and RA 7160.

## Scope
This applies to local PPP, joint venture, concession, and unsolicited proposal projects.

## Responsible Office
The infrastructure office shall implement this ordinance.

## Requirements
Private partners may submit project proposals for local facilities.

## Monitoring
The office shall submit annual project reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinPppDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinPppDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinPppDraftResponse.status, 'success', 'PPP draft check should succeed locally')
  assertFinding(thinPppDraftResponse, 'amber', 'PPP project controls')

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

  const thinBarangayJusticeDraft = `# Barangay Complaint Intake Policy

## Purpose
This policy handles barangay complaints, neighborhood disputes, barangay conciliation, lupon meetings, pangkat sessions, amicable settlement, barangay blotter entries, and certificate to file action requests.

## Legal Basis
Pursuant to RA 7160.

## Scope
This applies to local complaints filed at the barangay.

## Responsible Office
The barangay office shall implement this policy.

## Requirements
Residents shall file complaint forms and attend meetings when requested.

## Monitoring
The barangay office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinBarangayJusticeDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinBarangayJusticeDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinBarangayJusticeDraftResponse.status, 'success', 'Barangay justice draft check should succeed locally')
  assertFinding(thinBarangayJusticeDraftResponse, 'amber', 'Barangay complaint routing')

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

  const thinCivilServiceDraft = `# Civil Service Personnel Action Policy

## Purpose
This policy handles civil service appointments, promotions, reassignment, detail, preventive suspension, formal charge, administrative case processing, service records, and CSC appeals.

## Legal Basis
Pursuant to PD 807 and EO 292, s. 1987.

## Scope
This applies to public employees and personnel actions in the office.

## Responsible Office
The human resources office shall implement this policy.

## Requirements
The office shall process appointment papers and personnel actions.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinCivilServiceDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinCivilServiceDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinCivilServiceDraftResponse.status, 'success', 'Civil service draft check should succeed locally')
  assertFinding(thinCivilServiceDraftResponse, 'amber', 'Civil-service personnel controls')

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

  const thinBusinessTaxDraft = `# Small Business Tax and Incentives Policy

## Purpose
This policy handles BIR tax registration, NIRC income tax, VAT, percentage tax, withholding tax, invoices, receipts, tax returns, TRAIN excise tax, CREATE Act corporate income tax, CREATE MORE tax incentives, registered business enterprise status, and PEZA or BOI support.

## Legal Basis
Pursuant to RA 8424, RA 11976, RA 10963, RA 11534, and RA 12066.

## Scope
This applies to business taxpayers, platform sellers, registered business enterprises, and payment collectors.

## Responsible Office
The business support office shall implement this policy.

## Requirements
Businesses shall submit tax documents and payment records when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinBusinessTaxDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinBusinessTaxDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinBusinessTaxDraftResponse.status, 'success', 'Business tax draft check should succeed locally')
  assertFinding(thinBusinessTaxDraftResponse, 'amber', 'Business tax and invoicing')

  const thinDigitalServicesVatDraft = `# Digital Services VAT Controls Policy

## Purpose
This policy handles VAT on digital services, nonresident digital service providers, NRDSP marketplace collections, BIR registration, invoicing, and remittance.

## Legal Basis
Pursuant to RA 12023.

## Scope
This applies to digital service providers, online platforms, and payment collectors offering digital services to Philippine customers.

## Responsible Office
The tax compliance office shall implement this policy.

## Requirements
Providers and platforms shall submit digital service and payment documents when requested.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinDigitalServicesVatDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinDigitalServicesVatDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(
    thinDigitalServicesVatDraftResponse.status,
    'success',
    'Digital services VAT draft check should succeed locally'
  )
  assertFinding(
    thinDigitalServicesVatDraftResponse,
    'amber',
    'Digital services VAT controls are incomplete'
  )

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
This program covers traffic enforcement, driver license, license renewal, vehicle registration, seat belt, motorcycle helmet, drunk driving, drugged driving, distracted driving, child car seat, child restraint, public utility franchise coordination, land title verification, Torrens and register of deeds records, FPIC, ancestral domain, NCIP coordination, agriculture and fisheries support, organic labels, food safety traceability, and Sagip Saka direct purchase.

## Legal Basis
Pursuant to RA 4136, RA 10930, RA 8750, RA 10054, RA 10586, RA 10913, RA 11229, RA 11659, PD 1529, RA 8371, RA 8435, RA 10068, RA 10611, and RA 11321.

## Scope
This applies to local projects, drivers, riders, passengers, operators, children, farmers, fisherfolk, and affected communities.

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
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Transport and road-safety controls')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Utility and public-service controls')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Land-title verification')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'FPIC and indigenous-community')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Agriculture support')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Organic agriculture')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Food-safety')
  assertFinding(thinMobilityLandAgriDraftResponse, 'amber', 'Sagip Saka')

  const thinUtilityDraft = `# Critical Utility Customer Service Policy

## Purpose
This policy covers electric utility power interruption notices, telecom network outage reports, internet service provider complaints, water district water disconnection, water service rates, and critical infrastructure customer records.

## Legal Basis
Pursuant to RA 11659, RA 9136, RA 7925, and PD 198.

## Scope
This applies to customers, subscribers, service applicants, and utility operators.

## Responsible Office
The service office shall handle all utility matters.

## Requirements
Customers shall submit account details when requested.

## Monitoring
The service office shall prepare annual reports.

## Effectivity
This policy takes effect immediately.`

  const thinUtilityDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinUtilityDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinUtilityDraftResponse.status, 'success', 'Critical utility draft check should succeed locally')
  assertFinding(thinUtilityDraftResponse, 'amber', 'Utility and public-service controls')

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

  const thinWomenGenderDraft = `# Women Protection and GAD Services Ordinance

## Purpose
This ordinance creates a women desk, gender equality program, women livelihood support, and gender and development services.

## Legal Basis
Pursuant to RA 9710, RA 11313, and RA 9262.

## Scope
This applies to women beneficiaries and local public services.

## Responsible Office
The social welfare office shall implement this ordinance.

## Requirements
Women beneficiaries may request assistance and referral.

## Monitoring
The social welfare office shall submit annual reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinWomenGenderDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinWomenGenderDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinWomenGenderDraftResponse.status, 'success', 'Women and GAD draft check should succeed locally')
  assertFinding(thinWomenGenderDraftResponse, 'amber', 'Women and gender-equality controls')

  const thinChildSafetyDraft = `# Online Child Safety Reporting Ordinance

## Purpose
This ordinance addresses OSAEC, CSAEM, and online child safety incidents in internet cafes and local digital platforms.

## Legal Basis
Pursuant to RA 11930, RA 9775, and RA 10175.

## Scope
This applies to covered establishments and online reporting channels.

## Responsible Office
The information office shall implement this ordinance.

## Requirements
Covered establishments shall report OSAEC, CSAEM, and child online safety incidents.

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
This ordinance addresses OSAEC and online child safety incidents in internet cafes.

## Legal Basis
Pursuant to RA 11930, RA 9775, and RA 10175.

## Scope
This applies to covered establishments and online reporting channels.

## Responsible Office
The social welfare office shall implement this ordinance.

## Requirements
Covered establishments shall report OSAEC and child online safety incidents.

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

  const thinInternetTransactionsDraft = `# Online Marketplace Seller Policy

## Purpose
This policy creates an online marketplace for local merchants and social commerce sellers.

## Legal Basis
Pursuant to RA 11967, RA 7394, and RA 8792.

## Scope
This applies to digital platform seller onboarding and internet transaction listings.

## Responsible Office
The e-commerce desk shall implement this policy.

## Requirements
Online sellers shall publish product descriptions and prices.

## Monitoring
The e-commerce desk shall submit monthly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinInternetTransactionsDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinInternetTransactionsDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinInternetTransactionsDraftResponse.status, 'success', 'Internet transactions draft check should succeed locally')
  assertFinding(thinInternetTransactionsDraftResponse, 'amber', 'Internet-transaction controls')

  const thinDigitalGovernmentDraft = `# Digital Permit Portal Ordinance

## Purpose
This ordinance creates an e-governance portal and online government service for digital permit applications and government data exchange.

## Legal Basis
Pursuant to RA 12254, RA 10844, RA 10173, and RA 11032.

## Scope
This applies to online public services, permit filing, digital payments, and shared agency records.

## Responsible Office
The licensing office shall implement this ordinance.

## Requirements
Applicants shall use the government portal for submissions.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This ordinance takes effect 30 days after publication.`

  const thinDigitalGovernmentDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinDigitalGovernmentDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinDigitalGovernmentDraftResponse.status, 'success', 'Digital government draft check should succeed locally')
  assertFinding(thinDigitalGovernmentDraftResponse, 'amber', 'Digital government service controls')

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

  const thinFinancialAccountScamDraft = `# Financial Account Scam Response Policy

## Purpose
This policy handles money mule, mule account, phishing, social engineering, and account takeover reports.

## Legal Basis
Pursuant to RA 12010, RA 11765, RA 9160, and RA 10175.

## Scope
This applies to wallet accounts, payment accounts, and unauthorized transfer complaints.

## Responsible Office
The fraud desk shall implement this policy.

## Requirements
Customers shall report suspicious messages and scam proceeds.

## Monitoring
The fraud desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinFinancialAccountScamDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinFinancialAccountScamDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinFinancialAccountScamDraftResponse.status, 'success', 'Financial account scam draft check should succeed locally')
  assertFinding(thinFinancialAccountScamDraftResponse, 'amber', 'Financial-account scam')

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

  const thinEnvironmentalImpactWildlifeForestryDraft = `# Eco-Tourism Access and Clearing Policy

## Purpose
This policy covers ECC, EIS, environmental impact assessment, wildlife permit, threatened species habitat, tree cutting, timber transport, forest land, and watershed concerns.

## Legal Basis
Pursuant to PD 1586, RA 9147, PD 705, RA 11038, and RA 7160.

## Scope
This applies to tourism trails, visitor access, tree clearing, and support facilities.

## Responsible Office
The environment office shall implement this policy.

## Requirements
Operators shall submit project information before access is approved.

## Monitoring
The environment office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinEnvironmentalImpactWildlifeForestryDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinEnvironmentalImpactWildlifeForestryDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(
    thinEnvironmentalImpactWildlifeForestryDraftResponse.status,
    'success',
    'Environmental impact wildlife forestry draft check should succeed locally'
  )
  assertFinding(
    thinEnvironmentalImpactWildlifeForestryDraftResponse,
    'amber',
    'Environmental impact, wildlife, and forestry controls'
  )

  const thinTourismHospitalityDraft = `# Tourism Guest Access Policy

## Purpose
This policy covers tourism enterprises, hotels, resorts, tour operators, tour guides, tourist transport, and visitor safety.

## Legal Basis
Pursuant to RA 9593, RA 7160, RA 7394, PD 856, RA 9514, and RA 10173.

## Scope
This applies to tourism sites, accommodation establishments, event venues, and guided visitor services.

## Responsible Office
The tourism office shall implement this policy.

## Requirements
Operators shall submit a list of services before visitors are accepted.

## Monitoring
The tourism office shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinTourismHospitalityDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinTourismHospitalityDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinTourismHospitalityDraftResponse.status, 'success', 'Tourism hospitality draft check should succeed locally')
  assertFinding(thinTourismHospitalityDraftResponse, 'amber', 'Tourism and hospitality controls')

  const thinMaritimeAviationDraft = `# Port, Ferry, Seafarer, and Airport Service Policy

## Purpose
This policy covers domestic shipping, ferry routes, vessels, port terminals, cargo handling, Coast Guard incidents, seafarer STCW certificates, manning agency coordination, seafarer welfare, aircraft, airports, air operator support, flight operations, and passenger records.

## Legal Basis
Pursuant to RA 9295, RA 10635, RA 9993, RA 12021, RA 9497, PD 857, and RA 10173.

## Scope
This applies to passengers, cargo handlers, seafarers, port users, and air transport users.

## Responsible Office
The transport desk shall implement this policy.

## Requirements
Operators shall submit documents when requested.

## Monitoring
The transport desk shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinMaritimeAviationDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinMaritimeAviationDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinMaritimeAviationDraftResponse.status, 'success', 'Maritime aviation draft check should succeed locally')
  assertFinding(thinMaritimeAviationDraftResponse, 'amber', 'Aviation, maritime, port, or seafarer controls')

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

  const thinTelecommutingDraft = `# Hybrid Work Policy

## Purpose
This policy allows telecommuting, remote work, and work from home arrangements.

## Legal Basis
Pursuant to RA 11165, PD 442, and RA 10173.

## Scope
This applies to covered office employees.

## Responsible Office
The HR office shall implement this policy.

## Requirements
Employees may work remotely when approved by their supervisor.

## Monitoring
The HR office shall submit quarterly reports.

## Effectivity
This policy takes effect immediately.`

  const thinTelecommutingDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinTelecommutingDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinTelecommutingDraftResponse.status, 'success', 'Telecommuting draft check should succeed locally')
  assertFinding(thinTelecommutingDraftResponse, 'amber', 'Telecommuting controls')

  const thinServiceChargeDraft = `# Restaurant Service Charge Policy

## Purpose
This policy governs service charges, tips, and gratuity collected by the restaurant.

## Legal Basis
Pursuant to RA 11360 and PD 442.

## Scope
This applies to dining and event service transactions.

## Responsible Office
The payroll office shall implement this policy.

## Requirements
Service charges shall be collected from customers.

## Monitoring
The office shall submit monthly reports.

## Effectivity
This policy takes effect immediately.`

  const thinServiceChargeDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinServiceChargeDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinServiceChargeDraftResponse.status, 'success', 'Service charge draft check should succeed locally')
  assertFinding(thinServiceChargeDraftResponse, 'amber', 'Service-charge distribution')

  const thinWageDraft = `# Regional Wage Policy

## Purpose
This policy sets pay rates and minimum wage rules for employees.

## Legal Basis
Pursuant to RA 6727 and PD 442.

## Scope
This applies to workers in covered branches.

## Responsible Office
The payroll office shall implement this policy.

## Requirements
Employees shall be paid according to the approved salary table.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect immediately.`

  const thinWageDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinWageDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinWageDraftResponse.status, 'success', 'Wage draft check should succeed locally')
  assertFinding(thinWageDraftResponse, 'amber', 'Wage-order controls')

  const thinLactationDraft = `# Workplace Lactation Support Policy

## Purpose
This policy supports breastfeeding and lactation for nursing mothers.

## Legal Basis
Pursuant to RA 10028 and RA 11210.

## Scope
This applies to employees and guests who need lactation support.

## Responsible Office
The HR office shall implement this policy.

## Requirements
Nursing mothers may request support.

## Monitoring
The office shall submit annual reports.

## Effectivity
This policy takes effect immediately.`

  const thinLactationDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinLactationDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinLactationDraftResponse.status, 'success', 'Lactation draft check should succeed locally')
  assertFinding(thinLactationDraftResponse, 'amber', 'Breastfeeding and lactation controls')

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

  const thinHospitalPatientRightsDraft = `# Hospital Emergency and Discharge Policy

## Purpose
This policy covers hospital deposit requests, no deposit emergency care, refusal to treat, patient transfer, hospital detention, unpaid hospital bill handling, patient discharge, hospital license, health facility inspection, and clinic service records.

## Legal Basis
Pursuant to RA 10932, RA 8344, RA 9439, RA 4226, RA 11223, and RA 10173.

## Scope
This applies to emergency patients, admitted patients, billing staff, and hospital personnel.

## Responsible Office
The hospital desk shall implement this policy.

## Requirements
Patients shall submit identification and billing details when requested.

## Monitoring
The hospital desk shall submit annual reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinHospitalPatientRightsDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinHospitalPatientRightsDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinHospitalPatientRightsDraftResponse.status, 'success', 'Hospital patient-rights draft check should succeed locally')
  assertFinding(thinHospitalPatientRightsDraftResponse, 'amber', 'Hospital emergency and patient-rights controls')

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

  const thinPwdBenefitDraft = `# PWD Benefit Desk Policy

## Purpose
This policy creates a PWD benefit desk for discounts and VAT exemptions.

## Legal Basis
Pursuant to RA 7277, RA 9442, RA 10070, and RA 10754.

## Scope
This applies to local establishments and residents.

## Responsible Office
The social services office shall implement this policy.

## Requirements
Applicants may request assistance from the desk.

## Monitoring
The office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinPwdBenefitDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinPwdBenefitDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinPwdBenefitDraftResponse.status, 'success', 'PWD benefit draft check should succeed locally')
  assertFinding(thinPwdBenefitDraftResponse, 'amber', 'PWD benefit and PDAO')

  const thinPwdEmploymentDraft = `# Inclusive Hiring for Persons with Disability

## Purpose
This policy supports PWD employment and reserved positions.

## Legal Basis
Pursuant to RA 10524 and RA 7277.

## Scope
This applies to applicants and employees.

## Responsible Office
The HR office shall implement this policy.

## Requirements
The office may open vacancies for persons with disability.

## Monitoring
The HR office shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinPwdEmploymentDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinPwdEmploymentDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinPwdEmploymentDraftResponse.status, 'success', 'PWD employment draft check should succeed locally')
  assertFinding(thinPwdEmploymentDraftResponse, 'amber', 'PWD employment')

  const thinFacilityDraft = `# Public Market Renovation Policy

## Purpose
This policy covers construction, contractor license, architect signed plans, civil engineer structural review, electrical plan, mechanical equipment, master plumber plumbing plan, occupancy permit, sanitary permit, and accessibility improvements for a public market.

## Legal Basis
Pursuant to PD 1096, RA 4566, RA 9266, RA 544, RA 7920, RA 8495, RA 1378, PD 856, and BP 344.

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
  assertFinding(thinFacilityDraftResponse, 'amber', 'Building, occupancy, and licensed-construction controls')
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

  const thinFinancialInstitutionsDraft = `# Financial Services Intake Policy

## Purpose
This policy covers BSP supervision, bank loan referrals, bank director review, lending company onboarding, loan app support, financing company lease financing and factoring, insurance policy claims, pre-need planholder assistance, trust fund files, PDIC deposit insurance, closed bank notices, and receivership inquiries.

## Legal Basis
Pursuant to RA 7653, RA 11211, RA 8791, RA 9474, RA 8556, RA 10607, RA 9829, and RA 10846.

## Scope
This applies to customers, borrowers, policyholders, planholders, depositors, and local assistance staff.

## Responsible Office
The finance desk shall process requests.

## Requirements
Applicants shall submit financial documents when requested.

## Monitoring
The finance desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinFinancialInstitutionsDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinFinancialInstitutionsDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(
    thinFinancialInstitutionsDraftResponse.status,
    'success',
    'Financial institutions draft check should succeed locally'
  )
  assertFinding(thinFinancialInstitutionsDraftResponse, 'amber', 'BSP supervision')
  assertFinding(thinFinancialInstitutionsDraftResponse, 'amber', 'Banking operation')
  assertFinding(thinFinancialInstitutionsDraftResponse, 'amber', 'Lending-company')
  assertFinding(thinFinancialInstitutionsDraftResponse, 'amber', 'Financing-company')
  assertFinding(thinFinancialInstitutionsDraftResponse, 'amber', 'Insurance controls')
  assertFinding(thinFinancialInstitutionsDraftResponse, 'amber', 'Pre-need plan')
  assertFinding(thinFinancialInstitutionsDraftResponse, 'amber', 'Deposit-insurance')

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

  const thinLandTenureDraft = `# Land Tenure Assistance Desk Policy

## Purpose
This policy handles public land, imperfect title, residential free patent, agricultural free patent, land title, register of deeds inquiries, agrarian reform, CARP, CARPER, DAR clearance, CLOA, ARB amortization, and agrarian emancipation requests.

## Legal Basis
Pursuant to RA 11573, RA 10023, RA 11231, RA 6657, RA 9700, and RA 11953.

## Scope
This applies to land assistance applicants.

## Responsible Office
The land services desk shall implement this policy.

## Requirements
Applicants shall submit documents when requested.

## Monitoring
The desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinLandTenureDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinLandTenureDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinLandTenureDraftResponse.status, 'success', 'Land tenure draft check should succeed locally')
  assertFinding(thinLandTenureDraftResponse, 'amber', 'Land-title verification controls')
  assertFinding(thinLandTenureDraftResponse, 'amber', 'Public-land and free-patent controls')
  assertFinding(thinLandTenureDraftResponse, 'amber', 'Agrarian-reform land controls')

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

  const thinChildStatusDraft = `# Child Status and Alternative Care Desk Policy

## Purpose
This policy handles administrative adoption, alternative child care, NACC inquiries, simulated birth rectification, foundling recognition, child placement, birth certificate concerns, and civil registry referrals.

## Legal Basis
Pursuant to RA 11642, RA 11222, and RA 11767.

## Scope
This applies to children, guardians, custodians, prospective adoptive parents, and social welfare staff.

## Responsible Office
The child services desk shall process requests.

## Requirements
Applicants shall submit documents when requested.

## Monitoring
The desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinChildStatusDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinChildStatusDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinChildStatusDraftResponse.status, 'success', 'Child status draft check should succeed locally')
  assertFinding(thinChildStatusDraftResponse, 'amber', 'Adoption, foundling, or child-status controls')

  const thinEducationGovernanceDraft = `# School Services and Inclusive Learning Desk Policy

## Purpose
This policy handles DepEd governance, school division coordination, school head accountability, school improvement plan routing, basic education services, kindergarten, ECCD, child development center referrals, open distance learning, LMS access, and inclusive education for learners with disabilities.

## Legal Basis
Pursuant to RA 9155, RA 10533, RA 10157, RA 10410, RA 10650, and RA 11650.

## Scope
This applies to school services.

## Responsible Office
The education desk shall implement this policy.

## Requirements
Learners shall submit documents when requested.

## Monitoring
The desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinEducationGovernanceDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinEducationGovernanceDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(
    thinEducationGovernanceDraftResponse.status,
    'success',
    'Education governance draft check should succeed locally'
  )
  assertFinding(thinEducationGovernanceDraftResponse, 'amber', 'DepEd governance controls')
  assertFinding(thinEducationGovernanceDraftResponse, 'amber', 'Basic-education controls')
  assertFinding(thinEducationGovernanceDraftResponse, 'amber', 'Kindergarten and ECCD controls')
  assertFinding(thinEducationGovernanceDraftResponse, 'amber', 'ECCD authority may be superseded')
  assertFinding(thinEducationGovernanceDraftResponse, 'amber', 'Open-distance-learning controls')
  assertFinding(thinEducationGovernanceDraftResponse, 'amber', 'Inclusive-education controls')

  const thinRealEstateDraft = `# Real Estate Assistance Desk Policy

## Purpose
This policy handles subdivision project inquiries, condominium reservations, license to sell checks, contract to sell review, homeowners association dues, rent control questions, residential lease complaints, Maceda Law installment buyer cancellations, real estate broker referrals, salesperson activity, appraisals, and broker commissions.

## Legal Basis
Pursuant to PD 957, RA 9904, RA 9653, RA 6552, and RA 9646.

## Scope
This applies to buyers, homeowners, tenants, sellers, brokers, and residents.

## Responsible Office
The housing assistance desk shall process requests.

## Requirements
Applicants shall submit property documents when requested.

## Monitoring
The desk shall submit quarterly reports.

## Effectivity
This policy takes effect 30 days after publication.`

  const thinRealEstateDraftResponse = runLocalDraftCheck(
    { draft_markdown: thinRealEstateDraft, user_id: 'self-test', include_summary: true },
    'simulated draft checker outage'
  )
  assert.equal(thinRealEstateDraftResponse.status, 'success', 'Real estate draft check should succeed locally')
  assertFinding(thinRealEstateDraftResponse, 'amber', 'Real estate and housing transaction')

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
