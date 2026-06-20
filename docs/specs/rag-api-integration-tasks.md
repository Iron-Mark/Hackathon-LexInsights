# Implementation Plan - RAG API Integration

- [x] 1. Create API Service Layer


  - Create `lib/services/rag-api.ts` with TypeScript interfaces for RAGQuery, RAGResponse, RAGError, HealthResponse, and WebSocketEvent
  - Implement `queryRAG()` function with fetch API, error handling, and 30-second timeout
  - Implement `checkRAGHealth()` function for health check endpoint
  - Implement `RAGWebSocket` class with connect, sendQuery, and disconnect methods
  - Add sample queries array (SAMPLE_QUERIES) with 8+ Philippine legislation queries
  - _Requirements: 1.1, 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_



- [ ] 2. Create RAG State Management Store
  - Create `lib/store/rag-store.ts` using Zustand
  - Define RAGStore interface with state properties (currentQuery, currentResponse, loading, error, wsConnected, wsEvents, queryHistory)
  - Implement `submitQuery()` action that calls queryRAG service and updates state
  - Implement `checkHealth()` action for health monitoring
  - Implement `connectWebSocket()` and `disconnectWebSocket()` actions for WebSocket management
  - Implement `sendWebSocketQuery()` action for sending queries via WebSocket
  - Implement `addToHistory()` and `clearHistory()` actions for query history management


  - Add error handling and loading state management
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 4.3, 4.5, 9.1, 9.2, 9.3, 9.4_

- [ ] 3. Create RAG Test Component
  - Create `components/test/rag-test.tsx` component
  - Add health check section with status indicator and test button
  - Add sample queries section with 8+ clickable query buttons
  - Add query input section with textarea (500 char limit) and submit buttons
  - Add WebSocket connection toggle button with connection status indicator
  - Add WebSocket events display section showing real-time progress


  - Add error display card with retry functionality
  - Add response display card with formatted summary, search queries tags, and document count
  - Style with Tailwind CSS using Blue Iris color palette
  - _Requirements: 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.3, 10.4_



- [ ] 4. Create Test Page Route
  - Create `app/test-rag/page.tsx` for dedicated RAG testing
  - Import and render RAGTestComponent
  - Add page layout with proper spacing and background
  - _Requirements: 10.1_



- [ ] 5. Create RAG Progress Indicator Component
  - Create `components/chat/rag-progress.tsx` component
  - Display WebSocket events as progress steps with icons
  - Show stage indicators (query generation, search, summarization)
  - Add loading animations for in-progress stages
  - Style with appropriate colors for different statuses


  - _Requirements: 2.2, 2.3, 2.4_

- [ ] 6. Enhance ComplianceCanvas for RAG Integration
  - Update `components/chat/compliance-canvas.tsx` to accept RAG response props
  - Add ragResponse, searchQueries, and documentCount to ComplianceCanvasProps interface
  - Display search queries as styled tags below the header
  - Display document count badge in the header
  - Add metadata section showing query details when RAG response is present


  - Improve markdown rendering for RAG-formatted summaries
  - _Requirements: 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 7. Integrate RAG into ChatContainer
  - Update `components/chat/chat-container.tsx` to use RAG store
  - Import useRAGStore and useChatModeStore
  - Detect compliance mode and route queries to RAG API when active
  - Display RAG loading state with progress indicator
  - Show RAG errors with retry button
  - Pass RAG response to ComplianceCanvas component
  - Add real-time progress display for WebSocket mode
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2_





- [ ] 8. Integrate RAG Responses into Chat History
  - Update `lib/store/chat-store.ts` to handle RAG responses
  - Add metadata field to Message type for storing RAG response data
  - Implement addRAGMessage function to add both user query and assistant response


  - Store search queries and document count in message metadata
  - Ensure RAG messages persist in chat history
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9. Add Environment Configuration


  - Create or update `.env.local` with RAG API URLs
  - Add NEXT_PUBLIC_RAG_API_URL variable
  - Add NEXT_PUBLIC_RAG_WS_URL variable
  - Update `lib/services/rag-api.ts` to use environment variables
  - _Requirements: 3.1, 3.2_




- [ ] 10. Add Error Handling and Recovery
  - Implement automatic retry logic with exponential backoff (max 3 retries)
  - Add WebSocket reconnection logic with 5-second delay
  - Implement timeout handling for requests exceeding 30 seconds
  - Add fallback from WebSocket to HTTP mode on connection failure
  - Display user-friendly error messages for all error types
  - _Requirements: 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 8.5_

- [ ] 11. Implement Query Response Caching
  - Add localStorage caching for RAG responses (1-hour TTL)
  - Create cache key using query hash
  - Check cache before making API calls
  - Implement cache invalidation logic
  - _Requirements: 8.1, 8.2_

- [ ] 12. Add Performance Optimizations
  - Implement request debouncing (500ms) for query submissions
  - Add lazy loading for RAGTestComponent using Next.js dynamic imports
  - Optimize WebSocket message parsing
  - Add loading skeletons for better perceived performance
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 13. Implement Accessibility Features
  - Add ARIA labels to all interactive elements
  - Implement screen reader announcements for loading states and errors
  - Add keyboard navigation support (Tab, Enter, Escape)
  - Ensure WCAG AA color contrast ratios for all text
  - Add focus management for dynamic content
  - _Requirements: 7.5_

- [ ]* 14. Create Documentation
  - Create `docs/RAG-API-INTEGRATION.md` with integration guide
  - Document API service functions and TypeScript interfaces
  - Add usage examples for RAG store
  - Create troubleshooting guide for common issues
  - Document test scenarios and expected results
  - _Requirements: 10.5_

- [ ]* 15. Write Unit Tests
  - Create `lib/services/rag-api.test.ts` for API service tests
  - Test queryRAG with valid and invalid queries
  - Test checkRAGHealth function
  - Test RAGWebSocket connection and message handling
  - Create `lib/store/rag-store.test.ts` for store tests
  - Test all store actions and state updates
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ]* 16. Perform Integration Testing
  - Test end-to-end query flow from ChatContainer to ComplianceCanvas
  - Test WebSocket streaming with real-time progress updates
  - Test error handling for network errors, validation errors, and timeouts
  - Verify query history persistence across sessions
  - Test cache functionality with repeated queries
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 9.1, 9.2, 9.3_

- [ ]* 17. Conduct Performance Testing
  - Measure health check response time (target: < 1 second)
  - Measure simple query response time (target: 5-10 seconds)
  - Measure WebSocket connection time (target: < 2 seconds)
  - Test with 10 concurrent queries for load testing
  - Check for memory leaks with prolonged WebSocket usage
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
