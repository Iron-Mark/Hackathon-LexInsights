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
import { InstallAppButton } from '@/components/pwa/install-app-button'
import { SidebarTooltip } from '@/components/navigation/sidebar-tooltip'

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
          'relative flex h-screen flex-col border-r border-[#8A82DC] bg-[linear-gradient(180deg,#F1EEFF_0%,#F8F6FF_58%,#F0EDFF_100%)] shadow-[inset_-1px_0_0_rgba(63,51,189,0.16)] supports-[height:100dvh]:h-dvh dark:border-iris-300/15 dark:bg-[linear-gradient(180deg,#211a35_0%,#171322_54%,#120d1f_100%)] dark:shadow-none',
          // Width constraints
          'w-[280px]',
          // Desktop: fixed positioning with offset for app sidebar
          !isMobile && 'fixed left-16 top-0 z-30',
          // Mobile: keep the history panel beside the persistent app rail so controls remain clickable.
          isMobile && 'fixed left-16 top-0 z-40 max-w-[calc(100%-4rem)]',
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
        inert={!isOpen ? true : undefined}
      >
        <SidebarHeader />
        <ChatList />

        {isMobile && (
          <div className="shrink-0 border-t border-[#8A82DC]/70 bg-[#F8F6FF]/75 px-4 py-4 dark:border-iris-300/15 dark:bg-transparent">
            <p className="px-1 text-[11px] font-bold uppercase tracking-normal text-iris-700/70 dark:text-iris-100/60">
              App controls
            </p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <InstallAppButton />

              <button
                onClick={toggleTheme}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-[#8A82DC]/70 bg-[#FBFAFF]/90 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-iris-950/8 transition-all hover:border-iris-500 hover:bg-[#EFECFF] hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F2FF] dark:border-iris-300/15 dark:bg-[#241f32]/80 dark:text-iris-100/75 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
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
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-[#8A82DC]/70 bg-[#FBFAFF]/90 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-iris-950/8 transition-all hover:border-iris-500 hover:bg-[#EFECFF] hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F2FF] dark:border-iris-300/15 dark:bg-[#241f32]/80 dark:text-iris-100/75 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
                aria-label="Help & Resources"
                type="button"
              >
                <HelpCircle className="h-5 w-5 text-iris-700 dark:text-iris-200" aria-hidden="true" />
                <span className="truncate">Help</span>
              </button>

              <button
                onClick={() => setShowAttributionDialog(true)}
                className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-[#8A82DC]/70 bg-[#FBFAFF]/90 px-2 py-2 text-xs font-semibold text-slate-700 shadow-sm shadow-iris-950/8 transition-all hover:border-iris-500 hover:bg-[#EFECFF] hover:text-iris-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F4F2FF] dark:border-iris-300/15 dark:bg-[#241f32]/80 dark:text-iris-100/75 dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#171322]"
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
          <SidebarTooltip label="Collapse chat history" className="absolute right-0 top-0 z-[60] h-full w-3">
            <button
              onClick={close}
              className="h-full w-full cursor-ew-resize bg-transparent focus-visible:outline-none"
              aria-label="Collapse chat history"
              aria-expanded={true}
              type="button"
            >
              <span
                aria-hidden="true"
                className="absolute inset-y-0 right-0 w-full bg-iris-500/0 transition-colors duration-150 group-hover:bg-iris-500/10 group-focus-within:bg-iris-500/15 dark:group-hover:bg-iris-200/10 dark:group-focus-within:bg-iris-200/15"
              />
              <span
                aria-hidden="true"
                className="absolute right-0 top-1/2 z-10 h-16 w-1 -translate-y-1/2 rounded-full bg-iris-500/0 transition-all duration-150 group-hover:right-0.5 group-hover:bg-iris-500/55 group-focus-within:right-0.5 group-focus-within:bg-iris-500/70 dark:group-hover:bg-iris-200/55 dark:group-focus-within:bg-iris-200/75"
              />
              <span className="sr-only">Collapse chat history</span>
            </button>
          </SidebarTooltip>
        )}
      </aside>
    </>
  )
}
