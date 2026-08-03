import { and, eq, or } from "drizzle-orm"

import { track } from "@/lib/analytics"
import { db, schema } from "@/lib/db"
import { localDateString } from "@/lib/dates"
import { resolveDisplayName } from "@/lib/leaderboard-shared"
import { getStreakSummary } from "@/lib/streaks"

/**
 * SOC-05: a mutual 1:1 accountability partnership on the follow model. Created
 * pending (a request), accepted by the addressee. Exactly one accepted
 * partnership per user — enforced in app code at accept time. Decline/end
 * deletes the row (mirrors `removeFollow`).
 */

type PartnershipRow = typeof schema.partnerships.$inferSelect

/** The other party in a partnership, from `me`'s point of view. */
export function partnerOf(row: PartnershipRow, me: string): string {
  return row.requesterId === me ? row.addresseeId : row.requesterId
}

export interface PartnerIdentity {
  userId: string
  displayName: string
  username: string | null
  image: string | null
}

export interface ActivePartner extends PartnerIdentity {
  studiedToday: boolean
  currentStreak: number
}

export interface PartnerCard {
  active: ActivePartner | null
  /** Pending requests awaiting my approval. */
  incoming: PartnerIdentity[]
  /** A request I sent that's still pending. */
  outgoing: PartnerIdentity | null
}

export type PartnerActionResult = { ok: true } | { error: string }

function identity(u: typeof schema.users.$inferSelect): PartnerIdentity {
  return {
    userId: u.id,
    displayName: resolveDisplayName(u.displayName, u.name, u.id),
    username: u.username,
    image: u.image,
  }
}

/** Any partnership row between the two users, in either direction. */
async function between(a: string, b: string): Promise<PartnershipRow | undefined> {
  return db.query.partnerships.findFirst({
    where: or(
      and(eq(schema.partnerships.requesterId, a), eq(schema.partnerships.addresseeId, b)),
      and(eq(schema.partnerships.requesterId, b), eq(schema.partnerships.addresseeId, a)),
    ),
  })
}

/** The user's accepted partnership, if any (either direction). */
async function activePartnership(userId: string): Promise<PartnershipRow | undefined> {
  return db.query.partnerships.findFirst({
    where: and(
      eq(schema.partnerships.status, "accepted"),
      or(
        eq(schema.partnerships.requesterId, userId),
        eq(schema.partnerships.addresseeId, userId),
      ),
    ),
  })
}

/**
 * Request a partnership with `targetId`. If they already requested me, this
 * accepts instead. Rejects self and blocks a second active partner.
 */
export async function requestPartnership(
  me: string,
  targetId: string,
): Promise<PartnerActionResult> {
  if (me === targetId) return { error: "You can't partner with yourself." }
  if (await activePartnership(me)) return { error: "You already have an active partner." }

  const existing = await between(me, targetId)
  if (existing?.status === "accepted") return { ok: true }
  if (existing?.status === "pending") {
    // They already asked me → accept; otherwise my own request already stands.
    if (existing.requesterId === targetId) return acceptPartnership(me, targetId)
    return { ok: true }
  }

  try {
    await db.insert(schema.partnerships).values({ requesterId: me, addresseeId: targetId })
  } catch {
    return { error: "User not found." } // FK violation → target doesn't exist
  }
  void track("partner_requested", { userId: me, properties: { targetId } })
  return { ok: true }
}

/** Addressee accepts a pending request from `requesterId`. Guards one-active. */
export async function acceptPartnership(
  me: string,
  requesterId: string,
): Promise<PartnerActionResult> {
  if (await activePartnership(me)) return { error: "You already have an active partner." }
  if (await activePartnership(requesterId))
    return { error: "They already have an active partner." }

  const updated = await db
    .update(schema.partnerships)
    .set({ status: "accepted" })
    .where(
      and(
        eq(schema.partnerships.requesterId, requesterId),
        eq(schema.partnerships.addresseeId, me),
        eq(schema.partnerships.status, "pending"),
      ),
    )
    .returning({ id: schema.partnerships.id })
  if (updated.length === 0) return { error: "Request no longer available." }
  void track("partner_accepted", { userId: me, properties: { requesterId } })
  return { ok: true }
}

/** Decline a pending request from `requesterId` (deletes it). */
export async function declinePartnership(
  me: string,
  requesterId: string,
): Promise<PartnerActionResult> {
  await db
    .delete(schema.partnerships)
    .where(
      and(
        eq(schema.partnerships.requesterId, requesterId),
        eq(schema.partnerships.addresseeId, me),
        eq(schema.partnerships.status, "pending"),
      ),
    )
  return { ok: true }
}

/** End my active partnership (either direction) or cancel my outgoing request. */
export async function endPartnership(me: string): Promise<PartnerActionResult> {
  const deleted = await db
    .delete(schema.partnerships)
    .where(
      or(eq(schema.partnerships.requesterId, me), eq(schema.partnerships.addresseeId, me)),
    )
    .returning({ id: schema.partnerships.id })
  if (deleted.length > 0) void track("partner_ended", { userId: me })
  return { ok: true }
}

/** The viewer's partnership relationship to a target, for the profile button. */
export type PartnerViewerState = "none" | "requested" | "incoming" | "partners" | "has_other"

export async function getPartnerState(me: string, target: string): Promise<PartnerViewerState> {
  const rel = await between(me, target)
  if (rel?.status === "accepted") return "partners"
  if (rel?.status === "pending") return rel.requesterId === me ? "requested" : "incoming"
  // No tie to this target — but a different active partner blocks a new one.
  if (await activePartnership(me)) return "has_other"
  return "none"
}

/** Everything the dashboard partner card needs, in one place. */
export async function getPartnerCard(me: string, now: Date = new Date()): Promise<PartnerCard> {
  const rows = await db
    .select({ row: schema.partnerships, user: schema.users })
    .from(schema.partnerships)
    .innerJoin(
      schema.users,
      or(
        and(
          eq(schema.partnerships.requesterId, me),
          eq(schema.users.id, schema.partnerships.addresseeId),
        ),
        and(
          eq(schema.partnerships.addresseeId, me),
          eq(schema.users.id, schema.partnerships.requesterId),
        ),
      ),
    )
    .where(
      or(eq(schema.partnerships.requesterId, me), eq(schema.partnerships.addresseeId, me)),
    )

  const acceptedRow = rows.find((r) => r.row.status === "accepted")
  const incoming = rows
    .filter((r) => r.row.status === "pending" && r.row.addresseeId === me)
    .map((r) => identity(r.user))
  const outgoingRow = rows.find((r) => r.row.status === "pending" && r.row.requesterId === me)

  return {
    active: acceptedRow ? await toActivePartner(acceptedRow.user, now) : null,
    incoming,
    outgoing: outgoingRow ? identity(outgoingRow.user) : null,
  }
}

/** A partner's live daily status: studied-today + current streak. */
async function toActivePartner(
  user: typeof schema.users.$inferSelect,
  now: Date,
): Promise<ActivePartner> {
  const today = localDateString(now, user.timezone)
  const [summary, todayRow] = await Promise.all([
    getStreakSummary(user.id, user.timezone, now),
    db
      .select({ videos: schema.dailyActivity.videosCompleted })
      .from(schema.dailyActivity)
      .where(
        and(
          eq(schema.dailyActivity.userId, user.id),
          eq(schema.dailyActivity.activityDate, today),
        ),
      ),
  ])
  return {
    ...identity(user),
    studiedToday: (todayRow[0]?.videos ?? 0) > 0,
    currentStreak: summary.currentStreak,
  }
}
