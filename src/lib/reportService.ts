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

/**
 * Fetch lightweight report metadata for dashboard and list views.
 * Excludes heavy JSONB columns (attachments, gve_quarterly_data) to conserve bandwidth.
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

  return data.map((row: ReportSummaryRow) => ({
    id: Number(row.id),
    title: row.title,
    author: row.author,
    department: row.department,
    type: row.type as any,
    submitted: new Date(row.submitted_at || row.created_at || Date.now()),
    status: row.status as any,
    summary: row.summary || "",
    feedback: row.feedback || undefined,
  }))
}

/**
 * Fetch full report details including heavy JSONB audit payloads and attachments on-demand.
 */
export async function fetchReportDetails(
  id: number,
): Promise<Partial<Report> | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("attachments, gve_daily_data, gve_weekly_data, gve_quarterly_data")
    .eq("id", id)
    .single()

  if (error || !data) {
    console.warn("Failed to load report details for ID:", id, error?.message)
    return null
  }

  return {
    attachments: data.attachments || undefined,
    gveData: data.gve_daily_data || undefined,
    gveWeeklyData: data.gve_weekly_data || undefined,
    gveQuarterlyData: data.gve_quarterly_data || undefined,
  }
}
