import { inArray } from "drizzle-orm"

import { db, schema } from "@/lib/db"
import { getLeaderboard } from "@/lib/leaderboard"
import { getPresenceFor, type PresenceStatus } from "@/lib/presence"
import { getStudyTimeTodayFor } from "@/lib/study-time"

// FT-S3: the "Who's Studying" list. Audience reuses the leaderboard's set
// (opt-in users with real activity) minus the current user, decorated with
// live presence and today's active-learning time, sorted studying → online →
// offline (then by who's studied more today).

export interface StudyingPerson {
  userId: string
  displayName: string
  status: PresenceStatus
  studySecondsToday: number
}

const STATUS_RANK: Record<PresenceStatus, number> = { studying: 0, online: 1, offline: 2 }

/** Sort order: studying → online → offline, then more-studied-today first. */
export function compareStudyingPeople(a: StudyingPerson, b: StudyingPerson): number {
  return (
    STATUS_RANK[a.status] - STATUS_RANK[b.status] || b.studySecondsToday - a.studySecondsToday
  )
}

export async function getWhosStudying(
  currentUserId: string,
  now: Date = new Date(),
): Promise<StudyingPerson[]> {
  const { rows } = await getLeaderboard(currentUserId, now)
  const others = rows.filter((r) => !r.isCurrentUser)
  if (others.length === 0) return []

  const ids = others.map((r) => r.userId)

  // Timezones drive each user's "today"; not carried on the leaderboard row.
  const tzRows = await db
    .select({ id: schema.users.id, timezone: schema.users.timezone })
    .from(schema.users)
    .where(inArray(schema.users.id, ids))
  const tzById = new Map(tzRows.map((r) => [r.id, r.timezone]))

  const [presence, studyToday] = await Promise.all([
    getPresenceFor(ids),
    getStudyTimeTodayFor(
      others.map((r) => ({ id: r.userId, timezone: tzById.get(r.userId) ?? "UTC" })),
      now,
    ),
  ])

  return others
    .map((r) => ({
      userId: r.userId,
      displayName: r.displayName,
      status: presence[r.userId] ?? "offline",
      studySecondsToday: studyToday[r.userId] ?? 0,
    }))
    .sort(compareStudyingPeople)
}
