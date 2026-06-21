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
import { useResponsiveSidebar } from '@/hooks/use-responsive-sidebar'
import { useAuthStore } from '@/lib/store/auth-store'
import { useChatStore } from '@/lib/store/chat-store'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'

const initialMessages: Message[] = []

interface ChatPageShellProps {
  chatId?: string
}

export function ChatPageShell({ chatId }: ChatPageShellProps) {
  const router = useRouter()
  const { user, loading } = useAuthStore()
  const { isOpen, isMobile, open } = useResponsiveSidebar()
  const { fetchChats } = useChatStore()

  useEffect(() => {
    if (loading) {
      return
    }

    void fetchChats()
  }, [loading, user?.id, fetchChats])

  useEffect(() => {
    if (loading || !chatId) {
      return
    }

    let cancelled = false

    const loadChat = async () => {
      await fetchChats()

      if (cancelled) {
        return
      }

      const latestStore = useChatStore.getState()
      const chat = latestStore.chats.find((item) => item.id === chatId)

      if (chat) {
        if (latestStore.activeChat?.id !== chatId) {
          latestStore.selectChat(chatId)
        }

        return
      }

      console.warn(`Chat with id ${chatId} not found`)
      router.push('/chat')
    }

    void loadChat()

    return () => {
      cancelled = true
    }
  }, [loading, user?.id, chatId, fetchChats, router])

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="flex h-screen overflow-hidden supports-[height:100dvh]:h-dvh">
      {!isMobile && <AppSidebar />}

      <ChatSidebar />
      <MobileOverlay />

      <main
        className={cn(
          'flex min-w-0 flex-1 flex-col overflow-hidden bg-slate-50 transition-all duration-300 dark:bg-neutral-900',
          !isMobile && !isOpen && 'ml-16',
          !isMobile && isOpen && 'ml-[344px]'
        )}
      >
        {isMobile && (
          <div className="fixed left-[calc(env(safe-area-inset-left)+1rem)] top-[calc(env(safe-area-inset-top)+1rem)] z-20">
            <Button
              onClick={open}
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-white shadow-md transition-all duration-150 hover:bg-slate-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:focus-visible:ring-offset-neutral-900"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5 text-slate-700 dark:text-slate-200" aria-hidden="true" />
            </Button>
          </div>
        )}

        <ChatContainer messages={initialMessages} />
      </main>
    </div>
  )
}
