const statusColor: Record<string, string> = {
  Approved: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
  Submitted: "bg-blue-900/40 text-blue-300 border-blue-700/40",
  Draft: "bg-zinc-800/60 text-zinc-400 border-zinc-700/40",
  Flagged: "bg-amber-900/40 text-amber-300 border-amber-700/40",
}

export function Badge({ status }: { status: string }) {
  const statusKey = status.toLowerCase()
  return (
    <span
      className={`badge-status badge-${statusKey} inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${statusColor[status] ?? "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
    >
      {status}
    </span>
  )
}
