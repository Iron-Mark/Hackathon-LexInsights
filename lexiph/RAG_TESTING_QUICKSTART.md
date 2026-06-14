# RAG API Testing - Quick Start Guide

## Prerequisites

1. **Reachable RAG API Server**
   - The default backend is `https://devkada.resqlink.org`
   - Check with: `curl https://devkada.resqlink.org/api/research/health`
   - For self-hosted development, run a compatible backend locally and set `NEXT_PUBLIC_RAG_API_URL=http://localhost:8000`

2. **Environment Variables**
   - Copy `.env.example` to `.env.local`
   - Keep `NEXT_PUBLIC_USE_RAG_PROXY=true` unless the backend allows browser CORS directly
   - Update the RAG API URL only when using a different reachable backend

## Quick Test (Browser)

1. **Start the development server:**
   ```bash
   cd lexiph
   npm run dev
   ```

2. **Open the test page:**
   ```
   http://localhost:3000/test-rag
   ```

3. **Test the API:**
   - Click "Check API Health" to verify connection
   - Try a sample query or enter your own
   - Wait 50-90 seconds for results
   - Review the response metadata and summary

## Quick Test (Command Line)

```bash
# Health check
curl https://devkada.resqlink.org/api/research/health

# Test query
curl -X POST https://devkada.resqlink.org/api/research/rag-summary \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test"}' \
  --max-time 300
```

If the hosted health check times out, use a known-good local backend and update `.env.local` before running the browser flow.

## Test in Chat Interface

1. Navigate to `http://localhost:3000/chat`
2. Switch to "Compliance Mode" (toggle at bottom)
3. Enter a query: "What is RA 9003 and its requirements?"
4. Wait for the AI response (50-90 seconds)

## Sample Queries to Try

1. `What is RA 9003 and its main requirements?`
2. `What are workplace safety requirements in Philippines?`
3. `Tell me about the Data Privacy Act of 2012`
4. `What legislation covers solid waste management?`
5. `What are the penalties for environmental violations?`

## Expected Behavior

### Successful Response
- Status: `completed`
- Documents found: 10-50+
- Summary: 8-section markdown report
- Duration: 50-90 seconds

### Response Sections
1. Executive Summary
2. Applicable Legislation
3. Key Provisions
4. Who Is Affected
5. Compliance Timeline
6. Penalties
7. Related Laws
8. Resources & Next Steps

## Troubleshooting

### "API is unavailable"
- Check if RAG server is running
- Verify URL in `.env.local`
- Check firewall/network settings

### "Request timed out"
- Normal timeout is 300 seconds (5 minutes)
- If timing out before 90 seconds, check server logs
- Try a simpler query first

### No results or empty summary
- Verify query is related to Philippine legislation
- Check API server logs for errors
- Try one of the sample queries

## Files Updated

### API Integration
- `lib/services/rag-api.ts` - Main API client
- `lib/api/rag-service.ts` - Alternative API service
- `lib/store/rag-store.ts` - State management

### Testing
- `app/test-rag/page.tsx` - Browser test page
- `tests/rag-api-test.ts` - Node.js test script
- `tests/README.md` - Detailed testing guide

### Configuration
- `.env.example` - Environment variable template
- `RAG_TESTING_QUICKSTART.md` - This file

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/research/health` | GET | Health check |
| `/api/research/rag-summary` | POST | Main RAG query |
| `/api/research/ws/rag-summary` | WebSocket | Streaming updates |

## Next Steps

1. Test with the browser interface first
2. Try different types of queries
3. Monitor response times
4. Check the full summary output
5. Integrate into your chat workflow

## Support

- See `tests/README.md` for detailed documentation
- Check `API_INSTRUCTIONS_NEW.md` for API specs
- Review server logs for debugging

---

**Ready to test?** Start with the browser test page at `http://localhost:3000/test-rag`
