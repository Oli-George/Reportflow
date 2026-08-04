import { useState, useMemo } from "react"
import {
  BarChart, Bar, LineChart,
  Line, PieChart, Pie,
  Cell, XAxis,YAxis,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts"

// ─── Types ───────────────────────────────────────────────────────────────────

export type View = "dashboard" | "reports" | "teams" | "analytics"
export type ReportStatus = "Approved" | "Submitted" | "Draft" | "Flagged"
export type ReportType = "Daily" | "Weekly" | "Monthly" | "Annual"

export interface Report {
  id: number
  title: string
  author: string
  department: string
  type: ReportType
  submitted: Date
  status: ReportStatus
  summary: string
}

export interface Member {
  id: number
  name: string
  role: string
  department: string
  lastReport: Date
  compliance: number
  initials: string
  color: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const REPORTS: Report[] = [
  { id: 1, title: "Q3 Infrastructure Rollout", author: "Amara Osei", department: "Engineering", type: "Weekly", submitted: new Date("2026-07-25T00:00:00Z"), status: "Approved", summary: "Completed Kubernetes cluster migration to v1.30. API latency reduced by 22%. Three remaining services pending containerization, scheduled for sprint 48.", },
  { id: 2, title: "Campaign Performance — July", author: "Lena Brandt", department: "Marketing", type: "Monthly", submitted: new Date("2026-07-24T00:00:00Z"), status: "Submitted", summary: "Email open rate at 31.4%, up from 27.1% in June. LinkedIn ad spend delivered 14% lower CPL. Retargeting cohort underperforming — recommend budget reallocation.", },
  { id: 3, title: "Daily Ops Standup — Jul 27", author: "Marcus Chen", department: "Operations", type: "Daily", submitted: new Date("2026-07-27T00:00:00Z"), status: "Approved", summary: "Fulfillment at 98.2% on-time. One supplier delay flagged for packaging materials — estimated 3-day impact. Escalated to procurement.", },
  { id: 4, title: "H1 Budget Reconciliation", author: "Priya Nair", department: "Finance", type: "Annual", submitted: new Date("2026-07-22T00:00:00Z"), status: "Flagged", summary: "Variance of $142k identified in Engineering capex line. Pending clarification from department heads. CFO review scheduled Jul 30.", },
  { id: 5, title: "Talent Pipeline — July", author: "James Okafor", department: "HR", type: "Monthly", submitted: new Date("2026-07-23T00:00:00Z"), status: "Submitted", summary: "7 open roles across Engineering and Sales. Offer acceptance rate at 88%. Two senior hires in final-round interviews.", },
  { id: 6, title: "Deployment Log — Jul 27", author: "Sofia Alvarez", department: "Engineering", type: "Daily", submitted: new Date("2026-07-27T00:00:00Z"), status: "Draft", summary: "Service mesh upgrade in staging. No production deployments today. Canary tests for payment service running at 5% traffic split.", },
  { id: 7, title: "Weekly Sales Summary — W30", author: "Daniel Ruiz", department: "Sales", type: "Weekly", submitted: new Date("2026-07-25T00:00:00Z"), status: "Approved", summary: "Closed $480k ARR this week. Pipeline at $2.1M. Three enterprise deals slipped to August. Renewal rate holding at 94%.", },
  { id: 8, title: "Compliance Audit — Q2", author: "Yuki Tanaka", department: "Legal", type: "Annual", submitted: new Date("2026-07-20T00:00:00Z"), status: "Approved", summary: "Zero critical findings. Two low-severity observations addressed inline. SOC2 Type II audit window opens August 12.", },
]

export const MEMBERS: Member[] = [
  { id: 1, name: "Amara Osei", role: "Senior Engineer", department: "Engineering", lastReport: new Date("2026-07-27"), compliance: 98, initials: "AO", color: "#005030", },
  { id: 2, name: "Lena Brandt", role: "Marketing Lead", department: "Marketing", lastReport: new Date("2026-07-24T00:00:00Z"), compliance: 92, initials: "LB", color: "#1a5c40", },
  { id: 3, name: "Marcus Chen", role: "Ops Manager", department: "Operations", lastReport: new Date("2026-07-27T00:00:00Z"), compliance: 100, initials: "MC", color: "#005030", },
  { id: 4, name: "Priya Nair", role: "Finance Director", department: "Finance", lastReport: new Date("2026-07-22T00:00:00Z"), compliance: 87, initials: "PN", color: "#7a4010", },
  { id: 5, name: "James Okafor", role: "HR Manager", department: "HR", lastReport: new Date("2026-07-23T00:00:00Z"), compliance: 95, initials: "JO", color: "#1a5c40", },
  { id: 6, name: "Sofia Alvarez", role: "Staff Engineer", department: "Engineering", lastReport: new Date("2026-07-27T00:00:00Z"), compliance: 90, initials: "SA", color: "#005030", },
  { id: 7, name: "Daniel Ruiz", role: "Account Executive", department: "Sales", lastReport: new Date("2026-07-25T00:00:00Z"), compliance: 96, initials: "DR", color: "#1a5c40", },
  { id: 8, name: "Yuki Tanaka", role: "Legal Counsel", department: "Legal", lastReport: new Date("2026-07-20T00:00:00Z"), compliance: 100, initials: "YT", color: "#005030", },
  { id: 9, name: "Felix Wagner", role: "Backend Engineer", department: "Engineering", lastReport: new Date("2026-07-26T00:00:00Z"), compliance: 83, initials: "FW", color: "#7a4010", },
  { id: 10, name: "Chioma Eze", role: "Brand Designer", department: "Marketing", lastReport: new Date("2026-07-25T00:00:00Z"), compliance: 91, initials: "CE", color: "#1a5c40", },
  { id: 11, name: "Raj Mehta", role: "Data Analyst", department: "Finance", lastReport: new Date("2026-07-24T00:00:00Z"), compliance: 94, initials: "RM", color: "#005030", },
  { id: 12, name: "Nadia Kowalski", role: "Recruiter", department: "HR", lastReport: new Date("2026-07-22T00:00:00Z"), compliance: 88, initials: "NK", color: "#1a5c40", },
]

const WEEKLY_REPORTS = [
  { week: "W24", submitted: 41, approved: 36 },
  { week: "W25", submitted: 55, approved: 48 },
  { week: "W26", submitted: 49, approved: 44 },
  { week: "W27", submitted: 62, approved: 57 },
  { week: "W28", submitted: 58, approved: 51 },
  { week: "W29", submitted: 70, approved: 63 },
  { week: "W30", submitted: 67, approved: 58 },
]

const TYPE_DIST = [
  { name: "Daily", value: 38 },
  { name: "Weekly", value: 29 },
  { name: "Monthly", value: 21 },
  { name: "Annual", value: 12 },
]

const TURNAROUND = [
  { week: "W24", hours: 31 },
  { week: "W25", hours: 28 },
  { week: "W26", hours: 34 },
  { week: "W27", hours: 22 },
  { week: "W28", hours: 19 },
  { week: "W29", hours: 17 },
  { week: "W30", hours: 14 },
]

const PIE_COLORS = ["#005030", "#00754a", "#00a86b", "#8aab96"]
const DEPARTMENTS = ["All", "Engineering", "Marketing", "Finance", "Operations", "HR",
  "Sales",
  "Legal",
]

// ─── Shared Components ────────────────────────────────────────────────────────

const statusColor: Record<ReportStatus | string, string> = {
  Approved: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
  Submitted: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  Draft: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40",
  Flagged: "bg-amber-900/40 text-amber-300 border-amber-700/40",
}

export function Badge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${statusColor[status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
    >
      {status}
    </span>
  )
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg border p-5 flex flex-col gap-1" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
      <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <p className="text-3xl font-display font-700 leading-none mt-1" style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}>
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1"
          style={{ color: "var(--muted-foreground)" }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: GridIcon },
  { id: "reports", label: "Reports", icon: FileIcon },
  { id: "teams", label: "Teams", icon: UsersIcon },
  { id: "analytics", label: "Analytics", icon: ChartIcon },
] as const

function Sidebar({
  active,
  onChange,
  collapsed,
}: {
  active: View
  onChange: (v: View) => void
  collapsed: boolean
}) {
  return (
    <aside
      className="fixed left-0 top-0 h-screen flex flex-col border-r z-20 transition-all duration-200"
      style={{
        width: collapsed ? 56 : 240,
        backgroundColor: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 border-b"
        style={{ height: 56, borderColor: "var(--border)", minWidth: 0 }}
      >
        <div
          className="shrink-0 w-7 h-7 rounded flex items-center justify-center"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="#e8f0eb" />
            <rect x="8" y="1" width="5" height="5" rx="1" fill="#e8f0eb" opacity="0.5" />
            <rect x="1" y="8" width="5" height="5" rx="1" fill="#e8f0eb" opacity="0.5" />
            <rect x="8" y="8" width="5" height="5" rx="1" fill="#e8f0eb" />
          </svg>
        </div>
        {!collapsed && (
          <span
            className="font-display font-700 text-base tracking-tight truncate"
            style={{ color: "var(--foreground)" }}
          >
            ReportFlow
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id
          return (
            <button key={id} onClick={() => onChange(id as View)} className="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
              style={{ backgroundColor: isActive ? "var(--primary)" : "transparent", color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)", justifyContent: collapsed ? "center" : "flex-start", gap: collapsed ? 0 : 10, width: "100%", minHeight: 36, }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--secondary)"
                ;(e.currentTarget as HTMLElement).style.color = "var(--foreground)"
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  ;(e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent"
                  ;(e.currentTarget as HTMLElement).style.color =
                    "var(--muted-foreground)"
                }
              }}
            >
              <span
                className="flex shrink-0 items-center justify-center"
                aria-hidden="true"
              >
                <Icon size={18} />
              </span>
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          )
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-mono font-500" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", }}>
            OG
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "var(--foreground)" }}>George Olisakwe</p>
              <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>IT Department</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

const VIEW_TITLES: Record<View, string> = {
  dashboard: "Dashboard",
  reports: "Reports",
  teams: "Teams",
  analytics: "Analytics",
}

function Header({ view, sidebarW }: { view: View; sidebarW: number }) {
  return (
    <header
      className="fixed top-0 right-0 flex items-center justify-between px-6 border-b z-10"
      style={{
        left: sidebarW,
        height: 56,
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
      }}
    >
      <h1
        className="font-display font-600 text-lg"
        style={{ color: "var(--foreground)" }}
      >
        {VIEW_TITLES[view]}
      </h1>
      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--card)",
            color: "var(--muted-foreground)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span>Search reports…</span>
        </div>
        <button
          className="relative p-1.5 rounded-md transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <BellIcon size={16} />
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          OG
        </div>{" "}
        {/* User avatar should go here */}
      </div>
    </header>
  )
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ reports }: { reports: Report[] }) {
  const recent = reports.slice(0, 5)
  const now = new Date()
  let options = { day: "numeric", month: "short", year: "numeric" } as const
  let today = now.toLocaleDateString("en-US", options)
  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Reports" value="402" sub="This month" />
        <StatCard label="Pending Approval" value="14" sub="Needs review" accent />
        <StatCard label="Open Issues" value="3" sub="Flagged items" />
        <StatCard label="Team Members" value="12" sub="Active reporters" />
        {/*The API should also get these values, instead of them being hard-coded*/}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Reports */}
        <div className="lg:col-span-3 rounded-lg border flex flex-col" style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-display font-600 text-sm" style={{ color: "var(--foreground)" }}>Recent Reports</h2>
            <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
              {today}
            </span>
          </div>
          <div className="flex-1 divide-y" style={{ borderColor: "var(--border)" }}>
            {recent.map((r) => (
              <div key={r.id} className="px-5 py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-white/2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{r.title}</p>
                  <p className="text-xs mt-0.5 font-mono" style={{ color: "var(--muted-foreground)" }}>{r.author} · {r.department}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className="text-xs font-mono hidden sm:block"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {r.submitted.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <Badge status={r.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Deadlines */}
          <div
            className="rounded-lg border"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div
              className="px-5 py-4 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <h2
                className="font-display font-600 text-sm"
                style={{ color: "var(--foreground)" }}
              >
                Upcoming Deadlines
              </h2>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {[
                { label: "Monthly Reports", date: "Jul 31", dept: "All Departments",},
                { label: "Q2 Finance Review", date: "Jul 30", dept: "Finance" },
                {label: "Weekly Team Update", date: "Jul 28", dept: "Engineering",},
              ].map((d, i) => (
                <div
                  key={i}
                  className="px-5 py-3 flex items-center justify-between"
                >
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--foreground)" }}
                    >
                      {d.label}
                    </p>
                    <p className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                      {d.dept}
                    </p>
                  </div>
                  <span
                    className="text-xs font-mono px-2 py-1 rounded border"
                    style={{
                      color: "var(--accent)",
                      borderColor: "#7a4010",
                      backgroundColor: "#1a0e00",
                    }}
                  >
                    {d.date}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity */}
          <div
            className="rounded-lg border"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="px-5 py-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h2 className="font-display font-600 text-sm" style={{ color: "var(--foreground)" }}>
                Activity
              </h2>
            </div>
            <div className="px-5 py-3 flex flex-col gap-3">
              {[
                { action: "Priya Nair submitted H1 Budget Reconciliation", time: "2h ago", flag: true,},
                {action: "Marcus Chen's Daily Ops report approved", time: "3h ago", flag: false,},
                {action: "Daniel Ruiz submitted W30 Sales Summary",time: "5h ago", flag: false,},
                { action: "Finance report flagged for review", time: "6h ago", flag: true,
                },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div
                    className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: a.flag
                        ? "var(--accent)"
                        : "var(--primary-hover)",
                    }}
                  />
                  <div>
                    <p
                      className="text-xs leading-relaxed"
                      style={{ color: "var(--foreground)" }}
                    >
                      {a.action}
                    </p>
                    <p
                      className="text-xs font-mono mt-0.5"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reports View ─────────────────────────────────────────────────────────────

const REPORT_TYPES: (ReportType | "All")[] = ["All","Daily","Weekly","Monthly","Annual",]
const REPORT_STATUSES: (ReportStatus | "All")[] = [
  "All",
  "Approved",
  "Submitted",
  "Draft",
  "Flagged",
]

function ReportsView({
  reports,
  setReports,
}: {
  reports: Report[]
  setReports: React.Dispatch<React.SetStateAction<Report[]>>
}) {
  const [typeFilter, setTypeFilter] = useState<ReportType | "All">("All")
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "All">("All")
  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = useMemo(
    () =>
      reports.filter(
        (r) =>
          (typeFilter === "All" || r.type === typeFilter) &&
          (statusFilter === "All" || r.status === statusFilter),
      ),
    [reports, typeFilter, statusFilter],
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {REPORT_TYPES.map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className="px-3 py-1.5 rounded text-xs font-mono border transition-all duration-100"
              style={{
                backgroundColor:
                  typeFilter === t ? "var(--primary)" : "var(--card)",
                borderColor:
                  typeFilter === t ? "var(--primary)" : "var(--border)",
                color:
                  typeFilter === t
                      ? "var(--primary-foreground)"
                      : "var(--muted-foreground)",
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {REPORT_STATUSES.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className="px-3 py-1.5 rounded text-xs font-mono border transition-all duration-100"
              style={{
                backgroundColor:statusFilter === s ? "var(--secondary)" : "transparent",
                borderColor:statusFilter === s ? "var(--border)" : "var(--border)",
                color:statusFilter === s ? "var(--foreground)" : "var(--muted-foreground)",
              }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-lg border overflow-hidden"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Table head */}
        <div
          className="grid px-5 py-2.5 border-b text-xs font-mono uppercase tracking-wider"
          style={{
            gridTemplateColumns: "1fr 140px 110px 110px 90px",
            borderColor: "var(--border)",
            color: "var(--muted-foreground)",
            backgroundColor: "var(--secondary)",
          }}
        >
          <span>Report</span>
          <span className="hidden md:block">Author</span>
          <span className="hidden md:block">Type</span>
          <span>Submitted</span>
          <span>Status</span>
        </div>

        {filtered.length === 0 && (
          <div
            className="px-5 py-10 text-center text-sm"
            style={{ color: "var(--muted-foreground)" }}
          >
            No reports match the selected filters.
          </div>
        )}

        {filtered.map((r) => (
          <div key={r.id}>
            <button
              className="w-full grid px-5 py-3.5 border-b text-left transition-colors hover:bg-white/25 items-center"
              style={{
                gridTemplateColumns: "1fr 140px 110px 110px 90px",
                borderColor: "var(--border)",
                backgroundColor:
                  expanded === r.id ? "var(--secondary)" : "transparent",
              }}
              onClick={() => setExpanded(expanded === r.id ? null : r.id)}
            >
              <div className="min-w-0 pr-4">
                <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>{r.title}</p>
                <p className="text-xs font-mono mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>{r.department}</p>
              </div>
              <span className="text-sm hidden md:block truncate" style={{ color: "var(--foreground)" }}>{r.author}</span>
              <span className="text-xs font-mono hidden md:block" style={{ color: "var(--muted-foreground)" }}>{r.type}</span>
              <span className="text-xs font-mono" style={{ color: "var(--muted-foreground)" }}>
                {r.submitted.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric",
                })}
              </span>
              <Badge status={r.status} />
            </button>
            {expanded === r.id && (
              <div
                className="px-5 py-4 border-b"
                style={{
                  borderColor: "var(--border)",
                  backgroundColor: "var(--background)",
                }}
              >
                <p className="text-xs font-mono uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>{r.summary}</p>
                <div className="flex gap-3 mt-4">
                  <button
                    className="text-xs font-mono px-3 py-1.5 rounded border transition-colors"
                    style={{
                      borderColor: "var(--primary)",
                      color: "var(--primary-hover)",
                      backgroundColor: "transparent",
                    }}
                  >
                    View Full Report
                  </button>
                  {r.status === "Submitted" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setReports((prev) => prev.map((item) => item.id === r.id ? { ...item, status: "Approved" } : item));
                      }}
                      className="text-xs font-mono px-3 py-1.5 rounded transition-colors" style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)", }}>
                      Approve
                    </button>
                  )}
                  {r.status !== "Flagged" && (
                    <button onClick={(e) => {
                        e.stopPropagation();
                        setReports((prev) => prev.map((item) => item.id === r.id ? { ...item, status: "Flagged" } : item));
                      }}
                      className="text-xs font-mono px-3 py-1.5 rounded border transition-colors" style={{
                        borderColor: "#7a4010",
                        color: "var(--accent)",
                        backgroundColor: "transparent",
                      }}>
                      Flag
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Team View ────────────────────────────────────────────────────────────────

function TeamView() {
  const [dept, setDept] = useState("All")
  const filtered =
    dept === "All" ? MEMBERS : MEMBERS.filter((m) => m.department === dept)

  return (
    <div className="flex flex-col gap-5">
      {/* Department tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => setDept(d)}
            className="px-3 py-1.5 rounded text-xs font-mono border transition-all duration-100"
            style={{
              backgroundColor: dept === d ? "var(--primary)" : "var(--card)",
              borderColor: dept === d ? "var(--primary)" : "var(--border)",
              color: dept === d ? "var(--primary-foreground)" : "var(--muted-foreground)",
            }}>
            {d}
          </button>
        ))}
      </div>

      {/* Member grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((m) => (
          <div
            key={m.id}
            className="rounded-lg border p-5 flex flex-col gap-3 transition-all duration-150 hover:border-primary"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono font-500 shrink-0"
                style={{
                  backgroundColor: m.color + "33",
                  color: "var(--foreground)",
                  border: `1px solid ${m.color}66`,
                }}
              >
                {m.initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  {m.name}
                </p>
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {m.role}
                </p>
              </div>
            </div>
            <div
              className="flex items-center justify-between text-xs font-mono"
              style={{ color: "var(--muted-foreground)" }}
            >
              <span>{m.department}</span>
              <span>
                Last:{" "}
                {m.lastReport.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {/* Compliance bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span
                  className="font-mono"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Compliance
                </span>
                <span
                  className="font-mono font-500"
                  style={{ color: m.compliance >= 95 ? "#4ade80" : m.compliance >= 85 ? "var(--foreground)" : "var(--accent)",}} >
                  {m.compliance}%
                </span>
              </div>
              <div
                className="h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${m.compliance}%`,
                    backgroundColor:
                      m.compliance >= 95
                        ? "#005030"
                        : m.compliance >= 85
                          ? "#1a5c40"
                          : "#7a4010",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Analytics View ───────────────────────────────────────────────────────────

const customTooltipStyle = {
  backgroundColor: "#0e1a13",
  border: "1px solid #1e3028",
  borderRadius: 6,
  color: "#e8f0eb",
  fontSize: 12,
  fontFamily: "DM Mono, monospace",
}

function AnalyticsView() {
  return (
    <div className="flex flex-col gap-6">
      {/* Metric tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Turnaround" value="14h" sub="↓ 54% vs W24" />
        <StatCard label="Approval Rate" value="86%" sub="W30 submissions" />
        <StatCard label="Reports This Month" value="402" sub="vs 341 in Jun" />
        <StatCard
          label="On-Time Rate"
          value="94%"
          sub="All departments"
          accent
        />
        {/*The API should also get these values, instead of them being hard-coded*/}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 rounded-lg border p-5" style={{backgroundColor: "var(--card)",borderColor: "var(--border)",}}>
          <h2 className="font-display font-600 text-sm mb-5" style={{ color: "var(--foreground)" }}>
            Weekly Submission Volume
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={WEEKLY_REPORTS} barCategoryGap="35%">
              <XAxis dataKey={"week" as any} tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
              <Legend wrapperStyle={{ fontSize: 11, fontFamily: "DM Mono", color: "#8aab96", }} />
              <Bar dataKey={"submitted" as any} name="Submitted" fill="#005030" radius={[3, 3, 0, 0]}/>
              <Bar dataKey={"approved" as any} name="Approved" fill="#00754a" radius={[3, 3, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut */}
        <div className="rounded-lg border p-5 flex flex-col" style={{backgroundColor: "var(--card)",borderColor: "var(--border)",}}>
          <h2 className="font-display font-600 text-sm mb-5" style={{ color: "var(--foreground)" }}>
            Report Types
          </h2>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={TYPE_DIST} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey={"value" as any}>
                  {TYPE_DIST.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: "DM Mono", color: "#8aab96", }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Line chart */}
      <div
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <h2
          className="font-display font-600 text-sm mb-5"
          style={{ color: "var(--foreground)" }}
        >
          Approval Turnaround Time (hours)
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={TURNAROUND}>
            <XAxis dataKey={"week" as any} tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }} axisLine={false} tickLine={false} unit="h" />
            <Tooltip contentStyle={customTooltipStyle} formatter={(v) => [`${v}h`, "Avg Turnaround"]} />
            <Line type="monotone" dataKey={"hours" as any} stroke="#f5a623" strokeWidth={2} dot={{ fill: "#f5a623", r: 3 }} activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GridIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function FileIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function UsersIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 14c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M14.5 14c0-1.933-1.119-3-2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  )
}

function ChartIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 12L5.5 7.5L8.5 10L12 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="1" y="13" width="14" height="1" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function BellIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M8 2a5 5 0 00-5 5v3l-1 1.5h12L13 10V7a5 5 0 00-5-5z" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M6.5 13a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  )
}

interface AdminViewProps {
  reports: Report[]
  setReports: React.Dispatch<React.SetStateAction<Report[]>>
}

export default function AdminView({ reports, setReports }: AdminViewProps) {
  const [view, setView] = useState<View>("dashboard")
  const [collapsed, setCollapsed] = useState(false)

  const sidebarW = collapsed ? 56 : 240

  return (
    <div style={{ backgroundColor: "var(--background)", minHeight: "100vh", fontFamily: "var(--font-body, DM Sans, sans-serif)", }}>
      <Sidebar active={view} onChange={setView} collapsed={collapsed} />
      <Header view={view} sidebarW={sidebarW} />

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed((c) => !c)}
      className="fixed z-30 flex items-center justify-center rounded-md border transition-all duration-200"
      style={{top: 16,left: sidebarW - 12,width: 24,height: 24,backgroundColor: "var(--card)",borderColor: "var(--border)",color: "var(--muted-foreground)",}}
      aria-label="Toggle sidebar">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d={collapsed ? "M3 2l4 3-4 3" : "M7 2L3 5l4 3"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Main content */}
      <main className="transition-all duration-200" 
        style={{marginLeft: sidebarW,paddingTop: 56 + 24,paddingBottom: 40,paddingLeft: 24,paddingRight: 24,minHeight: "100vh",}}>
        {view === "dashboard" && <DashboardView reports={reports} />}
        {view === "reports" && <ReportsView reports={reports} setReports={setReports} />}
        {view === "teams" && <TeamView />}
        {view === "analytics" && <AnalyticsView />}
      </main>
    </div>
  )
}
