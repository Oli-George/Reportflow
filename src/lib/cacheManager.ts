/**
 * ReportFlow Cache Envelope & SWR Manager
 * Ensures offline-first capability while maintaining backend data integrity.
 */

export interface CacheEnvelope<T> {
  data: T
  cachedAt: number // Timestamp ms
  ttlMs: number // Time to live in ms
  version: number // Schema version
}

export const CACHE_KEYS = {
  MEMBERS: "reportflow_cached_members_v2",
  DEADLINES: "reportflow_cached_deadlines_v2",
  USER_SESSION: "reportflow_user_session_v2",
} as const

export const CACHE_TTLS = {
  MEMBERS: 10 * 60 * 1000, // 10 minutes
  DEADLINES: 5 * 60 * 1000, // 5 minutes
  USER_SESSION: 24 * 60 * 60 * 1000, // 24 hours
} as const

export function setCachedWithTTL<T>(
  key: string,
  data: T,
  ttlMs: number,
  version: number = 1,
): void {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    const envelope: CacheEnvelope<T> = {
      data,
      cachedAt: Date.now(),
      ttlMs,
      version,
    }
    localStorage.setItem(key, JSON.stringify(envelope))
  } catch (e) {
    console.warn(`Failed to write cache for key "${key}":`, e)
  }
}

export function getCachedWithTTL<T>(
  key: string,
  expectedVersion: number = 1,
): { data: T | null isStale: boolean exists: boolean } {
  if (typeof window === "undefined" || !window.localStorage) {
    return { data: null, isStale: true, exists: false }
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { data: null, isStale: true, exists: false }

    const envelope: CacheEnvelope<T> = JSON.parse(raw)
    if (
      !envelope ||
      typeof envelope !== "object" ||
      envelope.version !== expectedVersion
    ) {
      localStorage.removeItem(key)
      return { data: null, isStale: true, exists: false }
    }

    const age = Date.now() - (envelope.cachedAt || 0)
    const isStale = age > (envelope.ttlMs || 0)
    return { data: envelope.data, isStale, exists: true }
  } catch (e) {
    console.warn(`Failed to read cache for key "${key}":`, e)
    return { data: null, isStale: true, exists: false }
  }
}

export function invalidateCache(key: string): void {
  if (typeof window === "undefined" || !window.localStorage) return
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.warn(`Failed to invalidate cache for key "${key}":`, e)
  }
}
