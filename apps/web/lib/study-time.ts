import { and, eq, gte, inArray, sql } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { addDays, localDateString } from "@/lib/dates"

// FT-S2: "active learning time" = genuine watch time + Pomodoro focus time.
// Both live on daily_activity, keyed by the user's LOCAL calendar date, so
// "today"/"this week" respect each user's timezone. All timestamps are UTC;
// only the date bucket is localized.

export type StudyRange = "today" | "week" | "all"

const studySeconds = sql<number>`coalesce(sum(${schema.dailyActivity.secondsWatched} + ${schema.dailyActivity.focusSeconds}), 0)::int`

/** Add completed Pomodoro focus seconds to today's activity row. */
export async function addFocusSeconds(
  userId: string,
  seconds: number,
  timezone: string,
  now: Date = new Date(),
): Promise<void> {
  const delta = Math.max(0, Math.round(seconds))
  if (delta === 0) return
  const activityDate = localDateString(now, timezone)
  await db
    .insert(schema.dailyActivity)
    .values({ userId, activityDate, focusSeconds: delta })
    .onConflictDoUpdate({
      target: [schema.dailyActivity.userId, schema.dailyActivity.activityDate],
      set: {
        focusSeconds: sql`${schema.dailyActivity.focusSeconds} + ${delta}`,
        updatedAt: now,
      },
    })
}

/** Total active learning seconds for one user over a range. */
export async function getStudyTime(
  userId: string,
  range: StudyRange,
  timezone: string,
  now: Date = new Date(),
): Promise<number> {
  const conds = [eq(schema.dailyActivity.userId, userId)]
  const today = localDateString(now, timezone)
  if (range === "today") conds.push(eq(schema.dailyActivity.activityDate, today))
  else if (range === "week") conds.push(gte(schema.dailyActivity.activityDate, addDays(today, -6)))

  const [row] = await db
    .select({ seconds: studySeconds })
    .from(schema.dailyActivity)
    .where(and(...conds))
  return row?.seconds ?? 0
}

/**
 * Today's active learning seconds for many users at once (FT-S3 sidebar).
 * Each user's "today" is their own local date, so we query the handful of
 * distinct local dates in play and match each user to their own.
 */
export async function getStudyTimeTodayFor(
  users: { id: string; timezone: string }[],
  now: Date = new Date(),
): Promise<Record<string, number>> {
  const result: Record<string, number> = {}
  for (const u of users) result[u.id] = 0
  if (users.length === 0) return result

  const localToday = new Map(users.map((u) => [u.id, localDateString(now, u.timezone)]))
  const distinctDates = [...new Set(localToday.values())]

  const rows = await db
    .select({
      userId: schema.dailyActivity.userId,
      activityDate: schema.dailyActivity.activityDate,
      seconds: sql<number>`(${schema.dailyActivity.secondsWatched} + ${schema.dailyActivity.focusSeconds})::int`,
    })
    .from(schema.dailyActivity)
    .where(
      and(
        inArray(
          schema.dailyActivity.userId,
          users.map((u) => u.id),
        ),
        inArray(schema.dailyActivity.activityDate, distinctDates),
      ),
    )

  // Keep only the row that matches each user's own local today.
  const byKey = new Map(rows.map((r) => [`${r.userId}:${r.activityDate}`, r.seconds]))
  for (const u of users) {
    result[u.id] = byKey.get(`${u.id}:${localToday.get(u.id)}`) ?? 0
  }
  return result
}
