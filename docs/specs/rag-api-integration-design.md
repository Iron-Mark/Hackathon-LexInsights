# Design Document - RAG API Integration

## Overview

This design document outlines the technical architecture for integrating the Philippine Legislation Research API (RAG API) into the LexInSight application. The integration will provide intelligent legislation search and summarization capabilities through a well-structured service layer, state management, and UI components. The design follows the existing LexInSight architecture patterns using Next.js 14, TypeScript, Zustand for state management, and Tailwind CSS for styling.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      LexInSight Application                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐      ┌──────────────┐                     │
│  │ Chat Page    │      │ Test Page    │                     │
│  │ /chat        │      │ /test-rag    │                     │
│  └──────┬───────┘      └──────┬───────┘                     │
│         │                     │                              │
│         └──────────┬──────────┘                              │
│                    │                                         │
│         ┌──────────▼──────────┐                             │
│         │  UI Components      │                             │
│         │  - ChatContainer    │                             │
│         │  - ComplianceCanvas │                             │
│         │  - RAGTestComponent │                             │
│         └──────────┬──────────┘                             │
│                    │                                         │
│         ┌──────────▼──────────┐                             │
│         │  State Management   │                             │
│         │  - useRAGStore      │                             │
│         │  - useChatStore     │                             │
│         │  - useComplianceStore│                            │
│         └──────────┬──────────┘                             │
│                    │                                         │
│         ┌──────────▼──────────┐                             │
│         │  API Service Layer  │                             │
│         │  - rag-api.ts       │                             │
│         │  - queryRAG()       │                             │
│         │  - checkRAGHealth() │                             │
│         │  - RAGWebSocket     │                             │
│         └──────────┬──────────┘                             │
│                    │                                         │
└────────────────────┼─────────────────────────────────────────┘
                     │
                     │ HTTP/WebSocket
                     │
         ┌───────────▼───────────┐
         │   RAG API Server      │
         │   66.181.46.44:7767   │
         │                       │
         │  - /health            │
         │  - /simple-rag        │
         │  - /ws/simple-rag     │
         └───────────────────────┘
```

### Component Interaction Flow

```
User Query Flow:
1. User enters query in ChatContainer (Compliance Mode)
2. ChatContainer calls useRAGStore.submitQuery()
3. useRAGStore calls queryRAG() from API service
4. API service sends POST to RAG API
5. RAG API processes and returns response
6. useRAGStore updates state with response
7. ComplianceCanvas renders formatted summary

WebSocket Flow:
1. User enables real-time updates
2. useRAGStore.connectWebSocket() creates RAGWebSocket instance
3. WebSocket connects to ws://66.181.46.44:7767/ws/simple-rag
4. User submits query via WebSocket
5. RAG API streams progress events
6. useRAGStore updates state with each event
7. UI displays real-time progress indicators
8. Final summary rendered in ComplianceCanvas
```

## Components and Interfaces

### 1. API Service Layer (`lib/services/rag-api.ts`)

**Purpose:** Encapsulate all RAG API communication logic with proper TypeScript types and error handling.

**Key Functions:**

```typescript
// Simple RAG query
export async function queryRAG(params: RAGQuery): Promise<RAGResponse>

// Health check
export async function checkRAGHealth(): Promise<HealthResponse>

// WebSocket class for streaming
export class RAGWebSocket {
  connect(onMessage: (event: any) => void, onError?: (error: any) => void): void
  sendQuery(query: string): void
  disconnect(): void
}
```

**TypeScript Interfaces:**

```typescript
interface RAGQuery {
  query: string
  user_id?: string
}

interface RAGResponse {
  status: 'completed' | 'no_results' | 'error'
  query: string
  summary: string
  search_queries_used: string[]
  documents_found: number
}

interface RAGError {
  detail: string
}

interface HealthResponse {
  status: string
  service: string
}

interface WebSocketEvent {
  stage: 'query_generation' | 'search' | 'summarization'
  status: 'started' | 'in_progress' | 'completed' | 'error'
  message: string
  data?: any
}
```

**Error Handling:**
- Network errors: Catch and throw descriptive error messages
- HTTP errors: Parse error response and throw with status code
- Timeout: 30-second timeout for all requests
- Retry logic: Not implemented in service layer (handled by store)

### 2. State Management (`lib/store/rag-store.ts`)

**Purpose:** Manage RAG query state, responses, loading states, and WebSocket connections.

**Store Structure:**

```typescript
interface RAGStore {
  // State
  currentQuery: string | null
  currentResponse: RAGResponse | null
  loading: boolean
  error: string | null
  wsConnected: boolean
  wsEvents: WebSocketEvent[]
  queryHistory: RAGQueryHistory[]
  
