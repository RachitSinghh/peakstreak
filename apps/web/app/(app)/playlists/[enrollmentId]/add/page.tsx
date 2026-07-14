import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { eq } from "drizzle-orm"

import { requireUserId } from "@/lib/auth"
import { requireEnrollment } from "@/lib/dashboard"
import { db, schema } from "@/lib/db"
import { AddVideosForm } from "@/components/add-videos-form"

export const metadata: Metadata = { title: "Add videos" }

export default async function AddVideosPage({
  params,
}: {
  params: Promise<{ enrollmentId: string }>
}) {
  const { enrollmentId } = await params
  const userId = await requireUserId()

  const enrollment = await requireEnrollment(userId, enrollmentId)
  if (!enrollment) notFound()

  const playlist = await db.query.playlists.findFirst({
    where: eq(schema.playlists.id, enrollment.playlistId),
  })
  if (!playlist) notFound()
  // Only custom playlists can be appended to.
  if (playlist.youtubePlaylistId !== null) redirect("/dashboard")

  return (
    <div className="py-6">
      <div className="mx-auto mb-8 max-w-2xl">
        <h1 className="text-xl font-semibold">Add videos to {playlist.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Found more on the same topic? Paste the links, one per line. They append to the end and
          your finish date updates automatically.
        </p>
      </div>
      <AddVideosForm enrollmentId={enrollmentId} />
    </div>
  )
}
