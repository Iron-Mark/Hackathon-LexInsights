'use client'

import { useState } from 'react'
import { Clock, Trash2, X } from 'lucide-react'
import { useComplianceStore } from '@/lib/store/compliance-store'
import { cn } from '@/lib/utils'
import { formatVersionTimestamp } from '@/lib/utils/browser-actions'

export function VersionHistorySidebar() {
  const { versions, currentVersionId, setCurrentVersion, deleteVersion } = useComplianceStore()
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  if (versions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">No versions yet</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-iris-300/15">
        <h3 className="font-display truncate text-sm font-semibold text-neutral-900 dark:text-slate-100">Version History</h3>
        <p className="font-body mt-1 truncate text-xs font-medium text-neutral-600 dark:text-slate-400">{versions.length} versions</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {versions.map((version, index) => {
          const isActive = version.id === currentVersionId
          const isLatest = index === versions.length - 1

          return (
            <div
              key={version.id}
              className={cn(
                'group relative border-b border-slate-100 px-4 py-3 transition-colors dark:border-iris-300/10',
                isActive ? 'bg-iris-100 dark:bg-iris-400/10' : 'hover:bg-slate-50 dark:hover:bg-iris-300/10'
              )}
            >
              <div
                onClick={() => setCurrentVersion(version.id)}
                className="w-full cursor-pointer rounded text-left transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setCurrentVersion(version.id)
                  }
                }}
                aria-label={`Switch to ${version.label}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                      <span
                        className={cn(
                          'font-body text-sm font-semibold truncate',
                          isActive ? 'text-iris-700 dark:text-iris-200' : 'text-neutral-800 dark:text-slate-200'
                        )}
                      >
                        {version.label}
                      </span>
                      {isLatest && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-400/10 dark:text-green-200">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="font-body mt-1 text-xs font-medium text-neutral-600 dark:text-slate-400">
                      {formatVersionTimestamp(version.timestamp)}
                    </p>
                  </div>

                  {versions.length > 1 && (
                    <div
                      className={cn(
                        'flex items-center gap-1 transition-opacity',
                        confirmDeleteId === version.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {confirmDeleteId === version.id ? (
                        <>
                          <button
                            onClick={() => {
                              deleteVersion(version.id)
                              setConfirmDeleteId(null)
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded bg-red-600 text-white transition-all hover:bg-red-700 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                            aria-label={`Confirm delete ${version.label}`}
                            type="button"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="flex h-7 w-7 items-center justify-center rounded bg-slate-100 text-slate-600 transition-all hover:bg-slate-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 dark:bg-[#241f32] dark:text-slate-200 dark:hover:bg-iris-300/10 dark:hover:text-iris-200"
                            aria-label={`Cancel delete ${version.label}`}
                            type="button"
                          >
                            <X className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(version.id)}
                          className="flex h-7 w-7 items-center justify-center rounded p-0 transition-all hover:bg-red-50 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-400/10"
                          aria-label={`Delete ${version.label}`}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-300" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
