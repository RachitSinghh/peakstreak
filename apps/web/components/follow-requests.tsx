"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

import { acceptRequest, declineRequest } from "@/app/(app)/profile/actions"
import type { IncomingRequest } from "@/lib/follows"

/** SOC-02: incoming follow requests with Accept / Decline, on your own profile. */
export function FollowRequests({ requests }: { requests: IncomingRequest[] }) {
  const [items, setItems] = useState(requests)
  const [pending, startTransition] = useTransition()

  if (items.length === 0) return null

  function act(followerId: string, accept: boolean) {
    setItems((xs) => xs.filter((x) => x.followerId !== followerId)) // optimistic
    startTransition(async () => {
      const result = await (accept ? acceptRequest : declineRequest)(followerId)
      if (result.error) toast.error(result.error)
    })
  }

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <h2 className="mb-3 text-sm font-medium">
        Follow requests <span className="text-muted-foreground">({items.length})</span>
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((r) => {
          const name = (
            <Link href={`/u/${r.username ?? r.followerId}`} className="font-medium hover:underline">
              {r.displayName}
            </Link>
          )
          return (
            <li key={r.followerId} className="flex items-center gap-3">
              <Avatar size="sm">
                {r.image && <AvatarImage src={r.image} alt="" />}
                <AvatarFallback>{r.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm">{name}</span>
              <Button size="sm" disabled={pending} onClick={() => act(r.followerId, true)}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => act(r.followerId, false)}
              >
                Decline
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
