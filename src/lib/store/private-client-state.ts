'use client'

import { useComplianceStore } from './compliance-store'
import { useFileUploadStore } from './file-upload-store'
import { clearRAGLocalCache, useRAGStore } from './rag-store'

const PRIVATE_STORAGE_KEYS = ['rag-storage', 'compliance-storage']

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
  clearPrivateStorageKeys()
}
