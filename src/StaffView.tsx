import { useState, useMemo } from 'react'
import { Report, Member, Badge } from './AdminView'
import GveKukaHourlyForm from './components/GveKukaHourlyForm'
import GveWeeklyForm from './components/GveWeeklyForm'

// ─── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function ListIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function LogOutIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

function CalendarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

// ─── Types & Props ──────────────────────────────────────────────────────────

interface StaffViewProps {
  reports: Report[]
  setReports: React.Dispatch<React.SetStateAction<Report[]>>
  member: Member
  onLogout: () => void
}

type StaffTab = 'dashboard' | 'history' | 'submit'

export default function StaffView({ reports, setReports, member, onLogout }: StaffViewProps) {
  const [activeTab, setActiveTab] = useState<StaffTab>('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [expandedReportId, setExpandedReportId] = useState<number | null>(null)
  
  // Composer Form State
  const [editingReportId, setEditingReportId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [confirmSubmitReportId, setConfirmSubmitReportId] = useState<number | null>(null)
  const [selectedFormFormat, setSelectedFormFormat] = useState<'gveKuka' | 'gveWeekly'>('gveKuka')

  const sidebarW = collapsed ? 56 : 240

  // Filter reports belonging to the current staff member
  const myReports = useMemo(() => {
    return reports.filter(r => r.author.toLowerCase() === member.name.toLowerCase())
  }, [reports, member])

  const showSearch = myReports.length >= 2

  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return myReports
    const q = searchQuery.toLowerCase()
    return myReports.filter(
      r =>
        r.title.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q)
    )
  }, [myReports, searchQuery])

  // Compute metrics for the logged-in staff member
  const stats = useMemo(() => {
    const total = myReports.length
    const approved = myReports.filter(r => r.status === 'Approved').length
    const submitted = myReports.filter(r => r.status === 'Submitted').length
    const drafts = myReports.filter(r => r.status === 'Draft').length
    const flagged = myReports.filter(r => r.status === 'Flagged').length
    
    return { total, approved, submitted, drafts, flagged }
  }, [myReports])

  // Handle Load Draft or Flagged Report into Composer
  const handleEditReport = (report: Report) => {
    setEditingReportId(report.id)
    if (report.gveWeeklyData) {
      setSelectedFormFormat('gveWeekly')
    } else {
      setSelectedFormFormat('gveKuka')
    }
    setActiveTab('submit')
  }

  const handleCancelEdit = () => {
    setEditingReportId(null)
    setActiveTab('history')
  }

  const handleDirectSubmit = (reportId: number) => {
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'Submitted', submitted: new Date() } : r))
    setToastMessage('Draft submitted successfully for Admin review!')
    setTimeout(() => setToastMessage(null), 3000)
  }

  return (
    <div style={{ backgroundColor: "var(--background)", minHeight: "100vh", fontFamily: "var(--font-body, DM Sans, sans-serif)" }}>
      
      {/* ─── Sidebar ────────────────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 h-screen flex flex-col border-r z-20 transition-all duration-200"
        style={{
          width: sidebarW,
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 border-b shrink-0" style={{ height: 56, borderColor: "var(--border)" }}>
          <div className="shrink-0 w-7 h-7 rounded flex items-center justify-center bg-primary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="5" height="5" rx="1" fill="#e8f0eb" />
              <rect x="8" y="1" width="5" height="5" rx="1" fill="#e8f0eb" opacity="0.5" />
              <rect x="1" y="8" width="5" height="5" rx="1" fill="#e8f0eb" opacity="0.5" />
              <rect x="8" y="8" width="5" height="5" rx="1" fill="#e8f0eb" />
            </svg>
          </div>
          {!collapsed && (
            <span className="font-display font-700 text-base tracking-tight truncate text-foreground">
              ReportFlow <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-primary-hover/30 text-secondary-foreground ml-1.5 border border-border">Staff</span>
            </span>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 py-4 flex flex-col gap-1 px-2">
          {[
            { id: 'dashboard' as const, label: 'Dashboard', icon: HomeIcon },
            { id: 'history' as const, label: 'My Reports', icon: ListIcon },
            { id: 'submit' as const, label: editingReportId ? 'Edit Report' : 'Create Report', icon: PlusIcon }
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className="flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--primary)" : "transparent",
                  color: isActive ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: collapsed ? 0 : 10,
                  width: "100%",
                  minHeight: 36,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = "var(--secondary)"
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

        {/* User profile & Logout */}
        <div className="p-3 border-t flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-600 shrink-0"
                style={{ backgroundColor: `${member.color}33`, color: 'var(--foreground)', border: `1px solid ${member.color}66`}}>
                {member.initials}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate text-foreground">{member.name}</p>
                  <p className="text-[10px] truncate text-muted-foreground">{member.department}</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors"
                title="Log Out"
              >
                <LogOutIcon size={16} />
              </button>
            )}
          </div>
          {collapsed && (
            <button
              onClick={onLogout}
              className="w-full py-2 rounded hover:bg-secondary text-muted-foreground hover:text-accent transition-colors flex justify-center"
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
        className="fixed z-30 flex items-center justify-center rounded-md border transition-all duration-200"
        style={{
          top: 16,
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
          <path d={collapsed ? "M3 2l4 3-4 3" : "M7 2L3 5l4 3"} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 right-0 flex items-center justify-between px-6 border-b z-10"
        style={{
          left: sidebarW,
          height: 56,
          backgroundColor: "var(--background)",
          borderColor: "var(--border)",
        }}
      >
        <h1 className="font-display font-600 text-lg text-foreground capitalize">
          {activeTab === 'dashboard' ? 'My Portal' : activeTab === 'history' ? 'My Reports' : editingReportId ? 'Revise Report' : 'Submit Report'}
        </h1>
        <div className="flex items-center gap-4">
          {showSearch && (
            <div
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm"
              style={{
                borderColor: searchQuery ? 'var(--primary-hover)' : 'var(--border)',
                backgroundColor: 'var(--card)',
                color: 'var(--muted-foreground)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M9.5 9.5L12 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search my reports…" 
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-32 focus:w-48 transition-all" />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground text-xs">
                  ✕
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
            <span>Department: <strong className="text-foreground">{member.department}</strong></span>
            <span className="hidden sm:inline">Role: <strong className="text-foreground">{member.role}</strong></span>
          </div>
        </div>
      </header>

      {/* ─── Main Content ───────────────────────────────────────────────────── */}
      <main className="transition-all duration-200"
        style={{
          marginLeft: sidebarW,
          paddingTop: 56 + 24,
          paddingBottom: 40,
          paddingLeft: 24,
          paddingRight: 24,
          minHeight: "100vh",
        }}
      >
        
        {/* Tab 1: Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="flex flex-col gap-6">
            
            {/* Staff Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Total Filed</p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-foreground">{stats.total}</p>
                <p className="text-xs text-muted-foreground mt-1">Submitted & drafts</p>
              </div>
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Approved</p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-emerald-400">{stats.approved}</p>
                <p className="text-xs text-muted-foreground mt-1">Confirmed by Admin</p>
              </div>
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-accent">Needs Revision</p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-accent">{stats.flagged}</p>
                <p className="text-xs text-muted-foreground mt-1">Flagged reports</p>
              </div>
              <div className="rounded-lg border p-5 flex flex-col gap-1 bg-card border-border">
                <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">On-Time compliance</p>
                <p className="text-3xl font-display font-700 leading-none mt-1 text-foreground">{member.compliance}%</p>
                <div className="w-full bg-secondary h-1 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-primary-hover transition-all duration-300" style={{ width: `${member.compliance}%` }} />
                </div>
              </div>
            </div>

            {/* Content Split: Deadlines & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              
              {/* Left Column: Deadlines and Compliance info */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                
                {/* Department Deadlines */}
                <div className="rounded-lg border bg-card border-border flex flex-col">
                  <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                    <h2 className="font-display font-600 text-sm text-foreground flex items-center gap-2">
                      <CalendarIcon size={16} /> Upcoming Deadlines
                    </h2>
                  </div>
                  <div className="divide-y divide-border">
                    {[
                      { label: "Weekly Update", date: "Jul 28", dept: member.department },
                      { label: "Monthly Summary", date: "Jul 31", dept: member.department },
                    ].map((d, i) => (
                      <div key={i} className="px-5 py-3 flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium text-foreground">{d.label}</p>
                          <p className="text-xs text-muted-foreground font-mono">{d.dept}</p>
                        </div>
                        <span className="text-xs font-mono px-2 py-1 rounded border border-accent/20 bg-accent/5 text-accent">
                          {d.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Recent activity of this member */}
              <div className="lg:col-span-3 rounded-lg border bg-card border-border flex flex-col">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-display font-600 text-sm text-foreground">Recent Submissions</h2>
                </div>
                <div className="divide-y divide-border">
                  {myReports.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No reports filed yet. Click "Create Report" to compose your first report.
                    </div>
                  ) : (
                    filteredReports.slice(0, 4).map(r => (
                      <div key={r.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/1 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                            Type: {r.type} · Submitted: {r.submitted.toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <Badge status={r.status} />
                          {(r.status === 'Draft' || r.status === 'Flagged') && (
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

            </div>

          </div>
        )}

        {/* Tab 2: My Reports (History) */}
        {activeTab === 'history' && (
          <div className="rounded-lg border bg-card border-border overflow-hidden">
            <div className="grid px-5 py-2.5 border-b text-xs font-mono uppercase tracking-wider bg-secondary border-border text-muted-foreground"
                 style={{ gridTemplateColumns: "1fr 110px 110px 140px" }}>
              <span>Report Title</span>
              <span>Type</span>
              <span>Last Updated</span>
              <span>Status & Action</span>
            </div>

            {filteredReports.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                {searchQuery ? 'No reports match your search.' : 'No reports matching your account.'}
              </div>
            ) : (
              filteredReports.map(r => (
                <div key={r.id}>
                  <button
                    onClick={() => setExpandedReportId(expandedReportId === r.id ? null : r.id)}
                    className="w-full grid px-5 py-3.5 border-b text-left transition-colors hover:bg-white/2 items-center border-border"
                    style={{
                      gridTemplateColumns: "1fr 110px 110px 140px",
                      backgroundColor: expandedReportId === r.id ? "var(--secondary)" : "transparent"
                    }}
                  >
                    <span className="text-sm font-medium text-foreground truncate">{r.title}</span>
                    <span className="text-xs font-mono text-muted-foreground">{r.type}</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {r.submitted.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <div className="flex items-center justify-between gap-2">
                      <Badge status={r.status} />
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${expandedReportId === r.id ? 'rotate-90' : ''}`} style={{ color: 'var(--muted-foreground)' }}>
                        <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                  
                  {expandedReportId === r.id && (
                    <div className="px-5 py-4 border-b border-border bg-background/50">
                      {r.gveKukaData ? (
                        <div className="mb-4">
                          <p className="text-xs font-mono uppercase tracking-wider mb-2 text-emerald-400">
                            Physical Form Replica — GVE Site Hourly Record
                          </p>
                          <GveKukaHourlyForm
                            initialData={r.gveKukaData}
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
                          <p className="text-xs font-mono uppercase tracking-wider mb-2 text-muted-foreground">Report Content / Summary</p>
                          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">{r.summary}</p>
                        </>
                      )}
                      
                      {r.status === 'Flagged' && r.feedback && (
                        <div className="mt-3 p-3 rounded bg-amber-950/40 border border-amber-800/50 text-amber-200 text-xs font-mono">
                          <strong className="block uppercase text-[10px] tracking-wider text-amber-400 font-bold mb-1">
                            Admin Revision Notes:
                          </strong>
                          {r.feedback}
                        </div>
                      )}

                      {(r.status === 'Draft' || r.status === 'Flagged') && (
                        <div className="flex items-center gap-3 mt-4 border-t border-border/40 pt-4">
                          <button
                            onClick={() => handleEditReport(r)}
                            className="text-xs font-mono px-3.5 py-1.5 rounded bg-secondary hover:bg-border text-foreground border border-border transition-colors flex items-center gap-1.5 font-medium"
                          >
                            ✏️ Edit & Review Draft
                          </button>
                          <button
                            onClick={() => setConfirmSubmitReportId(r.id)}
                            className="text-xs font-mono px-3.5 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary-hover font-semibold transition-colors flex items-center gap-1.5 shadow"
                          >
                            🚀 Submit Report
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
        {activeTab === 'submit' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-4">
            {/* Form Selection Bar */}
            <div className="bg-card border border-border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-mono font-bold uppercase text-foreground">Select Submission Format</h3>
                <p className="text-[11px] text-muted-foreground">Choose physical site form replica format</p>
              </div>
              <div className="flex items-center gap-2 bg-secondary p-1 rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => setSelectedFormFormat('gveKuka')}
                  className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                    selectedFormFormat === 'gveKuka'
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📄 Physical Form: GVE Hourly Log
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormFormat('gveWeekly')}
                  className={`px-3 py-1 text-xs font-mono rounded transition-all ${
                    selectedFormFormat === 'gveWeekly'
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  📋 Physical Form: Weekly Site Report
                </button>
              </div>
            </div>

            {/* Form Composer Card */}
            <div className="bg-card border border-border rounded-lg p-4 shadow-lg relative">
              {toastMessage && (
                <div className="mb-4 p-3 rounded-md bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-mono flex items-center gap-2 animate-fadeIn">
                  <span className="text-emerald-400">✓</span> {toastMessage}
                </div>
              )}
              {selectedFormFormat === 'gveKuka' ? (
                <GveKukaHourlyForm
                  key={editingReportId ?? 'new-kuka'}
                  initialData={reports.find(r => r.id === editingReportId)?.gveKukaData}
                  onSave={(gveData, status) => {
                    const newId = reports.length > 0 ? Math.max(...reports.map(r => r.id)) + 1 : 1
                    const newReport: Report = {
                      id: editingReportId ?? newId,
                      title: `GVE Site Hourly Record — ${gveData.date}`,
                      author: member.name,
                      department: member.department,
                      type: 'Daily',
                      submitted: new Date(),
                      status: status,
                      summary: `Official GVE Site Operational Hourly Record for ${gveData.date} (${gveData.day}). Includes 12-hour solar PV, battery storage, site load, and grid parameters.`,
                      gveKukaData: gveData
                    }
                    if (editingReportId !== null) {
                      setReports(prev => prev.map(r => r.id === editingReportId ? newReport : r))
                    } else {
                      setReports(prev => [newReport, ...prev])
                    }
                    setToastMessage(status === 'Draft' ? 'Saved as Draft! You can view and edit it in My Reports before final submission.' : 'Report Submitted Successfully! Sent to Admin for review.')
                    setTimeout(() => {
                      setActiveTab('history')
                      setEditingReportId(null)
                      setToastMessage(null)
                    }, 1400)
                  }}
                  onCancel={() => handleCancelEdit()}
                />
              ) : (
                <GveWeeklyForm
                  key={editingReportId ?? 'new-weekly'}
                  initialData={reports.find(r => r.id === editingReportId)?.gveWeeklyData}
                  onSave={(weeklyData, status) => {
                    const newId = reports.length > 0 ? Math.max(...reports.map(r => r.id)) + 1 : 1
                    const siteTitle = weeklyData.siteName ? `Weekly Site Report Form — ${weeklyData.siteName}` : 'Weekly Site Report Form'
                    const newReport: Report = {
                      id: editingReportId ?? newId,
                      title: siteTitle,
                      author: member.name,
                      department: member.department,
                      type: 'Weekly',
                      submitted: new Date(),
                      status: status,
                      summary: `Official GVE Weekly Site Report Form containing overall facility cleanliness, outages/faults log over the week, and complete weekly equipment remarks.`,
                      gveWeeklyData: weeklyData
                    }
                    if (editingReportId !== null) {
                      setReports(prev => prev.map(r => r.id === editingReportId ? newReport : r))
                    } else {
                      setReports(prev => [newReport, ...prev])
                    }
                    setToastMessage(status === 'Draft' ? 'Saved as Draft! You can view and edit it in My Reports before final submission.' : 'Report Submitted Successfully! Sent to Admin for review.')
                    setTimeout(() => {
                      setActiveTab('history')
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

      </main>
      <footer className="text-xs text-muted-foreground/80 mt-1 italic">
        {new Date().getFullYear()} &copy; ReportFlow. All rights reserved.
      </footer>

      {/* 2nd Verification Modal for Direct History Submit */}
      {confirmSubmitReportId !== null && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-lg shrink-0">
                ⚠️
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-foreground">Confirm Final Report Submission</h3>
                <p className="text-xs text-muted-foreground font-mono">2-Step Verification Check</p>
              </div>
            </div>

            <p className="text-xs text-foreground/90 leading-relaxed">
              Are you sure you want to finalize and submit this report? Once submitted, it will be locked and sent to Site Administrators for formal review.
            </p>

            <div className="p-3 rounded bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs font-mono space-y-1">
              <p className="font-bold text-amber-400 flex items-center gap-1">
                <span>💡</span> Accidental click?
              </p>
              <p>If you still need to make changes, click <strong>"Edit & Review Draft"</strong> to inspect and update form values before submitting.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setConfirmSubmitReportId(null)}
                className="px-3.5 py-1.5 rounded text-xs font-mono bg-secondary hover:bg-border text-foreground border border-border transition-colors"
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
                className="px-4 py-1.5 rounded text-xs font-mono bg-primary hover:bg-primary-hover text-foreground font-semibold transition-all shadow"
              >
                🚀 Confirm & Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
      <footer className="text-xs  justify-between text-muted-foreground/80 mt-1 italic">
        {new Date().getFullYear()} &copy; ReportFlow. All rights reserved.
      </footer>
    </div>
    
  )
}
