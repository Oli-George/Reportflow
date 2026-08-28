import { supabase } from "./supabase"
import { Report } from "../AdminView"
import { ReportAttachment } from "../types/attachment"
import { offlineStorage } from "./offlineStorage"
import { uploadAttachmentFile } from "./storageProviders"

const QUEUE_STORAGE_KEY = "reportflow_offline_queue"

export interface OfflineReportQueueItem {
  id: string
  report: Partial<Report>
  createdAt: string
  status: "pending_sync" | "syncing" | "failed"
  errorMessage?: string
}

// ─── Queue Readers & Writers ──────────────────────────────────────────────────

export function getOfflineQueue(): OfflineReportQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error("Failed to read offline queue from localStorage", e)
    return []
  }
}

export function saveOfflineQueue(queue: OfflineReportQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch (e) {
    console.error("Failed to write offline queue to localStorage", e)
  }
}

// Add report to offline queue and IndexedDB
export async function queueOfflineReport(
  report: Partial<Report>,
): Promise<OfflineReportQueueItem> {
  const queue = getOfflineQueue()
  const tempId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const item: OfflineReportQueueItem = {
    id: tempId,
    report: {
      ...report,
      id: typeof report.id === "number" ? report.id : Date.now(),
    },
    createdAt: new Date().toISOString(),
    status: "pending_sync",
  }

  // Save to memory/localStorage queue
  queue.unshift(item)
  saveOfflineQueue(queue)

  // Also persist in robust IndexedDB store
  try {
    await offlineStorage.saveReport({
      id: tempId,
      report: item.report,
      createdAt: item.createdAt,
      status: item.status,
    })

    // If report has attachments, cache each attachment in IndexedDB
    if (item.report.attachments && item.report.attachments.length > 0) {
      for (const att of item.report.attachments) {
        if (att.dataUrl) {
          await offlineStorage.saveAttachment({
            id: att.id,
            reportId: tempId,
            dataUrl: att.dataUrl,
            name: att.name,
            size: att.size,
            type: att.type,
            category: att.category,
            caption: att.caption,
            uploadedAt: att.uploadedAt,
          })
        }
      }
    }
  } catch (idbErr) {
    console.warn(
      "Could not save to IndexedDB, fallback to localStorage used:",
      idbErr,
    )
  }

  return item
}

// Flush pending reports to Supabase when online
export async function flushOfflineQueue(
  onStatusChange?: (count: number) => void,
): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 }
  }

  const queue = getOfflineQueue()
  if (queue.length === 0) return { synced: 0, failed: 0 }

  let synced = 0
  let failed = 0
  const remainingQueue: OfflineReportQueueItem[] = []

  for (const item of queue) {
    try {
      // 1. Process and upload attachments if present
      let syncedAttachments: ReportAttachment[] = []
      if (item.report.attachments && item.report.attachments.length > 0) {
        syncedAttachments = await Promise.all(
          item.report.attachments.map(async (att) => {
            if (att.url && !att.isOfflineOnly) {
              return att
            }

            try {
              const uploadRes = await uploadAttachmentFile(
                att,
                item.report.author || "technician",
              )
              return {
                ...att,
                url: uploadRes.url,
                storagePath: uploadRes.storagePath,
                storageProvider: uploadRes.provider,
                isOfflineOnly: false,
              }
            } catch (upErr) {
              console.warn(
                "Failed to upload image to cloud storage, keeping inline fallback:",
                upErr,
              )
              return {
                ...att,
                url: att.dataUrl || "",
                storageProvider: "inline" as const,
                isOfflineOnly: false,
              }
            }
          }),
        )
      }

      // 2. Map report object to Supabase row columns
      const dbRow = {
        title: item.report.title,
        author: item.report.author,
        department: item.report.department,
        type: item.report.type,
        status: item.report.status || "Submitted",
        summary: item.report.summary,
        feedback: item.report.feedback || null,
        attachments: syncedAttachments.length > 0 ? syncedAttachments : null,
        gve_kuka_data: item.report.gveData || null,
        gve_weekly_data: item.report.gveWeeklyData || null,
        gve_quarterly_data: item.report.gveQuarterlyData || null,
        submitted_at: item.report.submitted
          ? new Date(item.report.submitted).toISOString()
          : new Date().toISOString(),
      }

      const { error } = await supabase.from("reports").insert(dbRow)

      if (error) {
        console.error("Supabase sync error for item", item.id, error)
        failed++
        remainingQueue.push({
          ...item,
          status: "failed",
          errorMessage: error.message,
        })
      } else {
        synced++
        // Remove from IndexedDB
        try {
          await offlineStorage.removeReport(item.id)
        } catch (e) {
          // ignore
        }
      }
    } catch (err: any) {
      console.error("Unexpected error during sync", err)
      failed++
      remainingQueue.push({
        ...item,
        status: "failed",
        errorMessage: err?.message || "Unknown error",
      })
    }
  }

  saveOfflineQueue(remainingQueue)
  if (onStatusChange) onStatusChange(remainingQueue.length)
  return { synced, failed }
}

// Auto sync listener setup
export function initOfflineSyncListener(
  onSyncComplete?: () => void,
): () => void {
  const handleOnline = async () => {
    console.log("Network reconnected. Attempting to sync offline queue...")
    const result = await flushOfflineQueue()
    if (result.synced > 0 && onSyncComplete) {
      onSyncComplete()
    }
  }

  window.addEventListener("online", handleOnline)
  return () => window.removeEventListener("online", handleOnline)
}
