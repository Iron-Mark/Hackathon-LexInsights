'use client'

/**
 * Deep Search API Service
 * Performs enhanced search with additional context and related documents
 */

const USE_PROXY = process.env.NEXT_PUBLIC_USE_RAG_PROXY === 'true'

const DEEP_SEARCH_API_URL = USE_PROXY
  ? '/api/rag-proxy'
  : process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:8000'

function buildDeepSearchUrl(endpoint: string) {
  return USE_PROXY ? `${DEEP_SEARCH_API_URL}?endpoint=${endpoint}` : `${DEEP_SEARCH_API_URL}${endpoint}`
}

export interface DeepSearchRequest {
  query: string
  context?: string
  document_name?: string
  user_id?: string
  max_results?: number
}

export interface DeepSearchResponse {
  status: 'completed' | 'processing' | 'error'
  query: string
  enhanced_summary: string
  related_documents: Array<{
    title: string
    relevance_score: number
    excerpt: string
    reference: string
  }>
  additional_insights: string[]
  cross_references: string[]
  documents_searched: number
  processing_time: number
  deep_search_used?: boolean
  processing_stages?: {
    query_generator: string
    search_executor: string
    deep_search_orchestrator: string
    summarizer: string
  }
}

export interface DeepSearchError {
  detail: string
}

/**
 * Perform deep search analysis using RAG API with PDF extraction
 * Processing time: 60-120 seconds (includes PDF download and full-text extraction)
 * 
 * This uses the RAG API's deep search mode which:
 * 1. Performs initial database search
 * 2. Downloads and extracts full text from legislative PDFs
 * 3. Performs semantic search on extracted content
 * 4. Merges and reranks all results
 * 5. Generates enhanced summary with citations
 */
export async function performDeepSearch(params: DeepSearchRequest): Promise<DeepSearchResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 180000) // 3 minutes timeout

  try {
    console.log('🔍 Starting deep search with PDF extraction...')
    
    // Call RAG API with use_deep_search flag enabled
    const response = await fetch(buildDeepSearchUrl('/api/research/rag-summary'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: params.query,
        user_id: params.user_id || 'deep-search-user',
        use_deep_search: true, // Enable PDF extraction and full-text search
      }),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData: DeepSearchError = await response.json()
      throw new Error(`Deep Search API Error ${response.status}: ${errorData.detail}`)
    }

    const data = await response.json()
    console.log('✓ Deep search completed:', data.deep_search_used ? 'with PDF extraction' : 'database only')

    // Transform RAG API response to DeepSearchResponse format
    const deepSearchResponse: DeepSearchResponse = {
      status: data.status,
      query: data.query,
      enhanced_summary: data.summary,
      related_documents: extractRelatedDocuments(data.summary),
      additional_insights: extractInsights(data.summary),
      cross_references: extractCrossReferences(data.summary),
      documents_searched: data.documents_found || 0,
      processing_time: data.processing_time_seconds || 0,
      deep_search_used: data.deep_search_used,
      processing_stages: data.processing_stages,
    }

    return deepSearchResponse

  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Deep search timed out after 3 minutes. The query may be complex or PDFs are large.')
      }
      throw error
    }
    
    throw new Error('Unknown error occurred during deep search')
  }
}

// Helper: Extract related documents from summary
function extractRelatedDocuments(summary: string): Array<{
  title: string
  relevance_score: number
  excerpt: string
  reference: string
}> {
  const docs: Array<{title: string; relevance_score: number; excerpt: string; reference: string}> = []
  
  // Extract RA references
  const raPattern = /(?:RA|Republic Act)\s+(?:No\.\s+)?(\d+)/gi
  const matches = summary.match(raPattern)
  
  if (matches) {
    const uniqueRAs = [...new Set(matches)]
    uniqueRAs.slice(0, 5).forEach((ra, index) => {
      docs.push({
        title: ra,
        relevance_score: 0.95 - (index * 0.05),
        excerpt: `Referenced in deep search analysis with full-text extraction`,
        reference: ra
      })
    })
  }
  
  return docs
}

