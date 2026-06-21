'use client'

import { useState, useEffect } from 'react'
import { Chat } from '@/types'
import { MessageSquare, Trash2, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useChatStore } from '@/lib/store/chat-store'
import { useRouter } from 'next/navigation'
import { showToast } from '@/components/ui/toast'

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

  // Auto-hide delete confirmation after 3 seconds
  useEffect(() => {
    if (showDeleteConfirm) {
      const timer = setTimeout(() => {
        setShowDeleteConfirm(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showDeleteConfirm])

  // Format timestamp to relative time
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInDays < 7) {
      return `${diffInDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setIsDeleting(true)
    
    try {
      await deleteChat(chat.id)
      
      // Show success toast
      showToast('Chat deleted successfully', 'success')
      
      // If this was the active chat, navigate to home or first chat
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
    setShowDeleteConfirm(false)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="relative group"
    >
      <div
        onClick={onClick}
        className={cn(
          'w-full rounded-lg px-3 py-2.5 text-left transition-all duration-150 cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50',
          isActive 
            ? 'bg-slate-100 text-slate-900 hover:bg-slate-200 shadow-sm' 
            : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
          isDeleting && 'opacity-50 cursor-not-allowed pointer-events-none'
        )}
        aria-current={isActive ? 'page' : undefined}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
      >
        <div className="flex items-start gap-3">
          <MessageSquare 
            className={cn(
              'mt-0.5 h-4 w-4 flex-shrink-0 transition-colors duration-150',
              isActive ? 'text-slate-600' : 'text-slate-400'
            )} 
          />
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'font-body truncate text-sm font-semibold leading-snug',
                isActive ? 'text-neutral-900' : 'text-neutral-800'
              )}
              title={chat.title}
            >
              {chat.title}
            </p>
            <p className={cn(
              'mt-1 font-body text-xs font-medium transition-colors duration-150',
              isActive ? 'text-neutral-600' : 'text-neutral-500'
            )}>
              {formatTimestamp(chat.updated_at)}
            </p>
          </div>

          {/* Delete Button - Shows on hover or when confirm is active */}
          <AnimatePresence>
            {!isDeleting && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  "transition-opacity duration-150",
                  showDeleteConfirm ? "opacity-100" : "opacity-0 group-hover:opacity-100 md:group-hover:opacity-100"
                )}
              >
                {showDeleteConfirm ? (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={handleDelete}
                      className="rounded p-1 bg-red-500 text-white hover:bg-red-600 transition-colors"
                      aria-label="Confirm delete"
                      title="Confirm delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={handleCancelDelete}
                      className="rounded p-1 bg-slate-300 text-slate-700 hover:bg-slate-400 transition-colors"
                      aria-label="Cancel delete"
                      title="Cancel"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    aria-label={`Delete ${chat.title}`}
                    title="Delete chat"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
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
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}
