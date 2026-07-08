'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, Search, FileText, Circle, Clock, AlertTriangle } from 'lucide-react'
import { type WebSocketEvent } from '@/lib/services/rag-api'

/**
 * Operation phases that do NOT emit backend streaming events. Progress for
 * these is elapsed-time-based staged progress with honest labels: stages
 * advance on a time estimate, but the final stage never auto-completes — it
 * stays "in progress" until the caller reports real completion.
 */
export type ProgressPhase = 'extraction' | 'research' | 'deep-search'

interface PhaseConfig {
  /** Human label for the whole operation. */
  label: string
  /** Ordered, honest stage names shown to the user. */
  stages: string[]
  /**
   * Typical (not worst-case) duration used only to pace stage advancement.
   * Deliberately shorter than the hard timeout so the UI does not stall on the
   * first stage. The last stage is held open until real completion.
   */
  estimatedDurationMs: number
}

const PHASE_CONFIG: Record<ProgressPhase, PhaseConfig> = {
  extraction: {
    label: 'Extracting document text',
    stages: ['Reading document', 'Extracting text', 'Normalizing content'],
    estimatedDurationMs: 9000,
  },
  research: {
    label: 'Researching legislation',
    stages: ['Normalizing query', 'Retrieving legislation', 'Scoring relevance', 'Composing summary'],
    estimatedDurationMs: 18000,
  },
  'deep-search': {
    label: 'Running Deep Search',
    stages: [
      'Normalizing query',
      'Retrieving legislation',
      'Expanding cross-references',
      'Scoring relevance',
      'Composing summary',
    ],
    estimatedDurationMs: 45000,
  },
}

interface RAGProgressProps {
  /** Event-driven mode: real backend stage events (e.g. RAG WebSocket stream). */
  events?: WebSocketEvent[]
  isComplete?: boolean
  /**
   * Time-estimated mode: when set, renders staged progress paced by elapsed
   * time instead of consuming `events`.
   */
  phase?: ProgressPhase
  /** Epoch ms when the current operation/phase started. Drives elapsed time. */
  startedAt?: number
  /**
   * Hard timeout for the operation, if known. Used only to surface an honest
   * "approaching timeout" hint; never used to fabricate completion.
   */
  timeoutMs?: number
}

function getStageIcon(stage: string, status: string) {
  if (status === 'completed') {
    return <CheckCircle className="h-4 w-4 text-green-500" />
  }

  if (status === 'in_progress' || status === 'started') {
    return <Loader2 className="h-4 w-4 text-iris-600 animate-spin" />
  }

  switch (stage) {
    case 'query_generation':
      return <FileText className="h-4 w-4 text-slate-400 dark:text-iris-100/55" />
    case 'search':
      return <Search className="h-4 w-4 text-slate-400 dark:text-iris-100/55" />
    case 'deep_search':
      return <Search className="h-4 w-4 text-slate-400 dark:text-iris-100/55" />
    case 'summarization':
      return <FileText className="h-4 w-4 text-slate-400 dark:text-iris-100/55" />
    default:
      return <Loader2 className="h-4 w-4 text-slate-400 dark:text-iris-100/55" />
  }
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'query_generation':
      return 'Generating Search Queries'
    case 'search':
      return 'Searching Legislation Database'
    case 'deep_search':
      return 'Expanding Cross-References'
    case 'summarization':
      return 'Generating Summary'
    default:
      return stage
  }
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes > 0) {
    return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  }

  return `${seconds}s`
}

/**
 * Ticking elapsed-time counter. Stops updating once `stopped` is true or when
 * no start time is provided. Returns 0 when there is nothing to measure.
 */
function useElapsedTime(startedAt: number | undefined, stopped: boolean): number {
  const [elapsedMs, setElapsedMs] = useState(() =>
    startedAt === undefined ? 0 : Math.max(0, Date.now() - startedAt)
  )

  useEffect(() => {
    if (startedAt === undefined) {
      setElapsedMs(0)
      return
    }

    setElapsedMs(Math.max(0, Date.now() - startedAt))

    if (stopped) {
      return
    }

    const intervalId = window.setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - startedAt))
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [startedAt, stopped])

  return elapsedMs
}

