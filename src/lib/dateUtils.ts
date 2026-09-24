
export function isWithinPastMonth(date: Date | string): boolean {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
  const submittedTime = new Date(date).getTime()
  return new Date().getTime() - submittedTime <= thirtyDaysMs
}

export function formatDeadlineDate(dateStr: string): string {
  if (!dateStr) return "No date"
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

export function getDeadlineUrgency(dueDateStr: string): {
  label: string
  color: string
  bg: string
  border: string
  isOverdue: boolean
  isUrgent: boolean
} {
  if (!dueDateStr) {
    return {
      label: "Upcoming",
      color: "var(--foreground)",
      bg: "var(--secondary)",
      border: "var(--border)",
      isOverdue: false,
      isUrgent: false,
    }
  }

  const now = new Date()
  const due = new Date(dueDateStr)
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      label: `Overdue by ${Math.abs(diffDays)}d`,
      color: "#f87171",
      bg: "rgba(248, 113, 113, 0.1)",
      border: "rgba(248, 113, 113, 0.3)",
      isOverdue: true,
      isUrgent: false,
    }
  }
  if (diffDays === 0) {
    return {
      label: "Due Today",
      color: "#fb923c",
      bg: "rgba(251, 146, 60, 0.1)",
      border: "rgba(251, 146, 60, 0.3)",
      isOverdue: false,
      isUrgent: true,
    }
  }
  if (diffDays <= 3) {
    return {
      label: `Due in ${diffDays}d`,
      color: "#facc15",
      bg: "rgba(250, 204, 21, 0.1)",
      border: "rgba(250, 204, 21, 0.3)",
      isOverdue: false,
      isUrgent: true,
    }
  }
  return {
    label: `Due in ${diffDays}d`,
    color: "var(--foreground)",
    bg: "var(--secondary)",
    border: "var(--border)",
    isOverdue: false,
    isUrgent: false,
  }
}
