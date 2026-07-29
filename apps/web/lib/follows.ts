import { and, eq, sql } from "drizzle-orm"

import { track } from "@/lib/analytics"
import { db, schema } from "@/lib/db"
import { resolveDisplayName } from "@/lib/leaderboard-shared"

/**
 * SOC-02: the follow graph, directional with approval. A follow is created as
 * `pending` (a request) and becomes `accepted` when the followee approves.
 * Only an accepted follow (follower → followee) lets the follower see the
 * followee's profile and activity. All writes are idempotent.
 */

/** The viewer's relationship to a target, from the viewer→target direction. */
export type FollowState = "none" | "requested" | "following"

export interface FollowListEntry {
  userId: string
  displayName: string
  image: string | null
  username: string | null
}

export interface IncomingRequest {
  followerId: string
  displayName: string
  image: string | null
  username: string | null
}

/** Resolve any claimed username to its user id. */
export async function resolveUsername(username: string): Promise<string | null> {
  const row = await db.query.users.findFirst({
    where: eq(schema.users.username, username.trim().toLowerCase()),
    columns: { id: true },
  })
  return row?.id ?? null
}

/** The viewer→target relationship: none / requested (pending) / following (accepted). */
export async function getFollowState(viewerId: string, targetId: string): Promise<FollowState> {
  const row = await db.query.follows.findFirst({
    where: and(
      eq(schema.follows.followerId, viewerId),
      eq(schema.follows.followeeId, targetId),
    ),
  })
  if (!row) return "none"
  return row.status === "accepted" ? "following" : "requested"
}

/** Can the viewer see the target's profile? Self, or an accepted follow. */
export async function canViewProfile(viewerId: string, targetId: string): Promise<boolean> {
  if (viewerId === targetId) return true
  return (await getFollowState(viewerId, targetId)) === "following"
}

/** Counts only accepted edges. `followers` = accepted → me; `following` = accepted from me. */
export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(and(eq(schema.follows.followeeId, userId), eq(schema.follows.status, "accepted"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(and(eq(schema.follows.followerId, userId), eq(schema.follows.status, "accepted"))),
  ])
  return { followers: followers[0]?.count ?? 0, following: following[0]?.count ?? 0 }
}

/** Send a follow request (follower → followee). No-op on self or a duplicate. */
export async function requestFollow(followerId: string, followeeId: string): Promise<void> {
  if (followerId === followeeId) return
  const inserted = await db
    .insert(schema.follows)
    .values({ followerId, followeeId, status: "pending" })
    .onConflictDoNothing()
    .returning({ followerId: schema.follows.followerId })
  if (inserted.length > 0) {
    await track("follow_requested", { userId: followerId, properties: { followeeId } })
  }
}

/** Followee accepts a pending request from follower. */
export async function acceptFollow(followeeId: string, followerId: string): Promise<void> {
  const updated = await db
    .update(schema.follows)
    .set({ status: "accepted" })
    .where(
      and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followeeId, followeeId),
        eq(schema.follows.status, "pending"),
      ),
    )
    .returning({ followerId: schema.follows.followerId })
  if (updated.length > 0) {
    await track("follow_accepted", { userId: followeeId, properties: { followerId } })
  }
}

/** Remove an edge in either direction — cancels a request, declines one, or unfollows. */
export async function removeFollow(followerId: string, followeeId: string): Promise<void> {
  await db
    .delete(schema.follows)
    .where(
      and(eq(schema.follows.followerId, followerId), eq(schema.follows.followeeId, followeeId)),
    )
}

/** Pending requests awaiting this user's approval, newest first. */
export async function getIncomingRequests(userId: string): Promise<IncomingRequest[]> {
  const rows = await db
    .select({
      name: schema.users.name,
      displayName: schema.users.displayName,
      username: schema.users.username,
      image: schema.users.image,
      userId: schema.users.id,
    })
    .from(schema.follows)
    .innerJoin(schema.users, eq(schema.users.id, schema.follows.followerId))
    .where(and(eq(schema.follows.followeeId, userId), eq(schema.follows.status, "pending")))
    .orderBy(sql`${schema.follows.createdAt} desc`)

  return rows.map((r) => ({
    followerId: r.userId,
    displayName: resolveDisplayName(r.displayName, r.name, r.userId),
    image: r.image,
    username: r.username,
  }))
}

/**
 * Accepted connections on one side of `userId`. `followers` = people who
 * follow them; `following` = people they follow. Linkable when the other user
 * has a username (their profile page is itself connection-gated).
 */
export async function getFollowList(
  userId: string,
  direction: "followers" | "following",
): Promise<FollowListEntry[]> {
  const toFollowers = direction === "followers"
  const rows = await db
    .select({
      name: schema.users.name,
      displayName: schema.users.displayName,
      username: schema.users.username,
      image: schema.users.image,
      userId: schema.users.id,
    })
    .from(schema.follows)
    .innerJoin(
      schema.users,
      eq(schema.users.id, toFollowers ? schema.follows.followerId : schema.follows.followeeId),
    )
    .where(
      and(
        eq(toFollowers ? schema.follows.followeeId : schema.follows.followerId, userId),
        eq(schema.follows.status, "accepted"),
      ),
    )
    .orderBy(sql`${schema.follows.createdAt} desc`)

  return rows.map((r) => ({
    userId: r.userId,
    displayName: resolveDisplayName(r.displayName, r.name, r.userId),
    image: r.image,
    username: r.username,
  }))
}
