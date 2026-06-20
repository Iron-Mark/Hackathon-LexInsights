'use client'

import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface LoadingIndicatorProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingIndicator({ 
  message = 'Processing...', 
  size = 'md',
  className 
}: LoadingIndicatorProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('flex items-center gap-2 text-slate-600', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn(sizeClasses[size], 'animate-spin text-iris-600')} aria-hidden="true" />
      <motion.span 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className={textSizeClasses[size]}
      >
        {message}
      </motion.span>
    </motion.div>
  )
}

interface TypingIndicatorProps {
  className?: string
}

export function TypingIndicator({ className }: TypingIndicatorProps) {
  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-iris-50 to-purple-50 rounded-xl border-2 border-iris-200 w-fit shadow-sm', className)}
      role="status"
      aria-live="polite"
      aria-label="AI is typing"
    >
      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            variants={dotVariants}
            initial="initial"
            animate="animate"
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: "reverse",
              delay: index * 0.15
            }}
            className="h-2.5 w-2.5 bg-gradient-to-br from-iris-500 to-purple-500 rounded-full shadow-sm"
          />
        ))}
      </div>
      
      {/* Text with animation */}
      <motion.span 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-sm font-medium text-iris-700"
      >
        AI is thinking...
      </motion.span>
    </motion.div>
  )
}

interface EnhancedLoadingProps {
  stage?: 'searching' | 'analyzing' | 'generating'
  progress?: number
  className?: string
}

export function EnhancedLoading({ stage = 'searching', progress, className }: EnhancedLoadingProps) {
  const stageInfo = {
    searching: {
      icon: '🔍',
      text: 'Searching documents...',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200'
    },
    analyzing: {
      icon: '⚡',
      text: 'Analyzing results...',
      color: 'from-amber-500 to-orange-500',
      bgColor: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-200'
    },
    generating: {
      icon: '✨',
      text: 'Generating response...',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'from-purple-50 to-pink-50',
      borderColor: 'border-purple-200'
    }
  }

  const current = stageInfo[stage]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col gap-3 px-5 py-4 bg-gradient-to-r', current.bgColor, 'rounded-xl border-2', current.borderColor, 'w-full max-w-md shadow-md', className)}
      role="status"
      aria-live="polite"
      aria-label={current.text}
    >
      {/* Header with icon and text */}
      <div className="flex items-center gap-3">
        <motion.span 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-2xl"
        >
          {current.icon}
        </motion.span>
        <span className="text-sm font-semibold text-slate-700">{current.text}</span>
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className={cn('h-full bg-gradient-to-r', current.color, 'rounded-full')}
          />
        </div>
      )}

      {/* Animated wave effect */}
      <div className="flex gap-1 justify-center">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              height: ['4px', '16px', '4px']
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1
            }}
            className={cn('w-1 bg-gradient-to-t', current.color, 'rounded-full')}
          />
        ))}
      </div>
    </motion.div>
  )
}
