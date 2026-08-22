import { and, eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"

import { db, resetDb, schema, seedEnrollment, seedUser } from "./helpers"

import {
  GROUP_SIZE_CAP,
  createGroup,
  deleteGroup,
  getGroupPage,
  joinGroup,
  leaveGroup,
  removeMember,
  setGroupGoal,
} from "@/lib/groups"

/** The stored clone-enrollment id for a member, or null. */
async function memberGoalEnrollment(slug: string, userId: string): Promise<string | null> {
  const group = await db.query.studyGroups.findFirst({
    where: eq(schema.studyGroups.slug, slug),
    columns: { id: true },
  })
  const row = await db.query.groupMembers.findFirst({
    where: and(
      eq(schema.groupMembers.groupId, group!.id),
      eq(schema.groupMembers.userId, userId),
    ),
    columns: { goalEnrollmentId: true },
  })
  return row?.goalEnrollmentId ?? null
}

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

  it("owner sets a goal and every member gets their own distinct clone", async () => {
    const { owner, slug } = await newGroup()
    const member = await seedUser()
    await joinGroup(member.id, slug)

    const source = await seedEnrollment({ userId: owner.id, videoCount: 3 })
    expect(await setGroupGoal(owner.id, slug, source.playlist.id)).toMatchObject({ ok: true })

    const page = await getGroupPage(slug, owner.id)
    expect(page?.goal).toMatchObject({ videoCount: 3, groupStreak: 0, avgCompletionPct: 0 })

    const ownerClone = await memberGoalEnrollment(slug, owner.id)
    const memberClone = await memberGoalEnrollment(slug, member.id)
    expect(ownerClone).toBeTruthy()
    expect(memberClone).toBeTruthy()
    expect(ownerClone).not.toBe(memberClone) // each member tracks their own copy
  })

  it("a late joiner gets a clone of an already-set goal", async () => {
    const { owner, slug } = await newGroup()
    const source = await seedEnrollment({ userId: owner.id, videoCount: 2 })
    await setGroupGoal(owner.id, slug, source.playlist.id)

    const latecomer = await seedUser()
    await joinGroup(latecomer.id, slug)
    expect(await memberGoalEnrollment(slug, latecomer.id)).toBeTruthy()
  })

  it("averages member completion into collective progress", async () => {
    const { owner, slug } = await newGroup()
    const member = await seedUser()
    await joinGroup(member.id, slug)
    const source = await seedEnrollment({ userId: owner.id, videoCount: 4 })
    await setGroupGoal(owner.id, slug, source.playlist.id)

    // Owner completes 2 of 4 on their clone; member completes none. Avg = (50 + 0) / 2 = 25.
    const ownerClone = (await memberGoalEnrollment(slug, owner.id))!
    await db.insert(schema.videoProgress).values(
      source.videos.slice(0, 2).map((v) => ({
        userPlaylistId: ownerClone,
        videoId: v.id,
        isCompleted: true,
      })),
    )

    const page = await getGroupPage(slug, owner.id)
    expect(page?.goal?.avgCompletionPct).toBe(25)
    expect(page?.members.find((m) => m.userId === owner.id)?.goalCompletedCount).toBe(2)
  })

  it("only the owner can set the goal, and once", async () => {
    const { owner, slug } = await newGroup()
    const member = await seedUser()
    await joinGroup(member.id, slug)
    const source = await seedEnrollment({ userId: owner.id, videoCount: 2 })

    expect(await setGroupGoal(member.id, slug, source.playlist.id)).toEqual({
      error: "Only the owner can set the group goal.",
    })
    expect(await setGroupGoal(owner.id, slug, source.playlist.id)).toMatchObject({ ok: true })
    expect(await setGroupGoal(owner.id, slug, source.playlist.id)).toEqual({
      error: "This group already has a goal.",
    })
  })
})
