export interface GveHourlyEntry {
  id: string
  time: string // 12-hour format e.g. "06:00 AM", "07:00 AM"
  pv: {
    volt: string
    curr: string
    power: string
    energy: string
  }
  battery: {
    volt: string
    curr: string
    soc: string
    soh: string
  }
  load: {
    l1_v: string
    l1_a: string
    l2_v: string
    l2_c: string
    l3_v: string
    l3_c: string
    power: string
    energy: string
  }
  grid: {
    l1_v: string
    l1_a: string
    l2_v: string
    l2_c: string
    l3_v: string
    l3_c: string
    power: string
    energy: string
  }
  spd: {
    in: string
    out: string
  }
  cooling: {
    ac1: string
    ac2: string
  }
  operatorName?: string
  operatorSignature?: string
}

export interface GveHourlyCalculatedMetrics {
  installedPvCapacityKwp: string // e.g. "50.0"
  totalPvEnergyKwh: string // Derived or auto-summed (kWh)
  specificYieldKwhPerKwp: string // kWh / kWp
  inverterEfficiencyPct: string // Average conversion %
  fuelConsumedLitres: string // Diesel input (L)
  dgEnergyGeneratedKwh: string // Diesel Gen output (kWh)
  fuelBurnRateLPerKwh: string // L / kWh
  estimatedPrPct?: string // Performance Ratio %
  // Override tracking flags
  isSpecificYieldOverridden?: boolean
  isInverterEfficiencyOverridden?: boolean
  isFuelBurnRateOverridden?: boolean
  isTotalPvEnergyOverridden?: boolean
}

import { ReportAttachment } from "./attachment"

export interface GveKukaRecordData {
  siteName: string
  title: string
  date: string
  day: string
  year: string
  entries: GveHourlyEntry[]
  attachments?: ReportAttachment[]
  metrics?: GveHourlyCalculatedMetrics
}

export function createDefaultHourlyMetrics(): GveHourlyCalculatedMetrics {
  return {
    installedPvCapacityKwp: "50.0",
    totalPvEnergyKwh: "",
    specificYieldKwhPerKwp: "",
    inverterEfficiencyPct: "",
    fuelConsumedLitres: "",
    dgEnergyGeneratedKwh: "",
    fuelBurnRateLPerKwh: "",
    estimatedPrPct: "",
    isSpecificYieldOverridden: false,
    isInverterEfficiencyOverridden: false,
    isFuelBurnRateOverridden: false,
    isTotalPvEnergyOverridden: false,
  }
}

/**
 * Pure math helper to compute live auto values from hourly entries
 */
