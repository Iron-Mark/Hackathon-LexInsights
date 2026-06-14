# RAG API Testing Guide

## Current Endpoint

Use `https://devkada.resqlink.org` by default. The older raw IP endpoint is deprecated for this frontend. If the hosted health check times out, these RAG tests cannot pass until the backend is restored or a compatible local backend is configured in `.env.local`.

## Quick Start

### 1. Access Test Interface

Navigate to: **http://localhost:3000/test-rag**

This provides a visual interface to test the RAG API.

### 2. Test Flow

#### Step 1: Health Check
1. Click "Check Status" button
2. Verify API shows: ✅ API is ok - Service: simple_rag
3. If offline: Check `https://devkada.resqlink.org/api/research/health`

#### Step 2: Quick Test Queries
1. Click any pre-defined test query button:
   - "What is RA 9003?"
   - "What are workplace safety requirements in Philippines?"
   - "Tell me about environmental protection laws"
2. Click "Research" button
3. Wait 5-8 seconds for response

#### Step 3: Custom Query
1. Type your own question in the textarea
2. Must be 5-500 characters
3. Click "Research"
4. View results

#### Step 4: Review Results
- **Status**: completed | no_results | error
- **Documents Found**: Number of relevant documents
- **Search Queries Used**: Generated search terms
- **Summary**: Markdown-formatted research summary
- **Raw JSON**: Expand to see full API response

## Manual API Testing

### Using cURL

#### Test 1: Basic Query

```bash
curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is RA 9003?",
    "user_id": "test_user"
  }'
```

**Expected Response:**
```json
{
  "status": "completed",
  "query": "What is RA 9003?",
  "summary": "# EXECUTIVE SUMMARY\n\n**RA 9003** (Ecological Solid Waste Management Act of 2000)...",
  "search_queries_used": ["RA 9003", "solid waste management", "..."],
  "documents_found": 24
}
```

#### Test 2: Health Check

```bash
curl "https://devkada.resqlink.org/api/research/health"
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "simple_rag"
}
```

#### Test 3: Invalid Query (Too Short)

```bash
curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{"query": "RA"}'
```

**Expected Response:**
```json
{
  "detail": "Query must be 5-500 characters"
}
```

### Using Postman

1. **Create New Request**
   - Method: POST
   - URL: `https://devkada.resqlink.org/api/research/rag-summary`

2. **Headers**
   ```
   Content-Type: application/json
   ```

3. **Body (raw JSON)**
   ```json
   {
     "query": "What is RA 9003?",
     "user_id": "postman_test"
   }
   ```

4. **Send Request**

5. **Verify Response**
   - Status: 200 OK
   - Body contains: status, query, summary, search_queries_used, documents_found

## Test Scenarios

### Scenario 1: Successful Research

**Query:** "What is RA 9003?"

**Expected:**
- Status: completed
- Documents Found: > 0
- Summary: Contains sections (Executive Summary, Applicable Legislation, Key Requirements, etc.)
- Search Queries: 3-7 generated terms

**Validation:**
- ✅ Response time: 5-10 seconds
- ✅ Summary is markdown formatted
- ✅ Contains RA number and details
- ✅ Includes next steps

### Scenario 2: No Results

**Query:** "What is the law about flying unicorns?"

**Expected:**
- Status: no_results
- Documents Found: 0
- Summary: "No relevant legislation found..."
- Search Queries: Still generated

**Validation:**
- ✅ Graceful handling
- ✅ Helpful message
- ✅ No error thrown

### Scenario 3: Invalid Query

**Query:** "RA" (too short)

**Expected:**
- HTTP 400 Bad Request
- Error message: "Query must be 5-500 characters"

**Validation:**
- ✅ Proper error handling
- ✅ Clear error message

### Scenario 4: API Offline

**Expected:**
- Connection error
- Error message: "Failed to fetch" or timeout

**Validation:**
- ✅ Error caught and displayed
- ✅ User-friendly message

## Integration Testing

### Test in Chat Interface

1. Navigate to `/chat`
2. Switch to "Compliance" mode
3. Type: "What is RA 9003?"
4. Click Send
5. Verify:
   - Loading state shows
   - Response appears in chat
   - Canvas shows compliance report (if applicable)

