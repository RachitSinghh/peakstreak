import { getRedis } from "@/lib/rate-limit"

// FT-S1: live presence over Upstash Redis. Each client re-stamps its key
// every ~15s; the 45s TTL means a crashed/closed tab simply stops refreshing
// and its key expires — that IS the disconnect detection, no server daemon or
// cron needed. Fails soft: with no Redis keys (local dev), everyone reads as
// offline rather than erroring.

export type PresenceStatus = "offline" | "online" | "studying"
type LiveStatus = Exclude<PresenceStatus, "offline">

// Slightly longer than the client's 15s ping so one dropped request doesn't
// flap a user to offline.
const TTL_SECONDS = 45
const KEY = (userId: string) => `presence:${userId}`

/** Record a heartbeat. No-op when Redis is unconfigured. */
export async function setPresence(userId: string, status: LiveStatus): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(KEY(userId), status, { ex: TTL_SECONDS })
  } catch {
    /* presence is best-effort; never fail the request over it */
  }
}

/** Drop a user's presence immediately (logout). */
export async function clearPresence(userId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.del(KEY(userId))
  } catch {
    /* ignore */
  }
}

/**
 * Live status for a set of users. Anyone without a fresh key reads "offline".
 * One MGET regardless of list size — no per-user round trips.
 */
export async function getPresenceFor(
  userIds: string[],
): Promise<Record<string, PresenceStatus>> {
  const result: Record<string, PresenceStatus> = {}
  for (const id of userIds) result[id] = "offline"

  const redis = getRedis()
  if (!redis || userIds.length === 0) return result

  try {
    const values = await redis.mget<(LiveStatus | null)[]>(...userIds.map(KEY))
    userIds.forEach((id, i) => {
      const v = values[i]
      if (v === "online" || v === "studying") result[id] = v
    })
  } catch {
    /* fall through with everyone offline */
  }
  return result
}
