// ─── IndexedDB Local Form Draft Auto-Save Engine ──────────────────────────────
// Provides reliable continuous background auto-save for long physical forms
// to prevent data loss on mobile device battery drain or accidental refreshes.

export interface FormDraft<T = any> {
  id: string // Format: `${formType}_${author.toLowerCase().replace(/\s+/g, '_')}_${reportId ?? 'new'}`
  formType: "gveDaily" | "gveWeekly" | "gveQuarterly"
  author: string
  reportId?: number | null
  siteName?: string
  title?: string
  formData: T
  lastSavedAt: string // ISO string
}

const DRAFTS_DB_NAME = "reportflow_drafts_db"
const DRAFTS_DB_VERSION = 1
const STORE_DRAFTS = "form_drafts"

class DraftStorageEngine {
  private dbPromise: Promise<IDBDatabase> | null = null

  public generateDraftId(
    formType: string,
    author: string,
    reportId?: number | null,
  ): string {
    const cleanAuthor = (author || "anonymous").trim().toLowerCase().replace(/[^a-z0-9]/g, "_")
    const repId = reportId != null ? String(reportId) : "new"
    return `draft_${formType}_${cleanAuthor}_${repId}`
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !window.indexedDB) {
        return reject(new Error("IndexedDB not supported in this environment"))
      }

      const request = window.indexedDB.open(DRAFTS_DB_NAME, DRAFTS_DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_DRAFTS)) {
          const store = db.createObjectStore(STORE_DRAFTS, { keyPath: "id" })
          store.createIndex("author", "author", { unique: false })
          store.createIndex("formType", "formType", { unique: false })
          store.createIndex("lastSavedAt", "lastSavedAt", { unique: false })
        }
      }

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })

    return this.dbPromise
  }

  async saveDraft<T>(draft: FormDraft<T>): Promise<void> {
    try {
      const db = await this.getDB()
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_DRAFTS, "readwrite")
        const store = tx.objectStore(STORE_DRAFTS)
        const req = store.put(draft)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      // Fallback to localStorage
      try {
        localStorage.setItem(`rf_draft_${draft.id}`, JSON.stringify(draft))
      } catch (err) {
        console.warn("Failed to persist draft to localStorage fallback:", err)
      }
    }
  }

  async getDraft<T>(
    formType: string,
    author: string,
    reportId?: number | null,
  ): Promise<FormDraft<T> | null> {
    const draftId = this.generateDraftId(formType, author, reportId)

    try {
      const db = await this.getDB()
      return new Promise<FormDraft<T> | null>((resolve, reject) => {
        const tx = db.transaction(STORE_DRAFTS, "readonly")
        const store = tx.objectStore(STORE_DRAFTS)
        const req = store.get(draftId)
        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result as FormDraft<T>)
          } else {
            // Check fallback
            const fallback = localStorage.getItem(`rf_draft_${draftId}`)
            if (fallback) {
              try {
                resolve(JSON.parse(fallback) as FormDraft<T>)
                return
              } catch (err) {}
            }
            resolve(null)
          }
        }
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      // Check fallback
      const fallback = localStorage.getItem(`rf_draft_${draftId}`)
      if (fallback) {
        try {
          return JSON.parse(fallback) as FormDraft<T>
        } catch (err) {}
      }
      return null
    }
  }

  async deleteDraft(
    formType: string,
    author: string,
    reportId?: number | null,
  ): Promise<void> {
    const draftId = this.generateDraftId(formType, author, reportId)

    try {
      const db = await this.getDB()
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_DRAFTS, "readwrite")
        const store = tx.objectStore(STORE_DRAFTS)
        const req = store.delete(draftId)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      // Ignore
    }

    try {
      localStorage.removeItem(`rf_draft_${draftId}`)
    } catch (e) {
      // Ignore
    }
  }

  async listDraftsForAuthor(author: string): Promise<FormDraft[]> {
    const cleanAuthor = (author || "").trim().toLowerCase()
    try {
      const db = await this.getDB()
      return new Promise<FormDraft[]>((resolve, reject) => {
        const tx = db.transaction(STORE_DRAFTS, "readonly")
        const store = tx.objectStore(STORE_DRAFTS)
        const req = store.getAll()
        req.onsuccess = () => {
          const drafts = (req.result || []) as FormDraft[]
          resolve(
            drafts.filter(
              (d) =>
                !cleanAuthor ||
                d.author.trim().toLowerCase() === cleanAuthor,
            ),
          )
        }
        req.onerror = () => reject(req.error)
      })
    } catch (e) {
      const drafts: FormDraft[] = []
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith("rf_draft_")) {
            const val = localStorage.getItem(key)
            if (val) {
              const parsed = JSON.parse(val) as FormDraft
              if (
                !cleanAuthor ||
                parsed.author.trim().toLowerCase() === cleanAuthor
              ) {
                drafts.push(parsed)
              }
            }
          }
        }
      } catch (err) {}
      return drafts
    }
  }
}

export const draftStorage = new DraftStorageEngine()
