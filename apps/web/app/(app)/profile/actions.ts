"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth"
import { acceptFollow, removeFollow } from "@/lib/follows"

export type RequestActionState = { ok?: true; error?: string }

/** Accept a pending follow request from `followerId`. */
export async function acceptRequest(followerId: string): Promise<RequestActionState> {
  const me = await requireUserId()
  await acceptFollow(me, followerId)
  revalidatePath("/profile")
  return { ok: true }
}

/** Decline a pending follow request from `followerId` (removes it). */
export async function declineRequest(followerId: string): Promise<RequestActionState> {
  const me = await requireUserId()
  await removeFollow(followerId, me)
  revalidatePath("/profile")
  return { ok: true }
}
