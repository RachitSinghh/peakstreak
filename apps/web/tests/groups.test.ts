import { beforeEach, describe, expect, it } from "vitest"

import { resetDb, seedUser } from "./helpers"

import {
  GROUP_SIZE_CAP,
  createGroup,
  deleteGroup,
  getGroupPage,
  joinGroup,
  leaveGroup,
  removeMember,
} from "@/lib/groups"

async function newGroup(ownerName = "Owner") {
  const owner = await seedUser({ name: ownerName })
  const result = await createGroup(owner.id, "DSA Grind")
  if (!("slug" in result) || !result.slug) throw new Error("create failed")
  return { owner, slug: result.slug }
}

describe("study groups", () => {
  beforeEach(resetDb)

  it("creates a group with the creator as owner", async () => {
    const { owner, slug } = await newGroup()
    const page = await getGroupPage(slug, owner.id)
    expect(page?.viewerRole).toBe("owner")
    expect(page?.members).toHaveLength(1)
    expect(page?.members[0]!.role).toBe("owner")
  })

  it("gives same-named groups distinct slugs", async () => {
    const a = await newGroup()
    const b = await newGroup()
    expect(a.slug).not.toBe(b.slug)
  })

  it("join is idempotent and hides status from non-members", async () => {
    const { slug } = await newGroup()
    const joiner = await seedUser({ username: "joiner", name: "Joiner" })
    const stranger = await seedUser({ username: "stranger" })

    // Non-member sees no roster.
    const preview = await getGroupPage(slug, stranger.id)
    expect(preview?.viewerRole).toBeNull()
    expect(preview?.members).toEqual([])

    expect(await joinGroup(joiner.id, slug)).toMatchObject({ ok: true })
    await joinGroup(joiner.id, slug) // again → no duplicate
    const page = await getGroupPage(slug, joiner.id)
    expect(page?.memberCount).toBe(2)
    expect(page?.viewerRole).toBe("member")
  })

  it("enforces the size cap", async () => {
    const { slug } = await newGroup()
    // Owner already counts as 1; fill the remaining slots.
    for (let i = 0; i < GROUP_SIZE_CAP - 1; i++) {
      const u = await seedUser()
      expect(await joinGroup(u.id, slug)).toMatchObject({ ok: true })
    }
    const overflow = await seedUser()
    expect(await joinGroup(overflow.id, slug)).toEqual({ error: "This group is full." })
  })

  it("blocks the owner from leaving but lets members leave", async () => {
    const { owner, slug } = await newGroup()
    const member = await seedUser()
    await joinGroup(member.id, slug)

    expect(await leaveGroup(owner.id, slug)).toMatchObject({ error: expect.any(String) })
    expect(await leaveGroup(member.id, slug)).toEqual({ ok: true })
    expect((await getGroupPage(slug, owner.id))?.memberCount).toBe(1)
  })

  it("only the owner can remove members", async () => {
    const { owner, slug } = await newGroup()
    const member = await seedUser()
    const other = await seedUser()
    await joinGroup(member.id, slug)
    await joinGroup(other.id, slug)

    expect(await removeMember(member.id, slug, other.id)).toEqual({
      error: "Only the owner can remove members.",
    })
    expect(await removeMember(owner.id, slug, other.id)).toEqual({ ok: true })
    expect((await getGroupPage(slug, owner.id))?.memberCount).toBe(2)
  })

  it("owner-only delete removes the group", async () => {
    const { owner, slug } = await newGroup()
    const member = await seedUser()
    await joinGroup(member.id, slug)

    expect(await deleteGroup(member.id, slug)).toEqual({
      error: "Only the owner can delete this group.",
    })
    expect(await deleteGroup(owner.id, slug)).toEqual({ ok: true })
    expect(await getGroupPage(slug, owner.id)).toBeNull()
  })
})
