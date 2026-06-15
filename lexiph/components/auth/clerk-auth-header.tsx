'use client'

import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

export function ClerkAuthHeader() {
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
