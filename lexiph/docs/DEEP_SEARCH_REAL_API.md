# Deep Search - Real API Implementation

## Overview

The Deep Search feature now uses the **real RAG API with PDF extraction** as specified in `DEEP_SEARCH_INTEGRATION.md`.

**Frontend runtime note:** LexInSight defaults to `https://devkada.resqlink.org` with `NEXT_PUBLIC_USE_RAG_PROXY=true`. Any `http://localhost:8000` examples in this document assume you are running a compatible self-hosted backend locally.

---

## 🔧 Implementation Details

### API Call

**Endpoint:** `POST /api/research/rag-summary`

**Request:**
```json
{
  "query": "What are the penalties for violating RA 9003?",
  "user_id": "user-123",
  "use_deep_search": true
}
```

**Key Parameter:**
- `use_deep_search: true` - Enables PDF extraction and full-text search

---

## 🔄 Processing Pipeline

### Standard Mode (use_deep_search: false)
```
Query → Database Search → Summarize
Time: 20-30 seconds
```

### Deep Search Mode (use_deep_search: true)
```
Query → Database Search → PDF Download → PDF Extract → Full-Text Search → Merge & Rerank → Summarize
Time: 60-120 seconds
```

---

## 📊 What Deep Search Does

### 1. Initial Search (5-10s)
- Searches compliance_documents collection
- Gets document metadata and summaries
- Identifies relevant legislation

### 2. PDF Extraction (30-60s)
- Downloads legislative PDFs
- Extracts full text using PyMuPDF4LLM
- Chunks content (~1024 tokens each)
- Stores in deep_search_documents collection

### 3. Full-Text Search (10-20s)
- Semantic search on extracted chunks
- Section-aware retrieval
- Deduplication by source document

### 4. Merge & Rerank (5-10s)
- Combines database + full-text results
- Reranks using BAAI/bge-reranker-large
- Returns top 50 results

### 5. Enhanced Summary (15-20s)
- Generates comprehensive summary
- Includes full-text citations
- Cross-references sections
- Provides detailed context

---

## 🎯 Response Format

```json
{
  "status": "completed",
  "query": "What are the penalties for violating RA 9003?",
  "summary": "# Executive Summary\n\nBased on full-text extraction...",
  "processing_stages": {
    "query_generator": "completed",
    "search_executor": "completed",
    "deep_search_orchestrator": "completed",
    "summarizer": "completed"
  },
  "deep_search_used": true,
  "processing_time_seconds": 87.3,
  "documents_found": 42
}
```

---

## 💡 Key Differences

| Feature | Standard Search | Deep Search |
|---------|----------------|-------------|
| **Data Source** | Database summaries | Full PDF text |
| **Processing Time** | 20-30s | 60-120s |
| **Detail Level** | Overview | Comprehensive |
| **Citations** | General | Section-specific |
| **PDF Download** | No | Yes |
| **Caching** | Query-based | Document-based |
| **Cost** | Lower | Higher |

---

## 🔍 When to Use Deep Search

### ✅ Use Deep Search When:

1. **Need Specific Details**
   - Exact penalty amounts
   - Specific section references
   - Detailed requirements

2. **Complex Questions**
   - Multi-part questions
   - Comparative analysis
   - Implementation details

3. **Comprehensive Research**
   - Full legal framework
   - All related provisions
   - Cross-referenced requirements

4. **Citation Needed**
   - Need exact section numbers
   - Require precise wording
   - Legal documentation

### ❌ Standard Search is Better For:

1. **Quick Overview**
   - General understanding
   - High-level summary
   - Basic information

2. **Time-Sensitive**
   - Need fast response
   - Simple questions
   - Quick reference

3. **Broad Topics**
   - General compliance
   - Overview of laws
   - Basic requirements

---

## 🚀 Performance

### Timing Breakdown