// Helper: Extract insights from summary
function extractInsights(summary: string): string[] {
  const insights: string[] = []
  const lines = summary.split('\n')
  
  lines.forEach(line => {
    if (line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim())) {
      const insight = line.trim().replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '')
      if (insight.length > 20 && insight.length < 200) {
        insights.push(insight)
      }
    }
  })
  
  return insights.slice(0, 8)
}

// Helper: Extract cross-references from summary
function extractCrossReferences(summary: string): string[] {
  const refs: string[] = []
  
  // Extract various reference patterns
  const patterns = [
    /(?:RA|Republic Act)\s+(?:No\.\s+)?(\d+)/gi,
    /NDRRMC\s+(?:Memorandum\s+)?Circular\s+No\.\s+\d+/gi,
    /Executive Order\s+No\.\s+\d+/gi,
    /Presidential Decree\s+No\.\s+\d+/gi,
  ]
  
  patterns.forEach(pattern => {
    const matches = summary.match(pattern)
    if (matches) {
      refs.push(...[...new Set(matches)])
    }
  })
  
  return [...new Set(refs)].slice(0, 10)
}

/**
 * FALLBACK: Mock deep search for development/testing
 * Use this when RAG API is not available
 */
export async function performDeepSearchMock(params: DeepSearchRequest): Promise<DeepSearchResponse> {
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  const mockResponse: DeepSearchResponse = {
    status: 'completed',
    query: params.query,
    enhanced_summary: generateMockDeepSearchSummary(params.query, params.document_name),
    related_documents: [
      {
        title: 'Republic Act No. 10121 - DRRM Act',
        relevance_score: 0.95,
        excerpt: 'Comprehensive framework for disaster risk reduction and management...',
        reference: 'RA 10121, Section 12'
      },
      {
        title: 'NDRRMC Memorandum Circular No. 4',
        relevance_score: 0.88,
        excerpt: 'Guidelines on the establishment of Barangay DRRM Committees...',
        reference: 'NDRRMC MC No. 4, Series of 2012'
      },
      {
        title: 'Local Government Code - Disaster Management',
        relevance_score: 0.82,
        excerpt: 'Local government units shall ensure disaster preparedness...',
        reference: 'RA 7160, Book II, Title V'
      }
    ],
    additional_insights: [
      'Cross-reference with PHIVOLCS hazard maps required',
      'Consider integration with PAGASA early warning systems',
      'Review recent NDRRMC guidelines on community-based DRRM',
      'Align with National DRRM Framework 2020-2030'
    ],
    cross_references: [
      'RA 10121 - Philippine Disaster Risk Reduction and Management Act',
      'RA 7160 - Local Government Code',
      'NDRRMC MC No. 4, Series of 2012',
      'NDRRMC MC No. 5, Series of 2013'
    ],
    documents_searched: 156,
    processing_time: 3.2
  }

  return mockResponse
}

/**
 * Generate mock deep search summary
 */
