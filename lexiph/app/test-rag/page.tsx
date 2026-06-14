'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { LoadingIndicator } from '@/components/chat/loading-indicator'
import { queryRAG, checkRAGHealth, SAMPLE_QUERIES } from '@/lib/services/rag-api'
import type { RAGResponse } from '@/lib/services/rag-api'
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react'

export default function TestRAGPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<RAGResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown')
  const [duration, setDuration] = useState<number | null>(null)

  const handleHealthCheck = async () => {
    try {
      setHealthStatus('unknown')
      const health = await checkRAGHealth()
      setHealthStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy')
    } catch (err) {
      setHealthStatus('unhealthy')
      console.error('Health check failed:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)
    const startedAt = Date.now()
    setDuration(null)

    try {
      const result = await queryRAG({ query: query.trim(), user_id: 'test-user' })
      setResponse(result)
      setDuration(Date.now() - startedAt)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSampleQuery = (sampleQuery: string) => {
    setQuery(sampleQuery)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">RAG API Test Page</h1>
          <p className="text-slate-600">Test the Philippine Legislative Research API</p>
          
          {/* Health Check */}
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleHealthCheck} variant="outline" size="sm">
              Check API Health
            </Button>
            {healthStatus === 'healthy' && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">API is healthy</span>
              </div>
            )}
            {healthStatus === 'unhealthy' && (
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">API is unavailable</span>
              </div>
            )}
          </div>
        </div>

        {/* Query Form */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Test Query</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-slate-700 mb-2">
                Enter your question about Philippine legislation
              </label>
              <textarea
                id="query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., What is RA 9003 and its main requirements?"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-iris-500 focus:border-transparent resize-none"
                rows={4}
                disabled={loading}
              />
            </div>

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? 'Processing...' : 'Submit Query'}
              </Button>
              
              {loading && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">This may take 50-90 seconds...</span>
                </div>
              )}
            </div>
          </form>

          {/* Sample Queries */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-slate-700 mb-3">Sample Queries:</h3>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_QUERIES.slice(0, 4).map((sample, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuery(sample)}
                  disabled={loading}
                  className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sample.length > 50 ? sample.substring(0, 50) + '...' : sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <LoadingIndicator size="lg" message="Processing your query through the RAG pipeline..." />
              <div className="text-center space-y-2">
                <p className="text-sm text-slate-600">
                  Stage 1: Generating search queries (1-2s)
                </p>
                <p className="text-sm text-slate-600">
                  Stage 2: Searching 33,562+ documents (20-30s)
                </p>
                <p className="text-sm text-slate-600">
                  Stage 3: AI summarization (30-60s)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="space-y-4">
            {/* Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Response Metadata</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-slate-700">Status</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{response.status}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-iris-600" />
                    <span className="text-sm font-medium text-slate-700">Documents Found</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{response.documents_found || 0}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-slate-700">Duration</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {duration ? `${(duration / 1000).toFixed(2)}s` : 'N/A'}
                  </p>
                </div>
              </div>

              {response.search_queries_used && response.search_queries_used.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Search Queries Used:</h3>
                  <div className="flex flex-wrap gap-2">
                    {response.search_queries_used.map((q, i) => (
                      <span key={i} className="px-2 py-1 bg-iris-50 text-iris-700 text-xs rounded border border-iris-200">
                        {q}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {response.processing_stages && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-slate-700 mb-2">Processing Stages:</h3>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>• Query Generator: {response.processing_stages.query_generator}</p>
                    <p>• Search Executor: {response.processing_stages.search_executor}</p>
                    <p>• Summarizer: {response.processing_stages.summarizer}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">AI Summary</h2>
              <div className="prose prose-slate max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">
                  {response.summary}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
