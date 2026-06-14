# Deep Search Feature Integration Guide

## Overview

The RAG backend now supports **Deep Search Mode**, which enhances legislative research by:

1. **Initial Search**: Quick database search on document summaries
2. **PDF Extraction**: Downloads and extracts full text from legislative PDFs using PyMuPDF4LLM
3. **Full-Text Search**: Performs semantic search on extracted content chunks
4. **Combined Results**: Merges and reranks results from both shallow and deep search
5. **Enhanced Summary**: Generates comprehensive summary with full-text context and citations

**Frontend runtime note:** LexInSight defaults to `https://devkada.resqlink.org` with `NEXT_PUBLIC_USE_RAG_PROXY=true`. Any `http://localhost:8000` examples in this integration guide assume you are running a compatible self-hosted backend locally.

## Architecture

### Data Collections

**Two ChromaDB Collections:**

| Collection | Purpose | Content | Embedding |
|-----------|---------|---------|----------|
| `compliance_documents` | Initial search (existing) | Document metadata + brief summaries | BAAI/bge-large-en-v1.5 |
| `deep_search_documents` | Full-text search (new) | Extracted PDF chunks with section info | BAAI/bge-large-en-v1.5 |

### Pipeline Modes

```
Standard Mode (20-30 seconds):
  User Query
    ↓
  Query Generator → Search Executor → Summarizer
    ↓
  Final Summary (database results only)

Deep Search Mode (60-120 seconds):
  User Query
    ↓
  Query Generator → Search Executor → Deep Search Orchestrator → Summarizer
    ↓
  Final Summary (database + full-text results)
```

## API Usage

### Standard Search (Database Only)

```bash
curl -X POST "http://localhost:8000/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is RA 9003?",
    "user_id": "user123"
  }'
```

**Response:**
```json
{
  "status": "completed",
  "query": "What is RA 9003?",
  "summary": "# Executive Summary\n\nRA 9003...",
  "processing_stages": {
    "query_generator": "completed",
    "search_executor": "completed",
    "deep_search_orchestrator": "skipped",
    "summarizer": "completed"
  },
  "deep_search_used": false,
  "processing_time_seconds": 24.5
}
```

### Deep Search (With PDF Extraction)

```bash
curl -X POST "http://localhost:8000/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What are the penalties for violating RA 9003?",
    "user_id": "user123",
    "use_deep_search": true
  }'
```

**Response:**
```json
{
  "status": "completed",
  "query": "What are the penalties for violating RA 9003?",
  "summary": "# Executive Summary\n\nBased on full-text extraction from RA 9003...",
  "processing_stages": {
    "query_generator": "completed",
    "search_executor": "completed",
    "deep_search_orchestrator": "completed",
    "summarizer": "completed"
  },
  "deep_search_used": true,
  "processing_time_seconds": 87.3
}
```

## Implementation Details

### 1. Deep Search Service (`services/deep_search_service.py`)

**Core Class: `DeepSearchService`**

```python
from services.deep_search_service import get_deep_search_service

service = get_deep_search_service()

# Process a document (download + extract + store)
result = await service.process_and_store_document(
    doc_id="RA_9003",
    doc_url="https://congress.gov.ph/...pdf",
    doc_title="RA 9003 - Ecological Solid Waste Management Act"
)

# Search extracted content
results = service.search_deep("waste management requirements", top_k=20)

# Get statistics
stats = service.get_deep_search_stats()
```

**Key Features:**

- **Smart Caching**: `_is_cached()` checks if document already processed
- **Async Download**: Uses httpx for concurrent PDF downloads
- **PyMuPDF4LLM**: Intelligent markdown extraction with section detection
- **Intelligent Chunking**: ~1024-token chunks with section-aware splitting
- **Metadata Preservation**: Tracks source_doc_id, doc_title, section_info, timestamps
- **Error Handling**: Graceful fallbacks for download/extraction failures

**Collections:**

```python
# Dual collection strategy
COMPLIANCE_COLLECTION = "compliance_documents"      # Existing summaries
DEEP_SEARCH_COLLECTION = "deep_search_documents"   # New full-text chunks
```

### 2. Deep Search Pipeline (`agents/deep_search_pipeline.py`)

**Agent Functions:**

```python
from agents.deep_search_pipeline import (
    create_deep_search_query_generator,
    create_deep_search_executor,
    create_deep_search_summarizer,
    perform_deep_search,
    extract_document_urls,
)

# Query generator optimized for full-text search
query_gen = create_deep_search_query_generator()

# Search executor for extracted chunks
search_exec = create_deep_search_executor()

# Summarizer with full-text context support
summarizer = create_deep_search_summarizer()
```

