'use client'

import type {
  DraftCheckerRequest,
  DraftCheckerResponse,
  Finding,
  HealthResponse,
  RAGQuery,
  RAGResponse,
} from './rag-api'

type LocalLegalDocument = {
  id: string
  statute: string
  title: string
  shortTitle: string
  year: number
  sourceName: string
  sourceUrl: string
  aliases: string[]
  topics: string[]
  keywords: string[]
  summary: string
  obligations: string[]
  commonGaps: string[]
}

type RankedDocument = {
  document: LocalLegalDocument
  score: number
  relevance: number
  matchedTerms: string[]
}

type IndexedDocument = {
  document: LocalLegalDocument
  tokens: string[]
  tokenCounts: Map<string, number>
  length: number
  searchableText: string
}

const LOCAL_PROVIDER_SERVICE = 'providerless-local-legal-research'
const MINIMUM_SCORE = 1.25
const BM25_K1 = 1.2
const BM25_B = 0.75

const STOP_WORDS = new Set([
  'a',
  'about',
  'also',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'can',
  'do',
  'does',
  'for',
  'from',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'law',
  'laws',
  'legal',
  'may',
  'must',
  'no',
  'of',
  'on',
  'or',
  'our',
  'ph',
  'philippine',
  'philippines',
  'please',
  'ra',
  'republic',
  'should',
  'the',
  'their',
  'this',
  'to',
  'under',
  'what',
  'when',
  'where',
  'which',
  'who',
  'with',
])

