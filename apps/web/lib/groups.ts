import { and, eq, inArray, sql } from "drizzle-orm"

import { track } from "@/lib/analytics"
import { db, schema } from "@/lib/db"
import { addDays, localDateString } from "@/lib/dates"
import {
  GROUP_SIZE_CAP,
  type GroupActionResult,
  type GroupMemberStatus,
  type GroupPage,
  type GroupSummary,
} from "@/lib/groups-shared"
import { resolveDisplayName } from "@/lib/leaderboard-shared"
import { cloneAndEnroll } from "@/lib/playlist-clone"
import { ALIAS_MAX, randomSuffix, slugify } from "@/lib/slug"
import { computeGroupStreak, computeStreaks, type ActivityDay } from "@/lib/streaks"

/**
 * SOC-06: study groups. A capped group with one owner. Member status (streak +
 * studied-today) is computed from the same `daily_activity` rows the dashboard
 * uses — one query for all members, never per-member. Pure constants/types live
 * in `lib/groups-shared.ts` so client code can reuse them.
 */

export {
  GROUP_SIZE_CAP,
  type GroupActionResult,
  type GroupMemberStatus,
  type GroupPage,
  type GroupRole,
  type GroupSummary,
} from "@/lib/groups-shared"

/** A unique group slug from the name. DB unique constraint is the real guard. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  const existing = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, base),
    columns: { id: true },
  })
  if (!existing) return base
  return `${base.slice(0, ALIAS_MAX - 5)}-${randomSuffix()}`
}

/** Create a group with the creator as owner. Returns the new slug. */
export async function createGroup(
  ownerId: string,
  name: string,
  description?: string,
): Promise<GroupActionResult> {
  const trimmed = name.trim()
  if (trimmed.length < 2) return { error: "Give your group a name." }

  const slug = await uniqueSlug(trimmed)
  const [group] = await db
    .insert(schema.studyGroups)
    .values({ name: trimmed.slice(0, 80), slug, description: description?.trim() || null, ownerId })
    .returning({ id: schema.studyGroups.id, slug: schema.studyGroups.slug })
  if (!group) return { error: "Could not create the group." }

  await db.insert(schema.groupMembers).values({ groupId: group.id, userId: ownerId, role: "owner" })
  await track("group_created", { userId: ownerId, properties: { groupId: group.id } })
  return { ok: true, slug: group.slug }
}

/** Join a group by slug. No-op if already a member; rejects a full group. */
export async function joinGroup(userId: string, slug: string): Promise<GroupActionResult> {
  const group = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, slug),
    columns: { id: true, goalPlaylistId: true },
  })
  if (!group) return { error: "Group not found." }

  const [existing, countRow] = await Promise.all([
    db.query.groupMembers.findFirst({
      where: and(eq(schema.groupMembers.groupId, group.id), eq(schema.groupMembers.userId, userId)),
    }),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.groupMembers)
      .where(eq(schema.groupMembers.groupId, group.id)),
  ])
  if (existing) return { ok: true, slug }
  if ((countRow[0]?.n ?? 0) >= GROUP_SIZE_CAP) return { error: "This group is full." }

  // SOC-07: a late joiner gets their own clone of the group goal to track.
  const goalEnrollmentId = group.goalPlaylistId
    ? await cloneAndEnroll(userId, group.goalPlaylistId)
    : null
  await db.insert(schema.groupMembers).values({ groupId: group.id, userId, role: "member", goalEnrollmentId })
  await track("group_joined", { userId, properties: { groupId: group.id } })
  return { ok: true, slug }
}

/** Leave a group. The owner can't leave — they delete the group instead. */
export async function leaveGroup(userId: string, slug: string): Promise<GroupActionResult> {
  const group = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, slug),
    columns: { id: true, ownerId: true },
  })
  if (!group) return { error: "Group not found." }
  if (group.ownerId === userId) {
    return { error: "You own this group — delete it instead of leaving." }
  }
  await db
    .delete(schema.groupMembers)
    .where(and(eq(schema.groupMembers.groupId, group.id), eq(schema.groupMembers.userId, userId)))
  await track("group_left", { userId, properties: { groupId: group.id } })
  return { ok: true }
}

/** Owner-only: remove another member. */
export async function removeMember(
  ownerId: string,
  slug: string,
  targetUserId: string,
): Promise<GroupActionResult> {
  const group = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, slug),
    columns: { id: true, ownerId: true },
  })
  if (!group) return { error: "Group not found." }
  if (group.ownerId !== ownerId) return { error: "Only the owner can remove members." }
  if (targetUserId === ownerId) return { error: "You can't remove yourself." }

  await db
    .delete(schema.groupMembers)
    .where(
      and(eq(schema.groupMembers.groupId, group.id), eq(schema.groupMembers.userId, targetUserId)),
    )
  return { ok: true }
}

