'use client'

import { create } from 'zustand'
import { User } from '@/types'
import { clearPrivateClientState } from './private-client-state'

interface ClerkSessionSnapshot {
  id: string
  userId: string
}

interface AuthState {
  user: User | null
  session: ClerkSessionSnapshot | null
  loading: boolean
  error: string | null

  signIn: (email?: string, password?: string) => Promise<void>
  signUp: (email?: string, password?: string) => Promise<void>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  setClerkSession: (user: User, session: ClerkSessionSnapshot | null) => void
  setUnauthenticated: () => void
  setSignOutHandler: (handler: (() => Promise<void>) | null) => void
}

let clerkSignOut: (() => Promise<void>) | null = null

function redirectTo(path: string) {
  if (typeof window !== 'undefined') {
    window.location.assign(path)
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
  error: null,

  signIn: async () => {
    redirectTo('/auth/login')
  },

  signUp: async () => {
    redirectTo('/auth/signup')
  },

  signOut: async () => {
    set({ loading: true, error: null })

    try {
      if (clerkSignOut) {
        await clerkSignOut()
      }

      clearPrivateClientState()
      set({
        user: null,
        session: null,
        loading: false,
        error: null,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sign out.',
        loading: false,
      })
    }
  },

  checkSession: async () => {
    set((state) => ({ loading: state.loading }))
  },

  clearError: () => {
    set({ error: null })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setClerkSession: (user: User, session: ClerkSessionSnapshot | null) => {
    set({
      user,
      session,
      loading: false,
      error: null,
    })
  },

  setUnauthenticated: () => {
    clearPrivateClientState()
    set({
      user: null,
      session: null,
      loading: false,
      error: null,
    })
  },

  setSignOutHandler: (handler: (() => Promise<void>) | null) => {
    clerkSignOut = handler
  },
}))
