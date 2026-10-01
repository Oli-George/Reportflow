import { describe, it, expect, vi, beforeEach } from "vitest"
import { isValidGveEmail } from "../lib/supabase"

describe("Authentication & Role Authorization Safety", () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  describe("GVE Corporate Email Domain Enforcement", () => {
    it("accepts valid corporate GVE email addresses", () => {
      expect(isValidGveEmail("field.engineer@gve-group.com")).toBe(true)
      expect(isValidGveEmail("info@gve-group.com")).toBe(true)
      expect(isValidGveEmail("lead.tech@GVE-GROUP.COM")).toBe(true)
      expect(isValidGveEmail("  operations@gve-group.com  ")).toBe(true)
    })

    it("rejects unauthorized public and third-party email domains", () => {
      expect(isValidGveEmail("engineer@gmail.com")).toBe(false)
      expect(isValidGveEmail("contractor@yahoo.com")).toBe(false)
      expect(isValidGveEmail("attacker@fakegve-group.com")).toBe(false)
      expect(isValidGveEmail("user@gve-group.org")).toBe(false)
      expect(isValidGveEmail("")).toBe(false)
    })
  })

  describe("Super Admin Identification", () => {
    const isSuperAdminEmail = (email: string) => {
      return email.trim().toLowerCase() === "info@gve-group.com"
    }

    it("identifies info@gve-group.com as the unique Parent Administrator", () => {
      expect(isSuperAdminEmail("info@gve-group.com")).toBe(true)
      expect(isSuperAdminEmail("INFO@GVE-GROUP.COM")).toBe(true)
      expect(isSuperAdminEmail("staff@gve-group.com")).toBe(false)
    })
  })

  describe("Session Validation & Expiry Purging", () => {
    interface StoredSession {
      email: string
      name: string
      role: "admin" | "staff"
      isAdmin: boolean
      token: string
      expiresAt: number
    }

    const validateAndRestoreSession = (
      rawStorage: string | null,
      currentTime: number = Date.now(),
    ): StoredSession | null => {
      if (!rawStorage) return null
      try {
        const parsed = JSON.parse(rawStorage) as StoredSession
        if (!parsed.email || !parsed.token || !parsed.expiresAt) return null
        if (parsed.expiresAt <= currentTime) {
          // Token is expired; clear storage
          localStorage.removeItem("reportflow_user_session")
          return null
        }
        return parsed
      } catch {
        return null
      }
    }

    it("successfully restores a valid unexpired session", () => {
      const futureTime = Date.now() + 3600 * 1000
      const validSession: StoredSession = {
        email: "info@gve-group.com",
        name: "GVE Admin",
        role: "admin",
        isAdmin: true,
        token: "mock-valid-jwt-token",
        expiresAt: futureTime,
      }
      localStorage.setItem(
        "reportflow_user_session",
        JSON.stringify(validSession),
      )

      const restored = validateAndRestoreSession(
        localStorage.getItem("reportflow_user_session"),
      )
      expect(restored).not.toBeNull()
      expect(restored?.email).toBe("info@gve-group.com")
      expect(restored?.isAdmin).toBe(true)
    })

    it("purges session and returns null if the session token has expired", () => {
      const pastTime = Date.now() - 5000
      const expiredSession: StoredSession = {
        email: "staff@gve-group.com",
        name: "Field Tech",
        role: "staff",
        isAdmin: false,
        token: "mock-expired-jwt-token",
        expiresAt: pastTime,
      }
      localStorage.setItem(
        "reportflow_user_session",
        JSON.stringify(expiredSession),
      )

      const restored = validateAndRestoreSession(
        localStorage.getItem("reportflow_user_session"),
      )
      expect(restored).toBeNull()
      expect(localStorage.getItem("reportflow_user_session")).toBeNull()
    })
  })
})
