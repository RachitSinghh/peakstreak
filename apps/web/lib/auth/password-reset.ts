import crypto from "node:crypto"

import bcrypt from "bcryptjs"
import { eq } from "drizzle-orm"

import { sendEmail } from "@/lib/email/send"
import { passwordResetEmail } from "@/lib/email/templates"
import { db, schema } from "@/lib/db"
import { env } from "@/lib/env"

const TTL_MINUTES = 60
const EXPIRES_IN_LABEL = "1 hour"

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex")
}

/**
 * Issues a reset link for the address when a credentials account exists.
 * Always resolves without signalling existence (no account enumeration);
 * OAuth-only accounts (no passwordHash) get nothing to reset.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim()
  const user = await db.query.users.findFirst({ where: eq(schema.users.email, email) })
  if (!user?.passwordHash) return

  // Only one live token per user — issuing a new link invalidates the old.
  await db
    .delete(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.userId, user.id))

  const rawToken = crypto.randomBytes(32).toString("base64url")
  await db.insert(schema.passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + TTL_MINUTES * 60_000),
  })

  const resetUrl = `${env().NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}`
  const message = passwordResetEmail({ name: user.name, resetUrl, expiresIn: EXPIRES_IN_LABEL })
  try {
    await sendEmail({
      to: user.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
  } catch (error) {
    // The token is already stored. A mail-provider failure must not 500 the
    // request or make its response differ from the "no such account" path —
    // that difference would leak which emails are registered. Log loudly for
    // the operator (this is where a misconfigured Resend domain shows up) and
    // let the caller return the same neutral confirmation.
    console.error("[password-reset] reset email failed to send:", error)
  }
}

export type ResetOutcome = "ok" | "invalid" | "expired"

/**
 * Verifies a raw reset token and, if valid, sets the new password. The token
 * (and any siblings for that user) is deleted on success so it can't be
 * replayed. JWT sessions aren't invalidated here — a note for a future move
 * to DB sessions or a token-version claim.
 */
export async function resetPassword(rawToken: string, newPassword: string): Promise<ResetOutcome> {
  if (!rawToken) return "invalid"

  const [row] = await db
    .select()
    .from(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.tokenHash, hashToken(rawToken)))
    .limit(1)

  if (!row || row.usedAt) return "invalid"
  if (row.expiresAt.getTime() < Date.now()) return "expired"

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.update(schema.users).set({ passwordHash }).where(eq(schema.users.id, row.userId))
  await db
    .delete(schema.passwordResetTokens)
    .where(eq(schema.passwordResetTokens.userId, row.userId))

  return "ok"
}
