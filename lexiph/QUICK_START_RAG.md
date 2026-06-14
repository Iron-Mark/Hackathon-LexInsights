# Quick Start Guide - RAG API Integration

## ✅ What Was Fixed

1. **CORS Path**: Created Next.js API proxy so browser requests can go through the app server
2. **WebSocket URL**: Corrected WebSocket endpoint configuration
3. **Environment Variables**: Added proxy toggle configuration
4. **Error Handling**: Improved error messages and debugging

## Current Backend Requirement

The frontend is proxy-ready, but full RAG E2E still requires the configured backend to answer health and query requests. The default hosted backend is:

```bash
https://devkada.resqlink.org
```

If `curl https://devkada.resqlink.org/api/research/health` times out, `/test-rag`, chat RAG, deep search, and draft checking cannot be fully verified until that service is restored or `.env.local` points to a working compatible backend.

## 🚀 Quick Setup (5 minutes)

### Step 1: Environment Configuration

Your `.env.local` is already configured with:

```bash
# RAG API Backend
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org

# Enable proxy to bypass CORS
NEXT_PUBLIC_USE_RAG_PROXY=true
```

### Step 2: Restart Development Server

**Important**: You MUST restart the dev server after changing environment variables!

```bash
# Stop current server (Ctrl+C)
# Then restart:
cd lexiph
npm run dev
```

### Step 3: Test the Integration

1. Open browser: `http://localhost:3000/test-rag`
2. Open browser console (F12) to see debug logs
3. Click "Check Status" button
4. Try a sample query

## 📋 Testing Checklist

### Standard RAG (Tab 1)
- [ ] Health check passes
- [ ] Sample queries load
- [ ] Query submission works
- [ ] Response displays correctly
- [ ] Processing time shows

### Deep Search (Tab 2)
- [ ] Deep search checkbox appears
- [ ] Query with deep search enabled works
- [ ] Shows "Deep Search: Enabled" in response
- [ ] Takes 60-120 seconds (expected)

### Draft Checker (Tab 3)
- [ ] Sample draft loads
- [ ] Draft submission works
- [ ] Color-coded findings display (Red/Amber/Green)
- [ ] Compliance score shows
- [ ] Recommendations display

### WebSocket (Optional)
- [ ] Connect WebSocket button works
- [ ] Real-time events display
- [ ] Query via WebSocket works

## 🔧 How the Proxy Works

### Without Proxy (CORS Error)
```
Browser → https://devkada.resqlink.org ❌ CORS blocked
```

### With Proxy (CORS-Safe Request Path)
```
Browser → Next.js Server → https://devkada.resqlink.org
```

The proxy runs on your Next.js server, so it avoids browser CORS restrictions. It does not make an offline or timing-out backend healthy.

## 🐛 Troubleshooting

### Issue: Still getting CORS errors

**Solution**: Make sure you restarted the dev server after updating `.env.local`

```bash
# Kill the server completely
# Then restart
npm run dev
```

### Issue: "Cannot connect to RAG API"

**Check these:**

1. Is `NEXT_PUBLIC_USE_RAG_PROXY=true` in `.env.local`?
2. Did you restart the dev server?
3. Check browser console for debug logs
4. Try testing backend directly:
   ```bash
   curl https://devkada.resqlink.org/api/research/health
   ```

### Issue: WebSocket not connecting

**Note**: WebSocket cannot use the proxy. It needs direct connection.

**Options:**
1. Wait for backend team to fix CORS for WebSocket
2. Use local backend for development
3. Use standard HTTP requests instead (they work with proxy)

### Issue: Queries timing out

**Expected behavior:**
- Standard RAG: 20-30 seconds
- Deep Search: 60-120 seconds
- Draft Checker: 60-120 seconds

If it times out before these durations, check backend status.

## 📊 Console Debug Output

When you load the test page, you should see:

```
RAG API Configuration:
- Use Proxy: true
- Base URL: /api/rag-proxy
- WS URL: wss://devkada.resqlink.org
- Backend URL: https://devkada.resqlink.org
```

If you see different values, check your `.env.local` file.

## 🎯 Next Steps

### For Development

Keep using the proxy (`NEXT_PUBLIC_USE_RAG_PROXY=true`)

### For Production

Once backend team adds CORS headers:

1. Update `.env.production`:
   ```bash
   NEXT_PUBLIC_USE_RAG_PROXY=false
   NEXT_PUBLIC_RAG_API_URL=https://api.your-domain.com
   NEXT_PUBLIC_RAG_WS_URL=wss://api.your-domain.com
   ```

2. Backend needs to add:
   ```python
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["https://your-frontend-domain.com"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

## 📝 API Endpoints Summary

### Standard RAG
```
POST /api/research/rag-summary
Body: { "query": "...", "user_id": "...", "use_deep_search": false }
Time: 20-30 seconds
```

### Deep Search
```
POST /api/research/rag-summary
Body: { "query": "...", "user_id": "...", "use_deep_search": true }
Time: 60-120 seconds
```

### Draft Checker
```
POST /api/legislation/draft-checker
Body: { "draft_markdown": "...", "user_id": "..." }
Time: 60-120 seconds
```

## 🔍 Verification Commands

Test backend directly (bypassing frontend):

```bash
# Health check
curl https://devkada.resqlink.org/api/research/health

# Standard RAG
curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test"}'

# Deep Search
curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test", "use_deep_search": true}'

# Draft Checker
curl -X POST "https://devkada.resqlink.org/api/legislation/draft-checker" \
  -H "Content-Type: application/json" \
  -d '{"draft_markdown": "# Test\n\nTest content", "user_id": "test"}'
```

## 📚 Documentation

- **Full API Docs**: See `DEEP_SEARCH_INTEGRATION.md`, `DRAFT_CHECKER_API.md`, `API_INSTRUCTIONS_NEW.md`
- **Troubleshooting**: See `TROUBLESHOOTING_RAG_API.md`
- **Implementation Summary**: See `RAG_INTEGRATION_SUMMARY.md`

## ✨ Frontend Features Implemented

✅ Standard RAG search (20-30s)
✅ Deep Search with PDF extraction (60-120s)
✅ Draft Checker with conflict detection
✅ WebSocket streaming (real-time updates)
✅ Health checks for all endpoints
✅ CORS bypass proxy
✅ Comprehensive error handling
✅ Debug logging
✅ Sample data for testing

## Ready To Test When The Backend Is Reachable

1. Restart your dev server
2. Navigate to `http://localhost:3000/test-rag`
3. Run the health check first
4. Start query and draft-checker testing only after health passes

If you encounter any issues, check `TROUBLESHOOTING_RAG_API.md` for detailed solutions.
