import { useState, useEffect } from "react"
import localforage from "localforage"
import { Report } from "../types/report"
import { REPORTS } from "../constants/defaults"

// Configure localforage to use IndexedDB
localforage.config({
  name: "ReportFlow",
  storeName: "reports_store", // Should be alphanumeric, with underscores.
  description: "Offline storage for ReportFlow reports",
})

export function useOfflineReports() {
  const [reports, setReports] = useState<Report[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load initial reports from IndexedDB
  useEffect(() => {
    async function loadReports() {
      try {
        const storedReports = await localforage.getItem<Report[]>("reports")
        if (
          storedReports &&
          Array.isArray(storedReports) &&
          storedReports.length > 0
        ) {
          // Clean any legacy mock reports that were mistakenly saved with "Draft" status
          const sanitized = storedReports.map((r) =>
            r.status && r.status.toLowerCase().trim() === "draft"
              ? { ...r, status: "Submitted" as const }
              : r,
          )
          setReports(sanitized)
          await localforage.setItem("reports", sanitized)
        } else {
          // In development with explicit mock flag, seed demo data; otherwise start with clean empty list
          const isDevMockAllowed =
            import.meta.env.DEV &&
            import.meta.env.VITE_ENABLE_MOCK_DATA === "true"

          if (isDevMockAllowed) {
            setReports(REPORTS)
            await localforage.setItem("reports", REPORTS)
          } else {
            setReports([])
            await localforage.setItem("reports", [])
          }
        }
      } catch (err) {
        console.error("Failed to load reports from IndexedDB", err)
        const isDevMockAllowed =
          import.meta.env.DEV &&
          import.meta.env.VITE_ENABLE_MOCK_DATA === "true"
        setReports(isDevMockAllowed ? REPORTS : [])
      } finally {
        setIsLoaded(true)
      }
    }
    loadReports()
  }, [])

  // Sync reports to IndexedDB whenever they change (only if they are loaded to avoid overwriting with initial empty array)
  useEffect(() => {
    if (isLoaded) {
      localforage.setItem("reports", reports).catch((err) => {
        console.error("Failed to save reports to IndexedDB", err)
      })
    }
  }, [reports, isLoaded])

  return { reports, setReports, isLoaded }
}
