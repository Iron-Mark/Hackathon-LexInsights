'use client'

import { useState, useEffect } from 'react'
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
        'Analyze my document for RA 10173 Data Privacy compliance',
        'Check compliance with RA 10121 Disaster Risk Reduction',
        'Review against RA 9003 Waste Management requirements',
        'Verify compliance with Labor Code provisions'
      ]
    : [
        'What are the key requirements for RA 10173 Data Privacy Act?',
        'Help me review my disaster preparedness plan',
        'What permits do I need for construction in Metro Manila?',
        'Explain RA 9003 Solid Waste Management Act'
      ]

  return (
    <div className="w-full max-w-2xl mx-auto px-4 space-y-8 text-center">
      {/* Minimal Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-3"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-2xl sm:text-3xl font-semibold text-slate-900"
        >
          {greeting}, {userName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-sm sm:text-base text-slate-500"
        >
          {mode === 'compliance' 
            ? 'Upload documents for compliance analysis'
            : 'Your AI assistant for Philippine legal compliance'}
        </motion.p>
      </motion.div>

      {/* Show uploaded files in compliance mode */}
      {mode === 'compliance' && uploadedFiles.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <UploadedFilesList />
        </motion.div>
      )}

      {/* Minimal Suggested Prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        {suggestedPrompts.map((prompt, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.05 }}
            whileHover={{ x: 4 }}
            onClick={() => onPromptSelect(prompt)}
            className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 bg-white hover:border-iris-300 hover:bg-slate-50 transition-all text-sm text-slate-700"
          >
            {prompt}
          </motion.button>
        ))}
      </motion.div>
    </div>
  )
}
