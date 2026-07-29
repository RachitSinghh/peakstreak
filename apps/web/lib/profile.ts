import { and, eq, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { addDays, localDateString } from "@/lib/dates"
import { resolveDisplayName } from "@/lib/leaderboard-shared"
import { computeStreaks } from "@/lib/streaks"
import type { GraphDay } from "@/components/contribution-graph"

export interface PublicProfile {
  username: string
  displayName: string
  bio: string | null
  image: string | null
  currentStreak: number
  longestStreak: number
  playlistsCompleted: number
  totalWatchSeconds: number
  activityDays: GraphDay[]
  today: string
}

/**
 * SOC-01: read-only public profile for `/u/:username`. Returns null when the
 * username is unknown OR the profile is private — the caller renders one
 * "not found" state either way, so a private profile leaks nothing (not even
 * its existence) to logged-out visitors. Stats reuse the same source-of-truth
 * paths as the dashboard/leaderboard; no counters are forked.
 */
export async function getPublicProfile(
  username: string,
  now: Date = new Date(),
): Promise<PublicProfile | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.username, username.trim().toLowerCase()),
  })
  if (!user || user.profileVisibility !== "public") return null

  const today = localDateString(now, user.timezone)

  const [activityRows, playlistsRow, watchRow] = await Promise.all([
    // 400 days covers the year heatmap and any realistic current/longest run.
    db
      .select({
        activityDate: schema.dailyActivity.activityDate,
        videosCompleted: schema.dailyActivity.videosCompleted,
        isFrozen: schema.dailyActivity.isFrozen,
        secondsWatched: schema.dailyActivity.secondsWatched,
      })
      .from(schema.dailyActivity)
      .where(
        and(
          eq(schema.dailyActivity.userId, user.id),
          sql`${schema.dailyActivity.activityDate} >= ${addDays(today, -400)}`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.userPlaylists)
      .where(
        and(
          eq(schema.userPlaylists.userId, user.id),
          eq(schema.userPlaylists.status, "completed"),
        ),
      ),
    // All-time learning hours: sum every activity row, not just the window.
    db
      .select({ seconds: sql<number>`coalesce(sum(${schema.dailyActivity.secondsWatched}), 0)::int` })
      .from(schema.dailyActivity)
      .where(eq(schema.dailyActivity.userId, user.id)),
  ])

  const streak = computeStreaks(activityRows, today)

  return {
    username: user.username!,
    displayName: resolveDisplayName(user.displayName, user.name, user.id),
    bio: user.bio,
    image: user.image,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    playlistsCompleted: playlistsRow[0]?.count ?? 0,
    totalWatchSeconds: watchRow[0]?.seconds ?? 0,
    activityDays: activityRows,
    today,
  }
}
