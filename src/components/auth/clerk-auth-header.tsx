'use client'

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

const APP_SHELL_ROUTES = ['/', '/chat', '/documents']

export function ClerkAuthHeader() {
  const pathname = usePathname()
  const isAppShellRoute = APP_SHELL_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isAppShellRoute) {
    return null
  }

  return (
    <header className="fixed right-0 top-0 z-40 flex h-16 items-center justify-end gap-2 px-4">
      <Show when="signed-out">
        <SignInButton mode="redirect">
          <Button variant="ghost" size="sm">Sign in</Button>
        </SignInButton>
        <SignUpButton mode="redirect">
          <Button size="sm">Sign up</Button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton />
      </Show>
    </header>
  )
}
