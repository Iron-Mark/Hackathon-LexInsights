'use client'

import { useSidebarStore } from '@/lib/store/sidebar-store'
import { cn } from '@/lib/utils'
import { SidebarHeader } from './sidebar-header'
import { ChatList } from './chat-list'

interface ChatSidebarProps {
  className?: string
}

export function ChatSidebar({ className }: ChatSidebarProps) {
  const { isOpen, isMobile, close } = useSidebarStore()

  return (
    <aside
      className={cn(
        // Base styles with design system colors
        'relative flex h-screen flex-col border-r border-slate-200 bg-slate-50 dark:border-neutral-700 dark:bg-neutral-900',
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
      {isOpen && (
        <button
          onClick={close}
          className="absolute bottom-0 right-0 top-0 z-20 w-3 translate-x-1.5 cursor-pointer border-r border-transparent bg-transparent transition-colors hover:border-iris-300 hover:bg-iris-100/70 focus-visible:translate-x-0 focus-visible:border-iris-500 focus-visible:bg-iris-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:hover:border-iris-400/40 dark:hover:bg-iris-400/15 dark:focus-visible:bg-iris-400/15 dark:focus-visible:ring-offset-neutral-900"
          aria-label="Collapse chat history"
          title="Collapse chat history"
          type="button"
        >
          <span className="sr-only">Collapse chat history</span>
        </button>
      )}
    </aside>
  )
}
