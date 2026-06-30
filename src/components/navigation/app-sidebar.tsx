'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, PenSquare, Search, FileText, User, HelpCircle, Moon, Sun, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useChatStore } from '@/lib/store/chat-store'
import { SearchDialog } from '@/components/chat/search-dialog'
import { UploadedFilesDialog } from '@/components/chat/uploaded-files-dialog'
import { ProfileDialog } from '@/components/profile/profile-dialog'
import { ResourcesDialog } from '@/components/help/resources-dialog'
import { AttributionDialog } from '@/components/about/attribution-dialog'
import { useTheme } from '@/components/providers/theme-provider'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  action?: () => void
  active?: boolean
}

interface SidebarTooltipButtonProps {
  label: string
  children: React.ReactNode
}

function SidebarTooltipButton({ label, children }: SidebarTooltipButtonProps) {
  return (
    <div className="group relative">
      {children}
      <div
        className={cn(
          'pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-iris-100 bg-white/95 px-3 py-2 text-xs font-semibold text-slate-800 opacity-0 shadow-lg shadow-iris-950/10 backdrop-blur dark:border-iris-300/15 dark:bg-[#241f32] dark:text-slate-100 dark:shadow-iris-950/30',
          'transition-all duration-150 ease-out group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-within:translate-x-0.5 group-focus-within:opacity-100'
        )}
        role="tooltip"
      >
        {label}
        <span className="absolute left-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-iris-100 bg-white dark:border-iris-300/15 dark:bg-[#241f32]" />
      </div>
    </div>
  )
}

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { isOpen, isMobile, open, close, toggle } = useSidebarStore()
  const { resolvedTheme, toggleTheme } = useTheme()
  
  // Dialog states
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showFilesDialog, setShowFilesDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showResourcesDialog, setShowResourcesDialog] = useState(false)
  const [showAttributionDialog, setShowAttributionDialog] = useState(false)
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url
  const isDarkTheme = resolvedTheme === 'dark'
  const themeToggleLabel = isDarkTheme ? 'Switch to light mode' : 'Switch to dark mode'

  const handleNewChat = async () => {
    const { createChat } = useChatStore.getState()
    try {
      const newChat = await createChat('New Chat')
      router.push(`/chat/${newChat.id}`)
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  const navItems: NavItem[] = [
    {
      icon: MessageSquare,
      label: 'Chat History',
      action: toggle, // Toggle chat sidebar
    },
    {
      icon: PenSquare,
      label: 'New Chat',
      action: handleNewChat,
    },
    ...(user
      ? [
          {
            icon: Search,
            label: 'Search Documents',
            action: () => setShowSearchDialog(true),
          },
          {
            icon: FileText,
            label: 'Uploaded Files',
            action: () => setShowFilesDialog(true),
          },
        ]
      : []),
  ]

  const isActive = (item: NavItem) => {
    // Chat icon is active when on chat routes
    if (item.label === 'Chat History') {
      return pathname === '/chat' || pathname?.startsWith('/chat/')
    }
    if (item.href) {
      return pathname === item.href
    }
    return false
  }

  const handleItemClick = (item: NavItem) => {
    if (item.action) {
      item.action()
    } else if (item.href) {
      router.push(item.href)
    }
  }

  return (
    <>
      {/* Dialogs */}
      {user && <SearchDialog open={showSearchDialog} onOpenChange={setShowSearchDialog} />}
      {user && <UploadedFilesDialog open={showFilesDialog} onOpenChange={setShowFilesDialog} />}
      {user && <ProfileDialog open={showProfileDialog} onOpenChange={setShowProfileDialog} />}
      <ResourcesDialog open={showResourcesDialog} onOpenChange={setShowResourcesDialog} />
      <AttributionDialog open={showAttributionDialog} onOpenChange={setShowAttributionDialog} />
      
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center border-r border-iris-100/80 bg-[linear-gradient(180deg,#f7f6ff_0%,#ffffff_52%,#f8fafc_100%)] pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[inset_-1px_0_0_rgba(39,32,117,0.04)] supports-[height:100dvh]:h-dvh dark:border-iris-300/15 dark:bg-[linear-gradient(180deg,#211a35_0%,#171322_55%,#120d1f_100%)] dark:shadow-none">
        {!isMobile && (
          <button
            onClick={isOpen ? close : open}
            className="absolute right-0 top-1/2 z-[60] h-11 w-11 -translate-y-1/2 cursor-pointer rounded-l-lg bg-transparent transition-colors after:absolute after:inset-y-2 after:right-0 after:w-px after:bg-iris-100 after:transition-colors hover:bg-iris-100/45 hover:after:bg-iris-400 focus-visible:bg-iris-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white focus-visible:after:bg-iris-500 dark:after:bg-transparent dark:hover:bg-iris-300/10 dark:hover:after:bg-iris-300/45 dark:focus-visible:bg-iris-300/12 dark:focus-visible:ring-offset-[#171322]"
            aria-label={isOpen ? 'Collapse chat history' : 'Expand chat history'}
            title={isOpen ? 'Collapse chat history' : 'Expand chat history'}
            type="button"
          >
            <span className="sr-only">{isOpen ? 'Collapse chat history' : 'Expand chat history'}</span>
          </button>
        )}

        {/* Top Navigation Items */}
        <nav className="flex flex-1 flex-col items-center gap-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item)
            
            return (
              <SidebarTooltipButton key={item.label + index} label={item.label}>
                <Button
                  onClick={() => handleItemClick(item)}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-12 w-12 rounded-xl transition-all duration-200',
                    'hover:bg-iris-100/70 hover:text-iris-800 dark:hover:bg-iris-300/12 dark:hover:text-iris-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]',
                    active
                      ? 'bg-iris-100 text-iris-900 shadow-sm shadow-iris-950/5 ring-1 ring-iris-200/80 dark:bg-iris-300/14 dark:text-iris-100 dark:ring-0'
                      : 'text-iris-700/80 dark:text-iris-100/55'
                  )}
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </SidebarTooltipButton>
            )
          })}
        </nav>

        {/* Bottom Section - Utilities */}
        <div className={cn('flex flex-col items-center gap-2', !user && 'pb-10')}>
          <SidebarTooltipButton label={themeToggleLabel}>
            <Button
              onClick={toggleTheme}
              variant="ghost"
              size="icon"
              className={cn(
                'h-12 w-12 rounded-xl transition-all duration-200',
                'text-iris-700/80 hover:bg-iris-100/70 hover:text-iris-900 dark:text-iris-100/55 dark:hover:bg-iris-300/12 dark:hover:text-iris-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]'
              )}
              aria-label={themeToggleLabel}
              aria-pressed={isDarkTheme}
            >
              {isDarkTheme ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </Button>
          </SidebarTooltipButton>

          {/* Help/Resources Button */}
          <SidebarTooltipButton label="Help & Resources">
            <Button
              onClick={() => setShowResourcesDialog(true)}
              variant="ghost"
              size="icon"
              className={cn(
                'h-12 w-12 rounded-xl transition-all duration-200',
                'text-iris-700/80 hover:bg-iris-100/70 hover:text-iris-900 dark:text-iris-100/55 dark:hover:bg-iris-300/12 dark:hover:text-iris-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]'
              )}
              aria-label="Help & Resources"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </SidebarTooltipButton>

          <SidebarTooltipButton label="Authors & Attribution">
            <Button
              onClick={() => setShowAttributionDialog(true)}
              variant="ghost"
              size="icon"
              className={cn(
                'h-12 w-12 rounded-xl transition-all duration-200',
                'text-iris-700/80 hover:bg-iris-100/70 hover:text-iris-900 dark:text-iris-100/55 dark:hover:bg-iris-300/12 dark:hover:text-iris-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]'
              )}
              aria-label="Authors & Attribution"
            >
              <UserRound className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SidebarTooltipButton>

          {user && (
            <SidebarTooltipButton label="Profile">
              <Button
                onClick={() => setShowProfileDialog(true)}
                variant="ghost"
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full transition-all duration-200',
                  'hover:ring-2 hover:ring-iris-400',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#171322]'
                )}
                aria-label="Profile"
              >
                {avatarUrl ? (
                  <span
                    aria-label="Profile"
                    className="h-10 w-10 rounded-full bg-cover bg-center"
                    role="img"
                    style={{ backgroundImage: `url(${avatarUrl})` }}
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-iris-500 to-iris-700">
                    <User className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                )}
              </Button>
            </SidebarTooltipButton>
          )}
        </div>
      </aside>
    </>
  )
}
