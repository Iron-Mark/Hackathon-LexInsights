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
  /**
   * Server linkage for the current report lineage (PRD P0-1): the
   * compliance_reports row this lineage maps to, and the report_versions row
   * each client version id maps to. Null/empty for guests and unsynced work.
   */
  serverReportId: string | null
  serverReportTitle: string | null
  serverVersionIds: Record<string, string>

  // Actions
  addVersion: (content: string, label?: string) => ComplianceVersion
  updateCurrentVersion: (content: string) => void
  setCurrentVersion: (versionId: string) => void
  toggleEditMode: () => void
  setEditMode: (isEdit: boolean) => void
  getCurrentVersion: () => ComplianceVersion | null
  deleteVersion: (versionId: string) => void
  setServerReportId: (reportId: string | null) => void
  setServerReportTitle: (title: string | null) => void
  linkServerVersion: (clientVersionId: string, serverVersionId: string) => void
  unlinkServerVersion: (clientVersionId: string) => void
  seedFromServer: (
    versions: ComplianceVersion[],
    serverReportId: string,
    serverReportTitle: string | null,
    serverVersionIds: Record<string, string>
  ) => void
  clearPrivateState: () => void
}

export const useComplianceStore = create<ComplianceStore>()(
  persist(
    (set, get) => ({
      versions: [],
      currentVersionId: null,
      isEditMode: false,
      serverReportId: null,
      serverReportTitle: null,
      serverVersionIds: {},

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

        return newVersion
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

      setServerReportId: (reportId: string | null) => {
        set({ serverReportId: reportId })
      },

      setServerReportTitle: (title: string | null) => {
        set({ serverReportTitle: title })
      },

      linkServerVersion: (clientVersionId: string, serverVersionId: string) => {
        set((state) => ({
          serverVersionIds: { ...state.serverVersionIds, [clientVersionId]: serverVersionId },
        }))
      },

      unlinkServerVersion: (clientVersionId: string) => {
        set((state) => {
          const next = { ...state.serverVersionIds }
          delete next[clientVersionId]
          return { serverVersionIds: next }
        })
      },

      seedFromServer: (versions, serverReportId, serverReportTitle, serverVersionIds) => {
        set({
          versions,
          currentVersionId: versions[versions.length - 1]?.id ?? null,
          serverReportId,
          serverReportTitle,
          serverVersionIds,
        })
      },

      clearPrivateState: () => {
        set({
          versions: [],
          currentVersionId: null,
          isEditMode: false,
          serverReportId: null,
          serverReportTitle: null,
          serverVersionIds: {},
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
