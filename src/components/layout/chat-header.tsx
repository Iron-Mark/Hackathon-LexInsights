'use client'

import { useState } from 'react'
import { AuthDialog, type AuthDialogMode } from '@/components/auth/auth-dialog'
import { useAuthSetup } from '@/components/providers/auth-setup-provider'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { useSidebarStore } from '@/lib/store/sidebar-store'
import { UserMenu } from './user-menu'

const authSignInButtonClassName =
  'h-11 rounded-md border border-[#8A82DC] bg-[#FBFAFF]/92 px-2.5 text-xs font-semibold text-slate-900 shadow-xs shadow-iris-950/8 transition-all duration-200 hover:border-iris-600 hover:bg-[#EFECFF] hover:text-iris-800 hover:shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 sm:px-3 sm:text-sm dark:border-iris-300/15 dark:bg-[#241f32]/60 dark:text-slate-100 dark:shadow-none dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#1a1625]'

const authSignUpButtonClassName =
  'h-11 rounded-md border border-iris-500/25 bg-iris-600 px-3 text-xs font-semibold text-white shadow-sm shadow-iris-950/15 transition-all duration-200 hover:bg-iris-700 hover:shadow-md hover:shadow-iris-950/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/20 dark:bg-iris-600 dark:text-white dark:hover:bg-iris-500 dark:focus-visible:ring-offset-[#1a1625] sm:text-sm'

export function ChatHeader() {
  const { user } = useAuthStore()
  const { isOpen, isMobile } = useSidebarStore()
  const { clerkConfigured, missingClerkKeys } = useAuthSetup()
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode>('sign-in')
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const showHeaderBrand = !isMobile && !isOpen

  const openAuthDialog = (mode: AuthDialogMode) => {
    setAuthDialogMode(mode)
    setAuthDialogOpen(true)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-[#8A82DC] bg-[#F8F6FF]/92 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(63,51,189,0.12)] backdrop-blur-xl dark:border-iris-300/15 dark:bg-[#1a1625]/95 dark:shadow-none dark:backdrop-blur">
      <div className="relative flex h-14 w-full items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <div className="flex-1" />

        {showHeaderBrand && (
          <div className="absolute left-1/2 top-1/2 hidden max-w-[10rem] -translate-x-1/2 -translate-y-1/2 text-center sm:block lg:max-w-none">
            <h1 className="truncate text-sm font-extrabold leading-tight text-slate-950 dark:text-white lg:text-xl">
              LexInsights
            </h1>
            <p className="hidden text-xs font-semibold leading-tight text-slate-700 dark:text-slate-300 xl:block">
              Legal compliance assistant
            </p>
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={`${authSignInButtonClassName} hidden max-[340px]:inline-flex`}
                onClick={() => openAuthDialog('sign-in')}
              >
                Login
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`${authSignInButtonClassName} max-[340px]:hidden`}
                onClick={() => openAuthDialog('sign-in')}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className={`${authSignUpButtonClassName} max-[340px]:hidden`}
                onClick={() => openAuthDialog('sign-up')}
              >
                Sign up
              </Button>
              <AuthDialog
                clerkConfigured={clerkConfigured}
                missingClerkKeys={missingClerkKeys}
                mode={authDialogMode}
                open={authDialogOpen}
                onModeChange={setAuthDialogMode}
                onOpenChange={setAuthDialogOpen}
              />
            </>
          )}
        </div>
      </div>
    </header>
  )
}
