import { describe, it, expect } from "vitest"
import { deduplicateReportsList } from "../App"
import type { Report } from "../types/report"

describe("Report Deduplication & Precedence Engine", () => {
  it("returns empty array when given empty list or invalid input", () => {
    // @ts-ignore
    expect(deduplicateReportsList(null)).toEqual([])
    // @ts-ignore
    expect(deduplicateReportsList(undefined)).toEqual([])
    expect(deduplicateReportsList([])).toEqual([])
  })

  it("deduplicates identical primary key IDs", () => {
    const list: Report[] = [
      {
        id: 101,
        title: "Kuka Daily Log",
        author: "Chinedu Okafor",
        department: "Operations",
        type: "Daily",
        submitted: new Date("2026-03-01T10:00:00Z"),
        status: "Submitted",
        summary: "Normal operation",
      },
      {
        id: 101, // Duplicate ID
        title: "Kuka Daily Log (Duplicate)",
        author: "Chinedu Okafor",
        department: "Operations",
        type: "Daily",
        submitted: new Date("2026-03-01T10:00:00Z"),
        status: "Submitted",
        summary: "Normal operation duplicate",
      },
    ]

    const result = deduplicateReportsList(list)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(101)
  })

  it("prioritizes advanced status when logical key matches (Approved > Submitted > Flagged > Draft)", () => {
    const list: Report[] = [
      {
        id: 201,
        title: "Ondo Mini-Grid Inspection",
        author: "Tunde Bakare",
        department: "Engineering",
        type: "Daily",
        submitted: new Date("2026-03-02T08:00:00Z"),
        status: "Draft",
        summary: "Draft notes",
      },
      {
        id: 202,
        title: "Ondo Mini-Grid Inspection",
        author: "Tunde Bakare",
        department: "Engineering",
        type: "Daily",
        submitted: new Date("2026-03-02T08:00:00Z"),
        status: "Approved", // Higher priority
        summary: "Approved final version",
      },
    ]

    const result = deduplicateReportsList(list)
    expect(result).toHaveLength(1)
    expect(result[0].status).toBe("Approved")
    expect(result[0].summary).toBe("Approved final version")
  })

  it("retains higher ID when status and logical key are identical", () => {
    const list: Report[] = [
      {
        id: 301,
        title: "Abuja Solar PV Weekly",
        author: "Amina Yusuf",
        department: "Solar PV",
        type: "Weekly",
        submitted: new Date("2026-03-03T12:00:00Z"),
        status: "Submitted",
        summary: "Initial submission",
        gveWeeklyData: {
          siteName: "Abuja Site",
        } as any,
      },
      {
        id: 302, // Higher database ID (newer)
        title: "Abuja Solar PV Weekly",
        author: "Amina Yusuf",
        department: "Solar PV",
        type: "Weekly",
        submitted: new Date("2026-03-03T12:00:00Z"),
        status: "Submitted",
        summary: "Updated submission",
        gveWeeklyData: {
          siteName: "Abuja Site",
        } as any,
      },
    ]

    const result = deduplicateReportsList(list)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(302)
    expect(result[0].summary).toBe("Updated submission")
  })

  it("sorts deduplicated reports in descending order of submitted timestamp", () => {
    const list: Report[] = [
      {
        id: 401,
        title: "Old Report",
        author: "Eng 1",
        department: "Engineering",
        type: "Daily",
        submitted: new Date("2026-01-10T10:00:00Z"),
        status: "Submitted",
        summary: "Old report summary",
      },
      {
        id: 402,
        title: "Newest Report",
        author: "Eng 2",
        department: "Engineering",
        type: "Daily",
        submitted: new Date("2026-03-15T10:00:00Z"),
        status: "Submitted",
        summary: "Newest report summary",
      },
      {
        id: 403,
        title: "Middle Report",
        author: "Eng 3",
        department: "Engineering",
        type: "Daily",
        submitted: new Date("2026-02-20T10:00:00Z"),
        status: "Submitted",
        summary: "Middle report summary",
      },
    ]

    const result = deduplicateReportsList(list)
    expect(result).toHaveLength(3)
    expect(result[0].id).toBe(402)
    expect(result[1].id).toBe(403)
    expect(result[2].id).toBe(401)
  })
})