**Pipeline Integration:**

- **`extract_document_urls()`**: Extracts PDF URLs from search results
- **`perform_deep_search()`**: Orchestrates download → extraction → storage → search
- **Query Generator**: Creates section-specific search queries
- **Search Executor**: Performs semantic search on chunks with deduplication
- **Summarizer**: Generates comprehensive summary with citations

### 3. RAG Pipeline Updates (`agents/rag_summarization_pipeline.py`)

**Mode Selection:**

```python
from agents.rag_summarization_pipeline import create_rag_summarization_pipeline

# Standard mode (database search only)
pipeline = create_rag_summarization_pipeline(use_deep_search=False)

# Deep search mode (with PDF extraction)
pipeline = create_rag_summarization_pipeline(use_deep_search=True)
```

**Pipeline Structure:**

```
Standard: [QueryGen] → [Search] → [Summarizer]
Deep:     [QueryGen] → [Search] → [DeepSearch] → [Summarizer]
```

### 4. Endpoint Updates (`endpoints/rag_research.py`)

**New Request Parameter:**

```python
class ResearchRequest(BaseModel):
    query: str                    # Research question
    user_id: str = "anonymous"   # Session tracking
    use_deep_search: bool = False # Enable PDF extraction
```

**Enhanced Response:**

```python
class ResearchResponse(BaseModel):
    status: str                        # "completed" or "failed"
    query: str                         # Original query
    summary: str                       # Generated summary
    processing_stages: dict            # Stage status tracking
    deep_search_used: bool            # Whether deep search was used
    processing_time_seconds: float     # Total execution time
```

**Dual Pipeline Management:**

```python
_pipeline_standard = None       # Cached standard pipeline
_pipeline_deep_search = None    # Cached deep search pipeline
_session_service = None         # Shared session service

def _get_pipeline(use_deep_search: bool = False):
    # Lazy-load appropriate pipeline
    if use_deep_search:
        return _pipeline_deep_search
    else:
        return _pipeline_standard
```

## Storage & Caching

### Directory Structure

```
chroma_data/
├── deep_search_cache/          # Downloaded PDFs (cached locally)
│   ├── RA_9003.pdf
│   ├── RA_11058.pdf
│   └── ...
├── downloads/                  # Temporary extraction directory
│   └── (temporary extraction files)
└── (ChromaDB data files)
```

### Caching Strategy

**Smart Caching**: Documents are processed only once

1. **Hash-based identification**: SHA256 of doc_id
2. **Collection query**: Check if source_doc_id exists in deep_search_documents
3. **Skip processing**: If cached, reuse stored chunks
4. **Deduplication**: Results deduplicated by source document

**Cache Check:**
```python
# Check if document already extracted
is_cached = service._is_cached("RA_9003")

# If cached, skip download + extraction
if is_cached:
    # Use existing chunks from ChromaDB
    results = service.search_deep(query)
else:
    # Download + extract + store new chunks
    await service.process_and_store_document(doc_id, url, title)
```

## Performance Characteristics

### Timing Breakdown

**Standard Mode (20-30 seconds):**
- Query Generation: 2-3s
- Search Execution: 5-10s
- Summarization: 10-15s
- Total: **20-30 seconds**

**Deep Search Mode (60-120 seconds):**
- Query Generation: 2-3s
- Search Execution: 5-10s
- PDF Download & Extraction: 30-60s (depends on file size)
- Deep Search: 10-20s
- Summarization: 15-20s
- Total: **60-120 seconds** (or 90-150s for multiple large PDFs)

### Resource Usage

**Memory:**
- Standard: ~200-300 MB
- Deep Search: ~500-800 MB (with PDF extraction)

**Storage:**
- Per PDF: 1-10 MB (cached locally)
- Per 1000 chunks: ~50-100 MB in ChromaDB

### Limits

- Maximum document PDFs processed: **5 per query** (configurable)
- Maximum chunk results: **20 per document** (configurable)
- Timeout: **120-150 seconds** (for deep search mode)

## Testing

### Run Standard Pipeline Demo

```bash
cd /path/to/rag_backend
python agents/rag_summarization_pipeline.py
```

### Run Deep Search Pipeline Demo

```bash
python agents/rag_summarization_pipeline.py --deep-search
# or
python agents/rag_summarization_pipeline.py -d
```

### Test Endpoint

```bash
# Standard search
curl -X POST "http://localhost:8000/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?"}'

# Deep search
curl -X POST "http://localhost:8000/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "use_deep_search": true}'
```

### WebSocket Streaming

