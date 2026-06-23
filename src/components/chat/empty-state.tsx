'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Building2, FileSearch, Recycle, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/store/auth-store'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { cn } from '@/lib/utils'
import { UploadedFilesList } from './uploaded-files-list'

interface EmptyStateProps {
  onPromptSelect: (prompt: string) => void
}

export function EmptyState({ onPromptSelect }: EmptyStateProps) {
  const { user } = useAuthStore()
  const { mode } = useChatModeStore()
  const { uploadedFiles } = useFileUploadStore()
  const [greeting, setGreeting] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)

    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const userName = user?.full_name?.split(' ')[0] || 'there'

  const suggestedPrompts = mode === 'compliance'
    ? [
        {
          prompt: 'Analyze my document for RA 10173 Data Privacy compliance',
          eyebrow: 'Document audit',
          scope: 'RA 10173',
          icon: ShieldCheck,
          tone: 'iris',
        },
        {
          prompt: 'Check an AML policy against RA 9160 controls',
          eyebrow: 'Control review',
          scope: 'RA 9160',
          icon: FileSearch,
          tone: 'emerald',
        },
        {
          prompt: 'Review online incident response under RA 10175',
          eyebrow: 'Cyber incident',
          scope: 'RA 10175',
          icon: Recycle,
          tone: 'sky',
        },
        {
          prompt: 'Assess child online safety reporting under RA 9775',
          eyebrow: 'Safety report',
          scope: 'RA 9775',
          icon: Building2,
          tone: 'amber',
        },
      ]
    : [
        {
          prompt: 'Compare RA 10173 and RA 10175 for incident response',
          eyebrow: 'Incident map',
          scope: 'RA 10173 + 10175',
          icon: ShieldCheck,
          tone: 'iris',
        },
        {
          prompt: 'What AML controls apply under RA 9160?',
          eyebrow: 'AML controls',
          scope: 'RA 9160',
          icon: FileSearch,
          tone: 'emerald',
        },
        {
          prompt: 'What does RA 9775 require for online child safety reporting?',
          eyebrow: 'Child safety',
          scope: 'RA 9775',
          icon: Building2,
          tone: 'amber',
        },
        {
          prompt: 'Explain RA 9003 Solid Waste Management Act',
          eyebrow: 'LGU checklist',
          scope: 'RA 9003',
          icon: Recycle,
          tone: 'sky',
        },
      ]

  const toneStyles = {
    iris: {
      card: 'border-iris-300/70 bg-iris-50/80 shadow-slate-950/5 dark:border-iris-300/45 dark:bg-iris-400/12 dark:shadow-black/20',
      rail: 'bg-iris-500 dark:bg-iris-300',
      icon: 'bg-white text-iris-700 ring-iris-200 dark:bg-iris-300/15 dark:text-iris-100 dark:ring-iris-300/30',
      chip: 'bg-iris-100 text-iris-800 ring-iris-200 dark:bg-iris-300/15 dark:text-iris-100 dark:ring-iris-300/30',
      arrow: 'text-iris-600 dark:text-iris-200',
    },
    emerald: {
      card: 'border-emerald-200/80 bg-emerald-50/75 shadow-emerald-950/5 dark:border-emerald-400/35 dark:bg-emerald-400/10 dark:shadow-black/20',
      rail: 'bg-emerald-500 dark:bg-emerald-300',
      icon: 'bg-white text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-100 dark:ring-emerald-300/25',
      chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-100 dark:ring-emerald-300/25',
      arrow: 'text-emerald-700 dark:text-emerald-200',
    },
    amber: {
      card: 'border-amber-200/80 bg-amber-50/75 shadow-amber-950/5 dark:border-amber-300/35 dark:bg-amber-300/10 dark:shadow-black/20',
      rail: 'bg-amber-500 dark:bg-amber-300',
      icon: 'bg-white text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-100 dark:ring-amber-300/25',
      chip: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-100 dark:ring-amber-300/25',
      arrow: 'text-amber-700 dark:text-amber-200',
    },
    sky: {
      card: 'border-sky-200/80 bg-sky-50/75 shadow-sky-950/5 dark:border-sky-300/35 dark:bg-sky-300/10 dark:shadow-black/20',
      rail: 'bg-sky-500 dark:bg-sky-300',
      icon: 'bg-white text-sky-700 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-100 dark:ring-sky-300/25',
      chip: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-100 dark:ring-sky-300/25',
      arrow: 'text-sky-700 dark:text-sky-200',
    },
  } as const

  return (
    <div className="pointer-events-auto mx-auto w-full max-w-3xl px-4 text-center">
      {/* Minimal Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-2xl space-y-1.5 sm:space-y-2"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold leading-[1.05] text-slate-950 sm:text-4xl dark:text-slate-100"
        >
          {greeting}, {userName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-md text-sm leading-5 text-slate-500 sm:text-base dark:text-slate-400"
        >
          {mode === 'compliance' 
            ? 'Upload documents for compliance analysis'
            : 'Your Philippine legal research assistant'}
        </motion.p>

        {!user && mode === 'compliance' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-xs text-slate-500 dark:text-slate-400"
          >
            Guest document checks are temporary and are not saved to an account.
          </motion.p>
        )}
      </motion.div>

      {/* Show uploaded files in compliance mode */}
      {mode === 'compliance' && uploadedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-7"
        >
          <UploadedFilesList />
        </motion.div>
      )}

      {/* Suggested prompt briefs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-9 grid gap-3"
      >
        {suggestedPrompts.map(({ prompt, eyebrow, scope, icon: Icon, tone }, index) => {
          const styles = toneStyles[tone as keyof typeof toneStyles]

          return (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.035, duration: 0.2 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => onPromptSelect(prompt)}
            disabled={!isHydrated}
            className={cn(
              'group relative flex min-h-16 w-full gap-3 overflow-hidden rounded-md border px-3.5 py-3 text-left shadow-sm transition-all duration-200',
              'hover:border-slate-300 hover:shadow-md active:shadow-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900',
              'disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm',
              styles.card
            )}
          >
            <span
              className={cn(
                'absolute inset-y-3 left-0 w-1 rounded-r-full opacity-90 transition-all duration-200 group-hover:opacity-100',
                styles.rail
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1 transition-all duration-200 group-hover:scale-105',
                styles.icon
              )}
            aria-hidden="true"
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[11px] font-bold uppercase leading-4 text-slate-500 dark:text-slate-400">
                  {eyebrow}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold leading-4 ring-1',
                    styles.chip
                  )}
                >
                  {scope}
                </span>
              </span>
              <span className="mt-1 block text-sm font-semibold leading-5 text-slate-900 dark:text-slate-50">
                {prompt}
              </span>
            </span>
            <span
              className={cn(
                'ml-2 flex h-10 w-10 shrink-0 self-center items-center justify-center opacity-75 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100',
                styles.arrow
              )}
              aria-hidden="true"
            >
              <ArrowRight className="h-6 w-6" strokeWidth={1.9} />
            </span>
          </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
