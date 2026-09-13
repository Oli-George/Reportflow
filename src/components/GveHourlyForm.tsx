import React, { useState, useMemo } from "react"
import logoImg from "./logo.jpeg"
import {
  GveDailyRecordData,
  GveHourlyEntry,
  DEFAULT_12HR_TIMES,
  createEmptyGveEntry,
} from "../types/gveDaily"
import { ReportAttachment } from "../types/attachment"
import ReportPhotoUploader from "./ReportPhotoUploader"
import {
  useServerTime,
  getHourlySlotStatus,
  hasEntryData,
  SlotStatusInfo,
} from "../lib/serverTime"
import {
  getLastSiteName,
  saveLastSiteName,
  getRecentSiteNames,
} from "../lib/siteMemory"
import { useFormAutoSave } from "../hooks/useFormAutoSave"
import {
  ClockIcon,
  RefreshIcon,
  EyeIcon,
  EditIcon,
  AlertIcon,
  LockIcon,
  UnlockIcon,
  CheckIcon,
  FileTextIcon,
} from "./Icons"

export interface GveDailyHourlyFormProps {
  initialData?: GveDailyRecordData
  readOnly?: boolean
  isAdmin?: boolean
  author?: string
  reportId?: number | null
  onSave?: (data: GveDailyRecordData, status: "Draft" | "Submitted") => void
  onCancel?: () => void
}

export type GveKukaHourlyFormProps = GveDailyHourlyFormProps

