import { beforeEach, describe, expect, it } from "vitest"

import { resetDb, seedUser } from "./helpers"

import {
  acceptPartnership,
  endPartnership,
  getPartnerCard,
  getPartnerState,
  partnerOf,
  requestPartnership,
} from "@/lib/partnerships"

describe("partnerOf (pure)", () => {
  it("returns the other party from my point of view", () => {
    const row = { requesterId: "a", addresseeId: "b" } as Parameters<typeof partnerOf>[0]
    expect(partnerOf(row, "a")).toBe("b")
    expect(partnerOf(row, "b")).toBe("a")
  })
})

describe("partnerships", () => {
  beforeEach(resetDb)

  it("request → accept makes an active partnership visible to both", async () => {
    const me = await seedUser({ username: "me", name: "Me" })
    const you = await seedUser({ username: "you", name: "You" })

    expect(await requestPartnership(me.id, you.id)).toEqual({ ok: true })
    expect(await getPartnerState(me.id, you.id)).toBe("requested")
    expect(await getPartnerState(you.id, me.id)).toBe("incoming")

    expect(await acceptPartnership(you.id, me.id)).toEqual({ ok: true })

    const myCard = await getPartnerCard(me.id)
    const yourCard = await getPartnerCard(you.id)
    expect(myCard.active?.userId).toBe(you.id)
    expect(yourCard.active?.userId).toBe(me.id)
    expect(myCard.active?.studiedToday).toBe(false)
  })

  it("rejects self and a second active partner", async () => {
    const me = await seedUser({ username: "me2" })
    const a = await seedUser({ username: "a2" })
    const b = await seedUser({ username: "b2" })

    expect(await requestPartnership(me.id, me.id)).toEqual({
      error: "You can't partner with yourself.",
    })

    await requestPartnership(me.id, a.id)
    await acceptPartnership(a.id, me.id)

    // Already partnered → can't request or accept another.
    expect(await requestPartnership(me.id, b.id)).toEqual({
      error: "You already have an active partner.",
    })
    await requestPartnership(b.id, me.id)
    expect(await acceptPartnership(me.id, b.id)).toEqual({
      error: "You already have an active partner.",
    })
  })

  it("a request back accepts the pending one instead of duplicating", async () => {
    const me = await seedUser({ username: "me3" })
    const you = await seedUser({ username: "you3" })

    await requestPartnership(you.id, me.id) // they ask first
    expect(await requestPartnership(me.id, you.id)).toEqual({ ok: true }) // I ask back → accept

    expect((await getPartnerCard(me.id)).active?.userId).toBe(you.id)
  })

  it("ending a partnership frees both to partner again", async () => {
    const me = await seedUser({ username: "me4" })
    const you = await seedUser({ username: "you4" })

    await requestPartnership(me.id, you.id)
    await acceptPartnership(you.id, me.id)
    await endPartnership(me.id)

    expect((await getPartnerCard(me.id)).active).toBeNull()
    expect(await getPartnerState(me.id, you.id)).toBe("none")
  })
})
