'use client'

import { Clock, Trash2 } from 'lucide-react'
import { useComplianceStore } from '@/lib/store/compliance-store'
import { cn } from '@/lib/utils'

export function VersionHistorySidebar() {
  const { versions, currentVersionId, setCurrentVersion, deleteVersion } = useComplianceStore()

  const formatTimestamp = (date: Date) => {
    const d = new Date(date)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (versions.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <p className="text-sm text-slate-500">No versions yet</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="font-display text-sm font-semibold text-neutral-900 truncate">Version History</h3>
        <p className="font-body text-xs text-neutral-600 mt-1 truncate font-medium">{versions.length} versions</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {versions.map((version, index) => {
          const isActive = version.id === currentVersionId
          const isLatest = index === versions.length - 1

          return (
            <div
              key={version.id}
              className={cn(
                'group relative border-b border-slate-100 px-4 py-3 transition-colors',
                isActive ? 'bg-iris-100' : 'hover:bg-slate-50'
              )}
            >
              <div
                onClick={() => setCurrentVersion(version.id)}
                className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded cursor-pointer"
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
                          isActive ? 'text-iris-700' : 'text-neutral-800'
                        )}
                      >
                        {version.label}
                      </span>
                      {isLatest && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Latest
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-body text-xs text-neutral-600 font-medium">
                      {formatTimestamp(version.timestamp)}
                    </p>
                  </div>

                  {versions.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Delete ${version.label}?`)) {
                          deleteVersion(version.id)
                        }
                      }}
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded hover:bg-slate-100 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Delete ${version.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-600" aria-hidden="true" />
                    </button>
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
