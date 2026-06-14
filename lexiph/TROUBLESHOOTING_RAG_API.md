# RAG API Troubleshooting Guide

## Current Issues & Solutions

### Issue 1: CORS Error

**Error Message:**
```
Access to fetch at 'https://devkada.resqlink.org/api/research/health' from origin 'http://localhost:3000' 
has been blocked by CORS policy: Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

**Root Cause:**
The RAG API backend at `https://devkada.resqlink.org` is not configured to allow requests from `http://localhost:3000`.

**Solutions:**

#### Option 1: Configure Backend CORS (Recommended for Production)

The backend needs to add CORS headers. In the FastAPI backend, add:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://your-production-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Option 2: Use Next.js API Route as Proxy (Quick Fix)

Create a proxy endpoint in Next.js to bypass CORS:

**File: `lexiph/app/api/rag-proxy/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'

const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'https://devkada.resqlink.org'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const endpoint = request.nextUrl.searchParams.get('endpoint') || '/api/research/rag-summary'
    
    const response = await fetch(`${RAG_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch from RAG API' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const endpoint = request.nextUrl.searchParams.get('endpoint') || '/api/research/health'
    
    const response = await fetch(`${RAG_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch from RAG API' },
      { status: 500 }
    )
  }
}
```

Then update `rag-api.ts` to use the proxy:

```typescript
const USE_PROXY = true // Set to false when CORS is fixed on backend
const RAG_API_BASE_URL = USE_PROXY 
  ? '/api/rag-proxy' 
  : (process.env.NEXT_PUBLIC_RAG_API_URL || 'https://devkada.resqlink.org')
```

#### Option 3: Use Local Backend for Development

If you have a compatible RAG backend running locally:

1. Update `.env.local`:
```bash
NEXT_PUBLIC_RAG_API_URL=http://localhost:8000
NEXT_PUBLIC_RAG_WS_URL=ws://localhost:8000
NEXT_PUBLIC_USE_RAG_PROXY=true
```

2. Restart your Next.js dev server:
```bash
npm run dev
```

---

### Issue 2: WebSocket Connection Failed

**Error Message:**
```
WebSocket connection to 'ws://127.0.0.1:5500/ws' failed
```

**Root Cause:**
The WebSocket URL is incorrect. It should be using the RAG API WebSocket endpoint.

**Solution:**

The code is already correct in `rag-api.ts`:
```typescript
this.ws = new WebSocket(`${this.wsUrl}/api/research/ws/rag-summary`)
```

Make sure your `.env.local` has:
```bash
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
```

For local development:
```bash
NEXT_PUBLIC_RAG_WS_URL=ws://localhost:8000
```

---

### Issue 3: Health Check Failed

**Error Message:**
```
Health check failed: Error: Cannot connect to RAG API at https://devkada.resqlink.org
```

**Root Cause:**
Either CORS is blocking the request, or the backend is not running.

**Verification Steps:**

1. **Test backend directly in browser:**
   - Open: `https://devkada.resqlink.org/api/research/health`
   - Expected response: `{"status": "healthy", "service": "rag_research"}`

2. **Test with curl:**
   ```bash
   curl https://devkada.resqlink.org/api/research/health
   ```

3. **Check if backend is running:**
   ```bash
   # If you have access to the backend server
   ps aux | grep uvicorn
   # or
   systemctl status rag-api
   ```

**Solutions:**

- If backend is down: Start the backend service
- If CORS error: Apply Option 1 or 2 from Issue 1
- If network error: Check firewall/network connectivity

---

## Environment Configuration Checklist

### Development (Hosted Backend)

```bash
# .env.local
NEXT_PUBLIC_RAG_API_URL=https://devkada.resqlink.org
NEXT_PUBLIC_RAG_WS_URL=wss://devkada.resqlink.org
NEXT_PUBLIC_USE_RAG_PROXY=true
```

### Development (Optional Local Backend)

```bash
# .env.local
NEXT_PUBLIC_RAG_API_URL=http://localhost:8000
NEXT_PUBLIC_RAG_WS_URL=ws://localhost:8000
NEXT_PUBLIC_USE_RAG_PROXY=true
```

### Production

```bash
# .env.production
NEXT_PUBLIC_RAG_API_URL=https://api.your-domain.com
NEXT_PUBLIC_RAG_WS_URL=wss://api.your-domain.com
```

---

## Testing Checklist

### 1. Test Backend Directly

```bash
# Health check
curl https://devkada.resqlink.org/api/research/health

# Standard RAG query
curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test"}'

# Deep search query
curl -X POST "https://devkada.resqlink.org/api/research/rag-summary" \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RA 9003?", "user_id": "test", "use_deep_search": true}'

# Draft checker
curl -X POST "https://devkada.resqlink.org/api/legislation/draft-checker" \
  -H "Content-Type: application/json" \
  -d '{"draft_markdown": "# Test\n\nTest draft", "user_id": "test"}'
```

### 2. Test Frontend

1. Open browser console (F12)
2. Navigate to `http://localhost:3000/test-rag`
3. Check console for:
   - "RAG API Base URL: ..." (should show correct URL)
   - "RAG WS URL: ..." (should show correct WebSocket URL)
4. Click "Check Status" button
5. Review any errors in console

### 3. Test Each Feature

- [ ] Standard RAG query works
- [ ] Deep Search query works (with checkbox enabled)
- [ ] Draft Checker works
- [ ] WebSocket streaming works
- [ ] Health checks pass

---

## Common Error Messages & Fixes

### "Failed to fetch"
- **Cause**: CORS or network issue
- **Fix**: Apply CORS solution or use proxy

### "Request timed out"
- **Cause**: Backend processing too slow or not responding
- **Fix**: Increase timeout or check backend logs

### "Cannot connect to RAG API"
- **Cause**: Backend not running or wrong URL
- **Fix**: Verify backend is running and URL is correct

### "WebSocket connection failed"
- **Cause**: Wrong WebSocket URL or protocol
- **Fix**: Check NEXT_PUBLIC_RAG_WS_URL in .env.local

### "API Error 422: Validation Error"
- **Cause**: Invalid request parameters
- **Fix**: Check request body matches API schema

### "API Error 500: Internal Server Error"
- **Cause**: Backend error
- **Fix**: Check backend logs for details

---

## Debug Mode

To enable detailed logging, add to your component:

```typescript
// In your test component
useEffect(() => {
  console.log('Environment Check:')
  console.log('- RAG API URL:', process.env.NEXT_PUBLIC_RAG_API_URL)
  console.log('- RAG WS URL:', process.env.NEXT_PUBLIC_RAG_WS_URL)
  console.log('- Node ENV:', process.env.NODE_ENV)
}, [])
```

---

## Backend Requirements

For the RAG API to work properly, ensure:

1. **CORS is configured** to allow your frontend origin
2. **All endpoints are accessible**:
   - `/api/research/health`
   - `/api/research/rag-summary`
   - `/api/research/ws/rag-summary`
   - `/api/legislation/draft-checker`
   - `/api/legislation/draft-checker/health`
3. **SSL certificate is valid** (for HTTPS/WSS)
4. **Firewall allows** incoming connections
5. **Service is running** and healthy

---

## Quick Fix Summary

**If you're getting CORS errors right now:**

1. **Immediate workaround**: Create the Next.js proxy (Option 2 above)
2. **Proper fix**: Contact backend team to add CORS headers
3. **Alternative**: Run backend locally for development

**If WebSocket is failing:**

1. Check `.env.local` has correct `NEXT_PUBLIC_RAG_WS_URL`
2. Restart Next.js dev server after changing env vars
3. Verify backend WebSocket endpoint is working

**If nothing works:**

1. Test backend directly with curl (see commands above)
2. Check browser console for detailed error messages
3. Verify environment variables are loaded (check console logs)
4. Try using local backend for development

---

## Contact Backend Team

If CORS issues persist, provide this information to the backend team:

**Required CORS Configuration:**

```python
# FastAPI CORS middleware configuration needed
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",      # Development
        "http://localhost:3001",      # Alternative dev port
        "https://lexinsight.com",     # Production (replace with actual domain)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
```

**Test that CORS is working:**
```bash
curl -X OPTIONS "https://devkada.resqlink.org/api/research/health" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -v
```

Expected response should include:
```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, OPTIONS
```
