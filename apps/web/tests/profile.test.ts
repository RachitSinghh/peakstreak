import { beforeEach, describe, expect, it } from "vitest"

import { resetDb, seedUser } from "./helpers"

import { acceptFollow, canViewProfile, requestFollow } from "@/lib/follows"
import { getFullProfile, getProfileIdentity } from "@/lib/profile"

describe("profile", () => {
  beforeEach(resetDb)

  it("resolves identity by username, null for unknown", async () => {
    await seedUser({ username: "ada", name: "Ada Lovelace" })
    const id = await getProfileIdentity("ada")
    expect(id?.displayName).toBe("Ada")
    expect(await getProfileIdentity("nobody")).toBeNull()
  })

  it("resolves by user id when the user has no username (default profile)", async () => {
    const u = await seedUser({ name: "No Handle" }) // never claimed a username
    const byId = await getProfileIdentity(u.id)
    expect(byId?.userId).toBe(u.id)
    expect(byId?.username).toBeNull()
    // A random non-existent uuid still resolves to null, not a throw.
    expect(await getProfileIdentity("00000000-0000-0000-0000-000000000000")).toBeNull()
  })

  it("gates full-profile visibility on an accepted follow", async () => {
    const owner = await seedUser({ username: "owner" })
    const viewer = await seedUser()

    // Not connected → cannot view; self can always view.
    expect(await canViewProfile(viewer.id, owner.id)).toBe(false)
    expect(await canViewProfile(owner.id, owner.id)).toBe(true)

    await requestFollow(viewer.id, owner.id)
    expect(await canViewProfile(viewer.id, owner.id)).toBe(false) // still pending
    await acceptFollow(owner.id, viewer.id)
    expect(await canViewProfile(viewer.id, owner.id)).toBe(true)

    const full = await getFullProfile(owner.id)
    expect(full?.username).toBe("owner")
    expect(full).toHaveProperty("currentStreak")
  })
})
