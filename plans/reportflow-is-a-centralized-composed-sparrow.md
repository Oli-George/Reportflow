# ReportFlow — Implementation Plan

## Context

ReportFlow is a centralized team reporting and coordination platform. The user needs a full-page UI built from scratch (the current `App.tsx` is just an interactive dot-grid placeholder). The design direction is a **dark command center with a #005030 forest-green undertone** — institutional authority, operational precision, not generic SaaS blue.

## Aesthetic Decisions

- **Ground:** `#080f0b` (near-black with green undertone), card surfaces at `#0e1a13`
- **Primary accent:** `#005030` forest green, with a lighter interactive variant `#00754a`
- **Secondary accent:** amber `#f5a623` for warnings, deadlines, flagged items
- **Text:** `#e8f0eb` primary, `#8aab96` muted
- **Border:** `#1e3028` hairline rules
- **Fonts:**
  - Headings: *Outfit* (geometric sans, display weight)
  - Body/UI: *DM Sans* (readable, neutral)
  - Data/labels: *DM Mono* (tabular numbers, timestamps)

## Pages / Sections to Build

Single-page dashboard app with left sidebar navigation. Four main views switchable via sidebar:

### 1. Dashboard (default view)
- Top stats bar: Total Reports, Pending Approvals, Open Issues, Team Members
- Left column: Recent Reports feed (list of report cards with status badges)
- Right column: Activity timeline + Upcoming Deadlines widget

### 2. Reports View
- Filter bar (by type: Daily / Weekly / Monthly / Annual; by status: Draft / Submitted / Approved / Flagged)
- Table of reports with columns: Title, Author, Department, Type, Submitted, Status, Actions
- Clickable rows expand to a report detail panel

### 3. Team View
- Grid of team member cards: avatar (initials), name, role, department, last report date, report compliance %
- Department filter tabs

### 4. Analytics View
- Bar chart: reports submitted per week (recharts)
- Donut chart: report type distribution
- Line chart: approval turnaround time trend
- Key metric tiles above charts

## Layout Structure

```
┌──────────┬────────────────────────────────────┐
│ Sidebar  │  Top header bar                    │
│          ├────────────────────────────────────┤
│ Nav      │  Main content area (scrollable)    │
│ items    │                                    │
│          │                                    │
│          │                                    │
└──────────┴────────────────────────────────────┘
```

- Sidebar: `240px` fixed, collapsible on narrow viewports
- Header: `56px` fixed top, shows page title + user avatar + notification bell
- Content: fills remaining space, `overflow-y: auto`

## File Plan

All work in `src/App.tsx` (replace entirely) and `src/index.css` (add font imports + CSS variables).

### `src/index.css`
- `@import 'tailwindcss';` stays first
- Add Google Fonts import for Outfit, DM Sans, DM Mono via `@import url(...)`
- Add CSS custom properties under `:root` for the token set
- Add `@theme inline` block mapping tokens to Tailwind classes
- Hide scrollbars globally while preserving scroll behavior

### `src/App.tsx`
Single file with these components (no separate files needed — scope is contained):
- `App` — state: `activeView`, `sidebarOpen`
- `Sidebar` — nav links, ReportFlow logo/wordmark
- `Header` — title, search, notification bell, user avatar
- `DashboardView` — stat tiles + two-column layout
- `ReportsView` — filter bar + sortable table + expandable detail panel
- `TeamView` — department tabs + member card grid
- `AnalyticsView` — recharts charts + metric tiles
- Shared: `Badge`, `StatCard`, `ReportCard`, `MemberCard`

### Dependencies
- `recharts` — needed for Analytics charts. Install via `npm install recharts` before writing code.

## Data

Use realistic hardcoded mock data: real department names (Engineering, Marketing, Finance, Operations, HR), real-sounding names, real dates in July 2026, plausible report titles.

## Responsive Behavior

- At `< 900px`: sidebar collapses to icon-only rail (48px)
- Stats bar wraps to 2×2 grid
- Reports table hides secondary columns (Department, Type)
- Analytics charts stack vertically

## Verification

1. Dev server is already running — check preview panel immediately after saving
2. Cycle through all 4 sidebar nav items to confirm view switching works
3. In Reports view: test filter buttons and row expand/collapse
4. In Analytics view: confirm charts render with data
5. Resize viewport below 900px to verify responsive collapse
