'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { idbStorage } from './idb-storage'

/**
 * Matter / project workspace store (PRD P1-3, $0 client-side path).
 *
 * Groups compliance work into named matters so reports can be tagged, saved,
 * and reopened. Persisted to IndexedDB via the shared idbStorage adapter — the
 * same free, durable client path used by the compliance store (no Supabase).
 */

export interface MatterReport {
  id: string
  title: string
  content: string
  complianceScore?: number | null
  savedAt: string
}

export interface Matter {
  id: string
  name: string
  tags: string[]
  reports: MatterReport[]
  documentNames: string[]
  createdAt: string
  updatedAt: string
}

/** A report handed to the store without its persistence metadata (id/savedAt). */
export type NewMatterReport = Omit<MatterReport, 'id' | 'savedAt'>

interface MatterStore {
  matters: Matter[]

  // Actions
  createMatter: (name: string, tags?: string[]) => Matter
  renameMatter: (matterId: string, name: string) => void
  addTag: (matterId: string, tag: string) => void
  removeTag: (matterId: string, tag: string) => void
  deleteMatter: (matterId: string) => void
  addReportToMatter: (matterId: string, report: NewMatterReport) => MatterReport | null
  removeReportFromMatter: (matterId: string, reportId: string) => void
  getMatter: (matterId: string) => Matter | undefined
  clearPrivateState: () => void
}

/** crypto.randomUUID() where available, with a timestamp-based fallback. */
function generateId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // Fall through to the timestamp-based id below.
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizeTags(tags?: string[]): string[] {
  if (!tags) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of tags) {
    const tag = raw.trim()
    if (!tag) continue
    const key = tag.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }
  return result
}

export const useMatterStore = create<MatterStore>()(
  persist(
    (set, get) => ({
      matters: [],

      createMatter: (name: string, tags?: string[]) => {
        const now = new Date().toISOString()
        const matter: Matter = {
          id: generateId(),
          name: name.trim() || 'Untitled matter',
          tags: normalizeTags(tags),
          reports: [],
          documentNames: [],
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({ matters: [matter, ...state.matters] }))
        return matter
      },

      renameMatter: (matterId: string, name: string) => {
        const trimmed = name.trim()
        if (!trimmed) return

        set((state) => ({
          matters: state.matters.map((matter) =>
            matter.id === matterId
              ? { ...matter, name: trimmed, updatedAt: new Date().toISOString() }
              : matter
          ),
        }))
      },

      addTag: (matterId: string, tag: string) => {
        const trimmed = tag.trim()
        if (!trimmed) return

        set((state) => ({
          matters: state.matters.map((matter) => {
            if (matter.id !== matterId) return matter
            if (matter.tags.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) {
              return matter
            }
            return {
              ...matter,
              tags: [...matter.tags, trimmed],
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },

      removeTag: (matterId: string, tag: string) => {
        set((state) => ({
          matters: state.matters.map((matter) =>
            matter.id === matterId
              ? {
                  ...matter,
                  tags: matter.tags.filter((existing) => existing !== tag),
                  updatedAt: new Date().toISOString(),
                }
              : matter
          ),
        }))
      },

      deleteMatter: (matterId: string) => {
        set((state) => ({
          matters: state.matters.filter((matter) => matter.id !== matterId),
        }))
      },

      addReportToMatter: (matterId: string, report: NewMatterReport) => {
        const matter = get().matters.find((entry) => entry.id === matterId)
        if (!matter) return null

        const savedReport: MatterReport = {
          id: generateId(),
          title: report.title.trim() || 'Untitled report',
          content: report.content,
          complianceScore: report.complianceScore ?? null,
          savedAt: new Date().toISOString(),
        }

        set((state) => ({
          matters: state.matters.map((entry) =>
            entry.id === matterId
              ? {
                  ...entry,
                  reports: [savedReport, ...entry.reports],
                  updatedAt: savedReport.savedAt,
                }
              : entry
          ),
        }))

        return savedReport
      },

      removeReportFromMatter: (matterId: string, reportId: string) => {
        set((state) => ({
          matters: state.matters.map((matter) =>
            matter.id === matterId
              ? {
                  ...matter,
                  reports: matter.reports.filter((report) => report.id !== reportId),
                  updatedAt: new Date().toISOString(),
                }
              : matter
          ),
        }))
      },

      getMatter: (matterId: string) => get().matters.find((matter) => matter.id === matterId),

      clearPrivateState: () => {
        set({ matters: [] })
      },
    }),
    {
      name: 'matter-storage',
      // Durable, larger client-side store (IndexedDB), the $0 alternative to a
      // paid backend. See src/lib/store/idb-storage.ts (PRD P0-1 / P1-3).
      storage: createJSONStorage(() => idbStorage),
    }
  )
)