  // Actions
  submitQuery: (query: string, userId?: string) => Promise<void>
  clearError: () => void
  connectWebSocket: () => void
  disconnectWebSocket: () => void
  sendWebSocketQuery: (query: string) => void
  checkHealth: () => Promise<HealthResponse>
  addToHistory: (query: string, response: RAGResponse) => void
  clearHistory: () => void
}

interface RAGQueryHistory {
  id: string
  query: string
  response: RAGResponse
  timestamp: Date
}
```

**Integration with Existing Stores:**
- Works alongside `useChatStore` for chat history
- Integrates with `useComplianceStore` for version management
- Uses `useChatModeStore` to detect compliance mode

### 3. UI Components

#### a. Enhanced ChatContainer (`components/chat/chat-container.tsx`)

**Changes Required:**
- Detect compliance mode from `useChatModeStore`
- When in compliance mode, use `useRAGStore.submitQuery()` instead of mock responses
- Display loading state during RAG query processing
- Show error messages from RAG store
- Add real-time progress indicators for WebSocket mode

**New Props:**
```typescript
interface ChatContainerProps {
  messages: Message[]
  onSendMessage?: (content: string) => void
  enableRAG?: boolean // Enable RAG integration
  enableWebSocket?: boolean // Enable real-time updates
}
```

#### b. Enhanced ComplianceCanvas (`components/chat/compliance-canvas.tsx`)

**Changes Required:**
- Accept RAG response as prop
- Render search queries used as tags
- Display document count badge
- Improve markdown rendering for RAG summaries
- Add metadata section showing query details

**New Props:**
```typescript
interface ComplianceCanvasProps {
  content: string
  fileName?: string
  ragResponse?: RAGResponse // New: RAG metadata
  searchQueries?: string[] // New: Display search queries
  documentCount?: number // New: Display document count
}
```

#### c. RAG Test Component (`components/test/rag-test.tsx`)

**Purpose:** Comprehensive testing interface for RAG API integration.

**Features:**
- Health check button with status indicator
- Sample query buttons (8+ queries)
- Query input textarea with character limit
- Simple RAG test button
- WebSocket connection toggle
- WebSocket event stream display
- Response visualization with formatted output
- Error display with retry button

**Component Structure:**
```typescript
export function RAGTestComponent() {
  // State management
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<RAGResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<string | null>(null)
  const [wsConnected, setWsConnected] = useState(false)
  const [wsEvents, setWsEvents] = useState<WebSocketEvent[]>([])
  
  // Test functions
  const handleTestRAG = async () => { /* ... */ }
  const handleHealthCheck = async () => { /* ... */ }
  const handleWebSocketTest = () => { /* ... */ }
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Health Check Card */}
      {/* Sample Queries Card */}
      {/* Query Input Card */}
      {/* WebSocket Events Card */}
      {/* Error Display Card */}
      {/* Response Display Card */}
    </div>
  )
}
```

#### d. RAG Progress Indicator (`components/chat/rag-progress.tsx`)

**Purpose:** Display real-time progress during RAG query processing.

**Component Structure:**
```typescript
interface RAGProgressProps {
  events: WebSocketEvent[]
  isComplete: boolean
}

