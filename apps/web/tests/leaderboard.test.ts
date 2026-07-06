import { describe, expect, it } from "vitest"

import { rankBy, resolveDisplayName, type LeaderboardRow } from "@/lib/leaderboard-shared"

function row(over: Partial<LeaderboardRow> & { userId: string }): LeaderboardRow {
  return {
    displayName: over.userId,
    videosCompleted: 0,
    playlistsCompleted: 0,
    watchSeconds: 0,
    currentStreak: 0,
    isCurrentUser: false,
    ...over,
  }
}

describe("resolveDisplayName (pure)", () => {
  it("prefers an explicit display name", () => {
    expect(resolveDisplayName("Ada", "Ada Lovelace", "abcd1234")).toBe("Ada")
  })

  it("falls back to the first name when no display name is set", () => {
    expect(resolveDisplayName(null, "Ada Lovelace", "abcd1234")).toBe("Ada")
    expect(resolveDisplayName("   ", "Grace Hopper", "abcd1234")).toBe("Grace")
  })

  it("falls back to an anonymous label when there is no name at all", () => {
    expect(resolveDisplayName(null, null, "abcd1234-xyz")).toBe("Learner #abcd")
    expect(resolveDisplayName("", "  ", "ef567890")).toBe("Learner #ef56")
  })
})

describe("rankBy (pure)", () => {
  const rows = [
    row({ userId: "a", displayName: "A", videosCompleted: 5, currentStreak: 2, watchSeconds: 100 }),
    row({ userId: "b", displayName: "B", videosCompleted: 9, currentStreak: 1, watchSeconds: 50 }),
    row({ userId: "c", displayName: "C", videosCompleted: 5, currentStreak: 7, watchSeconds: 300 }),
  ]

  it("ranks by the chosen metric, highest first", () => {
    expect(rankBy(rows, "videos").map((r) => r.userId)).toEqual(["b", "a", "c"])
    expect(rankBy(rows, "streak").map((r) => r.userId)).toEqual(["c", "a", "b"])
    expect(rankBy(rows, "watch").map((r) => r.userId)).toEqual(["c", "a", "b"])
  })

  it("breaks ties deterministically by display name", () => {
    // a and c both have 5 videos → alphabetical by display name.
    expect(rankBy(rows, "videos").map((r) => r.userId)).toEqual(["b", "a", "c"])
  })

  it("does not mutate the input array", () => {
    const before = rows.map((r) => r.userId)
    rankBy(rows, "streak")
    expect(rows.map((r) => r.userId)).toEqual(before)
  })
})
