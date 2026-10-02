import { useState, useEffect, useCallback } from "react"

import { SUPABASE_URL } from "./supabase"

const STORAGE_KEY_TIME_CALIBRATION = "reportflow_server_time_calibration"

interface TimeCalibration {
  serverAnchorMs: number

  perfAnchorMs: number

  deviceAnchorMs: number

  calibratedAt: string
}

let cachedCalibration: TimeCalibration | null = null

// Initialize cached calibration from localStorage if available

try {
  const saved = localStorage.getItem(STORAGE_KEY_TIME_CALIBRATION)

  if (saved) {
    cachedCalibration = JSON.parse(saved)
  }
} catch (e) {
  console.warn("Failed to load saved time calibration", e)
}

/**
 * Fetch trusted server time from Supabase or fallback HTTP endpoints
 */

export async function syncServerTime(): Promise<{
  serverTime: Date

  offsetMs: number

  source: "supabase" | "fallback" | "cached" | "device"
}> {
  const perfNow = performance.now()

  const deviceNow = Date.now()

  // 1. Try Supabase REST endpoint

  if (SUPABASE_URL && navigator.onLine) {
    try {
      const controller = new AbortController()

      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: "HEAD",

        signal: controller.signal,

        headers: {
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
      })

      clearTimeout(timeoutId)

      const dateHeader = res.headers.get("date")

      if (dateHeader) {
        const serverMs = new Date(dateHeader).getTime()

        const calibration: TimeCalibration = {
          serverAnchorMs: serverMs,

          perfAnchorMs: perfNow,

          deviceAnchorMs: deviceNow,

          calibratedAt: new Date().toISOString(),
        }

        cachedCalibration = calibration

        try {
          localStorage.setItem(
            STORAGE_KEY_TIME_CALIBRATION,

            JSON.stringify(calibration),
          )
        } catch (e) {
          /* ignore storage errors */
        }

        return {
          serverTime: new Date(serverMs),

          offsetMs: serverMs - deviceNow,

          source: "supabase",
        }
      }
    } catch (err) {
      console.warn(
        "Supabase time sync failed, trying fallback time API...",

        err,
      )
    }
  }

  // 2. Try public fallback time API if online

  if (navigator.onLine) {
    try {
      const controller = new AbortController()

      const timeoutId = setTimeout(() => controller.abort(), 3500)

      const res = await fetch("https://worldtimeapi.org/api/timezone/Etc/UTC", {
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await res.json()

      if (data && data.unixtime) {
        const serverMs = data.unixtime * 1000

        const calibration: TimeCalibration = {
          serverAnchorMs: serverMs,

          perfAnchorMs: perfNow,

          deviceAnchorMs: deviceNow,

          calibratedAt: new Date().toISOString(),
        }

        cachedCalibration = calibration

        try {
          localStorage.setItem(
            STORAGE_KEY_TIME_CALIBRATION,

            JSON.stringify(calibration),
          )
        } catch (e) {
          /* ignore */
        }

        return {
          serverTime: new Date(serverMs),

          offsetMs: serverMs - deviceNow,

          source: "fallback",
        }
      }
    } catch (err) {
      console.warn("Fallback time API unreachable", err)
    }
  }

  // 3. If offline or failed, use previous cached calibration + monotonic performance.now()

  if (cachedCalibration) {
    const elapsedSinceCalibration = perfNow - cachedCalibration.perfAnchorMs

    const computedServerMs =
      cachedCalibration.serverAnchorMs + elapsedSinceCalibration

    return {
      serverTime: new Date(computedServerMs),

      offsetMs: computedServerMs - deviceNow,

      source: "cached",
    }
  }

  // 4. Default to local device time if no calibration ever existed

  return {
    serverTime: new Date(deviceNow),

    offsetMs: 0,

    source: "device",
  }
}

/**
 * Get current trusted time calculating monotonic delta from anchor
 */

export function getTrustedTime(): {
  now: Date

  isTampered: boolean

  isOffline: boolean

  source: "supabase" | "fallback" | "cached" | "device"
} {
  const isOffline = !navigator.onLine

  const perfNow = performance.now()

  const deviceNow = Date.now()

  if (cachedCalibration) {
    const elapsed = perfNow - cachedCalibration.perfAnchorMs

    const trustedMs = cachedCalibration.serverAnchorMs + elapsed

    // Tamper detection: check if device clock drifted sharply compared to monotonic elapsed

    const expectedDeviceMs = cachedCalibration.deviceAnchorMs + elapsed

    const deviceDriftMs = Math.abs(deviceNow - expectedDeviceMs)

    const isTampered = deviceDriftMs > 90 * 1000 // > 90 seconds drift

    return {
      now: new Date(trustedMs),

      isTampered,

      isOffline,

      source: isOffline ? "cached" : "supabase",
    }
  }

  return {
    now: new Date(deviceNow),

    isTampered: false,

    isOffline,

    source: "device",
  }
}

/**
 * Parses time strings like "06:00 AM", "01:00 PM" into 24-hour hour & minute
 */

export function parse12HourTime(
  timeStr: string,
): { hour24: number minute: number } {
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)

  if (!match) {
    return { hour24: 0, minute: 0 }
  }

  let hour = parseInt(match[1], 10)

  const minute = parseInt(match[2], 10)

  const meridiem = (match[3] || "AM").toUpperCase()

  if (meridiem === "PM" && hour < 12) {
    hour += 12
  } else if (meridiem === "AM" && hour === 12) {
    hour = 0
  }

  return { hour24: hour, minute }
}

