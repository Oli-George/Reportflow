import { describe, it, expect } from "vitest"

export interface EnvConfig {
  VITE_SUPABASE_URL?: string
  VITE_SUPABASE_ANON_KEY?: string
  MODE?: string
}

export function validateEnvironment(
  env: EnvConfig,
): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const url = (env.VITE_SUPABASE_URL || "").trim()
  const key = (env.VITE_SUPABASE_ANON_KEY || "").trim()
  const isProduction = env.MODE === "production"

  if (!url) {
    errors.push("Missing VITE_SUPABASE_URL")
  } else {
    try {
      const parsed = new URL(url)
      if (isProduction && parsed.protocol !== "https:") {
        errors.push("VITE_SUPABASE_URL must use https: protocol in production")
      }
    } catch {
      errors.push("Invalid VITE_SUPABASE_URL format")
    }

    if (
      url.includes("your-project-id") ||
      url.includes("placeholder.supabase.co")
    ) {
      errors.push("VITE_SUPABASE_URL contains placeholder value")
    }
  }

  if (!key) {
    errors.push("Missing VITE_SUPABASE_ANON_KEY")
  } else if (key.length < 20 || key.includes("your-anon-publishable-key")) {
    errors.push("VITE_SUPABASE_ANON_KEY is placeholder or malformed")
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

describe("Environment & Production Safety Validation", () => {
  it("passes when valid production Supabase credentials are provided", () => {
    const validConfig: EnvConfig = {
      VITE_SUPABASE_URL: "https://eicwskdmbxbsgdvioxut.supabase.co",
      VITE_SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIn0.mockSignature1234567890",
      MODE: "production",
    }

    const result = validateEnvironment(validConfig)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("fails and flags placeholder URL in production", () => {
    const placeholderConfig: EnvConfig = {
      VITE_SUPABASE_URL: "https://your-project-id.supabase.co",
      VITE_SUPABASE_ANON_KEY: "valid-key-length-exceeds-twenty-chars",
      MODE: "production",
    }

    const result = validateEnvironment(placeholderConfig)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(
      "VITE_SUPABASE_URL contains placeholder value",
    )
  })

  it("fails if VITE_SUPABASE_URL is not HTTPS in production", () => {
    const insecureConfig: EnvConfig = {
      VITE_SUPABASE_URL: "http://my-supabase-instance.gve-group.com",
      VITE_SUPABASE_ANON_KEY: "valid-key-length-exceeds-twenty-chars",
      MODE: "production",
    }

    const result = validateEnvironment(insecureConfig)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(
      "VITE_SUPABASE_URL must use https: protocol in production",
    )
  })

  it("fails if VITE_SUPABASE_ANON_KEY is missing or placeholder", () => {
    const missingKeyConfig: EnvConfig = {
      VITE_SUPABASE_URL: "https://eicwskdmbxbsgdvioxut.supabase.co",
      VITE_SUPABASE_ANON_KEY: "",
      MODE: "production",
    }

    const result = validateEnvironment(missingKeyConfig)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain("Missing VITE_SUPABASE_ANON_KEY")
  })
})
