import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

/**
 * Ortam değişkenleri tanımlıysa Supabase istemcisi döner; yoksa `null` (yalnızca yerel mod).
 * @see supabase/migrations — şema ve RLS
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (cached !== undefined) return cached

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
  if (!url?.trim() || !anon?.trim()) {
    cached = null
    return null
  }

  cached = createClient(url.trim(), anon.trim(), {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })
  return cached
}

export function isCloudTeamMode(): boolean {
  return getSupabaseClient() !== null
}
