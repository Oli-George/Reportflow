// ─── ReportFlow Settings & Mini-Grid Site Registry Storage Engine ─────────────
import { draftStorage } from "./draftStorage"
import { offlineStorage } from "./offlineStorage"
import { getOfflineQueue } from "./syncQueue"

export interface MiniGridSite {
  id: string
  name: string
  state: string
  pvCapacityKwp: number
  batteryCapacityKwh: number
  latitude: number
  longitude: number
  isDefault?: boolean
}

export interface AppSettings {
  defaultSiteName: string
  autoSaveIntervalSec: number // 5, 10, 30, 60
  themeMode: "dark" | "sunlight" | "system"
  watermarkEnabled: boolean
  watermarkIncludeGps: boolean
  watermarkIncludeTimestamp: boolean
  watermarkIncludeInspector: boolean
  watermarkStaffOpacity: number // 0.3 - 0.7 (default: 0.5)
  watermarkAdminOpacity: number // 0.7 - 1.0 (default: 0.9)
  organizationName: string
  controlRoomContact: string
}

export const PRESET_GVE_SITES: MiniGridSite[] = [
  {
    id: "gve-kuka",
    name: "GVE Kuka Mini-Grid",
    state: "Niger State",
    pvCapacityKwp: 100,
    batteryCapacityKwh: 384,
    latitude: 9.8732,
    longitude: 6.5412,
    isDefault: true,
  },
  {
    id: "gve-bisanti",
    name: "GVE Bisanti Solar Farm",
    state: "Niger State",
    pvCapacityKwp: 80,
    batteryCapacityKwh: 240,
    latitude: 9.1843,
    longitude: 5.9231,
  },
  {
    id: "gve-kolokalo",
    name: "GVE Kolokalo Hybrid Station",
    state: "Niger State",
    pvCapacityKwp: 60,
    batteryCapacityKwh: 192,
    latitude: 9.3421,
    longitude: 5.7654,
  },
  {
    id: "gve-shimankar",
    name: "GVE Shimankar Mini-Grid",
    state: "Plateau State",
    pvCapacityKwp: 120,
    batteryCapacityKwh: 420,
    latitude: 8.8419,
    longitude: 9.4238,
  },
  {
    id: "gve-abuja-hq",
    name: "GVE Abuja HQ Microgrid",
    state: "FCT Abuja",
    pvCapacityKwp: 30,
    batteryCapacityKwh: 96,
    latitude: 9.0765,
    longitude: 7.3986,
  },
  {
    id: "gve-onitsha",
    name: "GVE Onitsha Commercial Hub",
    state: "Anambra State",
    pvCapacityKwp: 150,
    batteryCapacityKwh: 500,
    latitude: 6.1518,
    longitude: 6.7865,
  },
]

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultSiteName: "GVE Kuka Mini-Grid",
  autoSaveIntervalSec: 10,
  themeMode: "dark",
  watermarkEnabled: true,
  watermarkIncludeGps: true,
  watermarkIncludeTimestamp: true,
  watermarkIncludeInspector: true,
  watermarkStaffOpacity: 0.5,
  watermarkAdminOpacity: 0.9,
  organizationName: "GVE Projects Ltd",
  controlRoomContact: "+234 800-GVE-HELP",
}

const SETTINGS_KEY = "reportflow_app_settings"
const SITES_KEY = "reportflow_minigrid_sites"

/**
 * Load settings from localStorage with safe fallback
 */
export function getStoredAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_APP_SETTINGS, ...parsed }
    }
  } catch (e) {
    console.warn("Failed to load app settings from localStorage:", e)
  }
  return DEFAULT_APP_SETTINGS
}

/**
 * Save settings to localStorage and dispatch update event
 */
export function saveStoredAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    window.dispatchEvent(
      new CustomEvent("reportflow_settings_changed", { detail: settings }),
    )
  } catch (e) {
    console.error("Failed to save app settings:", e)
  }
}

