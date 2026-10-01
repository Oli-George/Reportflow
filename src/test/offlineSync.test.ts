import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  queueOfflineReport,
  getOfflineQueue,
  flushOfflineQueue,
} from "../lib/syncQueue"
import { offlineStorage } from "../lib/offlineStorage"
import { supabase } from "../lib/supabase"
import type { Report } from "../types/report"

// Mock Supabase
vi.mock("../lib/supabase", () => {
  const insertMock = vi
    .fn()
    .mockResolvedValue({ data: { id: 999 }, error: null })
  const updateMock = vi
    .fn()
    .mockResolvedValue({ data: { id: 999 }, error: null })
  const fromMock = vi.fn().mockReturnValue({
    insert: insertMock,
    update: updateMock,
    upsert: insertMock,
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  })

  return {
    supabase: {
      from: fromMock,
    },
    isValidGveEmail: (email: string) =>
      email.trim().toLowerCase().endsWith("@gve-group.com"),
  }
})

// Mock uploadAttachmentFile to avoid external network calls during unit test
vi.mock("../lib/storageProviders", () => ({
  uploadAttachmentFile: vi.fn().mockResolvedValue({
    url: "https://mock-storage.gve-group.com/image.jpg",
    storagePath: "reports/image.jpg",
    provider: "supabase",
  }),
}))

describe("Offline Storage & Sync Queue", () => {
  beforeEach(async () => {
    localStorage.clear()
    vi.clearAllMocks()
    await offlineStorage.clearAll()
  })

  it("queues an offline report and sanitizes heavy base64 dataUrls in localStorage", async () => {
    const mockReport: Partial<Report> = {
      title: "Daily Inspection - Kuka",
      author: "technician@gve-group.com",
      department: "Engineering",
      type: "Daily",
      status: "Submitted",
      attachments: [
        {
          id: "att-1",
          name: "inverter_panel.jpg",
          dataUrl:
            "data:image/jpeg;base64,QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=",
          size: 1024,
          type: "image/jpeg",
          uploadedAt: new Date().toISOString(),
          isOfflineOnly: true,
        },
      ],
    }

    const queuedItem = await queueOfflineReport(mockReport, "create")

    expect(queuedItem).toBeDefined()
    expect(queuedItem.id).toMatch(/^offline_\d+_[a-z0-9]+$/)
    expect(queuedItem.status).toBe("pending_sync")

    // Verify localStorage queue has sanitized attachments (dataUrl undefined)
    const localQueue = getOfflineQueue()
    expect(localQueue).toHaveLength(1)
    expect(localQueue[0].report.attachments?.[0].dataUrl).toBeUndefined()

    // Verify IndexedDB preserves the full report
    const idbReport = await offlineStorage.getReport(queuedItem.id)
    expect(idbReport).toBeDefined()
    expect(idbReport?.id).toBe(queuedItem.id)
  })

  it("does not flush queue when network is offline", async () => {
    // Set navigator.onLine to false
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)

    await queueOfflineReport({
      title: "Offline Test",
      author: "tech@gve-group.com",
    })

    const result = await flushOfflineQueue()
    expect(result.synced).toBe(0)
    expect(result.failed).toBe(0)
    expect(getOfflineQueue()).toHaveLength(1)
  })

  it("successfully flushes pending reports to Supabase when network is online", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)

    await queueOfflineReport({
      title: "Online Sync Test",
      author: "tech@gve-group.com",
      status: "Submitted",
    })

    expect(getOfflineQueue()).toHaveLength(1)

    const result = await flushOfflineQueue()

    expect(result.synced).toBe(1)
    expect(result.failed).toBe(0)
    // Once synced, queue should be empty
    expect(getOfflineQueue()).toHaveLength(0)
  })

  it("preserves item in queue with status failed when Supabase returns an error", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true)

    // Make supabase.from().upsert() return an error
    const fromSpy = vi.mocked(supabase.from)
    const errorResult = {
      data: null,
      error: { message: "Row-level security policy violation" },
    }
    fromSpy.mockReturnValueOnce({
      insert: vi.fn().mockResolvedValue(errorResult),
      update: vi.fn().mockResolvedValue(errorResult),
      upsert: vi.fn().mockResolvedValue(errorResult),
      select: vi.fn(),
    } as any)

    await queueOfflineReport({
      title: "Error Test",
      author: "tech@gve-group.com",
    })

    const result = await flushOfflineQueue()

    expect(result.synced).toBe(0)
    expect(result.failed).toBe(1)

    const remaining = getOfflineQueue()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].status).toBe("failed")
    expect(remaining[0].errorMessage).toBe(
      "Row-level security policy violation",
    )
  })
})
