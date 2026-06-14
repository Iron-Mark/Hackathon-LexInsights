'use client'

import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { User } from '@/types'
import type { AuthError as SupabaseAuthError, Session } from '@supabase/supabase-js'

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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: false,
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
      
      // Map Supabase user to our User type
      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        full_name: data.user.user_metadata?.full_name,
        avatar_url: data.user.user_metadata?.avatar_url,
        created_at: data.user.created_at,
        email_confirmed_at: data.user.email_confirmed_at,
        user_metadata: data.user.user_metadata,
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
      
      // Map Supabase user to our User type
      const user: User = {
        id: data.user!.id,
        email: data.user!.email!,
        full_name: data.user!.user_metadata?.full_name,
        avatar_url: data.user!.user_metadata?.avatar_url,
        created_at: data.user!.created_at,
        email_confirmed_at: data.user!.email_confirmed_at,
        user_metadata: data.user!.user_metadata,
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
        // Map Supabase user to our User type
        const user: User = {
          id: data.session.user.id,
          email: data.session.user.email!,
          full_name: data.session.user.user_metadata?.full_name,
          avatar_url: data.session.user.user_metadata?.avatar_url,
          created_at: data.session.user.created_at,
          email_confirmed_at: data.session.user.email_confirmed_at,
          user_metadata: data.session.user.user_metadata,
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
