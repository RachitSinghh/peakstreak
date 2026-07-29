"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth"
import { followUserById, resolveUsername, unfollowUserById } from "@/lib/follows"

export type FollowState = { ok?: true; error?: string }

async function toggleFollow(username: string, follow: boolean): Promise<FollowState> {
  const me = await requireUserId()
  const target = await resolveUsername(username)
  if (!target) return { error: "User not found." }
  if (target === me) return { error: "You can't follow yourself." }

  if (follow) await followUserById(me, target)
  else await unfollowUserById(me, target)

  revalidatePath(`/u/${username}`)
  return { ok: true }
}

export function followUser(username: string): Promise<FollowState> {
  return toggleFollow(username, true)
}

export function unfollowUser(username: string): Promise<FollowState> {
  return toggleFollow(username, false)
}
