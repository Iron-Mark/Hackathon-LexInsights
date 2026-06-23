import type { DeepSearchResponse } from '@/lib/services/deep-search-api'
import type { RAGResponse } from '@/lib/services/rag-api'

export const CHAT_EVENTS = {
  chatCreating: 'chat-creating',
  chatCreated: 'chat-created',
  querySubmitted: 'query-submitted',
  ragResponse: 'rag-response',
  fileUploaded: 'file-uploaded',
  deepSearchComplete: 'deep-search-complete',
} as const

export interface QuerySubmittedEventDetail {
  query: string
  chatId?: string
}

export interface RAGResponseEventDetail {
  query: string
  response: RAGResponse
}

export interface FileUploadedEventDetail {
  file: File
  query: string
}

export interface DeepSearchCompleteEventDetail {
  query: string
  result: DeepSearchResponse
  file?: File
}

export function dispatchChatEvent<TDetail>(eventName: string, detail?: TDetail) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

export function addChatEventListener<TDetail>(
  eventName: string,
  listener: (event: CustomEvent<TDetail>) => void
) {
  const eventListener = (event: Event) => listener(event as CustomEvent<TDetail>)

  window.addEventListener(eventName, eventListener)

  return () => {
    window.removeEventListener(eventName, eventListener)
  }
}
