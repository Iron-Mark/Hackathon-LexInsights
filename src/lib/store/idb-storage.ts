'use client'

import type { StateStorage } from 'zustand/middleware'

/**
 * IndexedDB-backed storage adapter for zustand `persist` (PRD P0-1, $0 path).
 *
 * Compliance reports and their version history used to persist to
 * window.localStorage, which is small (~5MB), string-only, and easy to lose.
 * IndexedDB is larger, more durable, and the free client-side alternative to a
 * paid Supabase backend (see memory: supabase-budget-constraint). The record
 * model behind ComplianceReportRepository stays the future server path; this
 * adapter just makes the current store survive reloads without any backend.
 *
 * SSR-safe: on the server (or where IndexedDB is unavailable) it falls back to
 * localStorage so hydration never throws. On first read for a key it also
 * migrates any value still sitting under the old localStorage key.
 */

const DB_NAME = 'lexinsights'
const STORE_NAME = 'keyval'
const DB_VERSION = 1

function hasIndexedDB(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function hasLocalStorage(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
  } catch {
    return false
  }
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function idbRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode)
        const request = run(tx.objectStore(STORE_NAME))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}

export const idbStorage: StateStorage = {
  async getItem(name: string): Promise<string | null> {
    if (!hasIndexedDB()) {
      return hasLocalStorage() ? window.localStorage.getItem(name) : null
    }
    try {
      const value = await idbRequest<unknown>('readonly', (store) => store.get(name))
      if (typeof value === 'string') return value
      // One-time migration: adopt any value left under the old localStorage key.
      if (hasLocalStorage()) {
        const legacy = window.localStorage.getItem(name)
        if (legacy !== null) {
          await this.setItem(name, legacy)
          return legacy
        }
      }
      return null
    } catch {
      return hasLocalStorage() ? window.localStorage.getItem(name) : null
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    if (!hasIndexedDB()) {
      if (hasLocalStorage()) window.localStorage.setItem(name, value)
      return
    }
    try {
      await idbRequest('readwrite', (store) => store.put(value, name))
      // Drop the legacy localStorage copy so the two backends can't drift.
      if (hasLocalStorage()) window.localStorage.removeItem(name)
    } catch {
      if (hasLocalStorage()) window.localStorage.setItem(name, value)
    }
  },

  async removeItem(name: string): Promise<void> {
    if (hasLocalStorage()) window.localStorage.removeItem(name)
    if (!hasIndexedDB()) return
    try {
      await idbRequest('readwrite', (store) => store.delete(name))
    } catch {
      // localStorage copy already cleared above.
    }
  },
}
