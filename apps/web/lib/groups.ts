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
import { ALIAS_MAX, randomSuffix, slugify } from "@/lib/slug"
import { computeStreaks, type ActivityDay } from "@/lib/streaks"

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
    columns: { id: true },
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

  await db.insert(schema.groupMembers).values({ groupId: group.id, userId, role: "member" })
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
  if (!viewerRole) return { ...base, members: [] } // non-member: no status leak

  const status = await membersStatus(
    memberRows.map((m) => ({ id: m.userId, timezone: m.timezone })),
    now,
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
    }))
    // Owner first, then most-active.
    .sort((a, b) => (b.role === "owner" ? 1 : 0) - (a.role === "owner" ? 1 : 0) || b.currentStreak - a.currentStreak)

  return { ...base, members }
}

/** Streak + studied-today for a set of members, in one activity sweep. */
async function membersStatus(
  members: { id: string; timezone: string }[],
  now: Date,
): Promise<Map<string, { currentStreak: number; studiedToday: boolean }>> {
  const out = new Map<string, { currentStreak: number; studiedToday: boolean }>()
  if (members.length === 0) return out

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
  }

  for (const m of members) {
    const today = localDateString(now, m.timezone)
    const days = byUser.get(m.id) ?? []
    const streak = computeStreaks(days, today)
    const studiedToday = days.some((d) => d.activityDate === today && d.videosCompleted > 0)
    out.set(m.id, { currentStreak: streak.currentStreak, studiedToday })
  }
  return out
}
