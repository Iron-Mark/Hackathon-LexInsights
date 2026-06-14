'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import type { AuthError as SupabaseAuthError, Session } from '@supabase/supabase-js'
import { clearPrivateClientState } from './private-client-state'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
}

// Error mapping function to convert Supabase errors to user-friendly messages
const mapSupabaseError = (error: SupabaseAuthError | Error | unknown): string => {
  const errorMessage = error instanceof Error ? error.message : ''
  const normalizedMessage = errorMessage.toLowerCase()
  
  // Handle specific Supabase error messages
  if (errorMessage.includes('Invalid login credentials')) {
    return 'Invalid email or password'
  }
  
  if (errorMessage.includes('User already registered')) {
    return 'Email already exists'
  }
  
  if (errorMessage.includes('Password should be at least 6 characters')) {
    return 'Password must be at least 6 characters'
  }
  
  // Handle network errors
  if (normalizedMessage.includes('failed to fetch') ||
      normalizedMessage.includes('fetch failed') ||
      normalizedMessage.includes('network')) {
    return 'Connection failed. Please try again.'
  }
  
  // Generic fallback
  return 'An error occurred. Please try again.'
}

const INCOMPLETE_AUTH_RESPONSE_MESSAGE = 'Authentication response was incomplete. Please try again.'

function toUser(value: Session['user'] | null | undefined): User | null {
  if (!value?.id || !value.email) {
    return null
  }

  return {
    id: value.id,
    email: value.email,
    full_name: value.user_metadata?.full_name,
    avatar_url: value.user_metadata?.avatar_url,
    created_at: value.created_at,
    email_confirmed_at: value.email_confirmed_at,
    user_metadata: value.user_metadata,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        set({ 
          error: mapSupabaseError(error), 
          loading: false 
        })
        return
      }
      
      const user = toUser(data.user)

      if (!user || !data.session) {
        set({
          user: null,
          session: null,
          error: INCOMPLETE_AUTH_RESPONSE_MESSAGE,
          loading: false,
        })
        return
      }
      
      set({ 
        user, 
        session: data.session, 
        loading: false, 
        error: null 
      })
    } catch (error: unknown) {
      set({ 
        error: mapSupabaseError(error), 
        loading: false 
      })
    }
  },

  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null })
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        set({ 
          error: mapSupabaseError(error), 
          loading: false 
        })
        return
      }
      
      const user = toUser(data.user)

      if (!user) {
        set({
          user: null,
          session: null,
          error: INCOMPLETE_AUTH_RESPONSE_MESSAGE,
          loading: false,
        })
        return
      }
      
      set({ 
        user, 
        session: data.session, 
        loading: false, 
        error: null 
      })
    } catch (error: unknown) {
      set({ 
        error: mapSupabaseError(error), 
        loading: false 
      })
    }
  },

  signOut: async () => {
    set({ loading: true, error: null })
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        set({ 
          error: mapSupabaseError(error), 
          loading: false 
        })
        return
      }

      clearPrivateClientState()

      set({ 
        user: null, 
        session: null, 
        loading: false, 
        error: null 
      })
    } catch (error: unknown) {
      set({ 
        error: mapSupabaseError(error), 
        loading: false 
      })
    }
  },

  checkSession: async () => {
    set({ loading: true, error: null })
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        set({ 
          user: null, 
          session: null, 
          loading: false, 
          error: null 
        })
        return
      }
      
      if (data.session) {
        const user = toUser(data.session.user)

        if (!user) {
          set({
            user: null,
            session: null,
            loading: false,
            error: null,
          })
          return
        }
        
        set({ 
          user, 
          session: data.session, 
          loading: false, 
          error: null 
        })
      } else {
        set({ 
          user: null, 
          session: null, 
          loading: false, 
          error: null 
        })
      }
    } catch {
      set({ 
        user: null, 
        session: null, 
        loading: false, 
        error: null 
      })
    }
  },

  clearError: () => {
    set({ error: null })
  },
}))