### Test with File Upload

1. Switch to "Compliance" mode
2. Upload a sample PDF file
3. Type: "Analyze this document for compliance"
4. Click Send
5. Verify:
   - File is uploaded
   - API is called with file context
   - Response includes file analysis

## Performance Testing

### Latency Benchmarks

```bash
# Test 10 requests
for i in {1..10}; do
  time curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
    -H "Content-Type: application/json" \
    -d '{"query": "What is RA 9003?"}'
done
```

**Expected:**
- First request: 8-10 seconds (cold start)
- Subsequent requests: 5-8 seconds
- Average: ~6-7 seconds

### Concurrent Requests

```bash
# Test 5 concurrent requests
for i in {1..5}; do
  curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"Test query $i\"}" &
done
wait
```

**Expected:**
- All requests complete successfully
- No significant slowdown
- No errors

## Troubleshooting

### Issue: API Not Responding

**Check:**
1. Is API server running?
   ```bash
   curl https://devkada.resqlink.org/api/research/health
   ```

2. Network connectivity?
   ```bash
   Resolve-DnsName devkada.resqlink.org
   ```

3. Firewall blocking?
   - Check if HTTPS port 443 is accessible

**Solution:**
- Contact API administrator
- Check server logs
- Verify API URL is correct

### Issue: Slow Response Times

**Possible Causes:**
- ChromaDB cold start (first request)
- Large result set
- Network latency

**Solutions:**
- First request is always slower (normal)
- Subsequent requests should be faster
- Consider caching frequent queries

### Issue: "No Results" for Valid Queries

**Possible Causes:**
- Query too vague
- Legislation not in database
- Search terms not matching

**Solutions:**
- Try more specific query
- Include RA numbers if known
- Try different keywords

### Issue: CORS Errors (Browser)

**Error:** "CORS policy: No 'Access-Control-Allow-Origin' header"

**Solution:**
- API must enable CORS for your domain
- Contact API administrator
- Use server-side API calls (Next.js API routes)

## Historical Sample Test Results

These examples show the expected response shape. They are not proof that the current hosted backend is healthy.

### Test 1: RA 9003 Query

**Request:**
```json
{
  "query": "What is RA 9003?",
  "user_id": "test_user"
}
```

**Response Time:** 6.2 seconds

**Response:**
```json
{
  "status": "completed",
  "query": "What is RA 9003?",
  "summary": "# EXECUTIVE SUMMARY\n\n**RA 9003** (Ecological Solid Waste Management Act of 2000) is Philippines' comprehensive solid waste management law...",
  "search_queries_used": ["RA 9003", "solid waste management", "ecological waste act"],
  "documents_found": 24
}
```

**Validation:** ✅ PASS

### Test 2: Workplace Safety

**Request:**
```json
{
  "query": "What are workplace safety requirements in Philippines?"
}
```

**Response Time:** 7.1 seconds

**Response:**
```json
{
  "status": "completed",
  "query": "What are workplace safety requirements in Philippines?",
  "summary": "# EXECUTIVE SUMMARY\n\nWorkplace safety in the Philippines is governed by...",
  "search_queries_used": ["workplace safety Philippines", "DOLE regulations", "occupational health"],
  "documents_found": 18
}
```

**Validation:** ✅ PASS

### Test 3: Invalid Query

**Request:**
```json
{
  "query": "RA"
}
```

**Response Time:** 0.1 seconds

**Response:**
```json
{
  "detail": "Query must be 5-500 characters"
}
```

**Validation:** ✅ PASS (Proper error handling)

## Next Steps

1. **Run Health Check** - Verify API is online
2. **Test Quick Queries** - Use pre-defined test queries
3. **Test Custom Queries** - Try your own questions
4. **Review Responses** - Check summary quality
5. **Integrate into Chat** - Use in actual chat interface

## Resources

- **Test Interface**: http://localhost:3000/test-rag
- **API Base URL**: https://devkada.resqlink.org
- **API Docs**: See `API_INSTRUCTIONS.md`
- **Service File**: `lib/api/rag-service.ts`

---

**Last Updated**: ${new Date().toLocaleDateString()}
**API Version**: 1.0.0
**Test Interface**: /test-rag
