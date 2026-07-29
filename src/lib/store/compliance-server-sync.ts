'use client'

/**
 * Browser binding for compliance-report server persistence (PRD P0-1).
 *
 * Bridges the zustand stores to the pure sync core in
 * src/lib/services/compliance-persistence/sync.ts. Signed-in users get a
 * dual-write: every saved version mirrors to Supabase
 * (compliance_reports / report_versions / report_findings) while IndexedDB
 * stays the local copy. Guests are a silent no-op — their reports remain
 * browser-only, matching the existing guest posture in chat-store.ts.
 *
 * All server operations run through one serial queue: concurrent first saves
 * would otherwise both see an unlinked lineage and create duplicate report
 * rows (React StrictMode double-effects make that deterministic in dev), and
 * a delete racing an in-flight save would miss the version linkage.
 *
 * Server failures never block or revert a local save; they log and show a
 * one-time informational toast, following the chat-store fallback pattern.
 */

import { showToast } from '@/components/ui/toast'
import { createComplianceReportRepository } from '@/lib/services/compliance-persistence/factory'
import {
  performHydration,
  performVersionDelete,
  performVersionSync,
  type ComplianceSyncState,
} from '@/lib/services/compliance-persistence/sync'
import type { FindingSeed } from '@/lib/services/compliance-persistence/findings-extractor'

import { useAuthStore } from './auth-store'
import { useChatStore } from './chat-store'
import { useComplianceStore, type ComplianceVersion } from './compliance-store'

const SYNC_UNAVAILABLE_TOAST =
  'Cloud save is unavailable right now. Your report is kept in this browser.'

let syncFailureToastShown = false

// Serial queue for every server operation (see module docstring).
let syncQueue: Promise<unknown> = Promise.resolve()

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const run = syncQueue.then(operation, operation)
  syncQueue = run.then(
    () => undefined,
    () => undefined
  )
  return run
}

function notifySyncFailure(action: string, error: unknown) {
  console.warn(`Compliance server sync failed (${action}):`, error)

  if (!syncFailureToastShown) {
    syncFailureToastShown = true
    showToast(SYNC_UNAVAILABLE_TOAST, 'info')
  }
}

/**
 * Linkage state backed by the compliance store, scoped to the user the
 * operation started for: if the auth user changes mid-flight (sign-out, or a
 * different sign-in), the late writes are dropped instead of resurrecting
 * linkage into a cleared or foreign store.
 */
function storeSyncState(forUserId: string): ComplianceSyncState {
  const stillCurrent = () => useAuthStore.getState().user?.id === forUserId

  return {
    getServerReportId: () => useComplianceStore.getState().serverReportId,
    setServerReportId: (reportId) => {
      if (stillCurrent()) useComplianceStore.getState().setServerReportId(reportId)
    },
    getServerVersionId: (clientVersionId) =>
      useComplianceStore.getState().serverVersionIds[clientVersionId],
    linkServerVersion: (clientVersionId, serverVersionId) => {
      if (stillCurrent()) {
        useComplianceStore.getState().linkServerVersion(clientVersionId, serverVersionId)
      }
    },
    unlinkServerVersion: (clientVersionId) => {
      if (stillCurrent()) useComplianceStore.getState().unlinkServerVersion(clientVersionId)
    },
  }
}

/**
 * The active chat's Supabase id, or null when the chat is local-only. Guest
 * ('guest_') and Supabase-outage ('fallback_') chats never exist server-side
 * (see isLocalChatId in chat-store.ts). Recorded in report metadata only —
 * deliberately NOT as the compliance_reports.chat_id foreign key, because
 * that column is ON DELETE CASCADE and would let an ordinary chat deletion
 * destroy the whole persisted report (defeating P0-1's durability goal).
 */
function serverChatId(): string | null {
  const chatId = useChatStore.getState().activeChat?.id
  if (!chatId || chatId.startsWith('guest_') || chatId.startsWith('fallback_')) {
    return null
  }
  return chatId
}