const LEGAL_CORPUS: LocalLegalDocument[] = [
  {
    id: 'ra-9003',
    statute: 'RA 9003',
    title: 'Republic Act No. 9003',
    shortTitle: 'Ecological Solid Waste Management Act of 2000',
    year: 2001,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2001/ra_9003_2001.html',
    aliases: [
      'ra 9003',
      'republic act 9003',
      'ecological solid waste management act',
      'solid waste management',
      'materials recovery facility',
      'mrf',
    ],
    topics: ['environment', 'solid waste', 'waste segregation', 'recycling', 'composting', 'barangay', 'lgu'],
    keywords: [
      'garbage',
      'collection',
      'disposal',
      'landfill',
      'source segregation',
      'waste diversion',
      'waste characterization',
      'municipal waste',
      'city waste',
    ],
    summary:
      'A national framework for ecological solid waste management, with LGU planning, source segregation, recycling, composting, public participation, and disposal facility controls.',
    obligations: [
      'Check whether the measure assigns LGU or barangay responsibility for segregation, collection, recycling, composting, and residual disposal.',
      'Require a local solid waste management plan, implementation timetable, public education, monitoring, and periodic review.',
      'Separate biodegradable, recyclable, residual, and special waste streams before collection or disposal.',
      'Validate penalty and enforcement provisions against notice, hearing, local authority, and national environmental rules.',
    ],
    commonGaps: [
      'No waste characterization baseline or diversion target.',
      'No materials recovery facility or composting workflow.',
      'No assignment of barangay, city, municipal, and provincial roles.',
      'Penalties are added without enforcement procedure or appeal path.',
    ],
  },
  {
    id: 'ra-10173',
    statute: 'RA 10173',
    title: 'Republic Act No. 10173',
    shortTitle: 'Data Privacy Act of 2012',
    year: 2012,
    sourceName: 'National Privacy Commission',
    sourceUrl: 'https://privacy.gov.ph/data-privacy-act/',
    aliases: ['ra 10173', 'republic act 10173', 'data privacy act', 'national privacy commission', 'npc'],
    topics: ['privacy', 'personal information', 'sensitive personal information', 'data security', 'data breach'],
    keywords: [
      'consent',
      'processing',
      'privacy notice',
      'data subject',
      'data controller',
      'data processor',
      'breach notification',
      'retention',
      'security measures',
    ],
    summary:
      'A privacy and data protection law for personal information systems in government and the private sector, administered by the National Privacy Commission.',
    obligations: [
      'State the purpose, scope, authority, retention period, and security safeguards for any personal-data processing.',
      'Include data-subject rights, privacy notice duties, access controls, and breach response ownership.',
      'Treat health, biometric, government ID, financial, and other sensitive data as high-risk processing.',
      'Avoid collecting personal data unless the draft identifies a lawful purpose and responsible office.',
    ],
    commonGaps: [
      'Data collection is required but no privacy notice or retention rule is stated.',
      'Sensitive personal information is processed without access controls or breach procedure.',
      'The responsible personal information controller or office is not named.',
    ],
  },
  {
    id: 'ra-11058',
    statute: 'RA 11058',
    title: 'Republic Act No. 11058',
    shortTitle: 'Occupational Safety and Health Standards Act',
    year: 2018,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2018/ra_11058_2018.html',
    aliases: ['ra 11058', 'republic act 11058', 'occupational safety and health', 'osh standards', 'workplace safety'],
    topics: ['labor', 'workplace safety', 'occupational health', 'hazards', 'ppe', 'training'],
    keywords: [
      'safety officer',
      'safety committee',
      'first aider',
      'job safety instruction',
      'work stoppage',
      'accident report',
      'toolbox meeting',
      'protective equipment',
    ],
    summary:
      'A workplace safety law requiring covered workplaces to implement safety and health programs, worker orientation, hazard controls, PPE, reporting, and DOLE-facing compliance.',
    obligations: [
      'Define covered workplaces, responsible employer or contractor, safety officer, and safety committee duties.',
      'Require hazard information, worker orientation, PPE, emergency response, and accident or illness reporting.',
      'Include inspection, corrective action, and work-stoppage escalation for imminent danger.',
      'Coordinate contractor, subcontractor, and principal-employer accountability where multiple parties share a site.',
    ],
    commonGaps: [
      'Safety program exists but has no assigned safety officer or committee.',
      'No worker training, PPE, hazard communication, or incident-reporting process.',
      'Construction or contractor language omits joint responsibility.',
    ],
  },
  {
    id: 'ra-9514',
    statute: 'RA 9514',
    title: 'Republic Act No. 9514',
    shortTitle: 'Fire Code of the Philippines of 2008',
    year: 2008,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2008/ra_9514_2008.html',
    aliases: ['ra 9514', 'republic act 9514', 'fire code', 'fire safety inspection certificate', 'fsic'],
    topics: ['fire safety', 'building safety', 'inspection', 'permits', 'emergency exits'],
    keywords: [
      'fire hazard',
      'fire prevention',
      'fire protection',
      'sprinkler',
      'alarm',
      'evacuation',
      'occupancy',
      'business permit',
      'bfp',
    ],
    summary:
      'The national fire safety framework for prevention, suppression, inspections, fire safety certificates, and fire-hazard enforcement.',
    obligations: [
      'Check whether covered premises need fire safety inspection, emergency exits, alarms, extinguishers, drills, or BFP coordination.',
      'Tie business, occupancy, or event permits to fire safety review where the measure creates a covered activity.',
      'Include inspection cadence, abatement steps, and due process for fire-hazard orders.',
    ],
    commonGaps: [
      'Permit language omits fire safety inspection or BFP coordination.',
      'Emergency exits, occupancy limits, and evacuation duties are not addressed.',
      'Closure or suspension powers have no notice or correction path.',
    ],
  },
  {
    id: 'ra-7160',
    statute: 'RA 7160',
    title: 'Republic Act No. 7160',
    shortTitle: 'Local Government Code of 1991',
    year: 1991,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1991/ra_7160_1991.html',
    aliases: ['ra 7160', 'republic act 7160', 'local government code', 'lgc', 'lgu powers', 'ordinance'],
    topics: ['local government', 'ordinance', 'barangay', 'city', 'municipality', 'province', 'permits'],
    keywords: [
      'sanggunian',
      'mayor',
      'barangay council',
      'local autonomy',
      'public hearing',
      'fees',
      'police power',
      'business permit',
      'local tax',
    ],
    summary:
      'The core statute for local autonomy, LGU powers, ordinances, local services, local fees, permits, public hearings, and local administrative roles.',
    obligations: [
      'Identify the LGU level, approving body, implementing office, and specific delegated authority.',
      'Separate ordinance-making, permitting, enforcement, fee collection, and appeal responsibilities.',
      'Check public hearing, publication, local finance, and consistency with national law before enforcing local rules.',
      'Avoid creating local obligations beyond the LGU authority stated in the draft.',
    ],
    commonGaps: [
      'The draft creates duties without naming the empowered LGU office or sanggunian authority.',
      'Fees, fines, or permits are imposed without public hearing or local finance basis.',
      'Barangay, city, municipality, and province roles are mixed together.',
    ],
  },
  {
    id: 'ra-10121',
    statute: 'RA 10121',
    title: 'Republic Act No. 10121',
    shortTitle: 'Philippine Disaster Risk Reduction and Management Act of 2010',
    year: 2010,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2010/ra_10121_2010.html',
    aliases: ['ra 10121', 'republic act 10121', 'drrm act', 'disaster risk reduction', 'ndrrmc', 'ldrrmo'],
    topics: ['disaster risk reduction', 'emergency management', 'hazard mapping', 'evacuation', 'resilience'],
    keywords: [
      'drrm',
      'ldrrmf',
      'quick response fund',
      'early warning',
      'hazard map',
      'evacuation',
      'contingency plan',
      'incident command',
      'preparedness',
    ],
    summary:
      'A disaster risk reduction and management framework covering national and local DRRM bodies, planning, preparedness, response, risk reduction, and local DRRM funding.',
    obligations: [
      'Map the responsible DRRM council or office, incident roles, warning channels, evacuation triggers, and reporting flow.',
      'Align plans with hazard data, vulnerable groups, drills, inventory, and continuity arrangements.',
      'Separate prevention, preparedness, response, rehabilitation, and recovery activities.',
      'Check budget source, quick-response use, procurement controls, and post-event reporting.',
    ],
    commonGaps: [
      'Emergency plan has no hazard map or evacuation trigger.',
      'No role for vulnerable groups, drills, early warning, or inventory control.',
      'Budget authority and reporting rules are unclear.',
    ],
  },
  {
    id: 'ra-8749',
    statute: 'RA 8749',
    title: 'Republic Act No. 8749',
    shortTitle: 'Philippine Clean Air Act of 1999',
    year: 1999,
    sourceName: 'Lawphil',
    sourceUrl: 'https://www.lawphil.net/statutes/repacts/ra1999/ra_8749_1999.html',
    aliases: ['ra 8749', 'republic act 8749', 'clean air act', 'air pollution', 'emissions'],
    topics: ['environment', 'air quality', 'emissions', 'stationary source', 'mobile source'],
    keywords: [
      'smoke',
      'emission',
      'incineration',
      'ambient air',
      'source emission',
      'pollution control',
      'air quality',
      'vehicle',
      'stack',
    ],
    summary:
      'A national air pollution control framework covering air quality management, emission sources, permits, monitoring, and prohibited air-polluting acts.',
    obligations: [
      'Identify whether the activity creates stationary-source, mobile-source, open-burning, or incineration issues.',
      'Require monitoring, permits, control measures, and coordination with DENR or other competent authorities where emissions are regulated.',
      'Avoid authorizing burning, smoke, or emission-generating activities without controls and enforcement safeguards.',
    ],
    commonGaps: [
      'Air emissions are mentioned but no permit, monitoring, or control standard is identified.',
      'Open burning or incineration language is too broad.',
      'Local enforcement does not coordinate with environmental regulators.',
    ],
  },
  {
    id: 'ra-9275',
    statute: 'RA 9275',
    title: 'Republic Act No. 9275',
    shortTitle: 'Philippine Clean Water Act of 2004',
    year: 2004,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2004/ra_9275_2004.html',
    aliases: ['ra 9275', 'republic act 9275', 'clean water act', 'water quality', 'wastewater'],
    topics: ['environment', 'water quality', 'wastewater', 'discharge', 'sewerage'],
    keywords: [
      'effluent',
      'discharge permit',
      'septic',
      'sewage',
      'wastewater treatment',
      'water body',
      'groundwater',
      'pollution',
      'river',
    ],
    summary:
      'A comprehensive water-quality management law addressing pollution prevention, discharge controls, water bodies, wastewater, sewerage, and regulatory enforcement.',
    obligations: [
      'Check whether the activity discharges wastewater, effluent, sewage, chemicals, or runoff into any water body.',
      'Require treatment, monitoring, discharge authorization, and coordination with environmental regulators where relevant.',
      'Assign inspection, sampling, reporting, corrective action, and penalty procedures.',
    ],
    commonGaps: [
      'Wastewater is regulated locally but no discharge or treatment standard is referenced.',
      'Monitoring and sampling roles are missing.',
      'Corrective action is not separated from penalties.',
    ],
  },
  {
    id: 'ra-11232',
    statute: 'RA 11232',
    title: 'Republic Act No. 11232',
    shortTitle: 'Revised Corporation Code of the Philippines',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11232_2019.html',
    aliases: ['ra 11232', 'republic act 11232', 'revised corporation code', 'corporation code', 'one person corporation'],
    topics: ['corporation', 'governance', 'sec', 'directors', 'stockholders', 'registration'],
    keywords: [
      'corporate governance',
      'one person corporation',
      'articles of incorporation',
      'bylaws',
      'board',
      'stockholder',
      'remote communication',
      'sec',
      'reportorial',
    ],
    summary:
      'The general corporate statute for private corporations, governance, directors and officers, corporate powers, SEC filings, one-person corporations, and corporate compliance.',
    obligations: [
      'Check whether the measure affects incorporation, governance, board approvals, stockholder rights, or SEC reportorial duties.',
      'Separate corporate authority from individual officer authority, especially where penalties or liabilities are added.',
      'For digital governance, include recordkeeping, notice, quorum, voting, and authentication safeguards.',
    ],
    commonGaps: [
      'The draft assigns corporate duties to officers without board or stockholder authority.',
      'Electronic notices or meetings are allowed without authentication or recordkeeping.',
      'SEC-facing reportorial duties are not identified.',
    ],
  },
  {
    id: 'ra-11313',
    statute: 'RA 11313',
    title: 'Republic Act No. 11313',
    shortTitle: 'Safe Spaces Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11313_2019.html',
    aliases: ['ra 11313', 'republic act 11313', 'safe spaces act', 'bawal bastos', 'gender-based harassment'],
    topics: ['gender', 'harassment', 'workplace', 'public spaces', 'online safety'],
    keywords: [
      'sexual harassment',
      'gender-based',
      'public space',
      'workplace policy',
      'complaint mechanism',
      'disciplinary action',
      'online harassment',
    ],
    summary:
      'A law addressing gender-based sexual harassment in public spaces, online spaces, workplaces, and educational or training institutions.',
    obligations: [
      'Include prevention duties, complaint intake, confidentiality, investigation, non-retaliation, and referral procedures.',
      'Separate workplace, school, online, and public-space enforcement roles.',
      'Protect complainants and witnesses while preserving due process for respondents.',
    ],
    commonGaps: [
      'The draft bans harassment but lacks complaint, investigation, confidentiality, or non-retaliation rules.',
      'Sanctions are listed without due process safeguards.',
      'Workplace duties are not assigned to an accountable office.',
    ],
  },
  {
    id: 'ra-8792',
    statute: 'RA 8792',
    title: 'Republic Act No. 8792',
    shortTitle: 'Electronic Commerce Act of 2000',
    year: 2000,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2000/ra_8792_2000.html',
    aliases: ['ra 8792', 'republic act 8792', 'e-commerce act', 'electronic commerce', 'electronic signature'],
    topics: ['digital transactions', 'electronic documents', 'electronic signatures', 'records', 'systems security'],
    keywords: [
      'e-signature',
      'electronic document',
      'digital record',
      'authentication',
      'integrity',
      'retention',
      'online transaction',
      'information system',
    ],
    summary:
      'A legal framework recognizing electronic documents, electronic signatures, and electronic transactions, with rules relevant to record integrity and system misuse.',
    obligations: [
      'For digital filings or approvals, state authentication, integrity, retention, access, audit trail, and fallback procedures.',
      'Align electronic records with privacy, cybersecurity, and agency recordkeeping responsibilities.',
      'Avoid replacing required notices or signatures without a reliable verification method.',
    ],
    commonGaps: [
      'Digital submission is allowed but authentication and audit trail are missing.',
      'Electronic records have no retention or integrity controls.',
      'The fallback process for failed systems is undefined.',
    ],
  },
]

