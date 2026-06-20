'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { verifyProtectedRouteAccess } from '@/lib/auth/route-guards'
import { useAuthStore } from '@/lib/store/auth-store'

export function useProtectedRoute() {
  const router = useRouter()
  const { user, loading } = useAuthStore()
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkAccess = async () => {
      if (loading) {
        return
      }

      if (!user) {
        setRedirecting(true)
        router.push('/auth/login')
        return
      }

      const access = await verifyProtectedRouteAccess(user)

      if (cancelled) {
        return
      }

      if (!access.allowed) {
        setRedirecting(true)
        router.push(access.redirectTo || '/auth/login')
        return
      }

      setRedirecting(false)
      setCheckingAccess(false)
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [user, loading, router])

  return {
    user,
    loading,
    checkingAccess,
    redirecting,
    isAuthorized: Boolean(user) && !loading && !checkingAccess && !redirecting,
  }
}
