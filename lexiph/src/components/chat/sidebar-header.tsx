'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, PanelLeftClose, PanelLeft, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useChatStore } from '@/lib/store/chat-store'
import { Button } from '@/components/ui/button'
import { showToast } from '@/components/ui/toast'

export function SidebarHeader() {
  const router = useRouter()
  const { isOpen, toggle, isMobile, close } = useSidebarStore()
  const { createChat } = useChatStore()
  const [isCreating, setIsCreating] = useState(false)

  const handleNewChat = async () => {
    if (isCreating) return
    
    setIsCreating(true)
    
    // Dispatch event to show loading skeleton
    window.dispatchEvent(new CustomEvent('chat-creating'))
    
    try {
      // Create new chat with default title
      const newChat = await createChat('New Chat')
      
      // Dispatch event to hide loading skeleton
      window.dispatchEvent(new CustomEvent('chat-created'))
      
      // Navigate to the new chat route
      router.push(`/chat/${newChat.id}`)
      
      // Close sidebar on mobile after creating new chat
      if (isMobile) {
        close()
      }
    } catch (error) {
      console.error('Failed to create new chat:', error)
      // Dispatch event to hide loading skeleton on error
      window.dispatchEvent(new CustomEvent('chat-created'))
      // Show error toast notification
      showToast('Failed to create new chat. Please try again.', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
      {/* App Branding Area */}
      <div className="flex items-center gap-2">
        <h1 className="font-display text-lg font-semibold text-neutral-900 truncate tracking-tight">LexInsight</h1>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* New Chat Button */}
        <Button
          onClick={handleNewChat}
          disabled={isCreating}
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
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

        {/* Sidebar Toggle Button */}
        <Button
          onClick={toggle}
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 transition-colors duration-150"
          aria-label="Toggle sidebar"
          aria-expanded={isOpen}
        >
          {isOpen ? (
            <PanelLeftClose className="h-5 w-5" />
          ) : (
            <PanelLeft className="h-5 w-5" />
          )}
        </Button>
      </div>
    </header>
  )
}
