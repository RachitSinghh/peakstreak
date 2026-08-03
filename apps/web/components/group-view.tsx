"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Flame, Link2, Users } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

import {
  deleteGroupAction,
  joinGroupAction,
  leaveGroupAction,
  removeMemberAction,
} from "@/app/(app)/group-actions"
import { GROUP_SIZE_CAP, type GroupPage } from "@/lib/groups-shared"

/** SOC-06: group page — member roster (streak + today) with role-gated actions. */
export function GroupView({ group }: { group: GroupPage }) {
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const isOwner = group.viewerRole === "owner"
  const isMember = group.viewerRole !== null

  function run(fn: () => Promise<{ error?: string }>, onOk?: () => void) {
    startTransition(async () => {
      const result = await fn()
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (onOk) onOk()
      else router.refresh()
    })
  }

  function copyInvite() {
    void navigator.clipboard.writeText(`${window.location.origin}/g/${group.slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 py-2">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground mt-1 text-sm">{group.description}</p>
          )}
          <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
            <Users className="size-3.5" />
            {group.memberCount} / {GROUP_SIZE_CAP} member{group.memberCount === 1 ? "" : "s"}
          </p>
        </div>
        {isMember && (
          <Button size="sm" variant="outline" onClick={copyInvite}>
            {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />}
            {copied ? "Copied" : "Invite link"}
          </Button>
        )}
      </div>

      {!isMember ? (
        <div className="border-border bg-card flex flex-col items-start gap-3 rounded-xl border p-5">
          <p className="text-muted-foreground text-sm">
            Join this group to see everyone&apos;s streaks and keep each other accountable.
          </p>
          <Button
            size="sm"
            disabled={pending || group.isFull}
            onClick={() => run(() => joinGroupAction(group.slug))}
          >
            {group.isFull ? "Group is full" : "Join group"}
          </Button>
        </div>
      ) : (
        <ul className="border-border bg-card divide-border/60 divide-y rounded-xl border">
          {group.members.map((m) => (
            <li key={m.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar size="sm">
                {m.image && <AvatarImage src={m.image} alt="" />}
                <AvatarFallback>{m.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                {m.username ? (
                  <Link href={`/u/${m.username}`} className="text-sm font-medium hover:underline">
                    {m.displayName}
                  </Link>
                ) : (
                  <span className="text-sm font-medium">{m.displayName}</span>
                )}
                {m.role === "owner" && (
                  <span className="bg-secondary text-muted-foreground ml-2 rounded px-1.5 py-0.5 text-xs">
                    owner
                  </span>
                )}
              </div>
              <span
                className={`text-xs ${m.studiedToday ? "text-emerald-500" : "text-muted-foreground"}`}
              >
                {m.studiedToday ? "studied today" : "not yet today"}
              </span>
              <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                <Flame className="size-3" />
                {m.currentStreak}d
              </span>
              {isOwner && m.role !== "owner" && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => run(() => removeMemberAction(group.slug, m.userId))}
                >
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {isMember && (
        <div>
          {isOwner ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => deleteGroupAction(group.slug), () => router.push("/groups"))}
            >
              Delete group
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => leaveGroupAction(group.slug), () => router.push("/groups"))}
            >
              Leave group
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
