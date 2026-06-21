'use client'

import { useState, useEffect } from 'react'
import { Search, X, MessageSquare, Calendar } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useChatStore } from '@/lib/store/chat-store'
import { useRouter } from 'next/navigation'

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface ChatResult {
  id: string
  title: string
  preview: string
  date: string
  messageCount: number
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredChats, setFilteredChats] = useState<ChatResult[]>([])
  const { chats } = useChatStore()
  const router = useRouter()

  // Load and filter chats
  useEffect(() => {
    if (!searchQuery.trim()) {
      // Show all recent chats when no search query
      const recentChats = chats.slice(0, 10).map(chat => ({
        id: chat.id,
        title: chat.title,
        preview: chat.last_message_preview || 'No messages yet',
        date: new Date(chat.updated_at).toLocaleDateString(),
        messageCount: chat.message_count || 0
      }))
      setFilteredChats(recentChats)
    } else {
      // Filter chats by search query
      const query = searchQuery.toLowerCase()
      const filtered = chats
        .filter(chat => 
          chat.title.toLowerCase().includes(query) ||
          (chat.last_message_preview && chat.last_message_preview.toLowerCase().includes(query))
        )
        .slice(0, 20)
        .map(chat => ({
          id: chat.id,
          title: chat.title,
          preview: chat.last_message_preview || 'No messages yet',
          date: new Date(chat.updated_at).toLocaleDateString(),
          messageCount: chat.message_count || 0
        }))
      setFilteredChats(filtered)
    }
  }, [searchQuery, chats])

  const handleChatClick = (chatId: string) => {
    router.push(`/chat/${chatId}`)
    onOpenChange(false)
  }

  const handleClear = () => {
    setSearchQuery('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-4xl flex-col overflow-hidden dark:border-neutral-700 dark:bg-neutral-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
            <Search className="h-5 w-5 text-iris-600 dark:text-iris-200" />
            Search Chat History
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 flex-col space-y-4 overflow-hidden">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your conversations..."
              className="pl-10 pr-10"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                aria-label="Clear search"
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {filteredChats.length} {filteredChats.length === 1 ? 'conversation' : 'conversations'} found
          </div>

          {/* Chat Results */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {filteredChats.length === 0 ? (
              <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                <MessageSquare className="mx-auto mb-3 h-16 w-16 text-slate-300 dark:text-slate-600" />
                <p className="text-lg font-medium text-slate-700 dark:text-slate-200">No chats found</p>
                <p className="mt-1 text-sm">
                  {searchQuery ? 'Try different keywords' : 'Start a new chat to see it here'}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className="group cursor-pointer rounded-lg border border-slate-200 p-4 transition-colors hover:border-iris-300 hover:bg-iris-50/50 dark:border-neutral-700 dark:hover:border-iris-400/50 dark:hover:bg-iris-400/10"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-400 dark:text-slate-500" />
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 font-semibold text-slate-950 group-hover:text-iris-700 dark:text-slate-100 dark:group-hover:text-iris-200">
                        {chat.title}
                      </h3>
                      <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-300">
                        {chat.preview}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {chat.date}
                        </div>
                        {chat.messageCount > 0 && (
                          <span>{chat.messageCount} messages</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
