import { and, eq, sql } from "drizzle-orm"

import { track } from "@/lib/analytics"
import { db, schema } from "@/lib/db"
import { resolveDisplayName } from "@/lib/leaderboard-shared"

/**
 * SOC-02: the follow graph. Following is one-directional. All writes are
 * idempotent (a duplicate follow is a no-op, an absent unfollow is a no-op)
 * so the UI can fire optimistically without fear of doubles.
 */

export interface FollowListEntry {
  displayName: string
  image: string | null
  /** Present only when the user can be linked to (public profile). */
  username: string | null
}

/** Resolve any claimed username to its user id, visibility-agnostic. */
export async function resolveUsername(username: string): Promise<string | null> {
  const row = await db.query.users.findFirst({
    where: eq(schema.users.username, username.trim().toLowerCase()),
    columns: { id: true },
  })
  return row?.id ?? null
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const row = await db.query.follows.findFirst({
    where: and(
      eq(schema.follows.followerId, followerId),
      eq(schema.follows.followeeId, followeeId),
    ),
  })
  return !!row
}

export async function getFollowCounts(
  userId: string,
): Promise<{ followers: number; following: number }> {
  const [followers, following] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(eq(schema.follows.followeeId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.follows)
      .where(eq(schema.follows.followerId, userId)),
  ])
  return { followers: followers[0]?.count ?? 0, following: following[0]?.count ?? 0 }
}

export async function followUserById(followerId: string, followeeId: string): Promise<void> {
  if (followerId === followeeId) return // defense-in-depth; the action also guards
  const inserted = await db
    .insert(schema.follows)
    .values({ followerId, followeeId })
    .onConflictDoNothing()
    .returning({ followerId: schema.follows.followerId })
  if (inserted.length > 0) {
    await track("user_followed", { userId: followerId, properties: { followeeId } })
  }
}

export async function unfollowUserById(followerId: string, followeeId: string): Promise<void> {
  await db
    .delete(schema.follows)
    .where(
      and(
        eq(schema.follows.followerId, followerId),
        eq(schema.follows.followeeId, followeeId),
      ),
    )
}

/**
 * The users on one side of `userId`'s follow graph. `followers` = people who
 * follow them; `following` = people they follow. Linkable only when the other
 * user has a public profile with a username.
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
      visibility: schema.users.profileVisibility,
      userId: schema.users.id,
    })
    .from(schema.follows)
    .innerJoin(
      schema.users,
      eq(schema.users.id, toFollowers ? schema.follows.followerId : schema.follows.followeeId),
    )
    .where(eq(toFollowers ? schema.follows.followeeId : schema.follows.followerId, userId))
    .orderBy(sql`${schema.follows.createdAt} desc`)

  return rows.map((r) => ({
    displayName: resolveDisplayName(r.displayName, r.name, r.userId),
    image: r.image,
    username: r.visibility === "public" && r.username ? r.username : null,
  }))
}
