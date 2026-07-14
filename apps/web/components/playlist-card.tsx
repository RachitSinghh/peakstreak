"use client"

import Image from "next/image"
import Link from "next/link"
import { Archive, ArchiveRestore, CalendarDays, ListPlus, MoreVertical, Play } from "lucide-react"
import { useTransition } from "react"
import { motion, useReducedMotion } from "motion/react"

import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { cn } from "@workspace/ui/lib/utils"

import { archivePlaylist, restorePlaylist } from "@/app/(app)/playlists/actions"
import { formatDuration } from "@/lib/pace"

export interface PlaylistCardProps {
  id: string
  status: "active" | "completed" | "archived"
  title: string
  channelTitle: string | null
  thumbnailUrl: string | null
  videoCount: number
  completedCount: number
  totalDurationSeconds: number
  projectedFinishDate: string
  daysRemaining: number
  aheadDays: number | null
  continueVideoId: string | null
  completedAtLabel?: string | null
  /** Custom (user-curated) playlist — shows an "Add video" action. */
  isCustom?: boolean
  /** Position within its grid — staggers the entrance reveal. */
  index?: number
}

function prettyDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function PlaylistCard(props: PlaylistCardProps) {
  const [pending, startTransition] = useTransition()
  const reduce = useReducedMotion()
  const pct = props.videoCount > 0 ? (props.completedCount / props.videoCount) * 100 : 0
  const delay = reduce ? 0 : Math.min(props.index ?? 0, 8) * 0.05

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={reduce ? undefined : { y: -4 }}
      className={cn(
        "border-border bg-card group hover:border-primary/40 flex flex-col overflow-hidden rounded-xl border transition-colors hover:shadow-[0_8px_30px_-12px_rgba(94,106,210,0.35)]",
        pending && "opacity-50",
      )}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        {props.thumbnailUrl ? (
          <Image
            src={props.thumbnailUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="bg-secondary size-full" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span className="absolute right-2 bottom-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-xs text-white">
          {formatDuration(props.totalDurationSeconds)}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold" title={props.title}>
              {props.title}
            </h3>
            {props.channelTitle && (
              <p className="text-muted-foreground truncate text-xs">{props.channelTitle}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground -mr-1 rounded p-1 outline-none">
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {props.status === "archived" ? (
                <DropdownMenuItem
                  onSelect={() => startTransition(() => restorePlaylist(props.id))}
                >
                  <ArchiveRestore className="size-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onSelect={() => startTransition(() => archivePlaylist(props.id))}>
                  <Archive className="size-4" />
                  Archive
                </DropdownMenuItem>
              )}
              {props.isCustom && props.status !== "archived" && (
                <DropdownMenuItem render={<Link href={`/playlists/${props.id}/add`} />}>
                  <ListPlus className="size-4" />
                  Add video
                </DropdownMenuItem>
              )}
              <DropdownMenuItem render={<Link href={`/playlists/${props.id}/notes`} />}>
                All notes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div>
          <div className="bg-secondary h-1.5 w-full overflow-hidden rounded-full">
            <motion.div
              className="bg-primary h-full rounded-full"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: delay + 0.15 }}
            />
          </div>
          <div className="text-muted-foreground mt-1.5 flex justify-between text-xs">
            <span>
              <span className="text-foreground font-mono font-medium">
                {props.completedCount}/{props.videoCount}
              </span>{" "}
              videos
            </span>
            <span>{Math.round(pct)}%</span>
          </div>
        </div>

        {props.status === "completed" ? (
          <p className="text-success text-xs">Completed {props.completedAtLabel}</p>
        ) : (
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <CalendarDays className="size-3.5" />
            Est. finish {prettyDate(props.projectedFinishDate)}
            <span>· {props.daysRemaining}d left</span>
            {props.aheadDays !== null && props.aheadDays !== 0 && (
              <span className={props.aheadDays > 0 ? "text-success" : "text-warning"}>
                · {Math.abs(props.aheadDays)}d {props.aheadDays > 0 ? "ahead" : "behind"}
              </span>
            )}
          </p>
        )}

        <div className="mt-auto">
          {props.status === "completed" ? (
            <Button
              variant="outline"
              className="w-full"
              render={<Link href={`/completed/${props.id}`} />}
            >
              View celebration
            </Button>
          ) : props.continueVideoId ? (
            <Button
              className="group/btn w-full"
              render={<Link href={`/playlists/${props.id}/watch/${props.continueVideoId}`} />}
            >
              <Play className="size-4 transition-transform duration-200 group-hover/btn:scale-110" />
              Continue
            </Button>
          ) : (
            <Button variant="outline" className="w-full" disabled>
              No videos available
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
