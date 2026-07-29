"use server"

import { and, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { requireUserId } from "@/lib/auth"
import { db, schema } from "@/lib/db"
import { normalizeTimezone } from "@/lib/user"
import { validateUsername } from "@/lib/username"

const settingsSchema = z.object({
  timezone: z.string().min(1),
  remindersEnabled: z.boolean(),
  reminderHourLocal: z.number().int().min(0).max(23),
  showOnLeaderboard: z.boolean(),
  // Empty string → no custom name (falls back to first name / anonymous).
  displayName: z.string().trim().max(40),
  // SOC-01: profile handle + bio. Empty username → leave whatever's already set.
  username: z.string().trim().max(30),
  bio: z.string().trim().max(160),
})

export type SettingsState = { error?: string; saved?: boolean }

export type UsernameCheck = { status: "available" | "taken" | "invalid"; message: string }

/** Live availability check for the settings username field (debounced client-side). */
export async function checkUsername(raw: string): Promise<UsernameCheck> {
  const userId = await requireUserId()

  const check = validateUsername(raw)
  if (!check.ok) return { status: "invalid", message: check.error }

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.username, check.value),
    columns: { id: true },
  })
  if (existing && existing.id !== userId) {
    return { status: "taken", message: "That username is taken." }
  }
  return { status: "available", message: "Available" }
}

export async function updateSettings(
  input: z.infer<typeof settingsSchema>,
): Promise<SettingsState> {
  const userId = await requireUserId()

  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid settings." }

  const timezone = normalizeTimezone(parsed.data.timezone)
  if (timezone !== parsed.data.timezone) {
    return { error: "Unknown timezone — pick one from the list." }
  }

  const current = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: { username: true },
  })
  let username = current?.username ?? null

  if (parsed.data.username !== "") {
    const check = validateUsername(parsed.data.username)
    if (!check.ok) return { error: check.error }
    if (check.value !== username) {
      const taken = await db.query.users.findFirst({
        where: and(eq(schema.users.username, check.value), ne(schema.users.id, userId)),
        columns: { id: true },
      })
      if (taken) return { error: "That username is taken." }
      username = check.value
    }
  }

  try {
    await db
      .update(schema.users)
      .set({
        timezone,
        showOnLeaderboard: parsed.data.showOnLeaderboard,
        displayName: parsed.data.displayName === "" ? null : parsed.data.displayName,
        username,
        bio: parsed.data.bio === "" ? null : parsed.data.bio,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
  } catch {
    // Unique-constraint race: someone claimed the same name between our check
    // and this write. The DB constraint is the real guard.
    return { error: "That username is taken." }
  }
  await db
    .update(schema.emailPreferences)
    .set({
      remindersEnabled: parsed.data.remindersEnabled,
      reminderHourLocal: parsed.data.reminderHourLocal,
      updatedAt: new Date(),
    })
    .where(eq(schema.emailPreferences.userId, userId))

  revalidatePath("/settings")
  return { saved: true }
}
