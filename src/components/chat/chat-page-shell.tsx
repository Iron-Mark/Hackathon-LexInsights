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
          'chat-viewport-surface flex min-w-0 flex-1 flex-col overflow-hidden transition-all duration-300',
          !isMobile && !isOpen && 'ml-16',
          !isMobile && isOpen && 'ml-[344px]'
        )}
      >
        {isMobile && (
          <div className="fixed left-[calc(env(safe-area-inset-left)+1rem)] top-[calc(env(safe-area-inset-top)+0.375rem)] z-20 flex items-center gap-2">
            <Button
              onClick={open}
              variant="outline"
              size="icon"
              className="h-11 w-11 border-iris-100 bg-white/90 text-iris-700 shadow-md shadow-iris-950/10 transition-all duration-150 hover:bg-iris-50 hover:text-iris-900 hover:shadow-lg hover:shadow-iris-950/15 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/15 dark:bg-[#1b1728] dark:text-slate-200 dark:hover:bg-iris-300/12 dark:focus-visible:ring-offset-[#171322]"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
            {!isOpen && (
              <div className="rounded-lg border border-iris-100 bg-white/85 px-3 py-1.5 shadow-md shadow-iris-950/10 backdrop-blur dark:border-iris-300/15 dark:bg-[#1b1728]/90 dark:shadow-none">
                <p className="text-sm font-extrabold leading-4 text-slate-950 dark:text-white">LexInsights</p>
                <p className="hidden text-[10px] font-semibold leading-3 text-slate-600 min-[380px]:block dark:text-slate-400">
                  Legal compliance assistant
                </p>
              </div>
            )}
          </div>
        )}

        <ChatContainer messages={initialMessages} />
      </main>
    </div>
  )
}
