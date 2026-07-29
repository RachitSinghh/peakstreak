"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth"
import { removeFollow, requestFollow } from "@/lib/follows"

export type FollowActionState = { ok?: true; error?: string }

/** Send a follow request to `targetId`. */
export async function sendFollowRequest(targetId: string): Promise<FollowActionState> {
  const me = await requireUserId()
  if (targetId === me) return { error: "You can't follow yourself." }
  try {
    await requestFollow(me, targetId)
  } catch {
    return { error: "User not found." } // FK violation → target doesn't exist
  }
  revalidatePath("/profile")
  return { ok: true }
}

/** Cancel a pending request or unfollow — removes the me→target edge. */
export async function cancelFollow(targetId: string): Promise<FollowActionState> {
  const me = await requireUserId()
  await removeFollow(me, targetId)
  revalidatePath("/profile")
  return { ok: true }
}
