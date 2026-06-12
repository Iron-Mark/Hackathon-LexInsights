import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Singleton instance to avoid multiple clients
let supabaseInstance: ReturnType<typeof createSupabaseClient> | null = null

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.'
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}

// Create a singleton Supabase client instance
export function createClient() {
  if (!supabaseInstance) {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig()

    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return supabaseInstance
}
