import { Report, FieldDiff, ReportRevision } from "../types/report"

/**
 * Computes deep field-level differences between an original flagged report and its revised resubmission.
 */
export function computeReportDiffs(
  original: Report,
  updated: Report,
): FieldDiff[] {
  const diffs: FieldDiff[] = []

  // 1. Executive Summary diff
  const origSummary = (original.summary || "").trim()
  const newSummary = (updated.summary || "").trim()
  if (origSummary !== newSummary) {
    diffs.push({
      field: "Executive Summary",
      previousValue: origSummary || "(empty)",
      newValue: newSummary || "(empty)",
      category: "summary",
    })
  }

  // 2. Attachments count diff
  const origAttCount = original.attachments?.length || 0
  const newAttCount = updated.attachments?.length || 0
  if (origAttCount !== newAttCount) {
    diffs.push({
      field: "Attached Evidence Photos",
      previousValue: `${origAttCount} photo${origAttCount === 1 ? "" : "s"}`,
      newValue: `${newAttCount} photo${newAttCount === 1 ? "" : "s"}`,
      category: "attachment",
    })
  }

  // 3. Daily Hourly Telemetry Diffs (GVE Hourly Form)
  if (original.gveData && updated.gveData) {
    const origEntries = original.gveData.entries || []
    const newEntries = updated.gveData.entries || []

    newEntries.forEach((newEntry) => {
      const origEntry = origEntries.find((e) => e.time === newEntry.time)
      if (!origEntry) return

      const timeLabel = newEntry.time

      // PV Power
      if (origEntry.pv?.power !== newEntry.pv?.power) {
        diffs.push({
          field: `${timeLabel} · Solar PV Power`,
          previousValue: origEntry.pv?.power ? `${origEntry.pv.power} kW` : "—",
          newValue: newEntry.pv?.power ? `${newEntry.pv.power} kW` : "—",
          category: "telemetry",
        })
      }

      // Battery Voltage
      if (origEntry.battery?.volt !== newEntry.battery?.volt) {
        diffs.push({
          field: `${timeLabel} · Battery Bank Voltage`,
          previousValue: origEntry.battery?.volt ? `${origEntry.battery.volt} V` : "—",
          newValue: newEntry.battery?.volt ? `${newEntry.battery.volt} V` : "—",
          category: "telemetry",
        })
      }

      // Battery SoC
      if (origEntry.battery?.soc !== newEntry.battery?.soc) {
        diffs.push({
          field: `${timeLabel} · Battery State of Charge (SoC)`,
          previousValue: origEntry.battery?.soc ? `${origEntry.battery.soc}%` : "—",
          newValue: newEntry.battery?.soc ? `${newEntry.battery.soc}%` : "—",
          category: "telemetry",
        })
      }

      // Site Load Power
      if (origEntry.load?.power !== newEntry.load?.power) {
        diffs.push({
          field: `${timeLabel} · Site AC Load Power`,
          previousValue: origEntry.load?.power ? `${origEntry.load.power} kW` : "—",
          newValue: newEntry.load?.power ? `${newEntry.load.power} kW` : "—",
          category: "telemetry",
        })
      }

      // Grid / Gen Power
      if (origEntry.grid?.power !== newEntry.grid?.power) {
        diffs.push({
          field: `${timeLabel} · Diesel Genset / Grid Power`,
          previousValue: origEntry.grid?.power ? `${origEntry.grid.power} kW` : "—",
          newValue: newEntry.grid?.power ? `${newEntry.grid.power} kW` : "—",
          category: "telemetry",
        })
      }
    })
  }

  // 4. Weekly Record Diffs
  if (original.gveWeeklyData && updated.gveWeeklyData) {
    const origW = original.gveWeeklyData
    const newW = updated.gveWeeklyData

    const fieldsToCheck: Array<{ key: keyof typeof origW; label: string }> = [
      { key: "remarkInverters", label: "Inverter Maintenance Remark" },
      { key: "remarkBess", label: "BESS Battery Storage Remark" },
      { key: "remarkDieselGenerator", label: "Diesel Generator Status" },
      { key: "maintenanceCarriedOut", label: "Maintenance Carried Out" },
      { key: "anyOtherComment", label: "Weekly Operational Notes" },
    ]

    fieldsToCheck.forEach(({ key, label }) => {
      const prevVal = String(origW[key] || "").trim()
      const nextVal = String(newW[key] || "").trim()
      if (prevVal !== nextVal) {
        diffs.push({
          field: label,
          previousValue: prevVal || "(empty)",
          newValue: nextVal || "(empty)",
          category: "general",
        })
      }
    })
  }

  return diffs
}

/**
 * Creates an immutable snapshot of an original flagged report prior to resubmission.
 */
export function createRevisionSnapshot(
  original: Report,
  updated: Report,
  feedback?: string,
): ReportRevision {
  const diffs = computeReportDiffs(original, updated)

  return {
    version: original.version || 1,
    submittedAt: original.submitted
      ? new Date(original.submitted).toISOString()
      : new Date().toISOString(),
    flaggedAt: new Date().toISOString(),
    feedback: feedback || original.feedback || "Revision requested by administrator",
    diffs,
    snapshot: {
      summary: original.summary,
      gveData: original.gveData ? JSON.parse(JSON.stringify(original.gveData)) : undefined,
      gveWeeklyData: original.gveWeeklyData
        ? JSON.parse(JSON.stringify(original.gveWeeklyData))
        : undefined,
      gveQuarterlyData: original.gveQuarterlyData
        ? JSON.parse(JSON.stringify(original.gveQuarterlyData))
        : undefined,
      attachmentsCount: original.attachments?.length || 0,
    },
  }
}
