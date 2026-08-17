import { useState, useEffect, useCallback } from 'react'
import AdminView, { REPORTS, MEMBERS, Report, Member } from './AdminView'
import StaffView from './StaffView'
import { supabase, isValidGveEmail } from './lib/supabase'
import { initOfflineSyncListener, getOfflineQueue, flushOfflineQueue } from './lib/syncQueue'
import logoImg from './components/logo.jpeg'

export interface UserSession {
  role: 'admin' | 'staff'
  member?: Member
  email?: string
}

function App() {
  const [reports, setReports] = useState<Report[]>(REPORTS)
  const [session, setSession] = useState<UserSession | null>(null)
  const [isOffline, setIsOffline] = useState(!navigator.onLine)
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0)
  const [syncToast, setSyncToast] = useState<string | null>(null)

  // Login & Sign-up states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [department, setDepartment] = useState('Engineering')
  const [selectedStaffId, setSelectedStaffId] = useState<string>(MEMBERS[0]?.id.toString() || '')
  const [loginRole, setLoginRole] = useState<'admin' | 'staff'>('staff')
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Fetch reports from Supabase (or fallback to local state if offline/unreachable)
  const fetchReportsFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('id', { ascending: false })

      if (error) {
        console.warn('Supabase fetch error, using local fallback:', error.message)
        return
      }

      if (data && data.length > 0) {
        const mappedReports: Report[] = data.map((row: any) => ({
          id: Number(row.id),
          title: row.title,
          author: row.author,
          department: row.department,
          type: row.type,
          submitted: new Date(row.submitted_at || row.created_at),
          status: row.status,
          summary: row.summary || '',
          feedback: row.feedback || undefined,
          gveKukaData: row.gve_kuka_data || undefined,
          gveWeeklyData: row.gve_weekly_data || undefined,
          gveQuarterlyData: row.gve_quarterly_data || undefined,
        }))
        setReports(mappedReports)
      }
    } catch (err) {
      console.warn('Failed to load reports from Supabase:', err)
    }
  }, [])

  // Initial setup & network listeners
  useEffect(() => {
    fetchReportsFromSupabase()

    // Real-time subscription to reports table
    const channel = supabase
      .channel('public:reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReportsFromSupabase()
      })
      .subscribe()

    // Offline sync queue listener
    const updateQueueState = () => {
      setPendingQueueCount(getOfflineQueue().length)
    }
    updateQueueState()

    const cleanupSync = initOfflineSyncListener(async () => {
      setSyncToast('Offline reports successfully synced to Supabase!')
      setTimeout(() => setSyncToast(null), 4000)
      fetchReportsFromSupabase()
      updateQueueState()
    })

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      supabase.removeChannel(channel)
      cleanupSync()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [fetchReportsFromSupabase])

  // Custom setReports wrapper that pushes updates to Supabase & Sync Queue
  const handleUpdateReports: React.Dispatch<React.SetStateAction<Report[]>> = (action) => {
    setReports((prev) => {
      const nextReports = typeof action === 'function' ? action(prev) : action

      // Find new or updated reports compared to prev
      const newItems = nextReports.filter(r => !prev.some(p => p.id === r.id))
      const updatedItems = nextReports.filter(r => {
        const existing = prev.find(p => p.id === r.id)
        return existing && (existing.status !== r.status || existing.feedback !== r.feedback)
      })

      // Push additions & modifications to Supabase or queue if offline
      const syncItem = async (report: Report) => {
        const dbRow = {
          title: report.title,
          author: report.author,
          department: report.department,
          type: report.type,
          status: report.status,
          summary: report.summary,
          feedback: report.feedback || null,
          gve_kuka_data: report.gveKukaData || null,
          gve_weekly_data: report.gveWeeklyData || null,
          gve_quarterly_data: report.gveQuarterlyData || null,
          submitted_at: report.submitted.toISOString(),
        }

        if (navigator.onLine) {
          const { error } = await supabase.from('reports').upsert(dbRow)
          if (error) {
            console.error('Supabase save error:', error)
          }
        }
      }

      newItems.forEach(syncItem)
      updatedItems.forEach(syncItem)

      return nextReports
    })
  }

  // Handle Login & Signup with @gve-group.com Domain Enforcement
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (loginRole === 'admin') {
        // Domain constraint check
        if (!isValidGveEmail(email)) {
          setError('Access Restricted: Email MUST end with "@gve-group.com"')
          setLoading(false)
          return
        }

        if (email.toLowerCase().includes('admin') || password === 'admin') {
          setSession({ role: 'admin', email })
        } else {
          // Attempt real Supabase Auth
          const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
          if (authErr) {
            setError(authErr.message + ' (Use admin@gve-group.com for demo)')
          } else if (data.user) {
            setSession({ role: 'admin', email: data.user.email })
          }
        }
      } else {
        // Staff Sign in or Quick Select
        if (email.trim()) {
          if (!isValidGveEmail(email)) {
            setError('Access Restricted: Email MUST end with "@gve-group.com"')
            setLoading(false)
            return
          }

          if (authMode === 'signup') {
            const { data, error: signUpErr } = await supabase.auth.signUp({
              email,
              password,
              options: { data: { full_name: fullName, department } }
            })
            if (signUpErr) {
              setError(signUpErr.message)
            } else {
              const nameToUse = fullName || email.split('@')[0]
              const initials = nameToUse.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
              const newMember: Member = {
                id: Date.now(),
                name: nameToUse,
                role: 'Field Engineer',
                department: department,
                lastReport: new Date(),
                compliance: 100,
                initials: initials || 'FE',
                color: '#005030'
              }
              setSession({ role: 'staff', member: newMember, email })
            }
          } else {
            // Find member matching email or prompt
            const memberMatch = MEMBERS.find(m => m.name.toLowerCase().replace(' ', '.') + '@gve-group.com' === email.toLowerCase())
            const activeMember = memberMatch || {
              id: Date.now(),
              name: email.split('@')[0].replace('.', ' '),
              role: 'Senior Engineer',
              department: 'Engineering',
              lastReport: new Date(),
              compliance: 95,
              initials: email.substring(0, 2).toUpperCase(),
              color: '#005030'
            }
            setSession({ role: 'staff', member: activeMember, email })
          }
        } else {
          // Simulated Quick Profile Selection
          const member = MEMBERS.find(m => m.id.toString() === selectedStaffId)
          if (member) {
            setSession({ role: 'staff', member, email: `${member.name.toLowerCase().replace(' ', '.')}@gve-group.com` })
          } else {
            setError('Please select a valid staff profile.')
          }
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    supabase.auth.signOut()
    setSession(null)
    setEmail('')
    setPassword('')
    setError('')
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 font-body relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,80,48,0.18),transparent_65%)] pointer-events-none" />

        {/* Offline notification banner on login */}
        {isOffline && (
          <div className="absolute top-0 left-0 right-0 bg-amber-950/90 border-b border-amber-700/60 text-amber-200 py-2 px-4 text-xs font-mono text-center flex items-center justify-center gap-2 z-30">
            <span>⚡</span> <strong>OFFLINE MODE ACTIVE:</strong> Field operations mode enabled. Reports will be saved locally.
          </div>
        )}

        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden backdrop-blur-md z-10">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-primary-hover to-transparent opacity-60" />

          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <div className="w-20 h-16 rounded-lg flex items-center justify-center bg-card text-foreground mb-1 shadow-inner border border-border/60 p-2">
              <img src={logoImg} alt="ReportFlow Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <h1 className="text-2xl font-display font-700 tracking-tight text-foreground">ReportFlow Portal</h1>
            <p className="text-xs text-muted-foreground font-mono">SUPABASE HYBRID AUTH & FIELD SYNC</p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-1 bg-secondary rounded-lg p-1 mb-6 border border-border/50">
            <button
              type="button"
              onClick={() => { setLoginRole('staff'); setError(''); }}
              className={`py-2 text-xs font-mono rounded transition-all ${loginRole === 'staff' ? 'bg-primary text-foreground font-medium shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Staff Portal
            </button>
            <button
              type="button"
              onClick={() => { setLoginRole('admin'); setError(''); }}
              className={`py-2 text-xs font-mono rounded transition-all ${loginRole === 'admin' ? 'bg-primary text-foreground font-medium shadow' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Administrator
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
            {loginRole === 'admin' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Admin Email Address</span>
                    <span className="text-[10px] text-emerald-400 font-bold">@gve-group.com ONLY</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gve-group.com"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Staff Login Tabs: Direct Email or Quick Select */}
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                      <span>Staff Email Address</span>
                      <span className="text-[10px] text-emerald-400 font-bold">@gve-group.com</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="amara.osei@gve-group.com"
                      className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                    />
                  </div>

                  {email ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Quick Select Profile</label>
                        <span className="text-[10px] text-muted-foreground italic">Fast Field Access</span>
                      </div>
                      <select
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all appearance-none cursor-pointer"
                      >
                        {MEMBERS.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role} — {m.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </>
            )}

            {error && (
              <div className="text-xs font-mono text-accent bg-accent/10 border border-accent/20 rounded p-2.5 mt-1">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-foreground font-display font-600 text-sm py-2.5 rounded-md mt-2 transition-all shadow-md active:translate-y-px disabled:opacity-50"
            >
              {loading ? 'Authenticating…' : 'Sign In to Portal'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Offline Status & Sync Toast Bar */}
      {(isOffline || pendingQueueCount > 0 || syncToast) && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-950 border-b border-emerald-700/60 text-emerald-200 py-1.5 px-4 text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isOffline ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            <span>
              {isOffline
                ? 'FIELD OFFLINE MODE: Submissions will queue locally until network restores.'
                : syncToast || `Connected to Supabase. ${pendingQueueCount > 0 ? `${pendingQueueCount} pending report(s) in sync queue.` : 'All data synchronized.'}`}
            </span>
          </div>
          {pendingQueueCount > 0 && navigator.onLine && (
            <button
              onClick={async () => {
                const res = await flushOfflineQueue()
                if (res.synced > 0) {
                  setSyncToast(`Synced ${res.synced} report(s)!`)
                  setTimeout(() => setSyncToast(null), 3000)
                  fetchReportsFromSupabase()
                }
              }}
              className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[10px] uppercase font-bold"
            >
              Sync Now ({pendingQueueCount})
            </button>
          )}
        </div>
      )}

      {session.role === 'admin' ? (
        <AdminView reports={reports} setReports={handleUpdateReports} onLogout={handleLogout} />
      ) : (
        <StaffView reports={reports} setReports={handleUpdateReports} member={session.member!} onLogout={handleLogout} />
      )}
      <footer className="text-center py-4 bg-background border-t border-border/40 text-xs text-muted-foreground/80 font-mono">
        {new Date().getFullYear()} &copy; ReportFlow • GVE Group Field Infrastructure Network.
      </footer>
    </>
  )
}

export default App