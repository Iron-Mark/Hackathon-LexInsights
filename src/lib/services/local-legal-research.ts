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

type LocalComplianceFramework = {
  id: string
  title: string
  triggers: string[]
  lawIds: string[]
  summary: string
  sequence: string[]
  checkpoints: string[]
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
const STANDARD_RESULT_LIMIT = 6
const DEEP_RESULT_LIMIT = 10

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
    aliases: [
      'ra 10173',
      'republic act 10173',
      'data privacy act',
      'data protection',
      'national privacy commission',
      'npc',
    ],
    topics: [
      'privacy',
      'personal information',
      'sensitive personal information',
      'data protection',
      'data security',
      'data breach',
      'data subject rights',
    ],
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
      'purpose limitation',
      'privacy impact assessment',
      'data protection officer',
      'lawful basis',
    ],
    summary:
      'A privacy and data protection law for personal information systems in government and the private sector, administered by the National Privacy Commission, with rules on lawful processing, data-subject rights, security, breach notification, and accountability.',
    obligations: [
      'State the purpose, scope, authority, retention period, and security safeguards for any personal-data processing.',
      'Include data-subject rights, privacy notice duties, access controls, and breach response ownership.',
      'Treat health, biometric, government ID, financial, and other sensitive data as high-risk processing.',
      'Avoid collecting personal data unless the draft identifies a lawful purpose and responsible office.',
      'Map personal information controllers, processors, third-party transfers, cross-border handling, and breach notification triggers.',
    ],
    commonGaps: [
      'Data collection is required but no privacy notice or retention rule is stated.',
      'Sensitive personal information is processed without access controls or breach procedure.',
      'The responsible personal information controller or office is not named.',
      'Data sharing, outsourcing, or system access is allowed without accountability, contract, or audit controls.',
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
  {
    id: 'ra-12009',
    statute: 'RA 12009',
    title: 'Republic Act No. 12009',
    shortTitle: 'New Government Procurement Act',
    year: 2024,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2024/ra_12009_2024.html',
    aliases: ['ra 12009', 'republic act 12009', 'new government procurement act', 'government procurement', 'public bidding'],
    topics: ['procurement', 'public bidding', 'government contracts', 'lgu procurement', 'supplier eligibility'],
    keywords: [
      'bids and awards committee',
      'bac',
      'procurement plan',
      'competitive bidding',
      'alternative procurement',
      'contract award',
      'bid security',
      'post qualification',
      'conflict of interest',
    ],
    summary:
      'The current public procurement framework for goods, infrastructure projects, and consulting services by national government agencies, GOCCs, GFIs, SUCs, and LGUs.',
    obligations: [
      'Identify the procuring entity, procurement mode, approved budget, funding source, and accountable BAC or procurement office.',
      'Check planning, publication, eligibility, technical and financial evaluation, post-qualification, award, contract implementation, and records requirements.',
      'Use alternative procurement methods only when the draft states the allowed condition, approval, documentation, and transparency controls.',
      'Address conflicts of interest, supplier eligibility, bid security, performance security, contract variation, inspection, acceptance, and audit trails.',
    ],
    commonGaps: [
      'Procurement is authorized without a procurement plan, BAC role, or approved budget control.',
      'Alternative procurement is allowed without conditions, approvals, or publication safeguards.',
      'Supplier eligibility, conflicts of interest, contract monitoring, and acceptance records are missing.',
    ],
  },
  {
    id: 'ra-11032',
    statute: 'RA 11032',
    title: 'Republic Act No. 11032',
    shortTitle: 'Ease of Doing Business and Efficient Government Service Delivery Act of 2018',
    year: 2018,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2018/ra_11032_2018.html',
    aliases: ['ra 11032', 'republic act 11032', 'ease of doing business', 'efficient government service delivery', 'anti red tape'],
    topics: ['government service', 'permits', 'licenses', 'citizens charter', 'processing time', 'anti-red tape'],
    keywords: [
      'citizen charter',
      'processing time',
      'simple transaction',
      'complex transaction',
      'highly technical transaction',
      'one stop shop',
      'automatic approval',
      'complete staff work',
      'anti red tape authority',
    ],
    summary:
      'A government service delivery law requiring clear citizen-facing requirements, transaction processing times, accountability, and anti-red-tape controls.',
    obligations: [
      'State the exact service, application requirements, receiving office, decision maker, fees, and processing time classification.',
      'Align permits, licenses, clearances, and certifications with citizen charter, one-stop shop, completeness, and action-period rules.',
      'Include written denial or deficiency notices, escalation, accountability, recordkeeping, and public-facing service standards.',
      'Avoid creating open-ended approval steps, undocumented requirements, or repeated submissions outside the published service flow.',
    ],
    commonGaps: [
      'Permit or license requirements are listed without processing time, receiving office, or citizen charter controls.',
      'The draft allows discretionary extra requirements after filing.',
      'No recordkeeping, escalation, or written denial procedure is provided.',
    ],
  },
  {
    id: 'ra-10175',
    statute: 'RA 10175',
    title: 'Republic Act No. 10175',
    shortTitle: 'Cybercrime Prevention Act of 2012',
    year: 2012,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2012/ra_10175_2012.html',
    aliases: [
      'ra 10175',
      'republic act 10175',
      'cybercrime prevention act',
      'cybercrime',
      'computer data',
      'computer system',
      'cyber offense',
    ],
    topics: [
      'cybercrime',
      'computer systems',
      'online fraud',
      'system access',
      'electronic evidence',
      'incident response',
      'content related offenses',
    ],
    keywords: [
      'illegal access',
      'data interference',
      'system interference',
      'computer related fraud',
      'computer related forgery',
      'content related offense',
      'traffic data',
      'service provider',
      'cyber warrant',
      'cybersquatting',
      'identity theft',
      'cybersex',
      'online libel',
      'phishing',
      'preservation order',
    ],
    summary:
      'A cybercrime law covering offenses against computer systems and data, computer-related fraud or forgery, content-related offenses, enforcement powers, preservation of computer data, and electronic evidence concerns.',
    obligations: [
      'For digital enforcement, define prohibited system access, data misuse, fraud, forgery, preservation, reporting, and referral pathways.',
      'Coordinate cyber incident language with privacy, electronic records, evidence preservation, and authorized law-enforcement processes.',
      'Keep investigation, monitoring, takedown, and data-preservation powers tied to lawful authority and due process.',
      'Avoid broad surveillance or device-inspection language without clear scope, approval, safeguards, and records.',
      'Separate internal incident response from criminal investigation, and preserve chain-of-custody for logs, traffic data, accounts, and system records.',
    ],
    commonGaps: [
      'Cybersecurity duties are stated without incident reporting, evidence preservation, or referral procedure.',
      'Online fraud or account compromise is mentioned without system-access and data-protection safeguards.',
      'Monitoring powers are broad and lack authority, scope, or due-process controls.',
      'Electronic evidence, logs, and account records are collected without chain-of-custody or privacy coordination.',
    ],
  },
  {
    id: 'ra-9775',
    statute: 'RA 9775',
    title: 'Republic Act No. 9775',
    shortTitle: 'Anti-Child Pornography Act of 2009',
    year: 2009,
    sourceName: 'Supreme Court E-Library',
    sourceUrl: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/2/16874',
    aliases: [
      'ra 9775',
      'republic act 9775',
      'anti child pornography act',
      'online child protection',
      'child online safety',
      'child sexual exploitation material',
      'csam',
    ],
    topics: [
      'child protection',
      'online safety',
      'internet service provider',
      'internet content host',
      'internet cafe',
      'reporting',
      'confidentiality',
    ],
    keywords: [
      'child protection',
      'minor',
      'grooming',
      'luring',
      'pandering',
      'internet cafe',
      'internet kiosk',
      'internet content host',
      'isp',
      'pnp',
      'nbi',
      'dswd',
      'evidence preservation',
      'blocking',
      'filtering',
      'confidential record',
      'victim privacy',
    ],
    summary:
      'A child-protection law penalizing child exploitation material and related online conduct, with reporting, evidence-preservation, confidentiality, and coordination duties for ISPs, content hosts, establishments, and local authorities.',
    obligations: [
      'For online child-safety policies, define reporting channels, responsible officer, referral to PNP/NBI/DSWD or local social welfare, and victim confidentiality controls.',
      'Preserve evidence without public disclosure, protect child identity, and limit access to authorized investigators, prosecutors, and support personnel.',
      'For internet cafes, kiosks, platforms, content hosts, or service providers, state blocking, filtering, notice, takedown, and law-enforcement coordination workflows.',
      'Avoid public posting, informal evidence sharing, or disciplinary processes that reveal a child victim or expose sensitive material.',
    ],
    commonGaps: [
      'Online child-safety rules mention reporting but omit confidentiality and victim-protection controls.',
      'Digital evidence may be copied or shared without preservation, chain-of-custody, or authorized access limits.',
      'Internet cafe, platform, or content-host duties are created without referral, takedown, filtering, or documentation steps.',
    ],
  },
  {
    id: 'ra-9160',
    statute: 'RA 9160',
    title: 'Republic Act No. 9160',
    shortTitle: 'Anti-Money Laundering Act of 2001',
    year: 2001,
    sourceName: 'Anti-Money Laundering Council',
    sourceUrl: 'https://www.amlc.gov.ph/laws/money-laundering/2015-10-16-02-50-56/republic-act-9160',
    aliases: [
      'ra 9160',
      'republic act 9160',
      'anti money laundering act',
      'amla',
      'amlc',
      'money laundering',
      'covered persons',
    ],
    topics: [
      'anti money laundering',
      'financial compliance',
      'covered transaction',
      'suspicious transaction',
      'customer due diligence',
      'recordkeeping',
      'beneficial ownership',
    ],
    keywords: [
      'aml',
      'kyc',
      'know your customer',
      'customer due diligence',
      'covered transaction report',
      'ctr',
      'suspicious transaction report',
      'str',
      'beneficial owner',
      'source of funds',
      'remittance',
      'money service business',
      'casino',
      'bank',
      'financial institution',
      'freeze order',
      'record retention',
      'risk assessment',
    ],
    summary:
      'The core Philippine anti-money laundering law creating money-laundering offenses and compliance expectations around covered persons, customer due diligence, transaction monitoring, covered and suspicious transaction reporting, recordkeeping, and AMLC coordination.',
    obligations: [
      'Identify whether the actor is a covered person or financial intermediary and map the customer due diligence, beneficial-owner, source-of-funds, and recordkeeping duties.',
      'Separate covered transaction reports, suspicious transaction reports, internal escalation, confidentiality, and AMLC-facing reporting timelines.',
      'Include risk assessment, sanctions or watchlist screening where relevant, transaction monitoring, audit trail, and staff training.',
      'Avoid public disclosure or tipping-off language when handling suspicious transaction review, escalation, or reporting.',
    ],
    commonGaps: [
      'AML language references money laundering but omits customer due diligence, beneficial ownership, or source-of-funds checks.',
      'Transaction monitoring is required without covered/suspicious transaction reporting workflow or responsible compliance officer.',
      'Records, audit trail, confidentiality, and AMLC coordination are not specified.',
    ],
  },
  {
    id: 'ra-7394',
    statute: 'RA 7394',
    title: 'Republic Act No. 7394',
    shortTitle: 'Consumer Act of the Philippines',
    year: 1992,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1992/ra_7394_1992.html',
    aliases: ['ra 7394', 'republic act 7394', 'consumer act', 'consumer protection', 'consumer products'],
    topics: ['consumer protection', 'product safety', 'labeling', 'warranty', 'advertising', 'consumer complaints'],
    keywords: [
      'product standards',
      'label',
      'packaging',
      'warranty',
      'deceptive sales',
      'consumer complaint',
      'price tag',
      'advertising',
      'redress',
    ],
    summary:
      'A consumer protection law for product quality and safety, deceptive or unfair sales practices, labeling, warranties, advertising, and consumer redress.',
    obligations: [
      'For consumer-facing products or services, check labeling, product standards, safety warnings, warranties, pricing, and complaint handling.',
      'Separate consumer education, inspection, enforcement, recall or correction, and redress procedures.',
      'Review advertising, online sales, promos, fees, and representations for deceptive, unfair, or misleading terms.',
      'Coordinate sector-specific consumer rules with DTI or other competent regulators where the draft assigns local roles.',
    ],
    commonGaps: [
      'Consumer complaint handling is missing or not assigned to an accountable office.',
      'Labeling, warranty, product safety, pricing, or advertising rules are too general.',
      'Enforcement duties are created without redress, correction, or regulator coordination.',
    ],
  },
  {
    id: 'ra-10667',
    statute: 'RA 10667',
    title: 'Republic Act No. 10667',
    shortTitle: 'Philippine Competition Act',
    year: 2015,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2015/ra_10667_2015.html',
    aliases: ['ra 10667', 'republic act 10667', 'philippine competition act', 'competition law', 'antitrust'],
    topics: ['competition', 'antitrust', 'market conduct', 'mergers', 'cartel', 'abuse of dominance'],
    keywords: [
      'anti competitive agreement',
      'cartel',
      'price fixing',
      'bid rigging',
      'market allocation',
      'abuse of dominant position',
      'merger review',
      'pcc',
      'competition compliance',
    ],
    summary:
      'A competition policy statute prohibiting anti-competitive agreements, abuse of dominant position, and anti-competitive mergers or acquisitions, with Philippine Competition Commission oversight.',
    obligations: [
      'Check whether pricing, bidding, exclusivity, market allocation, supplier restrictions, or platform rules could restrain competition.',
      'Separate legitimate quality, safety, procurement, or service standards from rules that favor particular suppliers or restrict market entry.',
      'For mergers, joint ventures, concessions, or exclusive arrangements, include competition review, conflict checks, and documentation of objective criteria.',
      'Avoid creating local licensing or procurement preferences that function like cartel, bid-rigging, or abuse-of-dominance controls.',
    ],
    commonGaps: [
      'Exclusive supplier or distributor language lacks objective justification.',
      'Procurement or licensing rules may restrict entry without competition review.',
      'Price, territory, or market coordination risks are not addressed.',
    ],
  },
  {
    id: 'ra-11765',
    statute: 'RA 11765',
    title: 'Republic Act No. 11765',
    shortTitle: 'Financial Products and Services Consumer Protection Act',
    year: 2022,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2022/ra_11765_2022.html',
    aliases: [
      'ra 11765',
      'republic act 11765',
      'financial products and services consumer protection act',
      'financial consumer protection',
      'financial services consumer protection',
    ],
    topics: ['financial consumer protection', 'lending', 'payments', 'fraud', 'complaints', 'client data'],
    keywords: [
      'financial consumer',
      'financial service provider',
      'disclosure',
      'transparent pricing',
      'unauthorized transaction',
      'fraud',
      'complaint handling',
      'cooling off',
      'client data',
      'market conduct',
    ],
    summary:
      'A financial consumer protection framework covering market conduct, disclosure, responsible pricing, fraud response, complaint handling, and protection of financial consumer assets and data.',
    obligations: [
      'For lending, payment, wallet, remittance, insurance, investment, or cooperative credit workflows, state clear disclosures, fees, terms, and complaint routes.',
      'Include controls for fraud, unauthorized transactions, client-data protection, dispute resolution, and timely consumer assistance.',
      'Separate financial consumer rights, provider responsibilities, regulator coordination, and recordkeeping for complaints or remediation.',
      'Avoid vague consent, hidden fees, one-sided changes, or complaint rules that leave consumers without escalation.',
    ],
    commonGaps: [
      'Fees, rates, penalties, or product risks are not clearly disclosed.',
      'Unauthorized transactions and fraud complaints have no response timeline.',
      'Financial consumer data and complaint records are handled without accountability controls.',
    ],
  },
  {
    id: 'ra-6969',
    statute: 'RA 6969',
    title: 'Republic Act No. 6969',
    shortTitle: 'Toxic Substances and Hazardous and Nuclear Wastes Control Act of 1990',
    year: 1990,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1990/ra_6969_1990.html',
    aliases: [
      'ra 6969',
      'republic act 6969',
      'toxic substances and hazardous and nuclear wastes control act',
      'hazardous waste law',
      'toxic substances control',
    ],
    topics: ['environment', 'hazardous waste', 'toxic substances', 'chemicals', 'waste transport', 'denr'],
    keywords: [
      'chemical',
      'toxic substance',
      'hazardous waste',
      'nuclear waste',
      'storage',
      'transport',
      'treatment',
      'disposal',
      'manifest',
      'denr',
      'emb',
    ],
    summary:
      'A chemicals and hazardous-waste control law addressing importation, manufacture, processing, handling, storage, transport, treatment, and disposal of toxic substances and hazardous or nuclear wastes.',
    obligations: [
      'Identify covered chemicals, toxic substances, hazardous wastes, handlers, generators, transporters, storage areas, and disposal routes.',
      'Require permits or registrations, labeling, manifests, emergency response, worker safety, spill reporting, and DENR or EMB coordination.',
      'Separate ordinary solid waste from hazardous waste, special waste, medical waste, chemical waste, and prohibited nuclear waste.',
      'Avoid authorizing dumping, storage, transfer, or disposal without chain-of-custody and approved treatment or disposal controls.',
    ],
    commonGaps: [
      'Hazardous waste is mentioned but no generator, transporter, storage, treatment, or manifest workflow is stated.',
      'Chemical handling lacks labeling, safety, spill, or emergency controls.',
      'DENR or EMB coordination is missing for regulated toxic substances.',
    ],
  },
  {
    id: 'ra-11285',
    statute: 'RA 11285',
    title: 'Republic Act No. 11285',
    shortTitle: 'Energy Efficiency and Conservation Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11285_2019.html',
    aliases: ['ra 11285', 'republic act 11285', 'energy efficiency and conservation act', 'energy efficiency', 'energy conservation'],
    topics: ['energy efficiency', 'energy conservation', 'buildings', 'energy audit', 'energy management'],
    keywords: [
      'energy audit',
      'energy conservation officer',
      'energy management',
      'designated establishment',
      'building energy',
      'fuel efficiency',
      'doe',
      'energy report',
      'efficiency standard',
    ],
    summary:
      'A framework for energy efficiency and conservation across public and private sectors, including energy management, conservation plans, audits, reporting, and efficient technologies.',
    obligations: [
      'Check whether facilities, buildings, fleets, equipment, or public offices need energy-efficiency targets, audits, or conservation plans.',
      'Assign an energy conservation officer or responsible unit where the activity is energy-intensive or facility-based.',
      'Include measurement, reporting, procurement of efficient equipment, maintenance, and DOE-facing coordination where relevant.',
      'Avoid generic sustainability commitments without baseline energy use, owner, timetable, and verification method.',
    ],
    commonGaps: [
      'Energy-saving measures have no baseline, audit, responsible officer, or reporting cadence.',
      'Equipment procurement does not consider efficiency standards or lifecycle operating cost.',
      'Public building or facility duties lack monitoring and maintenance accountability.',
    ],
  },
  {
    id: 'ra-11934',
    statute: 'RA 11934',
    title: 'Republic Act No. 11934',
    shortTitle: 'SIM Registration Act',
    year: 2022,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2022/ra_11934_2022.html',
    aliases: ['ra 11934', 'republic act 11934', 'sim registration act', 'sim card registration', 'subscriber identity module registration'],
    topics: ['telecommunications', 'sim registration', 'identity verification', 'privacy', 'fraud prevention'],
    keywords: [
      'sim',
      'subscriber identity module',
      'telco',
      'ptelecommunication entity',
      'mobile number',
      'text scam',
      'identity verification',
      'deactivation',
      'registration data',
      'law enforcement request',
    ],
    summary:
      'A telecommunications identity-verification law requiring SIM registration and controls relevant to mobile-number accountability, fraud prevention, privacy, and deactivation workflows.',
    obligations: [
      'For SIM, mobile-number, OTP, or telco workflows, state identity-verification, consent, registration-data protection, and deactivation controls.',
      'Separate ordinary account support from law-enforcement disclosure, subpoena, warrant, or authorized-request handling.',
      'Include fraud-reporting, text-scam response, retention, access controls, breach coordination, and user assistance.',
      'Avoid collecting more identity data than needed or sharing registration data without lawful authority and audit trail.',
    ],
    commonGaps: [
      'Mobile-number collection has no verification, retention, or privacy safeguards.',
      'Law-enforcement access to SIM or subscriber data is not tied to lawful process.',
      'Deactivation, reactivation, correction, and complaint handling are missing.',
    ],
  },
  {
    id: 'ra-9995',
    statute: 'RA 9995',
    title: 'Republic Act No. 9995',
    shortTitle: 'Anti-Photo and Video Voyeurism Act of 2009',
    year: 2010,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2010/ra_9995_2010.html',
    aliases: ['ra 9995', 'republic act 9995', 'anti photo and video voyeurism act', 'photo and video voyeurism', 'voyeurism law'],
    topics: ['privacy', 'image abuse', 'intimate media', 'online safety', 'consent'],
    keywords: [
      'photo',
      'video',
      'intimate image',
      'voyeurism',
      'recording',
      'distribution',
      'broadcast',
      'upload',
      'consent',
      'privacy',
      'takedown',
    ],
    summary:
      'A privacy and dignity statute penalizing non-consensual capture, copying, reproduction, sharing, publication, broadcast, or exhibition of covered private images or videos.',
    obligations: [
      'For image, CCTV, media, social platform, or complaint workflows, define consent, restricted access, storage, takedown, confidentiality, and evidence handling.',
      'Separate ordinary photo/video documentation from intimate or private-image handling and disclosure controls.',
      'Include victim-protection, reporting, preservation, authorized review, and lawful referral steps.',
      'Avoid public disclosure, forwarding, or broad staff access to sensitive media used as complaint evidence.',
    ],
    commonGaps: [
      'Photo or video evidence is collected without consent, confidentiality, takedown, or access controls.',
      'Complaint workflows allow unnecessary disclosure of private media.',
      'Evidence preservation is not separated from public communication or discipline.',
    ],
  },
  {
    id: 'ra-7877',
    statute: 'RA 7877',
    title: 'Republic Act No. 7877',
    shortTitle: 'Anti-Sexual Harassment Act of 1995',
    year: 1995,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1995/ra_7877_1995.html',
    aliases: ['ra 7877', 'republic act 7877', 'anti sexual harassment act', 'sexual harassment law', 'work education training harassment'],
    topics: ['sexual harassment', 'workplace', 'education', 'training', 'complaints', 'discipline'],
    keywords: [
      'sexual harassment',
      'authority',
      'influence',
      'moral ascendancy',
      'employment',
      'education',
      'training',
      'committee on decorum',
      'codi',
      'disciplinary action',
    ],
    summary:
      'A statute declaring work, education, and training-related sexual harassment unlawful, with employer or institution duties to prevent, investigate, and address complaints.',
    obligations: [
      'For workplaces, schools, and training programs, define prohibited conduct, complaint intake, investigation, confidentiality, and non-retaliation.',
      'Assign a committee or responsible body for decorum, investigation, recommendation, and recordkeeping.',
      'Coordinate RA 7877 workplace or education duties with broader Safe Spaces Act controls where applicable.',
      'Protect complainants, witnesses, and respondents through fair process, documentation, and escalation routes.',
    ],
    commonGaps: [
      'Harassment policy bans conduct but does not create a complaint and investigation body.',
      'Confidentiality, non-retaliation, due process, and recordkeeping are missing.',
      'Training, education, or workplace scope is unclear.',
    ],
  },
  {
    id: 'ra-10627',
    statute: 'RA 10627',
    title: 'Republic Act No. 10627',
    shortTitle: 'Anti-Bullying Act of 2013',
    year: 2013,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2013/ra_10627_2013.html',
    aliases: ['ra 10627', 'republic act 10627', 'anti bullying act', 'school bullying', 'cyberbullying'],
    topics: ['education', 'bullying', 'cyberbullying', 'student safety', 'school policy'],
    keywords: [
      'bullying',
      'cyberbullying',
      'school policy',
      'student discipline',
      'child protection',
      'reporting',
      'intervention',
      'parents',
      'deped',
      'school administrator',
    ],
    summary:
      'A school-safety law requiring elementary and secondary schools to adopt policies to prevent and address bullying, including cyberbullying and school-related incidents.',
    obligations: [
      'For school or student-safety rules, define bullying, cyberbullying, reporting channels, investigation, intervention, and parent or guardian notice.',
      'Separate victim support, discipline, restorative measures, referral, confidentiality, and recordkeeping.',
      'Include school-wide prevention, staff training, student orientation, monitoring, and escalation to appropriate authorities.',
      'Avoid punishment-only language without reporting, support, due process, and anti-retaliation safeguards.',
    ],
    commonGaps: [
      'Bullying policy lacks reporting, investigation, intervention, or parent-notice steps.',
      'Cyberbullying is mentioned without digital evidence and privacy safeguards.',
      'Victim support, discipline, and referral roles are unclear.',
    ],
  },
  {
    id: 'ra-10863',
    statute: 'RA 10863',
    title: 'Republic Act No. 10863',
    shortTitle: 'Customs Modernization and Tariff Act',
    year: 2016,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2016/ra_10863_2016.html',
    aliases: ['ra 10863', 'republic act 10863', 'customs modernization and tariff act', 'cmta', 'customs law', 'tariff act'],
    topics: ['customs', 'importation', 'exportation', 'tariff', 'valuation', 'border control'],
    keywords: [
      'import',
      'export',
      'tariff',
      'customs duties',
      'valuation',
      'classification',
      'declaration',
      'broker',
      'bonded warehouse',
      'seizure',
      'forfeiture',
    ],
    summary:
      'A customs and tariff framework for importation, exportation, valuation, classification, duties and taxes, customs brokers, bonded operations, enforcement, and post-clearance controls.',
    obligations: [
      'For imported or exported goods, define declaration, valuation, classification, duties, taxes, permits, broker responsibility, and record retention.',
      'Separate customs clearance, warehousing, transport, inspection, seizure, forfeiture, and appeal procedures.',
      'Coordinate product-specific rules with customs, tax, health, agriculture, environment, or trade regulators as needed.',
      'Avoid allowing goods movement, disposal, or release without documentation, audit trail, and accountable office.',
    ],
    commonGaps: [
      'Import or export workflow omits customs declaration, valuation, classification, or permit checks.',
      'Goods release or disposal is allowed without records, accountability, or appeal path.',
      'Tariff, duties, taxes, and bonded-warehouse controls are not addressed.',
    ],
  },
  {
    id: 'ra-11976',
    statute: 'RA 11976',
    title: 'Republic Act No. 11976',
    shortTitle: 'Ease of Paying Taxes Act',
    year: 2024,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2024/ra_11976_2024.html',
    aliases: ['ra 11976', 'republic act 11976', 'ease of paying taxes act', 'eopt', 'taxpayer rights'],
    topics: ['tax administration', 'bir', 'taxpayer rights', 'invoicing', 'filing', 'payment'],
    keywords: [
      'tax',
      'taxpayer',
      'bir',
      'invoice',
      'receipt',
      'vat',
      'filing',
      'payment',
      'withholding',
      'registration',
      'tax return',
      'taxpayer classification',
    ],
    summary:
      'A tax-administration reform law modernizing taxpayer registration, invoicing, filing, payment, classification, and taxpayer rights under the National Internal Revenue Code framework.',
    obligations: [
      'For tax, fee, invoice, receipt, VAT, withholding, or payment workflows, identify taxpayer classification, registration, filing, payment, and recordkeeping controls.',
      'Separate tax compliance from permit fees, service charges, penalties, and ordinary accounting procedures.',
      'Include invoice or receipt handling, correction, retention, taxpayer assistance, and BIR-facing responsibilities where relevant.',
      'Avoid creating local or platform payment workflows that obscure tax treatment, official receipts, or taxpayer rights.',
    ],
    commonGaps: [
      'Payment or fee collection omits invoice, receipt, taxpayer, or tax-record treatment.',
      'Tax filing and payment duties are assigned without responsible office or timeline.',
      'VAT, withholding, and record retention are not addressed for taxable transactions.',
    ],
  },
  {
    id: 'ra-11055',
    statute: 'RA 11055',
    title: 'Republic Act No. 11055',
    shortTitle: 'Philippine Identification System Act',
    year: 2018,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2018/ra_11055_2018.html',
    aliases: ['ra 11055', 'republic act 11055', 'philippine identification system act', 'philsys', 'national id', 'philid'],
    topics: ['identity', 'national id', 'philsys', 'personal data', 'government services', 'authentication'],
    keywords: [
      'philid',
      'psn',
      'pcn',
      'national id',
      'identity verification',
      'authentication',
      'psa',
      'proof of identity',
      'demographic data',
      'biometric information',
    ],
    summary:
      'A national identity framework establishing PhilSys as proof of identity for citizens and resident aliens, with data-governance, authentication, privacy, and service-delivery implications.',
    obligations: [
      'For national ID, PhilID, PSN, PCN, or identity-verification workflows, state purpose, minimum data, authentication method, retention, and access controls.',
      'Coordinate identity handling with RA 10173 privacy duties, especially for biometric, demographic, and government-ID data.',
      'Include correction, assistance, alternative proof, service access, audit logs, and authorized disclosure controls.',
      'Avoid denying essential services solely because of missing PhilID where another lawful identity route should be available.',
    ],
    commonGaps: [
      'National ID collection lacks purpose, retention, access-control, or privacy safeguards.',
      'Identity verification has no alternative process, correction route, or audit trail.',
      'PSN, PCN, PhilID, or biometric data is exposed beyond what the workflow requires.',
    ],
  },
  {
    id: 'ra-11038',
    statute: 'RA 11038',
    title: 'Republic Act No. 11038',
    shortTitle: 'Expanded National Integrated Protected Areas System Act of 2018',
    year: 2018,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2018/ra_11038_2018.html',
    aliases: [
      'ra 11038',
      'republic act 11038',
      'expanded national integrated protected areas system act',
      'enipas',
      'protected areas',
      'nipas',
    ],
    topics: ['environment', 'protected areas', 'biodiversity', 'land use', 'buffer zone', 'pamb'],
    keywords: [
      'protected area',
      'buffer zone',
      'pamb',
      'biodiversity',
      'strict protection',
      'multiple use zone',
      'ecotourism',
      'special use agreement',
      'denr',
      'indigenous peoples',
    ],
    summary:
      'A protected-area management law expanding the National Integrated Protected Areas System and requiring safeguards for biodiversity, zoning, management boards, buffer zones, and regulated activities.',
    obligations: [
      'For land use, tourism, construction, extraction, or livelihood activities near protected areas, check zoning, PAMB role, DENR authorization, and allowed uses.',
      'Include biodiversity safeguards, buffer-zone controls, monitoring, community consultation, indigenous peoples coordination, and restoration duties.',
      'Separate LGU permitting from protected-area management approvals, environmental assessment, and regulator coordination.',
      'Avoid authorizing development, extraction, or resource use in protected areas without zoning, board approval, and mitigation controls.',
    ],
    commonGaps: [
      'Protected-area or buffer-zone activity lacks PAMB, DENR, zoning, or biodiversity controls.',
      'Tourism or livelihood rules omit carrying capacity, restoration, and monitoring.',
      'LGU permits are treated as enough even when protected-area approvals may be required.',
    ],
  },
  {
    id: 'pd-442',
    statute: 'PD 442',
    title: 'Presidential Decree No. 442',
    shortTitle: 'Labor Code of the Philippines',
    year: 1974,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/presdecs/pd1974/pd_442_1974.html',
    aliases: ['pd 442', 'presidential decree 442', 'labor code', 'labor code of the philippines', 'employment law'],
    topics: ['labor', 'employment', 'wages', 'working conditions', 'termination', 'labor standards', 'dole'],
    keywords: [
      'wage',
      'minimum wage',
      'overtime',
      'holiday pay',
      'rest day',
      'hours of work',
      'employment contract',
      'just cause',
      'authorized cause',
      'termination',
      'labor standards',
      'dole',
      'nlrc',
    ],
    summary:
      'The core employment and labor standards framework covering working conditions, wages, hours, employment relations, termination concepts, and labor enforcement institutions.',
    obligations: [
      'For employee policies, identify worker classification, hours of work, pay, benefits, rest periods, leave, workplace rules, and recordkeeping. ',
      'Separate disciplinary rules, termination procedure, notice requirements, and grievance handling from ordinary performance management.',
      'Coordinate labor-standard, occupational-safety, discrimination, harassment, and privacy duties when workplace policies process employee data.',
      'Avoid treating employees, contractors, trainees, volunteers, or platform workers as interchangeable without classification analysis.',
    ],
    commonGaps: [
      'Employment duties are created without pay, hours, classification, records, or grievance details.',
      'Discipline or dismissal language lacks notice, hearing, documentation, or appeal route.',
      'Contractor or trainee policies may function like employment rules without labor-standard safeguards.',
    ],
  },
  {
    id: 'ra-10911',
    statute: 'RA 10911',
    title: 'Republic Act No. 10911',
    shortTitle: 'Anti-Age Discrimination in Employment Act',
    year: 2016,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2016/ra_10911_2016.html',
    aliases: ['ra 10911', 'republic act 10911', 'anti age discrimination', 'age discrimination employment'],
    topics: ['labor', 'employment', 'hiring', 'discrimination', 'age', 'recruitment'],
    keywords: [
      'age requirement',
      'age limit',
      'job advertisement',
      'employment application',
      'hiring',
      'promotion',
      'training',
      'compensation',
      'dismissal',
      'retirement',
      'bona fide occupational qualification',
    ],
    summary:
      'An employment law prohibiting unreasonable age discrimination in job advertisements, hiring, promotion, compensation, training, dismissal, and employment terms.',
    obligations: [
      'Review job posts, hiring criteria, promotion, training, benefits, and dismissal rules for age-based exclusions.',
      'Use ability, qualification, safety, licensing, or bona fide occupational requirements instead of unsupported age cutoffs.',
      'Document why any age-related criterion is legally necessary and proportionate to the role.',
      'Coordinate age-discrimination controls with broader labor, safe-spaces, and workplace privacy policies.',
    ],
    commonGaps: [
      'Job posts include age caps without objective role justification.',
      'Promotion, training, or benefit rules exclude workers by age without necessity analysis.',
      'Hiring data collects age but does not state purpose, retention, or equal-opportunity safeguards.',
    ],
  },
  {
    id: 'ra-11036',
    statute: 'RA 11036',
    title: 'Republic Act No. 11036',
    shortTitle: 'Mental Health Act',
    year: 2018,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2018/ra_11036_2018.html',
    aliases: ['ra 11036', 'republic act 11036', 'mental health act', 'mental health care'],
    topics: ['health', 'mental health', 'workplace', 'school', 'privacy', 'patient rights'],
    keywords: [
      'mental health',
      'psychosocial',
      'counseling',
      'patient rights',
      'informed consent',
      'confidentiality',
      'referral',
      'crisis intervention',
      'workplace mental health',
      'school mental health',
    ],
    summary:
      'A mental-health framework recognizing service access, patient rights, informed consent, confidentiality, community care, workplace programs, and school-based mental-health support.',
    obligations: [
      'For workplace, school, barangay, or health programs, state consent, confidentiality, referral, emergency, and non-discrimination safeguards.',
      'Separate peer support, counseling, clinical treatment, emergency intervention, and disciplinary processes.',
      'Protect mental-health records as sensitive information and limit disclosure to authorized care or safety channels.',
      'Avoid mandatory disclosure or punitive treatment of mental-health concerns without rights, consent, and safety controls.',
    ],
    commonGaps: [
      'Mental-health support is announced without consent, confidentiality, referral, or crisis protocol.',
      'Employee or student wellness records are handled without privacy and access limits.',
      'Policies conflate discipline, safety intervention, counseling, and medical treatment.',
    ],
  },
  {
    id: 'ra-9262',
    statute: 'RA 9262',
    title: 'Republic Act No. 9262',
    shortTitle: 'Anti-Violence Against Women and Their Children Act of 2004',
    year: 2004,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2004/ra_9262_2004.html',
    aliases: ['ra 9262', 'republic act 9262', 'vawc', 'violence against women and children'],
    topics: ['protection', 'women', 'children', 'domestic violence', 'barangay protection order', 'confidentiality'],
    keywords: [
      'violence against women',
      'violence against children',
      'vawc',
      'protection order',
      'barangay protection order',
      'temporary protection order',
      'safety plan',
      'confidentiality',
      'referral',
      'social welfare',
    ],
    summary:
      'A protection law addressing violence against women and their children, including protection orders, safety, confidentiality, support, and referral mechanisms.',
    obligations: [
      'For VAWC intake, assistance, or barangay response, state safety assessment, protection-order handling, referral, confidentiality, and documentation controls.',
      'Separate emergency assistance, social welfare support, legal referral, law-enforcement referral, and record custody.',
      'Protect victim identity, child information, addresses, and case details from unnecessary disclosure.',
      'Avoid mediation or public exposure workflows that can endanger complainants or children.',
    ],
    commonGaps: [
      'Protection-order or referral workflows lack confidentiality and safety planning.',
      'Victim records are collected without restricted access and retention controls.',
      'Complaint handling is assigned without role separation among barangay, social welfare, and law enforcement.',
    ],
  },
  {
    id: 'ra-10364',
    statute: 'RA 10364',
    title: 'Republic Act No. 10364',
    shortTitle: 'Expanded Anti-Trafficking in Persons Act of 2012',
    year: 2013,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2013/ra_10364_2013.html',
    aliases: ['ra 10364', 'republic act 10364', 'expanded anti trafficking', 'anti trafficking in persons'],
    topics: ['trafficking', 'recruitment', 'labor exploitation', 'online exploitation', 'victim protection'],
    keywords: [
      'trafficking',
      'recruitment',
      'transport',
      'harboring',
      'forced labor',
      'sexual exploitation',
      'online exploitation',
      'victim protection',
      'referral',
      'recovery',
      'confidentiality',
    ],
    summary:
      'A human-trafficking framework covering recruitment, transport, harboring, exploitation, online-facilitated trafficking, victim protection, confidentiality, and enforcement coordination.',
    obligations: [
      'For recruitment, placement, travel, shelter, online work, or protection workflows, screen for coercion, exploitation, deception, debt, and vulnerability indicators.',
      'State referral, rescue, recovery, confidentiality, child protection, social welfare, and law-enforcement coordination controls.',
      'Separate victim support from evidence handling, investigation, immigration, labor, and prosecution workflows.',
      'Avoid publishing victim details, requiring repeated disclosure, or using complaint procedures that expose complainants to retaliation.',
    ],
    commonGaps: [
      'Recruitment or placement controls do not screen for exploitation, coercion, or debt-bondage risks.',
      'Victim support and law-enforcement referral are not separated from ordinary complaint intake.',
      'Case records lack confidentiality, child protection, and authorized-disclosure safeguards.',
    ],
  },
  {
    id: 'ra-8293',
    statute: 'RA 8293',
    title: 'Republic Act No. 8293',
    shortTitle: 'Intellectual Property Code of the Philippines',
    year: 1997,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1997/ra_8293_1997.html',
    aliases: ['ra 8293', 'republic act 8293', 'intellectual property code', 'copyright law', 'trademark law', 'patent law'],
    topics: ['intellectual property', 'copyright', 'trademark', 'patent', 'licensing', 'software', 'brand'],
    keywords: [
      'copyright',
      'trademark',
      'patent',
      'industrial design',
      'utility model',
      'trade name',
      'software',
      'license',
      'assignment',
      'infringement',
      'fair use',
      'ipo',
    ],
    summary:
      'The core intellectual-property framework covering patents, trademarks, copyright, related rights, licensing, ownership, enforcement, and IP Office processes.',
    obligations: [
      'For software, content, brand, logo, dataset, training material, or product design workflows, identify ownership, license, permitted use, attribution, and transfer terms.',
      'Separate copyright, trademark, patent, trade name, and confidentiality issues instead of using one generic IP clause.',
      'Include takedown, complaint, preservation, and authorization checks for user-generated or third-party content.',
      'Avoid assuming public availability means free commercial reuse or model-training permission.',
    ],
    commonGaps: [
      'Content, software, logo, or dataset use lacks ownership and license proof.',
      'Brand and copyright issues are merged without separate trademark and copyright analysis.',
      'User uploads or generated content have no takedown, attribution, or infringement complaint path.',
    ],
  },
  {
    id: 'ra-8799',
    statute: 'RA 8799',
    title: 'Republic Act No. 8799',
    shortTitle: 'Securities Regulation Code',
    year: 2000,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2000/ra_8799_2000.html',
    aliases: ['ra 8799', 'republic act 8799', 'securities regulation code', 'securities law'],
    topics: ['securities', 'investment', 'capital markets', 'public offering', 'broker', 'dealer', 'sec'],
    keywords: [
      'securities',
      'investment contract',
      'public offering',
      'registration statement',
      'prospectus',
      'broker',
      'dealer',
      'exchange',
      'insider trading',
      'market manipulation',
      'investor protection',
      'sec',
    ],
    summary:
      'A securities-market framework for securities registration, public offerings, brokers, dealers, exchanges, investor protection, market manipulation, and SEC oversight.',
    obligations: [
      'For investment, token, share, note, crowdfunding, cooperative investment, or public solicitation workflows, check whether securities, registration, exemption, or SEC licensing issues arise.',
      'State investor disclosures, risk warnings, suitability, recordkeeping, complaint handling, advertising controls, and prohibited representations.',
      'Separate ordinary sales, lending, donations, memberships, and investment contracts before publishing an offer.',
      'Avoid return promises, pooled-fund language, or referral commissions without securities-law review.',
    ],
    commonGaps: [
      'Investment or fundraising materials lack registration, exemption, or SEC review path.',
      'Risk disclosures, refund limits, investor complaints, and advertising controls are missing.',
      'Referral, commission, or guaranteed-return language creates securities risk without safeguards.',
    ],
  },
  {
    id: 'ra-9711',
    statute: 'RA 9711',
    title: 'Republic Act No. 9711',
    shortTitle: 'Food and Drug Administration Act of 2009',
    year: 2009,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2009/ra_9711_2009.html',
    aliases: ['ra 9711', 'republic act 9711', 'fda act', 'food and drug administration act'],
    topics: ['health products', 'food', 'drug', 'cosmetic', 'medical device', 'labeling', 'recall'],
    keywords: [
      'food',
      'drug',
      'cosmetic',
      'medical device',
      'health product',
      'fda',
      'registration',
      'labeling',
      'adverse event',
      'recall',
      'post marketing surveillance',
      'license to operate',
    ],
    summary:
      'A health-product regulation framework strengthening FDA authority over foods, drugs, cosmetics, medical devices, health products, licensing, labeling, surveillance, and recalls.',
    obligations: [
      'For food, drug, cosmetic, supplement, device, or wellness-product workflows, identify FDA licensing, registration, labeling, claims, storage, distribution, and recall controls.',
      'Separate product safety, advertising claims, adverse-event reporting, customer complaints, and post-market surveillance.',
      'Coordinate consumer protection, e-commerce, privacy, and product-liability controls when health products are sold online.',
      'Avoid therapeutic, safety, or certification claims without source, registration, and review evidence.',
    ],
    commonGaps: [
      'Health products are sold or distributed without FDA registration, labeling, or license-to-operate checks.',
      'Recall, adverse-event, complaint, and post-market surveillance workflows are missing.',
      'Marketing claims exceed the documented registration, label, or approved use.',
    ],
  },
  {
    id: 'ra-11223',
    statute: 'RA 11223',
    title: 'Republic Act No. 11223',
    shortTitle: 'Universal Health Care Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11223_2019.html',
    aliases: ['ra 11223', 'republic act 11223', 'universal health care act', 'uhc act'],
    topics: ['health', 'public health', 'primary care', 'health system', 'philhealth', 'local health'],
    keywords: [
      'universal health care',
      'primary care',
      'health care provider network',
      'local health system',
      'philhealth',
      'patient navigation',
      'health service',
      'public health',
      'referral system',
      'health data',
    ],
    summary:
      'A health-system framework for population-based and individual-based health services, primary care, local health systems, PhilHealth integration, referral, and service access.',
    obligations: [
      'For local health programs, state service eligibility, referral pathway, responsible facility or network, privacy, patient navigation, and recordkeeping.',
      'Separate public-health functions, clinical care, financing, PhilHealth concerns, emergency referral, and local-government responsibilities.',
      'Coordinate health data, consent, confidentiality, and interoperability with privacy and mental-health safeguards.',
      'Avoid promising benefits, coverage, or access without identifying provider network, funding, implementation owner, and complaint route.',
    ],
    commonGaps: [
      'Health services are promised without referral, provider, funding, or eligibility controls.',
      'Patient or health records are processed without confidentiality and access safeguards.',
      'LGU health roles are unclear or not coordinated with provider networks and PhilHealth-related processes.',
    ],
  },
  {
    id: 'ra-11332',
    statute: 'RA 11332',
    title: 'Republic Act No. 11332',
    shortTitle: 'Mandatory Reporting of Notifiable Diseases and Health Events of Public Health Concern Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11332_2019.html',
    aliases: ['ra 11332', 'republic act 11332', 'mandatory reporting of notifiable diseases', 'notifiable diseases act'],
    topics: ['public health', 'disease reporting', 'health surveillance', 'notifiable disease', 'outbreak response'],
    keywords: [
      'notifiable disease',
      'public health concern',
      'mandatory reporting',
      'health event',
      'surveillance',
      'outbreak',
      'epidemic',
      'case investigation',
      'contact tracing',
      'quarantine',
      'health data',
      'doh',
      'local epidemiology',
    ],
    summary:
      'A public-health surveillance framework requiring mandatory reporting of notifiable diseases and health events of public health concern, with confidentiality, coordination, and outbreak-response implications.',
    obligations: [
      'For disease, outbreak, school, workplace, transport, facility, or community health-event workflows, state reportable event criteria, reporting office, timeline, data fields, case investigation, and referral path.',
      'Separate surveillance reporting from clinical care, quarantine, privacy, employment discipline, school attendance, public announcements, and emergency procurement.',
      'Protect patient identity, health status, contact-tracing data, location, exposure history, laboratory records, and outbreak reports with confidentiality and authorized-disclosure controls.',
      'Avoid public naming, informal lists, or delayed reporting when a notifiable disease or public-health event requires official coordination.',
    ],
    commonGaps: [
      'Disease-reporting policies mention outbreak alerts but omit reportable event criteria, timeline, responsible office, or DOH/LGU coordination.',
      'Contact-tracing and patient records are handled without confidentiality, retention, or disclosure limits.',
      'Public announcements, workplace rules, and school notices reveal health status without authority and safeguards.',
    ],
  },
  {
    id: 'ra-9211',
    statute: 'RA 9211',
    title: 'Republic Act No. 9211',
    shortTitle: 'Tobacco Regulation Act of 2003',
    year: 2003,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2003/ra_9211_2003.html',
    aliases: ['ra 9211', 'republic act 9211', 'tobacco regulation act', 'tobacco law'],
    topics: ['public health', 'tobacco', 'smoking', 'advertising', 'sales restrictions', 'public places'],
    keywords: [
      'tobacco',
      'smoking',
      'cigarette',
      'public place',
      'smoke free',
      'warning label',
      'advertising',
      'promotion',
      'sponsorship',
      'minor',
      'sale to minors',
      'designated smoking area',
      'health warning',
    ],
    summary:
      'A tobacco-control statute covering smoking restrictions, sales to minors, advertising and promotion controls, health warnings, public-place rules, and enforcement.',
    obligations: [
      'For tobacco sales, venues, events, advertisements, school or workplace rules, and public facilities, state age restrictions, smoking areas, signage, warnings, ad limits, complaint intake, and enforcement owner.',
      'Separate tobacco controls from vape products, sanitation, building safety, consumer protection, labor discipline, event permits, and public-health messaging.',
      'Keep inspection, complaint, warning, advertising, sale, and enforcement records with due-process and privacy safeguards.',
      'Avoid tobacco promotion or venue policies that omit minors, public-place restrictions, signage, and enforcement documentation.',
    ],
    commonGaps: [
      'Smoking policies omit age restrictions, signage, designated areas, complaint handling, or enforcement process.',
      'Tobacco advertising and sponsorship are approved without material review and recordkeeping.',
      'School, event, workplace, and venue rules do not distinguish tobacco from vape or other public-health restrictions.',
    ],
  },
  {
    id: 'ra-11900',
    statute: 'RA 11900',
    title: 'Republic Act No. 11900',
    shortTitle: 'Vaporized Nicotine and Non-Nicotine Products Regulation Act',
    year: 2022,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2022/ra_11900_2022.html',
    aliases: ['ra 11900', 'republic act 11900', 'vape law', 'vaporized nicotine law', 'vapor products regulation act'],
    topics: ['public health', 'vape', 'vapor products', 'nicotine', 'sales restrictions', 'advertising'],
    keywords: [
      'vape',
      'vapor product',
      'vaporized nicotine',
      'non nicotine product',
      'heated tobacco product',
      'e cigarette',
      'nicotine',
      'age verification',
      'online sale',
      'flavor',
      'packaging',
      'health warning',
      'advertising',
      'promotion',
    ],
    summary:
      'A regulatory framework for vaporized nicotine, non-nicotine, and heated tobacco products, including age restrictions, product standards, packaging, warnings, online sales, advertising, and enforcement.',
    obligations: [
      'For vape or heated-tobacco sales, online marketplaces, stores, marketing, events, and school/workplace policies, state product classification, age verification, packaging and warning checks, permitted sales channel, advertising limits, and complaint route.',
      'Separate vape controls from tobacco, FDA health products, consumer protection, e-commerce, school discipline, and local public-health enforcement.',
      'Protect customer age-verification records, complaint records, product listings, advertising approvals, takedown requests, and enforcement records with privacy and retention controls.',
      'Avoid selling or advertising vape products without age-gating, product review, warning, platform, and recordkeeping controls.',
    ],
    commonGaps: [
      'Vape policies mention age limits but omit product classification, packaging, warnings, online sales, or advertising controls.',
      'Online sales collect IDs without access, retention, or deletion rules.',
      'Vape and tobacco rules are merged without product-specific restrictions and enforcement records.',
    ],
  },
  {
    id: 'ra-11166',
    statute: 'RA 11166',
    title: 'Republic Act No. 11166',
    shortTitle: 'Philippine HIV and AIDS Policy Act',
    year: 2018,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2018/ra_11166_2018.html',
    aliases: ['ra 11166', 'republic act 11166', 'philippine hiv and aids policy act', 'hiv aids law'],
    topics: ['public health', 'hiv', 'aids', 'testing', 'counseling', 'confidentiality'],
    keywords: [
      'hiv',
      'aids',
      'hiv testing',
      'counseling',
      'confidentiality',
      'informed consent',
      'anti discrimination',
      'treatment',
      'referral',
      'partner notification',
      'health record',
      'minors',
    ],
    summary:
      'A rights-sensitive HIV and AIDS framework covering education, testing, counseling, consent, treatment referral, confidentiality, anti-discrimination, and health-record safeguards.',
    obligations: [
      'For HIV education, screening, testing, workplace, school, clinic, or community programs, state voluntary testing, counseling, consent, referral, confidentiality, anti-discrimination, and record-access controls.',
      'Separate HIV health handling from general medical records, employment fitness, insurance, school discipline, contact tracing, and public-health reporting.',
      'Protect HIV status, test results, counseling notes, referrals, partner notification records, and treatment records with strict confidentiality and disclosure rules.',
      'Avoid mandatory testing, public disclosure, exclusion, or employment/school decisions without the specific legal safeguards required for HIV-related information.',
    ],
    commonGaps: [
      'HIV policies mention testing but omit consent, counseling, referral, confidentiality, or anti-discrimination controls.',
      'HIV status is handled as ordinary health data without stricter access and disclosure limits.',
      'Workplace or school rules create exclusion or reporting risks without rights-sensitive safeguards.',
    ],
  },
  {
    id: 'ra-10152',
    statute: 'RA 10152',
    title: 'Republic Act No. 10152',
    shortTitle: 'Mandatory Infants and Children Health Immunization Act of 2011',
    year: 2011,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2011/ra_10152_2011.html',
    aliases: ['ra 10152', 'republic act 10152', 'mandatory infants and children health immunization act', 'immunization law'],
    topics: ['public health', 'immunization', 'children', 'vaccination', 'health records'],
    keywords: [
      'immunization',
      'vaccination',
      'infants',
      'children',
      'child health',
      'vaccine',
      'health center',
      'parent',
      'guardian',
      'immunization card',
      'school entry',
      'health record',
    ],
    summary:
      'A child-health immunization framework covering infants and children, vaccination access, parent or guardian coordination, health-center records, and immunization documentation.',
    obligations: [
      'For child immunization, school-entry, daycare, clinic, barangay health, or outreach workflows, state eligible child, parent or guardian role, vaccine record, referral, missed-dose follow-up, and record custodian.',
      'Separate immunization records from general school records, child-protection files, medical treatment, public-health reporting, and benefit eligibility.',
      'Protect child identity, parent/guardian records, vaccine history, immunization cards, refusal notes, referral records, and clinic logs with access and retention safeguards.',
      'Avoid denying unrelated services or exposing child health status without authority, referral path, and privacy controls.',
    ],
    commonGaps: [
      'Child vaccination policies omit parent/guardian handling, record owner, missed-dose follow-up, or referral route.',
      'Immunization records are collected by schools or barangays without privacy and retention rules.',
      'Vaccine status is used for eligibility decisions without clear legal basis and due process.',
    ],
  },
  {
    id: 'ra-7719',
    statute: 'RA 7719',
    title: 'Republic Act No. 7719',
    shortTitle: 'National Blood Services Act of 1994',
    year: 1994,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1994/ra_7719_1994.html',
    aliases: ['ra 7719', 'republic act 7719', 'national blood services act', 'blood services law'],
    topics: ['public health', 'blood services', 'blood donation', 'blood bank', 'health facilities'],
    keywords: [
      'blood services',
      'blood donation',
      'blood donor',
      'blood bank',
      'blood collection',
      'blood screening',
      'transfusion',
      'voluntary blood donation',
      'health facility',
      'donor record',
      'testing',
      'confidentiality',
    ],
    summary:
      'A blood-services framework covering voluntary blood donation, blood collection, screening, blood banks, transfusion safety, donor records, and health-facility coordination.',
    obligations: [
      'For blood donation drives, clinics, emergency response, health facilities, or donor databases, state donor eligibility, consent, screening, collection site, referral, blood-bank coordination, and records custodian.',
      'Separate blood-donation records from ordinary volunteer lists, employee wellness, emergency contact, laboratory, HIV, privacy, and public-event records.',
      'Protect donor identity, screening results, test results, medical history, donation logs, referral records, and adverse reaction reports with confidentiality and retention controls.',
      'Avoid informal blood drives without licensed or authorized health-facility coordination, screening, consent, and record safeguards.',
    ],
    commonGaps: [
      'Blood donation programs omit donor eligibility, consent, screening, facility coordination, or adverse-reaction handling.',
      'Donor and test records are handled like ordinary volunteer records.',
      'Emergency blood assistance lacks referral, custody, and confidentiality controls.',
    ],
  },
  {
    id: 'ra-11215',
    statute: 'RA 11215',
    title: 'Republic Act No. 11215',
    shortTitle: 'National Integrated Cancer Control Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11215_2019.html',
    aliases: ['ra 11215', 'republic act 11215', 'national integrated cancer control act', 'cancer control law'],
    topics: ['public health', 'cancer control', 'patient navigation', 'health services', 'registry'],
    keywords: [
      'cancer control',
      'cancer patient',
      'screening',
      'early detection',
      'diagnosis',
      'treatment',
      'palliative care',
      'patient navigation',
      'cancer registry',
      'survivorship',
      'referral',
      'health record',
    ],
    summary:
      'A cancer-control framework covering prevention, screening, early detection, diagnosis, treatment, palliative care, patient navigation, registries, and health-service coordination.',
    obligations: [
      'For cancer screening, patient assistance, registry, referral, navigation, or awareness programs, state eligibility, screening limits, referral pathway, patient navigator, data fields, consent, and records custodian.',
      'Separate cancer registries from general health records, PhilHealth or benefit administration, workplace wellness, charity assistance, public announcements, and research datasets.',
      'Protect diagnosis, screening results, treatment status, registry data, referral records, financial assistance files, and patient-navigation notes with confidentiality and retention controls.',
      'Avoid promising diagnosis, treatment access, or benefits without provider referral, eligibility, funding, consent, and complaint route.',
    ],
    commonGaps: [
      'Cancer programs mention screening or assistance but omit eligibility, referral, patient navigation, and records custody.',
      'Registry and diagnosis records are handled without consent, confidentiality, or retention controls.',
      'Awareness campaigns make health claims without referral or provider coordination safeguards.',
    ],
  },
  {
    id: 'ra-10354',
    statute: 'RA 10354',
    title: 'Republic Act No. 10354',
    shortTitle: 'Responsible Parenthood and Reproductive Health Act of 2012',
    year: 2012,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2012/ra_10354_2012.html',
    aliases: ['ra 10354', 'republic act 10354', 'responsible parenthood and reproductive health act', 'rh law'],
    topics: ['public health', 'reproductive health', 'family planning', 'maternal health', 'health services'],
    keywords: [
      'reproductive health',
      'responsible parenthood',
      'family planning',
      'maternal health',
      'prenatal',
      'postnatal',
      'informed choice',
      'counseling',
      'adolescent health',
      'privacy',
      'referral',
      'health service',
    ],
    summary:
      'A reproductive-health framework covering responsible parenthood, family planning, maternal health, informed choice, counseling, referral, access to services, and sensitive health records.',
    obligations: [
      'For reproductive-health, family-planning, maternal-health, school, workplace, or barangay health programs, state service scope, counseling, informed choice, referral, provider role, privacy, and complaint route.',
      'Separate reproductive-health counseling from general benefits, school discipline, employment decisions, religious or values education, medical treatment, and public-health reporting.',
      'Protect reproductive-health records, counseling notes, referrals, pregnancy or maternal health data, adolescent records, and service-access records with confidentiality and retention controls.',
      'Avoid coercive, discriminatory, or disclosure-heavy reproductive-health workflows without consent, provider referral, and rights-sensitive safeguards.',
    ],
    commonGaps: [
      'Family-planning or reproductive-health programs omit counseling, informed choice, referral, privacy, and complaint handling.',
      'Maternal or adolescent health records are handled without confidentiality and restricted access.',
      'Program materials promise services or benefits without provider coordination and eligibility controls.',
    ],
  },
  {
    id: 'ra-10066',
    statute: 'RA 10066',
    title: 'Republic Act No. 10066',
    shortTitle: 'National Cultural Heritage Act of 2009',
    year: 2010,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2010/ra_10066_2010.html',
    aliases: ['ra 10066', 'republic act 10066', 'national cultural heritage act', 'cultural heritage law'],
    topics: ['cultural heritage', 'historic sites', 'heritage buildings', 'archives', 'museum', 'conservation'],
    keywords: [
      'cultural property',
      'heritage',
      'historic site',
      'heritage zone',
      'conservation',
      'restoration',
      'excavation',
      'national museum',
      'nhcp',
      'ncca',
      'archives',
    ],
    summary:
      'A cultural-heritage framework covering cultural property, heritage zones, conservation, restoration, documentation, museums, archives, and cultural-agency coordination.',
    obligations: [
      'For heritage buildings, sites, artifacts, archives, monuments, excavation, or tourism projects, identify cultural-property status and responsible heritage agencies.',
      'State conservation, documentation, consultation, permits, expert review, emergency protection, and restoration standards.',
      'Separate ordinary building permits, tourism promotion, land-use approvals, and cultural-property approvals.',
      'Avoid demolition, alteration, relocation, excavation, or commercialization without heritage review and records.',
    ],
    commonGaps: [
      'Heritage, archive, or cultural-site projects lack NCCA, NHCP, National Museum, or archive coordination.',
      'Conservation standards, documentation, and expert review are missing.',
      'Local permits are treated as enough even when cultural-property approvals may be required.',
    ],
  },
  {
    id: 'ra-9994',
    statute: 'RA 9994',
    title: 'Republic Act No. 9994',
    shortTitle: 'Expanded Senior Citizens Act of 2010',
    year: 2010,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2010/ra_9994_2010.html',
    aliases: ['ra 9994', 'republic act 9994', 'expanded senior citizens act', 'senior citizens act'],
    topics: ['senior citizens', 'social welfare', 'discounts', 'health', 'accessibility', 'benefits'],
    keywords: [
      'senior citizen',
      'osca',
      'discount',
      'vat exemption',
      'social pension',
      'health services',
      'privileges',
      'identification card',
      'benefits',
      'elderly',
    ],
    summary:
      'A senior-citizen welfare framework covering privileges, discounts, VAT exemptions, health and social services, identification, and local senior-citizen support mechanisms.',
    obligations: [
      'For senior-citizen benefits, services, IDs, discounts, or local programs, state eligibility, documentary requirements, OSCA or local office role, privacy, and complaint route.',
      'Separate social services, commercial discount handling, tax treatment, health services, and fraud-prevention controls.',
      'Protect senior-citizen identity, health, financial, and benefit records with access and retention safeguards.',
      'Avoid broad benefit promises without funding, implementing office, eligibility, and verification process.',
    ],
    commonGaps: [
      'Senior-citizen benefits lack eligibility, office ownership, verification, or complaint process.',
      'Discount and VAT-exemption workflows are mixed with ordinary promotions or subsidies.',
      'Personal, health, or benefit records are collected without privacy safeguards.',
    ],
  },
  {
    id: 'ra-7277',
    statute: 'RA 7277',
    title: 'Republic Act No. 7277',
    shortTitle: 'Magna Carta for Disabled Persons',
    year: 1992,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1992/ra_7277_1992.html',
    aliases: ['ra 7277', 'republic act 7277', 'magna carta for disabled persons', 'pwd law', 'persons with disability'],
    topics: ['persons with disability', 'accessibility', 'employment', 'education', 'health', 'social welfare'],
    keywords: [
      'person with disability',
      'pwd',
      'reasonable accommodation',
      'accessibility',
      'rehabilitation',
      'auxiliary aid',
      'disability',
      'equal opportunity',
      'employment',
      'education',
      'health services',
    ],
    summary:
      'A disability-rights framework covering equal opportunity, accessibility, employment, education, health, rehabilitation, auxiliary services, and social participation of persons with disabilities.',
    obligations: [
      'For PWD services, facilities, employment, education, transport, health, or digital access, state accessibility, accommodation, eligibility, responsible office, and complaint controls.',
      'Separate reasonable accommodation, benefit verification, facility accessibility, health or rehabilitation support, and privacy safeguards.',
      'Coordinate disability records with privacy, health, labor, building, and service-delivery rules.',
      'Avoid requiring unnecessary disability details or medical records beyond the stated purpose and authority.',
    ],
    commonGaps: [
      'PWD access or benefit rules lack accommodation, accessibility, and complaint mechanisms.',
      'Disability records are collected without purpose, confidentiality, or retention limits.',
      'Facilities, forms, or online workflows are created without accessible alternatives.',
    ],
  },
  {
    id: 'pd-1096',
    statute: 'PD 1096',
    title: 'Presidential Decree No. 1096',
    shortTitle: 'National Building Code of the Philippines',
    year: 1977,
    sourceName: 'Supreme Court E-Library',
    sourceUrl: 'https://elibrary.judiciary.gov.ph/thebookshelf/showdocs/11/53320',
    aliases: [
      'pd 1096',
      'presidential decree 1096',
      'national building code',
      'building code of the philippines',
      'building permit',
      'occupancy permit',
    ],
    topics: ['building', 'construction', 'occupancy', 'permits', 'structural safety', 'zoning'],
    keywords: [
      'building permit',
      'occupancy permit',
      'construction',
      'renovation',
      'structural',
      'architectural',
      'electrical',
      'mechanical',
      'sanitary',
      'fire safety',
      'zoning',
      'building official',
    ],
    summary:
      'A national building-control framework for construction, alteration, repair, occupancy, building permits, inspections, and minimum safety standards for buildings and structures.',
    obligations: [
      'For construction, fit-out, renovation, occupancy, or facility-use policies, identify permit, plan review, inspection, occupancy, and building-official responsibilities.',
      'Coordinate building, fire, accessibility, sanitation, zoning, environmental, and occupational-safety requirements before authorizing use.',
      'Separate design approval, construction monitoring, final inspection, occupancy, maintenance, and violation response.',
      'Avoid allowing public use of facilities without occupancy, safety, accessibility, and emergency controls.',
    ],
    commonGaps: [
      'Construction or facility-use rules lack building permit, inspection, or occupancy controls.',
      'Fire, accessibility, sanitation, and structural requirements are treated as optional add-ons.',
      'The responsible building official, inspection record, or stop-use process is not named.',
    ],
  },
  {
    id: 'pd-856',
    statute: 'PD 856',
    title: 'Presidential Decree No. 856',
    shortTitle: 'Code on Sanitation of the Philippines',
    year: 1975,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/presdecs/pd1975/pd_856_1975.html',
    aliases: [
      'pd 856',
      'presidential decree 856',
      'code on sanitation',
      'sanitation code',
      'sanitary permit',
      'health certificate',
      'food establishment sanitation',
    ],
    topics: ['sanitation', 'public health', 'food establishments', 'water supply', 'wastewater', 'public facilities'],
    keywords: [
      'sanitary permit',
      'health certificate',
      'food establishment',
      'water supply',
      'sewage',
      'septage',
      'vermin control',
      'public toilet',
      'market sanitation',
      'health officer',
      'inspection',
    ],
    summary:
      'A public-health sanitation framework covering sanitary permits, food establishments, markets, water supply, sewage, refuse, public facilities, health certificates, and sanitation inspections.',
    obligations: [
      'For food, market, school, lodging, workplace, event, or public-facility operations, identify sanitary permits, health certificates, inspection cadence, and health-office roles.',
      'Separate potable water, food handling, toilet, sewage, refuse, pest-control, disease-prevention, and closure or correction workflows.',
      'Coordinate sanitation controls with consumer protection, FDA, clean water, solid waste, building, and occupational-safety requirements.',
      'Avoid opening facilities or events without sanitation inspection, correction orders, records, and complaint handling.',
    ],
    commonGaps: [
      'Food or public-facility policies lack sanitary permit, health certificate, or inspection details.',
      'Water, toilet, sewage, refuse, and pest controls are not separated.',
      'Closure, correction, and appeal procedures are missing for sanitation violations.',
    ],
  },
  {
    id: 'bp-344',
    statute: 'BP 344',
    title: 'Batas Pambansa Blg. 344',
    shortTitle: 'Accessibility Law',
    year: 1983,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/bataspam/bp1983/bp_344_1983.html',
    aliases: ['bp 344', 'batas pambansa 344', 'accessibility law', 'accessibility for disabled persons'],
    topics: ['accessibility', 'buildings', 'transport', 'persons with disability', 'public facilities'],
    keywords: [
      'accessibility',
      'ramps',
      'parking',
      'public building',
      'transportation',
      'disabled persons',
      'barrier free',
      'architectural facilities',
      'signage',
      'accessible route',
    ],
    summary:
      'A barrier-free accessibility framework requiring buildings, institutions, establishments, and public utilities to provide facilities and features for persons with disabilities.',
    obligations: [
      'For buildings, service desks, transport, schools, clinics, halls, and public facilities, identify accessible routes, ramps, signs, parking, counters, toilets, and assistance features.',
      'Coordinate accessibility with PWD rights, building permits, fire safety, sanitation, public service, and digital-channel alternatives.',
      'Separate permanent accessibility features from temporary assistance or ad hoc staff discretion.',
      'Avoid launching public-facing facilities without an accessibility check and complaint path.',
    ],
    commonGaps: [
      'Facility rules mention PWD access but omit concrete ramps, routes, toilets, parking, signs, or service counters.',
      'Accessibility is handled as staff assistance instead of built-in design and process controls.',
      'Building, event, and service plans lack accessibility inspection and correction ownership.',
    ],
  },
  {
    id: 'ra-7610',
    statute: 'RA 7610',
    title: 'Republic Act No. 7610',
    shortTitle: 'Special Protection of Children Against Abuse, Exploitation and Discrimination Act',
    year: 1992,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1992/ra_7610_1992.html',
    aliases: ['ra 7610', 'republic act 7610', 'special protection of children', 'child abuse law'],
    topics: ['child protection', 'abuse', 'exploitation', 'discrimination', 'schools', 'social welfare'],
    keywords: [
      'child abuse',
      'exploitation',
      'discrimination',
      'child protection',
      'neglect',
      'working child',
      'child trafficking',
      'reporting',
      'confidentiality',
      'social welfare',
      'mandatory reporting',
    ],
    summary:
      'A child-protection statute covering abuse, exploitation, discrimination, child labor risks, protective custody, reporting, and coordination with social-welfare and law-enforcement mechanisms.',
    obligations: [
      'For programs involving minors, state consent, supervision, abuse-reporting, referral, confidentiality, safe recruitment, child-labor, and victim-support safeguards.',
      'Separate school discipline, social welfare, law-enforcement referral, medical support, and child-protection record handling.',
      'Coordinate with online child safety, anti-trafficking, privacy, bullying, and VAWC controls when child data or complaints are involved.',
      'Avoid exposing child identity, requiring repeated disclosure, or handling abuse complaints through ordinary customer-service channels.',
    ],
    commonGaps: [
      'Minor-facing programs lack child-protection reporting, referral, and confidentiality controls.',
      'Child records, photos, or complaints are handled without restricted access.',
      'School, event, or platform policies do not distinguish discipline from abuse or exploitation response.',
    ],
  },
  {
    id: 'ra-8042',
    statute: 'RA 8042',
    title: 'Republic Act No. 8042',
    shortTitle: 'Migrant Workers and Overseas Filipinos Act of 1995',
    year: 1995,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1995/ra_8042_1995.html',
    aliases: ['ra 8042', 'republic act 8042', 'migrant workers act', 'overseas filipinos act', 'ofw law'],
    topics: ['migrant workers', 'overseas employment', 'recruitment', 'placement', 'worker protection'],
    keywords: [
      'migrant worker',
      'overseas filipino',
      'ofw',
      'recruitment',
      'placement agency',
      'illegal recruitment',
      'employment contract',
      'repatriation',
      'welfare assistance',
      'deployment',
    ],
    summary:
      'A migrant-worker protection framework covering overseas employment, recruitment, placement, illegal recruitment, worker welfare, repatriation, legal assistance, and agency coordination.',
    obligations: [
      'For recruitment, referral, training, placement, or OFW assistance programs, state licensing, contract, fee, verification, complaint, and welfare-referral controls.',
      'Separate local job matching, overseas placement, illegal recruitment reporting, trafficking risk, repatriation, and legal assistance workflows.',
      'Protect worker identity, passport, contract, family, financial, and complaint records.',
      'Avoid collecting placement fees, promising overseas jobs, or publishing recruitment offers without verification and lawful agency coordination.',
    ],
    commonGaps: [
      'Overseas job or training offers lack agency licensing, contract verification, and fee controls.',
      'Illegal recruitment and trafficking risks are not screened separately.',
      'Worker welfare, complaint, repatriation, and record-confidentiality workflows are missing.',
    ],
  },
  {
    id: 'ra-10022',
    statute: 'RA 10022',
    title: 'Republic Act No. 10022',
    shortTitle: 'Amendments to the Migrant Workers and Overseas Filipinos Act',
    year: 2010,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2010/ra_10022_2010.html',
    aliases: ['ra 10022', 'republic act 10022', 'migrant workers amendment', 'amended ofw law'],
    topics: ['migrant workers', 'overseas employment', 'recruitment', 'worker protection', 'repatriation'],
    keywords: [
      'migrant worker',
      'ofw',
      'overseas employment',
      'recruitment agency',
      'illegal recruitment',
      'deployment',
      'repatriation',
      'legal assistance',
      'employment contract',
      'welfare fund',
      'overseas filipino',
    ],
    summary:
      'A major amendment to the Migrant Workers and Overseas Filipinos Act, relevant to overseas employment protections, illegal recruitment controls, repatriation, legal assistance, and agency accountability.',
    obligations: [
      'For OFW deployment, recruitment, referral, training, or assistance programs, align license verification, contract review, fee restrictions, repatriation, welfare, and complaint routing with the amended migrant-worker framework.',
      'Separate recruitment compliance from trafficking, immigration, labor, welfare, embassy or consular assistance, and local complaint workflows.',
      'Protect passport, contract, contact, remittance, family, complaint, and repatriation records with access, confidentiality, retention, and authorized-disclosure rules.',
      'Avoid stale OFW checklists that cite RA 8042 but omit amended deployment, illegal-recruitment, welfare, and repatriation safeguards.',
    ],
    commonGaps: [
      'OFW workflows cite the Migrant Workers Act but omit amended complaint, repatriation, legal-assistance, or welfare controls.',
      'Recruitment records and passports are collected without confidentiality, retention, or handoff safeguards.',
      'Illegal recruitment risk is not screened separately from ordinary job matching or training.',
    ],
  },
  {
    id: 'ra-11641',
    statute: 'RA 11641',
    title: 'Republic Act No. 11641',
    shortTitle: 'Department of Migrant Workers Act',
    year: 2021,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2021/ra_11641_2021.html',
    aliases: ['ra 11641', 'republic act 11641', 'department of migrant workers act', 'dmw act', 'dmw law'],
    topics: ['migrant workers', 'department of migrant workers', 'ofw assistance', 'overseas employment', 'worker protection'],
    keywords: [
      'department of migrant workers',
      'dmw',
      'ofw',
      'migrant worker',
      'overseas employment',
      'one reintegration center',
      'repatriation',
      'legal assistance',
      'welfare',
      'case management',
      'employment contract',
      'licensed recruitment',
    ],
    summary:
      'A statute creating the Department of Migrant Workers, relevant to overseas Filipino worker assistance, case management, recruitment coordination, repatriation, welfare, and agency handoffs.',
    obligations: [
      'For OFW-facing services, identify DMW or related agency coordination, case intake, referral, repatriation, welfare, legal-assistance, and data-sharing boundaries.',
      'Separate DMW assistance from immigration, passport, labor, trafficking, embassy or consular, local government, and private recruitment workflows.',
      'Protect OFW identity, passport, contract, employer, family, financial, complaint, and welfare case records with access and retention controls.',
      'Avoid promising agency action, deployment clearance, repatriation, or assistance without naming the responsible office and referral process.',
    ],
    commonGaps: [
      'OFW assistance workflows mention help or referral but omit DMW coordination, case owner, and escalation path.',
      'Worker case files are shared across offices without access, confidentiality, or retention rules.',
      'Recruitment, repatriation, legal assistance, and welfare support are collapsed into one informal help desk.',
    ],
  },
  {
    id: 'ca-613',
    statute: 'CA 613',
    title: 'Commonwealth Act No. 613',
    shortTitle: 'Philippine Immigration Act of 1940',
    year: 1940,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/comacts/ca1940/ca_613_1940.html',
    aliases: ['ca 613', 'commonwealth act 613', 'philippine immigration act', 'immigration act of 1940'],
    topics: ['immigration', 'visa', 'alien registration', 'entry', 'exclusion', 'deportation'],
    keywords: [
      'immigration',
      'visa',
      'alien',
      'foreign national',
      'entry',
      'admission',
      'exclusion',
      'deportation',
      'stay',
      'overstay',
      'permit',
      'bureau of immigration',
      'registration',
      'arrival',
      'departure',
    ],
    summary:
      'The core immigration statute governing admission, exclusion, deportation, alien registration, visa or stay issues, and Bureau of Immigration-facing records.',
    obligations: [
      'For foreign-national, visa, entry, stay, overstay, exclusion, deportation, or alien-registration workflows, state the immigration status, responsible office, proof, notice, hearing or appeal route, and records custodian.',
      'Separate immigration status checks from employment, school, tourism, investment, passport, trafficking, criminal, privacy, and local permit workflows.',
      'Protect passports, visas, travel history, biometrics, immigration records, employer or sponsor files, and case evidence with strict access, retention, and authorized-disclosure rules.',
      'Avoid making admission, deportation, blacklist, or status conclusions without official verification and due-process safeguards.',
    ],
    commonGaps: [
      'Visa or foreign-national workflows ask for immigration papers but omit official verification, notice, hearing, appeal, or record custody.',
      'Immigration status checks are mixed with employment, housing, school, or local service eligibility without privacy safeguards.',
      'Passport, visa, arrival, departure, and alien-registration records are retained without purpose or access limits.',
    ],
  },
  {
    id: 'ca-473',
    statute: 'CA 473',
    title: 'Commonwealth Act No. 473',
    shortTitle: 'Revised Naturalization Law',
    year: 1939,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/comacts/ca1939/ca_473_1939.html',
    aliases: ['ca 473', 'commonwealth act 473', 'revised naturalization law', 'judicial naturalization'],
    topics: ['citizenship', 'naturalization', 'foreign national', 'petition', 'court records'],
    keywords: [
      'naturalization',
      'citizenship',
      'foreign national',
      'alien',
      'petition',
      'declaration of intention',
      'certificate of naturalization',
      'residence',
      'character',
      'court',
      'publication',
      'oath',
    ],
    summary:
      'A judicial naturalization framework covering citizenship petitions, qualifications, disqualifications, residence, proof, publication, hearing, oath, and certificate records.',
    obligations: [
      'For naturalization or citizenship-petition workflows, state the petition route, qualifications, disqualifications, residence proof, publication, hearing, oath, decision, and certificate handling.',
      'Separate judicial naturalization from administrative naturalization, dual citizenship, immigration status, passport issuance, civil registry, and identity verification.',
      'Protect applicant identity, family, residence, immigration, court, publication, oath, and certificate records with confidentiality and retention controls.',
      'Avoid treating naturalization as a simple ID update without proof, hearing, decision, oath, and record annotation safeguards.',
    ],
    commonGaps: [
      'Naturalization workflows omit qualification, disqualification, residence, publication, hearing, oath, or certificate steps.',
      'Citizenship records are processed without distinguishing judicial naturalization from administrative naturalization or reacquisition.',
      'Applicant identity, family, immigration, and court records lack access or retention rules.',
    ],
  },
  {
    id: 'ra-9139',
    statute: 'RA 9139',
    title: 'Republic Act No. 9139',
    shortTitle: 'Administrative Naturalization Law of 2000',
    year: 2001,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2001/ra_9139_2001.html',
    aliases: ['ra 9139', 'republic act 9139', 'administrative naturalization law', 'administrative naturalization'],
    topics: ['citizenship', 'administrative naturalization', 'foreign national', 'petition', 'naturalization'],
    keywords: [
      'administrative naturalization',
      'naturalization',
      'citizenship',
      'special committee',
      'petition',
      'publication',
      'hearing',
      'oath',
      'certificate of naturalization',
      'alien',
      'foreign national',
      'residence',
    ],
    summary:
      'An administrative naturalization framework for qualified foreign nationals born and residing in the Philippines, with petition, publication, hearing, oath, and certificate controls.',
    obligations: [
      'For administrative naturalization workflows, identify eligibility, filing body, petition documents, publication, notice, hearing, opposition, oath, certificate, and record update steps.',
      'Separate administrative naturalization from judicial naturalization, reacquired citizenship, immigration status, civil registry corrections, and passport issuance.',
      'Protect petition files, identity records, residence proof, family records, hearing records, opposition records, oath documents, and certificate data.',
      'Avoid issuing citizenship-status conclusions without tracking the correct naturalization route and official decision evidence.',
    ],
    commonGaps: [
      'Administrative naturalization workflows omit eligibility, publication, hearing, opposition, oath, or certificate handling.',
      'Naturalization and immigration status are treated as the same process.',
      'Petition and identity records are shared without confidentiality, retention, or correction safeguards.',
    ],
  },
  {
    id: 'ra-9225',
    statute: 'RA 9225',
    title: 'Republic Act No. 9225',
    shortTitle: 'Citizenship Retention and Re-acquisition Act of 2003',
    year: 2003,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2003/ra_9225_2003.html',
    aliases: ['ra 9225', 'republic act 9225', 'dual citizenship law', 'citizenship reacquisition act'],
    topics: ['citizenship', 'dual citizenship', 're-acquisition', 'retention', 'oath'],
    keywords: [
      'dual citizenship',
      'citizenship retention',
      'citizenship reacquisition',
      're-acquisition',
      'natural born filipino',
      'oath of allegiance',
      'derivative citizenship',
      'civil registry',
      'passport',
      'certificate',
      'consular',
    ],
    summary:
      'A citizenship retention and re-acquisition statute for natural-born Filipinos who became citizens of another country, with oath, derivative citizenship, consular, and record-handling implications.',
    obligations: [
      'For dual-citizenship or reacquisition workflows, state natural-born proof, foreign citizenship event, oath, certificate, derivative-child handling, consular or local filing route, and record update steps.',
      'Separate citizenship reacquisition from naturalization, immigration visa status, passport issuance, civil registry correction, tax, property, election, and benefits eligibility.',
      'Protect birth, naturalization, oath, foreign-citizenship, passport, certificate, derivative-child, and civil registry records with access and retention safeguards.',
      'Avoid assuming passport eligibility, voting, property, or benefit rights without checking the specific citizenship and record status involved.',
    ],
    commonGaps: [
      'Dual-citizenship workflows mention oath but omit natural-born proof, certificate, derivative-child records, or filing office.',
      'Citizenship status is used for passport, property, voting, or benefits without documenting record basis.',
      'Foreign citizenship, birth, and oath records are retained without access controls.',
    ],
  },
  {
    id: 'ra-11983',
    statute: 'RA 11983',
    title: 'Republic Act No. 11983',
    shortTitle: 'New Philippine Passport Act',
    year: 2024,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2024/ra_11983_2024.html',
    aliases: ['ra 11983', 'republic act 11983', 'new philippine passport act', 'passport law', 'philippine passport'],
    topics: ['passport', 'travel document', 'identity', 'dfa', 'citizenship', 'consular'],
    keywords: [
      'passport',
      'travel document',
      'dfa',
      'foreign affairs',
      'consular',
      'identity',
      'citizenship proof',
      'application',
      'renewal',
      'cancellation',
      'lost passport',
      'biometric',
      'personal data',
      'minor passport',
    ],
    summary:
      'The current Philippine passport framework covering passport applications, renewals, travel documents, citizenship proof, identity verification, cancellations, consular handling, and passport record safeguards.',
    obligations: [
      'For passport or travel-document workflows, identify applicant authority, citizenship proof, identity proof, minor or representative handling, DFA or consular route, issuance, renewal, cancellation, loss, and records custodian.',
      'Separate passport issuance from immigration visa, civil registry correction, dual citizenship, naturalization, overseas employment, and ordinary ID verification.',
      'Protect passport numbers, biometrics, photos, signatures, citizenship evidence, appointment records, minor records, travel documents, and consular records with strict access and retention safeguards.',
      'Avoid relying only on older passport-law templates when current passport issuance, renewal, cancellation, and record-protection rules matter.',
    ],
    commonGaps: [
      'Passport workflows request IDs and birth records but omit citizenship proof, applicant authority, minor safeguards, DFA route, cancellation, loss, or renewal handling.',
      'Passport and visa requirements are merged without distinguishing DFA and immigration processes.',
      'Passport numbers, biometrics, photos, and travel-document records are retained without access and retention limits.',
    ],
  },
  {
    id: 'ra-8239',
    statute: 'RA 8239',
    title: 'Republic Act No. 8239',
    shortTitle: 'Philippine Passport Act of 1996',
    year: 1996,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1996/ra_8239_1996.html',
    aliases: ['ra 8239', 'republic act 8239', 'philippine passport act of 1996', 'old passport law'],
    topics: ['passport', 'travel document', 'identity', 'dfa', 'citizenship'],
    keywords: [
      'passport',
      'travel document',
      'dfa',
      'foreign affairs',
      'citizenship',
      'identity',
      'application',
      'renewal',
      'lost passport',
      'travel document',
      'minor',
      'biometric',
    ],
    summary:
      'The prior Philippine Passport Act, useful for legacy document references and RA 8239 queries, but current passport workflows should be checked against the New Philippine Passport Act.',
    obligations: [
      'For legacy references to RA 8239, identify the passport issue, application or renewal record, DFA route, citizenship proof, identity proof, and whether current RA 11983 controls now apply.',
      'Separate historical passport-law citations from current passport issuance, immigration visa, citizenship, naturalization, and civil registry workflows.',
      'Protect passport application, identity, citizenship, photo, minor, and travel-document records with access and retention safeguards.',
      'Avoid using RA 8239 alone as the only authority for a current passport workflow without checking the newer passport framework.',
    ],
    commonGaps: [
      'Policies cite RA 8239 but omit a current-law check against RA 11983.',
      'Passport records are treated as ordinary ID copies without stricter privacy controls.',
      'Passport, visa, citizenship, and civil registry requirements are mixed together.',
    ],
  },
  {
    id: 'bp-881',
    statute: 'BP 881',
    title: 'Batas Pambansa Blg. 881',
    shortTitle: 'Omnibus Election Code of the Philippines',
    year: 1985,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/bataspam/bp1985/bp_881_1985.html',
    aliases: ['bp 881', 'batas pambansa 881', 'omnibus election code', 'election code'],
    topics: ['elections', 'comelec', 'campaign', 'voting', 'candidates', 'election offenses'],
    keywords: [
      'election',
      'comelec',
      'candidate',
      'campaign',
      'campaign period',
      'election offense',
      'vote buying',
      'polling place',
      'ballot',
      'watcher',
      'canvass',
      'election return',
      'proclamation',
      'public office',
    ],
    summary:
      'The core election code covering candidates, campaigns, voting, canvassing, election offenses, election-day procedures, and COMELEC-facing records.',
    obligations: [
      'For election-related workflows, state the election type, candidate or party role, COMELEC process, campaign period, voting or canvassing stage, prohibited acts, complaint route, and records custodian.',
      'Separate campaign activity, voter registration, automated election system records, public funds, government personnel, procurement, privacy, and public-service neutrality issues.',
      'Protect voter lists, ballots, election returns, canvass records, watcher records, complaint evidence, and candidate records with access, retention, and authorized-disclosure safeguards.',
      'Avoid treating election-period restrictions, campaign materials, public resources, and voter records as ordinary communications or events.',
    ],
    commonGaps: [
      'Election policies mention campaigns or voting but omit COMELEC process, election-period limits, prohibited acts, complaint route, and record custody.',
      'Public resources, personnel, venues, and communications are used near elections without neutrality and audit controls.',
      'Voter, ballot, canvass, watcher, and complaint records lack retention and access rules.',
    ],
  },
  {
    id: 'ra-8189',
    statute: 'RA 8189',
    title: 'Republic Act No. 8189',
    shortTitle: "Voter's Registration Act of 1996",
    year: 1996,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1996/ra_8189_1996.html',
    aliases: ['ra 8189', 'republic act 8189', "voter's registration act", 'voter registration law'],
    topics: ['elections', 'voter registration', 'comelec', 'voter records', 'registration board'],
    keywords: [
      'voter registration',
      'voter record',
      'registered voter',
      'comelec',
      'election registration board',
      'application for registration',
      'deactivation',
      'reactivation',
      'precinct',
      'biometrics',
      'voter list',
      'objection',
    ],
    summary:
      'A voter-registration framework covering registration applications, election registration boards, precinct records, voter lists, deactivation, reactivation, objections, and voter-record handling.',
    obligations: [
      'For voter registration or voter-record workflows, state eligibility, application route, proof, registration board role, precinct or locality, deactivation/reactivation route, objection process, and record custodian.',
      'Separate voter registration from campaign activities, ID verification, barangay residency, social benefits, privacy, election-day voting, and public records disclosure.',
      'Protect voter identity, address, biometrics, registration status, precinct assignment, objection files, and registration-board records with access and retention safeguards.',
      'Avoid using voter lists or registration status for non-election purposes without authority, purpose, redaction, and privacy controls.',
    ],
    commonGaps: [
      'Voter registration forms collect personal data but omit eligibility, board action, objection, deactivation, or appeal route.',
      'Voter lists are reused for assistance, outreach, or verification without purpose and access limits.',
      'Precinct, biometrics, and address records lack retention and authorized-disclosure rules.',
    ],
  },
  {
    id: 'ra-7166',
    statute: 'RA 7166',
    title: 'Republic Act No. 7166',
    shortTitle: 'Synchronized National and Local Elections Act',
    year: 1991,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1991/ra_7166_1991.html',
    aliases: ['ra 7166', 'republic act 7166', 'synchronized elections act', 'national and local elections act'],
    topics: ['elections', 'campaign finance', 'election returns', 'canvassing', 'campaign period'],
    keywords: [
      'synchronized elections',
      'national election',
      'local election',
      'campaign period',
      'election return',
      'canvass',
      'statement of contributions and expenditures',
      'soce',
      'campaign expenditure',
      'candidate',
      'watcher',
    ],
    summary:
      'A national and local election framework relevant to synchronized elections, campaign periods, election returns, canvassing, and statement of contributions and expenditures handling.',
    obligations: [
      'For national or local election workflows, map election period, candidate role, campaign expenses, SOCE records, election returns, canvass route, watcher access, and accountable custodian.',
      'Separate campaign finance, election-day operations, canvassing records, public funds, procurement, personnel neutrality, and ordinary event logistics.',
      'Protect contribution, expenditure, election-return, canvass, watcher, and candidate records with retention and authorized-disclosure controls.',
      'Avoid accepting campaign donations, expenses, materials, or logistics without recordkeeping, approval, and reporting ownership.',
    ],
    commonGaps: [
      'Campaign finance workflows omit contributions, expenses, SOCE owner, documentation, and retention.',
      'Election returns and canvass records are handled without custody and access rules.',
      'Campaign period, election-day, and ordinary public-event controls are mixed together.',
    ],
  },
  {
    id: 'ra-9006',
    statute: 'RA 9006',
    title: 'Republic Act No. 9006',
    shortTitle: 'Fair Election Act',
    year: 2001,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2001/ra_9006_2001.html',
    aliases: ['ra 9006', 'republic act 9006', 'fair election act', 'election propaganda law'],
    topics: ['elections', 'campaign materials', 'media', 'political advertising', 'election propaganda'],
    keywords: [
      'fair election',
      'campaign material',
      'election propaganda',
      'political advertisement',
      'poster',
      'print advertisement',
      'broadcast advertisement',
      'media time',
      'social media',
      'rally',
      'common poster area',
      'campaign disclosure',
    ],
    summary:
      'A campaign-material and political-advertising framework covering election propaganda, posters, print, broadcast, media time, and disclosure rules.',
    obligations: [
      'For campaign communications, state the candidate or party, material type, size or placement controls, media purchase, sponsorship disclosure, approval owner, publication period, and record retention.',
      'Separate campaign speech from government announcements, public-service advisories, procurement, platform content moderation, privacy, and ordinary marketing.',
      'Track posters, advertisements, social media assets, media contracts, invoices, approvals, takedown requests, and complaint evidence.',
      'Avoid publishing campaign content without sponsor disclosure, material classification, size/placement review, spending records, and election-period controls.',
    ],
    commonGaps: [
      'Campaign content policies omit sponsor disclosure, material limits, placement, media contract, and takedown controls.',
      'Government or organizational announcements are published during election periods without neutrality review.',
      'Digital campaign assets are not retained with approvals, invoices, and complaint records.',
    ],
  },
  {
    id: 'ra-8436',
    statute: 'RA 8436',
    title: 'Republic Act No. 8436',
    shortTitle: 'Automated Election System Act',
    year: 1997,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1997/ra_8436_1997.html',
    aliases: ['ra 8436', 'republic act 8436', 'automated election system act', 'automated elections law'],
    topics: ['elections', 'automated election system', 'vote counting', 'election technology', 'ballot data'],
    keywords: [
      'automated election',
      'automated election system',
      'vote counting',
      'counting machine',
      'election technology',
      'ballot data',
      'election returns',
      'transmission',
      'source code',
      'audit',
      'security',
    ],
    summary:
      'An automated election system framework covering election technology, counting, transmission, election returns, system security, and audit-sensitive election records.',
    obligations: [
      'For election technology or vote-counting workflows, state system scope, ballot or result data, access, custody, testing, audit, transmission, security, incident handling, and accountable office.',
      'Separate automated election system records from ordinary IT logs, voter registration, campaign materials, procurement, cybersecurity, privacy, and canvassing records.',
      'Protect source code, machine logs, ballot data, transmission records, result files, audit logs, and incident reports with strict custody and access controls.',
      'Avoid treating election technology as a normal software deployment without election-specific testing, audit, custody, and transparency safeguards.',
    ],
    commonGaps: [
      'Election technology plans omit testing, audit logs, custody, transmission, access control, and incident response.',
      'Automated election data is mixed with ordinary IT operations records.',
      'Ballot, result, source-code, and machine records lack security and retention controls.',
    ],
  },
  {
    id: 'ra-9369',
    statute: 'RA 9369',
    title: 'Republic Act No. 9369',
    shortTitle: 'Amendments to the Automated Election System Act',
    year: 2007,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2007/ra_9369_2007.html',
    aliases: ['ra 9369', 'republic act 9369', 'automated election system amendments', 'amended automated elections law'],
    topics: ['elections', 'automated election system', 'audit', 'election technology', 'electronic results'],
    keywords: [
      'automated election',
      'source code review',
      'random manual audit',
      'voter verified paper audit trail',
      'election returns',
      'transmission',
      'canvassing',
      'system audit',
      'election technology',
      'security',
      'comelec',
    ],
    summary:
      'An amendment to the automated election framework, relevant to updated election technology, audit, source code, transmission, canvassing, and security controls.',
    obligations: [
      'For automated election deployments or reviews, check current audit, source-code, transmission, canvassing, access, transparency, and security controls alongside the original AES law.',
      'Document system testing, audit owners, result transmission, machine custody, exception handling, and post-election records retention.',
      'Separate updated AES safeguards from general IT security, procurement, election propaganda, voter registration, and manual canvassing procedures.',
      'Avoid stale automated-election checklists that omit source-code review, audit, transparency, or updated result-transmission safeguards.',
    ],
    commonGaps: [
      'Automated election workflows cite the original law but omit amended audit, source-code, and transparency controls.',
      'Transmission and canvassing records lack exception handling and custody rules.',
      'Election technology incidents are handled without election-specific escalation and record preservation.',
    ],
  },
  {
    id: 'ra-10742',
    statute: 'RA 10742',
    title: 'Republic Act No. 10742',
    shortTitle: 'Sangguniang Kabataan Reform Act of 2015',
    year: 2016,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2016/ra_10742_2016.html',
    aliases: ['ra 10742', 'republic act 10742', 'sangguniang kabataan reform act', 'sk reform act'],
    topics: ['sangguniang kabataan', 'youth governance', 'barangay', 'sk elections', 'youth council'],
    keywords: [
      'sangguniang kabataan',
      'sk',
      'katipunan ng kabataan',
      'youth council',
      'youth development',
      'barangay',
      'sk election',
      'sk funds',
      'youth program',
      'training',
      'age qualification',
    ],
    summary:
      'A youth-governance framework for Sangguniang Kabataan and Katipunan ng Kabataan, covering qualifications, youth development planning, SK funds, training, and accountability.',
    obligations: [
      'For SK or youth-governance workflows, identify age or residency qualification, council role, youth development plan, fund use, training, procurement, records, and accountability owner.',
      'Separate SK governance from barangay council operations, youth benefits, school programs, elections, public funds, procurement, privacy, and child-protection issues.',
      'Protect youth participant records, SK funds, resolutions, meeting minutes, procurement files, training records, and program beneficiary data.',
      'Avoid treating youth programs as informal activities without plan, budget, approval, documentation, and grievance controls.',
    ],
    commonGaps: [
      'SK programs lack youth development plan, budget authority, training, procurement, or reporting controls.',
      'Age, residency, and youth-participant records are collected without privacy safeguards.',
      'SK funds and barangay funds are mixed without audit and accountability boundaries.',
    ],
  },
  {
    id: 'ra-11768',
    statute: 'RA 11768',
    title: 'Republic Act No. 11768',
    shortTitle: 'Strengthening the Sangguniang Kabataan Reform Act',
    year: 2022,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2022/ra_11768_2022.html',
    aliases: ['ra 11768', 'republic act 11768', 'strengthening sk reform act', 'sk reform amendment'],
    topics: ['sangguniang kabataan', 'youth governance', 'barangay', 'sk funds', 'youth development'],
    keywords: [
      'sangguniang kabataan',
      'sk reform',
      'youth development',
      'sk funds',
      'local youth development council',
      'katipunan ng kabataan',
      'training',
      'governance',
      'budget',
      'accountability',
    ],
    summary:
      'A statute strengthening the SK reform framework, relevant to updated youth governance, youth development planning, SK fund handling, training, and accountability controls.',
    obligations: [
      'For SK programs, check updated governance, planning, budgeting, training, fund-use, reporting, and accountability controls alongside RA 10742.',
      'Separate SK planning and funds from ordinary barangay projects, school youth activities, elections, procurement, and social-benefit programs.',
      'Keep youth development, budget, procurement, meeting, training, and beneficiary records with privacy and audit safeguards.',
      'Avoid relying on older SK templates without reviewing strengthened planning, finance, and accountability duties.',
    ],
    commonGaps: [
      'SK workflows cite RA 10742 but omit newer strengthened governance, planning, and fund controls.',
      'Youth project records do not show budget authority, training, procurement route, and monitoring owner.',
      'SK beneficiary and participant data lacks access, retention, and consent safeguards.',
    ],
  },
  {
    id: 'ra-1405',
    statute: 'RA 1405',
    title: 'Republic Act No. 1405',
    shortTitle: 'Law on Secrecy of Bank Deposits',
    year: 1955,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1955/ra_1405_1955.html',
    aliases: ['ra 1405', 'republic act 1405', 'bank secrecy law', 'secrecy of bank deposits'],
    topics: ['banking', 'confidentiality', 'financial privacy', 'deposits', 'disclosure'],
    keywords: [
      'bank deposit',
      'bank secrecy',
      'confidential',
      'financial record',
      'deposit account',
      'waiver',
      'court order',
      'disclosure',
      'bank information',
      'financial privacy',
    ],
    summary:
      'A banking confidentiality statute protecting bank deposits and limiting disclosure except through recognized exceptions, consent, or lawful process.',
    obligations: [
      'For bank-account, deposit, financial-assistance, loan, audit, or payment workflows, state what financial records are collected, who may access them, and what lawful basis or consent applies.',
      'Separate ordinary financial data, bank-deposit details, AML reporting, tax records, court orders, waivers, and privacy handling.',
      'Keep audit trails for authorized disclosure, redaction, retention, and complaint handling.',
      'Avoid asking for bank statements or account details unless purpose, authority, access limits, and alternatives are clear.',
    ],
    commonGaps: [
      'Bank-account or deposit details are requested without legal basis, consent, or access restrictions.',
      'AML, tax, audit, and ordinary verification workflows are mixed without confidentiality controls.',
      'Disclosure exceptions, redaction, retention, and complaint handling are not stated.',
    ],
  },
  {
    id: 'ra-7581',
    statute: 'RA 7581',
    title: 'Republic Act No. 7581',
    shortTitle: 'Price Act',
    year: 1992,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1992/ra_7581_1992.html',
    aliases: ['ra 7581', 'republic act 7581', 'price act', 'price control law'],
    topics: ['price control', 'basic necessities', 'prime commodities', 'consumer protection', 'emergency'],
    keywords: [
      'basic necessities',
      'prime commodities',
      'price ceiling',
      'price freeze',
      'profiteering',
      'hoarding',
      'cartel',
      'calamity',
      'emergency',
      'consumer protection',
      'price monitoring',
    ],
    summary:
      'A consumer price-control framework for basic necessities and prime commodities, including price monitoring, price freezes or ceilings, profiteering, hoarding, and emergency controls.',
    obligations: [
      'For calamity, emergency, market, retail, aid, or commodity-price policies, identify covered goods, trigger condition, price rule, monitoring office, evidence, and complaint channel.',
      'Separate price monitoring, consumer complaint intake, enforcement, supply coordination, competition risks, and emergency procurement.',
      'Coordinate with consumer protection, competition, LGU authority, disaster response, and procurement controls.',
      'Avoid vague price orders without commodity scope, duration, authority, publication, evidence, and due process.',
    ],
    commonGaps: [
      'Price-freeze or price-monitoring rules do not identify covered goods, duration, trigger, or responsible office.',
      'Hoarding, profiteering, and cartel risks are not separated.',
      'Enforcement lacks evidence, publication, complaint, notice, and appeal controls.',
    ],
  },
  {
    id: 'ra-9178',
    statute: 'RA 9178',
    title: 'Republic Act No. 9178',
    shortTitle: 'Barangay Micro Business Enterprises Act of 2002',
    year: 2002,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2002/ra_9178_2002.html',
    aliases: ['ra 9178', 'republic act 9178', 'barangay micro business enterprises act', 'bmbe law', 'bmbe certificate', 'micro business incentive'],
    topics: ['micro business', 'bmbe', 'local business', 'incentives', 'registration', 'msme'],
    keywords: [
      'barangay micro business enterprise',
      'bmbe',
      'micro business',
      'certificate of authority',
      'business registration',
      'tax incentive',
      'credit assistance',
      'livelihood',
      'local enterprise',
    ],
    summary:
      'A micro-enterprise support framework for registering barangay micro business enterprises and providing incentives, credit support, and local enterprise assistance.',
    obligations: [
      'For livelihood, micro-enterprise, sari-sari store, market vendor, or local incentive programs, state eligibility, registration, certificate, benefit, renewal, and monitoring controls.',
      'Separate BMBE incentives from ordinary business permits, tax registration, consumer protection, sanitation, and product regulation.',
      'Protect applicant identity, financial, tax, and livelihood data.',
      'Avoid promising exemptions or incentives without registration criteria, verification, and responsible office.',
    ],
    commonGaps: [
      'Micro-business benefits are offered without BMBE eligibility and certificate controls.',
      'Business permits, tax incentives, credit support, and training are mixed without role clarity.',
      'Applicant financial and livelihood records lack privacy and retention safeguards.',
    ],
  },
  {
    id: 'ra-9501',
    statute: 'RA 9501',
    title: 'Republic Act No. 9501',
    shortTitle: 'Magna Carta for Micro, Small and Medium Enterprises',
    year: 2008,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2008/ra_9501_2008.html',
    aliases: ['ra 9501', 'republic act 9501', 'magna carta for msmes', 'msme law', 'msme assistance', 'small business support'],
    topics: ['msme', 'enterprise development', 'credit', 'business support', 'dtI', 'livelihood'],
    keywords: [
      'micro small and medium enterprises',
      'msme',
      'enterprise development',
      'credit',
      'financing',
      'business support',
      'training',
      'technology transfer',
      'market access',
      'small business',
    ],
    summary:
      'An MSME development framework supporting enterprise finance, training, technology, market access, institutional coordination, and small-business development programs.',
    obligations: [
      'For MSME grants, credit, market access, training, or incubation programs, state eligibility, selection criteria, benefit limits, reporting, conflict checks, and monitoring.',
      'Separate grants, loans, procurement preference, market access, business permits, and training support.',
      'Coordinate MSME support with competition, procurement, consumer, tax, privacy, and anti-red-tape controls.',
      'Avoid discretionary beneficiary selection without objective criteria and appeal route.',
    ],
    commonGaps: [
      'MSME assistance lacks eligibility, scoring, conflict, reporting, and appeals.',
      'Credit, subsidy, training, and procurement preference are mixed without separate controls.',
      'Beneficiary business and financial records lack privacy and audit safeguards.',
    ],
  },
  {
    id: 'ra-9513',
    statute: 'RA 9513',
    title: 'Republic Act No. 9513',
    shortTitle: 'Renewable Energy Act of 2008',
    year: 2008,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2008/ra_9513_2008.html',
    aliases: ['ra 9513', 'republic act 9513', 'renewable energy act', 'renewable energy law', 'net metering', 'green energy project'],
    topics: ['renewable energy', 'solar', 'wind', 'biomass', 'energy', 'incentives', 'net metering'],
    keywords: [
      'renewable energy',
      'solar',
      'wind',
      'biomass',
      'hydropower',
      'net metering',
      'green energy',
      'renewable portfolio',
      'energy developer',
      'incentive',
      'doe',
    ],
    summary:
      'A renewable-energy framework promoting renewable energy resources, development incentives, standards, market mechanisms, and DOE-centered coordination.',
    obligations: [
      'For solar, wind, biomass, hydro, green-energy, or net-metering policies, identify project type, permits, grid or facility connection, incentives, monitoring, and DOE coordination.',
      'Separate renewable-energy promotion from energy-efficiency, building, procurement, environmental, land-use, and consumer claims.',
      'State performance metrics, maintenance, safety, environmental, ownership, and consumer disclosure controls.',
      'Avoid green claims or incentive promises without eligibility, registration, and verification.',
    ],
    commonGaps: [
      'Renewable-energy projects lack permit, interconnection, ownership, or maintenance controls.',
      'Green-energy claims are made without verification, performance metrics, or consumer disclosure.',
      'Incentives are promised without eligibility and responsible agency coordination.',
    ],
  },
  {
    id: 'ra-9729',
    statute: 'RA 9729',
    title: 'Republic Act No. 9729',
    shortTitle: 'Climate Change Act of 2009',
    year: 2009,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2009/ra_9729_2009.html',
    aliases: ['ra 9729', 'republic act 9729', 'climate change act', 'climate law', 'climate action plan', 'local climate change action plan', 'lccap'],
    topics: ['climate change', 'adaptation', 'mitigation', 'resilience', 'lgu planning', 'risk assessment'],
    keywords: [
      'climate change',
      'adaptation',
      'mitigation',
      'climate risk',
      'greenhouse gas',
      'resilience',
      'local climate change action plan',
      'lccap',
      'climate commission',
      'disaster risk reduction',
    ],
    summary:
      'A climate governance framework mainstreaming climate adaptation, mitigation, resilience, risk assessment, local climate action planning, and coordination with disaster-risk reduction.',
    obligations: [
      'For climate, resilience, infrastructure, DRRM, land-use, or environmental plans, state hazard and climate-risk basis, adaptation measures, mitigation actions, vulnerable groups, and monitoring.',
      'Coordinate local climate action plans with DRRM, land use, energy, environmental permits, procurement, and public consultation.',
      'Separate climate adaptation, disaster response, emissions mitigation, budget, and reporting.',
      'Avoid generic climate promises without baseline, responsible office, timeline, and measurable indicators.',
    ],
    commonGaps: [
      'Climate action plans lack risk baseline, vulnerable-group mapping, budget, or indicators.',
      'Adaptation, mitigation, disaster response, and land-use controls are mixed together.',
      'Monitoring and reporting do not identify owner, frequency, or evidence source.',
    ],
  },
  {
    id: 'ra-8550',
    statute: 'RA 8550',
    title: 'Republic Act No. 8550',
    shortTitle: 'Philippine Fisheries Code of 1998',
    year: 1998,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1998/ra_8550_1998.html',
    aliases: ['ra 8550', 'republic act 8550', 'philippine fisheries code', 'fisheries code', 'fishery permit', 'municipal waters'],
    topics: ['fisheries', 'coastal resources', 'aquaculture', 'municipal waters', 'fishing permits', 'marine protection'],
    keywords: [
      'fisheries',
      'municipal waters',
      'fishing permit',
      'aquaculture',
      'fishery refuge',
      'marine protected area',
      'coastal resource',
      'illegal fishing',
      'fisherfolk',
      'bf ar',
    ],
    summary:
      'A fisheries and aquatic-resource framework covering municipal waters, fishing permits, aquaculture, fisherfolk rights, conservation, illegal fishing, and coastal-resource management.',
    obligations: [
      'For fishing, aquaculture, coastal tourism, market, livelihood, or marine protection rules, identify municipal-water jurisdiction, permits, gear, closed areas, enforcement, and fisherfolk participation.',
      'Coordinate fisheries controls with LGU powers, environmental laws, protected areas, tourism, livelihood, and food safety.',
      'Separate licensing, conservation, market hygiene, illegal-fishing enforcement, and social support.',
      'Avoid authorizing coastal or aquatic-resource activities without jurisdiction, permit, and conservation controls.',
    ],
    commonGaps: [
      'Fishing or aquaculture rules lack municipal-water, permit, gear, or closed-season controls.',
      'Fisherfolk consultation, enforcement, and conservation measures are missing.',
      'Coastal livelihood programs are not coordinated with protected-area or environmental safeguards.',
    ],
  },
  {
    id: 'ra-7942',
    statute: 'RA 7942',
    title: 'Republic Act No. 7942',
    shortTitle: 'Philippine Mining Act of 1995',
    year: 1995,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1995/ra_7942_1995.html',
    aliases: ['ra 7942', 'republic act 7942', 'philippine mining act', 'mining act', 'quarry permit', 'mineral extraction'],
    topics: ['mining', 'quarrying', 'minerals', 'environment', 'permits', 'rehabilitation'],
    keywords: [
      'mining',
      'quarry',
      'mineral agreement',
      'exploration permit',
      'environmental protection',
      'rehabilitation',
      'tailings',
      'small scale mining',
      'mgb',
      'mine safety',
    ],
    summary:
      'A mineral-resource framework covering exploration, mining agreements, quarrying, permits, environmental protection, rehabilitation, safety, and regulator coordination.',
    obligations: [
      'For quarry, mineral extraction, excavation, construction materials, or mine-site policies, identify permit type, regulator, environmental safeguards, rehabilitation, safety, and community consultation.',
      'Coordinate mining or quarrying with LGU authority, environmental impact, hazardous waste, water, air, protected areas, indigenous peoples, and occupational safety.',
      'Separate exploration, extraction, transport, processing, rehabilitation, closure, royalties or fees, and enforcement.',
      'Avoid local permits that authorize extraction without national mineral, environmental, safety, and rehabilitation controls.',
    ],
    commonGaps: [
      'Quarry or extraction rules lack permit, environmental, rehabilitation, or safety controls.',
      'LGU clearance is treated as enough without mining, environmental, or protected-area checks.',
      'Tailings, water, hazardous substances, worker safety, and closure duties are missing.',
    ],
  },
  {
    id: 'ra-10533',
    statute: 'RA 10533',
    title: 'Republic Act No. 10533',
    shortTitle: 'Enhanced Basic Education Act of 2013',
    year: 2013,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2013/ra_10533_2013.html',
    aliases: ['ra 10533', 'republic act 10533', 'enhanced basic education act', 'k to 12 law', 'k-12 education'],
    topics: ['education', 'basic education', 'curriculum', 'school operations', 'learner records'],
    keywords: [
      'k to 12',
      'kindergarten',
      'elementary',
      'secondary education',
      'curriculum',
      'learner',
      'school year',
      'deped',
      'teacher training',
      'assessment',
    ],
    summary:
      'A basic-education framework covering kindergarten, elementary, junior high, senior high, curriculum development, learning standards, and education-sector implementation.',
    obligations: [
      'For school, LGU education, learner support, curriculum, or enrollment workflows, state coverage, responsible school or DepEd-facing office, learner eligibility, records, and implementation timeline.',
      'Separate curriculum, admission, assessment, learner protection, data handling, facilities, and teacher-training responsibilities.',
      'Coordinate student records, consent, child protection, accessibility, and grievance channels with privacy and school-safety controls.',
      'Avoid school requirements or exclusions without objective criteria, notice, appeal, and accommodation pathways.',
    ],
    commonGaps: [
      'Education policies cite school operations but omit learner eligibility, records, and responsible office.',
      'Curriculum, admission, assessment, facilities, and child protection are mixed without clear ownership.',
      'Student data and disciplinary records lack privacy, retention, and grievance controls.',
    ],
  },
  {
    id: 'ra-10931',
    statute: 'RA 10931',
    title: 'Republic Act No. 10931',
    shortTitle: 'Universal Access to Quality Tertiary Education Act',
    year: 2017,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2017/ra_10931_2017.html',
    aliases: ['ra 10931', 'republic act 10931', 'universal access to quality tertiary education act', 'free tertiary education law', 'tertiary education subsidy'],
    topics: ['education', 'tertiary education', 'scholarship', 'subsidy', 'student benefits'],
    keywords: [
      'state university',
      'local university',
      'college',
      'tuition',
      'school fees',
      'student financial assistance',
      'tertiary education subsidy',
      'unifast',
      'ched',
      'student loan',
    ],
    summary:
      'A tertiary-education access framework covering free tuition and school fees in covered institutions, tertiary education subsidy, student loans, and related student financial assistance.',
    obligations: [
      'For scholarship, tuition, subsidy, student aid, or LGU education-benefit programs, state eligibility, covered institution, benefit limits, application documents, verification, and appeal route.',
      'Separate free tuition, subsidy, student loans, local scholarship, academic standing, privacy, and grievance handling.',
      'Protect student identity, income, grades, disability, and household records with clear access and retention controls.',
      'Avoid promising free fees, grants, or loans without budget, objective criteria, exclusion rules, and accountable office.',
    ],
    commonGaps: [
      'Scholarship or student-aid rules lack eligibility, benefit limits, and appeal procedures.',
      'Tuition, subsidy, and loan programs are merged without separate controls.',
      'Student financial and academic records lack privacy and retention safeguards.',
    ],
  },
  {
    id: 'ra-7279',
    statute: 'RA 7279',
    title: 'Republic Act No. 7279',
    shortTitle: 'Urban Development and Housing Act of 1992',
    year: 1992,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1992/ra_7279_1992.html',
    aliases: ['ra 7279', 'republic act 7279', 'urban development and housing act', 'udha', 'socialized housing'],
    topics: ['housing', 'urban development', 'resettlement', 'informal settlers', 'socialized housing'],
    keywords: [
      'urban poor',
      'informal settler',
      'socialized housing',
      'resettlement',
      'relocation',
      'demolition',
      'eviction',
      'beneficiary selection',
      'consultation',
      'basic services',
    ],
    summary:
      'An urban-development and housing framework covering socialized housing, land use, beneficiary selection, resettlement, consultation, and safeguards around eviction or demolition.',
    obligations: [
      'For housing, relocation, resettlement, demolition, or urban-poor programs, state beneficiary eligibility, census or validation, consultation, relocation site, services, grievance, and timetable.',
      'Separate socialized housing, land acquisition, eviction or demolition, resettlement, livelihood, utilities, public order, and child or senior welfare concerns.',
      'Protect beneficiary identity, household composition, income, land-tenure, and vulnerability records.',
      'Avoid eviction, relocation, or award decisions without notice, consultation, documentation, and appeal pathway.',
    ],
    commonGaps: [
      'Housing or relocation programs lack beneficiary validation, consultation, and grievance controls.',
      'Demolition, resettlement, and social-service duties are mixed without timetable and accountable office.',
      'Household and vulnerability records lack privacy and retention safeguards.',
    ],
  },
  {
    id: 'ra-11201',
    statute: 'RA 11201',
    title: 'Republic Act No. 11201',
    shortTitle: 'Department of Human Settlements and Urban Development Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11201_2019.html',
    aliases: ['ra 11201', 'republic act 11201', 'department of human settlements and urban development act', 'dhsud law', 'human settlements'],
    topics: ['housing', 'human settlements', 'urban development', 'land use', 'housing regulation'],
    keywords: [
      'dhsud',
      'human settlements',
      'housing policy',
      'urban development',
      'land use',
      'subdivision',
      'homeowners association',
      'housing regulation',
      'settlement planning',
    ],
    summary:
      'A housing and human-settlements governance framework establishing DHSUD and consolidating policy, regulation, planning, and coordination for settlements and urban development.',
    obligations: [
      'For housing, subdivision, homeowners, land-use, or settlement programs, identify DHSUD-facing regulation, LGU role, permits, consultation, records, and complaint handling.',
      'Coordinate settlement planning with zoning, building, accessibility, environment, disaster risk, utilities, and socialized-housing controls.',
      'Separate policy planning, licensing, beneficiary assistance, homeowners association concerns, and enforcement. ',
      'Avoid treating a local clearance as complete when housing or settlement regulation may require DHSUD coordination.',
    ],
    commonGaps: [
      'Housing or settlement policies omit DHSUD-facing permit, regulation, or complaint channels.',
      'Land-use, subdivision, housing assistance, and homeowners association issues are merged without role clarity.',
      'Settlement planning lacks hazard, accessibility, utilities, and environmental coordination.',
    ],
  },
  {
    id: 'ra-9470',
    statute: 'RA 9470',
    title: 'Republic Act No. 9470',
    shortTitle: 'National Archives of the Philippines Act of 2007',
    year: 2007,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2007/ra_9470_2007.html',
    aliases: ['ra 9470', 'republic act 9470', 'national archives act', 'records management law', 'archives law'],
    topics: ['records management', 'archives', 'public records', 'retention', 'disposal'],
    keywords: [
      'public records',
      'records officer',
      'archives',
      'retention schedule',
      'disposal',
      'preservation',
      'records custody',
      'document management',
      'government records',
    ],
    summary:
      'A public-records and archives framework covering records creation, custody, preservation, retention, disposal, archives management, and coordination with the National Archives.',
    obligations: [
      'For government forms, case files, minutes, permits, registries, or document systems, state records owner, retention schedule, access rules, disposal, preservation, and audit trail.',
      'Separate active records, permanent archives, confidential records, public access, digital backups, and authorized destruction.',
      'Coordinate archives duties with privacy, FOI, e-commerce records, audit, and agency-specific retention rules.',
      'Avoid deleting, altering, or publishing records without authority, retention basis, and access classification.',
    ],
    commonGaps: [
      'Records are collected but no custodian, retention schedule, disposal rule, or archive path is stated.',
      'Confidential, public, active, and permanent records are not classified.',
      'Digital copies, audit trails, and authorized destruction are not controlled.',
    ],
  },
  {
    id: 'eo-2-2016',
    statute: 'EO 2, s. 2016',
    title: 'Executive Order No. 2, s. 2016',
    shortTitle: 'Freedom of Information Executive Order',
    year: 2016,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/executive/execord/eo2016/eo_2_2016.html',
    aliases: ['eo 2 2016', 'executive order 2 2016', 'freedom of information', 'foi executive order', 'foi request'],
    topics: ['freedom of information', 'public records', 'transparency', 'access requests', 'exceptions'],
    keywords: [
      'foi',
      'request for information',
      'public disclosure',
      'exceptions',
      'transparency',
      'people information',
      'records access',
      'privacy',
      'appeal',
      'denial',
    ],
    summary:
      'An executive-branch transparency framework for public access to information, request handling, exceptions, denial, appeal, records disclosure, and privacy-sensitive limits.',
    obligations: [
      'For public-records portals, request desks, transparency pages, or disclosure workflows, state request intake, receiving office, response time, exception review, denial, and appeal route.',
      'Separate proactive disclosure, FOI requests, privacy-protected records, security exceptions, archives, and ordinary customer-service inquiries.',
      'Keep records of requests, decisions, redactions, responsible officers, and response dates.',
      'Avoid releasing personal, confidential, privileged, security, or law-enforcement-sensitive information without exception review and redaction controls.',
    ],
    commonGaps: [
      'FOI or transparency rules lack receiving office, timeline, exception review, and appeal route.',
      'Disclosure workflows do not separate public records from personal or confidential records.',
      'Redaction, request logs, denial notices, and escalation records are missing.',
    ],
  },
  {
    id: 'ra-11310',
    statute: 'RA 11310',
    title: 'Republic Act No. 11310',
    shortTitle: 'Pantawid Pamilyang Pilipino Program Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11310_2019.html',
    aliases: ['ra 11310', 'republic act 11310', 'pantawid pamilyang pilipino program act', '4ps law', 'conditional cash transfer'],
    topics: ['social welfare', 'cash assistance', 'poverty reduction', 'benefits', 'household records'],
    keywords: [
      'pantawid',
      '4ps',
      'conditional cash transfer',
      'beneficiary',
      'household',
      'poverty',
      'education grant',
      'health grant',
      'dswd',
      'grievance',
    ],
    summary:
      'A conditional cash-transfer and social-protection framework covering poor household eligibility, grants, conditions, monitoring, grievance, and DSWD-centered implementation.',
    obligations: [
      'For cash aid, household grants, education or health support, beneficiary validation, or social-protection programs, state eligibility, conditions, verification, payment, monitoring, grievance, and exit rules.',
      'Separate ordinary financial aid, conditional benefits, emergency assistance, case management, privacy, and fraud controls.',
      'Protect household, poverty, child, health, school, bank, and payment records.',
      'Avoid discretionary beneficiary selection or delisting without objective criteria, notice, validation, and appeal or grievance route.',
    ],
    commonGaps: [
      'Social-assistance programs lack eligibility, validation, benefit conditions, and grievance controls.',
      'Household, child, health, school, and payment records lack privacy and access safeguards.',
      'Delisting or denial rules are discretionary or lack notice and appeal.',
    ],
  },
  {
    id: 'ra-11861',
    statute: 'RA 11861',
    title: 'Republic Act No. 11861',
    shortTitle: 'Expanded Solo Parents Welfare Act',
    year: 2022,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2022/ra_11861_2022.html',
    aliases: ['ra 11861', 'republic act 11861', 'expanded solo parents welfare act', 'solo parents welfare act', 'solo parent benefit'],
    topics: ['solo parents', 'social welfare', 'benefits', 'employment support', 'child welfare'],
    keywords: [
      'solo parent',
      'solo parent id',
      'benefits',
      'parental leave',
      'cash subsidy',
      'employment support',
      'child care',
      'social worker',
      'osca',
      'dswd',
    ],
    summary:
      'A solo-parent welfare framework covering eligibility, identification, benefits, leave, subsidy, social services, and local/social-welfare coordination.',
    obligations: [
      'For solo-parent benefits, IDs, leave, subsidies, or local support programs, state eligibility, documentary proof, verification, benefit scope, renewal, grievance, and records handling.',
      'Separate employment benefits, social services, education support, health support, child care, and cash assistance.',
      'Protect family status, child, income, employment, and vulnerability records.',
      'Avoid blanket exclusions or discretionary denials without criteria, notice, and appeal route.',
    ],
    commonGaps: [
      'Solo-parent benefits lack eligibility, verification, renewal, and appeal controls.',
      'Employment, subsidy, child-care, and education benefits are mixed without role clarity.',
      'Sensitive family and child records lack privacy safeguards.',
    ],
  },
  {
    id: 'ra-11596',
    statute: 'RA 11596',
    title: 'Republic Act No. 11596',
    shortTitle: 'Prohibition of Child Marriage Law',
    year: 2021,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2021/ra_11596_2021.html',
    aliases: ['ra 11596', 'republic act 11596', 'prohibition of child marriage law', 'child marriage law'],
    topics: ['child protection', 'marriage', 'minor protection', 'social welfare', 'community programs'],
    keywords: [
      'child marriage',
      'minor marriage',
      'solemnization',
      'cohabitation',
      'facilitation',
      'child protection',
      'reporting',
      'social welfare',
      'community education',
    ],
    summary:
      'A child-protection statute prohibiting child marriage and related facilitation, with implications for community education, intake, reporting, and protection workflows.',
    obligations: [
      'For marriage, family, barangay, school, social-welfare, or child-protection workflows, include age verification, reporting, referral, confidentiality, and prevention education.',
      'Separate civil-registration, religious or cultural facilitation, protection intake, social welfare, and law-enforcement referral.',
      'Protect child identity, family details, school records, and case records from public exposure.',
      'Avoid mediation, waiver, or custom-based exemptions that bypass child-protection review.',
    ],
    commonGaps: [
      'Child-marriage or family-support programs lack age verification, reporting, and referral controls.',
      'Civil, social-welfare, school, and community roles are not separated.',
      'Child identity and family records are not protected.',
    ],
  },
  {
    id: 'ra-11510',
    statute: 'RA 11510',
    title: 'Republic Act No. 11510',
    shortTitle: 'Alternative Learning System Act',
    year: 2020,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2020/ra_11510_2020.html',
    aliases: ['ra 11510', 'republic act 11510', 'alternative learning system act', 'als law', 'alternative learning system'],
    topics: ['education', 'alternative learning', 'out of school youth', 'adult education', 'learner support'],
    keywords: [
      'alternative learning system',
      'als',
      'out of school youth',
      'adult learners',
      'basic literacy',
      'learning facilitator',
      'community learning center',
      'accreditation',
      'equivalency',
      'deped',
    ],
    summary:
      'An alternative-learning framework for out-of-school youth and adult learners, community learning centers, basic literacy, accreditation, equivalency, and DepEd coordination.',
    obligations: [
      'For alternative learning, youth, adult literacy, or community learning programs, state target learners, intake, learning plan, facilitator, assessment, accessibility, records, and referral controls.',
      'Separate ALS from formal enrollment, scholarship, livelihood, child protection, privacy, and social-welfare assistance.',
      'Protect learner age, education history, disability, family, income, and assessment records.',
      'Avoid excluding learners without objective criteria, accommodation review, and grievance route.',
    ],
    commonGaps: [
      'ALS or community learning programs lack intake, learning plan, assessment, and facilitator controls.',
      'Out-of-school youth, adult learners, and social-welfare referrals are mixed without role clarity.',
      'Learner records lack privacy and retention safeguards.',
    ],
  },
  {
    id: 'ra-4136',
    statute: 'RA 4136',
    title: 'Republic Act No. 4136',
    shortTitle: 'Land Transportation and Traffic Code',
    year: 1964,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1964/ra_4136_1964.html',
    aliases: ['ra 4136', 'republic act 4136', 'land transportation and traffic code', 'traffic code', 'driver license law'],
    topics: ['transportation', 'traffic', 'driver licensing', 'vehicle registration', 'road safety'],
    keywords: [
      'motor vehicle',
      'driver license',
      'traffic regulation',
      'vehicle registration',
      'franchise',
      'road safety',
      'operator',
      'traffic enforcement',
      'accident',
      'public utility vehicle',
    ],
    summary:
      'A road-transport framework for motor vehicle registration, driver licensing, traffic rules, operators, road-safety enforcement, and transport records.',
    obligations: [
      'For traffic, parking, transport-terminal, driver, vehicle, or road-safety policies, state regulated vehicles, driver or operator duties, enforcement office, evidence, penalties, and appeal route.',
      'Separate driver licensing, vehicle registration, route or terminal management, road safety, data collection, accident response, and traffic enforcement.',
      'Coordinate transport enforcement with LGU authority, public-service regulation, privacy, due process, and public-safety controls.',
      'Avoid vehicle or driver data collection, impoundment, penalties, or route restrictions without authority, notice, recordkeeping, and complaint handling.',
    ],
    commonGaps: [
      'Traffic or transport policies lack vehicle scope, driver/operator duties, enforcement records, or appeal route.',
      'Driver, vehicle, accident, and violation records lack retention and privacy controls.',
      'LGU traffic rules are not coordinated with national transport and public-service regulation.',
    ],
  },
  {
    id: 'ra-11659',
    statute: 'RA 11659',
    title: 'Republic Act No. 11659',
    shortTitle: 'Public Service Act Amendments',
    year: 2022,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2022/ra_11659_2022.html',
    aliases: ['ra 11659', 'republic act 11659', 'public service act amendments', 'public service law', 'public utility regulation'],
    topics: ['public service', 'public utility', 'franchise', 'transport', 'telecommunications', 'foreign investment'],
    keywords: [
      'public service',
      'public utility',
      'franchise',
      'certificate',
      'transportation',
      'telecommunications',
      'critical infrastructure',
      'regulator',
      'operator',
      'foreign ownership',
    ],
    summary:
      'A public-service regulation framework distinguishing public services and public utilities, with implications for operators, franchises, certificates, critical infrastructure, and regulator oversight.',
    obligations: [
      'For transport, telecom, logistics, infrastructure, or utility-like services, classify the service, operator, public-utility status, franchise or certificate need, regulator, and consumer-facing duties.',
      'Separate ordinary business permits from public-service certificates, franchises, rate or route regulation, critical-infrastructure limits, competition, and data handling.',
      'Coordinate service continuity, complaints, records, consumer disclosures, privacy, safety, and regulator reporting.',
      'Avoid treating local permits or private contracts as enough when a regulated public service may need national regulator review.',
    ],
    commonGaps: [
      'Public-service workflows do not classify the service or identify the regulator and certificate path.',
      'Consumer complaints, continuity, rates or charges, and operational records are missing.',
      'Critical-infrastructure, foreign-investment, privacy, and competition issues are not separated.',
    ],
  },
  {
    id: 'ra-8371',
    statute: 'RA 8371',
    title: 'Republic Act No. 8371',
    shortTitle: 'Indigenous Peoples Rights Act of 1997',
    year: 1997,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1997/ra_8371_1997.html',
    aliases: ['ra 8371', 'republic act 8371', 'indigenous peoples rights act', 'ipra', 'free prior and informed consent', 'fpic'],
    topics: ['indigenous peoples', 'ancestral domain', 'fpic', 'cultural rights', 'community consent'],
    keywords: [
      'indigenous cultural communities',
      'indigenous peoples',
      'ancestral domain',
      'ancestral lands',
      'fpic',
      'free prior informed consent',
      'ncip',
      'customary law',
      'cultural integrity',
      'community consultation',
    ],
    summary:
      'An indigenous-rights framework covering ancestral domains and lands, self-governance, cultural integrity, NCIP coordination, and free, prior, and informed consent for affected projects.',
    obligations: [
      'For land, mining, energy, tourism, housing, infrastructure, research, or resource projects affecting indigenous communities, screen for ancestral-domain or ancestral-land issues and FPIC requirements.',
      'State NCIP coordination, affected community, consent process, cultural safeguards, benefit-sharing, grievance, recordkeeping, and protection of sensitive community information.',
      'Separate ordinary public consultation from FPIC, customary decision-making, environmental permits, land title, and project procurement.',
      'Avoid project approvals, data collection, relocation, or resource access without community identification, consent pathway, and cultural safeguards.',
    ],
    commonGaps: [
      'Projects affecting ancestral domains mention consultation but not FPIC, NCIP coordination, or customary decision process.',
      'Community records, maps, sacred sites, and cultural information lack confidentiality controls.',
      'Benefit-sharing, grievance, monitoring, and withdrawal or non-consent scenarios are not addressed.',
    ],
  },
  {
    id: 'pd-1529',
    statute: 'PD 1529',
    title: 'Presidential Decree No. 1529',
    shortTitle: 'Property Registration Decree',
    year: 1978,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/presdecs/pd1978/pd_1529_1978.html',
    aliases: ['pd 1529', 'presidential decree 1529', 'property registration decree', 'land registration', 'torrens title'],
    topics: ['property', 'land title', 'land registration', 'real estate records', 'survey'],
    keywords: [
      'land title',
      'certificate of title',
      'torrens',
      'register of deeds',
      'survey plan',
      'annotation',
      'encumbrance',
      'subdivision',
      'consolidation',
      'deed',
    ],
    summary:
      'A land-registration framework for Torrens titles, certificates of title, register of deeds processes, survey plans, annotations, encumbrances, and property-record custody.',
    obligations: [
      'For land, housing, subdivision, public works, acquisition, easement, or property-document workflows, verify title, survey, owner, encumbrances, annotations, and register-of-deeds records.',
      'Separate title verification, tax declaration, possession, zoning, subdivision, expropriation, ancestral-domain, and housing-beneficiary issues.',
      'Protect property documents, owner identity, survey records, and transaction evidence with access and retention controls.',
      'Avoid relying on informal possession, tax declarations, or unverified deeds as substitutes for title and registry review.',
    ],
    commonGaps: [
      'Land or housing workflows rely on tax declarations or applicant claims without title and registry verification.',
      'Encumbrances, annotations, survey issues, and owner authority are not checked.',
      'Property and owner records lack custody, access, redaction, and retention controls.',
    ],
  },
  {
    id: 'ra-8435',
    statute: 'RA 8435',
    title: 'Republic Act No. 8435',
    shortTitle: 'Agriculture and Fisheries Modernization Act of 1997',
    year: 1997,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1997/ra_8435_1997.html',
    aliases: ['ra 8435', 'republic act 8435', 'agriculture and fisheries modernization act', 'afma', 'agri fisheries modernization'],
    topics: ['agriculture', 'fisheries', 'food security', 'farm support', 'rural development'],
    keywords: [
      'agriculture',
      'fisheries',
      'modernization',
      'food security',
      'farmers',
      'fisherfolk',
      'irrigation',
      'post harvest',
      'market access',
      'rural credit',
    ],
    summary:
      'An agriculture and fisheries modernization framework covering food security, support services, infrastructure, credit, research, market access, and farmer or fisherfolk development.',
    obligations: [
      'For farm, fisheries, food-security, livelihood, irrigation, post-harvest, or rural support programs, state eligible beneficiaries, support type, delivery office, monitoring, procurement, and market-access controls.',
      'Separate production support, credit, post-harvest facilities, fisheries controls, food safety, organic claims, price controls, and social assistance.',
      'Protect farmer, fisherfolk, cooperative, land, production, and subsidy records.',
      'Avoid discretionary grants or farm inputs without eligibility, inventory, distribution, audit, and grievance controls.',
    ],
    commonGaps: [
      'Agriculture or fisheries support lacks beneficiary criteria, inventory controls, monitoring, or grievance path.',
      'Input distribution, credit, procurement, and market-access support are mixed without audit records.',
      'Farm and fisherfolk records lack privacy, retention, and conflict-of-interest safeguards.',
    ],
  },
  {
    id: 'ra-10068',
    statute: 'RA 10068',
    title: 'Republic Act No. 10068',
    shortTitle: 'Organic Agriculture Act of 2010',
    year: 2010,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2010/ra_10068_2010.html',
    aliases: ['ra 10068', 'republic act 10068', 'organic agriculture act', 'organic farming law', 'organic certification'],
    topics: ['organic agriculture', 'food production', 'certification', 'labeling', 'farm standards'],
    keywords: [
      'organic agriculture',
      'organic farming',
      'certification',
      'organic label',
      'farm inputs',
      'soil fertility',
      'organic products',
      'accreditation',
      'traceability',
      'market development',
    ],
    summary:
      'An organic-agriculture framework for organic production, certification, labeling, accreditation, promotion, traceability, and market support.',
    obligations: [
      'For organic farming, local food, market, procurement, labeling, or farm-support programs, state certification, permitted inputs, traceability, inspection, labeling, and complaint controls.',
      'Separate organic claims from ordinary farm support, food safety, consumer labeling, procurement preference, and market promotion.',
      'Coordinate with food safety, consumer protection, agriculture modernization, and records-management controls.',
      'Avoid using organic labels, claims, or incentives without certification, verification, and traceability evidence.',
    ],
    commonGaps: [
      'Organic claims lack certification, permitted input, traceability, and inspection controls.',
      'Farm support and market promotion are treated as proof of organic status.',
      'Consumer labeling, complaints, and corrective action are missing.',
    ],
  },
  {
    id: 'ra-10611',
    statute: 'RA 10611',
    title: 'Republic Act No. 10611',
    shortTitle: 'Food Safety Act of 2013',
    year: 2013,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2013/ra_10611_2013.html',
    aliases: ['ra 10611', 'republic act 10611', 'food safety act', 'food safety law', 'food safety standards'],
    topics: ['food safety', 'agriculture', 'markets', 'food establishments', 'traceability'],
    keywords: [
      'food safety',
      'food business operator',
      'food chain',
      'traceability',
      'risk analysis',
      'recall',
      'contamination',
      'sanitary',
      'inspection',
      'labeling',
    ],
    summary:
      'A food-safety framework covering responsibilities across the food chain, food business operators, risk analysis, inspection, traceability, recall, and regulator coordination.',
    obligations: [
      'For markets, feeding programs, food vendors, farm-to-market programs, processing, storage, or distribution, state food-chain role, safety standards, inspection, traceability, complaints, and recall steps.',
      'Separate food safety from sanitation permits, FDA-regulated products, consumer labeling, organic claims, and agricultural subsidy programs.',
      'Protect supplier, vendor, inspection, complaint, and recall records with retention and access controls.',
      'Avoid distributing or selling food without inspection, contamination response, traceability, and corrective-action procedures.',
    ],
    commonGaps: [
      'Food programs lack inspection, traceability, recall, and contamination response controls.',
      'Sanitary permits, food safety, labeling, and FDA issues are blended without role clarity.',
      'Supplier and inspection records are incomplete or not retained.',
    ],
  },
  {
    id: 'ra-11321',
    statute: 'RA 11321',
    title: 'Republic Act No. 11321',
    shortTitle: 'Sagip Saka Act',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11321_2019.html',
    aliases: ['ra 11321', 'republic act 11321', 'sagip saka act', 'farmers and fisherfolk enterprise development', 'agri enterprise support'],
    topics: ['agriculture', 'farmers', 'fisherfolk', 'enterprise development', 'market access'],
    keywords: [
      'sagip saka',
      'farmers',
      'fisherfolk',
      'enterprise development',
      'farmers organization',
      'market access',
      'direct purchase',
      'credit',
      'capacity building',
      'agri enterprise',
    ],
    summary:
      'An agriculture-enterprise support framework promoting farmers and fisherfolk enterprise development, market linkage, direct purchase, credit, capacity building, and support services.',
    obligations: [
      'For farmer or fisherfolk enterprise, direct purchase, market linkage, livelihood, or local food procurement programs, state eligible organizations, selection criteria, support package, procurement path, monitoring, and grievance controls.',
      'Separate enterprise support, grants, credit, procurement, price support, food safety, and cooperative governance.',
      'Protect farmer or fisherfolk organization records, production data, bank details, and beneficiary selection evidence.',
      'Avoid preferred suppliers, discretionary market access, or direct purchase without objective criteria, conflict checks, audit trail, and performance monitoring.',
    ],
    commonGaps: [
      'Farmers and fisherfolk support lacks organization eligibility, objective selection, and conflict checks.',
      'Market linkage, direct purchase, credit, and capacity building are merged without audit trail.',
      'Beneficiary organization and financial records lack privacy and retention safeguards.',
    ],
  },
  {
    id: 'ra-3019',
    statute: 'RA 3019',
    title: 'Republic Act No. 3019',
    shortTitle: 'Anti-Graft and Corrupt Practices Act',
    year: 1960,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1960/ra_3019_1960.html',
    aliases: ['ra 3019', 'republic act 3019', 'anti graft and corrupt practices act', 'anti graft law', 'corrupt practices act'],
    topics: ['anti-graft', 'public officers', 'conflict of interest', 'procurement integrity', 'public accountability'],
    keywords: [
      'graft',
      'corruption',
      'corrupt practice',
      'public officer',
      'undue injury',
      'unwarranted benefit',
      'manifestly disadvantageous',
      'private interest',
      'conflict of interest',
      'kickback',
    ],
    summary:
      'A public-accountability statute penalizing corrupt practices by public officers, including unwarranted benefits, undue injury, prohibited interests, and manifestly disadvantageous transactions. It is a practical screen for conflict, procurement, permit, and subsidy workflows.',
    obligations: [
      'For public transactions, grants, permits, procurement, inspections, benefits, or enforcement, identify decision makers, approval basis, conflict checks, documentation, and review or complaint routes.',
      'Separate official discretion, supplier or beneficiary selection, private interests, gifts, fees, facilitation, and enforcement powers.',
      'Require objective criteria, recusal, approval records, audit trail, and escalation for suspected unwarranted benefits or undue injury.',
      'Avoid discretionary advantages, informal facilitation, or preferred access without legal basis, documented criteria, and accountability controls.',
    ],
    commonGaps: [
      'Officials can approve permits, suppliers, subsidies, or penalties without conflict checks and objective criteria.',
      'Gift, referral, facilitation, or preferred-access risks are not separated from ordinary processing.',
      'No audit trail, complaint path, or escalation route for suspected unwarranted benefits.',
    ],
  },
  {
    id: 'ra-6713',
    statute: 'RA 6713',
    title: 'Republic Act No. 6713',
    shortTitle: 'Code of Conduct and Ethical Standards for Public Officials and Employees',
    year: 1989,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1989/ra_6713_1989.html',
    aliases: ['ra 6713', 'republic act 6713', 'code of conduct and ethical standards', 'public officials code of conduct', 'saln law'],
    topics: ['ethics', 'public officials', 'saln', 'conflict disclosure', 'public service standards'],
    keywords: [
      'saln',
      'statement of assets liabilities and net worth',
      'public disclosure',
      'gift',
      'conflict disclosure',
      'divestment',
      'public official',
      'ethical standards',
      'public trust',
      'financial interest',
    ],
    summary:
      'An ethics and disclosure framework for public officials and employees, covering public-service norms, conflicts of interest, gifts, divestment, disclosure, and SALN-related accountability.',
    obligations: [
      'For official conduct, hiring, procurement, benefits, inspection, permits, or board service, state ethical duties, disclosure, conflict review, gift rules, and complaint or disciplinary routing.',
      'Treat SALN, financial-interest, family-interest, gift, employment, and post-decision records as sensitive accountability records with access and retention controls.',
      'Separate citizen service standards, conflicts, recusal, disclosure, gifts, divestment, and data privacy.',
      'Avoid requiring or publishing personal accountability records without authority, redaction, custody, and disclosure controls.',
    ],
    commonGaps: [
      'Ethics policies mention integrity but omit conflicts, gifts, disclosure, recusal, and records custody.',
      'SALN or financial-interest data is collected without access, redaction, retention, and authorized-disclosure controls.',
      'Public-service norms are not translated into measurable service, complaint, or disciplinary workflows.',
    ],
  },
  {
    id: 'pd-1445',
    statute: 'PD 1445',
    title: 'Presidential Decree No. 1445',
    shortTitle: 'Government Auditing Code of the Philippines',
    year: 1978,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/presdecs/pd1978/pd_1445_1978.html',
    aliases: ['pd 1445', 'presidential decree 1445', 'government auditing code', 'coa audit code', 'government audit'],
    topics: ['public funds', 'government audit', 'coa', 'liquidation', 'accountability'],
    keywords: [
      'coa',
      'commission on audit',
      'public funds',
      'disbursement',
      'cash advance',
      'liquidation',
      'voucher',
      'supporting documents',
      'accountable officer',
      'audit trail',
    ],
    summary:
      'A public-funds and audit framework covering government receipts, expenditures, disbursements, accountable officers, supporting documents, liquidation, and COA audit controls.',
    obligations: [
      'For public funds, grants, reimbursements, procurement payments, cash advances, aid distribution, or asset custody, state authority, accountable officer, supporting documents, approval, liquidation, and audit records.',
      'Separate budget authority, procurement, disbursement, inspection, acceptance, liquidation, inventory, reporting, and COA audit response.',
      'Protect vouchers, payroll, beneficiary lists, bank details, receipts, inspection reports, and audit workpapers with access and retention controls.',
      'Avoid releases, reimbursements, or advances without documentary support, liquidation timeline, segregation of duties, and audit trail.',
    ],
    commonGaps: [
      'Cash advances, grants, or reimbursements lack liquidation deadlines and supporting-document rules.',
      'Budget, procurement, payment, inspection, and acceptance roles are handled by the same office without segregation.',
      'Public-funds records lack custody, retention, privacy, and audit-response routing.',
    ],
  },
  {
    id: 'ra-7080',
    statute: 'RA 7080',
    title: 'Republic Act No. 7080',
    shortTitle: 'Plunder Act',
    year: 1991,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1991/ra_7080_1991.html',
    aliases: ['ra 7080', 'republic act 7080', 'plunder act', 'plunder law', 'ill gotten wealth'],
    topics: ['plunder', 'public funds', 'ill-gotten wealth', 'public accountability', 'anti-corruption'],
    keywords: [
      'plunder',
      'ill gotten wealth',
      'public funds',
      'misappropriation',
      'conversion',
      'kickback',
      'commission',
      'aggregate amount',
      'conspiracy',
      'public officer',
    ],
    summary:
      'A high-severity anti-corruption statute focused on public officers who amass ill-gotten wealth through combinations or series of overt criminal acts involving public funds, kickbacks, commissions, or similar schemes.',
    obligations: [
      'For high-value public-funds, asset, procurement, subsidy, or concession workflows, add anti-collusion, conflict, audit, escalation, and law-enforcement referral controls.',
      'Separate ordinary audit findings from suspected conversion, kickbacks, commissions, repeated schemes, asset accumulation, or conspiracy indicators.',
      'Preserve evidence, approvals, payment records, beneficiary lists, supplier records, asset records, and complaints with chain-of-custody and confidentiality controls.',
      'Avoid vague discretionary fund release or asset transfer authority without approval thresholds, segregation of duties, and independent audit review.',
    ],
    commonGaps: [
      'High-value funds or assets can be released repeatedly without approval thresholds and independent review.',
      'Kickback, commission, conversion, conflict, and collusion risks are not screened separately.',
      'Evidence preservation and escalation paths for suspected serious corruption are missing.',
    ],
  },
  {
    id: 'ra-10149',
    statute: 'RA 10149',
    title: 'Republic Act No. 10149',
    shortTitle: 'GOCC Governance Act of 2011',
    year: 2011,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2011/ra_10149_2011.html',
    aliases: ['ra 10149', 'republic act 10149', 'gocc governance act', 'government owned or controlled corporation governance', 'gocc board'],
    topics: ['gocc', 'corporate governance', 'public corporations', 'board accountability', 'performance governance'],
    keywords: [
      'gocc',
      'government owned or controlled corporation',
      'governance commission',
      'board of directors',
      'fit and proper',
      'performance agreement',
      'public corporate governance',
      'compensation',
      'director',
      'trustee',
    ],
    summary:
      'A governance framework for government-owned or controlled corporations, covering board accountability, fit-and-proper standards, performance agreements, compensation review, and oversight through the Governance Commission for GOCCs.',
    obligations: [
      'For GOCC, government corporate, subsidiary, board, or public-enterprise workflows, identify board duties, appointing or oversight body, fit-and-proper standards, performance targets, disclosures, compensation review, and audit controls.',
      'Separate GOCC corporate governance from ordinary LGU, private corporation, procurement, public-service, compensation, and COA audit rules.',
      'Protect board records, performance reports, conflict disclosures, compensation records, and sensitive corporate information.',
      'Avoid board approvals, benefits, or transactions without conflict checks, performance basis, oversight route, and audit trail.',
    ],
    commonGaps: [
      'GOCC or public-enterprise policies omit board accountability, performance targets, and oversight routing.',
      'Director, trustee, compensation, and conflict disclosures lack custody and disclosure controls.',
      'Corporate approvals are treated like ordinary office memoranda without governance or audit records.',
    ],
  },
  {
    id: 'ra-6758',
    statute: 'RA 6758',
    title: 'Republic Act No. 6758',
    shortTitle: 'Compensation and Position Classification Act of 1989',
    year: 1989,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1989/ra_6758_1989.html',
    aliases: ['ra 6758', 'republic act 6758', 'compensation and position classification act', 'salary standardization', 'public sector compensation'],
    topics: ['public compensation', 'salary grades', 'position classification', 'allowances', 'government personnel'],
    keywords: [
      'salary grade',
      'position classification',
      'compensation',
      'allowance',
      'honorarium',
      'benefits',
      'government personnel',
      'public officer',
      'dbm',
      'standardized salary',
    ],
    summary:
      'A public-sector compensation framework for standardized salaries, position classification, allowances, benefits, and government personnel pay controls.',
    obligations: [
      'For salary, allowance, honorarium, incentive, benefit, staffing, or position policies, state legal authority, eligible positions, salary grade or classification, funding source, approval office, and audit records.',
      'Separate employee compensation from procurement payments, grants, consultancy contracts, rewards, social benefits, and GOCC compensation controls.',
      'Protect payroll, personnel, eligibility, appointment, and benefit records with privacy, retention, and access controls.',
      'Avoid ad hoc allowances, honoraria, incentives, or benefits without legal basis, position classification, funding, and audit review.',
    ],
    commonGaps: [
      'Allowances, honoraria, or incentives are created without legal basis, eligibility, salary-grade, or DBM/approval review.',
      'Payroll, appointment, and benefit records lack custody, privacy, and audit controls.',
      'Compensation, contractor payments, and beneficiary grants are mixed without classification.',
    ],
  },
  {
    id: 'ra-11199',
    statute: 'RA 11199',
    title: 'Republic Act No. 11199',
    shortTitle: 'Social Security Act of 2018',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11199_2019.html',
    aliases: ['ra 11199', 'republic act 11199', 'social security act of 2018', 'social security law', 'sss law'],
    topics: ['social security', 'sss', 'employee benefits', 'employer contributions', 'retirement benefits'],
    keywords: [
      'sss',
      'social security',
      'employer contribution',
      'employee contribution',
      'member registration',
      'premium remittance',
      'sickness benefit',
      'disability benefit',
      'retirement benefit',
      'death benefit',
      'self employed',
      'household employer',
      'delinquent contribution',
    ],
    summary:
      'A social-security framework for private-sector and covered members, including compulsory coverage, employer and employee contributions, remittance, member records, benefits, claims, and enforcement for delinquency.',
    obligations: [
      'For private employment, contractor-heavy staffing, household employer, payroll, benefits, or member-service workflows, identify covered members, employer duties, contribution and remittance timing, benefit claim path, and record owner.',
      'Separate SSS registration, contribution collection, payroll deduction, benefit eligibility, claims, dispute handling, and privacy of member records.',
      'Protect payroll, employment, contribution, claim, medical, disability, retirement, death-benefit, and dependent records with access, retention, and disclosure controls.',
      'Avoid vague benefit promises without member classification, contribution basis, remittance accountability, proof requirements, and escalation route for unpaid or disputed contributions.',
    ],
    commonGaps: [
      'Policies mention employee benefits but omit SSS registration, contribution basis, remittance deadline, or delinquency handling.',
      'Sickness, disability, retirement, or death-benefit claims are not tied to documentary proof and accountable office ownership.',
      'Payroll and member records lack privacy, retention, and audit controls.',
    ],
  },
  {
    id: 'ra-8291',
    statute: 'RA 8291',
    title: 'Republic Act No. 8291',
    shortTitle: 'Government Service Insurance System Act of 1997',
    year: 1997,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1997/ra_8291_1997.html',
    aliases: ['ra 8291', 'republic act 8291', 'gsis act', 'government service insurance system act', 'gsis law'],
    topics: ['gsis', 'government employee insurance', 'retirement', 'separation benefits', 'public personnel benefits'],
    keywords: [
      'gsis',
      'government service insurance',
      'government employee',
      'compulsory life insurance',
      'service record',
      'retirement',
      'separation benefit',
      'disability benefit',
      'survivorship benefit',
      'premium contribution',
      'member record',
    ],
    summary:
      'A government-employee insurance framework covering GSIS membership, premium contributions, life insurance, retirement, separation, disability, survivorship, service records, and benefit claims.',
    obligations: [
      'For government personnel, appointment, payroll, retirement, separation, disability, survivorship, or service-record workflows, state GSIS membership, contribution, service-credit, claim, and records custody controls.',
      'Separate GSIS benefits from SSS, public compensation, payroll, HR discipline, retirement processing, and privacy controls.',
      'Protect service records, payroll, contribution, insurance, medical, disability, retirement, and survivor-claim files with access, retention, and authorized-disclosure rules.',
      'Avoid processing benefit or separation claims without service-record verification, accountable HR office, documentary proof, timeline, and appeal or correction path.',
    ],
    commonGaps: [
      'Government employee benefit policies omit GSIS membership, premium, service-record, and claim-verification controls.',
      'Retirement, separation, disability, and survivorship claims lack documentary proof and correction process.',
      'Sensitive HR, payroll, and beneficiary records are not assigned to a custodian with retention and access rules.',
    ],
  },
  {
    id: 'ra-9679',
    statute: 'RA 9679',
    title: 'Republic Act No. 9679',
    shortTitle: 'Home Development Mutual Fund Law of 2009',
    year: 2009,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2009/ra_9679_2009.html',
    aliases: ['ra 9679', 'republic act 9679', 'home development mutual fund law', 'pag ibig law', 'hdmf law'],
    topics: ['pag-ibig', 'housing savings', 'employee benefits', 'employer contributions', 'housing loans'],
    keywords: [
      'pag ibig',
      'pag-ibig',
      'home development mutual fund',
      'hdmf',
      'housing loan',
      'member savings',
      'employee contribution',
      'employer contribution',
      'membership',
      'remittance',
      'provident benefit',
    ],
    summary:
      'A mandatory savings and housing-finance framework for Pag-IBIG/HDMF membership, employer and employee contributions, member savings, housing loans, provident benefits, and remittance records.',
    obligations: [
      'For payroll, housing-loan assistance, employee benefits, or member savings workflows, identify covered members, contribution basis, employer remittance, loan or benefit criteria, and documentary proof.',
      'Separate Pag-IBIG membership and savings from SSS, PhilHealth, GSIS, payroll, housing program selection, and privacy controls.',
      'Protect payroll, contribution, housing-loan, savings, employer remittance, dependent, and financial records with access, retention, and authorized disclosure.',
      'Avoid housing or savings benefit workflows without eligibility, contribution history, loan criteria, proof requirements, records custody, and complaint or correction path.',
    ],
    commonGaps: [
      'Payroll policies list Pag-IBIG but omit membership, contribution, remittance, or records ownership.',
      'Housing assistance or loan references lack eligibility, contribution history, documentary proof, and complaint route.',
      'Member savings and housing-loan records lack privacy and retention controls.',
    ],
  },
  {
    id: 'ra-11210',
    statute: 'RA 11210',
    title: 'Republic Act No. 11210',
    shortTitle: '105-Day Expanded Maternity Leave Law',
    year: 2019,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2019/ra_11210_2019.html',
    aliases: ['ra 11210', 'republic act 11210', 'expanded maternity leave law', '105-day maternity leave', 'maternity leave law'],
    topics: ['maternity leave', 'employee benefits', 'women workers', 'parental leave', 'workplace benefits'],
    keywords: [
      'maternity leave',
      '105 day',
      'expanded maternity',
      'women worker',
      'childbirth',
      'miscarriage',
      'emergency termination of pregnancy',
      'solo parent extension',
      'leave allocation',
      'non discrimination',
      'postnatal care',
    ],
    summary:
      'A maternity-leave framework for covered women workers, including 105-day leave benefits, additional leave options, solo-parent extension, allocation, benefit processing, and non-discrimination safeguards.',
    obligations: [
      'For HR, payroll, leave, pregnancy, childbirth, miscarriage, or return-to-work workflows, state eligibility, notice, benefit computation, leave period, optional allocation, extension, and non-discrimination controls.',
      'Separate maternity leave from sick leave, paternity leave, solo-parent benefits, SSS benefit processing, workplace accommodation, and privacy of health records.',
      'Protect pregnancy, childbirth, medical, benefit, payroll, and leave records with confidentiality, minimum access, retention, and authorized-disclosure rules.',
      'Avoid leave policies that require excessive proof, penalize pregnancy, ignore benefit payment, or omit return-to-work and grievance safeguards.',
    ],
    commonGaps: [
      'Leave policies mention maternity but omit 105-day entitlement, extension, allocation, benefit payment, or return-to-work protection.',
      'Miscarriage or emergency termination cases are not covered in the leave workflow.',
      'Pregnancy and medical records lack confidentiality, retention, and restricted-access rules.',
    ],
  },
  {
    id: 'ra-8187',
    statute: 'RA 8187',
    title: 'Republic Act No. 8187',
    shortTitle: 'Paternity Leave Act of 1996',
    year: 1996,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1996/ra_8187_1996.html',
    aliases: ['ra 8187', 'republic act 8187', 'paternity leave act', 'paternity leave law'],
    topics: ['paternity leave', 'employee benefits', 'family leave', 'workplace benefits'],
    keywords: [
      'paternity leave',
      'seven days',
      'married male employee',
      'lawful spouse',
      'childbirth',
      'miscarriage',
      'leave benefit',
      'notice',
      'family support',
    ],
    summary:
      'A paternity-leave framework for eligible married male employees, covering leave entitlement around childbirth or miscarriage, notice, documentation, benefit processing, and records.',
    obligations: [
      'For HR, payroll, leave, childbirth, or miscarriage workflows, state eligibility, notice timing, proof requirements, leave period, pay or benefit treatment, and record owner.',
      'Separate paternity leave from maternity leave, solo-parent benefits, sick leave, family emergency leave, and privacy of family or medical records.',
      'Protect spouse, childbirth, miscarriage, leave, payroll, and benefit records with confidentiality, retention, and access controls.',
      'Avoid discretionary approval rules without eligibility, notice, documentation, decision timeline, denial reason, and grievance path.',
    ],
    commonGaps: [
      'Paternity leave is listed but eligibility, notice, proof, paid-leave treatment, and records are not specified.',
      'Childbirth and miscarriage cases are not both handled.',
      'Family and medical leave records lack confidentiality and retention controls.',
    ],
  },
  {
    id: 'ra-10361',
    statute: 'RA 10361',
    title: 'Republic Act No. 10361',
    shortTitle: 'Domestic Workers Act or Batas Kasambahay',
    year: 2013,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2013/ra_10361_2013.html',
    aliases: ['ra 10361', 'republic act 10361', 'domestic workers act', 'batas kasambahay', 'kasambahay law'],
    topics: ['kasambahay', 'domestic workers', 'household employment', 'labor standards', 'social benefits'],
    keywords: [
      'kasambahay',
      'domestic worker',
      'household helper',
      'household employer',
      'employment contract',
      'minimum wage',
      'rest day',
      'service incentive leave',
      'sss',
      'philhealth',
      'pag ibig',
      'board lodging',
      'termination',
    ],
    summary:
      'A domestic-work framework covering written employment terms, minimum wage, rest periods, benefits, social protection, household employer duties, termination, and complaint handling for kasambahay arrangements.',
    obligations: [
      'For household employment, domestic worker, caretaker, driver, cook, helper, or live-in service workflows, state written contract terms, wage, rest day, leave, social benefits, humane treatment, and complaint route.',
      'Separate kasambahay protections from ordinary private employment, contractor service, family support, SSS, PhilHealth, Pag-IBIG, child protection, and privacy controls.',
      'Protect contract, wage, social-benefit, identity, residence, health, complaint, and termination records with privacy, retention, and authorized-disclosure rules.',
      'Avoid informal household-worker arrangements without written terms, wage and rest safeguards, social-benefit registration, termination standards, and local dispute or complaint support.',
    ],
    commonGaps: [
      'Household worker policies omit written contract, wage, rest day, benefit registration, or termination rules.',
      'Kasambahay arrangements are misclassified as casual help without social protection and complaint channels.',
      'Identity, residence, health, and wage records lack confidentiality and retention safeguards.',
    ],
  },
  {
    id: 'ra-10606',
    statute: 'RA 10606',
    title: 'Republic Act No. 10606',
    shortTitle: 'National Health Insurance Act of 2013',
    year: 2013,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2013/ra_10606_2013.html',
    aliases: ['ra 10606', 'republic act 10606', 'national health insurance act of 2013', 'philhealth law', 'national health insurance law'],
    topics: ['philhealth', 'national health insurance', 'employee benefits', 'premium contributions', 'health benefits'],
    keywords: [
      'philhealth',
      'national health insurance',
      'premium contribution',
      'employer remittance',
      'member registration',
      'dependent',
      'health insurance',
      'benefit claim',
      'health care provider',
      'indigent member',
      'sponsored member',
    ],
    summary:
      'A national health-insurance framework covering PhilHealth membership, premium contributions, employer remittance, dependent coverage, benefit claims, provider coordination, and member records.',
    obligations: [
      'For payroll, employee benefits, health-benefit, member registration, dependent coverage, or provider-referral workflows, state membership, premium contribution, remittance, eligibility, claim, and record controls.',
      'Separate PhilHealth premium and benefit processes from SSS, GSIS, Pag-IBIG, universal health service delivery, payroll, and privacy controls.',
      'Protect health insurance, contribution, dependent, claim, diagnosis, provider, and benefit records with confidentiality, access, retention, and authorized-disclosure rules.',
      'Avoid health-benefit workflows without member classification, premium responsibility, remittance records, claim documentation, complaint path, and privacy safeguards.',
    ],
    commonGaps: [
      'PhilHealth is mentioned but membership, premium contribution, employer remittance, and claim responsibilities are not assigned.',
      'Dependent or benefit claims lack documentary proof, privacy controls, and correction process.',
      'Health insurance records are mixed with ordinary HR files without access and retention safeguards.',
    ],
  },
  {
    id: 'ra-8484',
    statute: 'RA 8484',
    title: 'Republic Act No. 8484',
    shortTitle: 'Access Devices Regulation Act of 1998',
    year: 1998,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1998/ra_8484_1998.html',
    aliases: ['ra 8484', 'republic act 8484', 'access devices regulation act', 'access device law', 'credit card fraud law'],
    topics: ['access devices', 'payment fraud', 'credit cards', 'electronic transactions', 'financial evidence'],
    keywords: [
      'access device',
      'credit card',
      'debit card',
      'atm card',
      'cardholder',
      'account number',
      'unauthorized transaction',
      'counterfeit card',
      'skimming',
      'payment fraud',
      'transaction record',
      'issuer',
    ],
    summary:
      'A payment-access-device framework covering credit cards, debit cards, account numbers, cardholder data, counterfeit or unauthorized access devices, fraudulent transactions, issuer records, and payment-fraud evidence.',
    obligations: [
      'For card payments, online checkout, wallet-linked cards, merchant processing, account-number handling, or fraud reports, state authorization, authentication, transaction logging, dispute intake, evidence preservation, and issuer or provider coordination.',
      'Separate access-device fraud from cybercrime, AML, financial consumer protection, data privacy, bank secrecy, and ordinary payment collection.',
      'Protect cardholder, account-number, transaction, dispute, device, identity, and evidence records with restricted access, retention, redaction, and authorized-disclosure controls.',
      'Avoid storing or exposing payment credentials without purpose limitation, security controls, fraud monitoring, complaint route, and evidence custody.',
    ],
    commonGaps: [
      'Payment policies mention fraud but omit access-device scope, issuer coordination, transaction logs, and evidence preservation.',
      'Cardholder and account-number records are handled like ordinary customer data without stricter access and redaction.',
      'Unauthorized transaction disputes lack intake, investigation, recordkeeping, and escalation timelines.',
    ],
  },
  {
    id: 'ra-4200',
    statute: 'RA 4200',
    title: 'Republic Act No. 4200',
    shortTitle: 'Anti-Wiretapping Law',
    year: 1965,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1965/ra_4200_1965.html',
    aliases: ['ra 4200', 'republic act 4200', 'anti wiretapping law', 'anti-wiretapping act', 'wiretapping law'],
    topics: ['wiretapping', 'communications privacy', 'recordings', 'surveillance', 'evidence handling'],
    keywords: [
      'wiretapping',
      'wire tap',
      'recorded conversation',
      'phone call recording',
      'oral communication',
      'interception',
      'secret recording',
      'surveillance',
      'consent',
      'communications privacy',
      'recording device',
      'evidence custody',
    ],
    summary:
      'A communications-privacy framework addressing interception or recording of private communications, consent or lawful authority, restricted use, evidence custody, and protection against unauthorized wiretapping.',
    obligations: [
      'For call recording, meeting recording, surveillance, complaint evidence, monitoring, or hotline workflows, state consent or lawful authority, covered communications, recording purpose, access limits, custody, retention, and deletion.',
      'Separate wiretapping and communications interception from CCTV, private-image abuse, cybercrime, data privacy, labor monitoring, and ordinary minutes-taking.',
      'Protect recordings, transcripts, call metadata, complainant files, witness records, and device logs with confidentiality, role-based access, chain-of-custody, and authorized-disclosure rules.',
      'Avoid covert recording or monitoring without legal review, consent or authority, minimization, notice where required, and evidence-handling controls.',
    ],
    commonGaps: [
      'Hotline or investigation policies allow recording without consent, legal basis, retention, or access limits.',
      'Audio, call logs, or transcripts are shared broadly without chain-of-custody and confidentiality rules.',
      'Surveillance, CCTV, wiretapping, and evidence collection are mixed together without different safeguards.',
    ],
  },
  {
    id: 'bp-22',
    statute: 'BP 22',
    title: 'Batas Pambansa Blg. 22',
    shortTitle: 'Bouncing Checks Law',
    year: 1979,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/bataspam/bp1979/bp_22_1979.html',
    aliases: ['bp 22', 'batas pambansa blg 22', 'bouncing checks law', 'bouncing check law', 'dishonored check law'],
    topics: ['bouncing checks', 'payment collection', 'commercial transactions', 'financial evidence', 'debt disputes'],
    keywords: [
      'bouncing check',
      'dishonored check',
      'insufficient funds',
      'closed account',
      'postdated check',
      'notice of dishonor',
      'drawer',
      'payee',
      'bank notice',
      'payment demand',
      'check evidence',
      'settlement',
    ],
    summary:
      'A commercial-payment framework for checks dishonored due to insufficient funds or account issues, with emphasis on drawer/payee records, notice of dishonor, payment demand, evidence, and dispute handling.',
    obligations: [
      'For check payments, deposits, guarantees, collections, settlement, or payment-default workflows, state check custody, bank notice, notice of dishonor, payment or cure route, dispute intake, and evidence preservation.',
      'Separate BP 22 concerns from ordinary debt collection, estafa, consumer complaints, AML, bank secrecy, and civil settlement.',
      'Protect checks, bank notices, demand letters, receipts, settlement records, debtor or payee data, and dispute files with access, retention, and authorized-disclosure rules.',
      'Avoid punitive or public-shaming collection steps without notice, documentation, lawful escalation, settlement option, and privacy safeguards.',
    ],
    commonGaps: [
      'Collection workflows mention bounced checks but omit bank notice, notice of dishonor, evidence custody, or payment/cure route.',
      'Check, bank, and debtor records are not protected from unnecessary disclosure.',
      'Debt collection, criminal escalation, and settlement are mixed without clear owner or due-process safeguards.',
    ],
  },
  {
    id: 'ra-9285',
    statute: 'RA 9285',
    title: 'Republic Act No. 9285',
    shortTitle: 'Alternative Dispute Resolution Act of 2004',
    year: 2004,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2004/ra_9285_2004.html',
    aliases: ['ra 9285', 'republic act 9285', 'alternative dispute resolution act', 'adr act', 'arbitration law', 'mediation law'],
    topics: ['alternative dispute resolution', 'arbitration', 'mediation', 'conciliation', 'commercial disputes'],
    keywords: [
      'alternative dispute resolution',
      'adr',
      'arbitration',
      'mediation',
      'conciliation',
      'neutral',
      'arbitral award',
      'settlement agreement',
      'confidentiality',
      'dispute resolution',
      'commercial dispute',
    ],
    summary:
      'A dispute-resolution framework supporting arbitration, mediation, conciliation, confidentiality, neutral selection, settlement agreements, arbitral awards, and coordination with court or administrative remedies where needed.',
    obligations: [
      'For contract, consumer, employment-adjacent, supplier, community, platform, or commercial dispute workflows, state whether ADR is voluntary or required by agreement, neutral selection, confidentiality, timelines, records, and escalation.',
      'Separate ADR from court litigation, administrative complaints, criminal referral, labor cases, VAWC/child-protection risks, and ordinary customer support.',
      'Protect mediation statements, settlement offers, documents, party identities, awards, and dispute records with confidentiality, role-based access, and retention controls.',
      'Avoid mediation where safety, coercion, criminal conduct, child protection, VAWC, or non-waivable rights require direct referral or formal process.',
    ],
    commonGaps: [
      'Dispute policies mention mediation but omit consent, neutral selection, confidentiality, timeline, and enforceability.',
      'ADR is used for sensitive cases where safety or legal referral should override informal settlement.',
      'Settlement records and mediation communications lack confidentiality and retention controls.',
    ],
  },
  {
    id: 'ra-10142',
    statute: 'RA 10142',
    title: 'Republic Act No. 10142',
    shortTitle: 'Financial Rehabilitation and Insolvency Act of 2010',
    year: 2010,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2010/ra_10142_2010.html',
    aliases: ['ra 10142', 'republic act 10142', 'financial rehabilitation and insolvency act', 'fria', 'insolvency law'],
    topics: ['insolvency', 'financial rehabilitation', 'creditor claims', 'liquidation', 'business distress'],
    keywords: [
      'financial rehabilitation',
      'insolvency',
      'liquidation',
      'debtor',
      'creditor',
      'stay order',
      'rehabilitation plan',
      'claims',
      'assets',
      'receiver',
      'restructuring',
      'corporate debtor',
    ],
    summary:
      'A financial-distress framework for rehabilitation, insolvency, liquidation, creditor claims, stay orders, asset inventories, receivership, restructuring plans, and court-supervised debtor-creditor processes.',
    obligations: [
      'For distressed businesses, unpaid creditors, restructuring, liquidation, asset disposal, or claims handling, state process owner, court or legal route, creditor notice, asset inventory, claim verification, records custody, and privacy.',
      'Separate FRIA rehabilitation and insolvency from ordinary collections, BP 22, AML, consumer disputes, procurement blacklisting, and corporate governance.',
      'Protect creditor lists, debtor records, financial statements, claim proofs, asset inventories, employee records, and restructuring plans with confidentiality, retention, and authorized disclosure.',
      'Avoid ad hoc asset transfers, selective creditor payments, or informal restructuring without legal review, notice, claim registry, and audit trail.',
    ],
    commonGaps: [
      'Restructuring policies omit creditor notice, claim verification, asset inventory, and court/legal process route.',
      'Liquidation or asset disposal can proceed without audit trail and authority checks.',
      'Financial distress records are not protected despite containing creditor, employee, bank, and commercial data.',
    ],
  },
  {
    id: 'ra-9510',
    statute: 'RA 9510',
    title: 'Republic Act No. 9510',
    shortTitle: 'Credit Information System Act',
    year: 2008,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2008/ra_9510_2008.html',
    aliases: ['ra 9510', 'republic act 9510', 'credit information system act', 'credit information law', 'credit reporting law'],
    topics: ['credit information', 'credit reporting', 'borrower data', 'financial records', 'data privacy'],
    keywords: [
      'credit information',
      'credit report',
      'credit bureau',
      'credit score',
      'credit information corporation',
      'cic',
      'borrower data',
      'basic credit data',
      'positive credit information',
      'negative credit information',
      'correction',
      'authorized access',
    ],
    summary:
      'A credit-information framework covering submission, access, use, correction, confidentiality, and security of borrower and credit records handled by credit information systems and authorized users.',
    obligations: [
      'For lending, credit scoring, borrower screening, credit reports, risk scoring, or financial onboarding, state legal basis, notice, authorized users, data fields, correction process, security, retention, and disclosure limits.',
      'Separate credit-information processing from bank secrecy, data privacy, financial consumer protection, AML KYC, and ordinary customer profiling.',
      'Protect borrower identity, credit history, repayment, score, adverse action, correction, and access logs with security, privacy, retention, and audit controls.',
      'Avoid using credit data for unrelated purposes, informal sharing, opaque denial decisions, or scoring without correction and complaint routes.',
    ],
    commonGaps: [
      'Credit workflows collect or share borrower data without notice, authorized-user rules, correction path, or access logging.',
      'Credit reports or scores are used for decisions without explanation, dispute handling, and retention controls.',
      'Credit information is mixed with ordinary marketing or profiling data without purpose limitation.',
    ],
  },
  {
    id: 'ra-386',
    statute: 'RA 386',
    title: 'Republic Act No. 386',
    shortTitle: 'Civil Code of the Philippines',
    year: 1949,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1949/ra_386_1949.html',
    aliases: ['ra 386', 'republic act 386', 'civil code', 'civil code of the philippines', 'new civil code'],
    topics: ['civil law', 'contracts', 'obligations', 'damages', 'property', 'agency', 'lease', 'sale', 'civil liability'],
    keywords: [
      'contract',
      'obligation',
      'consent',
      'object',
      'cause',
      'breach',
      'damages',
      'negligence',
      'quasi delict',
      'sale',
      'lease',
      'agency',
      'property',
      'prescription',
      'civil liability',
    ],
    summary:
      'The core civil-law framework for obligations, contracts, property, sales, leases, agency, damages, civil liability, and related private-law duties. It is useful for checking whether agreements and civil workflows identify parties, consent, object, cause, breach rules, remedies, and evidence. ',
    obligations: [
      'For contracts, state the parties, authority, consent, object, cause or consideration, obligations, acceptance, payment, performance standards, breach, notice, and remedies. ',
      'For civil liability, damages, negligence, or quasi-delict workflows, identify duty, breach, causation, injury, proof, responsible party, defenses, and settlement or litigation route. ',
      'For sale, lease, agency, service, or property arrangements, document scope, term, delivery, custody, risk, fees, termination, records, and authorized representatives. ',
      'Avoid vague obligations that cannot be proven, monitored, enforced, or linked to a responsible person or office.',
    ],
    commonGaps: [
      'Agreements mention services, payments, or duties without parties, authority, acceptance, consideration, performance standards, or remedies.',
      'Breach or negligence workflows lack evidence preservation, notice, cure period, damages method, and escalation route.',
      'Civil-liability language is mixed with criminal, administrative, or privacy issues without separating remedies and records.',
    ],
  },
  {
    id: 'eo-209-1987',
    statute: 'EO 209, s. 1987',
    title: 'Executive Order No. 209, s. 1987',
    shortTitle: 'Family Code of the Philippines',
    year: 1987,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/executive/execord/eo1987/eo_209_1987.html',
    aliases: ['eo 209', 'executive order 209', 'family code', 'family code of the philippines'],
    topics: ['family law', 'marriage', 'family relations', 'support', 'custody', 'parental authority', 'property relations'],
    keywords: [
      'marriage',
      'spouse',
      'family',
      'support',
      'custody',
      'child custody',
      'parental authority',
      'family home',
      'conjugal',
      'community property',
      'marital consent',
      'minor child',
      'separation',
    ],
    summary:
      'The main family-law framework for marriage, spouses, property relations, family home, support, parental authority, custody, and child-related civil obligations. It helps flag family-status, child-welfare, consent, proof, and confidentiality issues.',
    obligations: [
      'For marriage, spouse, family support, custody, or parental-authority workflows, state status proof, affected persons, authority, consent where relevant, child-welfare standards, confidentiality, and records custody.',
      'Separate ordinary family-status records from protection, violence, trafficking, child abuse, privacy, and court-supervised issues that need specialized routing.',
      'When minors or dependents are affected, identify the responsible parent, guardian, office, referral channel, and decision standard before collecting records or making determinations.',
      'Avoid informal settlement language that may pressure vulnerable parties or bypass court, social welfare, or protection procedures.',
    ],
    commonGaps: [
      'Family workflows mention support, custody, or marital status without proof, authority, child-welfare criteria, or referral path.',
      'Sensitive family and minor records are collected without confidentiality, access, retention, or authorized-disclosure controls.',
      'Policies treat family disputes as generic mediation even where protection, child welfare, or court process may be required.',
    ],
  },
  {
    id: 'act-3753',
    statute: 'Act No. 3753',
    title: 'Act No. 3753',
    shortTitle: 'Civil Registry Law',
    year: 1930,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/acts/act1930/act_3753_1930.html',
    aliases: ['act 3753', 'civil registry law', 'civil registrar', 'local civil registrar', 'civil registry'],
    topics: ['civil registry', 'vital records', 'birth certificate', 'marriage certificate', 'death certificate', 'local civil registrar'],
    keywords: [
      'birth certificate',
      'marriage certificate',
      'death certificate',
      'civil registry',
      'civil registrar',
      'local civil registrar',
      'psa',
      'vital events',
      'registration',
      'annotation',
      'certified copy',
    ],
    summary:
      'A civil-registration framework for recording births, marriages, deaths, and other vital events through civil registrars. It is useful when workflows depend on identity, family status, official certificates, annotations, or local civil-registry records.',
    obligations: [
      'For birth, marriage, death, identity, family-status, or vital-record workflows, identify the civil registry record, issuing office, requester authority, documentary proof, correction or annotation route, and privacy controls.',
      'Separate civil registry verification from ordinary ID collection, family-code determinations, data privacy, and records-retention duties.',
      'Protect certified copies, registry books, annotations, identity data, and family-status information with access, redaction, retention, and authorized-disclosure rules.',
      'Avoid allowing informal changes to civil-status facts without a legal correction, court, or administrative route.',
    ],
    commonGaps: [
      'Birth, marriage, or death certificate handling lacks registrar role, requester authority, proof requirements, correction route, and privacy safeguards.',
      'Identity or family-status workflows rely on unverified copies without certification, annotation, or record-custody controls.',
      'Civil registry data is shared broadly despite containing sensitive identity and family information.',
    ],
  },
  {
    id: 'ra-9048',
    statute: 'RA 9048',
    title: 'Republic Act No. 9048',
    shortTitle: 'Clerical or Typographical Error Correction in Civil Registry Entries',
    year: 2001,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2001/ra_9048_2001.html',
    aliases: ['ra 9048', 'republic act 9048', 'clerical error correction', 'civil registry correction', 'change of first name'],
    topics: ['civil registry', 'record correction', 'clerical error', 'first name change', 'local civil registrar'],
    keywords: [
      'clerical error',
      'typographical error',
      'first name',
      'nickname',
      'petition',
      'civil registrar',
      'registry correction',
      'annotation',
      'supporting documents',
    ],
    summary:
      'A civil-registry correction law allowing administrative correction of clerical or typographical errors and change of first name or nickname under defined procedures. It is useful for certificate-correction, annotation, proof, and petition workflows.',
    obligations: [
      'For certificate correction or first-name change workflows, state who may file, receiving civil registrar, petition contents, supporting documents, publication or notice where required, decision route, annotation, and appeal or review path.',
      'Separate clerical or typographical corrections from substantial changes that may need court process or other statutory authority.',
      'Protect petitions, IDs, certificates, supporting documents, notices, and annotations with privacy, custody, retention, and authorized-disclosure controls.',
      'Avoid accepting unsupported corrections or changing civil-status facts through informal office instructions.',
    ],
    commonGaps: [
      'Civil registry correction procedures do not separate clerical corrections from substantial changes.',
      'Petition, publication, supporting-document, annotation, and decision-record controls are missing.',
      'Sensitive identity records are corrected or disclosed without requester authority and audit trail.',
    ],
  },
  {
    id: 'ra-10172',
    statute: 'RA 10172',
    title: 'Republic Act No. 10172',
    shortTitle: 'Administrative Correction of Sex, Day, and Month in Civil Registry Entries',
    year: 2012,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2012/ra_10172_2012.html',
    aliases: ['ra 10172', 'republic act 10172', 'sex correction', 'date of birth correction', 'civil registry correction'],
    topics: ['civil registry', 'record correction', 'sex correction', 'birth date correction', 'local civil registrar'],
    keywords: [
      'sex',
      'gender marker',
      'day of birth',
      'month of birth',
      'birth certificate correction',
      'petition',
      'civil registrar',
      'medical certificate',
      'school record',
      'annotation',
    ],
    summary:
      'A civil-registry correction law expanding administrative correction to sex and day or month of birth in civil registry entries under defined evidence and publication safeguards.',
    obligations: [
      'For sex, day, or month-of-birth correction workflows, identify petitioner eligibility, civil registrar, required evidence, medical or public records where applicable, publication or posting, decision route, annotation, and appeal path.',
      'Separate administrative correction from changes that alter nationality, age, status, parentage, or other facts needing court or specialized legal review.',
      'Protect medical, school, identity, and registry records through confidentiality, limited access, retention, and authorized disclosure.',
      'Avoid using corrected records in downstream benefits, employment, school, or identity workflows without update, audit, and consistency checks.',
    ],
    commonGaps: [
      'Birth-record correction procedures omit required proof, publication or posting, civil registrar decision, and annotation steps.',
      'Sex or date-of-birth correction is treated as ordinary profile editing despite legal evidence and privacy implications.',
      'Downstream systems are not told how to update records after a correction is approved.',
    ],
  },
  {
    id: 'am-02-8-13-sc',
    statute: 'A.M. No. 02-8-13-SC',
    title: 'A.M. No. 02-8-13-SC',
    shortTitle: '2004 Rules on Notarial Practice',
    year: 2008,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/courts/supreme/am/am_02_8_13_sc_2008.html',
    aliases: ['am 02-8-13-sc', 'rules on notarial practice', 'notarial practice', 'notary rules', 'notarization'],
    topics: ['notarial practice', 'notary', 'affidavit', 'acknowledgment', 'jurat', 'document authentication'],
    keywords: [
      'notary',
      'notarization',
      'notarial register',
      'acknowledgment',
      'jurat',
      'affidavit',
      'competent evidence of identity',
      'personal appearance',
      'seal',
      'commission',
      'document authentication',
    ],
    summary:
      'Rules governing notarization, personal appearance, competent evidence of identity, acknowledgments, jurats, affidavits, notarial registers, seals, and notary responsibilities. Useful for affidavit, document-signing, identity, and evidence workflows.',
    obligations: [
      'For notarized documents, affidavits, acknowledgments, or jurats, require personal appearance, competent evidence of identity, document completeness, signature review, notarial register entry, seal, date, and notary details.',
      'Separate notarization from ordinary e-signature, witness, certification, and document-upload workflows.',
      'Protect copies, IDs, registers, affidavits, and supporting documents with access, custody, retention, and fraud-escalation controls.',
      'Avoid accepting blank, incomplete, backdated, remotely signed, or unsigned documents as notarized without legal review.',
    ],
    commonGaps: [
      'Document workflows say notarization is required but omit personal appearance, identity evidence, notarial register, and seal details.',
      'Affidavits and jurats are accepted without document completeness, signer authority, and custody checks.',
      'Notarized records are stored or shared without privacy and evidence-retention rules.',
    ],
  },
  {
    id: 'rules-of-court-evidence',
    statute: 'Rules of Court',
    title: 'Rules of Court',
    shortTitle: 'Rules on Evidence',
    year: 1989,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/courts/rules/rc_128-134_evidence.html',
    aliases: ['rules of court evidence', 'rules on evidence', 'evidence rules', 'rule 128', 'rule 129', 'rule 130', 'rule 132'],
    topics: ['evidence', 'admissibility', 'authentication', 'documents', 'witnesses', 'official records', 'hearsay'],
    keywords: [
      'evidence',
      'admissible',
      'admissibility',
      'authentication',
      'original document',
      'best evidence',
      'witness',
      'hearsay',
      'official record',
      'judicial notice',
      'chain of custody',
      'documentary evidence',
    ],
    summary:
      'The evidence framework for relevance, admissibility, authentication, documentary proof, testimonial proof, official records, hearsay issues, and court-facing evidence preparation.',
    obligations: [
      'For evidence, investigation, complaints, hearings, or claims, identify source, relevance, authenticity, custody, original or copy status, witness or custodian, retention, and disclosure limits.',
      'Separate internal records, official records, electronic records, affidavits, notarized documents, and court-ready evidence.',
      'Protect evidence logs, originals, copies, witness data, sensitive records, and investigation files with chain-of-custody and access controls.',
      'Avoid relying on screenshots, summaries, or hearsay-style statements without authentication and source documentation.',
    ],
    commonGaps: [
      'Evidence workflows collect records but omit source, authenticity, custodian, chain of custody, and retention.',
      'Screenshots, summaries, or copied documents are treated as conclusive without original-record or authentication controls.',
      'Witness, complainant, or sensitive records are disclosed without relevance, minimization, or authorized-access rules.',
    ],
  },
  {
    id: 'am-08-8-7-sc',
    statute: 'A.M. No. 08-8-7-SC',
    title: 'A.M. No. 08-8-7-SC',
    shortTitle: 'Rule of Procedure for Small Claims Cases',
    year: 2008,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/courts/supreme/am/am_08_8_7_sc_2008.html',
    aliases: ['am 08-8-7-sc', 'small claims', 'small claims cases', 'small claims court', 'money claim'],
    topics: ['small claims', 'money claims', 'debt collection', 'court procedure', 'settlement', 'civil claims'],
    keywords: [
      'small claims',
      'money claim',
      'statement of claim',
      'collection',
      'debt',
      'unpaid account',
      'promissory note',
      'court filing',
      'hearing',
      'settlement',
      'demand letter',
      'evidence',
    ],
    summary:
      'A simplified court procedure for small money claims, useful for debt collection, unpaid accounts, demand, evidence, settlement, and court-filing workflows.',
    obligations: [
      'For small money claims or debt collection workflows, identify claimant, respondent, amount, basis, evidence, demand or notice, venue, filing route, hearing, settlement, judgment, and records custody.',
      'Separate small claims from criminal collection threats, bounced-check issues, consumer complaints, insolvency, arbitration, and ordinary customer support.',
      'Preserve contracts, invoices, receipts, account statements, demand letters, checks, messages, and settlement records with privacy and evidence controls.',
      'Avoid collection language that uses harassment, public shaming, unauthorized disclosure, or criminal threats as a substitute for lawful claim processing.',
    ],
    commonGaps: [
      'Debt-collection workflows omit amount basis, proof, demand, venue, filing path, and settlement records.',
      'Small claims are mixed with criminal threat language, privacy-unsafe disclosure, or informal pressure tactics.',
      'Evidence and account records lack custody, retention, and authorized-access controls.',
    ],
  },
  {
    id: 'constitution-1987',
    statute: '1987 Constitution',
    title: 'The 1987 Constitution of the Republic of the Philippines',
    shortTitle: '1987 Philippine Constitution',
    year: 1987,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/consti/cons1987.html',
    aliases: ['1987 constitution', 'philippine constitution', 'constitution', 'bill of rights', 'article iii'],
    topics: ['constitutional law', 'bill of rights', 'due process', 'search and seizure', 'free speech', 'privacy', 'public assembly'],
    keywords: [
      'due process',
      'equal protection',
      'search',
      'seizure',
      'warrant',
      'probable cause',
      'custodial investigation',
      'right to counsel',
      'free speech',
      'peaceable assembly',
      'privacy of communication',
      'self incrimination',
      'speedy disposition',
    ],
    summary:
      'The constitutional baseline for government power, due process, equal protection, privacy of communication, search and seizure, custodial rights, free speech, peaceable assembly, and limits on penalties or enforcement.',
    obligations: [
      'For government enforcement, inspection, arrest, search, seizure, surveillance, public assembly, speech, or sanction workflows, state legal authority, objective standard, notice, hearing or response route, warrant or exception analysis, and appeal path.',
      'Protect custodial, complainant, witness, protester, minor, and sensitive-record rights with counsel, confidentiality, access, and records safeguards where relevant.',
      'Separate regulatory inspection from criminal investigation, search and seizure, data access, speech restriction, and public assembly controls.',
      'Avoid vague enforcement powers, blanket surveillance, warrantless access, prior restraints, or penalties without due process.',
    ],
    commonGaps: [
      'Enforcement powers are broad but no due-process, warrant, probable-cause, notice, or appeal controls are stated.',
      'Public assembly, speech, or online expression rules are treated as ordinary permit issues without constitutional safeguards.',
      'Custodial, witness, complainant, or sensitive records lack counsel, privacy, confidentiality, or access controls.',
    ],
  },
  {
    id: 'act-3815',
    statute: 'Act No. 3815',
    title: 'Act No. 3815',
    shortTitle: 'Revised Penal Code',
    year: 1930,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/acts/act1930/act_3815_1930.html',
    aliases: ['act 3815', 'revised penal code', 'rpc', 'penal code', 'criminal code'],
    topics: ['criminal law', 'offenses', 'penalties', 'theft', 'estafa', 'falsification', 'libel', 'physical injuries'],
    keywords: [
      'crime',
      'criminal offense',
      'felony',
      'penalty',
      'theft',
      'estafa',
      'fraud',
      'falsification',
      'libel',
      'slander',
      'physical injuries',
      'grave threats',
      'malicious mischief',
      'damage to property',
      'complaint',
      'affidavit',
    ],
    summary:
      'The general penal law defining many crimes, penalties, and liability concepts, including property, fraud, falsification, libel, threats, injuries, and other offenses commonly referenced in complaints.',
    obligations: [
      'For crime-reporting, disciplinary, complaint, fraud, theft, falsification, libel, injury, threat, or property-damage workflows, separate factual intake from legal classification, evidence custody, authority to investigate, and referral route.',
      'Identify complainant, respondent, act complained of, date, place, evidence, witnesses, injury or loss, preservation steps, and responsible receiving office.',
      'Avoid using criminal labels as automatic conclusions before legal review, evidence evaluation, due process, and authorized referral.',
      'Separate civil recovery, employment discipline, administrative action, settlement, barangay process, and criminal complaint handling.',
    ],
    commonGaps: [
      'Policies call conduct criminal but do not define evidence, complainant, witness, receiving office, referral, or due-process handling.',
      'Civil, administrative, and criminal remedies are mixed without separate routes and records.',
      'Criminal accusations are shared or published without confidentiality, evidence, and defamation-risk controls.',
    ],
  },
  {
    id: 'rules-criminal-procedure',
    statute: 'Rules of Court',
    title: 'Rules of Court',
    shortTitle: 'Rules on Criminal Procedure',
    year: 1985,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/courts/rules/rc_110-127_crim.html',
    aliases: ['rules of criminal procedure', 'criminal procedure', 'rule 110', 'rule 112', 'rule 113', 'rule 126'],
    topics: ['criminal procedure', 'complaints', 'preliminary investigation', 'arrest', 'search warrant', 'prosecution'],
    keywords: [
      'criminal complaint',
      'complaint affidavit',
      'information',
      'preliminary investigation',
      'inquest',
      'arrest',
      'warrant of arrest',
      'search warrant',
      'prosecutor',
      'subpoena',
      'probable cause',
      'custody',
      'bail',
      'arraignment',
    ],
    summary:
      'The procedural framework for criminal complaints, information, preliminary investigation, arrest, search warrants, prosecution, bail, arraignment, and court-facing criminal case workflows.',
    obligations: [
      'For criminal complaints, incident reports, arrests, warrants, inquest, preliminary investigation, or prosecution workflows, state receiving office, affidavit and evidence requirements, probable-cause review, notices, timelines, custody, and referral path.',
      'Separate administrative intake from prosecutor or court process, custodial rights, search and seizure, evidence preservation, and privacy rules.',
      'Track complaint affidavits, evidence inventories, subpoenas, notices, custody documents, warrant details, and case status with chain-of-custody and retention controls.',
      'Avoid internal policies that authorize arrest, search, detention, or criminal filing without lawful authority and procedural safeguards.',
    ],
    commonGaps: [
      'Complaint intake omits affidavit, evidence inventory, receiving office, notices, and prosecutor or court referral.',
      'Search, seizure, or arrest powers are assumed without warrant, probable cause, exception, custody, or rights safeguards.',
      'Criminal case records lack chain-of-custody, confidentiality, retention, and authorized-access controls.',
    ],
  },
  {
    id: 'ra-9344',
    statute: 'RA 9344',
    title: 'Republic Act No. 9344',
    shortTitle: 'Juvenile Justice and Welfare Act of 2006',
    year: 2006,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2006/ra_9344_2006.html',
    aliases: ['ra 9344', 'juvenile justice', 'juvenile justice and welfare act', 'children in conflict with the law', 'cicl'],
    topics: ['juvenile justice', 'child protection', 'diversion', 'children in conflict with the law', 'social welfare'],
    keywords: [
      'child in conflict with the law',
      'cicl',
      'minor offender',
      'juvenile',
      'diversion',
      'intervention program',
      'discernment',
      'bahay pag asa',
      'social worker',
      'child custody',
      'restorative justice',
      'confidentiality',
    ],
    summary:
      'A child-sensitive justice framework for children in conflict with the law, emphasizing age assessment, diversion, intervention, social welfare coordination, restorative justice, confidentiality, and protection from harmful detention practices.',
    obligations: [
      'For incidents involving minors accused of offenses, state age verification, discernment review where relevant, social worker coordination, parent or guardian notice, diversion or intervention route, confidentiality, and child-friendly records handling.',
      'Separate school discipline, barangay handling, police referral, social welfare case management, victim support, and court process.',
      'Protect child identity, family records, incident reports, assessment records, and diversion agreements with strict access and disclosure limits.',
      'Avoid adult detention, public identification, coercive settlement, or punitive handling without child-specific legal review.',
    ],
    commonGaps: [
      'Minor-offender workflows omit age verification, social worker role, diversion, guardian notice, and confidentiality.',
      'Child records are handled like ordinary incident reports despite identity and welfare risks.',
      'Discipline or law-enforcement escalation bypasses restorative, intervention, or child-protection safeguards.',
    ],
  },
  {
    id: 'ra-9165-drugs',
    statute: 'RA 9165',
    title: 'Republic Act No. 9165',
    shortTitle: 'Comprehensive Dangerous Drugs Act of 2002',
    year: 2002,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2002/ra_9165_2002.html',
    aliases: ['ra 9165 drugs', 'dangerous drugs act', 'comprehensive dangerous drugs act', 'drug law', 'pdea'],
    topics: ['dangerous drugs', 'drug enforcement', 'drug testing', 'chain of custody', 'rehabilitation', 'pdea'],
    keywords: [
      'dangerous drugs',
      'controlled substance',
      'drug testing',
      'pdea',
      'drug enforcement',
      'chain of custody',
      'inventory',
      'seizure',
      'laboratory examination',
      'rehabilitation',
      'drug-free workplace',
      'confidentiality',
    ],
    summary:
      'The dangerous-drugs framework covering prohibited acts, enforcement, drug testing, custody of seized items, laboratory examination, rehabilitation, and sensitive drug-related records.',
    obligations: [
      'For drug-related incidents, testing, workplace or school rules, seized items, or rehabilitation referrals, state legal authority, trained personnel, consent or lawful basis, chain of custody, inventory, laboratory handling, confidentiality, and referral route.',
      'Separate wellness, rehabilitation, employment discipline, school discipline, search and seizure, criminal referral, and health-data privacy.',
      'Protect test results, inventories, lab records, incident reports, identities, and health or rehabilitation records with strict access, retention, and disclosure controls.',
      'Avoid suspicion-only searches, public naming, informal detention, or drug-test disclosure without lawful authority and due process.',
    ],
    commonGaps: [
      'Drug policies mention testing or enforcement without consent or authority, chain of custody, lab handling, confidentiality, and appeal controls.',
      'Health, disciplinary, and criminal drug workflows are collapsed into one route.',
      'Drug incident records are disclosed broadly despite high stigma and privacy risk.',
    ],
  },
  {
    id: 'ra-10591',
    statute: 'RA 10591',
    title: 'Republic Act No. 10591',
    shortTitle: 'Comprehensive Firearms and Ammunition Regulation Act',
    year: 2013,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2013/ra_10591_2013.html',
    aliases: ['ra 10591', 'firearms law', 'firearms and ammunition regulation act', 'gun law'],
    topics: ['firearms', 'ammunition', 'licensing', 'security', 'public safety', 'weapons control'],
    keywords: [
      'firearm',
      'ammunition',
      'license to own and possess',
      'ltopf',
      'permit to carry',
      'gun',
      'weapon',
      'security guard',
      'storage',
      'transport',
      'registration',
      'revocation',
      'safe custody',
    ],
    summary:
      'A firearms and ammunition regulatory framework covering licensing, registration, possession, carrying, transfer, storage, transport, and public-safety controls.',
    obligations: [
      'For firearms, weapons, guards, transport, storage, or public-safety rules, state licensing or permit basis, identity verification, safe custody, transport limits, inventory, reporting, revocation or suspension, and incident escalation.',
      'Separate private ownership, security operations, workplace safety, event security, police referral, and evidence custody.',
      'Protect license records, firearm inventories, incident reports, security assignments, and identity data with access, retention, and authorized-disclosure rules.',
      'Avoid allowing possession, carrying, storage, or confiscation without authority, documentation, custody, and due-process controls.',
    ],
    commonGaps: [
      'Firearms policies omit license, permit, storage, transport, inventory, and incident reporting controls.',
      'Weapons incidents lack evidence custody, police coordination, and privacy rules.',
      'Security or workplace rules assume confiscation powers without authority and documentation.',
    ],
  },
  {
    id: 'bp-880',
    statute: 'BP 880',
    title: 'Batas Pambansa Blg. 880',
    shortTitle: 'Public Assembly Act of 1985',
    year: 1985,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/bataspam/bp1985/bp_880_1985.html',
    aliases: ['bp 880', 'batas pambansa 880', 'public assembly act', 'rally permit', 'protest permit'],
    topics: ['public assembly', 'free speech', 'peaceable assembly', 'permit', 'public order', 'local government'],
    keywords: [
      'public assembly',
      'rally',
      'protest',
      'demonstration',
      'march',
      'permit',
      'freedom park',
      'maximum tolerance',
      'public place',
      'peaceable assembly',
      'police assistance',
      'notice',
    ],
    summary:
      'A public-assembly framework balancing permit processing, freedom parks, police coordination, maximum tolerance, public order, and constitutional speech and assembly rights.',
    obligations: [
      'For rallies, protests, marches, demonstrations, public assemblies, or freedom-park rules, state receiving office, permit or notice requirements, timelines, grounds for action, written decision, maximum tolerance, police coordination, and appeal route.',
      'Separate traffic or safety coordination from prior restraint, viewpoint discrimination, criminal referral, surveillance, and crowd-control action.',
      'Protect organizer, participant, media, complaint, and police records with privacy, retention, and authorized-access safeguards.',
      'Avoid vague denial grounds, excessive fees, arbitrary restrictions, or blanket bans on peaceful assembly.',
    ],
    commonGaps: [
      'Public assembly procedures omit deadlines, written decision, appeal, maximum tolerance, and police coordination standards.',
      'Permit workflows allow viewpoint-based or open-ended denial without objective criteria.',
      'Organizer or participant data is collected without privacy and access controls.',
    ],
  },
  {
    id: 'ra-9745',
    statute: 'RA 9745',
    title: 'Republic Act No. 9745',
    shortTitle: 'Anti-Torture Act of 2009',
    year: 2009,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2009/ra_9745_2009.html',
    aliases: ['ra 9745', 'anti torture act', 'anti-torture act', 'torture law'],
    topics: ['human rights', 'custodial rights', 'detention', 'law enforcement', 'torture prevention'],
    keywords: [
      'torture',
      'custody',
      'detention',
      'interrogation',
      'ill treatment',
      'medical examination',
      'law enforcement',
      'human rights',
      'custodial investigation',
      'complaint',
      'documentation',
      'protection',
    ],
    summary:
      'A human-rights statute prohibiting torture and related ill treatment, with safeguards around custody, interrogation, documentation, medical examination, reporting, and accountability.',
    obligations: [
      'For detention, custody, questioning, disciplinary isolation, or law-enforcement coordination, state responsible officer, rights notice, counsel and family notification where relevant, medical examination, documentation, complaint route, and independent review.',
      'Separate lawful security measures from coercion, punishment, interrogation, retaliation, and prohibited treatment.',
      'Protect custody logs, medical records, complaints, witness statements, CCTV, and incident records with chain-of-custody and anti-retaliation safeguards.',
      'Avoid policies that allow intimidation, forced confession, physical or psychological coercion, undocumented custody, or delayed medical access.',
    ],
    commonGaps: [
      'Custody or interrogation workflows omit rights notice, counsel, medical examination, complaint route, and independent review.',
      'Disciplinary or security policies allow coercive or punitive treatment without safeguards.',
      'Custody records and complaints lack confidentiality, anti-retaliation, and evidence-preservation controls.',
    ],
  },
  {
    id: 'ra-9520',
    statute: 'RA 9520',
    title: 'Republic Act No. 9520',
    shortTitle: 'Philippine Cooperative Code of 2008',
    year: 2009,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2009/ra_9520_2009.html',
    aliases: ['ra 9520', 'republic act 9520', 'cooperative code', 'philippine cooperative code', 'cooperative law'],
    topics: ['cooperatives', 'business registration', 'member governance', 'cda', 'capital', 'audit', 'patronage refund'],
    keywords: [
      'cooperative',
      'cda',
      'cooperative development authority',
      'members',
      'articles of cooperation',
      'bylaws',
      'board of directors',
      'share capital',
      'patronage refund',
      'general assembly',
      'audit committee',
      'education committee',
      'net surplus',
      'member records',
    ],
    summary:
      'A governance and registration framework for cooperatives, covering members, articles and bylaws, registration with the Cooperative Development Authority, capital, general assembly, board duties, committees, audit, net surplus, and member records.',
    obligations: [
      'For cooperative formation, lending, market, farmer, transport, worker, or community enterprise workflows, state cooperative type, CDA registration, articles and bylaws, membership rules, capital contributions, board and committee roles, audit, and general assembly process.',
      'Separate cooperative governance from corporation, association, securities, lending, procurement, social enterprise, and ordinary beneficiary-list handling.',
      'Protect member lists, capital accounts, patronage records, loan records, voting records, audit files, and complaints with privacy, retention, and authorized-disclosure controls.',
      'Avoid treating a cooperative as a loose beneficiary group without bylaws, member rights, accounting, audit, and dispute-resolution rules.',
    ],
    commonGaps: [
      'Cooperative programs mention members and capital but omit CDA registration, bylaws, board duties, committees, audit, and general assembly controls.',
      'Member contributions, patronage refunds, or surplus handling lack accounting, approval, and recordkeeping rules.',
      'Cooperative member data is handled like an ordinary public list without privacy and access controls.',
    ],
  },
  {
    id: 'ra-7042',
    statute: 'RA 7042',
    title: 'Republic Act No. 7042',
    shortTitle: 'Foreign Investments Act of 1991',
    year: 1991,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra1991/ra_7042_1991.html',
    aliases: ['ra 7042', 'republic act 7042', 'foreign investments act', 'foreign investment law'],
    topics: ['foreign investment', 'foreign equity', 'market entry', 'business registration', 'nationality restrictions'],
    keywords: [
      'foreign investor',
      'foreign equity',
      'foreign investment',
      'foreign ownership',
      'domestic market enterprise',
      'export enterprise',
      'negative list',
      'nationality restriction',
      'paid in capital',
      'sec registration',
      'dti registration',
      'investment promotion',
    ],
    summary:
      'A market-entry framework for foreign investors and foreign equity in Philippine enterprises, including domestic market and export-enterprise distinctions, nationality restrictions, registration, and the foreign investment negative list.',
    obligations: [
      'For foreign-owned or foreign-funded businesses, state business activity, ownership structure, investor nationality, domestic market or export classification, negative-list review, capital requirement, registration route, and report owner.',
      'Separate foreign-investment analysis from public-service, retail trade, land, media, education, security, banking, securities, tax, visa, and anti-dummy issues.',
      'Protect beneficial-owner, nationality, capitalization, board, shareholder, investment, and registration records with confidentiality, retention, and authorized-disclosure rules.',
      'Avoid approving foreign participation until activity restrictions, ownership caps, capitalization, and regulator filing duties are documented.',
    ],
    commonGaps: [
      'Foreign ownership is allowed without checking activity classification, negative-list restrictions, capital requirements, and registration documents.',
      'Foreign investor records lack beneficial-owner, nationality, tax, SEC/DTI, and privacy controls.',
      'Domestic market, export enterprise, public service, retail, and land restrictions are collapsed into a generic business permit step.',
    ],
  },
  {
    id: 'ra-11647',
    statute: 'RA 11647',
    title: 'Republic Act No. 11647',
    shortTitle: 'Amendments to the Foreign Investments Act',
    year: 2022,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2022/ra_11647_2022.html',
    aliases: ['ra 11647', 'republic act 11647', 'foreign investments act amendments', 'amended foreign investment law'],
    topics: ['foreign investment', 'foreign equity', 'market entry', 'investment promotion', 'inter-agency investment coordination'],
    keywords: [
      'foreign investment',
      'foreign investor',
      'foreign equity',
      'investment promotion',
      'domestic market enterprise',
      'micro and small domestic market enterprise',
      'inter agency investment promotion',
      'negative list',
      'capital requirement',
      'startup',
      'advanced technology',
    ],
    summary:
      'A modernization statute amending the Foreign Investments Act, relevant to updated foreign-investment rules, domestic market enterprise thresholds, investment promotion, and policy coordination.',
    obligations: [
      'When reviewing foreign-investor entry, check whether updated capital, activity, technology, startup, employment, and domestic-market enterprise rules affect eligibility.',
      'Document regulator or investment-promotion coordination, ownership restrictions, negative-list review, reporting owner, and periodic compliance updates.',
      'Separate current foreign-investment eligibility from older templates, retail trade, public service, land, securities, tax, and employment requirements.',
      'Avoid relying on stale market-entry assumptions without checking current amendments and activity-specific rules.',
    ],
    commonGaps: [
      'Foreign-investment checklists cite the original statute but do not account for updated thresholds, exceptions, or investment-promotion coordination.',
      'Startup, technology, domestic-market, and employment claims are used without evidence or documentation.',
      'Foreign investor compliance is not periodically reviewed after registration.',
    ],
  },
  {
    id: 'ra-8762',
    statute: 'RA 8762',
    title: 'Republic Act No. 8762',
    shortTitle: 'Retail Trade Liberalization Act of 2000',
    year: 2000,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2000/ra_8762_2000.html',
    aliases: ['ra 8762', 'retail trade liberalization act', 'retail trade law', 'foreign retailer'],
    topics: ['retail trade', 'foreign retailer', 'market entry', 'capitalization', 'business registration', 'consumer protection'],
    keywords: [
      'retail trade',
      'foreign retailer',
      'retail store',
      'minimum paid up capital',
      'investment per store',
      'dti',
      'sec',
      'local retail',
      'consumer welfare',
      'retail enterprise',
      'store opening',
      'market entry',
    ],
    summary:
      'A foreign-retail market-entry framework covering retail trade participation, capitalization, registration, stores, and compliance conditions for retail enterprises.',
    obligations: [
      'For retail businesses, marketplaces, stores, franchises, or foreign retailers, state retail activity, ownership, capitalization, registration route, store count or branch plan, consumer-facing obligations, and reporting owner.',
      'Separate retail trade analysis from ordinary e-commerce, wholesale, distribution, franchise, public service, foreign investment, consumer protection, tax, and local permit workflows.',
      'Protect investor, capitalization, store, supplier, consumer, and registration records with privacy, retention, and authorized-disclosure safeguards.',
      'Avoid opening or permitting a foreign retail operation without ownership, capital, registration, and consumer-facing compliance checks.',
    ],
    commonGaps: [
      'Retail policies do not distinguish domestic retail, foreign retail, wholesale, marketplace, franchise, and e-commerce roles.',
      'Foreign retailer capitalization, store, registration, and consumer-compliance evidence is missing.',
      'Retail customer and supplier records lack retention, privacy, and complaint controls.',
    ],
  },
  {
    id: 'ra-11595',
    statute: 'RA 11595',
    title: 'Republic Act No. 11595',
    shortTitle: 'Amendments to the Retail Trade Liberalization Act',
    year: 2021,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2021/ra_11595_2021.html',
    aliases: ['ra 11595', 'retail trade liberalization amendments', 'amended retail trade law', 'foreign retail amendment'],
    topics: ['retail trade', 'foreign retailer', 'capitalization', 'market entry', 'investment requirement'],
    keywords: [
      'retail trade',
      'foreign retailer',
      'paid up capital',
      'investment per store',
      'retail enterprise',
      'capitalization',
      'registration',
      'amendment',
      'foreign participation',
      'store opening',
    ],
    summary:
      'A statute amending the retail trade liberalization framework, relevant to updated capitalization and entry requirements for foreign retailers and retail enterprises.',
    obligations: [
      'For foreign retail entry, check current paid-up capital, investment-per-store, registration, and compliance requirements instead of relying on older retail templates.',
      'Document ownership, capitalization evidence, store plan, regulator filing, consumer-protection controls, tax registration, and local permit dependencies.',
      'Separate updated retail entry rules from foreign-investment, public-service, e-commerce, consumer-protection, and local-business-permit checks.',
      'Avoid stale capitalization thresholds or generic foreign-investment statements in retail-specific workflows.',
    ],
    commonGaps: [
      'Retail-entry checklists cite the old law but omit updated capital and investment-per-store rules.',
      'Foreign retail store openings proceed without registration, capitalization evidence, consumer-facing controls, or local permit alignment.',
      'Retail workflows do not assign ownership for periodic compliance review.',
    ],
  },
  {
    id: 'ra-11057',
    statute: 'RA 11057',
    title: 'Republic Act No. 11057',
    shortTitle: 'Personal Property Security Act',
    year: 2018,
    sourceName: 'Lawphil',
    sourceUrl: 'https://lawphil.net/statutes/repacts/ra2018/ra_11057_2018.html',
    aliases: ['ra 11057', 'personal property security act', 'ppsa', 'secured transactions law', 'movable collateral law'],
    topics: ['secured transactions', 'collateral', 'credit', 'movable property', 'security interest', 'registry'],
    keywords: [
      'security interest',
      'collateral',
      'movable property',
      'personal property',
      'secured creditor',
      'debtor',
      'notice registry',
      'perfection',
      'priority',
      'enforcement',
      'financing statement',
      'loan security',
      'receivables',
      'inventory',
    ],
    summary:
      'A secured-transactions framework for security interests in movable or personal property, including creation, perfection, notice registration, priority, enforcement, and debtor/creditor records.',
    obligations: [
      'For loans, credit, receivables, inventory, equipment, vehicles, movable collateral, or secured transactions, state debtor, secured creditor, collateral description, security agreement, perfection method, registry notice, priority, enforcement, and release process.',
      'Separate secured credit from ordinary debt collection, mortgage, pledge, chattel mortgage templates, consumer lending, credit reporting, privacy, and insolvency workflows.',
      'Protect collateral descriptions, debtor data, financing statements, notices, account records, enforcement records, and release documents with access, retention, and authorized-disclosure rules.',
      'Avoid treating movable collateral as enforceable without written security agreement, notice/perfection, priority review, and lawful enforcement steps.',
    ],
    commonGaps: [
      'Loan or credit workflows mention collateral but omit security agreement, collateral description, registration or perfection, priority, and release steps.',
      'Collateral enforcement is described without notice, custody, sale, accounting, dispute, and privacy safeguards.',
      'Debtor and collateral records are shared without purpose limitation, access control, and retention rules.',
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
  {
    triggers: ['procurement', 'bidding', 'bid', 'supplier', 'contract', 'bac', 'award'],
    expansions: ['new government procurement act', 'public bidding', 'bids and awards committee', 'contract implementation'],
  },
  {
    triggers: ['permit', 'license', 'clearance', 'service', 'transaction', 'citizen charter', 'red tape'],
    expansions: ['ease of doing business', 'citizen charter', 'processing time', 'anti red tape'],
  },
  {
    triggers: ['graft', 'corruption', 'corrupt practice', 'conflict of interest', 'kickback', 'unwarranted benefit'],
    expansions: ['anti graft and corrupt practices', 'conflict checks', 'recusal', 'audit trail'],
  },
  {
    triggers: ['saln', 'code of conduct', 'ethical standards', 'gift', 'public official', 'financial interest'],
    expansions: ['code of conduct and ethical standards', 'saln', 'gift rules', 'conflict disclosure'],
  },
  {
    triggers: ['coa', 'audit', 'public funds', 'cash advance', 'liquidation', 'voucher', 'disbursement'],
    expansions: ['government auditing code', 'commission on audit', 'supporting documents', 'liquidation'],
  },
  {
    triggers: ['plunder', 'ill gotten wealth', 'misappropriation', 'conversion', 'commission', 'aggregate amount'],
    expansions: ['plunder act', 'ill gotten wealth', 'public funds', 'evidence preservation'],
  },
  {
    triggers: ['gocc', 'government owned or controlled corporation', 'gocc board', 'performance agreement', 'fit and proper'],
    expansions: ['gocc governance act', 'board accountability', 'performance agreement', 'governance commission'],
  },
  {
    triggers: ['salary grade', 'position classification', 'honorarium', 'allowance', 'public sector compensation', 'dbm'],
    expansions: ['compensation and position classification', 'salary grade', 'public sector compensation', 'allowance controls'],
  },
  {
    triggers: ['sss', 'social security', 'employer contribution', 'employee contribution', 'sickness benefit', 'retirement benefit'],
    expansions: ['social security act', 'sss contribution', 'member registration', 'benefit claims'],
  },
  {
    triggers: ['gsis', 'government service insurance', 'service record', 'government employee retirement', 'separation benefit'],
    expansions: ['government service insurance system', 'service record', 'retirement benefit', 'survivorship benefit'],
  },
  {
    triggers: ['pag ibig', 'pag-ibig', 'hdmf', 'home development mutual fund', 'housing loan', 'member savings'],
    expansions: ['home development mutual fund', 'pag ibig contribution', 'member savings', 'housing loan eligibility'],
  },
  {
    triggers: ['maternity leave', '105 day', 'childbirth', 'miscarriage', 'solo parent extension', 'pregnancy leave'],
    expansions: ['expanded maternity leave', '105 day maternity leave', 'benefit payment', 'non discrimination'],
  },
  {
    triggers: ['paternity leave', 'spouse childbirth', 'seven days', 'family leave'],
    expansions: ['paternity leave act', 'leave eligibility', 'childbirth notice', 'paid leave benefit'],
  },
  {
    triggers: ['kasambahay', 'domestic worker', 'household helper', 'household employer', 'live in helper'],
    expansions: ['batas kasambahay', 'domestic worker contract', 'minimum wage', 'social benefits'],
  },
  {
    triggers: ['philhealth', 'national health insurance', 'premium contribution', 'health insurance premium', 'employer remittance'],
    expansions: ['national health insurance', 'philhealth membership', 'premium remittance', 'benefit claim'],
  },
  {
    triggers: ['access device', 'credit card fraud', 'debit card fraud', 'atm card', 'skimming', 'unauthorized transaction'],
    expansions: ['access devices regulation', 'cardholder data', 'payment fraud', 'transaction evidence'],
  },
  {
    triggers: ['wiretap', 'wiretapping', 'recorded conversation', 'phone call recording', 'secret recording', 'interception'],
    expansions: ['anti wiretapping', 'communications privacy', 'recording consent', 'evidence custody'],
  },
  {
    triggers: ['bouncing check', 'dishonored check', 'insufficient funds', 'postdated check', 'notice of dishonor'],
    expansions: ['bouncing checks law', 'notice of dishonor', 'payment demand', 'check evidence'],
  },
  {
    triggers: ['adr', 'alternative dispute', 'arbitration', 'mediation', 'conciliation', 'settlement agreement'],
    expansions: ['alternative dispute resolution', 'neutral selection', 'confidentiality', 'arbitral award'],
  },
  {
    triggers: ['insolvency', 'financial rehabilitation', 'liquidation', 'creditor claims', 'stay order', 'restructuring'],
    expansions: ['financial rehabilitation and insolvency', 'creditor notice', 'asset inventory', 'claims registry'],
  },
  {
    triggers: ['credit report', 'credit score', 'credit bureau', 'credit information', 'borrower data', 'cic'],
    expansions: ['credit information system', 'authorized access', 'correction process', 'borrower data security'],
  },
  {
    triggers: ['contract', 'obligation', 'civil liability', 'damages', 'negligence', 'quasi delict', 'sale', 'lease', 'agency'],
    expansions: ['civil code', 'contract consent', 'object and cause', 'breach remedies'],
  },
  {
    triggers: ['marriage', 'spouse', 'family support', 'custody', 'child custody', 'parental authority', 'family home'],
    expansions: ['family code', 'family status proof', 'child welfare', 'support and custody records'],
  },
  {
    triggers: ['birth certificate', 'marriage certificate', 'death certificate', 'civil registry', 'civil registrar', 'psa certificate'],
    expansions: ['civil registry law', 'local civil registrar', 'vital records', 'certificate annotation'],
  },
  {
    triggers: ['clerical error', 'typographical error', 'change first name', 'civil registry correction', 'wrong birth certificate'],
    expansions: ['ra 9048', 'civil registry correction petition', 'supporting documents', 'annotation'],
  },
  {
    triggers: ['sex correction', 'gender marker', 'wrong birth date', 'date of birth correction', 'day of birth', 'month of birth'],
    expansions: ['ra 10172', 'birth certificate correction', 'civil registrar petition', 'medical or public records'],
  },
  {
    triggers: ['notary', 'notarization', 'notarized', 'affidavit', 'jurat', 'acknowledgment', 'notarial register'],
    expansions: ['rules on notarial practice', 'personal appearance', 'competent evidence of identity', 'notarial register'],
  },
  {
    triggers: ['evidence', 'admissible', 'admissibility', 'authentication', 'witness', 'hearsay', 'official record'],
    expansions: ['rules on evidence', 'authentication', 'original document', 'chain of custody'],
  },
  {
    triggers: ['small claims', 'money claim', 'debt collection', 'unpaid account', 'demand letter', 'statement of claim'],
    expansions: ['small claims procedure', 'statement of claim', 'court filing', 'settlement evidence'],
  },
  {
    triggers: ['bill of rights', 'due process', 'search warrant', 'warrantless search', 'free speech', 'public assembly', 'custodial rights'],
    expansions: ['1987 constitution', 'bill of rights', 'probable cause', 'notice and hearing'],
  },
  {
    triggers: ['crime', 'criminal offense', 'revised penal code', 'theft', 'estafa', 'falsification', 'libel', 'physical injuries'],
    expansions: ['revised penal code', 'criminal complaint', 'evidence preservation', 'due process'],
  },
  {
    triggers: ['criminal complaint', 'preliminary investigation', 'inquest', 'arrest', 'search warrant', 'prosecutor', 'bail'],
    expansions: ['rules on criminal procedure', 'complaint affidavit', 'probable cause', 'custody records'],
  },
  {
    triggers: ['juvenile', 'minor offender', 'child in conflict with the law', 'cicl', 'diversion', 'bahay pag asa'],
    expansions: ['juvenile justice and welfare', 'age verification', 'diversion', 'social worker'],
  },
  {
    triggers: ['dangerous drugs', 'drug test', 'drug testing', 'pdea', 'controlled substance', 'drug free workplace'],
    expansions: ['dangerous drugs act', 'chain of custody', 'laboratory examination', 'rehabilitation referral'],
  },
  {
    triggers: ['firearm', 'gun', 'ammunition', 'weapon', 'ltopf', 'permit to carry', 'security guard'],
    expansions: ['firearms and ammunition regulation', 'license to own and possess', 'safe custody', 'transport permit'],
  },
  {
    triggers: ['rally', 'protest', 'demonstration', 'march', 'freedom park', 'maximum tolerance'],
    expansions: ['public assembly act', 'peaceable assembly', 'permit processing', 'maximum tolerance'],
  },
  {
    triggers: ['torture', 'detention', 'interrogation', 'custody', 'ill treatment', 'forced confession'],
    expansions: ['anti torture act', 'custodial rights', 'medical examination', 'complaint documentation'],
  },
  {
    triggers: ['cooperative', 'cda', 'cooperative members', 'patronage refund', 'articles of cooperation', 'coop bylaws'],
    expansions: ['philippine cooperative code', 'cooperative development authority', 'member governance', 'general assembly'],
  },
  {
    triggers: ['foreign investment', 'foreign investor', 'foreign equity', 'foreign ownership', 'negative list', 'domestic market enterprise'],
    expansions: ['foreign investments act', 'foreign investment negative list', 'ownership restrictions', 'capital requirement'],
  },
  {
    triggers: ['retail trade', 'foreign retailer', 'retail store', 'retail enterprise', 'paid up capital', 'investment per store'],
    expansions: ['retail trade liberalization', 'foreign retailer registration', 'capitalization', 'consumer-facing compliance'],
  },
  {
    triggers: ['security interest', 'collateral', 'movable property', 'personal property security', 'secured transaction', 'financing statement'],
    expansions: ['personal property security act', 'notice registry', 'perfection', 'priority and enforcement'],
  },
  {
    triggers: ['cyber', 'computer', 'online fraud', 'account', 'platform', 'hacking', 'phishing'],
    expansions: ['cybercrime prevention act', 'computer related fraud', 'illegal access', 'electronic evidence'],
  },
  {
    triggers: ['child', 'minor', 'grooming', 'luring', 'internet cafe', 'content host', 'csam'],
    expansions: ['anti child pornography act', 'online child protection', 'reporting', 'evidence preservation'],
  },
  {
    triggers: ['money laundering', 'aml', 'amla', 'kyc', 'covered transaction', 'suspicious transaction', 'beneficial owner'],
    expansions: ['anti money laundering act', 'customer due diligence', 'suspicious transaction report', 'amlc'],
  },
  {
    triggers: ['consumer', 'customer', 'warranty', 'label', 'advertising', 'product safety', 'complaint'],
    expansions: ['consumer act', 'consumer protection', 'product standards', 'consumer complaint'],
  },
  {
    triggers: ['competition', 'antitrust', 'cartel', 'price fixing', 'bid rigging', 'dominance', 'exclusive supplier'],
    expansions: ['philippine competition act', 'anti competitive agreement', 'abuse of dominant position', 'pcc'],
  },
  {
    triggers: ['financial consumer', 'lending', 'wallet', 'payment', 'loan', 'unauthorized transaction', 'financial fraud'],
    expansions: ['financial products and services consumer protection', 'financial consumer', 'disclosure', 'complaint handling'],
  },
  {
    triggers: ['hazardous', 'toxic', 'chemical', 'spill', 'nuclear', 'waste transport', 'medical waste'],
    expansions: ['toxic substances', 'hazardous waste', 'manifest', 'denr emb'],
  },
  {
    triggers: ['energy', 'electricity', 'power consumption', 'energy audit', 'efficiency', 'conservation'],
    expansions: ['energy efficiency and conservation', 'energy audit', 'energy conservation officer'],
  },
  {
    triggers: ['sim', 'mobile number', 'telco', 'text scam', 'subscriber', 'otp', 'sms fraud'],
    expansions: ['sim registration act', 'identity verification', 'subscriber data', 'deactivation'],
  },
  {
    triggers: ['photo', 'video', 'voyeurism', 'intimate image', 'cctv', 'takedown', 'non consensual'],
    expansions: ['anti photo and video voyeurism', 'consent', 'private image', 'evidence preservation'],
  },
  {
    triggers: ['sexual harassment', 'codi', 'decorum', 'training institution', 'moral ascendancy'],
    expansions: ['anti sexual harassment act', 'committee on decorum', 'complaint investigation'],
  },
  {
    triggers: ['bullying', 'cyberbullying', 'school policy', 'student safety', 'student discipline'],
    expansions: ['anti bullying act', 'school bullying policy', 'reporting intervention'],
  },
  {
    triggers: ['basic education', 'k to 12', 'k-12', 'curriculum', 'learner', 'enrollment', 'school operations'],
    expansions: ['enhanced basic education act', 'k to 12', 'learner records', 'deped implementation'],
  },
  {
    triggers: ['scholarship', 'tuition', 'college', 'tertiary education', 'student aid', 'student loan', 'unifast'],
    expansions: ['universal access to quality tertiary education', 'student financial assistance', 'benefit eligibility', 'ched'],
  },
  {
    triggers: ['alternative learning', 'als', 'out of school youth', 'adult learner', 'literacy', 'community learning center'],
    expansions: ['alternative learning system', 'out of school youth', 'learning facilitator', 'accreditation equivalency'],
  },
  {
    triggers: ['customs', 'import', 'export', 'tariff', 'duties', 'valuation', 'broker'],
    expansions: ['customs modernization and tariff act', 'customs declaration', 'valuation classification'],
  },
  {
    triggers: ['tax', 'taxpayer', 'bir', 'invoice', 'receipt', 'vat', 'withholding', 'tax return'],
    expansions: ['ease of paying taxes act', 'taxpayer rights', 'invoicing', 'filing payment'],
  },
  {
    triggers: ['philsys', 'philid', 'national id', 'psn', 'pcn', 'identity verification'],
    expansions: ['philippine identification system', 'national id', 'authentication', 'biometric data'],
  },
  {
    triggers: ['traffic', 'transport', 'driver license', 'vehicle registration', 'road safety', 'parking', 'traffic violation'],
    expansions: ['land transportation and traffic code', 'driver licensing', 'vehicle registration', 'traffic enforcement'],
  },
  {
    triggers: ['public service', 'public utility', 'franchise', 'transport operator', 'telecom operator', 'critical infrastructure'],
    expansions: ['public service act', 'public utility', 'franchise certificate', 'regulator oversight'],
  },
  {
    triggers: ['land title', 'property registration', 'torrens', 'register of deeds', 'certificate of title', 'survey plan'],
    expansions: ['property registration decree', 'certificate of title', 'register of deeds', 'survey verification'],
  },
  {
    triggers: ['indigenous peoples', 'ancestral domain', 'ancestral land', 'fpic', 'ncip', 'customary law'],
    expansions: ['indigenous peoples rights act', 'free prior and informed consent', 'ancestral domain', 'ncip'],
  },
  {
    triggers: ['protected area', 'buffer zone', 'biodiversity', 'pamb', 'nipas', 'enipas', 'ecotourism'],
    expansions: ['expanded national integrated protected areas system', 'protected areas', 'pamb', 'biodiversity safeguards'],
  },
  {
    triggers: ['labor', 'employee', 'wage', 'overtime', 'termination', 'dismissal', 'rest day', 'holiday pay'],
    expansions: ['labor code', 'working conditions', 'wages', 'termination procedure', 'dole nlrc'],
  },
  {
    triggers: ['age discrimination', 'age limit', 'age requirement', 'job post', 'hiring', 'promotion'],
    expansions: ['anti age discrimination employment', 'bona fide occupational qualification', 'employment application'],
  },
  {
    triggers: ['mental health', 'counseling', 'psychosocial', 'wellness', 'crisis intervention'],
    expansions: ['mental health act', 'patient rights', 'informed consent', 'confidentiality', 'referral'],
  },
  {
    triggers: ['vawc', 'violence against women', 'protection order', 'domestic violence', 'barangay protection'],
    expansions: ['anti violence against women and their children', 'protection order', 'safety plan', 'confidentiality'],
  },
  {
    triggers: ['trafficking', 'forced labor', 'recruitment', 'exploitation', 'victim protection'],
    expansions: ['expanded anti trafficking', 'victim protection', 'referral', 'confidentiality'],
  },
  {
    triggers: ['copyright', 'trademark', 'patent', 'brand', 'logo', 'software license', 'intellectual property'],
    expansions: ['intellectual property code', 'copyright', 'trademark', 'license', 'infringement'],
  },
  {
    triggers: ['securities', 'investment', 'public offering', 'investment contract', 'investor', 'broker', 'dealer'],
    expansions: ['securities regulation code', 'registration statement', 'investor protection', 'sec'],
  },
  {
    triggers: ['fda', 'food', 'drug', 'cosmetic', 'medical device', 'health product', 'supplement', 'recall'],
    expansions: ['food and drug administration', 'health product registration', 'labeling', 'adverse event', 'recall'],
  },
  {
    triggers: ['universal health care', 'primary care', 'philhealth', 'health service', 'patient navigation', 'local health'],
    expansions: ['universal health care act', 'primary care', 'health care provider network', 'referral system'],
  },
  {
    triggers: ['notifiable disease', 'outbreak', 'epidemic', 'contact tracing', 'quarantine', 'public health concern'],
    expansions: ['mandatory reporting of notifiable diseases', 'health surveillance', 'case investigation', 'public health event'],
  },
  {
    triggers: ['tobacco', 'smoking', 'cigarette', 'smoke free', 'designated smoking area', 'sale to minors'],
    expansions: ['tobacco regulation act', 'public place smoking restrictions', 'health warning', 'advertising limits'],
  },
  {
    triggers: ['vape', 'vapor product', 'e cigarette', 'heated tobacco', 'nicotine', 'online vape sale'],
    expansions: ['vaporized nicotine products regulation', 'age verification', 'packaging warning', 'online sale controls'],
  },
  {
    triggers: ['hiv', 'aids', 'hiv testing', 'counseling', 'partner notification', 'hiv status'],
    expansions: ['philippine hiv and aids policy', 'informed consent', 'confidentiality', 'anti discrimination'],
  },
  {
    triggers: ['immunization', 'vaccination', 'vaccine', 'immunization card', 'child vaccine', 'school entry vaccine'],
    expansions: ['mandatory infants and children immunization', 'parent guardian records', 'health center referral'],
  },
  {
    triggers: ['blood donation', 'blood donor', 'blood bank', 'blood drive', 'blood screening', 'transfusion'],
    expansions: ['national blood services', 'voluntary blood donation', 'donor screening', 'blood bank coordination'],
  },
  {
    triggers: ['cancer', 'cancer screening', 'cancer registry', 'patient navigation', 'palliative care', 'survivorship'],
    expansions: ['national integrated cancer control', 'cancer registry', 'screening referral', 'patient navigation'],
  },
  {
    triggers: ['reproductive health', 'family planning', 'responsible parenthood', 'maternal health', 'adolescent health'],
    expansions: ['responsible parenthood and reproductive health', 'informed choice', 'counseling', 'maternal referral'],
  },
  {
    triggers: ['heritage', 'cultural property', 'historic site', 'museum', 'archive', 'conservation', 'restoration'],
    expansions: ['national cultural heritage act', 'cultural property', 'conservation', 'ncca nhcp national museum'],
  },
  {
    triggers: ['public records', 'records management', 'records retention', 'archives', 'document disposal', 'retention schedule'],
    expansions: ['national archives act', 'records custodian', 'retention schedule', 'authorized disposal'],
  },
  {
    triggers: ['foi', 'freedom of information', 'information request', 'public disclosure', 'transparency', 'redaction'],
    expansions: ['freedom of information executive order', 'request intake', 'exceptions', 'denial appeal'],
  },
  {
    triggers: ['senior citizen', 'elderly', 'osca', 'senior discount', 'social pension'],
    expansions: ['expanded senior citizens act', 'senior citizen benefits', 'osca', 'discount vat exemption'],
  },
  {
    triggers: ['pwd', 'person with disability', 'disabled person', 'accessibility', 'reasonable accommodation'],
    expansions: ['magna carta for disabled persons', 'persons with disability', 'accessibility', 'reasonable accommodation'],
  },
  {
    triggers: ['building permit', 'occupancy permit', 'construction', 'renovation', 'structural', 'building official'],
    expansions: ['national building code', 'building permit', 'occupancy permit', 'inspection', 'building official'],
  },
  {
    triggers: ['sanitary permit', 'sanitation', 'food establishment', 'health certificate', 'sewage', 'public toilet'],
    expansions: ['code on sanitation', 'sanitary permit', 'health certificate', 'sanitation inspection'],
  },
  {
    triggers: ['accessibility law', 'ramp', 'accessible route', 'barrier free', 'public building accessibility'],
    expansions: ['bp 344 accessibility', 'ramps', 'accessible facilities', 'barrier free design'],
  },
  {
    triggers: ['child abuse', 'child protection', 'working child', 'child exploitation', 'minor abuse'],
    expansions: ['special protection of children', 'child abuse reporting', 'social welfare', 'confidentiality'],
  },
  {
    triggers: ['ofw', 'migrant worker', 'overseas employment', 'illegal recruitment', 'placement agency'],
    expansions: ['migrant workers act', 'department of migrant workers', 'overseas employment', 'illegal recruitment', 'worker welfare'],
  },
  {
    triggers: ['immigration', 'visa', 'foreign national', 'alien', 'overstay', 'deportation', 'blacklist'],
    expansions: ['philippine immigration act', 'bureau of immigration', 'alien registration', 'visa status', 'deportation due process'],
  },
  {
    triggers: ['passport', 'travel document', 'dfa passport', 'lost passport', 'passport renewal', 'minor passport'],
    expansions: ['new philippine passport act', 'passport application', 'citizenship proof', 'dfa consular records'],
  },
  {
    triggers: ['dual citizenship', 'citizenship reacquisition', 're-acquisition', 'oath of allegiance', 'natural born filipino'],
    expansions: ['citizenship retention and re-acquisition', 'dual citizenship', 'oath of allegiance', 'certificate handling'],
  },
  {
    triggers: ['naturalization', 'administrative naturalization', 'judicial naturalization', 'citizenship petition'],
    expansions: ['revised naturalization law', 'administrative naturalization law', 'petition publication hearing oath'],
  },
  {
    triggers: ['election', 'candidate', 'comelec', 'campaign period', 'vote buying', 'polling place', 'canvassing'],
    expansions: ['omnibus election code', 'candidate campaign', 'election offense', 'canvass records'],
  },
  {
    triggers: ['voter registration', 'voter list', 'registered voter', 'precinct', 'voter record', 'deactivation'],
    expansions: ['voters registration act', 'election registration board', 'voter records', 'precinct assignment'],
  },
  {
    triggers: ['campaign material', 'campaign poster', 'political advertisement', 'election propaganda', 'soce', 'campaign finance'],
    expansions: ['fair election act', 'campaign materials', 'statement of contributions and expenditures', 'sponsor disclosure'],
  },
  {
    triggers: ['automated election', 'vote counting', 'source code review', 'random manual audit', 'election transmission'],
    expansions: ['automated election system', 'source code review', 'random manual audit', 'election returns transmission'],
  },
  {
    triggers: ['sangguniang kabataan', 'sk', 'katipunan ng kabataan', 'youth council', 'sk funds', 'youth development'],
    expansions: ['sangguniang kabataan reform', 'youth development plan', 'sk funds', 'local youth development council'],
  },
  {
    triggers: ['bank secrecy', 'bank deposit', 'bank statement', 'deposit account', 'financial record'],
    expansions: ['bank secrecy law', 'bank deposits', 'financial confidentiality', 'authorized disclosure'],
  },
  {
    triggers: ['price freeze', 'price ceiling', 'hoarding', 'profiteering', 'basic necessities', 'prime commodities'],
    expansions: ['price act', 'basic necessities', 'prime commodities', 'price monitoring'],
  },
  {
    triggers: ['bmbe', 'barangay micro business', 'micro business', 'micro enterprise'],
    expansions: ['barangay micro business enterprises', 'certificate of authority', 'micro business incentives'],
  },
  {
    triggers: ['msme', 'small business', 'enterprise development', 'business support', 'market access'],
    expansions: ['magna carta for msmes', 'enterprise development', 'credit assistance', 'business support'],
  },
  {
    triggers: ['agriculture', 'farmers', 'fisherfolk', 'irrigation', 'post harvest', 'food security', 'rural credit'],
    expansions: ['agriculture and fisheries modernization', 'farm support', 'food security', 'market access'],
  },
  {
    triggers: ['organic agriculture', 'organic farming', 'organic label', 'organic certification', 'organic products'],
    expansions: ['organic agriculture act', 'organic certification', 'traceability', 'organic labeling'],
  },
  {
    triggers: ['food safety', 'food business', 'food chain', 'traceability', 'contamination', 'food recall'],
    expansions: ['food safety act', 'food chain', 'traceability', 'recall', 'inspection'],
  },
  {
    triggers: ['sagip saka', 'farmers organization', 'fisherfolk organization', 'direct purchase', 'agri enterprise'],
    expansions: ['sagip saka act', 'farmers and fisherfolk enterprise development', 'market linkage', 'direct purchase'],
  },
  {
    triggers: ['housing', 'socialized housing', 'resettlement', 'relocation', 'informal settler', 'urban poor', 'demolition'],
    expansions: ['urban development and housing act', 'socialized housing', 'beneficiary selection', 'consultation grievance'],
  },
  {
    triggers: ['dhsud', 'human settlements', 'homeowners association', 'subdivision', 'settlement planning', 'land use'],
    expansions: ['department of human settlements and urban development', 'housing regulation', 'settlement planning', 'complaint handling'],
  },
  {
    triggers: ['4ps', 'pantawid', 'cash assistance', 'conditional cash transfer', 'household grant', 'social assistance'],
    expansions: ['pantawid pamilyang pilipino program', 'conditional cash transfer', 'beneficiary validation', 'grievance'],
  },
  {
    triggers: ['solo parent', 'solo parents', 'parental leave', 'solo parent id', 'child care benefit'],
    expansions: ['expanded solo parents welfare act', 'solo parent eligibility', 'benefit verification', 'social welfare'],
  },
  {
    triggers: ['child marriage', 'minor marriage', 'underage marriage', 'solemnization of child marriage'],
    expansions: ['prohibition of child marriage', 'age verification', 'child protection referral', 'confidentiality'],
  },
  {
    triggers: ['renewable energy', 'solar', 'wind', 'biomass', 'net metering', 'green energy'],
    expansions: ['renewable energy act', 'renewable energy project', 'doe', 'net metering'],
  },
  {
    triggers: ['climate change', 'climate risk', 'adaptation', 'mitigation', 'lccap', 'resilience'],
    expansions: ['climate change act', 'climate adaptation', 'mitigation', 'local climate action plan'],
  },
  {
    triggers: ['fisheries', 'fishing permit', 'municipal waters', 'aquaculture', 'illegal fishing', 'fisherfolk'],
    expansions: ['philippine fisheries code', 'municipal waters', 'fishery permit', 'coastal resource management'],
  },
  {
    triggers: ['mining', 'quarry', 'mineral', 'tailings', 'mine safety', 'exploration permit'],
    expansions: ['philippine mining act', 'quarry permit', 'environmental protection', 'rehabilitation'],
  },
]

const COMPLIANCE_FRAMEWORKS: LocalComplianceFramework[] = [
  {
    id: 'data-incident-response',
    title: 'Data, Cyber, and Mobile Incident Response Stack',
    triggers: [
      'data breach',
      'breach response',
      'cyber incident',
      'phishing',
      'account compromise',
      'unauthorized access',
      'sim fraud',
      'mobile number fraud',
      'identity data',
      'private image',
      'takedown',
    ],
    lawIds: ['ra-10173', 'ra-10175', 'ra-11934', 'ra-8792', 'ra-9995', 'ra-11055'],
    summary:
      'Use this when a workflow involves personal data, online accounts, electronic evidence, SIM or mobile-number abuse, identity records, or image/video evidence.',
    sequence: [
      'Classify the incident, affected data, system, account, subscriber, or media type before choosing the response path.',
      'Preserve evidence and logs without over-sharing personal data or private images.',
      'Assign breach, cybercrime, telco, privacy, and victim-support owners instead of routing everything to one generic help desk.',
      'Use lawful referral, disclosure, takedown, and notification steps with records of who approved each action.',
    ],
    checkpoints: [
      'Privacy notice, lawful basis, data minimization, retention, access control, and breach response ownership are stated.',
      'Incident reports preserve audit logs, screenshots, messages, account activity, or media evidence with chain-of-custody controls.',
      'SIM, PhilSys, subscriber, biometric, or private-image data has stricter access and disclosure controls.',
      'User support includes correction, complaint, escalation, and non-disclosure safeguards.',
    ],
  },
  {
    id: 'lgu-permit-and-service-delivery',
    title: 'LGU Ordinance, Permit, and Service Delivery Stack',
    triggers: [
      'barangay ordinance',
      'municipal ordinance',
      'business permit',
      'clearance',
      'license',
      'citizen charter',
      'processing time',
      'local fee',
      'public hearing',
      'local service',
    ],
    lawIds: ['ra-7160', 'ra-11032', 'ra-12009', 'ra-10667', 'ra-10173'],
    summary:
      'Use this when a city, municipality, province, or barangay creates rules, fees, services, permits, procurement steps, or citizen-facing application workflows.',
    sequence: [
      'Start with LGU authority, approving body, public hearing or publication, and consistency with national law.',
      'Map each citizen-facing service to a receiving office, documentary checklist, fees, processing time, and written decision route.',
      'If procurement or exclusive suppliers are involved, separate procurement safeguards from ordinary permit controls.',
      'Check privacy whenever resident, business, health, financial, identity, or complaint data is collected.',
    ],
    checkpoints: [
      'The ordinance states legal basis, scope, responsible office, standards, procedure, monitoring, budget, effectivity, and appeal path.',
      'Permits and clearances do not allow open-ended extra requirements after filing.',
      'Fees, fines, supplier preferences, and license conditions have authority, objective criteria, and due process.',
      'Records, reports, and citizen data have retention and access controls.',
    ],
  },
  {
    id: 'public-accountability-and-government-funds',
    title: 'Public Accountability, Ethics, Audit, and Government Funds Stack',
    triggers: [
      'graft',
      'corruption',
      'conflict of interest',
      'saln',
      'gift',
      'coa audit',
      'public funds',
      'cash advance',
      'liquidation',
      'disbursement',
      'plunder',
      'gocc',
      'salary grade',
      'honorarium',
      'allowance',
    ],
    lawIds: ['ra-3019', 'ra-6713', 'pd-1445', 'ra-7080', 'ra-10149', 'ra-6758', 'ra-12009', 'ra-11032', 'ra-7160'],
    summary:
      'Use this when public officers, public funds, official discretion, supplier or beneficiary selection, GOCCs, compensation, gifts, conflicts, liquidation, or COA audit exposure overlap.',
    sequence: [
      'Classify the public action: official decision, procurement, grant, permit, disbursement, cash advance, asset custody, GOCC board action, or compensation item.',
      'Map authority, decision maker, conflict checks, beneficiary or supplier criteria, supporting documents, approval thresholds, accountable officer, and audit route.',
      'Separate ethics, anti-graft, audit, procurement, service delivery, public compensation, GOCC governance, privacy, and criminal-escalation issues.',
      'Preserve evidence such as approvals, vouchers, receipts, liquidation reports, conflict disclosures, SALN or financial-interest records, board minutes, and complaints.',
    ],
    checkpoints: [
      'Decision makers, approving bodies, accountable officers, and reviewers are named with segregation of duties.',
      'Conflicts, gifts, private interests, supplier or beneficiary preferences, and unwarranted-benefit risks have disclosure, recusal, and complaint controls.',
      'Public funds, cash advances, payments, grants, assets, and compensation items have authority, support documents, liquidation, retention, and COA audit trails.',
      'High-value or repeated transactions have escalation, evidence preservation, and independent review for serious corruption or plunder-risk indicators.',
    ],
  },
  {
    id: 'employee-benefits-and-social-insurance',
    title: 'Employee Benefits, Leave, and Social Insurance Stack',
    triggers: [
      'employee benefits',
      'payroll benefits',
      'sss',
      'social security',
      'gsis',
      'pag ibig',
      'pag-ibig',
      'philhealth',
      'employer contribution',
      'premium contribution',
      'maternity leave',
      'paternity leave',
      'kasambahay',
      'domestic worker',
      'household helper',
      'retirement benefit',
    ],
    lawIds: ['ra-11199', 'ra-8291', 'ra-9679', 'ra-10606', 'ra-11210', 'ra-8187', 'ra-10361', 'pd-442', 'ra-10173'],
    summary:
      'Use this when a workflow touches private or government employment benefits, payroll contributions, SSS, GSIS, Pag-IBIG, PhilHealth, maternity or paternity leave, household employment, or benefit records.',
    sequence: [
      'Classify the worker or member first: private employee, government employee, household worker, self-employed member, dependent, or leave claimant.',
      'Map mandatory membership, contribution or premium basis, remittance owner, benefit eligibility, documentary proof, claim route, and correction process.',
      'Separate payroll, SSS, GSIS, Pag-IBIG, PhilHealth, maternity leave, paternity leave, kasambahay, labor-standard, and privacy controls.',
      'Protect payroll, contribution, health, pregnancy, family, service-record, household-employment, dependent, and benefit-claim records with role-based access and retention.',
    ],
    checkpoints: [
      'Covered workers, employers, household employers, dependents, contribution basis, remittance deadlines, and records owners are identified.',
      'Leave and benefit workflows state eligibility, notice, documentary proof, benefit/payment treatment, decision timeline, denial reason, and grievance or correction path.',
      'SSS, GSIS, Pag-IBIG, PhilHealth, maternity, paternity, and kasambahay requirements are not collapsed into a generic benefits clause.',
      'Health, pregnancy, payroll, service, family, and benefit records have confidentiality, privacy, retention, and authorized-disclosure safeguards.',
    ],
  },
  {
    id: 'environmental-operations',
    title: 'Environmental Operations and Facility Controls Stack',
    triggers: [
      'environmental compliance',
      'wastewater',
      'solid waste',
      'hazardous waste',
      'air emission',
      'protected area',
      'buffer zone',
      'chemical spill',
      'energy audit',
      'facility compliance',
    ],
    lawIds: ['ra-9003', 'ra-9275', 'ra-8749', 'ra-6969', 'ra-11038', 'ra-11285'],
    summary:
      'Use this when a facility, LGU, business, school, event, tourism site, or public building touches waste, water, emissions, chemicals, protected areas, or energy use.',
    sequence: [
      'Classify the activity first: solid waste, wastewater, air emissions, hazardous substances, protected-area use, or energy management.',
      'Identify the regulator and local role before assigning inspection or penalty powers.',
      'Separate prevention, monitoring, corrective action, reporting, emergency response, and penalties.',
      'Track permits, sampling, manifests, reports, audits, and disposal or restoration records.',
    ],
    checkpoints: [
      'Waste streams, discharge points, emission sources, chemicals, land-use zones, and energy baselines are identified.',
      'DENR, EMB, PAMB, DOE, LGU, or barangay roles are not collapsed into one generic enforcement office.',
      'Monitoring includes frequency, responsible office, evidence records, corrective action, and public or regulator reporting.',
      'Penalties or shutdowns include notice, correction, hearing, and appeal safeguards.',
    ],
  },
  {
    id: 'built-environment-and-public-facilities',
    title: 'Built Environment, Sanitation, Accessibility, and Public Facilities Stack',
    triggers: [
      'building permit',
      'occupancy permit',
      'renovation',
      'public facility',
      'sanitary permit',
      'food establishment',
      'market sanitation',
      'accessibility',
      'public toilet',
      'event venue',
    ],
    lawIds: ['pd-1096', 'pd-856', 'bp-344', 'ra-7277', 'ra-9514', 'ra-11058', 'ra-11032'],
    summary:
      'Use this when a building, public facility, food establishment, event venue, school, market, clinic, transport point, or service desk needs physical safety and public-health controls.',
    sequence: [
      'Classify the facility: construction, occupancy, food handling, public service, event, transport, workplace, or accessible public space.',
      'Map building permits, occupancy, fire safety, sanitation, accessibility, OSH, service delivery, and complaint controls before use.',
      'Separate design approval, inspections, staff certificates, facility maintenance, correction orders, and closure or stop-use procedures.',
      'Document responsible officials, inspection evidence, compliance deadlines, and public-facing assistance channels.',
    ],
    checkpoints: [
      'Building permit, occupancy, fire, sanitation, accessibility, and safety responsibilities are assigned.',
      'Food, water, toilet, sewage, refuse, pest-control, and public-facility sanitation controls are not collapsed into generic cleanliness rules.',
      'PWD access is built into the facility and workflow, not handled only by ad hoc staff assistance.',
      'Correction, closure, appeal, and reopening rules are stated for failed inspections or unsafe facilities.',
    ],
  },
  {
    id: 'land-climate-coastal-and-resource-governance',
    title: 'Land, Climate, Coastal, and Natural Resource Governance Stack',
    triggers: [
      'climate action plan',
      'coastal resource',
      'municipal waters',
      'fishing permit',
      'quarry',
      'mining',
      'protected area',
      'renewable energy project',
      'land use',
      'environmental permit',
    ],
    lawIds: ['ra-9729', 'ra-8550', 'ra-7942', 'ra-11038', 'ra-9513', 'ra-9275', 'ra-8749', 'ra-6969', 'ra-7160'],
    summary:
      'Use this when land use, climate planning, coastal livelihoods, fisheries, quarrying, mining, protected areas, renewable-energy projects, or environmental permitting overlap.',
    sequence: [
      'Classify the resource and jurisdiction: land, coastal water, protected area, mineral, energy resource, climate risk, or pollution source.',
      'Map LGU authority, national regulator, environmental permits, consultation, affected communities, monitoring, and rehabilitation or restoration duties.',
      'Separate resource access, livelihood support, conservation, enforcement, climate adaptation, extraction, and revenue or fee controls.',
      'Track evidence such as maps, permits, sampling, consultations, inspection reports, closure plans, and corrective actions.',
    ],
    checkpoints: [
      'Jurisdiction, resource boundary, permit type, regulator, consultation, and monitoring cadence are stated.',
      'Climate, DRRM, environmental, protected-area, fisheries, mining, and energy duties are not treated as one generic environmental clause.',
      'Community, fisherfolk, vulnerable-group, or affected-sector participation is documented where relevant.',
      'Rehabilitation, restoration, emergency response, penalties, and appeals are included for resource-impact activities.',
    ],
  },
  {
    id: 'mobility-land-agriculture-and-community-rights',
    title: 'Mobility, Land, Agriculture, and Community Rights Stack',
    triggers: [
      'traffic ordinance',
      'transport operator',
      'public utility',
      'land title',
      'property registration',
      'ancestral domain',
      'fpic',
      'agriculture support',
      'food safety',
      'organic agriculture',
      'farmers organization',
      'direct purchase',
      'sagip saka',
    ],
    lawIds: [
      'ra-4136',
      'ra-11659',
      'pd-1529',
      'ra-8371',
      'ra-8435',
      'ra-10068',
      'ra-10611',
      'ra-11321',
      'ra-7160',
      'ra-10173',
    ],
    summary:
      'Use this when a workflow touches road transport, public-service operation, land title or registry records, ancestral domains or FPIC, agricultural support, food safety, organic claims, or farmer and fisherfolk enterprise programs.',
    sequence: [
      'Classify the activity first: traffic enforcement, public-service operation, land or title transaction, ancestral-domain impact, farm support, food chain, organic claim, or farmer/fisherfolk enterprise.',
      'Map the public authority, regulator, registry, affected community, beneficiary group, inspection owner, records custodian, and appeal or grievance route.',
      'Separate LGU permits from national transport, public-service, land-registration, NCIP, agriculture, food-safety, and procurement controls.',
      'Track evidence such as licenses, titles, survey plans, FPIC records, beneficiary lists, inspection reports, traceability logs, purchase records, and complaints.',
    ],
    checkpoints: [
      'Vehicle, operator, public-service, land-title, beneficiary, food-chain, and community-consent scopes are not collapsed into generic permit language.',
      'Land and resource projects check title or registry records, ancestral-domain or FPIC issues, environmental impacts, and affected-community safeguards where relevant.',
      'Agriculture, food-safety, organic, and direct-purchase programs include eligibility, certification, traceability, inspection, conflict checks, and audit trail.',
      'Transport, land, farm, and community records have privacy, retention, redaction, and authorized-disclosure controls.',
    ],
  },
  {
    id: 'consumer-finance-and-commerce',
    title: 'Consumer, Financial, Commerce, AML, and Tax Stack',
    triggers: [
      'consumer complaint',
      'product warranty',
      'wallet fraud',
      'payment collection',
      'loan',
      'remittance',
      'kyc',
      'suspicious transaction',
      'invoice',
      'receipt',
      'vat',
      'online sale',
      'price freeze',
      'basic necessities',
      'bmbe',
      'msme',
      'bank secrecy',
    ],
    lawIds: ['ra-7394', 'ra-11765', 'ra-9160', 'ra-1405', 'ra-7581', 'ra-9178', 'ra-9501', 'ra-8792', 'ra-10173', 'ra-11976'],
    summary:
      'Use this when a workflow involves consumer sales, financial products, payments, remittance, AML controls, bank records, price controls, MSME support, e-commerce records, invoicing, or taxpayer-facing collections.',
    sequence: [
      'Identify whether the issue is consumer product/service quality, financial consumer protection, AML monitoring, e-commerce evidence, tax, or privacy.',
      'Map disclosures, fees, complaints, refunds, fraud reports, KYC, transaction reports, bank-record access, price controls, incentives, invoices, receipts, and record retention.',
      'Separate customer service handling from regulator escalation, suspicious transaction reporting, and tax documentation.',
      'Avoid collecting financial or identity data without clear purpose, access controls, and retention period.',
    ],
    checkpoints: [
      'Terms, fees, risks, warranties, price, complaint route, and remedy are clear before the transaction.',
      'Unauthorized transactions, fraud reports, and suspicious transaction workflows have timelines and responsible officers.',
      'Bank deposit, price monitoring, BMBE, and MSME records are handled with eligibility, confidentiality, and audit safeguards.',
      'Invoices, receipts, VAT, withholding, and tax records are accounted for where payment collection is involved.',
      'Financial and consumer records are protected with privacy, confidentiality, and audit safeguards.',
    ],
  },
  {
    id: 'payments-credit-evidence-and-dispute-resolution',
    title: 'Payments, Credit, Evidence, and Dispute Resolution Stack',
    triggers: [
      'payment fraud',
      'access device',
      'credit card fraud',
      'unauthorized transaction',
      'wiretapping',
      'recorded conversation',
      'bouncing check',
      'dishonored check',
      'credit report',
      'credit score',
      'insolvency',
      'rehabilitation',
      'arbitration',
      'mediation',
      'dispute resolution',
    ],
    lawIds: ['ra-8484', 'ra-4200', 'bp-22', 'ra-9510', 'ra-10142', 'ra-9285', 'ra-11765', 'ra-10173', 'ra-8792'],
    summary:
      'Use this when a workflow touches card or access-device fraud, unauthorized payments, recorded communications, bounced checks, credit reports, distressed debt, insolvency, mediation, arbitration, or dispute evidence.',
    sequence: [
      'Classify the issue first: access-device fraud, communication recording, check dishonor, credit reporting, financial distress, or ADR/dispute handling.',
      'Map authority, consent or authorization, notice, documentary proof, evidence custody, dispute intake, correction or cure path, and escalation route.',
      'Separate payment fraud, privacy, bank or credit information, consumer remediation, criminal referral, civil collection, insolvency, and ADR safeguards.',
      'Preserve transaction logs, checks, notices, recordings, credit files, creditor claims, settlement communications, and decisions with retention and confidentiality controls.',
    ],
    checkpoints: [
      'Payment, recording, credit, insolvency, and dispute workflows state who may collect, review, share, correct, retain, or escalate evidence.',
      'Unauthorized transactions, access-device issues, bounced checks, and credit-report disputes include intake, proof, investigation, timelines, and correction or cure routes.',
      'Recording or communication-monitoring workflows include consent or lawful authority, minimization, restricted access, retention, and chain-of-custody safeguards.',
      'ADR and insolvency paths do not bypass safety, criminal, labor, consumer, creditor, court, or regulator escalation when formal process is required.',
    ],
  },
  {
    id: 'civil-documents-family-and-claims',
    title: 'Civil Documents, Family Status, Evidence, and Small Claims Stack',
    triggers: [
      'civil code',
      'contract',
      'civil liability',
      'damages',
      'marriage certificate',
      'birth certificate',
      'civil registry',
      'civil registrar',
      'family support',
      'custody',
      'notarized affidavit',
      'notary',
      'evidence',
      'small claims',
      'money claim',
      'debt collection',
    ],
    lawIds: [
      'ra-386',
      'eo-209-1987',
      'act-3753',
      'ra-9048',
      'ra-10172',
      'am-02-8-13-sc',
      'rules-of-court-evidence',
      'am-08-8-7-sc',
      'ra-10173',
      'ra-8792',
      'ra-9285',
    ],
    summary:
      'Use this when a workflow touches contracts, civil liability, family status, birth or marriage records, civil registry corrections, notarized affidavits, evidence handling, small money claims, or debt-collection records.',
    sequence: [
      'Classify the matter first: contract or obligation, family status, civil registry record, correction petition, notarized document, evidence file, or small money claim.',
      'Map parties, authority, proof, civil registrar or notary role, record custodian, correction route, claim amount, evidence source, and privacy controls.',
      'Separate civil remedies from criminal threats, administrative actions, privacy duties, family protection, ADR, small claims, and ordinary customer support.',
      'Preserve contracts, certificates, IDs, affidavits, registry annotations, notices, demand letters, official records, and evidence logs with custody and retention rules.',
    ],
    checkpoints: [
      'Contracts identify parties, authority, consent, object, cause or consideration, performance, breach, notice, remedies, and records.',
      'Civil registry and family-status workflows identify the certificate, registrar, requester authority, proof, correction or annotation path, confidentiality, and downstream record updates.',
      'Notarized documents and evidence files include personal appearance or identity checks, authentication, custodian, chain of custody, retention, and authorized disclosure.',
      'Small-claims and debt workflows state amount basis, proof, demand, venue or filing route, settlement handling, privacy-safe collection conduct, and records custody.',
    ],
  },
  {
    id: 'rights-criminal-enforcement-and-public-order',
    title: 'Rights, Criminal Enforcement, Public Order, and Custody Stack',
    triggers: [
      'bill of rights',
      'due process',
      'criminal complaint',
      'police report',
      'search warrant',
      'arrest',
      'theft',
      'estafa',
      'falsification',
      'libel',
      'juvenile',
      'dangerous drugs',
      'drug testing',
      'firearms',
      'public assembly',
      'rally permit',
      'custody',
      'detention',
      'torture',
    ],
    lawIds: [
      'constitution-1987',
      'act-3815',
      'rules-criminal-procedure',
      'ra-9344',
      'ra-9165-drugs',
      'ra-10591',
      'bp-880',
      'ra-9745',
      'rules-of-court-evidence',
      'ra-10173',
      'ra-7160',
    ],
    summary:
      'Use this when a workflow touches criminal complaints, police reports, searches, arrests, evidence, custody, minors in conflict with the law, dangerous drugs, firearms, public assemblies, detention, or rights-sensitive enforcement.',
    sequence: [
      'Classify the action: regulatory inspection, complaint intake, administrative discipline, criminal referral, search, arrest, custody, juvenile handling, public assembly, drug/firearm incident, or human-rights complaint.',
      'Map legal authority, rights notice, receiving office, objective criteria, warrant or exception, affidavit or evidence requirements, custody owner, referral route, timeline, and appeal or review path.',
      'Separate civil, administrative, barangay, school, workplace, police, prosecutor, court, social welfare, and human-rights channels.',
      'Preserve affidavits, incident reports, warrants, evidence inventories, custody logs, medical records, child records, drug-test or lab records, firearm inventories, public-assembly permits, and notices with strict access and retention controls.',
    ],
    checkpoints: [
      'Enforcement powers identify legal basis, due process, notice or rights information, objective standards, responsible office, written decision, records, and review path.',
      'Criminal complaints, searches, arrests, and evidence files include affidavits, probable-cause or warrant route, custody, chain-of-custody, privacy, and authorized referral.',
      'Minor, drug, firearm, public assembly, detention, and torture-risk workflows include specialized safeguards instead of generic incident handling.',
      'Policies avoid public shaming, coercion, arbitrary detention, warrantless access, viewpoint-based restrictions, and unsupported criminal labels.',
    ],
  },
  {
    id: 'business-market-entry-ownership-and-secured-finance',
    title: 'Business Market Entry, Ownership, Cooperative, and Secured Finance Stack',
    triggers: [
      'business registration',
      'foreign investment',
      'foreign equity',
      'foreign investor',
      'retail trade',
      'foreign retailer',
      'cooperative',
      'cda',
      'cooperative members',
      'secured transaction',
      'security interest',
      'collateral',
      'movable property',
      'startup',
      'paid up capital',
      'market entry',
    ],
    lawIds: [
      'ra-9520',
      'ra-7042',
      'ra-11647',
      'ra-8762',
      'ra-11595',
      'ra-11057',
      'ra-11232',
      'ra-11032',
      'ra-11976',
      'ra-11765',
      'ra-8792',
      'ra-10173',
    ],
    summary:
      'Use this when a workflow touches market entry, foreign ownership, retail trade, cooperative formation, member governance, secured lending, movable collateral, business registration, customer-facing sales, or investor records.',
    sequence: [
      'Classify the business structure and activity: corporation, cooperative, domestic market enterprise, export enterprise, foreign retailer, e-commerce seller, lender, or secured-credit arrangement.',
      'Map ownership, nationality or foreign-equity restrictions, regulator, registration route, capitalization, permits, tax registration, customer obligations, privacy controls, and periodic reporting.',
      'For cooperatives, map CDA registration, bylaws, member rights, board and committee duties, capital, audit, surplus, and general assembly decisions.',
      'For secured transactions, map debtor, secured creditor, collateral, security agreement, perfection, notice registry, priority, enforcement, release, and debtor-record protection.',
    ],
    checkpoints: [
      'Market-entry workflows do not collapse foreign investment, retail, corporation, cooperative, tax, local permit, consumer, and privacy duties into one generic business permit step.',
      'Foreign investment and retail workflows document activity classification, ownership, capital, registration, regulator filing, and updated rule review.',
      'Cooperative workflows include member governance, bylaws, board/committee roles, audit, capital, surplus handling, dispute route, and CDA records.',
      'Secured finance workflows include collateral description, security agreement, registry/perfection, priority, enforcement, release, debtor privacy, and audit trail.',
    ],
  },
  {
    id: 'immigration-citizenship-passports-and-overseas-filipino-records',
    title: 'Immigration, Citizenship, Passports, and Overseas Filipino Records Stack',
    triggers: [
      'immigration',
      'visa',
      'foreign national',
      'alien',
      'overstay',
      'deportation',
      'passport',
      'travel document',
      'dual citizenship',
      'citizenship reacquisition',
      'naturalization',
      'administrative naturalization',
      'ofw',
      'migrant worker',
      'department of migrant workers',
      'overseas employment',
    ],
    lawIds: [
      'ca-613',
      'ra-11983',
      'ra-8239',
      'ra-9225',
      'ca-473',
      'ra-9139',
      'ra-11641',
      'ra-8042',
      'ra-10022',
      'ra-10173',
      'act-3753',
      'ra-8792',
    ],
    summary:
      'Use this when a workflow touches foreign nationals, immigration status, visas, admission, deportation, passport or travel-document handling, dual citizenship, naturalization, overseas Filipino workers, or DMW-facing records.',
    sequence: [
      'Classify the matter first: immigration admission or stay, visa or alien registration, passport or travel document, dual-citizenship reacquisition, naturalization, OFW deployment, or DMW assistance.',
      'Map the responsible agency, eligibility or status basis, proof documents, filing route, notice or hearing path, oath or certificate where relevant, and records custodian.',
      'Separate passport, immigration, citizenship, naturalization, civil registry, overseas employment, trafficking, labor, tax, and benefits decisions instead of treating identity documents as interchangeable.',
      'Protect passports, visas, biometrics, citizenship evidence, birth records, oath records, employment contracts, repatriation files, and complaint records with strict access, retention, and authorized-disclosure controls.',
    ],
    checkpoints: [
      'Immigration workflows identify status, visa or stay basis, responsible office, notice, hearing or appeal route, and record custody.',
      'Passport workflows use current passport authority, citizenship proof, applicant authority, minor safeguards, issuance or renewal path, cancellation or loss process, and DFA or consular record controls.',
      'Citizenship and naturalization workflows distinguish retention or re-acquisition, judicial naturalization, administrative naturalization, oath, certificate, civil registry, and passport consequences.',
      'OFW and DMW workflows document agency verification, contract and fee controls, illegal-recruitment reporting, welfare, repatriation, legal assistance, and confidentiality safeguards.',
    ],
  },
  {
    id: 'elections-civic-participation-and-youth-governance',
    title: 'Elections, Civic Participation, Campaigns, and Youth Governance Stack',
    triggers: [
      'election',
      'comelec',
      'candidate',
      'campaign',
      'campaign material',
      'political advertisement',
      'voter registration',
      'voter list',
      'soce',
      'automated election',
      'vote counting',
      'source code review',
      'sangguniang kabataan',
      'sk funds',
      'youth council',
      'barangay election',
    ],
    lawIds: [
      'bp-881',
      'ra-8189',
      'ra-7166',
      'ra-9006',
      'ra-8436',
      'ra-9369',
      'ra-10742',
      'ra-11768',
      'ra-7160',
      'ra-10173',
      'ra-3019',
      'pd-1445',
      'ra-9470',
    ],
    summary:
      'Use this when a workflow touches COMELEC processes, voter registration, campaign materials, political ads, campaign finance, election returns, automated election systems, barangay or SK elections, SK funds, or youth governance records.',
    sequence: [
      'Classify the matter first: voter registration, candidate activity, campaign material, campaign finance, election-day or canvassing record, automated election system, complaint or offense, or SK/youth-governance program.',
      'Map responsible office, election period, COMELEC or registration-board route, eligible actor, required proof, prohibited acts, reporting owner, complaint route, and records custodian.',
      'Separate campaign activity, public-service announcements, government resources, procurement, public funds, voter records, election technology, youth programs, and ordinary barangay services.',
      'Protect voter records, campaign approvals, contribution and expenditure files, election returns, canvass records, technology logs, source-code review records, SK budget records, and youth participant data with access and retention controls.',
    ],
    checkpoints: [
      'Voter-registration workflows include eligibility, registration-board action, precinct or locality, objection, deactivation or reactivation, notice, and record-custody controls.',
      'Campaign workflows include campaign period, material classification, sponsor disclosure, spending records or SOCE owner, public-resource neutrality, takedown or complaint process, and retention.',
      'Election operations and automated election systems include custody, watcher or audit access, transmission or canvassing safeguards, incident handling, security, and evidence preservation.',
      'SK and youth-governance workflows include eligibility, youth development plan, training, fund authority, procurement, reporting, grievance, privacy, and audit safeguards.',
    ],
  },
  {
    id: 'workplace-school-and-public-safety',
    title: 'Workplace, School, Public Safety, and Protection Stack',
    triggers: [
      'workplace safety',
      'labor standards',
      'wage policy',
      'age discrimination',
      'mental health',
      'sexual harassment',
      'safe spaces',
      'bullying',
      'student safety',
      'child online safety',
      'fire safety',
      'evacuation',
      'disaster plan',
      'internet cafe',
    ],
    lawIds: ['pd-442', 'ra-11058', 'ra-10911', 'ra-11036', 'ra-11313', 'ra-7877', 'ra-10627', 'ra-9775', 'ra-9514', 'ra-10121'],
    summary:
      'Use this when policies protect workers, students, minors, complainants, establishments, or the public from labor, safety, mental-health, harassment, fire, disaster, or online exploitation risks.',
    sequence: [
      'Classify the protected group and setting: workplace, school, public space, online platform, establishment, health support channel, or emergency site.',
      'Assign prevention, reporting, investigation, confidentiality, referral, corrective action, and emergency response owners.',
      'Separate discipline, labor relations, accommodations, health support, victim protection, due process, and recordkeeping.',
      'Coordinate with the correct public office or authority when risks involve minors, fire safety, disasters, or law enforcement.',
    ],
    checkpoints: [
      'Policy includes reporting channels, responsible office, confidentiality, non-retaliation, due process, records, and accommodation where relevant.',
      'Safety and labor controls include classification, working conditions, training, drills, PPE or equipment, incident reports, inspections, and emergency escalation.',
      'Child, student, or victim data is protected and referral is limited to authorized channels.',
      'Sanctions do not replace prevention, support, correction, and appeal procedures.',
    ],
  },
  {
    id: 'health-welfare-and-accessibility',
    title: 'Health, Welfare, Accessibility, and Protection Stack',
    triggers: [
      'health service',
      'primary care',
      'mental health',
      'senior citizen',
      'pwd',
      'disability',
      'accessibility',
      'child protection',
      'protection order',
      'vawc',
      'trafficking',
      'social welfare',
    ],
    lawIds: ['ra-11223', 'ra-11036', 'ra-9994', 'ra-7277', 'bp-344', 'ra-7610', 'ra-9262', 'ra-10364', 'ra-10173'],
    summary:
      'Use this when a policy handles health services, vulnerable-person support, benefits, accessibility, protection orders, victim referral, or sensitive welfare records.',
    sequence: [
      'Classify the person served and risk: patient, senior citizen, PWD, child, VAWC complainant, trafficking victim, or general beneficiary.',
      'Map eligibility, consent, confidentiality, referral, emergency support, responsible office, and complaint or appeal route.',
      'Separate service delivery, benefit verification, protection, law-enforcement referral, health care, and data custody.',
      'Limit sensitive records to the purpose, role, retention period, and authorized disclosure route stated in the policy.',
    ],
    checkpoints: [
      'Eligibility, service owner, referral route, consent, confidentiality, and record retention are stated.',
      'Benefits or support services include accessible channels and reasonable accommodation where needed.',
      'Victim, child, health, senior, PWD, and welfare records receive stricter privacy and disclosure controls.',
      'Emergency or protection actions do not expose complainants, patients, or beneficiaries to retaliation or public disclosure.',
    ],
  },
  {
    id: 'education-housing-records-and-benefits',
    title: 'Education, Housing, Records, and Social Benefits Stack',
    triggers: [
      'school records',
      'learner records',
      'scholarship',
      'student aid',
      'alternative learning',
      'foi request',
      'public records',
      'records retention',
      'socialized housing',
      'resettlement',
      '4ps',
      'solo parent',
      'child marriage',
      'cash assistance',
    ],
    lawIds: [
      'ra-10533',
      'ra-11510',
      'ra-10931',
      'ra-9470',
      'eo-2-2016',
      'ra-7279',
      'ra-11201',
      'ra-11310',
      'ra-11861',
      'ra-11596',
      'ra-10173',
      'ra-11032',
    ],
    summary:
      'Use this when a public-facing workflow handles education access, scholarships, learner records, FOI or archives, housing and resettlement, social assistance, solo-parent benefits, or child-protection-sensitive community services.',
    sequence: [
      'Classify the service first: learner support, tertiary subsidy, alternative learning, records access, housing or relocation, cash assistance, solo-parent benefit, or child-protection intake.',
      'Map eligibility, documentary proof, responsible office, timeline, benefit limits, privacy, records retention, grievance, appeal, and audit evidence.',
      'Separate benefit administration from public-record disclosure, child protection, school discipline, resettlement, payment handling, and ordinary customer service.',
      'Route sensitive learner, household, child, family, financial, health, and housing records through privacy and records-management controls.',
    ],
    checkpoints: [
      'Eligibility, documentary proof, receiving office, decision maker, timeline, denial reason, appeal or grievance path, and record owner are stated.',
      'School, scholarship, ALS, housing, 4Ps, solo-parent, and child-protection records have access, redaction, retention, and authorized-disclosure controls.',
      'FOI and archives workflows separate proactive disclosure, request handling, exceptions, redactions, denial notices, and preservation or disposal.',
      'Housing, relocation, and benefit decisions include consultation or validation where relevant and avoid discretionary selection without evidence.',
    ],
  },
  {
    id: 'ip-investment-and-regulated-products',
    title: 'IP, Investment, Health Product, and Market Claims Stack',
    triggers: [
      'copyright',
      'trademark',
      'software license',
      'brand use',
      'investment offer',
      'securities',
      'public offering',
      'health product',
      'fda registration',
      'product claim',
      'online sale',
    ],
    lawIds: ['ra-8293', 'ra-8799', 'ra-9711', 'ra-7394', 'ra-8792', 'ra-10173'],
    summary:
      'Use this when an app, campaign, product, marketplace, or public offer involves content ownership, brand use, investment claims, health products, advertising, or online sales.',
    sequence: [
      'Classify whether the issue is IP ownership, licensing, public investment, health-product regulation, consumer claim, e-commerce evidence, or privacy.',
      'Collect proof of license, registration, authorization, label, disclosure, risk warning, complaint route, and record owner before publishing.',
      'Separate marketing copy from legal disclosures, regulated claims, user-generated content, and complaint or takedown operations.',
      'Escalate high-risk health, investment, and infringement claims before launch rather than after customer complaints.',
    ],
    checkpoints: [
      'Brand, software, content, dataset, or creative work has ownership, license, attribution, and permitted-use evidence.',
      'Investment-like offers have registration, exemption, risk disclosure, suitability, advertising, and SEC review controls where relevant.',
      'Health-product claims have FDA registration, label, safety, adverse-event, recall, and complaint handling controls.',
      'Online claims preserve records, protect customer data, and provide correction, takedown, refund, or escalation paths.',
    ],
  },
  {
    id: 'imports-procurement-and-public-assets',
    title: 'Imports, Public Procurement, Assets, and Audit Stack',
    triggers: [
      'imported equipment',
      'customs declaration',
      'tariff',
      'public bidding',
      'supplier eligibility',
      'government contract',
      'asset disposal',
      'acceptance inspection',
      'procurement plan',
    ],
    lawIds: ['ra-10863', 'ra-12009', 'ra-11976', 'ra-10667', 'ra-7160'],
    summary:
      'Use this when public offices or regulated entities buy, import, classify, receive, inspect, award, dispose, or pay for goods and services.',
    sequence: [
      'Separate customs import/export duties from procurement planning and contract award duties.',
      'Define accountable office, valuation or approved budget, eligibility, inspection, acceptance, payment, tax, and audit records.',
      'Check competition and conflict-of-interest risks before creating preferred supplier, exclusive source, or restricted eligibility rules.',
      'Preserve documents for post-clearance, procurement, acceptance, payment, and audit review.',
    ],
    checkpoints: [
      'Import or procurement workflows identify declaration, valuation, classification, permits, approved budget, and accountable officers.',
      'Supplier selection uses objective criteria and transparent documentation.',
      'Contract implementation includes inspection, acceptance, performance security where relevant, and audit trail.',
      'Payment, invoicing, tax, and asset records are kept separately from approval memos.',
    ],
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
  const matches = value.matchAll(
    /\b(?:r\.?\s*a\.?|republic\s+act)(?:\s+(?:no|number)\.?)?\s*(\d{3,5})\b/gi
  )
  return unique([...matches].map((match) => match[1]))
}

function getDocumentRaNumber(document: LocalLegalDocument) {
  return extractRaNumbers(document.statute)[0]
}

function getDocumentByRaNumber(raNumber: string) {
  return LEGAL_CORPUS.find((document) => getDocumentRaNumber(document) === raNumber)
}

function getCitationAnalysis(value: string) {
  const raNumbers = extractRaNumbers(value)
  const citedDocuments = raNumbers
    .map((raNumber) => getDocumentByRaNumber(raNumber))
    .filter((document): document is LocalLegalDocument => Boolean(document))
  const knownNumbers = citedDocuments
    .map((document) => getDocumentRaNumber(document))
    .filter((raNumber): raNumber is string => Boolean(raNumber))
  const unknownNumbers = raNumbers.filter((raNumber) => !knownNumbers.includes(raNumber))

  return {
    raNumbers,
    knownNumbers,
    unknownNumbers,
    citedDocuments,
  }
}

function getCitationMatchedTerms(value: string, document: LocalLegalDocument) {
  const documentRaNumber = getDocumentRaNumber(document)

  if (!documentRaNumber || !extractRaNumbers(value).includes(documentRaNumber)) {
    return []
  }

  return [`explicit citation: ${document.statute}`]
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
    const matchedTerms = unique([
      ...getCitationMatchedTerms(query, entry.document),
      ...queryTokens.filter((token) => entry.tokenCounts.has(token)),
    ])
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

function getDocumentById(id: string) {
  return LEGAL_CORPUS.find((document) => document.id === id)
}

function getFrameworkMatches(query: string, rankedDocuments: RankedDocument[]) {
  const normalizedQuery = normalizeText(query)
  const rankedDocumentIds = rankedDocuments.slice(0, 8).map((match) => match.document.id)
  const citedDocumentIds = getCitationAnalysis(query).citedDocuments.map((document) => document.id)

  return COMPLIANCE_FRAMEWORKS.map((framework) => {
    const triggerMatches = framework.triggers.filter((trigger) => normalizedQuery.includes(normalizeText(trigger)))
    const rankedMatches = framework.lawIds.filter((lawId) => rankedDocumentIds.includes(lawId))
    const citationMatches = framework.lawIds.filter((lawId) => citedDocumentIds.includes(lawId))
    const score = triggerMatches.length * 4 + rankedMatches.length * 2 + citationMatches.length * 5

    return {
      framework,
      score,
      triggerMatches,
      rankedMatches,
      citationMatches,
    }
  })
    .filter((match) => match.score >= 2)
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
}

function formatFrameworkMatch(match: ReturnType<typeof getFrameworkMatches>[number]) {
  const laws = match.framework.lawIds
    .map((lawId) => getDocumentById(lawId))
    .filter((document): document is LocalLegalDocument => Boolean(document))
    .map((document) => `${document.statute} (${document.shortTitle})`)

  return [
    `### ${match.framework.title}`,
    '',
    match.framework.summary,
    '',
    `Related local corpus: ${laws.join('; ')}`,
    '',
    'Suggested order:',
    ...match.framework.sequence.slice(0, 4).map((item) => `- ${item}`),
    '',
    'Framework checkpoints:',
    ...match.framework.checkpoints.slice(0, 4).map((item) => `- ${item}`),
  ].join('\n')
}

function buildFrameworkSection(query: string, rankedDocuments: RankedDocument[]) {
  const frameworkMatches = getFrameworkMatches(query, rankedDocuments)

  if (frameworkMatches.length === 0) {
    return []
  }

  return [
    '## Local Compliance Framework',
    '',
    ...frameworkMatches
      .map((frameworkMatch) => formatFrameworkMatch(frameworkMatch))
      .join('\n\n')
      .split('\n'),
    '',
  ]
}

function buildCitationCoverageSection(value: string) {
  const citationAnalysis = getCitationAnalysis(value)

  if (citationAnalysis.raNumbers.length === 0) {
    return []
  }

  const knownLines = citationAnalysis.citedDocuments.map(
    (document) => `- ${document.statute} was cited and is included in the bundled local corpus.`
  )
  const unknownLines = citationAnalysis.unknownNumbers.map(
    (raNumber) => `- RA ${raNumber} was cited but is not in the bundled local corpus; verify it against current official sources.`
  )

  return [
    '## Citation Coverage',
    '',
    ...knownLines,
    ...unknownLines,
    '',
  ]
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
    '## Result',
    '',
    'No strong match was found in the bundled local legal corpus.',
    '',
    ...buildCitationCoverageSection(query),
    '## What You Can Try',
    '',
    '- Include a Republic Act number, such as RA 10173, RA 10175, RA 9775, RA 9160, RA 9003, RA 10667, RA 11765, RA 11934, or RA 11976.',
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
  const resultLimit = deepSearchUsed ? DEEP_RESULT_LIMIT : STANDARD_RESULT_LIMIT
  const topMatches = rankedDocuments.slice(0, resultLimit)
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
    '## Provider Mode',
    '',
    `${reasonLine} ${deepSearchLine}`,
    '',
    ...buildCitationCoverageSection(query),
    ...buildFrameworkSection(query, rankedDocuments),
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
  const matchedDocuments = rankedDocuments.slice(0, params.use_deep_search ? DEEP_RESULT_LIMIT : STANDARD_RESULT_LIMIT)
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
  const citationAnalysis = getCitationAnalysis(markdown)
  const citedDocumentIds = new Set(citationAnalysis.citedDocuments.map((document) => document.id))
  const topReferences = uniqueByNormalized([
    ...citationAnalysis.citedDocuments.map((document) => referenceFor(document)),
    ...rankedDocuments.slice(0, 4).map((match) => referenceFor(match.document)),
  ])
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

  if (citationAnalysis.unknownNumbers.length > 0) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Cited authority is outside the local corpus',
        `The draft cites ${citationAnalysis.unknownNumbers.map((raNumber) => `RA ${raNumber}`).join(', ')}, but LexInSight does not have that authority in its bundled providerless corpus.`,
        'Verify the cited authority against current official sources, then add enough title, agency, and operative context for manual review.',
        4,
        topReferences.length > 0 ? topReferences : [genericDraftingReference()]
      )
    )
  }

  const uncitedStrongMatches = rankedDocuments
    .filter((match) => match.relevance >= 0.45 && !citedDocumentIds.has(match.document.id))
    .slice(0, 2)

  if (citationAnalysis.citedDocuments.length > 0 && uncitedStrongMatches.length > 0) {
    amber.push(
      createFinding(
        'amber',
        'gap',
        'Likely relevant authority is not cited',
        `The draft cites ${citationAnalysis.citedDocuments.map((document) => document.statute).join(', ')}, but the local checker also strongly matched ${uncitedStrongMatches.map((match) => match.document.statute).join(', ')} from the draft text.`,
        'Confirm whether each strongly matched authority should be included in the legal-basis section or intentionally excluded with a short rationale.',
        5,
        uniqueByNormalized([
          ...topReferences,
          ...uncitedStrongMatches.map((match) => referenceFor(match.document)),
        ])
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

  const hasWorkplaceSafetyTopic =
    /\b(worker|employee|workplace|construction|contractor|job site|work site|hazard|ppe|accident|occupational|safety officer|safety committee|work stoppage)\b/.test(normalizedDraft) ||
    (/\bsafety\b/.test(normalizedDraft) && /\b(worker|employee|workplace|construction|contractor|job site|work site|hazard|ppe|accident|occupational)\b/.test(normalizedDraft))

  if (hasWorkplaceSafetyTopic) {
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

  if (/\b(procurement|bidding|bid|supplier|contract award|bac|purchase order|government contract)\b/.test(normalizedDraft)) {
    if (!/\b(procurement plan|approved budget|bac|bids and awards|competitive bidding|eligibility|post qualification|performance security|contract implementation|audit trail)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Procurement safeguards are incomplete',
          'Procurement or contracting language was detected without enough planning, BAC, budget, bidding, eligibility, award, contract-monitoring, or audit controls.',
          'Add procuring entity, approved budget, procurement mode, BAC responsibilities, publication, eligibility, award, contract implementation, acceptance, and audit trail safeguards.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-12009') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(permit|license|clearance|certification|application|citizen charter|government service|transaction)\b/.test(normalizedDraft)) {
    if (!/\b(citizen charter|processing time|receiving office|requirements checklist|one stop|written denial|deficiency notice|anti red tape|complete staff work)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Government service delivery controls are missing',
          'Permit, license, clearance, application, or government-service language was detected without clear citizen-charter, processing-time, receiving-office, or denial controls.',
          'Add a published requirements checklist, receiving office, processing-time class, fees, written deficiency or denial notice, escalation, and recordkeeping.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11032') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(graft|corruption|corrupt practice|conflict of interest|kickback|unwarranted benefit|undue injury|manifestly disadvantageous|private interest)\b/.test(normalizedDraft)) {
    const hasConflictControls = /\b(disclosure|conflict check|recusal|inhibit|private interest|financial interest|gift rule)\b/.test(normalizedDraft)
    const hasObjectiveCriteria = /\b(objective criteria|eligibility|selection criteria|evaluation|approval basis|written justification)\b/.test(normalizedDraft)
    const hasAccountabilityRoute = /\b(audit trail|complaint|investigation|escalation|disciplinary|ombudsman|authorized report)\b/.test(normalizedDraft)

    if (!(hasConflictControls && hasObjectiveCriteria && hasAccountabilityRoute)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Anti-graft safeguards are incomplete',
          'Graft, corruption, conflict-of-interest, kickback, unwarranted-benefit, or disadvantageous-transaction language was detected without enough disclosure, recusal, objective criteria, complaint, or audit controls.',
          'Add conflict disclosure, recusal rules, objective selection or approval criteria, written justifications, audit trail, complaint handling, and escalation for suspected corrupt practices.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-3019') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(saln|statement of assets|code of conduct|ethical standards|gift|public official|financial interest|divestment)\b/.test(normalizedDraft)) {
    const hasEthicsDisclosure = /\b(disclosure|saln|financial interest|family interest|gift rule|divestment|recusal)\b/.test(normalizedDraft)
    const hasEthicsCustody = /\b(custody|redaction|authorized disclosure|confidential|access control|retention|records)\b/.test(normalizedDraft)
    const hasEthicsComplaint = /\b(complaint|disciplinary|review|investigation|appeal|ethics committee|human resources)\b/.test(normalizedDraft)

    if (!(hasEthicsDisclosure && hasEthicsCustody && hasEthicsComplaint)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Public-official ethics controls need more detail',
          'SALN, code-of-conduct, gift, public-official, financial-interest, or divestment language was detected without enough disclosure, custody, complaint, or disciplinary controls.',
          'Add disclosure and gift rules, conflict and recusal review, SALN or financial-interest record custody, redaction and retention rules, complaint intake, investigation, and disciplinary routing.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-6713') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(coa|commission on audit|public funds|cash advance|liquidation|disbursement|voucher|accountable officer|reimbursement|government funds)\b/.test(normalizedDraft)) {
    const hasAuditAuthority = /\b(appropriation|funding source|allotment|obligation|accountable officer|approving officer|authority)\b/.test(normalizedDraft)
    const hasAuditDocuments = /\b(supporting documents|voucher|receipt|invoice|inspection|acceptance|payroll|beneficiary list)\b/.test(normalizedDraft)
    const hasLiquidation = /\b(liquidation|audit trail|coa|segregation of duties|reconciliation|retention|reporting)\b/.test(normalizedDraft)

    if (!(hasAuditAuthority && hasAuditDocuments && hasLiquidation)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Public-funds audit controls are incomplete',
          'Public funds, cash advance, liquidation, disbursement, voucher, reimbursement, or COA audit language was detected without enough authority, supporting documents, liquidation, segregation, or audit-trail controls.',
          'Add funding authority, accountable officer, approving officer, supporting documents, voucher or receipt requirements, inspection and acceptance, liquidation timelines, segregation of duties, retention, and COA audit response.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-1445') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(plunder|ill gotten wealth|misappropriation|conversion of funds|kickback|commission|series of transactions|aggregate amount)\b/.test(normalizedDraft)) {
    const hasHighRiskControls = /\b(approval threshold|independent review|anti collusion|segregation of duties|conflict check|asset inventory)\b/.test(normalizedDraft)
    const hasEvidenceControls = /\b(evidence preservation|chain of custody|audit trail|complaint|escalation|authorized referral|investigation)\b/.test(normalizedDraft)

    if (!(hasHighRiskControls && hasEvidenceControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'High-value corruption risk controls are incomplete',
          'Plunder, ill-gotten wealth, misappropriation, conversion, kickback, commission, repeated-transaction, or aggregate-amount language was detected without enough independent review, evidence preservation, or escalation controls.',
          'Add approval thresholds, anti-collusion and conflict checks, segregation of duties, asset or payment inventory, evidence preservation, chain of custody, independent audit review, complaint handling, and authorized referral.',
          9,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7080') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(gocc|government owned or controlled corporation|government-owned or controlled corporation|governance commission|gocc board|public corporate governance)\b/.test(normalizedDraft)) {
    const hasGoccBoardControls = /\b(board|director|trustee|fit and proper|appointment|oversight|governance commission)\b/.test(normalizedDraft)
    const hasGoccPerformanceControls = /\b(performance agreement|performance target|disclosure|compensation review|audit|conflict)\b/.test(normalizedDraft)
    const hasGoccRecords = /\b(minutes|record|report|retention|confidential|authorized disclosure|custody)\b/.test(normalizedDraft)

    if (!(hasGoccBoardControls && hasGoccPerformanceControls && hasGoccRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'GOCC governance controls need more detail',
          'GOCC, government corporate, governance commission, or public corporate governance language was detected without enough board, fit-and-proper, performance, compensation, conflict, audit, or records controls.',
          'Add board and officer duties, fit-and-proper review, oversight body, performance targets or agreements, compensation review, conflict disclosure, audit trail, board minutes, records custody, and authorized disclosure rules.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10149') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(salary grade|position classification|honorarium|allowance|public sector compensation|government personnel|standardized salary|dbm)\b/.test(normalizedDraft)) {
    const hasCompAuthority = /\b(legal basis|salary grade|position classification|dbm|approval|appropriation|funding source)\b/.test(normalizedDraft)
    const hasCompEligibility = /\b(eligible position|employee classification|appointment|payroll|benefit criteria|personnel record)\b/.test(normalizedDraft)
    const hasCompAudit = /\b(audit|record|retention|payroll|supporting documents|review|liquidation)\b/.test(normalizedDraft)

    if (!(hasCompAuthority && hasCompEligibility && hasCompAudit)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Public-sector compensation controls are incomplete',
          'Salary grade, position classification, honorarium, allowance, government personnel, or public-sector compensation language was detected without enough authority, eligibility, funding, approval, payroll, or audit controls.',
          'Add legal basis, salary grade or position classification, eligible positions, funding source, approval office, DBM or compensation review where relevant, payroll records, privacy, retention, and audit trail.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-6758') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(sss|social security|employer contribution|employee contribution|sickness benefit|disability benefit|retirement benefit|death benefit)\b/.test(normalizedDraft)) {
    const hasSssCoverage = /\b(covered member|member registration|employee classification|self employed|household employer|coverage)\b/.test(normalizedDraft)
    const hasSssRemittance = /\b(contribution|remittance|premium|deduction|payment deadline|delinquen)\b/.test(normalizedDraft)
    const hasSssClaimsRecords = /\b(benefit claim|documentary proof|records|retention|privacy|confidential|correction|grievance)\b/.test(normalizedDraft)

    if (!(hasSssCoverage && hasSssRemittance && hasSssClaimsRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'SSS social-security controls are incomplete',
          'SSS, social-security, employer-contribution, sickness, disability, retirement, or death-benefit language was detected without enough member coverage, contribution, remittance, claim, or records controls.',
          'Add covered-member classification, employer and employee contribution basis, remittance owner and deadline, benefit-claim proof, correction or dispute route, payroll privacy, retention, and audit trail.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11199') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(gsis|government service insurance|service record|government employee retirement|separation benefit|survivorship benefit)\b/.test(normalizedDraft)) {
    const hasGsisCoverage = /\b(member|government employee|coverage|service record|service credit|appointment)\b/.test(normalizedDraft)
    const hasGsisPremiums = /\b(gsis contribution|gsis premium|gsis remittance|government service insurance contribution|government service insurance premium|compulsory life insurance)\b/.test(normalizedDraft)
    const hasGsisClaimsRecords = /\b(claim|retirement|separation|disability|survivorship|documentary proof|records|privacy|correction)\b/.test(normalizedDraft)

    if (!(hasGsisCoverage && hasGsisPremiums && hasGsisClaimsRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'GSIS benefit controls need service-record detail',
          'GSIS, government-service-insurance, service-record, retirement, separation, disability, or survivorship language was detected without enough coverage, premium, claim, service-record, or correction controls.',
          'Add government-employee coverage, service-record verification, premium responsibility, benefit-claim proof, HR records custody, correction route, confidentiality, and retention rules.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8291') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(pag ibig|pag-ibig|hdmf|home development mutual fund|housing loan|member savings|provident benefit)\b/.test(normalizedDraft)) {
    const hasPagibigMembership = /\b(member|membership|covered employee|eligibility|contribution history)\b/.test(normalizedDraft)
    const hasPagibigRemittance = /\b(contribution|remittance|employer|employee|payroll|savings)\b/.test(normalizedDraft)
    const hasPagibigLoanRecords = /\b(housing loan|provident benefit|documentary proof|records|privacy|retention|complaint|correction)\b/.test(normalizedDraft)

    if (!(hasPagibigMembership && hasPagibigRemittance && hasPagibigLoanRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Pag-IBIG contribution and housing-benefit controls are incomplete',
          'Pag-IBIG, HDMF, housing-loan, member-savings, or provident-benefit language was detected without enough membership, contribution, remittance, eligibility, proof, or records controls.',
          'Add covered-member criteria, contribution and remittance responsibilities, member-savings and housing-loan eligibility, proof requirements, complaint or correction path, privacy, retention, and audit trail.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9679') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(maternity leave|105 day|expanded maternity|childbirth|miscarriage|emergency termination of pregnancy|pregnancy leave|postnatal)\b/.test(normalizedDraft)) {
    const hasMaternityEligibility = /\b(eligible|eligibility|covered worker|women worker|notice|application)\b/.test(normalizedDraft)
    const hasMaternityBenefit = /\b(105 day|leave period|benefit|pay|payment|allocation|extension|solo parent)\b/.test(normalizedDraft)
    const hasMaternitySafeguards = /\b(non discrimination|return to work|confidential|privacy|medical record|grievance|denial)\b/.test(normalizedDraft)

    if (!(hasMaternityEligibility && hasMaternityBenefit && hasMaternitySafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Maternity leave controls are incomplete',
          'Maternity leave, pregnancy, childbirth, miscarriage, emergency termination, or 105-day leave language was detected without enough eligibility, benefit, allocation, non-discrimination, privacy, or grievance controls.',
          'Add eligibility and notice rules, leave period and benefit payment, allocation or extension handling, miscarriage and emergency-termination coverage, non-discrimination, return-to-work, confidential records, and grievance route.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11210') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(paternity leave|spouse childbirth|married male employee|lawful spouse|seven days)\b/.test(normalizedDraft)) {
    const hasPaternityEligibility = /\b(eligible|eligibility|married male employee|lawful spouse|notice|application)\b/.test(normalizedDraft)
    const hasPaternityBenefit = /\b(seven days|7 days|leave period|pay|paid leave|benefit|childbirth|miscarriage)\b/.test(normalizedDraft)
    const hasPaternityRecords = /\b(documentary proof|records|privacy|confidential|retention|denial|grievance)\b/.test(normalizedDraft)

    if (!(hasPaternityEligibility && hasPaternityBenefit && hasPaternityRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Paternity leave controls are incomplete',
          'Paternity leave, spouse-childbirth, miscarriage, or seven-day leave language was detected without enough eligibility, notice, paid-leave, proof, records, or grievance controls.',
          'Add eligibility, notice timing, childbirth or miscarriage proof, leave period and pay treatment, approval timeline, denial reason, confidential records, retention, and grievance route.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8187') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(kasambahay|domestic worker|household helper|household employer|live in helper|batas kasambahay)\b/.test(normalizedDraft)) {
    const hasKasambahayContract = /\b(written contract|employment contract|duties|wage|minimum wage)\b/.test(normalizedDraft)
    const hasKasambahayBenefits = /\b(rest day|service incentive leave|sss|philhealth|pag ibig|pag-ibig|social benefit)\b/.test(normalizedDraft)
    const hasKasambahayRemedies = /\b(termination|complaint|grievance|privacy|records|retention|humane treatment|dispute)\b/.test(normalizedDraft)

    if (!(hasKasambahayContract && hasKasambahayBenefits && hasKasambahayRemedies)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Kasambahay employment controls are incomplete',
          'Kasambahay, domestic-worker, household-helper, or household-employer language was detected without enough written-contract, wage, rest, social-benefit, termination, complaint, or records controls.',
          'Add written contract terms, wage and payment rules, rest day and leave, SSS/PhilHealth/Pag-IBIG registration where required, humane treatment, termination standards, complaint handling, privacy, and record retention.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10361') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(philhealth|national health insurance|premium contribution|health insurance premium|employer remittance|dependent coverage)\b/.test(normalizedDraft)) {
    const hasPhilhealthCoverage = /\b(member|membership|dependent|coverage|classification|eligibility)\b/.test(normalizedDraft)
    const hasPhilhealthPremium = /\b(premium|contribution|remittance|employer|payroll|payment)\b/.test(normalizedDraft)
    const hasPhilhealthClaimsPrivacy = /\b(claim|benefit|provider|documentary proof|health record|privacy|confidential|complaint|correction)\b/.test(normalizedDraft)

    if (!(hasPhilhealthCoverage && hasPhilhealthPremium && hasPhilhealthClaimsPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'PhilHealth insurance controls are incomplete',
          'PhilHealth, national-health-insurance, premium-contribution, employer-remittance, dependent-coverage, or health-insurance language was detected without enough membership, premium, claim, complaint, or privacy controls.',
          'Add membership and dependent classification, premium basis, employer remittance owner, benefit-claim proof, provider coordination, correction or complaint path, health-record confidentiality, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10606') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(cyber|computer|online fraud|phishing|hacking|account compromise|system access|platform|electronic evidence)\b/.test(normalizedDraft)) {
    if (!/\b(incident report|evidence preservation|access control|authorized officer|law enforcement|data breach|audit log|retention|referral)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Cyber incident controls need more detail',
          'Cybercrime, online fraud, system access, or account-compromise language was detected without clear incident reporting, evidence preservation, access-control, or referral safeguards.',
          'Add incident classification, reporting channel, evidence-preservation steps, access controls, authorized officers, privacy coordination, and lawful referral procedure.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10175') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  const hasChildOnlineSafetyTopic =
    /\b(ra 9775|anti child pornography|child sexual exploitation|csam|grooming|luring|pandering)\b/.test(normalizedDraft) ||
    (
      /\b(child|children|minor|minors)\b/.test(normalizedDraft) &&
      /\b(online|internet|digital|platform|content host|internet cafe|internet kiosk|website|social media|chat|upload|stream|blocking|filtering|takedown|reporting channel)\b/.test(normalizedDraft)
    )
  const hasChildConfidentiality = /\b(confidential|confidentiality|victim privacy|child identity|privacy|non disclosure)\b/.test(normalizedDraft)
  const hasChildReferral = /\b(dswd|social welfare|pnp|nbi|law enforcement|referral|reporting channel|authorized officer)\b/.test(normalizedDraft)
  const hasChildEvidenceOrPlatformControl = /\b(evidence preservation|chain of custody|blocking|filtering|takedown|content host|internet cafe|internet kiosk|service provider|platform)\b/.test(normalizedDraft)

  if (hasChildOnlineSafetyTopic) {
    if (!(hasChildConfidentiality && hasChildReferral && hasChildEvidenceOrPlatformControl)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Child online safety controls need more detail',
          'Child-protection or online-safety language was detected without clear confidentiality, referral, evidence-preservation, platform, or victim-protection controls.',
          'Add reporting channels, authorized referral to PNP/NBI/DSWD or local social welfare, confidentiality safeguards, evidence-preservation rules, and blocking or takedown workflow where relevant.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9775') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(money laundering|anti money laundering|aml|amla|kyc|covered transaction|suspicious transaction|beneficial owner|remittance|source of funds)\b/.test(normalizedDraft)) {
    const hasAmlIdentityControls = /\b(customer due diligence|know your customer|kyc|beneficial owner|source of funds|risk assessment)\b/.test(normalizedDraft)
    const hasAmlReportingControls = /\b(covered transaction report|suspicious transaction report|ctr|str|amlc|reporting timeline|internal escalation|transaction monitoring)\b/.test(normalizedDraft)
    const hasAmlGovernanceControls = /\b(compliance officer|recordkeeping|record retention|audit trail|confidentiality|tipping off|staff training)\b/.test(normalizedDraft)

    if (!(hasAmlIdentityControls && hasAmlReportingControls && hasAmlGovernanceControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'AML controls need more detail',
          'Money-laundering, covered-transaction, or financial-monitoring language was detected without enough KYC, beneficial-owner, transaction-reporting, recordkeeping, or AMLC coordination controls.',
          'Add covered-person scope, customer due diligence, beneficial ownership, transaction monitoring, covered and suspicious transaction reporting, confidentiality, recordkeeping, and AMLC escalation.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9160') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(access device|credit card|debit card|atm card|cardholder|account number|unauthorized transaction|skimming|counterfeit card|payment fraud)\b/.test(normalizedDraft)) {
    const hasAccessAuthorization = /\b(authentication|authorization|cardholder consent|identity verification|issuer coordination)\b/.test(normalizedDraft)
    const hasAccessEvidence = /\b(transaction log|audit log|evidence preservation|dispute|investigation|chargeback|complaint)\b/.test(normalizedDraft)
    const hasAccessDataControls = /\b(cardholder data|account number|redaction|privacy|access control|retention|confidential)\b/.test(normalizedDraft)

    if (!(hasAccessAuthorization && hasAccessEvidence && hasAccessDataControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Access-device fraud controls are incomplete',
          'Access-device, credit-card, debit-card, ATM-card, cardholder, account-number, skimming, or unauthorized-transaction language was detected without enough authorization, evidence, dispute, or cardholder-data controls.',
          'Add authentication and authorization checks, issuer or provider coordination, transaction logs, dispute and investigation timelines, evidence preservation, cardholder-data redaction, access controls, retention, and escalation.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8484') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(wiretapping|wiretap|recorded conversation|phone call recording|secret recording|interception|oral communication|recording device)\b/.test(normalizedDraft)) {
    const hasRecordingAuthority = /\b(consent|lawful authority|legal basis|court order|authorized recording|notice)\b/.test(normalizedDraft)
    const hasRecordingLimits = /\b(purpose|minimization|limited access|access control|retention|deletion|confidential)\b/.test(normalizedDraft)
    const hasRecordingCustody = /\b(chain of custody|evidence custody|transcript|audit log|authorized disclosure|legal review)\b/.test(normalizedDraft)

    if (!(hasRecordingAuthority && hasRecordingLimits && hasRecordingCustody)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Recording and wiretapping safeguards are incomplete',
          'Wiretapping, call recording, recorded-conversation, interception, surveillance, or secret-recording language was detected without enough consent or authority, minimization, custody, retention, or disclosure controls.',
          'Add consent or lawful-authority review, recording purpose, notice where required, minimization, restricted access, chain of custody, transcript controls, retention and deletion rules, legal review, and authorized disclosure.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-4200') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(bouncing check|dishonored check|insufficient funds|closed account|postdated check|notice of dishonor|payment demand)\b/.test(normalizedDraft)) {
    const hasCheckParties = /\b(drawer|payee|bank|check number|account|custody)\b/.test(normalizedDraft)
    const hasCheckNotice = /\b(notice of dishonor|demand letter|payment demand|cure period|settlement|receipt)\b/.test(normalizedDraft)
    const hasCheckRecords = /\b(evidence|records|retention|privacy|dispute|complaint|authorized escalation)\b/.test(normalizedDraft)

    if (!(hasCheckParties && hasCheckNotice && hasCheckRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Bouncing-check collection controls are incomplete',
          'Bouncing-check, dishonored-check, insufficient-funds, closed-account, postdated-check, notice-of-dishonor, or payment-demand language was detected without enough party, notice, payment, evidence, privacy, or dispute controls.',
          'Add drawer and payee records, bank notice, notice of dishonor or demand process, payment or cure route, settlement receipts, evidence custody, privacy limits, retention, and authorized escalation.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'bp-22') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(adr|alternative dispute resolution|arbitration|mediation|conciliation|neutral|settlement agreement|arbitral award|dispute resolution)\b/.test(normalizedDraft)) {
    const hasAdrConsent = /\b(consent|agreement|voluntary|arbitration clause|mediation agreement|party approval)\b/.test(normalizedDraft)
    const hasAdrProcess = /\b(neutral|mediator|arbitrator|timeline|venue|procedure|award|settlement agreement)\b/.test(normalizedDraft)
    const hasAdrSafeguards = /\b(confidential|without prejudice|records|retention|escalation|exception|safety|legal review)\b/.test(normalizedDraft)

    if (!(hasAdrConsent && hasAdrProcess && hasAdrSafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'ADR process controls are incomplete',
          'ADR, arbitration, mediation, conciliation, settlement-agreement, neutral, or dispute-resolution language was detected without enough consent, neutral-selection, confidentiality, timeline, award, or escalation safeguards.',
          'Add ADR agreement or consent basis, neutral selection, procedure and timeline, confidentiality, settlement or award handling, records retention, safety and non-waivable-rights exceptions, and formal escalation path.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9285') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(insolvency|financial rehabilitation|liquidation|creditor claim|creditor claims|stay order|rehabilitation plan|receiver|restructuring|distressed business)\b/.test(normalizedDraft)) {
    const hasInsolvencyProcess = /\b(court|petition|receiver|rehabilitation plan|liquidation plan|stay order|legal review)\b/.test(normalizedDraft)
    const hasInsolvencyCreditors = /\b(creditor notice|claims registry|claim verification|creditor list|debtor|creditor)\b/.test(normalizedDraft)
    const hasInsolvencyAssets = /\b(asset inventory|financial statement|record|retention|confidential|audit trail|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasInsolvencyProcess && hasInsolvencyCreditors && hasInsolvencyAssets)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Rehabilitation and insolvency controls are incomplete',
          'Insolvency, financial-rehabilitation, liquidation, creditor-claim, stay-order, receiver, restructuring, or distressed-business language was detected without enough process, creditor, asset, record, or confidentiality controls.',
          'Add court or legal process route, receiver or responsible office, creditor notice, claims registry, claim verification, asset inventory, financial records custody, audit trail, confidentiality, retention, and authorized disclosure.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10142') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(credit information|credit report|credit score|credit bureau|borrower data|credit information corporation|basic credit data|negative credit information)\b/.test(normalizedDraft)) {
    const hasCreditAccessBasis = /\b(legal basis|consent|notice|authorized user|permitted purpose|borrower notice)\b/.test(normalizedDraft)
    const hasCreditCorrection = /\b(correction|dispute|complaint|adverse action|denial reason|rectification)\b/.test(normalizedDraft)
    const hasCreditSecurity = /\b(security|access control|audit log|retention|privacy|confidential|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasCreditAccessBasis && hasCreditCorrection && hasCreditSecurity)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Credit-information controls are incomplete',
          'Credit-information, credit-report, credit-score, credit-bureau, borrower-data, CIC, or negative-credit language was detected without enough notice, authorized-use, correction, security, or retention controls.',
          'Add notice or legal basis, authorized-user and permitted-purpose rules, minimum credit data, correction and dispute process, adverse-action explanation where relevant, access logs, security, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9510') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(contract|obligation|civil liability|damages|negligence|quasi delict|sale|lease|agency|breach)\b/.test(normalizedDraft)) {
    const hasCivilParties = /\b(parties|party|representative|capacity|authorized signatory|consent)\b/.test(normalizedDraft)
    const hasCivilTerms = /\b(object|cause|consideration|payment|deliverable|performance standard)\b/.test(normalizedDraft)
    const hasCivilRemedies = /\b(breach|notice|cure period|damages|remedy|termination|dispute|records|evidence)\b/.test(normalizedDraft)

    if (!(hasCivilParties && hasCivilTerms && hasCivilRemedies)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Civil contract controls are incomplete',
          'Contract, obligation, civil-liability, damages, negligence, sale, lease, agency, or breach language was detected without enough party authority, contract terms, performance, evidence, or remedy controls.',
          'Add parties and authority, consent, object and scope, cause or consideration, payment and performance standards, breach notice, cure period, damages or remedies, termination, dispute route, and records custody.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-386') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(marriage|spouse|family support|child support|custody|child custody|parental authority|family home|minor child|conjugal)\b/.test(normalizedDraft)) {
    const hasFamilyProof = /\b(certificate|status proof|proof|guardian|parent|authority|consent)\b/.test(normalizedDraft)
    const hasChildWelfare = /\b(child welfare|best interest|minor|social welfare|dswd|referral|court)\b/.test(normalizedDraft)
    const hasFamilyConfidentiality = /\b(confidential|privacy|access control|retention|authorized disclosure|records custody)\b/.test(normalizedDraft)

    if (!(hasFamilyProof && hasChildWelfare && hasFamilyConfidentiality)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Family-status safeguards are incomplete',
          'Marriage, support, custody, parental-authority, family-home, spouse, or minor-child language was detected without enough status proof, child-welfare, referral, confidentiality, or records controls.',
          'Add family-status proof, responsible parent or guardian, child-welfare decision criteria, court or social-welfare referral where needed, confidentiality, access controls, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'eo-209-1987') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(birth certificate|marriage certificate|death certificate|civil registry|civil registrar|local civil registrar|psa certificate|vital record|civil status)\b/.test(normalizedDraft)) {
    const hasRegistryOffice = /\b(civil registrar|local civil registrar|psa|issuing office|registry office|record custodian)\b/.test(normalizedDraft)
    const hasRegistryProof = /\b(certified copy|supporting document|proof|requester|authorized requester|petition|annotation)\b/.test(normalizedDraft)
    const hasRegistryPrivacy = /\b(privacy|confidential|access control|redaction|retention|authorized disclosure|audit trail)\b/.test(normalizedDraft)

    if (!(hasRegistryOffice && hasRegistryProof && hasRegistryPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Civil registry controls are incomplete',
          'Birth, marriage, death, civil-registry, civil-registrar, PSA, vital-record, or civil-status language was detected without enough registrar, proof, requester, annotation, privacy, or retention controls.',
          'Add civil registrar or PSA role, certified-copy or supporting-document requirements, authorized requester rules, correction or annotation path, record custodian, privacy safeguards, retention, redaction, and audit trail.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'act-3753') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(clerical error|typographical error|change of first name|change first name|nickname correction|registry correction|civil registry correction|birth certificate correction)\b/.test(normalizedDraft)) {
    const hasCorrectionPetition = /\b(petition|petitioner|civil registrar|local civil registrar|filing|publication|posting|notice)\b/.test(normalizedDraft)
    const hasCorrectionEvidence = /\b(supporting document|certified copy|school record|medical record|public record|evidence|proof)\b/.test(normalizedDraft)
    const hasCorrectionOutcome = /\b(decision|annotation|appeal|review|record update|audit trail|retention)\b/.test(normalizedDraft)

    if (!(hasCorrectionPetition && hasCorrectionEvidence && hasCorrectionOutcome)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Civil registry correction route is incomplete',
          'Civil-registry correction, clerical-error, typographical-error, first-name, nickname, or birth-certificate-correction language was detected without enough petition, proof, notice, annotation, review, or update controls.',
          'Add petitioner eligibility, civil registrar filing route, publication or posting where required, supporting documents, decision and review path, annotation, downstream record update, privacy, and retention controls.',
          6,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9048') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10172') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(notary|notarization|notarized|affidavit|jurat|acknowledgment|notarial register|notarial seal|competent evidence of identity)\b/.test(normalizedDraft)) {
    const hasNotarialIdentity = /\b(personal appearance|competent evidence of identity|valid id|identity verification|signer)\b/.test(normalizedDraft)
    const hasNotarialRecord = /\b(notarial register|seal|commission|document number|page number|book number|date)\b/.test(normalizedDraft)
    const hasNotarialCustody = /\b(custody|retention|access control|fraud|legal review|complete document|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasNotarialIdentity && hasNotarialRecord && hasNotarialCustody)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Notarial controls are incomplete',
          'Notary, notarization, notarized-document, affidavit, jurat, acknowledgment, or notarial-register language was detected without enough personal-appearance, identity, register, seal, custody, or fraud controls.',
          'Add personal appearance, competent evidence of identity, document completeness, signature authority, notarial register details, seal and commission information, custody, retention, access controls, and fraud escalation.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'am-02-8-13-sc') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(evidence|admissible|admissibility|authentication|original document|best evidence|witness|hearsay|official record|chain of custody|documentary evidence)\b/.test(normalizedDraft)) {
    const hasEvidenceSource = /\b(source|authenticity|authentication|original|certified copy|witness|custodian)\b/.test(normalizedDraft)
    const hasEvidenceCustody = /\b(chain of custody|custody|evidence log|audit trail|retention|tamper|integrity)\b/.test(normalizedDraft)
    const hasEvidenceDisclosure = /\b(access control|privacy|confidential|authorized disclosure|minimization|redaction|legal review)\b/.test(normalizedDraft)

    if (!(hasEvidenceSource && hasEvidenceCustody && hasEvidenceDisclosure)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Evidence controls are incomplete',
          'Evidence, admissibility, authentication, witness, hearsay, official-record, original-document, or chain-of-custody language was detected without enough source, authenticity, custody, retention, privacy, or disclosure controls.',
          'Add evidence source and relevance, authenticity or certified-copy rules, custodian, original or copy status, chain of custody, evidence log, retention, privacy, redaction, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'rules-of-court-evidence') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(small claims|money claim|statement of claim|debt collection|unpaid account|promissory note|demand letter|collection demand)\b/.test(normalizedDraft)) {
    const hasClaimBasis = /\b(amount|basis|contract|invoice|receipt|account statement|promissory note|proof)\b/.test(normalizedDraft)
    const hasClaimProcess = /\b(demand letter|notice|venue|court|filing|hearing|settlement|judgment)\b/.test(normalizedDraft)
    const hasClaimConduct = /\b(privacy|confidential|no harassment|authorized disclosure|records custody|retention)\b/.test(normalizedDraft)

    if (!(hasClaimBasis && hasClaimProcess && hasClaimConduct)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Small-claims collection controls are incomplete',
          'Small-claims, money-claim, debt-collection, unpaid-account, promissory-note, demand-letter, or statement-of-claim language was detected without enough amount basis, proof, filing, settlement, privacy, or evidence controls.',
          'Add claim amount and basis, parties, proof such as contract or invoices, demand or notice, venue and filing route, hearing or settlement handling, privacy-safe collection conduct, records custody, retention, and evidence preservation.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'am-08-8-7-sc') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(bill of rights|due process|search warrant|warrantless search|search and seizure|custodial investigation|free speech|public assembly|peaceable assembly|right to counsel)\b/.test(normalizedDraft)) {
    const hasRightsAuthority = /\b(legal basis|authority|probable cause|warrant|exception|objective standard)\b/.test(normalizedDraft)
    const hasRightsProcess = /\b(notice|hearing|written decision|appeal|rights notice|counsel)\b/.test(normalizedDraft)
    const hasRightsRecords = /\b(records custody|audit trail|privacy|confidential|authorized disclosure|retention)\b/.test(normalizedDraft)

    if (!(hasRightsAuthority && hasRightsProcess && hasRightsRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Constitutional rights safeguards are incomplete',
          'Bill-of-rights, search, seizure, due-process, custodial, speech, or public-assembly language was detected without enough authority, objective standards, notice, counsel, review, or records safeguards.',
          'Add legal basis, probable-cause or warrant analysis where relevant, objective criteria, rights notice, counsel or assistance route, written decision, appeal or review path, privacy, retention, and authorized disclosure.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'constitution-1987') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(crime|criminal offense|felony|revised penal code|theft|estafa|falsification|libel|slander|physical injuries|grave threat|malicious mischief)\b/.test(normalizedDraft)) {
    const hasCriminalFacts = /\b(date|place|act complained of|complainant|respondent|witness|loss|injury)\b/.test(normalizedDraft)
    const hasCriminalEvidence = /\b(affidavit|evidence|document|photo|video|inventory|chain of custody|custodian)\b/.test(normalizedDraft)
    const hasCriminalReferral = /\b(police|prosecutor|referral|legal review|complaint route|due process|confidential)\b/.test(normalizedDraft)

    if (!(hasCriminalFacts && hasCriminalEvidence && hasCriminalReferral)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Criminal complaint controls are incomplete',
          'Crime, Revised Penal Code, theft, estafa, falsification, libel, injury, threat, or property-damage language was detected without enough factual intake, evidence, legal review, confidentiality, or referral controls.',
          'Add complainant and respondent fields, date, place, facts, witness and loss details, affidavit and evidence inventory, chain of custody, confidentiality, legal review, and authorized police, prosecutor, court, or administrative referral route.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'act-3815') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(criminal complaint|complaint affidavit|preliminary investigation|inquest|arrest|warrant of arrest|search warrant|prosecutor|subpoena|probable cause|bail|arraignment)\b/.test(normalizedDraft)) {
    const hasProcedureReview = /\b(affidavit|probable cause|prosecutor|court|warrant|subpoena|notice)\b/.test(normalizedDraft)
    const hasProcedureCustody = /\b(chain of custody|evidence inventory|case record|custody log|retention|confidentiality)\b/.test(normalizedDraft)
    const hasProcedureRights = /\b(rights notice|right to counsel|counsel|hearing|response|appeal|legal review|family notification)\b/.test(normalizedDraft)

    if (!(hasProcedureReview && hasProcedureCustody && hasProcedureRights)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Criminal procedure controls are incomplete',
          'Criminal complaint, preliminary-investigation, arrest, search-warrant, prosecutor, subpoena, probable-cause, bail, or arraignment language was detected without enough affidavit, warrant, custody, rights, notice, or case-record controls.',
          'Add complaint affidavit requirements, prosecutor or court route, probable-cause or warrant review, evidence inventory, custody logs, rights and counsel notice, notices or subpoenas, case-record custody, retention, and authorized disclosure.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'rules-criminal-procedure') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(juvenile|minor offender|child in conflict with the law|cicl|diversion|discernment|intervention program|bahay pag asa|restorative justice)\b/.test(normalizedDraft)) {
    const hasJuvenileAge = /\b(age verification|birth certificate|minor|discernment|assessment)\b/.test(normalizedDraft)
    const hasJuvenileWelfare = /\b(social worker|parent|guardian|diversion|intervention|restorative|child welfare)\b/.test(normalizedDraft)
    const hasJuvenileConfidentiality = /\b(confidential|privacy|identity protection|records custody|authorized disclosure|retention)\b/.test(normalizedDraft)

    if (!(hasJuvenileAge && hasJuvenileWelfare && hasJuvenileConfidentiality)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Juvenile justice safeguards are incomplete',
          'Juvenile, minor-offender, child-in-conflict-with-the-law, diversion, discernment, intervention, or restorative-justice language was detected without enough age verification, social welfare, guardian, confidentiality, or diversion controls.',
          'Add age verification, discernment assessment where relevant, social worker role, parent or guardian notice, diversion or intervention route, child-friendly records custody, confidentiality, retention, and authorized disclosure.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9344') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(dangerous drugs|controlled substance|drug testing|drug test|pdea|drug enforcement|chain of custody|laboratory examination|drug free workplace|rehabilitation referral)\b/.test(normalizedDraft)) {
    const hasDrugAuthority = /\b(legal basis|authority|consent|lawful basis|pdea|trained personnel|policy)\b/.test(normalizedDraft)
    const hasDrugCustody = /\b(chain of custody|inventory|laboratory|specimen|seized item|evidence custody|audit trail)\b/.test(normalizedDraft)
    const hasDrugPrivacy = /\b(confidential|privacy|health record|rehabilitation|access control|retention|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasDrugAuthority && hasDrugCustody && hasDrugPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Dangerous-drugs controls are incomplete',
          'Dangerous-drugs, drug-testing, PDEA, controlled-substance, chain-of-custody, lab-examination, workplace drug, or rehabilitation language was detected without enough authority, custody, lab, privacy, or referral controls.',
          'Add legal authority or consent basis, trained personnel, chain of custody, inventory, laboratory handling, test-result confidentiality, rehabilitation or referral route, retention, access limits, and due-process safeguards.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9165-drugs') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(firearm|firearms|ammunition|gun|weapon|ltopf|license to own and possess|permit to carry|security guard|weapons custody)\b/.test(normalizedDraft)) {
    const hasFirearmAuthority = /\b(license|permit|ltopf|registration|authority|identity verification)\b/.test(normalizedDraft)
    const hasFirearmCustody = /\b(storage|safe custody|inventory|transport|handover|custody log|incident report)\b/.test(normalizedDraft)
    const hasFirearmEscalation = /\b(police|revocation|suspension|reporting|evidence|privacy|retention|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasFirearmAuthority && hasFirearmCustody && hasFirearmEscalation)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Firearms controls are incomplete',
          'Firearm, ammunition, weapon, gun, LTOPF, permit-to-carry, security-guard, or weapons-custody language was detected without enough licensing, storage, inventory, transport, reporting, or escalation controls.',
          'Add license and permit verification, identity checks, safe storage, inventory, transport limits, custody logs, incident reporting, revocation or suspension route, police coordination, privacy, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10591') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(public assembly|rally|protest|demonstration|march|freedom park|maximum tolerance|rally permit|peaceable assembly)\b/.test(normalizedDraft)) {
    const hasAssemblyProcess = /\b(application|receiving office|timeline|written decision|appeal)\b/.test(normalizedDraft)
    const hasAssemblyCriteria = /\b(objective criteria|public safety|traffic plan|police coordination|denial grounds)\b/.test(normalizedDraft)
    const hasAssemblyRights = /\b(peaceable assembly|non discrimination|privacy|retention|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasAssemblyProcess && hasAssemblyCriteria && hasAssemblyRights)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Public assembly controls are incomplete',
          'Public-assembly, rally, protest, demonstration, march, freedom-park, maximum-tolerance, or rally-permit language was detected without enough permit timeline, objective criteria, rights, police coordination, or records controls.',
          'Add receiving office, permit or notice timeline, objective grounds, written decision, appeal, freedom-park handling, maximum tolerance, traffic or police coordination, free-speech safeguards, privacy, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'bp-880') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(torture|detention|interrogation|custody|ill treatment|forced confession|custodial investigation|medical examination|law enforcement custody)\b/.test(normalizedDraft)) {
    const hasCustodyRights = /\b(rights notice|counsel|family notification|medical examination|complaint route|human rights)\b/.test(normalizedDraft)
    const hasCustodyRecords = /\b(custody log|documentation|incident report|medical record|cctv|chain of custody|retention)\b/.test(normalizedDraft)
    const hasCustodyProtection = /\b(confidential|anti retaliation|independent review|authorized disclosure|access control|legal review)\b/.test(normalizedDraft)

    if (!(hasCustodyRights && hasCustodyRecords && hasCustodyProtection)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Custody and anti-torture safeguards are incomplete',
          'Torture, detention, interrogation, custody, ill-treatment, forced-confession, custodial-investigation, medical-examination, or law-enforcement-custody language was detected without enough rights, medical, documentation, complaint, or anti-retaliation controls.',
          'Add rights notice, counsel and family notification where relevant, medical examination, custody logs, incident documentation, complaint route, independent review, anti-retaliation, confidentiality, retention, and authorized disclosure.',
          9,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9745') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(cooperative|cooperative development authority|cda|cooperative member|articles of cooperation|patronage refund|general assembly|net surplus)\b/.test(normalizedDraft)) {
    const hasCoopRegistration = /\b(cda|cooperative development authority|registration|articles of cooperation|bylaws|coop by laws)\b/.test(normalizedDraft)
    const hasCoopGovernance = /\b(member rights|general assembly|board of directors|committee|audit committee|election|quorum)\b/.test(normalizedDraft)
    const hasCoopRecords = /\b(share capital|capital account|audit|records custody|retention|privacy)\b/.test(normalizedDraft)

    if (!(hasCoopRegistration && hasCoopGovernance && hasCoopRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Cooperative governance controls are incomplete',
          'Cooperative, CDA, member, articles, bylaws, patronage-refund, general-assembly, or net-surplus language was detected without enough registration, member governance, board, committee, audit, capital, or records controls.',
          'Add CDA registration, articles and bylaws, membership rules, general assembly, board and committee duties, capital accounts, patronage or surplus handling, audit, dispute route, privacy, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9520') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(foreign investment|foreign investor|foreign equity|foreign ownership|domestic market enterprise|export enterprise|negative list|nationality restriction)\b/.test(normalizedDraft)) {
    const hasForeignActivity = /\b(activity classification|business activity|domestic market|export enterprise|negative list|ownership cap|nationality)\b/.test(normalizedDraft)
    const hasForeignCapital = /\b(capital|paid in capital|capitalization|investment amount|startup|advanced technology|employment)\b/.test(normalizedDraft)
    const hasForeignRegistration = /\b(sec|dti|registration|regulator|reporting|periodic review|records custody|privacy)\b/.test(normalizedDraft)

    if (!(hasForeignActivity && hasForeignCapital && hasForeignRegistration)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Foreign-investment controls are incomplete',
          'Foreign-investment, foreign-investor, foreign-equity, foreign-ownership, domestic-market, export-enterprise, negative-list, or nationality-restriction language was detected without enough activity, ownership, capital, registration, or records controls.',
          'Add business activity classification, ownership and nationality review, negative-list check, capital or exception evidence, SEC/DTI or regulator registration, reporting owner, periodic update review, privacy, retention, and authorized disclosure.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7042') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11647') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(retail trade|foreign retailer|retail enterprise|retail store|paid up capital|investment per store|store opening)\b/.test(normalizedDraft)) {
    const hasRetailClassification = /\b(retail activity|retail enterprise|foreign retailer|ownership|store plan|branch plan)\b/.test(normalizedDraft)
    const hasRetailCapital = /\b(paid up capital|capitalization|investment per store|capital evidence|investment evidence)\b/.test(normalizedDraft)
    const hasRetailCompliance = /\b(sec|dti|registration|consumer|complaint|tax|local permit|periodic review|records custody)\b/.test(normalizedDraft)

    if (!(hasRetailClassification && hasRetailCapital && hasRetailCompliance)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Retail trade entry controls are incomplete',
          'Retail-trade, foreign-retailer, retail-enterprise, retail-store, paid-up-capital, investment-per-store, or store-opening language was detected without enough ownership, capital, registration, consumer, tax, or local-permit controls.',
          'Add retail activity classification, foreign retailer ownership review, paid-up capital and investment-per-store evidence, SEC/DTI or regulator registration, store plan, consumer complaint route, tax and local permit dependencies, records custody, and periodic review.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8762') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11595') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(security interest|secured transaction|collateral|movable property|personal property security|secured creditor|debtor|financing statement|notice registry|perfection|priority)\b/.test(normalizedDraft)) {
    const hasSecurityAgreement = /\b(security agreement|debtor|secured creditor|collateral description|obligor|grantor)\b/.test(normalizedDraft)
    const hasPerfection = /\b(registry|notice registry|financing statement|perfection|priority|registration)\b/.test(normalizedDraft)
    const hasEnforcement = /\b(enforcement|release|discharge|sale|accounting|dispute|privacy|retention)\b/.test(normalizedDraft)

    if (!(hasSecurityAgreement && hasPerfection && hasEnforcement)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Secured-transaction controls are incomplete',
          'Security-interest, secured-transaction, collateral, movable-property, debtor, secured-creditor, financing-statement, notice-registry, perfection, or priority language was detected without enough agreement, registry, priority, enforcement, release, or privacy controls.',
          'Add debtor and secured-creditor details, collateral description, security agreement, registry notice or perfection method, priority review, enforcement notice, sale or accounting process, release or discharge, dispute route, privacy, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11057') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(consumer|customer|warranty|advertising|label|product safety|price tag|complaint|refund|return)\b/.test(normalizedDraft)) {
    if (!/\b(product standard|label|warranty|redress|refund|repair|replace|recall|dti|deceptive|misleading)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Consumer protection controls are thin',
          'Consumer-facing product, service, warranty, advertising, labeling, or complaint language was detected without enough safety, labeling, warranty, redress, or regulator coordination detail.',
          'Add product-safety and labeling controls, warranty or redress handling, complaint intake, deceptive-advertising safeguards, correction or recall path, and regulator coordination.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7394') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(competition|antitrust|cartel|price fixing|bid rigging|exclusive supplier|exclusive distributor|market allocation|dominant position|merger|joint venture)\b/.test(normalizedDraft)) {
    if (!/\b(objective criteria|competition review|pcc|conflict of interest|non discrimination|supplier eligibility|market study|fair access)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Competition safeguards are thin',
          'Competition, exclusivity, bidding, pricing, merger, or market-access language was detected without clear competition review, objective criteria, conflict checks, or fair-access controls.',
          'Add competition-risk review, objective eligibility criteria, non-discrimination safeguards, conflict-of-interest checks, documentation, and PCC or counsel escalation where relevant.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10667') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(financial consumer|loan|lending|payment|wallet|remittance|insurance|investment|unauthorized transaction|financial fraud|consumer finance)\b/.test(normalizedDraft)) {
    const hasFinancialDisclosureControls = /\b(disclosure|fees|charges|terms|risk|transparent pricing)\b/.test(normalizedDraft)
    const hasFinancialDisputeControls = /\b(complaint|dispute|fraud|unauthorized transaction|consumer assistance|escalation|resolution)\b/.test(normalizedDraft)
    const hasFinancialDataOrRemediationControls = /\b(client data|privacy|remediation|refund|reversal|cooling off|market conduct|recordkeeping)\b/.test(normalizedDraft)

    if (!(hasFinancialDisclosureControls && hasFinancialDisputeControls && hasFinancialDataOrRemediationControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Financial consumer protection controls need detail',
          'Financial product, payment, lending, remittance, insurance, investment, or fraud language was detected without enough disclosure, complaint, dispute, fraud-response, or client-data controls.',
          'Add clear fees and terms, consumer risk disclosures, complaint and dispute timelines, unauthorized-transaction handling, client-data safeguards, and regulator escalation.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11765') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(hazardous waste|toxic|chemical|spill|nuclear waste|medical waste|industrial waste|waste transport|hazardous substance)\b/.test(normalizedDraft)) {
    const hasHazardousChainControls = /\b(manifest|generator|transporter|chain of custody|waste transport)\b/.test(normalizedDraft)
    const hasHazardousHandlingControls = /\b(storage|treatment|disposal|label|segregation|containment)\b/.test(normalizedDraft)
    const hasHazardousEmergencyControls = /\b(denr|emb|spill response|emergency response|worker safety|permit|reporting)\b/.test(normalizedDraft)

    if (!(hasHazardousChainControls && hasHazardousHandlingControls && hasHazardousEmergencyControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Hazardous substance controls are incomplete',
          'Toxic, chemical, hazardous-waste, or spill language was detected without clear generator, storage, transport, manifest, treatment, disposal, or emergency controls.',
          'Add hazardous-waste classification, generator and transporter responsibilities, labels, manifests, approved storage and disposal, spill response, worker safety, and DENR or EMB coordination.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-6969') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(energy efficiency|energy conservation|electricity|power consumption|energy audit|fuel efficiency|building energy|energy management)\b/.test(normalizedDraft)) {
    if (!/\b(baseline|energy audit|energy conservation officer|energy management|efficiency standard|energy report|measurement|doe)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Energy-efficiency controls need metrics',
          'Energy-efficiency or conservation language was detected without a baseline, audit, responsible officer, target, reporting, or verification method.',
          'Add baseline energy use, conservation plan, responsible officer, audit or measurement process, equipment-efficiency controls, reporting cadence, and DOE coordination if applicable.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11285') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(sim|mobile number|telco|subscriber|text scam|sms fraud|otp|deactivation|subscriber identity)\b/.test(normalizedDraft)) {
    if (!/\b(identity verification|registration|deactivation|reactivation|subscriber data|privacy|law enforcement|authorized request|audit trail|complaint)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'SIM and mobile-number controls need detail',
          'SIM, mobile-number, telco, OTP, or text-scam language was detected without clear identity-verification, subscriber-data, deactivation, privacy, or lawful-request controls.',
          'Add identity verification, subscriber-data protection, registration correction, deactivation or reactivation handling, fraud reporting, lawful disclosure rules, and audit trail.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11934') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(photo|video|cctv|intimate image|private image|voyeurism|recording|upload|takedown|non consensual)\b/.test(normalizedDraft)) {
    if (!/\b(consent|confidential|access control|takedown|evidence preservation|victim|authorized review|retention|privacy)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Private image safeguards are missing',
          'Photo, video, CCTV, intimate-image, or takedown language was detected without enough consent, confidentiality, access-control, retention, takedown, or victim-protection controls.',
          'Add consent rules, restricted access, confidential evidence handling, takedown path, retention, authorized review, victim support, and lawful referral safeguards.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9995') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(sexual harassment|moral ascendancy|committee on decorum|codi|workplace harassment|training harassment)\b/.test(normalizedDraft)) {
    if (!/\b(codi|committee on decorum|complaint|investigation|confidential|non retaliation|disciplinary|due process|training)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Sexual-harassment process needs detail',
          'Sexual-harassment language was detected without enough complaint intake, committee, investigation, confidentiality, non-retaliation, or discipline process.',
          'Add prohibited conduct, committee or responsible office, reporting channels, confidential investigation, non-retaliation, due process, sanctions, training, and records.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7877') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(bullying|cyberbullying|school bullying|student safety|student discipline|anti bullying)\b/.test(normalizedDraft)) {
    if (!/\b(policy|reporting|investigation|intervention|parent|guardian|referral|confidential|anti retaliation|restorative)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'School bullying controls need detail',
          'Bullying, cyberbullying, or student-safety language was detected without enough reporting, investigation, intervention, parent-notice, referral, or anti-retaliation controls.',
          'Add bullying definitions, reporting channels, investigation steps, intervention and support, parent or guardian notice, anti-retaliation, discipline process, and school records.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10627') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(basic education|k to 12|k-12|curriculum|enrollment|learner record|school operation|student record)\b/.test(normalizedDraft)) {
    const hasEducationEligibility = /\b(eligibility|enrollment|admission|covered learner|coverage|criteria)\b/.test(normalizedDraft)
    const hasEducationRecords = /\b(learner record|student record|privacy|retention|access control|confidential)\b/.test(normalizedDraft)
    const hasEducationGrievance = /\b(grievance|appeal|complaint|parent|guardian|accommodation|reasonable accommodation)\b/.test(normalizedDraft)

    if (!(hasEducationEligibility && hasEducationRecords && hasEducationGrievance)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Basic-education controls need more detail',
          'Basic-education, curriculum, enrollment, or learner-record language was detected without enough eligibility, records, accommodation, parent or guardian, grievance, or privacy controls.',
          'Add covered learners, enrollment or admission criteria, responsible school office, learner-record access and retention, parent or guardian notification, accommodation review, and grievance or appeal route.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10533') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(scholarship|tuition|tertiary education|college grant|student aid|student loan|unifast|free tuition)\b/.test(normalizedDraft)) {
    const hasStudentAidEligibility = /\b(eligibility|qualified|criteria|covered institution|academic standing|selection)\b/.test(normalizedDraft)
    const hasStudentAidBenefitControls = /\b(benefit limit|tuition|school fees|subsidy|grant|loan|budget|funding)\b/.test(normalizedDraft)
    const hasStudentAidReview = /\b(verification|appeal|grievance|denial|renewal|records|privacy)\b/.test(normalizedDraft)

    if (!(hasStudentAidEligibility && hasStudentAidBenefitControls && hasStudentAidReview)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Student-aid controls are incomplete',
          'Scholarship, tuition, student-aid, or tertiary-subsidy language was detected without enough eligibility, covered-institution, benefit-limit, verification, appeal, or record-handling controls.',
          'Add objective eligibility, covered institutions, benefit scope and limits, documentary proof, academic or renewal rules, denial notice, appeal route, budget owner, and privacy safeguards for student records.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10931') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(alternative learning|als|out of school youth|adult learner|literacy|community learning center|learning facilitator)\b/.test(normalizedDraft)) {
    const hasAlsIntake = /\b(intake|target learner|out of school youth|adult learner|eligibility|admission)\b/.test(normalizedDraft)
    const hasAlsDelivery = /\b(learning plan|facilitator|community learning center|assessment|accreditation|equivalency)\b/.test(normalizedDraft)
    const hasAlsSafeguards = /\b(referral|accessibility|grievance|records|privacy|retention)\b/.test(normalizedDraft)

    if (!(hasAlsIntake && hasAlsDelivery && hasAlsSafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Alternative-learning controls are incomplete',
          'Alternative-learning, out-of-school-youth, adult-learning, or community-learning-center language was detected without clear intake, learning-plan, facilitator, assessment, referral, accessibility, or record safeguards.',
          'Add learner intake, learning plan, facilitator role, assessment or equivalency path, referral to support services, accessibility accommodations, and learner-record privacy.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11510') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(customs|import|export|tariff|duties|valuation|classification|broker|bonded warehouse|declaration)\b/.test(normalizedDraft)) {
    if (!/\b(customs declaration|valuation|classification|duties|taxes|permit|broker|recordkeeping|clearance|inspection|appeal)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Customs controls are incomplete',
          'Import, export, tariff, customs, broker, valuation, or goods-release language was detected without enough declaration, valuation, duties, permits, records, or appeal controls.',
          'Add customs declaration, valuation and classification, duties and taxes, product permits, broker or accountable office, inspection, records, release controls, and appeal procedure.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10863') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(tax|taxpayer|bir|invoice|receipt|vat|withholding|tax return|filing|payment of tax)\b/.test(normalizedDraft)) {
    if (!/\b(registration|invoice|receipt|filing|payment|withholding|vat|recordkeeping|bir|taxpayer rights|tax return)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Tax administration controls are missing',
          'Tax, invoice, receipt, VAT, withholding, filing, or payment language was detected without enough registration, invoicing, filing, payment, or tax-record controls.',
          'Add taxpayer classification, BIR registration or coordination, invoice or receipt workflow, filing and payment timelines, VAT or withholding treatment, and records retention.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11976') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(philsys|philid|national id|psn|pcn|identity verification|biometric|proof of identity)\b/.test(normalizedDraft)) {
    if (!/\b(purpose|minimum data|alternative proof|authentication|access control|retention|correction|privacy|audit trail|authorized disclosure)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'National ID handling needs safeguards',
          'PhilSys, PhilID, national ID, PSN, PCN, biometric, or identity-verification language was detected without clear purpose, minimization, correction, alternative proof, retention, or access controls.',
          'Add purpose limitation, minimum identity fields, authentication method, alternative proof route, correction process, access controls, retention, audit logs, and privacy safeguards.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11055') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(traffic|transport|driver license|vehicle registration|road safety|parking|traffic violation|terminal|route)\b/.test(normalizedDraft)) {
    const hasTransportScope = /\b(vehicle|driver|operator|route|terminal|parking|road safety|regulated area)\b/.test(normalizedDraft)
    const hasTransportEnforcement = /\b(enforcement|citation|apprehension|impound|evidence|notice|appeal|hearing)\b/.test(normalizedDraft)
    const hasTransportRecords = /\b(record|registry|privacy|retention|access control|accident report|violation log)\b/.test(normalizedDraft)

    if (!(hasTransportScope && hasTransportEnforcement && hasTransportRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Transport and traffic controls are incomplete',
          'Traffic, transport, driver, vehicle, parking, route, terminal, or road-safety language was detected without enough scope, enforcement, evidence, appeal, record, or privacy controls.',
          'Add covered vehicles or drivers, operator duties, enforcement authority, citation or impoundment evidence, notice and appeal, accident or violation records, privacy, and retention rules.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-4136') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(public service|public utility|franchise|certificate of public convenience|transport operator|telecom operator|critical infrastructure)\b/.test(normalizedDraft)) {
    const hasPublicServiceAuthorization = /\b(franchise|certificate|regulator|ltfrb|ntc|authorization|license)\b/.test(normalizedDraft)
    const hasPublicServiceUserControls = /\b(complaint|service continuity|rate|charge|disclosure|consumer|public notice)\b/.test(normalizedDraft)
    const hasPublicServiceRecords = /\b(record|reporting|audit|privacy|retention|incident|regulatory filing)\b/.test(normalizedDraft)

    if (!(hasPublicServiceAuthorization && hasPublicServiceUserControls && hasPublicServiceRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Public-service operation controls need regulator detail',
          'Public-service, public-utility, franchise, operator, telecom, transport, or critical-infrastructure language was detected without enough regulator, certificate, continuity, complaint, reporting, or records controls.',
          'Add service classification, franchise or certificate path, regulator coordination, user complaints, continuity, rates or charges where relevant, incident reporting, records retention, and privacy safeguards.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11659') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(land title|property registration|torrens|certificate of title|register of deeds|survey plan|encumbrance|annotation)\b/.test(normalizedDraft)) {
    const hasTitleVerification = /\b(title verification|certificate of title|register of deeds|registry|owner|deed|survey plan)\b/.test(normalizedDraft)
    const hasTitleRiskChecks = /\b(encumbrance|annotation|lien|adverse claim|subdivision|consolidation|easement)\b/.test(normalizedDraft)
    const hasTitleRecords = /\b(custody|redaction|access control|retention|privacy|certified copy|audit trail)\b/.test(normalizedDraft)

    if (!(hasTitleVerification && hasTitleRiskChecks && hasTitleRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Land-title verification controls are incomplete',
          'Land-title, property-registration, Torrens, register-of-deeds, survey, annotation, or encumbrance language was detected without enough registry verification, risk checks, custody, access, or retention controls.',
          'Add title and owner verification, survey review, register-of-deeds records, encumbrance and annotation checks, deed authority, certified copies, custody, redaction, retention, and privacy safeguards.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-1529') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(indigenous peoples|indigenous cultural communities|ancestral domain|ancestral land|fpic|free prior informed consent|ncip|customary law)\b/.test(normalizedDraft)) {
    const hasCommunityIdentification = /\b(affected communit(?:y|ies)|ancestral domain|ancestral land|community map|customary law|indigenous cultural)\b/.test(normalizedDraft)
    const hasFpicProcess = /\b(fpic|free prior informed consent|ncip|consent process|community assembly|consultation)\b/.test(normalizedDraft)
    const hasCulturalSafeguards = /\b(cultural safeguard|cultural integrity|sacred site|benefit sharing|grievance|confidential community|customary record|fpic record)\b/.test(normalizedDraft)

    if (!(hasCommunityIdentification && hasFpicProcess && hasCulturalSafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'FPIC and indigenous-community safeguards are incomplete',
          'Indigenous peoples, ancestral domain, ancestral land, FPIC, NCIP, or customary-law language was detected without enough community identification, consent process, cultural safeguards, grievance, or records controls.',
          'Add ancestral-domain screening, affected-community identification, NCIP coordination, FPIC process, customary decision path, cultural and sacred-site safeguards, benefit-sharing, grievance, confidentiality, and monitoring records.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8371') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(agriculture|fisheries|farmers|fisherfolk|irrigation|post harvest|rural credit|food security|farm support|farm input)\b/.test(normalizedDraft)) {
    const hasAgriEligibility = /\b(eligible|beneficiary|farmer registry|fisherfolk registry|selection criteria|organization|cooperative)\b/.test(normalizedDraft)
    const hasAgriDeliveryControls = /\b(inventory|distribution|procurement|market access|credit|post harvest|irrigation|support package)\b/.test(normalizedDraft)
    const hasAgriAudit = /\b(audit|monitoring|grievance|inspection|reporting|retention|conflict)\b/.test(normalizedDraft)

    if (!(hasAgriEligibility && hasAgriDeliveryControls && hasAgriAudit)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Agriculture support controls are incomplete',
          'Agriculture, fisheries, farmer, fisherfolk, irrigation, post-harvest, rural-credit, food-security, or farm-support language was detected without enough eligibility, delivery, inventory, audit, grievance, or records controls.',
          'Add beneficiary or organization eligibility, support-package details, inventory and distribution controls, procurement path, market-access or credit criteria, monitoring, grievance, conflict checks, and retention rules.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8435') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(organic agriculture|organic farming|organic labels?|organic certification|organic products?|organic inputs?)\b/.test(normalizedDraft)) {
    const hasOrganicCertification = /\b(certification|accreditation|certifying body|verified|inspection|audit)\b/.test(normalizedDraft)
    const hasOrganicTraceability = /\b(traceability|label|labeling|permitted input|production record|farm record|supplier record)\b/.test(normalizedDraft)
    const hasOrganicComplaint = /\b(complaint|corrective action|recall|consumer|market monitoring|records retention)\b/.test(normalizedDraft)

    if (!(hasOrganicCertification && hasOrganicTraceability && hasOrganicComplaint)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Organic agriculture controls are incomplete',
          'Organic agriculture, organic farming, organic label, certification, product, or input language was detected without enough certification, traceability, labeling, inspection, complaint, or corrective-action controls.',
          'Add certification or accreditation review, permitted-input rules, traceability records, labeling controls, inspection cadence, complaint handling, corrective action, and retention of certification evidence.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10068') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(food safety|food business|food chain|traceability|contamination|food recall|food vendor|public market vendor)\b/.test(normalizedDraft)) {
    const hasFoodInspection = /\b(inspection|sanitary|risk analysis|standard|permit|food business operator|supplier verification)\b/.test(normalizedDraft)
    const hasFoodTraceability = /\b(traceability|batch|supplier record|vendor record|storage|distribution|temperature|chain)\b/.test(normalizedDraft)
    const hasFoodResponse = /\b(recall|contamination|corrective action|complaint|reporting|retention|regulator)\b/.test(normalizedDraft)

    if (!(hasFoodInspection && hasFoodTraceability && hasFoodResponse)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Food-safety controls are incomplete',
          'Food-safety, food-chain, traceability, contamination, recall, food-business, vendor, or public-market language was detected without enough inspection, traceability, complaint, recall, regulator, or records controls.',
          'Add food-chain role, inspection standards, supplier and batch traceability, storage controls, complaint intake, contamination response, recall steps, regulator coordination, retention, and corrective-action records.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10611') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(sagip saka|farmers organization|fisherfolk organization|direct purchase|agri enterprise|market linkage|enterprise development)\b/.test(normalizedDraft)) {
    const hasEnterpriseEligibility = /\b(eligible organization|organization eligibility|selection criteria|farmer organization|farmers organization|fisherfolk organization|organization registration|enterprise registration|accreditation)\b/.test(normalizedDraft)
    const hasEnterpriseProcurement = /\b(direct purchase|procurement|market linkage|purchase order|price|delivery|performance)\b/.test(normalizedDraft)
    const hasEnterpriseIntegrity = /\b(conflict check|conflict of interest|audit trail|performance monitoring|grievance|beneficiary validation|retention rules)\b/.test(normalizedDraft)

    if (!(hasEnterpriseEligibility && hasEnterpriseProcurement && hasEnterpriseIntegrity)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Sagip Saka enterprise controls are incomplete',
          'Sagip Saka, farmers organization, fisherfolk organization, direct purchase, agri-enterprise, market-linkage, or enterprise-development language was detected without enough organization eligibility, procurement, conflict, audit, monitoring, or grievance controls.',
          'Add organization eligibility and registration checks, objective selection, direct-purchase or procurement route, price and delivery controls, conflict checks, audit trail, monitoring, grievance handling, and retention rules.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11321') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(protected area|buffer zone|biodiversity|pamb|nipas|enipas|ecotourism|wildlife habitat|strict protection)\b/.test(normalizedDraft)) {
    if (!/\b(pamb|denr|zoning|buffer zone|biodiversity|carrying capacity|consultation|restoration|environmental assessment|monitoring)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Protected-area controls are incomplete',
          'Protected-area, biodiversity, buffer-zone, ecotourism, or land-use language was detected without enough zoning, PAMB, DENR, mitigation, consultation, or monitoring controls.',
          'Add protected-area zoning, PAMB and DENR coordination, biodiversity safeguards, carrying-capacity or mitigation controls, consultation, monitoring, and restoration duties.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11038') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(labor|employee|worker|wage|overtime|rest day|holiday pay|employment contract|termination|dismissal|contractor|trainee)\b/.test(normalizedDraft)) {
    if (!/\b(classification|hours of work|minimum wage|overtime|rest day|holiday pay|notice|hearing|grievance|dole|nlrc|recordkeeping)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Employment and labor-standard controls are thin',
          'Labor, wage, working-condition, contractor, or termination language was detected without enough classification, pay, working-hours, grievance, due-process, or recordkeeping detail.',
          'Add worker classification, wage and hour rules, leave or rest treatment, payroll and records, grievance handling, termination procedure, and DOLE or NLRC escalation where relevant.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-442') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(age limit|age requirement|age discrimination|job post|job advertisement|employment application|hiring age|maximum age)\b/.test(normalizedDraft)) {
    if (!/\b(bona fide occupational qualification|objective criteria|ability|qualification|safety requirement|equal opportunity|non discrimination)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Age-related employment criteria need justification',
          'Age limits or age-related hiring language was detected without clear objective criteria, bona fide occupational qualification, or equal-opportunity safeguards.',
          'Replace unsupported age cutoffs with ability-based qualifications, document any legally necessary occupational requirement, and add equal-opportunity review.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10911') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(mental health|psychosocial|counseling|wellness|crisis intervention|suicide|therapy|patient rights)\b/.test(normalizedDraft)) {
    const hasMentalConsent = /\b(consent|informed consent|voluntary)\b/.test(normalizedDraft)
    const hasMentalConfidentiality = /\b(confidential|privacy|record access|authorized disclosure|sensitive information)\b/.test(normalizedDraft)
    const hasMentalReferralOrCrisis = /\b(referral|crisis|emergency|care provider|support owner|clinical)\b/.test(normalizedDraft)

    if (!(hasMentalConsent && hasMentalConfidentiality && hasMentalReferralOrCrisis)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Mental-health support needs rights and referral controls',
          'Mental-health, counseling, wellness, or psychosocial language was detected without enough consent, confidentiality, referral, crisis, non-discrimination, or record safeguards.',
          'Add informed consent, confidentiality, referral and crisis protocols, non-discrimination, record access limits, and responsible care or support owners.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11036') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(vawc|violence against women|domestic violence|protection order|barangay protection order|temporary protection order|women and children)\b/.test(normalizedDraft)) {
    const hasVawcSafetyControls = /\b(safety plan|protection order|emergency assistance|risk assessment)\b/.test(normalizedDraft)
    const hasVawcConfidentiality = /\b(confidential|restricted access|victim privacy|non disclosure|case record)\b/.test(normalizedDraft)
    const hasVawcReferral = /\b(referral|social welfare|law enforcement|barangay protection|child protection|support service)\b/.test(normalizedDraft)

    if (!(hasVawcSafetyControls && hasVawcConfidentiality && hasVawcReferral)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'VAWC response needs safety and confidentiality controls',
          'VAWC, protection-order, or domestic-violence language was detected without enough safety planning, confidentiality, referral, victim support, or role-separation detail.',
          'Add safety assessment, protection-order handling, confidential records, social welfare and law-enforcement referral, child safeguards, and restricted disclosure controls.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9262') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(trafficking|forced labor|sexual exploitation|recruitment|harboring|transporting|victim protection|online exploitation)\b/.test(normalizedDraft)) {
    if (!/\b(referral|rescue|recovery|confidential|social welfare|law enforcement|screening|child protection|case management)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Anti-trafficking response needs victim-protection workflow',
          'Trafficking, recruitment, exploitation, or forced-labor language was detected without clear screening, referral, rescue, recovery, confidentiality, or case-management controls.',
          'Add exploitation screening, victim-centered referral, rescue and recovery workflow, social welfare coordination, authorized law-enforcement channel, confidentiality, and child-protection safeguards.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10364') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(copyright|trademark|patent|intellectual property|software|logo|brand|dataset|license|infringement|user generated content)\b/.test(normalizedDraft)) {
    if (!/\b(ownership|license|assignment|attribution|permitted use|takedown|complaint|fair use|authorization|infringement)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Intellectual-property controls are incomplete',
          'IP, software, logo, brand, content, dataset, or user-generated-content language was detected without enough ownership, license, attribution, permitted-use, or takedown controls.',
          'Add ownership proof, license terms, attribution, permitted use, assignment or transfer rules, takedown and complaint handling, and preservation of infringement reports.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8293') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(securities|investment offer|investment contract|public offering|investor|prospectus|broker|dealer|shares|pooled fund|guaranteed return|crowdfunding)\b/.test(normalizedDraft)) {
    if (!/\b(registration|exemption|sec|risk disclosure|prospectus|suitability|investor protection|advertising control|complaint|recordkeeping)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Investment or securities controls need SEC review',
          'Investment, securities, public-offer, broker, dealer, pooled-fund, or guaranteed-return language was detected without enough registration, exemption, risk disclosure, SEC review, or investor-protection controls.',
          'Add securities classification, registration or exemption review, risk disclosures, suitability or eligibility checks, advertising limits, investor complaint path, records, and SEC escalation.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8799') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(fda|food product|food safety|drug|cosmetic|medical device|health product|supplement|wellness product|adverse event|recall|license to operate)\b/.test(normalizedDraft)) {
    if (!/\b(registration|license to operate|label|labeling|approved use|adverse event|recall|post marketing|storage|distribution|fda)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Health-product controls need FDA detail',
          'Food, drug, cosmetic, medical-device, supplement, or health-product language was detected without enough FDA registration, license, labeling, storage, complaint, adverse-event, or recall controls.',
          'Add license-to-operate and product registration checks, label and claim review, storage and distribution controls, adverse-event reporting, complaint handling, and recall procedure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9711') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(universal health care|primary care|health service|patient navigation|philhealth|local health system|health care provider network|referral system)\b/.test(normalizedDraft)) {
    if (!/\b(eligibility|referral|provider network|facility|patient navigation|funding|complaint|confidential|health record|philhealth|responsible office)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Health-service delivery controls are thin',
          'Health-service, primary-care, patient-navigation, PhilHealth, or local-health-system language was detected without enough eligibility, provider, referral, funding, complaint, or health-record safeguards.',
          'Add eligible users, service owner, provider or facility network, referral path, funding or benefit limits, complaint route, health-record privacy, and coordination responsibilities.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11223') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(cultural property|heritage|historic site|heritage zone|museum|archive|conservation|restoration|excavation|monument)\b/.test(normalizedDraft)) {
    if (!/\b(ncca|nhcp|national museum|archives|conservation|documentation|expert review|permit|consultation|heritage assessment)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Cultural-heritage controls are incomplete',
          'Heritage, cultural-property, historic-site, archive, museum, excavation, or conservation language was detected without enough cultural-agency coordination, documentation, permit, or expert-review controls.',
          'Add cultural-property status check, NCCA, NHCP, National Museum or archive coordination, conservation standards, documentation, expert review, consultation, and approval workflow.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10066') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(public records|records management|records retention|retention schedule|archives|document disposal|records custodian|government records)\b/.test(normalizedDraft)) {
    const hasRecordsOwner = /\b(records officer|records custodian|responsible office|record owner|archives)\b/.test(normalizedDraft)
    const hasRecordsLifecycle = /\b(retention schedule|retention period|disposal|preservation|archive|authorized destruction)\b/.test(normalizedDraft)
    const hasRecordsAccess = /\b(access control|confidential|classification|audit trail|redaction|public access)\b/.test(normalizedDraft)

    if (!(hasRecordsOwner && hasRecordsLifecycle && hasRecordsAccess)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Records-management controls are incomplete',
          'Public-records, archives, retention, or document-disposal language was detected without enough custodian, lifecycle, access-classification, preservation, disposal, or audit controls.',
          'Add records officer or custodian, retention schedule, active and archival classification, access controls, preservation, authorized disposal, audit trail, and privacy or FOI coordination.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9470') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(foi|freedom of information|information request|public disclosure|transparency portal|request for information|redaction)\b/.test(normalizedDraft)) {
    const hasFoiIntake = /\b(request intake|receiving office|response time|tracking|request form)\b/.test(normalizedDraft)
    const hasFoiExceptions = /\b(exception|exemption|redaction|privacy|confidential|security|privileged)\b/.test(normalizedDraft)
    const hasFoiDecision = /\b(denial|appeal|reconsideration|decision|written response|release)\b/.test(normalizedDraft)

    if (!(hasFoiIntake && hasFoiExceptions && hasFoiDecision)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'FOI request controls need more detail',
          'FOI, transparency, public-disclosure, or information-request language was detected without enough intake, timeline, exception review, redaction, denial, appeal, or request-log controls.',
          'Add receiving office, request tracking, response timeline, exception and privacy review, redaction workflow, written denial, appeal route, release record, and archives coordination.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'eo-2-2016') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(senior citizen|elderly|osca|senior discount|social pension|vat exemption|senior id)\b/.test(normalizedDraft)) {
    const hasSeniorEligibility = /\b(eligibility|qualified|identification card|senior id|verification)\b/.test(normalizedDraft)
    const hasSeniorBenefitControls = /\b(discount|vat exemption|social pension|benefit|privilege)\b/.test(normalizedDraft)
    const hasSeniorAdminControls = /\b(osca|complaint|privacy|records|retention|responsible office)\b/.test(normalizedDraft)

    if (!(hasSeniorEligibility && hasSeniorBenefitControls && hasSeniorAdminControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Senior-citizen benefit controls are incomplete',
          'Senior-citizen, OSCA, discount, social-pension, or benefit language was detected without enough eligibility, verification, office ownership, complaint, tax, or privacy controls.',
          'Add eligibility, OSCA or responsible office, ID verification, discount or benefit workflow, complaint route, record retention, privacy safeguards, and tax-treatment coordination where relevant.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9994') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(pwd|person with disability|persons with disability|disabled person|disability|accessibility|reasonable accommodation|auxiliary aid)\b/.test(normalizedDraft)) {
    if (!/\b(accessibility|reasonable accommodation|auxiliary aid|alternative format|complaint|eligibility|verification|privacy|access control|non discrimination)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'PWD accessibility controls are incomplete',
          'PWD, disability, accessibility, accommodation, or auxiliary-aid language was detected without enough accessible alternatives, eligibility, accommodation, complaint, or privacy controls.',
          'Add accessibility standards, reasonable accommodation, alternative channels or formats, eligibility and verification, complaint process, non-discrimination, and privacy safeguards.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7277') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(socialized housing|resettlement|relocation|informal settler|urban poor|demolition|eviction|housing beneficiary)\b/.test(normalizedDraft)) {
    const hasHousingEligibility = /\b(eligibility|beneficiary|census|validation|qualification|household)\b/.test(normalizedDraft)
    const hasHousingProcess = /\b(consultation|notice|relocation site|resettlement|basic services|livelihood|timetable)\b/.test(normalizedDraft)
    const hasHousingGrievance = /\b(grievance|appeal|complaint|documentation|records|privacy)\b/.test(normalizedDraft)

    if (!(hasHousingEligibility && hasHousingProcess && hasHousingGrievance)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Housing or resettlement controls are incomplete',
          'Socialized-housing, relocation, resettlement, eviction, demolition, informal-settler, or urban-poor language was detected without enough beneficiary validation, consultation, relocation, services, grievance, or record safeguards.',
          'Add beneficiary eligibility and census or validation, consultation, notice, relocation-site and basic-service commitments, livelihood or transition support, grievance or appeal route, and household-record privacy.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7279') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(dhsud|human settlements|subdivision|homeowners association|settlement planning|housing regulation|land use plan)\b/.test(normalizedDraft)) {
    const hasSettlementRegulator = /\b(dhsud|housing regulator|permit|registration|responsible office)\b/.test(normalizedDraft)
    const hasSettlementPlanning = /\b(zoning|hazard|utilities|environmental|accessibility|land use|settlement plan)\b/.test(normalizedDraft)
    const hasSettlementRemedy = /\b(complaint|consultation|grievance|records|monitoring|appeal)\b/.test(normalizedDraft)

    if (!(hasSettlementRegulator && hasSettlementPlanning && hasSettlementRemedy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Human-settlements governance needs coordination detail',
          'DHSUD, subdivision, homeowners, settlement-planning, housing-regulation, or land-use language was detected without clear regulator, permit, complaint, hazard, utilities, environmental, or accessibility coordination.',
          'Add DHSUD or housing-regulator coordination, LGU role, permits or registration, complaint path, hazard and utilities checks, accessibility, environmental safeguards, and records ownership.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11201') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(4ps|pantawid|conditional cash transfer|cash assistance|household grant|education grant|health grant|social assistance)\b/.test(normalizedDraft)) {
    const hasAssistanceEligibility = /\b(eligibility|qualified|beneficiary|household|validation|criteria)\b/.test(normalizedDraft)
    const hasAssistanceBenefit = /\b(condition|grant|payment|benefit|education|health|monitoring)\b/.test(normalizedDraft)
    const hasAssistanceReview = /\b(grievance|appeal|delisting|denial|privacy|records|fraud)\b/.test(normalizedDraft)

    if (!(hasAssistanceEligibility && hasAssistanceBenefit && hasAssistanceReview)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Social-assistance controls need eligibility and grievance detail',
          '4Ps, cash-assistance, household-grant, or social-benefit language was detected without enough eligibility, validation, conditions, payment, monitoring, delisting, grievance, or privacy controls.',
          'Add objective eligibility and household validation, benefit conditions and limits, payment controls, monitoring, fraud checks, delisting notice, grievance or appeal route, and privacy safeguards for household records.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11310') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(solo parent|solo parents|solo parent id|parental leave|child care benefit|solo-parent benefit)\b/.test(normalizedDraft)) {
    if (!/\b(eligibility|documentary proof|verification|renewal|benefit|leave|subsidy|grievance|appeal|privacy)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Solo-parent benefit controls are incomplete',
          'Solo-parent, solo-parent ID, parental-leave, child-care, subsidy, or welfare-benefit language was detected without enough eligibility, proof, verification, renewal, grievance, or privacy controls.',
          'Add solo-parent eligibility, documentary proof, verification and renewal process, benefit scope, responsible office, grievance or appeal route, and confidentiality for family and child records.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11861') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(child marriage|minor marriage|underage marriage|solemnization|marriage facilitation|cohabitation with a minor)\b/.test(normalizedDraft)) {
    const hasChildMarriageAgeControls = /\b(age verification|minor verification|birth certificate|age record)\b/.test(normalizedDraft)
    const hasChildMarriageReferral = /\b(reporting|referral|social welfare|child protection|case management|law enforcement)\b/.test(normalizedDraft)
    const hasChildMarriageConfidentiality = /\b(confidential|child identity|case record|prevention education|restricted access)\b/.test(normalizedDraft)

    if (!(hasChildMarriageAgeControls && hasChildMarriageReferral && hasChildMarriageConfidentiality)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Child-marriage prevention controls are incomplete',
          'Child-marriage, minor-marriage, solemnization, facilitation, or cohabitation language was detected without enough age-verification, prevention, reporting, referral, confidentiality, or case-management controls.',
          'Add age verification, prevention education, reporting channel, social-welfare and child-protection referral, confidentiality, civil-registration coordination, and case records.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11596') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(building permit|occupancy permit|construction|renovation|structural|building official|fit out|facility use)\b/.test(normalizedDraft)) {
    const hasBuildingPermitControls = /\b(building permit|plan review|building official|zoning)\b/.test(normalizedDraft)
    const hasOccupancyOrInspectionControls = /\b(occupancy permit|inspection|final inspection|certificate of occupancy)\b/.test(normalizedDraft)
    const hasBuildingSafetyControls = /\b(structural|fire safety|accessibility|stop use|correction order|appeal)\b/.test(normalizedDraft)

    if (!(hasBuildingPermitControls && hasOccupancyOrInspectionControls && hasBuildingSafetyControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Building and occupancy controls are incomplete',
          'Construction, renovation, facility-use, or occupancy language was detected without enough building permit, plan review, inspection, occupancy, zoning, accessibility, or safety controls.',
          'Add building permit and plan-review requirements, inspection cadence, occupancy approval, building official role, fire and accessibility checks, correction orders, and stop-use or appeal process.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-1096') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(sanitary permit|sanitation|food establishment|health certificate|public toilet|sewage|septage|market sanitation|vermin|pest control)\b/.test(normalizedDraft)) {
    const hasSanitaryPermitControls = /\b(sanitary permit|health certificate|health officer)\b/.test(normalizedDraft)
    const hasSanitaryFacilityControls = /\b(potable water|toilet|sewage|septage|refuse|pest|vermin|food handling)\b/.test(normalizedDraft)
    const hasSanitaryInspectionControls = /\b(inspection|correction order|closure|reopening|complaint)\b/.test(normalizedDraft)

    if (!(hasSanitaryPermitControls && hasSanitaryFacilityControls && hasSanitaryInspectionControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Sanitation controls need inspection detail',
          'Sanitation, food-establishment, public-facility, toilet, sewage, or health-certificate language was detected without enough permit, inspection, water, toilet, refuse, pest-control, or correction controls.',
          'Add sanitary permit and health-certificate handling, water and toilet standards, refuse and pest controls, health-office inspection, correction orders, closure or reopening rules, and complaint route.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-856') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(accessibility|ramp|accessible route|barrier free|public building accessibility|accessibility law|accessible toilet|accessible parking)\b/.test(normalizedDraft)) {
    if (!/\b(ramp|accessible route|parking|toilet|signage|counter|barrier free|inspection|correction|alternative access)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Physical accessibility features need detail',
          'Barrier-free, public-building accessibility, ramp, route, toilet, parking, or signage language was detected without enough concrete accessibility features, inspection, or correction controls.',
          'Add accessible routes, ramps, parking, toilets, signage, service counters, inspection owner, correction timeline, and complaint or accommodation route.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'bp-344') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(child abuse|child protection|working child|child exploitation|minor abuse|neglect|child discrimination)\b/.test(normalizedDraft)) {
    const hasChildReportingControls = /\b(reporting|report channel|mandatory report|case intake)\b/.test(normalizedDraft)
    const hasChildReferralControls = /\b(referral|social welfare|protective custody|case management|law enforcement)\b/.test(normalizedDraft)
    const hasChildConfidentialityControls = /\b(confidential|child identity|restricted access|parent|guardian|supervision|privacy)\b/.test(normalizedDraft)

    if (!(hasChildReportingControls && hasChildReferralControls && hasChildConfidentialityControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Child-protection controls need more detail',
          'Child abuse, exploitation, working-child, minor-safety, or child-protection language was detected without enough reporting, referral, confidentiality, supervision, or case-management controls.',
          'Add child-protection reporting, social welfare referral, confidentiality, parent or guardian handling where appropriate, supervision standards, case records, and authorized escalation.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7610') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(ofw|migrant worker|overseas employment|illegal recruitment|placement agency|deployment|repatriation)\b/.test(normalizedDraft)) {
    const hasMigrantVerificationControls = /\b(license|verification|employment contract|fee|placement agency|contract review)\b/.test(normalizedDraft)
    const hasMigrantComplaintControls = /\b(complaint|illegal recruitment|reporting|legal assistance|referral)\b/.test(normalizedDraft)
    const hasMigrantWelfareControls = /\b(welfare|repatriation|worker support|dmw|confidential|case record)\b/.test(normalizedDraft)

    if (!(hasMigrantVerificationControls && hasMigrantComplaintControls && hasMigrantWelfareControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Migrant-worker protection controls are incomplete',
          'OFW, migrant-worker, overseas-employment, recruitment, placement, or deployment language was detected without enough licensing, contract verification, fee, complaint, welfare, or repatriation controls.',
          'Add agency or offer verification, employment-contract review, fee restrictions, illegal-recruitment reporting, worker welfare referral, repatriation or legal-assistance route, and confidentiality safeguards.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8042') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10022') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11641') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(immigration|visa|foreign national|alien registration|overstay|deportation|blacklist|bureau of immigration)\b/.test(normalizedDraft)) {
    const hasImmigrationStatusControls = /\b(visa|status|stay|admission|registration|entry|departure|permit)\b/.test(normalizedDraft)
    const hasImmigrationProcessControls = /\b(bureau of immigration|bi|notice|hearing|appeal|order|verification)\b/.test(normalizedDraft)
    const hasImmigrationRecordControls = /\b(passport|travel history|record custodian|confidential|retention|authorized disclosure|access control)\b/.test(normalizedDraft)

    if (!(hasImmigrationStatusControls && hasImmigrationProcessControls && hasImmigrationRecordControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Immigration-status controls are incomplete',
          'Immigration, visa, foreign-national, overstay, exclusion, deportation, or alien-registration language was detected without enough status basis, official verification, notice, hearing, appeal, or record-custody controls.',
          'Add immigration status basis, visa or stay category, Bureau of Immigration or official verification route, required proof, notice and hearing or appeal path, case owner, passport and travel-record custody, retention, and authorized disclosure rules.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ca-613') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(passport|travel document|dfa passport|lost passport|passport renewal|minor passport|passport application)\b/.test(normalizedDraft)) {
    const hasPassportAuthorityControls = /\b(dfa|consular|citizenship proof|identity proof|applicant|representative|minor)\b/.test(normalizedDraft)
    const hasPassportLifecycleControls = /\b(application|renewal|issuance|cancellation|lost|replacement|travel document)\b/.test(normalizedDraft)
    const hasPassportDataControls = /\b(passport number|biometric|photo|signature|record custodian|confidential|retention|access control)\b/.test(normalizedDraft)

    if (!(hasPassportAuthorityControls && hasPassportLifecycleControls && hasPassportDataControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Passport and travel-document controls are incomplete',
          'Passport, travel-document, renewal, loss, DFA, consular, or minor-passport language was detected without enough citizenship proof, applicant authority, lifecycle handling, or passport-record safeguards.',
          'Add current passport-law review, DFA or consular filing route, applicant authority, citizenship and identity proof, minor or representative safeguards, issuance or renewal steps, loss or cancellation handling, biometric/passport-number controls, retention, and authorized disclosure.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11983') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8239') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(dual citizenship|citizenship reacquisition|citizenship re-acquisition|oath of allegiance|natural born filipino|ra 9225)\b/.test(normalizedDraft)) {
    const hasReacquisitionProofControls = /\b(natural born|birth certificate|foreign citizenship|oath|certificate)\b/.test(normalizedDraft)
    const hasReacquisitionRouteControls = /\b(consular|bureau of immigration|dfa|filing|derivative|minor child|record update)\b/.test(normalizedDraft)
    const hasReacquisitionSafeguards = /\b(confidential|retention|access control|civil registry|passport|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasReacquisitionProofControls && hasReacquisitionRouteControls && hasReacquisitionSafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Citizenship re-acquisition controls are incomplete',
          'Dual-citizenship, citizenship-retention, re-acquisition, natural-born proof, oath, or derivative-citizenship language was detected without enough proof, filing route, certificate, child-record, or privacy controls.',
          'Add natural-born proof, foreign-citizenship event, oath and certificate handling, consular or local filing route, derivative-child handling, civil registry or passport consequences, access controls, retention, and authorized-disclosure rules.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9225') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(naturalization|administrative naturalization|judicial naturalization|citizenship petition|certificate of naturalization)\b/.test(normalizedDraft)) {
    const hasNaturalizationRouteControls = /\b(judicial|administrative|petition|special committee|court|filing)\b/.test(normalizedDraft)
    const hasNaturalizationDueProcessControls = /\b(qualification|disqualification|residence|publication|hearing|opposition|oath|decision)\b/.test(normalizedDraft)
    const hasNaturalizationRecordControls = /\b(certificate|record custodian|civil registry|confidential|retention|access control)\b/.test(normalizedDraft)

    if (!(hasNaturalizationRouteControls && hasNaturalizationDueProcessControls && hasNaturalizationRecordControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Naturalization controls are incomplete',
          'Naturalization or citizenship-petition language was detected without enough route classification, qualification, publication, hearing, oath, certificate, or record-custody controls.',
          'Add whether the process is judicial or administrative naturalization, eligibility and disqualification checks, residence proof, publication and notice, hearing or opposition path, oath and certificate handling, civil registry or passport consequences, retention, and confidentiality controls.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ca-473') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9139') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(election|comelec|candidate|campaign period|vote buying|polling place|canvass|election offense|ballot|watcher)\b/.test(normalizedDraft)) {
    const hasElectionScopeControls = /\b(election type|candidate|party|comelec|campaign period|polling place|canvass|voting stage)\b/.test(normalizedDraft)
    const hasElectionOffenseControls = /\b(prohibited act|election offense|vote buying|complaint|notice|hearing|appeal|investigation)\b/.test(normalizedDraft)
    const hasElectionRecordControls = /\b(ballot|election return|canvass|watcher|record custodian|retention|access control|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasElectionScopeControls && hasElectionOffenseControls && hasElectionRecordControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Election process controls are incomplete',
          'Election, COMELEC, candidate, campaign-period, polling-place, canvassing, watcher, ballot, or election-offense language was detected without enough scope, prohibited-act, complaint, due-process, or records controls.',
          'Add election type, candidate or party role, COMELEC process, campaign period, voting/canvassing stage, prohibited acts, complaint and hearing route, election-return or ballot custody, watcher access, retention, and authorized disclosure rules.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'bp-881') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7166') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(voter registration|voter list|registered voter|voter record|precinct|election registration board|deactivation|reactivation)\b/.test(normalizedDraft)) {
    const hasVoterEligibilityControls = /\b(eligibility|qualified voter|residence|citizenship|age|application|proof)\b/.test(normalizedDraft)
    const hasVoterBoardControls = /\b(election registration board|comelec|objection|approval|deactivation|reactivation|notice|appeal)\b/.test(normalizedDraft)
    const hasVoterDataControls = /\b(voter list|precinct|biometric|address|record custodian|privacy|retention|access control|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasVoterEligibilityControls && hasVoterBoardControls && hasVoterDataControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Voter-registration controls are incomplete',
          'Voter-registration, voter-list, precinct, registered-voter, deactivation, reactivation, or election-registration-board language was detected without enough eligibility, board action, objection, notice, appeal, or voter-record safeguards.',
          'Add voter eligibility, application proof, residence or locality, registration-board action, objection route, deactivation or reactivation process, precinct handling, biometrics/address safeguards, retention, and authorized-disclosure controls.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8189') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(campaign material|campaign poster|political advertisement|election propaganda|common poster area|media time|soce|campaign expenditure|campaign contribution)\b/.test(normalizedDraft)) {
    const hasCampaignMaterialControls = /\b(material type|poster|advertisement|media|placement|size|common poster area|sponsor disclosure)\b/.test(normalizedDraft)
    const hasCampaignFinanceControls = /\b(contribution|expenditure|soce|invoice|receipt|spending|donor|expense)\b/.test(normalizedDraft)
    const hasCampaignReviewControls = /\b(approval|takedown|complaint|retention|record custodian)\b/.test(normalizedDraft)

    if (!(hasCampaignMaterialControls && hasCampaignFinanceControls && hasCampaignReviewControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Campaign material and finance controls are incomplete',
          'Campaign-material, political-advertising, election-propaganda, media-time, SOCE, contribution, or expenditure language was detected without enough material classification, disclosure, finance, approval, complaint, or retention controls.',
          'Add material type, size or placement limits, sponsor disclosure, campaign-period review, media contract and invoice records, contribution and expenditure tracking, SOCE owner, takedown or complaint route, retention, and audit safeguards.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9006') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7166') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(automated election|vote counting|counting machine|source code review|random manual audit|voter verified paper audit trail|election transmission|machine log)\b/.test(normalizedDraft)) {
    const hasAesSystemControls = /\b(system scope|testing|certification|source code|machine|counting|transmission|canvassing)\b/.test(normalizedDraft)
    const hasAesAuditControls = /\b(audit|random manual audit|paper audit trail|log|incident|exception|security)\b/.test(normalizedDraft)
    const hasAesCustodyControls = /\b(custody|access control|retention|record custodian|transmission record|result file|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasAesSystemControls && hasAesAuditControls && hasAesCustodyControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Automated election controls are incomplete',
          'Automated-election, vote-counting, source-code, manual-audit, transmission, machine-log, or election-technology language was detected without enough system, audit, security, incident, custody, or retention controls.',
          'Add system scope, testing or certification, source-code review, vote-counting and transmission controls, random manual audit or paper-audit-trail handling, security incident route, result-file custody, access controls, retention, and authorized disclosure.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8436') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9369') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(sangguniang kabataan|katipunan ng kabataan|sk funds|sk budget|youth development plan|local youth development council|sk election|youth council)\b/.test(normalizedDraft)) {
    const hasSkEligibilityControls = /\b(age|residence|qualification|katipunan|youth council|local youth development council)\b/.test(normalizedDraft)
    const hasSkGovernanceControls = /\b(youth development plan|budget|fund|procurement|training|resolution|meeting minutes)\b/.test(normalizedDraft)
    const hasSkSafeguards = /\b(reporting|sk audit|fund audit|coa|liquidation|grievance|privacy|retention|beneficiary|record custodian)\b/.test(normalizedDraft)

    if (!(hasSkEligibilityControls && hasSkGovernanceControls && hasSkSafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'SK and youth-governance controls are incomplete',
          'Sangguniang Kabataan, Katipunan ng Kabataan, SK funds, youth development, local youth council, or youth-program language was detected without enough eligibility, planning, budgeting, procurement, reporting, privacy, or audit controls.',
          'Add age and residency qualifications, youth development plan, local youth council coordination, SK fund authority, procurement or spending route, training, meeting and resolution records, beneficiary safeguards, monitoring, grievance, retention, and audit controls.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10742') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11768') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(bank secrecy|bank deposit|bank statement|bank statements|deposit account|financial record|account number)\b/.test(normalizedDraft)) {
    if (!/\b(consent|waiver|court order|lawful process|authorized disclosure|redaction|confidential|access control|retention)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Bank-deposit confidentiality controls are missing',
          'Bank-deposit, bank-statement, account, or financial-record language was detected without enough consent, lawful process, access control, redaction, or retention safeguards.',
          'Add purpose, consent or lawful-process basis, authorized users, redaction, access logs, retention, disclosure exceptions, and complaint handling.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-1405') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/(price freeze|price ceiling|hoarding|profiteering|basic necessities|prime commodities|price monitoring)/.test(normalizedDraft)) {
    const hasPriceScopeControls = /\b(covered goods|covered commodities|basic necessities|prime commodities|duration|trigger|calamity)\b/.test(normalizedDraft)
    const hasPriceMonitoringControls = /\b(price monitoring|monitoring office|evidence|inspection|market survey)\b/.test(normalizedDraft)
    const hasPriceDueProcessControls = /\b(complaint|notice|appeal|correction|hearing)\b/.test(normalizedDraft)

    if (!(hasPriceScopeControls && hasPriceMonitoringControls && hasPriceDueProcessControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Price-control measures need scope and due process',
          'Price-freeze, price-ceiling, hoarding, profiteering, basic-necessity, or prime-commodity language was detected without enough covered-goods, trigger, duration, evidence, notice, or appeal controls.',
          'Add covered commodities, emergency or calamity trigger, duration, monitoring office, evidence requirements, publication, complaint intake, notice, correction, and appeal route.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7581') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(bmbe|barangay micro business|micro business|micro enterprise|certificate of authority)\b/.test(normalizedDraft)) {
    if (!/\b(eligibility|certificate of authority|registration|renewal|verification|benefit|incentive|monitoring|records)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'BMBE support needs eligibility and certificate controls',
          'BMBE, barangay micro business, micro-enterprise, incentive, or local-business support language was detected without enough eligibility, registration, certificate, benefit, or monitoring controls.',
          'Add BMBE eligibility, certificate-of-authority process, renewal, benefit limits, verification, monitoring, records, privacy, and responsible office.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9178') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(msme|small business|enterprise development|business support|market access|credit assistance|business incubation)\b/.test(normalizedDraft)) {
    if (!/\b(eligibility|selection criteria|scoring|conflict|reporting|appeal|credit|training|market access|monitoring)\b/.test(normalizedDraft)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'MSME assistance needs objective selection controls',
          'MSME, small-business, enterprise-development, credit, market-access, or business-support language was detected without enough eligibility, scoring, conflict, monitoring, or appeal controls.',
          'Add objective eligibility, scoring or selection criteria, conflict checks, benefit limits, reporting, appeal route, privacy safeguards, and audit trail.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9501') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(renewable energy|solar|wind|biomass|net metering|green energy|renewable project)\b/.test(normalizedDraft)) {
    const hasRenewableAuthorization = /\b(permit|doe|registration|eligibility|interconnection|net metering)\b/.test(normalizedDraft)
    const hasRenewablePerformance = /\b(performance|maintenance|safety|metering|inspection)\b/.test(normalizedDraft)
    const hasRenewableSafeguards = /\b(environmental|consumer disclosure|green claim|ownership|complaint)\b/.test(normalizedDraft)

    if (!(hasRenewableAuthorization && hasRenewablePerformance && hasRenewableSafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Renewable-energy project controls need detail',
          'Renewable-energy, solar, wind, biomass, green-energy, or net-metering language was detected without enough permit, DOE coordination, interconnection, safety, performance, or consumer-disclosure controls.',
          'Add project classification, permit and DOE coordination, interconnection or facility controls, safety and maintenance, performance metrics, environmental safeguards, and green-claim verification.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9513') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(climate action|climate change|climate risk|adaptation|mitigation|lccap|resilience|greenhouse gas|local climate)\b/.test(normalizedDraft)) {
    const hasClimateRiskControls = /\b(risk baseline|climate risk|hazard|vulnerable|exposure)\b/.test(normalizedDraft)
    const hasClimateActionControls = /\b(adaptation|mitigation|lccap|local climate action|measure)\b/.test(normalizedDraft)
    const hasClimateImplementationControls = /\b(indicator|budget|timeline|monitoring cadence|responsible office|reporting)\b/.test(normalizedDraft)

    if (!(hasClimateRiskControls && hasClimateActionControls && hasClimateImplementationControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Climate action controls need measurable indicators',
          'Climate, resilience, adaptation, mitigation, LCCAP, or greenhouse-gas language was detected without enough risk baseline, vulnerable-group mapping, indicators, budget, timeline, or monitoring controls.',
          'Add climate-risk baseline, vulnerable sectors, adaptation and mitigation measures, budget, responsible office, indicators, reporting cadence, and linkage to DRRM and land-use plans.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9729') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(fisheries|fishing permit|municipal waters|aquaculture|illegal fishing|fisherfolk|coastal resource)\b/.test(normalizedDraft)) {
    const hasFisheryJurisdictionControls = /\b(municipal waters|permit|license|fishery permit|jurisdiction|boundary)\b/.test(normalizedDraft)
    const hasFisheryConservationControls = /\b(gear|closed season|conservation|marine protected|refuge|illegal fishing)\b/.test(normalizedDraft)
    const hasFisheryParticipationControls = /\b(consultation|fisherfolk|enforcement|bfar|monitoring|reporting)\b/.test(normalizedDraft)

    if (!(hasFisheryJurisdictionControls && hasFisheryConservationControls && hasFisheryParticipationControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Fisheries controls need jurisdiction and conservation detail',
          'Fisheries, fishing permit, municipal-water, aquaculture, illegal-fishing, fisherfolk, or coastal-resource language was detected without enough jurisdiction, permit, gear, conservation, consultation, or enforcement controls.',
          'Add municipal-water boundary, permit or license process, gear restrictions, closed areas or seasons, fisherfolk consultation, enforcement, conservation, and monitoring.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8550') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(mining|quarry|mineral|tailings|mine safety|exploration permit|mineral agreement|extraction)\b/.test(normalizedDraft)) {
    const hasMiningAuthorizationControls = /\b(permit|mgb|mineral agreement|exploration permit|quarry permit)\b/.test(normalizedDraft)
    const hasMiningEnvironmentalControls = /\b(environmental|rehabilitation|closure|tailings|water|hazardous)\b/.test(normalizedDraft)
    const hasMiningSafetyCommunityControls = /\b(safety|consultation|community|monitoring|inspection|appeal)\b/.test(normalizedDraft)

    if (!(hasMiningAuthorizationControls && hasMiningEnvironmentalControls && hasMiningSafetyCommunityControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Mining or quarry controls are incomplete',
          'Mining, quarry, mineral, extraction, tailings, or mine-safety language was detected without enough permit, regulator, environmental, rehabilitation, safety, consultation, or closure controls.',
          'Add permit type, MGB or regulator coordination, environmental safeguards, water and hazardous-substance controls, worker safety, community consultation, rehabilitation, closure, monitoring, and appeal route.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7942') || LEGAL_CORPUS[0])]
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

export function getLocalComplianceFrameworks() {
  return COMPLIANCE_FRAMEWORKS.map((framework) => ({
    id: framework.id,
    title: framework.title,
    lawIds: framework.lawIds,
    triggers: framework.triggers,
  }))
}
