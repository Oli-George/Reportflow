import { useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import { VelocityDataPoint } from "../../lib/analyticsCalculator"

export interface SubmissionVelocityChartProps {
  data: VelocityDataPoint[]
  timeframeLabel?: string
}

const customTooltipStyle = {
  backgroundColor: "#0d1b14",
  border: "1px solid #1e3a2b",
  borderRadius: 8,
  color: "#e2ece6",
  fontSize: 12,
  fontFamily: "DM Mono, monospace",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
  padding: "10px 14px",
}

export default function SubmissionVelocityChart({
  data,
  timeframeLabel = "Weekly",
}: SubmissionVelocityChartProps) {
  const [chartType, setChartType] = useState<"bar" | "area">("bar")

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2">
            <span>Submission & Review Velocity</span>
            <span className="text-xs font-mono font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/50">
              {timeframeLabel}
            </span>
          </h3>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            Operational throughput: submitted, approved, and revision-flagged
            logs
          </p>
        </div>

        {/* Chart type toggle */}
        <div className="flex items-center bg-secondary/80 p-1 rounded-lg border border-border/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setChartType("bar")}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
              chartType === "bar"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Stacked Bar
          </button>
          <button
            type="button"
            onClick={() => setChartType("area")}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
              chartType === "area"
                ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Area Flow
          </button>
        </div>
      </div>

      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data} barCategoryGap="28%">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1c2f25"
                vertical={false}
              />
              <XAxis
                dataKey={"period" as any}
                tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={{ stroke: "#1e3028" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={customTooltipStyle}
                cursor={{ fill: "rgba(16, 185, 129, 0.04)" }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: "DM Mono",
                  paddingTop: "12px",
                }}
              />
              <Bar
                dataKey={"approved" as any}
                name="Approved"
                stackId="a"
                fill="#10b981"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey={"submitted" as any}
                name="Submitted (Pending)"
                stackId="a"
                fill="#3b82f6"
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey={"flagged" as any}
                name="Flagged Revision"
                stackId="a"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1c2f25"
                vertical={false}
              />
              <XAxis
                dataKey={"period" as any}
                tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={{ stroke: "#1e3028" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend
                wrapperStyle={{
                  fontSize: 11,
                  fontFamily: "DM Mono",
                  paddingTop: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey={"approved" as any}
                name="Approved"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorApproved)"
              />
              <Area
                type="monotone"
                dataKey={"submitted" as any}
                name="Submitted"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSubmitted)"
              />
              <Area
                type="monotone"
                dataKey={"flagged" as any}
                name="Flagged"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="#f59e0b"
                fillOpacity={0.15}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}
