import type { LocalTopicExpansion } from './types'

export const TOPIC_EXPANSIONS: LocalTopicExpansion[] = [
  {
    triggers: ['waste', 'garbage', 'trash', 'recycling', 'landfill', 'segregation', 'mrf', 'compost'],
    expansions: ['solid waste', 'source segregation', 'materials recovery facility', 'local solid waste management plan'],
  },
  {
    triggers: ['privacy', 'personal', 'data', 'information', 'records', 'consent', 'breach'],
    expansions: ['data privacy', 'personal information', 'privacy notice', 'retention', 'breach response', 'privacy impact assessment'],
  },
  {
    triggers: [
      'ai',
      'artificial intelligence',
      'ai system',
      'chatbot',
      'automated decision',
      'automated decision making',
      'algorithmic decision',
      'model governance',
      'public sector ai',
      'government ai',
      'privacy impact assessment',
      'human review',
    ],
    expansions: [
      'ai governance',
      'artificial intelligence systems processing personal data',
      'privacy impact assessment',
      'human centered augmented intelligence',
      'automated decision making',
      'transparency accountability fairness',
      'privacy by design',
    ],
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
    triggers: [
      'barangay complaint',
      'barangay dispute',
      'barangay conciliation',
      'katarungang pambarangay',
      'lupon',
      'pangkat',
      'amicable settlement',
      'certificate to file action',
      'blotter',
      'neighbor dispute',
    ],
    expansions: [
      'local government code',
      'barangay justice',
      'lupon conciliation',
      'pangkat settlement',
      'certificate to file action',
      'privacy referral safeguards',
    ],
  },
  {
    triggers: [
      'civil service',
      'csc',
      'government employee',
      'public employee',
      'appointment',
      'promotion',
      'reassignment',
      'detail',
      'personnel action',
      'service record',
    ],
    expansions: [
      'civil service decree',
      'administrative code',
      'appointing authority',
      'qualification eligibility',
      'personnel records',
    ],
  },
  {
    triggers: [
      'administrative case',
      'administrative discipline',
      'preventive suspension',
      'formal charge',
      'disciplinary action',
      'removal from service',
      'public employee suspension',
      'csc appeal',
    ],
    expansions: [
      'civil service discipline',
      'notice hearing appeal',
      'formal charge answer decision',
      'personnel file confidentiality',
    ],
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
    triggers: ['women', 'magna carta of women', 'gender equality', 'gad', 'gender and development', 'women desk'],
    expansions: ['magna carta of women', 'gender responsive service', 'non discrimination', 'women protection'],
  },
  {
    triggers: ['electronic', 'digital', 'online', 'signature', 'record', 'filing'],
    expansions: ['electronic commerce act', 'electronic document', 'electronic signature', 'audit trail'],
  },
  {
    triggers: [
      'digital government',
      'e-governance',
      'egovernance',
      'government portal',
      'online government service',
      'government data exchange',
      'dict',
      'ict system',
      'public sector ai',
      'government ai',
      'public-sector automation',
    ],
    expansions: ['e-governance act', 'dict act', 'interoperability', 'digital public service', 'ai governance'],
  },
  {
    triggers: [
      'internet transaction',
      'online marketplace',
      'e-marketplace',
      'online merchant',
      'online seller',
      'digital platform',
      'platform seller',
      'social commerce',
    ],
    expansions: ['internet transactions act', 'seller verification', 'consumer redress', 'platform responsibility'],
  },
  {
    triggers: ['procurement', 'bidding', 'bid', 'supplier', 'contract', 'bac', 'award'],
    expansions: ['new government procurement act', 'public bidding', 'bids and awards committee', 'contract implementation'],
  },
  {
    triggers: [
      'ppp',
      'public-private partnership',
      'public private partnership',
      'concession',
      'unsolicited proposal',
      'infrastructure project',
    ],
    expansions: ['public-private partnership code', 'project approval', 'risk allocation', 'contract management'],
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
    triggers: ['osaec', 'csaem', 'online sexual abuse', 'child sexual abuse material', 'child exploitation material', 'livestreaming abuse'],
    expansions: ['anti osaec act', 'anti csaem act', 'victim survivor confidentiality', 'notice and takedown'],
  },
  {
    triggers: ['money laundering', 'aml', 'amla', 'kyc', 'covered transaction', 'suspicious transaction', 'beneficial owner'],
    expansions: ['anti money laundering act', 'customer due diligence', 'suspicious transaction report', 'amlc'],
  },
  {
    triggers: ['bsp', 'bangko sentral', 'central bank', 'monetary board', 'bank supervision', 'financial stability'],
    expansions: ['new central bank act', 'bangko sentral supervision', 'financial stability', 'regulatory report'],
  },
  {
    triggers: ['banking', 'bank loan', 'bank deposit', 'bank director', 'bank officer', 'fiduciary account'],
    expansions: ['general banking law', 'bank supervision', 'bank loan approval', 'related interest'],
  },
  {
    triggers: ['lending company', 'loan app', 'microloan', 'borrower', 'loan collection', 'salary loan'],
    expansions: ['lending company regulation', 'borrower disclosure', 'loan charges', 'collection records'],
  },
  {
    triggers: ['financing company', 'lease financing', 'factoring', 'receivables financing', 'installment financing'],
    expansions: ['financing company act', 'financing agreement', 'assignment of receivables', 'collateral records'],
  },
  {
    triggers: ['insurance', 'insurance policy', 'premium', 'policyholder', 'insurance claim', 'insurance agent', 'insurance broker'],
    expansions: ['insurance code', 'policyholder protection', 'insurance commission', 'claims handling'],
  },
  {
    triggers: ['pre need', 'pre-need', 'planholder', 'education plan', 'memorial plan', 'pension plan'],
    expansions: ['pre need code', 'planholder protection', 'trust fund', 'benefit claim'],
  },
  {
    triggers: ['pdic', 'deposit insurance', 'insured deposit', 'closed bank', 'bank liquidation', 'receivership'],
    expansions: ['deposit insurance', 'pdic claim', 'closed bank payout', 'depositor protection'],
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
    triggers: [
      'money mule',
      'mule account',
      'financial account scam',
      'account takeover',
      'social engineering',
      'phishing',
      'wallet scam',
      'unauthorized transfer',
    ],
    expansions: ['anti financial account scamming', 'financial account', 'fraud report', 'evidence preservation'],
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
    triggers: [
      'tax',
      'taxpayer',
      'bir',
      'nirc',
      'tax code',
      'invoice',
      'receipt',
      'vat',
      'withholding',
      'tax return',
      'income tax',
      'percentage tax',
    ],
    expansions: [
      'national internal revenue code',
      'ease of paying taxes act',
      'taxpayer rights',
      'invoicing',
      'filing payment',
      'withholding certificate',
      'books of account',
    ],
  },
  {
    triggers: [
      'train',
      'train law',
      'excise tax',
      'personal income tax',
      'documentary stamp tax',
      'estate tax',
      'donor tax',
    ],
    expansions: ['tax reform for acceleration and inclusion', 'nirc amendment', 'vat threshold', 'excise tax', 'withholding'],
  },
  {
    triggers: [
      'create',
      'create act',
      'create more',
      'corporate income tax',
      'tax incentive',
      'tax incentives',
      'registered business enterprise',
      'rbe',
      'peza',
      'boi',
      'firb',
      'investment promotion agency',
    ],
    expansions: [
      'corporate recovery and tax incentives',
      'corporate income tax',
      'registered business enterprise',
      'fiscal incentives',
      'investment promotion agency',
      'incentive period',
    ],
  },
  {
    triggers: ['philsys', 'philid', 'national id', 'psn', 'pcn', 'identity verification'],
    expansions: ['philippine identification system', 'national id', 'authentication', 'biometric data'],
  },
  {
    triggers: ['traffic', 'transport', 'driver license', 'vehicle registration', 'road safety', 'parking', 'traffic violation'],
    expansions: ['land transportation and traffic code', 'driver licensing', 'vehicle registration', 'traffic enforcement', 'road safety'],
  },
  {
    triggers: ['license renewal', 'driver license validity', 'drivers license validity', 'lto license', 'lto renewal'],
    expansions: ['driver license validity', 'land transportation office', 'license renewal', 'traffic violation record'],
  },
  {
    triggers: ['seat belt', 'seatbelt', 'passenger safety', 'front seat passenger', 'vehicle safety'],
    expansions: ['seat belts use act', 'motor vehicle passenger safety', 'driver and front seat passenger duty'],
  },
  {
    triggers: ['motorcycle helmet', 'helmet law', 'standard protective helmet', 'rider helmet', 'back rider'],
    expansions: ['motorcycle helmet act', 'standard protective motorcycle helmet', 'rider and passenger safety', 'product standard'],
  },
  {
    triggers: ['drunk driving', 'drugged driving', 'dui', 'driving under the influence', 'field sobriety', 'breath analyzer'],
    expansions: ['anti drunk and drugged driving', 'field sobriety test', 'chemical test', 'traffic accident evidence'],
  },
  {
    triggers: ['distracted driving', 'mobile phone while driving', 'cellphone while driving', 'electronic device while driving'],
    expansions: ['anti distracted driving act', 'mobile phone', 'electronic device', 'driver device use'],
  },
  {
    triggers: ['child car seat', 'child restraint', 'child passenger', 'child safety in motor vehicles'],
    expansions: ['child safety in motor vehicles', 'child restraint system', 'child passenger safety', 'product standard'],
  },
  {
    triggers: ['public service', 'public utility', 'franchise', 'transport operator', 'telecom operator', 'critical infrastructure'],
    expansions: ['public service act', 'public utility', 'franchise certificate', 'regulator oversight'],
  },
  {
    triggers: ['electric utility', 'electricity', 'power outage', 'power interruption', 'electricity bill', 'distribution utility', 'electric cooperative'],
    expansions: ['electric power industry reform act', 'epira', 'erc regulation', 'distribution utility', 'electricity rates'],
  },
  {
    triggers: ['telecommunications', 'telecom', 'internet service provider', 'broadband', 'network outage', 'spectrum', 'frequency'],
    expansions: ['public telecommunications policy act', 'ntc', 'telecom franchise', 'network interconnection', 'subscriber service'],
  },
  {
    triggers: ['water district', 'water utility', 'water service', 'water connection', 'water disconnection', 'water rate', 'water meter'],
    expansions: ['provincial water utilities act', 'local water district', 'water service rates', 'customer complaint', 'water quality'],
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
    triggers: ['telecommuting', 'remote work', 'work from home', 'hybrid work', 'flexible work'],
    expansions: ['telecommuting act', 'work from home', 'remote work agreement', 'equal treatment'],
  },
  {
    triggers: ['service charge', 'tips', 'gratuity', 'hotel charge', 'restaurant charge'],
    expansions: ['service charge law', 'covered employees', 'service charge distribution', 'payroll records'],
  },
  {
    triggers: ['minimum wage', 'wage order', 'regional wage', 'wage board', 'rtwpb', 'wage distortion'],
    expansions: ['wage rationalization act', 'regional wage board', 'minimum wage', 'wage order'],
  },
  {
    triggers: ['breastfeeding', 'lactation', 'lactation station', 'nursing mother', 'milk expression'],
    expansions: ['expanded breastfeeding promotion act', 'lactation station', 'lactation period', 'workplace accommodation'],
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
    expansions: ['national building code', 'building permit', 'occupancy permit', 'inspection', 'building official', 'signed plans'],
  },
  {
    triggers: ['contractor license', 'licensed contractor', 'pcab', 'construction contractor', 'fit out contractor'],
    expansions: ['contractors license law', 'contractor qualification', 'project supervision', 'construction records'],
  },
  {
    triggers: ['architect', 'architectural plan', 'architectural plans', 'signed plans', 'sealed plans', 'building design'],
    expansions: ['architecture act', 'registered architect', 'architectural plans', 'professional seal'],
  },
  {
    triggers: ['civil engineer', 'structural engineer', 'structural plan', 'civil works', 'structural safety'],
    expansions: ['civil engineering law', 'registered civil engineer', 'structural plans', 'engineering inspection'],
  },
  {
    triggers: ['electrical engineer', 'electrical plan', 'electrical fit out', 'wiring', 'power system'],
    expansions: ['new electrical engineering law', 'electrical plans', 'electrical installation', 'testing inspection'],
  },
  {
    triggers: ['mechanical engineer', 'mechanical plan', 'hvac', 'elevator', 'boiler', 'pressure vessel'],
    expansions: ['mechanical engineering act', 'mechanical plans', 'equipment inspection', 'maintenance records'],
  },
  {
    triggers: ['master plumber', 'plumbing plan', 'plumbing', 'water supply', 'drainage', 'septic'],
    expansions: ['plumbing law', 'registered master plumber', 'plumbing plans', 'sanitary plumbing'],
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
    triggers: ['subdivision buyer', 'condominium buyer', 'condo buyer', 'license to sell', 'contract to sell', 'developer turnover'],
    expansions: ['subdivision and condominium buyers protective decree', 'developer obligations', 'approved plan', 'buyer remedies'],
  },
  {
    triggers: ['homeowners association', 'hoa', 'association dues', 'homeowner dues', 'subdivision association', 'common area'],
    expansions: ['magna carta for homeowners', 'homeowners association', 'bylaws', 'board election', 'association records'],
  },
  {
    triggers: ['rent control', 'tenant', 'lessor', 'lessee', 'rental increase', 'residential lease', 'eviction'],
    expansions: ['rent control act', 'residential unit', 'rental increase', 'deposit advance rent', 'tenant notices'],
  },
  {
    triggers: ['maceda', 'maceda law', 'installment buyer', 'real estate installment', 'cash surrender value', 'notice of cancellation'],
    expansions: ['realty installment buyer protection', 'grace period', 'cancellation notice', 'refund cash surrender value'],
  },
  {
    triggers: ['real estate broker', 'real estate salesperson', 'appraiser', 'real estate service', 'broker commission', 'listing agreement'],
    expansions: ['real estate service act', 'licensed broker', 'salesperson accreditation', 'professional regulation commission'],
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