export function RAGProgress({ events, isComplete }: RAGProgressProps) {
  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div key={index} className="flex items-center gap-2">
          <StatusIcon status={event.status} />
          <span className="text-sm">{event.message}</span>
        </div>
      ))}
    </div>
  )
}
```

**Progress Stages:**
1. Query Generation: "Generating search queries..."
2. Search: "Searching legislation database..."
3. Summarization: "Generating summary..."
4. Complete: "Summary ready"

### 4. Test Page (`app/test-rag/page.tsx`)

**Purpose:** Dedicated page for testing RAG API integration.

**Route:** `/test-rag`

**Layout:**
```typescript
export default function TestRAGPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <RAGTestComponent />
    </div>
  )
}
```

## Data Models

### RAG Query Model

```typescript
interface RAGQuery {
  query: string // User's natural language question (max 500 chars)
  user_id?: string // Optional user identifier for tracking
}
```

**Validation Rules:**
- `query`: Required, 10-500 characters
- `user_id`: Optional, alphanumeric string

### RAG Response Model

```typescript
interface RAGResponse {
  status: 'completed' | 'no_results' | 'error'
  query: string // Original query
  summary: string // Markdown-formatted summary
  search_queries_used: string[] // Generated search queries
  documents_found: number // Number of relevant documents
}
```

**Response Types:**
- `completed`: Successful query with results
- `no_results`: Query processed but no relevant documents found
- `error`: Processing error occurred

### WebSocket Event Model

```typescript
interface WebSocketEvent {
  stage: 'query_generation' | 'search' | 'summarization'
  status: 'started' | 'in_progress' | 'completed' | 'error'
  message: string // Human-readable progress message
  timestamp?: string // ISO timestamp
  data?: {
    queries_generated?: number
    documents_found?: number
    summary?: string
  }
}
```

### Query History Model

```typescript
interface RAGQueryHistory {
  id: string // Unique identifier
  query: string // Original query
  response: RAGResponse // Full response
  timestamp: Date // When query was submitted
  userId?: string // User who submitted query
  mode: 'http' | 'websocket' // How query was submitted
}
```

**Storage:**
- Stored in Zustand store with persistence
- Limited to last 50 queries per user
- Cleared on logout

## Integration Points

### 1. Chat Mode Integration

**Location:** `components/chat/chat-container.tsx`

**Implementation:**
```typescript
const { mode } = useChatModeStore()
const { submitQuery, currentResponse, loading, error } = useRAGStore()

const handleSendMessage = async (content: string) => {
  if (mode === 'compliance') {
    // Use RAG API
    await submitQuery(content, user?.id)
  } else {
    // Use existing chat logic
    // ...
  }
}
```

### 2. Compliance Canvas Integration

**Location:** `components/chat/compliance-canvas.tsx`

**Implementation:**
```typescript
const { currentResponse } = useRAGStore()

// Pass RAG response to canvas
<ComplianceCanvas
  content={currentResponse?.summary || ''}
  ragResponse={currentResponse}
  searchQueries={currentResponse?.search_queries_used}
  documentCount={currentResponse?.documents_found}
/>
```

### 3. Message History Integration

**Location:** `lib/store/chat-store.ts`

**Implementation:**
```typescript
// Add RAG response to chat history
const addRAGMessage = (query: string, response: RAGResponse) => {
  const userMessage: Message = {
    id: generateId(),
    role: 'user',
    content: query,
    created_at: new Date().toISOString(),
  }
  
  const assistantMessage: Message = {
    id: generateId(),
    role: 'assistant',
    content: response.summary,
    created_at: new Date().toISOString(),
    metadata: {
      ragResponse: response,
      searchQueries: response.search_queries_used,
      documentCount: response.documents_found,
    }
  }
  
  // Add to chat history
  addMessages([userMessage, assistantMessage])
}
```

## Error Handling

### Error Types and Handling Strategy

#### 1. Network Errors

**Scenario:** API server unreachable, network timeout

**Handling:**
```typescript
try {
  const response = await queryRAG(params)
} catch (error) {
  if (error.message.includes('fetch')) {
    setError('Unable to connect to RAG service. Please check your internet connection.')
  }
}
```

**User Experience:**
- Display error message in chat
- Show retry button
- Suggest checking internet connection

#### 2. Validation Errors (HTTP 400)

**Scenario:** Query too short, too long, or invalid format

**Handling:**
```typescript
if (response.status === 400) {
  const errorData = await response.json()
  setError(`Invalid query: ${errorData.detail}`)
}
```

**User Experience:**
- Display validation message
- Highlight query input field
- Show character count and limits

#### 3. Server Errors (HTTP 500)

**Scenario:** RAG service internal error

**Handling:**
```typescript
if (response.status === 500) {
  setError('RAG service is experiencing issues. Please try again later.')
  // Log error for monitoring
  console.error('RAG API Error:', error)
}
```

**User Experience:**
- Display generic error message
- Offer to retry
- Log error for debugging

#### 4. Timeout Errors

**Scenario:** Request takes longer than 30 seconds

**Handling:**
```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 30000)

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ...
  })
} catch (error) {
  if (error.name === 'AbortError') {
    setError('Request timed out. The query may be too complex.')
  }
}
```

**User Experience:**
- Display timeout message
- Suggest simplifying query
- Offer to retry

#### 5. WebSocket Errors

**Scenario:** WebSocket connection fails or disconnects

**Handling:**
```typescript
ws.onerror = (error) => {
  console.error('WebSocket error:', error)
  setWsConnected(false)
  setError('Real-time connection lost. Falling back to standard mode.')
}

