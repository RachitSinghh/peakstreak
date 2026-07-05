import { sendEmail } from "@/lib/email/send"
import { feedbackEmail } from "@/lib/email/templates"
import { db, schema } from "@/lib/db"
import { env } from "@/lib/env"

export interface FeedbackInput {
  userId: string | null
  email: string | null
  message: string
  path: string | null
}

/**
 * Persists a feedback submission (the durable record) and best-effort emails
 * it to FEEDBACK_TO. The DB write is the source of truth; a failed or
 * unconfigured email never loses the submission.
 */
export async function submitFeedback(input: FeedbackInput): Promise<void> {
  await db.insert(schema.feedback).values({
    userId: input.userId,
    email: input.email,
    message: input.message,
    path: input.path,
  })

  const to = env().FEEDBACK_EMAIL
  if (!to) return

  try {
    const message = feedbackEmail({
      message: input.message,
      fromEmail: input.email,
      userId: input.userId,
      path: input.path,
    })
    await sendEmail({ to, subject: message.subject, html: message.html, text: message.text })
  } catch (error) {
    // Stored already — don't fail the request just because the notify bounced.
    console.error("[feedback] notification email failed:", error)
  }
}