function ElapsedIndicator({
  elapsedMs,
  timeoutMs,
  isComplete,
}: {
  elapsedMs: number
  timeoutMs?: number
  isComplete: boolean
}) {
  const approachingTimeout =
    !isComplete && timeoutMs !== undefined && elapsedMs >= timeoutMs * 0.75

  return (
    <div className="mt-2 flex flex-col gap-1 border-t border-iris-500/10 pt-2 dark:border-iris-300/10">
      <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-iris-100/55">
        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Elapsed {formatElapsed(elapsedMs)}</span>
      </div>
      {approachingTimeout && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Taking longer than usual. Still working&hellip;</span>
        </div>
      )}
    </div>
  )
}

function StagedPhaseProgress({
  phase,
  elapsedMs,
  isComplete,
  timeoutMs,
}: {
  phase: ProgressPhase
  elapsedMs: number
  isComplete: boolean
  timeoutMs?: number
}) {
  const config = PHASE_CONFIG[phase]
  const stageCount = config.stages.length
  const perStageMs = config.estimatedDurationMs / Math.max(1, stageCount)

  // Time-estimated current stage. Never advances past the final stage until the
  // caller reports real completion, so we never fabricate "done".
  const estimatedIndex = Math.floor(elapsedMs / perStageMs)
  const currentIndex = isComplete
    ? stageCount
    : Math.min(estimatedIndex, stageCount - 1)

  const activeStageLabel =
    isComplete ? config.label : config.stages[Math.min(currentIndex, stageCount - 1)]

  return (
    <div
      className="space-y-2"
      role="status"
      aria-live="polite"
      aria-label={`${config.label}: ${activeStageLabel}, ${formatElapsed(elapsedMs)} elapsed`}
    >
      <p className="text-sm font-medium text-neutral-800 dark:text-slate-200">{config.label}</p>

      <div className="space-y-1.5">
        {config.stages.map((stageLabel, index) => {
          const status =
            index < currentIndex ? 'completed' : index === currentIndex ? 'in_progress' : 'pending'

          return (
            <div key={stageLabel} className="flex items-center gap-2 text-sm">
              {status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
              {status === 'in_progress' && (
                <Loader2 className="h-4 w-4 animate-spin text-iris-600" />
              )}
              {status === 'pending' && (
                <Circle className="h-4 w-4 text-slate-300 dark:text-iris-100/30" />
              )}
              <span
                className={
                  status === 'pending'
                    ? 'text-neutral-400 dark:text-iris-100/40'
                    : 'text-neutral-700 dark:text-slate-300'
                }
              >
                {stageLabel}
              </span>
            </div>
          )
        })}
      </div>

      <ElapsedIndicator elapsedMs={elapsedMs} timeoutMs={timeoutMs} isComplete={isComplete} />
    </div>
  )
}

export function RAGProgress({
  events = [],
  isComplete = false,
  phase,
  startedAt,
  timeoutMs,
}: RAGProgressProps) {
  const elapsedMs = useElapsedTime(startedAt, isComplete)

  // Time-estimated staged progress (no backend events available for this phase).
  if (phase) {
    return (
      <StagedPhaseProgress
        phase={phase}
        elapsedMs={elapsedMs}
        isComplete={isComplete}
        timeoutMs={timeoutMs}
      />
    )
  }

  // Event-driven progress (real backend stage stream).
  const showElapsed = startedAt !== undefined

  if (events.length === 0 && !isComplete) {
    return (
      <div
        className="flex items-center gap-2 text-sm text-neutral-600 dark:text-slate-300"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing&hellip;</span>
        {showElapsed && (
          <span className="text-xs text-neutral-400 dark:text-iris-100/45">
            ({formatElapsed(elapsedMs)})
          </span>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-2" role="status" aria-live="polite">
      {events.map((event, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          {getStageIcon(event.stage, event.status)}
          <span className="text-neutral-700 dark:text-slate-300">
            {getStageLabel(event.stage)}
            {event.data?.queries_generated && ` (${event.data.queries_generated} queries)`}
            {event.data?.documents_found && ` (${event.data.documents_found} documents)`}
          </span>
        </div>
      ))}

      {isComplete && (
        <div className="flex items-center gap-2 text-sm font-medium text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span>Summary ready</span>
        </div>
      )}

      {showElapsed && (
        <ElapsedIndicator elapsedMs={elapsedMs} timeoutMs={timeoutMs} isComplete={isComplete} />
      )}
    </div>
  )
}
