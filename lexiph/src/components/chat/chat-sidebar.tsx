'use client'

import { useSidebarStore } from '@/lib/store/sidebar-store'
import { cn } from '@/lib/utils'
import { SidebarHeader } from './sidebar-header'
import { ChatList } from './chat-list'

interface ChatSidebarProps {
  className?: string
}

export function ChatSidebar({ className }: ChatSidebarProps) {
  const { isOpen, isMobile } = useSidebarStore()

  return (
    <aside
      className={cn(
        // Base styles with design system colors
        'flex h-screen flex-col bg-slate-50 border-r border-slate-200',
        // Width constraints
        'w-[280px]',
        // Desktop: fixed positioning with offset for app sidebar
        !isMobile && 'fixed left-16 top-0',
        // Mobile: overlay positioning with higher z-index
        isMobile && 'fixed left-0 top-0 z-40 max-w-[80%]',
        // Smooth transitions - 300ms as per design spec
        'transition-transform duration-300 ease-out',
        // Slide in/out based on isOpen state
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Focus visible outline for keyboard navigation
        'focus-within:outline-none',
        className
      )}
      role="navigation"
      aria-label="Chat history"
    >
      <SidebarHeader />
      <ChatList />
    </aside>
  )
}
