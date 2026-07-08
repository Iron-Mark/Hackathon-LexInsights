'use client'

import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { Message } from '@/types'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Download, FileText, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { showToast } from '@/components/ui/toast'
import { exportToDocx } from '@/lib/utils/docx-export'
import { cn } from '@/lib/utils'
import { formatReportMarkdownForPreview } from '@/lib/utils/practical-checklist'
import { downloadBlob, formatClockTime } from '@/lib/utils/browser-actions'
import { buildLegalCitationContext, renderLegalCitationNodes } from './legal-citation'
import { NoAuthorityNotice, shouldShowNoAuthorityNotice } from './no-authority-notice'

interface MessageBubbleProps {
  message: Message
  revealOnMount?: boolean
  onRevealComplete?: () => void
}

type MarkdownCodeProps = ComponentProps<'code'> & {
  inline?: boolean
  node?: unknown
}

function stripMarkdownNode<T extends { node?: unknown }>(props: T): Omit<T, 'node'> {
  const { node, ...domProps } = props
  void node
  return domProps
}

function getRevealStep(contentLength: number) {
  if (contentLength <= 240) {
    return 2
  }

  if (contentLength <= 1200) {
    return 3
  }

  if (contentLength <= 3200) {
    return 5
  }

  if (contentLength <= 7000) {
    return 8
  }

  return 12
}

function getRevealDelay(content: string, visibleIndex: number) {
  const previousCharacter = content[visibleIndex - 1]

  if (previousCharacter === '\n') {
    return 110
  }

  if (previousCharacter && /[.!?;:]/.test(previousCharacter)) {
    return 82
  }

  if (previousCharacter && /[,)]/.test(previousCharacter)) {
    return 54
  }

  return 36
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => getCurrentReducedMotionPreference())

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches)

    updatePreference()

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', updatePreference)
      return () => mediaQuery.removeEventListener('change', updatePreference)
    }

    mediaQuery.addListener(updatePreference)
    return () => mediaQuery.removeListener(updatePreference)
  }, [])

  return prefersReducedMotion
}

