# ReportFlow: End-to-End Manual Testing & QA Guide

This guide provides a comprehensive, step-by-step checklist to test every feature, workflow, and edge case in **ReportFlow**.

---

## Pre-Flight Setup & Test Environment

### 1. Launch the Application
The Vite development server is running locally:
* **Local URL**: `http://localhost:8443` (or the port specified in your terminal / preview pane).
* Open Google Chrome or Microsoft Edge.
* Open **Developer Tools** (`F12` or `Ctrl + Shift + I` on Windows).

### 2. Configure DevTools for Testing
* **Console Tab**: Keep this visible to monitor network sync logs and Supabase channel messages.
* **Network Tab**: Used to simulate **Offline**, **Slow 3G**, and **Online** states.
* **Application Tab**:
  * Expand **Local storage** (`http://localhost:8443`) to inspect cached sessions, queues, and deadlines.
  * Expand **IndexedDB** (`reportflow_offline_db` and `localforage`) to verify full offline media and report blobs.
  * Click **Service Workers** to verify PWA offline caching.

### 3. Test Credentials Reference
| Role | Email | Password (Dev Demo) | Purpose |
| :--- | :--- | :--- | :--- |
| **Super Administrator** | `info@gve-group.com` | `gve2026` or Supabase password | Full system control, approvals, member admin promotion |
| **Field Engineer (Staff)** | `george.olisakwe@gve-group.com` | `gve2026` | Creating daily hourly logs, offline sync testing |
| **Site Technician (Staff)** | `chinedu.okafor@gve-group.com` | `gve2026` | Weekly reports, quarterly maintenance testing |
| **Unauthorized External** | `user@gmail.com` | Any | Domain security validation |

---

## Test Track 1: Authentication & Access Control

### Test 1.1: GVE Corporate Domain Enforcement
1. Navigate to the login screen.
2. Select **Staff Portal**.
3. Enter `contractor@gmail.com` and password `password123`.
4. Click **Sign In**.
* **What to look for**:
  * [Pass]: Red error notice appears: *"Authentication failed: Only official @gve-group.com email addresses are authorized to access ReportFlow."*
  * [Pass]: No session is written to `localStorage`.
  * [Fail]: User is logged in or receives a generic unhelpful network error.

---

### Test 1.2: Staff Portal Sign-In & Session Persistence
1. Select **Staff Portal** tab.
2. Enter `george.olisakwe@gve-group.com` and password `gve2026`.
3. Click **Sign In**.
4. Check top navbar and sidebar.
5. Press `F5` / Refresh the page.
* **What to look for**:
  * [Pass]: Redirects immediately to **StaffView** ("My Portal").
  * [Pass]: Top navbar shows technician name ("George Olisakwe"), department ("Engineering"), and a solid green `[Connected]` status badge.
  * [Pass]: Refreshing the page does NOT log the user out (session restored from cache and validated).
  * [Pass]: In DevTools **Application > Local Storage**, `reportflow_user_session` exists and has `role: "staff"`.

---

### Test 1.3: Super Admin Sign-In & Privilege Escalation
1. Click the **Log Out** icon in the sidebar.
2. Select the **Administrator** tab.
3. Enter `info@gve-group.com` and password `gve2026`.
4. Click **Sign In as Administrator**.
* **What to look for**:
  * [Pass]: Opens **AdminView** with full navigation (Dashboard, Reports, Teams, Analytics).
  * [Pass]: Super Administrator banner or badge indicates parent admin privileges.
  * [Pass]: Top navbar displays `[Connected]` indicator.
  * [Fail]: Redirected to Staff Portal or receives demotion warning.

---

### Test 1.4: Mobile Viewport Adaptive Guard
1. In DevTools, toggle Device Toolbar (`Ctrl + Shift + M`) and select **iPhone 14** (width ~390px).
2. Log out and return to the login screen.
* **What to look for**:
  * [Pass]: The UI adapts gracefully without horizontal scrollbars.
  * [Pass]: If in mobile mode, switching tabs or forms is accessible with clear mobile touch targets ($\ge 44\text{px}$).

---

## Test Track 2: Field Operations & Form Submissions (Staff Portal)