const TOPIC_EXPANSIONS = [
  {
    triggers: ['waste', 'garbage', 'trash', 'recycling', 'landfill', 'segregation', 'mrf', 'compost'],
    expansions: ['solid waste', 'source segregation', 'materials recovery facility', 'local solid waste management plan'],
  },
  {
    triggers: ['privacy', 'personal', 'data', 'information', 'records', 'consent', 'breach'],
    expansions: ['data privacy', 'personal information', 'privacy notice', 'retention', 'breach response'],
  },
  {
    triggers: ['worker', 'workplace', 'safety', 'osh', 'hazard', 'ppe', 'accident', 'construction'],
    expansions: ['occupational safety and health', 'safety officer', 'safety committee', 'ppe', 'incident report'],
  },
  {
    triggers: ['fire', 'bfp', 'building', 'occupancy', 'evacuation', 'alarm'],
    expansions: ['fire code', 'fire safety inspection certificate', 'emergency exits', 'fire protection'],
  },
  {
    triggers: ['disaster', 'drrm', 'hazard', 'typhoon', 'earthquake', 'flood', 'evacuation', 'resilience'],
    expansions: ['disaster risk reduction', 'hazard mapping', 'early warning', 'local drrm fund'],
  },
  {
    triggers: ['air', 'emission', 'smoke', 'burning', 'incineration', 'pollution'],
    expansions: ['clean air act', 'air quality', 'emissions monitoring', 'pollution control'],
  },
  {
    triggers: ['water', 'wastewater', 'effluent', 'sewage', 'river', 'discharge', 'septic'],
    expansions: ['clean water act', 'discharge permit', 'water quality', 'wastewater treatment'],
  },
  {
    triggers: ['ordinance', 'barangay', 'mayor', 'sanggunian', 'lgu', 'permit', 'fee'],
    expansions: ['local government code', 'public hearing', 'local authority', 'business permit'],
  },
  {
    triggers: ['corporation', 'company', 'board', 'stockholder', 'sec', 'bylaws'],
    expansions: ['revised corporation code', 'corporate governance', 'sec reportorial requirements'],
  },
  {
    triggers: ['harassment', 'gender', 'safe', 'spaces', 'complaint', 'retaliation'],
    expansions: ['safe spaces act', 'gender-based harassment', 'complaint mechanism', 'non-retaliation'],
  },
  {
    triggers: ['electronic', 'digital', 'online', 'signature', 'record', 'filing'],
    expansions: ['electronic commerce act', 'electronic document', 'electronic signature', 'audit trail'],
  },
]

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))
}

