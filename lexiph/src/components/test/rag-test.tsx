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

  // ============================================================================
  // RAG HANDLERS
  // ============================================================================

  const handleTestRAG = async () => {
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const result = await queryRAG({
        query: query.trim(),
        user_id: 'LexInSight_test_user',
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
        user_id: 'LexInSight_test_user',
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
    if (ragWs && query.trim()) {
      setWsEvents([])
      setResponse(null)
      ragWs.sendQuery(query.trim(), 'LexInSight_test_user', useDeepSearch)
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
        <h1 className="font-display text-2xl font-bold text-neutral-900 mb-2">
          RAG API Test Interface
        </h1>
        <p className="font-body text-neutral-600">
          Test the Philippine Legislation Research API
        </p>
      </div>

      {/* Tabs */}
      <Card className="p-1 border-iris-100">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('rag')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded font-medium text-sm transition-colors ${
              activeTab === 'rag'
                ? 'bg-iris-600 text-white'
                : 'text-neutral-600 hover:bg-iris-50'
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
                : 'text-neutral-600 hover:bg-iris-50'
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
                : 'text-neutral-600 hover:bg-iris-50'
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
          <Card className="p-4 border-iris-100">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                API Health Check
              </h2>
              <Button
                onClick={handleHealthCheck}
                variant="outline"
                size="sm"
                className="border-iris-300 text-iris-700 hover:bg-iris-50"
              >
                Check Status
              </Button>
            </div>
            {healthStatus && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-iris-50">
                {healthStatus.includes('Error') ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-iris-600" />
                )}
                <span className="font-body text-sm text-neutral-700">{healthStatus}</span>
              </div>
            )}
          </Card>

          {/* Sample Queries */}
          <Card className="p-4 border-iris-100">
            <h2 className="font-display text-lg font-semibold mb-3 text-neutral-900">
              Sample Queries
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SAMPLE_QUERIES.map((sampleQuery, index) => (
                <Button
                  key={index}
                  onClick={() => handleSampleQuery(sampleQuery)}
                  variant="outline"
                  size="sm"
                  className="text-left justify-start h-auto p-2.5 whitespace-normal border-iris-200 hover:bg-iris-50 hover:border-iris-300 transition-colors"
                >
                  <span className="font-body text-xs text-neutral-700">{sampleQuery}</span>
                </Button>
              ))}
            </div>
          </Card>

          {/* Query Input */}
          <Card className="p-4">
            <h2 className="font-display text-lg font-semibold mb-3">Test Query</h2>
            <div className="space-y-3">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your Philippine legislation question..."
                className="w-full h-20 p-3 border border-slate-200 rounded-lg font-body text-sm resize-none focus:outline-none focus:ring-2 focus:ring-iris-500 focus:border-iris-500 transition-colors"
                maxLength={500}
              />
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{query.length}/500 characters</span>
                {activeTab === 'deep-search' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useDeepSearch}
                      onChange={(e) => setUseDeepSearch(e.target.checked)}
                      className="rounded border-iris-300 text-iris-600 focus:ring-iris-500"
                    />
                    <span className="text-sm text-neutral-700">Enable Deep Search (PDF extraction)</span>
                  </label>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleTestRAG}
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
                  className="flex items-center gap-2 border-iris-300 text-iris-700 hover:bg-iris-50"
                >
                  {wsConnected ? (
                    <Wifi className="h-4 w-4 text-iris-600" />
                  ) : (
                    <WifiOff className="h-4 w-4" />
                  )}
                  {wsConnected ? 'Disconnect WS' : 'Connect WebSocket'}
                </Button>

                {wsConnected && (
                  <Button
                    onClick={handleWebSocketQuery}
                    disabled={!query.trim()}
                    variant="outline"
                    className="border-iris-300 text-iris-700 hover:bg-iris-50"
                  >
                    Send via WebSocket
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* WebSocket Events */}
          {wsEvents.length > 0 && (
            <Card className="p-4 border-iris-100">
              <h2 className="font-display text-lg font-semibold mb-3 text-neutral-900">
                WebSocket Events
              </h2>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {wsEvents.map((event, index) => (
                  <div
                    key={index}
                    className="text-sm font-mono bg-iris-50 p-2.5 rounded border border-iris-100"
                  >
                    <span className="text-iris-600">[{event.timestamp}]</span>
                    <span className="ml-2 font-semibold text-neutral-800">{event.stage}:</span>
                    <span className="ml-1 text-neutral-700">{event.message}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <h2 className="font-display text-lg font-semibold text-red-800">Error</h2>
              </div>
              <p className="font-body text-red-700 mt-2">{error}</p>
            </Card>
          )}

          {/* Response Display */}
          {response && (
            <Card className="p-4 border-iris-100">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-iris-600" />
                <h2 className="font-display text-lg font-semibold text-neutral-900">API Response</h2>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-neutral-700 mb-1">
                      Status
                    </h3>
                    <span
                      className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                        response.status === 'completed'
                          ? 'bg-iris-100 text-iris-800 border border-iris-200'
                          : response.status === 'no_results'
                          ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}
                    >
                      {response.status}
                    </span>
                  </div>

                  {response.deep_search_used !== undefined && (
                    <div>
                      <h3 className="font-display text-sm font-semibold text-neutral-700 mb-1">
                        Deep Search
                      </h3>
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                          response.deep_search_used
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}
                      >
                        {response.deep_search_used ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  )}

                  {response.processing_time_seconds && (
                    <div>
                      <h3 className="font-display text-sm font-semibold text-neutral-700 mb-1">
                        Processing Time
                      </h3>
                      <span className="inline-block px-2.5 py-1 rounded text-xs font-medium bg-iris-100 text-iris-800 border border-iris-200">
                        {response.processing_time_seconds.toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-display text-sm font-semibold text-neutral-700 mb-1">Query</h3>
                  <p className="font-body text-sm text-neutral-600 bg-iris-50 p-2 rounded border border-iris-100">
                    {response.query}
                  </p>
                </div>

                {response.search_queries_used && response.search_queries_used.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold text-neutral-700 mb-2">
                      Search Queries Used ({response.search_queries_used.length})
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {response.search_queries_used.map((searchQuery, index) => (
                        <span
                          key={index}
                          className="bg-iris-100 text-iris-700 px-2.5 py-1 rounded text-xs font-medium border border-iris-200"
                        >
                          {searchQuery}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-display text-sm font-semibold text-neutral-700 mb-1">
                    Documents Found
                  </h3>
                  <span className="inline-flex items-center gap-1.5 bg-iris-100 text-iris-700 px-2.5 py-1 rounded text-sm font-medium border border-iris-200">
                    {response.documents_found} documents
                  </span>
                </div>

                <div>
                  <h3 className="font-display text-sm font-semibold text-neutral-700 mb-2">
                    Summary
                  </h3>
                  <div className="bg-iris-50 p-4 rounded-lg border border-iris-100 max-h-96 overflow-y-auto">
                    <pre className="font-body text-sm text-neutral-800 whitespace-pre-wrap">
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
          <Card className="p-4 border-iris-100">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-neutral-900">
                Draft Checker Health
              </h2>
              <Button
                onClick={handleDraftHealthCheck}
                variant="outline"
                size="sm"
                className="border-iris-300 text-iris-700 hover:bg-iris-50"
              >
                Check Status
              </Button>
            </div>
            {draftHealthStatus && (
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-iris-50">
                {draftHealthStatus.includes('Error') ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-iris-600" />
                )}
                <span className="font-body text-sm text-neutral-700">{draftHealthStatus}</span>
              </div>
            )}
          </Card>

          {/* Draft Input */}
          <Card className="p-4">
            <h2 className="font-display text-lg font-semibold mb-3">Legislation Draft</h2>
            <div className="space-y-3">
              <textarea
                value={draftMarkdown}
                onChange={(e) => setDraftMarkdown(e.target.value)}
                placeholder="Enter your legislation draft in markdown format..."
                className="w-full h-64 p-3 border border-slate-200 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-iris-500 focus:border-iris-500 transition-colors"
                maxLength={50000}
              />
              <div className="flex items-center justify-between text-xs text-neutral-500">
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
            <Card className="p-4 border-red-200 bg-red-50">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <h2 className="font-display text-lg font-semibold text-red-800">Error</h2>
              </div>
              <p className="font-body text-red-700 mt-2">{draftError}</p>
            </Card>
          )}

          {/* Draft Response Display */}
          {draftResponse && draftResponse.status === 'success' && (
            <Card className="p-4 border-iris-100">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="h-5 w-5 text-iris-600" />
                <h2 className="font-display text-lg font-semibold text-neutral-900">
                  Analysis Results
                </h2>
              </div>

              <div className="space-y-4">
                {/* Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-iris-50 p-3 rounded-lg border border-iris-100">
                    <div className="text-xs text-neutral-600 mb-1">Compliance Score</div>
                    <div className="text-2xl font-bold text-iris-700">
                      {draftResponse.analysis.compliance_score}
                    </div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                    <div className="text-xs text-neutral-600 mb-1">Compliant</div>
                    <div className="text-2xl font-bold text-green-700">
                      {draftResponse.analysis.green_count}
                    </div>
                  </div>
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <div className="text-xs text-neutral-600 mb-1">Warnings</div>
                    <div className="text-2xl font-bold text-amber-700">
                      {draftResponse.analysis.amber_count}
                    </div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg border border-red-100">
                    <div className="text-xs text-neutral-600 mb-1">Critical</div>
                    <div className="text-2xl font-bold text-red-700">
                      {draftResponse.analysis.red_count}
                    </div>
                  </div>
                </div>

                {/* Overall Assessment */}
                <div>
                  <h3 className="font-display text-sm font-semibold text-neutral-700 mb-2">
                    Overall Assessment
                  </h3>
                  <p className="font-body text-sm text-neutral-700 bg-iris-50 p-3 rounded border border-iris-100">
                    {draftResponse.analysis.overall_assessment}
                  </p>
                </div>

                {/* Red Findings */}
                {draftResponse.analysis.red_findings.length > 0 && (
                  <div>
                    <h3 className="font-display text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      Critical Issues ({draftResponse.analysis.red_count})
                    </h3>
                    <div className="space-y-2">
                      {draftResponse.analysis.red_findings.map((finding, index) => (
                        <div key={index} className="bg-red-50 p-3 rounded border border-red-200">
                          <div className="font-semibold text-red-800 mb-1">{finding.title}</div>
                          <div className="text-sm text-red-700 mb-2">{finding.description}</div>
                          <div className="text-xs text-red-600 mb-2">
                            <strong>References:</strong> {finding.references.join(', ')}
                          </div>
                          <div className="text-xs text-red-700 bg-red-100 p-2 rounded">
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
                    <h3 className="font-display text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Warnings ({draftResponse.analysis.amber_count})
                    </h3>
                    <div className="space-y-2">
                      {draftResponse.analysis.amber_findings.map((finding, index) => (
                        <div key={index} className="bg-amber-50 p-3 rounded border border-amber-200">
                          <div className="font-semibold text-amber-800 mb-1">{finding.title}</div>
                          <div className="text-sm text-amber-700 mb-2">{finding.description}</div>
                          <div className="text-xs text-amber-600 mb-2">
                            <strong>References:</strong> {finding.references.join(', ')}
                          </div>
                          <div className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
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
                    <h3 className="font-display text-sm font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Compliant ({draftResponse.analysis.green_count})
                    </h3>
                    <div className="space-y-2">
                      {draftResponse.analysis.green_findings.map((finding, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                          <div className="font-semibold text-green-800 mb-1">{finding.title}</div>
                          <div className="text-sm text-green-700">{finding.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Processing Stats */}
                <div className="flex flex-wrap gap-3 text-xs text-neutral-600">
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
