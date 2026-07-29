"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

import { cancelFollow, sendFollowRequest } from "@/app/u/[username]/actions"
import type { FollowState } from "@/lib/follows"

const LABEL: Record<FollowState, string> = {
  none: "Follow",
  requested: "Requested",
  following: "Following",
}

/**
 * SOC-02: the single follow button. Cycles Follow → Requested → (once the
 * other person accepts) Following, and back to Follow on cancel/unfollow.
 * Optimistic; rolls back on error.
 */
export function FollowButton({
  targetId,
  initialState,
}: {
  targetId: string
  initialState: FollowState
}) {
  const [state, setState] = useState<FollowState>(initialState)
  const [pending, startTransition] = useTransition()

  function click() {
    const prev = state
    // "none" → send a request; anything else → cancel/unfollow.
    const next: FollowState = prev === "none" ? "requested" : "none"
    setState(next)
    startTransition(async () => {
      const result = await (prev === "none" ? sendFollowRequest : cancelFollow)(targetId)
      if (result.error) {
        setState(prev)
        toast.error(result.error)
      }
    })
  }

  return (
    <Button
      size="sm"
      variant={state === "none" ? "default" : "outline"}
      disabled={pending}
      onClick={click}
    >
      {LABEL[state]}
    </Button>
  )
}
