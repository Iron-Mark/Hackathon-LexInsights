'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Plus, PanelLeftClose, PanelLeft, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useChatStore } from '@/lib/store/chat-store'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'
import { CHAT_EVENTS, dispatchChatEvent } from '@/lib/chat/events'

interface HeaderTooltipButtonProps {
  label: string
  children: React.ReactNode
}

function HeaderTooltipButton({ label, children }: HeaderTooltipButtonProps) {
  return (
    <div className="group relative">
      {children}
      <div
        className="pointer-events-none absolute right-0 top-full z-50 mt-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 opacity-0 shadow-lg shadow-slate-900/10 transition-all duration-150 ease-out group-hover:translate-y-0.5 group-hover:opacity-100 group-focus-within:translate-y-0.5 group-focus-within:opacity-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-100 dark:shadow-black/30"
        role="tooltip"
      >
        {label}
        <span className="absolute right-3 top-[-5px] h-2.5 w-2.5 rotate-45 border-l border-t border-slate-200 bg-white dark:border-neutral-700 dark:bg-neutral-800" />
      </div>
    </div>
  )
}

export function SidebarHeader() {
  const router = useRouter()
  const { isOpen, toggle, isMobile, close } = useSidebarStore()
  const { createChat } = useChatStore()
  const [isCreating, setIsCreating] = useState(false)

  const handleNewChat = async () => {
    if (isCreating) return
    
    setIsCreating(true)
    
    // Dispatch event to show loading skeleton
    dispatchChatEvent(CHAT_EVENTS.chatCreating)
    
    try {
      // Create new chat with default title
      const newChat = await createChat('New Chat')
      
      // Dispatch event to hide loading skeleton
      dispatchChatEvent(CHAT_EVENTS.chatCreated)
      
      // Navigate to the new chat route
      router.push(`/chat/${newChat.id}`)
      
      // Close sidebar on mobile after creating new chat
      if (isMobile) {
        close()
      }
    } catch (error) {
      console.error('Failed to create new chat:', error)
      // Dispatch event to hide loading skeleton on error
      dispatchChatEvent(CHAT_EVENTS.chatCreated)
      // Show error toast notification
      showToast('Failed to create new chat. Please try again.', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/95">
      {/* App Branding Area */}
      <div
        className="flex min-w-0 items-center gap-2.5"
        aria-label="LexInSight Legal compliance assistant"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm shadow-slate-900/5 ring-1 ring-white dark:border-iris-300/25 dark:bg-white dark:shadow-black/30 dark:ring-iris-300/20">
          <Image
            src="/logo/LOGO-0.5-woBG.svg"
            alt=""
            width={32}
            height={32}
            className="h-7 w-7"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold leading-tight text-slate-950 dark:text-white">
            LexInSight
          </h1>
          <p className="truncate text-[10px] font-semibold leading-tight text-slate-600 dark:text-slate-300">
            Legal compliance assistant
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* New Chat Button */}
        <HeaderTooltipButton label={isCreating ? 'Creating chat...' : 'New chat'}>
          <Button
            onClick={handleNewChat}
            disabled={isCreating}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-600 transition-all duration-150 hover:scale-105 hover:bg-slate-100 hover:text-slate-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:ring-offset-neutral-900"
            aria-label={isCreating ? "Creating new chat..." : "Create new chat"}
          >
            <AnimatePresence mode="wait">
              {isCreating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                >
                  <Loader2 className="h-5 w-5 animate-spin text-iris-600" />
                </motion.div>
              ) : (
                <motion.div
                  key="plus"
                  initial={{ opacity: 0, rotate: -90 }}
                  animate={{ opacity: 1, rotate: 0 }}
                  exit={{ opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.15 }}
                >
                  <Plus className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </HeaderTooltipButton>

        {/* Sidebar Toggle Button */}
        <HeaderTooltipButton label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          <Button
            onClick={toggle}
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:text-slate-300 dark:hover:bg-neutral-800 dark:hover:text-white dark:focus-visible:ring-offset-neutral-900"
            aria-label="Toggle sidebar"
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <PanelLeftClose className="h-5 w-5" />
            ) : (
              <PanelLeft className="h-5 w-5" />
            )}
          </Button>
        </HeaderTooltipButton>
      </div>
    </header>
  )
}
