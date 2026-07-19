import { describe, expect, it } from "vitest"

import { cyclesForTask, isLongBreak } from "@/lib/pomodoro"

describe("cyclesForTask", () => {
  it("rounds the final partial interval up", () => {
    expect(cyclesForTask(50, 25)).toBe(2) // exact
    expect(cyclesForTask(60, 25)).toBe(3) // 2.4 → 3
    expect(cyclesForTask(10, 25)).toBe(1) // less than one interval
  })

  it("always returns at least one cycle", () => {
    expect(cyclesForTask(0, 25)).toBe(1)
    expect(cyclesForTask(-5, 25)).toBe(1)
  })

  it("guards against a zero/negative work interval", () => {
    expect(cyclesForTask(50, 0)).toBe(50)
  })
})

describe("isLongBreak", () => {
  it("triggers every Nth completed work interval", () => {
    expect(isLongBreak(4, 4)).toBe(true)
    expect(isLongBreak(8, 4)).toBe(true)
    expect(isLongBreak(1, 4)).toBe(false)
    expect(isLongBreak(3, 4)).toBe(false)
  })

  it("is never a long break before any work is done", () => {
    expect(isLongBreak(0, 4)).toBe(false)
  })
})
