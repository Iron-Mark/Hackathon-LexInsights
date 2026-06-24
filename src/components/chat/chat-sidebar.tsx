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
        'relative flex h-screen flex-col border-r border-slate-200 bg-slate-50 supports-[height:100dvh]:h-dvh dark:border-iris-300/15 dark:bg-[linear-gradient(180deg,#211a35_0%,#171322_54%,#120d1f_100%)]',
        // Width constraints
        'w-[280px]',
        // Desktop: fixed positioning with offset for app sidebar
        !isMobile && 'fixed left-16 top-0 z-30',
        // Mobile: overlay positioning with higher z-index
        isMobile && 'fixed left-0 top-0 z-40 max-w-[80%]',
        // Smooth transitions - 300ms as per design spec
        'transition-transform duration-300 ease-out',
        // Slide in/out based on isOpen state
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Closed transformed drawers must not leave an invisible edge hit area.
        isOpen ? 'pointer-events-auto' : 'pointer-events-none',
        // Focus visible outline for keyboard navigation
        'focus-within:outline-none',
        className
      )}
      role="navigation"
      aria-label="Chat history"
      aria-hidden={!isOpen}
    >
      <SidebarHeader />
      <ChatList />
      {isOpen && (
        <button
          onClick={close}
          className="absolute bottom-0 right-0 top-0 z-[60] w-3 cursor-pointer bg-transparent transition-colors after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-transparent after:transition-colors hover:bg-iris-100/35 hover:after:bg-iris-300 focus-visible:bg-iris-100/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:after:bg-iris-500 dark:hover:bg-iris-300/10 dark:hover:after:bg-iris-300/45 dark:focus-visible:bg-iris-300/12 dark:focus-visible:ring-offset-[#171322]"
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
