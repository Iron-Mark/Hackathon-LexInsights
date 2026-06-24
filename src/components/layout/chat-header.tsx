'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AuthDialog, type AuthDialogMode } from '@/components/auth/auth-dialog'
import { useAuthSetup } from '@/components/providers/auth-setup-provider'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { UserMenu } from './user-menu'

const authSignInButtonClassName =
  'h-11 rounded-md border border-iris-100 bg-white/90 px-2.5 text-xs font-semibold text-slate-800 shadow-xs shadow-iris-950/5 transition-all duration-200 hover:border-iris-300 hover:bg-iris-50 hover:text-iris-800 hover:shadow-sm active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-iris-500 focus-visible:ring-offset-2 sm:px-3 sm:text-sm dark:border-iris-300/15 dark:bg-[#241f32]/60 dark:text-slate-100 dark:shadow-none dark:hover:border-iris-300/40 dark:hover:bg-iris-300/12 dark:hover:text-iris-100 dark:focus-visible:ring-offset-[#1a1625]'

const authSignUpButtonClassName =
  'h-11 rounded-md border border-iris-500/25 bg-iris-600 px-3 text-xs font-semibold text-white shadow-sm shadow-iris-950/15 transition-all duration-200 hover:bg-iris-700 hover:shadow-md hover:shadow-iris-950/20 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-iris-400 focus-visible:ring-offset-2 dark:border-iris-300/20 dark:bg-iris-600 dark:text-white dark:hover:bg-iris-500 dark:focus-visible:ring-offset-[#1a1625] sm:text-sm'

export function ChatHeader() {
  const { user } = useAuthStore()
  const { clerkConfigured, missingClerkKeys } = useAuthSetup()
  const [authDialogMode, setAuthDialogMode] = useState<AuthDialogMode>('sign-in')
  const [authDialogOpen, setAuthDialogOpen] = useState(false)

  const openAuthDialog = (mode: AuthDialogMode) => {
    setAuthDialogMode(mode)
    setAuthDialogOpen(true)
  }

  return (
    <header className="sticky top-0 z-10 border-b border-iris-100/80 bg-white/90 pt-[env(safe-area-inset-top)] shadow-[0_1px_0_rgba(39,32,117,0.04)] backdrop-blur-xl dark:border-iris-300/15 dark:bg-[#1a1625]/95 dark:shadow-none dark:backdrop-blur">
      <div className="relative flex h-14 w-full items-center justify-between gap-2 px-4 sm:h-16 sm:gap-4 sm:px-6">
        <div className="flex-1" />

        <div className="absolute left-1/2 top-1/2 flex max-w-[7.5rem] -translate-x-1/2 -translate-y-1/2 items-center gap-2 sm:max-w-[8rem] lg:max-w-none">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-iris-100 bg-iris-50/80 p-1 shadow-sm shadow-iris-950/10 ring-1 ring-white transition-colors duration-200 dark:border-iris-300/15 dark:bg-iris-300/10 dark:shadow-none dark:ring-iris-100/10 lg:h-11 lg:w-11">
            <Image
              src="/logo/LOGO-0.5-woBG.svg"
              alt="LexInSight logo"
              width={40}
              height={40}
              className="h-7 w-7 drop-shadow-[0_0_8px_rgba(99,102,241,0.32)] lg:h-9 lg:w-9"
              priority
            />
          </div>
          <div className="hidden min-w-0 flex-col items-start lg:flex">
            <h1 className="truncate text-xl font-extrabold leading-tight text-slate-950 dark:text-white">
              LexInSight
            </h1>
            <p className="hidden text-xs font-semibold leading-tight text-slate-600 dark:text-slate-300 xl:block">
              Legal compliance assistant
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          {user ? (
            <UserMenu />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={authSignInButtonClassName}
                onClick={() => openAuthDialog('sign-in')}
              >
                Sign in
              </Button>
              <Button
                size="sm"
                className={authSignUpButtonClassName}
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
