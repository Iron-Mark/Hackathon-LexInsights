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
    <div className="group relative z-40">
      {children}
      <div
        className="pointer-events-none absolute right-0 top-full z-[70] mt-2 whitespace-nowrap rounded-lg border border-iris-100 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 opacity-0 shadow-xl shadow-iris-950/10 backdrop-blur transition-all duration-150 ease-out group-hover:translate-y-0.5 group-hover:opacity-100 group-focus-within:translate-y-0.5 group-focus-within:opacity-100 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-iris-950/40"
        role="tooltip"
      >
        {label}
        <span className="absolute right-3 top-[-5px] h-2.5 w-2.5 rotate-45 border-l border-t border-iris-100 bg-white dark:border-iris-300/15 dark:bg-[#241f32]" />
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
    <header className="relative z-40 flex overflow-visible items-center justify-between border-b border-iris-100/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96)_0%,rgba(244,243,255,0.9)_100%)] px-4 py-3 shadow-[inset_0_-1px_0_rgba(39,32,117,0.04)] backdrop-blur dark:border-iris-300/15 dark:bg-[linear-gradient(135deg,#211a35_0%,#1a1625_48%,#171322_100%)] dark:shadow-[inset_0_-1px_0_rgba(158,151,227,0.10)]">
      {/* App Branding Area */}
      <div
        className="flex min-w-0 items-center gap-2.5"
        aria-label="LexInsights Legal compliance assistant"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-iris-100 bg-white/85 p-1 shadow-sm shadow-iris-950/10 ring-1 ring-white transition-colors duration-200 dark:border-iris-300/15 dark:bg-iris-300/10 dark:shadow-[0_0_18px_rgba(63,51,189,0.16)] dark:ring-iris-100/10">
          <Image
            src="/logo/LOGO-0.5-woBG.svg"
            alt=""
            width={32}
            height={32}
            className="h-7 w-7 drop-shadow-[0_0_8px_rgba(99,102,241,0.32)]"
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-base font-extrabold leading-tight text-slate-950 dark:text-white">
            LexInsights
          </h1>
          <p className="truncate text-[10px] font-semibold leading-tight text-slate-600 dark:text-iris-100/70">
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
            className="h-9 w-9 text-iris-700 transition-all duration-150 hover:scale-105 hover:bg-iris-100/70 hover:text-iris-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-iris-100/75 dark:hover:bg-iris-300/12 dark:hover:text-white dark:focus-visible:ring-offset-[#171322]"
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
            className="h-9 w-9 text-iris-700 transition-all duration-150 hover:bg-iris-100/70 hover:text-iris-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:text-iris-100/75 dark:hover:bg-iris-300/12 dark:hover:text-white dark:focus-visible:ring-offset-[#171322]"
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
