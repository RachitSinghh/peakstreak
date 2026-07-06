/**
 * Pure, database-free leaderboard helpers and types. Kept separate from
 * `lib/leaderboard.ts` (which imports `db`) so the client table component can
 * reuse the ranking logic and metric list without bundling server code.
 */

export type LeaderboardMetric = "videos" | "streak" | "playlists" | "watch"

export interface LeaderboardRow {
  userId: string
  displayName: string
  videosCompleted: number
  playlistsCompleted: number
  watchSeconds: number
  currentStreak: number
  isCurrentUser: boolean
}

export const LEADERBOARD_METRICS: ReadonlyArray<{
  key: LeaderboardMetric
  label: string
  field: keyof Pick<
    LeaderboardRow,
    "videosCompleted" | "currentStreak" | "playlistsCompleted" | "watchSeconds"
  >
}> = [
  { key: "videos", label: "Videos completed", field: "videosCompleted" },
  { key: "streak", label: "Current streak", field: "currentStreak" },
  { key: "playlists", label: "Playlists completed", field: "playlistsCompleted" },
  { key: "watch", label: "Watch time", field: "watchSeconds" },
]

/**
 * Public label for a leaderboard row: the chosen display name, else the
 * first name, else an anonymous "Learner #abcd". Never the email.
 */
export function resolveDisplayName(
  displayName: string | null,
  name: string | null,
  userId: string,
): string {
  const chosen = displayName?.trim()
  if (chosen) return chosen
  const first = name?.trim().split(/\s+/)[0]
  if (first) return first
  return `Learner #${userId.slice(0, 4)}`
}

/** Sort a copy of the rows by the given metric, highest first. */
export function rankBy(rows: LeaderboardRow[], metric: LeaderboardMetric): LeaderboardRow[] {
  const field = LEADERBOARD_METRICS.find((m) => m.key === metric)!.field
  // Stable tiebreak on display name keeps ordering deterministic across renders.
  return [...rows].sort(
    (a, b) => b[field] - a[field] || a.displayName.localeCompare(b.displayName),
  )
}
