"use client"

import { useState, useTransition } from "react"
import { HeartHandshake } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@workspace/ui/components/button"

import { acceptPartner, requestPartner } from "@/app/(app)/partner-actions"
import type { PartnerViewerState } from "@/lib/partnerships"

/**
 * SOC-05: request-a-partner button on a profile. Accept/decline and ending
 * happen on the dashboard card, so here it only sends a request or reflects an
 * existing tie. Hidden when the viewer already has a different active partner.
 */
export function PartnerButton({
  targetId,
  initialState,
}: {
  targetId: string
  initialState: PartnerViewerState
}) {
  const [state, setState] = useState<PartnerViewerState>(initialState)
  const [pending, startTransition] = useTransition()

  if (state === "has_other") return null

  if (state === "partners") {
    return (
      <Button size="sm" variant="outline" disabled>
        <HeartHandshake className="size-3.5" />
        Partners
      </Button>
    )
  }

  if (state === "requested") {
    return (
      <Button size="sm" variant="outline" disabled>
        Requested
      </Button>
    )
  }

  function act(fn: () => Promise<{ error?: string }>, next: PartnerViewerState) {
    const prev = state
    setState(next)
    startTransition(async () => {
      const result = await fn()
      if (result.error) {
        setState(prev)
        toast.error(result.error)
      }
    })
  }

  if (state === "incoming") {
    return (
      <Button
        size="sm"
        disabled={pending}
        onClick={() => act(() => acceptPartner(targetId), "partners")}
      >
        <HeartHandshake className="size-3.5" />
        Accept partner
      </Button>
    )
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() => act(() => requestPartner(targetId), "requested")}
    >
      <HeartHandshake className="size-3.5" />
      Ask to be partners
    </Button>
  )
}
