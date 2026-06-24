'use client'

import { useEffect, useState, type ComponentProps } from 'react'
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

interface MessageBubbleProps {
  message: Message
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

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)
  const [isExportingWord, setIsExportingWord] = useState(false)
  const prefersReducedMotion = usePrefersReducedMotion()
  const [visibleContent, setVisibleContent] = useState(() => {
    if (message.role === 'user' || getCurrentReducedMotionPreference()) {
      return message.content
    }

    return message.content.slice(0, getRevealStep(message.content.length))
  })
  const [isRevealing, setIsRevealing] = useState(() => (
    message.role === 'assistant' &&
    !getCurrentReducedMotionPreference() &&
    message.content.length > getRevealStep(message.content.length)
  ))

  useEffect(() => {
    if (isUser || prefersReducedMotion || message.content.length === 0) {
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
  }, [isUser, message.content, message.id, prefersReducedMotion])
  
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
        title: 'LexInSight Response',
      })
      showToast('Downloaded as Word (.docx)', 'success')
    } catch {
      showToast('Failed to download', 'error')
    } finally {
      setIsExportingWord(false)
    }
  }

  const renderedAssistantContent = formatReportMarkdownForPreview(visibleContent)

  return (
    <div
      data-chat-content
      data-revealing={isRevealing ? 'true' : 'false'}
      aria-busy={isRevealing}
      className={`mb-4 min-w-0 rounded-xl p-4 transition-all sm:p-5 ${
        isUser
          ? 'ml-auto max-w-[90%] border border-iris-100 bg-gradient-to-br from-iris-50 via-white to-purple-50 text-slate-900 shadow-sm hover:shadow-md sm:max-w-[85%] lg:max-w-[90%] dark:border-iris-300/20 dark:from-iris-400/12 dark:via-[#241f32] dark:to-[#201a2d] dark:text-slate-100 dark:shadow-iris-950/20'
          : 'mr-auto w-full max-w-full border-2 border-slate-200 bg-white text-slate-900 shadow-md hover:shadow-lg sm:max-w-[85%] lg:max-w-[90%] dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-iris-950/30'
      }`}
    >
      {isUser ? (
        // User message - simple text with better contrast
        <p className="font-body whitespace-pre-wrap text-base leading-relaxed break-word font-medium text-slate-900 dark:text-slate-100">
          {message.content}
        </p>
      ) : (
        // AI message - formatted markdown
        <div className="prose prose-slate max-w-none break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Headings
              h1: (props) => (
                <h1 className="mb-4 mt-6 border-b-2 border-slate-200 pb-2 text-2xl font-bold text-slate-900 dark:border-iris-300/15 dark:text-slate-100" {...stripMarkdownNode(props)} />
              ),
              h2: (props) => (
                <h2 className="mb-3 mt-5 text-xl font-bold text-slate-800 dark:text-slate-100" {...stripMarkdownNode(props)} />
              ),
              h3: (props) => (
                <h3 className="mb-2 mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200" {...stripMarkdownNode(props)} />
              ),
              // Paragraphs
              p: (props) => (
                <p className="my-3 text-base leading-relaxed text-slate-700 dark:text-slate-300" {...stripMarkdownNode(props)} />
              ),
              // Lists
              ul: (props) => {
                const { className, ...domProps } = stripMarkdownNode(props)
                const isTaskList = typeof className === 'string' && className.includes('contains-task-list')

                return (
                  <ul
                    className={cn(
                      'my-3 space-y-2 text-slate-700 dark:text-slate-300',
                      isTaskList ? 'list-none pl-0' : 'list-inside list-disc',
                      className
                    )}
                    {...domProps}
                  />
                )
              },
              ol: (props) => (
                <ol className="my-3 list-inside list-decimal space-y-2 text-slate-700 dark:text-slate-300" {...stripMarkdownNode(props)} />
              ),
              li: (props) => {
                const { className, ...domProps } = stripMarkdownNode(props)
                const isTaskItem = typeof className === 'string' && className.includes('task-list-item')

                return (
                  <li
                    className={cn(
                      'leading-relaxed text-slate-700 dark:text-slate-300',
                      isTaskItem &&
                        'flex gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed shadow-sm dark:border-iris-300/15 dark:bg-[#171322]/60 dark:text-slate-200',
                      className
                    )}
                    {...domProps}
                  />
                )
              },
              input: (props) => {
                const { className, ...domProps } = stripMarkdownNode(props)

                return (
                  <input
                    className={cn(
                      'mt-1 h-4 w-4 shrink-0 rounded border-slate-300 bg-white accent-iris-600 disabled:cursor-default disabled:opacity-100 dark:border-iris-300/30 dark:bg-[#171322] dark:accent-iris-300',
                      className
                    )}
                    {...domProps}
                  />
                )
              },
              // Strong/Bold
              strong: (props) => (
                <strong className="font-bold text-slate-900 dark:text-slate-100" {...stripMarkdownNode(props)} />
              ),
              // Code
              code: (props: MarkdownCodeProps) => {
                const { inline, ...codeProps } = stripMarkdownNode(props)
                return inline ? (
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-iris-700 dark:bg-[#171322] dark:text-iris-200" {...codeProps} />
                ) : (
                  <code className="my-3 block overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-sm text-slate-100 dark:bg-[#171322]/80" {...codeProps} />
                )
              },
              // Links
              a: (props) => (
                <a className="font-medium text-iris-600 underline hover:text-iris-700 dark:text-iris-300 dark:hover:text-iris-200" {...stripMarkdownNode(props)} />
              ),
              // Blockquotes
              blockquote: (props) => (
                <blockquote className="my-3 rounded-r border-l-4 border-iris-500 bg-slate-50 py-2 pl-4 italic text-slate-600 dark:bg-[#171322]/70 dark:text-slate-300" {...stripMarkdownNode(props)} />
              ),
              // Horizontal rule
              hr: (props) => (
                <hr className="my-6 border-slate-300 dark:border-iris-300/15" {...stripMarkdownNode(props)} />
              ),
              // Tables
              table: (props) => (
                <div className="overflow-x-auto my-4">
                  <table className="min-w-full border-collapse border border-slate-300 dark:border-iris-300/15" {...stripMarkdownNode(props)} />
                </div>
              ),
              th: (props) => (
                <th className="border border-slate-300 bg-slate-100 px-4 py-2 text-left font-semibold text-slate-900 dark:border-iris-300/15 dark:bg-[#171322] dark:text-slate-100" {...stripMarkdownNode(props)} />
              ),
              td: (props) => (
                <td className="border border-slate-300 px-4 py-2 text-slate-700 dark:border-iris-300/15 dark:text-slate-300" {...stripMarkdownNode(props)} />
              ),
            }}
          >
            {renderedAssistantContent}
          </ReactMarkdown>
        </div>
      )}
      
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
