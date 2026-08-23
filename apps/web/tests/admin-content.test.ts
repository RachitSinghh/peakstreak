import "./env-bootstrap"

import { describe, expect, it } from "vitest"

import { completionRate } from "@/lib/admin-content"

describe("completionRate", () => {
  it("returns 0 when nobody is enrolled", () => {
    expect(completionRate(0, 0)).toBe(0)
  })
  it("returns 0 when enrolled but none completed", () => {
    expect(completionRate(0, 5)).toBe(0)
  })
  it("returns 100 when everyone completed", () => {
    expect(completionRate(5, 5)).toBe(100)
  })
  it("rounds to the nearest percent", () => {
    expect(completionRate(1, 3)).toBe(33)
  })
})