function unique<T>(values: T[]) {
  return [...new Set(values)]
}

function uniqueByNormalized(values: string[]) {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values) {
    const key = normalizeText(value)

    if (!key || seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(value)
  }

  return result
}

function extractRaNumbers(value: string) {
  const matches = value.matchAll(/\b(?:r\.?\s*a\.?|republic\s+act(?:\s+no\.?)?)\s*(\d{3,5})\b/gi)
  return unique([...matches].map((match) => match[1]))
}

function createSearchableText(document: LocalLegalDocument) {
  return normalizeText(
    [
      document.statute,
      document.title,
      document.shortTitle,
      document.aliases.join(' '),
      document.topics.join(' '),
      document.keywords.join(' '),
      document.summary,
      document.obligations.join(' '),
      document.commonGaps.join(' '),
    ].join(' ')
  )
}

function countTokens(tokens: string[]) {
  const counts = new Map<string, number>()

  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1)
  }

  return counts
}

const INDEXED_CORPUS: IndexedDocument[] = LEGAL_CORPUS.map((document) => {
  const searchableText = createSearchableText(document)
  const tokens = tokenize(searchableText)

  return {
    document,
    tokens,
    tokenCounts: countTokens(tokens),
    length: tokens.length,
    searchableText,
  }
})

const AVERAGE_DOCUMENT_LENGTH =
  INDEXED_CORPUS.reduce((total, entry) => total + entry.length, 0) / INDEXED_CORPUS.length

function expandQueryTokens(query: string) {
  const baseTokens = tokenize(query)
  const normalizedQuery = normalizeText(query)
  const expansionTokens = TOPIC_EXPANSIONS.flatMap((expansion) => {
    const matchesTrigger = expansion.triggers.some((trigger) => normalizedQuery.includes(normalizeText(trigger)))
    return matchesTrigger ? expansion.expansions.flatMap((value) => tokenize(value)) : []
  })

  return unique([...baseTokens, ...expansionTokens])
}

function getDocumentFrequency(token: string) {
  return INDEXED_CORPUS.filter((entry) => entry.tokenCounts.has(token)).length
}

function getIdf(token: string) {
  const documentCount = INDEXED_CORPUS.length
  const frequency = getDocumentFrequency(token)

  return Math.log(1 + (documentCount - frequency + 0.5) / (frequency + 0.5))
}

function getBm25Score(token: string, entry: IndexedDocument) {
  const termFrequency = entry.tokenCounts.get(token) || 0

  if (termFrequency === 0) {
    return 0
  }

  const denominator =
    termFrequency + BM25_K1 * (1 - BM25_B + BM25_B * (entry.length / AVERAGE_DOCUMENT_LENGTH))

  return getIdf(token) * ((termFrequency * (BM25_K1 + 1)) / denominator)
}

function phraseScore(query: string, entry: IndexedDocument) {
  const normalizedQuery = normalizeText(query)
  const raNumbers = extractRaNumbers(query)
  let score = 0

  for (const raNumber of raNumbers) {
    if (normalizeText(entry.document.statute).includes(raNumber)) {
      score += 16
    }
  }

  for (const alias of entry.document.aliases) {
    const normalizedAlias = normalizeText(alias)

    if (normalizedAlias.length > 2 && normalizedQuery.includes(normalizedAlias)) {
      score += 9
    }
  }

  for (const topic of entry.document.topics) {
    const normalizedTopic = normalizeText(topic)

    if (normalizedTopic.length > 3 && normalizedQuery.includes(normalizedTopic)) {
      score += 3.5
    }
  }

  return score
}

function rankLegalCorpus(query: string): RankedDocument[] {
  const queryTokens = expandQueryTokens(query)

  if (queryTokens.length === 0) {
    return []
  }

  const rawScores = INDEXED_CORPUS.map((entry) => {
    const matchedTerms = queryTokens.filter((token) => entry.tokenCounts.has(token))
    const bm25 = queryTokens.reduce((score, token) => score + getBm25Score(token, entry), 0)
    const titleBoost = matchedTerms.reduce((score, token) => {
      const titleText = normalizeText(`${entry.document.statute} ${entry.document.shortTitle} ${entry.document.title}`)
      return titleText.includes(token) ? score + 1.75 : score
    }, 0)
    const score = bm25 + titleBoost + phraseScore(query, entry)

    return {
      document: entry.document,
      matchedTerms,
      score,
    }
  })

  const maxScore = Math.max(...rawScores.map((result) => result.score), 1)

  return rawScores
    .filter((result) => result.score >= MINIMUM_SCORE)
    .map((result) => ({
      ...result,
      relevance: Math.min(0.98, Math.max(0.1, result.score / (maxScore + 2))),
    }))
    .sort((left, right) => right.score - left.score)
}

function generateLocalSearchQueries(query: string, rankedDocuments: RankedDocument[]) {
  const expansions = TOPIC_EXPANSIONS.flatMap((expansion) => {
    const normalizedQuery = normalizeText(query)
    const matchesTrigger = expansion.triggers.some((trigger) => normalizedQuery.includes(normalizeText(trigger)))
    return matchesTrigger ? expansion.expansions : []
  })
  const raQueries = extractRaNumbers(query).map((number) => `RA ${number}`)
  const documentQueries = rankedDocuments.slice(0, 3).map((match) => `${match.document.statute} ${match.document.shortTitle}`)

  return uniqueByNormalized([query.trim(), ...raQueries, ...expansions, ...documentQueries]).slice(0, 10)
}

function toPercent(value: number) {
  return Math.round(value * 100)
}