**Deep Search (60-120 seconds):**
```
Query Generation:        2-3s    ████░░░░░░░░░░░░░░░░
Database Search:         5-10s   ████████░░░░░░░░░░░░
PDF Download:           20-40s   ████████████████░░░░
PDF Extraction:         10-20s   ████████████░░░░░░░░
Full-Text Search:       10-20s   ████████████░░░░░░░░
Summarization:          15-20s   ██████████░░░░░░░░░░
─────────────────────────────────────────────────────
Total:                  60-120s  ████████████████████
```

### Optimization

**Caching:**
- PDFs cached locally in `deep_search_cache/`
- Extracted chunks stored in ChromaDB
- Subsequent queries on same document: ~20-30s

**Parallel Processing:**
- Multiple PDFs downloaded concurrently
- Extraction parallelized
- Search operations optimized

---

## 🔌 Frontend Integration

### Updated Service

```typescript
// lib/services/deep-search-api.ts

export async function performDeepSearch(params: DeepSearchRequest) {
  const response = await fetch(`${API_URL}/api/research/rag-summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: params.query,
      user_id: params.user_id,
      use_deep_search: true, // ← Key parameter
    }),
  })
  
  const data = await response.json()
  
  // Transform to DeepSearchResponse format
  return {
    enhanced_summary: data.summary,
    documents_searched: data.documents_found,
    processing_time: data.processing_time_seconds,
    deep_search_used: data.deep_search_used,
    // ... extract related docs, insights, cross-refs
  }
}
```

### Helper Functions

```typescript
// Extract related documents from summary
function extractRelatedDocuments(summary: string) {
  // Parse summary for RA references
  const raPattern = /(?:RA|Republic Act)\s+(?:No\.\s+)?(\d+)/gi
  const matches = summary.match(raPattern)
  // ... return structured data
}

// Extract insights from summary
function extractInsights(summary: string) {
  // Parse bullet points and numbered lists
  // ... return array of insights
}

// Extract cross-references
function extractCrossReferences(summary: string) {
  // Parse various reference patterns
  // ... return array of references
}
```

---

## 🧪 Testing

### Test Deep Search

```bash
# Start RAG API server
cd rag_backend
python main.py

# Test deep search endpoint
curl -X POST "http://localhost:8000/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the penalties for violating RA 9003?",
    "user_id": "test",
    "use_deep_search": true
  }' \
  --max-time 180
```

### Frontend Test

1. Go to `http://localhost:3000/chat`
2. Stay in **General Mode**
3. Type: "What are the penalties for violating RA 9003?"
4. Click **Deep Search** button (✨)
5. Wait 60-120 seconds
6. View enhanced results with full-text citations

---

## 📈 Monitoring

### Check Processing Stages

```json
{
  "processing_stages": {
    "query_generator": "completed",
    "search_executor": "completed",
    "deep_search_orchestrator": "completed",  ← Deep search ran
    "summarizer": "completed"
  },
  "deep_search_used": true  ← Confirms PDF extraction
}
```

### Performance Metrics

- `processing_time_seconds`: Total time
- `documents_found`: Number of results
- `deep_search_used`: Whether PDFs were extracted

---

## ⚠️ Important Notes

### Timeout Settings

- **Frontend:** 180 seconds (3 minutes)
- **Backend:** 120-150 seconds recommended
- **Adjust if needed** for large PDFs

### Caching

- PDFs cached in `deep_search_cache/`
- Chunks stored in ChromaDB
- First query: 60-120s
- Cached queries: 20-30s

### Error Handling

```typescript
try {
  const result = await performDeepSearch(params)
  // Success
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  } else {
    // Handle other errors
  }
}
```

---

## 🔮 Future Enhancements

1. **Progress Updates** - Show PDF extraction progress
2. **Selective Deep Search** - Choose which PDFs to extract
3. **Background Processing** - Pre-extract popular documents
4. **Incremental Updates** - Update only new sections
5. **Custom Chunking** - Domain-specific section detection

---

*Last updated: November 8, 2025*
