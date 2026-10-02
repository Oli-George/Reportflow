import { useState } from "react"
import { Report, ReportRevision } from "../types/report"
import { AlertIcon, ShieldCheckIcon } from "./Icons"

interface ReportDiffViewerProps {
  report: Report
  className?: string
}

export default function ReportDiffViewer({
  report,
  className = "",
}: ReportDiffViewerProps) {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0)
  const [viewMode, setViewMode] = useState<"diffs" | "timeline">("diffs")

  const history = report.revisionHistory || []
  if (history.length === 0) return null

  const activeRevision: ReportRevision =
    history[selectedVersionIndex] || history[0]
  const diffs = activeRevision.diffs || []

  return (
    <div
      className={`rounded-xl border border-amber-600/40 bg-amber-950/20 p-5 shadow-lg flex flex-col gap-4 font-body ${className}`}
    >
      {/* 1. Header Bar with Version Badges */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <AlertIcon className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
                Structured Revision History
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/30 text-amber-200 border border-amber-500/40">
                v{report.version || history.length + 1} Current
              </span>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
              Document was flagged for revision by management and resubmitted by
              the technician.
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-lg border border-border/80 bg-background/60 p-0.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setViewMode("diffs")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              viewMode === "diffs"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Field-by-Field Diffs ({diffs.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode("timeline")}
            className={`px-3 py-1 rounded transition-colors cursor-pointer ${
              viewMode === "timeline"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Revision Notes & Timeline
          </button>
        </div>
      </div>

      {/* 2. Reviewer Correction Request Banner */}
      {activeRevision.feedback && (
        <div className="rounded-lg border border-amber-800/60 bg-amber-900/30 p-3.5 flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono text-amber-300">
            <span className="font-bold flex items-center gap-1.5">
              <span>Admin Correction Request:</span>
            </span>
            <span className="text-[10px] text-amber-400/80">
              Flagged on{" "}
              {new Date(
                activeRevision.flaggedAt || activeRevision.submittedAt,
              ).toLocaleDateString()}
            </span>
          </div>
          <p className="text-xs font-mono text-amber-100/90 leading-relaxed italic bg-black/20 p-2 rounded border border-amber-900/40">
            "{activeRevision.feedback}"
          </p>
        </div>
      )}

      {/* 3. Revision Selector if multiple revisions exist */}
      {history.length > 1 && (
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-muted-foreground">Select Revision:</span>
          {history.map((rev, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedVersionIndex(idx)}
              className={`px-2.5 py-1 rounded text-xs border transition-all cursor-pointer ${
                selectedVersionIndex === idx
                  ? "bg-amber-500/20 border-amber-400 text-amber-300 font-bold"
                  : "border-border/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              v{rev.version} &rarr; v{rev.version + 1}
            </button>
          ))}
        </div>
      )}

      {/* 4. Main Body: Diffs Table or Timeline */}
      {viewMode === "diffs" ? (
        <div className="rounded-lg border border-border/80 bg-background/80 overflow-hidden text-xs font-mono">
          {diffs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2.5 px-4 font-semibold">
                      Parameter / Field
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-red-400">
                      Previous (Flagged v{activeRevision.version})
                    </th>
                    <th className="py-2.5 px-4 font-semibold text-emerald-400">
                      Corrected (Revised v{activeRevision.version + 1})
                    </th>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">
                      Type
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {diffs.map((diff, i) => (
                    <tr
                      key={i}
                      className="hover:bg-secondary/20 transition-colors"
                    >
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {diff.field}
                      </td>
                      <td className="py-2.5 px-4 text-red-400/90 bg-red-950/20 line-through">
                        {diff.previousValue}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-300 font-bold bg-emerald-950/20 flex items-center gap-1.5">
                        <span className="text-emerald-400 text-[10px]">✓</span>
                        <span>{diff.newValue}</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                            diff.category === "telemetry"
                              ? "bg-cyan-950/40 text-cyan-300 border-cyan-800/40"
                              : diff.category === "summary"
                                ? "bg-purple-950/40 text-purple-300 border-purple-800/40"
                                : "bg-secondary text-muted-foreground border-border"
                          }`}
                        >
                          {diff.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-xs">
                No telemetry cell discrepancies detected. The technician
                resubmitted without changing numerical fields.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/80 bg-background/80 p-4 flex flex-col gap-3 text-xs font-mono">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xs">
              <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground">
                  Version {report.version || history.length + 1} Resubmitted
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {new Date(report.submitted).toLocaleString()}
                </span>
              </div>
              <p className="text-muted-foreground text-[11px] mt-1">
                Technician corrected flagged fields and resubmitted for
                management approval.
              </p>
            </div>
          </div>

          <div className="border-l-2 border-border/60 ml-3 pl-6 py-2 flex flex-col gap-3">
            {history.map((rev, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-semibold text-amber-300">
                    Version {rev.version} Flagged
                  </span>
                  <span className="text-[10px]">
                    {new Date(
                      rev.flaggedAt || rev.submittedAt,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {rev.feedback && (
                  <p className="text-[11px] text-amber-200/90 italic">
                    Reason: {rev.feedback}
                  </p>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {rev.diffs?.length || 0} fields adjusted in subsequent
                  version.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
