'use client'

import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types'

interface ProtectedRouteAccessResult {
  allowed: boolean
  redirectTo?: string
}

export async function verifyProtectedRouteAccess(user: User): Promise<ProtectedRouteAccessResult> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.getUser()

    if (error || !data.user) {
      if (error) {
        console.error('Failed to verify Supabase user:', error)
      }

      return {
        allowed: false,
        redirectTo: '/auth/login',
      }
    }

    if (!data.user.email_confirmed_at) {
      return {
        allowed: false,
        redirectTo: `/auth/verify-email?email=${encodeURIComponent(user.email)}`,
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Failed to verify chat access:', error)

    return {
      allowed: false,
      redirectTo: '/auth/login',
    }
  }
}
