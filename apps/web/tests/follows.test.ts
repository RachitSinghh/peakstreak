import { beforeEach, describe, expect, it } from "vitest"

import { resetDb, seedUser } from "./helpers"

import {
  acceptFollow,
  canViewProfile,
  getFollowCounts,
  getFollowList,
  getFollowState,
  getIncomingRequests,
  removeFollow,
  requestFollow,
  resolveUsername,
} from "@/lib/follows"

describe("follow graph (request + approval)", () => {
  beforeEach(resetDb)

  it("request → pending, accept → following; counts only accepted", async () => {
    const a = await seedUser()
    const b = await seedUser()

    await requestFollow(a.id, b.id)
    await requestFollow(a.id, b.id) // duplicate → no-op
    expect(await getFollowState(a.id, b.id)).toBe("requested")
    expect(await canViewProfile(a.id, b.id)).toBe(false) // pending doesn't grant access
    expect((await getFollowCounts(b.id)).followers).toBe(0) // pending not counted

    // b sees the incoming request and accepts.
    const reqs = await getIncomingRequests(b.id)
    expect(reqs.map((r) => r.followerId)).toEqual([a.id])
    await acceptFollow(b.id, a.id)

    expect(await getFollowState(a.id, b.id)).toBe("following")
    expect(await canViewProfile(a.id, b.id)).toBe(true)
    expect((await getFollowCounts(b.id)).followers).toBe(1)
    expect((await getFollowCounts(a.id)).following).toBe(1)
    expect(await getIncomingRequests(b.id)).toHaveLength(0)
  })

  it("cancel / unfollow removes the edge; self is always viewable", async () => {
    const a = await seedUser()
    const b = await seedUser()
    await requestFollow(a.id, b.id)
    await removeFollow(a.id, b.id) // cancel the pending request
    expect(await getFollowState(a.id, b.id)).toBe("none")

    await requestFollow(a.id, b.id)
    await acceptFollow(b.id, a.id)
    await removeFollow(a.id, b.id) // unfollow
    expect(await getFollowState(a.id, b.id)).toBe("none")
    expect(await canViewProfile(a.id, a.id)).toBe(true)
  })

  it("ignores a self-follow", async () => {
    const a = await seedUser()
    await requestFollow(a.id, a.id)
    expect((await getFollowCounts(a.id)).followers).toBe(0)
  })

  it("follow lists show only accepted edges and resolve usernames", async () => {
    const owner = await seedUser({ username: "owner" })
    const accepted = await seedUser({ username: "yes", name: "Grace" })
    const pending = await seedUser({ username: "no", name: "Alan" })

    expect(await resolveUsername("owner")).toBe(owner.id)
    expect(await resolveUsername("ghost")).toBeNull()

    await requestFollow(accepted.id, owner.id)
    await acceptFollow(owner.id, accepted.id)
    await requestFollow(pending.id, owner.id) // still pending

    const followers = await getFollowList(owner.id, "followers")
    expect(followers.map((f) => f.displayName)).toEqual(["Grace"]) // pending excluded
    expect(followers[0]!.username).toBe("yes")
  })
})
