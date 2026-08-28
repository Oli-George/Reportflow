// ─── IndexedDB Offline Media & Reports Storage Engine ────────────────────────

import { Report } from "../AdminView"

const DB_NAME = "reportflow_offline_db"
const DB_VERSION = 1
const STORE_REPORTS = "offline_reports"
const STORE_ATTACHMENTS = "offline_attachments"

interface StoredOfflineReport {
  id: string
  report: Partial<Report>
  createdAt: string
  status: "pending_sync" | "syncing" | "failed"
  errorMessage?: string
}

interface StoredOfflineAttachment {
  id: string
  reportId: string
  dataUrl: string
  blob?: Blob
  name: string
  size: number
  type: string
  category?: string
  caption?: string
  uploadedAt: string
}

class OfflineStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        return reject(
          new Error("IndexedDB is not supported in this environment"),
        )
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (!db.objectStoreNames.contains(STORE_REPORTS)) {
          db.createObjectStore(STORE_REPORTS, { keyPath: "id" })
        }

        if (!db.objectStoreNames.contains(STORE_ATTACHMENTS)) {
          const attachStore = db.createObjectStore(STORE_ATTACHMENTS, {
            keyPath: "id",
          })
          attachStore.createIndex("reportId", "reportId", { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return this.dbPromise
  }

  // ─── Reports Operations ───────────────────────────────────────────────────

  async saveReport(item: StoredOfflineReport): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_REPORTS, "readwrite")
        const store = tx.objectStore(STORE_REPORTS)
        const req = store.put(item)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.warn("Falling back to localStorage for offline report:", e)
      // Fallback to localStorage
      try {
        const key = `reportflow_offline_report_${item.id}`
        localStorage.setItem(key, JSON.stringify(item))
      } catch (err) {
        console.error("LocalStorage save failed:", err)
      }
    }
  }

  async getAllReports(): Promise<StoredOfflineReport[]> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_REPORTS, "readonly")
        const store = tx.objectStore(STORE_REPORTS)
        const req = store.getAll()
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      // Fallback check localStorage
      const items: StoredOfflineReport[] = []
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("reportflow_offline_report_")) {
            const val = localStorage.getItem(key)
            if (val) items.push(JSON.parse(val))
          }
        }
      } catch (err) {
        console.error("LocalStorage read error:", err)
      }
      return items
    }
  }

  async removeReport(id: string): Promise<void> {
    try {
      const db = await this.getDB()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_REPORTS, "readwrite")
        const store = tx.objectStore(STORE_REPORTS)
        const req = store.delete(id)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      // Ignore
    }
    try {
      localStorage.removeItem(`reportflow_offline_report_${id}`)
    } catch (e) {
      // Ignore
    }
  }

  // ─── Media Attachment Operations ──────────────────────────────────────────

  async saveAttachment(attachment: StoredOfflineAttachment): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_ATTACHMENTS, "readwrite")
        const store = tx.objectStore(STORE_ATTACHMENTS)
        const req = store.put(attachment)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      console.warn("Could not store attachment in IndexedDB:", e)
    }
  }

  async getAttachmentsForReport(
    reportId: string,
  ): Promise<StoredOfflineAttachment[]> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_ATTACHMENTS, "readonly")
        const store = tx.objectStore(STORE_ATTACHMENTS)
        const index = store.index("reportId")
        const req = index.getAll(reportId)
        req.onsuccess = () => resolve(req.result || [])
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      return []
    }
  }

  async removeAttachment(id: string): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_ATTACHMENTS, "readwrite")
        const store = tx.objectStore(STORE_ATTACHMENTS)
        const req = store.delete(id)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      // Ignore
    }
  }
}

export const offlineStorage = new OfflineStorageEngine()
export type { StoredOfflineReport, StoredOfflineAttachment }
