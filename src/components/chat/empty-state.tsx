'use client'

import { useState, useEffect } from 'react'
import { Building2, FileSearch, Recycle, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/store/auth-store'
import { useChatModeStore } from '@/lib/store/chat-mode-store'
import { useFileUploadStore } from '@/lib/store/file-upload-store'
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
        { prompt: 'Analyze my document for RA 10173 Data Privacy compliance', icon: ShieldCheck },
        { prompt: 'Check an AML policy against RA 9160 controls', icon: FileSearch },
        { prompt: 'Review online incident response under RA 10175', icon: Recycle },
        { prompt: 'Assess child online safety reporting under RA 9775', icon: Building2 },
      ]
    : [
        { prompt: 'Compare RA 10173 and RA 10175 for incident response', icon: ShieldCheck },
        { prompt: 'What AML controls apply under RA 9160?', icon: FileSearch },
        { prompt: 'What does RA 9775 require for online child safety reporting?', icon: Building2 },
        { prompt: 'Explain RA 9003 Solid Waste Management Act', icon: Recycle },
      ]

  return (
    <div className="mx-auto w-full max-w-3xl px-4 text-center">
      {/* Minimal Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-2xl space-y-3"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl dark:text-slate-100"
        >
          {greeting}, {userName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-md text-sm leading-6 text-slate-500 sm:text-base dark:text-slate-400"
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

      {/* Minimal Suggested Prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-9 grid gap-2.5"
      >
        {suggestedPrompts.map(({ prompt, icon: Icon }, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.05 }}
            whileHover={{ x: 4 }}
            onClick={() => onPromptSelect(prompt)}
            disabled={!isHydrated}
            className={`group flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-5 transition-all hover:-translate-y-0.5 hover:border-iris-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:shadow-none dark:focus-visible:ring-offset-neutral-900 ${
              index === 0
                ? 'border-iris-200 bg-iris-50/70 text-slate-900 shadow-sm dark:border-iris-400/40 dark:bg-iris-400/10 dark:text-slate-100'
                : 'border-slate-200 bg-white text-slate-700 shadow-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-300 dark:hover:border-iris-400/50'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                index === 0
                  ? 'bg-white text-iris-700 shadow-xs dark:bg-neutral-900 dark:text-iris-200'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-iris-50 group-hover:text-iris-700 dark:bg-neutral-700 dark:text-slate-400 dark:group-hover:bg-iris-400/15 dark:group-hover:text-iris-200'
              }`}
              aria-hidden="true"
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="font-medium">{prompt}</span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
