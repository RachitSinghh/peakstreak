"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth"
import {
  createGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  removeMember,
  type GroupActionResult,
} from "@/lib/groups"

export type GroupActionState = { ok?: true; slug?: string; error?: string }

function toState(result: GroupActionResult): GroupActionState {
  return "error" in result ? { error: result.error } : { ok: true, slug: result.slug }
}

/** Create a group; returns its slug so the client can navigate to it. */
export async function createGroupAction(
  name: string,
  description?: string,
): Promise<GroupActionState> {
  const me = await requireUserId()
  const result = await createGroup(me, name, description)
  if ("ok" in result) revalidatePath("/groups")
  return toState(result)
}

export async function joinGroupAction(slug: string): Promise<GroupActionState> {
  const me = await requireUserId()
  const result = await joinGroup(me, slug)
  revalidatePath(`/g/${slug}`)
  return toState(result)
}

export async function leaveGroupAction(slug: string): Promise<GroupActionState> {
  const me = await requireUserId()
  const result = await leaveGroup(me, slug)
  revalidatePath(`/g/${slug}`)
  return toState(result)
}

export async function removeMemberAction(
  slug: string,
  targetUserId: string,
): Promise<GroupActionState> {
  const me = await requireUserId()
  const result = await removeMember(me, slug, targetUserId)
  revalidatePath(`/g/${slug}`)
  return toState(result)
}

export async function deleteGroupAction(slug: string): Promise<GroupActionState> {
  const me = await requireUserId()
  const result = await deleteGroup(me, slug)
  revalidatePath("/groups")
  return toState(result)
}
