import { useState } from "react"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import {
  TypeDistributionItem,
  DepartmentMetricItem,
} from "../../lib/analyticsCalculator"

export interface ReportDistributionChartProps {
  typeData: TypeDistributionItem[]
  deptData: DepartmentMetricItem[]
}

const customTooltipStyle = {
  backgroundColor: "#0d1b14",
  border: "1px solid #1e3a2b",
  borderRadius: 8,
  color: "#e2ece6",
  fontSize: 12,
  fontFamily: "DM Mono, monospace",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  padding: "8px 12px",
}

export default function ReportDistributionChart({
  typeData,
  deptData,
}: ReportDistributionChartProps) {
  const [tab, setTab] = useState<"type" | "department">("type")

  const activeData =
    tab === "type"
      ? typeData
      : deptData
          .filter((d) => d.total > 0)
          .map((d) => ({
            name: d.department,
            value: d.total,
            percentage: 0,
            color: d.color,
          }))

  const totalCount = activeData.reduce((acc, curr) => acc + curr.value, 0) || 1

  const computedItems = activeData.map((d) => ({
    ...d,
    percentage: Math.round((d.value / totalCount) * 100),
  }))

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col justify-between shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="font-display font-bold text-base text-foreground">
            Distribution Breakdown
          </h3>
          <p className="text-xs font-mono text-muted-foreground">
            Volume split by {tab === "type" ? "report frequency" : "department"}
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-secondary/80 p-1 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setTab("type")}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
              tab === "type"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Type
          </button>
          <button
            type="button"
            onClick={() => setTab("department")}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
              tab === "department"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            By Dept
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 items-center gap-4 my-auto py-2">
        {/* Donut Chart */}
        <div className="w-full h-48 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={computedItems}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {computedItems.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="#0b1410"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={customTooltipStyle}
                formatter={(v, name) => [
                  `${v} reports (${Math.round((Number(v) / totalCount) * 100)}%)`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Inner donut center stat */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-display font-bold text-foreground">
              {totalCount}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">
              Total
            </span>
          </div>
        </div>

        {/* Legend list */}
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
          {computedItems.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded-md hover:bg-secondary/40 transition-colors"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-foreground truncate">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-foreground">
                  {item.value}
                </span>
                <span className="text-muted-foreground text-[10px] w-9 text-right">
                  ({item.percentage}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
