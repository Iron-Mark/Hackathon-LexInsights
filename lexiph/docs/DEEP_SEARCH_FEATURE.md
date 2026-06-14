# Deep Search Feature Documentation

## Overview

The **Deep Search** feature provides enhanced analysis with comprehensive cross-referencing across the entire Philippine legislative database. It goes beyond the standard compliance analysis to identify related documents, additional insights, and cross-references.

## Current Runtime Status

The frontend is wired to the RAG API through `/api/research/rag-summary` with `use_deep_search: true`. Full E2E verification requires a reachable backend. The default hosted backend is `https://devkada.resqlink.org`; use `http://localhost:8000` only when running a compatible self-hosted backend and after updating `.env.local`.

## Features

### 🔍 Enhanced Analysis
- Cross-references 150+ related documents
- Identifies hidden connections between laws
- Provides comprehensive legal framework context

### 📊 Related Documents
- Shows most relevant legislation
- Displays relevance scores (0-100%)
- Includes excerpts and references

### 💡 Additional Insights
- Best practice recommendations
- Common compliance gaps
- Implementation roadmap suggestions

### 🔗 Cross References
- Links to related laws and regulations
- Supporting memorandums and circulars
- Implementing rules and regulations

---

## How to Use

### 1. **Access Deep Search**

After generating a compliance report:
1. Look for the **"Deep Search"** button in the header (with sparkle icon ✨)
2. Click the button to initiate deep search
3. Wait for processing. Deep search can take several minutes when the backend performs PDF extraction.

### 2. **View Results**

Deep search results appear at the top of the report with:
- Purple/iris gradient background
- Number of documents analyzed
- Expandable sections for different insights

### 3. **Review Insights**

The results include:
- **Related Documents** - Most relevant laws with relevance scores
- **Additional Insights** - Actionable recommendations
- **Cross References** - Related legislation to review

### 4. **Hide Results**

Click "Hide Deep Search Results" to collapse the section while keeping the original report visible.

---

## API Integration

### Current Status

Deep Search calls the real RAG endpoint through `/api/research/rag-summary` with `use_deep_search: true`. A mock helper still exists in `lib/services/deep-search-api.ts` for isolated development, but the chat UI uses the real API path.

### API Endpoint

```typescript
POST /api/research/rag-summary

Request:
{
  "query": "Perform comprehensive analysis",
  "user_id": "user-id",
  "use_deep_search": true
}

Response:
{
  "status": "completed",
  "query": "...",
  "enhanced_summary": "...",
  "related_documents": [...],
  "additional_insights": [...],
  "cross_references": [...],
  "documents_searched": 156,
  "processing_time": 3.2
}
```

### Development Fallback

`performDeepSearchMock()` remains available for isolated UI experiments when the backend is unavailable. It must not be used as proof of live RAG E2E.

### Related Documents (3 items)
```typescript
{
  title: "Republic Act No. 10121 - DRRM Act",
  relevance_score: 0.95,
  excerpt: "Comprehensive framework for disaster risk reduction...",
  reference: "RA 10121, Section 12"
}
```

### Additional Insights (4 items)
- Cross-reference requirements
- Integration suggestions
- Review recommendations
- Alignment guidance

### Cross References (4 items)
- Primary legislation
- Supporting regulations
- Memorandum circulars
- Implementing rules

---

## UI Components

### Button Design

The Deep Search button features:
- **Gradient background** - Iris to purple
- **Sparkles icon** - Indicates AI-powered feature
- **Loading state** - Spinning animation during processing
- **Disabled state** - Prevents multiple simultaneous searches

```tsx
<Button
  onClick={handleDeepSearch}
  variant="outline"
  size="sm"
  className="h-9 gap-2 bg-gradient-to-r from-iris-50 to-purple-50 border-iris-300 text-iris-700"
  disabled={isDeepSearching}
>
  <Sparkles className="h-4 w-4" />
  <span className="text-sm">Deep Search</span>
</Button>
```

### Results Display

The results section includes:
- **Header** - With sparkles icon and document count
- **Related Documents** - Cards with relevance scores
- **Additional Insights** - Bulleted list
- **Cross References** - Tag-style chips
- **Hide button** - Collapse functionality

