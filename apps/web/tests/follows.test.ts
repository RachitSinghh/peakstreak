import { beforeEach, describe, expect, it } from "vitest"

import { resetDb, seedUser } from "./helpers"

import {
  followUserById,
  getFollowCounts,
  getFollowList,
  isFollowing,
  resolveUsername,
  unfollowUserById,
} from "@/lib/follows"

describe("follow graph", () => {
  beforeEach(resetDb)

  it("follows persist, are idempotent, and unfollow reverses", async () => {
    const a = await seedUser()
    const b = await seedUser()

    await followUserById(a.id, b.id)
    await followUserById(a.id, b.id) // duplicate → no-op
    expect(await isFollowing(a.id, b.id)).toBe(true)
    expect((await getFollowCounts(b.id)).followers).toBe(1)
    expect((await getFollowCounts(a.id)).following).toBe(1)

    await unfollowUserById(a.id, b.id)
    await unfollowUserById(a.id, b.id) // absent → no-op
    expect(await isFollowing(a.id, b.id)).toBe(false)
    expect((await getFollowCounts(b.id)).followers).toBe(0)
  })

  it("ignores a self-follow", async () => {
    const a = await seedUser()
    await followUserById(a.id, a.id)
    expect((await getFollowCounts(a.id)).followers).toBe(0)
  })

  it("resolves usernames and links only public profiles in lists", async () => {
    const owner = await seedUser({ username: "owner", profileVisibility: "public" })
    const pub = await seedUser({ username: "pubfan", profileVisibility: "public", name: "Grace" })
    const priv = await seedUser({ username: "privfan", profileVisibility: "private", name: "Alan" })

    expect(await resolveUsername("owner")).toBe(owner.id)
    expect(await resolveUsername("ghost")).toBeNull()

    await followUserById(pub.id, owner.id)
    await followUserById(priv.id, owner.id)

    const followers = await getFollowList(owner.id, "followers")
    expect(followers).toHaveLength(2)
    const byName = Object.fromEntries(followers.map((f) => [f.displayName, f]))
    expect(byName.Grace!.username).toBe("pubfan")
    expect(byName.Alan!.username).toBeNull() // private → not linkable
  })
})
