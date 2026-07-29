import { describe, expect, it } from "vitest"

import {
  addDays,
  daysBetween,
  isoDayOfWeek,
  isValidDateString,
  localDateString,
  localHour,
  timeAgo,
  weekStart,
} from "@/lib/dates"

describe("localDateString", () => {
  it("computes the IST local date across the midnight boundary", () => {
    // 2026-07-04 18:45 UTC = 2026-07-05 00:15 IST → different calendar days
    const instant = new Date("2026-07-04T18:45:00Z")
    expect(localDateString(instant, "Asia/Kolkata")).toBe("2026-07-05")
    expect(localDateString(instant, "UTC")).toBe("2026-07-04")
  })

  it("handles western timezones on the other side of UTC", () => {
    // 2026-07-05 02:00 UTC = 2026-07-04 19:00 in Los Angeles (PDT)
    const instant = new Date("2026-07-05T02:00:00Z")
    expect(localDateString(instant, "America/Los_Angeles")).toBe("2026-07-04")
  })
})

describe("localHour", () => {
  it("returns the local hour including half-hour offsets", () => {
    // 13:30 UTC = 19:00 IST (+5:30)
    expect(localHour(new Date("2026-07-05T13:30:00Z"), "Asia/Kolkata")).toBe(19)
    expect(localHour(new Date("2026-07-05T13:30:00Z"), "UTC")).toBe(13)
  })

  it("uses 0 for midnight, not 24", () => {
    expect(localHour(new Date("2026-07-05T00:30:00Z"), "UTC")).toBe(0)
  })
})

describe("date-string arithmetic", () => {
  it("adds days across months and years", () => {
    expect(addDays("2026-07-05", 1)).toBe("2026-07-06")
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28")
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29") // leap year
  })

  it("computes signed day differences", () => {
    expect(daysBetween("2026-07-01", "2026-07-05")).toBe(4)
    expect(daysBetween("2026-07-05", "2026-07-01")).toBe(-4)
    expect(daysBetween("2026-07-05", "2026-07-05")).toBe(0)
  })

  it("knows weekdays and week starts (Monday-based)", () => {
    expect(isoDayOfWeek("2026-07-05")).toBe(7) // a Sunday
    expect(isoDayOfWeek("2026-07-06")).toBe(1) // a Monday
    expect(weekStart("2026-07-05")).toBe("2026-06-29")
    expect(weekStart("2026-07-06")).toBe("2026-07-06")
    expect(weekStart("2026-07-12")).toBe("2026-07-06")
  })

  it("validates date strings strictly", () => {
    expect(isValidDateString("2026-07-05")).toBe(true)
    expect(isValidDateString("2026-02-30")).toBe(false)
    expect(isValidDateString("2026-7-5")).toBe(false)
    expect(isValidDateString("garbage")).toBe(false)
  })
})

describe("timeAgo", () => {
  const now = new Date("2026-07-30T12:00:00Z")
  it("formats each bucket", () => {
    expect(timeAgo(new Date("2026-07-30T11:59:30Z"), now)).toBe("just now")
    expect(timeAgo(new Date("2026-07-30T11:55:00Z"), now)).toBe("5m ago")
    expect(timeAgo(new Date("2026-07-30T09:00:00Z"), now)).toBe("3h ago")
    expect(timeAgo(new Date("2026-07-27T12:00:00Z"), now)).toBe("3d ago")
    expect(timeAgo(new Date("2026-07-09T12:00:00Z"), now)).toBe("3w ago")
    expect(timeAgo(new Date("2026-05-01T12:00:00Z"), now)).toBe("3mo ago")
  })
  it("never goes negative for a future instant", () => {
    expect(timeAgo(new Date("2026-07-30T12:01:00Z"), now)).toBe("just now")
  })
})
