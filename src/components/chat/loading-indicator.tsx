'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
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
  const shouldReduceMotion = useReducedMotion()
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
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0 }}
      className={cn('flex items-center gap-2 text-slate-600 dark:text-iris-100/75', className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className={cn(sizeClasses[size], !shouldReduceMotion && 'animate-spin', 'text-iris-600 dark:text-iris-200')} aria-hidden="true" />
      <motion.span 
        animate={shouldReduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
        transition={shouldReduceMotion ? undefined : { duration: 1.5, repeat: Infinity }}
        className={textSizeClasses[size]}
      >
        {message}
      </motion.span>
    </motion.div>
  )
}

interface TypingIndicatorProps {
  className?: string
  steps?: string[]
}

const DEFAULT_TYPING_STEPS = [
  'Thinking...',
  'Checking legal context...',
  'Drafting answer...',
]

export function TypingIndicator({ className, steps = DEFAULT_TYPING_STEPS }: TypingIndicatorProps) {
  const shouldReduceMotion = useReducedMotion()
  const [stepIndex, setStepIndex] = useState(0)
  const currentStep = steps[stepIndex] || DEFAULT_TYPING_STEPS[0]

  useEffect(() => {
    if (shouldReduceMotion || steps.length <= 1) {
      return
    }

    const intervalId = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % steps.length)
    }, 1500)

    return () => window.clearInterval(intervalId)
  }, [shouldReduceMotion, steps])

  const dotVariants = {
    initial: { y: 0 },
    animate: { y: -8 }
  }

  return (
    <motion.div 
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.95 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
      transition={shouldReduceMotion ? undefined : { duration: 0.2 }}
      className={cn(
        'flex w-fit items-center gap-3 rounded-xl border-2 border-iris-200 bg-gradient-to-r from-iris-50 to-purple-50 px-5 py-4 shadow-sm',
        'dark:border-iris-300/18 dark:bg-[linear-gradient(135deg,rgba(63,51,189,0.16),rgba(36,31,50,0.92)_52%,rgba(24,18,39,0.96))] dark:from-transparent dark:to-transparent dark:text-iris-100/80 dark:shadow-[0_16px_42px_rgba(9,6,22,0.34)]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={currentStep}
    >
      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            variants={dotVariants}
            initial="initial"
            animate={shouldReduceMotion ? 'initial' : 'animate'}
            transition={shouldReduceMotion ? undefined : {
              duration: 0.5,
              repeat: Infinity,
              repeatType: "reverse",
              delay: index * 0.15
            }}
            className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-iris-500 to-purple-500 shadow-sm dark:from-iris-300 dark:to-violet-300 dark:shadow-[0_0_12px_rgba(158,151,227,0.32)]"
          />
        ))}
      </div>
      
      {/* Text with animation */}
      <motion.span 
        animate={shouldReduceMotion ? undefined : { opacity: [0.5, 1, 0.5] }}
        transition={shouldReduceMotion ? undefined : { duration: 1.5, repeat: Infinity }}
        className="text-sm font-medium text-iris-700 dark:text-iris-100/82"
      >
        {currentStep}
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
  const shouldReduceMotion = useReducedMotion()
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
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, y: -10 }}
      transition={shouldReduceMotion ? undefined : { duration: 0.3 }}
      className={cn(
        'flex w-full max-w-md flex-col gap-3 rounded-xl border-2 bg-gradient-to-r px-5 py-4 shadow-md',
        current.bgColor,
        current.borderColor,
        'dark:border-iris-300/20 dark:from-transparent dark:to-transparent dark:bg-[linear-gradient(135deg,rgba(124,115,217,0.14),rgba(36,31,50,0.92)_52%,rgba(24,18,39,0.96))] dark:text-iris-100/80 dark:shadow-[0_16px_42px_rgba(9,6,22,0.34)]',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={current.text}
    >
      {/* Header with icon and text */}
      <div className="flex items-center gap-3">
        <motion.span 
          animate={shouldReduceMotion ? undefined : { scale: [1, 1.2, 1] }}
          transition={shouldReduceMotion ? undefined : { duration: 1, repeat: Infinity }}
          className="text-2xl"
        >
          {current.icon}
        </motion.span>
        <span className="text-sm font-semibold text-slate-700 dark:text-iris-100/86">{current.text}</span>
      </div>

      {/* Progress bar */}
      {progress !== undefined && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/50 dark:bg-iris-950/45">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: "easeOut" }}
            className={cn('h-full rounded-full bg-gradient-to-r', current.color, 'dark:from-iris-300 dark:to-violet-200')}
          />
        </div>
      )}

      {/* Animated wave effect */}
      <div className="flex justify-center gap-1">
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            animate={shouldReduceMotion ? undefined : {
              height: ['4px', '16px', '4px']
            }}
            transition={shouldReduceMotion ? undefined : {
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.1
            }}
            className={cn('w-1 rounded-full bg-gradient-to-t', shouldReduceMotion && 'h-2.5', current.color, 'dark:from-iris-300 dark:to-violet-200')}
          />
        ))}
      </div>
    </motion.div>
  )
}
