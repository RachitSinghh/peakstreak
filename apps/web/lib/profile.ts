import { and, eq, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { addDays, localDateString } from "@/lib/dates"
import { getFollowCounts } from "@/lib/follows"
import { resolveDisplayName } from "@/lib/leaderboard-shared"
import { computeStreaks } from "@/lib/streaks"
import type { GraphDay } from "@/components/contribution-graph"

interface ProfileStats {
  currentStreak: number
  longestStreak: number
  playlistsCompleted: number
  totalWatchSeconds: number
  followerCount: number
  followingCount: number
  activityDays: GraphDay[]
  today: string
}

/** Identity shown even to someone who can't see the full profile yet. */
export interface ProfileIdentity {
  userId: string
  username: string | null
  displayName: string
  bio: string | null
  image: string | null
}

export interface FullProfile extends ProfileIdentity, ProfileStats {}

/**
 * Stats for one user, from the same source-of-truth rows the dashboard and
 * leaderboard use — no forked counters. Shared by the public and own-profile
 * views so their numbers can never disagree.
 */
async function buildStats(
  userId: string,
  timezone: string,
  now: Date,
): Promise<ProfileStats> {
  const today = localDateString(now, timezone)

  const [activityRows, playlistsRow, watchRow, followCounts] = await Promise.all([
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
          eq(schema.dailyActivity.userId, userId),
          sql`${schema.dailyActivity.activityDate} >= ${addDays(today, -400)}`,
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.userPlaylists)
      .where(
        and(eq(schema.userPlaylists.userId, userId), eq(schema.userPlaylists.status, "completed")),
      ),
    // All-time learning hours: sum every activity row, not just the window.
    db
      .select({ seconds: sql<number>`coalesce(sum(${schema.dailyActivity.secondsWatched}), 0)::int` })
      .from(schema.dailyActivity)
      .where(eq(schema.dailyActivity.userId, userId)),
    getFollowCounts(userId),
  ])

  const streak = computeStreaks(activityRows, today)
  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    playlistsCompleted: playlistsRow[0]?.count ?? 0,
    totalWatchSeconds: watchRow[0]?.seconds ?? 0,
    followerCount: followCounts.followers,
    followingCount: followCounts.following,
    activityDays: activityRows,
    today,
  }
}

function toIdentity(user: typeof schema.users.$inferSelect): ProfileIdentity {
  return {
    userId: user.id,
    username: user.username,
    displayName: resolveDisplayName(user.displayName, user.name, user.id),
    bio: user.bio,
    image: user.image,
  }
}

// A user id is a UUID (36 chars); a username is ≤30 chars, so the two URL
// forms can never collide — every user is reachable at /u/<username-or-id>.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Identity for a `/u/:handle` route — shown even before you're connected. The
 * handle is either a claimed username or (fallback) the user id, so everyone
 * has a reachable profile whether or not they've picked a username.
 */
export async function getProfileIdentity(handle: string): Promise<ProfileIdentity | null> {
  const key = handle.trim().toLowerCase()
  const user = await db.query.users.findFirst({
    where: UUID_RE.test(key) ? eq(schema.users.id, key) : eq(schema.users.username, key),
  })
  return user ? toIdentity(user) : null
}

/** Full profile (identity + stats) for a user the viewer is allowed to see. */
export async function getFullProfile(
  userId: string,
  now: Date = new Date(),
): Promise<FullProfile | null> {
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, userId) })
  if (!user) return null
  const stats = await buildStats(user.id, user.timezone, now)
  return { ...toIdentity(user), ...stats }
}
