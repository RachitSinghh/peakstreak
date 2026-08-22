"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Check, Flame, Link2, Target, Users } from "lucide-react"
import { toast } from "sonner"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"

import {
  deleteGroupAction,
  joinGroupAction,
  leaveGroupAction,
  removeMemberAction,
  setGroupGoalAction,
} from "@/app/(app)/group-actions"
import { GROUP_SIZE_CAP, type GroupPage } from "@/lib/groups-shared"

/** SOC-06: group page — member roster (streak + today) with role-gated actions. */
export function GroupView({ group }: { group: GroupPage }) {
  const [pending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [goalPlaylistId, setGoalPlaylistId] = useState("")
  const [threshold, setThreshold] = useState(1)
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
        <>
          {group.goal ? (
            <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Target className="size-3.5" /> Group goal
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">{group.goal.title}</p>
                </div>
                <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-medium text-orange-500">
                  <Flame className="size-4" />
                  {group.goal.groupStreak}d
                  <span className="text-muted-foreground font-normal">
                    (≥{group.goal.streakThreshold}/day)
                  </span>
                </span>
              </div>
              <div>
                <div className="text-muted-foreground mb-1 flex justify-between text-xs">
                  <span>Group progress</span>
                  <span>{group.goal.avgCompletionPct}%</span>
                </div>
                <div className="bg-secondary h-2 overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${group.goal.avgCompletionPct}%` }}
                  />
                </div>
              </div>
            </div>
          ) : isOwner && group.ownerPlaylistOptions.length > 0 ? (
            <div className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5">
              <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
                <Target className="size-4" /> Set a shared goal — everyone gets their own copy to track.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="border-border bg-background h-9 flex-1 rounded-md border px-2 text-sm"
                  value={goalPlaylistId}
                  onChange={(e) => setGoalPlaylistId(e.target.value)}
                >
                  <option value="">Choose a playlist…</option>
                  {group.ownerPlaylistOptions.map((o) => (
                    <option key={o.playlistId} value={o.playlistId}>
                      {o.title}
                    </option>
                  ))}
                </select>
                <label className="text-muted-foreground flex items-center gap-1 text-xs">
                  ≥
                  <input
                    type="number"
                    min={1}
                    max={group.memberCount}
                    value={threshold}
                    onChange={(e) => setThreshold(Math.max(1, Number(e.target.value) || 1))}
                    className="border-border bg-background h-9 w-14 rounded-md border px-2 text-sm"
                  />
                  /day
                </label>
                <Button
                  size="sm"
                  disabled={pending || !goalPlaylistId}
                  onClick={() =>
                    run(() => setGroupGoalAction(group.slug, goalPlaylistId, threshold))
                  }
                >
                  Set goal
                </Button>
              </div>
            </div>
          ) : null}

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
                {group.goal && (
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {m.goalCompletedCount}/{group.goal.videoCount}
                  </span>
                )}
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
        </>
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
