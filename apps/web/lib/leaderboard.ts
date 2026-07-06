import { eq, gte, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { addDays, localDateString } from "@/lib/dates"
import { resolveDisplayName, type LeaderboardRow } from "@/lib/leaderboard-shared"
import { computeStreaks, type ActivityDay } from "@/lib/streaks"

/**
 * Community leaderboard (opt-out, display-name only). Rankings are derived
 * live from the same source-of-truth tables the dashboard uses — there is
 * no stored score. Only users with `showOnLeaderboard` AND some genuine
 * activity appear; email is never exposed. Pure ranking/label helpers and
 * types live in `lib/leaderboard-shared.ts` so the client can reuse them.
 */

export interface LeaderboardData {
  rows: LeaderboardRow[]
  /** True when the signed-in user has opted out (so they aren't in `rows`). */
  currentUserHidden: boolean
}

/** A user earns a spot only once they've actually done something. */
function hasActivity(row: LeaderboardRow): boolean {
  return row.videosCompleted > 0 || row.watchSeconds > 0
}

export async function getLeaderboard(
  currentUserId: string,
  now: Date = new Date(),
): Promise<LeaderboardData> {
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      displayName: schema.users.displayName,
      timezone: schema.users.timezone,
      showOnLeaderboard: schema.users.showOnLeaderboard,
    })
    .from(schema.users)

  const currentUserHidden =
    users.find((u) => u.id === currentUserId)?.showOnLeaderboard === false

  const visible = users.filter((u) => u.showOnLeaderboard)
  if (visible.length === 0) return { rows: [], currentUserHidden }

  // Three independent aggregate sweeps, merged in JS by user id. At current
  // scale a full GROUP BY per metric is trivial; revisit if the user table
  // grows past a few thousand active learners.
  const [videoRows, playlistRows, watchRows, activityRows] = await Promise.all([
    db
      .select({
        userId: schema.userPlaylists.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.videoProgress)
      .innerJoin(
        schema.userPlaylists,
        eq(schema.videoProgress.userPlaylistId, schema.userPlaylists.id),
      )
      .where(eq(schema.videoProgress.isCompleted, true))
      .groupBy(schema.userPlaylists.userId),
    db
      .select({
        userId: schema.userPlaylists.userId,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.userPlaylists)
      .where(eq(schema.userPlaylists.status, "completed"))
      .groupBy(schema.userPlaylists.userId),
    db
      .select({
        userId: schema.dailyActivity.userId,
        seconds: sql<number>`coalesce(sum(${schema.dailyActivity.secondsWatched}), 0)::int`,
      })
      .from(schema.dailyActivity)
      .groupBy(schema.dailyActivity.userId),
    // Bounded window that covers any realistic current-streak run. Loaded for
    // everyone, then grouped per user in JS and scored with computeStreaks.
    db
      .select({
        userId: schema.dailyActivity.userId,
        activityDate: schema.dailyActivity.activityDate,
        videosCompleted: schema.dailyActivity.videosCompleted,
        isFrozen: schema.dailyActivity.isFrozen,
      })
      .from(schema.dailyActivity)
      .where(gte(schema.dailyActivity.activityDate, addDays(localDateString(now, "UTC"), -401))),
  ])

  const videosBy = new Map(videoRows.map((r) => [r.userId, r.count]))
  const playlistsBy = new Map(playlistRows.map((r) => [r.userId, r.count]))
  const watchBy = new Map(watchRows.map((r) => [r.userId, r.seconds]))

  const activityBy = new Map<string, ActivityDay[]>()
  for (const r of activityRows) {
    const list = activityBy.get(r.userId) ?? []
    list.push({
      activityDate: r.activityDate,
      videosCompleted: r.videosCompleted,
      isFrozen: r.isFrozen,
    })
    activityBy.set(r.userId, list)
  }

  const rows: LeaderboardRow[] = visible
    .map((u) => {
      const today = localDateString(now, u.timezone)
      const streak = computeStreaks(activityBy.get(u.id) ?? [], today)
      return {
        userId: u.id,
        displayName: resolveDisplayName(u.displayName, u.name, u.id),
        videosCompleted: videosBy.get(u.id) ?? 0,
        playlistsCompleted: playlistsBy.get(u.id) ?? 0,
        watchSeconds: watchBy.get(u.id) ?? 0,
        currentStreak: streak.currentStreak,
        isCurrentUser: u.id === currentUserId,
      }
    })
    .filter(hasActivity)

  return { rows, currentUserHidden }
}
