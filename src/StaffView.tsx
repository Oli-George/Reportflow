import { useState, useMemo, useEffect, useCallback } from "react"

import {
  Report,
  Member,
  Badge,
  Deadline,
  formatDeadlineDate,
  getDeadlineUrgency,
  DEFAULT_DEADLINES,
} from "./AdminView"

import GveDailyHourlyForm from "./components/GveHourlyForm"
import GveWeeklyForm from "./components/GveWeeklyForm"
import GveQuarterlyForm from "./components/GveQuarterlyForm"
import ReportPhotoUploader from "./components/ReportPhotoUploader"
import { draftStorage, FormDraft } from "./lib/draftStorage"
import { usePwaInstall } from "./hooks/usePwaInstall"
import { flushOfflineQueue } from "./lib/syncQueue"
import logoImg from "./components/logo.jpeg"
import {
  ContrastIcon,
  FileTextIcon,
  ClipboardIcon,
  AlertIcon,
  InfoIcon,
  CheckIcon,
  HomeIcon,
  ListIcon,
  PlusIcon,
  LogOutIcon,
  CalendarIcon,
} from "./components/Icons"
import SettingsModal from "./components/SettingsModal"

// ─── Types & Props ──────────────────────────────────────────────────────────

interface StaffViewProps {
  reports: Report[]

  setReports: React.Dispatch<React.SetStateAction<Report[]>>

  member: Member

  deadlines?: Deadline[]

  onLogout: () => void

  topOffset?: number

  sunlightMode?: boolean

  onToggleSunlightMode?: () => void

  isOffline?: boolean

  pendingQueueCount?: number

  onFlushQueue?: () => Promise<{ synced: number; failed: number }>
}

type StaffTab = "dashboard" | "history" | "submit"

