'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import { createClient } from '@/lib/supabase/client'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const { user } = useAuthStore()
  
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const checkEmailVerification = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    if (data.user?.email_confirmed_at) {
      router.push('/chat')
    }
  }, [router])

  useEffect(() => {
    // If user is already verified, redirect to chat
    if (user?.email) {
      checkEmailVerification()
    }
  }, [user, checkEmailVerification])

  const handleResendEmail = async () => {
    if (!email) return
    
    setResending(true)
    setError('')
    setResent(false)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) {
        setError('Failed to resend email. Please try again.')
      } else {
        setResent(true)
        setTimeout(() => setResent(false), 5000)
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-blue-100 p-4 rounded-full">
              <Mail className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold">Check your email</h1>
          
          <p className="text-muted-foreground">
            We&apos;ve sent a verification link to:
          </p>
          
          <p className="font-semibold text-lg">
            {email || user?.email || 'your email'}
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-left space-y-2">
            <p className="font-medium text-blue-900">Next steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800">
              <li>Open the email from LexInSight</li>
              <li>Click the verification link</li>
              <li>You&apos;ll be redirected to the chat page</li>
            </ol>
          </div>

          {resent && (
            <div className="flex items-center justify-center gap-2 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="h-4 w-4" />
              <span>Verification email sent!</span>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleResendEmail}
            disabled={resending}
            variant="outline"
            className="w-full"
          >
            {resending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Resend verification email'
            )}
          </Button>

          <Button
            onClick={() => router.push('/auth/login')}
            variant="ghost"
            className="w-full"
          >
            Back to login
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Didn&apos;t receive the email? Check your spam folder or click resend.
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