export function computeAutoHourlyMetrics(
  entries: GveHourlyEntry[],
  installedCapacityKwpStr: string = "50.0",
  fuelLitresStr: string = "",
  dgEnergyKwhStr: string = "",
): {
  autoTotalPvEnergyKwh: string
  autoSpecificYield: string
  autoInverterEfficiency: string
  autoFuelBurnRate: string
  autoTotalLoadEnergyKwh: string
  autoTotalGridDgEnergyKwh: string
} {
  const capKwp = parseFloat(installedCapacityKwpStr) || 50.0
  const fuelLitres = parseFloat(fuelLitresStr) || 0
  const manualDgEnergy = parseFloat(dgEnergyKwhStr) || 0

  let sumPvPower = 0
  let sumPvCount = 0
  let sumLoadPower = 0
  let sumGridDgPower = 0

  // Track min and max cumulative energy readings if energy meters were entered
  const pvEnergyReadings: number[] = []
  const loadEnergyReadings: number[] = []
  const gridEnergyReadings: number[] = []

  entries.forEach((e) => {
    // PV Power
    const pvP = parseFloat(e.pv.power)
    if (!isNaN(pvP) && pvP > 0) {
      sumPvPower += pvP
      sumPvCount++
    } else {
      // Fallback: estimate from V x I if power not entered
      const v = parseFloat(e.pv.volt)
      const i = parseFloat(e.pv.curr)
      if (!isNaN(v) && !isNaN(i) && v > 0 && i > 0) {
        sumPvPower += (v * i) / 1000
        sumPvCount++
      }
    }

    const pvE = parseFloat(e.pv.energy)
    if (!isNaN(pvE) && pvE > 0) pvEnergyReadings.push(pvE)

    // Load Power
    const loadP = parseFloat(e.load.power)
    if (!isNaN(loadP) && loadP > 0) sumLoadPower += loadP
    const loadE = parseFloat(e.load.energy)
    if (!isNaN(loadE) && loadE > 0) loadEnergyReadings.push(loadE)

    // Grid/DG Power & Energy
    const gridP = parseFloat(e.grid.power)
    if (!isNaN(gridP) && gridP > 0) sumGridDgPower += gridP
    const gridE = parseFloat(e.grid.energy)
    if (!isNaN(gridE) && gridE > 0) gridEnergyReadings.push(gridE)
  })

  // 1. Total Daily PV Energy: difference between meter readings or sum of hourly power
  let totalPvKwh = 0
  if (pvEnergyReadings.length >= 2) {
    const delta = pvEnergyReadings[pvEnergyReadings.length - 1] - pvEnergyReadings[0]
    totalPvKwh = delta > 0 ? delta : sumPvPower
  } else {
    totalPvKwh = sumPvPower // Each row represents ~1 hour delta
  }

  // 2. Specific Yield = Total PV Energy (kWh) / Installed Capacity (kWp)
  let specificYield = 0
  if (capKwp > 0 && totalPvKwh > 0) {
    specificYield = totalPvKwh / capKwp
  }

  // 3. Inverter Efficiency Estimate = Delivered AC (Load/Grid) vs DC Generation
  // Normal high-quality solar inverters operate at 93% - 98%
  let inverterEff = 0
  if (sumPvPower > 0 && sumLoadPower > 0) {
    const rawRatio = (sumLoadPower / sumPvPower) * 100
    // Keep realistic range between 70% and 99.5%
    inverterEff = Math.min(Math.max(rawRatio, 75.0), 98.8)
  } else if (sumPvPower > 0) {
    inverterEff = 96.2 // Standard nominal efficiency for active PV inverter
  }

  // 4. DG Fuel Burn Rate = Litres / DG kWh
  let totalDgKwh = manualDgEnergy
  if (totalDgKwh <= 0) {
    if (gridEnergyReadings.length >= 2) {
      const delta = gridEnergyReadings[gridEnergyReadings.length - 1] - gridEnergyReadings[0]
      if (delta > 0) totalDgKwh = delta
    } else {
      totalDgKwh = sumGridDgPower
    }
  }

  let burnRate = 0
  if (fuelLitres > 0 && totalDgKwh > 0) {
    burnRate = fuelLitres / totalDgKwh
  }

  return {
    autoTotalPvEnergyKwh: totalPvKwh > 0 ? totalPvKwh.toFixed(2) : "",
    autoSpecificYield: specificYield > 0 ? specificYield.toFixed(2) : "",
    autoInverterEfficiency: inverterEff > 0 ? inverterEff.toFixed(1) : "",
    autoFuelBurnRate: burnRate > 0 ? burnRate.toFixed(3) : "",
    autoTotalLoadEnergyKwh: sumLoadPower > 0 ? sumLoadPower.toFixed(2) : "",
    autoTotalGridDgEnergyKwh: totalDgKwh > 0 ? totalDgKwh.toFixed(2) : "",
  }
}

// Default initial hourly entries in 12-hour format
export const DEFAULT_12HR_TIMES = ["07:00 AM","08:00 AM","09:00 AM",
  "10:00 AM","11:00 AM","12:00 PM","01:00 PM","02:00 PM","03:00 PM",
  "04:00 PM","05:00 PM","06:00 PM",]

export function createEmptyGveEntry(
  time: string,
  idSuffix: number,
): GveHourlyEntry {
  return {
    id: `entry-${Date.now()}-${idSuffix}`,
    time,
    pv: { volt: "", curr: "", power: "", energy: "" },
    battery: { volt: "", curr: "", soc: "", soh: "" },
    load: {
      l1_v: "",
      l1_a: "",
      l2_v: "",
      l2_c: "",
      l3_v: "",
      l3_c: "",
      power: "",
      energy: "",
    },
    grid: {
      l1_v: "", l1_a: "",
      l2_v: "", l2_c: "",
      l3_v: "", l3_c: "",
      power: "",
      energy: "",
    },
    spd: { in: "GOOD", out: "GOOD" },
    cooling: { ac1: "ON", ac2: "ON" },
    operatorName: "",
    operatorSignature: "",
  }
}
