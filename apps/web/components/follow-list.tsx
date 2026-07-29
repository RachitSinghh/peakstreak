import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

import type { FollowListEntry } from "@/lib/follows"

/** Presentational follower/following list. Links only to public profiles. */
export function FollowList({
  ownerUsername,
  title,
  emptyLabel,
  entries,
}: {
  ownerUsername: string
  title: string
  emptyLabel: string
  entries: FollowListEntry[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <Link
          href={`/u/${ownerUsername}`}
          className="text-primary text-sm underline underline-offset-4"
        >
          @{ownerUsername}
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {entries.map((e, i) => {
            const row = (
              <div className="flex items-center gap-3 rounded-lg p-2">
                <Avatar size="sm">
                  {e.image && <AvatarImage src={e.image} alt="" />}
                  <AvatarFallback>{e.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{e.displayName}</span>
                {e.username && <span className="text-muted-foreground text-xs">@{e.username}</span>}
              </div>
            )
            return (
              <li key={i}>
                {e.username ? (
                  <Link href={`/u/${e.username}`} className="hover:bg-secondary block rounded-lg">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