```bash
# Using websocat
websocat ws://localhost:8000/api/research/ws/rag-summary

# Send query (in websocat)
{"query": "What is RA 9003?", "user_id": "test_user"}

# Receive events
{"stage": "Query Generation", "status": "in_progress"}
{"stage": "Database Search", "status": "in_progress"}
{"stage": "Deep Search Orchestration", "status": "in_progress"}
{"stage": "Final Summarization", "status": "completed", "content": "..."}
```

## Python Client Examples

### Standard Search (Sync)

```python
import requests

response = requests.post(
    "http://localhost:8000/api/research/rag-summary",
    json={"query": "What is RA 9003?"}
)

data = response.json()
print(f"Query: {data['query']}")
print(f"Status: {data['status']}")
print(f"Time: {data['processing_time_seconds']:.1f}s")
print(f"\nSummary:\n{data['summary']}")
```

### Deep Search (Sync)

```python
import requests

response = requests.post(
    "http://localhost:8000/api/research/rag-summary",
    json={
        "query": "What are the penalties for violating RA 9003?",
        "use_deep_search": True
    }
)

data = response.json()
if data['deep_search_used']:
    print("✓ Deep search performed (full-text extraction enabled)")
print(f"Stages: {data['processing_stages']}")
```

### WebSocket Streaming (Async)

```python
import asyncio
import json
import websockets

async def stream_research():
    async with websockets.connect("ws://localhost:8000/api/research/ws/rag-summary") as ws:
        # Send query
        await ws.send(json.dumps({"query": "What is RA 9003?"}))
        
        # Receive events
        async for message in ws:
            event = json.loads(message)
            print(f"Stage: {event['stage']}")
            print(f"Status: {event['status']}")
            if event.get('content'):
                preview = event['content'][:100]
                print(f"Content: {preview}...")
                if event['status'] == 'completed':
                    break

asyncio.run(stream_research())
```

## Monitoring & Debugging

### Enable Detailed Logging

```python
import logging

# Set logging level
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("services.deep_search_service")
logger.setLevel(logging.DEBUG)
```

### Check Deep Search Statistics

```python
from services.deep_search_service import get_deep_search_service

service = get_deep_search_service()
stats = service.get_deep_search_stats()

print(f"Collection: {stats['collection_name']}")
print(f"Total chunks: {stats['total_items']}")
print(f"Cache directory: {stats['cache_directory']}")
print(f"Unique documents: {stats.get('unique_documents', 'N/A')}")
```

### Verify ChromaDB Collections

```python
import chromadb

client = chromadb.PersistentClient(path="./chroma_data")

# List collections
collections = client.list_collections()
for coll in collections:
    print(f"Collection: {coll.name}")
    print(f"  Count: {coll.count()}")
    print(f"  Metadata: {coll.metadata}")

# Query specific collection
deep_search = client.get_collection("deep_search_documents")
print(f"Deep search chunks: {deep_search.count()}")
```

## Troubleshooting

### Issue: Deep search not finding documents

**Solution**: Ensure PDFs are downloadable and accessible
- Check URL format: Should return PDF directly
- Verify network connectivity
- Check deep_search_cache directory for cached files

### Issue: High memory usage

**Solution**: Limit number of documents processed
- Edit `extract_document_urls()` max_documents parameter
- Reduce chunk size in `_chunk_pdf_content()`
- Increase timeout to allow garbage collection

### Issue: Slow PDF extraction

**Solution**: PDF extraction is I/O intensive
- Check disk speed (SSDs recommended)
- Monitor network bandwidth for downloads
- Consider preprocessing PDFs (remove images)

### Issue: ChromaDB collection mismatch

**Solution**: Ensure both collections use same embedding model
- Verify EMBEDDING_MODEL in deep_search_service.py
- Check ChromaDB metadata with `get_deep_search_stats()`
- Rebuild collection if embedding model changed

## Future Enhancements

1. **Incremental Indexing**: Process PDFs in background
2. **Caching Layer**: Redis for faster chunk retrieval
3. **Custom Chunking**: Domain-specific section detection
4. **Reranking**: Neural reranker for result quality
5. **Parallel Processing**: Download multiple PDFs concurrently
6. **PDF Preprocessing**: Image/table extraction and OCR
7. **Summary Caching**: Cache summaries for common queries

## References

- **Deep Search Service**: `services/deep_search_service.py`
- **Deep Search Pipeline**: `agents/deep_search_pipeline.py`
- **RAG Pipeline**: `agents/rag_summarization_pipeline.py`
- **API Endpoint**: `endpoints/rag_research.py`
- **PyMuPDF4LLM Docs**: https://pymupdf4llm.readthedocs.io/
- **ChromaDB Docs**: https://docs.trychroma.com/
