import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"

import { SaveSharedButton } from "@/components/save-shared-button"
import { formatDuration } from "@/lib/pace"
import { resolveAlias } from "@/lib/playlist-share"

export const metadata: Metadata = { title: "Shared playlist" }

export default async function SharedPlaylistPage({
  params,
}: {
  params: Promise<{ alias: string }>
}) {
  const { alias } = await params
  const playlist = await resolveAlias(alias)

  if (!playlist) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="mb-2 text-xl font-semibold">This link is no longer valid</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          The playlist may have been deleted or the link is incorrect.
        </p>
        <Button size="sm" render={<Link href="/dashboard" />}>
          Go to dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <div className="border-border overflow-hidden rounded-xl border">
        {playlist.thumbnailUrl && (
          <div className="relative aspect-video w-full bg-black">
            <Image
              src={playlist.thumbnailUrl}
              alt=""
              fill
              sizes="(min-width: 640px) 28rem, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="flex flex-col gap-4 p-5">
          <div>
            <p className="text-muted-foreground text-xs">Shared playlist</p>
            <h1 className="text-lg font-semibold">{playlist.title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {playlist.videoCount} {playlist.videoCount === 1 ? "video" : "videos"}
              {playlist.totalDurationSeconds > 0 &&
                ` · ${formatDuration(playlist.totalDurationSeconds)}`}
            </p>
          </div>
          <SaveSharedButton alias={alias} />
        </div>
      </div>
    </div>
  )
}
