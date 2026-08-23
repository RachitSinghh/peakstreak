import { count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { computeStreaks } from "@/lib/streaks"
import { resolveDisplayName } from "@/lib/leaderboard-shared"
import { localDateString } from "@/lib/dates"
import type { GraphDay } from "@/components/contribution-graph"

export interface AdminUserRow {
  id: string
  label: string
  email: string
  role: "user" | "admin"
  joined: Date
  currentStreak: number
  activePlaylists: number
  completedPlaylists: number
  lastActive: string | null
}

// Read-only user directory. Streaks computed per listed user from one batched
// activity query, so this is O(page size) round trips, never N+1.
export async function getUsers({
  q,
  limit = 50,
  offset = 0,
}: {
  q?: string
  limit?: number
  offset?: number
}): Promise<{ rows: AdminUserRow[]; total: number }> {
  const search = q?.trim()
  const where = search
    ? or(ilike(schema.users.name, `%${search}%`), ilike(schema.users.email, `%${search}%`))
    : undefined

  const [totals, page] = await Promise.all([
    db.select({ n: count() }).from(schema.users).where(where),
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        displayName: schema.users.displayName,
        email: schema.users.email,
        role: schema.users.role,
        timezone: schema.users.timezone,
        joined: schema.users.createdAt,
      })
      .from(schema.users)
      .where(where)
      .orderBy(desc(schema.users.createdAt))
      .limit(limit)
      .offset(offset),
  ])

  const ids = page.map((u) => u.id)
  if (ids.length === 0) return { rows: [], total: totals[0]?.n ?? 0 }

  // Batched aggregates for just this page of users.
  const [enrollCounts, activity] = await Promise.all([
    db
      .select({
        userId: schema.userPlaylists.userId,
        status: schema.userPlaylists.status,
        n: count(),
      })
      .from(schema.userPlaylists)
      .where(inArray(schema.userPlaylists.userId, ids))
      .groupBy(schema.userPlaylists.userId, schema.userPlaylists.status),
    db
      .select({
        userId: schema.dailyActivity.userId,
        activityDate: schema.dailyActivity.activityDate,
        videosCompleted: schema.dailyActivity.videosCompleted,
        isFrozen: schema.dailyActivity.isFrozen,
      })
      .from(schema.dailyActivity)
      .where(inArray(schema.dailyActivity.userId, ids)),
  ])

  const activeByUser = new Map<string, number>()
  const completedByUser = new Map<string, number>()
  for (const r of enrollCounts) {
    if (r.status === "active") activeByUser.set(r.userId, r.n)
    if (r.status === "completed") completedByUser.set(r.userId, r.n)
  }

  const daysByUser = new Map<string, typeof activity>()
  for (const r of activity) {
    const arr = daysByUser.get(r.userId) ?? []
    arr.push(r)
    daysByUser.set(r.userId, arr)
  }

  const rows: AdminUserRow[] = page.map((u) => {
    const days = daysByUser.get(u.id) ?? []
    const today = localDateString(new Date(), u.timezone)
    const streak = computeStreaks(days, today)
    const lastActive = days.reduce<string | null>(
      (max, d) => (!max || d.activityDate > max ? d.activityDate : max),
      null,
    )
    return {
      id: u.id,
      label: resolveDisplayName(u.displayName, u.name, u.id),
      email: u.email,
      role: u.role,
      joined: u.joined,
      currentStreak: streak.currentStreak,
      activePlaylists: activeByUser.get(u.id) ?? 0,
      completedPlaylists: completedByUser.get(u.id) ?? 0,
      lastActive,
    }
  })

  return { rows, total: totals[0]?.n ?? 0 }
}

export interface AdminUserDetail {
  id: string
  label: string
  email: string
  username: string | null
  role: "user" | "admin"
  timezone: string
  joined: Date
  onboardedAt: Date | null
  currentStreak: number
  longestStreak: number
  graphDays: GraphDay[]
  today: string
  enrollments: {
    title: string
    status: string
    progressPct: number
    startedAt: Date
    completedAt: Date | null
  }[]
  feedback: { message: string; path: string | null; createdAt: Date }[]
  notesCount: number
  todosCount: number
}

// Full read-only picture of one user. Returns null for an unknown id so the
// page can render notFound().
export async function getUserDetail(userId: string): Promise<AdminUserDetail | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      username: true,
      role: true,
      timezone: true,
      createdAt: true,
      onboardedAt: true,
    },
  })
  if (!user) return null

  const [days, enrollRows, feedbackRows, notesN, todosN] = await Promise.all([
    db
      .select({
        activityDate: schema.dailyActivity.activityDate,
        videosCompleted: schema.dailyActivity.videosCompleted,
        isFrozen: schema.dailyActivity.isFrozen,
        secondsWatched: schema.dailyActivity.secondsWatched,
      })
      .from(schema.dailyActivity)
      .where(eq(schema.dailyActivity.userId, userId)),
    // Enrollment rows with completed-video count and the playlist's total.
    db.execute(sql`
      select p.title as title, up.status as status, up.started_at as started_at,
             up.completed_at as completed_at, p.video_count as video_count,
             count(vp.id) filter (where vp.completed_at is not null)::int as completed
      from ${schema.userPlaylists} up
      join ${schema.playlists} p on p.id = up.playlist_id
      left join ${schema.videoProgress} vp on vp.user_playlist_id = up.id
      where up.user_id = ${userId}
      group by up.id, p.title, up.status, up.started_at, up.completed_at, p.video_count
      order by up.started_at desc
    `),
    db
      .select({
        message: schema.feedback.message,
        path: schema.feedback.path,
        createdAt: schema.feedback.createdAt,
      })
      .from(schema.feedback)
      .where(eq(schema.feedback.userId, userId))
      .orderBy(desc(schema.feedback.createdAt)),
    db.select({ n: count() }).from(schema.noteEntries).where(eq(schema.noteEntries.userId, userId)),
    db.select({ n: count() }).from(schema.todos).where(eq(schema.todos.userId, userId)),
  ])

  const today = localDateString(new Date(), user.timezone)
  const streak = computeStreaks(days, today)

  const enrollments = (
    enrollRows.rows as {
      title: string
      status: string
      started_at: Date
      completed_at: Date | null
      video_count: number
      completed: number
    }[]
  ).map((r) => ({
    title: r.title,
    status: r.status,
    progressPct: r.video_count > 0 ? Math.round((r.completed / r.video_count) * 100) : 0,
    startedAt: r.started_at,
    completedAt: r.completed_at,
  }))

  return {
    id: user.id,
    label: resolveDisplayName(user.displayName, user.name, user.id),
    email: user.email,
    username: user.username,
    role: user.role,
    timezone: user.timezone,
    joined: user.createdAt,
    onboardedAt: user.onboardedAt,
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    graphDays: days,
    today,
    enrollments,
    feedback: feedbackRows,
    notesCount: notesN[0]?.n ?? 0,
    todosCount: todosN[0]?.n ?? 0,
  }
}
