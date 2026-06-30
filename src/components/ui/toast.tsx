'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastType = 'success' | 'error' | 'info'

interface ToastAction {
  label: string
  href: string
}

interface Toast {
  id: string
  message: string
  type: ToastType
  action?: ToastAction
  durationMs?: number
}

let toastId = 0
const toastListeners: ((toast: Toast) => void)[] = []

export function showToast(
  message: string,
  type: ToastType = 'info',
  options: { action?: ToastAction; durationMs?: number } = {}
) {
  const toast: Toast = {
    id: `toast-${toastId++}`,
    message,
    type,
    action: options.action,
    durationMs: options.durationMs,
  }
  toastListeners.forEach(listener => listener(toast))
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts(prev => [...prev, toast])
      
      // Auto remove after the requested duration, defaulting to 3 seconds.
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== toast.id))
      }, toast.durationMs ?? 3000)
    }

    toastListeners.push(listener)

    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div className="pointer-events-none fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+4.75rem)] z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 md:left-auto md:top-4">
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: (id: string) => void
}

const toastIcons = {
  success: CheckCircle,
  error: XCircle,
  info: AlertCircle,
} satisfies Record<ToastType, typeof CheckCircle>

const toastSurfaces = {
  success: 'border-emerald-300/70 bg-iris-50/95 ring-emerald-500/10 dark:border-emerald-300/25 dark:bg-[#211936]/95 dark:ring-emerald-300/12',
  error: 'border-rose-300/70 bg-iris-50/95 ring-rose-500/10 dark:border-rose-300/25 dark:bg-[#211936]/95 dark:ring-rose-300/12',
  info: 'border-iris-300/80 bg-iris-50/95 ring-iris-500/12 dark:border-iris-300/25 dark:bg-[#211936]/95 dark:ring-iris-300/12',
} satisfies Record<ToastType, string>

const toastAccents = {
  success: 'bg-emerald-500 dark:bg-emerald-300',
  error: 'bg-rose-500 dark:bg-rose-300',
  info: 'bg-iris-500 dark:bg-iris-300',
} satisfies Record<ToastType, string>

const toastIconSurfaces = {
  success: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:bg-emerald-300/12 dark:text-emerald-200 dark:ring-emerald-300/25',
  error: 'bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:bg-rose-300/12 dark:text-rose-200 dark:ring-rose-300/25',
  info: 'bg-iris-500/12 text-iris-700 ring-iris-500/25 dark:bg-iris-300/12 dark:text-iris-100 dark:ring-iris-300/25',
} satisfies Record<ToastType, string>

const toastActionColors = {
  success: 'text-emerald-700 hover:text-emerald-800 dark:text-emerald-200 dark:hover:text-emerald-100',
  error: 'text-rose-700 hover:text-rose-800 dark:text-rose-200 dark:hover:text-rose-100',
  info: 'text-iris-700 hover:text-iris-900 dark:text-iris-200 dark:hover:text-iris-100',
} satisfies Record<ToastType, string>

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const Icon = toastIcons[toast.type]

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'pointer-events-auto relative flex min-w-[min(22rem,calc(100vw-2rem))] max-w-md items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 text-slate-950 shadow-[0_18px_45px_rgba(39,32,117,0.18)] ring-1 backdrop-blur-xl',
        'dark:text-iris-50 dark:shadow-[0_18px_45px_rgba(8,5,18,0.58)]',
        toastSurfaces[toast.type]
      )}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <span
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,115,217,0.20),transparent_45%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(124,115,217,0.24),transparent_48%)]"
        aria-hidden="true"
      />
      <span className={cn('absolute inset-y-2 left-0 w-1 rounded-r-full', toastAccents[toast.type])} aria-hidden="true" />
      <span className={cn('relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1', toastIconSurfaces[toast.type])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="relative z-10 flex flex-1 flex-col gap-2">
        <p className="text-sm font-semibold leading-5 text-slate-950 dark:text-iris-50">{toast.message}</p>
        {toast.action && (
          <a
            href={toast.action.href}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'w-fit rounded text-sm font-semibold underline underline-offset-4 transition-colors hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 focus-visible:ring-offset-iris-50 dark:focus-visible:ring-offset-[#211936]',
              toastActionColors[toast.type]
            )}
          >
            {toast.action.label}
          </a>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="relative z-10 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-iris-700/70 transition-colors hover:bg-iris-500/10 hover:text-iris-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 dark:text-iris-100/65 dark:hover:bg-iris-300/12 dark:hover:text-iris-50"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.div>
  )
}
