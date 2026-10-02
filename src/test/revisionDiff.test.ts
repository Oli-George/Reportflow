import { describe, it, expect } from "vitest"
import {
  computeReportDiffs,
  createRevisionSnapshot,
} from "../lib/diffCalculator"
import type { Report } from "../types/report"
import { createEmptyGveEntry, DEFAULT_12HR_TIMES } from "../types/gveDaily"

describe("Revision Diff Calculator", () => {
  it("detects summary text modifications", () => {
    const prev: Report = {
      id: 1,
      title: "Solar Mini-Grid Daily Report",
      author: "Chinedu Okafor",
      department: "Field Operations",
      type: "Daily",
      submitted: new Date("2026-03-01T10:00:00Z"),
      status: "Flagged",
      summary: "Inverter 2 showing high temp warning. Checked coolant.",
    }

    const curr: Report = {
      ...prev,
      summary:
        "Inverter 2 high temp resolved. Replaced thermal paste and airflow filter.",
    }

    const diffs = computeReportDiffs(prev, curr)
    const summaryDiff = diffs.find((d) => d.field === "Executive Summary")

    expect(summaryDiff).toBeDefined()
    expect(summaryDiff?.category).toBe("summary")
    expect(summaryDiff?.previousValue).toContain("high temp warning")
    expect(summaryDiff?.newValue).toContain("high temp resolved")
  })

  it("detects attachment additions and removals", () => {
    const prev: Report = {
      id: 2,
      title: "Quarterly Audit",
      author: "Amina Yusuf",
      department: "Technical Services",
      type: "Quarterly",
      submitted: new Date("2026-03-01T10:00:00Z"),
      status: "Flagged",
      summary: "Audit completed",
      attachments: [
        {
          id: "att-1",
          name: "inverter1.jpg",
          size: 1024,
          type: "image/jpeg",
          url: "https://r2.gve.com/inverter1.jpg",
          uploadedAt: "2026-03-01T10:00:00Z",
        },
      ],
    }

    const curr: Report = {
      ...prev,
      attachments: [
        ...prev.attachments!,
        {
          id: "att-2",
          name: "inverter2_fixed.jpg",
          size: 2048,
          type: "image/jpeg",
          url: "https://r2.gve.com/inverter2_fixed.jpg",
          uploadedAt: "2026-03-01T14:00:00Z",
        },
      ],
    }

    const diffs = computeReportDiffs(prev, curr)
    const photoDiff = diffs.find((d) => d.field === "Attached Evidence Photos")

    expect(photoDiff).toBeDefined()
    expect(photoDiff?.category).toBe("attachment")
    expect(photoDiff?.previousValue).toBe("1 photo")
    expect(photoDiff?.newValue).toBe("2 photos")
  })

  it("detects hourly telemetry modifications", () => {
    const prevEntries = DEFAULT_12HR_TIMES.map((t, idx) =>
      createEmptyGveEntry(t, idx),
    )
    const entry10AmPrev = prevEntries.find((e) => e.time === "10:00 AM")!
    entry10AmPrev.pv.power = "45"

    const nextEntries = DEFAULT_12HR_TIMES.map((t, idx) =>
      createEmptyGveEntry(t, idx),
    )
    const entry10AmNext = nextEntries.find((e) => e.time === "10:00 AM")!
    entry10AmNext.pv.power = "52"

    const prev: Report = {
      id: 3,
      title: "Kuka Grid Telemetry",
      author: "Chinedu Okafor",
      department: "Field Operations",
      type: "Daily",
      submitted: new Date("2026-03-01T10:00:00Z"),
      status: "Flagged",
      summary: "Normal operation",
      gveData: {
        siteName: "Kuka Grid",
        title: "Daily Log",
        date: "2026-03-01",
        day: "Monday",
        year: "2026",
        entries: prevEntries,
      },
    }

    const curr: Report = {
      ...prev,
      gveData: {
        ...prev.gveData!,
        entries: nextEntries,
      },
    }

    const diffs = computeReportDiffs(prev, curr)
    const telemetryDiff = diffs.find((d) => d.field.includes("10:00 AM"))

    expect(telemetryDiff).toBeDefined()
    expect(telemetryDiff?.category).toBe("telemetry")
    expect(telemetryDiff?.previousValue).toBe("45 kW")
    expect(telemetryDiff?.newValue).toBe("52 kW")
  })

  it("creates an immutable ReportRevision snapshot with reviewer feedback", () => {
    const prev: Report = {
      id: 4,
      title: "Battery Maintenance Log",
      author: "Tunde Bakare",
      department: "Maintenance",
      type: "Daily",
      submitted: new Date("2026-03-01T10:00:00Z"),
      status: "Flagged",
      summary: "Battery pack 3 under review",
      feedback:
        "Please verify voltage reading at 14:00 and provide clear photo of terminal 2.",
      version: 1,
    }

    const curr: Report = {
      ...prev,
      summary: "Battery pack 3 verified, voltage re-calibrated to 48.2V.",
    }

    const revision = createRevisionSnapshot(
      prev,
      curr,
      "Please verify voltage reading at 14:00 and provide clear photo of terminal 2.",
    )

    expect(revision.version).toBe(1)
    expect(revision.feedback).toBe(
      "Please verify voltage reading at 14:00 and provide clear photo of terminal 2.",
    )
    expect(revision.diffs.length).toBeGreaterThan(0)
    expect(revision.snapshot.summary).toBe("Battery pack 3 under review")
  })
})