export default function GveDailyHourlyForm({
  initialData,
  readOnly = false,
  isAdmin = false,
  author,
  reportId,
  onSave,
  onCancel,
}: GveDailyHourlyFormProps) {
  const today = new Date()
  const defaultDateStr = today.toISOString().split("T")[0]
  const defaultDayStr = today.toLocaleDateString("en-US", { weekday: "long" })
  const defaultYearStr = today.getFullYear().toString()

  // Site Name state initialized from initialData or remembered site
  const [siteName, setSiteName] = useState(
    initialData?.siteName || getLastSiteName() || "GVE Daily Site",
  )

  const [date, setDate] = useState(initialData?.date || defaultDateStr)
  const [day, setDay] = useState(initialData?.day || defaultDayStr)
  const [year, setYear] = useState(initialData?.year || defaultYearStr)
  const [title, setTitle] = useState(
    initialData?.title ||
      `${initialData?.siteName || getLastSiteName() || "GVE Site"} Hourly Record — ${initialData?.date || defaultDateStr}`,
  )
  const [titleError, setTitleError] = useState<string | null>(null)

  const [entries, setEntries] = useState<GveHourlyEntry[]>(() => {
    if (initialData?.entries && initialData.entries.length > 0) {
      return initialData.entries
    }
    return DEFAULT_12HR_TIMES.map((time, idx) => createEmptyGveEntry(time, idx))
  })

  const [attachments, setAttachments] = useState<ReportAttachment[]>(
    initialData?.attachments || [],
  )

  // Continuous 10-second IndexedDB Form Auto-Save
  const currentFormData: GveDailyRecordData = useMemo(
    () => ({
      siteName: siteName || "GVE Daily Site",
      title: title.trim(),
      date,
      day,
      year,
      entries,
      attachments,
    }),
    [siteName, title, date, day, year, entries, attachments],
  )

  const {
    lastSavedTime,
    isSaving,
    recoveredDraft,
    restoreDraft,
    discardDraft,
    clearDraft,
  } = useFormAutoSave<GveDailyRecordData>({
    formType: "gveDaily",
    author: author || "Field Technician",
    reportId,
    formData: currentFormData,
    siteName,
    title,
    readOnly,
  })

  const handleRestoreDraft = () => {
    const restored = restoreDraft()
    if (restored) {
      if (restored.siteName) setSiteName(restored.siteName)
      if (restored.title) setTitle(restored.title)
      if (restored.date) setDate(restored.date)
      if (restored.day) setDay(restored.day)
      if (restored.year) setYear(restored.year)
      if (restored.entries && restored.entries.length > 0) setEntries(restored.entries)
      if (restored.attachments) setAttachments(restored.attachments)
    }
  }

  const [viewMode, setViewMode] = useState<"paper" | "interactive">("paper")
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [showSubmitConfirmModal, setShowSubmitConfirmModal] = useState(false)

  // Anti-tamper server time hook
  const {
    currentTime,
    isTampered,
    isOffline,
    syncStatus,
    refreshServerTime,
  } = useServerTime()

  // Admin override to unlock all rows
  const [adminOverride, setAdminOverride] = useState(false)

  const recentSites = useMemo(() => getRecentSiteNames(), [])

  // Calculate live slot statuses
  const slotStatuses = useMemo(() => {
    const map: Record<string, SlotStatusInfo> = {}
    entries.forEach((entry) => {
      const hasData = hasEntryData(entry)
      map[entry.id] = getHourlySlotStatus(entry.time, currentTime, date, {
        readOnly,
        adminOverride,
        hasData,
      })
    })
    return map
  }, [entries, currentTime, date, readOnly, adminOverride])

  // Find currently active slot (if any) or next upcoming slot
  const currentActiveSlot = useMemo(() => {
    return entries.find((e) => slotStatuses[e.id]?.status === "ACTIVE")
  }, [entries, slotStatuses])

  const nextUpcomingSlot = useMemo(() => {
    return entries.find((e) => slotStatuses[e.id]?.status === "UPCOMING")
  }, [entries, slotStatuses])

  // Toggle to optionally preview hidden upcoming locked hours
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)

  // Progressive row visibility: in live mode, hide locked UPCOMING rows unless they have data, admin override is on, or user clicked show all
  const visibleEntries = useMemo(() => {
    if (readOnly || adminOverride || showAllUpcoming) {
      return entries
    }
    return entries.filter((entry) => {
      const statusInfo = slotStatuses[entry.id]
      if (!statusInfo) return true
      if (
        statusInfo.status === "ACTIVE" ||
        statusInfo.status === "LOCKED_RECORDED" ||
        statusInfo.status === "EXPIRED_MISSED" ||
        statusInfo.status === "HISTORICAL" ||
        statusInfo.status === "ADMIN_UNLOCKED"
      ) {
        return true
      }
      if (hasEntryData(entry)) return true
      return false
    })
  }, [entries, slotStatuses, readOnly, adminOverride, showAllUpcoming])

  const hiddenUpcomingCount = entries.length - visibleEntries.length

  const handleEntryChange = (
    id: string,
    section: keyof GveHourlyEntry,
    field: string,
    value: string,
  ) => {
    const statusInfo = slotStatuses[id]
    if (readOnly || (!adminOverride && statusInfo && !statusInfo.isEditable)) {
      return
    }

    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.id !== id) return entry
        if (
          section === "time" ||
          section === "operatorName" ||
          section === "operatorSignature"
        ) {
          return { ...entry, [section]: value }
        }
        const subObj = entry[section] as Record<string, string>
        return {
          ...entry,
          [section]: {
            ...subObj,
            [field]: value,
          },
        }
      }),
    )
  }

  const handleAddRow = () => {
    if (readOnly) return
    const lastTime = entries[entries.length - 1]?.time || "12:00 PM"
    const newEntry = createEmptyGveEntry(`${lastTime} (Extra)`, entries.length)
    setEntries((prev) => [...prev, newEntry])
  }

  const handleRemoveRow = (id: string) => {
    if (readOnly || entries.length <= 1) return
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const extractSiteNameFromHourlyTitle = (titleText: string): string => {
    if (!titleText) return ""
    const trimmed = titleText.trim()
    if (/Hourly Record/i.test(trimmed)) {
      return trimmed.split(/Hourly Record/i)[0].trim().replace(/[—–\-]\s*$/, "").trim()
    }
    if (/[—–]/.test(trimmed)) {
      return trimmed.split(/[—–]/)[0].trim()
    }
    return trimmed
  }

  const handleSiteNameChange = (val: string) => {
    setSiteName(val)
    setTitle(`${val || "GVE Site"} Hourly Record — ${date}`)
    if (titleError) setTitleError(null)
  }

  const handleTitleChange = (val: string) => {
    setTitle(val)
    if (val.trim()) {
      setTitleError(null)
    }
    const extractedSite = extractSiteNameFromHourlyTitle(val)
    setSiteName(extractedSite)
  }

  const validateReportTitle = (): boolean => {
    if (!title || !title.trim()) {
      setTitleError("Report Name is required. Please enter a valid name before proceeding.")
      return false
    }
    setTitleError(null)
    return true
  }

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateReportTitle()) {
      return
    }
    saveLastSiteName(siteName)
    try {
      localStorage.removeItem(`reportflow_active_draft_hourly_${date}`)
    } catch (err) {}
    await clearDraft()
    if (onSave) {
      onSave(
        {
          siteName: siteName || "GVE Daily Site",
          title: title.trim(),
          date,
          day,
          year,
          entries,
          attachments,
        },
        "Draft",
      )
    }
  }

  const handleSubmitFinal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateReportTitle()) {
      setShowSubmitConfirmModal(false)
      return
    }
    saveLastSiteName(siteName)
    try {
      localStorage.removeItem(`reportflow_active_draft_hourly_${date}`)
    } catch (err) {}
    await clearDraft()

    if (onSave) {
      onSave(
        {
          siteName: siteName || "GVE Daily Site",
          title: title.trim(),
          date,
          day,
          year,
          entries,
          attachments,
        },
        "Submitted",
      )
    }
  }

  const handleTriggerPrint = () => {
    window.print()
  }

  // Format current live time
  const formattedTimeStr = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Dynamic Site Name Datalist */}
      <datalist id="reportflow-sites-list">
        {recentSites.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Security & Server Time Live Banner */}
      {!readOnly && (
        <div className="no-print bg-card border border-border p-3 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          {/* Time & Sync Status */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-secondary border border-border px-2.5 py-1 rounded-md font-mono text-foreground font-semibold">
              <ClockIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-bold text-foreground">{formattedTimeStr}</span>
              <span className="text-[10px] text-muted-foreground">
                ({Intl.DateTimeFormat().resolvedOptions().timeZone})
              </span>
            </div>

            {/* Anti-tamper & Sync Pills */}
            {isTampered ? (
              <span
                className="bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/80 dark:text-red-300 dark:border-red-700/60 px-2.5 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1 font-semibold"
                title="Device clock was altered. System calibrated using server monotonic clock."
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                Anti-Tamper Active: Protected Time
              </span>
            ) : syncStatus === "synced" ? (
              <span
                className="bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60 px-2.5 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1.5 font-semibold"
                title="Synced directly with trusted server timestamp"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                Server-Verified Time
              </span>
            ) : isOffline ? (
              <span
                className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60 px-2.5 py-0.5 rounded-full text-[11px] font-mono flex items-center gap-1.5 font-semibold"
                title="Offline mode: Time tracked via monotonic hardware timer calibrated against last sync"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Offline Monotonic Mode
              </span>
            ) : (
              <span className="bg-secondary text-foreground border border-border px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium">
                Calibrated Time
              </span>
            )}
          </div>

          {/* Current Hour Window Countdown Indicator */}
          <div className="flex items-center gap-2">
            {currentActiveSlot ? (
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 border border-emerald-400 dark:bg-emerald-950/60 dark:border-emerald-600/80 dark:text-emerald-300 px-3 py-1 rounded-md font-mono text-[11px] font-semibold animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span>
                  <strong>{currentActiveSlot.time}</strong> Slot OPEN —{" "}
                  {slotStatuses[currentActiveSlot.id]?.statusLabel}
                </span>
              </div>
            ) : nextUpcomingSlot ? (
              <div className="flex items-center gap-1.5 bg-secondary border border-border text-foreground px-3 py-1 rounded-md font-mono text-[11px]">
                <ClockIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>
                  Next window: <strong>{nextUpcomingSlot.time}</strong> (
                  {Math.floor(
                    (slotStatuses[nextUpcomingSlot.id]?.secondsUntilUnlock || 0) / 60,
                  )}
                  m remaining)
                </span>
              </div>
            ) : (
              <div className="text-muted-foreground font-mono text-[11px]">
                Shift completed / No active windows
              </div>
            )}

            {/* Admin Override Switch (if admin) */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setAdminOverride(!adminOverride)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all flex items-center gap-1 cursor-pointer ${
                  adminOverride
                    ? "bg-purple-100 text-purple-900 border-purple-400 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-600 font-bold"
                    : "bg-secondary text-muted-foreground border-border hover:text-foreground font-medium"
                }`}
                title="Supervisors can unlock all hourly rows for backfill or historical corrections"
              >
                {adminOverride ? (
                  <>
                    <UnlockIcon className="w-3 h-3" />
                    <span>Admin Override Active</span>
                  </>
                ) : (
                  <>
                    <LockIcon className="w-3 h-3" />
                    <span>Admin Override</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => refreshServerTime()}
              className="p-1.5 rounded bg-secondary hover:bg-muted text-foreground border border-border transition-colors cursor-pointer"
              title="Resync server timestamp"
            >
              <RefreshIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Progressive Shift Timeline Banner */}
      {!readOnly && (
        <div className="no-print bg-card border border-border px-4 py-2.5 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground font-mono flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="font-semibold text-foreground">Shift Progress:</span>
            </span>
            <span className="font-mono text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800/60 text-[11px]">
              {visibleEntries.length} of {entries.length} hours visible
            </span>
            {hiddenUpcomingCount > 0 && nextUpcomingSlot && (
              <span className="text-muted-foreground font-mono text-[11px]">
                • Next slot: <strong className="text-emerald-700 dark:text-emerald-300">{nextUpcomingSlot.time}</strong> (opens in {Math.floor((slotStatuses[nextUpcomingSlot.id]?.secondsUntilUnlock || 0) / 60)}m with 15m entry window)
              </span>
            )}
          </div>

          {hiddenUpcomingCount > 0 || showAllUpcoming ? (
            <button
              type="button"
              onClick={() => setShowAllUpcoming(!showAllUpcoming)}
              className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1.5 transition-colors ml-auto cursor-pointer font-medium"
            >
              <EyeIcon className="w-3.5 h-3.5 shrink-0" />
              <span>
                {showAllUpcoming
                  ? "Hide upcoming locked hours"
                  : `Preview all 13 hours (${hiddenUpcomingCount} hidden)`}
              </span>
            </button>
          ) : null}
        </div>
      )}

      {/* Top Toolbar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-secondary/80 border border-border p-3 rounded-lg backdrop-blur-sm">
        <div className="flex-1 min-w-[260px] max-w-xl flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-2 mb-0.5">
              <label
                htmlFor="hourly-report-name-input"
                className="text-[10px] font-mono uppercase text-muted-foreground font-semibold flex items-center gap-1.5"
              >
                <span>Report Name</span>
                {titleError && (
                  <span className="text-rose-700 dark:text-rose-400 font-bold text-[9px] bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/80 px-1.5 py-0.5 rounded animate-pulse">
                    Required
                  </span>
                )}
              </label>
              {titleError && (
                <span className="text-[10px] font-mono text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                  <AlertIcon className="w-3 h-3 inline" />
                  <span>{titleError}</span>
                </span>
              )}
            </div>
            {readOnly ? (
              <h2 className="text-sm font-display font-600 text-foreground truncate">
                {title || `${siteName || "GVE Site"} Hourly Record — ${date}`}
              </h2>
            ) : (
              <div className="relative flex items-center">
                <input
                  id="hourly-report-name-input"
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Enter report name..."
                  className={`w-full bg-background/90 border text-xs font-semibold px-2.5 py-1.5 rounded outline-none transition-all ${
                    titleError
                      ? "border-rose-500 ring-2 ring-rose-500/50 text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/20"
                      : "border-border text-foreground hover:border-zinc-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  }`}
                />
                <span className="absolute right-2.5 text-muted-foreground pointer-events-none">
                  <EditIcon className="w-3.5 h-3.5" />
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Auto-save status indicator (Strictly NO emojis) */}
          {!readOnly && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-secondary/80 border border-border text-[11px] font-mono text-muted-foreground font-medium">
              {isSaving ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                  <span>Saving draft...</span>
                </>
              ) : lastSavedTime ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-500 inline-block" />
                  <span className="text-foreground">Auto-saved locally</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 inline-block" />
                  <span>Auto-save active</span>
                </>
              )}
            </div>
          )}

          {/* View mode toggle */}
          <div className="flex items-center bg-background rounded-md p-1 border border-border text-xs">
            <button
              type="button"
              onClick={() => setViewMode("paper")}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                viewMode === "paper"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              Physical Sheet View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("interactive")}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                viewMode === "interactive"
                  ? "bg-primary text-primary-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground font-medium"
              }`}
            >
              Fast Grid View
            </button>
          </div>

          {/* Export / Print Button */}
          <button
            type="button"
            onClick={() => setShowPdfModal(true)}
            className="flex items-center gap-1.5 bg-secondary hover:bg-border text-foreground px-3 py-1.5 rounded text-xs font-mono border border-border font-medium transition-all cursor-pointer"
          >
            <FileTextIcon className="w-3.5 h-3.5" />
            <span>Export to PDF / Live Preview</span>
          </button>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-secondary hover:bg-muted text-foreground border border-border px-3 py-1.5 rounded text-xs font-semibold transition-all cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Unsaved Draft Recovery Notification Banner (Strictly NO emojis) */}
      {recoveredDraft && (
        <div className="mb-4 p-3 rounded-lg bg-secondary border border-border flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>
              Unsaved local draft from{" "}
              {new Date(recoveredDraft.lastSavedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              found for {recoveredDraft.siteName || "this site"}.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRestoreDraft}
              className="px-2.5 py-1 bg-primary text-primary-foreground font-semibold rounded hover:opacity-90 transition-all text-xs cursor-pointer"
            >
              Restore Draft
            </button>
            <button
              type="button"
              onClick={discardDraft}
              className="px-2.5 py-1 bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground border border-border rounded transition-all text-xs cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Main Physical Form Render */}
      {viewMode === "paper" ? (
        <div className="print-area paper-sheet p-4 md:p-6 rounded-lg overflow-x-auto border border-zinc-300 text-black">
          {/* Header Section matching HOURLY RECORD sheet */}
          <div className="flex items-stretch border border-black mb-1 bg-white">
            {/* Logo */}
            <div className="w-48 p-2 border-r border-black flex flex-col justify-center items-center text-center">
              <img
                src={logoImg}
                alt="GVE Logo"
                className="max-h-12 max-w-full object-contain"
              />
            </div>

            {/* Title with Editable Site Name */}
            <div className="flex-1 flex flex-col justify-center items-center py-2 bg-white px-2">
              {readOnly ? (
                <h1 className="text-sm font-bold tracking-widest text-black uppercase text-center">
                  {siteName || "GVE KUKA SITE"}
                </h1>
              ) : (
                <div className="w-full flex flex-col items-center group relative">
                  <div className="flex items-center justify-center gap-1.5 w-full">
                    <input
                      type="text"
                      list="reportflow-sites-list"
                      value={siteName}
                      onChange={(e) => handleSiteNameChange(e.target.value)}
                      placeholder="ENTER SITE NAME..."
                      className="text-sm font-bold tracking-widest text-black uppercase text-center bg-transparent border-b border-dashed border-zinc-400 hover:border-black focus:border-emerald-600 focus:bg-emerald-50/50 outline-none px-2 py-0.5 w-full max-w-md transition-all"
                    />
                    <span
                      className="text-zinc-400 opacity-60 group-hover:opacity-100 cursor-help"
                      title="Editable site name (automatically remembers for your next report)"
                    >
                      <EditIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <span className="text-[8px] text-zinc-400 font-mono tracking-tight -mt-0.5">
                    (Site name auto-remembers for next report)
                  </span>
                </div>
              )}
              <h2 className="text-xs font-bold tracking-wider text-black uppercase mt-0.5">
                HOURLY RECORD
              </h2>
            </div>
          </div>

          {/* Date / Day / Year Bar */}
          <div className="grid grid-cols-3 border-x border-b border-black text-center text-[10px] font-bold uppercase mb-2 bg-zinc-100 py-1">
            <div className="flex items-center justify-center gap-2 border-r border-black px-2">
              <span>DATE:</span>
              <input
                type="date"
                value={date}
                disabled={readOnly}
                onChange={(e) => {
                  setDate(e.target.value)
                  try {
                    const parsed = new Date(e.target.value)
                    if (!isNaN(parsed.getTime())) {
                      setDay(
                        parsed.toLocaleDateString("en-US", {
                          weekday: "long",
                        }),
                      )
                      setYear(parsed.getFullYear().toString())
                    }
                  } catch (err) {}
                }}
                className="w-32 text-center font-mono font-bold uppercase bg-transparent outline-none"
              />
            </div>
            <div className="flex items-center justify-center gap-2 border-r border-black px-2">
              <span>DAY:</span>
              <input
                type="text"
                value={day}
                disabled={readOnly}
                onChange={(e) => setDay(e.target.value)}
                className="w-28 text-center font-mono font-bold uppercase bg-transparent outline-none"
              />
            </div>
            <div className="flex items-center justify-center gap-2 px-2">
              <span>YEAR:</span>
              <input
                type="text"
                value={year}
                disabled={readOnly}
                onChange={(e) => setYear(e.target.value)}
                className="w-20 text-center font-mono font-bold uppercase bg-transparent outline-none"
              />
            </div>
          </div>

          {/* Main Paper Grid Table */}
          <div className="paper-grid overflow-x-auto">
            <table className="w-full text-center text-[9px] border-collapse bg-white">
              <thead>
                {/* Row 1 Header Categories */}
                <tr className="bg-zinc-200 text-black font-bold uppercase text-[9.5px]">
                  <th rowSpan={2} className="w-24 min-w-[95px] p-1.5 border border-black">
                    TIME / STATUS
                  </th>
                  <th colSpan={4} className="p-1 border border-black ">
                    PV
                  </th>
                  <th colSpan={4} className="p-1 border border-black ">
                    BATTERY
                  </th>
                  <th colSpan={8} className="p-1 border border-black ">
                    LOAD
                  </th>
                  <th colSpan={8} className="p-1 border border-black ">
                    GRID/DG
                  </th>
                  <th colSpan={2} className="p-1 border border-black ">
                    SPD CONDITION
                  </th>
                  <th colSpan={2} className="p-1 border border-black ">
                    COOLING SYSTEM
                  </th>
                  {!readOnly && (
                    <th
                      rowSpan={2}
                      className="no-print w-9 border border-black p-1"
                    >
                      DEL
                    </th>
                  )}
                </tr>
                {/* Row 2 Sub-headers with units */}
                <tr className="bg-zinc-100 text-black font-bold text-[8.5px] uppercase">
                  {/* PV */}
                  <th className="p-1 min-w-[42px] border border-black">
                    VOLT
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[42px] border border-black">
                    CURR
                    <br />
                    (A)
                  </th>
                  <th className="p-1 min-w-[44px] border border-black">
                    POWER
                    <br />
                    (KW)
                  </th>
                  <th className="p-1 min-w-[46px] border border-black">
                    ENERGY
                    <br />
                    (kWh)
                  </th>
                  {/* BATTERY */}
                  <th className="p-1 min-w-[42px] border border-black">
                    VOLT
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[42px] border border-black">
                    CURR
                    <br />
                    (A)
                  </th>
                  <th className="p-1 min-w-[40px] border border-black">
                    SOC
                    <br />
                    (%)
                  </th>
                  <th className="p-1 min-w-[40px] border border-black">
                    SOH
                    <br />
                    (%)
                  </th>
                  {/* LOAD */}
                  <th className="p-1 min-w-[38px] border border-black">
                    L1
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L1
                    <br />
                    (A)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L2
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L2
                    <br />
                    (C)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L3
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L3
                    <br />
                    (C)
                  </th>
                  <th className="p-1 min-w-[44px] border border-black">
                    POWER
                    <br />
                    (KW)
                  </th>
                  <th className="p-1 min-w-[46px] border border-black">
                    ENERGY
                    <br />
                    (kWh)
                  </th>
                  {/* GRID/DG */}
                  <th className="p-1 min-w-[38px] border border-black">
                    L1
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L1
                    <br />
                    (A)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L2
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L2
                    <br />
                    (C)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L3
                    <br />
                    (V)
                  </th>
                  <th className="p-1 min-w-[38px] border border-black">
                    L3
                    <br />
                    (C)
                  </th>
                  <th className="p-1 min-w-[44px] border border-black">
                    POWER
                    <br />
                    (KW)
                  </th>
                  <th className="p-1 min-w-[46px] border border-black">
                    ENERGY
                    <br />
                    (kWh)
                  </th>
                  {/* SPD */}
                  <th className="p-1 min-w-[52px] border border-black">
                    IN
                    <br />
                    (GGGG)
                  </th>
                  <th className="p-1 min-w-[52px] border border-black">
                    OUT
                    <br />
                    (GGGG)
                  </th>
                  {/* COOLING */}
                  <th className="p-1 min-w-[48px] border border-black">AC1</th>
                  <th className="p-1 min-w-[48px] border border-black">AC2</th>
                </tr>
              </thead>
              <tbody>
                {visibleEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={readOnly ? 29 : 30}
                      className="border border-black p-6 text-center text-xs font-mono text-zinc-600 bg-zinc-50"
                    >
                      Shift has not started yet today. First hourly slot opens at{" "}
                      <strong>06:00 AM</strong> with a 15-minute entry window.
                    </td>
                  </tr>
                ) : (
                  visibleEntries.map((entry) => {
                    const statusInfo = slotStatuses[entry.id] || {
                      status: "ACTIVE",
                      isEditable: !readOnly,
                      statusLabel: "",
                      secondsRemainingInWindow: 0,
                      secondsUntilUnlock: 0,
                    }
                  const isLocked = !statusInfo.isEditable && !readOnly

                  // Row background style based on time progression status
                  let rowBgClass = "hover:bg-zinc-50"
                  if (statusInfo.status === "ACTIVE") {
                    rowBgClass = "bg-emerald-50/80 font-bold"
                  } else if (statusInfo.status === "UPCOMING") {
                    rowBgClass = "bg-zinc-100/70 opacity-60"
                  } else if (statusInfo.status === "EXPIRED_MISSED") {
                    rowBgClass = "bg-amber-50/40 opacity-70"
                  }

                  return (
                    <tr
                      key={entry.id}
                      className={`font-mono text-[9.5px] h-9 border-b border-black transition-colors ${rowBgClass}`}
                    >
                      {/* Time & Live Status Indicator */}
                      <td
                        className={`border border-black p-1 text-center relative ${
                          statusInfo.status === "ACTIVE"
                            ? "bg-emerald-100 text-emerald-950 font-extrabold"
                            : "bg-zinc-50 font-semibold"
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center leading-tight">
                          <span>{entry.time}</span>
                          {!readOnly && (
                            <span className="text-[7px] block uppercase font-sans">
                              {statusInfo.status === "ACTIVE" && (
                                <span className="text-emerald-700 font-bold animate-pulse">
                                  ● LIVE (:15)
                                </span>
                              )}
                              {statusInfo.status === "UPCOMING" && (
                                <span className="text-zinc-500 font-normal inline-flex items-center gap-0.5">
                                  <LockIcon className="w-2 h-2" /> Locked
                                </span>
                              )}
                              {statusInfo.status === "LOCKED_RECORDED" && (
                                <span className="text-blue-800 font-medium inline-flex items-center gap-0.5">
                                  <CheckIcon className="w-2 h-2" /> Recorded
                                </span>
                              )}
                              {statusInfo.status === "EXPIRED_MISSED" && (
                                <span className="text-amber-700 font-medium inline-flex items-center gap-0.5">
                                  <AlertIcon className="w-2 h-2" /> Missed
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* PV */}
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.pv.volt}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "pv",
                              "volt",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder={statusInfo.status === "UPCOMING" ? "—" : "—"}
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.pv.curr}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "pv",
                              "curr",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.pv.power}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "pv",
                              "power",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed font-medium"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.pv.energy}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "pv",
                              "energy",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed font-medium"
                          placeholder="—"
                        />
                      </td>

                      {/* BATTERY */}
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.battery.volt}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "battery",
                              "volt",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.battery.curr}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "battery",
                              "curr",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.battery.soc}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "battery",
                              "soc",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.battery.soh}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "battery",
                              "soh",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>

                      {/* LOAD */}
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.l1_v}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "l1_v",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.l1_a}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "l1_a",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.l2_v}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "l2_v",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.l2_c}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "l2_c",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.l3_v}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "l3_v",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.l3_c}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "l3_c",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.power}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "power",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed font-medium"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.load.energy}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "load",
                              "energy",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed font-medium"
                          placeholder="—"
                        />
                      </td>

                      {/* GRID/DG */}
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.l1_v}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "l1_v",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.l1_a}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "l1_a",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.l2_v}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "l2_v",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.l2_c}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "l2_c",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.l3_v}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "l3_v",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.l3_c}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "l3_c",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.power}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "power",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed font-medium"
                          placeholder="—"
                        />
                      </td>
                      <td className="border border-black p-1">
                        <input
                          type="text"
                          value={entry.grid.energy}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "grid",
                              "energy",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 px-0.5 text-[9.5px] font-mono outline-none disabled:cursor-not-allowed font-medium"
                          placeholder="—"
                        />
                      </td>

                      {/* SPD */}
                      <td className="border border-black p-1">
                        <select
                          value={entry.spd.in}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "spd",
                              "in",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 text-[9px] font-semibold outline-none disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="GOOD">GOOD</option>
                          <option value="DEFECT">FAULT</option>
                        </select>
                      </td>
                      <td className="border border-black p-1">
                        <select
                          value={entry.spd.out}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "spd",
                              "out",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 text-[9px] font-semibold outline-none disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="GOOD">GOOD</option>
                          <option value="DEFECT">FAULT</option>
                        </select>
                      </td>

                      {/* COOLING */}
                      <td className="border border-black p-1">
                        <select
                          value={entry.cooling.ac1}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "cooling",
                              "ac1",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 text-[9px] font-semibold outline-none disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="ON">ON</option>
                          <option value="OFF">OFF</option>
                        </select>
                      </td>
                      <td className="border border-black p-1">
                        <select
                          value={entry.cooling.ac2}
                          disabled={isLocked || readOnly}
                          onChange={(e) =>
                            handleEntryChange(
                              entry.id,
                              "cooling",
                              "ac2",
                              e.target.value,
                            )
                          }
                          className="w-full text-center bg-transparent py-1 text-[9px] font-semibold outline-none disabled:cursor-not-allowed cursor-pointer"
                        >
                          <option value="ON">ON</option>
                          <option value="OFF">OFF</option>
                        </select>
                      </td>

                      {/* Delete Action (only if admin or override) */}
                      {!readOnly && (
                        <td className="no-print border border-black p-0.5">
                          {(adminOverride || statusInfo.status === "ACTIVE") && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(entry.id)}
                              className="text-red-500 hover:text-red-700 text-xs px-1"
                              title="Delete row"
                            >
                              ✕
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>

          {/* Add Row Button (Admin only or live active) */}
          {!readOnly && (adminOverride || isAdmin) && (
            <div className="no-print mt-3 flex justify-between items-center text-xs">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 border border-black rounded text-black font-mono transition-all"
              >
                + Add Custom Hourly Row
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Fast Interactive Grid View */
        <div className="flex flex-col gap-4">
          {/* Site Name and Report Params Bar */}
          <div className="bg-card border border-border rounded-lg p-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
                Site Name (Editable & Remembered)
              </label>
              <input
                type="text"
                list="reportflow-sites-list"
                value={siteName}
                disabled={readOnly}
                onChange={(e) => handleSiteNameChange(e.target.value)}
                placeholder="e.g. GVE KUKA SITE"
                className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
                Report Date
              </label>
              <input
                type="date"
                value={date}
                disabled={readOnly}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
                Day
              </label>
              <input
                type="text"
                value={day}
                disabled={readOnly}
                onChange={(e) => setDay(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-muted-foreground block mb-1">
                Year
              </label>
              <input
                type="text"
                value={year}
                disabled={readOnly}
                onChange={(e) => setYear(e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-1.5 text-xs text-foreground font-mono"
              />
            </div>
          </div>

          {/* Hourly Cards in Interactive View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleEntries.length === 0 ? (
              <div className="col-span-full bg-card border border-border p-8 rounded-lg text-center font-mono text-xs text-muted-foreground">
                No active hourly windows yet today. Shift begins at{" "}
                <strong className="text-primary-hover">06:00 AM</strong>.
              </div>
            ) : (
              visibleEntries.map((entry) => {
                const statusInfo = slotStatuses[entry.id] || {
                  status: "ACTIVE",
                  isEditable: !readOnly,
                  statusLabel: "",
                  secondsRemainingInWindow: 0,
                  secondsUntilUnlock: 0,
                }
              const isLocked = !statusInfo.isEditable && !readOnly

              return (
                <div
                  key={entry.id}
                  className={`border rounded-lg p-4 transition-all ${
                    statusInfo.status === "ACTIVE"
                      ? "bg-card border-emerald-500 shadow-md ring-1 ring-emerald-500/40"
                      : statusInfo.status === "UPCOMING"
                      ? "bg-card/40 border-border opacity-70"
                      : "bg-card border-border"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-foreground">
                        {entry.time}
                      </span>
                      {statusInfo.status === "ACTIVE" && (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-600 px-2 py-0.5 rounded text-[10px] font-mono font-semibold animate-pulse">
                          ● OPEN FOR INPUT ({statusInfo.statusLabel})
                        </span>
                      )}
                      {statusInfo.status === "UPCOMING" && (
                        <span className="bg-secondary text-muted-foreground border border-border px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 text-muted-foreground" />
                          <span>{statusInfo.statusLabel}</span>
                        </span>
                      )}
                      {statusInfo.status === "LOCKED_RECORDED" && (
                        <span className="bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-700 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 font-semibold">
                          <CheckIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          <span>Locked Log</span>
                        </span>
                      )}
                      {statusInfo.status === "EXPIRED_MISSED" && (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700 px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 font-semibold">
                          <AlertIcon className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Window Expired</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground block font-mono">
                        PV Power (kW)
                      </label>
                      <input
                        type="text"
                        value={entry.pv.power}
                        disabled={isLocked || readOnly}
                        onChange={(e) =>
                          handleEntryChange(
                            entry.id,
                            "pv",
                            "power",
                            e.target.value,
                          )
                        }
                        placeholder="0.0"
                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block font-mono">
                        Battery SOC (%)
                      </label>
                      <input
                        type="text"
                        value={entry.battery.soc}
                        disabled={isLocked || readOnly}
                        onChange={(e) =>
                          handleEntryChange(
                            entry.id,
                            "battery",
                            "soc",
                            e.target.value,
                          )
                        }
                        placeholder="0%"
                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block font-mono">
                        Load Power (kW)
                      </label>
                      <input
                        type="text"
                        value={entry.load.power}
                        disabled={isLocked || readOnly}
                        onChange={(e) =>
                          handleEntryChange(
                            entry.id,
                            "load",
                            "power",
                            e.target.value,
                          )
                        }
                        placeholder="0.0"
                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block font-mono">
                        Grid Power (kW)
                      </label>
                      <input
                        type="text"
                        value={entry.grid.power}
                        disabled={isLocked || readOnly}
                        onChange={(e) =>
                          handleEntryChange(
                            entry.id,
                            "grid",
                            "power",
                            e.target.value,
                          )
                        }
                        placeholder="0.0"
                        className="w-full bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              )
            }))}
          </div>
        </div>
      )}

      {/* Report Photo & Evidence Uploader at End of Report */}
      <ReportPhotoUploader
        attachments={attachments}
        onChange={setAttachments}
        readOnly={readOnly}
        title="Site Photos & Operational Evidence"
        description="Attach photos of the solar PV field, inverter readings, battery room, or site damages. Available offline and syncs automatically."
      />

      {/* ─── Bottom Actions Bar (Save Draft & Submit Report) ──────────────── */}
      {!readOnly && onSave && (
        <div className="no-print bg-secondary/80 border border-border p-4 rounded-xl shadow-sm mt-2">
          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="btn-save-draft w-full flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/50 dark:hover:bg-amber-900/80 dark:text-amber-300 dark:border-amber-700/60 font-mono px-4 py-2.5 rounded-lg text-xs font-bold transition-all shadow-2xs active:translate-y-px cursor-pointer"
              title="Save as Draft to edit later before submitting"
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
              onClick={() => setShowSubmitConfirmModal(true)}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold px-4 py-2.5 rounded-lg text-xs transition-all shadow-sm active:translate-y-px cursor-pointer"
              title="Submit final report for Admin review"
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
              Submit Report
            </button>
          </div>
        </div>
      )}

      {/* Live PDF Export & Print Modal */}
      {showPdfModal && (
        <div className="no-print fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-border rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-zinc-950">
              <div className="flex items-center gap-2">
                <FileTextIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-display font-bold text-foreground">
                    Live PDF Export & Physical Print Preview
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Official 1:1 format replica of {siteName || "GVE Site"} Hourly
                    Record
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTriggerPrint}
                  className="bg-primary hover:bg-primary-hover text-white font-mono text-xs px-4 py-2 rounded flex items-center gap-1.5 shadow"
                >
                  Print / Save as PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm px-3 py-1.5"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-zinc-800 flex justify-center">
              <div className="w-full max-w-3xl scale-95 origin-top">
                <div className="paper-sheet p-6 rounded shadow-2xl">
                  {/* Render copy of physical sheet */}
                  <div className="flex items-stretch border border-black mb-1 bg-white">
                    <div className="w-48 p-2 border-r border-black flex flex-col justify-center items-center text-center">
                      <img
                        src={logoImg}
                        alt="GVE Logo"
                        className="max-h-10 max-w-full object-contain mx-auto"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center py-2">
                      <h1 className="text-sm font-bold text-black uppercase">
                        {siteName || "GVE KUKA SITE"}
                      </h1>
                      <h2 className="text-xs font-bold text-black uppercase">
                        HOURLY RECORD
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 border-x border-b border-black text-center text-[10px] font-bold uppercase mb-2 bg-zinc-100 py-1">
                    <div>DATE: {date}</div>
                    <div>DAY: {day}</div>
                    <div>YEAR: {year}</div>
                  </div>

                  <div className="paper-grid overflow-x-auto">
                    <table className="w-full text-center text-[8px] border-collapse bg-white">
                      <thead>
                        <tr className="text-black font-bold uppercase">
                          <th rowSpan={2} className="w-12 border border-black">
                            TIME
                          </th>
                          <th
                            colSpan={4}
                            className="border border-black bg-emerald-100"
                          >
                            PV
                          </th>
                          <th
                            colSpan={4}
                            className="border border-black bg-emerald-200"
                          >
                            BATTERY
                          </th>
                          <th
                            colSpan={8}
                            className="border border-black bg-blue-100"
                          >
                            LOAD
                          </th>
                          <th
                            colSpan={8}
                            className="border border-black bg-purple-100"
                          >
                            GRID/DG
                          </th>
                          <th
                            colSpan={2}
                            className="border border-black bg-amber-100"
                          >
                            SPD
                          </th>
                          <th
                            colSpan={2}
                            className="border border-black bg-cyan-100 p-1"
                          >
                            COOLING
                          </th>
                        </tr>
                        <tr className="bg-zinc-100 text-black font-bold text-[7px]">
                          <th>VOLT</th>
                          <th>CURR</th>
                          <th>POWER</th>
                          <th>ENERGY</th>
                          <th>VOLT</th>
                          <th>CURR</th>
                          <th>SOC</th>
                          <th>SOH</th>
                          <th>L1(V)</th>
                          <th>L1(A)</th>
                          <th>L2(V)</th>
                          <th>L2(C)</th>
                          <th>L3(V)</th>
                          <th>L3(C)</th>
                          <th>POWER</th>
                          <th>ENERGY</th>
                          <th>L1(V)</th>
                          <th>L1(A)</th>
                          <th>L2(V)</th>
                          <th>L2(C)</th>
                          <th>L3(V)</th>
                          <th>L3(C)</th>
                          <th>POWER</th>
                          <th>ENERGY</th>
                          <th>IN</th>
                          <th>OUT</th>
                          <th>AC1</th>
                          <th>AC2</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => (
                          <tr key={e.id} className="h-6 font-mono text-[8px]">
                            <td className="border border-black bg-zinc-50 font-bold">
                              {e.time}
                            </td>
                            <td className="border border-black">{e.pv.volt}</td>
                            <td className="border border-black">{e.pv.curr}</td>
                            <td className="border border-black">
                              {e.pv.power}
                            </td>
                            <td className="border border-black">
                              {e.pv.energy}
                            </td>
                            <td className="border border-black">
                              {e.battery.volt}
                            </td>
                            <td className="border border-black">
                              {e.battery.curr}
                            </td>
                            <td className="border border-black">
                              {e.battery.soc}
                            </td>
                            <td className="border border-black">
                              {e.battery.soh}
                            </td>
                            <td className="border border-black">
                              {e.load.l1_v}
                            </td>
                            <td className="border border-black">
                              {e.load.l1_a}
                            </td>
                            <td className="border border-black">
                              {e.load.l2_v}
                            </td>
                            <td className="border border-black">
                              {e.load.l2_c}
                            </td>
                            <td className="border border-black">
                              {e.load.l3_v}
                            </td>
                            <td className="border border-black">
                              {e.load.l3_c}
                            </td>
                            <td className="border border-black">
                              {e.load.power}
                            </td>
                            <td className="border border-black">
                              {e.load.energy}
                            </td>
                            <td className="border border-black">
                              {e.grid.l1_v}
                            </td>
                            <td className="border border-black">
                              {e.grid.l1_a}
                            </td>
                            <td className="border border-black">
                              {e.grid.l2_v}
                            </td>
                            <td className="border border-black">
                              {e.grid.l2_c}
                            </td>
                            <td className="border border-black">
                              {e.grid.l3_v}
                            </td>
                            <td className="border border-black">
                              {e.grid.l3_c}
                            </td>
                            <td className="border border-black">
                              {e.grid.power}
                            </td>
                            <td className="border border-black">
                              {e.grid.energy}
                            </td>
                            <td className="border border-black">{e.spd.in}</td>
                            <td className="border border-black">{e.spd.out}</td>
                            <td className="border border-black">
                              {e.cooling.ac1}
                            </td>
                            <td className="border border-black">
                              {e.cooling.ac2}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <AlertIcon className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Confirm Final Report Submission</span>
            </h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Are you sure you want to submit{" "}
              <strong className="text-foreground font-bold">
                "{title || `${siteName || "GVE Site"} Hourly Record — ${date}`}"
              </strong>
              ? Once submitted, it will be locked and sent to Site
              Administrators for review.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirmModal(false)}
                className="px-4 py-2 rounded text-xs text-muted-foreground hover:text-foreground font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  setShowSubmitConfirmModal(false)
                  handleSubmitFinal(e)
                }}
                className="px-4 py-2 rounded text-xs bg-primary hover:bg-primary-hover text-primary-foreground font-bold shadow cursor-pointer"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
