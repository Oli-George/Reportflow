import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://jpmssqpnzwejhrcycopu.supabase.co'
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_kPh4ie_d2FCNSAqevWr7og_ZsZpNoUt'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
})

// Helper to check domain constraint
export function isValidGveEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@gve-group.com')
}
