'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Edit3, Eye, History, Save, Search, FileCheck, ChevronDown, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useComplianceStore } from '@/lib/store/compliance-store'
import { VersionHistorySidebar } from './version-history-sidebar'
import { AIDisclaimer, AIDisclaimerBadge } from './ai-disclaimer'
import { cn } from '@/lib/utils'
import { type RAGResponse } from '@/lib/services/rag-api'
import { exportToDocx } from '@/lib/utils/docx-export'
import { type DeepSearchResponse } from '@/lib/services/deep-search-api'

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
      alert('Failed to export to DOCX. Please try again.')
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

  // Enhanced markdown rendering with full color-coded section blocks
  const renderContent = (text: string) => {
    const lines = text.split('\n')
    const elements: React.ReactElement[] = []
    let currentSection: 'green' | 'yellow' | 'red' | null = null
    let sectionContent: string[] = []
    
    const renderSection = (content: string[], color: 'green' | 'yellow' | 'red' | null, startIndex: number) => {
      if (content.length === 0) return null
      
      const bgColor = color === 'green' ? 'bg-green-50' : color === 'yellow' ? 'bg-amber-50' : color === 'red' ? 'bg-red-50' : 'bg-white'
      const borderColor = color === 'green' ? 'border-green-200' : color === 'yellow' ? 'border-amber-200' : color === 'red' ? 'border-red-200' : 'border-slate-200'
      
      return (
        <div key={`section-${startIndex}`} className={`${bgColor} border ${borderColor} rounded-lg p-4 my-4`}>
          {content.map((line, idx) => renderLine(line, startIndex + idx))}
        </div>
      )
    }
    
    const renderLine = (line: string, index: number) => {
      // Color-coded section headers
      if (line.startsWith('## ✅')) {
        return <h2 key={index} className="text-xl font-bold text-green-800 border-l-4 border-green-600 pl-4 py-2 mb-2">{line.slice(2)}</h2>
      }
      if (line.startsWith('## ⚠️')) {
        return <h2 key={index} className="text-xl font-bold text-amber-800 border-l-4 border-amber-600 pl-4 py-2 mb-2">{line.slice(2)}</h2>
      }
      if (line.startsWith('## 🚫')) {
        return <h2 key={index} className="text-xl font-bold text-red-800 border-l-4 border-red-600 pl-4 py-2 mb-2">{line.slice(2)}</h2>
      }
      
      // Subsection headers with status indicators
      if (line.startsWith('### ') && line.includes('✅')) {
        return <h3 key={index} className="text-lg font-bold text-green-800 px-3 py-2 mt-3 mb-2 border-l-2 border-green-600">{line.slice(4)}</h3>
      }
      if (line.startsWith('### ') && line.includes('⚠️')) {
        return <h3 key={index} className="text-lg font-bold text-amber-800 px-3 py-2 mt-3 mb-2 border-l-2 border-amber-600">{line.slice(4)}</h3>
      }
      if (line.startsWith('### ') && line.includes('🚫')) {
        return <h3 key={index} className="text-lg font-bold text-red-800 px-3 py-2 mt-3 mb-2 border-l-2 border-red-600">{line.slice(4)}</h3>
      }
      
      // Regular headers
      if (line.startsWith('# ')) {
        return <h1 key={index} className="text-2xl font-bold text-slate-900 mt-6 mb-4">{line.slice(2)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="text-xl font-semibold text-slate-900 mt-5 mb-3">{line.slice(3)}</h2>
      }
      if (line.startsWith('### ')) {
        return <h3 key={index} className="text-lg font-semibold text-slate-800 mt-4 mb-2">{line.slice(4)}</h3>
      }
      
      // Status indicators in content
      if (line.includes('**Status:** ✅')) {
        return <p key={index} className="font-semibold text-green-700 my-2 bg-green-50 px-2 py-1 rounded inline-block">{line}</p>
      }
      if (line.includes('**Status:** ⚠️') || line.includes('**Status:** 🚫')) {
        const isWarning = line.includes('⚠️')
        return <p key={index} className={`font-semibold my-2 px-2 py-1 rounded inline-block ${isWarning ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50'}`}>{line}</p>
      }
      
      // Compliance score
      if (line.includes('Compliance Score:')) {
        const score = line.match(/(\d+)%/)
        const scoreNum = score ? parseInt(score[1]) : 0
        let colorClass = 'text-red-700 bg-red-50 border-red-200'
        if (scoreNum >= 80) colorClass = 'text-green-700 bg-green-50 border-green-200'
        else if (scoreNum >= 60) colorClass = 'text-amber-700 bg-amber-50 border-amber-200'
        
        return <div key={index} className={`text-2xl font-bold my-4 p-4 rounded-lg border-2 ${colorClass}`}>{line}</div>
      }
      
      // Bold text
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="font-semibold text-slate-900 my-2">{line.slice(2, -2)}</p>
      }
      
      // List items with color coding
      if (line.trim().startsWith('- ✅') || line.trim().startsWith('✅')) {
        return <li key={index} className="text-green-800 ml-4 my-1 px-2 py-1.5 font-medium">{line.trim().replace(/^-?\s*✅\s*/, '✅ ')}</li>
      }
      if (line.trim().startsWith('- ⚠️') || line.trim().startsWith('⚠️')) {
        return <li key={index} className="text-amber-800 ml-4 my-1 px-2 py-1.5 font-medium">{line.trim().replace(/^-?\s*⚠️\s*/, '⚠️ ')}</li>
      }
      if (line.trim().startsWith('- 🚫') || line.trim().startsWith('🚫')) {
        return <li key={index} className="text-red-800 ml-4 my-1 px-2 py-1.5 font-medium">{line.trim().replace(/^-?\s*🚫\s*/, '🚫 ')}</li>
      }
      
      // Regular list items
      if (line.trim().startsWith('- ')) {
        return <li key={index} className="text-slate-700 ml-4 my-1">{line.trim().slice(2)}</li>
      }
      
      // Numbered lists
      if (/^\d+\./.test(line.trim())) {
        return <li key={index} className="text-slate-700 ml-4 my-1">{line.trim().replace(/^\d+\.\s*/, '')}</li>
      }
      
      // Action items with icons
      if (line.trim().startsWith('✏️') || line.trim().startsWith('📅') || line.trim().startsWith('🎯')) {
        return <p key={index} className="text-slate-700 my-2 pl-6 leading-relaxed">{line}</p>
      }
      
      // Horizontal rule
      if (line.trim() === '---') {
        return <hr key={index} className="my-6 border-slate-200" />
      }
      
      // Table rows (simple detection)
      if (line.includes('|')) {
        const cells = line.split('|').filter(cell => cell.trim())
        return (
          <div key={index} className="flex gap-2 border-b border-slate-200 py-2">
            {cells.map((cell, i) => (
              <div key={i} className="flex-1 text-sm text-slate-700">{cell.trim()}</div>
            ))}
          </div>
        )
      }
      
      // Empty lines
      if (!line.trim()) {
        return <div key={index} className="h-2" />
      }
      
      // Regular paragraphs
      return <p key={index} className="text-slate-700 my-2 leading-relaxed">{line}</p>
    }
    
    // Process lines and group by sections
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Detect section changes
      if (line.startsWith('## ✅')) {
        if (sectionContent.length > 0) {
          const section = renderSection(sectionContent, currentSection, i - sectionContent.length)
          if (section) elements.push(section)
          sectionContent = []
        }
        currentSection = 'green'
        sectionContent.push(line)
      } else if (line.startsWith('## ⚠️')) {
        if (sectionContent.length > 0) {
          const section = renderSection(sectionContent, currentSection, i - sectionContent.length)
          if (section) elements.push(section)
          sectionContent = []
        }
        currentSection = 'yellow'
        sectionContent.push(line)
      } else if (line.startsWith('## 🚫')) {
        if (sectionContent.length > 0) {
          const section = renderSection(sectionContent, currentSection, i - sectionContent.length)
          if (section) elements.push(section)
          sectionContent = []
        }
        currentSection = 'red'
        sectionContent.push(line)
      } else if (line.startsWith('## ') && !line.includes('✅') && !line.includes('⚠️') && !line.includes('🚫')) {
        // Regular section - end current colored section
        if (sectionContent.length > 0) {
          const section = renderSection(sectionContent, currentSection, i - sectionContent.length)
          if (section) elements.push(section)
          sectionContent = []
        }
        currentSection = null
        elements.push(renderLine(line, i))
      } else {
        // Add to current section
        if (currentSection) {
          sectionContent.push(line)
        } else {
          elements.push(renderLine(line, i))
        }
      }
    }
    
    // Render remaining section
    if (sectionContent.length > 0) {
      const section = renderSection(sectionContent, currentSection, lines.length - sectionContent.length)
      if (section) elements.push(section)
    }
    
    return elements
  }

  return (
    <div 
      className="flex h-full border-l border-slate-200 bg-white"
      role="region"
      aria-label="Compliance report viewer"
    >
      {/* Version History Sidebar */}
      {showHistory && (
        <div className="w-64 border-r border-slate-200 bg-slate-50">
          <VersionHistorySidebar />
        </div>
      )}

      {/* Main Canvas */}
      <div className="flex flex-1 flex-col">
        {/* Canvas Header */}
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-neutral-900 truncate">
              Compliance Report
            </h2>
            {currentVersion && (
              <span className="font-body text-xs text-neutral-600 truncate max-w-[120px] font-medium">
                ({currentVersion.label})
              </span>
            )}
            {documentCount !== undefined && documentCount > 0 && (
              <span className="inline-flex items-center gap-1 bg-iris-100 text-iris-700 px-2 py-1 rounded text-xs font-medium">
                <FileCheck className="h-3 w-3" aria-hidden="true" />
                {documentCount} docs
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* History Toggle */}
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                showHistory && 'bg-slate-100'
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
                'h-9 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isEditMode && 'bg-iris-100 text-iris-700 border-iris-300'
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
                className="h-9 gap-2 bg-primary hover:bg-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                className="h-9 gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
                    className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-slate-200 bg-white shadow-lg"
                    role="menu"
                    aria-label="Download format options"
                  >
                    <button
                      onClick={handleDownloadMarkdown}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-t-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                      role="menuitem"
                      disabled={isDownloading}
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={handleDownloadDocx}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-b-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
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
              className="h-full w-full resize-none rounded-lg border-2 border-slate-200 bg-white p-4 font-mono text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              placeholder="Enter markdown content..."
              aria-label="Markdown editor"
              spellCheck="false"
            />
          </div>
        ) : (
          /* Preview Mode - Formatted View */
          <article 
            className="flex-1 overflow-y-auto p-6 focus:outline-none"
            tabIndex={0}
            aria-label="Compliance report content"
          >
            {/* Loading State */}
            {!displayContent && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-slate-200"></div>
                  <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-iris-600 border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-slate-900">Analyzing Document...</p>
                  <p className="text-sm text-slate-600">
                    {fileName ? `Processing ${fileName}` : 'Generating compliance report'}
                  </p>
                </div>
              </div>
            )}

            {/* AI Disclaimer - Always show at top when content is ready */}
            {displayContent && <AIDisclaimer />}

            {/* Deep Search Results */}
            {showDeepSearch && deepSearchResult && (
              <div className="mb-6 p-4 bg-gradient-to-r from-iris-50 to-purple-50 border-2 border-iris-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-iris-600" aria-hidden="true" />
                  <h3 className="font-display text-base font-semibold text-iris-900">
                    Deep Search Results
                  </h3>
                  <span className="text-xs text-iris-600 bg-iris-100 px-2 py-0.5 rounded">
                    {deepSearchResult.documents_searched} documents analyzed
                  </span>
                </div>

                {/* Related Documents */}
                {deepSearchResult.related_documents.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Related Documents:</h4>
                    <div className="space-y-2">
                      {deepSearchResult.related_documents.map((doc, idx) => (
                        <div key={idx} className="bg-white p-3 rounded border border-iris-200">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm text-slate-900">{doc.title}</p>
                              <p className="text-xs text-slate-600 mt-1">{doc.excerpt}</p>
                              <p className="text-xs text-iris-600 mt-1">{doc.reference}</p>
                            </div>
                            <span className="text-xs font-semibold text-iris-700 bg-iris-100 px-2 py-1 rounded">
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
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Additional Insights:</h4>
                    <ul className="space-y-1">
                      {deepSearchResult.additional_insights.map((insight, idx) => (
                        <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                          <span className="text-iris-600 mt-0.5">•</span>
                          <span>{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Cross References */}
                {deepSearchResult.cross_references.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-2">Cross References:</h4>
                    <div className="flex flex-wrap gap-2">
                      {deepSearchResult.cross_references.map((ref, idx) => (
                        <span key={idx} className="text-xs bg-white text-slate-700 px-2 py-1 rounded border border-iris-200">
                          {ref}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowDeepSearch(false)}
                  className="mt-3 text-xs text-iris-600 hover:text-iris-700 underline"
                >
                  Hide Deep Search Results
                </button>
              </div>
            )}

            {/* RAG Metadata Section */}
            {displayContent && ragResponse && (
              <div className="mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <Search className="h-4 w-4 text-iris-600" aria-hidden="true" />
                  <h3 className="font-display text-sm font-semibold text-neutral-900">
                    Research Metadata
                  </h3>
                  <AIDisclaimerBadge />
                </div>
                
                {searchQueries && searchQueries.length > 0 && (
                  <div className="mb-2">
                    <p className="font-body text-xs text-neutral-600 mb-1">Search Queries Used:</p>
                    <div className="flex flex-wrap gap-1">
                      {searchQueries.map((query, index) => (
                        <span 
                          key={index} 
                          className="bg-iris-50 text-iris-700 px-2 py-1 rounded text-xs font-medium border border-iris-200"
                        >
                          {query}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-4 text-xs text-neutral-600">
                  <span>Status: <span className="font-medium text-green-600">{ragResponse.status}</span></span>
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