export type SlotStatus = "ACTIVE" | "UPCOMING" | "LOCKED_RECORDED" | "EXPIRED_MISSED" | "HISTORICAL" | "ADMIN_UNLOCKED" // Currently in the 15-minute window for this hour (editable) // Hour has not yet arrived (locked/hidden) // Window passed, data was recorded (locked for audit compliance) // Window passed without entry (locked & marked missed) // Viewing a past completed/submitted report // Manually unlocked via admin override

export interface SlotStatusInfo {
  status: SlotStatus

  secondsRemainingInWindow: number

  secondsUntilUnlock: number

  isEditable: boolean

  statusLabel: string
}

/**
 * Checks whether an hourly entry has any filled field
 */

export function hasEntryData(entry: any): boolean {
  if (!entry) return false

  const fields = [
    // Solar PV

    entry.pv?.volt,

    entry.pv?.curr,

    entry.pv?.power,

    entry.pv?.energy,

    // Battery Storage

    entry.battery?.volt,

    entry.battery?.curr,

    entry.battery?.soc,

    entry.battery?.soh,

    // Site Load (All 3 Phases + Power & Energy)

    entry.load?.l1_v,

    entry.load?.l1_a,

    entry.load?.l2_v,

    entry.load?.l2_c,

    entry.load?.l3_v,

    entry.load?.l3_c,

    entry.load?.power,

    entry.load?.energy,

    // Grid (All 3 Phases + Power & Energy)

    entry.grid?.l1_v,

    entry.grid?.l1_a,

    entry.grid?.l2_v,

    entry.grid?.l2_c,

    entry.grid?.l3_v,

    entry.grid?.l3_c,

    entry.grid?.power,

    entry.grid?.energy,

    // Operator

    entry.operatorName,

    entry.operatorSignature,
  ]

  return fields.some((f) => {
    if (f === undefined || f === null) return false

    const str = f.toString().trim()

    return str !== "" && str !== "—"
  })
}

/**
 * Evaluate the exact status of an hourly entry slot
 */

