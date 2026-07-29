import { beforeEach, describe, expect, it } from "vitest"

import { resetDb, seedEnrollment, seedUser } from "./helpers"

import { getActivityFeed } from "@/lib/feed"
import { acceptFollow, requestFollow } from "@/lib/follows"

/** Establish an accepted follow: follower → followee. */
async function connect(followerId: string, followeeId: string) {
  await requestFollow(followerId, followeeId)
  await acceptFollow(followeeId, followerId)
}

describe("getActivityFeed", () => {
  beforeEach(resetDb)

  it("shows only accepted followees' activity", async () => {
    const me = await seedUser()
    const friend = await seedUser({ username: "friend", name: "Friend" })
    const pendingOnly = await seedUser({ username: "pend", name: "Pending" })
    const stranger = await seedUser({ username: "str", name: "Stranger" })

    await connect(me.id, friend.id)
    await requestFollow(me.id, pendingOnly.id) // requested, not accepted

    await seedEnrollment({ userId: friend.id, videoCount: 3 })
    await seedEnrollment({ userId: pendingOnly.id, videoCount: 3 })
    await seedEnrollment({ userId: stranger.id, videoCount: 3 })

    const { items, followsAnyone } = await getActivityFeed(me.id)
    expect(followsAnyone).toBe(true)
    const names = items.map((i) => i.displayName)
    expect(names).toContain("Friend")
    expect(names).not.toContain("Pending") // request not yet accepted
    expect(names).not.toContain("Stranger") // not followed
  })

  it("reports followsAnyone=false with only a pending request", async () => {
    const me = await seedUser()
    const other = await seedUser({ username: "o" })
    await requestFollow(me.id, other.id)
    const { items, followsAnyone } = await getActivityFeed(me.id)
    expect(items).toHaveLength(0)
    expect(followsAnyone).toBe(false)
  })
})
