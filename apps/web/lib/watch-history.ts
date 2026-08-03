import { and, eq, inArray, sql } from "drizzle-orm"

import { track } from "@/lib/analytics"
import { db, schema } from "@/lib/db"

/**
 * Cross-playlist auto-complete. Videos are a shared cache keyed by YouTube id,
 * so a video the user finished in one tracked playlist is the SAME `videoId`
 * when it shows up in another. This marks those already-finished videos complete
 * across all the user's enrollments so they don't re-watch.
 *
 * Critically, it does NOT go through `recordCompletion`: it writes `video_progress`
 * only, never `daily_activity`, streaks, or `video_completed` events. Marking an
 * old video done must not inflate today's activity or extend a streak.
 *
 * Idempotent — safe to run on every dashboard load. ponytail: full sweep each
 * call; gate with a `synced_at` flag if it ever shows up in query volume.
 */
export async function syncCompletedFromHistory(userId: string): Promise<number> {
  // Every video this user has completed anywhere.
  const doneRows = await db
    .selectDistinct({ videoId: schema.videoProgress.videoId })
    .from(schema.videoProgress)
    .innerJoin(
      schema.userPlaylists,
      eq(schema.userPlaylists.id, schema.videoProgress.userPlaylistId),
    )
    .where(and(eq(schema.userPlaylists.userId, userId), eq(schema.videoProgress.isCompleted, true)))
  const doneIds = doneRows.map((r) => r.videoId)
  if (doneIds.length === 0) return 0

  // (enrollment, video) pairs where a done video sits in an enrollment's playlist
  // but isn't completed in THAT enrollment yet.
  const targets = await db
    .select({
      userPlaylistId: schema.userPlaylists.id,
      videoId: schema.playlistVideos.videoId,
      duration: schema.videos.durationSeconds,
      isCompleted: schema.videoProgress.isCompleted,
    })
    .from(schema.userPlaylists)
    .innerJoin(
      schema.playlistVideos,
      eq(schema.playlistVideos.playlistId, schema.userPlaylists.playlistId),
    )
    .innerJoin(schema.videos, eq(schema.videos.id, schema.playlistVideos.videoId))
    .leftJoin(
      schema.videoProgress,
      and(
        eq(schema.videoProgress.userPlaylistId, schema.userPlaylists.id),
        eq(schema.videoProgress.videoId, schema.playlistVideos.videoId),
      ),
    )
    .where(and(eq(schema.userPlaylists.userId, userId), inArray(schema.playlistVideos.videoId, doneIds)))

  const toMark = targets.filter((t) => t.isCompleted !== true)
  if (toMark.length === 0) return 0

  // Batch upsert: mark complete, fill the progress bar to full. `excluded` is the
  // proposed row; setWhere guards against clobbering a genuine completion.
  const marked = await db
    .insert(schema.videoProgress)
    .values(
      toMark.map((t) => ({
        userPlaylistId: t.userPlaylistId,
        videoId: t.videoId,
        isCompleted: true,
        completedAt: new Date(),
        secondsWatched: t.duration,
        furthestPositionSeconds: t.duration,
      })),
    )
    .onConflictDoUpdate({
      target: [schema.videoProgress.userPlaylistId, schema.videoProgress.videoId],
      set: {
        isCompleted: true,
        completedAt: sql`now()`,
        secondsWatched: sql`excluded.seconds_watched`,
        furthestPositionSeconds: sql`excluded.furthest_position_seconds`,
        updatedAt: sql`now()`,
      },
      setWhere: sql`${schema.videoProgress.isCompleted} = false`,
    })
    .returning({ id: schema.videoProgress.id })

  if (marked.length > 0) {
    void track("videos_synced_from_history", { userId, properties: { count: marked.length } })
  }
  return marked.length
}
