// Helper for managing and remembering site names across all report forms
import { getStoredAppSettings } from "./settingsStorage"

const STORAGE_KEY_LAST_SITE = "reportflow_last_site_name"
const STORAGE_KEY_RECENT_SITES = "reportflow_recent_sites"

/**
 * Get the most recently used site name, or default fallback from Settings
 */
export function getLastSiteName(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LAST_SITE)
    if (saved && saved.trim()) {
      return saved.trim()
    }
  } catch (e) {
    console.warn("Failed to read last site name from localStorage", e)
  }
  return getStoredAppSettings().defaultSiteName || "GVE Kuka Mini-Grid"
}

/**
 * Save site name to localStorage and update recent site history
 */
export function saveLastSiteName(siteName: string): void {
  const trimmed = siteName.trim()
  if (!trimmed) return

  try {
    localStorage.setItem(STORAGE_KEY_LAST_SITE, trimmed)

    // Update recent sites list (keep up to 10 unique names)
    const recents = getRecentSiteNames()
    const updated = [
      trimmed,
      ...recents.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
    ].slice(0, 10)
    localStorage.setItem(STORAGE_KEY_RECENT_SITES, JSON.stringify(updated))
  } catch (e) {
    console.warn("Failed to save site name to localStorage", e)
  }
}

/**
 * Get list of recently used site names for autocomplete / suggestions
 */
export function getRecentSiteNames(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_RECENT_SITES)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (e) {
    console.warn("Failed to read recent sites from localStorage", e)
  }

  return ["GVE Mini-Grid"]
}