function formatSeconds(startedAt: number) {
  return Math.max(0.1, (Date.now() - startedAt) / 1000)
}

function getProcessingStages(deepSearchUsed?: boolean) {
  return {
    query_generator: 'local keyword expansion with RA-number detection',
    search_executor: 'providerless weighted BM25 and phrase matching over bundled corpus',
    deep_search_orchestrator: deepSearchUsed
      ? 'local cross-reference expansion; no remote PDFs or AI provider used'
      : undefined,
    summarizer: 'deterministic template synthesis with source links and checklist extraction',
  }
}

function formatMatchedDocument(match: RankedDocument, index: number, deepSearchUsed?: boolean) {
  const obligationLimit = deepSearchUsed ? 4 : 3

  return [
    `### ${index + 1}. ${match.document.statute} - ${match.document.shortTitle}`,
    '',
    `- Relevance: ${toPercent(match.relevance)}%`,
    `- Source: [${match.document.sourceName}](${match.document.sourceUrl})`,
    `- Matched terms: ${match.matchedTerms.slice(0, 8).join(', ') || 'phrase match'}`,
    '',
    match.document.summary,
    '',
    'Key checks:',
    ...match.document.obligations.slice(0, obligationLimit).map((obligation) => `- ${obligation}`),
  ].join('\n')
}

function buildNoResultsSummary(query: string, fallbackReason?: string) {
  const reasonLine = fallbackReason
    ? `The configured AI/RAG provider was unavailable, so LexInSight used its local providerless engine. Provider error: ${fallbackReason}`
    : 'LexInSight used its local providerless engine.'

  return [
    '# Providerless Local Research Brief',
    '',
    `Query: ${query}`,
    '',
    '## Result',
    '',
    'No strong match was found in the bundled local legal corpus.',
    '',
    '## What You Can Try',
    '',
    '- Include a Republic Act number, such as RA 9003, RA 10173, RA 11058, RA 7160, or RA 10121.',
    '- Add the regulated activity, agency, permit, affected sector, and location.',
    '- Ask for a narrower compliance checklist, for example "solid waste requirements for a barangay ordinance".',
    '',
    '## Provider Mode',
    '',
    reasonLine,
    '',
    '## Limits',
    '',
    'This local result is deterministic and does not search the live internet, agency issuances, court decisions, or local ordinances. Verify against current official sources and qualified counsel before relying on it.',
  ].join('\n')
}

function buildResearchSummary(query: string, rankedDocuments: RankedDocument[], deepSearchUsed?: boolean, fallbackReason?: string) {
  const topMatches = rankedDocuments.slice(0, deepSearchUsed ? 5 : 3)
  const checklist = uniqueByNormalized(topMatches.flatMap((match) => match.document.obligations)).slice(
    0,
    deepSearchUsed ? 10 : 7
  )
  const gaps = uniqueByNormalized(topMatches.flatMap((match) => match.document.commonGaps)).slice(
    0,
    deepSearchUsed ? 8 : 5
  )
  const reasonLine = fallbackReason
    ? `The configured AI/RAG provider was unavailable, so this brief was generated locally. Provider error: ${fallbackReason}`
    : 'This brief was generated by the local providerless engine.'
  const deepSearchLine = deepSearchUsed
    ? 'Deep search was requested. In providerless mode, LexInSight expands local cross-references but does not download PDFs or call an AI provider.'
    : 'Standard local retrieval was used.'

  return [
    '# Providerless Local Research Brief',
    '',
    `Query: ${query}`,
    '',
    '## Provider Mode',
    '',
    `${reasonLine} ${deepSearchLine}`,
    '',
    '## Likely Relevant Authorities',
    '',
    ...topMatches.map((match, index) => formatMatchedDocument(match, index, deepSearchUsed)).join('\n\n').split('\n'),
    '',
    '## Practical Checklist',
    '',
    ...checklist.map((item) => `- ${item}`),
    '',
    '## Common Drafting or Compliance Gaps to Check',
    '',
    ...gaps.map((item) => `- ${item}`),
    '',
    '## Limits',
    '',
    'This is rule-based legal research support, not legal advice. It uses a bundled corpus and deterministic scoring, so it may miss newer laws, agency issuances, court rulings, local ordinances, and facts outside the query. Verify against current official sources and qualified legal counsel before acting.',
  ].join('\n')
}

export function runLocalResearch(params: RAGQuery, fallbackReason?: string): RAGResponse {
  const startedAt = Date.now()
  const query = params.query.trim()
  const rankedDocuments = rankLegalCorpus(query)
  const searchQueries = generateLocalSearchQueries(query, rankedDocuments)
  const matchedDocuments = rankedDocuments.slice(0, params.use_deep_search ? 5 : 3)
  const topRelevance = matchedDocuments[0]?.relevance || 0

  if (!query) {
    return {
      status: 'error',
      query,
      summary: 'Enter a legal research question before running the local providerless engine.',
      search_queries_used: [],
      documents_found: 0,
      processing_stages: getProcessingStages(params.use_deep_search),
      deep_search_used: Boolean(params.use_deep_search),
      processing_time_seconds: formatSeconds(startedAt),
      provider_mode: 'local-providerless',
      fallback_used: Boolean(fallbackReason),
      fallback_reason: fallbackReason,
      confidence_score: 0,
      matched_documents: [],
    }
  }

  if (matchedDocuments.length === 0) {
    return {
      status: 'no_results',
      query,
      summary: buildNoResultsSummary(query, fallbackReason),
      search_queries_used: searchQueries,
      documents_found: 0,
      processing_stages: getProcessingStages(params.use_deep_search),
      deep_search_used: Boolean(params.use_deep_search),
      processing_time_seconds: formatSeconds(startedAt),
      provider_mode: 'local-providerless',
      fallback_used: Boolean(fallbackReason),
      fallback_reason: fallbackReason,
      confidence_score: 0,
      matched_documents: [],
    }
  }

  return {
    status: 'completed',
    query,
    summary: buildResearchSummary(query, rankedDocuments, params.use_deep_search, fallbackReason),
    search_queries_used: searchQueries,
    documents_found: matchedDocuments.length,
    processing_stages: getProcessingStages(params.use_deep_search),
    deep_search_used: Boolean(params.use_deep_search),
    processing_time_seconds: formatSeconds(startedAt),
    provider_mode: 'local-providerless',
    fallback_used: Boolean(fallbackReason),
    fallback_reason: fallbackReason,
    confidence_score: topRelevance,
    matched_documents: matchedDocuments.map((match) => ({
      title: `${match.document.statute} - ${match.document.shortTitle}`,
      statute: match.document.statute,
      source_name: match.document.sourceName,
      source_url: match.document.sourceUrl,
      relevance_score: match.relevance,
      matched_terms: match.matchedTerms.slice(0, 10),
    })),
  }
}

