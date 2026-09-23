import React from "react"

export interface AnalyticsStatCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: {
    value: number
    label: string
    isPositiveGood?: boolean
  }
  badge?: string
  accent?: boolean
  icon?: React.ReactNode
  colorScheme?: "emerald" | "blue" | "amber" | "purple" | "default"
}

export default function AnalyticsStatCard({
  label,
  value,
  sub,
  trend,
  badge,
  accent,
  icon,
  colorScheme = "default",
}: AnalyticsStatCardProps) {
  const getSchemeStyles = () => {
    switch (colorScheme) {
      case "emerald":
        return {
          border: "border-emerald-500/30",
          glow: "hover:border-emerald-500/60",
          iconBg:
            "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
          valColor: "text-emerald-400",
        }
      case "blue":
        return {
          border: "border-blue-500/30",
          glow: "hover:border-blue-500/60",
          iconBg: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
          valColor: "text-blue-400",
        }
      case "amber":
        return {
          border: "border-amber-500/30",
          glow: "hover:border-amber-500/60",
          iconBg: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
          valColor: "text-amber-400",
        }
      case "purple":
        return {
          border: "border-purple-500/30",
          glow: "hover:border-purple-500/60",
          iconBg:
            "bg-purple-500/10 text-purple-400 border border-purple-500/20",
          valColor: "text-purple-400",
        }
      default:
        return {
          border: accent ? "border-primary/50" : "border-border",
          glow: "hover:border-border/80",
          iconBg: "bg-secondary text-muted-foreground border border-border",
          valColor: accent ? "text-primary-hover" : "text-foreground",
        }
    }
  }

  const scheme = getSchemeStyles()

  return (
    <div
      className={`rounded-xl border p-4.5 sm:p-5 flex flex-col justify-between transition-all duration-200 bg-card ${scheme.border} ${scheme.glow} shadow-sm relative overflow-hidden group`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-transform duration-200 group-hover:scale-105 ${scheme.iconBg}`}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mt-1">
        <span
          className={`text-2xl sm:text-3xl font-display font-bold tracking-tight ${scheme.valColor}`}
        >
          {value}
        </span>
        {badge && (
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            {badge}
          </span>
        )}
      </div>

      {(sub || trend) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40 text-xs font-mono">
          {trend && (
            <span
              className={`flex items-center gap-0.5 font-semibold ${
                trend.value >= 0
                  ? trend.isPositiveGood !== false
                    ? "text-emerald-400"
                    : "text-rose-400"
                  : trend.isPositiveGood !== false
                    ? "text-rose-400"
                    : "text-emerald-400"
              }`}
            >
              {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
          {sub && (
            <span className="text-muted-foreground truncate" title={sub}>
              {sub}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