ws.onclose = () => {
  setWsConnected(false)
  // Attempt reconnection after 5 seconds
  setTimeout(() => {
    if (shouldReconnect) {
      connectWebSocket()
    }
  }, 5000)
}
```

**User Experience:**
- Display connection status indicator
- Automatically attempt reconnection
- Fall back to HTTP mode if WebSocket unavailable

### Error Recovery Strategies

1. **Automatic Retry:** For network errors, retry up to 3 times with exponential backoff
2. **Fallback Mode:** If WebSocket fails, fall back to HTTP polling
3. **Graceful Degradation:** If RAG API unavailable, show cached results or suggest alternative
4. **User Notification:** Always inform user of errors with actionable messages

## Testing Strategy

### 1. Unit Tests

**Test Files:**
- `lib/services/rag-api.test.ts`
- `lib/store/rag-store.test.ts`

**Test Cases:**
```typescript
describe('RAG API Service', () => {
  test('queryRAG returns valid response for valid query', async () => {
    const response = await queryRAG({ query: 'What is RA 9003?' })
    expect(response.status).toBe('completed')
    expect(response.summary).toBeTruthy()
  })
  
  test('queryRAG throws error for invalid query', async () => {
    await expect(queryRAG({ query: 'RA' })).rejects.toThrow()
  })
  
  test('checkRAGHealth returns status', async () => {
    const health = await checkRAGHealth()
    expect(health.status).toBe('ok')
  })
  
  test('RAGWebSocket connects successfully', () => {
    const ws = new RAGWebSocket()
    const onMessage = jest.fn()
    ws.connect(onMessage)
    expect(ws.isConnected()).toBe(true)
  })
})
```

### 2. Integration Tests

**Test Scenarios:**
1. **End-to-End Query Flow:**
   - User submits query in compliance mode
   - RAG API processes query
   - Response displayed in compliance canvas
   - Query added to history

2. **WebSocket Streaming:**
   - Connect WebSocket
   - Send query
   - Receive progress events
   - Display final summary

3. **Error Handling:**
   - Network error triggers retry
   - Validation error shows message
   - Timeout displays appropriate error

### 3. Manual Testing

**Test Page:** `/test-rag`

**Test Checklist:**
- [ ] Health check returns "ok" status
- [ ] Sample queries populate input field
- [ ] Simple RAG query returns formatted summary
- [ ] WebSocket connects and streams events
- [ ] Error messages display correctly
- [ ] Retry button works after error
- [ ] Response renders with proper formatting
- [ ] Search queries display as tags
- [ ] Document count shows correctly
- [ ] Loading indicators appear during processing

### 4. Performance Testing

**Metrics to Track:**
- Health check response time: < 1 second
- Simple query response time: 5-10 seconds
- Complex query response time: 10-15 seconds
- WebSocket connection time: < 2 seconds
- UI render time: < 100ms

**Load Testing:**
- Test with 10 concurrent queries
- Verify no memory leaks with WebSocket
- Check performance with large summaries (5000+ chars)

## Security Considerations

### 1. API Key Management

**Current:** No API key required for RAG API

**Future:** If API keys are added:
- Store in environment variables
- Never expose in client-side code
- Use server-side proxy for API calls

### 2. Input Validation

**Client-Side:**
- Validate query length (10-500 chars)
- Sanitize input to prevent XSS
- Rate limit queries (max 10 per minute)

**Server-Side:**
- RAG API handles validation
- Returns 400 for invalid queries

### 3. CORS Configuration

**Current:** RAG API should have CORS enabled for `http://localhost:3000`

**Production:** Update CORS to allow production domain

### 4. Data Privacy

**User Queries:**
- Store queries locally in browser
- Associate with user_id for tracking
- Clear on logout
- No sensitive data sent to RAG API

