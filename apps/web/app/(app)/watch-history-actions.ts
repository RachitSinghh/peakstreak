"use server"

import { requireUserId } from "@/lib/auth"
import { syncCompletedFromHistory } from "@/lib/watch-history"

/** Mark videos complete across playlists when the user already finished them elsewhere. */
export async function syncWatchHistoryAction(): Promise<{ marked: number }> {
  const me = await requireUserId()
  const marked = await syncCompletedFromHistory(me)
  return { marked }
}
