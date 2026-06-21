'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '@/lib/store/chat-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { ChatListItem } from './chat-list-item'
import { MessageSquare, Search, X } from 'lucide-react'

// Loading skeleton for new chat creation
function ChatListSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full rounded-lg px-3 py-2.5 bg-slate-100 border-2 border-iris-200"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-4 w-4 rounded bg-slate-200 animate-pulse" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
        </div>
      </div>
    </motion.div>
  )
}

export function ChatList() {
  const router = useRouter()
  const { chats, activeChat, selectChat } = useChatStore()
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
  
  // Empty state when no chats exist
  if (chats.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <MessageSquare className="mb-4 h-12 w-12 text-slate-300" />
        <p className="text-sm font-medium text-slate-600">No chats yet</p>
        <p className="mt-2 text-xs text-slate-500 leading-relaxed">
          Start a new conversation to get started
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar */}
      <div className="px-3 py-2 border-b border-slate-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-iris-500 focus:border-transparent transition-all"
            aria-label="Search chats"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
            <Search className="mb-3 h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">No chats found</p>
            <p className="mt-1 text-xs text-slate-500">
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
