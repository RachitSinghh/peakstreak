import { describe, expect, it } from "vitest"

import { validateUsername } from "@/lib/username"

describe("validateUsername", () => {
  it("accepts and normalizes a valid handle", () => {
    expect(validateUsername("  RachitS ")).toEqual({ ok: true, value: "rachits" })
    expect(validateUsername("a-b-1")).toEqual({ ok: true, value: "a-b-1" })
  })

  it("rejects lengths outside 3–30", () => {
    expect(validateUsername("ab").ok).toBe(false)
    expect(validateUsername("a".repeat(31)).ok).toBe(false)
  })

  it("rejects illegal characters and edge hyphens", () => {
    expect(validateUsername("has space").ok).toBe(false)
    expect(validateUsername("under_score").ok).toBe(false)
    expect(validateUsername("-lead").ok).toBe(false)
    expect(validateUsername("trail-").ok).toBe(false)
  })

  it("rejects reserved route words", () => {
    expect(validateUsername("admin").ok).toBe(false)
    expect(validateUsername("settings").ok).toBe(false)
  })
})
