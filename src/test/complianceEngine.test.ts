import { describe, it, expect } from "vitest"
import {
  calculateMemberCompliance,
  recalculateAllMembersCompliance,
} from "../lib/complianceEngine"
import type { Report } from "../types/report"
import type { Member } from "../types/member"
import type { Deadline } from "../types/deadline"

describe("Dynamic Compliance Engine", () => {
  const mockDeadlines: Deadline[] = [
    {
      id: 1,
      title: "Daily Mini-Grid Shift Handover",
      department: "Field Operations",
      dueDate: "2026-03-01T17:00:00Z",
      description: "Log daily generation",
      priority: "High",
      createdAt: "2026-02-01",
    },
  ]

  it("returns 100% compliance tier for members with no submissions yet", () => {
    const result = calculateMemberCompliance(
      "newbie@gve-group.com",
      [],
      mockDeadlines,
      "New Technician",
    )

    expect(result.totalSubmitted).toBe(0)
    expect(result.score).toBe(100)
    expect(result.tier).toBe("High")
  })

  it("gives 100% score for on-time and approved submissions", () => {
    const reports: Report[] = [
      {
        id: 1,
        title: "Daily Shift Log",
        author: "Chinedu Okafor",
        department: "Field Operations",
        type: "Daily",
        submitted: new Date("2026-03-01T15:00:00Z"), // 2 hours before deadline
        status: "Approved",
        summary: "Normal operation",
      },
      {
        id: 2,
        title: "Daily Shift Log 2",
        author: "Chinedu Okafor",
        department: "Field Operations",
        type: "Daily",
        submitted: new Date("2026-03-01T16:00:00Z"), // 1 hour before deadline
        status: "Approved",
        summary: "All systems green",
      },
    ]

    const result = calculateMemberCompliance(
      "chinedu@gve-group.com",
      reports,
      mockDeadlines,
      "Chinedu Okafor",
    )

    expect(result.totalSubmitted).toBe(2)
    expect(result.approvedCount).toBe(2)
    expect(result.onTimeCount).toBe(2)
    expect(result.score).toBe(100)
    expect(result.tier).toBe("High")
  })

  it("applies penalty for unresolved flagged reports", () => {
    const reports: Report[] = [
      {
        id: 1,
        title: "Daily Shift Log",
        author: "Chinedu Okafor",
        department: "Field Operations",
        type: "Daily",
        submitted: new Date("2026-03-01T15:00:00Z"),
        status: "Flagged", // Unresolved flag
        summary: "Flagged reading",
      },
    ]

    const result = calculateMemberCompliance(
      "chinedu@gve-group.com",
      reports,
      mockDeadlines,
      "Chinedu Okafor",
    )

    expect(result.flaggedCount).toBe(1)
    // 50% on-time (100) + 50% approved (0) = 50. - 5 flag penalty = 45 -> clamped to 50 minimum
    expect(result.score).toBeLessThanOrEqual(50)
    expect(result.tier).toBe("Warning")
  })

  it("awards bonus points when flagged reports are revised and resolved", () => {
    const reports: Report[] = [
      {
        id: 1,
        title: "Daily Shift Log",
        author: "Amina Yusuf",
        department: "Field Operations",
        type: "Daily",
        submitted: new Date("2026-03-01T15:00:00Z"),
        status: "Approved", // Approved after revision
        version: 2,
        revisionHistory: [
          {
            version: 1,
            submittedAt: "2026-03-01T16:00:00Z",
            flaggedAt: "2026-03-01T16:30:00Z",
            feedback: "Correction requested",
            diffs: [],
            snapshot: {} as any,
          },
        ],
        summary: "Resolved and approved",
      },
    ]

    const result = calculateMemberCompliance(
      "amina@gve-group.com",
      reports,
      mockDeadlines,
      "Amina Yusuf",
    )

    expect(result.resolvedCount).toBe(1)
    expect(result.score).toBe(100) // Clamped to max 100
  })

  it("recalculates compliance for all members in a roster", () => {
    const members: Member[] = [
      {
        id: 1,
        name: "Chinedu Okafor",
        role: "Field Lead",
        department: "Field Operations",
        email: "chinedu@gve-group.com",
        initials: "CO",
        color: "#10b981",
        compliance: 90,
        lastReport: new Date(),
      },
      {
        id: 2,
        name: "Amina Yusuf",
        role: "Energy Analyst",
        department: "Technical Services",
        email: "amina@gve-group.com",
        initials: "AY",
        color: "#3b82f6",
        compliance: 80,
        lastReport: new Date(),
      },
    ]

    const reports: Report[] = [
      {
        id: 1,
        title: "Field Log",
        author: "Chinedu Okafor",
        department: "Field Operations",
        type: "Daily",
        submitted: new Date("2026-03-01T14:00:00Z"),
        status: "Approved",
        summary: "Approved log",
      },
    ]

    const updated = recalculateAllMembersCompliance(
      members,
      reports,
      mockDeadlines,
    )

    expect(updated[0].compliance).toBe(100) // Chinedu has 1 approved on-time report
    expect(updated[1].compliance).toBe(100) // Amina has 0 reports (defaults to baseline 100)
  })
})
