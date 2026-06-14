# RAG API Integration Guide

## Overview

The Philippine Legislation Research API (RAG API) is now integrated into LexInSight, providing intelligent legislation search and summarization capabilities in compliance mode.

## Current Endpoint

Use the hosted HTTPS endpoint by default:

```env
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
```

The older raw IP endpoint is deprecated for this frontend. Full E2E testing requires the hosted health check to respond successfully.

## Quick Start

### 1. Test the Integration

Navigate to the test page to verify the API is working:

```
http://localhost:3000/test-rag
```

**Test Steps:**
1. Click "Check Status" to verify API health
2. Select a sample query or enter your own
3. Click "Test Simple RAG" to see results
4. Try "Connect WebSocket" for real-time updates

### 2. Use in Compliance Mode

1. Go to the chat page: `http://localhost:3000/chat`
2. Switch to "Compliance" mode using the toggle
3. Ask a question about Philippine legislation
4. View the formatted summary in the compliance canvas

## Features

### ✅ Implemented

- **API Service Layer** - TypeScript service with full type safety
- **State Management** - Zustand store for RAG queries and responses
- **Test Interface** - Comprehensive testing UI at `/test-rag`
- **Chat Integration** - RAG queries in compliance mode
- **Progress Indicators** - Real-time progress for WebSocket queries
- **Error Handling** - Automatic retry with exponential backoff
- **Response Caching** - 1-hour cache for repeated queries
- **Performance Optimizations** - Debouncing, lazy loading, code splitting
- **Accessibility** - ARIA labels, keyboard navigation, screen reader support

### 🔄 WebSocket Streaming

Enable real-time progress updates:

```typescript
import { useRAGStore } from '@/lib/store/rag-store'

const { connectWebSocket, sendWebSocketQuery } = useRAGStore()

// Connect
connectWebSocket()

// Send query
sendWebSocketQuery('What is RA 9003?', userId)
```

### 💾 Response Caching

Responses are automatically cached for 1 hour:

```typescript
// First query - hits API
await submitQuery('What is RA 9003?')

// Second query (within 1 hour) - uses cache
await submitQuery('What is RA 9003?') // Instant response
```

## API Endpoints

### Health Check

```bash
GET https://devkada.resqlink.org/api/research/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "simple_rag"
}
```

### Simple RAG Query

```bash
POST https://devkada.resqlink.org/api/research/rag-summary
Content-Type: application/json

{
  "query": "What is RA 9003?",
  "user_id": "optional_user_id"
}
```

**Response:**
```json
{
  "status": "completed",
  "query": "What is RA 9003?",
  "summary": "# EXECUTIVE SUMMARY\n\n**RA 9003**...",
  "search_queries_used": ["RA 9003", "solid waste management"],
  "documents_found": 15
}
```

### WebSocket Streaming

```javascript
const ws = new WebSocket('wss://devkada.resqlink.org/api/research/ws/rag-summary')

ws.onopen = () => {
  ws.send(JSON.stringify({ 
    query: 'What is RA 9003?',
    user_id: 'optional_user_id'
  }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Progress:', data.stage, data.message)
}
```

## Usage Examples

### Basic Query

```typescript
import { useRAGStore } from '@/lib/store/rag-store'

function MyComponent() {
  const { submitQuery, currentResponse, loading, error } = useRAGStore()
  
  const handleQuery = async () => {
    await submitQuery('What is RA 9003?', userId)
  }
  
  return (
    <div>
      <button onClick={handleQuery} disabled={loading}>
        Submit Query
      </button>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      {currentResponse && <pre>{currentResponse.summary}</pre>}
    </div>
  )
}
```

### With Progress Indicator

```typescript
import { useRAGStore } from '@/lib/store/rag-store'
import { RAGProgress } from '@/components/chat/rag-progress'

function MyComponent() {
  const { wsEvents, loading, currentResponse } = useRAGStore()
  
  return (
    <div>
      {loading && (
        <RAGProgress 
          events={wsEvents} 
          isComplete={!!currentResponse} 
        />
      )}
    </div>
  )
}
```

### Display in Compliance Canvas

