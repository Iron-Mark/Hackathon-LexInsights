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
    triggers: ['heritage', 'cultural property', 'historic site', 'museum', 'archive', 'conservation', 'restoration'],
    expansions: ['national cultural heritage act', 'cultural property', 'conservation', 'ncca nhcp national museum'],
  },
  {
    triggers: ['senior citizen', 'elderly', 'osca', 'senior discount', 'social pension'],
    expansions: ['expanded senior citizens act', 'senior citizen benefits', 'osca', 'discount vat exemption'],
  },
  {
    triggers: ['pwd', 'person with disability', 'disabled person', 'accessibility', 'reasonable accommodation'],
    expansions: ['magna carta for disabled persons', 'persons with disability', 'accessibility', 'reasonable accommodation'],
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
    ],
    lawIds: ['ra-7394', 'ra-11765', 'ra-9160', 'ra-8792', 'ra-10173', 'ra-11976'],
    summary:
      'Use this when a workflow involves consumer sales, financial products, payments, remittance, AML controls, e-commerce records, invoicing, or taxpayer-facing collections.',
    sequence: [
      'Identify whether the issue is consumer product/service quality, financial consumer protection, AML monitoring, e-commerce evidence, tax, or privacy.',
      'Map disclosures, fees, complaints, refunds, fraud reports, KYC, transaction reports, invoices, receipts, and record retention.',
      'Separate customer service handling from regulator escalation, suspicious transaction reporting, and tax documentation.',
      'Avoid collecting financial or identity data without clear purpose, access controls, and retention period.',
    ],
    checkpoints: [
      'Terms, fees, risks, warranties, price, complaint route, and remedy are clear before the transaction.',
      'Unauthorized transactions, fraud reports, and suspicious transaction workflows have timelines and responsible officers.',
      'Invoices, receipts, VAT, withholding, and tax records are accounted for where payment collection is involved.',
      'Financial and consumer records are protected with privacy, confidentiality, and audit safeguards.',
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
      'protection order',
      'vawc',
      'trafficking',
      'social welfare',
    ],
    lawIds: ['ra-11223', 'ra-11036', 'ra-9994', 'ra-7277', 'ra-9262', 'ra-10364', 'ra-10173'],
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
