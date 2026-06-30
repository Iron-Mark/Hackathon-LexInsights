'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useChatStore } from '@/lib/store/chat-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { ChatListItem } from './chat-list-item'
import { ExternalLink, HeartHandshake, Loader2, MessageSquarePlus, Plus, Search, X } from 'lucide-react'
import { showToast } from '@/components/ui/toast'
import { addChatEventListener, CHAT_EVENTS, dispatchChatEvent } from '@/lib/chat/events'
import type { Chat, Message } from '@/types'

const MIN_SEARCHABLE_CHATS = 4
const MAINTAINER_PORTFOLIO_URL = 'https://www.marksiazon.dev'

function getSearchableChatText(chat: Chat, messages: Message[]) {
  const userMessageText = messages
    .filter((message) => message.role === 'user')
    .map((message) => message.content)
    .join(' ')

  return [
    chat.title,
    chat.last_message_preview,
    userMessageText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// Loading skeleton for new chat creation
function ChatListSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full rounded-lg border-2 border-iris-200 bg-iris-50/80 px-3 py-2.5 shadow-sm shadow-iris-950/5 dark:border-iris-400/30 dark:bg-[#241f32]"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 h-4 w-4 animate-pulse rounded bg-slate-200 dark:bg-iris-300/15" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200 dark:bg-iris-300/15" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-iris-300/15" />
        </div>
      </div>
    </motion.div>
  )
}

function MaintainerCredit() {
  return (
    <div className="shrink-0 border-t border-iris-100/70 bg-white/30 px-4 py-3 dark:border-iris-300/15 dark:bg-[#171322]/35">
      <a
        href={MAINTAINER_PORTFOLIO_URL}
        target="_blank"
        rel="noreferrer"
        className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2 text-xs text-slate-500 transition-colors hover:text-iris-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:text-slate-400 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
        aria-label="Maintained by Mark Siazon, opens portfolio"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-iris-100 bg-white/80 text-iris-700 shadow-sm shadow-iris-950/5 transition-colors group-hover:border-iris-300 group-hover:bg-iris-50 dark:border-iris-300/15 dark:bg-iris-300/10 dark:text-iris-200 dark:group-hover:border-iris-300/35 dark:group-hover:bg-iris-300/15">
          <HeartHandshake className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 leading-5">
          <span className="block text-[10px] font-bold uppercase tracking-normal text-slate-400 dark:text-slate-500">
            Maintained by
          </span>
          <span className="inline-flex min-w-0 items-center font-semibold text-slate-600 underline-offset-4 group-hover:underline dark:text-slate-300">
            <span className="truncate">Mark Siazon</span>
          </span>
        </span>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </a>
    </div>
  )
}

export function ChatList() {
  const router = useRouter()
  const { chats, activeChat, messages, createChat, selectChat } = useChatStore()
  const { isMobile, close } = useSidebarStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreatingChat, setIsCreatingChat] = useState(false)
  const shouldShowSearch = chats.length >= MIN_SEARCHABLE_CHATS

  // Listen for chat creation events
  useEffect(() => {
    const handleChatCreating = () => setIsCreatingChat(true)
    const handleChatCreated = () => setIsCreatingChat(false)

    const removeChatCreatingListener = addChatEventListener(CHAT_EVENTS.chatCreating, handleChatCreating)
    const removeChatCreatedListener = addChatEventListener(CHAT_EVENTS.chatCreated, handleChatCreated)

    return () => {
      removeChatCreatingListener()
      removeChatCreatedListener()
    }
  }, [])

  useEffect(() => {
    if (!shouldShowSearch && searchQuery) {
      setSearchQuery('')
    }
  }, [searchQuery, shouldShowSearch])
  
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
    if (!shouldShowSearch || !searchQuery.trim()) return chats
    
    const query = searchQuery.trim().toLowerCase()
    return chats.filter((chat) =>
      getSearchableChatText(chat, messages[chat.id] || []).includes(query)
    )
  }, [chats, messages, searchQuery, shouldShowSearch])

  const handleClearSearch = () => {
    setSearchQuery('')
  }

  const handleNewChat = async () => {
    if (isCreatingChat) return

    setIsCreatingChat(true)
    dispatchChatEvent(CHAT_EVENTS.chatCreating)

    try {
      const newChat = await createChat('New Chat')
      dispatchChatEvent(CHAT_EVENTS.chatCreated)
      router.push(`/chat/${newChat.id}`)

      if (isMobile) {
        close()
      }
    } catch (error) {
      console.error('Failed to create new chat:', error)
      dispatchChatEvent(CHAT_EVENTS.chatCreated)
      showToast('Failed to create new chat. Please try again.', 'error')
    } finally {
      setIsCreatingChat(false)
    }
  }
  
  // Empty state when no chats exist
  if (chats.length === 0) {
    return (
      <div className="flex flex-1 flex-col px-4 py-5">
        <div className="rounded-lg border border-iris-100 bg-white/90 p-4 shadow-sm shadow-iris-950/5 dark:border-iris-300/15 dark:bg-[#241f32] dark:shadow-none">
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
            className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-iris-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-iris-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-iris-600 dark:bg-iris-400 dark:text-[#171322] dark:hover:bg-iris-300 dark:disabled:hover:bg-iris-400"
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

        <div className="mt-4 rounded-lg border border-dashed border-iris-200/80 bg-white/35 px-4 py-3 text-left dark:border-iris-300/15 dark:bg-[#171322]/40">
          <p className="text-[11px] font-semibold uppercase text-iris-700/65 dark:text-slate-500">Chat history</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Recent conversations will be listed here for quick return.
          </p>
        </div>

        <div className="mt-auto pt-4">
          <MaintainerCredit />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search Bar */}
      {shouldShowSearch && (
        <div className="border-b border-iris-100/80 bg-white/35 px-3 py-2 dark:border-iris-300/15 dark:bg-transparent">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-iris-500/70 dark:text-slate-500" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="min-h-11 w-full rounded-lg border border-iris-100 bg-white/90 py-2 pl-9 pr-12 text-sm text-slate-900 shadow-sm shadow-iris-950/5 transition-all placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-iris-500 dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-none dark:placeholder:text-slate-500"
              aria-label="Search chats"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-1 dark:text-slate-500 dark:hover:bg-iris-400/10 dark:hover:text-iris-200 dark:focus-visible:ring-offset-[#241f32]"
                aria-label="Clear search"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat List */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-5"
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

      <MaintainerCredit />
    </div>
  )
}
