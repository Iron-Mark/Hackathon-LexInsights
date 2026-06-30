'use client'

import { useComplianceStore } from './compliance-store'
import { useFileUploadStore } from './file-upload-store'
import { clearRAGLocalCache, useRAGStore } from './rag-store'
import { useChatStore } from './chat-store'

const PRIVATE_STORAGE_KEYS = [
  'rag-storage',
  'compliance-storage',
  'lexinsights_guest_chats_v1',
  'lexinsights_supabase_fallback_chats_v1',
]

function clearPrivateStorageKeys() {
  if (typeof window === 'undefined') return

  try {
    for (const key of PRIVATE_STORAGE_KEYS) {
      localStorage.removeItem(key)
    }
  } catch (error) {
    console.error('Private storage clear error:', error)
  }

  clearRAGLocalCache()
}

export function clearPrivateClientState() {
  if (typeof window === 'undefined') return

  useRAGStore.getState().clearPrivateState()
  useComplianceStore.getState().clearPrivateState()
  useFileUploadStore.getState().clearFiles()
  useChatStore.setState({
    chats: [],
    activeChat: null,
    messages: {},
    loading: false,
    loadingMessages: false,
  })
  clearPrivateStorageKeys()
}
