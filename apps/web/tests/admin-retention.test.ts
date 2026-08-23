import "./env-bootstrap"

import { describe, expect, it } from "vitest"

import { retentionWindows } from "@/lib/admin-retention"

describe("retentionWindows", () => {
  it("excludes signup day (day 0)", () => {
    expect(retentionWindows(0)).toEqual([])
  })
  it("day 1 counts toward all three windows", () => {
    expect(retentionWindows(1)).toEqual(["d1", "d7", "d30"])
  })
  it("day 7 counts toward d7 and d30 but not d1", () => {
    expect(retentionWindows(7)).toEqual(["d7", "d30"])
  })
  it("day 8 counts only toward d30", () => {
    expect(retentionWindows(8)).toEqual(["d30"])
  })
  it("day 30 still counts toward d30", () => {
    expect(retentionWindows(30)).toEqual(["d30"])
  })
  it("day 31 counts toward nothing", () => {
    expect(retentionWindows(31)).toEqual([])
  })
})
