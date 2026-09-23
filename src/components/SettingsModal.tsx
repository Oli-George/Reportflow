import React, { useState, useEffect } from "react"
import {
  OfflineStorageStats,
  getOfflineStorageStats,
  exportLocalBackupJson,
  clearSyncedDrafts,
  clearAllLocalDrafts,
} from "../lib/settingsStorage"
import { useAppSettings } from "../hooks/useAppSettings"
import {
  SettingsIcon,
  ShieldCheckIcon,
  DatabaseIcon,
  HardDriveIcon,
  DownloadCloudIcon,
  MapPinIcon,
  SlidersIcon,
  SunIcon,
  ContrastIcon,
  CheckIcon,
  TrashIcon,
  AlertIcon,
  RefreshIcon,
} from "./Icons"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  role: "admin" | "staff"
  userName?: string
  userDepartment?: string
  sunlightMode?: boolean
  onToggleSunlightMode?: () => void
}

type TabType = "general" | "watermark" | "storage" | "registry" | "about"

export default function SettingsModal({
  isOpen,
  onClose,
  role,
  userName = "User",
  userDepartment = "Operations",
  sunlightMode = false,
  onToggleSunlightMode,
}: SettingsModalProps) {
  const {
    settings,
    updateSettings,
    sites,
    addSite,
    deleteSite,
    resetSettings,
  } = useAppSettings()

  const [activeTab, setActiveTab] = useState<TabType>("general")
  const [stats, setStats] = useState<OfflineStorageStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [saveToast, setSaveToast] = useState<string | null>(null)

  // New site form state (for Admin registry)
  const [showAddSite, setShowAddSite] = useState(false)
  const [newSiteName, setNewSiteName] = useState("")
  const [newSiteState, setNewSiteState] = useState("")
  const [newSiteKwp, setNewSiteKwp] = useState("")
  const [newSiteKwh, setNewSiteKwh] = useState("")
  const [newSiteLat, setNewSiteLat] = useState("")
  const [newSiteLon, setNewSiteLon] = useState("")

  // Reset confirmation
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)

  // Refresh storage statistics
  const loadStats = async () => {
    setIsLoadingStats(true)
    try {
      const data = await getOfflineStorageStats(userName)
      setStats(data)
    } catch (e) {
      console.warn(e)
    } finally {
      setIsLoadingStats(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadStats()
    }
  }, [isOpen, userName])

  useEffect(() => {
    if (
      role === "staff" &&
      (activeTab === "registry" || activeTab === "about")
    ) {
      setActiveTab("general")
    }
  }, [role, activeTab])

  const showNotification = (msg: string) => {
    setSaveToast(msg)
    setTimeout(() => setSaveToast(null), 2500)
  }

  if (!isOpen) return null

  const handleExportBackup = async () => {
    try {
      await exportLocalBackupJson(userName)
      showNotification("Local backup exported successfully")
    } catch (e) {
      alert("Failed to export backup")
    }
  }

  const handleCleanSynced = async () => {
    try {
      const count = await clearSyncedDrafts(userName)
      await loadStats()
      showNotification(`Cleaned ${count} synced draft(s)`)
    } catch (e) {
      alert("Failed to clean drafts")
    }
  }

  const handleClearAllStorage = async () => {
    try {
      await clearAllLocalDrafts(userName)
      await loadStats()
      setConfirmResetOpen(false)
      showNotification("All local form drafts have been cleared")
    } catch (e) {
      alert("Failed to clear drafts")
    }
  }

  const handleCreateSite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSiteName.trim()) return

    addSite({
      name: newSiteName.trim(),
      state: newSiteState.trim(),
      pvCapacityKwp: parseFloat(newSiteKwp) || 50,
      batteryCapacityKwh: parseFloat(newSiteKwh) || 150,
      latitude: parseFloat(newSiteLat) || 9.0,
      longitude: parseFloat(newSiteLon) || 7.0,
    })

    setNewSiteName("")
    setShowAddSite(false)
    showNotification("Mini-Grid Site added to registry")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--card)",
          borderColor: "var(--border)",
          color: "var(--foreground)",
        }}
      >
        {/* Toast alert */}
        {saveToast && (
          <div className="absolute top-3 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-mono shadow-lg animate-in slide-in-from-top-2">
            <CheckIcon size={14} />
            <span>{saveToast}</span>
          </div>
        )}

        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b shrink-0"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-primary/15 text-primary border border-primary/30">
              <SettingsIcon size={20} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-display font-bold tracking-tight text-foreground truncate flex items-center gap-2">
                ReportFlow Settings
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground uppercase">
                  {role === "admin" ? "Admin Control" : "Field Station"}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {userName} • {userDepartment}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Close Settings (ESC)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className="flex items-center gap-1 px-4 py-2 border-b overflow-x-auto shrink-0 bg-secondary/40"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === "general"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <SlidersIcon size={14} />
            <span>General & Field</span>
          </button>

          <button
            onClick={() => setActiveTab("watermark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === "watermark"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <ShieldCheckIcon size={14} />
            <span>Forensic Watermarking</span>
          </button>

          <button
            onClick={() => setActiveTab("storage")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
              activeTab === "storage"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <HardDriveIcon size={14} />
            <span>Offline Storage & Drafts</span>
            {stats && stats.draftsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {stats.draftsCount}
              </span>
            )}
          </button>

          {role === "admin" && (
            <button
              onClick={() => setActiveTab("registry")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === "registry"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <MapPinIcon size={14} />
              <span>Mini-Grid Registry</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-primary/20 text-primary border border-primary/30">
                {sites.length}
              </span>
            </button>
          )}

          {role === "admin" && (
            <button
              onClick={() => setActiveTab("about")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 cursor-pointer ${
                activeTab === "about"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <DatabaseIcon size={14} />
              <span>System Info</span>
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: General & Field Defaults */}
          {activeTab === "general" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Field Defaults & Form Automation
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure default values to minimize repetitive typing during
                  daily field operations.
                </p>
              </div>

              {/* Default Site */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                <label className="text-xs font-mono font-medium text-foreground block">
                  DEFAULT ASSIGNED MINI-GRID SITE
                </label>
                <p className="text-xs text-muted-foreground">
                  New Daily, Weekly, and Quarterly reports will automatically
                  default to this site name.
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={settings.defaultSiteName}
                    onChange={(e) =>
                      updateSettings({ defaultSiteName: e.target.value })
                    }
                    placeholder="Type default mini-grid site name (e.g. GVE Kuka Mini-Grid)..."
                    className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Auto-Save Interval */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                <label className="text-xs font-mono font-medium text-foreground block">
                  CONTINUOUS FORM AUTO-SAVE INTERVAL
                </label>
                <p className="text-xs text-muted-foreground">
                  How frequently long audit forms automatically save local
                  drafts to IndexedDB.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[5, 10, 30, 60].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        updateSettings({ autoSaveIntervalSec: sec })
                        showNotification(`Auto-save interval: ${sec} seconds`)
                      }}
                      className={`px-3 py-2 rounded-md text-xs font-mono border transition-all cursor-pointer ${
                        settings.autoSaveIntervalSec === sec
                          ? "bg-primary border-primary text-primary-foreground font-semibold shadow-xs"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Every {sec}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme Selection */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                <label className="text-xs font-mono font-medium text-foreground block">
                  ENVIRONMENT DISPLAY MODE
                </label>
                <p className="text-xs text-muted-foreground">
                  Switch between Dark Command Center and High-Contrast Mode for
                  direct sunlight readability.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (sunlightMode && onToggleSunlightMode) {
                        onToggleSunlightMode()
                      }
                      updateSettings({ themeMode: "dark" })
                      showNotification("Dark Command Center Mode active")
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      !sunlightMode
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="p-2 rounded-md bg-secondary text-primary">
                      <ContrastIcon size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        Dark Command Center
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        #005030 forest-green dark palette
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!sunlightMode && onToggleSunlightMode) {
                        onToggleSunlightMode()
                      }
                      updateSettings({ themeMode: "sunlight" })
                      showNotification("High-Contrast Sunlight Mode active")
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      sunlightMode
                        ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <div className="p-2 rounded-md bg-secondary text-amber-400">
                      <SunIcon size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">
                        Outdoor Sunlight Mode
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Maximum mobile contrast in harsh glare
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Photo Integrity & Watermark */}
          {activeTab === "watermark" && (
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">
                  Tamper-Proof Forensic Photo Watermarking
                </h3>
                <p className="text-xs text-muted-foreground">
                  Photos uploaded from the field are rendered onto an HTML5
                  canvas with a burned forensic audit bar to prevent photo reuse
                  or armchair reporting.
                </p>
              </div>

              {/* Master Watermark Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheckIcon size={16} className="text-primary" />
                    Automated Forensic Watermarking
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Burn site, timestamp, and technician metadata permanently
                    into image pixels
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.watermarkEnabled}
                    onChange={(e) => {
                      updateSettings({ watermarkEnabled: e.target.checked })
                      showNotification(
                        e.target.checked
                          ? "Forensic watermarking ENABLED"
                          : "Forensic watermarking DISABLED",
                      )
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary border border-border"></div>
                </label>
              </div>

              {/* Metadata Options */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                <label className="text-xs font-mono font-medium text-foreground block">
                  METADATA FIELDS TO BURN INTO AUDIT BAR
                </label>
                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.watermarkIncludeTimestamp}
                      onChange={(e) =>
                        updateSettings({
                          watermarkIncludeTimestamp: e.target.checked,
                        })
                      }
                      className="rounded border-border text-primary focus:ring-0"
                    />
                    <span>
                      West Africa Time (WAT) Stamp (e.g. 17-Sep-2026 10:24 AM
                      WAT)
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.watermarkIncludeInspector}
                      onChange={(e) =>
                        updateSettings({
                          watermarkIncludeInspector: e.target.checked,
                        })
                      }
                      className="rounded border-border text-primary focus:ring-0"
                    />
                    <span>
                      Inspector Name / Tech ID (e.g. TECH:{" "}
                      {userName.toUpperCase()})
                    </span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.watermarkIncludeGps}
                      onChange={(e) =>
                        updateSettings({
                          watermarkIncludeGps: e.target.checked,
                        })
                      }
                      className="rounded border-border text-primary focus:ring-0"
                    />
                    <span>
                      GPS Coordinates (Latitude & Longitude if location granted)
                    </span>
                  </label>
                </div>
              </div>

              {/* Watermark Live Sample Preview */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-medium text-foreground block">
                    FORENSIC WATERMARK PREVIEW
                  </label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {role === "admin"
                      ? "Admin Enhanced View (90% opacity)"
                      : "Staff View (55% subtle opacity)"}
                  </span>
                </div>

                {/* Simulated photo with watermark */}
                <div className="relative h-44 rounded-lg overflow-hidden border border-border bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 flex flex-col justify-end">
                  {/* Mock solar panel equipment background */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-25">
                    <span className="text-4xl font-mono text-primary font-bold">
                      [PV ARRAY & INVERTER EVIDENCE PHOTO]
                    </span>
                  </div>

                  {/* Watermark Banner */}
                  <div
                    className="relative px-3 py-2 border-t font-mono"
                    style={{
                      backgroundColor: `rgba(8, 15, 11, ${
                        role === "admin"
                          ? settings.watermarkAdminOpacity
                          : settings.watermarkStaffOpacity
                      })`,
                      borderColor: "rgba(0, 117, 74, 0.8)",
                    }}
                  >
                    <p className="text-[11px] font-bold text-white tracking-wide">
                      [SITE: {settings.defaultSiteName.toUpperCase()}] &nbsp;
                      [TECH: {userName.toUpperCase()}]
                    </p>
                    <p className="text-[10px] text-lime-400">
                      [TIME: 17-Sep-2026 10:24 AM WAT] &nbsp; [GPS: 9.87320°N,
                      6.54120°E]
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground italic pt-1">
                  Note: On Staff View, watermarks render with subtle ~50%
                  opacity so equipment dials remain unobscured. On Admin View,
                  photos render with high-contrast forensic clarity for audits.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: Storage & Offline Drafts */}
          {activeTab === "storage" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Offline Drafts & IndexedDB Cache
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Inspect and manage local reports stored on this device.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadStats}
                  disabled={isLoadingStats}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono border border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <RefreshIcon
                    size={12}
                    className={isLoadingStats ? "animate-spin" : ""}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">
                    Stored Drafts
                  </p>
                  <p className="text-xl font-display font-bold text-primary mt-1">
                    {stats?.draftsCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Auto-saved forms
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">
                    Sync Queue
                  </p>
                  <p className="text-xl font-display font-bold text-blue-400 mt-1">
                    {stats?.pendingSyncCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Awaiting uplink
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">
                    Offline Reports
                  </p>
                  <p className="text-xl font-display font-bold text-purple-400 mt-1">
                    {stats?.offlineReportsCount ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Cached for offline
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <p className="text-[10px] font-mono uppercase text-muted-foreground">
                    Cache Size
                  </p>
                  <p className="text-xl font-display font-bold text-amber-400 mt-1">
                    {stats?.estimatedStorageKb ?? 0} KB
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Local footprint
                  </p>
                </div>
              </div>

              {/* Backup & Purge Actions */}
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                <p className="text-xs font-mono font-medium text-foreground">
                  BACKUP & STORAGE MAINTENANCE
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition-all shadow-xs cursor-pointer"
                  >
                    <DownloadCloudIcon size={14} />
                    <span>Export Offline Backup (JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCleanSynced}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-border bg-card hover:bg-secondary text-foreground text-xs font-medium transition-all cursor-pointer"
                  >
                    <CheckIcon size={14} />
                    <span>Clean Synced Drafts</span>
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Exporting creates a JSON archive of all local drafts on your
                  device. Cleaning synced drafts safely removes submitted
                  reports while preserving unsubmitted work.
                </p>
              </div>

              {/* Danger Zone */}
              <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <AlertIcon size={16} />
                  <span>DANGER ZONE</span>
                </div>
                <p className="text-xs text-rose-300/80">
                  Purge all local drafts from IndexedDB. Use only if instructed
                  by the IT administrator or if resolving local data conflicts.
                </p>

                {confirmResetOpen ? (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleClearAllStorage}
                      className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Confirm: Delete All Local Drafts
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmResetOpen(false)}
                      className="px-3 py-1.5 rounded border border-border text-muted-foreground text-xs hover:text-foreground cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetOpen(true)}
                    className="px-3 py-1.5 rounded border border-rose-800 text-rose-400 hover:bg-rose-900/30 text-xs font-mono transition-colors cursor-pointer"
                  >
                    Clear All Local Form Drafts...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Mini-Grid Registry (Admin Only) */}
          {activeTab === "registry" && role === "admin" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Mini-Grid Site Registry & Asset Registry
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Manage operational sites, installed solar PV capacity (kWp),
                    battery bank capacity (kWh), and reference GPS coordinates.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddSite(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-medium transition-all shadow-xs cursor-pointer"
                >
                  <MapPinIcon size={14} />
                  <span>Add Mini-Grid Site</span>
                </button>
              </div>

              {/* Add Site Modal Form */}
              {showAddSite && (
                <form
                  onSubmit={handleCreateSite}
                  className="p-4 rounded-lg border border-primary/40 bg-secondary/80 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <p className="text-xs font-semibold text-foreground">
                      Register New Mini-Grid Infrastructure
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAddSite(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-mono text-muted-foreground">
                        Site Name
                      </label>
                      <input
                        type="text"
                        value={newSiteName}
                        onChange={(e) => setNewSiteName(e.target.value)}
                        placeholder="e.g. GVE Dukke Solar Farm"
                        required
                        className="w-full mt-1 bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-muted-foreground">
                        State / Region
                      </label>
                      <input
                        type="text"
                        value={newSiteState}
                        onChange={(e) => setNewSiteState(e.target.value)}
                        placeholder="e.g. Niger State"
                        required
                        className="w-full mt-1 bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-muted-foreground">
                        Solar PV Capacity (kWp)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newSiteKwp}
                        onChange={(e) => setNewSiteKwp(e.target.value)}
                        placeholder="100"
                        className="w-full mt-1 bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-muted-foreground">
                        Battery Capacity (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={newSiteKwh}
                        onChange={(e) => setNewSiteKwh(e.target.value)}
                        placeholder="384"
                        className="w-full mt-1 bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-muted-foreground">
                        Reference Latitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={newSiteLat}
                        onChange={(e) => setNewSiteLat(e.target.value)}
                        placeholder="9.8732"
                        className="w-full mt-1 bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-muted-foreground">
                        Reference Longitude
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={newSiteLon}
                        onChange={(e) => setNewSiteLon(e.target.value)}
                        placeholder="6.5412"
                        className="w-full mt-1 bg-card border border-border rounded px-2.5 py-1.5 text-xs text-foreground"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-white text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      Save Site to Registry
                    </button>
                  </div>
                </form>
              )}

              {/* Sites Table */}
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 font-mono text-[11px] text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-2 px-3">Site Name</th>
                      <th className="py-2 px-3">State</th>
                      <th className="py-2 px-3">PV Capacity</th>
                      <th className="py-2 px-3">Battery Bank</th>
                      <th className="py-2 px-3">Coordinates</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sites.map((s) => (
                      <tr key={s.id} className="hover:bg-secondary/30">
                        <td className="py-2.5 px-3 font-medium text-foreground">
                          {s.name}
                          {s.name === settings.defaultSiteName && (
                            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] bg-primary/20 text-primary border border-primary/30">
                              Default
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          {s.state}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-primary font-medium">
                          {s.pvCapacityKwp} kWp
                        </td>
                        <td className="py-2.5 px-3 font-mono text-blue-400">
                          {s.batteryCapacityKwh} kWh
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground text-[11px]">
                          {s.latitude.toFixed(4)}°, {s.longitude.toFixed(4)}°
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {sites.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                deleteSite(s.id)
                                showNotification(`Removed ${s.name}`)
                              }}
                              className="text-muted-foreground hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Delete site"
                            >
                              <TrashIcon size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: System Info (Admin Only) */}
          {role === "admin" && activeTab === "about" && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold">
                    RF
                  </div>
                  <div>
                    <h3 className="text-sm font-display font-bold text-foreground">
                      ReportFlow Command Center
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Version 1.2.0 • GVE Projects Ltd Mini-Grid Edition
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
                  <div>
                    <span className="text-muted-foreground">
                      PWA & Offline Mode:
                    </span>{" "}
                    <span className="font-mono text-emerald-400">
                      Active (ServiceWorker v2)
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Storage Engine:
                    </span>{" "}
                    <span className="font-mono text-foreground">
                      IndexedDB v1 + LocalForage
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Regulatory Target:
                    </span>{" "}
                    <span className="font-mono text-foreground">
                      NERC & REA / NEP Mini-Grid
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Emergency Support:
                    </span>{" "}
                    <span className="font-mono text-primary">
                      {settings.controlRoomContact}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t bg-secondary/30 shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          <button
            type="button"
            onClick={resetSettings}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Reset Settings to Factory Defaults
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-xs font-mono font-semibold transition-all shadow-md cursor-pointer active:translate-y-px"
          >
            Save & Close Settings
          </button>
        </div>
      </div>
    </div>
  )
}
