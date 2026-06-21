'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { MessageSquare, PenSquare, Search, FileText, User, HelpCircle, LogIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { useChatStore } from '@/lib/store/chat-store'
import { SearchDialog } from '@/components/chat/search-dialog'
import { UploadedFilesDialog } from '@/components/chat/uploaded-files-dialog'
import { ProfileDialog } from '@/components/profile/profile-dialog'
import { ResourcesDialog } from '@/components/help/resources-dialog'

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
          'pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 opacity-0 shadow-lg shadow-slate-900/10',
          'transition-all duration-150 ease-out group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-within:translate-x-0.5 group-focus-within:opacity-100'
        )}
        role="tooltip"
      >
        {label}
        <span className="absolute left-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 border-b border-l border-slate-200 bg-white" />
      </div>
    </div>
  )
}

export function AppSidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { toggle } = useSidebarStore()
  
  // Dialog states
  const [showSearchDialog, setShowSearchDialog] = useState(false)
  const [showFilesDialog, setShowFilesDialog] = useState(false)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [showResourcesDialog, setShowResourcesDialog] = useState(false)
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url

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
    if (item.label === 'Chat') {
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
      
      <aside className="fixed left-0 top-0 z-50 flex h-screen w-16 flex-col items-center bg-white dark:bg-neutral-900 border-r border-neutral-300 dark:border-neutral-700 py-4">
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
                    'hover:bg-iris-50 hover:text-iris-700 dark:hover:bg-neutral-700 dark:hover:text-iris-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2',
                    active
                      ? 'bg-iris-100 text-iris-900 dark:bg-neutral-700 dark:text-iris-300'
                      : 'text-neutral-600 dark:text-neutral-400'
                  )}
                  aria-label={item.label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </SidebarTooltipButton>
            )
          })}
        </nav>

        {/* Bottom Section - Help & Profile */}
        <div className="flex flex-col items-center gap-2">
          {/* Help/Resources Button */}
          <SidebarTooltipButton label="Help & Resources">
            <Button
              onClick={() => setShowResourcesDialog(true)}
              variant="ghost"
              size="icon"
              className={cn(
                'h-12 w-12 rounded-xl transition-all duration-200',
                'text-neutral-600 hover:bg-iris-50 hover:text-iris-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-iris-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2'
              )}
              aria-label="Help & Resources"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </SidebarTooltipButton>

          {user ? (
            <SidebarTooltipButton label="Profile">
              <Button
                onClick={() => setShowProfileDialog(true)}
                variant="ghost"
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-full transition-all duration-200',
                  'hover:ring-2 hover:ring-iris-400',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2'
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
          ) : (
            <SidebarTooltipButton label="Sign in">
              <Button
                onClick={() => router.push('/auth/login')}
                variant="ghost"
                size="icon"
                className={cn(
                  'h-12 w-12 rounded-xl transition-all duration-200',
                  'text-neutral-600 hover:bg-iris-50 hover:text-iris-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-iris-300',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2'
                )}
                aria-label="Sign in"
              >
                <LogIn className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SidebarTooltipButton>
          )}
        </div>
      </aside>
    </>
  )
}
