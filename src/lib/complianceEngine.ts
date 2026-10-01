import { Report } from "../types/report"
import { Member } from "../types/member"
import { Deadline } from "../types/deadline"
import { supabase } from "./supabase"

export interface ComplianceBreakdown {
  totalSubmitted: number
  approvedCount: number
  flaggedCount: number
  resolvedCount: number
  onTimeCount: number
  lateCount: number
  onTimeRate: number
  approvalRate: number
  score: number
  tier: "High" | "Normal" | "Warning"
}

/**
 * Calculates a dynamic compliance score (0-100%) for a given team member.
 * Balanced 50% On-Time SLA and 50% Approval SLA with revision resolution incentives.
 */
export function calculateMemberCompliance(
  memberEmail: string,
  allReports: Report[],
  deadlines: Deadline[] = [],
  memberName?: string,
): ComplianceBreakdown {
  const cleanEmail = (memberEmail || "").trim().toLowerCase()
  const cleanName = (memberName || "").trim().toLowerCase()

  // Match author by email or full name
  const authorReports = allReports.filter((r) => {
    if (!r.author) return false
    const authorLower = r.author.trim().toLowerCase()
    return authorLower === cleanEmail || (cleanName && authorLower === cleanName)
  })

  // Exclude unsubmitted drafts from compliance tracking
  const activeReports = authorReports.filter((r) => r.status !== "Draft")

  if (activeReports.length === 0) {
    return {
      totalSubmitted: 0,
      approvedCount: 0,
      flaggedCount: 0,
      resolvedCount: 0,
      onTimeCount: 0,
      lateCount: 0,
      onTimeRate: 100,
      approvalRate: 100,
      score: 100,
      tier: "High",
    }
  }

  let onTimeCount = 0
  let approvedCount = 0
  let flaggedCount = 0
  let resolvedCount = 0

  activeReports.forEach((r) => {
    if (r.status === "Approved") approvedCount++
    if (r.status === "Flagged") flaggedCount++

    // Resolved revision = had at least one flag in history but is now Submitted or Approved
    if (r.revisionHistory && r.revisionHistory.length > 0 && r.status !== "Flagged") {
      resolvedCount++
    }

    // Check against department deadlines
    const subDate = new Date(r.submitted)
    const matchingDeadline = deadlines.find(
      (d) => d.department === r.department || d.department === "All Departments",
    )

    if (matchingDeadline) {
      const dueDate = new Date(matchingDeadline.dueDate)
      // On-time if submitted on or before due date end of day
      dueDate.setHours(23, 59, 59, 999)
      if (subDate <= dueDate) {
        onTimeCount++
      }
    } else {
      // Default on-time if no specific deadline was breached
      onTimeCount++
    }
  })

  const total = activeReports.length
  const lateCount = total - onTimeCount
  const onTimeRate = Math.round((onTimeCount / total) * 100)
  const approvalRate = Math.round((approvedCount / total) * 100)

  // Weighted score: 50% On-Time SLA + 50% Approval SLA
  let rawScore = Math.round(0.5 * onTimeRate + 0.5 * approvalRate)

  // Penalty for active unresolved flags (-5% each)
  rawScore -= flaggedCount * 5

  // Reward for resolving flagged items into resubmitted/approved work (+3% each)
  rawScore += resolvedCount * 3

  // Clamp score between 50% and 100%
  const finalScore = Math.max(50, Math.min(100, rawScore))

  let tier: "High" | "Normal" | "Warning" = "Normal"
  if (finalScore >= 95) tier = "High"
  else if (finalScore < 85) tier = "Warning"

  return {
    totalSubmitted: total,
    approvedCount,
    flaggedCount,
    resolvedCount,
    onTimeCount,
    lateCount,
    onTimeRate,
    approvalRate,
    score: finalScore,
    tier,
  }
}

/**
 * Re-evaluates compliance for all members in the organization.
 */
export function recalculateAllMembersCompliance(
  members: Member[],
  reports: Report[],
  deadlines: Deadline[] = [],
): Member[] {
  return members.map((m) => {
    const complianceData = calculateMemberCompliance(
      m.email || "",
      reports,
      deadlines,
      m.name,
    )
    return {
      ...m,
      compliance: complianceData.score,
    }
  })
}

/**
 * Persists an updated member compliance score to the Supabase database.
 */
export async function syncMemberComplianceToSupabase(
  memberEmail: string,
  score: number,
): Promise<void> {
  if (!navigator.onLine || !memberEmail) return

  try {
    const { error } = await supabase
      .from("members")
      .update({ compliance: score })
      .eq("email", memberEmail.trim().toLowerCase())

    if (error) {
      console.warn("Could not sync compliance score to Supabase:", error.message)
    }
  } catch (err) {
    console.warn("Failed to reach Supabase to update member compliance:", err)
  }
}
