import { createClient } from "@supabase/supabase-js"

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ""

export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ""

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes("your-project-id"),
)

// Fallback to placeholder if not configured so createClient does not crash the entire app on load

const safeUrl = isSupabaseConfigured
  ? SUPABASE_URL
  : "https://placeholder.supabase.co"

const safeAnonKey = isSupabaseConfigured
  ? SUPABASE_ANON_KEY
  : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpY3dza2RtYnhic2dkdmlvbXh1dCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzI3MTM3Mzc3LCJleHAiOjIwNDI3MTMzNzcsIn0.mO5sXh58hL0O6v3o0t0V-1Hj1G_eBq60Q_q0B2H3c20"

export const supabase = createClient(safeUrl, safeAnonKey, {
  auth: {
    persistSession: true,

    autoRefreshToken: true,

    detectSessionInUrl: true,

    flowType: "pkce",

    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
})

// Helper to check domain constraint

export function isValidGveEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@gve-group.com")
}
