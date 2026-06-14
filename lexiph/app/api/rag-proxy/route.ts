import { NextRequest, NextResponse } from 'next/server'

const RAG_API_URL = process.env.NEXT_PUBLIC_RAG_API_URL || 'https://devkada.resqlink.org'
const HEALTH_CHECK_TIMEOUT_MS = 20000

/**
 * POST proxy for RAG API endpoints
 * Bypasses CORS by making server-side requests
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const endpoint = request.nextUrl.searchParams.get('endpoint') || '/api/research/rag-summary'

    console.log(`[RAG Proxy] POST ${RAG_API_URL}${endpoint}`)

    const response = await fetch(`${RAG_API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // Longer timeout for deep search
      signal: AbortSignal.timeout(300000), // 5 minutes
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[RAG Proxy] Error ${response.status}:`, errorText)
      return NextResponse.json(
        { detail: errorText || 'Backend request failed' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[RAG Proxy] Error:', error)
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to fetch from RAG API',
      },
      { status: 500 }
    )
  }
}

/**
 * GET proxy for health checks and other GET endpoints
 */
export async function GET(request: NextRequest) {
  try {
    const endpoint = request.nextUrl.searchParams.get('endpoint') || '/api/research/health'

    console.log(`[RAG Proxy] GET ${RAG_API_URL}${endpoint}`)

    const response = await fetch(`${RAG_API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[RAG Proxy] Error ${response.status}:`, errorText)
      return NextResponse.json(
        { detail: errorText || 'Backend request failed' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('[RAG Proxy] Error:', error)
    return NextResponse.json(
      {
        detail:
          error instanceof Error
            ? error.message
            : 'Failed to fetch from RAG API',
      },
      { status: 500 }
    )
  }
}
