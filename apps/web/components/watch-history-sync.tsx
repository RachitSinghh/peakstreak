"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { syncWatchHistoryAction } from "@/app/(app)/watch-history-actions"

/**
 * Runs the cross-playlist auto-complete sweep once when the dashboard mounts.
 * If it marks anything, tell the user and refresh so the cards show it. The
 * sweep is idempotent, so a steady state marks nothing and stays silent.
 */
export function WatchHistorySync() {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return // guard React strict-mode double-invoke
    ran.current = true
    void syncWatchHistoryAction().then(({ marked }) => {
      if (marked <= 0) return
      toast.success(
        `Marked ${marked} video${marked === 1 ? "" : "s"} complete — you'd already finished ${
          marked === 1 ? "it" : "them"
        } in another playlist.`,
      )
      router.refresh()
    })
  }, [router])

  return null
}
