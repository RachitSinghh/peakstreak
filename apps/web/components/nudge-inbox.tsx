"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Hand } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

import { markNudgesSeenAction } from "@/app/(app)/nudge-actions"
import type { InboxNudge } from "@/lib/nudges"

/**
 * SOC-08: the in-app nudge inbox. Renders unseen nudges on the dashboard and
 * marks them seen on mount, so they show once and don't nag on every reload.
 */
export function NudgeInbox({ nudges }: { nudges: InboxNudge[] }) {
  useEffect(() => {
    if (nudges.length > 0) void markNudgesSeenAction()
  }, [nudges.length])

  if (nudges.length === 0) return null

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <div className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
        <Hand className="size-4" />
        {nudges.length === 1 ? "You got a nudge" : `${nudges.length} new nudges`}
      </div>
      <ul className="flex flex-col gap-2">
        {nudges.map((n) => (
          <li key={n.id} className="flex items-center gap-3 text-sm">
            <Avatar size="sm">
              {n.image && <AvatarImage src={n.image} alt="" />}
              <AvatarFallback>{n.fromDisplayName.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              {n.fromUsername ? (
                <Link href={`/u/${n.fromUsername}`} className="font-medium hover:underline">
                  {n.fromDisplayName}
                </Link>
              ) : (
                <span className="font-medium">{n.fromDisplayName}</span>
              )}{" "}
              <span className="text-muted-foreground">
                {n.message.slice(n.fromDisplayName.length).trim()}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
