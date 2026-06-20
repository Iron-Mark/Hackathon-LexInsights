'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormError } from '@/components/ui/form-error'
import { Spinner } from '@/components/ui/spinner'

export function LoginForm() {
  const router = useRouter()
  const { signIn, loading, error, clearError } = useAuthStore()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    // Clear any previous errors on form re-submission
    clearError()

    await signIn(email, password)
    
    // Check if login was successful (no error means success)
    const currentError = useAuthStore.getState().error
    if (!currentError) {
      router.push('/chat')
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 p-4 sm:p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-1 mb-4">
          <div className="shrink-0">
            <Image 
              src="/logo/LOGO-0.5-woBG.svg" 
              alt="LexiPH Logo" 
              width={120}
              height={120}
              priority
            />
          </div>
          <div className="flex flex-col items-start">
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-iris-500 via-purple-600 to-iris-700 animate-gradient bg-clip-text text-transparent">
              LexInSight
            </h1>
            <p className="text-sm sm:text-base font-medium bg-linear-to-r from-iris-400 via-purple-500 to-iris-600 animate-gradient bg-clip-text text-transparent">
              Legal compliance assistant
            </p>
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-bold">Welcome back</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Enter your credentials to access your account
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Please enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            required
            aria-invalid={!!error}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="current-password"
            required
            aria-invalid={!!error}
          />
        </div>

        {/* Display auth store errors with enhanced styling */}
        <FormError message={error || ''} />

        <Button
          type="submit"
          className="w-full min-h-[44px] text-base"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" />
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <div className="text-center text-sm sm:text-base">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="text-primary hover:underline font-medium min-h-[44px] inline-flex items-center"
        >
          Sign up
        </Link>
      </div>
    </div>
  )
}