/** Owner-only: delete the group (cascade removes memberships). */
export async function deleteGroup(ownerId: string, slug: string): Promise<GroupActionResult> {
  const group = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, slug),
    columns: { id: true, ownerId: true },
  })
  if (!group) return { error: "Group not found." }
  if (group.ownerId !== ownerId) return { error: "Only the owner can delete this group." }

  await db.delete(schema.studyGroups).where(eq(schema.studyGroups.id, group.id))
  return { ok: true }
}

/**
 * SOC-07: owner attaches one of their own playlists as the group goal. Every
 * current member (owner included) gets their own editable clone to track, so
 * the group starts fresh together. Set-once for v1.
 */
export async function setGroupGoal(
  ownerId: string,
  slug: string,
  sourcePlaylistId: string,
  threshold = 1,
): Promise<GroupActionResult> {
  const group = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, slug),
    columns: { id: true, ownerId: true, goalPlaylistId: true },
  })
  if (!group) return { error: "Group not found." }
  if (group.ownerId !== ownerId) return { error: "Only the owner can set the group goal." }
  if (group.goalPlaylistId) return { error: "This group already has a goal." }

  // The owner must be enrolled in the source, and it must have videos.
  const source = await db
    .select({ videoCount: schema.playlists.videoCount })
    .from(schema.userPlaylists)
    .innerJoin(schema.playlists, eq(schema.playlists.id, schema.userPlaylists.playlistId))
    .where(
      and(
        eq(schema.userPlaylists.userId, ownerId),
        eq(schema.userPlaylists.playlistId, sourcePlaylistId),
      ),
    )
    .then((r) => r[0])
  if (!source) return { error: "Pick one of your own playlists." }
  if (source.videoCount === 0) return { error: "That playlist has no videos yet." }

  const members = await db
    .select({ userId: schema.groupMembers.userId })
    .from(schema.groupMembers)
    .where(eq(schema.groupMembers.groupId, group.id))

  const safeThreshold = Math.max(1, Math.min(threshold, members.length))
  await db
    .update(schema.studyGroups)
    .set({ goalPlaylistId: sourcePlaylistId, goalStreakThreshold: safeThreshold })
    .where(eq(schema.studyGroups.id, group.id))

  // ponytail: clone serially — bounded by GROUP_SIZE_CAP (20), not worth batching.
  for (const m of members) {
    const goalEnrollmentId = await cloneAndEnroll(m.userId, sourcePlaylistId)
    await db
      .update(schema.groupMembers)
      .set({ goalEnrollmentId })
      .where(and(eq(schema.groupMembers.groupId, group.id), eq(schema.groupMembers.userId, m.userId)))
  }

  await track("group_goal_set", { userId: ownerId, properties: { groupId: group.id, playlistId: sourcePlaylistId } })
  return { ok: true, slug }
}

/** Groups the user belongs to, with member counts. */
export async function getMyGroups(userId: string): Promise<GroupSummary[]> {
  const rows = await db
    .select({
      slug: schema.studyGroups.slug,
      name: schema.studyGroups.name,
      memberCount: sql<number>`count(${schema.groupMembers.userId})::int`,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.studyGroups, eq(schema.studyGroups.id, schema.groupMembers.groupId))
    .where(
      inArray(
        schema.studyGroups.id,
        db
          .select({ id: schema.groupMembers.groupId })
          .from(schema.groupMembers)
          .where(eq(schema.groupMembers.userId, userId)),
      ),
    )
    .groupBy(schema.studyGroups.slug, schema.studyGroups.name)

  return rows
}

/** The group page. Member status is included only for members (privacy). */
export async function getGroupPage(
  slug: string,
  viewerId: string,
  now: Date = new Date(),
): Promise<GroupPage | null> {
  const group = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, slug),
  })
  if (!group) return null

  const memberRows = await db
    .select({
      userId: schema.users.id,
      name: schema.users.name,
      displayName: schema.users.displayName,
      username: schema.users.username,
      image: schema.users.image,
      timezone: schema.users.timezone,
      role: schema.groupMembers.role,
      goalEnrollmentId: schema.groupMembers.goalEnrollmentId,
    })
    .from(schema.groupMembers)
    .innerJoin(schema.users, eq(schema.users.id, schema.groupMembers.userId))
    .where(eq(schema.groupMembers.groupId, group.id))

  const viewerRole = memberRows.find((m) => m.userId === viewerId)?.role ?? null
  const memberCount = memberRows.length

  const base = {
    slug: group.slug,
    name: group.name,
    description: group.description,
    memberCount,
    isFull: memberCount >= GROUP_SIZE_CAP,
    viewerRole,
  }
  if (!viewerRole) {
    // Non-member: no status leak.
    return { ...base, members: [], goal: null, ownerPlaylistOptions: [] }
  }

  const { status, dateCounts } = await membersStatus(
    memberRows.map((m) => ({ id: m.userId, timezone: m.timezone })),
    now,
  )

  // SOC-07: per-member completed counts on the goal, in one query.
  const goalCompleted = await goalCompletedCounts(
    memberRows.map((m) => m.goalEnrollmentId).filter((id): id is string => id !== null),
  )
  const members: GroupMemberStatus[] = memberRows
    .map((m) => ({
      userId: m.userId,
      displayName: resolveDisplayName(m.displayName, m.name, m.userId),
      username: m.username,
      image: m.image,
      role: m.role,
      currentStreak: status.get(m.userId)?.currentStreak ?? 0,
      studiedToday: status.get(m.userId)?.studiedToday ?? false,
      goalCompletedCount: m.goalEnrollmentId ? goalCompleted.get(m.goalEnrollmentId) ?? 0 : 0,
    }))
    // Owner first, then most-active.
    .sort((a, b) => (b.role === "owner" ? 1 : 0) - (a.role === "owner" ? 1 : 0) || b.currentStreak - a.currentStreak)

  let goal: GroupPage["goal"] = null
  if (group.goalPlaylistId) {
    const playlist = await db.query.playlists.findFirst({
      where: eq(schema.playlists.id, group.goalPlaylistId),
      columns: { title: true, videoCount: true },
    })
    if (playlist) {
      const videoCount = playlist.videoCount
      const avgCompletionPct =
        videoCount > 0 && members.length > 0
          ? Math.round(
              (members.reduce((s, m) => s + Math.min(m.goalCompletedCount, videoCount) / videoCount, 0) /
                members.length) *
                100,
            )
          : 0
      // ponytail: group "today" anchors to the owner's timezone.
      const ownerTz = memberRows.find((m) => m.role === "owner")?.timezone ?? "UTC"
      goal = {
        title: playlist.title,
        videoCount,
        streakThreshold: group.goalStreakThreshold,
        groupStreak: computeGroupStreak(dateCounts, localDateString(now, ownerTz), group.goalStreakThreshold),
        avgCompletionPct,
      }
    }
  }

  const ownerPlaylistOptions =
    viewerRole === "owner" && !group.goalPlaylistId ? await ownerPlaylists(viewerId) : []

  return { ...base, members, goal, ownerPlaylistOptions }
}

