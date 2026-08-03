"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth"
import { markNudgesSeen, sendNudge, type NudgeKind } from "@/lib/nudges"

export type NudgeActionState = { ok?: true; error?: string }

/** Send a prewritten nudge to `toUserId`. Rate-limited per pair per day. */
export async function sendNudgeAction(
  toUserId: string,
  kind: NudgeKind = "cheer",
): Promise<NudgeActionState> {
  const me = await requireUserId()
  const result = await sendNudge(me, toUserId, kind)
  if ("error" in result) return { error: result.error }
  return { ok: true }
}

/** Mark the viewer's unseen nudges as seen (called when the inbox mounts). */
export async function markNudgesSeenAction(): Promise<void> {
  const me = await requireUserId()
  await markNudgesSeen(me)
  revalidatePath("/dashboard")
}