function getCurrentReducedMotionPreference() {
  return typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

export function MessageBubble({ message, revealOnMount = false, onRevealComplete }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [isExportingWord, setIsExportingWord] = useState(false)
  const [checkedChecklistItems, setCheckedChecklistItems] = useState<Record<string, boolean>>({})
  const prefersReducedMotion = usePrefersReducedMotion()
  const onRevealCompleteRef = useRef(onRevealComplete)
  const [visibleContent, setVisibleContent] = useState(() => {
    if (message.role === 'user' || !revealOnMount || getCurrentReducedMotionPreference()) {
      return message.content
    }

    return message.content.slice(0, getRevealStep(message.content.length))
  })
  const [isRevealing, setIsRevealing] = useState(() => (
    message.role === 'assistant' &&
    revealOnMount &&
    !getCurrentReducedMotionPreference() &&
    message.content.length > getRevealStep(message.content.length)
  ))

  useEffect(() => {
    onRevealCompleteRef.current = onRevealComplete
  }, [onRevealComplete])

  useEffect(() => {
    if (isUser || !revealOnMount || prefersReducedMotion || message.content.length === 0) {
      setVisibleContent(message.content)
      setIsRevealing(false)
      return
    }

    const step = getRevealStep(message.content.length)
    let currentIndex = Math.min(step, message.content.length)

    setVisibleContent(message.content.slice(0, currentIndex))
    setIsRevealing(currentIndex < message.content.length)

    if (currentIndex >= message.content.length) {
      return
    }

    let timeoutId: number | undefined
    let cancelled = false

    const revealNextChunk = () => {
      if (cancelled) {
        return
      }

      currentIndex = Math.min(currentIndex + step, message.content.length)
      setVisibleContent(message.content.slice(0, currentIndex))

      if (currentIndex >= message.content.length) {
        setIsRevealing(false)
        onRevealCompleteRef.current?.()
        return
      }

      timeoutId = window.setTimeout(
        revealNextChunk,
        getRevealDelay(message.content, currentIndex)
      )
    }

    timeoutId = window.setTimeout(
      revealNextChunk,
      getRevealDelay(message.content, currentIndex)
    )

    return () => {
      cancelled = true

      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId)
      }
    }
  }, [isUser, message.content, message.id, prefersReducedMotion, revealOnMount])
  
  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      showToast('Copied to clipboard', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showToast('Failed to copy', 'error')
    }
  }

  // Download as Markdown
  const handleDownloadMarkdown = () => {
    try {
      const blob = new Blob([message.content], { type: 'text/markdown' })
      downloadBlob(blob, `response-${Date.now()}.md`)
      showToast('Downloaded as Markdown', 'success')
    } catch {
      showToast('Failed to download', 'error')
    }
  }

  // Download as modern Word document
  const handleDownloadWord = async () => {
    if (isExportingWord) {
      return
    }

    setIsExportingWord(true)

    try {
      await exportToDocx({
        content: message.content,
        fileName: `response-${Date.now()}`,
        title: 'LexInsights Response',
      })
      showToast('Downloaded as Word (.docx)', 'success')
    } catch {
      showToast('Failed to download', 'error')
    } finally {
      setIsExportingWord(false)
    }
  }

  const renderedAssistantContent = formatReportMarkdownForPreview(visibleContent)
  const citationContext = useMemo(
    () => buildLegalCitationContext(message.metadata?.ragResponse),
    [message.metadata?.ragResponse]
  )
  const renderCitationChildren = (children: ReactNode, scope: string) =>
    renderLegalCitationNodes(children, citationContext, `${message.id}-${scope}`, {
      isRevealing,
    })
  const showNoAuthorityNotice = !isUser && shouldShowNoAuthorityNotice(message.metadata?.ragResponse)
  let checklistInputIndex = 0

  return (
    <div
      data-chat-content
      data-revealing={isRevealing ? 'true' : 'false'}
      aria-busy={isRevealing}
      className={cn(
        'mb-4 min-w-0 rounded-xl p-4 transition-all sm:p-5',
        isUser
          ? 'ml-auto max-w-[90%] border border-iris-100 bg-gradient-to-br from-white via-iris-50/80 to-purple-50 text-slate-900 shadow-sm shadow-iris-950/5 hover:shadow-md hover:shadow-iris-950/10 sm:max-w-[85%] lg:max-w-[90%] dark:border-iris-300/20 dark:from-iris-400/12 dark:via-[#241f32] dark:to-[#201a2d] dark:text-iris-100/90 dark:shadow-iris-950/20'
          : cn(
              'mr-auto w-full max-w-full border-2 border-iris-100 bg-white/95 text-slate-900 shadow-md shadow-iris-950/10 hover:border-iris-200 hover:shadow-lg hover:shadow-iris-950/15 sm:max-w-[85%] lg:max-w-[90%] dark:border-iris-300/15 dark:bg-[#241f32] dark:text-iris-100/84 dark:shadow-iris-950/30',
              isRevealing &&
                'border-iris-200 bg-iris-50/90 shadow-iris-950/10 dark:border-iris-300/22 dark:bg-[linear-gradient(135deg,rgba(63,51,189,0.14),rgba(35,27,51,0.94)_48%,rgba(24,18,39,0.98))] dark:text-iris-100/78 dark:shadow-[0_16px_42px_rgba(9,6,22,0.34)]'
            )
      )}
    >
      {isUser ? (
        // User message - simple text with better contrast
        <p className="font-body whitespace-pre-wrap break-words text-base font-medium leading-relaxed text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100">
          {message.content}
        </p>
      ) : (
        // AI message - formatted markdown
        <div className="prose prose-slate min-w-0 max-w-none break-words [overflow-wrap:anywhere]">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Headings
              h1: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <h2 className="mb-4 mt-6 break-words border-b-2 border-slate-200 pb-2 text-2xl font-bold text-slate-900 [overflow-wrap:anywhere] dark:border-iris-300/15 dark:text-iris-100/90" {...domProps}>
                    {renderCitationChildren(children, 'h2')}
                  </h2>
                )
              },
              h2: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <h3 className="mb-3 mt-5 break-words text-xl font-bold text-slate-800 [overflow-wrap:anywhere] dark:text-iris-100/88" {...domProps}>
                    {renderCitationChildren(children, 'h3')}
                  </h3>
                )
              },
              h3: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <h4 className="mb-2 mt-4 break-words text-lg font-semibold text-slate-700 [overflow-wrap:anywhere] dark:text-iris-100/82" {...domProps}>
                    {renderCitationChildren(children, 'h4')}
                  </h4>
                )
              },
              // Paragraphs
              p: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <p className="my-3 break-words text-base leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-iris-100/72" {...domProps}>
                    {renderCitationChildren(children, 'p')}
                  </p>
                )
              },
              // Lists
              ul: (props) => {
                const { className, ...domProps } = stripMarkdownNode(props)
                const isTaskList = typeof className === 'string' && className.includes('contains-task-list')

                return (
                  <ul
                    className={cn(
                      'my-3 min-w-0 space-y-2 break-words text-slate-700 [overflow-wrap:anywhere] dark:text-iris-100/72',
                      isTaskList ? 'list-none pl-0' : 'list-inside list-disc',
                      className
                    )}
                    {...domProps}
                  />
                )
              },
              ol: (props) => (
                <ol className="my-3 min-w-0 list-inside list-decimal space-y-2 break-words text-slate-700 [overflow-wrap:anywhere] dark:text-iris-100/72" {...stripMarkdownNode(props)} />
              ),
              li: (props) => {
                const { className, children, ...domProps } = stripMarkdownNode(props)
                const isTaskItem = typeof className === 'string' && className.includes('task-list-item')

                if (isTaskItem) {
                  return (
                    <li
                      className={cn('min-w-0 list-none p-0 text-slate-700 [overflow-wrap:anywhere] dark:text-iris-100/80', className)}
                      {...domProps}
                    >
                      <label className="flex min-h-11 w-full cursor-pointer gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed shadow-sm transition-all duration-150 hover:border-iris-300 hover:bg-iris-50/80 active:scale-[0.99] dark:border-iris-300/15 dark:bg-[#171322]/60 dark:text-iris-100/80 dark:hover:border-iris-300/35 dark:hover:bg-iris-300/10">
                        {renderCitationChildren(children, `task-li-${checklistInputIndex}`)}
                      </label>
                    </li>
                  )
                }

                return (
                  <li
                    className={cn(
                      'min-w-0 break-words leading-relaxed text-slate-700 [overflow-wrap:anywhere] dark:text-iris-100/72',
                      className
                    )}
                    {...domProps}
                  >
                    {renderCitationChildren(children, 'li')}
                  </li>
                )
              },
              input: (props) => {
                const { checked, className, disabled, readOnly, type, ...domProps } = stripMarkdownNode(props)

                if (type !== 'checkbox') {
                  return (
                    <input
                      className={className}
                      disabled={disabled}
                      readOnly={readOnly}
                      type={type}
                      {...domProps}
                    />
                  )
                }

                const itemKey = `${message.id}-checklist-${checklistInputIndex}`
                const itemChecked = checkedChecklistItems[itemKey] ?? Boolean(checked)
                checklistInputIndex += 1

                return (
                  <input
                    type="checkbox"
                    checked={itemChecked}
                    onChange={(event) => {
                      const nextChecked = event.currentTarget.checked

                      setCheckedChecklistItems((currentItems) => ({
                        ...currentItems,
                        [itemKey]: nextChecked,
                      }))
                    }}
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 bg-white accent-iris-600 transition-transform active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/30 dark:bg-[#171322] dark:accent-iris-300 dark:focus-visible:ring-offset-[#171322]',
                      className
                    )}
                    {...domProps}
                  />
                )
              },
              // Strong/Bold
              strong: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <strong className="break-words font-bold text-slate-900 [overflow-wrap:anywhere] dark:text-iris-50/95" {...domProps}>
                    {renderCitationChildren(children, 'strong')}
                  </strong>
                )
              },
              // Code
              code: (props: MarkdownCodeProps) => {
                const { inline, ...codeProps } = stripMarkdownNode(props)
                return inline ? (
                  <code className="break-words rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-iris-700 [overflow-wrap:anywhere] dark:bg-[#171322] dark:text-iris-200" {...codeProps} />
                ) : (
                  <code className="my-3 block overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-100 dark:bg-[#171322]/80" {...codeProps} />
                )
              },
              // Links
              a: (props) => (
                <a className="break-words font-medium text-iris-600 underline [overflow-wrap:anywhere] hover:text-iris-700 dark:text-iris-300 dark:hover:text-iris-200" {...stripMarkdownNode(props)} />
              ),
              // Blockquotes
              blockquote: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <blockquote className="my-3 break-words rounded-r border-l-4 border-iris-500 bg-slate-50 py-2 pl-4 italic text-slate-600 [overflow-wrap:anywhere] dark:bg-[#171322]/70 dark:text-iris-100/72" {...domProps}>
                    {renderCitationChildren(children, 'blockquote')}
                  </blockquote>
                )
              },
              // Horizontal rule
              hr: (props) => (
                <hr className="my-6 border-slate-300 dark:border-iris-300/15" {...stripMarkdownNode(props)} />
              ),
              // Tables
              table: (props) => (
                <div className="my-4 max-w-full overflow-x-auto">
                  <table className="min-w-full table-fixed border-collapse border border-slate-300 dark:border-iris-300/15" {...stripMarkdownNode(props)} />
                </div>
              ),
              th: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <th className="break-words border border-slate-300 bg-slate-100 px-4 py-2 text-left font-semibold text-slate-900 [overflow-wrap:anywhere] dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-100" {...domProps}>
                    {renderCitationChildren(children, 'th')}
                  </th>
                )
              },
              td: (props) => {
                const { children, ...domProps } = stripMarkdownNode(props)

                return (
                  <td className="break-words border border-slate-300 px-4 py-2 text-slate-700 [overflow-wrap:anywhere] dark:border-iris-300/15 dark:text-iris-100/72" {...domProps}>
                    {renderCitationChildren(children, 'td')}
                  </td>
                )
              },
            }}
          >
            {renderedAssistantContent}
          </ReactMarkdown>
        </div>
      )}

      {/* Citation traceability guarantee: explicit notice when no corpus authority backs this response */}
      {showNoAuthorityNotice && <NoAuthorityNotice />}

      {/* Action Buttons - Only for assistant messages */}
      {!isUser && !isRevealing && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-3 sm:gap-2 dark:border-iris-300/15">
          <button
            onClick={handleCopy}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-600 transition-all duration-150 hover:bg-iris-50 hover:text-iris-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#241f32]"
            aria-label="Copy to clipboard"
            type="button"
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </motion.div>
              )}
            </AnimatePresence>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-600 transition-all duration-150 hover:bg-iris-50 hover:text-iris-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#241f32]"
            aria-label="Download as Markdown"
            type="button"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden min-[360px]:inline">Markdown</span>
            <span className="min-[360px]:hidden">MD</span>
          </button>

          <button
            onClick={handleDownloadWord}
            disabled={isExportingWord}
            className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-slate-600 transition-all duration-150 hover:bg-iris-50 hover:text-iris-600 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 dark:text-slate-400 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#241f32]"
            aria-label={isExportingWord ? 'Exporting Word document' : 'Download as Word (.docx)'}
            type="button"
          >
            <FileText className="h-3.5 w-3.5" />
            {isExportingWord ? (
              <span>Exporting...</span>
            ) : (
              <>
                <span className="hidden min-[360px]:inline">Word (.docx)</span>
                <span className="min-[360px]:hidden">DOCX</span>
              </>
            )}
          </button>
        </div>
      )}
      
      <p className="mt-3 font-body text-xs font-semibold text-slate-500 dark:text-slate-400">
        {formatClockTime(message.created_at)}
      </p>
    </div>
  )
}
