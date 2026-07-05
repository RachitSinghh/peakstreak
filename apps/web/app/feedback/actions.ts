"use server"

import { z } from "zod"

import { currentUserId } from "@/lib/auth"
import { track } from "@/lib/analytics"
import { submitFeedback } from "@/lib/feedback"

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

  const userId = await currentUserId()
  await submitFeedback({
    userId,
    email: parsed.data.email,
    message: parsed.data.message,
    path: parsed.data.path ?? null,
  })
  track("feedback_submitted", { userId, properties: { hasEmail: Boolean(parsed.data.email) } })

  return { sent: true }
}
