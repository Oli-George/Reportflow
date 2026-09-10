import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts"
import { EnergyTelemetryPoint } from "../../lib/analyticsCalculator"

export interface SiteEnergyAnalyticsProps {
  telemetryData: EnergyTelemetryPoint[]
  totalGenKwh: number
  totalLoadKwh: number
  avgSoc: number
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

export default function SiteEnergyAnalytics({
  telemetryData,
  totalGenKwh,
  totalLoadKwh,
  avgSoc,
}: SiteEnergyAnalyticsProps) {
  const selfSufficiencyPct = totalLoadKwh > 0 ? Math.min(100, Math.round((totalGenKwh / totalLoadKwh) * 100)) : 100

  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="font-display font-bold text-base text-foreground">
              Solar Mini-Grid Operational Energy & Telemetry
            </h3>
          </div>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">
            Aggregated solar PV generation, load consumption, and battery storage performance
          </p>
        </div>

        {/* Mini stats pill row */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none font-mono text-xs">
          <div className="px-3 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
            <span className="text-muted-foreground mr-1">PV Gen:</span>
            <strong>{totalGenKwh.toLocaleString()} kWh</strong>
          </div>
          <div className="px-3 py-1 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-300">
            <span className="text-muted-foreground mr-1">Load:</span>
            <strong>{totalLoadKwh.toLocaleString()} kWh</strong>
          </div>
          <div className="px-3 py-1 rounded-lg bg-purple-950/40 border border-purple-800/60 text-purple-300">
            <span className="text-muted-foreground mr-1">Avg SOC:</span>
            <strong>{avgSoc}%</strong>
          </div>
          <div className="px-3 py-1 rounded-lg bg-secondary border border-border text-foreground">
            <span className="text-muted-foreground mr-1">Solar Fraction:</span>
            <strong className="text-emerald-400">{selfSufficiencyPct}%</strong>
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={telemetryData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2f25" vertical={false} />
            <XAxis
              dataKey={"date" as any}
              tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }}
              axisLine={{ stroke: "#1e3028" }}
              tickLine={false}
            />
            <YAxis
              yAxisId="energy"
              unit=" kWh"
              tick={{ fill: "#8aab96", fontSize: 11, fontFamily: "DM Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="soc"
              orientation="right"
              unit="%"
              domain={[0, 100]}
              tick={{ fill: "#a78bfa", fontSize: 11, fontFamily: "DM Mono" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={customTooltipStyle}
              formatter={(v, name) => [
                name === "Battery SOC" ? `${v}%` : `${v} kWh`,
                String(name),
              ]}
            />
            <Legend
              wrapperStyle={{
                fontSize: 11,
                fontFamily: "DM Mono",
                paddingTop: "12px",
              }}
            />
            <Line
              yAxisId="energy"
              type="monotone"
              dataKey={"pvEnergyKwh" as any}
              name="Solar PV Generation (kWh)"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ fill: "#10b981", r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="energy"
              type="monotone"
              dataKey={"loadEnergyKwh" as any}
              name="Site Load Demand (kWh)"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="soc"
              type="monotone"
              dataKey={"avgBatterySoc" as any}
              name="Battery SOC"
              stroke="#a78bfa"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
