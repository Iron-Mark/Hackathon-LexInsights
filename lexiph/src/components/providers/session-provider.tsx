'use client'

import { useEffect } from 'react'
import { useClerk, useSession, useUser } from '@clerk/nextjs'
import { useAuthStore } from '@/lib/store/auth-store'
import { setSupabaseAccessTokenGetter } from '@/lib/supabase/client'
import type { User } from '@/types'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const clerk = useClerk()
  const { isLoaded: userLoaded, user } = useUser()
  const { isLoaded: sessionLoaded, session } = useSession()
  const setLoading = useAuthStore((state) => state.setLoading)
  const setClerkSession = useAuthStore((state) => state.setClerkSession)
  const setUnauthenticated = useAuthStore((state) => state.setUnauthenticated)
  const setSignOutHandler = useAuthStore((state) => state.setSignOutHandler)

  useEffect(() => {
    setSignOutHandler(async () => {
      await clerk.signOut()
    })

    return () => {
      setSignOutHandler(null)
    }
  }, [clerk, setSignOutHandler])

  useEffect(() => {
    if (!session) {
      setSupabaseAccessTokenGetter(null)
      return
    }

    setSupabaseAccessTokenGetter(async () => session.getToken())

    return () => {
      setSupabaseAccessTokenGetter(null)
    }
  }, [session])

  useEffect(() => {
    if (!userLoaded || !sessionLoaded) {
      setLoading(true)
      return
    }

    if (!user) {
      setUnauthenticated()
      return
    }

    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses[0]?.emailAddress

    if (!email) {
      setUnauthenticated()
      return
    }

    const fullName =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      undefined

    const clerkUser: User = {
      id: user.id,
      email,
      full_name: fullName,
      avatar_url: user.imageUrl || undefined,
      created_at: user.createdAt ? user.createdAt.toISOString() : undefined,
      email_confirmed_at: user.primaryEmailAddress?.verification?.status === 'verified'
        ? new Date().toISOString()
        : null,
      user_metadata: {
        full_name: fullName,
        name: fullName,
        avatar_url: user.imageUrl || undefined,
      },
    }

    setClerkSession(
      clerkUser,
      session
        ? {
            id: session.id,
            userId: user.id,
          }
        : null
    )
  }, [
    session,
    sessionLoaded,
    setClerkSession,
    setLoading,
    setUnauthenticated,
    user,
    userLoaded,
  ])

  return <>{children}</>
}
