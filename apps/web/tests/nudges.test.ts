import { beforeEach, describe, expect, it, vi } from "vitest"

import { resetDb, db, schema } from "./helpers"

import {
  getUnseenNudges,
  markNudgesSeen,
  nudgeMessage,
  sendNudge,
} from "@/lib/nudges"

const noEmail = vi.fn(async () => ({ providerMessageId: null }))

describe("nudgeMessage (pure)", () => {
  it("prefixes the sender name and picks the kind's copy", () => {
    expect(nudgeMessage("Ada", "cheer")).toContain("Ada")
    expect(nudgeMessage("Ada", "streak")).toContain("streak")
  })
})

describe("sendNudge + inbox", () => {
  beforeEach(async () => {
    await resetDb()
    noEmail.mockClear()
  })

  it("records a nudge the recipient can see, then mark seen", async () => {
    const from = await seedNamed("From")
    const to = await seedNamed("To")

    expect(await sendNudge(from.id, to.id, "cheer", noEmail)).toEqual({ ok: true })

    const unseen = await getUnseenNudges(to.id)
    expect(unseen).toHaveLength(1)
    expect(unseen[0]!.fromDisplayName).toBe("From")

    await markNudgesSeen(to.id)
    expect(await getUnseenNudges(to.id)).toHaveLength(0)
  })

  it("rejects self-nudge", async () => {
    const me = await seedNamed("Me")
    expect(await sendNudge(me.id, me.id, "cheer", noEmail)).toEqual({
      error: "You can't nudge yourself.",
    })
  })

  it("emails only when the recipient opted into reminder emails", async () => {
    const from = await seedNamed("From")
    const optedOut = await seedNamed("Out")
    const optedIn = await seedNamed("In")

    await db.insert(schema.emailPreferences).values({ userId: optedIn.id, remindersEnabled: true })
    await db
      .insert(schema.emailPreferences)
      .values({ userId: optedOut.id, remindersEnabled: false })

    await sendNudge(from.id, optedOut.id, "cheer", noEmail)
    expect(noEmail).not.toHaveBeenCalled()

    await sendNudge(from.id, optedIn.id, "cheer", noEmail)
    expect(noEmail).toHaveBeenCalledTimes(1)
  })
})

let n = 0
async function seedNamed(name: string) {
  n++
  const [user] = await db
    .insert(schema.users)
    .values({ email: `nudge${n}-${Date.now()}@test.dev`, name, timezone: "Asia/Kolkata" })
    .returning()
  return user!
}
