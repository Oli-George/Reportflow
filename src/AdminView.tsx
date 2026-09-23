import { useState, useMemo, useEffect, lazy } from "react"

import ReportPhotoUploader from "./components/ReportPhotoUploader"

import {
  GveQuarterlyRecordData,
  createEmptyGveQuarterlyData,
} from "./types/gveQuarterly"

import { ReportAttachment } from "./types/attachment"

import logoImg from "./components/logo.jpeg"

import {
  ContrastIcon, GridIcon, FileIcon, UsersIcon,
  ChartIcon, BellIcon, CalendarIcon, TrashIcon,
  AlertIcon, ShieldCheckIcon, ShieldIcon, KeyIcon,
} from "./components/Icons"

import { supabase } from "./lib/supabase"
import SettingsModal from "./components/SettingsModal"
import AnalyticsStatCard from "./components/analytics/AnalyticsStatCard"

import AnalyticsFilterBar from "./components/analytics/AnalyticsFilterBar"

import SubmissionVelocityChart from "./components/analytics/SubmissionVelocityChart"

import ReportDistributionChart from "./components/analytics/ReportDistributionChart"

import SiteEnergyAnalytics from "./components/analytics/SiteEnergyAnalytics"
import DepartmentComplianceTable from "./components/analytics/DepartmentComplianceTable"

import {
  AnalyticsFilter, filterReports,
  calculateKPIs, getSubmissionVelocity,
  getReportTypeDistribution, getDepartmentMetrics,
  getSolarMiniGridTelemetry, getTechnicianLeaderboard,
} from "./lib/analyticsCalculator"

import type { Report, ReportStatus, ReportType } from "./types/report"
import type { Member } from "./types/member"
import type { Deadline } from "./types/deadline"
import type { View } from "./types/view"

import { isWithinPastMonth, formatDeadlineDate, getDeadlineUrgency } from "./lib/dateUtils"
import { Badge } from "./components/StatusBadge"
import { MEMBERS, DEFAULT_DEADLINES, DEPARTMENTS } from "./constants/defaults"

const GveDailyHourlyForm = lazy(() => import("./components/GveHourlyForm"))

const GveWeeklyForm = lazy(() => import("./components/GveWeeklyForm"))

const GveQuarterlyForm = lazy(() => import("./components/GveQuarterlyForm"))

export interface AdminViewProps {
  reports: Report[]

  setReports: React.Dispatch<React.SetStateAction<Report[]>>

  members?: Member[]

  setMembers?: React.Dispatch<React.SetStateAction<Member[]>>

  currentUserEmail?: string

  deadlines?: Deadline[]

  onCreateDeadline?: (deadline: Omit<Deadline, "id" | "createdAt">) => void

  onDeleteDeadline?: (id: number) => void

  onLogout?: () => void

  topOffset?: number

  sunlightMode?: boolean

  onToggleSunlightMode?: () => void
}