Log in as a staff member (e.g. `george.olisakwe@gve-group.com`).

### Test 2.1: GVE Daily Hourly Log (Telemetry & Auto-Calculations)
1. In the sidebar, click **Create Report** (or **+**).
2. Select **Daily Report** format.
3. Click **Load GVE Hourly Template**.
4. Fill in:
   * **Site Name**: Type `Kuka Mini-Grid`.
   * **Date**: Select today's date.
   * Verify title auto-generates: `Kuka Mini-Grid Hourly Record — [Date]`.
5. Scroll to the Hourly Telemetry Table:
   * Enter row for `08:00`: Inverter kW: `45`, Battery Voltage: `52.4`, Solar Radiation: `680`.
   * Enter row for `12:00`: Inverter kW: `78`, Battery Voltage: `54.1`, Solar Radiation: `950`.
   * Enter row for `16:00`: Inverter kW: `30`, Battery Voltage: `51.8`, Solar Radiation: `320`.
* **What to look for**:
  * [Pass]: Calculated totals (e.g., Total Daily Yield kWh, Peak Generation) calculate in real-time without NaN or layout shifts.
  * [Pass]: Voltage and power health indicators glow green for normal operational ranges.

---

### Test 2.2: Photo Attachment & Watermarking
1. Scroll to the **Photo Attachments** section in the report form.
2. Upload a sample JPEG/PNG photo of equipment.
3. Add a caption (e.g., "Inverter 1 heat exchanger clean").
* **What to look for**:
  * [Pass]: Image is compressed and displayed in the thumbnail gallery.
  * [Pass]: The image badge displays file size, and the GPS/Timestamp watermark option is selectable.
  * [Pass]: Thumbnail preview renders instantaneously.

---

### Test 2.3: Form Auto-Save & Crash Recovery
1. In the open form, type unique text in **Summary / Key Activities**: `Test recovery: inverter filter replaced at 14:30`.
2. Do **NOT** click Submit.
3. Close the browser tab or hit `F5` (Refresh).
4. Navigate back to **Create Report** / select draft.
* **What to look for**:
  * [Pass]: The form restores the unsubmitted text and hourly table values automatically via `useFormAutoSave`.
  * [Pass]: A subtle notice or toast indicates: *"Restored unsubmitted draft"*.

---

### Test 2.4: Report Submission
1. Click **Submit Report to Management**.
* **What to look for**:
  * [Pass]: Submit button shows loading spinner during network write.
  * [Pass]: Success toast confirms submission.
  * [Pass]: Report appears immediately under **My Reports** with status badge `[Submitted]`.

---

## Test Track 3: The Critical Offline-to-Online Sync Test

This is the most critical resilience test for field technicians operating in remote rural mini-grids.

### Test 3.1: Go Offline
1. In DevTools, switch to the **Network** tab.
2. Click the throttling dropdown (currently "No throttling") and select **Offline**.
* **What to look for**:
  * [Pass]: The top navbar status badge immediately changes from solid green `[Connected]` to amber `[Working Offline]`.
  * [Pass]: If pending reports exist, it shows `$N$ queued`.

---

### Test 3.2: Create and Submit a Report while Completely Offline
1. Click **Create Report**.
2. Title: `Offline Emergency Log - Kuka`.
3. Type: `Daily`.
4. Summary: `Grid operated on generator due to severe cloud cover. Fuel level at 65%.`.
5. Attach a photo if available.
6. Click **Submit Report**.
* **What to look for**:
  * [Pass]: The app does **NOT** throw an unhandled error or freeze.
  * [Pass]: Toast indicates: *"Saved offline. Will automatically sync when reconnected."*
  * [Pass]: The report appears in **My Reports** with status `[Submitted]` and a subtle `[Pending Sync]` tag.
  * [Pass]: The header status pill updates to show `[Working Offline | 1 queued]`.

---

### Test 3.3: Inspect Storage Integrity (Zero Bloat Validation)
1. Open DevTools **Application** tab.
2. Under **Storage > Local Storage > http://localhost:8443**:
   * Inspect key `reportflow_offline_queue`.
   * **Verify**: The queued report JSON is present, but heavy base64 `dataUrl` strings are stripped (`undefined`), preserving the tight 5MB browser limit.
