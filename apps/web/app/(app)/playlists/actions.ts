"use server"

import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { track } from "@/lib/analytics"
import { requireUserId } from "@/lib/auth"
import { requireEnrollment } from "@/lib/dashboard"
import { db, schema } from "@/lib/db"
import { localDateString } from "@/lib/dates"
import { estimateDays, finishDate, isValidPlaybackSpeed, validatePace, type Pace } from "@/lib/pace"
import { getUser } from "@/lib/user"
import { fetchVideosByIds } from "@/lib/youtube/client"
import { createCustomPlaylist, getOrSyncPlaylist } from "@/lib/youtube/cache"
import { parsePlaylistInput, parseVideoInput } from "@/lib/youtube/url"

const enrollSchema = z.object({
  url: z.string().min(1),
  paceType: z.enum(["minutes_per_day", "videos_per_day"]),
  paceValue: z.number().int(),
  playbackSpeed: z.number(),
})

export type EnrollState = { error?: string }

// Shared enroll: given a resolved playlist row + pace, create/refresh the
// enrollment, mark onboarding, and redirect. Used by both the YouTube-import
// flow and custom playlists (PS-18). Redirects, so it never returns normally.
async function enrollUserInPlaylist(
  userId: string,
  playlist: typeof schema.playlists.$inferSelect,
  pace: Pace,
  playbackSpeed: number,
): Promise<never> {
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

  if (existing) {
    // Re-adding an archived (or even active) playlist updates the plan
    // rather than erroring — progress rows are keyed to this enrollment
    // and survive untouched.
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
  } else {
    await db.insert(schema.userPlaylists).values({
      userId,
      playlistId: playlist.id,
      paceType: pace.type,
      paceValue: pace.value,
      playbackSpeed: playbackSpeed.toFixed(1),
      targetFinishDate,
    })
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

  redirect("/dashboard")
}

export async function enrollInPlaylist(input: z.infer<typeof enrollSchema>): Promise<EnrollState> {
  const userId = await requireUserId()

  const parsed = enrollSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid input." }
  const { url, paceType, paceValue, playbackSpeed } = parsed.data

  const pace: Pace = { type: paceType, value: paceValue }
  const paceError = validatePace(pace)
  if (paceError) return { error: paceError }
  if (!isValidPlaybackSpeed(playbackSpeed)) return { error: "Invalid playback speed." }

  const playlistId = parsePlaylistInput(url)
  if (!playlistId) return { error: "Invalid playlist link." }

  // Served from cache — the preview call a moment ago already synced it.
  const { playlist } = await getOrSyncPlaylist(playlistId)
  if (playlist.videoCount === 0) {
    return { error: "This playlist has no watchable videos." }
  }

  return enrollUserInPlaylist(userId, playlist, pace, playbackSpeed)
}

const createCustomSchema = z.object({
  name: z.string().trim().min(1).max(120),
  urls: z.string().min(1),
  paceType: z.enum(["minutes_per_day", "videos_per_day"]),
  paceValue: z.number().int(),
  playbackSpeed: z.number(),
})

/** PS-18: build a custom playlist from pasted video URLs, then enroll. */
export async function createCustomPlaylistAction(
  input: z.infer<typeof createCustomSchema>,
): Promise<EnrollState> {
  const userId = await requireUserId()

  const parsed = createCustomSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid input." }
  const { name, urls, paceType, paceValue, playbackSpeed } = parsed.data

  const pace: Pace = { type: paceType, value: paceValue }
  const paceError = validatePace(pace)
  if (paceError) return { error: paceError }
  if (!isValidPlaybackSpeed(playbackSpeed)) return { error: "Invalid playback speed." }

  const ids = [
    ...new Set(
      urls
        .split(/\s+/)
        .map(parseVideoInput)
        .filter((v): v is string => v !== null),
    ),
  ]
  if (ids.length === 0) return { error: "No valid YouTube video links found." }

  const videos = await fetchVideosByIds(ids)
  if (videos.length === 0) {
    return { error: "None of those videos are available to watch." }
  }

  const { playlist } = await createCustomPlaylist(name, videos)
  return enrollUserInPlaylist(userId, playlist, pace, playbackSpeed)
}

const addVideosSchema = z.object({
  enrollmentId: z.string().uuid(),
  urls: z.string().min(1),
})

/** PS-18: append more videos to an existing custom playlist. */
export async function addVideosToCustomPlaylist(
  input: z.infer<typeof addVideosSchema>,
): Promise<EnrollState> {
  const userId = await requireUserId()

  const parsed = addVideosSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid input." }
  const { enrollmentId, urls } = parsed.data

  const enrollment = await requireEnrollment(userId, enrollmentId)
  if (!enrollment) return { error: "Playlist not found." }

  const playlist = await db.query.playlists.findFirst({
    where: eq(schema.playlists.id, enrollment.playlistId),
  })
  if (!playlist) return { error: "Playlist not found." }
  if (playlist.youtubePlaylistId !== null) {
    return { error: "You can only add videos to a custom playlist." }
  }

  const ids = [
    ...new Set(
      urls
        .split(/\s+/)
        .map(parseVideoInput)
        .filter((v): v is string => v !== null),
    ),
  ]
  if (ids.length === 0) return { error: "No valid YouTube video links found." }

  const fetched = await fetchVideosByIds(ids)
  if (fetched.length === 0) return { error: "None of those videos are available to watch." }

  const playlistId = playlist.id
  let addedCount = 0

  await db.transaction(async (tx) => {
    await tx
      .insert(schema.videos)
      .values(
        fetched.map((v) => ({
          youtubeVideoId: v.youtubeVideoId,
          title: v.title,
          durationSeconds: v.durationSeconds,
          thumbnailUrl: v.thumbnailUrl,
          isEmbeddable: v.isEmbeddable,
        })),
      )
      .onConflictDoUpdate({
        target: schema.videos.youtubeVideoId,
        set: {
          title: sql`excluded.title`,
          durationSeconds: sql`excluded.duration_seconds`,
          thumbnailUrl: sql`excluded.thumbnail_url`,
          isAvailable: sql`true`,
          isEmbeddable: sql`excluded.is_embeddable`,
          updatedAt: sql`now()`,
        },
      })

    const videoRows = await tx
      .select({ id: schema.videos.id, youtubeVideoId: schema.videos.youtubeVideoId })
      .from(schema.videos)
      .where(sql`${schema.videos.youtubeVideoId} in ${fetched.map((v) => v.youtubeVideoId)}`)
    const idByYoutubeId = new Map(videoRows.map((r) => [r.youtubeVideoId, r.id]))

    const existing = await tx
      .select({ videoId: schema.playlistVideos.videoId })
      .from(schema.playlistVideos)
      .where(eq(schema.playlistVideos.playlistId, playlistId))
    const alreadyIn = new Set(existing.map((e) => e.videoId))

    const toAdd = fetched
      .map((v) => idByYoutubeId.get(v.youtubeVideoId)!)
      .filter((id) => !alreadyIn.has(id))
    if (toAdd.length === 0) return

    const [maxRow] = await tx
      .select({ maxPos: sql<number>`coalesce(max(${schema.playlistVideos.position}), -1)` })
      .from(schema.playlistVideos)
      .where(eq(schema.playlistVideos.playlistId, playlistId))
    const startPos = (maxRow?.maxPos ?? -1) + 1

    await tx
      .insert(schema.playlistVideos)
      .values(toAdd.map((videoId, i) => ({ playlistId, videoId, position: startPos + i })))
    addedCount = toAdd.length

    // Recompute aggregates from the join so counts can't drift.
    await tx
      .update(schema.playlists)
      .set({
        videoCount: sql`(select count(*) from playlist_videos where playlist_id = ${playlistId})`,
        totalDurationSeconds: sql`(select coalesce(sum(v.duration_seconds), 0) from playlist_videos pv join videos v on v.id = pv.video_id where pv.playlist_id = ${playlistId})`,
        unembeddableCount: sql`(select count(*) from playlist_videos pv join videos v on v.id = pv.video_id where pv.playlist_id = ${playlistId} and v.is_embeddable = false)`,
        updatedAt: new Date(),
      })
      .where(eq(schema.playlists.id, playlistId))
  })

  if (addedCount === 0) {
    return { error: "Those videos are already in this playlist." }
  }

  revalidatePath("/dashboard")
  redirect("/dashboard")
}

const reorderSchema = z.object({
  enrollmentId: z.string().min(1),
  videoIds: z.array(z.string().min(1)).min(1),
})

/**
 * Renumber the videos of a custom playlist to the given order (PS-18 follow-up).
 * `videoIds` must be exactly the playlist's current videos, in the new order.
 * The (playlist_id, position) unique index forbids in-place swaps, so we first
 * bump every row far out of range, then assign 0..n-1.
 */
export async function reorderCustomPlaylistVideos(
  input: z.infer<typeof reorderSchema>,
): Promise<EnrollState> {
  const userId = await requireUserId()

  const parsed = reorderSchema.safeParse(input)
  if (!parsed.success) return { error: "Invalid input." }
  const { enrollmentId, videoIds } = parsed.data

  const enrollment = await requireEnrollment(userId, enrollmentId)
  if (!enrollment) return { error: "Playlist not found." }

  const playlist = await db.query.playlists.findFirst({
    where: eq(schema.playlists.id, enrollment.playlistId),
  })
  if (!playlist) return { error: "Playlist not found." }
  if (playlist.youtubePlaylistId !== null) {
    return { error: "You can only reorder a custom playlist." }
  }

  const playlistId = playlist.id
  const existing = await db
    .select({ videoId: schema.playlistVideos.videoId })
    .from(schema.playlistVideos)
    .where(eq(schema.playlistVideos.playlistId, playlistId))

  // The new order must be a permutation of exactly the current videos — else a
  // stale client could drop or duplicate rows.
  const current = new Set(existing.map((e) => e.videoId))
  const next = new Set(videoIds)
  if (next.size !== videoIds.length || next.size !== current.size) {
    return { error: "Playlist changed — refresh and try again." }
  }
  for (const id of videoIds) {
    if (!current.has(id)) return { error: "Playlist changed — refresh and try again." }
  }

  await db.transaction(async (tx) => {
    await tx.execute(
      sql`update playlist_videos set position = position + 1000000 where playlist_id = ${playlistId}`,
    )
    for (let i = 0; i < videoIds.length; i++) {
      await tx.execute(
        sql`update playlist_videos set position = ${i} where playlist_id = ${playlistId} and video_id = ${videoIds[i]}`,
      )
    }
    await tx
      .update(schema.playlists)
      .set({ updatedAt: new Date() })
      .where(eq(schema.playlists.id, playlistId))
  })

  revalidatePath("/dashboard")
  return {}
}

/** Soft delete: hides the playlist but keeps every progress row. */
export async function archivePlaylist(enrollmentId: string) {
  const userId = await requireUserId()
  await db
    .update(schema.userPlaylists)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(schema.userPlaylists.id, enrollmentId),
        eq(schema.userPlaylists.userId, userId),
      ),
    )
  revalidatePath("/dashboard")
  revalidatePath("/archived")
}

export async function restorePlaylist(enrollmentId: string) {
  const userId = await requireUserId()
  await db
    .update(schema.userPlaylists)
    .set({ status: "active", updatedAt: new Date() })
    .where(
      and(
        eq(schema.userPlaylists.id, enrollmentId),
        eq(schema.userPlaylists.userId, userId),
        eq(schema.userPlaylists.status, "archived"),
      ),
    )
  revalidatePath("/dashboard")
  revalidatePath("/archived")
}
