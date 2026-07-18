"use server"

import { z } from "zod"

import { currentUserId } from "@/lib/auth"
import { track } from "@/lib/analytics"
import { submitFeedback } from "@/lib/feedback"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

export type FeedbackState = { error?: string; sent?: boolean }

const feedbackSchema = z.object({
  message: z.string().trim().min(1, "Write a little something first").max(5000),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
  path: z.string().max(2048).optional(),
})

export async function submitFeedbackAction(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = feedbackSchema.safeParse({
    message: formData.get("message"),
    email: formData.get("email") ?? "",
    path: formData.get("path") ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const ip = await clientIp()
  const { ok } = await checkRateLimit({
    name: "feedback-ip",
    identifier: ip,
    limit: 6,
    window: "1 h",
  })
  if (!ok) {
    return { error: "You've sent a lot of feedback just now — please try again later." }
  }

  const userId = await currentUserId()
  try {
    await submitFeedback({
      userId,
      email: parsed.data.email,
      message: parsed.data.message,
      path: parsed.data.path ?? null,
    })
  } catch (error) {
    // The DB write is the source of truth; if it fails (e.g. a Neon cold-start
    // timeout) don't 500 — return an error so the optimistic "Thanks" reverts
    // to a retry prompt instead of falsely confirming a dropped submission.
    console.error("[feedback] submission failed:", error)
    return { error: "Couldn't send that just now — please try again in a moment." }
  }
  track("feedback_submitted", { userId, properties: { hasEmail: Boolean(parsed.data.email) } })

  return { sent: true }
}
