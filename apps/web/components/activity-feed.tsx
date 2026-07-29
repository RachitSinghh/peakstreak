import Link from "next/link"

import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

import { timeAgo } from "@/lib/dates"
import type { FeedItem } from "@/lib/feed"

function actionText(item: FeedItem): React.ReactNode {
  switch (item.kind) {
    case "started":
      return (
        <>
          started <span className="text-foreground font-medium">{item.playlistTitle}</span>
        </>
      )
    case "completed":
      return (
        <>
          finished <span className="text-foreground font-medium">{item.playlistTitle}</span>
        </>
      )
    case "studied":
      return `completed ${item.videosCompleted} video${item.videosCompleted === 1 ? "" : "s"}`
  }
}

/** SOC-03: read-only feed of the people the current user follows. */
export function ActivityFeed({
  items,
  followsAnyone,
}: {
  items: FeedItem[]
  followsAnyone: boolean
}) {
  return (
    <div className="border-border bg-card rounded-xl border p-5">
      <h2 className="mb-3 text-sm font-medium">Following</h2>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {followsAnyone
            ? "No recent activity from people you follow yet."
            : "Follow people to see what they're learning here."}
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item, i) => (
            <li
              key={i}
              className="border-border/60 flex items-center gap-3 border-b py-2.5 last:border-0"
            >
              <Link href={`/u/${item.username}`} className="shrink-0">
                <Avatar size="sm">
                  {item.image && <AvatarImage src={item.image} alt="" />}
                  <AvatarFallback>{item.displayName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Link>
              <p className="text-muted-foreground min-w-0 flex-1 truncate text-sm">
                <Link href={`/u/${item.username}`} className="text-foreground font-medium hover:underline">
                  {item.displayName}
                </Link>{" "}
                {actionText(item)}
              </p>
              <span className="text-muted-foreground shrink-0 text-xs">{timeAgo(new Date(item.ts))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
