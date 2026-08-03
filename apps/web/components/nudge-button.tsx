"use client"

import { useState, useTransition } from "react"
import { Hand } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

import { sendNudgeAction } from "@/app/(app)/nudge-actions"
import { NUDGE_KINDS, type NudgeKind } from "@/lib/nudges-shared"

/**
 * SOC-08: one-tap nudge. Sends a prewritten encouragement, then locks to
 * "Nudged" — the send is rate-limited to one per pair per day server-side,
 * so re-sending just surfaces that as a toast.
 */
export function NudgeButton({
  toUserId,
  kind = "cheer",
  variant = "outline",
}: {
  toUserId: string
  kind?: NudgeKind
  variant?: "outline" | "ghost" | "default"
}) {
  const [sent, setSent] = useState(false)
  const [pending, startTransition] = useTransition()

  function click() {
    startTransition(async () => {
      const result = await sendNudgeAction(toUserId, kind)
      if (result.error) {
        toast.error(result.error)
        if (result.error.includes("today")) setSent(true) // already nudged → lock anyway
        return
      }
      setSent(true)
      toast.success("Nudge sent 👋")
    })
  }

  return (
    <Button size="sm" variant={variant} disabled={pending || sent} onClick={click}>
      <Hand className="size-3.5" />
      {sent ? "Nudged" : NUDGE_KINDS[kind].label}
    </Button>
  )
}
