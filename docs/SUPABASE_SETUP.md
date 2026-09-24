# ReportFlow — Supabase & Resend SMTP Configuration Guide

Follow these steps in your [Supabase Dashboard](https://supabase.com/dashboard) to configure authentication, your live hosting URLs, and the **Resend SMTP email service** for password resets.

---

## 1. Authentication & URL Configuration

When you host ReportFlow on Vercel, Netlify, or Cloudflare Pages, update Supabase so it knows where to redirect users after clicking password reset or magic links:

1. In Supabase Dashboard, go to **Authentication ➔ URL Configuration**.
2. **Site URL**:
   Set this to your production domain:
   ```
   https://your-app-name.vercel.app
   ```
   _(or your custom domain, e.g. `https://reportflow.gve-group.com`)_
3. **Redirect URLs (Whitelist)**:
   Add these URLs to allow redirect callbacks from development and production:
   ```
   https://your-app-name.vercel.app/**
   http://localhost:8443/**
   http://localhost:5173/**
   ```
4. Click **Save**.

---

## 2. Setting Up Resend for SMTP Delivery

By default, Supabase's built-in email service is rate-limited to 3–4 emails per hour and often gets flagged by corporate spam filters (like `@gve-group.com`). Connecting **Resend** guarantees reliable inbox delivery.

### Step 2.1: Get your Resend API Key

1. Sign in to [Resend.com](https://resend.com).
2. Go to **API Keys ➔ Create API Key**.
3. Name it `Supabase SMTP` and copy the key (starts with `re_...`).
4. In Resend, go to **Domains** and verify your sending domain (e.g. `gve-group.com` or a subdomain like `mail.gve-group.com`).

### Step 2.2: Configure SMTP in Supabase

1. In Supabase Dashboard, go to **Project Settings ➔ Authentication ➔ SMTP Settings** (or **Authentication ➔ Email ➔ SMTP Settings**).
2. Toggle **Enable Custom SMTP** to **ON**.
3. Fill in the fields:
   - **Sender Email**: `support@gve-group.com` _(or `noreply@your-verified-domain.com`)_
   - **Sender Name**: `ReportFlow Operations`
   - **Host**: `smtp.resend.com`
   - **Port**: `465` (or `587`)
   - **Encryption**: `SSL/TLS` (if port 465) or `STARTTLS` (if port 587)
   - **Username**: `resend`
   - **Password**: `re_123456789...` _(Your Resend API Key)_
4. Click **Save changes**.

---

## 3. Customizing the Password Reset Email Template

1. In Supabase Dashboard, go to **Authentication ➔ Email Templates ➔ Reset Password**.
2. **Subject**:
   ```
   Reset your ReportFlow account password
   ```
3. **Body (HTML Template)**:
   Paste this responsive, dark-green branded HTML template matching ReportFlow:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset ReportFlow Password</title>
  </head>
  <body
    style="margin: 0; padding: 0; background-color: #080f0b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #e8f0eb;"
  >
    <table
      role="presentation"
      width="100%"
      cellspacing="0"
      cellpadding="0"
      style="background-color: #080f0b; padding: 40px 16px;"
    >
      <tr>
        <td align="center">
          <table
            role="presentation"
            width="100%"
            style="max-width: 520px; background-color: #0e1a13; border: 1px solid #1e3028; border-radius: 12px; overflow: hidden; padding: 32px 28px; text-align: left;"
          >
            <!-- Header -->
            <tr>
              <td
                style="padding-bottom: 24px; border-bottom: 1px solid #1e3028;"
              >
                <div
                  style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;"
                >
                  <span style="color: #00754a;">Report</span>Flow
                </div>
                <div
                  style="font-size: 11px; font-family: monospace; text-transform: uppercase; letter-spacing: 1px; color: #8aab96; margin-top: 4px;"
                >
                  GVE Group Operational Network
                </div>
              </td>
            </tr>
            <!-- Body Content -->
            <tr>
              <td style="padding-top: 24px; padding-bottom: 28px;">
                <h1
                  style="font-size: 18px; font-weight: 600; color: #ffffff; margin: 0 0 12px 0;"
                >
                  Password Reset Request
                </h1>
                <p
                  style="font-size: 14px; line-height: 22px; color: #8aab96; margin: 0 0 20px 0;"
                >
                  A request has been received to reset the password for your
                  ReportFlow field engineering account. Click the button below
                  to set a new password:
                </p>
                <!-- Action Button -->
                <table
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  style="margin: 24px 0;"
                >
                  <tr>
                    <td
                      align="center"
                      style="border-radius: 8px; background-color: #005030;"
                    >
                      <a
                        href="{{ .ConfirmationURL }}"
                        target="_blank"
                        style="display: inline-block; padding: 12px 28px; font-family: monospace; font-size: 13px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 8px; background-color: #005030; border: 1px solid #00754a;"
                      >
                        Reset Account Password &rarr;
                      </a>
                    </td>
                  </tr>
                </table>
                <p
                  style="font-size: 12px; line-height: 18px; color: #8aab96; margin: 0;"
                >
                  If you did not request a password reset, you can safely ignore
                  this email. This link will expire in 24 hours.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td
                style="border-top: 1px solid #1e3028; padding-top: 20px; font-size: 11px; font-family: monospace; color: #5a7b66;"
              >
                GVE Projects Ltd &bull; Mini-Grid Operational Compliance &bull;
                Automated System Notice
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

4. Click **Save**.

---

## 4. Create the Storage Bucket for Report Attachments

ReportFlow uploads watermarked audit photos to Supabase Storage. You must create the bucket in your Supabase Dashboard:

1. In Supabase Dashboard, go to **Storage ➔ Buckets** (left navigation).
2. Click **New bucket**.
3. **Bucket Name**: `report-attachments` (exact match).
4. **Public bucket**: Toggle **ON** (allows inspection photos to be displayed in browser reports and PDF export).
5. Click **Save bucket**.

---

## 5. Run the Database Schema in SQL Editor

If you haven't already updated the Row Level Security (RLS) policies and storage permissions:

1. Go to **Supabase Dashboard ➔ SQL Editor ➔ New query**.
2. Open [`supabase/schema.sql`](file:///c:/Users/USER/OneDrive/Desktop/ReportFlow/supabase/schema.sql) in this repository.
3. Copy its contents and paste them into the SQL Editor.
4. Click **Run**.

---

## 6. Parent Administrator Model (`info@gve-group.com`)

ReportFlow uses a two-tier administrative hierarchy:

1. **Parent Administrator (`info@gve-group.com`)**:
   - The primary supervisory account for GVE Operations.
   - **Exclusively authorized** to promote normal field staff to administrators or revoke administrative privileges.
   - Guarded by the database trigger `trg_admin_promotion` which rejects unauthorized promotion attempts even if invoked via API or client code.

2. **Operational Administrators**:
   - Promoted staff members (e.g. Area Managers, Operations Leads).
   - Can approve/flag reports, set deadlines, inspect telemetry, and manage field submissions.
   - Cannot promote or demote other staff accounts.

To ensure your initial Parent Admin user exists in Supabase Auth, register `info@gve-group.com` through the ReportFlow sign-up interface or invite them in **Supabase Dashboard ➔ Authentication ➔ Users**.