export function getHourlySlotStatus(
  slotTimeStr: string,

  currentTime: Date,

  reportDateStr: string,

  options: {
    readOnly?: boolean

    adminOverride?: boolean

    hasData?: boolean

    isDraftEdit?: boolean
  } = {},
): SlotStatusInfo {
  const {
    readOnly = false,

    adminOverride = false,

    hasData = false,

    isDraftEdit = false,
  } = options

  // In read-only mode or historical audit view, existing rows are always visible

  if (readOnly) {
    return {
      status: "HISTORICAL",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock: 0,

      isEditable: false,

      statusLabel: hasData ? "Recorded Log" : "No Data",
    }
  }

  // Admin override explicitly unlocks all rows

  if (adminOverride) {
    return {
      status: "ADMIN_UNLOCKED",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock: 0,

      isEditable: true,

      statusLabel: "Admin Unlocked",
    }
  }

  // Draft Edit mode: Allow author to review, complete, and update recorded rows before final submission

  if (isDraftEdit) {
    return {
      status: hasData ? "ACTIVE" : "ACTIVE",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock: 0,

      isEditable: true,

      statusLabel: hasData ? "Draft (Recorded)" : "Draft (Open)",
    }
  }

  const { hour24, minute } = parse12HourTime(slotTimeStr)

  // Compare report date with current trusted date

  const nowYear = currentTime.getFullYear()

  const nowMonth = String(currentTime.getMonth() + 1).padStart(2, "0")

  const nowDate = String(currentTime.getDate()).padStart(2, "0")

  const todayStr = `${nowYear}-${nowMonth}-${nowDate}`

  const isPastDay = reportDateStr < todayStr

  const isFutureDay = reportDateStr > todayStr

  // If report is for a past date and not in readOnly, lock all rows unless admin override

  if (isPastDay) {
    return {
      status: hasData ? "LOCKED_RECORDED" : "EXPIRED_MISSED",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock: 0,

      isEditable: false,

      statusLabel: hasData
        ? "Recorded (Past Date)"
        : "Window Expired (Past Date)",
    }
  }

  // If report is for a future date, all rows are upcoming

  if (isFutureDay) {
    return {
      status: "UPCOMING",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock: 86400,

      isEditable: false,

      statusLabel: "Upcoming (Future Date)",
    }
  }

  // TODAY: Calculate exact second thresholds

  const currentHour = currentTime.getHours()

  const currentMinute = currentTime.getMinutes()

  const currentSecond = currentTime.getSeconds()

  const currentDaySeconds =
    currentHour * 3600 + currentMinute * 60 + currentSecond

  const slotStartSeconds = hour24 * 3600 + minute * 60

  const slotWindowDuration = 15 * 60 // 15 minutes = 900 seconds

  const slotEndSeconds = slotStartSeconds + slotWindowDuration

  // Case 1: Slot has not yet arrived (Future hour today)

  if (currentDaySeconds < slotStartSeconds) {
    const secondsUntilUnlock = slotStartSeconds - currentDaySeconds

    return {
      status: "UPCOMING",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock,

      isEditable: false,

      statusLabel: `Unlocks at ${slotTimeStr}`,
    }
  }

  // Case 2: Currently within the 15-minute leniency window (:00 to :15)

  if (
    currentDaySeconds >= slotStartSeconds &&
    currentDaySeconds <= slotEndSeconds
  ) {
    const secondsRemainingInWindow = slotEndSeconds - currentDaySeconds

    const mins = Math.floor(secondsRemainingInWindow / 60)

    const secs = secondsRemainingInWindow % 60

    const timeRemainingStr = `${mins}m ${secs.toString().padStart(2, "0")}s`

    return {
      status: "ACTIVE",

      secondsRemainingInWindow,

      secondsUntilUnlock: 0,

      isEditable: true,

      statusLabel: `Active Window (${timeRemainingStr} left)`,
    }
  }

  // Case 3: Window has passed (after :15)

  if (hasData) {
    return {
      status: "LOCKED_RECORDED",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock: 0,

      isEditable: false,

      statusLabel: "Recorded & Locked",
    }
  } else {
    return {
      status: "EXPIRED_MISSED",

      secondsRemainingInWindow: 0,

      secondsUntilUnlock: 0,

      isEditable: false,

      statusLabel: "Window Missed (Closed at :15)",
    }
  }
}

/**
 * React Hook for live tamper-protected server time
 */

export function useServerTime() {
  const [trustedState, setTrustedState] = useState(() => getTrustedTime())

  const [syncStatus, setSyncStatus] =
    useState<"synced" | "syncing" | "cached" | "offline" | "device">(
      !navigator.onLine ? "offline" : "syncing",
    )

  const refreshTime = useCallback(async () => {
    try {
      const res = await syncServerTime()

      setTrustedState(getTrustedTime())

      if (res.source === "supabase" || res.source === "fallback") {
        setSyncStatus("synced")
      } else if (res.source === "cached") {
        setSyncStatus("cached")
      } else {
        setSyncStatus("device")
      }
    } catch (e) {
      setSyncStatus(!navigator.onLine ? "offline" : "cached")
    }
  }, [])

  // Initial sync on mount

  useEffect(() => {
    refreshTime()

    const handleOnline = () => {
      refreshTime()
    }

    const handleOffline = () => {
      setSyncStatus("offline")

      setTrustedState(getTrustedTime())
    }

    window.addEventListener("online", handleOnline)

    window.addEventListener("offline", handleOffline)

    // Periodic tick every second for real-time countdown

    const interval = setInterval(() => {
      setTrustedState(getTrustedTime())
    }, 1000)

    // Background server resync every 3 minutes if online

    const resyncInterval = setInterval(() => {
      if (navigator.onLine) {
        refreshTime()
      }
    }, 180000)

    return () => {
      clearInterval(interval)

      clearInterval(resyncInterval)

      window.removeEventListener("online", handleOnline)

      window.removeEventListener("offline", handleOffline)
    }
  }, [refreshTime])

  return {
    currentTime: trustedState.now,

    isTampered: trustedState.isTampered,

    isOffline: trustedState.isOffline,

    syncSource: trustedState.source,

    syncStatus,

    refreshServerTime: refreshTime,
  }
}