**Compliance:**
- Follow GDPR guidelines for data storage
- Provide option to clear query history
- No PII in queries

## Performance Optimization

### 1. Caching Strategy

**Query Response Caching:**
```typescript
// Cache responses for 1 hour
const cacheKey = `rag_${hashQuery(query)}`
const cached = localStorage.getItem(cacheKey)

if (cached) {
  const { response, timestamp } = JSON.parse(cached)
  if (Date.now() - timestamp < 3600000) {
    return response
  }
}
```

**Benefits:**
- Reduce API calls for repeated queries
- Faster response for common questions
- Lower server load

### 2. Request Debouncing

**Implementation:**
```typescript
const debouncedSubmit = useMemo(
  () => debounce((query: string) => submitQuery(query), 500),
  []
)
```

**Benefits:**
- Prevent multiple rapid submissions
- Reduce unnecessary API calls
- Improve user experience

### 3. Lazy Loading

**Components:**
- Load RAGTestComponent only when `/test-rag` is accessed
- Lazy load WebSocket class until needed
- Code split RAG-related components

**Implementation:**
```typescript
const RAGTestComponent = dynamic(() => import('@/components/test/rag-test'), {
  loading: () => <div>Loading test interface...</div>
})
```

### 4. Response Streaming

**WebSocket Advantage:**
- Stream summary as it's generated
- Display partial results immediately
- Better perceived performance

## Accessibility

### 1. ARIA Labels

**Interactive Elements:**
```typescript
<Button
  onClick={handleTestRAG}
  aria-label="Submit query to RAG API"
  aria-busy={loading}
>
  Test RAG
</Button>
```

### 2. Loading States

**Screen Reader Announcements:**
```typescript
<div role="status" aria-live="polite" aria-atomic="true">
  {loading && 'Processing your query...'}
  {error && `Error: ${error}`}
  {response && 'Summary ready'}
</div>
```

### 3. Keyboard Navigation

**Requirements:**
- All buttons accessible via Tab
- Enter key submits query
- Escape key closes modals
- Focus management for dynamic content

### 4. Color Contrast

**WCAG AA Compliance:**
- Text: 4.5:1 contrast ratio
- Interactive elements: 3:1 contrast ratio
- Error messages: High contrast red
- Success indicators: High contrast green

## Deployment Considerations

### 1. Environment Variables

**Required:**
```env
NEXT_PUBLIC_RAG_API_URL=http://66.181.46.44:7767
NEXT_PUBLIC_RAG_WS_URL=ws://66.181.46.44:7767
```

### 2. Build Configuration

**Next.js Config:**
```javascript
// next.config.js
module.exports = {
  env: {
    RAG_API_URL: process.env.NEXT_PUBLIC_RAG_API_URL,
  },
}
```

### 3. Production Checklist

- [ ] Update API URLs for production
- [ ] Configure CORS on RAG API
- [ ] Set up error monitoring (Sentry)
- [ ] Enable response caching
- [ ] Test WebSocket in production environment
- [ ] Verify SSL/TLS for WebSocket (wss://)
- [ ] Set up health check monitoring
- [ ] Configure rate limiting

## Future Enhancements

### 1. Advanced Features

- **Query Suggestions:** Auto-complete based on common queries
- **Related Questions:** Suggest follow-up questions
- **Citation Links:** Link to actual legislation documents
- **Export Options:** PDF, DOCX export of summaries
- **Bookmarking:** Save favorite queries and responses

### 2. Performance Improvements

- **Server-Side Rendering:** Pre-render common queries
- **Edge Caching:** Cache responses at CDN edge
- **Batch Queries:** Submit multiple queries at once
- **Progressive Enhancement:** Show partial results while loading

### 3. Analytics

- **Query Analytics:** Track most common queries
- **Performance Metrics:** Monitor response times
- **Error Tracking:** Log and analyze errors
- **User Behavior:** Understand usage patterns

## Conclusion

This design provides a comprehensive, scalable architecture for integrating the RAG API into LexInSight. The modular approach ensures maintainability, the TypeScript types provide safety, and the error handling ensures reliability. The testing strategy validates functionality, and the performance optimizations ensure a smooth user experience.

The design follows LexInSight's existing patterns and integrates seamlessly with the current chat and compliance features, providing users with powerful legislation research capabilities backed by authoritative sources.
