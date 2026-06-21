import { createClient as createSupabaseClient } from '@supabase/supabase-js'

type SupabaseClient = ReturnType<typeof createSupabaseClient>
type AccessTokenGetter = () => Promise<string | null>

let supabaseInstance: SupabaseClient | null = null
let accessTokenGetter: AccessTokenGetter = async () => null

export function setSupabaseAccessTokenGetter(getter: AccessTokenGetter | null) {
  accessTokenGetter = getter || (async () => null)
}

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.'
    )
  }

  return { supabaseUrl, supabaseKey }
}

export function createClient() {
  if (!supabaseInstance) {
    const { supabaseUrl, supabaseKey } = getSupabaseConfig()

    supabaseInstance = createSupabaseClient(supabaseUrl, supabaseKey, {
      async accessToken() {
        return accessTokenGetter()
      },
    })
  }

  return supabaseInstance
}