/**
 * Load mini-grid sites registry
 */
export function getStoredMiniGridSites(): MiniGridSite[] {
  if (typeof window === "undefined") return PRESET_GVE_SITES
  try {
    const raw = localStorage.getItem(SITES_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn("Failed to load mini-grid sites registry:", e)
  }
  return PRESET_GVE_SITES
}

/**
 * Save mini-grid sites registry
 */
export function saveStoredMiniGridSites(sites: MiniGridSite[]): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(SITES_KEY, JSON.stringify(sites))
    window.dispatchEvent(
      new CustomEvent("reportflow_sites_changed", { detail: sites }),
    )
  } catch (e) {
    console.error("Failed to save mini-grid sites:", e)
  }
}

export interface OfflineStorageStats {
  draftsCount: number
  pendingSyncCount: number
  offlineReportsCount: number
  estimatedStorageKb: number
  lastUpdated: string
}

/**
 * Inspect local storage, IndexedDB drafts, and sync queues
 */
export async function getOfflineStorageStats(
  author?: string,
): Promise<OfflineStorageStats> {
  let draftsCount = 0
  let pendingSyncCount = 0
  let offlineReportsCount = 0
  let estimatedStorageBytes = 0

  try {
    // 1. Check Drafts
    const drafts = await draftStorage.listDraftsForAuthor(author || "")
    draftsCount = drafts.length
    estimatedStorageBytes += JSON.stringify(drafts).length

    // 2. Check Sync Queue
    const queue = getOfflineQueue()
    pendingSyncCount = queue.length
    estimatedStorageBytes += JSON.stringify(queue).length

    // 3. Check Stored Offline Reports
    const offlineReports = await offlineStorage.getAllReports()
    offlineReportsCount = offlineReports.length
    estimatedStorageBytes += JSON.stringify(offlineReports).length

    // 4. Approximate LocalStorage Footprint
    if (typeof window !== "undefined" && window.localStorage) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith("reportflow_")) {
          const val = localStorage.getItem(key) || ""
          estimatedStorageBytes += key.length + val.length
        }
      }
    }
  } catch (err) {
    console.warn("Could not retrieve full storage stats:", err)
  }

  return {
    draftsCount,
    pendingSyncCount,
    offlineReportsCount,
    estimatedStorageKb: Math.round(estimatedStorageBytes / 1024),
    lastUpdated: new Date().toLocaleTimeString(),
  }
}

/**
 * Export all local drafts and queued reports as an offline backup JSON file
 */
export async function exportLocalBackupJson(author?: string): Promise<void> {
  const drafts = await draftStorage.listDraftsForAuthor(author || "")
  const queue = getOfflineQueue()
  const offlineReports = await offlineStorage.getAllReports()
  const settings = getStoredAppSettings()

  const backupData = {
    exportedAt: new Date().toISOString(),
    version: "1.0",
    author: author || "Field Technician",
    settings,
    drafts,
    queue,
    offlineReports,
  }

  const jsonStr = JSON.stringify(backupData, null, 2)
  const blob = new Blob([jsonStr], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const dateStr = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `reportflow_backup_${dateStr}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Purge synced drafts while preserving unsubmitted work
 */
export async function clearSyncedDrafts(author: string): Promise<number> {
  const drafts = await draftStorage.listDraftsForAuthor(author)
  let removedCount = 0
  for (const draft of drafts) {
    // If draft is linked to a submitted report ID
    if (draft.reportId && draft.reportId > 0) {
      await draftStorage.deleteDraft(
        draft.formType,
        draft.author,
        draft.reportId,
      )
      removedCount++
    }
  }
  return removedCount
}

/**
 * Reset local storage cache completely (Danger zone)
 */
export async function clearAllLocalDrafts(author?: string): Promise<void> {
  const drafts = await draftStorage.listDraftsForAuthor(author || "")
  for (const draft of drafts) {
    await draftStorage.deleteDraft(draft.formType, draft.author, draft.reportId)
  }
}
