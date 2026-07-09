'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { FolderOpen, FolderPlus, FileText, Files, Trash2, Tag, Plus, Pencil, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMatterStore } from '@/lib/store/matter-store'

interface PendingReport {
  title: string
  content: string
  complianceScore?: number | null
  documentName?: string
}

interface MattersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pendingReport?: PendingReport
}

function parseTags(input: string): string[] {
  return input
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MattersDialog({ open, onOpenChange, pendingReport }: MattersDialogProps) {
  const matters = useMatterStore((state) => state.matters)
  const createMatter = useMatterStore((state) => state.createMatter)
  const deleteMatter = useMatterStore((state) => state.deleteMatter)
  const addReportToMatter = useMatterStore((state) => state.addReportToMatter)
  const addDocumentToMatter = useMatterStore((state) => state.addDocumentToMatter)
  const removeReportFromMatter = useMatterStore((state) => state.removeReportFromMatter)
  const renameMatter = useMatterStore((state) => state.renameMatter)
  const addTag = useMatterStore((state) => state.addTag)
  const removeTag = useMatterStore((state) => state.removeTag)

  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newTags, setNewTags] = useState('')
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [savedMatterIds, setSavedMatterIds] = useState<string[]>([])
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [newTagInput, setNewTagInput] = useState('')

  const selectedMatter = useMemo(
    () => matters.find((matter) => matter.id === selectedMatterId) ?? null,
    [matters, selectedMatterId]
  )

  // Keep a valid selection: default to the first matter, and recover if the
  // selected matter is deleted.
  useEffect(() => {
    if (!open) return
    if (matters.length === 0) {
      setSelectedMatterId(null)
      return
    }
    if (!selectedMatterId || !matters.some((matter) => matter.id === selectedMatterId)) {
      setSelectedMatterId(matters[0].id)
    }
  }, [open, matters, selectedMatterId])

  useEffect(() => {
    if (open) {
      setNewName('')
      setNewTags('')
      setStatusMessage(null)
      setSavedMatterIds([])
      setIsRenaming(false)
      setRenameValue('')
      setNewTagInput('')
    }
  }, [open])

  // Reset per-matter edit UI when the selection changes.
  useEffect(() => {
    setIsRenaming(false)
    setNewTagInput('')
  }, [selectedMatterId])

  const handleCreateMatter = (event: FormEvent) => {
    event.preventDefault()
    const name = newName.trim()
    if (!name) return

    const matter = createMatter(name, parseTags(newTags))
    setSelectedMatterId(matter.id)
    setNewName('')
    setNewTags('')
    setStatusMessage(`Created matter "${matter.name}".`)
  }

  const handleSaveReport = (matterId: string) => {
    if (!pendingReport) return
    const matter = matters.find((entry) => entry.id === matterId)
    const saved = addReportToMatter(matterId, {
      title: pendingReport.title,
      content: pendingReport.content,
      complianceScore: pendingReport.complianceScore ?? null,
    })
    if (saved) {
      if (pendingReport.documentName) {
        addDocumentToMatter(matterId, pendingReport.documentName)
      }
      setSelectedMatterId(matterId)
      setSavedMatterIds((prev) => (prev.includes(matterId) ? prev : [...prev, matterId]))
      setStatusMessage(`Saved report to "${matter?.name ?? 'matter'}".`)
    }
  }

  const startRename = () => {
    if (!selectedMatter) return
    setRenameValue(selectedMatter.name)
    setIsRenaming(true)
  }

  const submitRename = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedMatter) return
    const value = renameValue.trim()
    if (value) renameMatter(selectedMatter.id, value)
    setIsRenaming(false)
  }

  const handleAddTag = (event: FormEvent) => {
    event.preventDefault()
    if (!selectedMatter) return
    const value = newTagInput.trim()
    if (!value) return
    addTag(selectedMatter.id, value)
    setNewTagInput('')
  }

  const scorePillClassName = (score: number) => {
    if (score >= 80) {
      return 'bg-green-50 text-green-700 dark:bg-green-400/10 dark:text-green-200'
    }
    if (score >= 60) {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200'
    }
    return 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-200'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92dvh] max-w-[calc(100vw-1rem)] flex-col gap-0 overflow-hidden border-[#8A82DC] bg-[#FBFAFF] p-0 dark:border-iris-300/15 dark:bg-[#171322] sm:max-h-[88dvh] sm:max-w-2xl lg:max-w-[min(calc(100vw-2rem),56rem)]">
        <DialogHeader className="shrink-0 border-b border-[#8A82DC] bg-[#F8F6FF] px-4 py-4 dark:border-iris-300/15 dark:bg-[#1a1625] sm:px-7 sm:py-5">
          <div className="grid min-w-0 grid-cols-[2.5rem_1fr] items-start gap-3 pr-8 sm:grid-cols-[2.75rem_1fr]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-iris-100 text-iris-700 dark:bg-iris-400/15 dark:text-iris-200 sm:h-11 sm:w-11">
              <FolderOpen className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-left text-lg font-bold leading-tight text-slate-950 dark:text-slate-100 sm:text-xl">
                Matters &amp; Projects
              </DialogTitle>
              <DialogDescription className="mt-1.5 max-w-2xl text-left text-sm leading-6 text-slate-700 dark:text-slate-300 sm:mt-2">
                Group compliance work into matters so reports can be tagged, saved, and reopened. Stored privately on this device.
              </DialogDescription>
              {statusMessage && (
                <p
                  className="mt-2 text-sm font-medium leading-6 text-emerald-700 dark:text-emerald-200"
                  role="status"
                >
                  {statusMessage}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 max-w-full flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          {/* Matter list + create form */}
          <div className="flex min-h-0 flex-col overflow-y-auto border-b border-[#8A82DC] px-4 py-4 dark:border-iris-300/15 lg:border-b-0 lg:border-r sm:px-5">
            <form onSubmit={handleCreateMatter} className="space-y-3">
              <div>
                <label
                  htmlFor="matter-name"
                  className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-500"
                >
                  New matter
                </label>
                <input
                  id="matter-name"
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Acme Corp data privacy review"
                  className="min-h-11 w-full rounded-lg border border-[#8A82DC] bg-[#FBFAFF] px-3 text-sm text-slate-900 shadow-sm shadow-iris-950/8 focus:border-primary focus:outline-none focus:ring-2 focus:ring-iris-500 focus:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-none dark:focus:ring-offset-[#171322]"
                />
              </div>
              <div>
                <label
                  htmlFor="matter-tags"
                  className="mb-1 block text-xs font-semibold uppercase text-slate-600 dark:text-slate-500"
                >
                  Tags (comma-separated)
                </label>
                <input
                  id="matter-tags"
                  type="text"
                  value={newTags}
                  onChange={(event) => setNewTags(event.target.value)}
                  placeholder="privacy, npc, high-priority"
                  className="min-h-11 w-full rounded-lg border border-[#8A82DC] bg-[#FBFAFF] px-3 text-sm text-slate-900 shadow-sm shadow-iris-950/8 focus:border-primary focus:outline-none focus:ring-2 focus:ring-iris-500 focus:ring-offset-2 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-none dark:focus:ring-offset-[#171322]"
                />
              </div>
              <button
                type="submit"
                disabled={!newName.trim()}
                className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white transition-colors hover:bg-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#171322]"
              >
                <FolderPlus className="h-4 w-4" aria-hidden="true" />
                Create matter
              </button>
            </form>

            <div className="mt-5 min-h-0 flex-1">
              <p className="mb-2 text-xs font-semibold uppercase text-slate-600 dark:text-slate-500">
                {matters.length} {matters.length === 1 ? 'matter' : 'matters'}
              </p>
              {matters.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#8A82DC] px-3 py-4 text-sm text-slate-600 dark:border-iris-300/20 dark:text-slate-400">
                  No matters yet. Create one above to start grouping compliance reports.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {matters.map((matter) => {
                    const isSelected = matter.id === selectedMatterId
                    return (
                      <li key={matter.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedMatterId(matter.id)}
                          aria-pressed={isSelected}
                          className={[
                            'flex min-h-11 w-full cursor-pointer flex-col items-start gap-1 rounded-lg px-3 py-2 text-left transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]',
                            isSelected
                              ? 'bg-[#EFECFF] text-iris-800 dark:bg-iris-300/16 dark:text-iris-100'
                              : 'text-slate-700 hover:bg-[#EFECFF] hover:text-slate-950 dark:text-slate-300 dark:hover:bg-iris-300/10 dark:hover:text-slate-100',
                          ].join(' ')}
                        >
                          <span className="min-w-0 w-full truncate text-sm font-semibold">{matter.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {matter.reports.length} {matter.reports.length === 1 ? 'report' : 'reports'}
                            {matter.tags.length > 0 ? ` · ${matter.tags.length} tag${matter.tags.length === 1 ? '' : 's'}` : ''}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Selected matter detail */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {selectedMatter ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {isRenaming ? (
                      <form onSubmit={submitRename} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(event) => setRenameValue(event.target.value)}
                          aria-label="Matter name"
                          autoFocus
                          className="min-h-10 w-full min-w-0 rounded-lg border border-[#8A82DC] bg-[#FBFAFF] px-3 text-sm font-semibold text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-iris-500 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100"
                        />
                        <button
                          type="submit"
                          aria-label="Save name"
                          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-primary text-white transition-colors hover:bg-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500"
                        >
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRenaming(false)}
                          aria-label="Cancel rename"
                          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-iris-300/10"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-start gap-2">
                        <h3 className="min-w-0 break-words text-base font-bold text-slate-950 dark:text-slate-100">
                          {selectedMatter.name}
                        </h3>
                        <button
                          type="button"
                          onClick={startRename}
                          aria-label="Rename matter"
                          className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[#EFECFF] hover:text-iris-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 dark:text-slate-400 dark:hover:bg-iris-300/10 dark:hover:text-iris-100"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Updated {formatSavedAt(selectedMatter.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteMatter(selectedMatter.id)}
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-rose-400 bg-[#FBFAFF] px-3 text-sm font-bold text-rose-700 transition-colors hover:border-rose-600 hover:bg-rose-50 hover:text-rose-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:border-rose-300/20 dark:bg-[#241f32] dark:text-rose-200 dark:hover:border-rose-300/40 dark:hover:bg-rose-300/10 dark:hover:text-rose-100 dark:focus-visible:ring-offset-[#171322]"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete matter
                  </button>
                </div>

                {/* Save current report */}
                {pendingReport && (
                  <div className="rounded-xl border border-iris-200 bg-[#F4F2FF] p-4 dark:border-iris-300/20 dark:bg-[#241f32]">
                    <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-500">
                      Current report
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
                      {pendingReport.title || 'Untitled report'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleSaveReport(selectedMatter.id)}
                      className="mt-3 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-bold text-white transition-colors hover:bg-iris-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]"
                    >
                      {savedMatterIds.includes(selectedMatter.id) ? (
                        <>
                          <Check className="h-4 w-4" aria-hidden="true" />
                          Save again
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          Save current report to this matter
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600 dark:text-slate-500">
                    <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                    Tags
                  </p>
                  {selectedMatter.tags.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No tags on this matter.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedMatter.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-[#EFECFF] py-1 pl-2.5 pr-1 text-xs font-semibold text-iris-800 dark:bg-iris-300/12 dark:text-iris-200"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => removeTag(selectedMatter.id, tag)}
                            aria-label={`Remove tag ${tag}`}
                            className="flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-iris-700 transition-colors hover:bg-iris-200 hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 dark:text-iris-200 dark:hover:bg-iris-300/25"
                          >
                            <X className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleAddTag} className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(event) => setNewTagInput(event.target.value)}
                      placeholder="Add a tag"
                      aria-label="Add a tag"
                      className="min-h-10 w-full min-w-0 rounded-lg border border-[#8A82DC] bg-[#FBFAFF] px-3 text-sm text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-iris-500 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100"
                    />
                    <button
                      type="submit"
                      disabled={!newTagInput.trim()}
                      aria-label="Add tag"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#8A82DC] text-iris-700 transition-colors hover:bg-[#EFECFF] hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-iris-300/15 dark:text-iris-200 dark:hover:bg-iris-300/10"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </form>
                </div>

                {/* Documents */}
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-slate-600 dark:text-slate-500">
                    <Files className="h-3.5 w-3.5" aria-hidden="true" />
                    Documents
                  </p>
                  {selectedMatter.documentNames.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      No documents recorded yet. Saving a report records its source document here.
                    </p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {selectedMatter.documentNames.map((doc) => (
                        <li
                          key={doc}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#8A82DC] bg-[#FBFAFF] px-2.5 py-1 text-xs text-slate-700 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-300"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0 text-iris-700 dark:text-iris-200" aria-hidden="true" />
                          <span className="truncate">{doc}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Reports */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-600 dark:text-slate-500">
                    Saved reports
                  </p>
                  {selectedMatter.reports.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[#8A82DC] px-3 py-4 text-sm text-slate-600 dark:border-iris-300/20 dark:text-slate-400">
                      No reports saved to this matter yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {selectedMatter.reports.map((report) => (
                        <li
                          key={report.id}
                          className="flex items-start gap-3 rounded-xl border border-[#8A82DC] bg-[#FBFAFF] p-3 shadow-sm shadow-iris-950/8 dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-none"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EFECFF] text-iris-800 dark:bg-iris-400/10 dark:text-iris-200">
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-semibold text-slate-950 dark:text-slate-100">
                              {report.title}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {formatSavedAt(report.savedAt)}
                              </span>
                              {typeof report.complianceScore === 'number' && (
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${scorePillClassName(report.complianceScore)}`}
                                >
                                  {Math.round(report.complianceScore)}% compliance
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeReportFromMatter(selectedMatter.id, report.id)}
                            aria-label={`Remove report ${report.title}`}
                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-rose-300/10 dark:hover:text-rose-200 dark:focus-visible:ring-offset-[#171322]"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFECFF] text-iris-700 dark:bg-iris-400/10 dark:text-iris-200">
                  <FolderOpen className="h-6 w-6" aria-hidden="true" />
                </div>
                <p className="max-w-xs text-sm text-slate-600 dark:text-slate-400">
                  {matters.length === 0
                    ? 'Create your first matter to save and organize compliance reports.'
                    : 'Select a matter to view its saved reports and tags.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
