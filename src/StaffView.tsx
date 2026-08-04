import { useState, useMemo } from "react"

// ─── Types ───────────────────────────────────────────────────────────────────
type ReportStatus = "Approved" | "Submitted" | "Draft" | "Flagged"
type ReportType = "Daily" | "Weekly" | "Monthly" | "Annual"

interface Report {
  id: number
  title: string
  author: string
  department: string
  type: ReportType
  submitted: Date
  status: ReportStatus
  summary: string
}

interface Member {
  id: number
  name: string
  role: string
  department: string
  lastReport: Date
  compliance: number
  initials: string
  color: string
}

interface StaffViewProps {
  currentUser: Member
  reports: Report[]
  onSubmitReport: (
    report: Omit<Report, "id" | "author" | "department" | "submitted"> & {
      id?: number
    },
  ) => void
  onDeleteReport: (id: number) => void
  view: "dashboard" | "reports" | "compose"
  setView: (view: "dashboard" | "reports" | "compose") => void
  badgeComponent: React.ComponentType<{ status: string }>
}

export default function StaffView({
  currentUser,
  reports,
  onSubmitReport,
  onDeleteReport,
  view,
  setView,
  badgeComponent: Badge,
}: StaffViewProps) {
  // Filter reports to only show those by the current user
  const myReports = useMemo(() => {
    return reports.filter((r) => r.author === currentUser.name)
  }, [reports, currentUser])

  // Sub-navigation state within Reports tab (e.g. Editing draft)
  const [editingReport, setEditingReport] = useState<Report | null>(null)

  // Report composer state
  const [title, setTitle] = useState("")
  const [type, setType] = useState<ReportType>("Daily")
  const [summary, setSummary] = useState("")

  const handleEdit = (report: Report) => {
    setEditingReport(report)
    setTitle(report.title)
    setType(report.type)
    setSummary(report.summary)
    setView("compose")
  }

  const handleResetForm = () => {
    setTitle("")
    setType("Daily")
    setSummary("")
    setEditingReport(null)
  }

  const handleSubmit = (status: "Draft" | "Submitted") => {
    if (!title.trim() || !summary.trim()) return

    onSubmitReport({
      id: editingReport?.id,
      title,
      type,
      summary,
      status,
    })

    handleResetForm()
    setView("reports")
  }

  // Calculate personal metrics
  const stats = useMemo(() => {
    const total = myReports.length
    const approved = myReports.filter((r) => r.status === "Approved").length
    const flagged = myReports.filter((r) => r.status === "Flagged").length
    const drafts = myReports.filter((r) => r.status === "Draft").length
    const submitted = myReports.filter((r) => r.status === "Submitted").length

    return {
      total,
      approved,
      flagged,
      drafts,
      submitted,
      onTimeRate: currentUser.compliance, // map to member compliance
    }
  }, [myReports, currentUser])

  // Render sub-views
  if (view === "dashboard") {
    const recentSubmissions = myReports.slice(0, 5)

    return (
      <div className="flex flex-col gap-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="rounded-lg border p-5 flex flex-col gap-1"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "var(--muted-foreground)" }}
            >
              My Total Reports
            </p>
            <p className="text-3xl font-display font-700 leading-none mt-1">
              {stats.total}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {stats.approved} approved
            </p>
          </div>
          <div
            className="rounded-lg border p-5 flex flex-col gap-1"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "var(--muted-foreground)" }}
            >
              Active Drafts
            </p>
            <p
              className="text-3xl font-display font-700 leading-none mt-1"
              style={{
                color: stats.drafts > 0 ? "var(--accent)" : "var(--foreground)",
              }}
            >
              {stats.drafts}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Pending submission
            </p>
          </div>
          <div
            className="rounded-lg border p-5 flex flex-col gap-1"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "var(--muted-foreground)" }}
            >
              Revision Required
            </p>
            <p
              className="text-3xl font-display font-700 leading-none mt-1"
              style={{
                color: stats.flagged > 0 ? "#ef4444" : "var(--foreground)",
              }}
            >
              {stats.flagged}
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Flagged reports
            </p>
          </div>
          <div
            className="rounded-lg border p-5 flex flex-col gap-1"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
            }}
          >
            <p
              className="text-xs font-mono uppercase tracking-widest"
              style={{ color: "var(--muted-foreground)" }}
            >
              On-Time Rate
            </p>
            <p
              className="text-3xl font-display font-700 leading-none mt-1"
              style={{ color: "var(--primary-hover)" }}
            >
              {stats.onTimeRate}%
            </p>
            <p
              className="text-xs mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              Compliance rating
            </p>
          </div>
        </div>

        {/* Two column staff layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent personal submissions */}
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
              <h2 className="font-display font-600 text-sm">
                Recent Submissions
              </h2>
              <button
                onClick={() => {
                  handleResetForm()
                  setView("compose")
                }}
                className="text-xs font-mono px-3 py-1 rounded transition-colors"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--primary-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--primary)")
                }
              >
                + New Report
              </button>
            </div>
            <div
              className="flex-1 divide-y"
              style={{ borderColor: "var(--border)" }}
            >
              {recentSubmissions.length === 0 ? (
                <div
                  className="p-10 text-center text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  You haven't submitted any reports yet.
                </div>
              ) : (
                recentSubmissions.map((r) => (
                  <div
                    key={r.id}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 transition-colors hover:bg-white/2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.title}</p>
                      <p
                        className="text-xs mt-0.5 font-mono"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {r.type} ·{" "}
                        {new Date(r.submitted).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge status={r.status} />
                      {r.status === "Draft" || r.status === "Flagged" ? (
                        <button
                          onClick={() => handleEdit(r)}
                          className="text-xs font-mono px-2.5 py-1 rounded border transition-colors"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "var(--secondary)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          Edit
                        </button>
                      ) : (
                        <button
                          onClick={() => handleEdit(r)}
                          className="text-xs font-mono px-2.5 py-1 rounded border transition-colors opacity-60 hover:opacity-100"
                          style={{
                            borderColor: "var(--border)",
                            color: "var(--foreground)",
                          }}
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right sidebar for Staff */}
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
                <h2 className="font-display font-600 text-sm">
                  My Deadlines & Reminders
                </h2>
              </div>
              <div
                className="divide-y"
                style={{ borderColor: "var(--border)" }}
              >
                {[
                  {
                    label: "Weekly Ops standup summary",
                    date: "Every Friday",
                    desc: "Required by IT/Ops dept.",
                  },
                  {
                    label: "Monthly compliance statement",
                    date: "Jul 31",
                    desc: "Must upload self-audit declaration.",
                  },
                  {
                    label: "Project update milestone Q3",
                    date: "Aug 15",
                    desc: "Review with engineering leads.",
                  },
                ].map((d, i) => (
                  <div
                    key={i}
                    className="px-5 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.label}</p>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {d.desc}
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

            {/* Quick Tips */}
            <div
              className="rounded-lg border p-5 flex flex-col gap-3"
              style={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
            >
              <h2 className="font-display font-600 text-sm">
                Submission Guide
              </h2>
              <div
                className="text-xs leading-relaxed flex flex-col gap-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                <p>
                  💡 <b>Drafts:</b> You can save a report as a draft and finish
                  it later. Admins will not see drafts.
                </p>
                <p>
                  ⚠️ <b>Flagged:</b> If a report is flagged by an Admin, click
                  "Edit" to review comments, update the summary, and resubmit.
                </p>
                <p>
                  📅 <b>Frequency:</b> Keep your compliance bar high by
                  submitting reports before the deadlines.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (view === "reports") {
    const [statusFilter, setStatusFilter] = useState<ReportStatus | "All">(
      "All",
    )
    const [expanded, setExpanded] = useState<number | null>(null)

    const filteredReports = useMemo(() => {
      return myReports.filter(
        (r) => statusFilter === "All" || r.status === statusFilter,
      )
    }, [myReports, statusFilter])

    return (
      <div className="flex flex-col gap-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-1.5 flex-wrap">
            {([
              "All",
              "Approved",
              "Submitted",
              "Draft",
              "Flagged",
            ] as const).map((s) => (
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
            onClick={() => {
              handleResetForm()
              setView("compose")
            }}
            className="text-xs font-mono px-3 py-1.5 rounded transition-colors"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
            }}
          >
            Create New Report
          </button>
        </div>

        {/* Table */}
        <div
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          <div
            className="grid px-5 py-2.5 border-b text-xs font-mono uppercase tracking-wider"
            style={{
              gridTemplateColumns: "1fr 110px 110px 90px",
              borderColor: "var(--border)",
              color: "var(--muted-foreground)",
              backgroundColor: "var(--secondary)",
            }}
          >
            <span>Report Title</span>
            <span>Type</span>
            <span>Submitted</span>
            <span>Status</span>
          </div>

          {filteredReports.length === 0 ? (
            <div
              className="px-5 py-10 text-center text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              No reports match the selection.
            </div>
          ) : (
            filteredReports.map((r) => (
              <div key={r.id}>
                <button
                  className="w-full grid px-5 py-3.5 border-b text-left transition-colors hover:bg-white/25 items-center"
                  style={{
                    gridTemplateColumns: "1fr 110px 110px 90px",
                    borderColor: "var(--border)",
                    backgroundColor:
                      expanded === r.id ? "var(--secondary)" : "transparent",
                  }}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <div className="min-w-0 pr-4">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p
                      className="text-xs font-mono mt-0.5 truncate"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {r.department}
                    </p>
                  </div>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {r.type}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {new Date(r.submitted).toLocaleDateString("en-US", {
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
                      Content
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {r.summary}
                    </p>
                    <div className="flex gap-3 mt-4">
                      {(r.status === "Draft" || r.status === "Flagged") && (
                        <button
                          onClick={() => handleEdit(r)}
                          className="text-xs font-mono px-3 py-1.5 rounded transition-colors"
                          style={{
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          Edit & Resubmit
                        </button>
                      )}
                      {r.status === "Draft" && (
                        <button
                          onClick={() => {
                            onDeleteReport(r.id)
                            setExpanded(null)
                          }}
                          className="text-xs font-mono px-3 py-1.5 rounded border border-red-900/60 text-red-400 bg-transparent transition-colors hover:bg-red-950/20"
                        >
                          Delete Draft
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  if (view === "compose") {
    return (
      <div
        className="max-w-2xl mx-auto rounded-lg border p-6"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        <div
          className="flex items-center justify-between border-b pb-4 mb-6"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="font-display font-600 text-lg">
            {editingReport
              ? `Edit Report (${editingReport.status})`
              : "Compose New Report"}
          </h2>
          <button
            onClick={() => {
              handleResetForm()
              setView("dashboard")
            }}
            className="text-xs font-mono px-2 py-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label
              className="block text-xs font-mono uppercase tracking-wider mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Report Title
            </label>
            <input
              type="text"
              placeholder="e.g. Daily Standup - Aug 4"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm bg-transparent border-border focus:outline-none focus:border-primary"
              style={{ color: "var(--foreground)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-mono uppercase tracking-wider mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Report Frequency
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReportType)}
                className="w-full rounded border px-3 py-2 text-sm bg-secondary border-border focus:outline-none focus:border-primary"
                style={{ color: "var(--foreground)" }}
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Annual">Annual</option>
              </select>
            </div>
            <div>
              <label
                className="block text-xs font-mono uppercase tracking-wider mb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Department
              </label>
              <input
                type="text"
                disabled
                value={currentUser.department}
                className="w-full rounded border px-3 py-2 text-sm bg-secondary/50 border-border cursor-not-allowed opacity-70"
                style={{ color: "var(--foreground)" }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-xs font-mono uppercase tracking-wider mb-2"
              style={{ color: "var(--muted-foreground)" }}
            >
              Report Details / Summary
            </label>
            <textarea
              rows={6}
              placeholder="Describe your progress, achievements, blockers, or budget findings here..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded border px-3 py-2 text-sm bg-transparent border-border focus:outline-none focus:border-primary resize-y"
              style={{ color: "var(--foreground)" }}
            />
          </div>

          <div
            className="flex gap-3 justify-end mt-4 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <button
              onClick={() => handleSubmit("Draft")}
              disabled={!title.trim() || !summary.trim()}
              className="text-xs font-mono px-4 py-2 rounded border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
              onMouseEnter={(e) => {
                if (title.trim() && summary.trim())
                  e.currentTarget.style.backgroundColor = "var(--secondary)"
              }}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSubmit("Submitted")}
              disabled={!title.trim() || !summary.trim()}
              className="text-xs font-mono px-4 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: "var(--primary)",
                color: "var(--primary-foreground)",
              }}
              onMouseEnter={(e) => {
                if (title.trim() && summary.trim())
                  e.currentTarget.style.backgroundColor = "var(--primary-hover)"
              }}
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "var(--primary)")
              }
            >
              Submit Report
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
