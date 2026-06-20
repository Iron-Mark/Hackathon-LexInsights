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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-iris-600" />
            Search Chat History
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-slate-600">
            {filteredChats.length} {filteredChats.length === 1 ? 'conversation' : 'conversations'} found
          </div>

          {/* Chat Results */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredChats.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <MessageSquare className="h-16 w-16 mx-auto mb-3 text-slate-300" />
                <p className="text-lg font-medium">No chats found</p>
                <p className="text-sm mt-1">
                  {searchQuery ? 'Try different keywords' : 'Start a new chat to see it here'}
                </p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatClick(chat.id)}
                  className="p-4 border border-slate-200 rounded-lg hover:border-iris-300 hover:bg-iris-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 group-hover:text-iris-700 mb-1">
                        {chat.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {chat.preview}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
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
