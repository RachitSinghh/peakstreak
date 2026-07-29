import { beforeEach, describe, expect, it } from "vitest"

import { resetDb, seedUser } from "./helpers"

import { getPublicProfile } from "@/lib/profile"

describe("getPublicProfile (privacy boundary)", () => {
  beforeEach(resetDb)

  it("returns a profile only when visibility is public", async () => {
    await seedUser({ username: "publicuser", profileVisibility: "public", name: "Ada Lovelace" })
    const profile = await getPublicProfile("publicuser")
    expect(profile?.username).toBe("publicuser")
    expect(profile?.displayName).toBe("Ada")
  })

  it("returns null for a private profile (no data leak)", async () => {
    await seedUser({ username: "privateuser", profileVisibility: "private" })
    expect(await getPublicProfile("privateuser")).toBeNull()
  })

  it("returns null for an unknown username", async () => {
    expect(await getPublicProfile("nobody")).toBeNull()
  })
})
