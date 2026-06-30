'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { checkDraft, type DraftCheckerResponse } from '@/lib/services/rag-api'
import { extractComplianceDocumentText, type ExtractedDocumentText } from '@/lib/utils/document-text'

function extractionLabel(mode: ExtractedDocumentText['extractionMode']) {
  switch (mode) {
    case 'browser-text':
      return 'Browser text/Markdown'
    case 'server-pdf':
      return 'Server PDF extraction'
    case 'server-docx':
      return 'Server DOCX extraction'
    case 'server-doc':
      return 'Server legacy DOC extraction'
  }
}

export function DocumentTestComponent() {
  const [file, setFile] = useState<File | null>(null)
  const [extraction, setExtraction] = useState<ExtractedDocumentText | null>(null)
  const [response, setResponse] = useState<DraftCheckerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (!file) {
      setError('Select a compliance document first.')
      return
    }

    setLoading(true)
    setError(null)
    setExtraction(null)
    setResponse(null)

    try {
      const extractedDocument = await extractComplianceDocumentText(file)
      const draftResponse = await checkDraft({
        draft_markdown: extractedDocument.text,
        user_id: 'test-document-user',
        include_summary: true,
      })

      setExtraction(extractedDocument)
      setResponse(draftResponse)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Document analysis failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 dark:bg-[#171322] md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-none">
          <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Document Compliance Test Page</h1>
          <p className="text-slate-600 dark:text-slate-300">
            Upload a text, Markdown, PDF, or Word document and run the same extraction plus draft-checking path used by compliance mode.
          </p>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-none">
          <label htmlFor="document-upload" className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Compliance document
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              id="document-upload"
              type="file"
              accept=".pdf,.md,.markdown,.txt,.text,.doc,.docx"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200 dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-100 dark:file:bg-iris-300/12 dark:file:text-iris-100 dark:hover:file:bg-iris-300/18"
            />
            <Button onClick={handleAnalyze} disabled={loading || !file} className="gap-2">
              {loading ? <FileText className="h-4 w-4 animate-pulse" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Analyzing...' : 'Analyze Document'}
            </Button>
          </div>
          {file && (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Selected: <span className="font-medium text-slate-800 dark:text-slate-200">{file.name}</span>
            </p>
          )}
        </section>

        {error && (
          <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          </section>
        )}

        {extraction && response && (
          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-none">
            <div className="flex flex-wrap items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Compliance Analysis Complete</h2>
              <span className="rounded bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                {extractionLabel(extraction.extractionMode)}
              </span>
              {response.analysis.status === 'completed' && (
                <span className="rounded bg-iris-50 px-2 py-1 text-xs font-medium text-iris-700 dark:bg-iris-400/10 dark:text-iris-200">
                  Score {response.analysis.compliance_score}%
                </span>
              )}
            </div>

            {extraction.warnings.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                {extraction.warnings.join('; ')}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-[#171322]/70">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Findings</p>
                <p className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{response.analysis.total_findings}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-red-400/10">
                <p className="text-sm font-medium text-slate-600 dark:text-red-100/80">Red</p>
                <p className="text-2xl font-semibold text-red-700 dark:text-red-200">{response.analysis.red_count}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-4 dark:bg-amber-400/10">
                <p className="text-sm font-medium text-slate-600 dark:text-amber-100/80">Amber</p>
                <p className="text-2xl font-semibold text-amber-700 dark:text-amber-200">{response.analysis.amber_count}</p>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Overall Assessment</h3>
              <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">{response.analysis.overall_assessment}</p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