function generateMockDeepSearchSummary(query: string, documentName?: string): string {
  return `# Deep Search Analysis

## Enhanced Findings

Based on comprehensive cross-referencing of 156 related documents, here are the enhanced insights:

### 🔍 Additional Context

Your ${documentName || 'document'} has been analyzed against the complete Philippine legislative database. The deep search reveals several important connections and requirements that may not be immediately apparent.

### 📊 Comprehensive Legal Framework

**Primary Legislation:**
- Republic Act No. 10121 (Philippine Disaster Risk Reduction and Management Act of 2010)
- Republic Act No. 7160 (Local Government Code of 1991)
- Presidential Decree No. 1566 (Strengthening Philippine Disaster Control)

**Supporting Regulations:**
- NDRRMC Memorandum Circular No. 4, Series of 2012
- NDRRMC Memorandum Circular No. 5, Series of 2013
- DILG Memorandum Circular No. 2013-148

### 🔗 Cross-Referenced Requirements

1. **Hazard Mapping Integration**
   - Must align with PHIVOLCS fault line maps
   - Coordinate with PAGASA flood risk assessments
   - Include MGB landslide susceptibility data
   - Reference: RA 10121, Section 12(b)

2. **Community Participation Standards**
   - Minimum 30% community representation in BDRRMC
   - Quarterly community consultations required
   - Annual community disaster drills mandatory
   - Reference: NDRRMC MC No. 5, Series of 2013

3. **Budget Allocation Requirements**
   - 5% of estimated revenue for LDRRMF
   - 30% of LDRRMF for Quick Response Fund
   - Separate line item for mitigation projects
   - Reference: RA 10121, Section 21

4. **Reporting and Documentation**
   - Quarterly reports to City/Municipal DRRM Office
   - Annual plan updates required
   - Post-disaster assessment reports within 30 days
   - Reference: RA 10121, IRR Rule 10

### 💡 Best Practice Recommendations

Based on analysis of high-performing barangay DRRM plans:

1. **Early Warning Systems**
   - Implement multi-channel alert system (SMS, sirens, social media)
   - Establish 24/7 monitoring during typhoon season
   - Create pre-scripted emergency messages in local dialects

2. **Vulnerable Groups Protection**
   - Maintain updated database of PWDs, elderly, pregnant women
   - Assign buddy system for evacuation assistance
   - Prepare special relief packs for infants and medical needs

3. **Capacity Building**
   - Train at least 10% of households in first aid
   - Conduct quarterly fire and earthquake drills
   - Establish community emergency response teams (CERT)

4. **Resource Management**
   - Pre-position emergency supplies in strategic locations
   - Establish MOAs with local suppliers for quick procurement
   - Maintain inventory management system for relief goods

### ⚠️ Common Compliance Gaps

Deep search analysis reveals these frequently missed requirements:

1. **Risk Communication Strategy** - Often overlooked but required by NDRRMC guidelines
2. **Post-Disaster Recovery Plan** - Critical for long-term resilience
3. **Gender and Development (GAD) Integration** - Required by RA 9710
4. **Climate Change Adaptation** - Must align with RA 9729 (Climate Change Act)

### 📈 Compliance Enhancement Roadmap

**Phase 1: Critical Gaps (1-2 months)**
- Complete hazard mapping
- Establish early warning system
- Update vulnerable groups database

**Phase 2: Capacity Building (3-4 months)**
- Conduct community training programs
- Organize disaster drills
- Establish CERT teams

**Phase 3: System Integration (5-6 months)**
- Integrate with city/municipal DRRM system
- Establish inter-barangay coordination
- Implement monitoring and evaluation system

### 🎯 Success Metrics

To measure plan effectiveness:
- 90% community awareness of evacuation procedures
- <30 minutes evacuation time for all residents
- Zero casualties during drills
- 100% vulnerable groups accounted for
- Quarterly drill participation >70%

---

*This deep search analysis cross-referenced 156 documents and identified 47 related provisions across 12 different laws and regulations.*

**Next Steps:**
1. Review all cross-referenced documents
2. Prioritize critical gaps identified
3. Develop detailed implementation timeline
4. Coordinate with City/Municipal DRRM Office for validation`
}

/**
 * Check if deep search is available
 */
export async function checkDeepSearchAvailability(): Promise<boolean> {
  try {
    // TODO: Implement actual health check when API is ready
    // const response = await fetch(`${DEEP_SEARCH_API_URL}/api/research/deep-search/health`)
    // return response.ok
    
    // PLACEHOLDER: Always return true for now
    return true
  } catch (error) {
    console.error('Deep search availability check failed:', error)
    return false
  }
}
