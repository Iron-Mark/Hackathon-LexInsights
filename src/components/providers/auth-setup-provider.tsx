'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ClerkSetupKey } from '@/lib/auth/clerk-config'

interface AuthSetupContextValue {
  clerkConfigured: boolean
  clerkClientConfigured: boolean
  missingClerkKeys: ClerkSetupKey[]
}

const defaultAuthSetup: AuthSetupContextValue = {
  clerkConfigured: false,
  clerkClientConfigured: false,
  missingClerkKeys: [],
}

const AuthSetupContext = createContext<AuthSetupContextValue>(defaultAuthSetup)

interface AuthSetupProviderProps {
  children: ReactNode
  value: AuthSetupContextValue
}

export function AuthSetupProvider({ children, value }: AuthSetupProviderProps) {
  return (
    <AuthSetupContext.Provider value={value}>
      {children}
    </AuthSetupContext.Provider>
  )
}

export function useAuthSetup() {
  return useContext(AuthSetupContext)
}
