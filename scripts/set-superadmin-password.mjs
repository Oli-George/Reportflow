import { createClient } from "@supabase/supabase-js"

/**
 * Script: Provision or Reset Super Admin Password in Supabase Auth
 * 
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key" node scripts/set-superadmin-password.mjs "YourSecurePassword123!"
 * 
 * Note: Never commit your service role key to git. Run this once in terminal.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://jpmssqpnzwejhrcycopu.supabase.co"
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const targetEmail = "info@gve-group.com"
const newPassword = process.argv[2] || process.env.NEW_ADMIN_PASSWORD

if (!SERVICE_ROLE_KEY) {
  console.error("\n[ERROR] SUPABASE_SERVICE_ROLE_KEY environment variable is required.")
  console.error("Retrieve it from Supabase Dashboard -> Project Settings -> API -> service_role (secret).\n")
  console.error("Example:")
  console.error('  $env:SUPABASE_SERVICE_ROLE_KEY="eyJh..." ; node scripts/set-superadmin-password.mjs "MyNewPassword2026!"\n')
  process.exit(1)
}

if (!newPassword || newPassword.length < 8) {
  console.error("\n[ERROR] Please provide a secure password with at least 8 characters.")
  console.error('Example: node scripts/set-superadmin-password.mjs "GVEoperations2026!"\n')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function provisionSuperAdmin() {
  console.log(`\nConnecting to Supabase at: ${SUPABASE_URL}`)
  console.log(`Setting password and confirming email for: ${targetEmail}...`)

  // 1. Check if user exists in auth.users
  const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers()
  if (listErr) {
    console.error("[ERROR] Failed to list users with service role key:", listErr.message)
    process.exit(1)
  }

  const existingUser = usersData.users.find(
    (u) => u.email?.toLowerCase() === targetEmail.toLowerCase()
  )

  let userId = existingUser?.id

  if (existingUser) {
    console.log(`Found existing auth record (ID: ${userId}). Updating password and confirming email...`)
    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true,
      user_metadata: { role: "Super Administrator", full_name: "GVE Operations Lead" },
    })

    if (updateErr) {
      console.error("[ERROR] Failed to update user:", updateErr.message)
      process.exit(1)
    }
  } else {
    console.log(`User not found in auth.users. Creating new confirmed admin account...`)
    const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: newPassword,
      email_confirm: true,
      user_metadata: { role: "Super Administrator", full_name: "GVE Operations Lead" },
    })

    if (createErr) {
      console.error("[ERROR] Failed to create user:", createErr.message)
      process.exit(1)
    }
    userId = createData.user.id
  }

  // 2. Ensure public.members row is also in sync
  const { error: memberErr } = await supabase.from("members").upsert({
    name: "GVE Operations Lead",
    email: targetEmail,
    role: "Super Administrator",
    department: "Management",
    compliance: 100,
    initials: "GV",
    color: "#005030",
    is_admin: true,
  })

  if (memberErr) {
    console.warn("[WARN] Could not update public.members:", memberErr.message)
  } else {
    console.log("[OK] public.members record synchronized.")
  }

  console.log(`\n=== SUCCESS: Super Admin Account is Ready for Production ===`)
  console.log(`Email:    ${targetEmail}`)
  console.log(`Status:   Confirmed & Verified`)
  console.log(`Role:     Super Administrator (is_admin: true)`)
  console.log(`You can now sign in at the Administrator tab using the password you set.\n`)
}

provisionSuperAdmin()
