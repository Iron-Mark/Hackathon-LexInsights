# Legislation Draft Checker API

## Overview

The **Legislation Draft Checker** is a powerful endpoint that analyzes markdown-formatted legislation drafts against existing Philippine laws. It identifies conflicts, inconsistencies, and alignment issues, then rates findings with color-coded severity levels:

- ✅ **Green**: Compliant, no issues
- ⚠️ **Amber**: Minor issues, warnings
- 🚫 **Red**: Critical issues, conflicts

**Frontend runtime note:** LexInSight defaults to `https://devkada.resqlink.org` with `NEXT_PUBLIC_USE_RAG_PROXY=true`. Any `http://localhost:8000` examples in this API spec assume you are running a compatible self-hosted backend locally.

## Endpoint

```
POST /api/legislation/draft-checker
```

## Features

### 1. **Keyword Extraction**
- Automatically extracts 8-12 search keywords from your markdown draft
- Focuses on legislative concepts: penalties, requirements, definitions, scope, procedures

### 2. **Deep Search**
- Performs full-text search across entire legislation database
- Searches both metadata and extracted PDF content
- Identifies relevant existing laws and provisions

### 3. **Conflict Detection**
- Identifies direct contradictions with existing laws
- Detects subtle inconsistencies in terminology
- Finds gaps in coverage

### 4. **Compliance Analysis**
- Compares draft against existing legislative framework
- Generates compliance score (0-100)
- Provides severity ratings for each finding

### 5. **Categorized Findings**
- **Conflicts** (Red): Direct contradictions
- **Alignment Issues** (Amber): Inconsistencies or gaps
- **Compliant** (Green): Proper alignment

## Request

### POST Body

```json
{
  "draft_markdown": "# Your Legislation Title\n\n## Section 1\n...",
  "user_id": "your_user_id",
  "include_summary": true
}
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draft_markdown` | string | ✓ | Markdown text of the legislation (50-50,000 chars) |
| `user_id` | string | ✗ | User identifier (default: "anonymous") |
| `include_summary` | boolean | ✗ | Include full summary in response (default: true) |

### Example Request

```bash
curl -X POST "http://localhost:8000/api/legislation/draft-checker" \
  -H "Content-Type: application/json" \
  -d '{
    "draft_markdown": "# Waste Management Law 2025\n\n## Purpose\nThis law establishes waste management requirements.\n\n## Requirements\n1. Source segregation mandatory\n2. Monthly reporting\n\n## Penalties\n- Non-compliance: PHP 10,000",
    "user_id": "legislator_001",
    "include_summary": true
  }'
```

## Response

### 200 OK - Success

```json
{
  "status": "success",
  "timestamp": "2025-11-08T14:55:00.123456",
  "analysis": {
    "status": "completed",
    "draft_title": "Waste Management Law 2025",
    "total_findings": 8,
    "green_count": 3,
    "amber_count": 3,
    "red_count": 2,
    "green_findings": [
      {
        "category": "compliant",
        "status": "green",
        "title": "Alignment with RA 9003",
        "description": "Source segregation requirement is fully compliant with existing RA 9003 provisions",
        "references": ["RA 9003 Section 4", "RA 9003 Section 5"],
        "recommendation": "No changes needed",
        "severity_score": 0.0
      }
    ],
    "amber_findings": [
      {
        "category": "alignment",
        "status": "amber",
        "title": "Reporting Frequency Inconsistency",
        "description": "Monthly reporting differs from RA 9003's quarterly requirement",
        "references": ["RA 9003 Section 12"],
        "recommendation": "Align with RA 9003 or provide justification for increased frequency",
        "severity_score": 0.4
      }
    ],
    "red_findings": [
      {
        "category": "conflict",
        "status": "red",
        "title": "Penalty Conflict with DENR Guidelines",
        "description": "Proposed PHP 10,000 penalty conflicts with DENR's minimum PHP 50,000 for similar violations",
        "references": ["DENR Administrative Order 2024-001"],
        "recommendation": "Increase penalty to PHP 50,000 or higher to align with national standards",
        "severity_score": 0.9
      }
    ],
    "overall_assessment": "The draft is generally compliant with existing legislation but has critical penalty issues and some reporting inconsistencies. Recommend addressing red findings before enactment.",
    "compliance_score": 72,
    "keywords_extracted": 10,
    "documents_searched": 5,
    "chunks_analyzed": 47,
    "processing_time_seconds": 45.32,
    "summary": "Full analysis summary..."
  }
}
```

### Error Response

```json
{
  "status": "error",
  "timestamp": "2025-11-08T14:55:00.123456",
  "analysis": {
    "status": "error",
    "draft_title": "Error",
    "total_findings": 0,
    "green_count": 0,
    "amber_count": 0,
    "red_count": 0,
    "compliance_score": 0,
    "processing_time_seconds": 5.2
  },
  "error": "Error message describing what went wrong"
}
```

## Response Model

