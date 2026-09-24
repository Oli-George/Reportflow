import { supabase } from "./supabase"
import { Report } from "../types/report"

export interface ReportSummaryRow {
  id: number
  title: string
  author: string
  department: string
  type: string
  status: string
  summary: string | null
  feedback: string | null
  submitted_at: string | null
  created_at: string | null
}

// In-memory cache for loaded report payloads (gveData, gveWeeklyData, gveQuarterlyData, attachments)
const detailsCache = new Map<number, Partial<Report>>()

/**
 * Fetch lightweight report metadata for dashboard and list views.
 * Excludes heavy JSONB columns (attachments, gve_quarterly_data) to conserve initial bandwidth.
 */
export async function fetchReportsSummary(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, title, author, department, type, status, summary, feedback, submitted_at, created_at",
    )
    .order("id", { ascending: false })

  if (error) {
    console.warn("Supabase summary fetch error:", error.message)
    throw error
  }

  if (!data) return []

  return data.map((row: ReportSummaryRow) => {
    const id = Number(row.id)
    const cached = detailsCache.get(id)

    return {
      id,
      title: row.title,
      author: row.author,
      department: row.department,
      type: row.type as any,
      submitted: new Date(row.submitted_at || row.created_at || Date.now()),
      status: row.status as any,
      summary: row.summary || "",
      feedback: row.feedback || undefined,
      attachments: cached?.attachments,
      gveData: cached?.gveData,
      gveWeeklyData: cached?.gveWeeklyData,
      gveQuarterlyData: cached?.gveQuarterlyData,
    }
  })
}

/**
 * Fetch full report details including heavy JSONB audit payloads and attachments on-demand.
 * Results are cached in-memory so subsequent views/edits are instantaneous.
 */
export async function fetchReportDetails(
  id: number,
  forceRefresh = false,
): Promise<Partial<Report> | null> {
  if (!forceRefresh && detailsCache.has(id)) {
    return detailsCache.get(id) || null
  }

  const { data, error } = await supabase
    .from("reports")
    .select("attachments, gve_daily_data, gve_weekly_data, gve_quarterly_data")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    console.warn("Failed to load report details for ID:", id, error?.message)
    return null
  }

  const details: Partial<Report> = {
    attachments: data.attachments || undefined,
    gveData: data.gve_daily_data || undefined,
    gveWeeklyData: data.gve_weekly_data || undefined,
    gveQuarterlyData: data.gve_quarterly_data || undefined,
  }

  detailsCache.set(id, details)
  return details
}

/**
 * Hydrates a report object with its physical form replica data and attachments if not yet loaded.
 */
export async function hydrateReport(
  report: Report,
  forceRefresh = false,
): Promise<Report> {
  // If report already has any physical form replica, return directly unless forced
  const hasPayload = Boolean(
    report.gveData ||
    report.gveWeeklyData ||
    report.gveQuarterlyData ||
    (report.attachments && report.attachments.length > 0)
  )

  if (!forceRefresh && hasPayload) {
    return report
  }

  const details = await fetchReportDetails(report.id, forceRefresh)
  if (!details) return report

  return {
    ...report,
    ...details,
  }
}

/**
 * Hydrates telemetry for a list of reports (e.g. for generating energy analytics)
 */
export async function hydrateReportsTelemetry(reports: Report[]): Promise<Report[]> {
  const needsHydration = reports.filter(
    (r) => !r.gveData && !r.gveWeeklyData && (r.type === "Daily" || r.type === "Weekly")
  )

  if (needsHydration.length === 0) return reports

  const hydratedMap = new Map<number, Partial<Report>>()
  await Promise.all(
    needsHydration.map(async (r) => {
      const details = await fetchReportDetails(r.id)
      if (details) hydratedMap.set(r.id, details)
    })
  )

  return reports.map((r) => {
    const details = hydratedMap.get(r.id)
    return details ? { ...r, ...details } : r
  })
}

/**
 * Pre-seeds or updates the details cache for a report (useful after creating or saving a report)
 */
export function cacheReportDetails(id: number, details: Partial<Report>): void {
  detailsCache.set(id, details)
}

/**
 * Clears the in-memory details cache
 */
export function clearReportCache(): void {
  detailsCache.clear()
}