export default function StaffView({
  reports,
  setReports,
  member,
  deadlines = DEFAULT_DEADLINES,
  onLogout,
  topOffset = 0,
  sunlightMode = false,
  onToggleSunlightMode,
  isOffline = typeof navigator !== "undefined" ? !navigator.onLine : false,
  pendingQueueCount = 0,
  onFlushQueue,
}: StaffViewProps) {
  const [activeTab, setActiveTab] = useState<StaffTab>("dashboard")
  const [collapsed, setCollapsed] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null)

  // Composer Form State

  const [editingReportId, setEditingReportId] = useState<number | null>(null)

  const [searchQuery, setSearchQuery] = useState("")

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [confirmSubmitReportId, setConfirmSubmitReportId] =
    useState<number | null>(null)

  const [selectedFormFormat, setSelectedFormFormat] =
    useState<"gveDaily" | "gveWeekly" | "gveQuarterly">("gveDaily")

  const [isSyncing, setIsSyncing] = useState(false)
  const [localDrafts, setLocalDrafts] = useState<FormDraft[]>([])

  const { isInstallable, triggerInstall } = usePwaInstall()

  // Load auto-saved form drafts for this technician
  const loadDrafts = useCallback(async () => {
    try {
      const drafts = await draftStorage.listDraftsForAuthor(member.name)
      setLocalDrafts(drafts)
    } catch (err) {
      console.warn("Could not list local drafts:", err)
    }
  }, [member.name])

  useEffect(() => {
    loadDrafts()
    const interval = setInterval(loadDrafts, 10000)
    return () => clearInterval(interval)
  }, [loadDrafts, activeTab])

  const handleManualSync = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      const res = onFlushQueue ? await onFlushQueue() : await flushOfflineQueue()
      if (res.synced > 0) {
        setToastMessage(`Successfully synced ${res.synced} offline report(s)!`)
        setTimeout(() => setToastMessage(null), 3000)
      }
    } catch (err) {
      console.error("Sync error:", err)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleResumeDraft = (draft: FormDraft) => {
    setSelectedFormFormat(draft.formType)
    setEditingReportId(draft.reportId ?? null)
    setActiveTab("submit")
  }

  const handleDiscardDraft = async (draft: FormDraft) => {
    await draftStorage.deleteDraft(draft.formType, member.name, draft.reportId)
    await loadDrafts()
  }

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // 85% of desktop 240px sidebar width is 204px on mobile viewports
  const sidebarW = collapsed ? 56 : isMobile ? 204 : 240

  // Filter reports belonging to the current staff member

  const myReports = useMemo(() => {
    return reports.filter(
      (r) => r.author.toLowerCase() === member.name.toLowerCase(),
    )
  }, [reports, member])

  const showSearch = myReports.length >= 2

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return myReports

    const q = searchQuery.toLowerCase()

    return myReports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q),
    )
  }, [myReports, searchQuery])

  // Filter deadlines for this staff member's department and general organizational deadlines

  const myDeadlines = useMemo(() => {
    if (!deadlines || deadlines.length === 0) return []

    const memberDept = member.department.trim().toLowerCase()

    return [...deadlines]

      .filter((d) => {
        const dDept = d.department.trim().toLowerCase()

        return (
          dDept === memberDept || dDept === "all departments" || dDept === "all"
        )
      })

      .sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
  }, [deadlines, member.department])

  // Compute metrics for the logged-in staff member

  const stats = useMemo(() => {
    const total = myReports.length

    const approved = myReports.filter((r) => r.status === "Approved").length

    const submitted = myReports.filter((r) => r.status === "Submitted").length

    const drafts = myReports.filter((r) => r.status === "Draft").length

    const flagged = myReports.filter((r) => r.status === "Flagged").length

    return { total, approved, submitted, drafts, flagged }
  }, [myReports])

  // Handle Load Draft or Flagged Report into Composer

  const handleEditReport = (report: Report) => {
    setEditingReportId(report.id)

    if (report.gveWeeklyData) {
      setSelectedFormFormat("gveWeekly")
    } else {
      setSelectedFormFormat("gveDaily")
    }

    setActiveTab("submit")
  }

  const handleCancelEdit = () => {
    setEditingReportId(null)

    setActiveTab("history")
  }

  const handleDirectSubmit = (reportId: number) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === reportId
          ? { ...r, status: "Submitted", submitted: new Date() }
          : r,
      ),
    )

    setToastMessage("Draft submitted successfully for Admin review!")

    setTimeout(() => setToastMessage(null), 3000)
  }

  return (
    <div
      style={{
        backgroundColor: "var(--background)",
        minHeight: "100vh",
        fontFamily: "var(--font-body, DM Sans, sans-serif)",
      }}
    >
      {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 flex flex-col border-r z-20 transition-all duration-200"
        style={{
          top: topOffset,

          height: topOffset > 0 ? `calc(100vh - ${topOffset}px)` : "100vh",

          width: sidebarW,

          backgroundColor: "var(--card)",

          borderColor: "var(--border)",
        }}
      >
        {/* Logo */}
        <div
          className={`flex items-center border-b shrink-0 ${
            collapsed ? "justify-center px-0" : "gap-3 px-4"
          }`}
          style={{ height: 56, borderColor: "var(--border)" }}
        >
          <div
            className={`shrink-0 flex items-center justify-center rounded-md bg-white border border-border/40 shadow-xs ${
              collapsed ? "w-10 h-7.5 p-1" : "h-8 w-24 px-2 py-1"
            }`}
          >
            <img src={logoImg} alt="GVE Logo" className="max-h-full max-w-full object-contain" />
          </div>
          {!collapsed && (
            <span className="font-display font-700 text-base tracking-tight truncate text-foreground">
              ReportFlow
            </span>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {[
            { id: "dashboard" as const, label: "Dashboard", icon: HomeIcon },

            { id: "history" as const, label: "My Reports", icon: ListIcon },

            {
              id: "submit" as const,
              label: editingReportId ? "Edit Report" : "Create Report",
              icon: PlusIcon,
            },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id

            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
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
                    e.currentTarget.style.backgroundColor = "var(--secondary)"

                  e.currentTarget.style.color = "var(--foreground)"
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent"

                    e.currentTarget.style.color = "var(--muted-foreground)"
                  }
                }}
              >
                <span className="flex shrink-0 items-center justify-center">
                  <Icon size={18} />
                </span>
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            )
          })}
        </nav>

        {/* User profile & Settings Card (Click anywhere to open Settings) */}
        <div
          className="p-3 border-t flex flex-col gap-2"
          style={{ borderColor: "var(--border)" }}
        >
          <div
            onClick={() => setIsSettingsOpen(true)}
            className={`group/user flex items-center ${
              collapsed ? "justify-center" : "justify-between"
            } gap-2 p-1.5 -m-1.5 rounded-lg hover:bg-secondary/70 cursor-pointer transition-all border border-transparent hover:border-border/60 select-none`}
            title="System Settings"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-semibold shrink-0 group-hover/user:scale-105 transition-transform"
                style={{
                  backgroundColor: `${member.color}33`,
                  color: "var(--foreground)",
                  border: `1px solid ${member.color}66`,
                }}
              >
                {member.initials}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-foreground group-hover/user:text-primary transition-colors">
                    {member.name}
                  </p>
                  <p className="text-[10px] truncate text-muted-foreground">
                    {member.department}
                  </p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onLogout?.()
                }}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors shrink-0"
                title="Log Out"
              >
                <LogOutIcon size={16} />
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
              <LogOutIcon size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Collapse toggle button */}
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

      {/* ─── Header ────────────────────────────────────────────────────────── */}
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
        <h1 className="font-display font-600 text-base sm:text-lg text-foreground capitalize whitespace-nowrap shrink-0">
          {activeTab === "dashboard"
            ? "My Portal"
            : activeTab === "history"
              ? "My Reports"
              : editingReportId
                ? "Revise Report"
                : "Submit Report"}
        </h1>
        <div className="flex items-center gap-2.5">
          {/* Offline / Sync Queue Status Chip */}
          {isOffline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-950/80 border border-amber-600/70 text-amber-300 text-xs font-mono shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="font-semibold">Offline</span>
              {pendingQueueCount > 0 && (
                <span className="bg-amber-900/80 px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {pendingQueueCount} queued
                </span>
              )}
            </div>
          ) : pendingQueueCount > 0 ? (
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-900/90 hover:bg-emerald-800 border border-emerald-600 text-emerald-100 text-xs font-mono font-semibold cursor-pointer transition-colors shadow-xs"
              title="Click to flush cached offline reports to Supabase"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isSyncing ? "Syncing..." : `Sync (${pendingQueueCount})`}</span>
            </button>
          ) : null}

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              type="button"
              onClick={triggerInstall}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-md border text-xs font-mono font-semibold bg-emerald-900/60 hover:bg-emerald-800 border-emerald-600 text-emerald-200 transition-all cursor-pointer shadow-xs shrink-0"
              title="Install ReportFlow as standalone app on this device (Privacy: all cached drafts remain strictly local until submitted)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {onToggleSunlightMode && (
            <button
              type="button"
              onClick={onToggleSunlightMode}
              className="sunlight-toggle-btn flex items-center justify-center gap-1.5 px-2 lg:px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-all cursor-pointer shadow-xs hover:opacity-90 shrink-0"
              style={{
                backgroundColor: sunlightMode ? "#003822" : "var(--secondary)",
                color: sunlightMode ? "#ffffff" : "var(--foreground)",
                border: "1px solid transparent",
              }}
              title={sunlightMode ? "Switch to Standard Mode" : "Switch to Sunlight Mode"}
            >
              <ContrastIcon className="w-4 h-4" />
              <span className="hidden lg:inline">
                {sunlightMode ? "Standard Mode" : "Sunlight Mode"}
              </span>
            </button>
          )}

          {showSearch && (
            <div
              className="flex items-center gap-2 rounded-md border px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm shrink-0"
              style={{
                borderColor: searchQuery
                  ? "var(--primary-hover)"
                  : "var(--border)",

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
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reports…"
                className="search-bar-input bg-transparent border-none outline-none text-xs sm:text-sm text-foreground placeholder:text-muted-foreground w-20 sm:w-28 md:w-36 lg:w-44 focus:w-28 sm:focus:w-36 md:focus:w-48 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2.5 text-xs font-mono text-muted-foreground shrink-0">
            <span className="hidden sm:inline">
              Department:{" "}
              <strong className="text-foreground">{member.department}</strong>
            </span>
            <span className="hidden xl:inline">
              Role: <strong className="text-foreground">{member.role}</strong>
            </span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
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
        {/* Tab 1: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="flex flex-col gap-6">
            {/* Staff Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Total Filed
                </p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-foreground">
                  {stats.total}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Submitted & drafts
                </p>
              </div>
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  Approved
                </p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-emerald-400">
                  {stats.approved}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Confirmed by Admin
                </p>
              </div>
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-accent">
                  Needs Revision
                </p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-accent">
                  {stats.flagged}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Flagged reports
                </p>
              </div>
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  On-Time compliance
                </p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-foreground">
                  {member.compliance}%
                </p>
                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full bg-primary-hover transition-all duration-300"
                    style={{ width: `${member.compliance}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Active Local Drafts (Auto-Saved in IndexedDB) */}
            {localDrafts.length > 0 && (
              <div className="rounded-lg border bg-card border-amber-500/40 p-5 flex flex-col gap-3 shadow-md animate-fadeIn">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <h2 className="font-display font-700 text-sm text-foreground">
                      Active Local Drafts (Auto-Saved)
                    </h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      {localDrafts.length} Saved in IndexedDB
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
                    Protected locally from device battery loss
                  </span>
                </div>
                <div className="flex flex-col gap-2.5 pt-1 w-full">
                  {localDrafts.map((d) => {
                    const formLabel =
                      d.formType === "gveDaily"
                        ? "Physical Form: Hourly Operational Log"
                        : d.formType === "gveWeekly"
                          ? "Physical Form: Weekly Operational Report"
                          : "Physical Form: Quarterly System Audit"

                    const timeStr = new Date(d.lastSavedAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })

                    return (
                      <div
                        key={d.id}
                        className="w-full rounded-md border border-border bg-secondary/40 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-primary-hover transition-all"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-mono font-bold text-foreground truncate">
                            {formLabel}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            Site: <strong className="text-foreground">{d.siteName || "Unspecified"}</strong> · Saved at {timeStr}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleResumeDraft(d)}
                            className="px-3 py-1 rounded text-xs font-mono font-bold bg-primary hover:bg-primary-hover text-primary-foreground transition-colors shadow-2xs cursor-pointer"
                          >
                            Resume
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDiscardDraft(d)}
                            className="px-2 py-1 rounded text-xs font-mono text-muted-foreground hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Discard this local draft"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Content Split: Submissions on Left, Deadlines on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column: Recent activity of this member */}
              <div className="lg:col-span-3 rounded-lg border bg-card border-border flex flex-col">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-display font-600 text-sm text-foreground">
                    Recent Submissions
                  </h2>
                </div>
                <div className="divide-y divide-border">
                  {myReports.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No reports filed yet. Click "Create Report" to compose
                      your first report.
                    </div>
                  ) : (
                    filteredReports.slice(0, 4).map((r) => (
                      <div
                        key={r.id}
                        className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/1 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {r.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            Type: {r.type} · Submitted:{" "}
                            {r.submitted.toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <Badge status={r.status} />
                          {(r.status === "Draft" || r.status === "Flagged") && (
                            <button
                              onClick={() => handleEditReport(r)}
                              className="text-xs font-mono px-2 py-1 rounded bg-secondary hover:bg-primary border border-border text-muted-foreground hover:text-foreground transition-all"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Deadlines and Compliance info */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {/* Department Deadlines */}
                <div className="rounded-lg border bg-card border-border flex flex-col">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-display font-600 text-sm text-foreground flex items-center gap-2">
                      <CalendarIcon size={16} /> Upcoming Deadlines
                    </h2>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50">
                      {member.department}
                    </span>
                  </div>
                  <div className="divide-y divide-border max-h-85 overflow-y-auto">
                    {myDeadlines.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground font-mono">
                        No upcoming submission deadlines scheduled for{" "}
                        {member.department}.
                      </div>
                    ) : (
                      myDeadlines.map((d) => {
                        const urgency = getDeadlineUrgency(d.dueDate)

                        return (
                          <div
                            key={d.id}
                            className="px-5 py-3.5 flex items-center justify-between gap-3 text-sm hover:bg-white/2 transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p
                                  className="font-medium text-foreground text-xs sm:text-sm truncate"
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
                                    <span className="hidden sm:inline">MEDIUM</span>
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
                                {d.description && (
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
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: My Reports (History) */}
        {activeTab === "history" && (
          <div className="rounded-lg border bg-card border-border overflow-x-auto">
            <div
              className="grid min-w-135 px-5 py-2.5 border-b text-xs font-mono uppercase tracking-wider bg-secondary border-border text-muted-foreground gap-x-4 items-center"
              style={{ gridTemplateColumns: "minmax(0, 1fr) 80px 110px 135px" }}
            >
              <span>Report Title</span>
              <span>Type</span>
              <span>Last Updated</span>
              <span>Status & Action</span>
            </div>

            {filteredReports.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? "No reports match your search."
                  : "No reports matching your account."}
              </div>
            ) : (
              filteredReports.map((r) => (
                <div key={r.id}>
                  <button
                    onClick={() =>
                      setExpandedReportId(
                        expandedReportId === r.id ? null : r.id,
                      )
                    }
                    className="w-full grid min-w-135 px-5 py-3.5 border-b text-left transition-colors hover:bg-white/2 items-center border-border gap-x-4"
                    style={{
                      gridTemplateColumns: "minmax(0, 1fr) 80px 110px 135px",

                      backgroundColor:
                        expandedReportId === r.id
                          ? "var(--secondary)"
                          : "transparent",
                    }}
                  >
                    <div className="min-w-0 pr-3">
                      <span className="text-sm font-medium text-foreground truncate block">
                        {r.title}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">
                      {r.type}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {r.submitted.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <Badge status={r.status} />
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        className={`transition-transform ${
                          expandedReportId === r.id ? "rotate-90" : ""
                        }`}
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        <path
                          d="M3 2l4 3-4 3"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>

                  {expandedReportId === r.id && (
                    <div className="px-5 py-4 border-b border-border bg-background/50 min-w-135">
                      {r.gveData ? (
                        <div className="mb-4">
                          <p className="text-xs font-mono uppercase tracking-wider mb-2 text-emerald-400">
                            Physical Form Replica — GVE Site Hourly Record
                          </p>
                          <GveDailyHourlyForm
                            initialData={r.gveData}
                            readOnly={true}
                          />
                        </div>
                      ) : r.gveWeeklyData ? (
                        <div className="mb-4">
                          <p className="text-xs font-mono uppercase tracking-wider mb-2 text-emerald-400">
                            Physical Form Replica — Weekly Site Report Form
                          </p>
                          <GveWeeklyForm
                            initialData={r.gveWeeklyData}
                            readOnly={true}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-mono uppercase tracking-wider mb-2 text-muted-foreground">
                            Report Content / Summary
                          </p>
                          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                            {r.summary}
                          </p>
                          {r.attachments && r.attachments.length > 0 && (
                            <div className="mt-3">
                              <ReportPhotoUploader
                                attachments={r.attachments}
                                readOnly={true}
                                author={r.author}
                                isAdmin={false}
                                title="Attached Site Photos"
                              />
                            </div>
                          )}
                        </>
                      )}

                      {r.status === "Flagged" && r.feedback && (
                        <div className="mt-3 p-3 rounded bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs font-mono">
                          <strong className="block uppercase text-[10px] tracking-wider text-amber-400 font-bold mb-1">
                            Admin Revision Notes:
                          </strong>
                          {r.feedback}
                        </div>
                      )}

                      {(r.status === "Draft" || r.status === "Flagged") && (
                        <div className="flex items-center gap-3 mt-4 border-t border-border/40 pt-4">
                          <button
                            onClick={() => handleEditReport(r)}
                            className="text-xs font-mono px-3.5 py-1.5 rounded bg-secondary hover:bg-border text-foreground border border-border transition-colors flex items-center gap-1.5 font-medium cursor-pointer"
                          >
                            Edit &amp; Review Draft
                          </button>
                          <button
                            onClick={() => setConfirmSubmitReportId(r.id)}
                            className="text-xs font-mono px-3.5 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary-hover font-semibold transition-colors flex items-center gap-1.5 shadow cursor-pointer"
                          >
                            Submit Report
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Submit Report (Composer) */}
        {activeTab === "submit" && (
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            {/* Form Selection Bar */}
            <div className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-foreground">
                  Select Submission Format
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Choose physical site form replica format
                </p>
              </div>
              <div className="flex items-center gap-2 bg-secondary p-1 rounded-md border border-border flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedFormFormat("gveDaily")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                    selectedFormFormat === "gveDaily"
                      ? "format-selector-active bg-primary text-primary-foreground font-bold shadow-xs border border-emerald-800"
                      : "bg-card/70 hover:bg-card text-foreground font-semibold border border-border/80 shadow-2xs"
                  }`}
                >
                  <FileTextIcon className="w-3.5 h-3.5" />
                  <span>Physical Form: GVE Hourly Log</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormFormat("gveWeekly")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                    selectedFormFormat === "gveWeekly"
                      ? "format-selector-active bg-primary text-primary-foreground font-bold shadow-xs border border-emerald-800"
                      : "bg-card/70 hover:bg-card text-foreground font-semibold border border-border/80 shadow-2xs"
                  }`}
                >
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  <span>Physical Form: Weekly Site Report</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormFormat("gveQuarterly")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded transition-all cursor-pointer ${
                    selectedFormFormat === "gveQuarterly"
                      ? "format-selector-active bg-primary text-primary-foreground font-bold shadow-xs border border-emerald-800"
                      : "bg-card/70 hover:bg-card text-foreground font-semibold border border-border/80 shadow-2xs"
                  }`}
                >
                  <ClipboardIcon className="w-3.5 h-3.5" />
                  <span>Physical Form: Quarterly Inspection</span>
                </button>
              </div>
            </div>

            {/* Form Composer Card */}
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg relative">
              {toastMessage && (
                <div className="mb-4 p-3 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
                  <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{toastMessage}</span>
                </div>
              )}
              {selectedFormFormat === "gveDaily" ? (
                <GveDailyHourlyForm
                  key={editingReportId ?? "new-daily"}
                  author={member.name}
                  reportId={editingReportId}
                  initialData={
                    reports.find((r) => r.id === editingReportId)?.gveData
                  }
                  onSave={(formData, status) => {
                    const newId =
                      reports.length > 0
                        ? Math.max(...reports.map((r) => r.id)) + 1
                        : 1

                    const siteTitle = formData.title || (formData.siteName
                      ? `${formData.siteName} Hourly Record — ${formData.date}`
                      : `GVE Site Hourly Record — ${formData.date}`)

                    const newReport: Report = {
                      id: editingReportId ?? newId,

                      title: siteTitle,

                      author: member.name,

                      department: member.department,

                      type: "Daily",

                      submitted: new Date(),

                      status: status,

                      summary: `Official ${formData.siteName || "GVE"} Site Operational Hourly Record for ${formData.date} (${formData.day}). Includes 12-hour solar PV, battery storage, site load, and grid parameters.`,

                      attachments: formData.attachments || [],

                      gveData: formData,
                    }

                    if (editingReportId !== null) {
                      setReports((prev) =>
                        prev.map((r) =>
                          r.id === editingReportId ? newReport : r,
                        ),
                      )
                    } else {
                      setReports((prev) => [newReport, ...prev])
                    }

                    setToastMessage(
                      status === "Draft"
                        ? "Saved as Draft! You can view and edit it in My Reports before final submission."
                        : "Report Submitted Successfully! Sent to Admin for review.",
                    )

                    setTimeout(() => {
                      setActiveTab("history")

                      setEditingReportId(null)

                      setToastMessage(null)
                    }, 1400)
                  }}
                  onCancel={() => handleCancelEdit()}
                />
              ) : selectedFormFormat === "gveWeekly" ? (
                <GveWeeklyForm
                  key={editingReportId ?? "new-weekly"}
                  author={member.name}
                  reportId={editingReportId}
                  initialData={
                    reports.find((r) => r.id === editingReportId)?.gveWeeklyData
                  }
                  onSave={(weeklyData, status) => {
                    const newId =
                      reports.length > 0
                        ? Math.max(...reports.map((r) => r.id)) + 1
                        : 1

                    const siteTitle =
                      weeklyData.title ||
                      (weeklyData.siteName
                        ? `Weekly Site Report Form — ${weeklyData.siteName}`
                        : "Weekly Site Report Form")

                    const newReport: Report = {
                      id: editingReportId ?? newId,

                      title: siteTitle,

                      author: member.name,

                      department: member.department,

                      type: "Weekly",

                      submitted: new Date(),

                      status: status,

                      summary: `Official GVE Weekly Site Report Form containing overall facility cleanliness, outages/faults log over the week, and complete weekly equipment remarks.`,

                      attachments: weeklyData.attachments || [],

                      gveWeeklyData: weeklyData,
                    }

                    if (editingReportId !== null) {
                      setReports((prev) =>
                        prev.map((r) =>
                          r.id === editingReportId ? newReport : r,
                        ),
                      )
                    } else {
                      setReports((prev) => [newReport, ...prev])
                    }

                    setToastMessage(
                      status === "Draft"
                        ? "Saved as Draft! You can view and edit it in My Reports before final submission."
                        : "Report Submitted Successfully! Sent to Admin for review.",
                    )

                    setTimeout(() => {
                      setActiveTab("history")

                      setEditingReportId(null)

                      setToastMessage(null)
                    }, 1400)
                  }}
                  onCancel={() => handleCancelEdit()}
                />
              ) : (
                <GveQuarterlyForm
                  key={editingReportId ?? "new-quarterly"}
                  author={member.name}
                  reportId={editingReportId}
                  initialData={
                    reports.find((r) => r.id === editingReportId)?.gveQuarterlyData
                  }
                  onSave={(quarterlyData, status) => {
                    const newId =
                      reports.length > 0
                        ? Math.max(...reports.map((r) => r.id)) + 1
                        : 1

                    const siteTitle =
                      quarterlyData.title ||
                      (quarterlyData.siteName
                        ? `Quarterly Site Inspection Form — ${quarterlyData.siteName}`
                        : "Quarterly Site Inspection Form")

                    const newReport: Report = {
                      id: editingReportId ?? newId,
                      title: siteTitle,
                      author: member.name,
                      department: member.department,
                      type: "Quarterly",
                      submitted: new Date(),
                      status: status,
                      summary: `Comprehensive 10-page Quarterly Site Audit and Preventive Maintenance Inspection for ${quarterlyData.siteName || "Mini-Grid"}.`,
                      attachments: [],
                      gveQuarterlyData: quarterlyData,
                    }

                    if (editingReportId !== null) {
                      setReports((prev) =>
                        prev.map((r) =>
                          r.id === editingReportId ? newReport : r,
                        ),
                      )
                    } else {
                      setReports((prev) => [newReport, ...prev])
                    }

                    setToastMessage(
                      status === "Draft"
                        ? "Quarterly Audit Saved as Draft! View or edit it anytime."
                        : "Quarterly Audit Submitted Successfully! Sent to Admin for review.",
                    )

                    setTimeout(() => {
                      setActiveTab("history")
                      setEditingReportId(null)
                      setToastMessage(null)
                    }, 1400)
                  }}
                  onCancel={() => handleCancelEdit()}
                />
              )}
            </div>
          </div>
        )}
        {/* Institutional Footer */}
        <footer className="mt-12 pt-6 border-t border-border/40 text-center text-xs text-muted-foreground/80 font-mono">
          {new Date().getFullYear()} &copy; ReportFlow • GVE Group Field Infrastructure Network.
        </footer>
      </main>

      {/* 2nd Verification Modal for Direct History Submit */}
      {confirmSubmitReportId !== null && (() => {
        const targetReport = reports.find((r) => r.id === confirmSubmitReportId)
        return (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertIcon className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-foreground">
                    Confirm Final Report Submission
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    2-Step Verification Check
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Are you sure you want to finalize and submit{" "}
                <strong className="text-foreground font-bold">
                  "{targetReport?.title || "this report"}"
                </strong>
                ? Once submitted, it will be locked and sent to Site Administrators for
                formal review.
              </p>

              <div className="p-3 rounded bg-amber-50 border border-amber-300 dark:bg-amber-950/40 dark:border-amber-800/50 text-amber-900 dark:text-amber-300 text-xs font-mono space-y-1">
                <p className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <InfoIcon className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Accidental click?</span>
                </p>
                <p>
                  If you still need to make changes, click{" "}
                  <strong>"Edit & Review Draft"</strong> to inspect and update
                  form values before submitting.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setConfirmSubmitReportId(null)}
                  className="px-3.5 py-1.5 rounded text-xs font-mono bg-secondary hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = confirmSubmitReportId
                    setConfirmSubmitReportId(null)
                    if (targetId) handleDirectSubmit(targetId)
                  }}
                  className="px-4 py-1.5 rounded text-xs font-mono bg-primary hover:bg-primary-hover text-primary-foreground font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckIcon className="w-3.5 h-3.5" />
                  <span>Confirm & Submit Report</span>
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        role="staff"
        userName={member.name}
        userDepartment={member.department}
        sunlightMode={sunlightMode}
        onToggleSunlightMode={onToggleSunlightMode}
      />
    </div>
  )
}
