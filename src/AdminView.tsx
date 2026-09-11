import { useState, useMemo } from "react"

import GveDailyHourlyForm from "./components/GveHourlyForm"
import GveWeeklyForm from "./components/GveWeeklyForm"
import GveQuarterlyForm from "./components/GveQuarterlyForm"
import ReportPhotoUploader from "./components/ReportPhotoUploader"
import { GveDailyRecordData } from "./types/gveDaily"
import { GveWeeklyRecordData } from "./types/gveWeekly"
import { GveQuarterlyRecordData, createEmptyGveQuarterlyData } from "./types/gveQuarterly"
import { ReportAttachment } from "./types/attachment"
import { ContrastIcon } from "./components/Icons"
import AnalyticsStatCard from "./components/analytics/AnalyticsStatCard"
import AnalyticsFilterBar from "./components/analytics/AnalyticsFilterBar"
import SubmissionVelocityChart from "./components/analytics/SubmissionVelocityChart"
import ReportDistributionChart from "./components/analytics/ReportDistributionChart"
import SiteEnergyAnalytics from "./components/analytics/SiteEnergyAnalytics"
import DepartmentComplianceTable from "./components/analytics/DepartmentComplianceTable"
import {
  AnalyticsFilter,
  filterReports,
  calculateKPIs,
  getSubmissionVelocity,
  getReportTypeDistribution,
  getDepartmentMetrics,
  getSolarMiniGridTelemetry,
  getTechnicianLeaderboard,
} from "./lib/analyticsCalculator"

// ─── Types ───────────────────────────────────────────────────────────────────

export type View = "dashboard" | "reports" | "teams" | "analytics"
export type ReportStatus = "Approved" | "Submitted" | "Draft" | "Flagged"
export type ReportType = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly"
export interface Report {
  id: number
  title: string
  author: string
  department: string
  type: ReportType
  submitted: Date
  status: ReportStatus
  summary: string
  feedback?: string
  attachments?: ReportAttachment[]
  gveData?: GveDailyRecordData
  gveWeeklyData?: GveWeeklyRecordData
  gveQuarterlyData?: GveQuarterlyRecordData
}

export function isWithinPastMonth(date: Date | string) {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  const submittedTime = new Date(date).getTime()

  return new Date().getTime() - submittedTime <= thirtyDaysMs
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

export interface Deadline {
  id: number
  title: string
  department: string
  dueDate: string
  description?: string
  priority?: "High" | "Medium" | "Low"
  createdAt?: string
}

export function formatDeadlineDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"))

    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch (e) {
    return dateStr
  }
}

export function getDeadlineUrgency(
  dateStr: string,
): { label: string; isOverdue: boolean; isUrgent: boolean } {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(dateStr + (dateStr.includes("T") ? "" : "T00:00:00"))
    due.setHours(0, 0, 0, 0)
    const diffDays = Math.round(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    )

    if (diffDays < 0) {
      return {
        label: `Overdue (${Math.abs(diffDays)}d ago)`,
        isOverdue: true,
        isUrgent: true,
      }
    } else if (diffDays === 0) {
      return { label: "Due Today", isOverdue: false, isUrgent: true }
    } else if (diffDays === 1) {
      return { label: "Due Tomorrow", isOverdue: false, isUrgent: true }
    } else if (diffDays <= 3) {
      return {
        label: `Due in ${diffDays} days`,
        isOverdue: false,
        isUrgent: true,
      }
    } else {
      return { label: `In ${diffDays} days`, isOverdue: false, isUrgent: false }
    }
  } catch (e) {
    return { label: dateStr, isOverdue: false, isUrgent: false }
  }
}

export const DEFAULT_DEADLINES: Deadline[] = [
  {
    id: 1,
    title: "Weekly Site Operational Log",
    department: "Engineering",
    dueDate: "2026-08-28",
    priority: "High",
    description:
      "Submission of all 12-hour solar PV, inverter remarks, and battery bank parameters.",
  },

  {
    id: 2,
    title: "Q3 Facility & Safety Audit",
    department: "Operations",
    dueDate: "2026-08-30",
    priority: "Medium",
    description: "Quarterly inspection of fire suppression and earthing grids.",
  },

  {
    id: 3,
    title: "Monthly Capex & Field Reconciliation",
    department: "Finance",
    dueDate: "2026-08-31",
    priority: "High",
    description:
      "Reconciliation of site diesel procurement and technician allowances.",
  },

  {
    id: 4,
    title: "Monthly Performance & KPI Review",
    department: "All Departments",
    dueDate: "2026-08-31",
    priority: "Medium",
    description:
      "General monthly reporting cycle across all departmental teams.",
  },
]

export interface AdminViewProps {
  reports: Report[]

  setReports: React.Dispatch<React.SetStateAction<Report[]>>

  members?: Member[]

  deadlines?: Deadline[]

  onCreateDeadline?: (deadline: Omit<Deadline, "id" | "createdAt">) => void

  onDeleteDeadline?: (id: number) => void

  onLogout?: () => void

  topOffset?: number

  sunlightMode?: boolean

