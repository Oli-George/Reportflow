import { ReportAttachment } from "./attachment"

export interface OutageFaultEntry {
  id: string
  day: string // "DAY 1", "DAY 2", etc.
  date: string
  timeOut: string
  timeRestored: string
  remark: string
}

export interface GveWeeklyRecordData {
  siteName: string
  supervisorName: string
  supervisorSignature?: string
  supervisorDate: string
  operatorName: string
  operatorSignature?: string
  operatorDate: string

  // Cleanliness
  powerHouseComment: string
  environmentComment: string

  // Outages / Faults over the week (14 default rows for Day 1 - Day 7)
  outages: OutageFaultEntry[]

  // Remarks on equipment
  remarkBess: string
  remarkInverters: string
  remarkChargeControllers: string
  remarkDieselGenerator: string
  remarkCoolingSystem: string
  remarkMeteringVending: string
  remarkGridLine: string
  remarkFireExtinguisherSafetyTools: string
  remarkSpds: string

  // Activities & Comments
  visitorReceived: string
  maintenanceCarriedOut: string
  housekeepingActivities: string
  anyOtherComment: string

  // Attachments
  attachments?: ReportAttachment[]
}

export const DEFAULT_WEEKLY_DAYS = [
  "DAY 1",
  "DAY 1",
  "DAY 2",
  "DAY 2",
  "DAY 3",
  "DAY 3",
  "DAY 4",
  "DAY 4",
  "DAY 5",
  "DAY 5",
  "DAY 6",
  "DAY 6",
  "DAY 7",
  "DAY 7",
]

export function createDefaultOutageEntry(
  day: string,
  idx: number,
): OutageFaultEntry {
  return {
    id: `outage-${Date.now()}-${idx}`,
    day,
    date: "",
    timeOut: "",
    timeRestored: "",
    remark: "",
  }
}

export function createEmptyGveWeeklyData(): GveWeeklyRecordData {
  const today = new Date().toISOString().split("T")[0]
  return {
    siteName: "",
    supervisorName: "",
    supervisorSignature: "",
    supervisorDate: today,
    operatorName: "",
    operatorSignature: "",
    operatorDate: today,

    powerHouseComment: "",
    environmentComment: "",

    outages: DEFAULT_WEEKLY_DAYS.map((dayLabel, idx) =>
      createDefaultOutageEntry(dayLabel, idx),
    ),

    remarkBess: "",
    remarkInverters: "",
    remarkChargeControllers: "",
    remarkDieselGenerator: "",
    remarkCoolingSystem: "",
    remarkMeteringVending: "",
    remarkGridLine: "",
    remarkFireExtinguisherSafetyTools: "",
    remarkSpds: "",

    visitorReceived: "",
    maintenanceCarriedOut: "",
    housekeepingActivities: "",
    anyOtherComment: "",
  }
}