3. Under **Storage > IndexedDB > reportflow_offline_db**:
   * Inspect store `offline_reports`: Full report record exists.
   * Inspect store `offline_attachments`: Full image blob / dataUrl is stored safely.

---

### Test 3.4: Reconnect to Network & Verify Automatic Flush
1. In DevTools **Network** tab, switch from **Offline** back to **No throttling** (Online).
2. Watch the top navbar and DevTools console.
* **What to look for**:
  * [Pass]: Reconnection is detected immediately.
  * [Pass]: Header status pill switches to `[Syncing...]` with an animated pulse.
  * [Pass]: Toast notification appears: *"Offline reports successfully synced to Supabase!"*
  * [Pass]: Header switches to solid green `[Connected]`.
  * [Pass]: In DevTools **Application > Local Storage**, `reportflow_offline_queue` is cleared `[]`.
  * [Pass]: In DevTools **Application > IndexedDB**, the synced report is deleted from `offline_reports`.

---

### Test 3.5: Deduplication & Idempotency Audit
1. Click the report list refresh button or navigate between tabs.
2. Count the entries for `Offline Emergency Log - Kuka`.
* **What to look for**:
  * [Pass]: **Exactly 1 entry exists**.
  * [Pass]: Reconnection did not create duplicate copies (`client_submission_id` upsert ensured strict 1:1 database idempotency).
  * [Fail]: Duplicate rows with identical titles or timestamps appear in the table.

---

## Test Track 4: Administrator Review & Approval Workflows

Log out and log in as Administrator (`info@gve-group.com`).

### Test 4.1: Dashboard Verification & Real-Time Sync
1. Open the **Dashboard** view.
* **What to look for**:
  * [Pass]: **Total Reports**, **Submitted**, and **Flagged** stat cards reflect the actual count of reports.
  * [Pass]: **Team Members** counter reflects actual loaded members (not hardcoded dummy counts).
  * [Pass]: Recent activity stream lists the newly submitted report from Track 3 at the top.

---

### Test 4.2: Reports Table Search & Multi-Filter
1. Click **Reports** in the sidebar.
2. In the search box, type `Kuka`.
   * **Verify**: Only reports containing `Kuka` remain visible. Clear the search.
3. Click the **Submitted** filter chip.
   * **Verify**: Only unapproved submitted reports are shown.
4. Click the **Daily** type filter chip.
   * **Verify**: Only daily reports remain.

---

### Test 4.3: Inspection Drawer & Telemetry View
1. Click on any report row to open the full inspection view.
* **What to look for**:
  * [Pass]: Full replica view renders with site name, author, department, and timestamp.
  * [Pass]: Inverter and battery telemetry tables render with formatted numbers.
  * [Pass]: Attached photos render clearly with click-to-enlarge capabilities.

---

### Test 4.4: Approval Action
1. On a report with status `Submitted`, click **Approve Report**.
* **What to look for**:
  * [Pass]: Status immediately transitions to `[Approved]`.
  * [Pass]: In the Dashboard, the **Approved** counter increments by 1, and the **Submitted** counter decrements by 1.

---

### Test 4.5: Flag for Correction Action (Feedback Loop)
1. Select another report.
2. Click **Flag for Revision**.
3. A modal opens requesting reviewer feedback.
4. Type: `Inverter 1 voltage on hour 12:00 is below 48V. Please re-check battery terminal connections and update log.`
5. Click **Submit Flag & Feedback**.
* **What to look for**:
  * [Pass]: Report status updates to `[Flagged]`.
  * [Pass]: Log in as the authoring technician in Staff Portal $\rightarrow$ The report shows an amber `[Flagged]` badge.
  * [Pass]: Opening the report displays the reviewer's feedback alert banner prominently at the top with an **Edit Report** button.

---

## Test Track 5: Deadlines, Team Members & Analytics

In **AdminView**:

### Test 5.1: Deadline Creation & Filtering
1. On the Admin Dashboard, locate the **Operational Deadlines** widget.
2. Click **+ Add Deadline**.
3. Fill in:
   * **Title**: `Q3 Solar PV Array Wash & Torque Inspection`
   * **Department**: `Solar PV`
   * **Due Date**: Select a date 5 days in the future.
   * **Priority**: `High`
