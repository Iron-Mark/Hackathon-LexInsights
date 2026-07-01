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
import { SidebarTooltip } from './sidebar-tooltip'

interface NavItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  href?: string
  action?: () => void
  active?: boolean
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
      
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center border-r border-[#8A82DC] bg-[linear-gradient(180deg,#F1EEFF_0%,#F8F6FF_54%,#F0EDFF_100%)] pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-[calc(env(safe-area-inset-top)+1rem)] shadow-[inset_-1px_0_0_rgba(63,51,189,0.16)] supports-[height:100dvh]:h-dvh dark:border-iris-300/15 dark:bg-[linear-gradient(180deg,#211a35_0%,#171322_55%,#120d1f_100%)] dark:shadow-none">
        {!isMobile && (
          <SidebarTooltip
            label={isOpen ? 'Collapse chat history' : 'Expand chat history'}
            className="absolute right-0 top-0 z-[60] h-full w-3"
          >
            <button
              onClick={isOpen ? close : open}
              className="h-full w-full cursor-ew-resize bg-transparent focus-visible:outline-none"
              aria-label={isOpen ? 'Collapse chat history' : 'Expand chat history'}
              aria-expanded={isOpen}
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
              <span className="sr-only">{isOpen ? 'Collapse chat history' : 'Expand chat history'}</span>
            </button>
          </SidebarTooltip>
        )}

        {/* Top Navigation Items */}
        <nav className="flex flex-1 flex-col items-center gap-2">
          {navItems.map((item, index) => {
            const Icon = item.icon
            const active = isActive(item)
            
            return (
              <SidebarTooltip key={item.label + index} label={item.label}>
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
              </SidebarTooltip>
            )
          })}
        </nav>

        {/* Bottom Section - Utilities */}
        <div className={cn('flex flex-col items-center gap-2', !user && 'pb-10')}>
          <SidebarTooltip label={themeToggleLabel}>
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
          </SidebarTooltip>

          {/* Help/Resources Button */}
          <SidebarTooltip label="Help & Resources">
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
          </SidebarTooltip>

          <SidebarTooltip label="Authors & Attribution">
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
          </SidebarTooltip>

          {user && (
            <SidebarTooltip label="Profile">
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
            </SidebarTooltip>
          )}
        </div>
      </aside>
    </>
  )
}
