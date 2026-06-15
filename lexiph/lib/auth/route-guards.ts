'use client'

import type { User } from '@/types'

interface ProtectedRouteAccessResult {
  allowed: boolean
  redirectTo?: string
}

export async function verifyProtectedRouteAccess(user: User | null): Promise<ProtectedRouteAccessResult> {
  if (!user) {
    return {
      allowed: false,
      redirectTo: '/auth/login',
    }
  }

  return { allowed: true }
}
