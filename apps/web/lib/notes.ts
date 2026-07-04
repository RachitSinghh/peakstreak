import { and, asc, eq } from "drizzle-orm"

import { db, schema } from "@/lib/db"

export interface NoteEntry {
  id: string
  timestampSeconds: number | null
  body: string
  createdAt: Date
}

export interface PlaylistNoteGroup {
  videoId: string
  videoTitle: string
  position: number
  entries: NoteEntry[]
}

/**
 * A user's note entries for one playlist, grouped by video in playlist order
 * and, within a video, ordered by video timestamp (untimed notes last, by
 * creation time). Used by the "All notes" page and the PS-11 export.
 */
export async function getPlaylistNotes(userId: string, enrollmentId: string) {
  const enrollment = await db.query.userPlaylists.findFirst({
    where: and(eq(schema.userPlaylists.id, enrollmentId), eq(schema.userPlaylists.userId, userId)),
  })
  if (!enrollment) throw new Error("Enrollment not found")

  const playlist = await db.query.playlists.findFirst({
    where: eq(schema.playlists.id, enrollment.playlistId),
  })

  const rows = await db
    .select({
      id: schema.noteEntries.id,
      videoId: schema.noteEntries.videoId,
      videoTitle: schema.videos.title,
      position: schema.playlistVideos.position,
      timestampSeconds: schema.noteEntries.timestampSeconds,
      body: schema.noteEntries.body,
      createdAt: schema.noteEntries.createdAt,
    })
    .from(schema.noteEntries)
    .innerJoin(schema.videos, eq(schema.noteEntries.videoId, schema.videos.id))
    .innerJoin(
      schema.playlistVideos,
      and(
        eq(schema.playlistVideos.videoId, schema.videos.id),
        eq(schema.playlistVideos.playlistId, enrollment.playlistId),
      ),
    )
    .where(
      and(
        eq(schema.noteEntries.userId, userId),
        eq(schema.noteEntries.userPlaylistId, enrollmentId),
      ),
    )
    .orderBy(asc(schema.playlistVideos.position))

  // Group by video, preserving playlist order (rows already come sorted).
  const groups: PlaylistNoteGroup[] = []
  const byVideo = new Map<string, PlaylistNoteGroup>()
  for (const r of rows) {
    let group = byVideo.get(r.videoId)
    if (!group) {
      group = { videoId: r.videoId, videoTitle: r.videoTitle, position: r.position, entries: [] }
      byVideo.set(r.videoId, group)
      groups.push(group)
    }
    group.entries.push({
      id: r.id,
      timestampSeconds: r.timestampSeconds,
      body: r.body,
      createdAt: r.createdAt,
    })
  }
  for (const group of groups) group.entries.sort(compareEntries)

  return { playlistTitle: playlist?.title ?? "Playlist", notes: groups }
}

/** Timed notes first (ascending), then untimed notes by creation time. */
export function compareEntries(a: NoteEntry, b: NoteEntry): number {
  if (a.timestampSeconds != null && b.timestampSeconds != null) {
    return a.timestampSeconds - b.timestampSeconds
  }
  if (a.timestampSeconds != null) return -1
  if (b.timestampSeconds != null) return 1
  return a.createdAt.getTime() - b.createdAt.getTime()
}
