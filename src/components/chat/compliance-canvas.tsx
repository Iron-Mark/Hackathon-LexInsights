'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Edit3, Eye, History, Save, Search, FileCheck, ChevronDown, Sparkles, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useComplianceStore } from '@/lib/store/compliance-store'
import { VersionHistorySidebar } from './version-history-sidebar'
import { AIDisclaimer, AIDisclaimerBadge } from './ai-disclaimer'
import { cn } from '@/lib/utils'
import { type RAGResponse } from '@/lib/services/rag-api'
import { exportToDocx } from '@/lib/utils/docx-export'
import { type DeepSearchResponse } from '@/lib/services/deep-search-api'
import { showToast } from '@/components/ui/toast'

interface ComplianceCanvasProps {
  content: string
  fileName?: string
  ragResponse?: RAGResponse
  searchQueries?: string[]
  documentCount?: number
  deepSearchResult?: DeepSearchResponse | null
}

export function ComplianceCanvas({ content, fileName, ragResponse, searchQueries, documentCount, deepSearchResult: externalDeepSearchResult }: ComplianceCanvasProps) {
  const { 
    isEditMode, 
    toggleEditMode, 
    getCurrentVersion, 
    addVersion 
  } = useComplianceStore()
  
  const [editContent, setEditContent] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [deepSearchResult, setDeepSearchResult] = useState<DeepSearchResponse | null>(externalDeepSearchResult || null)
  const [showDeepSearch, setShowDeepSearch] = useState(false)
  const currentVersion = getCurrentVersion()

  // Update deep search result when external prop changes
  useEffect(() => {
    if (externalDeepSearchResult) {
      setDeepSearchResult(externalDeepSearchResult)
      setShowDeepSearch(true)
    }
  }, [externalDeepSearchResult])

  // Initialize with current version or new content
  useEffect(() => {
    if (currentVersion) {
      setEditContent(currentVersion.content)
    } else if (content) {
      setEditContent(content)
      // Add initial version
      addVersion(content, 'Initial Report')
    }
  }, [content, currentVersion, addVersion])

  // Update edit content when version changes
  useEffect(() => {
    if (currentVersion) {
      setEditContent(currentVersion.content)
    }
  }, [currentVersion])
  const handleDownloadMarkdown = () => {
    const contentToDownload = currentVersion?.content || content
    const blob = new Blob([contentToDownload], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName || 'compliance-report'}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  const handleDownloadDocx = async () => {
    setIsDownloading(true)
    try {
      const contentToDownload = currentVersion?.content || content
      await exportToDocx({
        content: contentToDownload,
        fileName: fileName || 'compliance-report',
        title: 'Compliance Analysis Report',
      })
      setShowDownloadMenu(false)
    } catch (error) {
      console.error('Error exporting to DOCX:', error)
      showToast('Failed to export to DOCX. Please try again.', 'error')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleSave = () => {
    if (editContent !== currentVersion?.content) {
      const versionLabel = `Version ${useComplianceStore.getState().versions.length + 1}`
      addVersion(editContent, versionLabel)
      
      // Announce to screen readers
      const announcement = 'Changes saved as new version'
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('role', 'status')
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.className = 'sr-only'
      liveRegion.textContent = announcement
      document.body.appendChild(liveRegion)
      setTimeout(() => document.body.removeChild(liveRegion), 1000)
    }
  }

  // Always prioritize the content prop over stored versions for fresh analysis
  const displayContent = content || currentVersion?.content || ''

  // Enhanced markdown rendering with semantic status blocks
  const renderContent = (text: string) => {
    type ComplianceTone = 'green' | 'yellow' | 'red'

    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let currentSection: ComplianceTone | null = null
    let sectionContent: string[] = []

    const toneStyles = {
      green: {
        section: 'bg-green-50 border-green-200 dark:border-green-400/30 dark:bg-green-400/10',
        heading: 'text-green-800 border-green-600 dark:border-green-300 dark:text-green-100',
        text: 'text-green-800 dark:text-green-100',
        badge: 'text-green-700 bg-green-50 dark:bg-green-400/10 dark:text-green-100',
        icon: 'text-green-600 dark:text-green-300',
      },
      yellow: {
        section: 'bg-amber-50 border-amber-200 dark:border-amber-400/30 dark:bg-amber-400/10',
        heading: 'text-amber-800 border-amber-600 dark:border-amber-300 dark:text-amber-100',
        text: 'text-amber-800 dark:text-amber-100',
        badge: 'text-amber-700 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-100',
        icon: 'text-amber-600 dark:text-amber-300',
      },
      red: {
        section: 'bg-red-50 border-red-200 dark:border-red-400/30 dark:bg-red-400/10',
        heading: 'text-red-800 border-red-600 dark:border-red-300 dark:text-red-100',
        text: 'text-red-800 dark:text-red-100',
        badge: 'text-red-700 bg-red-50 dark:bg-red-400/10 dark:text-red-100',
        icon: 'text-red-600 dark:text-red-300',
      },
      neutral: {
        section: 'bg-white border-slate-200 dark:border-neutral-700 dark:bg-neutral-800',
      },
    } as const

    const getComplianceTone = (value: string): ComplianceTone | null => {
      const lower = value.toLowerCase()

      if (
        value.includes('\ud83d\udeab') ||
        /\b(red|critical|blocked|failed|fail|non[-\s]?compliant|violation|missing)\b/.test(lower)
      ) {
        return 'red'
      }

      if (
        value.includes('\u26a0') ||
        /\b(amber|yellow|warning|warnings|needs review|partial|at risk|caution)\b/.test(lower)
      ) {
        return 'yellow'
      }

      if (
        value.includes('\u2705') ||
        /\b(green|compliant|passed|pass|satisfactory)\b/.test(lower)
      ) {
        return 'green'
      }

      return null
    }

    const renderToneIcon = (tone: ComplianceTone, className = 'h-4 w-4') => {
      const iconClass = className + ' flex-shrink-0 ' + toneStyles[tone].icon

      if (tone === 'green') return <CheckCircle2 className={iconClass} aria-hidden="true" />
      if (tone === 'yellow') return <AlertTriangle className={iconClass} aria-hidden="true" />
      return <XCircle className={iconClass} aria-hidden="true" />
    }

    const renderSection = (content: string[], color: ComplianceTone | null, startIndex: number) => {
      if (content.length === 0) return null

      const style = color ? toneStyles[color].section : toneStyles.neutral.section

      return (
        <div key={'section-' + startIndex} className={'my-4 rounded-lg border p-4 ' + style}>
          {content.map((line, idx) => renderLine(line, startIndex + idx))}
        </div>
      )
    }

    const renderLine = (line: string, index: number) => {
      const trimmed = line.trim()
      const headingTone = getComplianceTone(line)

      if (line.startsWith('## ') && headingTone) {
        return (
          <h2 key={index} className={'mb-2 flex items-center gap-2 border-l-4 py-2 pl-4 text-xl font-bold ' + toneStyles[headingTone].heading}>
            {renderToneIcon(headingTone, 'h-5 w-5')}
            <span>{line.slice(3)}</span>
          </h2>
        )
      }

      if (line.startsWith('### ') && headingTone) {
        return (
          <h3 key={index} className={'mb-2 mt-3 flex items-center gap-2 border-l-2 px-3 py-2 text-lg font-bold ' + toneStyles[headingTone].heading}>
            {renderToneIcon(headingTone)}
            <span>{line.slice(4)}</span>
          </h3>
        )
      }

      if (line.startsWith('# ')) {
        return <h1 key={index} className="mb-4 mt-6 text-2xl font-bold text-slate-950 dark:text-slate-100">{line.slice(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="mb-3 mt-5 text-xl font-semibold text-slate-950 dark:text-slate-100">{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="mb-2 mt-4 text-lg font-semibold text-slate-800 dark:text-slate-200">{line.slice(4)}</h3>
      }

      if (line.includes('**Status:**') || /^status:/i.test(trimmed)) {
        const statusTone = getComplianceTone(line)
        if (statusTone) {
          return (
            <p key={index} className={'my-2 inline-flex items-center gap-2 rounded px-2 py-1 font-semibold ' + toneStyles[statusTone].badge}>
              {renderToneIcon(statusTone)}
              <span>{line}</span>
            </p>
          )
        }
      }

      if (line.includes('Compliance Score:')) {
        const score = line.match(/(\d+)%/)
        const scoreNum = score ? parseInt(score[1]) : 0
        let colorClass = 'text-red-700 bg-red-50 border-red-200 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-100'
        if (scoreNum >= 80) colorClass = 'text-green-700 bg-green-50 border-green-200 dark:border-green-400/30 dark:bg-green-400/10 dark:text-green-100'
        else if (scoreNum >= 60) colorClass = 'text-amber-700 bg-amber-50 border-amber-200 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100'

        return <div key={index} className={'my-4 rounded-lg border-2 p-4 text-2xl font-bold ' + colorClass}>{line}</div>
      }

      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="my-2 font-semibold text-slate-950 dark:text-slate-100">{line.slice(2, -2)}</p>
      }

      if (trimmed.startsWith('- ')) {
        const listText = trimmed.slice(2)
        const listTone = getComplianceTone(listText)
        const statusListPattern = /^(green|amber|yellow|red|compliant|non[-\s]?compliant|warning|critical|blocked|failed|missing|passed|needs review)\b/i
        const iconList = listText.startsWith('\u2705') || listText.startsWith('\u26a0') || listText.startsWith('\ud83d\udeab')

        if (listTone && (statusListPattern.test(listText) || iconList)) {
          const cleanedText = listText
            .replace(/^[\u2705\u26a0\ufe0f\s]+/, '')
            .replace(/^\ud83d\udeab\s*/, '')
            .trim()

          return (
            <li key={index} className={'ml-4 my-1 flex items-start gap-2 rounded px-2 py-1.5 font-medium ' + toneStyles[listTone].text}>
              {renderToneIcon(listTone)}
              <span>{cleanedText || listText}</span>
            </li>
          )
        }

        return <li key={index} className="ml-4 my-1 text-slate-700 dark:text-slate-300">{listText}</li>
      }

      if (/^\d+\./.test(trimmed)) {
        return <li key={index} className="ml-4 my-1 text-slate-700 dark:text-slate-300">{trimmed.replace(/^\d+\.\s*/, '')}</li>
      }

      if (/^(action|deadline|target|owner):/i.test(trimmed)) {
        return <p key={index} className="my-2 pl-6 leading-relaxed text-slate-700 dark:text-slate-300">{line}</p>
      }

      if (trimmed === '---') {
        return <hr key={index} className="my-6 border-slate-200 dark:border-neutral-700" />
      }

      if (line.includes('|')) {
        const cells = line.split('|').filter(cell => cell.trim())
        return (
          <div key={index} className="flex gap-2 border-b border-slate-200 py-2 dark:border-neutral-700">
            {cells.map((cell, i) => (
              <div key={i} className="flex-1 text-sm text-slate-700 dark:text-slate-300">{cell.trim()}</div>
            ))}
          </div>
        )
      }

      if (!trimmed) {
        return <div key={index} className="h-2" />
      }

      return <p key={index} className="my-2 leading-relaxed text-slate-700 dark:text-slate-300">{line}</p>
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const sectionTone = line.startsWith('## ') ? getComplianceTone(line) : null

      if (line.startsWith('## ') && sectionTone) {
        if (sectionContent.length > 0) {
          const section = renderSection(sectionContent, currentSection, i - sectionContent.length)
          if (section) elements.push(section)
          sectionContent = []
        }
        currentSection = sectionTone
        sectionContent.push(line)
      } else if (line.startsWith('## ')) {
        if (sectionContent.length > 0) {
          const section = renderSection(sectionContent, currentSection, i - sectionContent.length)
          if (section) elements.push(section)
          sectionContent = []
        }
        currentSection = null
        elements.push(renderLine(line, i))
      } else if (currentSection) {
        sectionContent.push(line)
      } else {
        elements.push(renderLine(line, i))
      }
    }

    if (sectionContent.length > 0) {
      const section = renderSection(sectionContent, currentSection, lines.length - sectionContent.length)
      if (section) elements.push(section)
    }

    return elements
  }

  return (
    <div 
      className="relative flex h-full border-l border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-900"
      role="region"
      aria-label="Compliance report viewer"
    >
      {/* Version History Sidebar */}
      {showHistory && (
        <div className="w-64 border-r border-slate-200 bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900">
          <VersionHistorySidebar />
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Canvas Header */}
        <header className="border-b border-slate-200 bg-white px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900">
          <div className="flex flex-col gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-iris-50 text-iris-700 dark:bg-iris-400/10 dark:text-iris-200">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-bold leading-6 text-neutral-900 dark:text-slate-100">
                    Compliance Report
                  </h2>
                  {currentVersion && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-body text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-slate-300">
                      {currentVersion.label}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {ragResponse?.provider_mode === 'local-providerless' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
                      Local mode
                    </span>
                  )}
                  {documentCount !== undefined && documentCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-iris-50 px-2.5 py-1 text-xs font-semibold text-iris-700 dark:bg-iris-400/10 dark:text-iris-200">
                      <FileCheck className="h-3 w-3" aria-hidden="true" />
                      {documentCount} docs
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-neutral-700 dark:bg-neutral-800/80">
            {/* History Toggle */}
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-visible:ring-offset-neutral-800',
                showHistory && 'border-iris-300 bg-iris-50 text-iris-700 dark:border-iris-400/50 dark:bg-iris-400/10 dark:text-iris-200'
              )}
              aria-label={showHistory ? 'Hide version history' : 'Show version history'}
              aria-pressed={showHistory}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm">History</span>
            </Button>

            {/* Edit/Preview Toggle */}
            <Button
              onClick={toggleEditMode}
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-visible:ring-offset-neutral-800',
                isEditMode && 'border-iris-300 bg-iris-50 text-iris-700 dark:border-iris-400/50 dark:bg-iris-400/10 dark:text-iris-200'
              )}
              aria-label={isEditMode ? 'Switch to preview mode' : 'Switch to edit mode'}
              aria-pressed={isEditMode}
            >
              {isEditMode ? (
                <>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">Preview</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  <span className="text-sm">Edit</span>
                </>
              )}
            </Button>

            {/* Save Button (Edit Mode Only) */}
            {isEditMode && (
              <Button
                onClick={handleSave}
                variant="default"
                size="sm"
                className="h-9 gap-2 bg-primary hover:bg-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-800"
                aria-label="Save changes as new version"
                disabled={editContent === currentVersion?.content}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm">Save</span>
              </Button>
            )}

            {/* Download Button with Dropdown */}
            <div className="relative">
              <Button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                variant="outline"
                size="sm"
                className="h-9 gap-2 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:focus-visible:ring-offset-neutral-800"
                aria-label="Download compliance report"
                aria-expanded={showDownloadMenu}
                aria-haspopup="true"
                disabled={isDownloading}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className="text-sm">Download</span>
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </Button>
              
              {showDownloadMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDownloadMenu(false)}
                    aria-hidden="true"
                  />
                  
                  {/* Dropdown Menu */}
                  <div 
                    className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:shadow-black/30"
                    role="menu"
                    aria-label="Download format options"
                  >
                    <button
                      onClick={handleDownloadMarkdown}
                      className="flex w-full items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset dark:text-slate-300 dark:hover:bg-neutral-800"
                      role="menuitem"
                      disabled={isDownloading}
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={handleDownloadDocx}
                      className="flex w-full items-center gap-2 rounded-b-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset dark:text-slate-300 dark:hover:bg-neutral-800"
                      role="menuitem"
                      disabled={isDownloading}
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      <span>{isDownloading ? 'Exporting...' : 'Word (.docx)'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Canvas Content */}
        {isEditMode ? (
          /* Edit Mode - Raw Markdown Editor */
          <div className="flex-1 overflow-hidden p-4">
            <label htmlFor="markdown-editor" className="sr-only">
              Edit compliance report markdown
            </label>
            <textarea
              id="markdown-editor"
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="h-full w-full resize-none rounded-lg border-2 border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-100 dark:focus:ring-offset-neutral-900"
              placeholder="Enter markdown content..."
              aria-label="Markdown editor"
              spellCheck="false"
            />
          </div>
        ) : (
          /* Preview Mode - Formatted View */
          <article 
            className="flex-1 overflow-y-auto p-6 pb-32 focus:outline-none"
            tabIndex={0}
            aria-label="Compliance report content"
          >
            {/* Loading State */}
            {!displayContent && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-slate-200 dark:border-neutral-700"></div>
                  <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-iris-600 border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-slate-950 dark:text-slate-100">Analyzing Document...</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {fileName ? `Processing ${fileName}` : 'Generating compliance report'}
                  </p>
                </div>
              </div>
            )}

            {/* AI Disclaimer - Always show at top when content is ready */}
            {displayContent && <AIDisclaimer />}

            {/* Deep Search Results */}
            {showDeepSearch && deepSearchResult && (
              <div className="mb-6 rounded-lg border-2 border-iris-200 bg-gradient-to-r from-iris-50 to-purple-50 p-4 dark:border-iris-400/30 dark:from-iris-400/10 dark:to-purple-400/10">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-iris-600 dark:text-iris-200" aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold text-iris-900 dark:text-iris-100">
                    Deep Search Results
                  </h3>
                  <span className="rounded bg-iris-100 px-2 py-0.5 text-xs text-iris-600 dark:bg-iris-400/15 dark:text-iris-200">
                    {deepSearchResult.documents_searched} documents analyzed
                  </span>
                </div>

                {/* Related Documents */}
                {deepSearchResult.related_documents.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Related Documents:</h4>
                    <div className="space-y-2">
                      {deepSearchResult.related_documents.map((doc, idx) => (
                        <div key={idx} className="rounded border border-iris-200 bg-white p-3 dark:border-iris-400/30 dark:bg-neutral-800">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-950 dark:text-slate-100">{doc.title}</p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{doc.excerpt}</p>
                              <p className="mt-1 text-xs text-iris-600 dark:text-iris-200">{doc.reference}</p>
                            </div>
                            <span className="rounded bg-iris-100 px-2 py-1 text-xs font-semibold text-iris-700 dark:bg-iris-400/15 dark:text-iris-200">
                              {(doc.relevance_score * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Insights */}
                {deepSearchResult.additional_insights.length > 0 && (
                  <div className="mb-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Additional Insights:</h4>
                    <ul className="space-y-1">
                      {deepSearchResult.additional_insights.map((insight, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-iris-600" aria-hidden="true" />
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cross References */}
                {deepSearchResult.cross_references.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Cross References:</h4>
                    <div className="flex flex-wrap gap-2">
                      {deepSearchResult.cross_references.map((ref, idx) => (
                        <span key={idx} className="rounded border border-iris-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-iris-400/30 dark:bg-neutral-800 dark:text-slate-300">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowDeepSearch(false)}
                  className="mt-3 text-xs text-iris-600 underline hover:text-iris-700 dark:text-iris-200 dark:hover:text-iris-100"
                >
                  Hide Deep Search Results
                </button>
              </div>
            )}

            {/* RAG Metadata Section */}
            {displayContent && ragResponse && (
              <div className="mb-6 border-b border-slate-200 pb-4 dark:border-neutral-700">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-iris-600 dark:text-iris-200" aria-hidden="true" />
                  <h3 className="font-display text-sm font-semibold text-neutral-900 dark:text-slate-100">
                    Research Metadata
                  </h3>
                  <AIDisclaimerBadge />
                </div>
                
                {searchQueries && searchQueries.length > 0 && (
                  <div className="mb-2">
                    <p className="font-body mb-1 text-xs text-neutral-600 dark:text-slate-400">Search Queries Used:</p>
                    <div className="flex flex-wrap gap-1">
                      {searchQueries.map((query, index) => (
                        <span 
                          key={index} 
                          className="rounded border border-iris-200 bg-iris-50 px-2 py-1 text-xs font-medium text-iris-700 dark:border-iris-400/30 dark:bg-iris-400/10 dark:text-iris-200"
                        >
                          {query}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-600 dark:text-slate-400">
                  <span>Status: <span className="font-medium text-green-600 dark:text-green-300">{ragResponse.status}</span></span>
                  {ragResponse.provider_mode && (
                    <span>
                      Provider: <span className="font-medium">
                        {ragResponse.provider_mode === 'local-providerless' ? 'Local providerless' : 'Remote RAG'}
                      </span>
                    </span>
                  )}
                  {ragResponse.confidence_score !== undefined && (
                    <span>Confidence: <span className="font-medium">{(ragResponse.confidence_score * 100).toFixed(0)}%</span></span>
                  )}
                  {documentCount !== undefined && (
                    <span>Documents: <span className="font-medium">{documentCount}</span></span>
                  )}
                </div>
              </div>
            )}
            
            {displayContent && (
              <div className="max-w-none space-y-1">
                {renderContent(displayContent)}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  )
}