```typescript
import { ComplianceCanvas } from '@/components/chat/compliance-canvas'
import { useRAGStore } from '@/lib/store/rag-store'

function MyComponent() {
  const { currentResponse } = useRAGStore()
  
  return (
    <ComplianceCanvas
      content={currentResponse?.summary || ''}
      ragResponse={currentResponse}
      searchQueries={currentResponse?.search_queries_used}
      documentCount={currentResponse?.documents_found}
    />
  )
}
```

## Environment Variables

Required environment variables in `.env.local`:

```env
# RAG API Configuration
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
```

## Error Handling

The integration includes comprehensive error handling:

### Network Errors
- Automatic retry (up to 3 attempts)
- Exponential backoff delay
- User-friendly error messages

### Validation Errors
- Query length validation (10-500 characters)
- Clear error messages
- Input field highlighting

### Timeout Errors
- 30-second timeout for all requests
- Timeout message with retry option
- Suggestion to simplify query

### WebSocket Errors
- Automatic reconnection after 5 seconds
- Fallback to HTTP mode
- Connection status indicator

## Performance

### Benchmarks

- Health check: < 1 second
- Simple queries: 5-8 seconds
- Complex queries: 8-12 seconds
- WebSocket connection: < 2 seconds
- Cached responses: < 100ms

### Optimizations

1. **Response Caching** - 1-hour TTL for repeated queries
2. **Request Debouncing** - 500ms delay to prevent rapid submissions
3. **Lazy Loading** - Test component loaded on demand
4. **Code Splitting** - Separate bundles for RAG features

## Troubleshooting

### API Not Responding

1. Check health endpoint:
   ```bash
   curl https://devkada.resqlink.org/api/research/health
   ```

2. Verify environment variables are set
3. Check network connectivity
4. Review browser console for errors

### WebSocket Connection Failed

1. Verify WebSocket URL in `.env.local`
2. Check browser WebSocket support
3. Try HTTP mode as fallback
4. Review connection status in test page

### No Results Found

1. Try different keywords
2. Use specific law numbers (e.g., "RA 9003")
3. Check sample queries for examples
4. Verify query length (10-500 characters)

### Cache Issues

Clear cache manually:

```javascript
// In browser console
Object.keys(localStorage)
  .filter(key => key.startsWith('rag_cache_'))
  .forEach(key => localStorage.removeItem(key))
```

## Sample Queries

Try these queries to test the integration:

1. **Specific Law**: "What is RA 9003 and its main requirements?"
2. **General Topic**: "What are workplace safety requirements in Philippines?"
3. **Environmental**: "Tell me about environmental protection laws"
4. **Waste Management**: "What legislation covers solid waste management?"
5. **Data Privacy**: "What is the Data Privacy Act of 2012?"
6. **Business**: "What are the requirements for business permits?"
7. **Labor**: "What laws govern labor and employment?"
8. **Specific Act**: "What is RA 10173 about?"

## Next Steps

### Recommended Enhancements

1. **Query Suggestions** - Auto-complete based on common queries
2. **Related Questions** - Suggest follow-up questions
3. **Citation Links** - Link to actual legislation documents
4. **Export Options** - PDF/DOCX export of summaries
5. **Bookmarking** - Save favorite queries and responses

### Production Checklist

- [ ] Update API URLs for production environment
- [ ] Configure CORS on RAG API server
- [ ] Set up error monitoring (Sentry)
- [ ] Enable response caching at CDN level
- [ ] Test WebSocket with SSL (wss://)
- [ ] Configure rate limiting
- [ ] Set up health check monitoring
- [ ] Review and optimize cache TTL

## Support

For issues or questions:

1. Check the test page: `/test-rag`
2. Review browser console for errors
3. Check API health status
4. Verify environment configuration

## Resources

- **Test Page**: `http://localhost:3000/test-rag`
- **API Base URL**: `https://devkada.resqlink.org`
- **Spec Document**: `.kiro/specs/rag-api-integration/`
- **Design Document**: `.kiro/specs/rag-api-integration/design.md`

---

**Last Updated**: ${new Date().toLocaleDateString()}
**Version**: 1.0.0
