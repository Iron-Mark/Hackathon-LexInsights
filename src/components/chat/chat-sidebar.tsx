'use client'

import { useState } from 'react'
import { HelpCircle, Moon, Sun, UserRound } from 'lucide-react'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { cn } from '@/lib/utils'
import { SidebarHeader } from './sidebar-header'
import { ChatList } from './chat-list'
import { ResourcesDialog } from '@/components/help/resources-dialog'
import { AttributionDialog } from '@/components/about/attribution-dialog'
import { useTheme } from '@/components/providers/theme-provider'

interface ChatSidebarProps {
  className?: string
}

export function ChatSidebar({ className }: ChatSidebarProps) {
  const { isOpen, isMobile, close } = useSidebarStore()
  const { resolvedTheme, toggleTheme } = useTheme()
  const [showResourcesDialog, setShowResourcesDialog] = useState(false)
  const [showAttributionDialog, setShowAttributionDialog] = useState(false)
  const isDarkTheme = resolvedTheme === 'dark'
  const themeToggleLabel = isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <>
      <ResourcesDialog open={showResourcesDialog} onOpenChange={setShowResourcesDialog} />
      <AttributionDialog open={showAttributionDialog} onOpenChange={setShowAttributionDialog} />

      <aside
        className={cn(
          // Base styles with design system colors
          'relative flex h-screen flex-col border-r border-iris-100/80 bg-[linear-gradient(180deg,#f7f6ff_0%,#f8fafc_58%,#ffffff_100%)] shadow-[inset_-1px_0_0_rgba(39,32,117,0.04)] supports-[height:100dvh]:h-dvh dark:border-iris-300/15 dark:bg-[linear-gradient(180deg,#211a35_0%,#171322_54%,#120d1f_100%)] dark:shadow-none',
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

        {isMobile && (
          <div className="shrink-0 border-t border-iris-100/80 bg-white/40 px-4 py-4 dark:border-iris-300/15 dark:bg-transparent">
            <p className="px-1 text-[11px] font-bold uppercase tracking-normal text-iris-700/70 dark:text-iris-100/45">
              App controls
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button
                onClick={toggleTheme}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-iris-100 bg-white/85 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-iris-950/5 transition-all hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:border-iris-300/15 dark:bg-[#241f32]/80 dark:text-iris-100/75 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                aria-label={themeToggleLabel}
                aria-pressed={isDarkTheme}
                type="button"
              >
                {isDarkTheme ? (
                  <Sun className="h-5 w-5 text-iris-200" aria-hidden="true" />
                ) : (
                  <Moon className="h-5 w-5 text-iris-700" aria-hidden="true" />
                )}
                <span className="truncate">{isDarkTheme ? 'Light' : 'Dark'}</span>
              </button>

              <button
                onClick={() => setShowResourcesDialog(true)}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-iris-100 bg-white/85 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-iris-950/5 transition-all hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:border-iris-300/15 dark:bg-[#241f32]/80 dark:text-iris-100/75 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                aria-label="Help & Resources"
                type="button"
              >
                <HelpCircle className="h-5 w-5 text-iris-700 dark:text-iris-200" aria-hidden="true" />
                <span className="truncate">Help</span>
              </button>

              <button
                onClick={() => setShowAttributionDialog(true)}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-iris-100 bg-white/85 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-iris-950/5 transition-all hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:border-iris-300/15 dark:bg-[#241f32]/80 dark:text-iris-100/75 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                aria-label="Authors & Attribution"
                type="button"
              >
                <UserRound className="h-5 w-5 text-iris-700 dark:text-iris-200" aria-hidden="true" />
                <span className="truncate">Credits</span>
              </button>
            </div>
          </div>
        )}

        {isOpen && (
          <button
            onClick={close}
            className="absolute bottom-0 right-0 top-0 z-[60] w-3 cursor-pointer bg-transparent transition-colors after:absolute after:inset-y-0 after:right-0 after:w-px after:bg-iris-100 after:transition-colors hover:bg-iris-100/45 hover:after:bg-iris-400 focus-visible:bg-iris-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:after:bg-iris-500 dark:after:bg-transparent dark:hover:bg-iris-300/10 dark:hover:after:bg-iris-300/45 dark:focus-visible:bg-iris-300/12 dark:focus-visible:ring-offset-[#171322]"
            aria-label="Collapse chat history"
            title="Collapse chat history"
            type="button"
          >
            <span className="sr-only">Collapse chat history</span>
          </button>
        )}
      </aside>
    </>
  )
}
