'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '@/lib/store/chat-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { ChatListItem } from './chat-list-item'
import { Loader2, MessageSquarePlus, Plus, Search, X } from 'lucide-react'
import { showToast } from '@/components/ui/toast'

// Loading skeleton for new chat creation
function ChatListSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full rounded-lg border-2 border-iris-200 bg-slate-100 px-3 py-2.5 dark:border-iris-500/40 dark:bg-neutral-800"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-neutral-700" />
        </div>
      </div>
    </motion.div>
  )
}

export function ChatList() {
  const router = useRouter()
  const { chats, activeChat, createChat, selectChat } = useChatStore()
  const { isMobile, close } = useSidebarStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatingChat, setIsCreatingChat] = useState(false)

  // Listen for chat creation events
  useEffect(() => {
    const handleChatCreating = () => setIsCreatingChat(true)
    const handleChatCreated = () => setIsCreatingChat(false)
    
    window.addEventListener('chat-creating', handleChatCreating)
    window.addEventListener('chat-created', handleChatCreated)
    
    return () => {
      window.removeEventListener('chat-creating', handleChatCreating)
      window.removeEventListener('chat-created', handleChatCreated)
    }
  }, [])
  
  const handleSelectChat = (id: string) => {
    // Update active chat in store
    selectChat(id)
    
    // Navigate to chat route
    router.push(`/chat/${id}`)
    
    // Close sidebar on mobile after selection
    if (isMobile) {
      close()
    }
  }

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats
    
    const query = searchQuery.toLowerCase()
    return chats.filter(chat => 
      chat.title.toLowerCase().includes(query) ||
      chat.last_message_preview?.toLowerCase().includes(query)
    )
  }, [chats, searchQuery])

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  const handleNewChat = async () => {
    if (isCreatingChat) return

    setIsCreatingChat(true)
    window.dispatchEvent(new CustomEvent('chat-creating'))

    try {
      const newChat = await createChat('New Chat')
      window.dispatchEvent(new CustomEvent('chat-created'))
      router.push(`/chat/${newChat.id}`)

      if (isMobile) {
        close()
      }
    } catch (error) {
      console.error('Failed to create new chat:', error)
      window.dispatchEvent(new CustomEvent('chat-created'))
      showToast('Failed to create new chat. Please try again.', 'error')
    } finally {
      setIsCreatingChat(false)
    }
  }
  
  // Empty state when no chats exist
  if (chats.length === 0) {
    return (
      <div className="flex flex-1 flex-col px-4 py-5">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-iris-50 text-iris-700 dark:bg-iris-400/15 dark:text-iris-200">
              <MessageSquarePlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 text-left">
              <p className="text-sm font-semibold text-slate-950 dark:text-slate-100">No chats yet</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Your conversations will appear here as soon as you start one.
              </p>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            disabled={isCreatingChat}
            className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-iris-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-iris-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-iris-600 dark:bg-iris-400 dark:text-neutral-900 dark:hover:bg-iris-300 dark:disabled:hover:bg-iris-400"
            type="button"
          >
            {isCreatingChat ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{isCreatingChat ? 'Starting...' : 'New chat'}</span>
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-left dark:border-neutral-700">
          <p className="text-[11px] font-semibold uppercase text-slate-400 dark:text-slate-500">Chat history</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Recent conversations will be listed here for quick return.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="border-b border-slate-200 px-3 py-2 dark:border-neutral-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-iris-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            aria-label="Search chats"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6"
        role="list"
        aria-label="Chat conversations"
      >
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <Search className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No chats found</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Show loading skeleton when creating new chat */}
            <AnimatePresence>
              {isCreatingChat && <ChatListSkeleton />}
            </AnimatePresence>
            
            {/* Existing chats */}
            <AnimatePresence>
              {filteredChats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  isActive={chat.id === activeChat?.id}
                  onClick={() => handleSelectChat(chat.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
