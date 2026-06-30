'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  queryRAG,
  checkDraft,
  checkRAGHealth,
  checkDraftCheckerHealth,
  RAGWebSocket,
  SAMPLE_QUERIES,
  SAMPLE_DRAFT,
  type RAGResponse,
  type DraftCheckerResponse,
  type WebSocketEvent,
} from '@/lib/services/rag-api'
import { RAG_PROVIDER_MODE, USE_REMOTE_RAG } from '@/lib/services/rag-config'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Send,
  Wifi,
  WifiOff,
  FileText,
  Search,
  AlertTriangle,
} from 'lucide-react'

type TabType = 'rag' | 'deep-search' | 'draft-checker'
type TestWebSocketEvent = WebSocketEvent & { timestamp: string }

export function RAGTestComponent() {
  const [activeTab, setActiveTab] = useState<TabType>('rag')

  // RAG State
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState<RAGResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [healthStatus, setHealthStatus] = useState<string | null>(null)
  const [useDeepSearch, setUseDeepSearch] = useState(false)
  const [lastQuery, setLastQuery] = useState('')

  // Draft Checker State
  const [draftMarkdown, setDraftMarkdown] = useState(SAMPLE_DRAFT)
  const [draftResponse, setDraftResponse] = useState<DraftCheckerResponse | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [draftHealthStatus, setDraftHealthStatus] = useState<string | null>(null)

  // WebSocket State
  const [wsConnected, setWsConnected] = useState(false)
  const [wsEvents, setWsEvents] = useState<TestWebSocketEvent[]>([])
  const [ragWs, setRagWs] = useState<RAGWebSocket | null>(null)
  const websocketDisabled = !USE_REMOTE_RAG

  // ============================================================================
  // RAG HANDLERS
  // ============================================================================

  const handleTestRAG = async (queryOverride?: string) => {
    const queryText = (queryOverride || query).trim()

    if (!queryText) return

    setLoading(true)
    setError(null)
    setResponse(null)
    setLastQuery(queryText)

    try {
      const result = await queryRAG({
        query: queryText,
        user_id: 'LexInsights_test_user',
        use_deep_search: useDeepSearch,
      })
      setResponse(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleHealthCheck = async () => {
    try {
      const health = await checkRAGHealth()
      setHealthStatus(`${health.status} - ${health.service}`)
    } catch (err) {
      setHealthStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const handleSampleQuery = (sampleQuery: string) => {
    setQuery(sampleQuery)
  }

  const handleRetryRAG = () => {
    const retryQuery = lastQuery || query.trim()

    if (!retryQuery) return

    setQuery(retryQuery)
    void handleTestRAG(retryQuery)
  }

  // ============================================================================
  // DRAFT CHECKER HANDLERS
  // ============================================================================

  const handleCheckDraft = async () => {
    if (!draftMarkdown.trim()) return

    setDraftLoading(true)
    setDraftError(null)
    setDraftResponse(null)

    try {
      const result = await checkDraft({
        draft_markdown: draftMarkdown.trim(),
        user_id: 'LexInsights_test_user',
        include_summary: true,
      })
      setDraftResponse(result)
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDraftLoading(false)
    }
  }

  const handleDraftHealthCheck = async () => {
    try {
      const health = await checkDraftCheckerHealth()
      setDraftHealthStatus(`${health.status} - ${health.service}`)
    } catch (err) {
      setDraftHealthStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  // ============================================================================
  // WEBSOCKET HANDLERS
  // ============================================================================

  const handleWebSocketTest = () => {
    if (websocketDisabled) {
      setError('WebSocket streaming is only available when remote RAG mode is enabled.')
      return
    }

    if (ragWs) {
      ragWs.disconnect()
      setRagWs(null)
      setWsConnected(false)
      setWsEvents([])
      return
    }

    const ws = new RAGWebSocket()
    ws.connect(
      (event) => {
        setWsEvents((prev) => [...prev, { ...event, timestamp: new Date().toLocaleTimeString() }])
        if (event.stage === 'summarization' && event.status === 'completed') {
          setResponse({
            status: 'completed',
            query: query,
            summary: event.data?.summary || '',
            search_queries_used: [],
            documents_found: event.data?.documents_found || 0,
          })
        }
      },
      (error) => {
        setError('WebSocket error: ' + error)
        setWsConnected(false)
      }
    )

    setRagWs(ws)
    setWsConnected(true)
    setWsEvents([])
  }

  const handleWebSocketQuery = () => {
    if (websocketDisabled) {
      setError('WebSocket streaming is only available when remote RAG mode is enabled.')
      return
    }

    if (ragWs && query.trim()) {
      setWsEvents([])
      setResponse(null)
      ragWs.sendQuery(query.trim(), 'LexInsights_test_user', useDeepSearch)
    }
  }

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="font-display mb-2 text-2xl font-bold text-neutral-900 dark:text-slate-100">
          RAG API Test Interface
        </h1>
        <p className="font-body text-neutral-600 dark:text-slate-300">
          Test the Philippine Legislation Research API
        </p>
      </div>

      {/* Tabs */}
      <Card className="border-iris-100 p-1 dark:border-iris-300/15">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('rag')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded font-medium text-sm transition-colors ${
              activeTab === 'rag'
                ? 'bg-iris-600 text-white'
                : 'text-neutral-600 hover:bg-iris-50 dark:text-slate-300 dark:hover:bg-iris-300/12 dark:hover:text-iris-100'
            }`}
          >
            <Search className="h-4 w-4" />
            Standard RAG
          </button>
          <button
            onClick={() => setActiveTab('deep-search')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded font-medium text-sm transition-colors ${
              activeTab === 'deep-search'
                ? 'bg-iris-600 text-white'
                : 'text-neutral-600 hover:bg-iris-50 dark:text-slate-300 dark:hover:bg-iris-300/12 dark:hover:text-iris-100'
            }`}
          >
            <Search className="h-4 w-4" />
            Deep Search
          </button>
          <button
            onClick={() => setActiveTab('draft-checker')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded font-medium text-sm transition-colors ${
              activeTab === 'draft-checker'
                ? 'bg-iris-600 text-white'
                : 'text-neutral-600 hover:bg-iris-50 dark:text-slate-300 dark:hover:bg-iris-300/12 dark:hover:text-iris-100'
            }`}
          >
            <FileText className="h-4 w-4" />
            Draft Checker
          </button>
        </div>
      </Card>

      {/* RAG Tab */}
      {(activeTab === 'rag' || activeTab === 'deep-search') && (
        <>
          {/* Health Check */}
          <Card className="border-iris-100 p-4 dark:border-iris-300/15">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-slate-100">
                API Health Check
              </h2>
              <Button
                onClick={handleHealthCheck}
                variant="outline"
                size="sm"
                className="border-iris-300 text-iris-700 hover:bg-iris-50 dark:border-iris-300/20 dark:text-iris-100 dark:hover:bg-iris-300/12 dark:hover:text-iris-50"
              >
                Check Status
              </Button>
            </div>
            {healthStatus && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-iris-50 p-2 dark:bg-iris-300/10">
                {healthStatus.includes('Error') ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-iris-600" />
                )}
                <span className="font-body text-sm text-neutral-700 dark:text-slate-200">{healthStatus}</span>
              </div>
            )}
          </Card>

          {/* Sample Queries */}
          <Card className="border-iris-100 p-4 dark:border-iris-300/15">
            <h2 className="font-display mb-3 text-lg font-semibold text-neutral-900 dark:text-slate-100">
              Sample Queries
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SAMPLE_QUERIES.map((sampleQuery, index) => (
                <Button
                  key={index}
                  onClick={() => handleSampleQuery(sampleQuery)}
                  variant="outline"
                  size="sm"
                  className="h-auto justify-start whitespace-normal border-iris-200 p-2.5 text-left transition-colors hover:border-iris-300 hover:bg-iris-50 dark:border-iris-300/20 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12"
                >
                  <span className="font-body text-xs text-neutral-700 dark:text-slate-200">{sampleQuery}</span>
                </Button>
              ))}
            </div>
          </Card>

          {/* Query Input */}
          <Card className="p-4">
            <h2 className="font-display mb-3 text-lg font-semibold dark:text-slate-100">Test Query</h2>
            <div className="space-y-3">
              <textarea
                id="rag-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Enter your question about Philippine legislation"
                placeholder="Enter your Philippine legislation question..."
                className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 font-body text-sm text-neutral-900 transition-colors focus:border-iris-500 focus:outline-none focus:ring-2 focus:ring-iris-500 dark:border-iris-300/15 dark:bg-[#1b1728] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-iris-300"
                maxLength={500}
              />
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-slate-400">
                <span>{query.length}/500 characters</span>
                {activeTab === 'deep-search' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDeepSearch}
                      onChange={(e) => setUseDeepSearch(e.target.checked)}
                      className="rounded border-iris-300 text-iris-600 focus:ring-iris-500"
                    />
                    <span className="text-sm text-neutral-700 dark:text-slate-300">Enable Deep Search (remote or local cross-reference mode)</span>
                  </label>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => void handleTestRAG()}
                  disabled={loading || !query.trim()}
                  className="flex items-center gap-2 bg-iris-600 hover:bg-iris-700 text-white"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {activeTab === 'deep-search' && useDeepSearch ? 'Test Deep Search' : 'Test RAG'}
                </Button>

                <Button
                  onClick={handleWebSocketTest}
                  variant="outline"
                  disabled={websocketDisabled}
                  className="flex items-center gap-2 border-iris-300 text-iris-700 hover:bg-iris-50 dark:border-iris-300/20 dark:text-iris-100 dark:hover:bg-iris-300/12"
                  title={websocketDisabled ? 'WebSocket streaming requires remote RAG mode' : undefined}
                >
                  {wsConnected ? (
                    <Wifi className="h-4 w-4 text-iris-600" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  {wsConnected ? 'Disconnect WS' : 'Connect WebSocket'}
                </Button>

                {websocketDisabled && (
                  <span className="inline-flex items-center rounded border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                    Local mode: no WebSocket stream
                  </span>
                )}

                {wsConnected && (
                  <Button
                    onClick={handleWebSocketQuery}
                    disabled={!query.trim() || websocketDisabled}
                    variant="outline"
                    className="border-iris-300 text-iris-700 hover:bg-iris-50 dark:border-iris-300/20 dark:text-iris-100 dark:hover:bg-iris-300/12"
                  >
                    Send via WebSocket
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* WebSocket Events */}
          {wsEvents.length > 0 && (
            <Card className="border-iris-100 p-4 dark:border-iris-300/15">
              <h2 className="font-display mb-3 text-lg font-semibold text-neutral-900 dark:text-slate-100">
                WebSocket Events
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {wsEvents.map((event, index) => (
                  <div
                    key={index}
                    className="rounded border border-iris-100 bg-iris-50 p-2.5 font-mono text-sm dark:border-iris-300/15 dark:bg-iris-300/10"
                  >
                    <span className="text-iris-600 dark:text-iris-200">[{event.timestamp}]</span>
                    <span className="ml-2 font-semibold text-neutral-800 dark:text-slate-100">{event.stage}:</span>
                    <span className="ml-1 text-neutral-700 dark:text-slate-300">{event.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-red-200 bg-red-50 p-4 dark:border-red-400/30 dark:bg-red-400/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <h2 className="font-display text-lg font-semibold text-red-800 dark:text-red-100">Error</h2>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRetryRAG}
                  disabled={loading || !(lastQuery || query.trim())}
                  className="border-red-300 text-red-700 hover:bg-red-100 dark:border-red-400/30 dark:text-red-200 dark:hover:bg-red-500/15"
                >
                  Retry
                </Button>
              </div>
              <p className="font-body mt-2 text-red-700 dark:text-red-200" aria-live="polite">{error}</p>
            </Card>
          )}

          {/* Response Display */}
          {response && (
            <Card className="border-iris-100 p-4 dark:border-iris-300/15">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-iris-600" />
                <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-slate-100">API Response</h2>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <h3 className="font-display mb-1 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                      Status
                    </h3>
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                        response.status === 'completed'
                          ? 'border border-iris-200 bg-iris-100 text-iris-800 dark:border-iris-300/30 dark:bg-iris-300/12 dark:text-iris-100'
                          : response.status === 'no_results'
                          ? 'border border-yellow-200 bg-yellow-100 text-yellow-800 dark:border-yellow-400/30 dark:bg-yellow-400/10 dark:text-yellow-100'
                          : 'border border-red-200 bg-red-100 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100'
                      }`}
                    >
                      {response.status}
                    </span>
                  </div>

                  {response.deep_search_used !== undefined && (
                    <div>
                      <h3 className="font-display mb-1 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                        Deep Search
                      </h3>
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                          response.deep_search_used
                            ? 'border border-purple-200 bg-purple-100 text-purple-800 dark:border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-100'
                            : 'border border-gray-200 bg-gray-100 text-gray-800 dark:border-slate-500/30 dark:bg-slate-400/10 dark:text-slate-200'
                        }`}
                      >
                        {response.deep_search_used ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}

                  {response.processing_time_seconds !== undefined && (
                    <div>
                      <h3 className="font-display mb-1 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                        Processing Time
                      </h3>
                      <span className="inline-block rounded border border-iris-200 bg-iris-100 px-2.5 py-1 text-xs font-medium text-iris-800 dark:border-iris-300/30 dark:bg-iris-300/12 dark:text-iris-100">
                        {response.retrieval_metadata?.processing_ms !== undefined
                          ? `${response.retrieval_metadata.processing_ms}ms`
                          : `${response.processing_time_seconds.toFixed(3)}s`}
                      </span>
                    </div>
                  )}

                  {response.provider_mode && (
                    <div>
                      <h3 className="font-display mb-1 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                        Provider
                      </h3>
                      <span className="inline-block rounded border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
                        {response.provider_mode === 'local-providerless' ? 'Local providerless' : 'Remote RAG'}
                      </span>
                    </div>
                  )}
                </div>

                {response.provider_mode === 'local-providerless' && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
                    Providerless local mode generated this result. It does not call an AI provider, search live government sites, or stream WebSocket events. Current provider mode: {RAG_PROVIDER_MODE}.
                  </div>
                )}

                {response.fallback_used && response.fallback_reason && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                    Remote provider fallback: {response.fallback_reason}
                  </div>
                )}

                <div>
                  <h3 className="font-display mb-1 text-sm font-semibold text-neutral-700 dark:text-slate-300">Query</h3>
                  <p className="font-body rounded border border-iris-100 bg-iris-50 p-2 text-sm text-neutral-600 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-slate-200">
                    {response.query}
                  </p>
                </div>

                {response.search_queries_used && response.search_queries_used.length > 0 && (
                  <div>
                    <h3 className="font-display mb-2 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                      Search Queries Used ({response.search_queries_used.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {response.search_queries_used.map((searchQuery, index) => (
                        <span
                          key={index}
                          className="rounded border border-iris-200 bg-iris-100 px-2.5 py-1 text-xs font-medium text-iris-700 dark:border-iris-300/30 dark:bg-iris-300/12 dark:text-iris-100"
                        >
                          {searchQuery}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-display mb-1 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                    Documents Found
                  </h3>
                  <span className="inline-flex items-center gap-1.5 rounded border border-iris-200 bg-iris-100 px-2.5 py-1 text-sm font-medium text-iris-700 dark:border-iris-300/30 dark:bg-iris-300/12 dark:text-iris-100">
                    {response.documents_found} documents
                  </span>
                </div>

                {response.retrieval_metadata && (
                  <div>
                    <h3 className="font-display mb-2 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                      Local Ranking Diagnostics
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-neutral-700 dark:text-slate-200 md:grid-cols-5">
                      <span className="rounded border border-iris-100 bg-iris-50 px-2.5 py-2 dark:border-iris-300/15 dark:bg-iris-300/10">
                        Candidates: <strong>{response.retrieval_metadata.total_candidates}</strong>
                      </span>
                      <span className="rounded border border-iris-100 bg-iris-50 px-2.5 py-2 dark:border-iris-300/15 dark:bg-iris-300/10">
                        Limit: <strong>{response.retrieval_metadata.result_limit}</strong>
                      </span>
                      <span className="rounded border border-iris-100 bg-iris-50 px-2.5 py-2 dark:border-iris-300/15 dark:bg-iris-300/10">
                        Top score: <strong>{response.retrieval_metadata.top_score.toFixed(2)}</strong>
                      </span>
                      <span className="rounded border border-iris-100 bg-iris-50 px-2.5 py-2 dark:border-iris-300/15 dark:bg-iris-300/10">
                        Threshold: <strong>{response.retrieval_metadata.score_threshold.toFixed(2)}</strong>
                      </span>
                      <span className="rounded border border-iris-100 bg-iris-50 px-2.5 py-2 dark:border-iris-300/15 dark:bg-iris-300/10">
                        Citations: <strong>{response.retrieval_metadata.citation_numbers.join(', ') || 'none'}</strong>
                      </span>
                      {response.retrieval_metadata.known_citation_numbers && (
                        <span className="rounded border border-emerald-100 bg-emerald-50 px-2.5 py-2 dark:border-emerald-400/30 dark:bg-emerald-400/10">
                          Known: <strong>{response.retrieval_metadata.known_citation_numbers.join(', ') || 'none'}</strong>
                        </span>
                      )}
                      {response.retrieval_metadata.unknown_citation_numbers && (
                        <span className="rounded border border-amber-100 bg-amber-50 px-2.5 py-2 dark:border-amber-400/30 dark:bg-amber-400/10">
                          Unknown: <strong>{response.retrieval_metadata.unknown_citation_numbers.join(', ') || 'none'}</strong>
                        </span>
                      )}
                      {response.retrieval_metadata.source_type_counts && (
                        <span className="rounded border border-iris-100 bg-iris-50 px-2.5 py-2 dark:border-iris-300/15 dark:bg-iris-300/10 md:col-span-2">
                          Source types:{' '}
                          <strong>
                            {Object.entries(response.retrieval_metadata.source_type_counts)
                              .map(([type, count]) => `${type}: ${count}`)
                              .join(', ') || 'none'}
                          </strong>
                        </span>
                      )}
                      {response.retrieval_metadata.provenance_coverage && (
                        <span className="rounded border border-emerald-100 bg-emerald-50 px-2.5 py-2 dark:border-emerald-400/30 dark:bg-emerald-400/10 md:col-span-2">
                          Provenance:{' '}
                          <strong>
                            {Object.entries(response.retrieval_metadata.provenance_coverage)
                              .map(([status, count]) => `${status}: ${count}`)
                              .join(', ') || 'none'}
                          </strong>
                        </span>
                      )}
                    </div>
                    {response.retrieval_metadata.relation_paths && response.retrieval_metadata.relation_paths.length > 0 && (
                      <div className="mt-2 rounded border border-iris-100 bg-white p-2 text-xs text-neutral-700 dark:border-iris-300/15 dark:bg-[#1b1728] dark:text-slate-200">
                        <strong>Relation paths:</strong>{' '}
                        {response.retrieval_metadata.relation_paths
                          .map((path) => `${path.source} -> ${path.target} (${path.relation_type})`)
                          .join('; ')}
                      </div>
                    )}
                    {response.retrieval_metadata.coverage_warnings && response.retrieval_metadata.coverage_warnings.length > 0 && (
                      <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100">
                        <strong>Coverage warnings:</strong>{' '}
                        {response.retrieval_metadata.coverage_warnings.join(' ')}
                      </div>
                    )}
                    {response.retrieval_metadata.local_corpus_limitations && (
                      <p className="mt-2 text-xs text-neutral-600 dark:text-slate-400">
                        {response.retrieval_metadata.local_corpus_limitations[0]}
                      </p>
                    )}
                  </div>
                )}

                {response.matched_documents && response.matched_documents.length > 0 && (
                  <div>
                    <h3 className="font-display mb-2 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                      Matched Sources
                    </h3>
                    <div className="space-y-2">
                      {response.matched_documents.map((document, index) => (
                        <div key={`${document.statute}-${index}`} className="rounded border border-iris-100 bg-white p-3 text-sm dark:border-iris-300/15 dark:bg-[#1b1728]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-semibold text-neutral-900 dark:text-slate-100">{document.title}</span>
                            <span className="rounded bg-iris-100 px-2 py-0.5 text-xs font-medium text-iris-700 dark:bg-iris-300/12 dark:text-iris-100">
                              {(document.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                          {document.matched_terms.length > 0 && (
                            <p className="mt-1 text-xs text-neutral-600 dark:text-slate-400">
                              Matched: {document.matched_terms.join(', ')}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-neutral-600 dark:text-slate-300">
                            {document.support_level && (
                              <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
                                {document.support_level} support
                              </span>
                            )}
                            {document.authority_type && (
                              <span className="rounded border border-iris-100 bg-iris-50 px-2 py-0.5 text-iris-700 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-iris-100">
                                {document.authority_type}
                              </span>
                            )}
                            {document.source_tier && (
                              <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 dark:border-iris-300/15 dark:bg-slate-400/10">
                                {document.source_tier}
                              </span>
                            )}
                            {document.source_last_verified && (
                              <span className="rounded border border-neutral-200 bg-neutral-50 px-2 py-0.5 dark:border-iris-300/15 dark:bg-slate-400/10">
                                {document.provenance_status === 'verified' ? 'Verified' : 'Cataloged'}{' '}
                                {document.source_last_verified}
                              </span>
                            )}
                            {document.provenance_status && (
                              <span className="rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-100">
                                {document.provenance_status}
                              </span>
                            )}
                            {document.supporting_fields && document.supporting_fields.length > 0 && (
                              <span className="rounded border border-neutral-200 bg-white px-2 py-0.5 dark:border-iris-300/15 dark:bg-slate-400/10">
                                Fields: {document.supporting_fields.join(', ')}
                              </span>
                            )}
                          </div>
                          {document.evidence_anchors && document.evidence_anchors.length > 0 && (
                            <div className="mt-2 space-y-1 text-xs text-neutral-600 dark:text-slate-400">
                              {document.evidence_anchors.slice(0, 2).map((anchor) => (
                                <p key={anchor.label}>
                                  <span className="font-medium text-neutral-800 dark:text-slate-200">{anchor.label}:</span> {anchor.note}
                                </p>
                              ))}
                            </div>
                          )}
                          {document.related_authorities && document.related_authorities.length > 0 && (
                            <p className="mt-2 text-xs text-neutral-600 dark:text-slate-400">
                              Related: {document.related_authorities
                                .slice(0, 3)
                                .map((authority) => `${authority.statute} (${authority.relation_type})`)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-display mb-2 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                    Summary
                  </h3>
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-iris-100 bg-iris-50 p-4 dark:border-iris-300/15 dark:bg-iris-300/10">
                    <pre className="font-body whitespace-pre-wrap text-sm text-neutral-800 dark:text-slate-200">
                      {response.summary}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Draft Checker Tab */}
      {activeTab === 'draft-checker' && (
        <>
          {/* Health Check */}
          <Card className="border-iris-100 p-4 dark:border-iris-300/15">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-slate-100">
                Draft Checker Health
              </h2>
              <Button
                onClick={handleDraftHealthCheck}
                variant="outline"
                size="sm"
                className="border-iris-300 text-iris-700 hover:bg-iris-50 dark:border-iris-300/20 dark:text-iris-100 dark:hover:bg-iris-300/12"
              >
                Check Status
              </Button>
            </div>
            {draftHealthStatus && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-iris-50 p-2 dark:bg-iris-300/10">
                {draftHealthStatus.includes('Error') ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-iris-600" />
                )}
                <span className="font-body text-sm text-neutral-700 dark:text-slate-200">{draftHealthStatus}</span>
              </div>
            )}
          </Card>

          {/* Draft Input */}
          <Card className="p-4">
            <h2 className="font-display mb-3 text-lg font-semibold dark:text-slate-100">Legislation Draft</h2>
            <div className="space-y-3">
              <textarea
                value={draftMarkdown}
                onChange={(e) => setDraftMarkdown(e.target.value)}
                placeholder="Enter your legislation draft in markdown format..."
                className="h-64 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 font-mono text-sm text-neutral-900 transition-colors focus:border-iris-500 focus:outline-none focus:ring-2 focus:ring-iris-500 dark:border-iris-300/15 dark:bg-[#1b1728] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-iris-300"
                maxLength={50000}
              />
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-slate-400">
                <span>{draftMarkdown.length}/50,000 characters</span>
              </div>
              <Button
                onClick={handleCheckDraft}
                disabled={draftLoading || !draftMarkdown.trim()}
                className="flex items-center gap-2 bg-iris-600 hover:bg-iris-700 text-white"
              >
                {draftLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Check Draft for Conflicts
              </Button>
            </div>
          </Card>

          {/* Draft Error Display */}
          {draftError && (
            <Card className="border-red-200 bg-red-50 p-4 dark:border-red-400/30 dark:bg-red-400/10">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <h2 className="font-display text-lg font-semibold text-red-800 dark:text-red-100">Error</h2>
              </div>
              <p className="font-body mt-2 text-red-700 dark:text-red-200">{draftError}</p>
            </Card>
          )}

          {/* Draft Response Display */}
          {draftResponse && draftResponse.status === 'success' && (
            <Card className="border-iris-100 p-4 dark:border-iris-300/15">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-iris-600" />
                <h2 className="font-display text-lg font-semibold text-neutral-900 dark:text-slate-100">
                  Analysis Results
                </h2>
              </div>

              <div className="space-y-4">
                {/* Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-iris-100 bg-iris-50 p-3 dark:border-iris-300/15 dark:bg-iris-300/10">
                    <div className="mb-1 text-xs text-neutral-600 dark:text-slate-400">Compliance Score</div>
                    <div className="text-2xl font-bold text-iris-700 dark:text-iris-100">
                      {draftResponse.analysis.compliance_score}
                    </div>
                  </div>
                  <div className="rounded-lg border border-green-100 bg-green-50 p-3 dark:border-green-400/30 dark:bg-green-400/10">
                    <div className="mb-1 text-xs text-neutral-600 dark:text-green-100/80">Compliant</div>
                    <div className="text-2xl font-bold text-green-700 dark:text-green-200">
                      {draftResponse.analysis.green_count}
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-400/10">
                    <div className="mb-1 text-xs text-neutral-600 dark:text-amber-100/80">Warnings</div>
                    <div className="text-2xl font-bold text-amber-700 dark:text-amber-200">
                      {draftResponse.analysis.amber_count}
                    </div>
                  </div>
                  <div className="rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-400/30 dark:bg-red-400/10">
                    <div className="mb-1 text-xs text-neutral-600 dark:text-red-100/80">Critical</div>
                    <div className="text-2xl font-bold text-red-700 dark:text-red-200">
                      {draftResponse.analysis.red_count}
                    </div>
                  </div>
                </div>

                {/* Overall Assessment */}
                <div>
                  <h3 className="font-display mb-2 text-sm font-semibold text-neutral-700 dark:text-slate-300">
                    Overall Assessment
                  </h3>
                  <p className="font-body rounded border border-iris-100 bg-iris-50 p-3 text-sm text-neutral-700 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-slate-200">
                    {draftResponse.analysis.overall_assessment}
                  </p>
                </div>

                {/* Red Findings */}
                {draftResponse.analysis.red_findings.length > 0 && (
                  <div>
                    <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-200">
                      <XCircle className="h-4 w-4" />
                      Critical Issues ({draftResponse.analysis.red_count})
                    </h3>
                    <div className="space-y-2">
                      {draftResponse.analysis.red_findings.map((finding, index) => (
                        <div key={index} className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-400/30 dark:bg-red-400/10">
                          <div className="mb-1 font-semibold text-red-800 dark:text-red-100">{finding.title}</div>
                          <div className="mb-2 text-sm text-red-700 dark:text-red-200">{finding.description}</div>
                          <div className="mb-2 text-xs text-red-600 dark:text-red-200/85">
                            <strong>References:</strong> {finding.references.join(', ')}
                          </div>
                          <div className="rounded bg-red-100 p-2 text-xs text-red-700 dark:bg-red-300/10 dark:text-red-100">
                            <strong>Recommendation:</strong> {finding.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Amber Findings */}
                {draftResponse.analysis.amber_findings.length > 0 && (
                  <div>
                    <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings ({draftResponse.analysis.amber_count})
                    </h3>
                    <div className="space-y-2">
                      {draftResponse.analysis.amber_findings.map((finding, index) => (
                        <div key={index} className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-400/10">
                          <div className="mb-1 font-semibold text-amber-800 dark:text-amber-100">{finding.title}</div>
                          <div className="mb-2 text-sm text-amber-700 dark:text-amber-200">{finding.description}</div>
                          <div className="mb-2 text-xs text-amber-600 dark:text-amber-200/85">
                            <strong>References:</strong> {finding.references.join(', ')}
                          </div>
                          <div className="rounded bg-amber-100 p-2 text-xs text-amber-700 dark:bg-amber-300/10 dark:text-amber-100">
                            <strong>Recommendation:</strong> {finding.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Green Findings */}
                {draftResponse.analysis.green_findings.length > 0 && (
                  <div>
                    <h3 className="font-display mb-2 flex items-center gap-2 text-sm font-semibold text-green-700 dark:text-green-200">
                      <CheckCircle className="h-4 w-4" />
                      Compliant ({draftResponse.analysis.green_count})
                    </h3>
                    <div className="space-y-2">
                      {draftResponse.analysis.green_findings.map((finding, index) => (
                        <div key={index} className="rounded border border-green-200 bg-green-50 p-3 dark:border-green-400/30 dark:bg-green-400/10">
                          <div className="mb-1 font-semibold text-green-800 dark:text-green-100">{finding.title}</div>
                          <div className="text-sm text-green-700 dark:text-green-200">{finding.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing Stats */}
                <div className="flex flex-wrap gap-3 text-xs text-neutral-600 dark:text-slate-400">
                  {draftResponse.analysis.keywords_extracted && (
                    <span>Keywords: {draftResponse.analysis.keywords_extracted}</span>
                  )}
                  {draftResponse.analysis.documents_searched && (
                    <span>Documents: {draftResponse.analysis.documents_searched}</span>
                  )}
                  {draftResponse.analysis.chunks_analyzed && (
                    <span>Chunks: {draftResponse.analysis.chunks_analyzed}</span>
                  )}
                  <span>Time: {draftResponse.analysis.processing_time_seconds.toFixed(1)}s</span>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