4. Click **Publish Deadline**.
* **What to look for**:
  * [Pass]: Deadline appears in the list with `High` priority pill and remaining days countdown.
  * [Pass]: In DevTools **Application > Local Storage**, `reportflow_cached_deadlines_v2` has the new deadline saved within the `CacheEnvelope`.

---

### Test 5.2: Team Directory & Super Admin Privileges
1. In the sidebar, click **Teams**.
* **What to look for**:
  * [Pass]: Displays active team members with name, department, role, and compliance score.
  * [Pass]: `info@gve-group.com` has the **Super Administrator** tag.
  * [Pass]: As Super Admin, administrative privilege checkboxes/toggles are editable.
  * [Pass]: If logged in as a standard administrator (not `info@gve-group.com`), modifying `is_admin` is blocked by database RLS rules.

---

### Test 5.3: Energy Analytics & Visualizations
1. In the sidebar, click **Analytics**.
* **What to look for**:
  * [Pass]: **Site Energy Analytics** chart (Recharts) renders power generation curves over time.
  * [Pass]: **Submission Velocity** bar graph shows reports filed per day/week.
  * [Pass]: **Department Compliance Table** lists departments with percentage completion rates.
  * [Pass]: Hovering over chart data points displays interactive tooltips with exact values.

---

## Test Track 6: Field Usability & PWA Hardware Adaptation

### Test 6.1: High-Glare Sunlight Mode
1. In the top navbar, click **Sunlight Mode**.
* **What to look for**:
  * [Pass]: The entire interface switches to ultra-high contrast styling designed for harsh outdoor tropical sunlight (stark white/dark borders, saturated status pills).
  * [Pass]: Button label updates to **Standard Mode**.
  * [Pass]: Click **Standard Mode** $\rightarrow$ Smoothly returns to standard dark theme.
  * [Pass]: Preference persists across page refreshes (`reportflow_sunlight_mode` in `localStorage`).

---

### Test 6.2: Progressive Web App (PWA) Offline Caching
1. In Chrome DevTools, open **Application > Service Workers**.
* **What to look for**:
  * [Pass]: `sw.js` is registered, active, and running.
2. Under **Cache Storage**, verify precached static assets (`index.html`, CSS, bundles, logos) are populated.
3. Disconnect your computer entirely from Wi-Fi or internet.
4. Hard refresh the browser (`Ctrl + F5`).
* **What to look for**:
  * [Pass]: The application loads completely without the Chrome "No Internet" dinosaur screen.

---

## Manual QA Inspection Summary Table

| Category | Test Case | Success Criteria | Pass / Fail |
| :--- | :--- | :--- | :--- |
| **Auth** | Non-GVE Email | Rejected with corporate domain notice | [ ] |
| **Auth** | Staff Login | Enters portal, session cached | [ ] |
| **Auth** | Super Admin Login | Grants Parent Administrator privileges | [ ] |
| **Offline** | Disconnect Detection | Top badge switches to `[Working Offline]` | [ ] |
| **Offline** | Queueing Report | Report saved to queue, base64 stripped in LS, blobs in IDB | [ ] |
| **Offline** | Auto-Sync Reconnect | Auto-flushes, toast notification, badge switches to `[Connected]` | [ ] |
| **Integrity**| Deduplication | Reconnection creates exactly 1 record (0 duplicates) | [ ] |
| **Forms** | Hourly Form Calc | Energy yield and sensor indicators compute live | [ ] |
| **Forms** | Draft Autosave | Reloading tab restores unsubmitted form inputs | [ ] |
| **Forms** | Photo Compression | Uploaded images compress and watermark | [ ] |
| **Review** | Approval Flow | Status transitions to `Approved`, stats increment | [ ] |
| **Review** | Flagging Flow | Reviewer comments saved; technician sees revision banner | [ ] |
| **Deadlines**| Create Deadline | Appears on dashboard with priority pill | [ ] |
| **Usability**| Sunlight Mode | High-contrast CSS applied; outdoor glare readable | [ ] |
| **PWA** | Service Worker | App boots offline after hard refresh | [ ] |
