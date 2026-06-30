'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormError } from '@/components/ui/form-error'
import { Spinner } from '@/components/ui/spinner'

export function SignupForm() {
  const router = useRouter()
  const { signUp, loading, error, clearError } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const validateForm = (): boolean => {
    // Clear previous errors on form re-submission
    setPasswordError('')
    clearError()

    // Validate password length
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return false
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return false
    }

    return true
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Validate form and clear errors on re-submission
    if (!validateForm()) {
      return
    }

    await signUp(email, password)
    
    // Check if signup was successful (no error means success)
    const currentError = useAuthStore.getState().error
    if (!currentError) {
      // Redirect to email verification page with email in URL
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 p-4 sm:p-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold">Create an account</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Enter your details to get started with LexInsights
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            required
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-auth-error' : undefined}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            required
            aria-invalid={!!passwordError || !!error}
            aria-describedby={[
              passwordError ? 'signup-password-error' : null,
              error ? 'signup-auth-error' : null,
            ].filter(Boolean).join(' ') || undefined}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            required
            aria-invalid={!!passwordError || !!error}
            aria-describedby={[
              passwordError ? 'signup-password-error' : null,
              error ? 'signup-auth-error' : null,
            ].filter(Boolean).join(' ') || undefined}
          />
        </div>

        {/* Display validation errors with enhanced styling */}
        <FormError id="signup-password-error" message={passwordError} />

        {/* Display auth store errors with enhanced styling */}
        <FormError id="signup-auth-error" message={error || ''} />

        <Button
          type="submit"
          className="w-full min-h-[44px] text-base"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" />
              Creating account...
            </span>
          ) : (
            'Sign up'
          )}
        </Button>
      </form>

      <div className="text-center text-sm sm:text-base">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="text-primary hover:underline font-medium min-h-[44px] inline-flex items-center"
        >
          Log in
        </Link>
      </div>
    </div>
  )
}