// ─── Shared Components ────────────────────────────────────────────────────────

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

  sidebarW,

  onOpenSettings,
}: {
  active: View

  onChange: (v: View) => void

  collapsed: boolean

  onLogout?: () => void

  topOffset?: number

  sidebarW?: number

  onOpenSettings?: () => void
}) {
  return (
    <aside
      className="fixed left-0 flex flex-col border-r z-20 transition-all duration-200"
      style={{
        top: topOffset,

        height: topOffset > 0 ? `calc(100vh - ${topOffset}px)` : "100vh",

        width: sidebarW ?? (collapsed ? 56 : 240),

        backgroundColor: "var(--card)",

        borderColor: "var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className={`flex items-center border-b ${
          collapsed ? "justify-center px-0" : "gap-2 px-3"
        }`}
        style={{ height: 56, borderColor: "var(--border)", minWidth: 0 }}
      >
        <div
          className={`shrink-0 flex items-center justify-center rounded-md bg-white border border-border/40 shadow-xs ${
            collapsed ? "w-10 h-7.5 p-1" : "h-7.5 w-16 px-1.5 py-0.5"
          }`}
        >
          <img
            src={logoImg}
            alt="GVE Logo"
            className="max-h-full max-w-full object-contain"
          />
        </div>
        {!collapsed && (
          <div className="flex items-center gap-1.5 min-w-0 shrink-0">
            <span
              className="font-display font-bold text-sm tracking-tight whitespace-nowrap"
              style={{ color: "var(--foreground)" }}
            >
              ReportFlow
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary-hover/30 text-secondary-foreground border border-border shrink-0">
              Admin
            </span>
          </div>
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
                isActive
                  ? "sidebar-nav-active font-semibold shadow-sm"
                  : "sidebar-nav-inactive"
              }`}
              style={{
                backgroundColor: isActive ? "#00754a" : "transparent",

                color: isActive ? "#ffffff" : "var(--muted-foreground)",

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

      {/* User Card — Click anywhere to open System Settings */}
      <div
        className="p-3 border-t flex flex-col gap-2"
        style={{ borderColor: "var(--border)" }}
      >
        <div
          onClick={onOpenSettings}
          className={`group/user flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          } gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-secondary/70 cursor-pointer transition-all border border-transparent hover:border-border/60 select-none`}
          title="System Settings"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-mono font-semibold group-hover/user:scale-105 transition-transform"
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
                  className="text-xs font-medium truncate group-hover/user:text-primary transition-colors"
                  style={{ color: "var(--foreground)" }}
                >
                  George
                </p>
                <p className="text-[10px] truncate text-muted-foreground">
                  IT Dept
                </p>
              </div>
            )}
          </div>
          {!collapsed && onLogout && (
            <button
              onClick={(e) => {
                e.stopPropagation()

                onLogout()
              }}
              className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors shrink-0"
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
            type="button"
            onClick={(e) => {
              e.stopPropagation()

              onLogout()
            }}
            className="w-full py-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors flex justify-center cursor-pointer"
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
      className="fixed right-0 flex items-center justify-between px-4 sm:px-6 gap-3 sm:gap-6 border-b z-10 transition-all duration-200"
      style={{
        top: topOffset,

        left: sidebarW,

        height: 56,

        backgroundColor: "var(--background)",

        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center gap-3 shrink-0">
        <h1
          className="font-display font-600 text-base sm:text-lg whitespace-nowrap shrink-0"
          style={{ color: "var(--foreground)" }}
        >
          {VIEW_TITLES[view]}
        </h1>
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-medium bg-primary hover:bg-primary-hover text-primary-foreground transition-all shadow-sm active:translate-y-px shrink-0 cursor-pointer"
          title="Write New Report"
        >
          <span className="text-sm font-bold leading-none">+</span>
          <span className="hidden md:inline">Write Report</span>
        </button>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Sunlight Mode Toggle */}
        {onToggleSunlightMode && (
          <button
            type="button"
            onClick={onToggleSunlightMode}
            className="sunlight-toggle-btn flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer shadow-xs hover:opacity-90 shrink-0 border"
            style={{
              backgroundColor: sunlightMode ? "#003822" : "var(--secondary)",

              color: sunlightMode ? "#ffffff" : "var(--foreground)",

              borderColor: sunlightMode ? "transparent" : "var(--border)",
            }}
            title={
              sunlightMode
                ? "Switch to Standard Mode"
                : "Switch to Sunlight Mode"
            }
            aria-label={
              sunlightMode
                ? "Switch to Standard Mode"
                : "Switch to Sunlight Mode"
            }
          >
            <ContrastIcon className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">
              {sunlightMode ? "Standard Mode" : "Sunlight Mode"}
            </span>
          </button>
        )}

        {/* Search Bar */}
        <div
          className="flex items-center gap-2 rounded-md border px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm shrink min-w-27.5 max-w-xs"
          style={{
            borderColor: searchQuery ? "var(--primary-hover)" : "var(--border)",

            backgroundColor: "var(--card)",

            color: "var(--muted-foreground)",
          }}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 13 13"
            fill="none"
            className="shrink-0"
          >
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
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search reports…"
            className="search-bar-input bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground w-16 sm:w-28 md:w-36 lg:w-44 focus:w-28 sm:focus:w-36 md:focus:w-48 transition-all min-w-0"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="text-muted-foreground hover:text-foreground text-xs shrink-0"
            >
              ✕
            </button>
          )}
        </div>

        <button
          className="relative p-1.5 rounded-md transition-colors shrink-0"
          style={{ color: "var(--muted-foreground)" }}
          aria-label="Notifications"
        >
          <BellIcon size={16} />
          <span
            className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "var(--accent)" }}
          />
        </button>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0"
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

  const [activityFilter, setActivityFilter] =
    useState<"all" | "Submitted" | "Approved" | "Flagged">("all")

  // Strictly enforce non-draft reports in DashboardView

  const nonDraftReports = useMemo(
    () =>
      reports.filter(
        (r) => r.status && r.status.toLowerCase().trim() !== "draft",
      ),

    [reports],
  )

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return nonDraftReports

    const q = searchQuery.toLowerCase()

    return nonDraftReports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.author.toLowerCase().includes(q) ||
        r.department.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q),
    )
  }, [nonDraftReports, searchQuery])

  // Sort real report activities chronologically (newest first, strictly EXCLUDING Drafts)

  const sortedActivities = useMemo(() => {
    const list = [...nonDraftReports].sort(
      (a, b) =>
        new Date(b.submitted).getTime() - new Date(a.submitted).getTime(),
    )

    if (activityFilter === "all") return list

    return list.filter((r) => r.status === activityFilter)
  }, [nonDraftReports, activityFilter])

  const recent = filteredReports.slice(0, 5)

  const now = new Date()

  let options = { day: "numeric", month: "short", year: "numeric" } as const

  let today = now.toLocaleDateString("en-US", options)

  const totalCount = nonDraftReports.length

  const pendingCount = nonDraftReports.filter(
    (r) => r.status === "Submitted",
  ).length

  const flaggedCount = nonDraftReports.filter(
    (r) => r.status === "Flagged",
  ).length

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
        <StatCard
          label="Pending Approval"
          value={pendingCount.toString()}
          sub="Needs review"
          accent
        />
        <StatCard
          label="Open Issues"
          value={flaggedCount.toString()}
          sub="Flagged items"
        />
        <StatCard
          label="Team Members"
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
              <div
                key={r.id}
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
          <div
            className="rounded-lg border"
            style={{
              backgroundColor: "var(--card)",

              borderColor: "var(--border)",
            }}
          >
            <div
              className="px-5 py-3.5 border-b flex items-center justify-between"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
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
              className="divide-y max-h-95 overflow-y-auto"
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
                      <div
                        key={d.id}
                        onClick={() => {
                          setSelectedDeadlineId((prev) =>
                            prev === d.id ? null : d.id,
                          )

                          setConfirmDeleteId(null)
                        }}
                        className={`px-5 py-3 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-secondary/60 border-l-2 border-l-primary"
                            : "hover:bg-white/2"
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
                                  <span className="hidden sm:inline">
                                    MEDIUM
                                  </span>
                                  <span className="sm:hidden">MED</span>
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
                            <span
                              className={`text-[11px] font-mono font-semibold block mt-0.5 ${
                                urgency.isOverdue
                                  ? "text-rose-400"
                                  : urgency.isUrgent
                                    ? "text-amber-400"
                                    : "text-emerald-400"
                              }`}
                            >
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
                                <TrashIcon className="w-3.5 h-3.5" />
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
                {([
                  { id: "all", label: "All" },

                  { id: "Submitted", label: "Submissions" },

                  { id: "Approved", label: "Approved" },

                  { id: "Flagged", label: "Flagged" },
                ] as const)

                  .map((tab) => (
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
            <div className="divide-y divide-border/60 max-h-95 overflow-y-auto">
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
                      className="px-5 py-3 flex items-center justify-between gap-3 text-xs transition-colors hover:bg-white/4 cursor-pointer group"
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

const REPORT_STATUSES: (Exclude<ReportStatus, "Draft"> | "All")[] = [
  "All",

  "Approved",

  "Submitted",

  "Flagged",
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

  const [statusFilter, setStatusFilter] =
    useState<Exclude<ReportStatus, "Draft"> | "All">("All")

  const [expanded, setExpanded] = useState<number | null>(null)

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()

    return reports.filter(
      (r) =>
        r.status &&
        r.status.toLowerCase().trim() !== "draft" &&
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

function TeamView({
  members = MEMBERS,
  setMembers,
  currentUserEmail,
}: {
  members?: Member[]

  setMembers?: React.Dispatch<React.SetStateAction<Member[]>>

  currentUserEmail?: string
}) {
  const [dept, setDept] = useState("All")

  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null)

  const [toastMsg, setToastMsg] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const isSuperAdmin =
    currentUserEmail?.toLowerCase().trim() === "info@gve-group.com"

  const handleToggleAdmin = async (targetMember: Member) => {
    if (!targetMember.email) return

    const newAdminStatus = !targetMember.isAdmin

    setUpdatingEmail(targetMember.email)

    setToastMsg(null)

    try {
      const { error } = await supabase

        .from("members")

        .update({ is_admin: newAdminStatus })

        .eq("email", targetMember.email)

      if (error) {
        setToastMsg({
          type: "error",

          text: error.message || "Failed to update administrator privileges.",
        })
      } else {
        if (setMembers) {
          setMembers((prev) =>
            prev.map((m) =>
              m.email === targetMember.email
                ? { ...m, isAdmin: newAdminStatus }
                : m,
            ),
          )
        }

        setToastMsg({
          type: "success",

          text: newAdminStatus
            ? `${targetMember.name} promoted to Administrator.`
            : `Administrator privileges revoked for ${targetMember.name}.`,
        })

        setTimeout(() => setToastMsg(null), 4000)
      }
    } catch (err: any) {
      setToastMsg({
        type: "error",

        text: err?.message || "Unexpected error updating member.",
      })
    } finally {
      setUpdatingEmail(null)
    }
  }

  const filtered =
    dept === "All" ? members : members.filter((m) => m.department === dept)

  return (
    <div className="flex flex-col gap-5">
      {/* Super Admin Notice Banner */}
      {isSuperAdmin && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-emerald-950/25 border border-emerald-800/40 text-xs font-mono text-emerald-300">
          <ShieldCheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Parent Administrator Mode:</strong> You are authorized to
            promote staff accounts to administrator status or revoke existing
            admin privileges.
          </span>
        </div>
      )}

      {/* Action Feedback Toast */}
      {toastMsg && (
        <div
          className={`text-xs font-mono px-4 py-2.5 rounded-lg border flex items-center justify-between ${
            toastMsg.type === "success"
              ? "bg-emerald-950/40 border-emerald-700/60 text-emerald-300"
              : "bg-rose-950/40 border-rose-800/60 text-rose-300"
          }`}
        >
          <span>{toastMsg.text}</span>
          <button
            onClick={() => setToastMsg(null)}
            className="text-xs underline hover:text-white cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Department tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {DEPARTMENTS.map((d) => (
          <button
            key={d}
            onClick={() => setDept(d)}
            className="px-3 py-1.5 rounded text-xs font-mono border transition-all duration-100 cursor-pointer"
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
        {filtered.map((m) => {
          const isParentAdminMember =
            m.email?.toLowerCase().trim() === "info@gve-group.com"

          return (
            <div
              key={m.id}
              className="rounded-lg border p-5 flex flex-col justify-between gap-3 transition-all duration-150 hover:border-primary"
              style={{
                backgroundColor: "var(--card)",

                borderColor: "var(--border)",
              }}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-mono font-medium shrink-0"
                    style={{
                      backgroundColor: m.color + "33",

                      color: "var(--foreground)",

                      border: `1px solid ${m.color}66`,
                    }}
                  >
                    {m.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: "var(--foreground)" }}
                      >
                        {m.name}
                      </p>

                      {isParentAdminMember ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                          <ShieldCheckIcon className="w-3 h-3 text-emerald-400" />
                          Parent Admin
                        </span>
                      ) : m.isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                          <ShieldIcon className="w-3 h-3 text-amber-400" />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-secondary/60 border border-border shrink-0">
                          Staff
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {m.role}
                    </p>
                    {m.email && (
                      <p className="text-[11px] font-mono truncate text-muted-foreground/70">
                        {m.email}
                      </p>
                    )}
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
                      className="font-mono font-medium"
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

              {/* Super Admin Promotion Controls */}
              {isSuperAdmin && m.email && !isParentAdminMember && (
                <div className="pt-3 border-t border-border/60 mt-1">
                  {m.isAdmin ? (
                    <button
                      type="button"
                      onClick={() => handleToggleAdmin(m)}
                      disabled={updatingEmail === m.email}
                      className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border border-rose-800/50 bg-rose-950/20 text-rose-300 hover:bg-rose-900/40 hover:border-rose-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <KeyIcon className="w-3.5 h-3.5 text-rose-400" />
                      {updatingEmail === m.email
                        ? "Revoking..."
                        : "Revoke Admin Access"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggleAdmin(m)}
                      disabled={updatingEmail === m.email}
                      className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border border-emerald-700/50 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40 hover:border-emerald-600 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                      {updatingEmail === m.email
                        ? "Promoting..."
                        : "Promote to Admin"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
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
            Real-time mini-grid telemetry, compliance tracking, and departmental
            reporting performance
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
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
          <ReportDistributionChart typeData={typeData} deptData={deptMetrics} />
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
              <GveDailyHourlyForm
                initialData={report.gveData}
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
                author={report.author}
                isAdmin={true}
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
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800/40 text-amber-300 text-xs font-mono flex items-start gap-2">
              <AlertIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Policy Restriction: Reports older than 30 days (submitted on{" "}
                {new Date(report.submitted).toLocaleDateString()}) cannot be
                flagged for revision.
              </span>
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

        summary:
          summary.trim() ||
          `Official Site Quarterly Maintenance Audit Report for ${quarterlyData.siteName || "site"}.`,

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
            isAdmin={true}
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
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
              <CalendarIcon className="w-4 h-4 text-emerald-400" />
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
                    {p === "High" ? "High" : p === "Medium" ? "Medium" : "Low"}
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

  setMembers,

  currentUserEmail,

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const [inspectingReport, setInspectingReport] = useState<Report | null>(null)

  const [flaggingReport, setFlaggingReport] = useState<Report | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")

  // Strictly filter out any reports in Draft stage so they are completely inaccessible to admins

  const adminReports = useMemo(
    () =>
      reports.filter(
        (r) => r.status && r.status.toLowerCase().trim() !== "draft",
      ),

    [reports],
  )

  const handleSearchChange = (q: string) => {
    setSearchQuery(q)

    if (q.trim() && view !== "reports") {
      setView("reports")
    }
  }

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)

    window.addEventListener("resize", handleResize)

    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Generous sidebar width for fitted logo and Admin badge

  const sidebarW = collapsed ? 56 : isMobile ? 216 : 248

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
      <Sidebar
        active={view}
        onChange={setView}
        collapsed={collapsed}
        onLogout={onLogout}
        topOffset={topOffset}
        sidebarW={sidebarW}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
      <Header
        view={view}
        sidebarW={sidebarW}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        topOffset={topOffset}
        sunlightMode={sunlightMode}
        onToggleSunlightMode={onToggleSunlightMode}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        role="admin"
        userName="George"
        userDepartment="IT Dept"
        sunlightMode={sunlightMode}
        onToggleSunlightMode={onToggleSunlightMode}
      />

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="fixed z-30 flex items-center justify-center rounded-md border transition-all duration-200 cursor-pointer shadow-xs hover:bg-secondary"
        style={{
          top: "50%",

          transform: "translateY(-50%)",

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
      <main
        className="transition-all duration-200"
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
        {view === "teams" && (
          <TeamView
            members={members}
            setMembers={setMembers}
            currentUserEmail={currentUserEmail}
          />
        )}
        {view === "analytics" && (
          <AnalyticsView
            reports={adminReports}
            members={members}
            deadlines={deadlines}
          />
        )}

        {/* Institutional Footer */}
        <footer className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground/80 font-mono">
          {new Date().getFullYear()} &copy; ReportFlow • GVE Group Field
          Infrastructure Network.
        </footer>
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
