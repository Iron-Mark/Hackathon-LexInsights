'use client'

import { SignInButton, SignUpButton } from '@clerk/nextjs'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { authFormAppearance } from '@/lib/auth/clerk-appearance'
import { isClerkClientConfigured } from '@/lib/auth/clerk-config'
import { useAuthStore } from '@/lib/store/auth-store'
import { UserMenu } from './user-menu'

export function ChatHeader() {
  const { user } = useAuthStore()
  const clerkClientConfigured = isClerkClientConfigured()

  return (
    <header className="sticky top-0 z-10 h-14 border-b border-slate-200 bg-white sm:h-16">
      <div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex-1" />

        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1">
          <div className="shrink-0">
            <Image
              src="/logo/LOGO-0.5-woBG.svg"
              alt="LexInSight logo"
              width={40}
              height={40}
              priority
            />
          </div>
          <div className="flex flex-col items-start">
            <h1 className="animate-gradient bg-linear-to-r from-iris-500 via-purple-600 to-iris-700 bg-clip-text text-lg font-bold leading-tight text-transparent sm:text-xl">
              LexInSight
            </h1>
            <p className="animate-gradient bg-linear-to-r from-iris-400 via-purple-500 to-iris-600 bg-clip-text text-[10px] font-medium leading-tight text-transparent sm:text-xs">
              Legal compliance assistant
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-2">
          {user ? (
            <UserMenu />
          ) : clerkClientConfigured ? (
            <>
              <SignInButton
                mode="modal"
                fallbackRedirectUrl="/chat"
                signUpFallbackRedirectUrl="/chat"
                appearance={authFormAppearance}
              >
                <Button variant="ghost" size="sm">Sign in</Button>
              </SignInButton>
              <SignUpButton
                mode="modal"
                fallbackRedirectUrl="/chat"
                signInFallbackRedirectUrl="/chat"
                appearance={authFormAppearance}
              >
                <Button size="sm">Sign up</Button>
              </SignUpButton>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/auth/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/auth/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
