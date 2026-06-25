'use client'

import type {
  DraftCheckerRequest,
  DraftCheckerResponse,
  Finding,
  HealthResponse,
  RAGQuery,
  RAGResponse,
} from './rag-api'

import { LEGAL_CORPUS } from './local-research-data/corpus'
import { COMPLIANCE_FRAMEWORKS } from './local-research-data/compliance-frameworks'
import { TOPIC_EXPANSIONS } from './local-research-data/topic-expansions'
import { AUTHORITY_SOURCES } from './local-research-data/authority-sources'
import { EVIDENCE_ANCHORS } from './local-research-data/evidence-anchors'
import { AUTHORITY_RELATIONS } from './local-research-data/authority-relations'
import { AUTHORITY_COVERAGE } from './local-research-data/coverage-map'
import type {
  LocalAuthorityRelation,
  LocalAuthoritySource,
  LocalEvidenceAnchor,
  LocalLegalDocument,
} from './local-research-data/types'

type RankedDocument = {
  document: LocalLegalDocument
  score: number
  relevance: number
  matchedTerms: string[]
  supportingFields: DocumentFieldName[]
  supportLevel: 'direct' | 'related' | 'framework'
  directEvidenceScore: number
  directMatchCount: number
}

type DocumentFieldName =
  | 'statute'
  | 'title'
  | 'shortTitle'
  | 'aliases'
  | 'topics'
  | 'keywords'
  | 'summary'
  | 'obligations'
  | 'commonGaps'

type IndexedDocument = {
  document: LocalLegalDocument
  raNumber?: string
  tokens: string[]
  tokenCounts: Map<string, number>
  length: number
  searchableText: string
  titleText: string
  normalizedAliases: string[]
  normalizedTopics: string[]
  fieldTokens: Record<DocumentFieldName, string[]>
  fieldTokenCounts: Record<DocumentFieldName, Map<string, number>>
  fieldWeightByToken: Map<string, number>
}

type QueryAnalysis = {
  normalizedQuery: string
  directTokens: string[]
  expansionTokens: string[]
  raNumbers: string[]
}

type AuthorityRelationPath = {
  source: string
  relation_type: string
  target: string
  label: string
}

type RelatedAuthoritySummary = {
  statute: string
  title: string
  relation_type: string
  label: string
}

const LOCAL_PROVIDER_SERVICE = 'providerless-local-legal-research'
const MINIMUM_SCORE = 1.25
const BM25_K1 = 1.2
const BM25_B = 0.75
const STANDARD_RESULT_LIMIT = 6
const DEEP_RESULT_LIMIT = 12
const EXPANSION_SCORE_WEIGHT = 0.35
const EXPANSION_SCORE_CAP = 8
const WEAK_MATCH_MINIMUM_DIRECT_EVIDENCE = 0.8
const MINIMUM_DIRECT_TERM_MATCHES = 2
const RANK_CACHE_LIMIT = 100
const RANK_CACHE_MAX_QUERY_LENGTH = 1000
const LOCAL_CORPUS_LIMITATIONS = [
  'Bundled local corpus only; no live web, agency-site crawl, court-decision crawl, or embedding provider was used.',
  'Guidance records summarize official sources and should be verified against the current official text before reliance.',
]

const FIELD_WEIGHTS: Record<DocumentFieldName, number> = {
  statute: 6,
  title: 4.2,
  shortTitle: 4.5,
  aliases: 4.8,
  topics: 3.2,
  keywords: 2.25,
  summary: 1,
  obligations: 0.9,
  commonGaps: 0.65,
}

const DIRECT_QUERY_SYNONYMS = [
  {
    triggers: ['notarized', 'notarised', 'affidavit', 'affidavits'],
    terms: ['notarial', 'notarization', 'notary', 'affidavit'],
  },
  {
    triggers: ['recorded conversation', 'recorded conversations', 'phone recording', 'call recording'],
    terms: ['wiretapping', 'recording', 'conversation', 'interception'],
  },
  {
    triggers: ['scholarship', 'student aid', 'tuition assistance'],
    terms: ['tertiary education', 'student financial assistance', 'unifast', 'tuition'],
  },
  {
    triggers: ['investment offer', 'investment offers', 'investment solicitation', 'public offering'],
    terms: ['securities', 'investment contract', 'public offering', 'investor disclosure'],
  },
  {
    triggers: ['privacy law', 'privacy penalties', 'violating privacy', 'data protection penalties'],
    terms: ['data privacy act', 'personal information', 'data subject', 'privacy violation'],
  },
  {
    triggers: ['cctv', 'camera surveillance', 'video surveillance', 'surveillance camera'],
    terms: ['data privacy', 'surveillance', 'personal information', 'privacy notice'],
  },
  {
    triggers: ['barangay require', 'city require', 'municipal require', 'barangay ordinance', 'city ordinance'],
    terms: ['local government code', 'ordinance', 'barangay', 'lgu authority'],
  },
]

const STOP_WORDS = new Set([
  'a',
  'about',
  'also',
  'all',
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
  'homes',
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
  'requirement',
  'requirements',
  'republic',
  'rule',
  'rules',
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
  const tokens = normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token))

  return unique(tokens.flatMap((token) => {
    if (token.length > 4 && token.endsWith('s') && !token.endsWith('ss')) {
      const singular = token.slice(0, -1)
      return STOP_WORDS.has(singular) ? [token] : [token, singular]
    }

    return [token]
  }))
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

function includesNormalizedTrigger(normalizedText: string, normalizedTrigger: string) {
  if (normalizedTrigger.includes(' ')) {
    return normalizedText.includes(normalizedTrigger)
  }

  return normalizedText.split(' ').includes(normalizedTrigger)
}

function extractRaNumbers(value: string) {
  const matches = value.matchAll(
    /\b(?:r\.?\s*a\.?|republic\s+act)(?:\s+(?:no|number)\.?)?\s*(\d{3,6})\b/gi
  )
  return unique([...matches].map((match) => match[1]))
}

function getDocumentRaNumber(document: LocalLegalDocument) {
  return extractRaNumbers(document.statute)[0]
}

