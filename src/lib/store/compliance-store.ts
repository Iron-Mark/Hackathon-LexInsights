'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { idbStorage } from './idb-storage'

export interface ComplianceVersion {
  id: string
  content: string
  timestamp: Date
  label: string
}

interface ComplianceStore {
  versions: ComplianceVersion[]
  currentVersionId: string | null
  isEditMode: boolean
  
  // Actions
  addVersion: (content: string, label?: string) => void
  updateCurrentVersion: (content: string) => void
  setCurrentVersion: (versionId: string) => void
  toggleEditMode: () => void
  setEditMode: (isEdit: boolean) => void
  getCurrentVersion: () => ComplianceVersion | null
  deleteVersion: (versionId: string) => void
  clearPrivateState: () => void
}

export const useComplianceStore = create<ComplianceStore>()(
  persist(
    (set, get) => ({
      versions: [],
      currentVersionId: null,
      isEditMode: false,

      addVersion: (content: string, label?: string) => {
        const newVersion: ComplianceVersion = {
          id: `version-${Date.now()}`,
          content,
          timestamp: new Date(),
          label: label || `Version ${get().versions.length + 1}`,
        }
        
        set((state) => ({
          versions: [...state.versions, newVersion],
          currentVersionId: newVersion.id,
        }))
      },

      updateCurrentVersion: (content: string) => {
        const currentId = get().currentVersionId
        if (!currentId) return

        set((state) => ({
          versions: state.versions.map((v) =>
            v.id === currentId ? { ...v, content } : v
          ),
        }))
      },

      setCurrentVersion: (versionId: string) => {
        set({ currentVersionId: versionId })
      },

      toggleEditMode: () => {
        set((state) => ({ isEditMode: !state.isEditMode }))
      },

      setEditMode: (isEdit: boolean) => {
        set({ isEditMode: isEdit })
      },

      getCurrentVersion: () => {
        const state = get()
        return state.versions.find((v) => v.id === state.currentVersionId) || null
      },

      deleteVersion: (versionId: string) => {
        set((state) => {
          const newVersions = state.versions.filter((v) => v.id !== versionId)
          const newCurrentId =
            state.currentVersionId === versionId
              ? newVersions[newVersions.length - 1]?.id || null
              : state.currentVersionId

          return {
            versions: newVersions,
            currentVersionId: newCurrentId,
          }
        })
      },

      clearPrivateState: () => {
        set({
          versions: [],
          currentVersionId: null,
          isEditMode: false,
        })
      },
    }),
    {
      name: 'compliance-storage',
      // Durable, larger client-side store (IndexedDB) with a one-time migration
      // from the old localStorage key. See src/lib/store/idb-storage.ts (PRD P0-1).
      storage: createJSONStorage(() => idbStorage),
    }
  )
)