### DraftAnalysis Object

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | "completed" or "error" |
| `draft_title` | string | Extracted title from markdown |
| `total_findings` | integer | Total number of findings |
| `green_count` | integer | Count of ✅ compliant findings |
| `amber_count` | integer | Count of ⚠️ warning findings |
| `red_count` | integer | Count of 🚫 critical findings |
| `green_findings` | array | Array of Finding objects (green) |
| `amber_findings` | array | Array of Finding objects (amber) |
| `red_findings` | array | Array of Finding objects (red) |
| `overall_assessment` | string | Summary assessment |
| `compliance_score` | number | 0-100 compliance rating |
| `keywords_extracted` | integer | Number of keywords generated |
| `documents_searched` | integer | Documents analyzed |
| `chunks_analyzed` | integer | Text chunks analyzed |
| `processing_time_seconds` | number | Processing duration |
| `summary` | string | Full detailed summary |

### Finding Object

| Field | Type | Description |
|-------|------|-------------|
| `category` | string | "conflict", "alignment", "gap", or "compliant" |
| `status` | string | "green", "amber", or "red" |
| `title` | string | Short title |
| `description` | string | Detailed description |
| `references` | array | Related legislation references |
| `recommendation` | string | Suggested action |
| `severity_score` | number | 0.0-1.0 severity |

## Use Cases

### 1. Pre-Filing Review
Before submitting a bill, check it against existing legislation to ensure compliance.

```json
{
  "draft_markdown": "# Your Bill Text\n\n...",
  "user_id": "legislator_bsac",
  "include_summary": true
}
```

### 2. Committee Review
Analyze multiple versions of a bill to track how proposed changes affect compliance.

### 3. Regulatory Compliance
Ensure corporate policies align with all relevant legislation.

### 4. Legal Research
Quickly identify all conflicting or related legislation for a draft proposal.

## Status Code Reference

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Analysis complete, check findings |
| 400 | Bad Request | Invalid request format |
| 422 | Validation Error | Missing or invalid parameters |
| 500 | Server Error | Internal processing error |
| 503 | Service Unavailable | Initialization in progress |

## Severity Scoring

Findings are ranked by severity (0.0 to 1.0):

- **0.0-0.3**: Low severity (✅ Green)
- **0.3-0.7**: Medium severity (⚠️ Amber)
- **0.7-1.0**: High severity (🚫 Red)

## Compliance Score

The overall compliance score (0-100) is calculated based on:
- Number and severity of conflicts (Red findings)
- Number and severity of inconsistencies (Amber findings)
- Alignment with existing legislation

```
Score = 100 - (Red_Count * 30 + Amber_Count * 10 + Minor_Issues * 2)
```

## Health Check

```
GET /api/legislation/draft-checker/health
```

Response:
```json
{
  "status": "healthy",
  "service": "draft_checker",
  "timestamp": "2025-11-08T14:55:00.123456"
}
```

## Workflow

```
┌─────────────────────┐
│  User submits       │
│  draft markdown     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Extract Keywords   │ (8-12 terms)
│  from draft text    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Deep Search        │ (Full-text + metadata)
│  on legislation DB  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Compare findings   │
│  with existing laws │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Categorize by      │ (Red/Amber/Green)
│  severity & type    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Return analysis    │
│  with findings      │
└─────────────────────┘
```

## Best Practices

1. **Use Complete Drafts**: Include all sections for accurate analysis
2. **Use Markdown Format**: Follow standard markdown structure
3. **Include Details**: Penalties, requirements, and definitions are crucial
4. **Review Red Findings**: Address all 🚫 critical issues before filing
5. **Consider Context**: Amber findings may need justification

## Rate Limits

- 100 requests per hour per user_id
- Maximum draft size: 50,000 characters
- Processing timeout: 120 seconds

## Example: Complete Workflow

```bash
# 1. Prepare your draft
DRAFT='# Solid Waste Management Compliance Act 2025

## Purpose
Establish comprehensive waste management procedures.

## Key Requirements
- Source segregation mandatory
- Monthly reporting to DENR
- Collection centers within 5km

## Penalties
- Non-compliance: PHP 5,000-50,000
- Report failure: PHP 2,000 per month'

# 2. Submit for analysis
curl -X POST "http://localhost:8000/api/legislation/draft-checker" \
  -H "Content-Type: application/json" \
  -d "{
    \"draft_markdown\": \"$(echo "$DRAFT" | sed 's/"/\\"/g')\",
    \"user_id\": \"legislator_001\"
  }"

# 3. Parse response
# - Review red_findings (critical)
# - Address amber_findings (warnings)
# - Confirm green_findings (compliant)

# 4. Make revisions and resubmit
# Repeat until compliance_score is satisfactory
```

## Support

For issues or questions:
- Check the `/api/legislation/draft-checker/health` endpoint
- Review error messages in the response
- Ensure draft markdown is properly formatted
- Verify user_id is provided for tracking
