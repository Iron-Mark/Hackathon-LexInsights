# RAG API Integration Guide

## Overview

This RAG API answers Philippine legislative questions using a **3-stage sequential pipeline** with Google ADK:

1. **Query Generation** - Converts question into 3-7 optimized search queries  
2. **Database Search** - Searches 33,562+ documents via semantic search + reranking
3. **AI Summarization** - Generates 8-section markdown summary

**Recommended timeout: 120-300 seconds (full pipeline execution)**

**Frontend runtime note:** LexInSight defaults to `https://devkada.resqlink.org` with `NEXT_PUBLIC_USE_RAG_PROXY=true`. Any `http://localhost:8000` examples in this API spec assume you are running a compatible self-hosted backend locally.

---

## Main Endpoint

`POST /api/research/rag-summary`

**Request:**
```json
{
  "query": "What is RA 9003 and its requirements?",
  "user_id": "agent_id"
}
```

**Response (50-90 seconds):**
```json
{
  "status": "completed",
  "query": "What is RA 9003 and its requirements?",
  "summary": "# EXECUTIVE SUMMARY\n\nRA 9003 is...",
  "processing_stages": {
    "query_generator": "completed",
    "search_executor": "completed",
    "summarizer": "completed"
  }
}
```

**Python Usage:**
```python
import requests

response = requests.post(
    "http://localhost:8000/api/research/rag-summary",
    json={"query": "What is RA 9003?", "user_id": "my_agent"},
    timeout=300
)

print(response.json()["summary"])
```

---

## Pipeline Stages

### Stage 1: Query Generator (1-2 seconds)
- **Model:** Gemini 2.5-flash
- **Output:** 3-7 Philippine legislative search queries
- **Saved to:** `state["search_queries"]`

### Stage 2: Search Executor (20-30 seconds)
- **Vector Store:** ChromaDB with BAAI/bge-large-en-v1.5
- **Reranker:** BAAI/bge-reranker-large
- **Documents:** 33,562 Philippine legislation
- **Process:** Search → Aggregate → Deduplicate → Rerank
- **Output:** Top 50 results
- **Saved to:** `state["search_results"]`

### Stage 3: Summarizer (30-60 seconds)
- **Model:** Gemini 2.5-flash
- **Output:** 8-section markdown summary
  - Executive Summary
  - Applicable Legislation
  - Key Provisions
  - Who Is Affected
  - Compliance Timeline
  - Penalties
  - Related Laws
  - Resources & Next Steps
- **Saved to:** `state["final_summary"]`

---

## Other Endpoints

**WebSocket Streaming:**
```
ws://localhost:8000/api/research/ws/rag-summary
```

**Health Check:**
```
GET /api/research/health
```

---

## Timeout Settings

| Type | Value | Purpose |
|------|-------|---------|
| Client | 300s | Full pipeline |
| Read | 120s | Per chunk |
| Server | 300s | Hard limit |

---

## ADK Integration

```python
from google.adk.agents import LlmAgent
from google.adk.tools import FunctionTool
import httpx

def search_legislation(query: str) -> str:
    """Search Philippine legislation and get AI summary."""
    with httpx.Client(timeout=300) as client:
        resp = client.post(
            "http://localhost:8000/api/research/rag-summary",
            json={"query": query, "user_id": "adk"}
        )
        return resp.json()["summary"]

# Add to agent
agent = LlmAgent(
    name="legislation",
    model="gemini-2.5-flash",
    tools=[FunctionTool(func=search_legislation)]
)
```

---

## Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| 200 | Success | Use response |
| 400 | Bad input | Check format |
| 408 | Timeout | Increase to 300s |
| 500 | Error | Check logs |
| 503 | DB offline | Restart |

---

## Notes

- All agents share conversation history
- Each stage saves to session state
- Pipeline is strictly sequential
- See RESTART_INSTRUCTIONS.md for deployment
- See README_RAG_SYSTEM.md for full docs
