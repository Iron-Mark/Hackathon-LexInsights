'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error during callback:', error)
          router.push('/auth/login?error=verification_failed')
          return
        }

        if (data.session) {
          // Email verified successfully, redirect to chat
          router.push('/chat')
        } else {
          // No session, redirect to login
          router.push('/auth/login')
        }
      } catch (err) {
        console.error('Callback error:', err)
        router.push('/auth/login?error=verification_failed')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
        <h2 className="text-xl font-semibold">Verifying your email...</h2>
        <p className="text-muted-foreground">Please wait while we confirm your account.</p>
      </div>
    </div>
  )
}