/** Wait for the zustand persist middleware to finish loading IndexedDB. */
async function waitForComplianceStoreHydration(): Promise<void> {
  if (useComplianceStore.persist.hasHydrated()) return

  await new Promise<void>((resolve) => {
    const unsubscribe = useComplianceStore.persist.onFinishHydration(() => {
      unsubscribe()
      resolve()
    })
  })
}

export interface SavedVersionSyncInput {
  clientVersionId: string
  content: string
  label: string
  title: string
  complianceScore: number | null
  metadata: Record<string, unknown>
  findingSeeds: FindingSeed[] | null
}

/**
 * Mirror a locally saved version to Supabase. No-op for guests. Safe to call
 * fire-and-forget: never throws, never blocks the local save.
 */
export async function syncSavedComplianceVersion(input: SavedVersionSyncInput): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return

  try {
    const result = await enqueue(() =>
      performVersionSync(createComplianceReportRepository(), storeSyncState(user.id), {
        userId: user.id,
        clientVersionId: input.clientVersionId,
        content: input.content,
        label: input.label,
        title: input.title,
        chatId: null,
        documentId: null,
        complianceScore: input.complianceScore,
        metadata: { ...input.metadata, chatId: serverChatId() },
        findingSeeds: input.findingSeeds,
      })
    )

    if (result.ok) {
      if (useAuthStore.getState().user?.id === user.id) {
        useComplianceStore.getState().setServerReportTitle(input.title)
      }
    } else {
      notifySyncFailure('save version', result.error)
    }
  } catch (error) {
    // e.g. missing Supabase env vars make repository construction throw.
    notifySyncFailure('save version', error)
  }
}

/** Mirror a local version deletion to Supabase. No-op for guests/unsynced. */
export async function syncDeletedComplianceVersion(clientVersionId: string): Promise<void> {
  const user = useAuthStore.getState().user
  if (!user) return

  try {
    // Queued behind any in-flight save, so a version whose first sync is
    // still running gets its linkage before the delete looks it up.
    const result = await enqueue(() =>
      performVersionDelete(
        createComplianceReportRepository(),
        storeSyncState(user.id),
        clientVersionId
      )
    )

    if (!result.ok) {
      notifySyncFailure('delete version', result.error)
    }
  } catch (error) {
    notifySyncFailure('delete version', error)
  }
}

/**
 * Reload the signed-in user's latest server report into the local store so a
 * report survives clearing browser storage (PRD P0-1 acceptance). Waits for
 * IndexedDB rehydration first and only seeds when the local store is truly
 * empty — local work is never overwritten. Returns true when seeded.
 */
export async function hydrateComplianceFromServer(): Promise<boolean> {
  const user = useAuthStore.getState().user
  if (!user) return false

  try {
    await waitForComplianceStoreHydration()

    const store = useComplianceStore.getState()
    if (store.versions.length > 0 || store.serverReportId) return false

    const hydration = await enqueue(() =>
      performHydration(createComplianceReportRepository(), user.id)
    )
    if (!hydration || hydration.versions.length === 0) return false

    // Re-check after the awaits: a new analysis may have started, or the
    // user may have changed, while the server round-trip was in flight.
    if (useAuthStore.getState().user?.id !== user.id) return false
    const current = useComplianceStore.getState()
    if (current.versions.length > 0 || current.serverReportId) return false

    const versions: ComplianceVersion[] = hydration.versions.map((version) => ({
      // Server uuids double as client ids so the linkage map stays 1:1.
      id: version.id,
      content: version.content,
      timestamp: new Date(version.createdAt),
      label: version.label,
    }))
    const serverVersionIds = Object.fromEntries(versions.map((version) => [version.id, version.id]))

    current.seedFromServer(versions, hydration.report.id, hydration.report.title, serverVersionIds)
    return true
  } catch (error) {
    // Hydration is opportunistic: a failure just means the user starts from
    // an empty local store, exactly as before this feature.
    console.warn('Compliance server hydration failed:', error)
    return false
  }
}
