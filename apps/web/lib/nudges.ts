import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { track } from "@/lib/analytics"
import { db, schema } from "@/lib/db"
import { sendEmail, type EmailTransport } from "@/lib/email/send"
import { nudgeEmail } from "@/lib/email/templates"
import { env } from "@/lib/env"
import { resolveDisplayName } from "@/lib/leaderboard-shared"
import { nudgeMessage, type NudgeKind } from "@/lib/nudges-shared"
import { checkRateLimit } from "@/lib/rate-limit"

// Re-export the pure copy/types so server-side callers can keep importing them
// from here; client components import from `nudges-shared` directly.
export { NUDGE_KINDS, nudgeMessage, type NudgeKind } from "@/lib/nudges-shared"

/**
 * SOC-08: one-tap prewritten encouragement. No free text (avoids moderation).
 * Delivery is an in-app row (the `nudges` table doubles as the notification
 * store) plus an optional email if the recipient opted into reminder emails.
 * Pure copy/types live in `lib/nudges-shared.ts` so client code can reuse them
 * without importing this server-only module.
 */

export interface InboxNudge {
  id: string
  fromDisplayName: string
  fromUsername: string | null
  image: string | null
  message: string
  createdAt: Date
}

export type SendNudgeResult = { ok: true } | { error: string }

/**
 * Send a nudge from → to. Rejects self, rate-limited to one per pair per day
 * (fail-open: no Redis in dev means always allowed). Records the in-app row,
 * then best-effort emails the recipient if they have reminder emails on — an
 * email failure never fails the nudge.
 */
export async function sendNudge(
  fromUserId: string,
  toUserId: string,
  kind: NudgeKind = "cheer",
  transport: EmailTransport = sendEmail,
): Promise<SendNudgeResult> {
  if (fromUserId === toUserId) return { error: "You can't nudge yourself." }

  const { ok } = await checkRateLimit({
    name: "nudge",
    identifier: `${fromUserId}:${toUserId}`,
    limit: 1,
    window: "1 d",
  })
  if (!ok) return { error: "You already nudged them today." }

  const [recipient, sender] = await Promise.all([
    db.query.users.findFirst({ where: eq(schema.users.id, toUserId) }),
    db.query.users.findFirst({ where: eq(schema.users.id, fromUserId) }),
  ])
  if (!recipient || !sender) return { error: "User not found." }

  await db.insert(schema.nudges).values({ fromUserId, toUserId, kind })
  void track("nudge_sent", { userId: fromUserId, properties: { toUserId, kind } })

  const fromName = resolveDisplayName(sender.displayName, sender.name, sender.id)
  await maybeEmail(recipient, fromName, kind, transport)

  return { ok: true }
}

/** Email the recipient only if they opted into reminder emails. Best-effort. */
async function maybeEmail(
  recipient: typeof schema.users.$inferSelect,
  fromName: string,
  kind: NudgeKind,
  transport: EmailTransport,
): Promise<void> {
  const prefs = await db.query.emailPreferences.findFirst({
    where: eq(schema.emailPreferences.userId, recipient.id),
  })
  if (!prefs?.remindersEnabled) return

  const appUrl = env().NEXT_PUBLIC_APP_URL
  const unsubscribeUrl = `${appUrl}/api/email/unsubscribe?token=${prefs.unsubscribeToken}`
  try {
    await transport({
      to: recipient.email,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>` },
      ...nudgeEmail({
        name: recipient.name,
        fromName,
        message: nudgeMessage(fromName, kind),
        appUrl,
        unsubscribeUrl,
      }),
    })
  } catch (err) {
    console.warn("[nudge] email failed (nudge still recorded):", (err as Error).message)
  }
}

/** Unseen nudges for the recipient's in-app inbox, newest first. */
export async function getUnseenNudges(userId: string): Promise<InboxNudge[]> {
  const rows = await db
    .select({
      id: schema.nudges.id,
      kind: schema.nudges.kind,
      createdAt: schema.nudges.createdAt,
      name: schema.users.name,
      displayName: schema.users.displayName,
      username: schema.users.username,
      image: schema.users.image,
      fromId: schema.users.id,
    })
    .from(schema.nudges)
    .innerJoin(schema.users, eq(schema.users.id, schema.nudges.fromUserId))
    .where(and(eq(schema.nudges.toUserId, userId), isNull(schema.nudges.seenAt)))
    .orderBy(desc(schema.nudges.createdAt))
    .limit(20)

  return rows.map((r) => {
    const fromDisplayName = resolveDisplayName(r.displayName, r.name, r.fromId)
    return {
      id: r.id,
      fromDisplayName,
      fromUsername: r.username,
      image: r.image,
      message: nudgeMessage(fromDisplayName, r.kind),
      createdAt: r.createdAt,
    }
  })
}

/** Mark every unseen nudge for this user as seen (called when the inbox renders). */
export async function markNudgesSeen(userId: string): Promise<void> {
  await db
    .update(schema.nudges)
    .set({ seenAt: sql`now()` })
    .where(and(eq(schema.nudges.toUserId, userId), isNull(schema.nudges.seenAt)))
}
