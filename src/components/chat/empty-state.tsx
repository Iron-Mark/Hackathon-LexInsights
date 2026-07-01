'use client'

import { useState, useEffect } from 'react'
import { ArrowRight, Building2, FileSearch, Recycle, ShieldCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useAuthStore } from '@/lib/store/auth-store'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
import { cn } from '@/lib/utils'
import { UploadedFilesList } from './uploaded-files-list'

interface EmptyStateProps {
  onPromptSelect: (prompt: string) => void
  compact?: boolean
}

export function EmptyState({ onPromptSelect, compact = false }: EmptyStateProps) {
  const { user } = useAuthStore()
  const { mode } = useChatModeStore()
  const { uploadedFiles } = useFileUploadStore()
  const [greeting, setGreeting] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const shouldReduceMotion = !isHydrated || Boolean(prefersReducedMotion)

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
      card: 'border-[#8A82DC]/24 bg-[#FBFAFF]/90 shadow-iris-950/8 dark:border-iris-300/10 dark:bg-iris-400/10 dark:shadow-iris-950/20',
      icon: 'bg-[#EFECFF] text-iris-800 ring-[#8A82DC]/70 dark:bg-iris-300/15 dark:text-iris-100 dark:ring-iris-300/30',
      chip: 'bg-iris-100 text-iris-900 ring-[#8A82DC]/70 dark:bg-iris-300/15 dark:text-iris-100 dark:ring-iris-300/30',
      arrow: 'text-iris-600 dark:text-iris-200',
    },
    emerald: {
      card: 'border-emerald-600/22 bg-[#FBFAFF]/90 shadow-emerald-950/8 dark:border-emerald-400/10 dark:bg-emerald-400/9 dark:shadow-iris-950/20',
      icon: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-100 dark:ring-emerald-300/25',
      chip: 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-300/15 dark:text-emerald-100 dark:ring-emerald-300/25',
      arrow: 'text-emerald-700 dark:text-emerald-200',
    },
    amber: {
      card: 'border-amber-600/24 bg-[#FBFAFF]/90 shadow-amber-950/8 dark:border-amber-300/10 dark:bg-amber-300/9 dark:shadow-iris-950/20',
      icon: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-100 dark:ring-amber-300/25',
      chip: 'bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-300/15 dark:text-amber-100 dark:ring-amber-300/25',
      arrow: 'text-amber-700 dark:text-amber-200',
    },
    sky: {
      card: 'border-sky-600/22 bg-[#FBFAFF]/90 shadow-sky-950/8 dark:border-sky-300/10 dark:bg-sky-300/9 dark:shadow-iris-950/20',
      icon: 'bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-100 dark:ring-sky-300/25',
      chip: 'bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-300/15 dark:text-sky-100 dark:ring-sky-300/25',
      arrow: 'text-sky-700 dark:text-sky-200',
    },
  } as const

  const fadeInitial = { opacity: 0 }
  const visibleAnimation = shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }

  return (
    <div className={cn('pointer-events-auto mx-auto w-full px-4 text-center', compact ? 'max-w-md' : 'max-w-3xl')}>
      {/* Minimal Greeting */}
      <motion.div
        initial={fadeInitial}
        animate={visibleAnimation}
        transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.4 }}
        className="mx-auto max-w-2xl space-y-1.5 sm:space-y-2"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.1 }}
          className={cn(
            'font-bold leading-[1.05] text-slate-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.78)] dark:text-slate-100 dark:drop-shadow-none',
            compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
          )}
        >
          {greeting}, {userName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 }}
          className="mx-auto max-w-md text-sm font-medium leading-5 text-slate-700 sm:text-base dark:text-slate-400"
        >
          {mode === 'compliance' 
            ? 'Upload documents for compliance analysis'
            : 'Your Philippine legal research assistant'}
        </motion.p>

        {!user && mode === 'compliance' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25 }}
            className="text-xs text-slate-700 dark:text-slate-400"
          >
            Guest document checks are temporary and are not saved to an account.
          </motion.p>
        )}
      </motion.div>

      {/* Show uploaded files in compliance mode */}
      {mode === 'compliance' && uploadedFiles.length > 0 && (
        <motion.div
          initial={fadeInitial}
          animate={visibleAnimation}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.25 }}
          className="mt-7"
        >
          <UploadedFilesList />
        </motion.div>
      )}

      {/* Suggested prompt briefs */}
      {!compact && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.3 }}
          className="mt-9 grid gap-3"
        >
          {suggestedPrompts.map(({ prompt, eyebrow, scope, icon: Icon, tone }, index) => {
            const styles = toneStyles[tone as keyof typeof toneStyles]

            return (
            <motion.button
              key={index}
              initial={fadeInitial}
              animate={visibleAnimation}
              transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2 + index * 0.035, duration: 0.2 }}
              whileHover={shouldReduceMotion ? undefined : { y: -2 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
              onClick={() => onPromptSelect(prompt)}
              disabled={!isHydrated}
              className={cn(
                'group relative flex min-h-16 w-full gap-3 overflow-hidden rounded-lg border px-3.5 py-3 text-left shadow-[0_8px_18px_rgba(63,51,189,0.018)] ring-1 ring-inset ring-white/35 backdrop-blur transition-all duration-200 dark:shadow-[0_14px_34px_rgba(6,4,16,0.16)] dark:ring-iris-100/5',
                'hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(63,51,189,0.032)] active:translate-y-0 active:shadow-[0_6px_14px_rgba(63,51,189,0.018)] motion-reduce:hover:translate-y-0 dark:hover:shadow-[0_18px_40px_rgba(6,4,16,0.22)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]',
                'disabled:cursor-wait disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-sm',
                styles.card
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-md ring-1 transition-all duration-200 group-hover:scale-105 motion-reduce:group-hover:scale-100 max-[430px]:hidden',
                  styles.icon
                )}
              aria-hidden="true"
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={1.85} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2 max-[430px]:flex-wrap max-[430px]:gap-x-1.5 max-[430px]:gap-y-1">
                  <span className="truncate text-[11px] font-bold uppercase leading-4 text-slate-700 max-[430px]:basis-full dark:text-slate-400">
                    {eyebrow}
                  </span>
                  <span
                    className={cn(
                      'hidden h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 max-[430px]:flex',
                      styles.icon
                    )}
                    aria-hidden="true"
                  >
                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.85} />
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
                  'ml-2 flex h-10 w-10 shrink-0 self-center items-center justify-center opacity-75 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 motion-reduce:group-hover:translate-x-0 max-[430px]:ml-1 max-[430px]:h-8 max-[430px]:w-8',
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
      )}
    </div>
  )
}