function extractDraftTitle(markdown: string) {
  const heading = markdown.match(/^#\s+(.+)$/m)

  if (heading?.[1]?.trim()) {
    return heading[1].trim()
  }

  const firstLine = markdown
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0)

  return firstLine?.slice(0, 120) || 'Untitled draft'
}

function hasAny(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text))
}

function createFinding(
  status: Finding['status'],
  category: Finding['category'],
  title: string,
  description: string,
  recommendation: string,
  severityScore: number,
  references: string[] = []
): Finding {
  return {
    status,
    category,
    title,
    description,
    references,
    recommendation,
    severity_score: severityScore,
  }
}

function referenceFor(document: LocalLegalDocument) {
  return `${document.statute} - ${document.shortTitle} (${document.sourceName}: ${document.sourceUrl})`
}

function genericDraftingReference() {
  return 'Providerless drafting checklist: authority, scope, implementing office, procedure, due process, effectivity, monitoring, and review.'
}

function analyzeDraft(markdown: string) {
  const normalizedDraft = normalizeText(markdown)
  const rankedDocuments = rankLegalCorpus(markdown)
  const topReferences = rankedDocuments.slice(0, 4).map((match) => referenceFor(match.document))
  const paragraphCount = markdown.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).length
  const uniqueKeywords = unique(tokenize(markdown)).length

  const hasAuthority = hasAny(normalizedDraft, [
    /\bauthority\b/,
    /\blegal basis\b/,
    /\bpursuant\b/,
    /\brepublic act\b/,
    /\bra\s*\d{3,5}\b/,
    /\blocal government code\b/,
  ])
  const hasPurpose = hasAny(normalizedDraft, [/\bpurpose\b/, /\bpolicy\b/, /\bobjectives?\b/, /\bwhereas\b/])
  const hasScope = hasAny(normalizedDraft, [/\bscope\b/, /\bcoverage\b/, /\bapplicability\b/, /\bcovered\b/])
  const hasDefinitions = hasAny(normalizedDraft, [/\bdefinition/, /\bterms\b/, /\bmeans\b/, /\bshall refer to\b/])
  const hasRequirements = hasAny(normalizedDraft, [/\bshall\b/, /\bmust\b/, /\brequired\b/, /\bprohibited\b/, /\bmandator/])
  const hasResponsibleOffice = hasAny(normalizedDraft, [
    /\bresponsible\b/,
    /\bimplementing office\b/,
    /\bdepartment\b/,
    /\boffice\b/,
    /\bcommittee\b/,
    /\bboard\b/,
    /\bsecretariat\b/,
  ])
  const hasTimeline = hasAny(normalizedDraft, [
    /\beffectivity\b/,
    /\bwithin\s+\d+/,
    /\bdays?\b/,
    /\bmonths?\b/,
    /\bphase\b/,
    /\bimplementation timeline\b/,
  ])
  const hasPenalties = hasAny(normalizedDraft, [/\bpenalt/, /\bfine\b/, /\bsanction\b/, /\bviolation\b/, /\bsuspension\b/])
  const hasDueProcess = hasAny(normalizedDraft, [
    /\bnotice\b/,
    /\bhearing\b/,
    /\bappeal\b/,
    /\breconsideration\b/,
    /\bshow cause\b/,
    /\bdue process\b/,
  ])
  const hasMonitoring = hasAny(normalizedDraft, [
    /\breport/,
    /\bmonitor/,
    /\baudit/,
    /\binspection/,
    /\brecord/,
    /\bsubmit/,
  ])
  const hasBudget = hasAny(normalizedDraft, [/\bbudget\b/, /\bfund/, /\bappropriat/, /\bresource/, /\ballocation\b/])
  const hasConsultation = hasAny(normalizedDraft, [/\bconsultation\b/, /\bpublic hearing\b/, /\bstakeholder\b/])

  const green: Finding[] = []
  const amber: Finding[] = []
  const red: Finding[] = []

  if (hasPurpose) {
    green.push(
      createFinding(
        'green',
        'compliant',
        'Purpose or policy statement found',
        'The draft states a purpose, policy, objective, or recital that can anchor implementation.',
        'Keep the purpose tied to measurable duties and the legal authority cited in the operative sections.',
        1,
        [genericDraftingReference()]
      )
    )
  }

  if (hasRequirements) {
    green.push(
      createFinding(
        'green',
        'compliant',
        'Operative requirements are stated',
        'The draft uses mandatory language for at least some duties or prohibitions.',
        'Review each "shall" or "must" clause for actor, deadline, standard, and enforcement consequence.',
        1,
        [genericDraftingReference()]
      )
    )
  }

  if (hasMonitoring) {
    green.push(
      createFinding(
        'green',
        'compliant',
        'Monitoring or reporting controls found',
        'The draft includes reporting, inspection, audit, submission, monitoring, or recordkeeping language.',
        'Specify report recipients, frequency, data fields, retention period, and escalation rules.',
        1,
        topReferences.length > 0 ? topReferences : [genericDraftingReference()]
      )
    )
  }

  if (hasAuthority) {
    green.push(
      createFinding(
        'green',
        'alignment',
        'Legal authority signal found',
        'The draft references a statute, Republic Act, legal basis, or authority clause.',
        'Verify that the cited authority actually empowers every obligation, fee, penalty, and implementing office.',
        2,
        topReferences.length > 0 ? topReferences : [genericDraftingReference()]
      )
    )
  } else {
    red.push(
      createFinding(
        'red',
        'gap',
        'No explicit legal authority found',
        'The draft does not clearly identify the statute, ordinance power, agency mandate, or other legal basis for the obligations it creates.',
        'Add a legal-basis section and map each major duty, fee, penalty, permit, and office action to the specific enabling authority.',
        9,
        topReferences.length > 0 ? topReferences : [genericDraftingReference()]
      )
    )
  }

  if (!hasScope) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Coverage and scope are unclear',
        'The draft does not clearly define who, what activities, locations, or entities are covered.',
        'Add a scope section covering regulated persons, places, activities, exemptions, and transition rules.',
        5,
        [genericDraftingReference()]
      )
    )
  }

  if (!hasDefinitions && markdown.length > 1200) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Definitions may be needed',
        'The draft is long enough to use technical or regulated terms, but no definition section was detected.',
        'Define recurring technical terms, regulated actors, agency roles, documents, permits, and prohibited acts.',
        4,
        [genericDraftingReference()]
      )
    )
  }

  if (!hasResponsibleOffice) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Responsible office is not assigned',
        'The draft does not clearly assign implementation, inspection, approval, or enforcement to a responsible office or committee.',
        'Name the implementing office, decision maker, record custodian, enforcement lead, and coordination bodies.',
        6,
        [genericDraftingReference()]
      )
    )
  }

  if (hasPenalties && !hasDueProcess) {
    red.push(
      createFinding(
        'red',
        'conflict',
        'Penalties lack due process controls',
        'The draft includes penalties, fines, sanctions, violations, or suspension language without detected notice, hearing, appeal, or reconsideration safeguards.',
        'Add notice, correction period where appropriate, hearing or written response, appeal route, decision deadline, and recordkeeping requirements.',
        9,
        topReferences.length > 0 ? topReferences : [genericDraftingReference()]
      )
    )
  }

  if (!hasTimeline) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Effectivity or implementation timeline is missing',
        'No clear effectivity date, phase, deadline, or transition period was detected.',
        'State when the measure takes effect, when regulated parties must comply, and how transition cases are handled.',
        5,
        [genericDraftingReference()]
      )
    )
  }

  if (!hasMonitoring) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Monitoring and reporting are missing',
        'The draft does not include a clear reporting, inspection, recordkeeping, audit, or review mechanism.',
        'Add reporting cadence, inspection authority, required records, retention period, and periodic review.',
        5,
        topReferences.length > 0 ? topReferences : [genericDraftingReference()]
      )
    )
  }

  if ((/\bprogram\b|\boffice\b|\bcommittee\b|\bplan\b/.test(normalizedDraft)) && !hasBudget) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Program resources are not addressed',
        'The draft appears to create a program, office, committee, or plan, but no budget, staffing, or resource clause was detected.',
        'Add funding source, staffing ownership, procurement or resource controls, and reporting for fund use.',
        5,
        [genericDraftingReference()]
      )
    )
  }

  if (hasConsultation) {
    green.push(
      createFinding(
        'green',
        'alignment',
        'Consultation or public participation found',
        'The draft includes consultation, public hearing, or stakeholder participation language.',
        'Keep a record of notice, attendance, comments received, and how feedback changed the final measure.',
        1,
        [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7160') || LEGAL_CORPUS[0])]
      )
    )
  }

  applyTopicSpecificDraftChecks(normalizedDraft, { green, amber, red }, rankedDocuments)

  return {
    green,
    amber,
    red,
    rankedDocuments,
    paragraphCount,
    uniqueKeywords,
  }
}

