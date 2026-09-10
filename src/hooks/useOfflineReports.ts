import { useState, useEffect } from "react"
import localforage from "localforage"
import { Report, REPORTS } from "../AdminView"

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
        if (storedReports && Array.isArray(storedReports) && storedReports.length > 0) {
          setReports(storedReports)
        } else {
          // Fallback to localStorage or mock data for first-time migration
          const legacySaved = localStorage.getItem("reportflow_cached_reports")
          if (legacySaved) {
            const parsed = JSON.parse(legacySaved)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setReports(parsed)
              await localforage.setItem("reports", parsed)
            } else {
              setReports(REPORTS)
              await localforage.setItem("reports", REPORTS)
            }
          } else {
            setReports(REPORTS)
            await localforage.setItem("reports", REPORTS)
          }
        }
      } catch (err) {
        console.error("Failed to load reports from IndexedDB", err)
        setReports(REPORTS)
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
