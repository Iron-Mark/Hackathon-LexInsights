'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, Clock, Cpu, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingIndicator } from '@/components/chat/loading-indicator'
import { checkRAGHealth, queryRAG, SAMPLE_QUERIES } from '@/lib/services/rag-api'
import type { RAGResponse } from '@/lib/services/rag-api'

export default function TestRAGPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<RAGResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<'unknown' | 'healthy' | 'unhealthy'>('unknown')
  const [healthService, setHealthService] = useState<string | null>(null)
  const [healthProviderMode, setHealthProviderMode] = useState<string | null>(null)
  const [duration, setDuration] = useState<number | null>(null)

  const handleHealthCheck = async () => {
    try {
      setHealthStatus('unknown')
      setHealthService(null)
      setHealthProviderMode(null)

      const health = await checkRAGHealth()

      setHealthStatus(health.status === 'healthy' ? 'healthy' : 'unhealthy')
      setHealthService(health.service)
      setHealthProviderMode(health.provider_mode || null)
    } catch (err) {
      setHealthStatus('unhealthy')
      setHealthService(err instanceof Error ? err.message : 'Health check failed')
      setHealthProviderMode(null)
      console.error('Health check failed:', err)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!query.trim()) {
      setError('Please enter a query')
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)
    setDuration(null)

    const startedAt = Date.now()

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
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="mb-2 text-3xl font-bold text-slate-900">Legal Research Engine Test Page</h1>
          <p className="text-slate-600">
            Test remote RAG responses and the providerless local fallback engine.
          </p>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={handleHealthCheck} variant="outline" size="sm">
              Check Research Health
            </Button>

            {healthStatus === 'healthy' && (
              <div className="flex flex-wrap items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {healthProviderMode === 'local-providerless'
                    ? 'Local providerless research is ready'
                    : 'Remote RAG API is healthy'}
                </span>
                {healthService && (
                  <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-700">
                    {healthService}
                  </span>
                )}
              </div>
            )}

            {healthStatus === 'unhealthy' && (
              <div className="flex flex-wrap items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Research engine is unavailable</span>
                {healthService && (
                  <span className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                    {healthService}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">Test Query</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="query" className="mb-2 block text-sm font-medium text-slate-700">
                Enter your question about Philippine legislation
              </label>
              <textarea
                id="query"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g., What is RA 9003 and its main requirements?"
                className="w-full resize-none rounded-lg border border-slate-300 px-4 py-3 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-iris-500"
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
                  <span className="text-sm">Trying remote RAG, then using local mode if needed...</span>
                </div>
              )}
            </div>
          </form>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-medium text-slate-700">Sample Queries:</h3>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_QUERIES.slice(0, 4).map((sample, index) => (
                <button
                  key={index}
                  onClick={() => handleSampleQuery(sample)}
                  disabled={loading}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sample.length > 50 ? `${sample.substring(0, 50)}...` : sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center justify-center space-y-4">
              <LoadingIndicator size="lg" message="Processing your legal research query..." />
              <div className="space-y-2 text-center">
                <p className="text-sm text-slate-600">Stage 1: Preparing query terms and legal-topic expansion</p>
                <p className="text-sm text-slate-600">Stage 2: Searching remote RAG or bundled providerless corpus</p>
                <p className="text-sm text-slate-600">Stage 3: Producing a sourced research brief</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {response && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Response Metadata</h2>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-slate-700">Status</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{response.status}</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-iris-600" />
                    <span className="text-sm font-medium text-slate-700">Documents Found</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">{response.documents_found || 0}</p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-slate-700">Duration</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {duration ? `${(duration / 1000).toFixed(2)}s` : 'N/A'}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-700">Provider</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900">
                    {response.provider_mode === 'local-providerless' ? 'Local' : 'Remote'}
                  </p>
                </div>
              </div>

              {response.provider_mode === 'local-providerless' && (
                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Providerless local mode generated this result. It does not call an AI provider or search live government sites.
                </div>
              )}

              {response.search_queries_used && response.search_queries_used.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium text-slate-700">Search Queries Used:</h3>
                  <div className="flex flex-wrap gap-2">
                    {response.search_queries_used.map((searchQuery, index) => (
                      <span key={index} className="rounded border border-iris-200 bg-iris-50 px-2 py-1 text-xs text-iris-700">
                        {searchQuery}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {response.processing_stages && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium text-slate-700">Processing Stages:</h3>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>- Query Generator: {response.processing_stages.query_generator}</p>
                    <p>- Search Executor: {response.processing_stages.search_executor}</p>
                    <p>- Summarizer: {response.processing_stages.summarizer}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-semibold text-slate-900">Research Summary</h2>
              <div className="prose prose-slate max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700">
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