function applyTopicSpecificDraftChecks(
  normalizedDraft: string,
  findings: { green: Finding[]; amber: Finding[]; red: Finding[] },
  rankedDocuments: RankedDocument[]
) {
  const references = rankedDocuments.slice(0, 4).map((match) => referenceFor(match.document))

  if (
    /\b(personal data|personal information|sensitive|privacy|biometric|health record|id number|contact tracing)\b/.test(
      normalizedDraft
    ) &&
    !/\b(privacy notice|consent|retention|data subject|breach|access control|confidential)\b/.test(normalizedDraft)
  ) {
    findings.red.push(
      createFinding(
        'red',
        'gap',
        'Personal-data processing lacks safeguards',
        'The draft appears to involve personal or sensitive information, but no privacy notice, retention, access-control, or breach-response language was detected.',
        'Add purpose limitation, legal basis, minimum data fields, retention, access controls, data-subject rights, breach response, and responsible privacy office.',
        8,
        [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10173') || LEGAL_CORPUS[0])]
      )
    )
  }

  if (/\b(waste|garbage|recycling|compost|landfill|mrf|segregation)\b/.test(normalizedDraft)) {
    if (/\b(segregation|recycling|compost|mrf|materials recovery|waste management plan)\b/.test(normalizedDraft)) {
      findings.green.push(
        createFinding(
          'green',
          'alignment',
          'Solid waste controls are signaled',
          'The draft includes source segregation, recycling, composting, MRF, or planning language relevant to ecological solid waste management.',
          'Verify LGU roles, diversion targets, collection routes, residual disposal, public education, and plan review against the local context.',
          2,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9003') || LEGAL_CORPUS[0])]
        )
      )
    } else {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Solid waste topic needs RA 9003 controls',
          'Waste-related language was detected, but the draft does not clearly include segregation, recycling, composting, MRF, or waste-management-plan controls.',
          'Add source segregation, barangay/LGU role split, recycling or composting flow, residual disposal, monitoring, and public education.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9003') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(worker|workplace|construction|hazard|ppe|accident|occupational|safety)\b/.test(normalizedDraft)) {
    if (!/\b(safety officer|safety committee|ppe|training|orientation|incident|accident report|emergency response)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Workplace safety duties need more detail',
          'Workplace or hazard language was detected without a clear OSH program, safety officer, worker training, PPE, or incident reporting mechanism.',
          'Add covered workplaces, safety officer or committee duties, worker orientation, PPE, emergency response, inspection, and reporting.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11058') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(fire|occupancy|evacuation|bfp|alarm|sprinkler|extinguisher)\b/.test(normalizedDraft)) {
    if (!/\b(fire safety|inspection|certificate|bfp|evacuation|alarm|extinguisher|exit)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Fire safety controls are incomplete',
          'Fire or occupancy language was detected without clear inspection, evacuation, alarm, extinguisher, exit, or BFP coordination language.',
          'Add Fire Code cross-checks, inspection responsibility, emergency exits, drills, safety devices, abatement, and appeal procedure.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9514') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(disaster|drrm|typhoon|earthquake|flood|evacuation|hazard map|early warning)\b/.test(normalizedDraft)) {
    if (!/\b(hazard map|early warning|evacuation|drill|vulnerable|ldrrm|contingency|incident command)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'DRRM plan controls are thin',
          'Disaster or emergency language was detected without enough hazard mapping, warning, evacuation, drill, vulnerable-group, or incident-command detail.',
          'Add hazard maps, early-warning triggers, evacuation routes, drills, vulnerable-group support, inventories, reporting, and budget authority.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10121') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(wastewater|effluent|sewage|discharge|river|water quality|septage)\b/.test(normalizedDraft)) {
    if (!/\b(discharge permit|treatment|sampling|monitoring|effluent|water quality|denr|emb)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Water-quality controls are incomplete',
          'Water, wastewater, sewage, or discharge language was detected without clear treatment, monitoring, sampling, or permit controls.',
          'Add treatment standard, discharge authorization, inspection, sampling, corrective action, and regulator coordination.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9275') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(air|emission|smoke|burning|incineration|stack|vehicle emission)\b/.test(normalizedDraft)) {
    if (!/\b(air quality|emission standard|monitoring|permit|pollution control|denr|emb)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Air-quality controls are incomplete',
          'Air-emission or burning language was detected without clear permit, monitoring, or pollution-control safeguards.',
          'Add emission-control standards, monitoring, prohibited acts, corrective action, and regulator coordination.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8749') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(electronic|digital|online|signature|record|filing|portal)\b/.test(normalizedDraft)) {
    if (!/\b(authentication|audit trail|integrity|retention|backup|access control|electronic signature)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Digital process controls are missing',
          'Digital filing, online records, or electronic signatures are mentioned without clear authentication, integrity, retention, or fallback controls.',
          'Add authentication, audit trail, record integrity, retention, access controls, and manual fallback for system downtime.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8792') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (references.length === 0) {
    return
  }
}

function getOverallAssessment(score: number, redCount: number, amberCount: number) {
  if (redCount > 0) {
    return `High-risk draft. The local checker found ${redCount} red issue(s) that should be resolved before relying on the draft.`
  }

  if (score >= 82 && amberCount <= 2) {
    return 'Generally well-structured draft. Remaining items are mostly refinement or verification points.'
  }

  if (score >= 65) {
    return 'Moderate-risk draft. The core structure is usable, but several implementation gaps should be closed.'
  }

  return 'Incomplete draft. Add authority, scope, implementation, monitoring, due process, and effectivity details before use.'
}

function calculateComplianceScore(green: Finding[], amber: Finding[], red: Finding[]) {
  const greenCredit = Math.min(10, green.length * 2)
  const amberPenalty = amber.reduce((total, finding) => total + Math.max(4, finding.severity_score), 0)
  const redPenalty = red.reduce((total, finding) => total + Math.max(12, finding.severity_score * 2), 0)
  const score = 88 + greenCredit - amberPenalty - redPenalty

  return Math.min(96, Math.max(15, score))
}

export function runLocalDraftCheck(
  params: DraftCheckerRequest,
  fallbackReason?: string
): DraftCheckerResponse {
  const startedAt = Date.now()
  const draftMarkdown = params.draft_markdown.trim()

  if (!draftMarkdown) {
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Draft text is empty.',
      analysis: {
        status: 'error',
        draft_title: 'Untitled draft',
        total_findings: 0,
        green_count: 0,
        amber_count: 0,
        red_count: 0,
        green_findings: [],
        amber_findings: [],
        red_findings: [],
        overall_assessment: 'No draft text was provided.',
        compliance_score: 0,
        keywords_extracted: 0,
        documents_searched: 0,
        chunks_analyzed: 0,
        processing_time_seconds: formatSeconds(startedAt),
        summary: 'Add readable draft text before running the local providerless draft checker.',
      },
    }
  }

  const analysis = analyzeDraft(draftMarkdown)
  const complianceScore = calculateComplianceScore(analysis.green, analysis.amber, analysis.red)
  const totalFindings = analysis.green.length + analysis.amber.length + analysis.red.length
  const fallbackLine = fallbackReason
    ? `The configured AI/RAG Draft Checker was unavailable, so LexInSight used deterministic local checks. Provider error: ${fallbackReason}`
    : 'LexInSight used deterministic local providerless checks.'

  return {
    status: 'success',
    timestamp: new Date().toISOString(),
    analysis: {
      status: 'completed',
      draft_title: extractDraftTitle(draftMarkdown),
      total_findings: totalFindings,
      green_count: analysis.green.length,
      amber_count: analysis.amber.length,
      red_count: analysis.red.length,
      green_findings: analysis.green,
      amber_findings: analysis.amber,
      red_findings: analysis.red,
      overall_assessment: getOverallAssessment(complianceScore, analysis.red.length, analysis.amber.length),
      compliance_score: complianceScore,
      keywords_extracted: analysis.uniqueKeywords,
      documents_searched: Math.max(analysis.rankedDocuments.length, 1),
      chunks_analyzed: analysis.paragraphCount,
      processing_time_seconds: formatSeconds(startedAt),
      summary: `${fallbackLine} This is a rule-based drafting review, not legal advice. It checks for structural completeness, likely statute matches, and common compliance gaps, then flags issues for lawyer or agency verification.`,
    },
  }
}

export function getLocalResearchHealth(fallbackReason?: string): HealthResponse {
  return {
    status: 'healthy',
    service: LOCAL_PROVIDER_SERVICE,
    provider_mode: 'local-providerless',
    degraded: Boolean(fallbackReason),
    fallback_reason: fallbackReason,
  }
}

export function getLocalResearchCorpus() {
  return LEGAL_CORPUS.map((document) => ({
    id: document.id,
    statute: document.statute,
    shortTitle: document.shortTitle,
    sourceName: document.sourceName,
    sourceUrl: document.sourceUrl,
    topics: document.topics,
  }))
}
