import { useState, useEffect, useCallback, useRef } from "react"
import AdminView, {
  MEMBERS,
  Report, Member,
  Deadline, DEFAULT_DEADLINES,
} from "./AdminView"

import StaffView from "./StaffView"
import { supabase, isValidGveEmail } from "./lib/supabase"
import {
  initOfflineSyncListener,
  getOfflineQueue,
  flushOfflineQueue,
  queueOfflineReport,
} from "./lib/syncQueue"
import { uploadAttachmentFile } from "./lib/storageProviders"
import { ReportAttachment } from "./types/attachment"
import logoImg from "./components/logo.jpeg"
import { useOfflineReports } from "./hooks/useOfflineReports"
import { useIsMobile } from "./hooks/useIsMobile"
import { WifiOffIcon } from "./components/Icons"

export interface UserSession {
  role: "admin" | "staff"
  member?: Member
  email?: string
}

const DEPARTMENTS = ["Engineering","Operations","Finance","HSE","Management"]

const ROLES = [ "Field Engineer","Site Technician","Operations Lead","HSE Officer","Solar PV Specialist",]

// Helper to prevent and clean duplicate report rows safely
export function deduplicateReportsList(list: Report[]): Report[] {
  if (!Array.isArray(list)) return []
  const seenIds = new Set<number>()
  const logicalMap = new Map<string, Report>()

  for (const r of list) {
    if (!r || typeof r.id !== "number") continue
    if (seenIds.has(r.id)) continue
    seenIds.add(r.id)

    const authorStr = (r.author || "unknown").trim().toLowerCase()
    const titleStr = (r.title || "").trim().toLowerCase()
    const typeStr = (r.type || "Daily").trim().toLowerCase()
    let dateStr = ""
    try {
      if (r.submitted) {
        const d = new Date(r.submitted)
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10)
        }
      }
    } catch (e) {}

    // Build a unique logical key based on author, report format, site & date
    let dateKey = `${authorStr}_${titleStr}_${typeStr}_${dateStr}`
    if (r.gveData?.date) {
      const siteStr = (r.gveData.siteName || "").trim().toLowerCase()
      dateKey = `gvehourly_${r.gveData.date}_${siteStr}_${authorStr}`
    } else if (r.gveWeeklyData?.siteName) {
      const siteStr = r.gveWeeklyData.siteName.trim().toLowerCase()
      dateKey = `weekly_${siteStr}_${dateStr}_${authorStr}`
    } else if (r.gveQuarterlyData?.siteName) {
      const siteStr = r.gveQuarterlyData.siteName.trim().toLowerCase()
      dateKey = `quarterly_${siteStr}_${dateStr}_${authorStr}`
    }

    const existing = logicalMap.get(dateKey)
    if (!existing) {
      logicalMap.set(dateKey, r)
    } else {
      // Prioritize advanced status: Approved (4) > Submitted (3) > Flagged (2) > Draft (1)
      const priority: Record<string, number> = {
        Approved: 4,
        Submitted: 3,
        Flagged: 2,
        Draft: 1,
      }
      const existingScore = priority[existing.status] || 0
      const currentScore = priority[r.status] || 0

      // Keep more advanced status, or newest database ID if same status
      if (
        currentScore > existingScore ||
        (currentScore === existingScore && r.id >= existing.id)
      ) {
        logicalMap.set(dateKey, r)
      }
    }
  }

  return Array.from(logicalMap.values()).sort((a, b) => {
    try {
      const timeA = new Date(a.submitted).getTime()
      const timeB = new Date(b.submitted).getTime()
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA)
    } catch (e) {
      return b.id - a.id
    }
  })
}

