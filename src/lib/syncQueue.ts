import { supabase } from './supabase'
import { Report } from '../AdminView'

const QUEUE_STORAGE_KEY = 'reportflow_offline_queue'

export interface OfflineReportQueueItem {
  id: string // temporary or real ID
  report: Partial<Report>
  createdAt: string
  status: 'pending_sync' | 'syncing' | 'failed'
  errorMessage?: string
}

// Get current pending queue
export function getOfflineQueue(): OfflineReportQueueItem[] {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (e) {
    console.error('Failed to read offline queue', e)
    return []
  }
}

// Save queue to local storage
export function saveOfflineQueue(queue: OfflineReportQueueItem[]): void {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue))
  } catch (e) {
    console.error('Failed to write offline queue', e)
  }
}

// Add report to offline queue
export function queueOfflineReport(report: Partial<Report>): OfflineReportQueueItem {
  const queue = getOfflineQueue()
  const tempId = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const item: OfflineReportQueueItem = {
    id: tempId,
    report,
    createdAt: new Date().toISOString(),
    status: 'pending_sync'
  }
  queue.unshift(item)
  saveOfflineQueue(queue)
  return item
}

// Flush pending reports to Supabase when online
export async function flushOfflineQueue(onStatusChange?: (count: number) => void): Promise<{ synced: number; failed: number }> {
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
      // Map report object to DB row columns
      const dbRow = {
        title: item.report.title,
        author: item.report.author,
        department: item.report.department,
        type: item.report.type,
        status: item.report.status || 'Submitted',
        summary: item.report.summary,
        feedback: item.report.feedback || null,
        gve_kuka_data: item.report.gveKukaData || null,
        gve_weekly_data: item.report.gveWeeklyData || null,
        gve_quarterly_data: item.report.gveQuarterlyData || null,
        submitted_at: item.report.submitted ? new Date(item.report.submitted).toISOString() : new Date().toISOString()
      }

      const { error } = await supabase.from('reports').insert(dbRow)

      if (error) {
        console.error('Supabase sync error for item', item.id, error)
        failed++
        remainingQueue.push({ ...item, status: 'failed', errorMessage: error.message })
      } else {
        synced++
      }
    } catch (err: any) {
      console.error('Unexpected error during sync', err)
      failed++
      remainingQueue.push({ ...item, status: 'failed', errorMessage: err?.message || 'Unknown error' })
    }
  }

  saveOfflineQueue(remainingQueue)
  if (onStatusChange) onStatusChange(remainingQueue.length)
  return { synced, failed }
}

// Auto sync listener setup
export function initOfflineSyncListener(onSyncComplete?: () => void): () => void {
  const handleOnline = async () => {
    console.log('Network reconnected. Attempting to sync offline queue...')
    const result = await flushOfflineQueue()
    if (result.synced > 0 && onSyncComplete) {
      onSyncComplete()
    }
  }

  window.addEventListener('online', handleOnline)
  return () => window.removeEventListener('online', handleOnline)
}
