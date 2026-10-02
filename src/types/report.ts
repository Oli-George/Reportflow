import { GveDailyRecordData } from "./gveDaily"
import { GveWeeklyRecordData } from "./gveWeekly"
import { GveQuarterlyRecordData } from "./gveQuarterly"
import { ReportAttachment } from "./attachment"

export type ReportStatus = "Approved" | "Submitted" | "Draft" | "Flagged"
export type ReportType = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly"

export interface FieldDiff {
  field: string
  previousValue: string
  newValue: string
  category: "telemetry" | "summary" | "attachment" | "general"
}

export interface ReportRevision {
  version: number
  submittedAt: string
  flaggedAt?: string
  feedback?: string
  diffs: FieldDiff[]
  snapshot: {
    summary: string
    gveData?: GveDailyRecordData
    gveWeeklyData?: GveWeeklyRecordData
    gveQuarterlyData?: GveQuarterlyRecordData
    attachmentsCount: number
  }
}

export interface Report {
  id: number
  title: string
  author: string
  department: string
  type: ReportType
  submitted: Date
  status: ReportStatus
  summary: string
  feedback?: string
  attachments?: ReportAttachment[]
  gveData?: GveDailyRecordData
  gveWeeklyData?: GveWeeklyRecordData
  gveQuarterlyData?: GveQuarterlyRecordData
  client_submission_id?: string
  version?: number
  revisionHistory?: ReportRevision[]
}
