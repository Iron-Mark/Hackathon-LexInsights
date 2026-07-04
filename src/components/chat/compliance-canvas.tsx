'use client'

import { useState, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { FileText, Download, Edit3, Eye, History, Save, Search, FileCheck, ChevronDown, Sparkles, CheckCircle2, AlertTriangle, X, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useComplianceStore } from '@/lib/store/compliance-store'
import { VersionHistorySidebar } from './version-history-sidebar'
import { AIDisclaimer, AIDisclaimerBadge } from './ai-disclaimer'
import { cn } from '@/lib/utils'
import { type RAGResponse } from '@/lib/services/rag-api'
import { exportToDocx } from '@/lib/utils/docx-export'
import { formatReportMarkdownForPreview } from '@/lib/utils/practical-checklist'
import { type DeepSearchResponse } from '@/lib/services/deep-search-api'
import { showToast } from '@/components/ui/toast'
import { announceToAssistiveTechnology, downloadBlob } from '@/lib/utils/browser-actions'
import { buildLegalCitationContext, renderLegalCitationNodes } from './legal-citation'

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
  const [isMobileHeader, setIsMobileHeader] = useState(false)
  const [isCompactHeader, setIsCompactHeader] = useState(false)
  const currentVersion = getCurrentVersion()
  const canvasArticleRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const compactThreshold = 40
    const contentEl = canvasArticleRef.current

    const updateHeaderDensity = () => {
      const isMobile = mediaQuery.matches
      setIsMobileHeader(isMobile)

      if (!isMobile || isEditMode || !contentEl) {
        setIsCompactHeader(false)
        return
      }

      setIsCompactHeader(contentEl.scrollTop > compactThreshold)
    }

    const onScroll = () => {
      updateHeaderDensity()
    }

    updateHeaderDensity()

    contentEl?.addEventListener('scroll', onScroll, { passive: true })

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updateHeaderDensity)
    } else {
      mediaQuery.addListener(updateHeaderDensity)
    }

    return () => {
      contentEl?.removeEventListener('scroll', onScroll)

      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', updateHeaderDensity)
      } else {
        mediaQuery.removeListener(updateHeaderDensity)
      }
    }
  }, [isEditMode])

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
    downloadBlob(blob, `${fileName || 'compliance-report'}.md`)
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
      announceToAssistiveTechnology('Changes saved as new version')
    }
  }

  // Always prioritize the content prop over stored versions for fresh analysis
  const displayContent = content || currentVersion?.content || ''
  const previewContent = formatReportMarkdownForPreview(displayContent)
  const citationContext = useMemo(() => buildLegalCitationContext(ragResponse), [ragResponse])
  const renderCitationText = (children: ReactNode, scope: string) =>
    renderLegalCitationNodes(children, citationContext, `compliance-canvas-${scope}`)

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
        field: 'border-green-500/70 bg-[#FBFAFF]/75 dark:border-green-400/20 dark:bg-green-950/20',
        accent: 'text-green-700 dark:text-green-200',
        icon: 'text-green-600 dark:text-green-300',
      },
      yellow: {
        section: 'bg-amber-50 border-amber-200 dark:border-amber-400/30 dark:bg-amber-400/10',
        heading: 'text-amber-800 border-amber-600 dark:border-amber-300 dark:text-amber-100',
        text: 'text-amber-800 dark:text-amber-100',
        badge: 'text-amber-700 bg-amber-50 dark:bg-amber-400/10 dark:text-amber-100',
        field: 'border-amber-500/80 bg-[#FBFAFF]/75 dark:border-amber-400/20 dark:bg-amber-950/20',
        accent: 'text-amber-700 dark:text-amber-200',
        icon: 'text-amber-600 dark:text-amber-300',
      },
      red: {
        section: 'bg-red-50 border-red-200 dark:border-red-400/30 dark:bg-red-400/10',
        heading: 'text-red-800 border-red-600 dark:border-red-300 dark:text-red-100',
        text: 'text-red-800 dark:text-red-100',
        badge: 'text-red-700 bg-red-50 dark:bg-red-400/10 dark:text-red-100',
        field: 'border-red-500/70 bg-[#FBFAFF]/75 dark:border-red-400/20 dark:bg-red-950/20',
        accent: 'text-red-700 dark:text-red-200',
        icon: 'text-red-600 dark:text-red-300',
      },
      neutral: {
        section: 'border-[#8A82DC] bg-[#FBFAFF]/94 shadow-sm shadow-iris-950/8 dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-none',
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
        <div
          key={'section-' + startIndex}
          className={cn(
            'my-4 min-w-0 overflow-hidden rounded-lg border p-4 break-words [overflow-wrap:anywhere]',
            style
          )}
        >
          <div className="space-y-2">
            {content.map((line, idx) => renderLine(line, startIndex + idx, color))}
          </div>
        </div>
      )
    }

    const renderFindingField = (rawText: string, index: number, contextTone: ComplianceTone | null) => {
      const fieldMatch = rawText.match(/^(Status|Category|Severity Score|Description|References|Recommendation):\s*(.*)$/i)

      if (!fieldMatch) {
        return null
      }

      const label = fieldMatch[1]
      const value = fieldMatch[2]
      const normalizedLabel = label.toLowerCase()
      const fieldTone = getComplianceTone(value) || contextTone
      const toneClass = fieldTone ? toneStyles[fieldTone] : null

      if (normalizedLabel === 'status' || normalizedLabel === 'category' || normalizedLabel === 'severity score') {
        const compactLabel = normalizedLabel === 'severity score' ? 'Severity' : label

        return (
          <div
            key={index}
            className={cn(
              'mr-2 mt-1 inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-normal break-words [overflow-wrap:anywhere]',
              toneClass ? `${toneClass.badge} ${toneClass.field}` : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-iris-300/15 dark:bg-[#171322]/70 dark:text-slate-300'
            )}
          >
            {fieldTone && normalizedLabel === 'status' ? renderToneIcon(fieldTone, 'h-3.5 w-3.5') : null}
            <span className="text-[0.68rem] opacity-75">{compactLabel}</span>
            <span className="min-w-0 normal-case">{renderCitationText(value, `field-badge-${index}`)}</span>
          </div>
        )
      }

      const fieldLabel = normalizedLabel === 'references' ? 'Sources' : label

      return (
        <div
          key={index}
          className={cn(
            'my-2 min-w-0 rounded-lg border px-3 py-2.5 break-words [overflow-wrap:anywhere]',
            toneClass ? toneClass.field : 'border-slate-200 bg-slate-50 dark:border-iris-300/15 dark:bg-[#171322]/70'
          )}
        >
          <p
            className={cn(
              'text-[0.7rem] font-bold uppercase tracking-normal',
              toneClass ? toneClass.accent : 'text-slate-500 dark:text-slate-400'
            )}
          >
            {fieldLabel}
          </p>
          <p className="mt-1 text-sm leading-6 text-slate-700 break-words [overflow-wrap:anywhere] dark:text-slate-200">
            {renderCitationText(value || 'Not provided', `field-value-${index}`)}
          </p>
        </div>
      )
    }

    const renderLine = (line: string, index: number, contextTone: ComplianceTone | null = null) => {
      const trimmed = line.trim()
      const headingTone = getComplianceTone(line)

      if (line.startsWith('## ') && headingTone) {
        return (
          <h2 key={index} className={'mb-2 flex items-center gap-2 border-l-4 py-2 pl-4 text-xl font-bold ' + toneStyles[headingTone].heading}>
            {renderToneIcon(headingTone, 'h-5 w-5')}
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {renderCitationText(line.slice(3), `tone-h2-${index}`)}
            </span>
          </h2>
        )
      }

      if (line.startsWith('### ') && headingTone) {
        return (
          <h3 key={index} className={'mb-2 mt-3 flex items-center gap-2 border-l-2 px-3 py-2 text-lg font-bold ' + toneStyles[headingTone].heading}>
            {renderToneIcon(headingTone)}
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              {renderCitationText(line.slice(4), `tone-h3-${index}`)}
            </span>
          </h3>
        )
      }

      if (line.startsWith('# ')) {
        return <h1 key={index} className="mb-4 mt-6 break-words text-2xl font-bold text-slate-950 [overflow-wrap:anywhere] dark:text-slate-100">{renderCitationText(line.slice(2), `h1-${index}`)}</h1>
      }
      if (line.startsWith('## ')) {
        return <h2 key={index} className="mb-3 mt-5 break-words text-xl font-semibold text-slate-950 [overflow-wrap:anywhere] dark:text-slate-100">{renderCitationText(line.slice(3), `h2-${index}`)}</h2>
      }
      if (line.startsWith('### ')) {
        const headingText = line.slice(4)
        const findingMatch = headingText.match(/^(\d+)\.\s*(.+)$/)

        if (contextTone && findingMatch) {
          return (
            <div key={index} className="mt-5 flex min-w-0 items-start gap-3 border-t border-current/15 pt-4 first:mt-0 first:border-t-0 first:pt-0">
              <span
                className={cn(
                  'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  toneStyles[contextTone].badge
                )}
              >
                {findingMatch[1]}
              </span>
              <h3 className="min-w-0 break-words font-display text-base font-bold leading-6 text-slate-950 [overflow-wrap:anywhere] dark:text-slate-100">
                {renderCitationText(findingMatch[2], `finding-heading-${index}`)}
              </h3>
            </div>
          )
        }

        return <h3 key={index} className="mb-2 mt-4 break-words text-lg font-semibold text-slate-800 [overflow-wrap:anywhere] dark:text-slate-200">{renderCitationText(headingText, `h3-${index}`)}</h3>
      }

      if (line.includes('**Status:**') || /^status:/i.test(trimmed)) {
        const statusTone = getComplianceTone(line)
        if (statusTone) {
          return (
            <p key={index} className={'my-2 inline-flex max-w-full items-center gap-2 rounded px-2 py-1 font-semibold break-words [overflow-wrap:anywhere] ' + toneStyles[statusTone].badge}>
              {renderToneIcon(statusTone)}
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{renderCitationText(line, `status-${index}`)}</span>
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

        return <div key={index} className={'my-4 rounded-lg border-2 p-4 text-2xl font-bold break-words [overflow-wrap:anywhere] ' + colorClass}>{renderCitationText(line, `score-${index}`)}</div>
      }

      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={index} className="my-2 break-words font-semibold text-slate-950 [overflow-wrap:anywhere] dark:text-slate-100">{renderCitationText(line.slice(2, -2), `strong-line-${index}`)}</p>
      }

      const checklistMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.+)$/)

      if (checklistMatch) {
        const checked = checklistMatch[1].toLowerCase() === 'x'
        const checklistText = checklistMatch[2]

        return (
          <div
            key={index}
            className="my-2 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-700 shadow-sm dark:border-iris-300/15 dark:bg-[#171322]/60 dark:text-slate-200"
          >
            <input
              type="checkbox"
              checked={checked}
              readOnly
              disabled
              tabIndex={-1}
              aria-label={`Checklist item: ${checklistText}`}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 bg-white accent-iris-600 disabled:cursor-default disabled:opacity-100 dark:border-iris-300/30 dark:bg-[#171322] dark:accent-iris-300"
            />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">{renderCitationText(checklistText, `checklist-${index}`)}</span>
          </div>
        )
      }

      if (trimmed.startsWith('- ')) {
        const listText = trimmed.slice(2)
        const findingField = renderFindingField(listText, index, contextTone)

        if (findingField) {
          return findingField
        }

        const listTone = getComplianceTone(listText)
        const statusListPattern = /^(green|amber|yellow|red|compliant|non[-\s]?compliant|warning|critical|blocked|failed|missing|passed|needs review)\b/i
        const iconList = listText.startsWith('\u2705') || listText.startsWith('\u26a0') || listText.startsWith('\ud83d\udeab')

        if (listTone && (statusListPattern.test(listText) || iconList)) {
          const cleanedText = listText
            .replace(/^[\u2705\u26a0\ufe0f\s]+/, '')
            .replace(/^\ud83d\udeab\s*/, '')
            .trim()

          return (
            <li key={index} className={'ml-4 my-1 flex min-w-0 items-start gap-2 rounded px-2 py-1.5 font-medium break-words [overflow-wrap:anywhere] ' + toneStyles[listTone].text}>
              {renderToneIcon(listTone)}
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                {renderCitationText(cleanedText || listText, `tone-list-${index}`)}
              </span>
            </li>
          )
        }

        return <li key={index} className="ml-4 my-1 min-w-0 break-words text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">{renderCitationText(listText, `list-${index}`)}</li>
      }

      if (/^\d+\./.test(trimmed)) {
        return <li key={index} className="ml-4 my-1 min-w-0 break-words text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">{renderCitationText(trimmed.replace(/^\d+\.\s*/, ''), `numbered-${index}`)}</li>
      }

      if (/^(action|deadline|target|owner):/i.test(trimmed)) {
        return <p key={index} className="my-2 break-words pl-6 leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">{renderCitationText(line, `action-${index}`)}</p>
      }

      if (trimmed === '---') {
        return <hr key={index} className="my-6 border-slate-200 dark:border-iris-300/15" />
      }

      if (line.includes('|')) {
        const cells = line.split('|').filter(cell => cell.trim())
        return (
          <div key={index} className="flex min-w-0 gap-2 border-b border-slate-200 py-2 dark:border-iris-300/15">
            {cells.map((cell, i) => (
              <div key={i} className="min-w-0 flex-1 break-words text-sm text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">
                {renderCitationText(cell.trim(), `table-${index}-${i}`)}
              </div>
            ))}
          </div>
        )
      }

      if (!trimmed) {
        return <div key={index} className="h-2" />
      }

      return <p key={index} className="my-2 break-words leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-slate-300">{renderCitationText(line, `paragraph-${index}`)}</p>
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
      className="relative flex h-full border-l border-[#8A82DC] bg-[#FBFAFF]/92 shadow-[inset_1px_0_0_rgba(63,51,189,0.12)] dark:border-iris-300/15 dark:bg-[#171322] dark:shadow-none"
      role="region"
      aria-label="Compliance report viewer"
    >
      {/* Version History Sidebar */}
      {showHistory && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-20 bg-slate-950/35 backdrop-blur-sm lg:hidden"
            aria-label="Close version history"
            onClick={() => setShowHistory(false)}
          />
          <div className="absolute inset-y-0 left-0 z-30 w-[min(18rem,calc(100vw-3rem))] border-r border-[#8A82DC] bg-[#F8F6FF]/95 shadow-xl shadow-iris-950/15 dark:border-iris-300/15 dark:bg-[#171322] dark:shadow-iris-950/40 lg:relative lg:inset-auto lg:z-auto lg:w-64 lg:bg-[#F8F6FF]/70 lg:shadow-none dark:lg:bg-[#171322]">
            <button
              type="button"
              className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-[#EFECFF] hover:text-iris-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-iris-100 lg:hidden"
              aria-label="Close version history panel"
              onClick={() => setShowHistory(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            <VersionHistorySidebar />
          </div>
        </>
      )}

      {/* Main Canvas */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Canvas Header */}
        <header
          className={cn(
            'border-b border-[#8A82DC] bg-[#F8F6FF]/92 shadow-[0_1px_0_rgba(63,51,189,0.12)] backdrop-blur dark:border-iris-300/15 dark:bg-[#1a1625] dark:shadow-none lg:pr-4',
            isCompactHeader ? 'px-3 py-2.5 pr-16' : isMobileHeader ? 'px-3 py-3 pr-16' : 'px-4 py-4 pr-16'
          )}
        >
          <div className={cn('flex flex-col gap-3', isCompactHeader && 'gap-2')}>
            <div className={cn('flex min-w-0 items-start gap-3', (isMobileHeader || isCompactHeader) && 'items-center gap-2')}>
              <div className={cn('flex shrink-0 items-center justify-center rounded-xl bg-iris-50 text-iris-700 dark:bg-iris-400/10 dark:text-iris-200', isCompactHeader ? 'h-8 w-8' : isMobileHeader ? 'h-9 w-9' : 'h-10 w-10')}>
                <FileText className={cn('h-5 w-5', (isMobileHeader || isCompactHeader) && 'h-4 w-4')} aria-hidden="true" />
              </div>

              <div className="min-w-0 flex-1">
                <div className={cn('flex flex-wrap items-center gap-2', (isMobileHeader || isCompactHeader) && 'gap-1.5')}>
                  <h2 className={cn('font-display text-base font-bold leading-6 text-neutral-900 dark:text-slate-100', isCompactHeader ? 'text-sm leading-5' : isMobileHeader && 'text-[15px] leading-5')}>
                    Compliance Report
                  </h2>
                  {currentVersion && (
                    <span className={cn('rounded-full bg-iris-50 px-2.5 py-1 font-body text-xs font-semibold text-iris-700 ring-1 ring-iris-100 dark:bg-[#241f32] dark:text-slate-300 dark:ring-0', isMobileHeader && 'px-2 py-0.5 text-[11px]', isCompactHeader && 'hidden')}>
                      {currentVersion.label}
                    </span>
                  )}
                </div>

                <div className={cn('mt-2 flex flex-wrap items-center gap-2', isMobileHeader && 'mt-1.5 gap-1.5', isCompactHeader && 'hidden')}>
                  {ragResponse?.provider_mode === 'local-providerless' && (
                    <span className={cn('inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200', isMobileHeader && 'px-2 py-0.5 text-[11px]')}>
                      Local mode
                    </span>
                  )}
                  {documentCount !== undefined && documentCount > 0 && (
                    <span className={cn('inline-flex items-center gap-1 rounded-full bg-iris-50 px-2.5 py-1 text-xs font-semibold text-iris-700 dark:bg-iris-400/10 dark:text-iris-200', isMobileHeader && 'px-2 py-0.5 text-[11px]')}>
                      <FileCheck className="h-3 w-3" aria-hidden="true" />
                      {documentCount} docs
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={cn('mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#8A82DC] bg-[#EFECFF]/55 p-2 dark:border-iris-300/15 dark:bg-[#241f32]/80', isMobileHeader && 'mt-3 rounded-none border-0 bg-transparent p-0', isCompactHeader && 'mt-2')}>
            {/* History Toggle */}
            <Button
              onClick={() => setShowHistory(!showHistory)}
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2 border-[#8A82DC] bg-[#FBFAFF]/90 text-slate-800 shadow-sm shadow-iris-950/8 hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-200 dark:shadow-none dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#241f32]',
                isMobileHeader && 'h-10 w-10 justify-center gap-0 px-0',
                isCompactHeader && 'h-9 w-9',
                showHistory && 'border-iris-300 bg-iris-50 text-iris-700 dark:border-iris-400/50 dark:bg-iris-400/10 dark:text-iris-200'
              )}
              aria-label={showHistory ? 'Hide version history' : 'Show version history'}
              aria-pressed={showHistory}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span className={cn('text-sm', isMobileHeader && 'sr-only')}>History</span>
            </Button>

            {/* Edit/Preview Toggle */}
            <Button
              onClick={toggleEditMode}
              variant="outline"
              size="sm"
              className={cn(
                'h-9 gap-2 border-[#8A82DC] bg-[#FBFAFF]/90 text-slate-800 shadow-sm shadow-iris-950/8 hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-200 dark:shadow-none dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#241f32]',
                isMobileHeader && 'h-10 w-10 justify-center gap-0 px-0',
                isCompactHeader && 'h-9 w-9',
                isEditMode && 'border-iris-300 bg-iris-50 text-iris-700 dark:border-iris-400/50 dark:bg-iris-400/10 dark:text-iris-200'
              )}
              aria-label={isEditMode ? 'Switch to preview mode' : 'Switch to edit mode'}
              aria-pressed={isEditMode}
            >
              {isEditMode ? (
                <>
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span className={cn('text-sm', isMobileHeader && 'sr-only')}>Preview</span>
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" aria-hidden="true" />
                  <span className={cn('text-sm', isMobileHeader && 'sr-only')}>Edit</span>
                </>
              )}
            </Button>

            {/* Save Button (Edit Mode Only) */}
            {isEditMode && (
              <Button
                onClick={handleSave}
                variant="default"
                size="sm"
                className={cn(
                  'h-9 gap-2 bg-primary hover:bg-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#241f32]',
                  isMobileHeader && 'h-10 w-10 justify-center gap-0 px-0',
                  isCompactHeader && 'h-9 w-9'
                )}
                aria-label="Save changes as new version"
                disabled={editContent === currentVersion?.content}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                <span className={cn('text-sm', isMobileHeader && 'sr-only')}>Save</span>
              </Button>
            )}

            {/* Download Button with Dropdown */}
            <div className="relative">
              <Button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                variant="outline"
                size="sm"
                className={cn(
                  'h-9 gap-2 border-[#8A82DC] bg-[#FBFAFF]/90 text-slate-800 shadow-sm shadow-iris-950/8 hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-200 dark:shadow-none dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#241f32]',
                  isMobileHeader && 'h-10 w-10 justify-center gap-0 px-0',
                  isCompactHeader && 'h-9 w-9'
                )}
                aria-label="Download compliance report"
                aria-expanded={showDownloadMenu}
                aria-haspopup="true"
                disabled={isDownloading}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span className={cn('text-sm', isMobileHeader && 'sr-only')}>Download</span>
                <ChevronDown className={cn('h-3 w-3', isMobileHeader && 'hidden')} aria-hidden="true" />
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
                    className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[#8A82DC] bg-[#FBFAFF]/95 shadow-lg shadow-iris-950/12 backdrop-blur dark:border-iris-300/15 dark:bg-[#171322] dark:shadow-iris-950/30"
                    role="menu"
                    aria-label="Download format options"
                  >
                    <button
                      onClick={handleDownloadMarkdown}
                      className="flex w-full items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-iris-50 hover:text-iris-800 active:bg-iris-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-inset dark:text-slate-300 dark:hover:bg-iris-300/10 dark:active:bg-iris-300/15"
                      role="menuitem"
                      disabled={isDownloading}
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      <span>Markdown (.md)</span>
                    </button>
                    <button
                      onClick={handleDownloadDocx}
                      className="flex w-full items-center gap-2 rounded-b-lg px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-iris-50 hover:text-iris-800 active:bg-iris-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-inset dark:text-slate-300 dark:hover:bg-iris-300/10 dark:active:bg-iris-300/15"
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
              className="h-full w-full resize-none rounded-lg border-2 border-[#8A82DC] bg-[#FBFAFF]/95 p-4 font-mono text-sm text-slate-900 shadow-sm shadow-iris-950/8 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-none dark:focus:ring-offset-[#171322]"
              placeholder="Enter markdown content..."
              aria-label="Markdown editor"
              spellCheck="false"
            />
          </div>
        ) : (
          /* Preview Mode - Formatted View */
          <article 
            ref={canvasArticleRef}
            className="flex-1 overflow-y-auto p-4 pb-32 focus:outline-none sm:p-6"
            tabIndex={0}
            aria-label="Compliance report content"
          >
            {/* Loading State */}
            {!displayContent && (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-4 border-slate-200 dark:border-iris-300/15"></div>
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
                        <div key={idx} className="rounded border border-iris-200 bg-white p-3 dark:border-iris-400/30 dark:bg-[#241f32]">
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
                        <span key={idx} className="rounded border border-iris-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-iris-400/30 dark:bg-[#241f32] dark:text-slate-300">
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
              <div className="mb-6 border-b border-slate-200 pb-4 dark:border-iris-300/15">
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
                  {ragResponse.retrieval_metadata && (
                    <>
                      <span>Candidates: <span className="font-medium">{ragResponse.retrieval_metadata.total_candidates}</span></span>
                      <span>Limit: <span className="font-medium">{ragResponse.retrieval_metadata.result_limit}</span></span>
                      {ragResponse.retrieval_metadata.processing_ms !== undefined && (
                        <span>Local time: <span className="font-medium">{ragResponse.retrieval_metadata.processing_ms}ms</span></span>
                      )}
                      {ragResponse.retrieval_metadata.citation_numbers.length > 0 && (
                        <span>Citations: <span className="font-medium">{ragResponse.retrieval_metadata.citation_numbers.join(', ')}</span></span>
                      )}
                      {ragResponse.retrieval_metadata.unknown_citation_numbers && ragResponse.retrieval_metadata.unknown_citation_numbers.length > 0 && (
                        <span>Unknown citations: <span className="font-medium">{ragResponse.retrieval_metadata.unknown_citation_numbers.join(', ')}</span></span>
                      )}
                    </>
                  )}
                </div>

                {ragResponse.matched_documents && ragResponse.matched_documents.length > 0 && (
                  <div className="mt-3">
                    <p className="font-body mb-1 text-xs text-neutral-600 dark:text-slate-400">Top Local Sources:</p>
                    <div className="space-y-2">
                      {ragResponse.matched_documents.slice(0, 3).map((document, index) => (
                        <a
                          key={`${document.statute}-${index}`}
                          href={document.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="group block rounded-lg border border-iris-100 bg-iris-50/60 px-3 py-2 text-xs text-slate-700 transition-colors hover:border-iris-300 hover:bg-iris-50 active:bg-iris-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-200 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10 dark:hover:text-slate-100 dark:active:bg-iris-300/15 dark:focus-visible:ring-offset-[#171322]"
                        >
                          <span className="font-semibold">{document.title}</span>
                          <span className="ml-2 text-slate-500 transition-colors dark:text-slate-400 dark:group-hover:text-slate-300">
                            {(document.relevance_score * 100).toFixed(0)}%
                          </span>
                          {document.matched_terms.length > 0 && (
                            <span className="mt-1 block text-slate-500 transition-colors dark:text-slate-400 dark:group-hover:text-slate-300">
                              Matched: {document.matched_terms.slice(0, 6).join(', ')}
                            </span>
                          )}
                          <span className="mt-1 block text-slate-500 transition-colors dark:text-slate-400 dark:group-hover:text-slate-300">
                            {[document.support_level && `${document.support_level} support`, document.authority_type, document.source_tier]
                              .filter(Boolean)
                              .join(' | ')}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {displayContent && (
              <div className="max-w-none space-y-1 break-words [overflow-wrap:anywhere]">
                {renderContent(previewContent)}
              </div>
            )}
          </article>
        )}
      </div>
    </div>
  )
}
