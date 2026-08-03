"use client"

import { useState } from "react"
import Link from "next/link"
import { cn } from "@workspace/ui/lib/utils"

import { formatDuration } from "@/lib/pace"
import { NudgeButton } from "@/components/nudge-button"
import {
  LEADERBOARD_METRICS,
  rankBy,
  shouldNudgeFriends,
  type LeaderboardMetric,
  type LeaderboardRow,
} from "@/lib/leaderboard-shared"

type Board = "community" | "friends"

function medal(rank: number): string | null {
  return rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null
}

function cellValue(row: LeaderboardRow, metric: LeaderboardMetric): string {
  switch (metric) {
    case "videos":
      return String(row.videosCompleted)
    case "streak":
      return `${row.currentStreak}d`
    case "playlists":
      return String(row.playlistsCompleted)
    case "watch":
      return formatDuration(row.watchSeconds)
  }
}

export function LeaderboardTable({
  community,
  friends,
  followedCount,
}: {
  community: LeaderboardRow[]
  friends: LeaderboardRow[]
  followedCount: number
}) {
  const [board, setBoard] = useState<Board>("community")
  const [metric, setMetric] = useState<LeaderboardMetric>("videos")

  const nudgeFriends = board === "friends" && shouldNudgeFriends(followedCount)
  const rows = board === "friends" ? friends : community
  const ranked = rankBy(rows, metric)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {(["community", "friends"] as const).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => setBoard(b)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              board === b
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-secondary",
            )}
          >
            {b}
          </button>
        ))}
      </div>

      {nudgeFriends && (
        <div className="border-border bg-card text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
          Follow at least two people to see a friends ranking. Find learners on the Community
          board and open their profile to follow them.
        </div>
      )}

      {ranked.length === 0 ? (
        <div className="border-border bg-card text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">
          {board === "friends"
            ? "None of the people you follow are on the board yet."
            : "No one's on the board yet. Complete a video to claim the first spot."}
        </div>
      ) : (
        <>
      <div className="flex flex-wrap gap-2">
        {LEADERBOARD_METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={cn(
              "border-border rounded-lg border px-3 py-1.5 text-sm transition-colors",
              metric === m.key
                ? "border-primary bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-secondary",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-border text-muted-foreground border-b text-xs">
              <th className="w-14 px-4 py-2.5 text-left font-medium">#</th>
              <th className="px-4 py-2.5 text-left font-medium">Learner</th>
              {LEADERBOARD_METRICS.map((m) => (
                <th
                  key={m.key}
                  className={cn(
                    "px-4 py-2.5 text-right font-medium whitespace-nowrap",
                    metric === m.key && "text-foreground",
                  )}
                >
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => {
              const rank = i + 1
              return (
                <tr
                  key={row.userId}
                  className={cn(
                    "border-border/60 border-b last:border-b-0",
                    row.isCurrentUser && "bg-primary/5",
                  )}
                >
                  <td className="text-muted-foreground px-4 py-3 font-mono">
                    {medal(rank) ?? rank}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/u/${row.username ?? row.userId}`}
                      className="font-medium hover:underline"
                    >
                      {row.displayName}
                    </Link>
                    {row.isCurrentUser && (
                      <span className="bg-primary/15 text-primary ml-2 rounded px-1.5 py-0.5 text-xs">
                        You
                      </span>
                    )}
                    {board === "friends" && !row.isCurrentUser && (
                      <span className="ml-2 inline-block align-middle">
                        <NudgeButton toUserId={row.userId} variant="ghost" />
                      </span>
                    )}
                  </td>
                  {LEADERBOARD_METRICS.map((m) => (
                    <td
                      key={m.key}
                      className={cn(
                        "px-4 py-3 text-right font-mono whitespace-nowrap",
                        metric === m.key
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground",
                      )}
                    >
                      {cellValue(row, m.key)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
        </>
      )}
    </div>
  )
}
