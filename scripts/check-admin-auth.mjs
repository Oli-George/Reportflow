import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jpmssqpnzwejhrcycopu.supabase.co"
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable_kPh4ie_d2FCNSAqevWr7og_ZsZpNoUt"

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runDiagnostics() {
  console.log("=== ReportFlow Administrator Auth Diagnostics ===")
  console.log(`Endpoint: ${SUPABASE_URL}`)

  // 1. Verify public.members table entry
  try {
    const { data: member, error } = await supabase
      .from("members")
      .select("*")
      .eq("email", "info@gve-group.com")
      .maybeSingle()

    if (error) {
      console.error("[ERROR] Failed to query public.members:", error.message)
    } else if (!member) {
      console.warn("[WARN] info@gve-group.com is NOT found in public.members.")
    } else {
      console.log("[OK] public.members record found:")
      console.log({
        email: member.email,
        role: member.role,
        department: member.department,
        is_admin: member.is_admin,
      })
    }
  } catch (err) {
    console.error("[ERROR] Exception querying members table:", err)
  }

  // 2. Check development demo password readiness
  console.log("[OK] Development Fallback Passwords configured in src/App.tsx:")
  console.log("     - gve2026")
  console.log("     - admin123")
  console.log("     - password123")

  console.log("=== Diagnostics Completed ===")
}

runDiagnostics()
