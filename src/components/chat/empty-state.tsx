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

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good morning')
    else if (hour < 18) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  const userName = user?.full_name?.split(' ')[0] || 'there'

  const suggestedPrompts = mode === 'compliance'
    ? [
        { prompt: 'Analyze my document for RA 10173 Data Privacy compliance', icon: ShieldCheck },
        { prompt: 'Check compliance with RA 10121 Disaster Risk Reduction', icon: FileSearch },
        { prompt: 'Review against RA 9003 Waste Management requirements', icon: Recycle },
        { prompt: 'Verify compliance with Labor Code provisions', icon: Building2 },
      ]
    : [
        { prompt: 'What are the key requirements for RA 10173 Data Privacy Act?', icon: ShieldCheck },
        { prompt: 'Help me review my disaster preparedness plan', icon: FileSearch },
        { prompt: 'What permits do I need for construction in Metro Manila?', icon: Building2 },
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
          className="text-3xl font-bold leading-tight text-slate-950 sm:text-4xl"
        >
          {greeting}, {userName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-md text-sm leading-6 text-slate-500 sm:text-base"
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
            className="text-xs text-slate-500"
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
            className={`group flex min-h-12 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-5 transition-all hover:-translate-y-0.5 hover:border-iris-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 ${
              index === 0
                ? 'border-iris-200 bg-iris-50/70 text-slate-900 shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 shadow-xs'
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                index === 0
                  ? 'bg-white text-iris-700 shadow-xs'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-iris-50 group-hover:text-iris-700'
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
