import { describe, expect, it } from "vitest"

import { envBool } from "@/lib/env"

// Guards the USE_RESEND / SMTP_SECURE toggles against the z.coerce.boolean()
// trap, where the string "false" coerces to `true` (any non-empty string does).
describe("envBool", () => {
  it("parses the literal strings", () => {
    expect(envBool.parse("true")).toBe(true)
    expect(envBool.parse("false")).toBe(false)
  })

  it("rejects anything else instead of silently defaulting", () => {
    expect(() => envBool.parse("yes")).toThrow()
    expect(() => envBool.parse("1")).toThrow()
    expect(() => envBool.parse("")).toThrow()
  })
})