---

## Performance

### Expected Timing

| Stage | Duration | Description |
|-------|----------|-------------|
| Request | <1s | Send request to API |
| Processing | Up to 3-5 minutes | Deep search analysis, including PDF extraction when enabled |
| Rendering | <1s | Display results |
| **Total** | **Backend-dependent** | End-to-end only passes when RAG health and query requests succeed |

### Optimization

- Results are cached in component state
- No re-fetch on hide/show toggle
- Lazy loading of related documents
- Efficient rendering with React keys

---

## Accessibility

### ARIA Labels
```tsx
aria-label="Perform deep search analysis"
aria-hidden="true" // For decorative icons
```

### Screen Reader Announcements
```typescript
const announcement = 'Deep search completed. Enhanced analysis available.'
// Announced via live region
```

### Keyboard Navigation
- Button is keyboard accessible
- Results section is focusable
- All interactive elements have focus states

---

## Error Handling

### Network Errors
```typescript
try {
  const result = await performDeepSearch(...)
  setDeepSearchResult(result)
} catch (error) {
  console.error('Deep search failed:', error)
  alert('Deep search failed. Please try again.')
  setShowDeepSearch(false)
}
```

### Timeout Handling
- 5-minute timeout (300 seconds)
- Graceful error message
- Automatic cleanup

### User Feedback
- Loading spinner during processing
- Success announcement on completion
- Error alert on failure

---

## Future Enhancements

### Planned Features

1. **Streaming Results**
   - Show results as they're found
   - Progressive enhancement
   - Real-time updates

2. **Export Deep Search**
   - Include in DOCX export
   - Separate deep search report
   - PDF generation

3. **Search History**
   - Save previous deep searches
   - Compare results over time
   - Track changes in legislation

4. **Custom Filters**
   - Filter by document type
   - Date range selection
   - Relevance threshold

5. **Interactive Cross-References**
   - Click to view full document
   - Inline previews
   - Citation management

---

## Testing

### Manual Testing

1. **Basic Functionality**
   ```
   1. Generate a compliance report
   2. Click "Deep Search" button
   3. Verify loading state appears
   4. Wait for results (3-5 seconds)
   5. Verify results display correctly
   6. Click "Hide" to collapse
   ```

2. **Error Scenarios**
   ```
   1. Test with network disconnected
   2. Verify error message appears
   3. Verify button re-enables
   ```

3. **Multiple Searches**
   ```
   1. Perform first deep search
   2. Hide results
   3. Perform second deep search
   4. Verify new results replace old
   ```

### Automated Testing (Future)

```typescript
describe('Deep Search', () => {
  it('should display loading state', () => {
    // Test loading spinner
  })
  
  it('should show results after completion', () => {
    // Test results display
  })
  
  it('should handle errors gracefully', () => {
    // Test error handling
  })
})
```

---

## Configuration

### Environment Variables

```env
# Deep Search API URL (same as RAG API)
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
```

### Mock Customization

For isolated UI work only, adjust mock data in `lib/services/deep-search-api.ts`:

```typescript
const mockResponse: DeepSearchResponse = {
  // Customize mock data here
  documents_searched: 200, // Change number
  related_documents: [...], // Add more documents
  additional_insights: [...], // Add more insights
}
```

---

## Troubleshooting

### Button Not Appearing
- Check if in edit mode (button only shows in preview mode)
- Verify component imports
- Check browser console for errors

### Results Not Displaying
- Check network tab for API calls
- Verify the configured RAG backend health check passes
- Check component state in React DevTools

### Slow Performance
- Check network latency
- Verify API response time
- Consider implementing caching

---

## Related Documentation

- `MARKDOWN_STYLING_GUIDE.md` - Report formatting
- `RAG_TESTING_QUICKSTART.md` - API testing
- `API_INSTRUCTIONS_NEW.md` - API specifications

---

## Support

For issues or questions:
1. Check browser console for errors
2. Review `lib/services/deep-search-api.ts` for API logic
3. Check `components/chat/compliance-canvas.tsx` for UI logic
4. Verify environment variables are set correctly

---

*Last updated: November 8, 2025*