function App() {
  const { reports, setReports } = useOfflineReports()
  const isMobile = useIsMobile()

  const [members, setMembers] = useState<Member[]>(() => {
    try {
      const saved = localStorage.getItem("reportflow_cached_members")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            lastReport: m.lastReport ? new Date(m.lastReport) : new Date(),
          }))
        }
      }
    } catch (e) {
      console.warn("Failed to parse cached members from localStorage", e)
    }
    return MEMBERS
  })

  const [deadlines, setDeadlines] = useState<Deadline[]>(() => {
    try {
      const saved = localStorage.getItem("reportflow_deadlines")

      if (saved) {
        const parsed = JSON.parse(saved)

        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch (e) {
      console.warn("Failed to parse cached deadlines", e)
    }

    return DEFAULT_DEADLINES
  })

  const [session, setSession] = useState<UserSession | null>(() => {
    try {
      const saved = sessionStorage.getItem("reportflow_user_session")
      if (saved) {
        return JSON.parse(saved) as UserSession
      }
    } catch (e) {
      console.warn("Failed to parse cached session from sessionStorage", e)
    }
    return null
  })

  const [sunlightMode, setSunlightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem("reportflow_sunlight_mode") === "true"
    } catch (e) {
      return false
    }
  })

  // Sync sunlight mode to DOM and localStorage
  useEffect(() => {
    try {
      localStorage.setItem("reportflow_sunlight_mode", String(sunlightMode))
      if (sunlightMode) {
        document.documentElement.classList.add("sunlight-mode")
      } else {
        document.documentElement.classList.remove("sunlight-mode")
      }
    } catch (e) {
      console.warn("Failed to persist sunlight mode", e)
    }
  }, [sunlightMode])

  const toggleSunlightMode = useCallback(() => {
    setSunlightMode((prev) => !prev)
  }, [])

  const [isOffline, setIsOffline] = useState(!navigator.onLine)

  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0)

  const [syncToast, setSyncToast] = useState<string | null>(null)

  const syncingIdsRef = useRef<Set<number>>(new Set())
  const tempIdMapRef = useRef<Map<number, number>>(new Map())

  // Persist session to sessionStorage for tab isolation
  useEffect(() => {
    try {
      if (session) {
        sessionStorage.setItem(
          "reportflow_user_session",
          JSON.stringify(session),
        )
      } else {
        sessionStorage.removeItem("reportflow_user_session")
      }
    } catch (e) {
      console.warn("Failed to persist session to sessionStorage", e)
    }
  }, [session])

  // Persist reports is now handled by useOfflineReports hook

  // Persist members to localStorage
  useEffect(() => {
    try {
      if (members && members.length > 0) {
        localStorage.setItem(
          "reportflow_cached_members",
          JSON.stringify(members),
        )
      }
    } catch (e) {
      console.warn("Failed to cache members to localStorage", e)
    }
  }, [members])

  // Persist deadlines to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("reportflow_deadlines", JSON.stringify(deadlines))
    } catch (e) {
      console.warn("Failed to cache deadlines", e)
    }
  }, [deadlines])

  // Login & Sign-up states

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [department, setDepartment] = useState("Engineering")
  const [staffRole, setStaffRole] = useState("Field Engineer")
  const [loginRole, setLoginRole] = useState<"admin" | "staff">("staff")
  const [authMode, setAuthMode] =
    useState<"signin" | "signup" | "forgot_password" | "reset_password">(
      "signin",
    )

  // On mobile screens, force loginRole to staff so admin is completely unavailable
  useEffect(() => {
    if (isMobile && loginRole === "admin") {
      setLoginRole("staff")
    }
  }, [isMobile, loginRole])

  const [error, setError] = useState("")

  const [successMsg, setSuccessMsg] = useState("")

  const [loading, setLoading] = useState(false)

  // Fetch reports from Supabase (or fallback to local state if offline/unreachable)

  const fetchReportsFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase

        .from("reports")

        .select("*")

        .order("id", { ascending: false })

      if (error) {
        console.warn(
          "Supabase fetch error, using local fallback:",
          error.message,
        )

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
          summary: row.summary || "",
          feedback: row.feedback || undefined,
          attachments: row.attachments || undefined,
          gveData: row.gve_daily_data || row.gve_kuka_data || row.gve_data || undefined,
          gveWeeklyData: row.gve_weekly_data || undefined,

          gveQuarterlyData: row.gve_quarterly_data || undefined,
        }))

        // Deduplicate database rows to clean any existing cloned rows
        const cleaned = deduplicateReportsList(mappedReports)
        setReports(cleaned)
      }
    } catch (err) {
      console.warn("Failed to load reports from Supabase:", err)
    }
  }, [])

  // Fetch members from Supabase

  const fetchMembersFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase

        .from("members")
        .select("*")
        .order("name", { ascending: true })

      if (error) {
        console.warn("Supabase members fetch error:", error.message)

        return
      }

      if (data && data.length > 0) {
        const mappedMembers: Member[] = data.map((row: any, idx: number) => ({
          id: idx + 1,
          name: row.name,
          role: row.role || "Field Engineer",
          department: row.department || "Engineering",
          lastReport: new Date(),
          compliance: row.compliance ?? 95,
          initials:
            row.initials ||
            row.name
              .split(" ")
              .map((n: string) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase(),

          color: row.color || "#005030",
        }))

        setMembers(mappedMembers)
      }
    } catch (err) {
      console.warn("Failed to load members from Supabase:", err)
    }
  }, [])

  // Fetch deadlines from Supabase

  const fetchDeadlinesFromSupabase = useCallback(async () => {
    try {
      const { data, error } = await supabase

        .from("deadlines")
        .select("*")
        .order("due_date", { ascending: true })

      if (error) {
        console.warn(
          "Supabase deadlines fetch error, using local fallback:",
          error.message,
        )

        return
      }

      if (data && data.length > 0) {
        const mapped: Deadline[] = data.map((row: any) => ({
          id: Number(row.id),
          title: row.title,
          department: row.department,
          dueDate: row.due_date,
          description: row.description || undefined,
          priority: row.priority || "Medium",
          createdAt: row.created_at,
        }))

        setDeadlines(mapped)
      }
    } catch (err) {
      console.warn("Failed to load deadlines from Supabase:", err)
    }
  }, [])

  // Initial setup & network listeners

  useEffect(() => {
    fetchReportsFromSupabase()

    fetchMembersFromSupabase()

    fetchDeadlinesFromSupabase()

    // Real-time subscription to reports table

    const reportsChannel = supabase

      .channel("public:reports")

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reports" },
        () => {
          fetchReportsFromSupabase()
        },
      )

      .subscribe()

    // Real-time subscription to members table

    const membersChannel = supabase

      .channel("public:members")

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "members" },
        () => {
          fetchMembersFromSupabase()
        },
      )

      .subscribe()

    // Real-time subscription to deadlines table

    const deadlinesChannel = supabase

      .channel("public:deadlines")

      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deadlines" },
        () => {
          fetchDeadlinesFromSupabase()
        },
      )

      .subscribe()

    // Offline sync queue listener

    const updateQueueState = () => {
      setPendingQueueCount(getOfflineQueue().length)
    }

    updateQueueState()

    const cleanupSync = initOfflineSyncListener(async () => {
      setSyncToast("Offline reports successfully synced to Supabase!")

      setTimeout(() => setSyncToast(null), 4000)

      fetchReportsFromSupabase()

      fetchDeadlinesFromSupabase()

      updateQueueState()
    })

    const handleOnline = () => setIsOffline(false)

    const handleOffline = () => setIsOffline(true)

    window.addEventListener("online", handleOnline)

    window.addEventListener("offline", handleOffline)

    // Supabase Auth state listener for recovery / password resets
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("reset_password")
      }
    })

    return () => {
      supabase.removeChannel(reportsChannel)

      supabase.removeChannel(membersChannel)

      supabase.removeChannel(deadlinesChannel)

      cleanupSync()

      window.removeEventListener("online", handleOnline)

      window.removeEventListener("offline", handleOffline)

      authSubscription.unsubscribe()
    }
  }, [
    fetchReportsFromSupabase,
    fetchMembersFromSupabase,
    fetchDeadlinesFromSupabase,
  ])

  // Custom setReports wrapper that pushes updates to Supabase & Sync Queue without infinite duplicate loops
  const handleUpdateReports: React.Dispatch<React.SetStateAction<Report[]>> = (
    action,
  ) => {
    setReports((prev) => {
      const nextReports = typeof action === "function" ? action(prev) : action

      // Find new items that are not in prev and not currently undergoing sync
      const newItems = nextReports.filter(
        (r) => !prev.some((p) => p.id === r.id) && !syncingIdsRef.current.has(r.id),
      )

      // Find updated items
      const updatedItems = nextReports.filter((r) => {
        const existing = prev.find((p) => p.id === r.id)
        return (
          existing &&
          (existing.status !== r.status ||
            existing.feedback !== r.feedback ||
            existing.summary !== r.summary ||
            existing.gveData !== r.gveData ||
            existing.gveWeeklyData !== r.gveWeeklyData ||
            existing.gveQuarterlyData !== r.gveQuarterlyData ||
            existing.attachments !== r.attachments)
        )
      })

      // Push additions & modifications to Supabase or queue if offline
      const syncItem = async (report: Report, isNew: boolean) => {
        if (syncingIdsRef.current.has(report.id)) return
        syncingIdsRef.current.add(report.id)

        if (!navigator.onLine) {
          await queueOfflineReport(report)
          setPendingQueueCount(getOfflineQueue().length)
          syncingIdsRef.current.delete(report.id)
          return
        }

        // 1. Process attachments if present
        let syncedAttachments: ReportAttachment[] = []
        if (report.attachments && report.attachments.length > 0) {
          syncedAttachments = await Promise.all(
            report.attachments.map(async (att) => {
              if (att.url && !att.isOfflineOnly) return att

              try {
                const res = await uploadAttachmentFile(att, report.author)
                return {
                  ...att,
                  url: res.url,
                  storagePath: res.storagePath,
                  storageProvider: res.provider,
                  isOfflineOnly: false,
                }
              } catch (e) {
                return {
                  ...att,
                  storageProvider: "inline" as const,
                  isOfflineOnly: false,
                }
              }
            }),
          )
        }

        const dbRow = {
          title: report.title,
          author: report.author,
          department: report.department,
          type: report.type,
          status: report.status,
          summary: report.summary,
          feedback: report.feedback || null,
          attachments:
            syncedAttachments.length > 0
              ? syncedAttachments
              : report.attachments || null,
          gve_daily_data: report.gveData || null,
          gve_weekly_data: report.gveWeeklyData || null,
          gve_quarterly_data: report.gveQuarterlyData || null,
          submitted_at: report.submitted ? new Date(report.submitted).toISOString() : new Date().toISOString(),
        }

        try {
          if (isNew) {
            const { data, error } = await supabase
              .from("reports")
              .insert(dbRow)
              .select()

            if (error) {
              console.error("Supabase insert error, queueing offline:", error)
              await queueOfflineReport(report)
              setPendingQueueCount(getOfflineQueue().length)
            } else if (data && data[0]) {
              // Update local state with the database-assigned row ID
              const dbId = Number(data[0].id)
              tempIdMapRef.current.set(report.id, dbId)
              syncingIdsRef.current.add(dbId)

              setReports((current) =>
                current.map((r) =>
                  r.id === report.id
                    ? { ...r, id: dbId, attachments: syncedAttachments }
                    : r,
                ),
              )
            }
          } else {
            const targetDbId = tempIdMapRef.current.get(report.id) ?? report.id
            const { error } = await supabase
              .from("reports")
              .update(dbRow)
              .eq("id", targetDbId)

            if (error) {
              console.error("Supabase update error:", error)
            }
          }
        } finally {
          syncingIdsRef.current.delete(report.id)
        }
      }

      newItems.forEach((r) => syncItem(r, true))
      updatedItems.forEach((r) => syncItem(r, false))

      return nextReports
    })
  }

  // Handle Admin creating a new department deadline

  const handleCreateDeadline = async (
    deadlineData: Omit<Deadline, "id" | "createdAt">,
  ) => {
    const tempId = Date.now()

    const newDeadline: Deadline = {
      id: tempId,

      ...deadlineData,

      createdAt: new Date().toISOString(),
    }

    setDeadlines((prev) => [newDeadline, ...prev])

    if (navigator.onLine) {
      try {
        const dbRow = {
          title: deadlineData.title,

          department: deadlineData.department,

          due_date: deadlineData.dueDate,

          description: deadlineData.description || null,

          priority: deadlineData.priority || "Medium",
        }

        const { data, error } = await supabase
          .from("deadlines")
          .insert(dbRow)
          .select()

        if (!error && data && data[0]) {
          const dbId = Number(data[0].id)

          setDeadlines((prev) =>
            prev.map((d) => (d.id === tempId ? { ...d, id: dbId } : d)),
          )
        } else if (error) {
          console.warn("Supabase deadline insert notice:", error.message)
        }
      } catch (e) {
        console.error("Failed to sync new deadline to Supabase", e)
      }
    }
  }

  // Handle Admin deleting a deadline

  const handleDeleteDeadline = async (id: number) => {
    setDeadlines((prev) => prev.filter((d) => d.id !== id))

    if (navigator.onLine) {
      try {
        await supabase.from("deadlines").delete().eq("id", id)
      } catch (e) {
        console.error("Failed to delete deadline from Supabase", e)
      }
    }
  }

  // Handle Login & Signup with @gve-group.com Domain Enforcement & Strict Password Validation

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setError("")

    setSuccessMsg("")

    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    try {
      if (authMode === "forgot_password") {
        if (!isValidGveEmail(cleanEmail)) {
          setError('Access Restricted: Email must end with "@gve-group.com"')

          return
        }

        if (!navigator.onLine) {
          setError(
            "Cannot send password reset request while offline. Please check your network connection.",
          )

          return
        }

        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: `${window.location.origin}/`,
          },
        )

        if (resetErr) {
          setError(resetErr.message || "Failed to send password reset request.")
        } else {
          setSuccessMsg("A password reset link has been sent to your email.")
        }

        return
      }

      if (authMode === "reset_password") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters long.")

          return
        }

        if (password !== confirmPassword) {
          setError("Passwords do not match. Please re-enter.")

          return
        }

        if (!navigator.onLine) {
          setError(
            "Cannot update password while offline. Please check your network connection.",
          )

          return
        }

        const { error: updateErr } = await supabase.auth.updateUser({
          password: password,
        })

        if (updateErr) {
          setError(updateErr.message || "Failed to update password.")
        } else {
          setSuccessMsg(
            "Password updated successfully! Redirecting to sign in...",
          )

          setTimeout(() => {
            setAuthMode("signin")

            setSuccessMsg("")

            setPassword("")

            setConfirmPassword("")

            setEmail("")
          }, 3000)
        }

        return
      }

      if (loginRole === "admin") {
        // Admin domain constraint check

        if (!isValidGveEmail(cleanEmail)) {
          setError('Access Restricted: Email must end with "@gve-group.com"')

          setLoading(false)

          return
        }

        // Demo super-admin check

        if (
          cleanEmail === "admin@gve-group.com" ||
          cleanEmail === "info@gve-group.com"
        ) {
          if (password === "admin" || password === "admin123") {
            setSession({ role: "admin", email: cleanEmail })

            return
          } else {
            setError(
              "Invalid administrator password. Please verify credentials.",
            )

            setLoading(false)

            return
          }
        }

        // Attempt real Supabase Auth

        const { data: authData, error: authErr } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,

            password,
          })

        if (authErr) {
          setError(
            authErr.message ||
              "Invalid administrator credentials. Account not recognized.",
          )

          setLoading(false)

          return
        }

        if (authData?.user) {
          // Verify admin privileges in members table or metadata

          const { data: dbAdmin } = await supabase

            .from("members")

            .select("is_admin, role")

            .eq("email", cleanEmail)

            .maybeSingle()

          const isAdminUser =
            dbAdmin?.is_admin === true ||
            authData.user.user_metadata?.role === "Admin" ||
            authData.user.user_metadata?.is_admin === true ||
            cleanEmail.startsWith("admin.")

          if (!isAdminUser) {
            setError(
              "Unauthorized: This staff account does not have Administrator privileges.",
            )

            await supabase.auth.signOut()

            setLoading(false)

            return
          }

          setSession({
            role: "admin",
            email: authData.user.email || cleanEmail,
          })
        }
      } else {
        // Staff Authentication (Sign In or Sign Up)

        if (!isValidGveEmail(cleanEmail)) {
          setError(
            'Access Restricted: Staff email MUST end with "@gve-group.com"',
          )

          setLoading(false)

          return
        }

        if (authMode === "signup") {
          // Validate required registration fields

          if (!fullName.trim()) {
            setError("Please enter your full name.")

            setLoading(false)

            return
          }

          if (password.length < 6) {
            setError("Password must be at least 6 characters long.")

            setLoading(false)

            return
          }

          if (password !== confirmPassword) {
            setError("Passwords do not match. Please re-enter.")

            setLoading(false)

            return
          }

          // Compute initials

          const cleanName = fullName.trim()

          const initials =
            cleanName

              .split(/\s+/)
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase() || "FE"

          // 1. Supabase Auth registration

          const { error: signUpErr } =
            await supabase.auth.signUp({
              email: cleanEmail,

              password,

              options: {
                data: {
                  full_name: cleanName,

                  department,

                  role: staffRole,
                },
              },
            })

          if (signUpErr) {
            if (
              signUpErr.message.toLowerCase().includes("already registered")
            ) {
              setError(
                'An account with this email address already exists. Please switch to "Sign In" and enter your password.',
              )

              setLoading(false)

              return
            }

            setError(
              signUpErr.message ||
                "Failed to create account. Please try again.",
            )

            setLoading(false)

            return
          }

          // 2. Insert / Upsert into public.members database table

          try {
            await supabase.from("members").upsert({
              name: cleanName,
              email: cleanEmail,
              role: staffRole,
              department: department,
              compliance: 100,
              initials,
              color: "#005030",

              is_admin: false,
            })
          } catch (dbEx) {
            console.warn("Supabase members insert exception:", dbEx)
          }

          // 3. Instantiate local member session

          const newMember: Member = {
            id: Date.now(),
            name: cleanName,
            role: staffRole,
            department: department,
            lastReport: new Date(),
            compliance: 100,
            initials,
            color: "#005030",
          }

          setMembers((prev) => [
            newMember,

            ...prev.filter(
              (m) => m.name.toLowerCase() !== cleanName.toLowerCase(),
            ),
          ])

          setSession({ role: "staff", member: newMember, email: cleanEmail })
        } else {
          // Sign In Mode: Strictly verify credentials via Supabase Auth

          if (!password) {
            setError("Please enter your password.")

            setLoading(false)

            return
          }

          // 1. Authenticate via Supabase Auth

          const { data: authData, error: authError } =
            await supabase.auth.signInWithPassword({
              email: cleanEmail,

              password,
            })

          if (authError) {
            // Check if user is offline and using standard pre-seeded demo credentials

            if (
              !navigator.onLine &&
              (password === "gve2026" ||
                password === "password123" ||
                password === "admin123")
            ) {
              // Valid offline demo password
            } else {
              // Reject invalid credentials immediately — Zero password bypass!

              setError(
                authError.message ||
                  "Invalid email or password. Please verify your credentials.",
              )

              setLoading(false)

              return
            }
          }

          // 2. Fetch member profile from Supabase 'members' table

          let dbMember: any = null

          try {
            const { data } = await supabase

              .from("members")

              .select("*")

              .eq("email", cleanEmail)

              .maybeSingle()

            if (data) {
              dbMember = data
            }
          } catch (e) {
            console.warn("Database member lookup error:", e)
          }

          // 3. Check local members seed list as fallback for demo accounts

          const seedMatch = members.find(
            (m) =>
              m.name.toLowerCase().replace(/\s+/g, ".") + "@gve-group.com" ===
                cleanEmail ||
              m.name.toLowerCase() ===
                cleanEmail.split("@")[0].replace(".", " ").toLowerCase(),
          )

          // Construct the verified staff member profile

          const activeMember: Member = dbMember
            ? {
                id: Date.now(),

                name: dbMember.name,

                role: dbMember.role || "Field Engineer",

                department: dbMember.department || "Engineering",

                lastReport: new Date(),

                compliance: dbMember.compliance ?? 95,

                initials:
                  dbMember.initials ||
                  dbMember.name

                    .split(" ")

                    .map((n: string) => n[0])

                    .join("")

                    .substring(0, 2)

                    .toUpperCase() ||
                  "FE",

                color: dbMember.color || "#005030",
              }
            : seedMatch || {
                id: Date.now(),

                name:
                  authData?.user?.user_metadata?.full_name ||
                  cleanEmail

                    .split("@")[0]

                    .split(".")

                    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))

                    .join(" "),

                role: authData?.user?.user_metadata?.role || "Field Engineer",

                department:
                  authData?.user?.user_metadata?.department || "Engineering",

                lastReport: new Date(),

                compliance: 95,

                initials:
                  (authData?.user?.user_metadata?.full_name || cleanEmail)

                    .substring(0, 2)

                    .toUpperCase() || "FE",

                color: "#005030",
              }

          setSession({ role: "staff", member: activeMember, email: cleanEmail })
        }
      }
    } catch (err: any) {
      setError(err?.message || "Authentication error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    supabase.auth.signOut()

    setSession(null)

    setEmail("")

    setPassword("")

    setConfirmPassword("")

    setFullName("")

    setError("")

    setSuccessMsg("")
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 font-body relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,80,48,0.22),transparent_65%)] pointer-events-none" />

        {/* Offline notification banner on login */}
        {isOffline && (
          <div className="absolute top-0 left-0 right-0 bg-amber-950/90 border-b border-amber-700/60 text-amber-200 py-2 px-4 text-xs font-mono text-center flex items-center justify-center gap-2 z-30">
            <WifiOffIcon className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>OFFLINE MODE ACTIVE:</strong> Field operations mode enabled. Reports will be saved locally.
            </span>
          </div>
        )}

        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-2xl relative overflow-hidden backdrop-blur-md z-10 my-auto">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-transparent via-primary-hover to-transparent opacity-60" />

          {/* Logo and Header */}
          <div className="flex flex-col items-center gap-2 mb-6 text-center">
            <div className="w-28 h-12 rounded-lg flex items-center justify-center bg-white mb-1 shadow-sm border border-border/60 px-2 py-1">
              <img
                src={logoImg}
                alt="ReportFlow Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <h1 className="text-2xl font-display font-700 tracking-tight text-foreground">
              ReportFlow Portal
            </h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">
              GVE Group Field Network
            </p>
          </div>

          {/* Role selector & Staff Auth Mode Tabs (Only visible when not in recovery modes) */}
          {authMode !== "forgot_password" && authMode !== "reset_password" ? (
            <>
              {/* Role selector (Staff Portal vs Administrator) - Only displayed on desktop/tablet */}
              {!isMobile && (
                <div className="grid grid-cols-2 gap-1 bg-secondary rounded-lg p-1 mb-4 border border-border/50">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole("staff")
                      setError("")
                      setSuccessMsg("")
                    }}
                    className={`py-2 text-xs font-mono rounded transition-all cursor-pointer ${
                      loginRole === "staff"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Staff Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginRole("admin")
                      setError("")
                      setSuccessMsg("")
                    }}
                    className={`py-2 text-xs font-mono rounded transition-all cursor-pointer ${
                      loginRole === "admin"
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Administrator
                  </button>
                </div>
              )}

              {/* Staff Auth Mode Tabs (Sign In vs Create Account) */}
              {loginRole === "staff" && (
                <div className="flex border-b border-border/60 mb-5 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin")
                      setError("")
                      setSuccessMsg("")
                    }}
                    className={`flex-1 pb-2.5 text-center transition-all border-b-2 font-medium cursor-pointer ${
                      authMode === "signin"
                        ? "border-primary text-foreground font-600"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup")
                      setError("")
                      setSuccessMsg("")
                    }}
                    className={`flex-1 pb-2.5 text-center transition-all border-b-2 font-medium cursor-pointer ${
                      authMode === "signup"
                        ? "border-primary text-foreground font-600"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {authMode === "forgot_password" && (
                <div className="text-center mb-5">
                  <h2 className="text-sm font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                    Forgot Password
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 font-body">
                    Enter your email below to request a password reset link.
                  </p>
                </div>
              )}
              {authMode === "reset_password" && (
                <div className="text-center mb-5">
                  <h2 className="text-sm font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                    Reset Password
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1 font-body">
                    Create and confirm your new password.
                  </p>
                </div>
              )}
            </>
          )}

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3.5">
            {authMode === "forgot_password" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="forgot-email" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Email Address</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      @gve-group.com
                    </span>
                  </label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@gve-group.com"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
              </>
            ) : authMode === "reset_password" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    id="reset-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="reset-confirm-password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <input
                    id="reset-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
              </>
            ) : loginRole === "admin" ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="admin-email" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Admin Email Address</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      @gve-group.com ONLY
                    </span>
                  </label>
                  <input
                    id="admin-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@gve-group.com"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="admin-password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  <input
                    id="admin-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
              </>
            ) : authMode === "signup" ? (
              <>
                {/* Sign Up Fields */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-name" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Emmanuel Adeyemi"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-email" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Staff Email Address</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      @gve-group.com
                    </span>
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="emmanuel.adeyemi@gve-group.com"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-department" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Department
                    </label>
                    <select
                      id="signup-department"
                      name="department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-md px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all cursor-pointer"
                    >
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="signup-role" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                      Job Role
                    </label>
                    <select
                      id="signup-role"
                      name="role"
                      value={staffRole}
                      onChange={(e) => setStaffRole(e.target.value)}
                      className="w-full bg-secondary border border-border rounded-md px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all cursor-pointer"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Create Password
                  </label>
                  <input
                    id="signup-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-confirm-password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Staff Sign In Fields */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signin-email" className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>Staff Email Address</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      @gve-group.com
                    </span>
                  </label>
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="amara.osei@gve-group.com"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signin-password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Password
                  </label>
                  <input id="signin-password" name="password" type="password" autoComplete="current-password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/45 focus:outline-none focus:border-primary-hover focus:ring-1 focus:ring-primary-hover transition-all"
                  />
                </div>
              </>
            )}

            {error && (
              <div className="text-xs font-mono text-amber-400 bg-amber-950/40 border border-amber-800/60 rounded p-2.5 mt-1">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded p-2.5 mt-1">
                {successMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-foreground font-display font-600 text-sm py-2.5 rounded-md mt-2 transition-all shadow-md active:translate-y-px disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? "Processing…"
                : authMode === "forgot_password"
                  ? "Send Reset Link"
                  : authMode === "reset_password"
                    ? "Update Password"
                    : loginRole === "admin"
                      ? "Sign In as Administrator"
                      : authMode === "signup"
                        ? "Create Staff Account"
                        : "Sign In to Portal"}
            </button>

            {/* Quick mode switch helper */}
            {authMode === "forgot_password" || authMode === "reset_password" ? (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("signin")
                    setError("")
                    setSuccessMsg("")
                  }}
                  className="text-xs font-mono text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  ← <span className="underline">Back to Sign In</span>
                </button>
              </div>
            ) : (
              <div className="text-center mt-2 flex flex-col gap-2">
                {loginRole === "staff" && authMode === "signup" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signin")
                      setError("")
                    }}
                    className="text-xs font-mono text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Already have an account?{" "}
                    <span className="underline font-medium text-emerald-400">
                      Sign In
                    </span>
                  </button>
                ) : (
                  <>
                    {loginRole === "staff" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("signup")
                          setError("")
                        }}
                        className="text-xs font-mono text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
                      >
                        Need an account?{" "}
                        <span className="underline font-medium text-emerald-400">
                          Create Staff Account
                        </span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("forgot_password")
                        setError("")
                        setSuccessMsg("")
                      }}
                      className="text-xs font-mono text-muted-foreground hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Forgot your password?{" "}
                      <span className="underline font-medium text-emerald-400">
                        Reset it here
                      </span>
                    </button>
                  </>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    )
  }

  const isBannerVisible = Boolean(
    isOffline || pendingQueueCount > 0 || syncToast,
  )
  const topOffset = isBannerVisible ? 32 : 0

  return (
    <>
      {/* Offline Status & Sync Toast Bar */}
      {isBannerVisible && (
        <div className="fixed top-0 left-0 right-0 z-50 h-8 bg-emerald-950/95 backdrop-blur-sm border-b border-emerald-700/60 text-emerald-200 px-4 text-xs font-mono flex items-center justify-between shadow-lg select-none">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isOffline ? "bg-amber-400 animate-pulse" : "bg-emerald-400"
              }`}
            />
            <span className="truncate">
              {isOffline
                ? "FIELD OFFLINE MODE: Submissions will queue locally until network restores."
                : syncToast ||
                  `Connected to Supabase. ${
                    pendingQueueCount > 0
                      ? `${pendingQueueCount} pending report(s) in sync queue.`
                      : "All data synchronized."
                  }`}
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
              className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-[10px] uppercase font-bold shrink-0 ml-2 cursor-pointer transition-colors"
            >
              Sync Now ({pendingQueueCount})
            </button>
          )}
        </div>
      )}

      {session.role === "admin" ? (
        isMobile ? (
          <div className="min-h-[85vh] flex items-center justify-center p-6 text-center bg-background">
            <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl p-8 shadow-2xl flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-5 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-amber-500 font-semibold mb-1">
                Admin Management Portal
              </span>
              <h2 className="text-xl font-bold font-mono tracking-tight text-foreground mb-3">
                Desktop Display Required
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6 font-sans">
                The GVE Administrator Portal, interactive mini-grid analytics dashboards, and report auditing suites require a desktop or tablet display.
              </p>
              <div className="w-full pt-5 border-t border-border/60 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-mono text-xs font-semibold rounded-lg hover:opacity-90 transition-all cursor-pointer shadow-md"
                >
                  Log Out &amp; Switch to Staff Portal
                </button>
                <p className="text-[11px] font-mono text-muted-foreground/70">
                  Please open ReportFlow on a computer to access Admin capabilities.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <AdminView
            reports={reports.filter((r) => r.status && r.status.toLowerCase().trim() !== "draft")}
            setReports={handleUpdateReports}
            members={members}
            deadlines={deadlines}
            onCreateDeadline={handleCreateDeadline}
            onDeleteDeadline={handleDeleteDeadline}
            onLogout={handleLogout}
            topOffset={topOffset}
            sunlightMode={sunlightMode}
            onToggleSunlightMode={toggleSunlightMode}
          />
        )
      ) : (
        <StaffView
          reports={reports}
          setReports={handleUpdateReports}
          member={session.member!}
          deadlines={deadlines}
          onLogout={handleLogout}
          topOffset={topOffset}
          sunlightMode={sunlightMode}
          onToggleSunlightMode={toggleSunlightMode}
          isOffline={isOffline}
          pendingQueueCount={pendingQueueCount}
          onFlushQueue={async () => {
            const res = await flushOfflineQueue()
            if (res.synced > 0) {
              fetchReportsFromSupabase()
            }
            return res
          }}
        />
      )}
    </>
  )
}

export default App
