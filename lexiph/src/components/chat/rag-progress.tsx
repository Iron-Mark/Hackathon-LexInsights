'use client'

import { Loader2, CheckCircle, Search, FileText } from 'lucide-react'
import { type WebSocketEvent } from '@/lib/services/rag-api'

interface RAGProgressProps {
  events: WebSocketEvent[]
  isComplete: boolean
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
      return <FileText className="h-4 w-4 text-slate-400" />
    case 'search':
      return <Search className="h-4 w-4 text-slate-400" />
    case 'summarization':
      return <FileText className="h-4 w-4 text-slate-400" />
    default:
      return <Loader2 className="h-4 w-4 text-slate-400" />
  }
}

function getStageLabel(stage: string): string {
  switch (stage) {
    case 'query_generation':
      return 'Generating Search Queries'
    case 'search':
      return 'Searching Legislation Database'
    case 'summarization':
      return 'Generating Summary'
    default:
      return stage
  }
}

export function RAGProgress({ events, isComplete }: RAGProgressProps) {
  if (events.length === 0 && !isComplete) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-600">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Initializing...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <div 
          key={index} 
          className="flex items-center gap-2 text-sm"
          role="status"
          aria-live="polite"
        >
          {getStageIcon(event.stage, event.status)}
          <span className="text-neutral-700">
            {getStageLabel(event.stage)}
            {event.data?.queries_generated && ` (${event.data.queries_generated} queries)`}
            {event.data?.documents_found && ` (${event.data.documents_found} documents)`}
          </span>
        </div>
      ))}
      
      {isComplete && (
        <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
          <CheckCircle className="h-4 w-4" />
          <span>Summary ready</span>
        </div>
      )}
    </div>
  )
}