function getDocumentByRaNumber(raNumber: string) {
  return DOCUMENT_BY_RA_NUMBER.get(raNumber)
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

function getCitationMatchedTermsForAnalysis(analysis: QueryAnalysis, entry: IndexedDocument) {
  if (!entry.raNumber || !analysis.raNumbers.includes(entry.raNumber)) {
    return []
  }

  return [`explicit citation: ${entry.document.statute}`]
}

function createSearchableText(document: LocalLegalDocument) {
  return Object.values(createDocumentFieldText(document)).join(' ')
}

function createDocumentFieldText(document: LocalLegalDocument): Record<DocumentFieldName, string> {
  return {
    statute: normalizeText(document.statute),
    title: normalizeText(document.title),
    shortTitle: normalizeText(document.shortTitle),
    aliases: normalizeText(document.aliases.join(' ')),
    topics: normalizeText(document.topics.join(' ')),
    keywords: normalizeText(document.keywords.join(' ')),
    summary: normalizeText(document.summary),
    obligations: normalizeText(document.obligations.join(' ')),
    commonGaps: normalizeText(document.commonGaps.join(' ')),
  }
}

function countTokens(tokens: string[]) {
  const counts = new Map<string, number>()

  for (const token of tokens) {
    counts.set(token, (counts.get(token) || 0) + 1)
  }

  return counts
}

function createFieldWeightByToken(fieldTokenCounts: Record<DocumentFieldName, Map<string, number>>) {
  const weights = new Map<string, number>()

  for (const field of Object.keys(FIELD_WEIGHTS) as DocumentFieldName[]) {
    for (const token of fieldTokenCounts[field].keys()) {
      weights.set(token, (weights.get(token) || 0) + FIELD_WEIGHTS[field])
    }
  }

  return weights
}

const INDEXED_CORPUS: IndexedDocument[] = LEGAL_CORPUS.map((document) => {
  const searchableText = createSearchableText(document)
  const tokens = tokenize(searchableText)
  const fieldTokens = Object.fromEntries(
    Object.entries(createDocumentFieldText(document)).map(([field, text]) => [field, tokenize(text)])
  ) as Record<DocumentFieldName, string[]>
  const fieldTokenCounts = Object.fromEntries(
    Object.entries(fieldTokens).map(([field, fieldTokenValues]) => [field, countTokens(fieldTokenValues)])
  ) as Record<DocumentFieldName, Map<string, number>>

  return {
    document,
    raNumber: getDocumentRaNumber(document),
    tokens,
    tokenCounts: countTokens(tokens),
    length: tokens.length,
    searchableText,
    titleText: normalizeText(`${document.statute} ${document.shortTitle} ${document.title}`),
    normalizedAliases: document.aliases.map((alias) => normalizeText(alias)).filter((alias) => alias.length > 2),
    normalizedTopics: document.topics.map((topic) => normalizeText(topic)).filter((topic) => topic.length > 3),
    fieldTokens,
    fieldTokenCounts,
    fieldWeightByToken: createFieldWeightByToken(fieldTokenCounts),
  }
})

const AVERAGE_DOCUMENT_LENGTH =
  INDEXED_CORPUS.reduce((total, entry) => total + entry.length, 0) / INDEXED_CORPUS.length

const DOCUMENT_BY_ID = new Map(LEGAL_CORPUS.map((document) => [document.id, document]))
const DOCUMENT_BY_RA_NUMBER = new Map(
  INDEXED_CORPUS.flatMap((entry) => (entry.raNumber ? [[entry.raNumber, entry.document] as const] : []))
)
const INDEXED_DOCUMENT_BY_ID = new Map(INDEXED_CORPUS.map((entry) => [entry.document.id, entry]))
const TOKEN_DOCUMENT_INDEX = INDEXED_CORPUS.reduce((index, entry) => {
  for (const token of entry.tokenCounts.keys()) {
    const entries = index.get(token) || []
    entries.push(entry)
    index.set(token, entries)
  }

  return index
}, new Map<string, IndexedDocument[]>())
const DOCUMENT_FREQUENCY_BY_TOKEN = new Map(
  [...TOKEN_DOCUMENT_INDEX.entries()].map(([token, entries]) => [token, entries.length])
)
const IDF_BY_TOKEN = new Map(
  [...DOCUMENT_FREQUENCY_BY_TOKEN.entries()].map(([token, frequency]) => [
    token,
    Math.log(1 + (INDEXED_CORPUS.length - frequency + 0.5) / (frequency + 0.5)),
  ])
)
const NORMALIZED_DIRECT_QUERY_SYNONYMS = DIRECT_QUERY_SYNONYMS.map((synonym) => ({
  triggers: synonym.triggers.map((trigger) => normalizeText(trigger)),
  terms: synonym.terms.flatMap((term) => tokenize(term)),
}))
const NORMALIZED_TOPIC_EXPANSIONS = TOPIC_EXPANSIONS.map((expansion) => ({
  triggers: expansion.triggers.map((trigger) => normalizeText(trigger)),
  expansions: expansion.expansions,
  expansionTokens: expansion.expansions.flatMap((value) => tokenize(value)),
}))
const NORMALIZED_COMPLIANCE_FRAMEWORKS = COMPLIANCE_FRAMEWORKS.map((framework) => ({
  framework,
  triggers: framework.triggers.map((trigger) => normalizeText(trigger)),
}))
const RANK_CACHE = new Map<string, RankedDocument[]>()
const AUTHORITY_SOURCE_BY_ID = new Map(AUTHORITY_SOURCES.map((source) => [source.authorityId, source]))
const EVIDENCE_ANCHORS_BY_AUTHORITY_ID = EVIDENCE_ANCHORS.reduce((index, anchor) => {
  const anchors = index.get(anchor.authorityId) || []
  anchors.push(anchor)
  index.set(anchor.authorityId, anchors)
  return index
}, new Map<string, LocalEvidenceAnchor[]>())
const AUTHORITY_COVERAGE_BY_ID = new Map(AUTHORITY_COVERAGE.map((coverage) => [coverage.authorityId, coverage]))
const AUTHORITY_RELATIONS_BY_SOURCE_ID = AUTHORITY_RELATIONS.reduce((index, relation) => {
  const relations = index.get(relation.sourceId) || []
  relations.push(relation)
  index.set(relation.sourceId, relations)
  return index
}, new Map<string, LocalAuthorityRelation[]>())
const AUTHORITY_RELATIONS_BY_TARGET_ID = AUTHORITY_RELATIONS.reduce((index, relation) => {
  const relations = index.get(relation.targetId) || []
  relations.push(relation)
  index.set(relation.targetId, relations)
  return index
}, new Map<string, LocalAuthorityRelation[]>())

function analyzeQuery(query: string): QueryAnalysis {
  const baseTokens = tokenize(query)
  const normalizedQuery = normalizeText(query)
  const synonymTokens = NORMALIZED_DIRECT_QUERY_SYNONYMS.flatMap((synonym) => {
    const matchesTrigger = synonym.triggers.some((trigger) => includesNormalizedTrigger(normalizedQuery, trigger))
    return matchesTrigger ? synonym.terms : []
  })
  const expansionTokens = NORMALIZED_TOPIC_EXPANSIONS.flatMap((expansion) => {
    const matchesTrigger = expansion.triggers.some((trigger) => includesNormalizedTrigger(normalizedQuery, trigger))
    return matchesTrigger ? expansion.expansionTokens : []
  })
  const directTokens = unique([...baseTokens, ...synonymTokens])

  return {
    normalizedQuery,
    directTokens,
    expansionTokens: unique(expansionTokens).filter((token) => !directTokens.includes(token)),
    raNumbers: extractRaNumbers(query),
  }
}

function getIdf(token: string) {
  return IDF_BY_TOKEN.get(token) || Math.log(1 + (INDEXED_CORPUS.length + 0.5) / 0.5)
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

function getFieldWeightedScore(token: string, entry: IndexedDocument) {
  return getBm25Score(token, entry) * (entry.fieldWeightByToken.get(token) || 0)
}

function phraseScore(analysis: QueryAnalysis, entry: IndexedDocument) {
  let score = 0

  for (const raNumber of analysis.raNumbers) {
    if (entry.raNumber === raNumber || entry.titleText.includes(raNumber)) {
      score += 16
    }
  }

  for (const normalizedAlias of entry.normalizedAliases) {
    if (analysis.normalizedQuery.includes(normalizedAlias)) {
      score += 9
    }
  }

  for (const normalizedTopic of entry.normalizedTopics) {
    if (analysis.normalizedQuery.includes(normalizedTopic)) {
      score += 3.5
    }
  }

  return score
}

function getMatchedFields(tokens: string[], entry: IndexedDocument) {
  const fields: DocumentFieldName[] = []

  for (const field of Object.keys(FIELD_WEIGHTS) as DocumentFieldName[]) {
    if (tokens.some((token) => entry.fieldTokenCounts[field].has(token))) {
      fields.push(field)
    }
  }

  return fields
}

function getCandidateDocuments(analysis: QueryAnalysis) {
  const candidateEntries = new Map<string, IndexedDocument>()

  for (const token of unique([...analysis.directTokens, ...analysis.expansionTokens])) {
    for (const entry of TOKEN_DOCUMENT_INDEX.get(token) || []) {
      candidateEntries.set(entry.document.id, entry)
    }
  }

  for (const raNumber of analysis.raNumbers) {
    const document = getDocumentByRaNumber(raNumber)
    const entry = document ? INDEXED_DOCUMENT_BY_ID.get(document.id) : undefined

    if (entry) {
      candidateEntries.set(entry.document.id, entry)
    }
  }

  for (const entry of INDEXED_CORPUS) {
    if (
      entry.normalizedAliases.some((alias) => analysis.normalizedQuery.includes(alias)) ||
      entry.normalizedTopics.some((topic) => analysis.normalizedQuery.includes(topic))
    ) {
      candidateEntries.set(entry.document.id, entry)
    }
  }

  return [...candidateEntries.values()]
}

function getRankCacheKey(query: string) {
  const normalizedQuery = normalizeText(query)

  if (!normalizedQuery || normalizedQuery.length > RANK_CACHE_MAX_QUERY_LENGTH) {
    return null
  }

  return normalizedQuery
}

function getCachedRankedDocuments(cacheKey: string) {
  const cached = RANK_CACHE.get(cacheKey)

  if (!cached) {
    return null
  }

  RANK_CACHE.delete(cacheKey)
  RANK_CACHE.set(cacheKey, cached)
  return cached
}

function setCachedRankedDocuments(cacheKey: string | null, rankedDocuments: RankedDocument[]) {
  if (!cacheKey) {
    return
  }

  RANK_CACHE.set(cacheKey, rankedDocuments)

  while (RANK_CACHE.size > RANK_CACHE_LIMIT) {
    const oldestKey = RANK_CACHE.keys().next().value

    if (!oldestKey) {
      break
    }

    RANK_CACHE.delete(oldestKey)
  }
}

function rankLegalCorpus(query: string): RankedDocument[] {
  const cacheKey = getRankCacheKey(query)
  const cachedDocuments = cacheKey ? getCachedRankedDocuments(cacheKey) : null

  if (cachedDocuments) {
    return cachedDocuments
  }

  const analysis = analyzeQuery(query)
  const queryTokens = unique([...analysis.directTokens, ...analysis.expansionTokens])

  if (queryTokens.length === 0) {
    return []
  }

  const candidateDocuments = getCandidateDocuments(analysis)
  const scoringDocuments = candidateDocuments.length > 0 ? candidateDocuments : INDEXED_CORPUS
  const rawScores = scoringDocuments.map((entry) => {
    const directMatchedTerms = analysis.directTokens.filter((token) => entry.tokenCounts.has(token))
    const expansionMatchedTerms = analysis.expansionTokens.filter((token) => entry.tokenCounts.has(token))
    const citationMatchedTerms = getCitationMatchedTermsForAnalysis(analysis, entry)
    const directSupportingFields = getMatchedFields(analysis.directTokens, entry)
    const expansionSupportingFields = getMatchedFields(analysis.expansionTokens, entry)
    const matchedTerms = unique([
      ...citationMatchedTerms,
      ...directMatchedTerms,
      ...expansionMatchedTerms.map((token) => `related: ${token}`),
    ])
    const directFieldScore = analysis.directTokens.reduce(
      (score, token) => score + getFieldWeightedScore(token, entry),
      0
    )
    const expansionFieldScore = Math.min(
      EXPANSION_SCORE_CAP,
      analysis.expansionTokens.reduce((score, token) => score + getFieldWeightedScore(token, entry), 0) *
        EXPANSION_SCORE_WEIGHT
    )
    const titleBoost = directMatchedTerms.reduce((score, token) => {
      return entry.titleText.includes(token) ? score + 1.75 : score
    }, 0)
    const exactPhraseScore = phraseScore(analysis, entry)
    const citationEvidence = citationMatchedTerms.length > 0 ? 16 : 0
    const directEvidenceScore = directFieldScore + exactPhraseScore + citationEvidence
    const score = directFieldScore + expansionFieldScore + titleBoost + exactPhraseScore
    const supportLevel: RankedDocument['supportLevel'] = citationEvidence > 0 || directMatchedTerms.length >= MINIMUM_DIRECT_TERM_MATCHES || exactPhraseScore >= 3
      ? 'direct'
      : 'related'

    return {
      document: entry.document,
      matchedTerms,
      supportingFields: unique([...directSupportingFields, ...expansionSupportingFields]),
      supportLevel,
      score,
      exactPhraseScore,
      directEvidenceScore,
      directMatchCount: directMatchedTerms.length,
    }
  })

  const maxScore = Math.max(...rawScores.map((result) => result.score), 1)

  const rankedDocuments = rawScores
    .filter((result) => (
      result.score >= MINIMUM_SCORE &&
      result.directEvidenceScore >= WEAK_MATCH_MINIMUM_DIRECT_EVIDENCE &&
      (
        result.matchedTerms.some((term) => term.startsWith('explicit citation:')) ||
        result.directMatchCount >= MINIMUM_DIRECT_TERM_MATCHES ||
        result.exactPhraseScore >= 3
      )
    ))
    .map((result) => ({
      ...result,
      relevance: Math.min(0.98, Math.max(0.1, result.score / (maxScore + 2))),
    }))
    .sort((left, right) => right.score - left.score)

  setCachedRankedDocuments(cacheKey, rankedDocuments)

  return rankedDocuments
}

function generateLocalSearchQueries(query: string, rankedDocuments: RankedDocument[]) {
  const normalizedQuery = normalizeText(query)
  const expansions = NORMALIZED_TOPIC_EXPANSIONS.flatMap((expansion) => {
    const matchesTrigger = expansion.triggers.some((trigger) => includesNormalizedTrigger(normalizedQuery, trigger))
    return matchesTrigger ? expansion.expansions : []
  })
  const raQueries = extractRaNumbers(query).map((number) => `RA ${number}`)
  const documentQueries = rankedDocuments.slice(0, 3).map((match) => `${match.document.statute} ${match.document.shortTitle}`)

  return uniqueByNormalized([query.trim(), ...raQueries, ...expansions, ...documentQueries]).slice(0, 10)
}

function getDocumentById(id: string) {
  return DOCUMENT_BY_ID.get(id)
}

function getAuthoritySource(document: LocalLegalDocument): LocalAuthoritySource {
  return AUTHORITY_SOURCE_BY_ID.get(document.id) || {
    authorityId: document.id,
    sourceName: document.sourceName,
    sourceUrl: document.sourceUrl,
    authorityType: getAuthorityType(document),
    sourceTier: getSourceTier(document),
    lastVerified: document.lastVerified || 'unverified',
    provenanceStatus: 'needs-review',
    catalogTags: [getAuthorityType(document), getSourceTier(document)],
    provenanceNotes: 'No canonical source registry record was found for this authority.',
  }
}

function getEvidenceAnchors(document: LocalLegalDocument) {
  return EVIDENCE_ANCHORS_BY_AUTHORITY_ID.get(document.id) || []
}

function getAuthorityCoverage(document: LocalLegalDocument) {
  return AUTHORITY_COVERAGE_BY_ID.get(document.id)
}

function getRelationsForAuthority(authorityId: string) {
  return [
    ...(AUTHORITY_RELATIONS_BY_SOURCE_ID.get(authorityId) || []),
    ...(AUTHORITY_RELATIONS_BY_TARGET_ID.get(authorityId) || []),
  ].sort((left, right) => right.weight - left.weight)
}

function getRelatedAuthoritySummaries(document: LocalLegalDocument, limit = 4): RelatedAuthoritySummary[] {
  const seen = new Set<string>()
  const relatedAuthorities: RelatedAuthoritySummary[] = []

  for (const relation of getRelationsForAuthority(document.id)) {
    const relatedId = relation.sourceId === document.id ? relation.targetId : relation.sourceId
    const relatedDocument = getDocumentById(relatedId)

    if (!relatedDocument || seen.has(relatedDocument.id)) {
      continue
    }

    seen.add(relatedDocument.id)
    relatedAuthorities.push({
      statute: relatedDocument.statute,
      title: relatedDocument.shortTitle,
      relation_type: relation.type,
      label: relation.label,
    })

    if (relatedAuthorities.length >= limit) {
      break
    }
  }

  return relatedAuthorities
}

function formatRelationPath(relation: LocalAuthorityRelation): AuthorityRelationPath | null {
  const sourceDocument = getDocumentById(relation.sourceId)
  const targetDocument = getDocumentById(relation.targetId)

  if (!sourceDocument || !targetDocument) {
    return null
  }

  return {
    source: sourceDocument.statute,
    relation_type: relation.type,
    target: targetDocument.statute,
    label: relation.label,
  }
}

function getRelationPathsForMatches(matches: RankedDocument[], limit = 8): AuthorityRelationPath[] {
  const matchedDocumentIds = new Set(matches.map((match) => match.document.id))
  const seen = new Set<string>()
  const paths: AuthorityRelationPath[] = []

  for (const match of matches) {
    for (const relation of getRelationsForAuthority(match.document.id)) {
      const relatedId = relation.sourceId === match.document.id ? relation.targetId : relation.sourceId

      if (!matchedDocumentIds.has(relatedId)) {
        continue
      }

      const path = formatRelationPath(relation)

      if (!path) {
        continue
      }

      const key = `${path.source}:${path.relation_type}:${path.target}:${path.label}`

      if (seen.has(key)) {
        continue
      }

      seen.add(key)
      paths.push(path)

      if (paths.length >= limit) {
        return paths
      }
    }
  }

  return paths
}

function getFrameworkMatches(query: string, rankedDocuments: RankedDocument[]) {
  const normalizedQuery = normalizeText(query)
  const rankedDocumentIds = rankedDocuments.slice(0, 12).map((match) => match.document.id)
  const citedDocumentIds = getCitationAnalysis(query).citedDocuments.map((document) => document.id)

  return NORMALIZED_COMPLIANCE_FRAMEWORKS.map(({ framework, triggers }) => {
    const triggerMatches = triggers.filter((trigger) => includesNormalizedTrigger(normalizedQuery, trigger))
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
    .filter((match) => (
      match.score >= 2 &&
      (
        match.triggerMatches.length > 0 ||
        match.citationMatches.length > 0 ||
        match.rankedMatches.length >= 2
      )
    ))
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
}

function addFrameworkDocumentsForDeepSearch(query: string, rankedDocuments: RankedDocument[]) {
  const existingDocumentIds = new Set(rankedDocuments.map((match) => match.document.id))
  const frameworkMatches = getFrameworkMatches(query, rankedDocuments)
  const frameworkDocuments = frameworkMatches.flatMap((match) => (
    match.framework.lawIds
      .map((lawId) => getDocumentById(lawId))
      .filter((document): document is LocalLegalDocument => {
        if (!document) {
          return false
        }

        return !existingDocumentIds.has(document.id)
      })
      .map((document) => {
        existingDocumentIds.add(document.id)

        return {
          document,
          score: Math.max(MINIMUM_SCORE + match.score * 1.5, rankedDocuments[0]?.score ? rankedDocuments[0].score * 0.45 : 2),
          relevance: 0.42,
          matchedTerms: unique([
            ...match.triggerMatches,
            `framework: ${match.framework.title}`,
          ]),
          supportingFields: [],
          supportLevel: 'framework' as const,
          directEvidenceScore: WEAK_MATCH_MINIMUM_DIRECT_EVIDENCE,
          directMatchCount: MINIMUM_DIRECT_TERM_MATCHES,
        }
      })
  ))

  if (frameworkDocuments.length === 0) {
    return rankedDocuments
  }

  const combinedDocuments = [...rankedDocuments, ...frameworkDocuments]
  const maxScore = Math.max(...combinedDocuments.map((result) => result.score), 1)

  return combinedDocuments
    .map((result) => ({
      ...result,
      relevance: Math.min(0.98, Math.max(result.relevance, result.score / (maxScore + 2))),
    }))
    .sort((left, right) => right.score - left.score)
}

function addRelationDocumentsForDeepSearch(rankedDocuments: RankedDocument[]) {
  if (rankedDocuments.length === 0) {
    return rankedDocuments
  }

  const existingDocumentIds = new Set(rankedDocuments.map((match) => match.document.id))
  const topScore = rankedDocuments[0]?.score || MINIMUM_SCORE
  const relationDocuments: RankedDocument[] = []

  for (const match of rankedDocuments.slice(0, 6)) {
    for (const relation of getRelationsForAuthority(match.document.id)) {
      const relatedId = relation.sourceId === match.document.id ? relation.targetId : relation.sourceId
      const relatedDocument = getDocumentById(relatedId)

      if (!relatedDocument || existingDocumentIds.has(relatedDocument.id)) {
        continue
      }

      existingDocumentIds.add(relatedDocument.id)
      relationDocuments.push({
        document: relatedDocument,
        score: Math.max(MINIMUM_SCORE + relation.weight, topScore * 0.32),
        relevance: 0.34,
        matchedTerms: unique([`relation: ${relation.type}`, relation.label]),
        supportingFields: [],
        supportLevel: 'related',
        directEvidenceScore: WEAK_MATCH_MINIMUM_DIRECT_EVIDENCE,
        directMatchCount: MINIMUM_DIRECT_TERM_MATCHES,
      })

      if (relationDocuments.length >= 6) {
        break
      }
    }

    if (relationDocuments.length >= 6) {
      break
    }
  }

  if (relationDocuments.length === 0) {
    return rankedDocuments
  }

  return [...rankedDocuments, ...relationDocuments]
}

function prioritizeFrameworkDocuments(query: string, rankedDocuments: RankedDocument[]) {
  const frameworkDocumentIds = new Set(
    getFrameworkMatches(query, rankedDocuments).flatMap((match) => match.framework.lawIds)
  )

  if (frameworkDocumentIds.size === 0) {
    return rankedDocuments
  }

  return [
    ...rankedDocuments.filter((match) => frameworkDocumentIds.has(match.document.id)),
    ...rankedDocuments.filter((match) => !frameworkDocumentIds.has(match.document.id)),
  ]
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

function getAuthorityType(document: LocalLegalDocument) {
  return document.authorityType || 'statute'
}

function getSourceTier(document: LocalLegalDocument) {
  return document.sourceTier || 'official-primary'
}

function getSourceTypeCounts(matches: RankedDocument[]) {
  return matches.reduce<Record<string, number>>((counts, match) => {
    const authorityType = getAuthoritySource(match.document).authorityType
    counts[authorityType] = (counts[authorityType] || 0) + 1
    return counts
  }, {})
}

function getProvenanceCoverage(matches: RankedDocument[]) {
  return matches.reduce<Record<string, number>>((counts, match) => {
    const source = getAuthoritySource(match.document)
    counts[source.provenanceStatus] = (counts[source.provenanceStatus] || 0) + 1
    return counts
  }, {})
}

function getCoverageWarnings(matches: RankedDocument[], unknownCitationNumbers: string[]) {
  const warnings = new Set<string>()

  for (const unknownCitationNumber of unknownCitationNumbers) {
    warnings.add(`RA ${unknownCitationNumber} is not in the bundled local corpus; verify it against current official sources.`)
  }

  for (const match of matches.slice(0, 6)) {
    const source = getAuthoritySource(match.document)
    const coverage = getAuthorityCoverage(match.document)

    if (source.provenanceStatus !== 'verified') {
      warnings.add(`${match.document.statute} is ${source.provenanceStatus} in the local provenance registry.`)
    }

    if (!coverage) {
      warnings.add(`${match.document.statute} has no local coverage record.`)
      continue
    }

    if (coverage.coverageStatus === 'seeded') {
      warnings.add(`${match.document.statute} is seeded coverage; add a direct golden query before treating it as a primary authority.`)
    }
  }

  return [...warnings].slice(0, 6)
}

function formatSupportLevel(value: RankedDocument['supportLevel']) {
  if (value === 'direct') {
    return 'direct support'
  }

  if (value === 'framework') {
    return 'framework-related support'
  }

  return 'related support'
}

function buildSourceSupportSection(rankedDocuments: RankedDocument[]) {
  const topMatches = rankedDocuments.slice(0, 5)

  if (topMatches.length === 0) {
    return []
  }

  return [
    '## Source Support',
    '',
    ...topMatches.map((match) => {
      const source = getAuthoritySource(match.document)
      return `- ${match.document.statute} (${match.document.shortTitle}) - ${formatSupportLevel(match.supportLevel)} from ${source.sourceTier} source.`
    }),
    '',
  ]
}

function buildProvenanceVerificationSection(rankedDocuments: RankedDocument[]) {
  const topMatches = rankedDocuments.slice(0, 5)

  if (topMatches.length === 0) {
    return []
  }

  return [
    '## Provenance & Verification',
    '',
    ...topMatches.map((match) => {
      const source = getAuthoritySource(match.document)
      const coverage = getAuthorityCoverage(match.document)
      const evidenceLabels = getEvidenceAnchors(match.document)
        .slice(0, 2)
        .map((anchor) => anchor.label)
        .join('; ')
      const coverageLabel = coverage?.coverageStatus || 'missing coverage'

      const verificationLabel = source.provenanceStatus === 'verified' ? 'verified' : 'cataloged'

      return `- ${match.document.statute}: ${source.sourceTier}, ${source.provenanceStatus}, ${verificationLabel} ${source.lastVerified}; coverage ${coverageLabel}; anchors: ${evidenceLabels || 'none'}.`
    }),
    '',
  ]
}

function buildRelatedAuthorityPathSection(query: string, rankedDocuments: RankedDocument[], deepSearchUsed?: boolean) {
  if (!deepSearchUsed) {
    return []
  }

  const frameworkMatches = getFrameworkMatches(query, rankedDocuments)
  const relationPaths = getRelationPathsForMatches(rankedDocuments.slice(0, 10), 8)

  if (frameworkMatches.length === 0 && relationPaths.length === 0) {
    return []
  }

  return [
    '## Related Authority Path',
    '',
    ...frameworkMatches.map((match) => {
      const laws = match.framework.lawIds
        .map((lawId) => getDocumentById(lawId))
        .filter((document): document is LocalLegalDocument => Boolean(document))
        .slice(0, 6)
        .map((document) => document.statute)

      return `- ${match.framework.title}: ${laws.join(' -> ')}`
    }),
    ...relationPaths.map((path) => (
      `- ${path.source} ${path.relation_type.replace(/_/g, ' ')} ${path.target}: ${path.label}`
    )),
    '',
  ]
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
  return Number(((Date.now() - startedAt) / 1000).toFixed(3))
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
    '- Include a Republic Act number, such as RA 10173, RA 10175, RA 9775, RA 9160, RA 9003, RA 11898, RA 11127, RA 10168, RA 11479, RA 8479, RA 11592, RA 9367, RA 7638, RA 10667, RA 11765, RA 11934, or RA 11976.',
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
    ...buildSourceSupportSection(topMatches),
    ...buildProvenanceVerificationSection(topMatches),
    ...buildRelatedAuthorityPathSection(query, rankedDocuments, deepSearchUsed),
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
  const frameworkExpandedDocuments = params.use_deep_search
    ? addFrameworkDocumentsForDeepSearch(query, rankedDocuments)
    : rankedDocuments
  const researchDocuments = params.use_deep_search
    ? addRelationDocumentsForDeepSearch(frameworkExpandedDocuments)
    : frameworkExpandedDocuments
  const resultDocuments = params.use_deep_search
    ? prioritizeFrameworkDocuments(query, researchDocuments)
    : researchDocuments
  const searchQueries = generateLocalSearchQueries(query, resultDocuments)
  const resultLimit = params.use_deep_search ? DEEP_RESULT_LIMIT : STANDARD_RESULT_LIMIT
  const matchedDocuments = resultDocuments.slice(0, resultLimit)
  const topRelevance = matchedDocuments[0]?.relevance || 0
  const citationAnalysis = getCitationAnalysis(query)
  const relationPaths = getRelationPathsForMatches(matchedDocuments)
  const retrievalMetadata = {
    result_limit: resultLimit,
    total_candidates: researchDocuments.length,
    top_score: matchedDocuments[0]?.score || 0,
    score_threshold: MINIMUM_SCORE,
    citation_numbers: citationAnalysis.raNumbers,
    known_citation_numbers: citationAnalysis.knownNumbers,
    unknown_citation_numbers: citationAnalysis.unknownNumbers,
    source_type_counts: getSourceTypeCounts(matchedDocuments),
    provenance_coverage: getProvenanceCoverage(matchedDocuments),
    relation_paths: relationPaths,
    coverage_warnings: getCoverageWarnings(matchedDocuments, citationAnalysis.unknownNumbers),
    local_corpus_limitations: LOCAL_CORPUS_LIMITATIONS,
    processing_ms: Date.now() - startedAt,
  }

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
      retrieval_metadata: retrievalMetadata,
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
      retrieval_metadata: retrievalMetadata,
      matched_documents: [],
    }
  }

  return {
    status: 'completed',
    query,
    summary: buildResearchSummary(query, resultDocuments, params.use_deep_search, fallbackReason),
    search_queries_used: searchQueries,
    documents_found: matchedDocuments.length,
    processing_stages: getProcessingStages(params.use_deep_search),
    deep_search_used: Boolean(params.use_deep_search),
    processing_time_seconds: formatSeconds(startedAt),
    provider_mode: 'local-providerless',
    fallback_used: Boolean(fallbackReason),
    fallback_reason: fallbackReason,
    confidence_score: topRelevance,
    retrieval_metadata: retrievalMetadata,
    matched_documents: matchedDocuments.map((match) => {
      const source = getAuthoritySource(match.document)

      return {
        title: `${match.document.statute} - ${match.document.shortTitle}`,
        statute: match.document.statute,
        source_name: source.sourceName,
        source_url: source.sourceUrl,
        relevance_score: match.relevance,
        matched_terms: match.matchedTerms.slice(0, 10),
        support_level: match.supportLevel,
        authority_type: source.authorityType,
        source_tier: source.sourceTier,
        source_last_verified: source.lastVerified,
        provenance_status: source.provenanceStatus,
        evidence_anchors: getEvidenceAnchors(match.document).slice(0, 3).map((anchor) => ({
          label: anchor.label,
          supports: anchor.supports,
          note: anchor.note,
        })),
        related_authorities: getRelatedAuthoritySummaries(match.document, 4),
        supporting_fields: match.supportingFields,
      }
    }),
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

  if (/\b(electronic|digital|online|signature|record|filing|portal|e-governance|egovernance|government portal|online government service|digital public service|government data exchange|interoperability|dict|ict system)\b/.test(normalizedDraft)) {
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

  if (
    /\b(extended producer responsibility|epr|plastic packaging|packaging footprint|obliged enterprise|producer responsibility|recovery target|take back|takeback|waste recovery)\b/.test(
      normalizedDraft
    )
  ) {
    const hasEprScope = /\b(obliged enterprise|producer|brand owner|plastic packaging|packaging footprint|covered product|epr program)\b/.test(
      normalizedDraft
    )
    const hasEprRecoveryControls = /\b(recovery target|diversion target|recycling target|take back|takeback|collection partner|waste diversion|recovery program)\b/.test(
      normalizedDraft
    )
    const hasEprEvidenceControls = /\b(report|denr|audit|third party audit|verification|certificate|records|traceability|greenwashing)\b/.test(
      normalizedDraft
    )

    if (!(hasEprScope && hasEprRecoveryControls && hasEprEvidenceControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'EPR packaging controls need more detail',
          'Extended-producer-responsibility or plastic-packaging language was detected without enough covered-enterprise scope, recovery targets, verification, or DENR-facing reporting controls.',
          'Add obliged-enterprise scope, plastic-packaging footprint, EPR program owner, recovery or diversion target, collection or recycler partner controls, third-party audit or verification evidence, DENR reporting, and greenwashing safeguards.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11898') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9003') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(e-governance|egovernance|government portal|online government service|digital public service|government data exchange|interoperability|dict|ict system|public ict|digital permit|digital benefit)\b/.test(normalizedDraft)) {
    const hasDigitalServiceOwner = /\b(service owner|system owner|data owner|responsible office|ict office|administrator|dict)\b/.test(normalizedDraft)
    const hasDigitalAccessControls = /\b(authentication|access control|audit log|audit trail|interoperability|data sharing|lawful basis|privacy notice|consent)\b/.test(normalizedDraft)
    const hasDigitalContinuity = /\b(accessibility|helpdesk|fallback|offline|continuity|uptime|incident|breach|retention)\b/.test(normalizedDraft)

    if (!(hasDigitalServiceOwner && hasDigitalAccessControls && hasDigitalContinuity)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Digital government service controls need detail',
          'Digital government, e-governance, public ICT, portal, interoperability, or government data-exchange language was detected without enough service ownership, access, continuity, accessibility, privacy, or incident controls.',
          'Add service owner, system owner, data owner, authentication, audit logs, data-sharing authority, accessibility, helpdesk or offline fallback, retention, incident escalation, and continuity safeguards.',
          6,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-12254') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10844') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10173') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(public-private partnership|public private partnership|ppp|concession|unsolicited proposal|viability gap|infrastructure project|joint venture)\b/.test(normalizedDraft)) {
    const hasPppApproval = /\b(approval|approving body|implementing agency|project scope|project proponent|ppp center|board|sanggunian)\b/.test(normalizedDraft)
    const hasPppSelection = /\b(procurement|competitive challenge|unsolicited proposal|selection|value for money|conflict|disclosure|eligibility)\b/.test(normalizedDraft)
    const hasPppContract = /\b(risk allocation|performance standard|performance monitoring|contract management|audit|user fee|availability payment|fiscal exposure|public consultation)\b/.test(normalizedDraft)

    if (!(hasPppApproval && hasPppSelection && hasPppContract)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'PPP project controls need detail',
          'PPP, concession, infrastructure partnership, joint venture, or unsolicited-proposal language was detected without enough approval, value-for-money, selection, risk-allocation, contract-monitoring, or public-accountability controls.',
          'Add implementing agency, approving body, project scope, selection or competitive-challenge route, value-for-money review, conflict checks, risk allocation, performance standards, fiscal exposure, public consultation, audit trail, and contract-management owner.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11966') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-12009') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7160') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(barangay complaint|barangay dispute|barangay conciliation|katarungang pambarangay|lupon|pangkat|amicable settlement|certificate to file action|barangay blotter|neighborhood dispute)\b/.test(normalizedDraft)) {
    const hasBarangayCoverage = /\b(venue|covered dispute|exception|excluded case|party|resident|same city|same municipality|jurisdiction)\b/.test(normalizedDraft)
    const hasBarangayProcess = /\b(lupon|pangkat|summons|notice|appearance|conciliation|mediation|settlement|certificate to file action|non settlement)\b/.test(normalizedDraft)
    const hasBarangaySafeguards = /\b(referral|police|prosecutor|court|dswd|women and children|child protection|privacy|confidential|record|retention)\b/.test(normalizedDraft)

    if (!(hasBarangayCoverage && hasBarangayProcess && hasBarangaySafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Barangay complaint routing needs lupon and referral controls',
          'Barangay complaint, dispute, conciliation, lupon, pangkat, blotter, settlement, or certificate-to-file-action language was detected without enough coverage, exception, notice, settlement, referral, privacy, or record controls.',
          'Add covered and excluded dispute types, venue and party rules, lupon or pangkat process, notice and appearance steps, settlement or non-settlement records, certificate-to-file-action handling, urgent referral paths, privacy, retention, and authorized disclosure rules.',
          6,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7160') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9285') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10173') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(civil service|civil service commission|csc|government employee|public employee|personnel action|administrative case|administrative discipline|preventive suspension|formal charge|appointing authority|service record|reassignment|promotion|detail)\b/.test(normalizedDraft)) {
    const hasPersonnelAuthority = /\b(appointing authority|civil service|csc|qualification|eligibility|position|plantilla|legal basis|delegated authority)\b/.test(normalizedDraft)
    const hasPersonnelDueProcess = /\b(complaint|notice|formal charge|answer|hearing|written decision|appeal|reconsideration|review)\b/.test(normalizedDraft)
    const hasPersonnelRecords = /\b(service record|personnel file|appointment paper|record|retention|confidential|privacy|authorized disclosure|redaction)\b/.test(normalizedDraft)

    if (!(hasPersonnelAuthority && hasPersonnelDueProcess && hasPersonnelRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Civil-service personnel controls need detail',
          'Civil-service, government-employee, personnel-action, appointment, promotion, reassignment, service-record, administrative-case, formal-charge, or preventive-suspension language was detected without enough authority, merit, due-process, records, or appeal controls.',
          'Add appointing authority, qualification and eligibility basis, position or plantilla reference, complaint intake, notice or formal charge, answer or hearing route, written decision, appeal or reconsideration path, service-record custody, privacy, retention, and authorized disclosure rules.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-807') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'eo-292-1987') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-6713') || LEGAL_CORPUS[0]),
          ]
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
    /\b(ra 9775|ra 11930|anti child pornography|anti osaec|anti csaem|online sexual abuse|child sexual abuse|child sexual exploitation|csam|csaem|osaec|grooming|luring|pandering)\b/.test(normalizedDraft) ||
    (
      /\b(child|children|minor|minors)\b/.test(normalizedDraft) &&
      /\b(online|internet|digital|platform|content host|internet cafe|internet kiosk|website|social media|chat|upload|stream|livestream|blocking|filtering|takedown|reporting channel)\b/.test(normalizedDraft)
    )
  const hasChildConfidentiality = /\b(confidential|confidentiality|victim privacy|child identity|privacy|non disclosure)\b/.test(normalizedDraft)
  const hasChildReferral = /\b(dswd|social welfare|pnp|nbi|law enforcement|referral|reporting channel|authorized officer)\b/.test(normalizedDraft)
  const hasChildEvidenceOrPlatformControl = /\b(evidence preservation|chain of custody|blocking|filtering|takedown|notice and takedown|content host|internet cafe|internet kiosk|service provider|platform|intermediary)\b/.test(normalizedDraft)

  if (hasChildOnlineSafetyTopic) {
    if (!(hasChildConfidentiality && hasChildReferral && hasChildEvidenceOrPlatformControl)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Child online safety controls need more detail',
          'Child-protection or online-safety language was detected without clear confidentiality, referral, evidence-preservation, platform, or victim-protection controls.',
          'Add OSAEC/CSAEM intake where relevant, reporting channels, authorized referral to PNP/NBI/DSWD or local social welfare, confidentiality safeguards, evidence-preservation rules, and blocking or takedown workflow where relevant.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11930') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9775') || LEGAL_CORPUS[0]),
          ]
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

  if (
    /\b(payment system|national payment system|operator of payment system|ops|payment operator|payment switch|clearing|settlement|e-money|electronic money|wallet|qr payment|remittance|payment participant|sanctions|watchlist|asset freeze|freeze order|terrorism financing|terrorist financing|counter terrorism financing|cft|designated person|anti terrorism council|atc)\b/.test(
      normalizedDraft
    )
  ) {
    const hasPaymentSystemControls = /\b(bsp|bangko sentral|operator of payment system|ops|registration|designation|participant|settlement|clearing|reconciliation|operational risk|business continuity)\b/.test(
      normalizedDraft
    )
    const hasCftControls = /\b(sanctions|watchlist|screening|terrorism financing|terrorist financing|cft|designated person|asset freeze|freeze order|amlc|anti terrorism council|atc)\b/.test(
      normalizedDraft
    )
    const hasEscalationOrSafeguards = /\b(reporting|escalation|confidentiality|tipping off|recordkeeping|retention|audit trail|lawful authority|due process|privacy)\b/.test(
      normalizedDraft
    )

    if (!(hasPaymentSystemControls && hasCftControls && hasEscalationOrSafeguards)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Payment and CFT controls need more detail',
          'Payment-system, wallet, remittance, sanctions, watchlist, asset-freeze, or terrorism-financing language was detected without enough BSP, AMLC, CFT, settlement, reporting, confidentiality, or due-process controls.',
          'Add operator or participant classification, BSP registration or designation where relevant, clearing and settlement reconciliation, fraud and operational-risk monitoring, sanctions/watchlist screening, AMLC or ATC escalation route, freeze-order handling, confidentiality, recordkeeping, privacy limits, and lawful-authority review.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11127') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9160') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10168') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11479') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(internet transaction|online marketplace|e-marketplace|online merchant|online seller|platform seller|digital platform|social commerce|online store|marketplace listing)\b/.test(normalizedDraft)) {
    const hasSellerIdentityControls = /\b(seller verification|merchant identity|seller identity|business name|contact information|registration|onboarding)\b/.test(normalizedDraft)
    const hasMarketplaceRedressControls = /\b(complaint|redress|refund|return|warranty|dispute|resolution|consumer assistance)\b/.test(normalizedDraft)
    const hasPlatformRecordControls = /\b(takedown|notice|corrective action|transaction record|audit trail|retention|privacy|platform responsibility)\b/.test(normalizedDraft)

    if (!(hasSellerIdentityControls && hasMarketplaceRedressControls && hasPlatformRecordControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Internet-transaction controls are thin',
          'Online marketplace, e-marketplace, online-merchant, platform-seller, digital-platform, or internet-transaction language was detected without enough seller verification, consumer redress, platform accountability, or record controls.',
          'Add seller or merchant identity verification, buyer notices, price and terms disclosure, complaint and dispute route, refund or warranty handling, takedown or corrective-action process, transaction records, privacy, retention, and regulator escalation.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11967') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7394') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(financial account scam|anti financial account scamming|money mule|mule account|account takeover|social engineering|phishing|wallet scam|unauthorized transfer|scam proceeds)\b/.test(normalizedDraft)) {
    const hasScamIntakeControls = /\b(fraud report|scam report|intake|complaint|customer notice|victim notice|consumer assistance)\b/.test(normalizedDraft)
    const hasAccountActionControls = /\b(hold|freeze|account restriction|transaction review|transaction monitoring|suspicious transaction|aml|escalation)\b/.test(normalizedDraft)
    const hasEvidenceCoordinationControls = /\b(evidence|transaction log|device log|ip address|chain of custody|law enforcement|regulator|financial institution|privacy|retention)\b/.test(normalizedDraft)

    if (!(hasScamIntakeControls && hasAccountActionControls && hasEvidenceCoordinationControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Financial-account scam controls need detail',
          'Money-mule, mule-account, account-takeover, phishing, social-engineering, wallet-scam, or unauthorized-transfer language was detected without enough scam intake, account action, evidence, privacy, or coordination controls.',
          'Add scam intake and customer notice, transaction hold or freeze routing, mule-account screening, suspicious-transaction escalation, evidence preservation, financial-institution or regulator coordination, law-enforcement referral, privacy, retention, and remediation steps.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-12010') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11765') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9160') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(bsp|bangko sentral|central bank|monetary board|bank supervision|financial stability|regulatory examination)\b/.test(normalizedDraft)) {
    const hasBspAuthority = /\b(authority|license|supervised entity|regulated entity|monetary board|bsp)\b/.test(normalizedDraft)
    const hasBspReporting = /\b(report|examination|inspection|corrective action|regulatory submission|supervision)\b/.test(normalizedDraft)
    const hasBspConfidentiality = /\b(confidential|records|audit|disclosure|access control|retention)\b/.test(normalizedDraft)

    if (!(hasBspAuthority && hasBspReporting && hasBspConfidentiality)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'BSP supervision controls are incomplete',
          'BSP, Bangko Sentral, central-bank, Monetary Board, bank-supervision, financial-stability, or regulatory-examination language was detected without enough authority, examination, reporting, corrective-action, or confidentiality controls.',
          'Add entity classification, BSP or Monetary Board authority, responsible compliance owner, examination and reporting workflow, corrective-action escalation, confidential-record handling, retention, and authorized disclosure.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7653') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11211') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(general banking|banking|bank loan|bank director|bank officer|fiduciary account|related interest|bank deposit)\b/.test(normalizedDraft)) {
    const hasBankAuthority = /\b(bank|banking|license|authority|board|director|officer|responsible office)\b/.test(normalizedDraft)
    const hasBankRiskControls = /\b(approval|risk|conflict|related interest|credit review|fiduciary|internal control)\b/.test(normalizedDraft)
    const hasBankCustomerControls = /\b(customer|depositor|borrower|confidential|privacy|complaint|recordkeeping|retention)\b/.test(normalizedDraft)

    if (!(hasBankAuthority && hasBankRiskControls && hasBankCustomerControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Banking operation controls are incomplete',
          'General-banking, bank-loan, bank-director, bank-officer, fiduciary-account, related-interest, or bank-deposit language was detected without enough authority, approval, conflict, customer, confidentiality, or risk controls.',
          'Add bank authority and accountable officer, product or credit approval workflow, director/officer conflict controls, fiduciary or related-interest review, borrower/depositor notices, complaint handling, confidentiality, and retention.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8791') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(lending company|loan app|microloan|salary loan|loan collection|borrower)\b/.test(normalizedDraft)) {
    const hasLendingAuthority = /\b(registration|license|authority|sec|lending company|responsible officer)\b/.test(normalizedDraft)
    const hasLendingTerms = /\b(disclosure|interest|fees|charges|loan terms|repayment|collection)\b/.test(normalizedDraft)
    const hasBorrowerProtection = /\b(complaint|privacy|borrower data|harassment|dispute|records|retention)\b/.test(normalizedDraft)

    if (!(hasLendingAuthority && hasLendingTerms && hasBorrowerProtection)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Lending-company controls are incomplete',
          'Lending-company, loan-app, microloan, salary-loan, loan-collection, or borrower language was detected without enough registration, loan-term, collection, complaint, borrower-data, or privacy controls.',
          'Add registration or authority, responsible officer, clear loan terms, interest and fee disclosures, collection conduct, borrower-data safeguards, complaint and dispute process, records, retention, and regulator escalation.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9474') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(financing company|lease financing|factoring|receivables financing|installment financing)\b/.test(normalizedDraft)) {
    const hasFinancingAuthority = /\b(registration|license|authority|financing company|responsible officer|sec)\b/.test(normalizedDraft)
    const hasFinancingAgreement = /\b(agreement|assignment|receivable|lease|collateral|installment|disclosure)\b/.test(normalizedDraft)
    const hasFinancingRecords = /\b(records|complaint|dispute|privacy|retention|audit|customer data)\b/.test(normalizedDraft)

    if (!(hasFinancingAuthority && hasFinancingAgreement && hasFinancingRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Financing-company controls are incomplete',
          'Financing-company, lease-financing, factoring, receivables-financing, or installment-financing language was detected without enough authority, agreement, assignment, collateral, disclosure, records, or complaint controls.',
          'Add registration or authority, product classification, agreement terms, receivable assignment or collateral controls, disclosure, payment and complaint route, privacy, records custody, retention, and regulator escalation.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8556') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(insurance|policyholder|insurance policy|premium|insurance claim|insurance agent|insurance broker|underwriting)\b/.test(normalizedDraft)) {
    const hasInsuranceAuthority = /\b(licensed|license|insurance commission|agent|broker|insurer|authority)\b/.test(normalizedDraft)
    const hasInsuranceTerms = /\b(policy|premium|coverage|exclusion|underwriting|beneficiary|claim)\b/.test(normalizedDraft)
    const hasInsuranceProtection = /\b(complaint|claims process|privacy|confidential|records|retention|dispute)\b/.test(normalizedDraft)

    if (!(hasInsuranceAuthority && hasInsuranceTerms && hasInsuranceProtection)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Insurance controls are incomplete',
          'Insurance, policyholder, policy, premium, claim, agent, broker, or underwriting language was detected without enough licensing, policy-term, claims, complaint, confidentiality, or records controls.',
          'Add licensed party and product classification, policy terms, premiums, exclusions, beneficiary or claim process, complaint and dispute route, confidentiality, records custody, retention, and Insurance Commission escalation.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10607') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(pre need|pre-need|planholder|education plan|memorial plan|pension plan|trust fund)\b/.test(normalizedDraft)) {
    const hasPreNeedAuthority = /\b(license|registered|pre-need company|authority|insurance commission|responsible officer)\b/.test(normalizedDraft)
    const hasPreNeedFundControls = /\b(plan terms|contract|trust fund|reserve|cancellation|refund|claim)\b/.test(normalizedDraft)
    const hasPreNeedProtection = /\b(planholder|beneficiary|disclosure|complaint|privacy|records|retention)\b/.test(normalizedDraft)

    if (!(hasPreNeedAuthority && hasPreNeedFundControls && hasPreNeedProtection)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Pre-need plan controls are incomplete',
          'Pre-need, planholder, education-plan, memorial-plan, pension-plan, or trust-fund language was detected without enough license, plan-term, trust-fund, cancellation, claim, disclosure, or complaint controls.',
          'Add license or registration, plan and contract terms, trust-fund and reserve handling, cancellation or refund process, claim route, planholder disclosures, complaint handling, privacy, records, and retention.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9829') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(pdic|deposit insurance|insured deposit|closed bank|bank liquidation|receivership|depositor)\b/.test(normalizedDraft)) {
    const hasPdicEligibility = /\b(eligibility|insured deposit|coverage|proof|claim|depositor|account record)\b/.test(normalizedDraft)
    const hasPdicCoordination = /\b(pdic|receivership|liquidation|closed bank|coordination|payout|notice)\b/.test(normalizedDraft)
    const hasPdicProtection = /\b(confidential|privacy|complaint|records|retention|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasPdicEligibility && hasPdicCoordination && hasPdicProtection)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Deposit-insurance controls are incomplete',
          'PDIC, deposit-insurance, insured-deposit, closed-bank, liquidation, receivership, or depositor language was detected without enough eligibility, proof, payout, privacy, complaint, or coordination controls.',
          'Add PDIC coordination, depositor eligibility, insured-deposit coverage, proof and account-record handling, payout or claim notice, privacy and confidentiality safeguards, complaint route, retention, and authorized disclosure.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10846') || LEGAL_CORPUS[0])]
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

  if (/\b(magna carta of women|women rights|women's rights|gender equality|gender and development|gad|women desk|women livelihood|women health|women protection|marginalized women)\b/.test(normalizedDraft)) {
    const hasGenderAccess = /\b(eligibility|access|covered women|sector|service channel|participation|consultation)\b/.test(normalizedDraft)
    const hasGenderGovernance = /\b(gad|budget|responsible office|monitoring|reporting|gender responsive|gender mainstreaming)\b/.test(normalizedDraft)
    const hasGenderRemedy = /\b(complaint|grievance|referral|confidential|privacy|non discrimination|records|retention)\b/.test(normalizedDraft)

    if (!(hasGenderAccess && hasGenderGovernance && hasGenderRemedy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Women and gender-equality controls need implementation detail',
          'Women, gender-equality, GAD, women-desk, livelihood, health, or protection language was detected without enough access, responsible-office, budget, monitoring, complaint, confidentiality, or non-discrimination controls.',
          'Add covered women or sectors, gender-responsive access pathway, responsible office, GAD or budget linkage where relevant, participation or consultation, complaint and referral route, confidentiality, privacy, monitoring, and records retention.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9710') || LEGAL_CORPUS[0])]
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

  if (/\b(tax|taxpayer|bir|nirc|tax code|invoice|receipt|vat|withholding|tax return|filing|payment of tax|income tax|percentage tax|excise tax|train|create|create more|tax incentive|registered business enterprise)\b/.test(normalizedDraft)) {
    const hasTaxIdentityControls = /\b(taxpayer classification|taxpayer type|bir registration|certificate of registration|registered business enterprise|rbe classification|investment promotion agency|ipa|firb|incentive period)\b/.test(normalizedDraft)
    const hasTaxFilingPaymentControls = /\b(filing deadline|payment deadline|filing and payment|tax return|withholding certificate|proof of payment|payment confirmation|remittance|return filing)\b/.test(normalizedDraft)
    const hasTaxRecordControls = /\b(recordkeeping|retention|books of account|audit trail|supporting documents|bir correspondence|current bir|revenue regulation|revenue memorandum|tax records)\b/.test(normalizedDraft)
    const hasTaxTreatmentControls = /\b(vat|withholding|income tax|percentage tax|excise tax|tax rate|rate|threshold|fiscal incentive|tax incentive|enhanced deduction|vat zero rating)\b/.test(normalizedDraft)

    if (!(hasTaxIdentityControls && hasTaxFilingPaymentControls && hasTaxRecordControls && hasTaxTreatmentControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Business tax and invoicing controls need detail',
          'Tax, BIR, invoice, receipt, VAT, withholding, income-tax, percentage-tax, excise-tax, or incentive language was detected without enough registration, classification, invoicing, filing, payment, incentive, or tax-record controls.',
          'Add taxpayer classification, BIR registration or coordination, invoice or receipt workflow, books and records, filing and payment timelines, VAT or withholding treatment, certificates, incentive authority if relevant, and retention. Verify current BIR issuances before relying on fixed rates or thresholds.',
          6,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8424') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11976') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(traffic|transport|driver license|drivers license|license renewal|vehicle registration|road safety|parking|traffic violation|terminal|route|seat belt|seatbelt|motorcycle helmet|helmet law|drunk driving|drugged driving|distracted driving|mobile phone while driving|electronic device while driving|child car seat|child restraint|field sobriety|breath analyzer)\b/.test(normalizedDraft)) {
    const hasTransportScope = /\b(vehicle|driver|operator|rider|passenger|child|route|terminal|parking|road safety|regulated area|covered vehicle|covered driver|fleet|school transport)\b/.test(normalizedDraft)
    const hasTransportSafetyControls = /\b(seat belt|seatbelt|helmet|child restraint|child car seat|sobriety|breath analyzer|chemical test|mobile phone|electronic device|license validity|medical examination|inspection|safety device|product standard)\b/.test(normalizedDraft)
    const hasTransportEnforcement = /\b(enforcement|citation|apprehension|impound|evidence|notice|appeal|hearing|penalty|authorized officer|testing|inspection)\b/.test(normalizedDraft)
    const hasTransportRecords = /\b(record|registry|privacy|retention|access control|accident report|violation log|medical record|toxicology|photo|video|child record|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasTransportScope && hasTransportSafetyControls && hasTransportEnforcement && hasTransportRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Transport and road-safety controls are incomplete',
          'Traffic, transport, driver, vehicle, parking, route, terminal, seat-belt, helmet, DUI, distracted-driving, child-restraint, or road-safety language was detected without enough scope, safety-device, enforcement, evidence, appeal, record, or privacy controls.',
          'Add covered vehicles, drivers, riders, passengers, or children; LTO/LTFRB/DTI coordination where relevant; safety-device or testing requirements; citation or impoundment evidence; notice and appeal; accident, violation, medical, toxicology, photo, video, or child-passenger record safeguards; privacy and retention rules.',
          6,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-4136') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10586') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10913') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11229') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(public service|public utility|franchise|certificate of public convenience|transport operator|telecom operator|telecommunications|internet service provider|broadband|electric utility|electricity distribution|power interruption|distribution utility|electric cooperative|water district|water utility|water service|critical infrastructure)\b/.test(normalizedDraft)) {
    const hasPublicServiceAuthorization = /\b(franchise|certificate|regulator|ltfrb|ntc|erc|doe|lwua|authorization|license|service area)\b/.test(normalizedDraft)
    const hasPublicServiceUserControls = /\b(complaint|service continuity|outage|interruption|connection|disconnection|rate|charge|tariff|disclosure|consumer|customer|subscriber|public notice)\b/.test(normalizedDraft)
    const hasPublicServiceRecords = /\b(record|reporting|audit|privacy|retention|incident|regulatory filing|meter|billing|subscriber|outage log|service log)\b/.test(normalizedDraft)

    if (!(hasPublicServiceAuthorization && hasPublicServiceUserControls && hasPublicServiceRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Utility and public-service controls need regulator detail',
          'Public-service, public-utility, franchise, transport, telecom, electricity, water-service, or critical-infrastructure language was detected without enough regulator, certificate, continuity, complaint, rate, outage, disconnection, reporting, or records controls.',
          'Add service classification, franchise or certificate path, sector regulator coordination, service area, customer complaints, continuity, outage or interruption handling, rates or charges where relevant, connection or disconnection notices, incident reporting, records retention, and privacy safeguards.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11659') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9136') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7925') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-198-water-districts') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (
    /\b(downstream oil|oil industry|petroleum product|petroleum dealer|fuel retailer|fuel retail|gasoline station|service station|diesel|gasoline|kerosene|fuel price|price adjustment|fuel quality|fuel marking|fuel inventory|fuel stock|lpg|liquefied petroleum gas|lpg cylinder|lpg refill|lpg refilling|lpg dealer|lpg distributor|biofuel|biofuels|biodiesel|bioethanol|fuel blend|blend mandate|department of energy|doe monitoring|energy regulator)\b/.test(
      normalizedDraft
    )
  ) {
    const hasFuelAuthorityControls = /\b(doe|department of energy|permit|license|registration|accreditation|authorized dealer|retailer|refiller|distributor|operator|responsible office)\b/.test(
      normalizedDraft
    )
    const hasFuelOperationsControls = /\b(inventory|stock|supply|quality|standard|testing|inspection|price|posting|label|cylinder|refill|seal|safety|storage|transport|blend|biodiesel|bioethanol)\b/.test(
      normalizedDraft
    )
    const hasFuelReportingOrConsumerControls = /\b(report|monitoring|recordkeeping|audit|complaint|consumer|recall|corrective action|incident|emergency|environmental|retention)\b/.test(
      normalizedDraft
    )

    if (!(hasFuelAuthorityControls && hasFuelOperationsControls && hasFuelReportingOrConsumerControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Fuel, LPG, or biofuel controls need more detail',
          'Fuel-retail, petroleum, LPG, biofuel, fuel-price, fuel-quality, inventory, or DOE language was detected without enough authority, license, quality, safety, stock, reporting, consumer, or records controls.',
          'Add DOE or responsible regulator coordination, covered product and operator classification, permit or registration route, fuel quality and price-posting controls, inventory or stock reporting, LPG cylinder/refilling safety and traceability where relevant, biofuel blend compliance where relevant, incident response, consumer complaints, audit records, and retention.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7638') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8479') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11592') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9367') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(maritime|domestic shipping|shipping operator|vessel|ship|ferry|ro-ro|passenger vessel|cargo vessel|port|terminal|cargo handling|berthing|stevedoring|coast guard|marine safety|maritime security|oil spill|search and rescue|seafarer|stcw|manning agency|shipboard employment|aviation|airport|aircraft|air operator|flight operation|caap)\b/.test(normalizedDraft)) {
    const hasTransportAuthority = /\b(marina|pcg|coast guard|ppa|philippine ports authority|caap|civil aviation authority|customs|immigration|certificate|permit|license|authorization|accreditation|regulator)\b/.test(normalizedDraft)
    const hasOperationalScope = /\b(vessel|ship|ferry|route|port|terminal|cargo|passenger|crew|seafarer|aircraft|airport|flight|operator|facility|voyage|manifest)\b/.test(normalizedDraft)
    const hasSafetyIncidentControls = /\b(safety|inspection|emergency|incident|search and rescue|pollution|oil spill|fire safety|security|medical|evacuation|airworthiness|maintenance|drill|corrective action)\b/.test(normalizedDraft)
    const hasCredentialOrWelfareControls = /\b(stcw|certificate of competency|certificate of proficiency|training|assessment|employment contract|wage|benefit|repatriation|grievance|welfare|medical examination|crew roster)\b/.test(normalizedDraft)
    const hasTransportRecords = /\b(record|manifest|cargo log|voyage log|flight record|crew record|passenger record|privacy|retention|access control|incident report|inspection report|authorized disclosure|audit trail)\b/.test(normalizedDraft)

    if (!(hasTransportAuthority && hasOperationalScope && hasSafetyIncidentControls && (hasCredentialOrWelfareControls || /\b(airport|aircraft|flight|cargo|port|terminal|vessel|ship|ferry)\b/.test(normalizedDraft)) && hasTransportRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Aviation, maritime, port, or seafarer controls are incomplete',
          'Shipping, port, Coast Guard, seafarer, manning, aviation, airport, aircraft, cargo, or transport-operator language was detected without enough regulator, operator, safety, incident, credential, welfare, cargo/passenger-record, or privacy controls.',
          'Add the responsible regulator and office; operator, vessel, aircraft, port, route, crew, or facility scope; certificate or authorization checks; safety inspection, emergency, search-and-rescue, pollution, or aviation incident steps; seafarer STCW, contract, wage, welfare, repatriation, and grievance controls where relevant; passenger, cargo, voyage, flight, crew, CCTV, and incident-record retention and authorized disclosure.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9295') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10635') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9993') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-12021') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9497') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-857') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(environmental impact assessment|environmental impact statement|eis|environmental compliance certificate|ecc|environmentally critical project|environmentally critical area|wildlife permit|threatened species|habitat|tree cutting|timber|forest land|forestry permit|watershed)\b/.test(normalizedDraft)) {
    const hasEnvironmentalScreening = /\b(environmentally critical|site screening|project screening|impact assessment|scoping|eis|iee|ecc|emb|denr)\b/.test(normalizedDraft)
    const hasResourceControls = /\b(wildlife|species|habitat|tree inventory|timber inventory|forest land|watershed|protected area|resource boundary|mitigation|restoration)\b/.test(normalizedDraft)
    const hasEnvironmentalRecords = /\b(inspection|consultation|permit record|transport document|compliance report|corrective action|retention|grievance)\b/.test(normalizedDraft)

    if (!(hasEnvironmentalScreening && hasResourceControls && hasEnvironmentalRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Environmental impact, wildlife, and forestry controls are incomplete',
          'ECC, EIS, environmental impact, wildlife, habitat, tree-cutting, timber, forest-land, forestry, or watershed language was detected without enough project screening, resource safeguards, monitoring, consultation, or records controls.',
          'Add ECP/ECA or site screening, EMB or DENR coordination, EIS/IEE/ECC route, wildlife or forest-resource inventory, mitigation and restoration duties, consultation, monitoring, transport or custody records, corrective action, and grievance handling.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-1586') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9147') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-705') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(tourism|tourist|hotel|resort|guesthouse|lodging|homestay|short-term rental|travel agency|tour operator|tour guide|tourist transport|visitor safety|guest registration|dot accreditation|tourism accreditation|tourism enterprise|event venue)\b/.test(normalizedDraft)) {
    const hasTourismAuthority = /\b(dot|department of tourism|tourism office|tourism accreditation|accreditation|permit|license|business permit|mayor'?s permit|lgu|tourism enterprise|standard)\b/.test(normalizedDraft)
    const hasGuestSafetyControls = /\b(safety|sanitation|fire safety|emergency|accessibility|incident|insurance|consumer|complaint|refund|cancellation|disclosure)\b/.test(normalizedDraft)
    const hasGuestRecords = /\b(guest record|guest registration|booking|reservation|privacy|personal data|retention|access control|authorized disclosure|audit|recordkeeping)\b/.test(normalizedDraft)

    if (!(hasTourismAuthority && hasGuestSafetyControls && hasGuestRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Tourism and hospitality controls need detail',
          'Tourism, hotel, resort, travel-service, tour-operation, guest-registration, or visitor-safety language was detected without enough accreditation, safety, complaint, refund, guest-record, or privacy controls.',
          'Add DOT or local tourism accreditation and permit route, covered tourism enterprise type, guest safety and sanitation checks, fire safety, accessibility, complaint and refund handling, incident response, guest-record privacy, retention, and authorized disclosure.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9593') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7394') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-856') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10173') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(telecommuting|remote work|work from home|work-from-home|hybrid work|flexible work arrangement|alternative workplace)\b/.test(normalizedDraft)) {
    const hasRemoteAgreement = /\b(voluntary|agreement|covered role|eligibility|schedule|work hours|hours of work)\b/.test(normalizedDraft)
    const hasRemoteWorkControls = /\b(performance|deliverable|equipment|expense|occupational safety|workspace|overtime|rest period)\b/.test(normalizedDraft)
    const hasRemoteDataControls = /\b(data security|privacy|monitoring|access control|confidential|device|incident|retention)\b/.test(normalizedDraft)

    if (!(hasRemoteAgreement && hasRemoteWorkControls && hasRemoteDataControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Telecommuting controls need detail',
          'Telecommuting, remote-work, work-from-home, hybrid-work, or flexible-work language was detected without enough voluntary agreement, work-hour, performance, equipment, safety, privacy, or monitoring controls.',
          'Add covered roles, voluntary agreement, work schedule, hours and overtime handling, performance standards, equipment and expense rules, occupational-safety expectations, monitoring limits, data security, privacy, grievance, retention, and incident escalation.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11165') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-442') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10173') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(service charge|service charges|tips|gratuity|hotel charge|restaurant charge)\b/.test(normalizedDraft)) {
    const hasServiceChargeCoverage = /\b(covered employee|rank and file|eligible worker|employee roster|classification)\b/.test(normalizedDraft)
    const hasServiceChargeComputation = /\b(distribution|formula|share|payout|payroll|collection period|deduction)\b/.test(normalizedDraft)
    const hasServiceChargeRecords = /\b(record|audit|grievance|complaint|dispute|retention|dole)\b/.test(normalizedDraft)

    if (!(hasServiceChargeCoverage && hasServiceChargeComputation && hasServiceChargeRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Service-charge distribution controls need detail',
          'Service-charge, hotel, restaurant, tip, or gratuity language was detected without enough employee coverage, computation, payout, payroll, dispute, or record controls.',
          'Add covered employee categories, collection period, distribution formula, payout timing, payroll owner, excluded items, roster controls, employee notice, dispute route, audit records, retention, and DOLE escalation.',
          6,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11360') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-442') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(minimum wage|wage order|regional wage|wage board|rtwpb|wage distortion|pay rate|salary rate)\b/.test(normalizedDraft)) {
    const hasWageClassification = /\b(region|regional|industry|establishment size|worker classification|covered worker|exemption)\b/.test(normalizedDraft)
    const hasWageBasis = /\b(wage order|minimum wage|rtwpb|regional tripartite|dole|payroll computation|pay basis)\b/.test(normalizedDraft)
    const hasWageRecords = /\b(payroll computation|payroll record|pay record|recordkeeping|audit|correction|grievance|complaint|retention)\b/.test(normalizedDraft)

    if (!(hasWageClassification && hasWageBasis && hasWageRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Wage-order controls need detail',
          'Minimum-wage, wage-order, regional-wage, wage-board, wage-distortion, pay-rate, or salary-rate language was detected without enough region, classification, wage-order basis, payroll, correction, or complaint controls.',
          'Add region and industry classification, covered worker categories, applicable wage order or RTWPB basis, payroll computation, allowance or service-charge treatment, correction workflow, grievance route, records, retention, and DOLE escalation.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-6727') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-442') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(breastfeeding|lactation|lactation station|nursing mother|milk expression|breast milk)\b/.test(normalizedDraft)) {
    const hasLactationFacility = /\b(lactation station|facility|private room|hygiene|sanitation|refrigeration|water)\b/.test(normalizedDraft)
    const hasLactationTime = /\b(lactation period|break|schedule|work hours|accommodation|access)\b/.test(normalizedDraft)
    const hasLactationPrivacy = /\b(confidential|privacy|health record|complaint|grievance|non discrimination|retention)\b/.test(normalizedDraft)

    if (!(hasLactationFacility && hasLactationTime && hasLactationPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Breastfeeding and lactation controls need detail',
          'Breastfeeding, lactation-station, nursing-mother, milk-expression, or breast-milk language was detected without enough facility, schedule, hygiene, privacy, complaint, or accommodation controls.',
          'Add lactation station requirements, hygiene and privacy safeguards, lactation-period scheduling, access rules, responsible office, complaint route, health-record confidentiality, non-discrimination, retention, and coordination with workplace or public-facility rules.',
          6,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10028') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11210') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(hospital deposit|anti hospital deposit|no deposit|advance payment|emergency patient|medical emergency|emergency treatment|refusal to treat|patient transfer|hospital detention|detain patient|unpaid hospital bill|patient discharge|hospital license|hospital licensure|health facility|medical clinic|clinic license)\b/.test(normalizedDraft)) {
    const hasEmergencyCareControls = /\b(triage|emergency assessment|initial treatment|stabilization|stabilize|transfer|receiving facility|attending physician|emergency care)\b/.test(normalizedDraft)
    const hasPatientReleaseControls = /\b(discharge|release|billing notice|promissory note|guarantee|social service|collection|patient assistance)\b/.test(normalizedDraft)
    const hasFacilityLicensingControls = /\b(license|licensure|doh|inspection|facility standard|license to operate|service capability|administrator)\b/.test(normalizedDraft)
    const hasHospitalRecordControls = /\b(complaint|incident report|medical record|billing record|confidential|privacy|retention|record custodian)\b/.test(normalizedDraft)

    if (!(hasEmergencyCareControls && hasPatientReleaseControls && hasFacilityLicensingControls && hasHospitalRecordControls)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Hospital emergency and patient-rights controls are incomplete',
          'Hospital deposit, emergency patient, refusal-to-treat, patient transfer, unpaid bill, discharge, detention, health-facility, or hospital-licensure language was detected without enough emergency triage, stabilization, transfer, discharge, billing, licensing, complaint, or records controls.',
          'Add emergency triage and initial treatment steps, stabilization and transfer coordination, discharge and patient-release rules, billing or guarantee handling, social-service referral, DOH license or inspection owner, complaint route, incident records, medical-record custody, retention, and privacy safeguards.',
          8,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10932') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-8344') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9439') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-4226') || LEGAL_CORPUS[0]),
          ]
        )
      )
    }
  }

  if (/\b(notifiable disease|public health concern|outbreak|epidemic|contact tracing|quarantine|case investigation|health surveillance)\b/.test(normalizedDraft)) {
    const hasDiseaseReporting = /\b(reporting timeline|reportable event|notifiable disease|doh|local epidemiology|surveillance unit|responsible office)\b/.test(normalizedDraft)
    const hasDiseaseResponse = /\b(case investigation|contact tracing|referral|isolation|quarantine|laboratory|coordination)\b/.test(normalizedDraft)
    const hasDiseasePrivacy = /\b(confidential|privacy|authorized disclosure|access control|retention|redaction|health record)\b/.test(normalizedDraft)

    if (!(hasDiseaseReporting && hasDiseaseResponse && hasDiseasePrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Disease-reporting controls are incomplete',
          'Notifiable-disease, outbreak, contact-tracing, quarantine, or public-health-event language was detected without enough reporting, investigation, referral, confidentiality, or authorized-disclosure controls.',
          'Add reportable event criteria, reporting office and timeline, DOH or LGU coordination, case investigation, referral route, confidentiality, authorized disclosure, retention, and redaction safeguards.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11332') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(tobacco|smoking|cigarette|smoke free|smoke-free|designated smoking area|sale to minors|health warning)\b/.test(normalizedDraft)) {
    const hasTobaccoAgeControls = /\b(age restriction|minor|sale to minors|age verification|school zone|youth)\b/.test(normalizedDraft)
    const hasTobaccoPlaceControls = /\b(public place|smoke free|smoke-free|designated smoking area|signage|warning)\b/.test(normalizedDraft)
    const hasTobaccoEnforcement = /\b(complaint|inspection|violation|enforcement|record|retention|responsible office)\b/.test(normalizedDraft)

    if (!(hasTobaccoAgeControls && hasTobaccoPlaceControls && hasTobaccoEnforcement)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Tobacco controls are incomplete',
          'Tobacco, smoking, cigarette, smoke-free, designated-smoking-area, or sale-to-minors language was detected without enough age restriction, public-place, signage, complaint, enforcement, or recordkeeping controls.',
          'Add minor and age-verification rules, public-place and designated-smoking-area controls, signage and health-warning review, complaint intake, inspection, violation handling, responsible office, and records retention.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9211') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(vape|vapor product|vaporized nicotine|e cigarette|e-cigarette|heated tobacco|nicotine|online vape sale|vape sale)\b/.test(normalizedDraft)) {
    const hasVapeAgeControls = /\b(age verification|age restriction|minor|identity verification|age gate|age-gate)\b/.test(normalizedDraft)
    const hasVapeProductControls = /\b(packaging|warning|product standard|label|labeling|flavor|product registration|approved product)\b/.test(normalizedDraft)
    const hasVapeSalesRecords = /\b(online sale|sales channel|advertising|complaint|record|retention|privacy|takedown)\b/.test(normalizedDraft)

    if (!(hasVapeAgeControls && hasVapeProductControls && hasVapeSalesRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Vape product controls are incomplete',
          'Vape, vapor-product, vaporized-nicotine, heated-tobacco, nicotine, e-cigarette, or online-sale language was detected without enough age verification, product, packaging, warning, advertising, sales-channel, or privacy controls.',
          'Add age verification, product classification, packaging and warning review, permitted sales channel, advertising limits, complaint handling, customer-data privacy, retention, and takedown records.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11900') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(hiv|aids|hiv testing|hiv status|partner notification|pre test counseling|post test counseling)\b/.test(normalizedDraft)) {
    const hasHivConsent = /\b(consent|informed consent|counseling|pre test|post test|referral)\b/.test(normalizedDraft)
    const hasHivConfidentiality = /\b(confidential|confidentiality|privacy|access control|authorized disclosure|restricted access)\b/.test(normalizedDraft)
    const hasHivRights = /\b(non discrimination|anti discrimination|complaint|grievance|retention|records|stigma)\b/.test(normalizedDraft)

    if (!(hasHivConsent && hasHivConfidentiality && hasHivRights)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'HIV confidentiality controls are incomplete',
          'HIV, AIDS, HIV-testing, counseling, partner-notification, or HIV-status language was detected without enough informed-consent, counseling, confidentiality, anti-discrimination, restricted-access, or records controls.',
          'Add informed consent, counseling and referral workflow, confidentiality, restricted access, authorized disclosure, anti-discrimination safeguards, complaint handling, retention, and record custody.',
          8,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11166') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(immunization|vaccination|vaccine|immunization card|child vaccine|school entry vaccine)\b/.test(normalizedDraft)) {
    const hasImmunizationGuardian = /\b(parent|guardian|consent|notice|child|minor)\b/.test(normalizedDraft)
    const hasImmunizationRecords = /\b(immunization card|vaccine record|schedule|follow up|referral|health center)\b/.test(normalizedDraft)
    const hasImmunizationPrivacy = /\b(privacy|confidential|retention|record custodian|access control|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasImmunizationGuardian && hasImmunizationRecords && hasImmunizationPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Child immunization controls are incomplete',
          'Immunization, vaccination, vaccine, immunization-card, child-vaccine, or school-entry-vaccine language was detected without enough parent or guardian, schedule, record, follow-up, referral, privacy, or retention controls.',
          'Add parent or guardian notice, vaccine schedule and eligibility, immunization-card or record owner, health-center referral, follow-up, privacy, authorized disclosure, and retention safeguards.',
          5,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10152') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(blood donation|blood donor|blood bank|blood drive|blood screening|transfusion|blood service)\b/.test(normalizedDraft)) {
    const hasBloodEligibility = /\b(donor eligibility|eligibility|consent|voluntary|deferral|donor screening)\b/.test(normalizedDraft)
    const hasBloodFacility = /\b(blood bank|facility|screening|testing|referral|coordination|inventory)\b/.test(normalizedDraft)
    const hasBloodPrivacy = /\b(confidential|privacy|retention|record custodian|access control|authorized disclosure|traceability)\b/.test(normalizedDraft)

    if (!(hasBloodEligibility && hasBloodFacility && hasBloodPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Blood services controls are incomplete',
          'Blood-donation, donor, blood-bank, blood-drive, screening, transfusion, or blood-service language was detected without enough donor eligibility, consent, facility coordination, screening, confidentiality, traceability, or retention controls.',
          'Add donor eligibility and consent, screening and deferral rules, licensed facility or blood-bank coordination, referral, traceability, confidentiality, access limits, retention, and record custody.',
          7,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-7719') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(cancer|cancer screening|cancer registry|patient navigation|palliative care|survivorship)\b/.test(normalizedDraft)) {
    const hasCancerReferral = /\b(eligibility|screening|referral|patient navigation|provider|facility|palliative)\b/.test(normalizedDraft)
    const hasCancerRegistry = /\b(registry|data field|case record|consent|authorized reporting|record custodian)\b/.test(normalizedDraft)
    const hasCancerPrivacy = /\b(confidential|privacy|access control|retention|authorized disclosure|correction|grievance)\b/.test(normalizedDraft)

    if (!(hasCancerReferral && hasCancerRegistry && hasCancerPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Cancer control controls are incomplete',
          'Cancer, screening, registry, patient-navigation, palliative-care, or survivorship language was detected without enough eligibility, referral, registry, consent, confidentiality, retention, or grievance controls.',
          'Add screening eligibility, referral and patient-navigation steps, registry data fields and custodian, consent or authorized reporting basis, confidentiality, retention, access limits, correction, and grievance controls.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-11215') || LEGAL_CORPUS[0])]
        )
      )
    }
  }

  if (/\b(reproductive health|family planning|responsible parenthood|maternal health|adolescent health|rh service)\b/.test(normalizedDraft)) {
    const hasRhCounseling = /\b(counseling|informed choice|consent|referral|maternal|adolescent)\b/.test(normalizedDraft)
    const hasRhAccess = /\b(eligibility|provider|facility|service package|responsible office|availability)\b/.test(normalizedDraft)
    const hasRhPrivacy = /\b(confidential|privacy|access control|retention|complaint|grievance|authorized disclosure)\b/.test(normalizedDraft)

    if (!(hasRhCounseling && hasRhAccess && hasRhPrivacy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Reproductive health controls are incomplete',
          'Reproductive-health, family-planning, responsible-parenthood, maternal-health, or adolescent-health language was detected without enough counseling, informed choice, referral, provider, privacy, complaint, or confidentiality controls.',
          'Add counseling and informed-choice safeguards, eligibility and service owner, referral or provider route, maternal or adolescent safeguards where relevant, confidentiality, complaint handling, retention, and authorized disclosure.',
          6,
          [referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-10354') || LEGAL_CORPUS[0])]
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

  if (/\b(subdivision project|condominium|condo|license to sell|contract to sell|homeowners association|hoa|association dues|rent control|tenant|lessor|lessee|residential lease|maceda|installment buyer|real estate broker|real estate salesperson|appraiser|broker commission)\b/.test(normalizedDraft)) {
    const hasPropertyAuthority = /\b(license to sell|project registration|dhsud|title|bylaws|lease contract|licensed broker|prc|authority|registration)\b/.test(normalizedDraft)
    const hasPropertyTransactionRecords = /\b(contract|receipt|payment history|rental ledger|dues record|notice|approved plan|listing agreement|commission|appraisal|records)\b/.test(normalizedDraft)
    const hasPropertyRemedy = /\b(complaint|grievance|refund|cash surrender|grace period|cancellation notice|deposit|turnover|dispute|appeal|privacy|retention)\b/.test(normalizedDraft)

    if (!(hasPropertyAuthority && hasPropertyTransactionRecords && hasPropertyRemedy)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Real estate and housing transaction controls need detail',
          'Subdivision, condominium, HOA, rent-control, realty installment, broker, salesperson, or appraisal language was detected without enough authority, transaction records, notice, remedy, complaint, or privacy controls.',
          'Add project registration or license-to-sell checks, title or contract terms, licensed practitioner verification where relevant, receipts or payment history, HOA or lease authority, refund or cancellation route, complaint handling, retention, and privacy safeguards.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-957') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9646') || LEGAL_CORPUS[0]),
          ]
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

  if (/\b(building permit|occupancy permit|construction|renovation|structural|building official|fit out|facility use|contractor license|licensed contractor|architect|civil engineer|electrical engineer|mechanical engineer|master plumber|signed plans|sealed plans|plumbing plan|electrical plan|mechanical plan|architectural plan)\b/.test(normalizedDraft)) {
    const hasBuildingPermitControls = /\b(building permit|plan review|building official|zoning)\b/.test(normalizedDraft)
    const hasLicensedRoleControls = /\b(licensed contractor|contractor license|pcab|registered architect|architect|civil engineer|electrical engineer|mechanical engineer|master plumber|signed plans|sealed plans|professional seal|responsible professional)\b/.test(normalizedDraft)
    const hasOccupancyOrInspectionControls = /\b(occupancy permit|inspection|final inspection|certificate of occupancy)\b/.test(normalizedDraft)
    const hasBuildingSafetyControls = /\b(structural|fire safety|accessibility|stop use|correction order|appeal|electrical|mechanical|plumbing|sanitary|maintenance|as built|as-built)\b/.test(normalizedDraft)
    const hasConstructionRecords = /\b(record|custodian|retention|version control|change order|variation order|completion|as built|as-built|test report|inspection report|maintenance log)\b/.test(normalizedDraft)

    if (!(hasBuildingPermitControls && hasLicensedRoleControls && hasOccupancyOrInspectionControls && hasBuildingSafetyControls && hasConstructionRecords)) {
      findings.amber.push(
        createFinding(
          'amber',
          'gap',
          'Building, occupancy, and licensed-construction controls are incomplete',
          'Construction, renovation, facility-use, contractor, signed-plan, professional design, or occupancy language was detected without enough building permit, licensed contractor/professional role, plan review, inspection, occupancy, zoning, accessibility, safety, or records controls.',
          'Add building permit and plan-review requirements; licensed contractor and registered professional responsibilities; signed/sealed architectural, engineering, electrical, mechanical, or plumbing plans where relevant; inspection cadence; occupancy approval; building official role; fire, accessibility, sanitation, and OSH checks; correction orders; stop-use or appeal process; and project record custody.',
          7,
          [
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'pd-1096') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-4566') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-9266') || LEGAL_CORPUS[0]),
            referenceFor(LEGAL_CORPUS.find((document) => document.id === 'ra-544') || LEGAL_CORPUS[0]),
          ]
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
