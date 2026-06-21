'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Menu } from 'lucide-react'

import { AppSidebar } from '@/components/navigation/app-sidebar'
import { ChatContainer } from '@/components/chat/chat-container'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { MobileOverlay } from '@/components/chat/mobile-overlay'
import { LoadingScreen } from '@/components/layout/loading-screen'
import { Button } from '@/components/ui/button'
import { useProtectedRoute } from '@/hooks/use-protected-route'
import { useResponsiveSidebar } from '@/hooks/use-responsive-sidebar'
import { useChatStore } from '@/lib/store/chat-store'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

const initialMessages: Message[] = []

interface ChatPageShellProps {
  chatId?: string
}

export function ChatPageShell({ chatId }: ChatPageShellProps) {
  const router = useRouter()
  const { user, loading, checkingAccess, redirecting } = useProtectedRoute()
  const { isOpen, isMobile, open } = useResponsiveSidebar()
  const { fetchChats } = useChatStore()

  useEffect(() => {
    if (checkingAccess || !user || chatId) {
      return
    }

    fetchChats()
  }, [checkingAccess, user, chatId, fetchChats])

  useEffect(() => {
    if (checkingAccess || !user || !chatId) {
      return
    }

    let cancelled = false

    const loadChat = async () => {
      let latestStore = useChatStore.getState()
      let chat = latestStore.chats.find((item) => item.id === chatId)

      if (!chat) {
        await fetchChats()
      }

      if (cancelled) {
        return
      }

      latestStore = useChatStore.getState()
      chat = latestStore.chats.find((item) => item.id === chatId)

      if (chat) {
        if (latestStore.activeChat?.id !== chatId) {
          latestStore.selectChat(chatId)
        }

        return
      }

      console.warn(`Chat with id ${chatId} not found`)
      router.push('/chat')
    }

    loadChat()

    return () => {
      cancelled = true
    }
  }, [checkingAccess, user, chatId, fetchChats, router])

  if (loading || checkingAccess || redirecting) {
    return <LoadingScreen />
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen">
      {!isMobile && <AppSidebar />}

      <ChatSidebar />
      <MobileOverlay />

      <main
        className={cn(
          'flex flex-1 flex-col bg-slate-50 transition-all duration-300',
          !isMobile && !isOpen && 'ml-16',
          !isMobile && isOpen && 'ml-[344px]'
        )}
      >
        {isMobile && (
          <div className="fixed left-4 top-4 z-20">
            <Button
              onClick={open}
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-white shadow-md transition-all duration-150 hover:bg-slate-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </Button>
          </div>
        )}

        <ChatContainer messages={initialMessages} />
      </main>
    </div>
  )
}
