'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Chat } from '@/types'
import { MessageSquare, Trash2, Loader2, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/lib/store/chat-store'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/ui/toast'
import { formatRelativeTime } from '@/lib/utils/browser-actions'

interface ChatListItemProps {
  chat: Chat
  isActive: boolean
  onClick: () => void
}

export function ChatListItem({ chat, isActive, onClick }: ChatListItemProps) {
  const router = useRouter()
  const { deleteChat, chats } = useChatStore()
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const deleteConfirmCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearDeleteConfirmCloseTimer = useCallback(() => {
    if (deleteConfirmCloseTimerRef.current) {
      clearTimeout(deleteConfirmCloseTimerRef.current)
      deleteConfirmCloseTimerRef.current = null
    }
  }, [])

  const scheduleDeleteConfirmClose = useCallback(() => {
    if (!showDeleteConfirm || isDeleting) {
      return
    }

    clearDeleteConfirmCloseTimer()
    deleteConfirmCloseTimerRef.current = setTimeout(() => {
      setShowDeleteConfirm(false)
      deleteConfirmCloseTimerRef.current = null
    }, 1500)
  }, [clearDeleteConfirmCloseTimer, isDeleting, showDeleteConfirm])

  useEffect(() => clearDeleteConfirmCloseTimer, [clearDeleteConfirmCloseTimer])

  const handleStartDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearDeleteConfirmCloseTimer()
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation()
    clearDeleteConfirmCloseTimer()
    setIsDeleting(true)

    try {
      await deleteChat(chat.id)
      showToast('Chat deleted successfully', 'success')

      if (isActive) {
        const remainingChats = chats.filter(c => c.id !== chat.id)
        if (remainingChats.length > 0) {
          router.push(`/chat/${remainingChats[0].id}`)
        } else {
          router.push('/chat')
        }
      }
    } catch (error) {
      console.error('Failed to delete chat:', error)
      showToast('Failed to delete chat. Please try again.', 'error')
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    clearDeleteConfirmCloseTimer()
    setShowDeleteConfirm(false)
  }

  const handleRowClick = () => {
    if (showDeleteConfirm) {
      void handleConfirmDelete()
      return
    }

    onClick()
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="relative group"
      onMouseEnter={clearDeleteConfirmCloseTimer}
      onMouseLeave={scheduleDeleteConfirmClose}
    >
      <div
        className={cn(
          'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150',
          showDeleteConfirm
            ? 'bg-red-50 text-red-800 shadow-sm ring-1 ring-red-200 hover:bg-red-100 dark:bg-red-950/35 dark:text-red-100 dark:ring-red-500/30 dark:hover:bg-red-950/50'
            : isActive
            ? 'bg-[#EFECFF] text-slate-950 shadow-sm shadow-iris-950/8 ring-1 ring-[#8A82DC] hover:bg-iris-100 dark:bg-[#2b2438] dark:text-slate-100 dark:ring-1 dark:ring-iris-300/12 dark:hover:bg-[#312944]'
            : 'text-slate-800 hover:bg-[#EFECFF] hover:text-slate-950 hover:shadow-sm hover:shadow-iris-950/8 dark:text-slate-300 dark:hover:bg-[#241f32] dark:hover:text-white',
          isDeleting && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
      >
        <div className="flex items-start gap-3">
          <button
            onClick={handleRowClick}
            className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-md text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F2FF] dark:focus-visible:ring-offset-[#171322]"
            aria-current={!showDeleteConfirm && isActive ? 'page' : undefined}
            aria-label={showDeleteConfirm ? `Confirm delete ${chat.title}` : `Open ${chat.title}`}
            type="button"
            onKeyDown={(e) => {
              if (e.key === 'Escape' && showDeleteConfirm) {
                e.preventDefault()
                setShowDeleteConfirm(false)
              }
            }}
          >
            <span
              className={cn(
                'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
                showDeleteConfirm
                  ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200'
                  : isActive
                    ? 'bg-[#FBFAFF] text-iris-800 shadow-xs ring-1 ring-[#8A82DC] dark:bg-iris-400/20 dark:text-iris-100 dark:ring-iris-300/30'
                    : 'bg-[#EFECFF] text-iris-800 dark:bg-iris-300/10 dark:text-iris-200/50'
              )}
              aria-hidden="true"
            >
              {showDeleteConfirm ? (
                <Trash2 className="h-4 w-4" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'font-body block truncate text-sm font-semibold leading-snug',
                  showDeleteConfirm
                    ? 'text-red-800 dark:text-red-100'
                    : isActive
                      ? 'text-neutral-900 dark:text-slate-100'
                      : 'text-neutral-800 dark:text-slate-200'
                )}
                title={chat.title}
              >
                {showDeleteConfirm ? `Delete ${chat.title}` : chat.title}
              </span>
              <span
                className={cn(
                  'mt-1 block font-body text-xs font-medium transition-colors duration-150',
                  showDeleteConfirm
                    ? 'text-red-600 dark:text-red-200/80'
                    : isActive
                      ? 'text-neutral-700 dark:text-slate-400'
                      : 'text-neutral-700 dark:text-slate-500'
                )}
              >
                {showDeleteConfirm ? "Tap here to confirm" : formatRelativeTime(chat.updated_at)}
              </span>
            </span>
          </button>

          <AnimatePresence>
            {!isDeleting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  'transition-opacity duration-150',
                  showDeleteConfirm ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'
                )}
              >
                {showDeleteConfirm ? (
                  <div className="flex" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={handleCancelDelete}
                      className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg bg-[#FBFAFF] text-red-700 shadow-xs ring-1 ring-red-400 transition-all hover:bg-red-100 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:bg-[#1a1625]/90 dark:text-red-100 dark:ring-red-400/40 dark:hover:bg-red-950/70 dark:focus-visible:ring-offset-[#241f32]"
                      aria-label="Cancel delete"
                      title="Cancel"
                      type="button"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleStartDelete}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg text-slate-700 transition-all hover:bg-red-50 hover:text-red-700 active:scale-[0.95] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:text-slate-500 dark:hover:bg-red-950/50 dark:hover:text-red-300 dark:focus-visible:ring-offset-[#241f32]"
                    aria-label={`Delete ${chat.title}`}
                    title="Delete chat"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </motion.div>
            )}
            {isDeleting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center"
              >
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
