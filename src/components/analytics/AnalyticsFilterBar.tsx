import React from "react"
import { AnalyticsFilter, TimeframeOption } from "../../lib/analyticsCalculator"

export interface AnalyticsFilterBarProps {
  filter: AnalyticsFilter
  onChange: (next: AnalyticsFilter) => void
  onExportCsv?: () => void
  sites?: string[]
}

const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
  quarter: "Q3 2026",
  year: "Past Year",
  all: "All Time",
}

const DEPARTMENTS = [
  "All Departments",
  "Engineering",
  "Operations",
  "Finance",
  "Marketing",
  "HR",
  "Sales",
  "Legal",
]

const REPORT_TYPES = [
  "All Types",
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "Yearly",
]

export default function AnalyticsFilterBar({
  filter,
  onChange,
  onExportCsv,
  sites = ["All Sites", "Kuka Mini-Grid", "GVE Base Plant", "Off-Grid Solar Cluster"],
}: AnalyticsFilterBarProps) {
  const handleTimeframeChange = (tf: TimeframeOption) => {
    onChange({ ...filter, timeframe: tf })
  }

  const handleDeptChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    onChange({ ...filter, department: val === "All Departments" ? "All" : val })
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    onChange({ ...filter, reportType: val === "All Types" ? "All" : val })
  }

  const handleSiteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value
    onChange({ ...filter, site: val === "All Sites" ? "All" : val })
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-4 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        {/* Timeframe pill tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-xs font-mono text-muted-foreground mr-1 hidden sm:inline">
            Range:
          </span>
          {(["7d", "30d", "90d", "quarter", "year", "all"] as TimeframeOption[]).map((tf) => {
            const isSelected = filter.timeframe === tf
            return (
              <button
                key={tf}
                type="button"
                onClick={() => handleTimeframeChange(tf)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
                }`}
              >
                {TIMEFRAME_LABELS[tf]}
              </button>
            )
          })}
        </div>

        {/* Quick export button */}
        {onExportCsv && (
          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              type="button"
              onClick={onExportCsv}
              className="px-3 py-1.5 rounded-lg text-xs font-mono bg-secondary hover:bg-secondary/80 text-foreground border border-border flex items-center gap-1.5 transition-colors"
              title="Export filtered reports data as CSV"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Select dropdowns bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/60">
        {/* Department filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Department
          </label>
          <select
            value={filter.department === "All" ? "All Departments" : filter.department}
            onChange={handleDeptChange}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary-hover font-mono"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        {/* Report Type filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Report Type
          </label>
          <select
            value={filter.reportType === "All" ? "All Types" : filter.reportType}
            onChange={handleTypeChange}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary-hover font-mono"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Site filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            Mini-Grid Site Location
          </label>
          <select
            value={filter.site === "All" ? "All Sites" : filter.site}
            onChange={handleSiteChange}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary-hover font-mono"
          >
            {sites.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
