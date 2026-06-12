'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
import type { Message } from '@/types'

// Empty messages array - show empty state by default
const mockMessages: Message[] = []

export default function ChatPage() {
  const router = useRouter()
  const { user, loading } = useAuthStore()
  const { isOpen, isMobile, open, setIsMobile } = useSidebarStore()
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
        useSidebarStore.getState().close()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => window.removeEventListener('keydown', handleEscape)
  }, [isMobile, isOpen])

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

  // Don't auto-redirect to first chat - show empty state instead
  // Users can click on a chat from the sidebar to open it

  // Fetch chats when user is authenticated
  useEffect(() => {
    if (!checkingVerification && user) {
      fetchChats()
    }
  }, [checkingVerification, user, fetchChats])

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
              className="h-10 w-10 bg-white shadow-md hover:bg-slate-50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 transition-all duration-150"
              aria-label="Open sidebar menu"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </Button>
          </div>
        )}
        
        <ChatContainer messages={mockMessages} />
      </main>
    </div>
  )
}