  onToggleSunlightMode?: () => void
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const REPORTS: Report[] = [
  {
    id: 1,
    title: "GVE KUKA Site Hourly Record — Jul 27",
    author: "Amara Osei",
    department: "Engineering",
    type: "Daily",
    submitted: new Date("2026-07-27T00:00:00Z"),

    status: "Approved",

    summary:
      "Official physical GVE KUKA Site Operational Hourly Record sheet filled out with 12-hour solar PV, battery storage, site load, and grid parameters.",

    gveData: {
      siteName: "GVE KUKA SITE",

      title: "GVE KUKA Site Hourly Record",

      date: "2026-07-27",

      day: "Monday",

      year: "2026",

      entries: [
        {
          id: "e1",
          time: "06:00 AM",
          pv: { volt: "420", curr: "12.5", power: "5.25", energy: "5.25" },
          battery: { volt: "51.2", curr: "24.0", soc: "85", soh: "99" },
          load: {
            l1_v: "230",
            l1_a: "8.5",
            l2_v: "231",
            l2_c: "8.2",
            l3_v: "229",
            l3_c: "8.4",
            power: "5.8",
            energy: "5.8",
          },
          grid: {
            l1_v: "0",
            l1_a: "0",
            l2_v: "0",
            l2_c: "0",
            l3_v: "0",
            l3_c: "0",
            power: "0",
            energy: "0",
          },
          spd: { in: "GOOD", out: "GOOD" },
          cooling: { ac1: "ON", ac2: "ON" },
          operatorName: "Amara Osei",
        },

        {
          id: "e2",
          time: "07:00 AM",
          pv: { volt: "435", curr: "18.2", power: "7.91", energy: "13.16" },
          battery: { volt: "52.0", curr: "31.5", soc: "90", soh: "99" },
          load: {
            l1_v: "230",
            l1_a: "9.1",
            l2_v: "230",
            l2_c: "9.0",
            l3_v: "231",
            l3_c: "8.9",
            power: "6.2",
            energy: "12.0",
          },
          grid: {
            l1_v: "0",
            l1_a: "0",
            l2_v: "0",
            l2_c: "0",
            l3_v: "0",
            l3_c: "0",
            power: "0",
            energy: "0",
          },
          spd: { in: "GOOD", out: "GOOD" },
          cooling: { ac1: "ON", ac2: "ON" },
          operatorName: "Amara Osei",
        },

        {
          id: "e3",
          time: "08:00 AM",
          pv: { volt: "450", curr: "25.0", power: "11.25", energy: "24.41" },
          battery: { volt: "53.5", curr: "42.0", soc: "96", soh: "99" },
          load: {
            l1_v: "231",
            l1_a: "11.0",
            l2_v: "231",
            l2_c: "10.8",
            l3_v: "230",
            l3_c: "11.2",
            power: "7.6",
            energy: "19.6",
          },
          grid: {
            l1_v: "0",
            l1_a: "0",
            l2_v: "0",
            l2_c: "0",
            l3_v: "0",
            l3_c: "0",
            power: "0",
            energy: "0",
          },
          spd: { in: "GOOD", out: "GOOD" },
          cooling: { ac1: "ON", ac2: "ON" },
          operatorName: "Amara Osei",
        },

        {
          id: "e4",
          time: "09:00 AM",
          pv: { volt: "460", curr: "30.4", power: "13.98", energy: "38.39" },
          battery: { volt: "54.1", curr: "15.0", soc: "100", soh: "99" },
          load: {
            l1_v: "230",
            l1_a: "14.2",
            l2_v: "229",
            l2_c: "14.0",
            l3_v: "230",
            l3_c: "14.1",
            power: "9.7",
            energy: "29.3",
          },
          grid: {
            l1_v: "0",
            l1_a: "0",
            l2_v: "0",
            l2_c: "0",
            l3_v: "0",
            l3_c: "0",
            power: "0",
            energy: "0",
          },
          spd: { in: "GOOD", out: "GOOD" },
          cooling: { ac1: "ON", ac2: "ON" },
          operatorName: "Amara Osei",
        },

        {
          id: "e5",
          time: "10:00 AM",
          pv: { volt: "465", curr: "32.1", power: "14.92", energy: "53.31" },
          battery: { volt: "54.2", curr: "5.0", soc: "100", soh: "99" },
          load: {
            l1_v: "230",
            l1_a: "16.0",
            l2_v: "231",
            l2_c: "15.8",
            l3_v: "230",
            l3_c: "16.1",
            power: "11.0",
            energy: "40.3",
          },
          grid: {
            l1_v: "0",
            l1_a: "0",
            l2_v: "0",
            l2_c: "0",
            l3_v: "0",
            l3_c: "0",
            power: "0",
            energy: "0",
          },
          spd: { in: "GOOD", out: "GOOD" },
          cooling: { ac1: "ON", ac2: "ON" },
          operatorName: "Amara Osei",
        },
      ],
    },
  },

  {
    id: 2,
    title: "Campaign Performance — July",
    author: "Lena Brandt",
    department: "Marketing",
    type: "Monthly",
    submitted: new Date("2026-07-24T00:00:00Z"),
    status: "Submitted",
    summary:
      "Email open rate at 31.4%, up from 27.1% in June. LinkedIn ad spend delivered 14% lower CPL. Retargeting cohort underperforming — recommend budget reallocation.",
  },

  {
    id: 3,
    title: "Daily Ops Standup — Jul 27",
    author: "Marcus Chen",
    department: "Operations",
    type: "Daily",
    submitted: new Date("2026-07-27T00:00:00Z"),
    status: "Approved",
    summary:
      "Fulfillment at 98.2% on-time. One supplier delay flagged for packaging materials — estimated 3-day impact. Escalated to procurement.",
  },

  {
    id: 4,
    title: "H1 Budget Reconciliation",
    author: "Priya Nair",
    department: "Finance",
    type: "Yearly",
    submitted: new Date("2026-07-22T00:00:00Z"),
    status: "Flagged",
    summary:
      "Variance of $142k identified in Engineering capex line. Pending clarification from department heads. CFO review scheduled Jul 30.",
  },

  {
    id: 5,
    title: "Talent Pipeline — July",
    author: "James Okafor",
    department: "HR",
    type: "Monthly",
    submitted: new Date("2026-07-23T00:00:00Z"),
    status: "Submitted",
    summary:
      "7 open roles across Engineering and Sales. Offer acceptance rate at 88%. Two senior hires in final-round interviews.",
  },

  {
    id: 6,
    title: "Deployment Log — Jul 27",
    author: "Sofia Alvarez",
    department: "Engineering",
    type: "Daily",
    submitted: new Date("2026-07-27T00:00:00Z"),
    status: "Draft",
    summary:
      "Service mesh upgrade in staging. No production deployments today. Canary tests for payment service running at 5% traffic split.",
  },

  {
    id: 7,
    title: "Weekly Sales Summary — W30",
    author: "Daniel Ruiz",
    department: "Sales",
    type: "Weekly",
    submitted: new Date("2026-07-25T00:00:00Z"),
    status: "Approved",
    summary:
      "Closed $480k ARR this week. Pipeline at $2.1M. Three enterprise deals slipped to August. Renewal rate holding at 94%.",
  },

  {
    id: 8,
    title: "Compliance Audit — Q2",
    author: "Yuki Tanaka",
    department: "Legal",
    type: "Yearly",
    submitted: new Date("2026-07-20T00:00:00Z"),
    status: "Approved",
    summary:
      "Zero critical findings. Two low-severity observations addressed inline. SOC2 Type II audit window opens August 12.",
  },

  {
    id: 9,
    title: "Site Quarterly Maintenance Template — Q2 Audit",
    author: "George (Admin)",
    department: "Engineering",
    type: "Quarterly",
    submitted: new Date("2026-07-28T00:00:00Z"),
    status: "Approved",
    summary:
      "Official Site Quarterly Maintenance Audit Report covering general power plant condition, support structures, PV arrays, indoor/outdoor switchgear, MPPTs, CL/Battery inverters, BESS strings, grid distribution, earthing system, equipment maintenance, and PPE/tool inventories.",
    gveQuarterlyData: createEmptyGveQuarterlyData(),
  },
]

export const MEMBERS: Member[] = [
  {
    id: 1,
    name: "Amara Osei",
    role: "Senior Engineer",
    department: "Engineering",
    lastReport: new Date("2026-07-27"),
    compliance: 98,
    initials: "AO",
    color: "#005030",
  },

  {
    id: 2,
    name: "Lena Brandt",
    role: "Marketing Lead",
    department: "Marketing",
    lastReport: new Date("2026-07-24T00:00:00Z"),
    compliance: 92,
    initials: "LB",
    color: "#1a5c40",
  },

  {
    id: 3,
    name: "Marcus Chen",
    role: "Ops Manager",
    department: "Operations",
    lastReport: new Date("2026-07-27T00:00:00Z"),
    compliance: 100,
    initials: "MC",
    color: "#005030",
  },

  {
    id: 4,
    name: "Priya Nair",
    role: "Finance Director",
    department: "Finance",
    lastReport: new Date("2026-07-22T00:00:00Z"),
    compliance: 87,
    initials: "PN",
    color: "#7a4010",
  },

  {
    id: 5,
    name: "James Okafor",
    role: "HR Manager",
    department: "HR",
    lastReport: new Date("2026-07-23T00:00:00Z"),
    compliance: 95,
    initials: "JO",
    color: "#1a5c40",
  },

  {
    id: 6,
    name: "Sofia Alvarez",
    role: "Staff Engineer",
    department: "Engineering",
    lastReport: new Date("2026-07-27T00:00:00Z"),
    compliance: 90,
    initials: "SA",
    color: "#005030",
  },

  {
    id: 7,
    name: "Daniel Ruiz",
    role: "Account Executive",
    department: "Sales",
    lastReport: new Date("2026-07-25T00:00:00Z"),
    compliance: 96,
    initials: "DR",
    color: "#1a5c40",
  },

  {
    id: 8,
    name: "Yuki Tanaka",
    role: "Legal Counsel",
    department: "Legal",
    lastReport: new Date("2026-07-20T00:00:00Z"),
    compliance: 100,
    initials: "YT",
    color: "#005030",
  },

  {
    id: 9,
    name: "Felix Wagner",
    role: "Backend Engineer",
    department: "Engineering",
    lastReport: new Date("2026-07-26T00:00:00Z"),
    compliance: 83,
    initials: "FW",
    color: "#7a4010",
  },

  {
    id: 10,
    name: "Chioma Eze",
    role: "Brand Designer",
    department: "Marketing",
    lastReport: new Date("2026-07-25T00:00:00Z"),
    compliance: 91,
    initials: "CE",
    color: "#1a5c40",
  },

  {
    id: 11,
    name: "Raj Mehta",
    role: "Data Analyst",
    department: "Finance",
    lastReport: new Date("2026-07-24T00:00:00Z"),
    compliance: 94,
    initials: "RM",
    color: "#005030",
  },

  {
    id: 12,
    name: "Nadia Kowalski",
    role: "Recruiter",
    department: "HR",
    lastReport: new Date("2026-07-22T00:00:00Z"),
    compliance: 88,
    initials: "NK",
    color: "#1a5c40",
  },
]

const DEPARTMENTS = [
  "All",
  "Engineering",
  "Marketing",
  "Finance",
  "Operations",
  "HR",

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
  const statusKey = status.toLowerCase()
  return (
    <span
      className={`badge-status badge-${statusKey} inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${statusColor[status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
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
    <div
      className="rounded-lg border p-5 flex flex-col gap-1"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <p
        className="text-xs font-mono uppercase tracking-widest"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <p
        className="text-3xl font-display font-700 leading-none mt-1"
        style={{ color: accent ? "var(--accent)" : "var(--foreground)" }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-xs mt-1"
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

  onLogout,

  topOffset = 0,
}: {
  active: View

  onChange: (v: View) => void

  collapsed: boolean

  onLogout?: () => void

  topOffset?: number
}) {
  return (
    <aside
      className="fixed left-0 flex flex-col border-r z-20 transition-all duration-200"
      style={{
        top: topOffset,

        height: topOffset > 0 ? `calc(100vh - ${topOffset}px)` : "100vh",

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
          <img src="./src/components/logo.jpeg" alt="GVE Logo" />
        </div>
        {!collapsed && (
          <span
            className="font-display font-700 text-base tracking-tight truncate flex items-center"
            style={{ color: "var(--foreground)" }}
          >
            ReportFlow{" "}
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary-hover/30 text-secondary-foreground ml-1.5 border border-border">
              Admin
            </span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id

          return (
            <button
              key={id}
              onClick={() => onChange(id as View)}
              className={`flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? "sidebar-nav-active font-semibold shadow-sm" : "sidebar-nav-inactive"
              }`}
              style={{
                backgroundColor: isActive ? "#00754a" : "transparent",
                color: isActive
                  ? "#ffffff"
                  : "var(--muted-foreground)",
                justifyContent: collapsed ? "center" : "flex-start",
                gap: collapsed ? 0 : 10,
                width: "100%",
                minHeight: 36,
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "var(--secondary)"
                ;(e.currentTarget as HTMLElement).style.color =
                  "var(--foreground)"
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
      <div
        className="p-3 border-t flex flex-col gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-mono font-500"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
            >
              OG
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p
                  className="text-xs font-medium truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  George
                </p>
                <p
                  className="text-[10px] truncate"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  IT Dept
                </p>
              </div>
            )}
          </div>
          {!collapsed && onLogout && (
            <button
              onClick={onLogout}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors"
              title="Log Out"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
        {collapsed && onLogout && (
          <button
            onClick={onLogout}
            className="w-full py-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors flex justify-center"
            title="Log Out"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
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

function Header({
  view,

  sidebarW,

  searchQuery,

  onSearchChange,

  onOpenCreateModal,

  topOffset = 0,

  sunlightMode = false,

  onToggleSunlightMode,
}: {
  view: View
  sidebarW: number
  searchQuery: string
  onSearchChange: (q: string) => void
  onOpenCreateModal: () => void
  topOffset?: number
  sunlightMode?: boolean
  onToggleSunlightMode?: () => void
}) {
  return (
    <header
      className="fixed right-0 flex items-center justify-between px-6 border-b z-10 transition-all duration-200"
      style={{
        top: topOffset,
        left: sidebarW,
        height: 56,
        backgroundColor: "var(--background)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <h1 className="font-display font-600 text-lg"
          style={{ color: "var(--foreground)" }}
        >
          {VIEW_TITLES[view]}
        </h1>
        <button
          onClick={onOpenCreateModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium bg-primary hover:bg-primary-hover text-foreground transition-all shadow-sm active:translate-y-px"
        >
          <span className="text-sm font-bold leading-none">+</span> Write Report
        </button>
      </div>
      <div className="flex items-center gap-3">
        {onToggleSunlightMode && (
          <button
            type="button"
            onClick={onToggleSunlightMode}
            className="sunlight-toggle-btn flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-semibold transition-all cursor-pointer shadow-sm hover:opacity-90"
            style={{
              backgroundColor: sunlightMode ? "#0f172a" : "var(--secondary)",
              color: sunlightMode ? "#ffffff" : "var(--foreground)",
              borderColor: sunlightMode ? "#0f172a" : "var(--border)",
            }}
            title="Toggle high-contrast sunlight display mode for outdoor mobile readability"
          >
            <ContrastIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {sunlightMode ? "Standard Mode" : "Sunlight Mode"}
            </span>
          </button>
        )}
        <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
          style={{
            borderColor: searchQuery ? "var(--primary-hover)" : "var(--border)",

            backgroundColor: "var(--card)",

            color: "var(--muted-foreground)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle
              cx="5.5"
              cy="5.5"
              r="4.5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <path
              d="M9.5 9.5L12 12"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
          <input type="text" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reports…"
            className="search-bar-input bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-36 focus:w-52 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <button className="relative p-1.5 rounded-md transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        >
          <BellIcon size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </button>
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono"
          style={{
            backgroundColor: "var(--primary)",

            color: "var(--primary-foreground)",
          }}
        >
          OG
        </div>
      </div>
    </header>
  )
}

// ─── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({
  reports,
  onInspect,
  searchQuery,
  deadlines = [],
  onOpenDeadlineModal,
  onDeleteDeadline,
}: {
  reports: Report[]
  onInspect: (r: Report) => void
  searchQuery: string
  deadlines?: Deadline[]
  onOpenDeadlineModal?: () => void
  onDeleteDeadline?: (id: number) => void
}) {
  const [selectedDeadlineId, setSelectedDeadlineId] = useState<number | null>(
    null,
  )

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [activityFilter, setActivityFilter] = useState<
    "all" | "Submitted" | "Approved" | "Flagged"
  >("all")

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports

    const q = searchQuery.toLowerCase()

    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q),
    )
  }, [reports, searchQuery])

  // Sort real report activities chronologically (newest first, strictly EXCLUDING Drafts)
  const sortedActivities = useMemo(() => {
    const list = reports
      .filter((r) => r.status !== "Draft")
      .sort(
        (a, b) =>
          new Date(b.submitted).getTime() - new Date(a.submitted).getTime(),
      )
    if (activityFilter === "all") return list
    return list.filter((r) => r.status === activityFilter)
  }, [reports, activityFilter])

  const recent = filteredReports.slice(0, 5)
  const now = new Date()

  let options = { day: "numeric", month: "short", year: "numeric" } as const
  let today = now.toLocaleDateString("en-US", options)
  const totalCount = reports.length
  const pendingCount = reports.filter((r) => r.status === "Submitted").length
  const flaggedCount = reports.filter((r) => r.status === "Flagged").length

  const teamCount = MEMBERS.length

  return (
    <div className="flex flex-col gap-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Reports"
          value={totalCount.toString()}
          sub="Total submitted & filed"
        />
        <StatCard label="Pending Approval"
          value={pendingCount.toString()}
          sub="Needs review"
          accent
        />
        <StatCard label="Open Issues"
          value={flaggedCount.toString()}
          sub="Flagged items"
        />
        <StatCard label="Team Members"
          value={teamCount.toString()}
          sub="Active reporters"
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Reports */}
        <div
          className="lg:col-span-3 rounded-lg border flex flex-col"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="px-5 py-4 border-b flex items-center justify-between"
            style={{ borderColor: "var(--border)" }}
          >
            <h2
              className="font-display font-600 text-sm"
              style={{ color: "var(--foreground)" }}
            >
              Recent Reports
            </h2>
            <span
              className="text-xs font-mono"
              style={{ color: "var(--muted-foreground)" }}
            >
              {today}
            </span>
          </div>
          <div
            className="flex-1 divide-y"
            style={{ borderColor: "var(--border)" }}
          >
            {recent.map((r) => (
              <div key={r.id}
                onClick={() => onInspect(r)}
                className="px-5 py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-white/5 cursor-pointer"
              >
                <div className="min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--foreground)" }}
                  >
                    {r.title}
                  </p>
                  <p
                    className="text-xs mt-0.5 font-mono"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {r.author} · {r.department}
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
          <div className="rounded-lg border"
            style={{
              backgroundColor: "var(--card)",

              borderColor: "var(--border)",
            }}
          >
            <div className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">📅</span>
                <h2
                  className="font-display font-600 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  Upcoming Deadlines
                </h2>
              </div>
              {onOpenDeadlineModal && (
                <button
                  type="button"
                  onClick={onOpenDeadlineModal}
                  className="px-2.5 py-1 rounded text-xs font-mono font-semibold bg-primary hover:bg-primary-hover text-foreground border border-border/60 transition-all flex items-center gap-1 shadow-sm active:translate-y-px"
                >
                  <span>+</span> Set Deadline
                </button>
              )}
            </div>
            <div
              className="divide-y max-h-[360px] overflow-y-auto"
              style={{ borderColor: "var(--border)" }}
            >
              {deadlines.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground font-mono">
                  No deadlines set. Click{" "}
                  <strong className="text-primary-hover">
                    "+ Set Deadline"
                  </strong>{" "}
                  to schedule departmental submission targets.
                </div>
              ) : (
                [...deadlines]

                  .sort(
                    (a, b) =>
                      new Date(a.dueDate).getTime() -
                      new Date(b.dueDate).getTime(),
                  )
                  .map((d) => {
                    const urgency = getDeadlineUrgency(d.dueDate)
                    const isSelected = selectedDeadlineId === d.id
                    return (
                      <div key={d.id}
                        onClick={() => {
                          setSelectedDeadlineId((prev) =>
                            prev === d.id ? null : d.id,
                          )

                          setConfirmDeleteId(null)
                        }}
                        className={`px-5 py-3 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-secondary/60 border-l-2 border-l-primary"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: "var(--foreground)" }}
                                title={d.title}
                              >
                                {d.title}
                              </p>
                              {d.priority === "High" ? (
                                <span className="priority-badge-high px-2 py-0.5 rounded text-[10px] font-mono shrink-0">
                                  HIGH
                                </span>
                              ) : d.priority === "Medium" ? (
                                <span className="priority-badge-medium px-2 py-0.5 rounded text-[10px] font-mono shrink-0">
                                  MEDIUM
                                </span>
                              ) : (
                                <span className="priority-badge-low px-2 py-0.5 rounded text-[10px] font-mono shrink-0">
                                  LOW
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-secondary font-medium text-foreground border border-border">
                                {d.department}
                              </span>
                              {d.description && !isSelected && (
                                <span
                                  className="text-xs text-foreground/75 truncate hidden sm:inline"
                                  title={d.description}
                                >
                                  · {d.description}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`text-xs font-mono px-2.5 py-1 rounded border block shadow-xs ${
                                urgency.isOverdue
                                  ? "deadline-badge-overdue"
                                  : urgency.isUrgent
                                    ? "deadline-badge-urgent"
                                    : "deadline-badge-normal"
                              }`}
                            >
                              {formatDeadlineDate(d.dueDate)}
                            </span>
                            <span className={`text-[11px] font-mono font-semibold block mt-0.5 ${
                              urgency.isOverdue
                                ? "text-rose-400"
                                : urgency.isUrgent
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                            }`}>
                              {urgency.label}
                            </span>
                          </div>
                        </div>

                        {/* Expanded details & delete button shown only when tapped */}
                        {isSelected && (
                          <div className="mt-2.5 pt-2.5 border-t border-border/60 flex items-center justify-between gap-3 animate-fadeIn">
                            <p className="text-[11px] text-muted-foreground font-mono truncate">
                              {d.description ||
                                `Target: ${d.department} • Due: ${formatDeadlineDate(d.dueDate)}`}
                            </p>
                            {onDeleteDeadline && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()

                                  if (confirmDeleteId === d.id) {
                                    onDeleteDeadline(d.id)

                                    setSelectedDeadlineId(null)

                                    setConfirmDeleteId(null)
                                  } else {
                                    setConfirmDeleteId(d.id)
                                  }
                                }}
                                className={`px-2.5 py-1 text-xs font-mono rounded flex items-center gap-1.5 transition-all shadow-sm shrink-0 ${
                                  confirmDeleteId === d.id
                                    ? "bg-rose-600 text-white font-bold animate-pulse"
                                    : "bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300"
                                }`}
                              >
                                <span>🗑️</span>
                                <span>
                                  {confirmDeleteId === d.id
                                    ? "Confirm Delete?"
                                    : "Delete Deadline"}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
              )}
            </div>
          </div>

          {/* Dynamic Interactive Activity Section (No Drafts) */}
          <div
            className="rounded-lg border flex flex-col"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            {/* Activity Header with live status and filter tabs */}
            <div
              className="px-5 py-3.5 border-b flex flex-wrap items-center justify-between gap-2"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2
                  className="font-display font-600 text-sm"
                  style={{ color: "var(--foreground)" }}
                >
                  Activity
                </h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50">
                  {sortedActivities.length}
                </span>
              </div>

              {/* Quick status filters */}
              <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded border border-border/50 text-[10px] font-mono">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "Submitted", label: "Submissions" },
                    { id: "Approved", label: "Approved" },
                    { id: "Flagged", label: "Flagged" },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivityFilter(tab.id)}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      activityFilter === tab.id
                        ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Activity List */}
            <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto">
              {sortedActivities.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono">
                  No report activity matches the selected filter.
                </div>
              ) : (
                sortedActivities.slice(0, 10).map((r) => {
                  const isFlagged = r.status === "Flagged"
                  const isApproved = r.status === "Approved"

                  let actionText = (
                    <span>
                      <strong className="font-semibold text-foreground">
                        {r.author}
                      </strong>{" "}
                      submitted {r.title}
                    </span>
                  )

                  if (isApproved) {
                    actionText = (
                      <span>
                        <strong className="font-semibold text-foreground">
                          {r.author}'s
                        </strong>{" "}
                        {r.title} was approved
                      </span>
                    )
                  } else if (isFlagged) {
                    actionText = (
                      <span>
                        <strong className="font-semibold text-foreground">
                          {r.title}
                        </strong>{" "}
                        flagged for revision
                      </span>
                    )
                  }

                  // Compute relative time
                  let relativeTime = "Recently"
                  try {
                    const d = new Date(r.submitted)
                    const diffMs = Date.now() - d.getTime()
                    const diffMins = Math.floor(diffMs / 60000)
                    if (diffMins < 1) relativeTime = "Just now"
                    else if (diffMins < 60) relativeTime = `${diffMins}m ago`
                    else {
                      const diffHours = Math.floor(diffMins / 60)
                      if (diffHours < 24) relativeTime = `${diffHours}h ago`
                      else {
                        const diffDays = Math.floor(diffHours / 24)
                        if (diffDays < 7) relativeTime = `${diffDays}d ago`
                        else
                          relativeTime = d.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                      }
                    }
                  } catch (e) {}

                  return (
                    <div
                      key={r.id}
                      onClick={() => onInspect(r)}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer group"
                      title="Click to inspect this report in detail"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className="mt-1 w-2 h-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: isFlagged
                              ? "var(--accent)"
                              : isApproved
                                ? "#10b981"
                                : "var(--primary-hover)",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-snug text-muted-foreground group-hover:text-foreground transition-colors truncate">
                            {actionText}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-muted-foreground">
                            <span className="text-foreground/80 font-medium">
                              {relativeTime}
                            </span>
                            <span>·</span>
                            <span className="px-1.5 py-0.2 rounded bg-secondary text-muted-foreground border border-border/40 text-[10px]">
                              {r.department}
                            </span>
                            <span>·</span>
                            <span className="text-[10px] text-muted-foreground">
                              {r.type}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Inspect Indicator on Hover */}
                      <div className="shrink-0 flex items-center gap-1.5 text-[11px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>Inspect</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Reports View ─────────────────────────────────────────────────────────────

const REPORT_TYPES: (ReportType | "All")[] = [
  "All",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
]

const REPORT_STATUSES: (ReportStatus | "All")[] = [
  "All",
  "Approved",
  "Submitted",
  "Flagged",
  "Draft",
]

function ReportsView({
  reports,

  setReports,

  onInspect,

  onOpenFlagModal,

  onOpenCreateModal,

  searchQuery,
}: {
  reports: Report[]

  setReports: React.Dispatch<React.SetStateAction<Report[]>>

  onInspect: (r: Report) => void

  onOpenFlagModal: (r: Report) => void

  onOpenCreateModal: () => void

  searchQuery: string
}) {
  const [typeFilter, setTypeFilter] = useState<ReportType | "All">("All")

  const [statusFilter, setStatusFilter] = useState<ReportStatus | "All">("All")

  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return reports.filter(
      (r) =>
        (typeFilter === "All" || r.type === typeFilter) &&
        (statusFilter === "All" || r.status === statusFilter) &&
        (!q ||
          r.title.toLowerCase().includes(q) ||
          r.author.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.summary.toLowerCase().includes(q)),
    )
  }, [reports, typeFilter, statusFilter, searchQuery])

  return (
    <div className="flex flex-col gap-5">
      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {REPORT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
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
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1.5 flex-wrap">
            {REPORT_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded text-xs font-mono border transition-all duration-100"
                style={{
                  backgroundColor:
                    statusFilter === s ? "var(--secondary)" : "transparent",

                  borderColor:
                    statusFilter === s ? "var(--border)" : "var(--border)",

                  color:
                    statusFilter === s
                      ? "var(--foreground)"
                      : "var(--muted-foreground)",
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <button
            onClick={onOpenCreateModal}
            className="px-3 py-1.5 rounded text-xs font-mono font-semibold bg-primary hover:bg-primary-hover text-foreground transition-all shadow flex items-center gap-1.5"
          >
            <span>+</span> Write Admin Report
          </button>
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
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  {r.title}
                </p>
                <p
                  className="text-xs font-mono mt-0.5 truncate"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {r.department}
                </p>
              </div>
              <span
                className="text-sm hidden md:block truncate"
                style={{ color: "var(--foreground)" }}
              >
                {r.author}
              </span>
              <span
                className="text-xs font-mono hidden md:block"
                style={{ color: "var(--muted-foreground)" }}
              >
                {r.type}
              </span>
              <span
                className="text-xs font-mono"
                style={{ color: "var(--muted-foreground)" }}
              >
                {r.submitted.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
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
                <p
                  className="text-xs font-mono uppercase tracking-wider mb-2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Summary
                </p>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--foreground)" }}
                >
                  {r.summary}
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => onInspect(r)}
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
                        e.stopPropagation()

                        setReports((prev) =>
                          prev.map((item) =>
                            item.id === r.id
                              ? { ...item, status: "Approved" }
                              : item,
                          ),
                        )
                      }}
                      className="text-xs font-mono px-3 py-1.5 rounded transition-colors"
                      style={{
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                      }}
                    >
                      Approve
                    </button>
                  )}
                  {r.status !== "Flagged" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()

                        onOpenFlagModal(r)
                      }}
                      className="text-xs font-mono px-3 py-1.5 rounded border transition-colors"
                      style={{
                        borderColor: "#7a4010",

                        color: "var(--accent)",

                        backgroundColor: "transparent",
                      }}
                    >
                      Flag for Revision
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

function TeamView({ members = MEMBERS }: { members?: Member[] }) {
  const [dept, setDept] = useState("All")

  const filtered =
    dept === "All" ? members : members.filter((m) => m.department === dept)

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

              color:
                dept === d
                  ? "var(--primary-foreground)"
                  : "var(--muted-foreground)",
            }}
          >
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
                  style={{
                    color:
                      m.compliance >= 95
                        ? "#4ade80"
                        : m.compliance >= 85
                          ? "var(--foreground)"
                          : "var(--accent)",
                  }}
                >
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

export interface AnalyticsViewProps {
  reports: Report[]
  members?: Member[]
  deadlines?: Deadline[]
}

function AnalyticsView({
  reports = [],
  members = MEMBERS,
  deadlines = DEFAULT_DEADLINES,
}: AnalyticsViewProps) {
  const [filter, setFilter] = useState<AnalyticsFilter>({
    timeframe: "all",
    department: "All",
    reportType: "All",
    site: "All",
  })

  // Filtered reports
  const { current, prior } = useMemo(
    () => filterReports(reports, filter),
    [reports, filter],
  )

  // Dynamic KPIs
  const kpis = useMemo(
    () => calculateKPIs(current, prior, deadlines),
    [current, prior, deadlines],
  )

  // Chart data
  const velocityData = useMemo(
    () => getSubmissionVelocity(current, filter.timeframe),
    [current, filter.timeframe],
  )

  const typeData = useMemo(
    () => getReportTypeDistribution(current),
    [current],
  )

  const deptMetrics = useMemo(
    () => getDepartmentMetrics(current, members),
    [current, members],
  )

  const solarTelemetry = useMemo(
    () => getSolarMiniGridTelemetry(current),
    [current],
  )

  const technicians = useMemo(
    () => getTechnicianLeaderboard(current, members),
    [current, members],
  )

  // CSV Export Handler
  const handleExportCsv = () => {
    if (current.length === 0) return

    const headers = [
      "ID",
      "Title",
      "Author",
      "Department",
      "Type",
      "Submitted Date",
      "Status",
      "Feedback",
      "Summary",
    ]

    const rows = current.map((r) => [
      r.id,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      `"${(r.author || "").replace(/"/g, '""')}"`,
      `"${(r.department || "").replace(/"/g, '""')}"`,
      r.type,
      new Date(r.submitted).toISOString().slice(0, 10),
      r.status,
      `"${(r.feedback || "").replace(/"/g, '""')}"`,
      `"${(r.summary || "").replace(/"/g, '""')}"`,
    ])

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute(
      "download",
      `reportflow_analytics_${filter.timeframe}_${new Date().toISOString().slice(0, 10)}.csv`,
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn font-body">
      {/* Header Overview & Live Tag */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-tight">
              Operational Intelligence & Analytics
            </h2>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Telemetry
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-1">
            Real-time mini-grid telemetry, compliance tracking, and departmental reporting performance
          </p>
        </div>
      </div>

      {/* Interactive Multi-Dimensional Filter Bar */}
      <AnalyticsFilterBar
        filter={filter}
        onChange={setFilter}
        onExportCsv={handleExportCsv}
      />

      {/* Core Dynamic KPI Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnalyticsStatCard
          label="Total Logs Submitted"
          value={kpis.totalReports}
          sub={`${kpis.activeTechnicians} active technicians`}
          trend={{
            value: kpis.totalDeltaPct,
            label: "vs prior period",
          }}
          badge={filter.timeframe.toUpperCase()}
          colorScheme="blue"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          }
        />

        <AnalyticsStatCard
          label="Approval Rate"
          value={`${kpis.approvalRate}%`}
          sub={`${current.filter((r) => r.status === "Approved").length} approved records`}
          trend={{
            value: kpis.approvalRateDelta,
            label: "percentage points",
          }}
          badge="Audit Standard"
          colorScheme="emerald"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />

        <AnalyticsStatCard
          label="Avg Turnaround"
          value={`${kpis.avgTurnaroundHours}h`}
          sub="Review & sign-off speed"
          trend={{
            value: kpis.turnaroundDeltaPct,
            label: "faster turnaround",
            isPositiveGood: false,
          }}
          badge="SLA: <24h"
          colorScheme="amber"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
        />

        <AnalyticsStatCard
          label="Deadline Compliance"
          value={`${kpis.onTimeRate}%`}
          sub="On-time submissions"
          trend={{
            value: 4,
            label: "SLA compliance",
          }}
          badge="High Reliability"
          colorScheme="purple"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
      </div>

      {/* Secondary Operational Indicator Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-muted-foreground uppercase">
              Revision / Flagged Rate
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-display font-bold text-amber-400">
                {kpis.flaggedRate}%
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                ({current.filter((r) => r.status === "Flagged").length} flagged)
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono bg-amber-950/40 text-amber-300 border border-amber-800/60 font-semibold">
            {kpis.flaggedRate < 10 ? "Optimal" : "Attention"}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-muted-foreground uppercase">
              Pending Admin Review
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-display font-bold text-blue-400">
                {kpis.pendingReviewCount}
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                in inbox queue
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono bg-blue-950/40 text-blue-300 border border-blue-800/60 font-semibold">
            Active Queue
          </span>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-muted-foreground uppercase">
              Avg Battery Storage Health
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-display font-bold text-emerald-400">
                {kpis.avgBatteryHealth}% SOC
              </span>
              <span className="text-xs font-mono text-muted-foreground">
                nominal storage
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-800/60 font-semibold">
            Healthy Bank
          </span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SubmissionVelocityChart
            data={velocityData}
            timeframeLabel={filter.timeframe.toUpperCase()}
          />
        </div>
        <div>
          <ReportDistributionChart
            typeData={typeData}
            deptData={deptMetrics}
          />
        </div>
      </div>

      {/* Solar Mini-Grid Energy & Telemetry Section */}
      <SiteEnergyAnalytics
        telemetryData={solarTelemetry}
        totalGenKwh={kpis.totalEnergyGenKwh}
        totalLoadKwh={kpis.totalEnergyLoadKwh}
        avgSoc={kpis.avgBatteryHealth}
      />

      {/* Department Compliance Matrix & Technician Leaderboard */}
      <DepartmentComplianceTable
        departments={deptMetrics}
        technicians={technicians}
      />
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function GridIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect
        x="1"
        y="1"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="9"
        y="1"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="1"
        y="9"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <rect
        x="9"
        y="9"
        width="6"
        height="6"
        rx="1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

function FileIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path d="M10 2v3h3" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M5 7h6M5 10h4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function UsersIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M1 14c0-2.761 2.239-4 5-4s5 1.239 5 4"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M14.5 14c0-1.933-1.119-3-2.5-3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ChartIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 12L5.5 7.5L8.5 10L12 5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="1" y="13" width="14" height="1" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function BellIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2a5 5 0 00-5 5v3l-1 1.5h12L13 10V7a5 5 0 00-5-5z"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M6.5 13a1.5 1.5 0 003 0"
        stroke="currentColor"
        strokeWidth="1.3"
      />
    </svg>
  )
}

// ─── Inspector & Flag Modals ───────────────────────────────────────────────────

function FullReportModal({
  report,

  onClose,

  onApprove,

  onOpenFlagModal,
}: {
  report: Report

  onClose: () => void

  onApprove: (id: number) => void

  onOpenFlagModal: (report: Report) => void
}) {
  const canFlag = isWithinPastMonth(report.submitted)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-body">
      <div className="w-full max-w-6xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground uppercase">
                FORM RF-1099
              </span>
              <Badge status={report.status} />
            </div>
            <h2 className="font-display font-700 text-lg text-foreground mt-1">
              {report.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            ✕
          </button>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-3 gap-4 px-6 py-3 border-b border-border bg-background/30 text-xs font-mono">
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase">
              AUTHOR
            </span>
            <span className="text-foreground font-medium">{report.author}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase">
              DEPARTMENT
            </span>
            <span className="text-foreground font-medium">
              {report.department}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px] uppercase">
              TYPE & SUBMITTED
            </span>
            <span className="text-foreground font-medium">
              {report.type} ·{" "}
              {new Date(report.submitted).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* Report Content Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-4">
          {report.gveData ? (
            <div>
              <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2 flex items-center justify-between">
                <span>OFFICIAL PHYSICAL FORM REPLICA RECORD</span>
                <span className="text-emerald-400">
                  {report.gveData.siteName || "GVE SITE"}
                </span>
              </h3>
              <GveDailyHourlyForm initialData={report.gveData}
                readOnly={true}
                isAdmin={true}
              />
            </div>
          ) : report.gveWeeklyData ? (
            <div>
              <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2 flex items-center justify-between">
                <span>OFFICIAL PHYSICAL FORM REPLICA RECORD</span>
                <span className="text-emerald-400">
                  WEEKLY SITE REPORT FORM
                </span>
              </h3>
              <GveWeeklyForm
                initialData={report.gveWeeklyData}
                readOnly={true}
              />
            </div>
          ) : report.gveQuarterlyData ? (
            <div>
              <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2 flex items-center justify-between">
                <span>OFFICIAL PHYSICAL FORM REPLICA RECORD</span>
                <span className="text-emerald-400">
                  SITE QUARTERLY MAINTENANCE TEMPLATE
                </span>
              </h3>
              <GveQuarterlyForm
                initialData={report.gveQuarterlyData}
                readOnly={true}
              />
            </div>
          ) : (
            <div>
              <h3 className="text-xs font-mono uppercase text-muted-foreground mb-2">
                FULL SUMMARY & FINDINGS
              </h3>
              <div className="p-4 rounded-md bg-secondary/50 border border-border text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {report.summary}
              </div>
            </div>
          )}

          {report.feedback && (
            <div className="p-4 rounded-md bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs font-mono">
              <span className="block uppercase text-[10px] tracking-wider text-amber-400 font-bold mb-1">
                ADMIN REVISION FEEDBACK NOTES:
              </span>
              {report.feedback}
            </div>
          )}

          {/* Attached Photos & Evidence Gallery */}
          {report.attachments &&
            report.attachments.length > 0 &&
            !report.gveData &&
            !report.gveWeeklyData &&
            !report.gveQuarterlyData && (
              <ReportPhotoUploader
                attachments={report.attachments}
                readOnly={true}
                title="Attached Report Photos & Evidence"
                description="Visual documentation and photographic evidence attached to this report submission."
              />
            )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-border bg-secondary/20 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-mono border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            Close Inspector
          </button>

          <div className="flex gap-3">
            {report.status !== "Approved" && (
              <button
                onClick={() => {
                  onApprove(report.id)

                  onClose()
                }}
                className="px-4 py-2 rounded text-xs font-mono bg-primary text-primary-foreground hover:bg-primary-hover transition-all"
              >
                Approve Report
              </button>
            )}
            {report.status !== "Flagged" && (
              <button
                onClick={() => {
                  onClose()

                  onOpenFlagModal(report)
                }}
                disabled={!canFlag}
                title={
                  canFlag
                    ? "Flag for revision"
                    : "Only reports submitted within the past 30 days can be flagged"
                }
                className={`px-4 py-2 rounded text-xs font-mono border transition-all ${
                  canFlag
                    ? "border-amber-700 text-accent hover:bg-amber-950/50"
                    : "border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50"
                }`}
              >
                Flag for Revision
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FlagReportModal({
  report,

  onClose,

  onSaveFlag,
}: {
  report: Report

  onClose: () => void

  onSaveFlag: (id: number, feedback: string) => void
}) {
  const canFlag = isWithinPastMonth(report.submitted)

  const [feedback, setFeedback] = useState("")

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-body">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display font-700 text-base text-foreground">
            Flag Report for Revision
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="text-xs text-muted-foreground">
            Flagging report:{" "}
            <strong className="text-foreground">{report.title}</strong> by{" "}
            <strong className="text-foreground">{report.author}</strong>.
          </div>

          {!canFlag ? (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-mono">
              ⚠️ Policy Restriction: Reports older than 30 days (submitted on{" "}
              {new Date(report.submitted).toLocaleDateString()}) cannot be
              flagged for revision.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase">
                Reason / Feedback Notes for Reporter
              </label>
              <textarea
                rows={4}
                required
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Explain what corrections, details, or clarifications are required from the staff member..."
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover"
              />
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex justify-end gap-3 bg-secondary/20">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-mono border border-border rounded text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
          {canFlag && (
            <button
              onClick={() => {
                onSaveFlag(report.id, feedback)

                onClose()
              }}
              className="px-4 py-1.5 text-xs font-mono rounded bg-accent text-accent-foreground font-semibold hover:bg-amber-500 transition-all"
            >
              Submit Flag & Feedback
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminCreateReportModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (
    report: Omit<Report, "id" | "submitted" | "status">,
    status?: ReportStatus,
  ) => void
}) {
  const [title, setTitle] = useState("")
  const [author, setAuthor] = useState("")
  const [department, setDepartment] = useState("Engineering")
  const [type, setType] = useState<ReportType>("Quarterly")
  const [summary, setSummary] = useState("")
  const [attachments, setAttachments] = useState<ReportAttachment[]>([])
  const [error, setError] = useState("")
  const [quarterlyData, setQuarterlyData] = useState<GveQuarterlyRecordData>(
    createEmptyGveQuarterlyData(),
  )

  const handleSave = (statusToSave: ReportStatus) => {
    if (!title.trim()) {
      setError("Please enter a report title.")
      return
    }

    if (!summary.trim() && type !== "Quarterly") {
      setError("Please enter detailed summary/findings.")
      return
    }

    onSubmit(
      {
        title,
        author,
        department,
        type,
        summary: summary.trim() || `Official Site Quarterly Maintenance Audit Report for ${quarterlyData.siteName || "site"}.`,
        attachments,
        ...(type === "Quarterly" ? { gveQuarterlyData: quarterlyData } : {}),
      },
      statusToSave,
    )

    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSave("Approved")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in font-body overflow-y-auto">
      <div
        className={`w-full ${
          type === "Quarterly" ? "max-w-6xl max-h-[92vh]" : "max-w-lg"
        } bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden my-auto`}
      >
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
              +
            </div>
            <h3 className="font-display font-700 text-base text-foreground">
              {type === "Quarterly"
                ? "Compose Site Quarterly Maintenance Audit"
                : "Create Official Admin Report"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 flex flex-col gap-4 overflow-y-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5 md:col-span-3">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Report Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Site Quarterly Maintenance Template — Q2 Audit"
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Author Name
              </label>
              <input
                type="text"
                required
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover cursor-pointer"
              >
                {[
                  "Executive",
                  "Engineering",
                  "Marketing",
                  "Finance",
                  "Operations",
                  "HR",
                  "Legal",
                ].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Report Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover cursor-pointer font-semibold text-emerald-400"
              >
                <option value="Quarterly">
                  Quarterly (Admin Only Audit Form)
                </option>
                <option value="Yearly">Yearly (Admin Only)</option>
                <option value="Monthly">Monthly (Admin Only)</option>
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
          </div>

          {type === "Quarterly" ? (
            <div className="flex flex-col gap-3 mt-1">
              <div className="p-3 rounded bg-primary/10 border border-primary/25 text-xs text-primary-hover font-mono flex items-center justify-between">
                <span>
                  <strong>Quarterly Maintenance Audit Form</strong> — Fill in
                  audit entries across tabs or use the interactive grid.
                </span>
                <span className="text-[10px] uppercase font-bold text-emerald-400">
                  ADMIN EXCLUSIVE FORM
                </span>
              </div>
              <div className="border border-border rounded-lg p-2 bg-background max-h-[55vh] overflow-y-auto">
                <GveQuarterlyForm
                  initialData={quarterlyData}
                  onChange={setQuarterlyData}
                  readOnly={false}
                />
              </div>
            </div>
          ) : (
            <>
              {type === "Yearly" && (
                <div className="p-3 rounded bg-primary/10 border border-primary/25 text-xs text-primary-hover font-mono flex items-center gap-2">
                  <span>
                    <strong>Yearly Reports</strong> are exclusive to
                    Administrators and departmental leadership.
                  </span>
                </div>
              )}

              {type === "Monthly" && (
                <div className="p-3 rounded bg-primary/10 border border-primary/25 text-xs text-primary-hover font-mono flex items-center gap-2">
                  <span>
                    <strong>Monthly Reports</strong> are restricted to
                    Administrators.
                  </span>
                </div>
              )}
            </>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Executive Summary / Audit Remarks
            </label>
            <textarea
              rows={3}
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Provide comprehensive executive overview, annual performance metrics, or audit findings..."
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover resize-y"
            />
          </div>

          {/* Photo & File Uploader at End of Admin Composer */}
          <ReportPhotoUploader
            attachments={attachments}
            onChange={setAttachments}
            readOnly={false}
            title="Attached Photos & Inspection Evidence"
            description="Add site photos, charts, or visual evidence for this report."
          />

          {error && (
            <div className="text-xs font-mono text-accent bg-accent/10 border border-accent/25 rounded p-2.5">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-border flex items-center justify-end gap-3 bg-secondary/20 -mx-5 -mb-5 px-5 py-3 mt-1 font-mono">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs border border-border rounded text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSave("Draft")}
              className="px-4 py-2 text-xs font-semibold rounded bg-amber-950/50 hover:bg-amber-900/80 text-amber-300 border border-amber-700/60 transition-all shadow-sm active:translate-y-px flex items-center gap-1.5"
              title="Save as Draft to edit later"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave("Approved")}
              className="px-5 py-2 text-xs font-semibold rounded bg-primary hover:bg-primary-hover text-foreground transition-all shadow-md active:translate-y-px flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Publish Report & Audit Form
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Create Deadline Modal ───────────────────────────────────────────────────

function CreateDeadlineModal({
  onClose,

  onSubmit,
}: {
  onClose: () => void

  onSubmit: (deadline: Omit<Deadline, "id" | "createdAt">) => void
}) {
  const [title, setTitle] = useState("")

  const [department, setDepartment] = useState("All Departments")

  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()

    d.setDate(d.getDate() + 7)

    return d.toISOString().split("T")[0]
  })

  const [priority, setPriority] = useState<"High" | "Medium" | "Low">("Medium")

  const [description, setDescription] = useState("")

  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      setError("Please enter a deadline title.")

      return
    }

    if (!dueDate) {
      setError("Please select a due date.")

      return
    }

    onSubmit({
      title: title.trim(),

      department,

      dueDate,

      priority,

      description: description.trim() || undefined,
    })

    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center text-primary-foreground font-mono font-bold text-sm">
              📅
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-foreground">
                Set Department Deadline
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Assign submission requirement & due date
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground text-sm font-mono transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Deadline Title / Requirement{" "}
              <span className="text-accent">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Weekly Site Operations Log, Q3 Solar Array Audit..."
              className="w-full bg-secondary border border-border rounded-md px-3.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Target Department <span className="text-accent">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover"
              >
                <option value="All Departments">All Departments</option>
                <option value="Engineering">Engineering</option>
                <option value="Operations">Operations</option>
                <option value="Finance">Finance</option>
                <option value="Marketing">Marketing</option>
                <option value="HR">HR</option>
                <option value="Sales">Sales</option>
                <option value="Legal">Legal</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Due Date <span className="text-accent">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["High", "Medium", "Low"] as const).map((p) => {
                const isSelected = priority === p

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-3 rounded-md text-xs font-mono font-medium border transition-all ${
                      isSelected
                        ? p === "High"
                          ? "bg-rose-950/80 border-rose-600 text-rose-300 font-bold"
                          : p === "Medium"
                            ? "bg-amber-950/80 border-amber-600 text-amber-300 font-bold"
                            : "bg-emerald-950/80 border-emerald-600 text-emerald-300 font-bold"
                        : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {p === "High"
                      ? "High"
                      : p === "Medium"
                        ? "Medium"
                        : "Low"}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Instructions / Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide specific notes, guidelines, or checklists for field staff..."
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover resize-none"
            />
          </div>

          {error && (
            <div className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800 rounded p-2.5">
              {error}
            </div>
          )}

          <div className="pt-3 border-t border-border flex justify-end gap-3 -mx-6 -mb-6 px-6 py-4 bg-secondary/30">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono border border-border rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-mono font-semibold rounded-md bg-primary hover:bg-primary-hover text-foreground transition-all shadow-md active:translate-y-px"
            >
              Publish Deadline
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminView({
  reports,

  setReports,

  members = MEMBERS,

  deadlines = DEFAULT_DEADLINES,

  onCreateDeadline,

  onDeleteDeadline,

  onLogout,

  topOffset = 0,

  sunlightMode = false,

  onToggleSunlightMode,
}: AdminViewProps) {
  const [view, setView] = useState<View>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [inspectingReport, setInspectingReport] = useState<Report | null>(null)
  const [flaggingReport, setFlaggingReport] = useState<Report | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  // Filter out any reports in Draft stage so they are not accessible to admins

  const adminReports = useMemo(
    () => reports,
    [reports],
  )

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)

    if (q.trim() && view !== "reports") {
      setView("reports")
    }
  }

  const sidebarW = collapsed ? 56 : 240
  const handleApproveReport = (id: number) => {
    setReports((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "Approved" } : item,
      ),
    )
  }

  const handleSaveFlag = (id: number, feedback: string) => {
    setReports((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "Flagged",
              feedback: feedback || "Revision requested by admin.",
            }
          : item,
      ),
    )
  }

  const handleCreateAdminReport = (
    data: Omit<Report, "id" | "submitted" | "status">,
    status: ReportStatus = "Approved",
  ) => {
    const newId =
      reports.length > 0 ? Math.max(...reports.map((r) => r.id)) + 1 : 1

    const newReport: Report = {
      id: newId,
      ...data,
      submitted: new Date(),
      status: status,
    }

    setReports((prev) => [newReport, ...prev])
  }

  return (
    <div
      style={{
        backgroundColor: "var(--background)",
        minHeight: "100vh",
        fontFamily: "var(--font-body, DM Sans, sans-serif)",
      }}
    >
      <Sidebar active={view}
        onChange={setView}
        collapsed={collapsed}
        onLogout={onLogout}
        topOffset={topOffset}
      />
      <Header view={view}
        sidebarW={sidebarW}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        topOffset={topOffset}
        sunlightMode={sunlightMode}
        onToggleSunlightMode={onToggleSunlightMode}
      />

      {/* Collapse toggle */}
      <button onClick={() => setCollapsed((c) => !c)}
        className="fixed z-30 flex items-center justify-center rounded-md border transition-all duration-200"
        style={{
          top: topOffset + 16,
          left: sidebarW - 12,
          width: 24,
          height: 24,
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--muted-foreground)",
        }}
        aria-label="Toggle sidebar"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d={collapsed ? "M3 2l4 3-4 3" : "M7 2L3 5l4 3"}
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Main content */}
      <main className="transition-all duration-200"
        style={{
          marginLeft: sidebarW,
          paddingTop: topOffset + 56 + 24,
          paddingBottom: 40,
          paddingLeft: 24,
          paddingRight: 24,
          minHeight: "100vh",
        }}
      >
        {view === "dashboard" && (
          <DashboardView
            reports={adminReports}
            onInspect={setInspectingReport}
            searchQuery={searchQuery}
            deadlines={deadlines}
            onOpenDeadlineModal={() => setIsDeadlineModalOpen(true)}
            onDeleteDeadline={onDeleteDeadline}
          />
        )}
        {view === "reports" && (
          <ReportsView
            reports={adminReports}
            setReports={setReports}
            onInspect={setInspectingReport}
            onOpenFlagModal={setFlaggingReport}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            searchQuery={searchQuery}
          />
        )}
        {view === "teams" && <TeamView members={members} />}
        {view === "analytics" && (
          <AnalyticsView
            reports={adminReports}
            members={members}
            deadlines={deadlines}
          />
        )}
      </main>

      {/* Admin Create Report Modal */}
      {isCreateModalOpen && (
        <AdminCreateReportModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateAdminReport}
        />
      )}

      {/* Admin Create Deadline Modal */}
      {isDeadlineModalOpen && onCreateDeadline && (
        <CreateDeadlineModal
          onClose={() => setIsDeadlineModalOpen(false)}
          onSubmit={onCreateDeadline}
        />
      )}

      {/* Inspector Modal */}
      {inspectingReport && (
        <FullReportModal
          report={inspectingReport}
          onClose={() => setInspectingReport(null)}
          onApprove={handleApproveReport}
          onOpenFlagModal={setFlaggingReport}
        />
      )}

      {/* Flag Modal */}
      {flaggingReport && (
        <FlagReportModal
          report={flaggingReport}
          onClose={() => setFlaggingReport(null)}
          onSaveFlag={handleSaveFlag}
        />
      )}

    </div>
  )
}
