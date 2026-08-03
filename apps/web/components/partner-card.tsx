"use client"

import { useTransition } from "react"
import Link from "next/link"
import { Flame, HeartHandshake } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

import { acceptPartner, declinePartner, endPartner } from "@/app/(app)/partner-actions"
import { NudgeButton } from "@/components/nudge-button"
import type { PartnerCard as PartnerCardData } from "@/lib/partnerships"

/**
 * SOC-05: the dashboard accountability-partner card. Shows the active partner's
 * today-status + streak with a nudge, pending requests to accept/decline, or an
 * outgoing request. Renders nothing when there's no partner and no requests.
 */
export function PartnerCard({ card }: { card: PartnerCardData }) {
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const result = await fn()
      if (result.error) toast.error(result.error)
    })
  }

  const { active, incoming, outgoing } = card
  if (!active && incoming.length === 0 && !outgoing) return null

  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <div className="text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium">
        <HeartHandshake className="size-4" />
        Accountability partner
      </div>

      {active ? (
        <div className="flex items-center gap-3">
          <PartnerAvatar name={active.displayName} image={active.image} username={active.username} />
          <div className="min-w-0 flex-1">
            <PartnerName displayName={active.displayName} username={active.username} />
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <span className={active.studiedToday ? "text-emerald-500" : ""}>
                {active.studiedToday ? "Studied today ✓" : "Hasn't studied today"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3" />
                {active.currentStreak}d
              </span>
            </div>
          </div>
          <NudgeButton toUserId={active.userId} kind="streak" />
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(endPartner)}>
            End
          </Button>
        </div>
      ) : outgoing ? (
        <div className="flex items-center gap-3">
          <PartnerAvatar name={outgoing.displayName} image={outgoing.image} username={outgoing.username} />
          <div className="min-w-0 flex-1">
            <PartnerName displayName={outgoing.displayName} username={outgoing.username} />
            <p className="text-muted-foreground text-xs">Partner request sent — waiting for them.</p>
          </div>
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(endPartner)}>
            Cancel
          </Button>
        </div>
      ) : null}

      {!active && incoming.length > 0 && (
        <ul className="flex flex-col gap-2">
          {incoming.map((r) => (
            <li key={r.userId} className="flex items-center gap-3">
              <PartnerAvatar name={r.displayName} image={r.image} username={r.username} />
              <div className="min-w-0 flex-1">
                <PartnerName displayName={r.displayName} username={r.username} />
                <p className="text-muted-foreground text-xs">wants to be your partner</p>
              </div>
              <Button size="sm" disabled={pending} onClick={() => run(() => acceptPartner(r.userId))}>
                Accept
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => declinePartner(r.userId))}
              >
                Decline
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PartnerAvatar({
  name,
  image,
  username,
}: {
  name: string
  image: string | null
  username: string | null
}) {
  const avatar = (
    <Avatar size="sm">
      {image && <AvatarImage src={image} alt="" />}
      <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  )
  return username ? (
    <Link href={`/u/${username}`} className="shrink-0">
      {avatar}
    </Link>
  ) : (
    <span className="shrink-0">{avatar}</span>
  )
}

function PartnerName({
  displayName,
  username,
}: {
  displayName: string
  username: string | null
}) {
  return username ? (
    <Link href={`/u/${username}`} className="text-sm font-medium hover:underline">
      {displayName}
    </Link>
  ) : (
    <span className="text-sm font-medium">{displayName}</span>
  )
}
