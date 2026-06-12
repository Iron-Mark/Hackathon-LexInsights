'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useChatStore } from '@/lib/store/chat-store'
import { createClient } from '@/lib/supabase/client'
import { ChatContainer } from '@/components/chat/chat-container'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { MobileOverlay } from '@/components/chat/mobile-overlay'
import { AppSidebar } from '@/components/navigation/app-sidebar'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Message } from '@/types'

// Mock messages for MVP demonstration
const mockMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Hello! I\'m LexInsight, your Philippine legal compliance assistant. How can I help you today?',
    created_at: new Date().toISOString(),
  },
]

export default function ChatDetailPage() {
  const router = useRouter()
  const params = useParams()
  const chatId = params.chatId as string
  
  const { user, loading } = useAuthStore()
  const { isOpen, isMobile, open, close, setIsMobile } = useSidebarStore()
  const { fetchChats } = useChatStore()
  const [checkingVerification, setCheckingVerification] = useState(true)

  // Responsive breakpoint detection
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
    }

    // Set initial value
    handleResize()

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => window.removeEventListener('resize', handleResize)
  }, [setIsMobile])

  // Escape key handler to close sidebar on mobile
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobile && isOpen) {
        close()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMobile, isOpen, close])

  // Check authentication and email verification
  useEffect(() => {
    const checkAuth = async () => {
      if (!loading && !user) {
        router.push('/auth/login')
        return
      }

      if (user) {
        // Check if email is verified
        const supabase = createClient()
        const { data } = await supabase.auth.getUser()
        
        if (data.user && !data.user.email_confirmed_at) {
          // Email not verified, redirect to verification page
          router.push(`/auth/verify-email?email=${encodeURIComponent(user.email)}`)
        } else {
          setCheckingVerification(false)
        }
      }
    }

    checkAuth()
  }, [user, loading, router])

  // Load chat from URL parameter, including direct page refreshes.
  useEffect(() => {
    if (checkingVerification || !user || !chatId) return

    let cancelled = false

    const loadChat = async () => {
      let latestStore = useChatStore.getState()
      let chat = latestStore.chats.find(c => c.id === chatId)

      if (!chat) {
        await fetchChats()
      }

      if (cancelled) return

      latestStore = useChatStore.getState()
      chat = latestStore.chats.find(c => c.id === chatId)

      if (chat) {
        // Select the chat if it's not already active
        if (latestStore.activeChat?.id !== chatId) {
          latestStore.selectChat(chatId)
        }
      } else {
        // Chat not found, redirect to main chat page
        console.warn(`Chat with id ${chatId} not found`)
        router.push('/chat')
      }
    }

    loadChat()

    return () => {
      cancelled = true
    }
  }, [checkingVerification, user, chatId, fetchChats, router])

  // Show loading state while checking session or verification
  if (loading || checkingVerification) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-600">Loading...</div>
      </div>
    )
  }

  // Don't render chat if user is not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen">
      {/* App Navigation Sidebar - Always visible on desktop */}
      {!isMobile && <AppSidebar />}
      
      {/* Chat Sidebar */}
      <ChatSidebar />
      
      {/* Mobile Overlay */}
      <MobileOverlay />
      
      {/* Main Content Area */}
      <main
        className={cn(
          'flex flex-1 flex-col transition-all duration-300 bg-slate-50',
          // Desktop: Add left margin for app sidebar (64px) + chat sidebar (280px) when open
          !isMobile && !isOpen && 'ml-16',
          !isMobile && isOpen && 'ml-[344px]'
        )}
      >
        {/* Mobile Menu Button - visible only on mobile */}
        {isMobile && (
          <div className="fixed left-4 top-4 z-20">
            <Button
              onClick={open}
              variant="outline"
              size="icon"
              className="h-10 w-10 bg-white shadow-md hover:bg-slate-50 focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        )}
        
        <ChatContainer messages={mockMessages} />
      </main>
    </div>
  )
}
