import { DepartmentMetricItem, TechnicianLeaderboardItem } from "../../lib/analyticsCalculator"

export interface DepartmentComplianceTableProps {
  departments: DepartmentMetricItem[]
  technicians: TechnicianLeaderboardItem[]
}

export default function DepartmentComplianceTable({
  departments,
  technicians,
}: DepartmentComplianceTableProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Department Breakdown Table */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card p-5 flex flex-col shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              Departmental Operational Matrix
            </h3>
            <p className="text-xs font-mono text-muted-foreground">
              Volume, review outcome ratio, and deadline SLA adherence
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border">
            {departments.length} Depts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                <th className="pb-2.5 font-medium">Department</th>
                <th className="pb-2.5 font-medium text-center">Reports</th>
                <th className="pb-2.5 font-medium text-center">Approved</th>
                <th className="pb-2.5 font-medium text-center">Flagged</th>
                <th className="pb-2.5 font-medium text-center">Approval Rate</th>
                <th className="pb-2.5 font-medium text-right">Compliance SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {departments.map((dept) => (
                <tr key={dept.department} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-3 pr-2 flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dept.color }}
                    />
                    <span className="font-medium text-foreground">{dept.department}</span>
                  </td>
                  <td className="py-3 text-center text-foreground font-semibold">
                    {dept.total}
                  </td>
                  <td className="py-3 text-center text-emerald-400">
                    {dept.approved}
                  </td>
                  <td className="py-3 text-center text-amber-400">
                    {dept.flagged}
                  </td>
                  <td className="py-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        dept.approvalRate >= 90
                          ? "bg-emerald-950/50 text-emerald-300 border border-emerald-800/60"
                          : dept.approvalRate >= 75
                            ? "bg-blue-950/50 text-blue-300 border border-blue-800/60"
                            : "bg-amber-950/50 text-amber-300 border border-amber-800/60"
                      }`}
                    >
                      {dept.approvalRate}%
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${dept.complianceRate}%`,
                            backgroundColor:
                              dept.complianceRate >= 95
                                ? "#10b981"
                                : dept.complianceRate >= 85
                                  ? "#3b82f6"
                                  : "#f59e0b",
                          }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {dept.complianceRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Field Engineer & Technician Leaderboard */}
      <div className="rounded-xl border border-border bg-card p-5 flex flex-col shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-foreground">
              Staff Punctuality
            </h3>
            <p className="text-xs font-mono text-muted-foreground">
              Top reporting compliance
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground bg-secondary px-2.5 py-1 rounded-md border border-border">
            {technicians.length} Staff
          </span>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto max-h-[340px] pr-1">
          {technicians.slice(0, 7).map((tech, index) => (
            <div
              key={tech.id}
              className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40 hover:bg-secondary/70 border border-border/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold text-white shrink-0"
                  style={{ backgroundColor: tech.color || "#005030" }}
                >
                  {tech.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-foreground truncate">
                      {tech.name}
                    </span>
                    {index === 0 && (
                      <span className="text-[10px] text-amber-400" title="Top Performer">
                        👑
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground block truncate">
                    {tech.role} · {tech.department}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 pl-2">
                <span className="text-xs font-mono font-semibold text-emerald-400">
                  {tech.compliance}% SLA
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {tech.reportsSubmitted} logs
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