/** The owner's active playlists, offered as goal candidates. */
async function ownerPlaylists(ownerId: string): Promise<{ playlistId: string; title: string }[]> {
  return db
    .select({ playlistId: schema.playlists.id, title: schema.playlists.title })
    .from(schema.userPlaylists)
    .innerJoin(schema.playlists, eq(schema.playlists.id, schema.userPlaylists.playlistId))
    .where(and(eq(schema.userPlaylists.userId, ownerId), eq(schema.userPlaylists.status, "active")))
}

/** Completed-video counts keyed by enrollment id, in one query. */
async function goalCompletedCounts(enrollmentIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (enrollmentIds.length === 0) return out
  const rows = await db
    .select({
      enrollmentId: schema.videoProgress.userPlaylistId,
      n: sql<number>`count(*)::int`,
    })
    .from(schema.videoProgress)
    .where(and(inArray(schema.videoProgress.userPlaylistId, enrollmentIds), eq(schema.videoProgress.isCompleted, true)))
    .groupBy(schema.videoProgress.userPlaylistId)
  for (const r of rows) out.set(r.enrollmentId, r.n)
  return out
}

/** Per-member streak/status plus the per-date study counts for the group streak. */
async function membersStatus(
  members: { id: string; timezone: string }[],
  now: Date,
): Promise<{
  status: Map<string, { currentStreak: number; studiedToday: boolean }>
  dateCounts: Map<string, number>
}> {
  const status = new Map<string, { currentStreak: number; studiedToday: boolean }>()
  const dateCounts = new Map<string, number>()
  if (members.length === 0) return { status, dateCounts }

  const ids = members.map((m) => m.id)
  // 400 days covers any realistic current-streak run; scoped to these members.
  const since = addDays(localDateString(now, "UTC"), -401)
  const rows = await db
    .select({
      userId: schema.dailyActivity.userId,
      activityDate: schema.dailyActivity.activityDate,
      videosCompleted: schema.dailyActivity.videosCompleted,
      isFrozen: schema.dailyActivity.isFrozen,
    })
    .from(schema.dailyActivity)
    .where(
      and(inArray(schema.dailyActivity.userId, ids), sql`${schema.dailyActivity.activityDate} >= ${since}`),
    )

  const byUser = new Map<string, ActivityDay[]>()
  for (const r of rows) {
    const list = byUser.get(r.userId) ?? []
    list.push({ activityDate: r.activityDate, videosCompleted: r.videosCompleted, isFrozen: r.isFrozen })
    byUser.set(r.userId, list)
    // One member per (user, date) — count studying members per date for the group streak.
    if (r.videosCompleted > 0) dateCounts.set(r.activityDate, (dateCounts.get(r.activityDate) ?? 0) + 1)
  }

  for (const m of members) {
    const today = localDateString(now, m.timezone)
    const days = byUser.get(m.id) ?? []
    const streak = computeStreaks(days, today)
    const studiedToday = days.some((d) => d.activityDate === today && d.videosCompleted > 0)
    status.set(m.id, { currentStreak: streak.currentStreak, studiedToday })
  }
  return { status, dateCounts }
}
