"use server"

import { revalidatePath } from "next/cache"

import { requireUserId } from "@/lib/auth"
import {
  acceptPartnership,
  declinePartnership,
  endPartnership,
  requestPartnership,
} from "@/lib/partnerships"

export type PartnerActionState = { ok?: true; error?: string }

function toState(result: { ok: true } | { error: string }): PartnerActionState {
  return "error" in result ? { error: result.error } : { ok: true }
}

/** Ask `targetId` to be my accountability partner. */
export async function requestPartner(targetId: string): Promise<PartnerActionState> {
  const me = await requireUserId()
  const result = await requestPartnership(me, targetId)
  revalidatePath("/dashboard")
  return toState(result)
}

/** Accept a pending partner request from `requesterId`. */
export async function acceptPartner(requesterId: string): Promise<PartnerActionState> {
  const me = await requireUserId()
  const result = await acceptPartnership(me, requesterId)
  revalidatePath("/dashboard")
  return toState(result)
}

/** Decline a pending partner request from `requesterId`. */
export async function declinePartner(requesterId: string): Promise<PartnerActionState> {
  const me = await requireUserId()
  const result = await declinePartnership(me, requesterId)
  revalidatePath("/dashboard")
  return toState(result)
}

/** End my active partnership, or cancel my outgoing request. */
export async function endPartner(): Promise<PartnerActionState> {
  const me = await requireUserId()
  const result = await endPartnership(me)
  revalidatePath("/dashboard")
  return toState(result)
}
