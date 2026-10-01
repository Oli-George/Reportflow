# Implementation Plan: Resolving Super Admin Sign-In (`info@gve-group.com`)

## Overview & Root Cause Analysis

In ReportFlow, the Super Administrator is defined as **`info@gve-group.com`**.
Our live inspection revealed four distinct blockers preventing sign-in:

1. **Supabase Auth Credential Lockout**:
   - `info@gve-group.com` already exists in `auth.users`, but Supabase rejects sign-in with `Invalid login credentials`.
   - The password is unknown/mismatched or the email is unconfirmed (`Confirm email: ON`).
   - "Forgot Password" triggers `status 500: AuthRetryableFetchError: Error sending recovery email` because custom SMTP (Resend) is not yet enabled on the Supabase project.
2. **Missing Database Record in `public.members`**:
   - The live `public.members` table only contains two records (`george.olisakwe@...` and `golisakwe@...`). `info@gve-group.com` is missing from `public.members`.
3. **Frontend Registration Flaw**:
   - The "Administrator" tab has no "Create Account" option.
   - If registered through the "Staff Portal", `App.tsx` hardcodes `is_admin: false`, demoting the account and triggering RLS trigger exceptions.
4. **Mobile & Offline Barriers**:
   - On screens `< 768px`, `App.tsx` forcibly hides the Admin tab and resets `loginRole` to `"staff"`.
   - The Staff portal has offline/development password bypasses (`gve2026`, `password123`, `admin123`), but the Administrator portal has zero fallback, failing immediately if Supabase is offline or credentials are out of sync.

---

## Proposed Changes

### Phase 1: Supabase Configuration & Database Seed (Cloud)

#### Task 1.1: Reset Super Admin Password & Auto-Confirm in Supabase Dashboard
- Navigate to **Supabase Dashboard ➔ Authentication ➔ Users**.
- Locate `info@gve-group.com`.
- If status is `Unconfirmed`, manually confirm the user.
- Reset the password to a known strong password (e.g. `GVEadmin2026!`).
- *(Optional)* In **Authentication ➔ Providers ➔ Email**, toggle off **"Confirm email"** to prevent future signup lockouts if SMTP is unconfigured.

#### Task 1.2: Seed `public.members` with Super Admin Record
Execute the following SQL in **Supabase Dashboard ➔ SQL Editor**:
```sql
INSERT INTO public.members (name, email, role, department, compliance, initials, color, is_admin)
VALUES ('GVE Operations Lead', 'info@gve-group.com', 'Super Administrator', 'Management', 100, 'GV', '#005030', true)
ON CONFLICT (email) DO UPDATE SET 
    is_admin = true, 
    role = 'Super Administrator',
    department = 'Management';
```

---

### Phase 2: Frontend Resiliency & Authentication Upgrades (`src/App.tsx`)

#### Task 2.1: Add Super Admin Safe Handling in Staff Registration
- In `src/App.tsx` during `authMode === "signup"`:
  - If `cleanEmail === "info@gve-group.com"`, set `is_admin: true` and `role: "Super Administrator"`.
  - Prevent overriding existing admin status on upsert.

#### Task 2.2: Add Dev/Offline Fallback for Administrator Sign-In
- Mirror the Staff fallback in `loginRole === "admin"`:
  - If `import.meta.env.DEV` and `!navigator.onLine` (or if Supabase returns credential failure in local development), allow logging in with standard demo development passwords (`gve2026`, `admin123`, `password123`).
  - Provide a clear banner when running in development demo session.

#### Task 2.3: Unlock Administrator Sign-In on Mobile Viewports
- Remove the artificial restriction in `src/App.tsx`:
  - Allow the role switcher (`Staff Portal` vs `Administrator`) on mobile screens.
  - Since `AdminView.tsx` already has mobile responsive drawer/sidebar logic, administrators should not be locked out on phones or tablets.

#### Task 2.4: Actionable Error Messages for Admin Sign-In Failures
- If `cleanEmail === "info@gve-group.com"` fails authentication:
  - Show a specific, helpful error message explaining that the password may need to be reset in Supabase Dashboard or verified against unconfirmed email policies.

---

### Phase 3: Setup Helper Script

#### Task 3.1: Create `scripts/check-admin-auth.mjs`
- Create a lightweight diagnostic script using `@supabase/supabase-js` that verifies:
  1. Connection to Supabase URL and anon key.
  2. Presence of `info@gve-group.com` in `public.members`.
  3. Clear diagnostic output for developers.

---

## Verification Plan

### Automated / Diagnostic Verification
1. Run `node scripts/check-admin-auth.mjs` to confirm `public.members` row exists and is valid.
2. Run TypeScript build check (`pnpm run build` or `npx tsc --noEmit`) to verify no syntax or type regressions.

### Manual Verification
1. **Desktop Admin Sign-In**:
   - Open ReportFlow in the browser.
   - Switch to **Administrator** tab.
   - Enter `info@gve-group.com` and password.
   - Confirm successful sign-in into `AdminView` with full Super Admin banner visible ("Logged in as Parent Administrator").
2. **Mobile Viewport Test**:
   - Resize browser to 400px (mobile width).
   - Verify that the Administrator option remains selectable and usable.
3. **Staff vs Admin Differentiation**:
   - Verify that non-admin accounts cannot access Admin mode.
   - Verify Super Admin can view team members and manage privileges.
