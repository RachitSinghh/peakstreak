import { and, eq } from "drizzle-orm"

import { track } from "@/lib/analytics"
import { db, schema } from "@/lib/db"
import { localDateString } from "@/lib/dates"
import { estimateDays, finishDate, type Pace } from "@/lib/pace"
import { getUser } from "@/lib/user"

/**
 * SHARE-06 / SOC-07: the shared clone + enroll core. Cloning a playlist is a
 * new `playlists` row plus copied `playlist_videos` join rows (videos are a
 * shared cache). Enrollment is upserted without redirecting, so both the
 * user-facing "save this shared playlist" flow and the group-goal fan-out
 * (one clone per member) route through the same logic.
 */

/** Copy a source playlist into a fresh, fully independent custom playlist. */
export async function clonePlaylistRow(
  source: typeof schema.playlists.$inferSelect,
): Promise<typeof schema.playlists.$inferSelect> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.playlists)
      .values({
        youtubePlaylistId: null,
        title: source.title,
        channelTitle: source.channelTitle,
        thumbnailUrl: source.thumbnailUrl,
        videoCount: source.videoCount,
        totalDurationSeconds: source.totalDurationSeconds,
        unavailableCount: source.unavailableCount,
        unembeddableCount: source.unembeddableCount,
        lastSyncedAt: new Date(),
        syncStatus: "ok",
      })
      .returning()

    const srcVideos = await tx
      .select({
        videoId: schema.playlistVideos.videoId,
        position: schema.playlistVideos.position,
      })
      .from(schema.playlistVideos)
      .where(eq(schema.playlistVideos.playlistId, source.id))

    if (srcVideos.length > 0) {
      await tx
        .insert(schema.playlistVideos)
        .values(srcVideos.map((v) => ({ playlistId: row!.id, ...v })))
    }
    return row!
  })
}

/**
 * Create or refresh an enrollment for a user + playlist. Returns the
 * enrollment id (no redirect). Re-adding an existing playlist updates the
 * plan; progress rows are keyed to the enrollment and survive untouched.
 */
export async function upsertEnrollment(
  userId: string,
  playlist: typeof schema.playlists.$inferSelect,
  pace: Pace,
  playbackSpeed: number,
): Promise<string> {
  const user = await getUser(userId)
  const today = localDateString(new Date(), user.timezone)
  const days = estimateDays({
    remainingSeconds: playlist.totalDurationSeconds,
    remainingVideos: playlist.videoCount,
    pace,
    playbackSpeed,
  })
  const targetFinishDate = finishDate(today, days)

  const existing = await db.query.userPlaylists.findFirst({
    where: and(
      eq(schema.userPlaylists.userId, userId),
      eq(schema.userPlaylists.playlistId, playlist.id),
    ),
  })

  let enrollmentId: string
  if (existing) {
    await db
      .update(schema.userPlaylists)
      .set({
        paceType: pace.type,
        paceValue: pace.value,
        playbackSpeed: playbackSpeed.toFixed(1),
        status: existing.status === "completed" ? "completed" : "active",
        targetFinishDate,
        updatedAt: new Date(),
      })
      .where(eq(schema.userPlaylists.id, existing.id))
    enrollmentId = existing.id
  } else {
    const [row] = await db
      .insert(schema.userPlaylists)
      .values({
        userId,
        playlistId: playlist.id,
        paceType: pace.type,
        paceValue: pace.value,
        playbackSpeed: playbackSpeed.toFixed(1),
        targetFinishDate,
      })
      .returning({ id: schema.userPlaylists.id })
    enrollmentId = row!.id
    track("playlist_enrolled", {
      userId,
      properties: { playlistId: playlist.id, paceType: pace.type, paceValue: pace.value, playbackSpeed },
    })
  }

  // First playlist added = activated (feeds the activation metric).
  if (!user.onboardedAt) {
    await db
      .update(schema.users)
      .set({ onboardedAt: new Date() })
      .where(eq(schema.users.id, userId))
  }

  return enrollmentId
}

/**
 * SOC-07: clone a source playlist for a user and enroll them, returning the
 * new enrollment id. Default pace 30 min/day, 1.0x — the clone is editable.
 * Returns null if the source is gone or empty.
 */
export async function cloneAndEnroll(userId: string, sourcePlaylistId: string): Promise<string | null> {
  const source = await db.query.playlists.findFirst({
    where: eq(schema.playlists.id, sourcePlaylistId),
  })
  if (!source || source.videoCount === 0) return null
  const clone = await clonePlaylistRow(source)
  return upsertEnrollment(userId, clone, { type: "minutes_per_day", value: 30 }, 1.0)
}
